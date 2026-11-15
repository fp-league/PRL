/* PRL — Premier Racing League site */
(() => {
'use strict';

const PASS_HASH = '338e9094491903a2fc428b95acd0bf008eb3761b48e09cef6cb81d39bd85589e';
const GH = { owner:'fp-league', repo:'prl', branch:'main', path:'data.json' };
const API = `https://api.github.com/repos/${GH.owner}/${GH.repo}`;
const TOKEN_KEY = 'prl_gh_token';
const app = document.getElementById('app');

/* ---------- data (live from GitHub) ---------- */
const clone = o => JSON.parse(JSON.stringify(o));
let D = null;
const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch(e){ return ''; } };
const ghHeaders = (raw) => {
  const h = { 'Accept': raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json' };
  const t = getToken(); if (t) h.Authorization = 'Bearer ' + t;
  return h;
};
async function loadData(){
  // 1) straight from the repo via the GitHub API (always the newest version)
  try {
    const r = await fetch(`${API}/contents/${GH.path}?ref=${GH.branch}&t=${Date.now()}`, { headers: ghHeaders(true), cache:'no-store' });
    if (r.ok) return await r.json();
  } catch(e){}
  // 2) fallback: the copy served by GitHub Pages
  const r2 = await fetch(`${GH.path}?t=${Date.now()}`, { cache:'no-store' });
  if (!r2.ok) throw new Error('No data');
  return await r2.json();
}

/* ---------- auto-save: every admin change is committed to the repo ---------- */
const b64 = s => { const b = new TextEncoder().encode(s); let bin = ''; b.forEach(x => bin += String.fromCharCode(x)); return btoa(bin); };
let syncTimer = null, syncMsgs = [], syncing = false, syncAgain = false;
function setSync(state, text){
  const el = document.getElementById('syncState');
  if (el) { el.className = 'sync ' + state; el.innerHTML = text; }
  setSync.last = [state, text];
}
function save(msg){
  toast(msg || 'Saved');
  syncMsgs.push(msg || 'update');
  setSync('pending', '● Saving…');
  clearTimeout(syncTimer); syncTimer = setTimeout(sync, 900);
}
async function sync(){
  if (syncing) { syncAgain = true; return; }
  if (!getToken()) { setSync('err', '⚠ Not connected to GitHub — changes not live'); return; }
  syncing = true;
  const message = 'Admin: ' + [...new Set(syncMsgs)].join(', ');
  syncMsgs = [];
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      let sha;
      const g = await fetch(`${API}/contents/${GH.path}?ref=${GH.branch}&t=${Date.now()}`, { headers: ghHeaders(), cache:'no-store' });
      if (g.ok) sha = (await g.json()).sha; else if (g.status !== 404) throw new Error(g.status);
      const p = await fetch(`${API}/contents/${GH.path}`, { method:'PUT', headers: { ...ghHeaders(), 'Content-Type':'application/json' },
        body: JSON.stringify({ message, content: b64(JSON.stringify(D, null, 2) + '\n'), sha, branch: GH.branch }) });
      if (p.ok) { setSync('ok', '✓ Live — saved ' + new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})); break; }
      if (p.status === 409 || p.status === 422) continue;   // file changed underneath us — grab new sha and retry
      if (p.status === 401 || p.status === 403) throw new Error('auth');
      throw new Error(p.status);
    }
  } catch(e) {
    setSync('err', e.message === 'auth' ? '⚠ GitHub token rejected — reconnect in Settings' : '⚠ Save failed — will retry');
    if (e.message !== 'auth') { syncMsgs.push('retry'); syncTimer = setTimeout(sync, 5000); }
  }
  syncing = false;
  if (syncAgain) { syncAgain = false; sync(); }
}
window.addEventListener('beforeunload', e => { if (syncMsgs.length || syncing) { e.preventDefault(); e.returnValue = ''; } });
const uid = p => p + Math.random().toString(36).slice(2, 8);

/* ---------- helpers ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const team = id => D.teams.find(t => t.id === id) || { name: '—', color: '#555', id: '' };
const driver = id => D.drivers.find(d => d.id === id) || { name: 'Unknown', number: '', team: '' };
const flag = cc => (cc && cc.length === 2) ? String.fromCodePoint(...[...cc.toUpperCase()].map(c => 0x1F1A5 + c.charCodeAt(0))) : '';
const fmtDate = (s, opts) => { const d = new Date(s); return isNaN(d) ? esc(s) : d.toLocaleDateString('en-GB', opts || { day:'numeric', month:'short', year:'numeric' }); };
const fmtTime = s => { const d = new Date(s); return isNaN(d) ? '' : d.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' }); };
const byRound = () => [...D.calendar].sort((a,b) => a.round - b.round);
const resultFor = r => D.results.find(x => x.round === r);

function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ---------- standings engine ---------- */
function compute(){
  const pts = D.points || [25,18,15,12,10,8,6,4,2,1];
  const ds = {}, ts = {};
  D.drivers.forEach(d => ds[d.id] = { id:d.id, pts:0, wins:0, pods:0, poles:0, fl:0, starts:0, best:99, finishes:[] });
  D.teams.forEach(t => ts[t.id] = { id:t.id, pts:0, wins:0, pods:0, best:99 });
  [...D.results].sort((a,b)=>a.round-b.round).forEach(r => {
    let pos = 0;
    r.entries.forEach(e => {
      const s = ds[e.d] || (ds[e.d] = { id:e.d, pts:0, wins:0, pods:0, poles:0, fl:0, starts:0, best:99, finishes:[] });
      const t = ts[e.t] || (ts[e.t] = { id:e.t, pts:0, wins:0, pods:0, best:99 });
      s.starts++;
      if (e.dnf) { s.finishes.push('DNF'); return; }
      pos++;
      const p = pts[pos-1] || 0;
      s.pts += p; t.pts += p;
      s.finishes.push(pos);
      if (pos === 1) { s.wins++; t.wins++; }
      if (pos <= 3) { s.pods++; t.pods++; }
      s.best = Math.min(s.best, pos); t.best = Math.min(t.best, pos);
    });
    if (r.pole && ds[r.pole]) ds[r.pole].poles++;
    if (r.fl && ds[r.fl]) ds[r.fl].fl++;
  });
  const sorter = (a,b) => b.pts - a.pts || b.wins - a.wins || b.pods - a.pods || a.best - b.best;
  return {
    drivers: Object.values(ds).filter(s => D.drivers.some(d=>d.id===s.id) || s.starts).sort(sorter),
    teams: Object.values(ts).filter(s => D.teams.some(t=>t.id===s.id)).sort(sorter),
    d: ds, t: ts
  };
}
function classify(r){
  let pos = 0; const pts = D.points;
  return r.entries.map(e => {
    if (e.dnf) return { ...e, pos:'DNF', pts:0 };
    pos++; return { ...e, pos, pts: pts[pos-1] || 0 };
  });
}
function nextRace(){
  const now = Date.now();
  return byRound().find(r => !resultFor(r.round) && new Date(r.date).getTime() > now - 3*3600e3)
      || byRound().find(r => !resultFor(r.round));
}

