// 路由层：判定见 src/genetics.js，档案见 src/store.js，页面见 src/page.js。

import http from "node:http";
import { loadDb, saveDb, addReport, correctReport, revokeReport, addPair } from "./src/store.js";
import { evaluatePair, offspringRisk, eligibleMates, geneticsProfile, effectiveGenetics } from "./src/genetics.js";
import { page } from "./src/page.js";

const port = Number(process.env.PORT || 3024);

async function body(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}
function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data, null, 2));
}
function relation(db, ringNo) {
  const pigeon = db.pigeons.find(item => item.ringNo === ringNo);
  if (!pigeon) return null;
  const father = db.pigeons.find(item => item.ringNo === pigeon.fatherRing) || null;
  const mother = db.pigeons.find(item => item.ringNo === pigeon.motherRing) || null;
  const children = db.pigeons.filter(item => item.fatherRing === ringNo || item.motherRing === ringNo);
  return { pigeon, father, mother, children };
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const db = await loadDb();

    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(page);
    }

    // 鸽只档案
    if (req.method === "GET" && url.pathname === "/api/pigeons") {
      return sendJson(res, 200, db.pigeons.map(pigeon => ({ ...pigeon, genetics: effectiveGenetics(db, pigeon.ringNo) })));
    }
    if (req.method === "POST" && url.pathname === "/api/pigeons") {
      const input = await body(req);
      if (db.pigeons.some(item => item.ringNo === input.ringNo)) return sendJson(res, 409, { error: "ring_exists", message: "足环号已存在" });
      const pigeon = { ...input, vaccines: [], transfers: [], races: [] };
      db.pigeons.unshift(pigeon);
      await saveDb(db);
      return sendJson(res, 201, pigeon);
    }
    const relationMatch = url.pathname.match(/^\/api\/pigeons\/(.+)\/relation$/);
    if (relationMatch && req.method === "GET") {
      const data = relation(db, decodeURIComponent(relationMatch[1]));
      return data ? sendJson(res, 200, data) : sendJson(res, 404, { error: "pigeon_not_found", message: "鸽只不存在" });
    }
    const actionMatch = url.pathname.match(/^\/api\/pigeons\/(.+)\/(transfers|races|vaccines)$/);
    if (actionMatch && req.method === "POST") {
      const pigeon = db.pigeons.find(item => item.ringNo === decodeURIComponent(actionMatch[1]));
      if (!pigeon) return sendJson(res, 404, { error: "pigeon_not_found", message: "鸽只不存在" });
      const input = await body(req);
      if (actionMatch[2] === "transfers") {
        const transfer = { date: input.date || new Date().toISOString().slice(0, 10), from: pigeon.owner, to: input.to };
        pigeon.owner = input.to;
        pigeon.transfers.push(transfer);
      }
      if (actionMatch[2] === "races") pigeon.races.push({ date: input.date || new Date().toISOString().slice(0, 10), event: input.event, distance: Number(input.distance || 0), returnTime: input.returnTime || "", rank: Number(input.rank || 0) });
      if (actionMatch[2] === "vaccines") pigeon.vaccines.push({ date: input.date || new Date().toISOString().slice(0, 10), name: input.name });
      await saveDb(db);
      return sendJson(res, 200, pigeon);
    }

    // 遗传检测档案：有效结论 + 检测历史 + 后代风险提示 / 适用种鸽
    const geneticsMatch = url.pathname.match(/^\/api\/pigeons\/(.+)\/(genetics|eligible)$/);
    if (geneticsMatch && req.method === "GET") {
      const ringNo = decodeURIComponent(geneticsMatch[1]);
      if (!db.pigeons.some(item => item.ringNo === ringNo)) {
        return sendJson(res, 404, { error: "pigeon_not_found", message: "鸽只不存在" });
      }
      if (geneticsMatch[2] === "genetics") return sendJson(res, 200, { ringNo, ...geneticsProfile(db, ringNo) });
      return sendJson(res, 200, { ringNo, mates: eligibleMates(db, ringNo) });
    }

    // 检测报告：登记、更正、作废（更正/作废后相关配对与后代风险自动重算，旧报告留档可查）
    const reportMatch = url.pathname.match(/^\/api\/pigeons\/(.+)\/reports$/);
    if (reportMatch && req.method === "POST") {
      const result = addReport(db, decodeURIComponent(reportMatch[1]), await body(req));
      await saveDb(db);
      return sendJson(res, 201, result);
    }
    const reportActionMatch = url.pathname.match(/^\/api\/reports\/(.+)\/(correct|revoke)$/);
    if (reportActionMatch && req.method === "POST") {
      const reportId = decodeURIComponent(reportActionMatch[1]);
      const result = reportActionMatch[2] === "correct"
        ? correctReport(db, reportId, await body(req))
        : revokeReport(db, reportId);
      await saveDb(db);
      return sendJson(res, reportActionMatch[2] === "correct" ? 201 : 200, result);
    }

    // 配对：列表（含当前判定与后代风险）、登记（判定不通过即拒绝）
    if (req.method === "GET" && url.pathname === "/api/pairs") {
      return sendJson(res, 200, db.pairs.map(pair => ({
        ...pair,
        evaluation: evaluatePair(db, pair.ringA, pair.ringB),
        risk: offspringRisk(db, pair.ringA, pair.ringB)
      })));
    }
    if (req.method === "POST" && url.pathname === "/api/pairs") {
      const input = await body(req);
      const pair = addPair(db, input.ringA, input.ringB);
      await saveDb(db);
      return sendJson(res, 201, pair);
    }

    sendJson(res, 404, { error: "not_found", message: "接口不存在" });
  } catch (error) {
    sendJson(res, error.status || 500, {
      error: error.code || "server_error",
      message: error.message,
      ...(error.extra || {})
    });
  }
});

server.listen(port, () => console.log(`Racing pigeon registry app listening on http://localhost:${port}`));
