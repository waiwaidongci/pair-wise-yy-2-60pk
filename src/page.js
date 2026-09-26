// 页面层：只负责展示与交互。判定见 src/rules.js，档案见 src/store.js。
export const page = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>赛鸽血统环号登记站</title>
  <style>
    :root { --bg:#eff2f5; --panel:#fff; --ink:#1f2833; --muted:#697786; --line:#d3dce4; --accent:#315f83; --red:#9b3f35; --green:#276c3c; --orange:#8a5a00; }
    * { box-sizing:border-box; } body { margin:0; background:var(--bg); color:var(--ink); font-family:Arial,"PingFang SC",sans-serif; }
    header { padding:22px 28px; background:#fff; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; gap:16px; align-items:center; }
    h1 { margin:0; font-size:26px; } main { display:grid; grid-template-columns:380px 1fr; gap:22px; padding:22px 28px; }
    form,.panel,.card,.stat { background:#fff; border:1px solid var(--line); border-radius:8px; padding:16px; } h2 { margin:0 0 12px; font-size:18px; }
    label { display:block; margin:10px 0 5px; color:var(--muted); font-size:13px; } input,select { width:100%; border:1px solid var(--line); border-radius:6px; padding:9px; font:inherit; }
    button { border:0; border-radius:6px; background:var(--accent); color:#fff; padding:10px 13px; font-weight:700; cursor:pointer; }
    .toolbar { display:grid; grid-template-columns:1fr auto; gap:10px; margin-bottom:14px; } .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:12px; }
    .card { display:grid; gap:8px; } .meta { color:var(--muted); font-size:13px; } .pill { display:inline-block; border:1px solid var(--line); border-radius:999px; padding:3px 8px; font-size:12px; }
    .section { margin-top:14px; } .relation { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:14px; } .small { background:#f8fafb; border:1px solid var(--line); border-radius:8px; padding:10px; }
    .side { display:grid; gap:22px; align-content:start; }
    table { width:100%; border-collapse:collapse; font-size:13px; margin-top:8px; } th,td { border-bottom:1px solid var(--line); padding:6px 8px; text-align:left; } th { color:var(--muted); font-weight:400; }
    .void td { color:var(--muted); }
    .c-阴性 { background:#e6f4ea; border-color:#b7dfc0; color:var(--green); }
    .c-携带 { background:#fdf3e0; border-color:#ecd9a8; color:var(--orange); }
    .c-患病 { background:#fbe7e4; border-color:#eec5bf; color:var(--red); }
    .ok { background:#e6f4ea; border-color:#b7dfc0; color:var(--green); }
    .bad { background:#fbe7e4; border-color:#eec5bf; color:var(--red); }
    .mid { background:#fdf3e0; border-color:#ecd9a8; color:var(--orange); }
    .block { background:#fbe7e4; border:1px solid #eec5bf; border-radius:6px; padding:8px 10px; font-size:13px; margin:4px 0; }
    .frozen { border-color:var(--red); }
    .banner { background:#fdf3e0; border:1px solid #ecd9a8; border-radius:6px; padding:8px 10px; font-size:13px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; gap:8px; }
    .banner button { background:#fff; color:var(--ink); border:1px solid var(--line); padding:4px 8px; }
    .msg { font-size:13px; margin-top:8px; } .msg.err { color:var(--red); }
    ul { margin:6px 0; padding-left:18px; } li { margin:2px 0; font-size:13px; }
    button.link { background:none; color:var(--accent); padding:0; font-weight:400; }
    @media (max-width:900px){ header{display:block;padding:18px 16px;} main{grid-template-columns:1fr;padding:16px;} .relation{grid-template-columns:1fr;} }
  </style>
</head>
<body>
  <header><div><h1>赛鸽血统环号登记站</h1><div class="meta">档案、血统、转让、归巢成绩与遗传病检测审核</div></div><button id="reload">刷新</button></header>
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
        <div class="banner" id="correctBanner" hidden><span>正在更正报告 #<b id="correctNo"></b>，旧报告将作废保留</span><button type="button" id="cancelCorrect">取消更正</button></div>
        <label>足环号</label><input name="ringNo" required>
        <label>检测项目</label><input name="item" required placeholder="如 遗传性神经震颤">
        <label>结论</label><select name="conclusion"><option>阴性</option><option>携带</option><option>患病</option></select>
        <label>样本编号</label><input name="sampleNo" required>
        <label>报告日</label><input name="reportDate" type="date" required>
        <button>保存报告</button>
        <div class="msg" id="reportMsg"></div>
      </form>
      <form id="pairForm">
        <h2>建立配对</h2>
        <label>雄鸽足环号</label><input name="maleRing" required>
        <label>雌鸽足环号</label><input name="femaleRing" required>
        <button>提交配组审核</button>
        <div class="msg" id="pairMsg"></div>
      </form>
    </div>
    <section>
      <div class="toolbar"><input id="search" placeholder="输入足环号查询血统与检测"><button id="searchBtn">查询</button></div>
      <div class="panel" id="detail"></div>
      <div class="panel section" id="pairings"></div>
      <div class="section grid" id="cards"></div>
    </section>
  </main>
  <script>
    const form = document.querySelector("#form");
    const reportForm = document.querySelector("#reportForm");
    const pairForm = document.querySelector("#pairForm");
    const cards = document.querySelector("#cards");
    const detail = document.querySelector("#detail");
    const pairingsBox = document.querySelector("#pairings");
    const search = document.querySelector("#search");
    const reportMsg = document.querySelector("#reportMsg");
    const pairMsg = document.querySelector("#pairMsg");
    let pigeons = [];
    let pairings = [];
    let detailRing = null;
    let correctId = null;

    async function api(path, options) {
      const res = await fetch(path, options && options.body ? { ...options, headers:{ "Content-Type":"application/json" } } : options);
      const data = await res.json();
      if (!res.ok) { const err = new Error(data.error || "请求失败"); err.data = data; throw err; }
      return data;
    }
    function enc(s){ return encodeURIComponent(s); }
    function riskLine(r){ return '<li><span class="pill '+(r.level==='高'?'bad':r.level==='中'?'mid':'')+'">'+r.level+'</span> '+r.note+'</li>'; }

    function renderCards() {
      cards.innerHTML = pigeons.map(p => '<article class="card"><h3>'+p.ringNo+'</h3><span class="pill">'+p.owner+'</span><div class="meta">'+p.color+' · '+p.loft+'</div>'+
        '<div>'+(p.screening.map(s => '<span class="pill c-'+s.conclusion+'">'+s.item+'：'+s.conclusion+'</span>').join(" ") || '<span class="meta">未检测</span>')+'</div>'+
        '<div>父：'+(p.fatherRing || "未登记")+'</div><div>母：'+(p.motherRing || "未登记")+'</div>'+
        '<button data-detail="'+p.ringNo+'">血统 / 检测 / 配组</button>'+
        '<label>录入转让</label><input data-to="'+p.ringNo+'" placeholder="新归属人"><button data-transfer="'+p.ringNo+'">保存转让</button>'+
        '<label>归巢成绩</label><input data-race="'+p.ringNo+'" placeholder="赛事/距离/名次，如200公里/200/6"><button data-score="'+p.ringNo+'">保存成绩</button></article>').join("");
      document.querySelectorAll("[data-detail]").forEach(btn => btn.onclick = () => { detailRing = btn.dataset.detail; showDetail(detailRing); });
      document.querySelectorAll("[data-transfer]").forEach(btn => btn.onclick = async () => {
        const ringNo = btn.dataset.transfer; const to = document.querySelector('[data-to="'+ringNo+'"]').value;
        await api('/api/pigeons/'+enc(ringNo)+'/transfers', { method:'POST', body: JSON.stringify({ to }) }); await load();
      });
      document.querySelectorAll("[data-score]").forEach(btn => btn.onclick = async () => {
        const ringNo = btn.dataset.score; const raw = document.querySelector('[data-race="'+ringNo+'"]').value.split("/");
        await api('/api/pigeons/'+enc(ringNo)+'/races', { method:'POST', body: JSON.stringify({ event: raw[0] || "未命名赛事", distance: Number(raw[1] || 0), rank: Number(raw[2] || 0) }) }); await load();
      });
    }

    function renderPairings() {
      pairingsBox.innerHTML = '<h2>配对审核</h2>' + (pairings.length ? pairings.map(p =>
        '<article class="card'+(p.status==='frozen'?' frozen':'')+'"><h3>'+p.maleRing+' × '+p.femaleRing+'</h3>'+
        '<div><span class="pill '+(p.status==='frozen'?'bad':'ok')+'">'+(p.status==='frozen'?'已冻结':'正常')+'</span> <span class="meta">建立于 '+p.createdAt+'</span></div>'+
        (p.frozenReasons && p.frozenReasons.length ? '<div class="block">阻断原因：'+p.frozenReasons.join("；")+'</div>' : '')+
        '<div><b>后代风险提示</b><ul>'+(p.risks.length ? p.risks.map(riskLine).join("") : '<li class="meta">暂无</li>')+'</ul></div>'+
        '<div class="meta">记录：'+p.events.map(e => e.date+' '+(e.action==='created'?'建立':e.action==='frozen'?'冻结':'恢复')).join(" / ")+'</div></article>'
      ).join("") : '<p class="meta">暂无配对记录。</p>');
    }

    function renderDetail(data, screening, breeding) {
      const p = data.pigeon;
      const eff = screening.effective.length ? screening.effective.map(r => '<span class="pill c-'+r.conclusion+'">'+r.item+'：'+r.conclusion+'</span>').join(" ") : '<span class="meta">暂无有效报告</span>';
      const history = screening.history.map(r => '<tr'+(r.status==='valid'?'':' class="void"')+'><td>'+r.item+'</td><td>'+r.conclusion+'</td><td>'+r.sampleNo+'</td><td>'+r.reportDate+'</td><td>'+(r.status==='valid'?'有效':'已更正'+(r.voidReason?'：'+r.voidReason:''))+'</td><td>'+(r.status==='valid'?'<button class="link" data-correct="'+r.id+'" data-item="'+r.item+'" data-sample="'+r.sampleNo+'">改错更正</button>':'')+'</td></tr>').join("");
      detail.innerHTML =
        '<h2>'+p.ringNo+' 血统档案</h2>'+
        '<div class="relation"><div class="small"><b>父鸽</b><br>'+(data.father?.ringNo || p.fatherRing || "未登记")+'</div><div class="small"><b>本鸽</b><br>'+p.owner+' · '+p.color+'</div><div class="small"><b>母鸽</b><br>'+(data.mother?.ringNo || p.motherRing || "未登记")+'</div></div>'+
        '<div><b>子代</b> '+(data.children.map(c => c.ringNo).join("、") || "暂无")+'</div>'+
        '<div class="meta">转让：'+(p.transfers.map(t => t.from+"→"+t.to).join(" / ") || "暂无")+'</div>'+
        '<div class="meta">归巢：'+(p.races.map(r => r.event+" 第"+r.rank+"名").join(" / ") || "暂无")+'</div>'+
        '<h2 class="section">检测审核（同项目只认最新有效报告）</h2><div>'+eff+'</div>'+
        (screening.risks.length ? '<div><b>本鸽发病风险</b><ul>'+screening.risks.map(riskLine).join("")+'</ul></div>' : '')+
        '<table><tr><th>项目</th><th>结论</th><th>样本编号</th><th>报告日</th><th>状态</th><th></th></tr>'+(history || '<tr><td colspan="6" class="meta">暂无检测历史</td></tr>')+'</table>'+
        '<h2 class="section">配组审核</h2>'+
        '<div><b>适用种鸽</b><br>'+(breeding.applicable.map(b => '<span class="pill ok">'+b.ringNo+'（'+b.owner+'）</span>').join(" ") || '<span class="meta">暂无</span>')+'</div>'+
        (breeding.blocked.length ? '<div class="section"><b>阻断原因</b>'+breeding.blocked.map(b => '<div class="block">'+b.ringNo+'（'+b.owner+'）：'+b.reasons.join("；")+'</div>').join("")+'</div>' : '');
      document.querySelectorAll("[data-correct]").forEach(btn => btn.onclick = () => startCorrect(btn.dataset));
    }

    async function showDetail(ringNo) {
      try {
        const [relation, screening, breeding] = await Promise.all([
          api('/api/pigeons/'+enc(ringNo)+'/relation'),
          api('/api/pigeons/'+enc(ringNo)+'/screening'),
          api('/api/pigeons/'+enc(ringNo)+'/breeding')
        ]);
        renderDetail(relation, screening, breeding);
      } catch (err) {
        detail.innerHTML = '<h2>查询失败</h2><p class="msg err">'+((err.data && err.data.error) || err.message)+'</p>';
      }
    }

    function startCorrect(dataset) {
      correctId = Number(dataset.correct);
      reportForm.ringNo.value = detailRing; reportForm.ringNo.readOnly = true;
      reportForm.item.value = dataset.item; reportForm.item.readOnly = true;
      reportForm.sampleNo.value = dataset.sample;
      document.querySelector("#correctNo").textContent = correctId;
      document.querySelector("#correctBanner").hidden = false;
      reportForm.scrollIntoView({ behavior: "smooth" });
    }
    function clearCorrect() {
      correctId = null;
      document.querySelector("#correctBanner").hidden = true;
      reportForm.ringNo.readOnly = false; reportForm.item.readOnly = false;
    }
    function describeChanges(result) {
      const parts = ["报告已保存，同项目以最新有效报告为准"];
      (result.changes || []).forEach(c => {
        if (c.action === "frozen") parts.push("配对 #"+c.pairing.id+" 已立即冻结："+c.reasons.join("；"));
        if (c.action === "restored") parts.push("配对 #"+c.pairing.id+" 已按新结论恢复");
      });
      return parts.join("。");
    }

    async function load(){
      [pigeons, pairings] = await Promise.all([api("/api/pigeons"), api("/api/pairings")]);
      renderCards(); renderPairings();
      if (detailRing) showDetail(detailRing);
      else detail.innerHTML = '<h2>血统查询</h2><p class="meta">请输入足环号查看父母、子代、检测历史、适用种鸽和阻断原因。</p>';
    }

    document.querySelector("#searchBtn").onclick = () => { detailRing = search.value.trim(); if (detailRing) showDetail(detailRing); };
    document.querySelector("#reload").onclick = load;
    document.querySelector("#cancelCorrect").onclick = clearCorrect;

    form.onsubmit = async event => {
      event.preventDefault();
      await api("/api/pigeons", { method:"POST", body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) });
      form.reset(); await load();
    };

    reportForm.onsubmit = async event => {
      event.preventDefault();
      const input = Object.fromEntries(new FormData(reportForm).entries());
      reportMsg.className = "msg";
      try {
        let result;
        if (correctId) {
          result = await api('/api/reports/'+correctId+'/correct', { method:'POST', body: JSON.stringify({ conclusion: input.conclusion, sampleNo: input.sampleNo, reportDate: input.reportDate, reason: "结论改错" }) });
        } else {
          result = await api('/api/pigeons/'+enc(input.ringNo)+'/reports', { method:'POST', body: JSON.stringify(input) });
        }
        reportMsg.textContent = describeChanges(result);
        clearCorrect(); reportForm.reset(); setDefaultDate();
        await load();
      } catch (err) {
        reportMsg.className = "msg err";
        reportMsg.textContent = (err.data && err.data.error) || err.message;
      }
    };

    pairForm.onsubmit = async event => {
      event.preventDefault();
      const input = Object.fromEntries(new FormData(pairForm).entries());
      pairMsg.className = "msg";
      try {
        await api('/api/pairings', { method:'POST', body: JSON.stringify(input) });
        pairMsg.textContent = "配对已建立。";
        pairForm.reset(); await load();
      } catch (err) {
        pairMsg.className = "msg err";
        pairMsg.textContent = err.data && err.data.reasons ? "配组被阻断：" + err.data.reasons.join("；") : ((err.data && err.data.error) || err.message);
      }
    };

    function setDefaultDate(){ reportForm.reportDate.value = new Date().toISOString().slice(0,10); }
    setDefaultDate();
    load();
  </script>
</body>
</html>`;
