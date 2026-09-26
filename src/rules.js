// 判定层：遗传病筛查与配组规则。
// 全部为纯函数，不读写档案；报告结构由档案层保证。

export const CONCLUSIONS = ["阴性", "携带", "患病"];

export function isConclusion(value) {
  return CONCLUSIONS.includes(value);
}

// 同一羽鸽、同一检测项目，只认最新有效报告：
// 已作废（status !== "valid"）的报告不参与判定；多份有效时先比报告日，再比报告编号。
export function effectiveReports(reports, ringNo) {
  const byItem = new Map();
  for (const report of reports) {
    if (report.ringNo !== ringNo || report.status !== "valid") continue;
    const current = byItem.get(report.item);
    if (
      !current ||
      report.reportDate > current.reportDate ||
      (report.reportDate === current.reportDate && report.id > current.id)
    ) {
      byItem.set(report.item, report);
    }
  }
  return byItem;
}

// 判定两只鸽能否配组，返回阻断原因数组；空数组表示允许配组。
// 规则：患病鸽与任何鸽都不能配；同项目双方均为携带者不能配。
export function pairingBlockers(reports, ringA, ringB) {
  const reasons = [];
  const mapA = effectiveReports(reports, ringA);
  const mapB = effectiveReports(reports, ringB);
  for (const [ring, map] of [[ringA, mapA], [ringB, mapB]]) {
    for (const [item, report] of map) {
      if (report.conclusion === "患病") {
        reasons.push(`${ring}「${item}」最新有效报告结论为患病，患病鸽不得配组`);
      }
    }
  }
  for (const [item, reportA] of mapA) {
    const reportB = mapB.get(item);
    if (reportA.conclusion === "携带" && reportB && reportB.conclusion === "携带") {
      reasons.push(`双方「${item}」最新有效报告均为携带，同病携带者不得配组`);
    }
  }
  return reasons;
}

// 后代风险提示：按双亲各项目的最新有效结论推算（随新结论自动重算，不落库）。
export function offspringRisks(reports, ringA, ringB) {
  const risks = [];
  const mapA = effectiveReports(reports, ringA);
  const mapB = effectiveReports(reports, ringB);
  const items = new Set([...mapA.keys(), ...mapB.keys()]);
  for (const item of items) {
    const sideA = mapA.get(item)?.conclusion || "未检测";
    const sideB = mapB.get(item)?.conclusion || "未检测";
    if (sideA === "患病" || sideB === "患病") {
      risks.push({
        item,
        level: "高",
        note: `「${item}」亲代存在患病个体（${ringA}：${sideA}，${ringB}：${sideB}），后代发病风险高`,
      });
    } else if (sideA === "携带" && sideB === "携带") {
      risks.push({
        item,
        level: "高",
        note: `「${item}」双亲同为携带者（${ringA}：${sideA}，${ringB}：${sideB}），后代可能发病`,
      });
    } else if (sideA === "携带" || sideB === "携带") {
      risks.push({
        item,
        level: "中",
        note: `「${item}」亲代一方为携带者（${ringA}：${sideA}，${ringB}：${sideB}），后代可能携带`,
      });
    } else if (sideA === "未检测" || sideB === "未检测") {
      risks.push({
        item,
        level: "提示",
        note: `「${item}」亲代检测不全（${ringA}：${sideA}，${ringB}：${sideB}），建议补检`,
      });
    }
  }
  return risks;
}

// 为一只鸽列出全部可配种鸽与被阻断对象（页面展示适用种鸽、阻断原因）。
export function breedingCandidates(reports, pigeons, ringNo) {
  const applicable = [];
  const blocked = [];
  for (const pigeon of pigeons) {
    if (pigeon.ringNo === ringNo) continue;
    const reasons = pairingBlockers(reports, ringNo, pigeon.ringNo);
    const entry = {
      ringNo: pigeon.ringNo,
      owner: pigeon.owner,
      color: pigeon.color,
      reasons,
    };
    (reasons.length ? blocked : applicable).push(entry);
  }
  return { applicable, blocked };
}

// 报告新增或改错后全量重算配对状态（纯判定）：
// 进行中但已违规的应立即冻结；已冻结但结论恢复清白的应恢复；关系本身始终保留。
export function evaluatePairings(reports, pairings) {
  const changes = [];
  for (const pairing of pairings) {
    const reasons = pairingBlockers(reports, pairing.maleRing, pairing.femaleRing);
    if (pairing.status === "active" && reasons.length > 0) {
      changes.push({ pairing, action: "frozen", reasons });
    }
    if (pairing.status === "frozen" && reasons.length === 0) {
      changes.push({ pairing, action: "restored", reasons: [] });
    }
  }
  return changes;
}
