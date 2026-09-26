// 档案层：负责读写 data/pigeons.json，维护检测报告与配对记录，
// 并把判定层（src/rules.js）的结论落到配对状态上。

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluatePairings, pairingBlockers } from "./rules.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, "..", "data", "pigeons.json");

const today = () => new Date().toISOString().slice(0, 10);

// 初始档案含一桩历史教训：两只同项目携带者曾被配组（配对已冻结），幼鸽发病。
const seed = {
  pigeons: [
    { ringNo: "CHN-2026-001", owner: "北岸棚", fatherRing: "CHN-2022-188", motherRing: "CHN-2023-512", color: "灰", loft: "北岸A棚", vaccines: [{ date: "2026-04-01", name: "新城疫" }], transfers: [{ date: "2026-04-15", from: "育种棚", to: "北岸棚" }], races: [{ date: "2026-06-01", event: "120公里训放", distance: 120, returnTime: "10:42", rank: 18 }] },
    { ringNo: "CHN-2022-188", owner: "育种棚", fatherRing: "", motherRing: "", color: "雨点", loft: "种鸽棚", vaccines: [], transfers: [], races: [] },
    { ringNo: "CHN-2023-512", owner: "育种棚", fatherRing: "", motherRing: "", color: "红轮", loft: "种鸽棚", vaccines: [], transfers: [], races: [] }
  ],
  testReports: [
    { id: 1, ringNo: "CHN-2022-188", item: "遗传性神经震颤", conclusion: "携带", sampleNo: "YB-2603-011", reportDate: "2026-03-01", status: "valid", supersedes: null, createdAt: "2026-03-01" },
    { id: 2, ringNo: "CHN-2023-512", item: "遗传性神经震颤", conclusion: "携带", sampleNo: "YB-2603-012", reportDate: "2026-03-01", status: "valid", supersedes: null, createdAt: "2026-03-01" },
    { id: 3, ringNo: "CHN-2026-001", item: "遗传性神经震颤", conclusion: "患病", sampleNo: "YB-2605-007", reportDate: "2026-05-10", status: "valid", supersedes: null, createdAt: "2026-05-10" }
  ],
  pairings: [
    {
      id: 1,
      maleRing: "CHN-2022-188",
      femaleRing: "CHN-2023-512",
      createdAt: "2026-02-10",
      status: "frozen",
      frozenReasons: ["双方「遗传性神经震颤」最新有效报告均为携带，同病携带者不得配组"],
      events: [
        { date: "2026-02-10", action: "created", reasons: [] },
        { date: "2026-03-01", action: "frozen", reasons: ["双方「遗传性神经震颤」最新有效报告均为携带，同病携带者不得配组"] }
      ]
    }
  ],
  seq: { report: 3, pairing: 1 }
};

function migrate(db) {
  db.testReports ||= [];
  db.pairings ||= [];
  db.seq ||= { report: 0, pairing: 0 };
  db.seq.report = Math.max(db.seq.report || 0, ...db.testReports.map(r => r.id || 0));
  db.seq.pairing = Math.max(db.seq.pairing || 0, ...db.pairings.map(p => p.id || 0));
  for (const pigeon of db.pigeons) {
    pigeon.vaccines ||= [];
    pigeon.transfers ||= [];
    pigeon.races ||= [];
  }
  for (const pairing of db.pairings) {
    pairing.events ||= [];
    pairing.frozenReasons ||= [];
  }
  return db;
}

export async function loadDb() {
  if (!existsSync(dbPath)) {
    await mkdir(dirname(dbPath), { recursive: true });
    await writeFile(dbPath, JSON.stringify(seed, null, 2));
  }
  return migrate(JSON.parse(await readFile(dbPath, "utf8")));
}

export async function saveDb(db) {
  await writeFile(dbPath, JSON.stringify(db, null, 2));
}

export function findPigeon(db, ringNo) {
  return db.pigeons.find(item => item.ringNo === ringNo) || null;
}

export function relation(db, ringNo) {
  const pigeon = findPigeon(db, ringNo);
  if (!pigeon) return null;
  const father = db.pigeons.find(item => item.ringNo === pigeon.fatherRing) || null;
  const mother = db.pigeons.find(item => item.ringNo === pigeon.motherRing) || null;
  const children = db.pigeons.filter(item => item.fatherRing === ringNo || item.motherRing === ringNo);
  return { pigeon, father, mother, children };
}

// 报告变化后重算配对：违规的立即冻结（关系与原因都留下），恢复清白的解冻，全部写进 events。
function reevaluatePairings(db) {
  const changes = evaluatePairings(db.testReports, db.pairings);
  for (const change of changes) {
    const pairing = change.pairing;
    pairing.status = change.action === "frozen" ? "frozen" : "active";
    pairing.frozenReasons = change.reasons;
    pairing.events.push({ date: today(), action: change.action, reasons: change.reasons });
  }
  return changes;
}

// 录入一份有效检测报告（每羽、按项目：结论 + 样本编号 + 报告日），随后重算配对。
export function addReport(db, input) {
  const report = {
    id: ++db.seq.report,
    ringNo: input.ringNo,
    item: input.item,
    conclusion: input.conclusion,
    sampleNo: input.sampleNo,
    reportDate: input.reportDate || today(),
    status: "valid",
    supersedes: null,
    createdAt: today()
  };
  db.testReports.push(report);
  const changes = reevaluatePairings(db);
  return { report, changes };
}

// 结论改错：旧报告作废但保留可查（检测历史仍看得到），新报告按"同项目最新有效"参与判定，
// 相关配对与后代风险提示随之重算。
export function correctReport(db, id, input) {
  const old = db.testReports.find(report => report.id === id);
  if (!old) return { error: "report_not_found" };
  if (old.status !== "valid") return { error: "report_not_valid" };
  old.status = "void";
  old.voidReason = input.reason || "结论改错";
  const report = {
    id: ++db.seq.report,
    ringNo: old.ringNo,
    item: old.item,
    conclusion: input.conclusion,
    sampleNo: input.sampleNo || old.sampleNo,
    reportDate: input.reportDate || today(),
    status: "valid",
    supersedes: old.id,
    createdAt: today()
  };
  old.replacedBy = report.id;
  db.testReports.push(report);
  const changes = reevaluatePairings(db);
  return { old, report, changes };
}

// 新配对先过判定：不通过直接拒绝，不建关系。
export function addPairing(db, maleRing, femaleRing) {
  const reasons = pairingBlockers(db.testReports, maleRing, femaleRing);
  if (reasons.length) return { error: "pairing_blocked", reasons };
  const duplicated = db.pairings.some(
    pairing =>
      (pairing.maleRing === maleRing && pairing.femaleRing === femaleRing) ||
      (pairing.maleRing === femaleRing && pairing.femaleRing === maleRing)
  );
  if (duplicated) return { error: "pairing_exists" };
  const pairing = {
    id: ++db.seq.pairing,
    maleRing,
    femaleRing,
    createdAt: today(),
    status: "active",
    frozenReasons: [],
    events: [{ date: today(), action: "created", reasons: [] }]
  };
  db.pairings.push(pairing);
  return { pairing };
}
