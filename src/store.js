// 档案：数据读写与迁移、检测报告登记/更正/作废、配对登记与冻结重算。

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluatePair, isConclusion } from "./genetics.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || join(__dirname, "..", "data", "pigeons.json");

function today() {
  return new Date().toISOString().slice(0, 10);
}
function now() {
  return new Date().toISOString();
}

export class StoreError extends Error {
  constructor(status, code, message, extra) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra || {};
  }
}

// 初始档案还原事故经过：两只同病携带者配组，幼鸽发病；该配对现已冻结。
export const seed = {
  pigeons: [
    { ringNo: "CHN-2026-001", owner: "北岸棚", fatherRing: "CHN-2022-188", motherRing: "CHN-2023-512", color: "灰", loft: "北岸A棚", vaccines: [{ date: "2026-04-01", name: "新城疫" }], transfers: [{ date: "2026-04-15", from: "育种棚", to: "北岸棚" }], races: [{ date: "2026-06-01", event: "120公里训放", distance: 120, returnTime: "10:42", rank: 18 }] },
    { ringNo: "CHN-2022-188", owner: "育种棚", fatherRing: "", motherRing: "", color: "雨点", loft: "种鸽棚", vaccines: [], transfers: [], races: [] },
    { ringNo: "CHN-2023-512", owner: "育种棚", fatherRing: "", motherRing: "", color: "红轮", loft: "种鸽棚", vaccines: [], transfers: [], races: [] }
  ],
  reports: [
    { id: "RPT-0001", ringNo: "CHN-2022-188", item: "进行性视网膜萎缩", conclusion: "carrier", sampleNo: "S2604-018", reportDate: "2026-04-02", lab: "信鸽遗传检测中心", note: "种鸽入棚筛查", status: "valid", corrects: null, correctedBy: null, createdAt: "2026-04-02T09:00:00.000Z" },
    { id: "RPT-0002", ringNo: "CHN-2023-512", item: "进行性视网膜萎缩", conclusion: "carrier", sampleNo: "S2604-019", reportDate: "2026-04-02", lab: "信鸽遗传检测中心", note: "种鸽入棚筛查", status: "valid", corrects: null, correctedBy: null, createdAt: "2026-04-02T09:05:00.000Z" },
    { id: "RPT-0003", ringNo: "CHN-2026-001", item: "进行性视网膜萎缩", conclusion: "affected", sampleNo: "S2605-006", reportDate: "2026-05-10", lab: "信鸽遗传检测中心", note: "幼鸽发病确诊", status: "valid", corrects: null, correctedBy: null, createdAt: "2026-05-10T10:00:00.000Z" }
  ],
  pairs: [
    {
      id: "PAIR-0001", ringA: "CHN-2022-188", ringB: "CHN-2023-512",
      createdAt: "2026-03-01", status: "frozen", frozenAt: "2026-04-02",
      frozenReason: "双方均为「进行性视网膜萎缩」携带者，禁止配组",
      history: [
        { date: "2026-03-01", action: "create", reason: "登记配组" },
        { date: "2026-04-02", action: "freeze", reason: "双方均为「进行性视网膜萎缩」携带者，禁止配组" }
      ]
    }
  ]
};

export async function loadDb() {
  if (!existsSync(dbPath)) {
    await mkdir(dirname(dbPath), { recursive: true });
    await writeFile(dbPath, JSON.stringify(seed, null, 2));
  }
  const db = JSON.parse(await readFile(dbPath, "utf8"));
  if (migrate(db)) await saveDb(db);
  return db;
}

export async function saveDb(db) {
  await writeFile(dbPath, JSON.stringify(db, null, 2));
}

// 旧档案补齐检测报告和配对字段。
function migrate(db) {
  let changed = false;
  if (!Array.isArray(db.reports)) { db.reports = []; changed = true; }
  if (!Array.isArray(db.pairs)) { db.pairs = []; changed = true; }
  for (const report of db.reports) {
    if (!report.status) { report.status = "valid"; changed = true; }
    if (!("corrects" in report)) { report.corrects = null; changed = true; }
    if (!("correctedBy" in report)) { report.correctedBy = null; changed = true; }
  }
  for (const pair of db.pairs) {
    if (!pair.status) { pair.status = "active"; changed = true; }
    if (!Array.isArray(pair.history)) { pair.history = []; changed = true; }
    if (!pair.frozenAt) { pair.frozenAt = ""; changed = true; }
    if (!pair.frozenReason) { pair.frozenReason = ""; changed = true; }
  }
  return changed;
}

