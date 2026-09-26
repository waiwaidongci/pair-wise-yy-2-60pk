// 遗传病筛查判定：结论口径、有效报告选取、配组阻断、后代风险、适用种鸽。
// 本模块只做纯函数判定，不触碰存储。

export const CONCLUSIONS = ["clear", "carrier", "affected"];
export const CONCLUSION_LABELS = { clear: "阴性", carrier: "携带者", affected: "患病" };

export function isConclusion(value) {
  return CONCLUSIONS.includes(value);
}

// 报告新旧比较：先按报告日，再按录入时间。
function compareReports(a, b) {
  const da = a.reportDate || "";
  const db = b.reportDate || "";
  if (da !== db) return da < db ? -1 : 1;
  const ca = a.createdAt || "";
  const cb = b.createdAt || "";
  if (ca !== cb) return ca < cb ? -1 : 1;
  return 0;
}

// 同一只鸽、同一项目：只认最新有效报告（status 为 valid，被更正/作废的不算）。
export function effectiveReports(reports, ringNo) {
  const byItem = new Map();
  for (const report of reports) {
    if (report.ringNo !== ringNo || report.status !== "valid") continue;
    const prev = byItem.get(report.item);
    if (!prev || compareReports(report, prev) > 0) byItem.set(report.item, report);
  }
  return byItem;
}

// 概览用：{ 项目: 结论 }
export function effectiveGenetics(db, ringNo) {
  const summary = {};
  for (const [item, report] of effectiveReports(db.reports, ringNo)) {
    summary[item] = report.conclusion;
  }
  return summary;
}

function pairItems(db, ringA, ringB) {
  const mapA = effectiveReports(db.reports, ringA);
  const mapB = effectiveReports(db.reports, ringB);
  const items = [...new Set([...mapA.keys(), ...mapB.keys()])];
  return { mapA, mapB, items };
}

// 配组判定：任一方患病即阻断；双方同项目均为携带者即阻断。
// 其余组合给出提示（携带×阴性、一方未检测），不阻断。
export function evaluatePair(db, ringA, ringB) {
  const { mapA, mapB, items } = pairItems(db, ringA, ringB);
  const blocks = [];
  const warnings = [];
  for (const item of items) {
    const ca = mapA.get(item)?.conclusion || null;
    const cb = mapB.get(item)?.conclusion || null;
    const affectedA = ca === "affected";
    const affectedB = cb === "affected";
    const bothCarrier = ca === "carrier" && cb === "carrier";
    if (affectedA) blocks.push({ item, code: "affected", reason: `${ringA}「${item}」结论为患病，患病鸽不得与任何鸽配组` });
    if (affectedB) blocks.push({ item, code: "affected", reason: `${ringB}「${item}」结论为患病，患病鸽不得与任何鸽配组` });
    if (bothCarrier) blocks.push({ item, code: "both_carrier", reason: `双方均为「${item}」携带者，禁止配组` });
    if (affectedA || affectedB || bothCarrier) continue;
    if ((ca === "carrier" && cb === "clear") || (ca === "clear" && cb === "carrier")) {
      warnings.push({ item, text: `「${item}」一方为携带者、一方阴性：后代可能为携带者，通常不发病` });
    }
    if ((ca && !cb) || (!ca && cb)) {
      warnings.push({ item, text: `「${item}」另一方缺少有效检测报告，建议补检` });
    }
  }
  return { allowed: blocks.length === 0, blocks, warnings };
}

// 后代风险提示：按双亲（或拟配两鸽）最新有效结论推算。
// 既用于已有鸽只（按其父母），也用于配对（按两亲本），结论更正后自然重算。
export function offspringRisk(db, ringA, ringB) {
  const { mapA, mapB, items } = pairItems(db, ringA, ringB);
  const risks = [];
  for (const item of items) {
    const ca = mapA.get(item)?.conclusion || null;
    const cb = mapB.get(item)?.conclusion || null;
    if (ca === "affected" && cb === "affected") {
      risks.push({ item, level: "high", text: `双亲「${item}」均患病：后代几乎全部患病` });
    } else if (ca === "affected" || cb === "affected") {
      const other = ca === "affected" ? cb : ca;
      if (other === "carrier") risks.push({ item, level: "high", text: `「${item}」一方患病、一方携带：后代约50%患病` });
      else if (other === "clear") risks.push({ item, level: "medium", text: `「${item}」一方患病、一方阴性：后代均为携带者` });
      else risks.push({ item, level: "high", text: `「${item}」一方患病、另一方未检测：后代风险高，建议补检` });
    } else if (ca === "carrier" && cb === "carrier") {
      risks.push({ item, level: "high", text: `双方均为「${item}」携带者：后代约25%患病、50%携带` });
    } else if ((ca === "carrier" && cb === "clear") || (ca === "clear" && cb === "carrier")) {
      risks.push({ item, level: "medium", text: `一方为「${item}」携带者：后代约50%为携带者，通常不发病` });
    } else if (ca === "clear" && cb === "clear") {
      risks.push({ item, level: "low", text: `双方「${item}」均为阴性：后代风险低` });
    } else {
      risks.push({ item, level: "info", text: `「${item}」一方未检测：建议补检后评估后代风险` });
    }
  }
  return risks;
}

// 适用种鸽：列出其余全部鸽只，可配的在前，阻断的附原因。
export function eligibleMates(db, ringNo) {
  return db.pigeons
    .filter(pigeon => pigeon.ringNo !== ringNo)
    .map(pigeon => {
      const evaluation = evaluatePair(db, ringNo, pigeon.ringNo);
      return {
        ringNo: pigeon.ringNo,
        owner: pigeon.owner,
        color: pigeon.color,
        loft: pigeon.loft,
        allowed: evaluation.allowed,
        blocks: evaluation.blocks.map(block => block.reason),
        warnings: evaluation.warnings.map(warning => warning.text)
      };
    })
    .sort((x, y) => Number(y.allowed) - Number(x.allowed) || x.ringNo.localeCompare(y.ringNo));
}

// 单鸽遗传档案：有效结论汇总 + 全部检测历史（含被更正/作废）+ 按父母推算的后代风险。
export function geneticsProfile(db, ringNo) {
  const pigeon = db.pigeons.find(item => item.ringNo === ringNo);
  const effective = [...effectiveReports(db.reports, ringNo).values()].map(report => ({
    item: report.item,
    conclusion: report.conclusion,
    sampleNo: report.sampleNo,
    reportDate: report.reportDate,
    reportId: report.id
  }));
  const history = db.reports
    .filter(report => report.ringNo === ringNo)
    .sort((a, b) => compareReports(b, a));
  const risk = pigeon && (pigeon.fatherRing || pigeon.motherRing)
    ? offspringRisk(db, pigeon.fatherRing, pigeon.motherRing)
    : [];
  return { effective, history, offspringRisk: risk };
}