/* ---------- shared bits ---------- */
const head = (kicker, title, ghost, sub='') => `
  <div class="page-head">
    <div class="kicker">${kicker}</div>
    <h1>${title}</h1>
    ${sub ? `<p class="sub">${sub}</p>` : ''}
    <div class="ghost">${ghost}</div>
  </div>`;

function driverTable(S, limit){
  const rows = S.drivers.slice(0, limit || 999);
  if (!rows.length) return `<div class="empty">No drivers yet.</div>`;
  const lead = rows[0].pts;
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr>
    <th>Pos</th><th>Driver</th><th>Wins</th><th>Podiums</th><th class="gap">Gap</th><th class="num">Pts</th></tr></thead><tbody>
    ${rows.map((s,i) => { const d = driver(s.id), t = team(d.team); return `
      <tr class="${i===0?'top1':''}" style="--tc:${t.color};animation-delay:${i*35}ms">
        <td class="p">${i+1}</td>
        <td class="who"><span class="tc-bar"></span><b>${esc(d.name)}</b> <small style="display:inline;margin-left:6px">#${esc(d.number)}</small><small>${esc(t.name)}</small></td>
        <td>${s.wins}</td><td>${s.pods}</td>
        <td class="gap">${i===0 ? 'Leader' : '-' + (lead - s.pts)}</td>
        <td class="num">${s.pts}</td></tr>`; }).join('')}
  </tbody></table></div>`;
}
function teamTable(S){
  if (!S.teams.length) return `<div class="empty">No teams yet.</div>`;
  const lead = S.teams[0].pts;
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr>
    <th>Pos</th><th>Team</th><th>Drivers</th><th>Wins</th><th class="gap">Gap</th><th class="num">Pts</th></tr></thead><tbody>
    ${S.teams.map((s,i) => { const t = team(s.id); const dr = D.drivers.filter(d => d.team === t.id).map(d => esc(d.name)).join(' · ') || '—'; return `
      <tr class="${i===0?'top1':''}" style="--tc:${t.color};animation-delay:${i*40}ms">
        <td class="p">${i+1}</td>
        <td class="who"><span class="tc-bar"></span><b>${esc(t.name)}</b></td>
        <td style="color:var(--mut);font-size:14px">${dr}</td>
        <td>${s.wins}</td>
        <td class="gap">${i===0 ? 'Leader' : '-' + (lead - s.pts)}</td>
        <td class="num">${s.pts}</td></tr>`; }).join('')}
  </tbody></table></div>`;
}
function newsCard(n, feature){
  return `<article class="card news-card reveal ${feature?'feature':''}" data-toggle>
    <span class="tag">${esc(n.tag || 'News')}</span>
    <h3>${esc(n.title)}</h3>
    <time>${fmtDate(n.date, { day:'numeric', month:'long', year:'numeric' })}</time>
    <p class="clamp">${esc(n.body).replace(/\n/g,'<br>')}</p>
  </article>`;
}
function countdownHTML(r){
  if (!r) return '';
  return `<div class="next-race reveal">
    <div class="nr-info">
      <small>NEXT UP · ROUND ${r.round}</small>
      <h3>${flag(r.country)} ${esc(r.name)}</h3>
      <p>${esc(r.track)} · ${fmtDate(r.date, { weekday:'short', day:'numeric', month:'short' })} · ${fmtTime(r.date)}</p>
    </div>
    <div class="countdown" data-cd="${esc(r.date)}">
      <div><b data-u="d">00</b><span>DAYS</span></div>
      <div><b data-u="h">00</b><span>HRS</span></div>
      <div><b data-u="m">00</b><span>MIN</span></div>
      <div><b data-u="s">00</b><span>SEC</span></div>
    </div>
  </div>`;
}

/* ---------- pages ---------- */
const pages = {};

