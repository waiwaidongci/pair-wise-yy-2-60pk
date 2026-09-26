// 页面：血统档案 + 遗传病筛查检测审核（录入/更正/作废、适用种鸽、阻断原因、检测历史、配对管理）。

export const page = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>赛鸽血统环号登记站</title>
  <style>
    :root { --bg:#eff2f5; --panel:#fff; --ink:#1f2833; --muted:#697786; --line:#d3dce4; --accent:#315f83; --red:#9b3f35; --amber:#8a6d1f; --green:#2f6b3a; }
    * { box-sizing:border-box; } body { margin:0; background:var(--bg); color:var(--ink); font-family:Arial,"PingFang SC",sans-serif; }
    header { padding:22px 28px; background:#fff; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; gap:16px; align-items:center; }
    h1 { margin:0; font-size:26px; } h2 { margin:0 0 12px; font-size:18px; } h3 { margin:18px 0 8px; font-size:15px; }
    main { display:grid; grid-template-columns:380px 1fr; gap:22px; padding:22px 28px; }
    .side { display:grid; gap:16px; align-content:start; }
    form,.panel,.card,.stat { background:#fff; border:1px solid var(--line); border-radius:8px; padding:16px; }
    label { display:block; margin:10px 0 5px; color:var(--muted); font-size:13px; } input,select { width:100%; border:1px solid var(--line); border-radius:6px; padding:9px; font:inherit; }
    button { border:0; border-radius:6px; background:var(--accent); color:#fff; padding:8px 12px; font-weight:700; cursor:pointer; }
    form button { margin-top:14px; width:100%; }
    .toolbar { display:grid; grid-template-columns:1fr auto; gap:10px; margin-bottom:14px; } .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:12px; }
    .card { display:grid; gap:8px; } .meta { color:var(--muted); font-size:13px; }
    .pill { display:inline-block; border:1px solid var(--line); border-radius:999px; padding:3px 8px; font-size:12px; margin:2px 4px 2px 0; }
    .pill.ok { background:#e7f4ea; color:var(--green); border-color:#bcd9c2; }
    .pill.bad { background:#fbe7e4; color:var(--red); border-color:#eec5bf; }
    .g-clear { background:#e7f4ea; color:var(--green); border-color:#bcd9c2; }
    .g-carrier { background:#fdf3e0; color:var(--amber); border-color:#ecd9a8; }
    .g-affected { background:#fbe7e4; color:var(--red); border-color:#eec5bf; }
    .section { margin-top:14px; } .relation { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:14px; } .small { background:#f8fafb; border:1px solid var(--line); border-radius:8px; padding:10px; }
    .pair { border:1px solid var(--line); border-radius:8px; padding:10px 12px; margin-bottom:10px; background:#fbfcfd; }
    .mate { padding:9px 0; border-bottom:1px dashed var(--line); }
    .blocks { color:var(--red); font-size:13px; margin-top:4px; }
    ul.warns { color:var(--amber); }
    .risk-high { color:var(--red); } .risk-medium { color:var(--amber); } .risk-low { color:var(--green); } .risk-info { color:var(--muted); }
    table { width:100%; border-collapse:collapse; font-size:13px; } th,td { border-bottom:1px solid var(--line); padding:7px 6px; text-align:left; vertical-align:middle; }
    td button, .mate button { padding:5px 9px; font-size:12px; margin:0 4px 0 0; }
    tr.muted { opacity:.6; }
    .error { color:var(--red); font-size:13px; margin-top:8px; }
    .banner { background:#fdf3e0; border:1px solid #ecd9a8; color:var(--amber); border-radius:6px; padding:8px 10px; margin-top:12px; font-size:13px; display:flex; justify-content:space-between; gap:10px; align-items:center; }
    .banner button { width:auto; margin:0; padding:4px 10px; }
    .card-actions { display:flex; gap:8px; flex-wrap:wrap; }
    @media (max-width:900px){ header{display:block;padding:18px 16px;} main{grid-template-columns:1fr;padding:16px;} .relation{grid-template-columns:1fr;} }
  </style>
</head>
<body>
  <header><div><h1>赛鸽血统环号登记站</h1><div class="meta">档案、血统、转让、归巢成绩与遗传病筛查配对审核</div></div><button id="reload">刷新</button></header>
  <main>
    <div class="side">
      <form id="form">
        <h2>创建鸽只档案</h2>
        <label>足环号</label><input name="ringNo" required>
        <label>鸽主</label><input name="owner" required>
        <label>父鸽足环号</label><input name="fatherRing">
        <label>母鸽足环号</label><input name="motherRing">
        <label>羽色</label><input name="color" required>
        <label>出生棚号</label><input name="loft" required>
        <button>保存档案</button>
      </form>
      <form id="reportForm">
        <h2>录入检测报告</h2>
        <label>足环号</label>
        <select name="ringNo" required></select>
        <label>检测项目</label><input name="item" placeholder="如：进行性视网膜萎缩" required>
        <label>检测结论</label>
        <select name="conclusion">
          <option value="clear">阴性（不携带）</option>
          <option value="carrier">携带者</option>
          <option value="affected">患病</option>
        </select>
        <label>样本编号</label><input name="sampleNo" required>
        <label>报告日</label><input name="reportDate" type="date" required>
        <label>检测机构（可选）</label><input name="lab">
        <label>备注（可选）</label><input name="note">
        <div class="banner" id="correctBanner" hidden>正在更正报告 <b id="correctId"></b>，旧报告将留档<button type="button" id="cancelCorrect">取消更正</button></div>
        <button id="reportSubmit">保存报告</button>
      </form>
      <form id="pairForm">
        <h2>登记配组</h2>
        <label>鸽只 A</label><select name="ringA" required></select>
        <label>鸽只 B</label><select name="ringB" required></select>
        <button>登记配组</button>
        <div class="error" id="pairError"></div>
      </form>
    </div>
    <section>
      <div class="toolbar"><input id="search" placeholder="输入足环号查询血统与检测档案"><button id="searchBtn">查询</button></div>
      <div class="panel" id="detail"></div>
      <div class="panel section" id="pairs"></div>
      <div class="section grid" id="cards"></div>
    </section>
  </main>
  <script>
    const form = document.querySelector("#form");
    const reportForm = document.querySelector("#reportForm");
    const pairForm = document.querySelector("#pairForm");
    const cards = document.querySelector("#cards");
    const detail = document.querySelector("#detail");
    const pairsPanel = document.querySelector("#pairs");
    const search = document.querySelector("#search");
    const CONCLUSION_LABELS = { clear:"阴性", carrier:"携带者", affected:"患病" };
    const STATUS_LABELS = { valid:"有效", corrected:"被更正", revoked:"已作废" };
    const ACTION_LABELS = { create:"登记配组", freeze:"冻结", unfreeze:"恢复" };
    let pigeons = [], pairs = [], correctsId = null, lastGen = null;

    async function api(path, options) {
      const res = await fetch(path, options && options.body ? { ...options, headers:{ "Content-Type":"application/json" } } : options);
      const data = await res.json();
      if (!res.ok) {
        const err = new Error(data.message || data.error || "请求失败");
        err.blocks = data.blocks || [];
        throw err;
      }
      return data;
    }
    function blocksText(err) {
      return err.blocks && err.blocks.length ? "：" + err.blocks.map(b => b.reason || b).join("；") : "";
    }
    function today() { return new Date().toISOString().slice(0,10); }
    function pigeonOptions(selected) {
      return pigeons.map(p => '<option value="'+p.ringNo+'"'+(p.ringNo===selected?" selected":"")+'>'+p.ringNo+'（'+p.owner+'）</option>').join("");
    }
    function fillSelects() {
      reportForm.ringNo.innerHTML = pigeonOptions(reportForm.ringNo.value);
      pairForm.ringA.innerHTML = pigeonOptions(pairForm.ringA.value);
      pairForm.ringB.innerHTML = pigeonOptions(pairForm.ringB.value);
    }

    function renderCards() {
      cards.innerHTML = pigeons.map(p => {
        const genes = Object.entries(p.genetics || {});
        const geneHtml = genes.length
          ? '<div>'+genes.map(([item,c]) => '<span class="pill g-'+c+'">'+item+'：'+CONCLUSION_LABELS[c]+'</span>').join("")+'</div>'
          : '<div class="meta">遗传检测：暂无报告</div>';
        return '<article class="card"><h3>'+p.ringNo+'</h3><span class="pill">'+p.owner+'</span><div class="meta">'+p.color+' · '+p.loft+'</div><div>父：'+(p.fatherRing || "未登记")+'</div><div>母：'+(p.motherRing || "未登记")+'</div>'+geneHtml
          + '<div class="card-actions"><button data-view="'+p.ringNo+'">查看档案</button></div>'
          + '<label>录入转让</label><input data-to="'+p.ringNo+'" placeholder="新归属人"><button data-transfer="'+p.ringNo+'">保存转让</button>'
          + '<label>归巢成绩</label><input data-race="'+p.ringNo+'" placeholder="赛事/距离/名次，如200公里/200/6"><button data-score="'+p.ringNo+'">保存成绩</button></article>';
      }).join("");
      document.querySelectorAll("[data-view]").forEach(btn => btn.onclick = () => showPigeon(btn.dataset.view));
      document.querySelectorAll("[data-transfer]").forEach(btn => btn.onclick = async () => {
        const ringNo = btn.dataset.transfer; const to = document.querySelector('[data-to="'+ringNo+'"]').value;
        try { await api('/api/pigeons/'+encodeURIComponent(ringNo)+'/transfers', { method:'POST', body: JSON.stringify({ to }) }); await load(); }
        catch (err) { alert(err.message); }
      });
      document.querySelectorAll("[data-score]").forEach(btn => btn.onclick = async () => {
        const ringNo = btn.dataset.score; const raw = document.querySelector('[data-race="'+ringNo+'"]').value.split("/");
        try {
          await api('/api/pigeons/'+encodeURIComponent(ringNo)+'/races', { method:'POST', body: JSON.stringify({ event: raw[0] || "未命名赛事", distance: Number(raw[1] || 0), rank: Number(raw[2] || 0) }) });
          await load();
        } catch (err) { alert(err.message); }
      });
    }

    function renderPairs() {
      if (!pairs.length) { pairsPanel.innerHTML = '<h2>配对管理</h2><p class="meta">暂无配对记录。</p>'; return; }
      pairsPanel.innerHTML = '<h2>配对管理</h2>' + pairs.map(pair => {
        const status = pair.status === "frozen" ? '<span class="pill bad">已冻结</span>' : '<span class="pill ok">正常</span>';
        const blocks = pair.evaluation.blocks.length ? '<ul>'+pair.evaluation.blocks.map(b => '<li>'+b.reason+'</li>').join("")+'</ul>' : "";
        const warns = pair.evaluation.warnings.length ? '<ul class="warns">'+pair.evaluation.warnings.map(w => '<li>'+w.text+'</li>').join("")+'</ul>' : "";
        const risks = pair.risk.length ? '<div><b>后代风险提示</b><ul>'+pair.risk.map(r => '<li class="risk-'+r.level+'">'+r.text+'</li>').join("")+'</ul></div>' : '<div class="meta">后代风险：暂无检测数据</div>';
        const frozen = pair.status === "frozen" ? '<div class="blocks">冻结原因：'+pair.frozenReason+'（'+pair.frozenAt+'）</div>' : "";
        const history = pair.history.map(h => '<div class="meta">'+h.date+' · '+ACTION_LABELS[h.action]+(h.reason?'：'+h.reason:'')+'</div>').join("");
        return '<div class="pair"><b>'+pair.ringA+' × '+pair.ringB+'</b> '+status+'<span class="meta">配对编号 '+pair.id+'，登记于 '+pair.createdAt+'</span>'+frozen+blocks+warns+risks+history+'</div>';
      }).join("");
    }

    function renderRelationPlaceholder() {
      detail.dataset.ring = "";
      detail.innerHTML = '<h2>血统与检测档案</h2><p class="meta">请输入足环号查看父母子代、有效检测结论、后代风险提示、适用种鸽和检测历史。</p>';
    }

    function renderDetail(rel, gen, elig) {
      const p = rel.pigeon;
      detail.dataset.ring = p.ringNo;
      lastGen = gen;
      const relationHtml = '<h2>'+p.ringNo+' 血统档案</h2>'
        + '<div class="relation"><div class="small"><b>父鸽</b><br>'+(rel.father?.ringNo || p.fatherRing || "未登记")+'</div>'
        + '<div class="small"><b>本鸽</b><br>'+p.owner+' · '+p.color+'</div>'
        + '<div class="small"><b>母鸽</b><br>'+(rel.mother?.ringNo || p.motherRing || "未登记")+'</div></div>'
        + '<div><b>子代</b> '+(rel.children.map(c => c.ringNo).join("、") || "暂无")+'</div>'
        + '<div class="meta">转让：'+(p.transfers.map(t => t.from+"→"+t.to).join(" / ") || "暂无")+'</div>'
        + '<div class="meta">归巢：'+(p.races.map(r => r.event+" 第"+r.rank+"名").join(" / ") || "暂无")+'</div>';
      const effRows = gen.effective.length
        ? gen.effective.map(e => '<tr><td>'+e.item+'</td><td><span class="pill g-'+e.conclusion+'">'+CONCLUSION_LABELS[e.conclusion]+'</span></td><td>'+e.sampleNo+'</td><td>'+e.reportDate+'</td></tr>').join("")
        : '<tr><td colspan="4" class="meta">暂无有效检测报告</td></tr>';
      const riskHtml = gen.offspringRisk.length
        ? '<ul>'+gen.offspringRisk.map(r => '<li class="risk-'+r.level+'">'+r.text+'</li>').join("")+'</ul>'
        : '<div class="meta">父母未登记或暂无检测数据</div>';
      const matesHtml = elig.mates.length
        ? elig.mates.map(m => '<div class="mate"><b>'+m.ringNo+'</b> <span class="meta">'+m.owner+' · '+m.color+'</span> '
            + (m.allowed ? '<span class="pill ok">可配组</span><button data-pair="'+m.ringNo+'">配组</button>'
                         : '<span class="pill bad">阻断</span><div class="blocks">'+m.blocks.join("；")+'</div>')
            + (m.warnings.length ? '<div class="meta">'+m.warnings.join("；")+'</div>' : '') + '</div>').join("")
        : '<div class="meta">暂无其他鸽只</div>';
      const historyRows = gen.history.length
        ? '<table><thead><tr><th>项目</th><th>结论</th><th>样本编号</th><th>报告日</th><th>状态</th><th>操作</th></tr></thead><tbody>'
          + gen.history.map(r => '<tr'+(r.status!=="valid"?' class="muted"':'')+'><td>'+r.item+(r.note?'<div class="meta">'+r.note+'</div>':'')+'</td>'
            + '<td><span class="pill g-'+r.conclusion+'">'+CONCLUSION_LABELS[r.conclusion]+'</span></td><td>'+r.sampleNo+'</td><td>'+r.reportDate+'</td>'
            + '<td>'+STATUS_LABELS[r.status]+(r.correctedBy?' → '+r.correctedBy:'')+(r.corrects?'（更正自 '+r.corrects+'）':'')+'</td>'
            + '<td>'+(r.status==="valid"?'<button data-correct="'+r.id+'">更正</button><button data-revoke="'+r.id+'">作废</button>':'')+'</td></tr>').join("")
          + '</tbody></table>'
        : '<div class="meta">暂无检测记录</div>';
      detail.innerHTML = relationHtml
        + '<h3>有效检测结论<span class="meta">（同一项目只认最新有效报告）</span></h3>'
        + '<table><thead><tr><th>项目</th><th>结论</th><th>样本编号</th><th>报告日</th></tr></thead><tbody>'+effRows+'</tbody></table>'
        + '<h3>后代风险提示<span class="meta">（按父母最新有效结论推算）</span></h3>'+riskHtml
        + '<h3>适用种鸽</h3>'+matesHtml
        + '<h3>检测历史<span class="meta">（含已更正/作废的旧报告）</span></h3>'+historyRows;
      document.querySelectorAll("[data-pair]").forEach(btn => btn.onclick = async () => {
        try { await api('/api/pairs', { method:'POST', body: JSON.stringify({ ringA: p.ringNo, ringB: btn.dataset.pair }) }); await load(); }
        catch (err) { alert(err.message + blocksText(err)); }
      });
      document.querySelectorAll("[data-correct]").forEach(btn => btn.onclick = () => startCorrect(btn.dataset.correct));
      document.querySelectorAll("[data-revoke]").forEach(btn => btn.onclick = async () => {
        if (!confirm("确定作废该报告？相关配对和后代风险将按剩余有效报告重算。")) return;
        try { await api('/api/reports/'+btn.dataset.revoke+'/revoke', { method:'POST' }); await load(); }
        catch (err) { alert(err.message); }
      });
    }

    async function showPigeon(ringNo) {
      try {
        const [rel, gen, elig] = await Promise.all([
          api('/api/pigeons/'+encodeURIComponent(ringNo)+'/relation'),
          api('/api/pigeons/'+encodeURIComponent(ringNo)+'/genetics'),
          api('/api/pigeons/'+encodeURIComponent(ringNo)+'/eligible')
        ]);
        search.value = ringNo;
        renderDetail(rel, gen, elig);
      } catch (err) { alert(err.message); }
    }

    function startCorrect(id) {
      const r = lastGen.history.find(item => item.id === id);
      if (!r) return;
      correctsId = id;
      reportForm.ringNo.value = r.ringNo;
      reportForm.ringNo.disabled = true;
      reportForm.item.value = r.item;
      reportForm.item.disabled = true;
      reportForm.conclusion.value = r.conclusion;
      reportForm.sampleNo.value = r.sampleNo;
      reportForm.reportDate.value = today();
      document.querySelector("#correctId").textContent = id;
      document.querySelector("#correctBanner").hidden = false;
      document.querySelector("#reportSubmit").textContent = "保存更正报告";
      reportForm.scrollIntoView({ behavior:"smooth" });
    }
    function clearCorrect() {
      correctsId = null;
      reportForm.ringNo.disabled = false;
      reportForm.item.disabled = false;
      document.querySelector("#correctBanner").hidden = true;
      document.querySelector("#reportSubmit").textContent = "保存报告";
    }

    async function load() {
      pigeons = await api("/api/pigeons");
      pairs = await api("/api/pairs");
      fillSelects();
      renderCards();
      renderPairs();
      if (detail.dataset.ring) await showPigeon(detail.dataset.ring);
    }

    document.querySelector("#searchBtn").onclick = () => showPigeon(search.value.trim());
    document.querySelector("#reload").onclick = load;
    document.querySelector("#cancelCorrect").onclick = () => { clearCorrect(); reportForm.reset(); reportForm.reportDate.value = today(); };

    form.onsubmit = async event => {
      event.preventDefault();
      try {
        await api("/api/pigeons", { method:"POST", body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) });
        form.reset();
        await load();
      } catch (err) { alert(err.message); }
    };

    reportForm.onsubmit = async event => {
      event.preventDefault();
      const payload = {
        item: reportForm.item.value.trim(),
        conclusion: reportForm.conclusion.value,
        sampleNo: reportForm.sampleNo.value.trim(),
        reportDate: reportForm.reportDate.value,
        lab: reportForm.lab.value.trim(),
        note: reportForm.note.value.trim()
      };
      try {
        if (correctsId) await api('/api/reports/'+correctsId+'/correct', { method:'POST', body: JSON.stringify(payload) });
        else await api('/api/pigeons/'+encodeURIComponent(reportForm.ringNo.value)+'/reports', { method:'POST', body: JSON.stringify(payload) });
        reportForm.reset();
        reportForm.reportDate.value = today();
        clearCorrect();
        await load();
      } catch (err) { alert(err.message + blocksText(err)); }
    };

    pairForm.onsubmit = async event => {
      event.preventDefault();
      document.querySelector("#pairError").textContent = "";
      try {
        await api('/api/pairs', { method:'POST', body: JSON.stringify({ ringA: pairForm.ringA.value, ringB: pairForm.ringB.value }) });
        await load();
      } catch (err) { document.querySelector("#pairError").textContent = err.message + blocksText(err); }
    };

    renderRelationPlaceholder();
    reportForm.reportDate.value = today();
    load();
  </script>
</body>
</html>`;
