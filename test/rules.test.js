import test from "node:test";
import assert from "node:assert/strict";
import { effectiveReports, pairingBlockers, offspringRisks, evaluatePairings } from "../src/rules.js";
import { addReport, correctReport, addPairing } from "../src/store.js";

const R = (id, ringNo, item, conclusion, reportDate, status = "valid") =>
  ({ id, ringNo, item, conclusion, sampleNo: "S" + id, reportDate, status });

const emptyDb = () => ({ pigeons: [], testReports: [], pairings: [], seq: { report: 0, pairing: 0 } });

test("同项目只认最新有效报告（按报告日）", () => {
  const reports = [R(1, "A", "项目甲", "携带", "2026-01-01"), R(2, "A", "项目甲", "阴性", "2026-02-01")];
  assert.equal(effectiveReports(reports, "A").get("项目甲").conclusion, "阴性");
});

test("作废报告不参与判定，但仍留在档案可查", () => {
  const reports = [R(1, "A", "项目甲", "携带", "2026-01-01", "void"), R(2, "A", "项目甲", "阴性", "2026-02-01")];
  assert.equal(effectiveReports(reports, "A").get("项目甲").conclusion, "阴性");
  assert.equal(reports.length, 2);
});

test("两只同项目携带者不得配组", () => {
  const reports = [R(1, "A", "项目甲", "携带", "2026-01-01"), R(2, "B", "项目甲", "携带", "2026-01-01")];
  assert.equal(pairingBlockers(reports, "A", "B").length, 1);
});

test("不同项目各为携带者不阻断", () => {
  const reports = [R(1, "A", "项目甲", "携带", "2026-01-01"), R(2, "B", "项目乙", "携带", "2026-01-01")];
  assert.equal(pairingBlockers(reports, "A", "B").length, 0);
});

test("患病鸽与任何鸽都不得配组", () => {
  const reports = [R(1, "A", "项目甲", "患病", "2026-01-01")];
  assert.ok(pairingBlockers(reports, "A", "B").length >= 1);
  assert.ok(pairingBlockers(reports, "B", "A").length >= 1);
});

test("结论改错后配对按新结论重算：先冻结、更正后恢复", () => {
  const pairings = [{ id: 1, maleRing: "A", femaleRing: "B", status: "active", frozenReasons: [], events: [] }];
  const before = [R(1, "A", "项目甲", "携带", "2026-01-01"), R(2, "B", "项目甲", "携带", "2026-01-01")];
  assert.equal(evaluatePairings(before, pairings)[0].action, "frozen");
  pairings[0].status = "frozen";
  const after = [R(1, "A", "项目甲", "携带", "2026-01-01"), R(2, "B", "项目甲", "携带", "2026-01-01", "void"), R(3, "B", "项目甲", "阴性", "2026-03-01")];
  assert.equal(evaluatePairings(after, pairings)[0].action, "restored");
});

test("后代风险提示按亲代结论分级", () => {
  const both = offspringRisks([R(1, "A", "项目甲", "携带", "2026-01-01"), R(2, "B", "项目甲", "携带", "2026-01-01")], "A", "B");
  assert.equal(both[0].level, "高");
  const one = offspringRisks([R(1, "A", "项目甲", "携带", "2026-01-01"), R(2, "B", "项目甲", "阴性", "2026-01-01")], "A", "B");
  assert.equal(one[0].level, "中");
  const sick = offspringRisks([R(1, "A", "项目甲", "患病", "2026-01-01")], "A", "B");
  assert.equal(sick[0].level, "高");
});

test("档案层：新报告让已配对的立即冻结并留下原关系", () => {
  const db = emptyDb();
  db.pairings.push({ id: 1, maleRing: "A", femaleRing: "B", status: "active", frozenReasons: [], events: [] });
  addReport(db, { ringNo: "A", item: "项目甲", conclusion: "携带", sampleNo: "S1", reportDate: "2026-01-01" });
  const { changes } = addReport(db, { ringNo: "B", item: "项目甲", conclusion: "携带", sampleNo: "S2", reportDate: "2026-01-02" });
  assert.equal(db.pairings[0].status, "frozen");
  assert.ok(db.pairings[0].frozenReasons.length > 0);
  assert.equal(changes[0].action, "frozen");
  assert.equal(db.pairings.length, 1); // 原关系保留
});

test("档案层：更正报告后旧报告保留、配对按新结论恢复", () => {
  const db = emptyDb();
  db.pairings.push({ id: 1, maleRing: "A", femaleRing: "B", status: "active", frozenReasons: [], events: [] });
  addReport(db, { ringNo: "A", item: "项目甲", conclusion: "携带", sampleNo: "S1", reportDate: "2026-01-01" });
  addReport(db, { ringNo: "B", item: "项目甲", conclusion: "携带", sampleNo: "S2", reportDate: "2026-01-02" });
  assert.equal(db.pairings[0].status, "frozen");
  const { old, report } = correctReport(db, 2, { conclusion: "阴性", sampleNo: "S3", reportDate: "2026-02-01" });
  assert.equal(old.status, "void");
  assert.equal(db.testReports.length, 3); // 旧报告仍能查
  assert.equal(report.supersedes, 2);
  assert.equal(db.pairings[0].status, "active"); // 按新结论重算后恢复
});

test("档案层：违规配组直接拒绝，不建关系", () => {
  const db = emptyDb();
  db.testReports.push(R(1, "A", "项目甲", "患病", "2026-01-01"));
  const result = addPairing(db, "A", "B");
  assert.equal(result.error, "pairing_blocked");
  assert.equal(db.pairings.length, 0);
});