pages.home = () => {
  const S = compute();
  const top = S.drivers.slice(0,3);
  const news = [...D.news].sort((a,b) => (b.date||'').localeCompare(a.date||'')).slice(0,3);
  const done = D.results.length, total = D.calendar.length;
  const pod = (s, cls, pos) => { if (!s) return `<div class="pod ${cls}"><div class="pos">${pos}</div><h4>TBD</h4></div>`;
    const d = driver(s.id), t = team(d.team);
    return `<div class="pod ${cls}" style="--tc:${t.color}"><div class="pos">${pos}</div><h4>${esc(d.name)}</h4><div class="tm">${esc(t.name)}</div><div class="pts">${s.pts}<small>PTS</small></div></div>`; };
  return `
  <section class="hero">
    <div class="hero-bg"></div>
    <div class="hero-stripes"><i></i><i></i><i></i></div>
    <div class="hero-inner">
      <span class="hero-tag">${esc(D.league.season)}</span>
      <h1>PR<em>L</em></h1>
      <h2>${esc(D.league.full)}</h2>
      <div class="hero-cta">
        <a href="#standings" class="btn"><span>Standings</span></a>
        <a href="#calendar" class="btn ghost"><span>Calendar</span></a>
      </div>
    </div>
  </section>
  ${countdownHTML(nextRace())}
  <h2 class="section-title">Championship Leaders <a href="#standings">FULL TABLE →</a></h2>
  <div class="podium reveal">${pod(top[1],'p2',2)}${pod(top[0],'p1',1)}${pod(top[2],'p3',3)}</div>
  <p class="sub" style="margin-top:12px">${done} of ${total} rounds complete.</p>
  <h2 class="section-title">Latest News <a href="#news">ALL NEWS →</a></h2>
  <div class="grid g3">${news.map(n => newsCard(n)).join('') || '<div class="empty">No news yet.</div>'}</div>`;
};

pages.standings = () => {
  const S = compute();
  const view = pages.standings.view || 'drivers';
  return head('Championship', 'Stand<span>ings</span>', 'P1') + `
    <div class="tabs" data-tabs="standings">
      <button class="${view==='drivers'?'on':''}" data-v="drivers"><span>Drivers</span></button>
      <button class="${view==='teams'?'on':''}" data-v="teams"><span>Constructors</span></button>
    </div>
    ${view === 'drivers' ? driverTable(S) : teamTable(S)}`;
};

pages.transfers = () => {
  const list = [...D.transfers].sort((a,b) => (b.date||'').localeCompare(a.date||''));
  return head('Paddock Market', 'Trans<span>fers</span>', '⇄', 'Every signing, swap and release this season.') +
    (list.length ? `<div class="grid">${list.map(x => {
      const f = team(x.from), t = team(x.to);
      return `<div class="card tx reveal">
        <time>${fmtDate(x.date)}</time>
        <div class="drvname">${esc(x.driver)}<span class="tx-type">${esc(x.type || 'Transfer')}</span></div>
        <span></span>
        <div class="from" style="--c:${x.from ? f.color : '#444'}">${x.from ? esc(f.name) : 'Free Agent'}</div>
        <div class="arrow">→</div>
        <div class="to" style="--c:${x.to ? t.color : '#444'}">${x.to ? esc(t.name) : 'Released'}</div>
        ${x.note ? `<div class="note">${esc(x.note)}</div>` : ''}
      </div>`; }).join('')}</div>`
    : `<div class="empty">The transfer window is quiet… for now.</div>`);
};

pages.news = () => {
  const list = [...D.news].sort((a,b) => (b.date||'').localeCompare(a.date||''));
  return head('Paddock Press', 'News', 'NEWS') +
    (list.length ? `<div class="grid g3">${list.map((n,i) => newsCard(n, i===0)).join('')}</div>` : `<div class="empty">No news yet.</div>`);
};

pages.teams = () => {
  const S = compute();
  return head('The Grid', 'Teams', String(D.teams.length).padStart(2,'0'), `${D.teams.length} constructors fighting for the PRL title.`) +
    `<div class="grid g3">${S.teams.map((s,i) => { const t = team(s.id);
      const dr = D.drivers.filter(d => d.team === t.id);
      return `<div class="card team-card reveal" style="--tc:${t.color}">
        <div class="tpts">${s.pts}<small>PTS · P${i+1}</small></div>
        <h3>${esc(t.name)}</h3>
        <div class="meta">${esc(t.base || '')}${t.principal ? ' · TP: ' + esc(t.principal) : ''}</div>
        ${dr.map(d => `<div class="tdrv"><span>${esc(d.name)}</span><span>#${esc(d.number)}</span></div>`).join('') || '<div class="tdrv"><span style="color:var(--mut)">Seats open</span><span></span></div>'}
      </div>`; }).join('')}</div>`;
};

pages.drivers = () => {
  const S = compute();
  return head('The Grid', 'Dri<span>vers</span>', String(D.drivers.length).padStart(2,'0')) +
    `<div class="grid g4">${S.drivers.map((s,i) => { const d = driver(s.id), t = team(d.team);
      return `<div class="card drv reveal" style="--tc:${t.color}">
        <div class="big">${esc(d.number)}</div>
        <div class="flag">${flag(d.country)} ${esc(d.country || '')} · P${i+1}</div>
        <h3>${esc(d.name)}</h3>
        <div class="tm">${esc(t.name)}</div>
        <div class="stats">
          <div>${s.pts}<small>PTS</small></div>
          <div>${s.wins}<small>WINS</small></div>
          <div>${s.pods}<small>PODS</small></div>
          <div>${s.poles}<small>POLES</small></div>
        </div>
      </div>`; }).join('')}</div>`;
};

pages.calendar = () => {
  const nx = nextRace();
  return head('Season Schedule', 'Calen<span>dar</span>', String(D.calendar.length).padStart(2,'0')) +
    countdownHTML(nx) + `<div class="cal" style="margin-top:28px">${byRound().map(r => {
      const res = resultFor(r.round); const isNext = nx && nx.round === r.round;
      const winner = res ? classify(res).find(e => e.pos === 1) : null;
      return `<a href="#results" data-round="${r.round}" class="card race reveal ${res?'is-done':''} ${isNext?'is-next':''}">
        <div class="rn">${String(r.round).padStart(2,'0')}</div>
        <div>
          <h3>${flag(r.country)} ${esc(r.name)}</h3>
          <p>${esc(r.track)}</p>
          ${winner ? `<div class="win">Winner: <b>${esc(driver(winner.d).name)}</b></div>` : ''}
        </div>
        <div class="when">
          <b>${fmtDate(r.date, { day:'numeric', month:'short' })}</b>
          <small>${fmtTime(r.date)}</small><br>
          <span class="status ${res?'done':isNext?'next':'up'}">${res?'Completed':isNext?'Next race':'Upcoming'}</span>
        </div>
      </a>`; }).join('')}</div>`;
};

