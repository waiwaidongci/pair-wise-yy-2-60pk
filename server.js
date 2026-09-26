import http from "node:http";
import { loadDb, saveDb, findPigeon, relation, addReport, correctReport, addPairing } from "./src/store.js";
import { isConclusion, effectiveReports, offspringRisks, breedingCandidates } from "./src/rules.js";
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

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const db = await loadDb();
    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "Content-Type":"text/html; charset=utf-8" });
      return res.end(page);
    }
    if (req.method === "GET" && url.pathname === "/api/pigeons") {
      const list = db.pigeons.map(pigeon => ({
        ...pigeon,
        screening: [...effectiveReports(db.testReports, pigeon.ringNo).values()]
          .map(report => ({ item: report.item, conclusion: report.conclusion }))
      }));
      return sendJson(res, 200, list);
    }
    if (req.method === "POST" && url.pathname === "/api/pigeons") {
      const input = await body(req);
      if (db.pigeons.some(item => item.ringNo === input.ringNo)) return sendJson(res, 409, { error: "ring_exists" });
      const pigeon = { ...input, vaccines: [], transfers: [], races: [] };
      db.pigeons.unshift(pigeon);
      await saveDb(db);
      return sendJson(res, 201, pigeon);
    }
    const relationMatch = url.pathname.match(/^\/api\/pigeons\/(.+)\/relation$/);
    if (relationMatch && req.method === "GET") {
      const data = relation(db, decodeURIComponent(relationMatch[1]));
      return data ? sendJson(res, 200, data) : sendJson(res, 404, { error: "pigeon_not_found" });
    }
    // 检测审核：当前有效结论 + 全部检测历史（含已更正的旧报告）+ 本鸽发病风险
    const screeningMatch = url.pathname.match(/^\/api\/pigeons\/(.+)\/screening$/);
    if (screeningMatch && req.method === "GET") {
      const ringNo = decodeURIComponent(screeningMatch[1]);
      const pigeon = findPigeon(db, ringNo);
      if (!pigeon) return sendJson(res, 404, { error: "pigeon_not_found" });
      const effective = [...effectiveReports(db.testReports, ringNo).values()];
      const history = db.testReports.filter(report => report.ringNo === ringNo).sort((a, b) => b.id - a.id);
      const risks = pigeon.fatherRing || pigeon.motherRing
        ? offspringRisks(db.testReports, pigeon.fatherRing, pigeon.motherRing)
        : [];
      return sendJson(res, 200, { effective, history, risks });
    }
    // 配组审核：适用种鸽与阻断原因
    const breedingMatch = url.pathname.match(/^\/api\/pigeons\/(.+)\/breeding$/);
    if (breedingMatch && req.method === "GET") {
      const ringNo = decodeURIComponent(breedingMatch[1]);
      if (!findPigeon(db, ringNo)) return sendJson(res, 404, { error: "pigeon_not_found" });
      return sendJson(res, 200, breedingCandidates(db.testReports, db.pigeons, ringNo));
    }
    // 录入检测报告：每羽按项目记结论、样本编号、报告日
    const reportMatch = url.pathname.match(/^\/api\/pigeons\/(.+)\/reports$/);
    if (reportMatch && req.method === "POST") {
      const ringNo = decodeURIComponent(reportMatch[1]);
      if (!findPigeon(db, ringNo)) return sendJson(res, 404, { error: "pigeon_not_found" });
      const input = await body(req);
      if (!input.item || !input.sampleNo) return sendJson(res, 400, { error: "item_and_sampleNo_required" });
      if (!isConclusion(input.conclusion)) return sendJson(res, 400, { error: "conclusion_invalid" });
      const result = addReport(db, { ...input, ringNo });
      await saveDb(db);
      return sendJson(res, 201, result);
    }
    // 结论改错：旧报告作废保留，相关配对与后代风险按新结论重算
    const correctMatch = url.pathname.match(/^\/api\/reports\/(\d+)\/correct$/);
    if (correctMatch && req.method === "POST") {
      const input = await body(req);
      if (!isConclusion(input.conclusion)) return sendJson(res, 400, { error: "conclusion_invalid" });
      const result = correctReport(db, Number(correctMatch[1]), input);
      if (result.error === "report_not_found") return sendJson(res, 404, result);
      if (result.error) return sendJson(res, 409, result);
      await saveDb(db);
      return sendJson(res, 200, result);
    }
    if (req.method === "GET" && url.pathname === "/api/pairings") {
      const list = db.pairings.map(pairing => ({
        ...pairing,
        risks: offspringRisks(db.testReports, pairing.maleRing, pairing.femaleRing)
      }));
      return sendJson(res, 200, list);
    }
    if (req.method === "POST" && url.pathname === "/api/pairings") {
      const input = await body(req);
      if (!input.maleRing || !input.femaleRing || input.maleRing === input.femaleRing) {
        return sendJson(res, 400, { error: "pairing_rings_invalid" });
      }
      if (!findPigeon(db, input.maleRing) || !findPigeon(db, input.femaleRing)) {
        return sendJson(res, 404, { error: "pigeon_not_found" });
      }
      const result = addPairing(db, input.maleRing, input.femaleRing);
      if (result.error) return sendJson(res, 409, result);
      await saveDb(db);
      return sendJson(res, 201, result.pairing);
    }
    const actionMatch = url.pathname.match(/^\/api\/pigeons\/(.+)\/(transfers|races|vaccines)$/);
    if (actionMatch && req.method === "POST") {
      const pigeon = findPigeon(db, decodeURIComponent(actionMatch[1]));
      if (!pigeon) return sendJson(res, 404, { error: "pigeon_not_found" });
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
    sendJson(res, 404, { error: "not_found" });
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
});

server.listen(port, () => console.log(`Racing pigeon registry app listening on http://localhost:${port}`));