function buildReport(db, ringNo, input, corrects) {
  const pigeon = db.pigeons.find(item => item.ringNo === ringNo);
  if (!pigeon) throw new StoreError(404, "pigeon_not_found", "鸽只不存在");
  const item = String(input.item || "").trim();
  if (!item) throw new StoreError(400, "item_required", "检测项目必填");
  if (!isConclusion(input.conclusion)) {
    throw new StoreError(400, "conclusion_invalid", "检测结论须为 clear（阴性）/carrier（携带者）/affected（患病）之一");
  }
  const sampleNo = String(input.sampleNo || "").trim();
  if (!sampleNo) throw new StoreError(400, "sample_required", "样本编号必填");
  const reportDate = String(input.reportDate || "").trim() || today();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) {
    throw new StoreError(400, "date_invalid", "报告日格式应为 YYYY-MM-DD");
  }
  return {
    id: `RPT-${String(db.reports.length + 1).padStart(4, "0")}`,
    ringNo,
    item,
    conclusion: input.conclusion,
    sampleNo,
    reportDate,
    lab: String(input.lab || "").trim(),
    note: String(input.note || "").trim(),
    status: "valid",
    corrects,
    correctedBy: null,
    createdAt: now()
  };
}

// 登记一份新检测报告，随后按新结论重算全部配对。
export function addReport(db, ringNo, input) {
  const report = buildReport(db, ringNo, input, null);
  db.reports.push(report);
  return { report, pairChanges: recomputePairs(db) };
}

// 改错：旧报告标记为 corrected 永久留档，另存一份最新有效报告。
export function correctReport(db, reportId, input) {
  const previous = db.reports.find(item => item.id === reportId);
  if (!previous) throw new StoreError(404, "report_not_found", "报告不存在");
  if (previous.status !== "valid") throw new StoreError(409, "report_not_valid", "仅有效报告可以更正");
  const report = buildReport(db, previous.ringNo, { ...input, item: previous.item }, previous.id);
  previous.status = "corrected";
  previous.correctedBy = report.id;
  db.reports.push(report);
  return { report, previous, pairChanges: recomputePairs(db) };
}

// 作废：报告不再参与判定，但记录保留可查。
export function revokeReport(db, reportId) {
  const report = db.reports.find(item => item.id === reportId);
  if (!report) throw new StoreError(404, "report_not_found", "报告不存在");
  if (report.status !== "valid") throw new StoreError(409, "report_not_valid", "报告已失效，不能重复作废");
  report.status = "revoked";
  report.revokedAt = today();
  return { report, pairChanges: recomputePairs(db) };
}

// 登记配组：判定不通过直接拒绝（已存在的配对才走冻结，见 recomputePairs）。
export function addPair(db, ringA, ringB) {
  if (!ringA || !ringB || ringA === ringB) {
    throw new StoreError(400, "pair_invalid", "请选择两羽不同的鸽只");
  }
  for (const ring of [ringA, ringB]) {
    if (!db.pigeons.some(item => item.ringNo === ring)) {
      throw new StoreError(404, "pigeon_not_found", `${ring} 未登记`);
    }
  }
  const duplicate = db.pairs.find(pair =>
    (pair.ringA === ringA && pair.ringB === ringB) ||
    (pair.ringA === ringB && pair.ringB === ringA));
  if (duplicate) throw new StoreError(409, "pair_exists", "两鸽已存在配对记录");
  const evaluation = evaluatePair(db, ringA, ringB);
  if (!evaluation.allowed) {
    throw new StoreError(409, "pair_blocked", "遗传病筛查未通过，禁止配组", { blocks: evaluation.blocks });
  }
  const pair = {
    id: `PAIR-${String(db.pairs.length + 1).padStart(4, "0")}`,
    ringA,
    ringB,
    createdAt: today(),
    status: "active",
    frozenAt: "",
    frozenReason: "",
    history: [{ date: today(), action: "create", reason: "登记配组" }]
  };
  db.pairs.push(pair);
  return pair;
}

// 报告变动后重算：新触发阻断的立即冻结并留下原关系与原因；
// 阻断随更正解除的恢复配组。全程不删除配对记录。
export function recomputePairs(db) {
  const changes = [];
  for (const pair of db.pairs) {
    const evaluation = evaluatePair(db, pair.ringA, pair.ringB);
    if (!evaluation.allowed && pair.status !== "frozen") {
      pair.status = "frozen";
      pair.frozenAt = today();
      pair.frozenReason = evaluation.blocks.map(block => block.reason).join("；");
      pair.history.push({ date: today(), action: "freeze", reason: pair.frozenReason });
      changes.push({ pairId: pair.id, action: "freeze", reason: pair.frozenReason });
    } else if (evaluation.allowed && pair.status === "frozen") {
      pair.status = "active";
      pair.frozenAt = "";
      pair.frozenReason = "";
      pair.history.push({ date: today(), action: "unfreeze", reason: "检测结论更新，阻断解除" });
      changes.push({ pairId: pair.id, action: "unfreeze", reason: "检测结论更新，阻断解除" });
    }
  }
  return changes;
}