pages.results = () => {
  const done = byRound().filter(r => resultFor(r.round));
  let sel = pages.results.round;
  if (!sel || !resultFor(sel)) sel = done.length ? done[done.length-1].round : null;
  pages.results.round = sel;
  const pills = `<div class="round-pills">${byRound().map(r =>
    `<button data-rr="${r.round}" class="${r.round===sel?'on':''}" ${resultFor(r.round)?'':'disabled'}>R${r.round} ${flag(r.country)}</button>`).join('')}</div>`;
  if (!sel) return head('Race Results', 'Res<span>ults</span>', 'R0') + pills + `<div class="empty">No races completed yet. Lights out soon.</div>`;
  const r = byRound().find(x => x.round === sel) || { name:'Round '+sel, track:'' };
  const res = resultFor(sel); const cl = classify(res);
  return head('Race Results', 'Res<span>ults</span>', 'R' + sel) + pills + `
    <div class="res-head">
      <div><div style="color:var(--or);font-weight:700;letter-spacing:.25em;font-size:12px">ROUND ${sel}</div><h2>${flag(r.country)} ${esc(r.name)}</h2><div style="color:var(--mut)">${esc(r.track)} · ${fmtDate(r.date)}</div></div>
      <div class="badges">
        ${res.pole ? `<div class="badge"><b>POLE</b>${esc(driver(res.pole).name)}</div>` : ''}
        ${res.fl ? `<div class="badge"><b>FASTEST LAP</b>${esc(driver(res.fl).name)}</div>` : ''}
      </div>
    </div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Pos</th><th>Driver</th><th>Team</th><th class="num">Pts</th></tr></thead><tbody>
      ${cl.map((e,i) => { const d = driver(e.d), t = team(e.t); return `
        <tr class="${e.pos===1?'top1':''}" style="--tc:${t.color};animation-delay:${i*30}ms">
          <td class="p" ${e.pos==='DNF'?'style="font-size:14px;color:#ff6b6b"':''}>${e.pos}</td>
          <td class="who"><span class="tc-bar"></span><b>${esc(d.name)}</b>${res.fl===e.d?' <small style="display:inline;color:#b26bff">◆ FL</small>':''}</td>
          <td style="color:var(--mut)">${esc(t.name)}</td>
          <td class="num">${e.pts || ''}</td></tr>`; }).join('')}
    </tbody></table></div>
    ${res.notes ? `<p class="sub" style="margin-top:16px">${esc(res.notes)}</p>` : ''}`;
};

/* ---------- ADMIN ---------- */
let authed = false;
try { authed = sessionStorage.getItem('prl_admin') === '1'; } catch(e){}

async function sha256(s){
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2,'0')).join('');
}

pages.admin = () => {
  if (!authed) return `<div class="gate" id="gate">
      <div class="lock">🔒</div><h2>Race Control</h2>
      <p class="sub" style="margin:0 auto">Admin access only. Enter the passcode.</p>
      <form id="gateForm"><input type="password" id="pass" placeholder="••••••••" autocomplete="current-password" autofocus>
      <button class="btn" style="width:100%;justify-content:center"><span>Unlock</span></button></form>
    </div>`;
  if (!getToken()) return head('Race Control', 'Ad<span>min</span>', 'RC') + connectView(true);
  const tab = pages.admin.tab || 'results';
  const tabs = ['results','drivers','teams','calendar','news','transfers','settings'];
  const [st, txt] = setSync.last || ['ok', '✓ Connected — changes go live automatically'];
  return head('Race Control', 'Ad<span>min</span>', 'RC') + `
    <div id="syncState" class="sync ${st}">${txt}</div>
    <div class="admin-tabs">${tabs.map(t => `<button data-at="${t}" class="${t===tab?'on':''}">${t}</button>`).join('')}
      <button data-logout style="margin-left:auto">Log out</button></div>
    <div id="adminBody">${adminTabs[tab]()}</div>`;
};

function connectView(first){
  return `<div class="panel">
    <h3>${first ? 'One-time setup: connect to GitHub' : 'GitHub connection'}</h3>
    ${first ? `<div class="note-box">So your changes save and go live automatically, this device needs a GitHub key for the <b>${GH.owner}/${GH.repo}</b> repo. You only do this once per device.</div>` :
      `<p class="sub" style="margin:0 0 14px">${getToken() ? '✓ This device is connected. Every change is committed to the repo and goes live instantly.' : 'Not connected.'}</p>`}
    <ol class="steps">
      <li>Open <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">github.com → New fine-grained token</a>.</li>
      <li><b>Resource owner:</b> ${GH.owner} · <b>Repository access:</b> Only select repositories → <b>${GH.repo}</b>.</li>
      <li><b>Permissions → Repository → Contents:</b> Read and write.</li>
      <li>Generate, copy it, and paste it below. It stays in this browser only.</li>
    </ol>
    <form id="tokenForm" class="actions" style="margin-top:14px">
      <input type="password" id="tokenIn" placeholder="github_pat_…" autocomplete="off" style="flex:1;min-width:220px">
      <button class="btn sm"><span>${getToken() ? 'Replace key' : 'Connect'}</span></button>
      ${getToken() ? `<button type="button" class="btn sm danger" data-disconnect><span>Disconnect</span></button>` : ''}
    </form>
  </div>`;
}

const teamOpts = (sel, blank) => (blank ? `<option value="">${blank}</option>` : '') + D.teams.map(t => `<option value="${t.id}" ${t.id===sel?'selected':''}>${esc(t.name)}</option>`).join('');
const driverOpts = (sel, blank) => (blank ? `<option value="">${blank}</option>` : '') + D.drivers.map(d => `<option value="${d.id}" ${d.id===sel?'selected':''}>${esc(d.name)}</option>`).join('');

/* generic CRUD editor */
const CRUD = {
  drivers: { title:'Driver', id:'d', list:()=>[...D.drivers].sort((a,b)=>a.number-b.number),
    label:x=>`#${esc(x.number)} ${esc(x.name)}`, sub:x=>team(x.team).name,
    fields:[{k:'name',l:'Name / Gamertag'},{k:'number',l:'Number',t:'number'},{k:'team',l:'Team',t:'team'},{k:'country',l:'Country code (e.g. GB)'}] },
  teams: { title:'Team', id:'t', list:()=>D.teams,
    label:x=>esc(x.name), sub:x=>`${x.base||''} ${x.principal?'· TP: '+x.principal:''}`,
    fields:[{k:'name',l:'Team name'},{k:'color',l:'Colour',t:'color'},{k:'base',l:'Base'},{k:'principal',l:'Team principal'}] },
  calendar: { title:'Race', id:'c', list:()=>byRound(),
    label:x=>`R${x.round} · ${esc(x.name)}`, sub:x=>`${x.track} · ${fmtDate(x.date)} ${fmtTime(x.date)}`,
    fields:[{k:'round',l:'Round',t:'number'},{k:'name',l:'Race name'},{k:'track',l:'Track'},{k:'country',l:'Country code'},{k:'date',l:'Date & time',t:'datetime-local'}] },
  news: { title:'Article', id:'n', list:()=>[...D.news].sort((a,b)=>(b.date||'').localeCompare(a.date||'')),
    label:x=>esc(x.title), sub:x=>`${x.tag||''} · ${fmtDate(x.date)}`,
    fields:[{k:'title',l:'Headline'},{k:'tag',l:'Tag (e.g. Race Report)'},{k:'date',l:'Date',t:'date'},{k:'body',l:'Article',t:'textarea'}] },
  transfers: { title:'Transfer', id:'x', list:()=>[...D.transfers].sort((a,b)=>(b.date||'').localeCompare(a.date||'')),
    label:x=>`${esc(x.driver)} — ${x.from?esc(team(x.from).name):'Free Agent'} → ${x.to?esc(team(x.to).name):'Released'}`, sub:x=>`${x.type||'Transfer'} · ${fmtDate(x.date)}`,
    fields:[{k:'driver',l:'Driver',t:'driverText'},{k:'from',l:'From',t:'teamOpt'},{k:'to',l:'To',t:'teamOpt'},
            {k:'type',l:'Type',t:'select',o:['Transfer','Signing','Swap','Release','Loan','Reserve']},{k:'date',l:'Date',t:'date'},{k:'note',l:'Note',t:'textarea'}] }
};
const editing = {};
function crudView(key){
  const c = CRUD[key]; const items = c.list(); const cur = editing[key] ? (D[key].find(x => x.id === editing[key]) || {}) : {};
  const input = f => {
    const v = cur[f.k] ?? '';
    switch (f.t) {
      case 'team': return `<select name="${f.k}">${teamOpts(v)}</select>`;
      case 'teamOpt': return `<select name="${f.k}">${teamOpts(v, f.k==='from'?'Free Agent':'Released / None')}</select>`;
      case 'select': return `<select name="${f.k}">${f.o.map(o=>`<option ${o===v?'selected':''}>${o}</option>`).join('')}</select>`;
      case 'textarea': return `<textarea name="${f.k}">${esc(v)}</textarea>`;
      case 'driverText': return `<input type="text" name="${f.k}" list="dl-drivers" value="${esc(v)}"><datalist id="dl-drivers">${D.drivers.map(d=>`<option value="${esc(d.name)}">`).join('')}</datalist>`;
      case 'color': return `<input type="color" name="${f.k}" value="${esc(v||'#ff6a00')}">`;
      default: return `<input type="${f.t||'text'}" name="${f.k}" value="${esc(v)}">`;
    }
  };
  return `<div class="panel">
    <h3>${editing[key] ? 'Edit' : 'Add'} ${c.title}</h3>
    <form data-crud="${key}">
      <div class="form-grid">${c.fields.filter(f=>f.t!=='textarea').map(f => `<label class="field">${f.l}${input(f)}</label>`).join('')}</div>
      ${c.fields.filter(f=>f.t==='textarea').map(f => `<label class="field" style="margin-bottom:16px">${f.l}${input(f)}</label>`).join('')}
      ${key==='transfers' ? `<label class="chk" style="margin-bottom:14px"><input type="checkbox" name="_apply" checked> Also move this driver to the new team (if they're on the grid)</label>` : ''}
      <div class="actions"><button class="btn sm"><span>${editing[key] ? 'Save changes' : 'Add ' + c.title}</span></button>
      ${editing[key] ? `<button type="button" class="btn sm ghost" data-cancel="${key}"><span>Cancel</span></button>` : ''}</div>
    </form></div>
    <div class="panel"><h3>${c.title}s (${items.length})</h3><div class="row-list">
      ${items.map(x => `<div class="row-item"><div class="grow"><b>${c.label(x)}</b><small>${esc(c.sub(x))}</small></div>
        <button class="mini" data-edit="${key}:${x.id}">Edit</button><button class="mini del" data-del="${key}:${x.id}">Delete</button></div>`).join('') || '<div class="empty">Nothing here yet.</div>'}
    </div></div>`;
}

let resDraft = null;
function resultsView(){
  const rounds = byRound();
  if (!rounds.length) return `<div class="empty">Add races in the Calendar tab first.</div>`;
  const nx = nextRace();
  let rnd = adminTabs.round ?? (nx ? nx.round : rounds[0].round);
  adminTabs.round = rnd;
  if (!resDraft || resDraft.round !== rnd) {
    const ex = resultFor(rnd);
    resDraft = ex ? clone(ex) : { round:rnd, entries:D.drivers.map(d => ({ d:d.id, t:d.team, dnf:false })), pole:'', fl:'', notes:'' };
  }
  let p = 0;
  return `<div class="panel">
    <h3>Enter Race Result</h3>
    <div class="form-grid">
      <label class="field">Round<select id="resRound">${rounds.map(r=>`<option value="${r.round}" ${r.round===rnd?'selected':''}>R${r.round} · ${esc(r.name)}${resultFor(r.round)?' ✓':''}</option>`).join('')}</select></label>
      <label class="field">Pole position<select id="resPole">${driverOpts(resDraft.pole,'—')}</select></label>
      <label class="field">Fastest lap<select id="resFl">${driverOpts(resDraft.fl,'—')}</select></label>
    </div>
    <p class="sub" style="margin:0 0 12px">Put drivers in finishing order with the arrows. Tick DNF for retirements; untick "Raced" for drivers who didn't take part.</p>
    <div class="order-list">${resDraft.entries.map((e,i) => { const t = team(e.t); const lbl = e.dnf ? 'DNF' : 'P' + (++p); return `
      <div class="order-item ${e.dnf?'dnf':''}" style="--tc:${t.color}">
        <span class="pnum">${lbl}</span>
        <span><b>${esc(driver(e.d).name)}</b> <small style="color:var(--mut)">${esc(t.name)}</small></span>
        <label class="chk"><input type="checkbox" data-dnf="${i}" ${e.dnf?'checked':''}>DNF</label>
        <span style="display:flex;gap:4px"><button class="mini" data-mv="${i}:-1">▲</button><button class="mini" data-mv="${i}:1">▼</button></span>
        <button class="mini del" data-rm="${i}" title="Didn't race">✕</button>
      </div>`; }).join('')}</div>
    ${D.drivers.filter(d => !resDraft.entries.some(e=>e.d===d.id)).length ? `<div class="actions" style="margin-top:10px"><select id="resAdd">${D.drivers.filter(d => !resDraft.entries.some(e=>e.d===d.id)).map(d=>`<option value="${d.id}">${esc(d.name)}</option>`).join('')}</select><button class="mini" data-addrow>+ Add driver back</button></div>` : ''}
    <label class="field" style="margin-top:16px">Race notes (optional)<textarea id="resNotes" style="min-height:70px">${esc(resDraft.notes||'')}</textarea></label>
    <div class="actions" style="margin-top:16px">
      <button class="btn" data-saveres><span>Save Result</span></button>
      ${resultFor(rnd) ? `<button class="btn danger" data-delres><span>Delete Result</span></button>` : ''}
    </div>
  </div>`;
}

function settingsView(){
  const out = JSON.stringify(D, null, 2);
  return connectView(false) + `
  <div class="panel">
    <h3>League settings</h3>
    <div class="form-grid">
      <label class="field">Short name<input type="text" id="lgName" value="${esc(D.league.name)}"></label>
      <label class="field">Full name<input type="text" id="lgFull" value="${esc(D.league.full)}"></label>
      <label class="field">Season label<input type="text" id="lgSeason" value="${esc(D.league.season)}"></label>
      <label class="field">Points (comma separated)<input type="text" id="lgPts" value="${D.points.join(', ')}"></label>
    </div>
    <div class="actions"><button class="btn sm" data-savelg><span>Save settings</span></button>
    <button class="btn sm ghost" data-reset><span>Reload live data</span></button></div>
  </div>
  <div class="panel">
    <h3>Backup</h3>
    <p class="sub" style="margin:0 0 12px">Every save is already kept in the repo's history. You can also copy a backup, or paste one in to restore it (restoring goes live immediately).</p>
    <div class="actions" style="margin-bottom:12px"><button class="btn sm" data-copy><span>Copy backup</span></button></div>
    <textarea id="exportBox" readonly style="min-height:140px;font-family:monospace;font-size:12px">${esc(out)}</textarea>
    <textarea id="importBox" placeholder="Paste a backup here to restore…" style="min-height:90px;font-family:monospace;font-size:12px;margin-top:12px"></textarea>
    <div class="actions" style="margin-top:12px"><button class="btn sm danger" data-import><span>Restore backup</span></button></div>
  </div>`;
}

const adminTabs = {
  results: resultsView,
  drivers: () => crudView('drivers'), teams: () => crudView('teams'), calendar: () => crudView('calendar'),
  news: () => crudView('news'), transfers: () => crudView('transfers'), settings: settingsView
};
const rerenderAdmin = () => { const b = document.getElementById('adminBody'); if (b) { render(true); } };

/* ---------- router & render ---------- */
const ROUTES = ['home','standings','transfers','news','teams','drivers','calendar','results','admin'];
let current = null, first = true;
function route(){ const h = location.hash.slice(1); return ROUTES.includes(h) ? h : 'home'; }

function render(keepScroll){
  const r = route();
  const y = window.scrollY;
  app.innerHTML = `<div class="page">${pages[r]()}</div>`;
  current = r;
  document.title = (r === 'home' ? '' : r.charAt(0).toUpperCase() + r.slice(1) + ' · ') + 'PRL — Premier Racing League';
  document.querySelectorAll('#desknav a, .menu-links a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + r));
  moveInk();
  if (keepScroll) { window.scrollTo(0, y); app.querySelector('.page').style.animation = 'none'; }
  else window.scrollTo(0, 0);
  observe(); tick();
}

function go(){
  closeMenu();
  if (first) { first = false; render(); return; }
  const w = document.getElementById('wipe');
  w.className = ''; void w.offsetWidth; w.className = 'in';
  setTimeout(() => { render(); w.className = 'out'; setTimeout(() => w.className = '', 420); }, 380);
}
window.addEventListener('hashchange', go);

/* ---------- nav ink ---------- */
const nav = document.getElementById('desknav'), ink = nav.querySelector('.nav-ink');
function placeInk(a){
  if (!a) { ink.style.opacity = 0; return; }
  ink.style.opacity = 1; ink.style.left = a.offsetLeft + 'px'; ink.style.width = a.offsetWidth + 'px';
}
function moveInk(){ placeInk(nav.querySelector('a.active')); }
nav.querySelectorAll('a').forEach(a => a.addEventListener('mouseenter', () => placeInk(a)));
nav.addEventListener('mouseleave', moveInk);
window.addEventListener('resize', moveInk);

/* ---------- menu ---------- */
const burger = document.getElementById('burger');
function closeMenu(){ document.body.classList.remove('menu-open','locked'); burger.setAttribute('aria-expanded','false'); }
burger.addEventListener('click', () => {
  const open = !document.body.classList.contains('menu-open');
  document.body.classList.toggle('menu-open', open); document.body.classList.toggle('locked', open);
  burger.setAttribute('aria-expanded', String(open));
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

/* ---------- scroll progress + reveal ---------- */
window.addEventListener('scroll', () => {
  const h = document.documentElement.scrollHeight - innerHeight;
  document.getElementById('topbar').style.setProperty('--scroll', (h > 0 ? scrollY / h * 100 : 0) + '%');
}, { passive:true });
let io;
function observe(){
  const els = app.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('vis')); return; }
  io && io.disconnect();
  io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vis'); io.unobserve(e.target); } }), { threshold:.08 });
  els.forEach((e,i) => { e.style.transitionDelay = (i % 6) * 60 + 'ms'; io.observe(e); });
}

/* ---------- countdown ---------- */
function tick(){
  document.querySelectorAll('[data-cd]').forEach(el => {
    let ms = Math.max(0, new Date(el.dataset.cd) - Date.now());
    const u = { d: Math.floor(ms/864e5), h: Math.floor(ms/36e5)%24, m: Math.floor(ms/6e4)%60, s: Math.floor(ms/1e3)%60 };
    for (const k in u) { const b = el.querySelector(`[data-u="${k}"]`); if (b) b.textContent = String(u[k]).padStart(2,'0'); }
  });
}
setInterval(tick, 1000);

/* ---------- events ---------- */
app.addEventListener('click', async e => {
  const t = e.target.closest('button, [data-toggle], [data-round]');
  if (!t) return;
  if (t.dataset.toggle !== undefined) { t.classList.toggle('open'); return; }
  if (t.dataset.round) { pages.results.round = +t.dataset.round; return; }
  if (t.closest('[data-tabs="standings"]') && t.dataset.v) { pages.standings.view = t.dataset.v; render(true); return; }
  if (t.dataset.rr) { pages.results.round = +t.dataset.rr; render(true); return; }

  /* admin */
  if (t.dataset.at) { pages.admin.tab = t.dataset.at; render(true); return; }
  if (t.dataset.logout !== undefined) { authed = false; try{sessionStorage.removeItem('prl_admin');}catch(_){} render(); return; }
  if (t.dataset.edit) { const [k,id] = t.dataset.edit.split(':'); editing[k] = id; render(true); app.querySelector('form[data-crud]')?.scrollIntoView({behavior:'smooth', block:'center'}); return; }
  if (t.dataset.cancel) { editing[t.dataset.cancel] = null; render(true); return; }
  if (t.dataset.del) {
    const [k,id] = t.dataset.del.split(':');
    if (t.dataset.confirm !== '1') { t.dataset.confirm = '1'; t.textContent = 'Sure?'; setTimeout(() => { t.dataset.confirm=''; t.textContent='Delete'; }, 2500); return; }
    D[k] = D[k].filter(x => x.id !== id); save('Deleted'); render(true); return;
  }
  if (t.dataset.mv) { const [i,d] = t.dataset.mv.split(':').map(Number); const a = resDraft.entries; const j = i + d;
    if (j >= 0 && j < a.length) { [a[i], a[j]] = [a[j], a[i]]; } render(true); return; }
  if (t.dataset.rm) { resDraft.entries.splice(+t.dataset.rm, 1); render(true); return; }
  if (t.dataset.addrow !== undefined) { const id = document.getElementById('resAdd').value; resDraft.entries.push({ d:id, t:driver(id).team, dnf:false }); render(true); return; }
  if (t.dataset.saveres !== undefined) {
    resDraft.pole = document.getElementById('resPole').value; resDraft.fl = document.getElementById('resFl').value;
    resDraft.notes = document.getElementById('resNotes').value.trim();
    D.results = D.results.filter(r => r.round !== resDraft.round).concat(clone(resDraft));
    save(`Round ${resDraft.round} result saved`); render(true); return;
  }
  if (t.dataset.delres !== undefined) {
    if (t.dataset.confirm !== '1') { t.dataset.confirm='1'; t.querySelector('span').textContent='Click again to delete'; return; }
    D.results = D.results.filter(r => r.round !== adminTabs.round); resDraft = null; save('Result deleted'); render(true); return;
  }
  if (t.dataset.copy !== undefined) { try { await navigator.clipboard.writeText(document.getElementById('exportBox').value); toast('Copied!'); } catch(_) { document.getElementById('exportBox').select(); toast('Press Ctrl/Cmd + C to copy'); } return; }
  if (t.dataset.import !== undefined) {
    try { let s = document.getElementById('importBox').value.trim().replace(/^window\.PRL_DATA\s*=\s*/, '').replace(/;\s*$/, '');
      const o = JSON.parse(s); if (!o.drivers || !o.teams) throw 0; D = o; resDraft = null; save('Restored backup'); render(true); }
    catch(_) { toast('Could not read that backup'); } return;
  }
  if (t.dataset.disconnect !== undefined) { try { localStorage.removeItem(TOKEN_KEY); } catch(_){} setSync.last = null; toast('Disconnected'); render(true); return; }
  if (t.dataset.savelg !== undefined) {
    D.league.name = document.getElementById('lgName').value.trim() || 'PRL';
    D.league.full = document.getElementById('lgFull').value.trim();
    D.league.season = document.getElementById('lgSeason').value.trim();
    const p = document.getElementById('lgPts').value.split(',').map(x => parseInt(x,10)).filter(x => !isNaN(x));
    if (p.length) D.points = p;
    save('Settings saved'); setSeason(); render(true); return;
  }
  if (t.dataset.reset !== undefined) {
    if (t.dataset.confirm !== '1') { t.dataset.confirm='1'; t.querySelector('span').textContent='Click again to discard'; return; }
    try { D = await loadData(); resDraft = null; setSync.last = null; toast('Reloaded live data'); render(true); } catch(_) { toast('Could not reach GitHub'); } return;
  }
});

app.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'resRound') { adminTabs.round = +t.value; resDraft = null; render(true); }
  if (t.dataset.dnf) { const i = +t.dataset.dnf; const a = resDraft.entries; a[i].dnf = t.checked;
    // move DNFs to the bottom
    if (t.checked) { const [x] = a.splice(i,1); a.push(x); }
    render(true); }
});

app.addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target;
  if (f.id === 'gateForm') {
    const v = document.getElementById('pass').value;
    let ok = false;
    try { ok = (await sha256(v)) === PASS_HASH; } catch(_) { ok = false; }
    if (ok) { authed = true; try{sessionStorage.setItem('prl_admin','1');}catch(_){} toast('Welcome to Race Control');
      try { D = await loadData(); } catch(_){}  // make sure we edit the very latest version
      render(); }
    else { const g = document.getElementById('gate'); g.classList.remove('shake'); void g.offsetWidth; g.classList.add('shake'); toast('Wrong passcode'); }
    return;
  }
  if (f.id === 'tokenForm') {
    const tok = document.getElementById('tokenIn').value.trim();
    if (!tok) return toast('Paste your token first');
    try {
      const r = await fetch(API, { headers: { 'Accept':'application/vnd.github+json', Authorization:'Bearer ' + tok } });
      if (!r.ok) throw 0;
      const j = await r.json();
      if (j.permissions && !j.permissions.push) { toast('That key can\'t write to the repo'); return; }
      try { localStorage.setItem(TOKEN_KEY, tok); } catch(_) { toast('Browser storage blocked'); return; }
      setSync.last = ['ok', '✓ Connected — changes go live automatically'];
      D = await loadData(); toast('Connected to GitHub'); render(true);
    } catch(_) { toast('GitHub didn\'t accept that key'); }
    return;
  }
  if (f.dataset.crud) {
    const k = f.dataset.crud, c = CRUD[k], fd = new FormData(f), obj = {};
    c.fields.forEach(fl => { let v = (fd.get(fl.k) ?? '').toString().trim(); if (fl.t === 'number') v = Number(v) || 0; obj[fl.k] = v; });
    if (k === 'drivers' && !obj.name) return toast('Name required');
    if (k === 'teams' && !obj.name) return toast('Team name required');
    if (k === 'calendar' && !obj.name) return toast('Race name required');
    if (k === 'news' && !obj.title) return toast('Headline required');
    if (k === 'transfers' && !obj.driver) return toast('Driver required');
    if (k === 'news' && !obj.date) obj.date = new Date().toISOString().slice(0,10);
    if (k === 'transfers' && !obj.date) obj.date = new Date().toISOString().slice(0,10);
    if (k === 'transfers' && fd.get('_apply')) {
      const d = D.drivers.find(x => x.name.toLowerCase() === obj.driver.toLowerCase());
      if (d) { if (obj.to) d.team = obj.to; else D.drivers = D.drivers.filter(x => x !== d); }
    }
    if (editing[k]) { const i = D[k].findIndex(x => x.id === editing[k]); D[k][i] = { ...D[k][i], ...obj }; editing[k] = null; save(c.title + ' updated'); }
    else { D[k].push({ id: uid(c.id), ...obj }); save(c.title + ' added'); }
    render(true);
  }
});

/* ---------- boot ---------- */
function setSeason(){ document.getElementById('season-label').textContent = D.league.season || ''; }
(async () => {
  try { D = await loadData(); }
  catch(e) { app.innerHTML = `<div class="empty" style="margin-top:60px">Couldn't load league data. Please refresh.</div>`; return; }
  setSeason(); go();
  // keep visitors up to date: quietly refresh every 60s (not while an admin is editing)
  setInterval(async () => {
    if (current === 'admin' || document.hidden) return;
    try { const n = await loadData(); if (JSON.stringify(n) !== JSON.stringify(D)) { D = n; setSeason(); render(true); } } catch(_){}
  }, 90000);
})();

(function lights(){
  const box = document.getElementById('lights');
  let seen = false; try { seen = sessionStorage.getItem('prl_lights') === '1'; } catch(_){}
  if (seen || matchMedia('(prefers-reduced-motion: reduce)').matches) { box.classList.add('done'); return; }
  const row = box.querySelector('.lights-row'), ls = row.querySelectorAll('span');
  ls.forEach((l,i) => setTimeout(() => l.classList.add('on'), 250 + i * 330));
  setTimeout(() => { row.classList.add('out'); }, 250 + 5*330 + 450);
  setTimeout(() => { box.classList.add('done'); try{sessionStorage.setItem('prl_lights','1');}catch(_){} }, 250 + 5*330 + 1100);
  box.addEventListener('click', () => box.classList.add('done'));
})();
})();
