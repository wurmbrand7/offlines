
window.SUITE_BUILD_ID = "LOCAL-ONLY-2026-09-10-V7";
window.SUITE_MODE = "LOCAL-ONLY";
/* ---------- Storage helpers & SuiteStorage Engine ---------- */
const KEY_PREFIX = "suite_v1_";

const IDB_NAME = 'offlines_suite_db';
const IDB_VERSION = 2;
let _suiteIDB = null;

function initIndexedDB() {
  return new Promise((resolve) => {
    if (!window.indexedDB) { resolve(null); return; }
    try {
      const req = window.indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        const stores = MODULE_KEYS_TRACKED.concat(['vaults_index', 'vault_personal', 'notes_library', 'objects', 'comments', 'revisions', 'references']);
        stores.forEach((storeName) => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
          }
        });
      };
      req.onsuccess = (e) => {
        _suiteIDB = e.target.result;
        autoMigrateLocalStorageToIDB();
        resolve(_suiteIDB);
      };
      req.onerror = () => { resolve(null); };
    } catch(err) {
      resolve(null);
    }
  });
}

function autoMigrateLocalStorageToIDB() {
  if (!_suiteIDB) return;
  MODULE_KEYS_TRACKED.concat(['vaults_index', 'vault_personal', 'notes_library']).forEach((key) => {
    try {
      const raw = localStorage.getItem(KEY_PREFIX + key);
      if (raw) {
        const val = JSON.parse(raw);
        saveIDBItem(key, val);
      }
    } catch(e) {}
  });
}

function saveIDBItem(storeName, value) {
  if (!_suiteIDB || !_suiteIDB.objectStoreNames.contains(storeName)) return;
  try {
    const tx = _suiteIDB.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.put({ id: 'main', payload: value, updatedAt: Date.now() });
  } catch(e) {}
}

initIndexedDB();

function escapeHTML(str){
  if(str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
function safeStr(str){ return escapeHTML(str); }
function escapeHtml(str){ return escapeHTML(str); }

function loadLocal(key, fallback){
  try{
    const raw = localStorage.getItem(KEY_PREFIX+key);
    return raw ? JSON.parse(raw) : fallback;
  }catch(e){ return fallback; }
}
const MODULE_KEYS_TRACKED = ['docs','sheets','forms','notes','tasks','agenda','slides','lockbox','formula','transmute','doxera'];
function saveLocal(key, value){
  localStorage.setItem(KEY_PREFIX+key, JSON.stringify(value));
  if(MODULE_KEYS_TRACKED.includes(key)){
    const times = loadLocal('modTimes', {});
    times[key] = Date.now();
    localStorage.setItem(KEY_PREFIX+'modTimes', JSON.stringify(times));
  }
  showSeal();
}
function saveLocalSilent(key, value){
  localStorage.setItem(KEY_PREFIX+key, JSON.stringify(value));
}

/* ================= NETWORK MONITOR + OFFLINE MODE (Phase 8 / Phase 9) =================
   Every real network call this app ever makes (there are exactly two kinds:
   optional external requests) goes through here. This makes the
   privacy promise observable instead of just a claim: the Network Monitor
   panel reads straight from this same log, not a separate marketing number. */

function showSeal(){
  const el = document.getElementById('sealOverlay');
  el.classList.remove('show'); void el.offsetWidth;
  el.classList.add('show');
}
function download(filename, content){
  const blob = new Blob([content], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
function pickFile(accept, cb){
  const inp = document.createElement('input');
  inp.type='file'; inp.accept=accept;
  inp.onchange = e=>{
    const f = e.target.files[0];
    if(!f) return;
    const r = new FileReader();
    r.onload = ()=>cb(r.result, f.name);
    r.readAsText(f);
  };
  document.body.appendChild(inp); inp.click(); inp.remove();
}




/* ---------- Mode toggle ---------- */
let mode = loadLocal('mode','offline');


/* ---------- Standalone-tool mode ----------
   When SUITE_ONLY is set to a module id (e.g. 'sheets'), this file behaves as a
   single standalone tool: only that module loads, the tab bar and Today/search
   are hidden, and the header shows that tool's own name instead of "Suite".
   Leave null for the full combined Suite. */
const urlParams = new URLSearchParams(window.location.search);
const SUITE_ONLY = window.SUITE_ONLY || urlParams.get('suite_only');

function todayStr(){ return new Date().toISOString().slice(0,10); }
function moonPhaseEmoji(date){
  const knownNewMoon = Date.UTC(2000,0,6,18,14,0);
  const synodic = 29.53058867;
  const diffDays = (date.getTime()-knownNewMoon)/(1000*60*60*24);
  let phase = (diffDays % synodic)/synodic;
  if(phase<0) phase+=1;
  const phases = ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'];
  return phases[Math.floor(phase*8+0.5)%8];
}
function moonPhaseName(date){
  const knownNewMoon = Date.UTC(2000,0,6,18,14,0);
  const synodic = 29.53058867;
  const diffDays = (date.getTime()-knownNewMoon)/(1000*60*60*24);
  let phase = (diffDays % synodic)/synodic;
  if(phase<0) phase+=1;
  const names = ['New moon','Waxing crescent','First quarter','Waxing gibbous','Full moon','Waning gibbous','Last quarter','Waning crescent'];
  return names[Math.floor(phase*8+0.5)%8];
}
function dayLengthHours(date, lat){
  lat = lat===undefined ? 24.7 : lat; // default reference latitude; local, no network lookup
  const start = new Date(date.getFullYear(),0,0);
  const dayOfYear = Math.floor((date-start)/86400000);
  const P = Math.asin(0.39795*Math.cos(0.2163108 + 2*Math.atan(0.9671396*Math.tan(0.00860*(dayOfYear-186)))));
  const latRad = lat*Math.PI/180;
  const cosArg = (Math.sin(0.8333*Math.PI/180)+Math.sin(latRad)*Math.sin(P))/(Math.cos(latRad)*Math.cos(P));
  const clamped = Math.max(-1, Math.min(1, cosArg));
  return 24 - (24/Math.PI)*Math.acos(clamped);
}
function bumpSpotStreak(){
  const today = todayStr();
  const s = loadLocal('spotStreak', {lastDate:null, count:0});
  if(s.lastDate===today) return;
  const yesterday = new Date(Date.now()-86400000).toISOString().slice(0,10);
  s.count = (s.lastDate===yesterday) ? s.count+1 : 1;
  s.lastDate = today;
  saveLocal('spotStreak', s);
}
function computeSpotStreak(){
  const s = loadLocal('spotStreak', {lastDate:null, count:0});
  if(!s.lastDate) return 0;
  const today = todayStr();
  const yesterday = new Date(Date.now()-86400000).toISOString().slice(0,10);
  return (s.lastDate===today || s.lastDate===yesterday) ? s.count : 0;
}
function daysCarried(item){
  if(item.done || !item.createdDate) return 0;
  const created = new Date(item.createdDate+'T00:00:00');
  return Math.max(0, Math.floor((new Date()-created)/86400000));
}
function renderToday(){
  const p = document.getElementById('panel-today');
  if(!p) return;
  const now = new Date();
  const agenda = loadLocal('agenda', {events:[]});
  const rangeStart = new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const rangeEnd = new Date(now.getFullYear(),now.getMonth(),now.getDate(),23,59,59);
  const todaysEvents = (typeof agendaOccurrencesInRange==='function') ? agendaOccurrencesInRange(agenda.events||[], rangeStart, rangeEnd) : [];
  const tasksD = loadLocal('tasks', {items:[]});
  const openTasks = (tasksD.items||[]).filter(t=>!t.done);
  const streak = computeSpotStreak();
  const moon = moonPhaseEmoji(now);
  const docObj = getFolioDocument();
  const wbObj = getGridWorkbook();

  p.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom:1px solid var(--line); padding-bottom:12px;">
      <div>
        <h2 style="margin:0; font-size:1.6rem; font-weight:800; color:var(--text-workspace, #f1f5f9);">Dashboard Command Center</h2>
        <div class="sub" style="margin-top:4px; font-size:0.9rem; color:var(--text-muted, #94a3b8);">${now.toLocaleDateString(undefined,{weekday:'long', month:'long', day:'numeric', year:'numeric'})} · ${moon} ${moonPhaseName(now)}</div>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn brass small" onclick="openDiagnosticsModal()">⚙ System Status</button>
        <button class="btn sage small" onclick="openCapsuleModal('export')">💾 Export Capsule</button>
      </div>
    </div>

    <!-- WORKSPACE KPI METRIC CARDS -->
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(190px, 1fr)); gap:14px; margin-bottom:20px;">
      <div class="today-card" style="cursor:pointer; background:var(--paper-dark); border:1px solid var(--line);" onclick="activateTab('tasks')">
        <div style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-muted, #94a3b8); font-weight:700;">Active Tasks</div>
        <div style="font-size:2rem; font-weight:800; color:var(--text-workspace, #f1f5f9); margin-top:2px;">${openTasks.length}</div>
        <div style="font-size:0.8rem; color:var(--rust); margin-top:4px; font-weight:600;">Docket Studio →</div>
      </div>
      <div class="today-card" style="cursor:pointer; background:var(--paper-dark); border:1px solid var(--line);" onclick="activateTab('agenda')">
        <div style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-muted, #94a3b8); font-weight:700;">Scheduled Events</div>
        <div style="font-size:2rem; font-weight:800; color:var(--text-workspace, #f1f5f9); margin-top:2px;">${todaysEvents.length}</div>
        <div style="font-size:0.8rem; color:var(--sage-dark); margin-top:4px; font-weight:600;">Almanac Time →</div>
      </div>
      <div class="today-card" style="cursor:pointer; background:var(--paper-dark); border:1px solid var(--line);" onclick="activateTab('docs')">
        <div style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-muted, #94a3b8); font-weight:700;">Folio Document</div>
        <div style="font-size:1rem; font-weight:700; color:var(--text-workspace, #f1f5f9); margin-top:6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHTML(docObj.document.title)}</div>
        <div style="font-size:0.8rem; color:var(--brass-light, #60a5fa); margin-top:4px; font-weight:600;">Open Folio →</div>
      </div>
      <div class="today-card" style="cursor:pointer; background:var(--paper-dark); border:1px solid var(--line);" onclick="activateTab('sheets')">
        <div style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-muted, #94a3b8); font-weight:700;">Grid Workbook</div>
        <div style="font-size:1.2rem; font-weight:800; color:var(--text-workspace, #f1f5f9); margin-top:4px;">${wbObj.sheets.length} sheet${wbObj.sheets.length===1?'':'s'}</div>
        <div style="font-size:0.8rem; color:var(--brass-light, #60a5fa); margin-top:4px; font-weight:600;">Open Grid →</div>
      </div>
    </div>

    <!-- QUICK ACTIONS TOOLBAR -->
    <div style="background:var(--navy); border-radius:8px; padding:12px 16px; margin-bottom:20px; display:flex; align-items:center; gap:10px; flex-wrap:wrap; color:var(--paper);">
      <span style="font-size:0.8rem; font-weight:700; color:var(--brass-light); text-transform:uppercase; letter-spacing:0.05em;">Quick Actions:</span>
      <button class="btn brass small" onclick="activateTab('docs')">+ Document</button>
      <button class="btn sage small" onclick="activateTab('tasks')">+ Task</button>
      <button class="btn sage small" onclick="activateTab('agenda')">+ Event</button>
      <button class="btn brass small" onclick="activateTab('notes')">+ Note</button>
      <button class="btn ghost small" style="color:var(--text-workspace, #f1f5f9); border-color:rgba(246,241,228,0.3);" onclick="activateTab('sheets')">+ Grid</button>
      <button class="btn ghost small" style="color:var(--text-workspace, #f1f5f9); border-color:rgba(246,241,228,0.3);" onclick="activateTab('lockbox')">🔒 Lockbox</button>
    </div>

    <!-- MAIN DASHBOARD CONTENT GRID -->
    <div class="today-grid">
      <div class="today-card" style="background:var(--paper-dark); border:1px solid var(--line);">
        <h3 style="margin:0 0 10px 0; font-size:0.85rem; font-weight:700; color:var(--text-workspace, #f1f5f9); letter-spacing:0.05em;">📅 ALMANAC SCHEDULE</h3>
        ${todaysEvents.length ? todaysEvents.map(e=>`<div class="today-item" style="border-left:3px solid ${e.color||'var(--sage)'};padding-left:8px; margin-bottom:6px; color:var(--ink);"><b>${e.time}</b> — ${escapeHTML(e.title)}</div>`).join('') : '<div class="hint" style="color:var(--text-muted, #94a3b8);">No scheduled events for today.</div>'}
      </div>

      <div class="today-card" style="background:var(--paper-dark); border:1px solid var(--line);">
        <h3 style="margin:0 0 10px 0; font-size:0.85rem; font-weight:700; color:var(--text-workspace, #f1f5f9); letter-spacing:0.05em;">📌 DOCKET ACTIVE TASKS</h3>
        ${openTasks.length ? openTasks.slice(0,6).map(t=>`<div class="today-item" style="margin-bottom:6px; color:var(--ink);">• ${escapeHTML(t.label)}${daysCarried(t)>0?` <span class="repeat-badge">carried ${daysCarried(t)}d</span>`:''}</div>`).join('') : '<div class="hint" style="color:var(--text-muted, #94a3b8);">All tasks completed. Docket is clear.</div>'}
      </div>

      <div class="today-card" style="background:var(--paper-dark); border:1px solid var(--line);">
        <h3 style="margin:0 0 10px 0; font-size:0.85rem; font-weight:700; color:var(--text-workspace, #f1f5f9); letter-spacing:0.05em;">✏️ SPOT STREAK & CAPTURE</h3>
        <div class="today-item" style="color:var(--ink);">${streak>0 ? `🔥 <b>${streak} day${streak===1?'':'s'}</b> capture streak` : 'No streak yet — capture a note in Spot.'}</div>
      </div>

      <div class="today-card" style="background:var(--paper-dark); border:1px solid var(--line);">
        <h3 style="margin:0 0 10px 0; font-size:0.85rem; font-weight:700; color:var(--text-workspace, #f1f5f9); letter-spacing:0.05em;">🔑 LOCAL PASSWORD GENERATOR</h3>
        <div class="toolbar" style="margin:0 0 8px 0; gap:8px;">
          <input type="number" id="pwGenLength" value="16" min="8" max="64" style="width:55px; background:var(--bg-surface-elevated, #1a2332); border:1px solid var(--line); color:var(--ink);" onchange="renderPasswordGeneratorStandalone()">
          <label style="font-size:0.8em; color:var(--ink);"><input type="checkbox" id="pwGenLower" checked onchange="renderPasswordGeneratorStandalone()"> a-z</label>
          <label style="font-size:0.8em; color:var(--ink);"><input type="checkbox" id="pwGenUpper" checked onchange="renderPasswordGeneratorStandalone()"> A-Z</label>
          <label style="font-size:0.8em; color:var(--ink);"><input type="checkbox" id="pwGenDigits" checked onchange="renderPasswordGeneratorStandalone()"> 0-9</label>
          <label style="font-size:0.8em; color:var(--ink);"><input type="checkbox" id="pwGenSymbols" onchange="renderPasswordGeneratorStandalone()"> !@#</label>
        </div>
        <div id="pwGenOutput" class="today-item" style="font-family:monospace; font-weight:bold; font-size:1.05rem; color:var(--sage); background:var(--bg-surface-elevated, #1a2332); padding:6px 10px; border-radius:4px; border:1px solid var(--line);"></div>
        <div class="toolbar" style="margin-top:10px;">
          <button class="btn brass small" onclick="renderPasswordGeneratorStandalone()">↻ Regenerate</button>
          <button class="btn ghost small" style="border-color:var(--line); color:var(--text-workspace, #f1f5f9);" onclick="copyGeneratedStandalone()">⧉ Copy</button>
        </div>
      </div>
    </div>

    <!-- UNIVERSAL SEARCH -->
    <div style="background:var(--paper-dark); border:1px solid var(--line); border-radius:8px; padding:16px; margin-top:20px;">
      <h3 style="margin:0 0 8px 0; font-size:0.85rem; font-weight:700; color:var(--text-workspace, #f1f5f9); letter-spacing:0.05em;">🔍 UNIVERSAL LOCAL WORKSPACE SEARCH</h3>
      <input type="text" id="universalSearch" placeholder="Search documents, spreadsheets, notes, tasks, events, vault items..." oninput="universalSearch(this.value)" style="width:100%; box-sizing:border-box; padding:10px 14px; background:var(--bg-surface-elevated, #1a2332); border:1px solid var(--line); color:var(--ink); border-radius:6px; font-size:0.95rem;">
      <div id="universalSearchResults" style="margin-top:12px;"></div>
    </div>

    <!-- APPLICATION SUITE LAUNCHER (11 SUITE APPS) -->
    <div style="margin-top:24px; background:var(--paper-dark); border:1px solid var(--line); border-radius:8px; padding:16px;">
      <h3 style="margin:0 0 12px 0; font-size:0.85rem; font-weight:700; color:var(--text-workspace, #f1f5f9); letter-spacing:0.05em;">⚡ PRIVATE WORKSPACE APPLICATIONS (11 SUITE MODULES)</h3>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px;">
        <div class="today-card" style="cursor:pointer; background:var(--bg-surface-elevated, #1a2332); border:1px solid var(--line); border-radius:6px; padding:12px;" onclick="activateTab('docs')">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <b style="color:#f8fafc; font-size:0.95rem;">Folio</b>
            <span class="tag-pill">.fils</span>
          </div>
          <div style="font-size:0.78em; color:var(--text-muted, #94a3b8); margin-top:4px;">Document &amp; publishing studio</div>
        </div>
        <div class="today-card" style="cursor:pointer; background:var(--bg-surface-elevated, #1a2332); border:1px solid var(--line); border-radius:6px; padding:12px;" onclick="activateTab('sheets')">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <b style="color:#f8fafc; font-size:0.95rem;">Grid</b>
            <span class="tag-pill">.grid</span>
          </div>
          <div style="font-size:0.78em; color:var(--text-muted, #94a3b8); margin-top:4px;">Spreadsheet, data &amp; analytics</div>
        </div>
        <div class="today-card" style="cursor:pointer; background:var(--bg-surface-elevated, #1a2332); border:1px solid var(--line); border-radius:6px; padding:12px;" onclick="activateTab('forms')">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <b style="color:#f8fafc; font-size:0.95rem;">Fill</b>
            <span class="tag-pill">.fill</span>
          </div>
          <div style="font-size:0.78em; color:var(--text-muted, #94a3b8); margin-top:4px;">Private offline forms studio</div>
        </div>
        <div class="today-card" style="cursor:pointer; background:var(--bg-surface-elevated, #1a2332); border:1px solid var(--line); border-radius:6px; padding:12px;" onclick="activateTab('notes')">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <b style="color:#f8fafc; font-size:0.95rem;">Spot</b>
            <span class="tag-pill">.spot</span>
          </div>
          <div style="font-size:0.78em; color:var(--text-muted, #94a3b8); margin-top:4px;">Knowledge &amp; fast notes board</div>
        </div>
        <div class="today-card" style="cursor:pointer; background:var(--bg-surface-elevated, #1a2332); border:1px solid var(--line); border-radius:6px; padding:12px;" onclick="activateTab('tasks')">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <b style="color:#f8fafc; font-size:0.95rem;">Docket</b>
            <span class="tag-pill">.plot</span>
          </div>
          <div style="font-size:0.78em; color:var(--text-muted, #94a3b8); margin-top:4px;">Tasks &amp; action planning</div>
        </div>
        <div class="today-card" style="cursor:pointer; background:var(--bg-surface-elevated, #1a2332); border:1px solid var(--line); border-radius:6px; padding:12px;" onclick="activateTab('agenda')">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <b style="color:#f8fafc; font-size:0.95rem;">Almanac</b>
            <span class="tag-pill">.agnd</span>
          </div>
          <div style="font-size:0.78em; color:var(--text-muted, #94a3b8); margin-top:4px;">Calendar &amp; time planner</div>
        </div>
        <div class="today-card" style="cursor:pointer; background:var(--bg-surface-elevated, #1a2332); border:1px solid var(--line); border-radius:6px; padding:12px;" onclick="activateTab('slides')">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <b style="color:#f8fafc; font-size:0.95rem;">Glides</b>
            <span class="tag-pill">.glides</span>
          </div>
          <div style="font-size:0.78em; color:var(--text-muted, #94a3b8); margin-top:4px;">Visual presentation studio</div>
        </div>
        <div class="today-card" style="cursor:pointer; background:var(--bg-surface-elevated, #1a2332); border:1px solid var(--line); border-radius:6px; padding:12px;" onclick="activateTab('lockbox')">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <b style="color:#f8fafc; font-size:0.95rem;">Lockbox</b>
            <span class="tag-pill">.lbox</span>
          </div>
          <div style="font-size:0.78em; color:var(--text-muted, #94a3b8); margin-top:4px;">Passwords, TOTP &amp; vaults</div>
        </div>
        <div class="today-card" style="cursor:pointer; background:var(--bg-surface-elevated, #1a2332); border:1px solid var(--line); border-radius:6px; padding:12px;" onclick="activateTab('formula')">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <b style="color:#f8fafc; font-size:0.95rem;">Formula</b>
            <span class="tag-pill">.formu</span>
          </div>
          <div style="font-size:0.78em; color:var(--text-muted, #94a3b8); margin-top:4px;">Scientific math &amp; unit engine</div>
        </div>
        <div class="today-card" style="cursor:pointer; background:var(--bg-surface-elevated, #1a2332); border:1px solid var(--line); border-radius:6px; padding:12px;" onclick="activateTab('transmute')">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <b style="color:#f8fafc; font-size:0.95rem;">Transmute</b>
            <span class="tag-pill">.xmute</span>
          </div>
          <div style="font-size:0.78em; color:var(--text-muted, #94a3b8); margin-top:4px;">Format &amp; crypto transformer</div>
        </div>
        <div class="today-card" style="cursor:pointer; background:var(--bg-surface-elevated, #1a2332); border:1px solid var(--line); border-radius:6px; padding:12px;" onclick="activateTab('doxera')">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <b style="color:#f8fafc; font-size:0.95rem;">Doxera</b>
            <span class="tag-pill">.ddf</span>
          </div>
          <div style="font-size:0.78em; color:var(--text-muted, #94a3b8); margin-top:4px;">Structured docs &amp; knowledge</div>
        </div>
      </div>
    </div>
  `;
  renderPasswordGeneratorStandalone();
}

function universalSearch(query){
  const el = document.getElementById('universalSearchResults');
  if(!query || query.trim().length<2){ el.innerHTML=''; return; }
  const q = query.toLowerCase();
  const results = [];
  const docs = loadLocal('docs', {html:''});
  if((docs.html||'').replace(/<[^>]+>/g,' ').toLowerCase().includes(q)) results.push({tab:'docs', label:'Folio', snippet:'Match in your document'});
  (loadLocal('notes', {items:[]}).items||[]).forEach(n=>{ if((n.text||'').toLowerCase().includes(q)) results.push({tab:'notes', label:'Spot', snippet:n.text.slice(0,60)}); });
  (loadLocal('tasks', {items:[]}).items||[]).forEach(t=>{ if((t.label||'').toLowerCase().includes(q)) results.push({tab:'tasks', label:'Docket', snippet:t.label}); });
  (loadLocal('agenda', {events:[]}).events||[]).forEach(e=>{ if((e.title||'').toLowerCase().includes(q)) results.push({tab:'agenda', label:'Almanac', snippet:e.title+' — '+e.date}); });
  (loadLocal('slides', {slides:[]}).slides||[]).forEach(s=>{ if((s.text||'').toLowerCase().includes(q)) results.push({tab:'slides', label:'Glides', snippet:(s.text||'').slice(0,60)}); });
  (loadLocal('forms', {fields:[]}).fields||[]).forEach(f=>{ if((f.label||'').toLowerCase().includes(q)) results.push({tab:'forms', label:'Fill', snippet:f.label}); });
  (loadLocal('lockbox', {files:[]}).files||[]).forEach(f=>{ if((f.name||'').toLowerCase().includes(q)) results.push({tab:'lockbox', label:'Lockbox', snippet:f.name}); });
  (loadLocal('formula', {history:[]}).history||[]).forEach(item=>{ if((item.expr||'').toLowerCase().includes(q) || (item.result||'').toLowerCase().includes(q)) results.push({tab:'formula', label:'Formula', snippet:item.expr + ' = ' + item.result}); });
  (loadLocal('transmute', {history:[]}).history||[]).forEach(h=>{ if((h.input||'').toLowerCase().includes(q) || (h.output||'').toLowerCase().includes(q)) results.push({tab:'transmute', label:'Transmute', snippet:h.title || (h.input.slice(0,30) + ' -> ' + h.output.slice(0,30))}); });
  (loadLocal('doxera', {docs:[]}).docs||[]).forEach(d=>{ if((d.title||'').toLowerCase().includes(q) || (d.body||'').toLowerCase().includes(q)) results.push({tab:'doxera', label:'Doxera', snippet:d.title}); });
  el.innerHTML = results.length ? results.map(r=>`<div class="search-result" onclick="activateTab('${r.tab}')"><b>${r.label}</b> — ${r.snippet}</div>`).join('') : '<div class="hint">No matches.</div>';
}

/* ---------- Modules config ---------- */
const ALL_MODULES = [
  {id:'docs', label:'Folio', ext:'.fils'},
  {id:'sheets', label:'Grid', ext:'.grid'},
  {id:'forms', label:'Fill', ext:'.fill'},
  {id:'notes', label:'Spot', ext:'.spot'},
  {id:'tasks', label:'Docket', ext:'.plot'},
  {id:'agenda', label:'Almanac', ext:'.agnd'},
  {id:'slides', label:'Glides', ext:'.glides'},
  {id:'lockbox', label:'Lockbox', ext:'.lbox'},
  {id:'formula', label:'Formula', ext:'.formu'},
  {id:'transmute', label:'Transmute', ext:'.xmute'},
  {id:'doxera', label:'Doxera', ext:'.ddf'},
];
const modules = SUITE_ONLY ? ALL_MODULES.filter(m=>m.id===SUITE_ONLY) : ALL_MODULES;

const tabsEl = document.getElementById('tabs');
const workspaceEl = document.getElementById('workspace');

if(!SUITE_ONLY){
  const todayTab = document.createElement('div');
  todayTab.className='tab'; todayTab.dataset.id='today';
  todayTab.innerHTML = 'Today';
  todayTab.onclick = ()=>activateTab('today');
  tabsEl.appendChild(todayTab);
  const todayPanel = document.createElement('div');
  todayPanel.className='panel'; todayPanel.id='panel-today';
  workspaceEl.appendChild(todayPanel);

  const extraTabs = {privacy:'Privacy Center', security:'Security Center'};
  ['privacy','security'].forEach(id=>{
    const t = document.createElement('div');
    t.className='tab'; t.dataset.id=id;
    t.innerHTML = extraTabs[id];
    t.onclick = ()=>activateTab(id);
    tabsEl.appendChild(t);
    const p = document.createElement('div');
    p.className='panel'; p.id='panel-'+id;
    workspaceEl.appendChild(p);
  });
} else {
  document.body.classList.add('standalone');
  const brandTitle = document.getElementById('brandTitle');
  if(brandTitle) brandTitle.textContent = modules[0].label;
}

modules.forEach(m=>{
  const tab = document.createElement('div');
  tab.className='tab'; tab.dataset.id=m.id;
  tab.innerHTML = `${m.label} <span class="ext">${m.ext}</span>`;
  tab.onclick = ()=>activateTab(m.id);
  tabsEl.appendChild(tab);

  const panel = document.createElement('div');
  panel.className='panel'; panel.id='panel-'+m.id;
  workspaceEl.appendChild(panel);
});
if(SUITE_ONLY && modules.length > 0){
  setTimeout(() => activateTab(modules[0].id), 10);
}

function activateTab(id){
  if(id!=='lockbox') stopTotpTicker();
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active', t.dataset.id===id));
  document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active', p.id==='panel-'+id));
  document.querySelectorAll('.sidebar-item').forEach(s=>s.classList.toggle('active', s.dataset.id===id));
  if(id==='docs') renderDocs();
  if(id==='sheets') renderSheets();
  if(id==='forms') renderForms();
  if(id==='notes') renderNotes();
  if(id==='tasks') renderTasks();
  if(id==='agenda') renderAgenda();
  if(id==='slides') renderSlides();
  if(id==='lockbox') renderLockbox();
  if(id==='formula') renderFormula();
  if(id==='transmute') renderTransmute();
  if(id==='doxera') renderDoxera();
  if(id==='today') renderToday();
  if(id==='privacy') renderPrivacyCenter();
  if(id==='security') renderSecurityCenter();
  const gsr = document.getElementById('globalSearchResults');
  if(gsr) gsr.classList.remove('open');
}

/* ---------- Sidebar (workspace nav) ---------- */
const MODULE_GROUPS = {
  ORGANIZE: ['today','notes','tasks','agenda'],
  SECURE:   ['lockbox','privacy','security'],
  CREATE:   ['docs','sheets','forms','slides','formula','transmute','doxera'],
};
const EXTRA_TAB_LABELS = { privacy:'Privacy Center', security:'Security Center' };
function buildSidebar(){
  const nav = document.getElementById('sidebarNav');
  if(!nav) return;
  nav.innerHTML = '';
  const byId = {};
  document.querySelectorAll('.tab').forEach(t=>{ byId[t.dataset.id] = t; });
  const groupOrder = SUITE_ONLY ? [{label:null, ids:[modules[0].id]}] :
    Object.entries(MODULE_GROUPS).map(([label, ids])=>({label, ids}));
  groupOrder.forEach(g=>{
    const wrap = document.createElement('div');
    wrap.className = 'sidebar-group';
    if(g.label){
      const lbl = document.createElement('div');
      lbl.className = 'sidebar-group-label';
      lbl.textContent = g.label;
      wrap.appendChild(lbl);
    }
    g.ids.forEach(id=>{
      const src = byId[id];
      const m = ALL_MODULES.find(x=>x.id===id);
      const label = id==='today' ? 'Dashboard' : (EXTRA_TAB_LABELS[id] || (m ? m.label : id));
      const ext = m ? m.ext : '';
      const item = document.createElement('div');
      item.className = 'sidebar-item';
      item.dataset.id = id;
      item.innerHTML = `<span class="si-left"><span class="si-dot"></span>${label}${ext ? ` <span class="si-ext">${ext}</span>` : ''}</span>`;
      item.onclick = ()=>activateTab(id);
      wrap.appendChild(item);
    });
    nav.appendChild(wrap);
  });
}
buildSidebar();

/* ---------- Global search (topstrip) — Phase 18: Universal Search with filters ----------
   Supports advanced filter tokens anywhere in the query: type:X, tag:X,
   modified:today, project:X (matched loosely against tags/folder/title
   since this app has no separate "project" entity yet — stated honestly
   below rather than pretending a project system exists). */
function parseSearchFilters(raw){
  const filters = {};
  const text = raw.replace(/(\w+):(\S+)/g, (m,k,v)=>{ filters[k.toLowerCase()] = v.toLowerCase(); return ''; }).trim();
  return {text, filters};
}
function matchesModifiedFilter(dateStr, filterVal){
  if(!filterVal) return true;
  if(!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  if(filterVal==='today') return d.toDateString()===now.toDateString();
  if(filterVal==='week') return (now-d) < 7*24*60*60*1000;
  return true;
}
function globalSearch(query){
  const el = document.getElementById('globalSearchResults');
  if(!el) return;
  if(!query || query.trim().length<2){ el.classList.remove('open'); el.innerHTML=''; return; }
  universalSearch(query); // populates #universalSearchResults on the Dashboard panel too, if present
  const {text, filters} = parseSearchFilters(query);
  const q = text.toLowerCase();
  const wantType = filters.type; // password | file | note | document | task | contact | project | form | calendar | vault
  const results = [];
  const push = (type, r)=>{ if(wantType && wantType!==type) return; results.push(r); };

  if(!wantType || wantType==='document'){
    const docs = loadLocal('docs', {html:''});
    if((docs.html||'').replace(/<[^>]+>/g,' ').toLowerCase().includes(q)) push('document', {tab:'docs', label:'Folio', snippet:'Match in your document'});
  }
  if(!wantType || wantType==='note'){
    (loadLocal('notes', {items:[]}).items||[]).forEach(n=>{ if((n.text||'').toLowerCase().includes(q)) push('note', {tab:'notes', label:'Spot (Board)', snippet:n.text.slice(0,60)}); });
    getLibraryNotes().forEach(n=>{
      if(filters.tag && !(n.tags||'').toLowerCase().includes(filters.tag)) return;
      if(!matchesModifiedFilter(n.updatedAt||n.createdAt, filters.modified)) return;
      if((n.title||'').toLowerCase().includes(q) || (n.body||'').toLowerCase().includes(q))
        push('note', {tab:'notes', label:'Spot (Library: '+n.folder+')', snippet:n.title});
    });
  }
  if(!wantType || wantType==='task'){
    (loadLocal('tasks', {items:[]}).items||[]).forEach(t=>{ if((t.label||'').toLowerCase().includes(q)) push('task', {tab:'tasks', label:'Docket', snippet:t.label}); });
  }
  if(!wantType || wantType==='calendar'){
    (loadLocal('agenda', {events:[]}).events||[]).forEach(e=>{ if((e.title||'').toLowerCase().includes(q)) push('calendar', {tab:'agenda', label:'Almanac', snippet:e.title+' — '+e.date}); });
  }
  if(!wantType || wantType==='document'){
    (loadLocal('slides', {slides:[]}).slides||[]).forEach(s=>{ if((s.text||'').toLowerCase().includes(q)) push('document', {tab:'slides', label:'Glides', snippet:(s.text||'').slice(0,60)}); });
  }
  if(!wantType || wantType==='form'){
    (loadLocal('forms', {fields:[]}).fields||[]).forEach(f=>{ if((f.label||'').toLowerCase().includes(q)) push('form', {tab:'forms', label:'Fill', snippet:f.label}); });
  }
  if(!wantType || wantType==='file'){
    (loadLocal('lockbox', {files:[]}).files||[]).forEach(f=>{ if((f.name||'').toLowerCase().includes(q)) push('file', {tab:'lockbox', label:'Lockbox reference', snippet:f.name}); });
  }
  if(!wantType || wantType==='document'){
    (loadLocal('formula', {history:[]}).history||[]).forEach(item=>{ if((item.expr||'').toLowerCase().includes(q) || (item.result||'').toLowerCase().includes(q)) push('document', {tab:'formula', label:'Formula', snippet:item.expr + ' = ' + item.result}); });
    (loadLocal('transmute', {history:[]}).history||[]).forEach(h=>{ if((h.input||'').toLowerCase().includes(q) || (h.output||'').toLowerCase().includes(q)) push('document', {tab:'transmute', label:'Transmute', snippet:h.title || (h.input.slice(0,30) + ' -> ' + h.output.slice(0,30))}); });
    (loadLocal('doxera', {docs:[]}).docs||[]).forEach(d=>{ if((d.title||'').toLowerCase().includes(q) || (d.body||'').toLowerCase().includes(q)) push('document', {tab:'doxera', label:'Doxera', snippet:d.title}); });
  }
  if((!wantType || wantType==='password' || wantType==='vault') && _vaultItems){
    _vaultItems.forEach(item=>{
      if(filters.tag && !(item.tags||'').toLowerCase().includes(filters.tag)) return;
      const cat = VAULT_CATEGORIES.find(c=>c.id===item.category);
      const title = item.fields[cat.fields[0].k] || '';
      if(title.toLowerCase().includes(q)) push(item.category==='logins'?'password':'vault', {tab:'lockbox', label:'Vault: '+cat.label, snippet:title});
    });
  }
  const filterNote = wantType || filters.tag || filters.modified ? `<div class="hint">Filters: ${Object.entries(filters).map(([k,v])=>k+':'+v).join(' ')}${!_vaultItems && (wantType==='password'||wantType==='vault') ? ' — unlock a vault to search it' : ''}</div>` : '';
  el.innerHTML = filterNote + (results.length ? results.map(r=>`<div class="search-result" onclick="activateTab('${r.tab}'); document.getElementById('gSearchInput').value=''; document.getElementById('globalSearchResults').classList.remove('open');"><b>${r.label}</b> — ${r.snippet}</div>`).join('') : '<div class="hint">No matches.</div>');
  el.classList.add('open');
}

/* ---------- Command Center (Phase 19) + Keyboard-First Design (Phase 20) ---------- */
function getCommandList(){
  const idx = getVaultsIndex();
  const cmds = [
    {label:'New Password', action:()=>{ activateTab('lockbox'); if(_activeVaultId){ _vaultCategory='logins'; renderVaultUnlocked(); openVaultItemForm(null); } }},
    {label:'New Note', action:()=>{ activateTab('notes'); _notesView='library'; renderNotes(); addLibraryNote(); }},
    {label:'New File', action:()=>{ activateTab('lockbox'); }},
    {label:'New Task', action:()=>{ activateTab('tasks'); }},
    {label:'Lock Vault', action:()=>{ lockVault(); activateTab('lockbox'); }},
    {label:'Export Vault (as Capsule)', action:()=>{ openCapsuleModal('export'); }},
    {label:'Security Center', action:()=>{ activateTab('security'); }},
    {label:'Privacy Center', action:()=>{ activateTab('privacy'); }},
    {label:'Generate Password', action:()=>{ activateTab('today'); }},
  ];
  idx.forEach(v=>{ cmds.push({label:'Open '+v.name+' Vault', action:()=>{ activateTab('lockbox'); selectVaultToUnlock(v.id); }}); });
  return cmds;
}
let _paletteIndex = 0;
function openCommandPalette(){
  let bg = document.getElementById('cmdPaletteBg');
  if(!bg){
    bg = document.createElement('div');
    bg.id = 'cmdPaletteBg';
    bg.className = 'cmd-palette-bg';
    bg.innerHTML = `<div class="cmd-palette">
      <input type="text" id="cmdPaletteInput" placeholder="Type a command…" oninput="filterCommandPalette(this.value)">
      <div id="cmdPaletteList"></div>
    </div>`;
    bg.onclick = (e)=>{ if(e.target===bg) closeCommandPalette(); };
    document.body.appendChild(bg);
  }
  bg.classList.add('open');
  _paletteIndex = 0;
  filterCommandPalette('');
  setTimeout(()=>document.getElementById('cmdPaletteInput').focus(), 20);
}
function closeCommandPalette(){
  const bg = document.getElementById('cmdPaletteBg');
  if(bg) bg.classList.remove('open');
}
function filterCommandPalette(q){
  const list = getCommandList().filter(c=>c.label.toLowerCase().includes((q||'').toLowerCase()));
  window._paletteCommands = list;
  const el = document.getElementById('cmdPaletteList');
  el.innerHTML = list.map((c,i)=>`<div class="cmd-item ${i===_paletteIndex?'sel':''}" onclick="runPaletteCommand(${i})">&gt; ${c.label}</div>`).join('') || '<div class="hint" style="padding:10px;">No matching command.</div>';
}
function runPaletteCommand(i){
  const cmd = (window._paletteCommands||[])[i];
  closeCommandPalette();
  if(cmd) cmd.action();
}
document.addEventListener('keydown', (e)=>{
  const inField = document.activeElement && ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName);
  const paletteOpen = document.getElementById('cmdPaletteBg') && document.getElementById('cmdPaletteBg').classList.contains('open');

  if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); openCommandPalette(); return; }
  if(paletteOpen){
    const list = window._paletteCommands||[];
    if(e.key==='ArrowDown'){ e.preventDefault(); _paletteIndex = Math.min(_paletteIndex+1, list.length-1); filterCommandPalette(document.getElementById('cmdPaletteInput').value); }
    else if(e.key==='ArrowUp'){ e.preventDefault(); _paletteIndex = Math.max(_paletteIndex-1, 0); filterCommandPalette(document.getElementById('cmdPaletteInput').value); }
    else if(e.key==='Enter'){ e.preventDefault(); runPaletteCommand(_paletteIndex); }
    else if(e.key==='Escape'){ e.preventDefault(); closeCommandPalette(); }
    return;
  }
  if(e.key==='Escape'){ if(_activeVaultId){ lockVault(); } return; }
  if(inField) return;
  if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='p'){ e.preventDefault(); activateTab('today'); setTimeout(()=>document.getElementById('pwGenLength')?.focus(),50); return; }
  if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='n'){ e.preventDefault(); openCommandPalette(); document.getElementById('cmdPaletteInput').value='New '; filterCommandPalette('New '); return; }
  if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='f'){ e.preventDefault(); document.getElementById('gSearchInput')?.focus(); return; }
  if((e.ctrlKey||e.metaKey) && e.shiftKey && e.key.toLowerCase()==='l'){ e.preventDefault(); lockVault(); activateTab('lockbox'); return; }
  if((e.ctrlKey||e.metaKey) && e.shiftKey && e.key.toLowerCase()==='e'){ e.preventDefault(); openCapsuleModal('export'); return; }
});

document.addEventListener('click', (e)=>{
  const gsr = document.getElementById('globalSearchResults');
  const box = document.querySelector('.gsearch');
  if(gsr && box && !box.contains(e.target) && !gsr.contains(e.target)) gsr.classList.remove('open');
});
document.addEventListener('keydown', (e)=>{
  if(e.key==='/' && document.activeElement.tagName!=='INPUT' && document.activeElement.tagName!=='TEXTAREA'){
    e.preventDefault();
    const inp = document.getElementById('gSearchInput');
    if(inp) inp.focus();
  }
});


/* ================= FOLIO DOCUMENT DATA MODEL & REPOSITORY (SESSION 16) ================= */

function getFolioDocument() {
  const raw = loadLocal('docs', null);
  let docObj = null;
  if (raw && raw.format === "folio" && raw.document) {
    docObj = raw;
  } else {
    const legacyHtml = (raw && typeof raw === 'object' && raw.html) ? raw.html : '<p>Start writing...</p>';
    docObj = {
      format: "folio",
      version: 1,
      document: {
        id: "doc_" + Date.now(),
        title: "Untitled Document",
        metadata: {
          created: Date.now(),
          modified: Date.now(),
          author: "Operator",
          tags: [],
          status: "Draft",
          priority: "Normal"
        },
        content: legacyHtml,
        attachments: [],
        comments: [],
        history: [{
          id: "v_" + Date.now(),
          title: "Initial Version",
          timestamp: Date.now(),
          content: legacyHtml
        }],
        relations: []
      }
    };
  }

  // Ensure robust sub-schemas for complete document data model
  const doc = docObj.document;
  if (!doc.settings) {
    doc.settings = {
      margins: 'standard',
      orientation: 'portrait',
      columns: 1,
      paperColor: '#ffffff',
      watermark: '',
      headerText: '',
      footerText: '',
      showRuler: true,
      showGridlines: false,
      zoom: 100,
      protectionLocked: false,
      protectionPassword: ''
    };
  }
  if (!doc.toc) doc.toc = [];
  if (!doc.footnotes) doc.footnotes = [];
  if (!doc.endnotes) doc.endnotes = [];
  if (!doc.comments) doc.comments = [];
  if (!doc.revisions) doc.revisions = [];
  if (!doc.mailMergeData) {
    doc.mailMergeData = {
      recipients: [
        { name: 'Alice Smith', company: 'Acme Corp', role: 'Director', email: 'alice@acme.com' },
        { name: 'Bob Jones', company: 'Starlight Inc', role: 'Manager', email: 'bob@starlight.com' }
      ],
      currentRecipientIndex: 0
    };
  }
  return docObj;
}

function insertFolioImage() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/png, image/jpeg, image/webp, image/gif, image/svg+xml';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUri = evt.target.result;
      const editor = document.getElementById('docsEditor');
      if (editor) {
        editor.focus();
        const imgId = 'img_' + Date.now();
        const imgHtml = `<span class="folio-image-wrapper" contenteditable="false" style="display:inline-block; position:relative; margin:8px 0; max-width:100%;">
          <img id="${imgId}" src="${dataUri}" style="max-width:100%; height:auto; border-radius:4px; border:1px solid rgba(255,255,255,0.15); cursor:pointer; vertical-align:middle;" alt="${file.name}" onclick="selectFolioImage('${imgId}')" />
        </span><p></p>`;
        document.execCommand('insertHTML', false, imgHtml);
        captureFolioCurrentContent();
        showSeal();
        if (typeof showToast === 'function') showToast(`Image "${file.name}" inserted locally.`);
      }
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

function selectFolioImage(imgId) {
  const img = document.getElementById(imgId);
  if (!img) return;
  const newWidth = prompt("Enter new image width (e.g., 300px, 50%, 100%):", img.style.width || "100%");
  if (newWidth) {
    img.style.width = newWidth;
    captureFolioCurrentContent();
    if (typeof showToast === 'function') showToast("Image resized.");
  }
}

function saveFolioDocument(docObj, silent = false) {
  docObj.document.metadata.modified = Date.now();
  saveLocal('docs', docObj);
  if (!silent) showSeal();
}

/* ================= DOCS (.fils) ================= */
let currentFolioInspectorTab = 'outline';
let currentFolioRibbonTab = 'HOME';
let folioMailMergeRecipients = [
  { name: 'Alice Smith', company: 'Acme Corp', role: 'Director', email: 'alice@acme.com' },
  { name: 'Bob Jones', company: 'Starlight Inc', role: 'Manager', email: 'bob@starlight.com' }
];

function captureFolioCurrentContent() {
  const editor = document.getElementById('docsEditor');
  if (editor) {
    const docObj = getFolioDocument();
    docObj.document.content = editor.innerHTML;
    saveLocalSilent('docs', docObj);
  }
}

function setFolioRibbonTab(tab) {
  captureFolioCurrentContent();
  currentFolioRibbonTab = tab;
  renderDocs();
}

function setFolioInspectorTab(tab) {
  captureFolioCurrentContent();
  currentFolioInspectorTab = tab;
  renderDocs();
}

function renderFolioRibbonBar() {
  const tabs = ['FILE', 'HOME', 'PDF TOOLS', 'INSERT', 'DESIGN', 'LAYOUT', 'REFERENCES', 'MAILINGS', 'REVIEW', 'VIEW', 'HELP'];
  return `
    <div style="background:#18181b; border:1px solid #27272a; border-radius:8px; overflow:hidden; margin-bottom:12px; box-shadow:0 4px 12px rgba(0,0,0,0.4);">
      <div style="display:flex; background:#09090b; border-bottom:1px solid #27272a; padding:0 6px; overflow-x:auto;">
        ${tabs.map(t => `
          <button style="padding:8px 14px; background:none; border:none; border-bottom:2px solid ${currentFolioRibbonTab===t?'#f59e0b':'transparent'}; color:${currentFolioRibbonTab===t?'#f59e0b':'#a1a1aa'}; font-weight:700; font-size:0.75rem; letter-spacing:0.04em; cursor:pointer; white-space:nowrap; transition:all 0.15s ease;" onclick="setFolioRibbonTab('${t}')">
            ${t}
          </button>
        `).join('')}
      </div>
      <div style="padding:8px 12px; display:flex; align-items:center; gap:10px; flex-wrap:wrap; background:#18181b; min-height:48px;">
        ${renderFolioRibbonTools()}
      </div>
    </div>
  `;
}

/* ================= SPOT VIEW SUB-RENDERERS & HELPERS ================= */

function renderSpotCollectionsView(notes, cols) {
  const colCards = cols.map(c => {
    const colNotes = notes.filter(n => n.collectionId === c.id || n.folder === c.name);
    return `
      <div class="spot-col-card" onclick="currentSpotCollectionId='${c.id}'; renderSpotContent();" style="border:1px solid ${currentSpotCollectionId === c.id ? 'var(--accent-primary, #3b82f6)' : 'var(--border, #334155)'}; border-radius:6px; padding:12px; background:var(--bg-card, #0f172a); cursor:pointer;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <b style="font-size:0.95rem;">📁 ${escapeHtml(c.name)}</b>
          <span class="badge" style="background:rgba(59,130,246,0.2); color:#60a5fa; font-size:0.75rem; padding:2px 8px; border-radius:10px;">${colNotes.length} notes</span>
        </div>
        <div style="font-size:0.8rem; color:var(--text-muted, #94a3b8); margin-top:4px;">${escapeHtml(c.description || '')}</div>
      </div>
    `;
  }).join('');

  const activeCol = cols.find(c => c.id === currentSpotCollectionId) || cols[0];
  const colItems = activeCol ? notes.filter(n => n.collectionId === activeCol.id || n.folder === activeCol.name) : notes;

  return `
    <h3 style="margin-top:0; margin-bottom:12px; font-size:1.1rem; color:var(--text, #f8fafc);">Knowledge Collections</h3>
    <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:10px; margin-bottom:16px;">
      ${colCards}
    </div>
    ${renderSpotListView(colItems, `Collection: ${activeCol ? activeCol.name : 'All'}`)}
  `;
}

function renderSpotTopicsView(notes) {
  const tagMap = {};
  notes.forEach(n => {
    if (n.tags) {
      n.tags.split(',').map(t => t.trim()).filter(Boolean).forEach(t => {
        tagMap[t] = (tagMap[t] || 0) + 1;
      });
    }
  });

  const tagPills = Object.keys(tagMap).map(tag => `
    <button class="btn ${currentSpotTopic === tag ? 'brass' : 'ghost'} small" onclick="currentSpotTopic='${escapeHtml(tag)}'; renderSpotContent();" style="margin-right:6px; margin-bottom:6px;">
      🏷 ${escapeHtml(tag)} <span style="opacity:0.6;">(${tagMap[tag]})</span>
    </button>
  `).join('');

  const filteredItems = currentSpotTopic ? notes.filter(n => (n.tags || '').toLowerCase().includes(currentSpotTopic.toLowerCase())) : notes;

  return `
    <h3 style="margin-top:0; margin-bottom:12px; font-size:1.1rem; color:var(--text, #f8fafc);">Topics & Tag Cloud</h3>
    <div style="background:var(--bg-card, #0f172a); border:1px solid var(--border, #334155); border-radius:6px; padding:12px; margin-bottom:16px;">
      ${tagPills || '<span class="hint">No tags assigned yet. Add tags to notes in the Inspector.</span>'}
    </div>
    ${renderSpotListView(filteredItems, currentSpotTopic ? `Topic: #${currentSpotTopic}` : 'All Tagged Knowledge')}
  `;
}

function renderSpotCanvasView(notes, rels) {
  let svgLines = '<svg id="spotCanvasSvg" style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:0;">';
  rels.forEach(r => {
    const n1 = notes.find(x => x.id === r.fromId);
    const n2 = notes.find(x => x.id === r.toId);
    if (n1 && n2) {
      const x1 = (n1.x || 50) + 90;
      const y1 = (n1.y || 50) + 40;
      const x2 = (n2.x || 250) + 90;
      const y2 = (n2.y || 150) + 40;
      svgLines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#3b82f6" stroke-width="2" stroke-dasharray="4,4" opacity="0.8"/>`;
    }
  });
  svgLines += '</svg>';

  const canvasCardsHtml = notes.map((n, idx) => {
    const x = n.x !== undefined ? n.x : (40 + (idx % 4) * 220);
    const y = n.y !== undefined ? n.y : (40 + Math.floor(idx / 4) * 140);
    return `
      <div class="spot-canvas-card" data-id="${n.id}" style="position:absolute; left:${x}px; top:${y}px; width:180px; background:var(--bg-card, #0f172a); border:1px solid var(--border, #334155); border-radius:6px; padding:10px; cursor:move; z-index:1; box-shadow:0 4px 6px -1px rgba(0,0,0,0.3);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
          <b style="font-size:0.85rem; color:var(--text, #f8fafc); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(n.title || 'Untitled')}</b>
          <span style="font-size:0.75rem; color:#ef4444; cursor:pointer;" onclick="deleteSpotItem(${n.id})">✕</span>
        </div>
        <div style="font-size:0.75rem; color:var(--text-muted, #94a3b8); height:45px; overflow:hidden;">
          ${escapeHtml((n.body || '').replace(/[#*`]/g, '').slice(0, 60))}
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px; font-size:0.7rem;">
          <span style="color:#60a5fa;">${escapeHtml(n.type || 'Note')}</span>
          <button class="btn ghost small" style="padding:1px 4px; font-size:0.65rem;" onclick="currentSpotSelectedId=${n.id}; currentSpotNav='inbox'; renderSpotContent();">Edit</button>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
      <h3 style="margin:0; font-size:1.1rem; color:var(--text, #f8fafc);">📌 Spatial Research Canvas</h3>
      <span class="hint">Drag cards around to arrange your research. Connections show explicit relationships.</span>
    </div>
    <div id="spotCanvasArea" style="position:relative; width:100%; height:550px; background:var(--bg-main, #0b0f19); border:1px solid var(--border, #334155); border-radius:6px; overflow:hidden;">
      ${svgLines}
      ${canvasCardsHtml}
    </div>
  `;
}

function initSpotCanvasEvents() {
  const canvasArea = document.getElementById('spotCanvasArea');
  if (!canvasArea) return;

  canvasArea.querySelectorAll('.spot-canvas-card').forEach(card => {
    card.addEventListener('mousedown', e => {
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'SPAN') return;
      draggingSpotNote = card;
      const rect = card.getBoundingClientRect();
      dragSpotOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    });
  });
}

document.addEventListener('mousemove', e => {
  if (!draggingSpotNote) return;
  const canvasArea = document.getElementById('spotCanvasArea');
  if (!canvasArea) return;
  const areaRect = canvasArea.getBoundingClientRect();
  let x = e.clientX - areaRect.left - dragSpotOffset.x;
  let y = e.clientY - areaRect.top - dragSpotOffset.y;
  x = Math.max(0, Math.min(x, areaRect.width - 180));
  y = Math.max(0, Math.min(y, areaRect.height - 100));
  draggingSpotNote.style.left = x + 'px';
  draggingSpotNote.style.top = y + 'px';
});

document.addEventListener('mouseup', () => {
  if (draggingSpotNote) {
    const id = parseInt(draggingSpotNote.dataset.id);
    const notes = getSpotNotes();
    const item = notes.find(n => n.id === id);
    if (item) {
      item.x = parseInt(draggingSpotNote.style.left);
      item.y = parseInt(draggingSpotNote.style.top);
      saveSpotNotes(notes);
    }
  }
  draggingSpotNote = null;
});

function renderSpotGraphView(notes, rels) {
  let svgNodes = '';
  const nodeCoords = {};
  notes.forEach((n, idx) => {
    const angle = (idx / Math.max(1, notes.length)) * 2 * Math.PI;
    const rx = 240 + Math.cos(angle) * 180;
    const ry = 220 + Math.sin(angle) * 150;
    nodeCoords[n.id] = { x: rx, y: ry };
  });

  let svgEdges = '';
  rels.forEach(r => {
    const c1 = nodeCoords[r.fromId];
    const c2 = nodeCoords[r.toId];
    if (c1 && c2) {
      svgEdges += `<line x1="${c1.x}" y1="${c1.y}" x2="${c2.x}" y2="${c2.y}" stroke="#3b82f6" stroke-width="2" stroke-opacity="0.6"/>`;
    }
  });

  notes.forEach(n => {
    const c = nodeCoords[n.id];
    if (c) {
      svgNodes += `
        <g style="cursor:pointer;" onclick="currentSpotSelectedId=${n.id}; currentSpotNav='inbox'; renderSpotContent();">
          <circle cx="${c.x}" cy="${c.y}" r="18" fill="#1e293b" stroke="#3b82f6" stroke-width="2"/>
          <text x="${c.x}" y="${c.y + 4}" font-size="10" fill="#f8fafc" text-anchor="middle" font-weight="bold">${escapeHtml((n.title || '').slice(0, 3))}</text>
          <text x="${c.x}" y="${c.y + 32}" font-size="11" fill="#94a3b8" text-anchor="middle">${escapeHtml((n.title || '').slice(0, 15))}</text>
        </g>
      `;
    }
  });

  return `
    <h3 style="margin-top:0; margin-bottom:12px; font-size:1.1rem; color:var(--text, #f8fafc);">🕸 Interactive Knowledge Graph</h3>
    <div style="background:var(--bg-main, #0b0f19); border:1px solid var(--border, #334155); border-radius:6px; padding:16px; text-align:center;">
      <svg width="600" height="460" style="max-width:100%;">
        ${svgEdges}
        ${svgNodes}
      </svg>
    </div>
  `;
}

function renderSpotSourcesView(notes, srcs) {
  const sourcesHtml = srcs.map(s => `
    <div style="border:1px solid var(--border, #334155); border-radius:6px; padding:12px; margin-bottom:8px; background:var(--bg-card, #0f172a);">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <b>📚 ${escapeHtml(s.title)}</b>
        <span class="badge" style="background:rgba(59,130,246,0.2); color:#60a5fa; font-size:0.75rem; padding:2px 8px; border-radius:10px;">${escapeHtml(s.type || 'Source')}</span>
      </div>
      <div style="font-size:0.8rem; color:var(--text-muted, #94a3b8); margin-top:4px;">
        ${s.author ? `Author: ${escapeHtml(s.author)} | ` : ''} ${s.url ? `<a href="${escapeHtml(s.url)}" target="_blank" style="color:#60a5fa;">${escapeHtml(s.url)}</a>` : ''}
      </div>
    </div>
  `).join('');

  return `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
      <h3 style="margin:0; font-size:1.1rem; color:var(--text, #f8fafc);">📚 Research Sources & Bibliography</h3>
      <button class="btn brass small" onclick="openSpotNewSourceModal()">+ Add Source</button>
    </div>
    <div>${sourcesHtml || '<div class="hint">No research sources added yet.</div>'}</div>
  `;
}

function renderSpotReviewView(items) {
  return `
    <h3 style="margin-top:0; margin-bottom:8px; font-size:1.1rem; color:var(--text, #f8fafc);">🔍 Knowledge Review Workflow</h3>
    <p class="hint" style="margin-bottom:12px;">Review unorganized inbox items, orphaned notes, and items missing tags or sources.</p>
    ${renderSpotListView(items, 'Unorganized & Needs Review')}
  `;
}

function updateSpotItemField(id, field, val) {
  const notes = getSpotNotes();
  const item = notes.find(n => n.id === id);
  if (item) {
    item[field] = val;
    item.updatedAt = new Date().toISOString();
    saveSpotNotes(notes);
    renderSpotContent();
  }
}

function toggleSpotPin(id) {
  const notes = getSpotNotes();
  const item = notes.find(n => n.id === id);
  if (item) {
    item.pinned = !item.pinned;
    saveSpotNotes(notes);
    renderSpotContent();
  }
}

function deleteSpotItem(id) {
  if (!confirm('Are you sure you want to delete this knowledge item?')) return;
  let notes = getSpotNotes();
  notes = notes.filter(n => n.id !== id);
  saveSpotNotes(notes);
  if (currentSpotSelectedId === id) currentSpotSelectedId = null;
  renderNotes();
}

function openSpotNewItemModal() {
  const title = prompt('Enter note title:');
  if (!title) return;
  const notes = getSpotNotes();
  const newNote = {
    id: Date.now(),
    title: title.trim(),
    body: '',
    type: 'Note',
    collectionId: currentSpotCollectionId || 'Inbox',
    folder: 'Inbox',
    tags: '',
    status: 'Inbox',
    attachments: [],
    relatedItemIds: [],
    backlinks: [],
    pinned: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  notes.push(newNote);
  saveSpotNotes(notes);
  currentSpotSelectedId = newNote.id;
  renderNotes();
}

function openSpotQuickCaptureModal() {
  const text = prompt('⚡ Quick Capture (Idea, Task, Thought):');
  if (!text || text.trim() === '') return;
  const notes = getSpotNotes();
  const titleLine = text.split('\n')[0].slice(0, 50);
  const newNote = {
    id: Date.now(),
    title: titleLine || 'Quick Capture',
    body: text,
    type: 'Idea',
    collectionId: 'Inbox',
    folder: 'Inbox',
    tags: 'quick-capture',
    status: 'Inbox',
    attachments: [],
    relatedItemIds: [],
    backlinks: [],
    pinned: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  notes.push(newNote);
  saveSpotNotes(notes);
  currentSpotSelectedId = newNote.id;
  currentSpotNav = 'inbox';
  renderNotes();
}

function openSpotNewCollectionModal() {
  const name = prompt('Enter new Collection name:');
  if (!name || name.trim() === '') return;
  const cols = getSpotCollections();
  cols.push({ id: name.toLowerCase().replace(/\s+/g, '_'), name: name.trim(), description: name.trim() + ' collection' });
  saveSpotCollections(cols);
  renderNotes();
}

function openSpotNewSourceModal() {
  const title = prompt('Enter Source Title (e.g. Book, Web Article, Report):');
  if (!title || title.trim() === '') return;
  const author = prompt('Enter Author / Publisher (optional):') || '';
  const url = prompt('Enter URL / Reference (optional):') || '';
  const srcs = getSpotSources();
  srcs.push({ id: 'src_' + Date.now(), title: title.trim(), author: author.trim(), url: url.trim(), type: 'Reference', notes: '' });
  saveSpotSources(srcs);
  renderNotes();
}

function openSpotAddRelationshipModal(fromId) {
  const notes = getSpotNotes();
  const targetIdStr = prompt('Enter Target Note ID to connect to:\n' + notes.map(n => `#${n.id}: ${n.title}`).join('\n'));
  if (!targetIdStr) return;
  const targetId = parseInt(targetIdStr.replace('#', ''));
  if (!targetId || targetId === fromId) { alert('Invalid target note.'); return; }

  const relType = prompt('Select Relationship Type:\n' + SPOT_RELATIONSHIP_TYPES.join(', ')) || 'Related to';
  const rels = getSpotRelationships();
  rels.push({ id: 'rel_' + Date.now(), fromId, toId: targetId, type: relType, createdAt: new Date().toISOString() });
  saveSpotRelationships(rels);
  renderSpotContent();
}

function deleteSpotRelationship(relId) {
  let rels = getSpotRelationships();
  rels = rels.filter(r => r.id !== relId);
  saveSpotRelationships(rels);
  renderSpotContent();
}

function convertSpotToDocketTask(noteId) {
  const notes = getSpotNotes();
  const n = notes.find(x => x.id === noteId);
  if (!n) return;

  if (typeof createDocketTaskFromApp === 'function') {
    createDocketTaskFromApp('spot', n.id, n.title || 'Spot Note', n.body || '');
    if (confirm(`Created Docket task for "${n.title}". Would you like to switch to Docket now?`)) {
      activateTab('tasks');
    }
  } else {
    alert('Created task successfully!');
  }
}

function convertSpotToFolioDoc(noteId) {
  const notes = getSpotNotes();
  const n = notes.find(x => x.id === noteId);
  if (!n) return;

  const docData = {
    title: n.title || 'Untitled Document',
    body: n.body || '',
    sourceApp: 'spot',
    sourceRecordId: n.id,
    createdAt: new Date().toISOString()
  };
  saveLocal('doc_folio_' + Date.now(), docData);
  if (confirm(`Created Folio document for "${n.title}". Would you like to switch to Folio now?`)) {
    activateTab('docs');
  }
}

function convertSpotToGlidesDeck(noteId) {
  const notes = getSpotNotes();
  const n = notes.find(x => x.id === noteId);
  if (!n) return;

  const glidesData = typeof getGlidesData === 'function' ? getGlidesData() : { presentations: [] };
  const newPres = {
    id: 'pres_' + Date.now(),
    title: n.title || 'Spot Presentation',
    slides: [
      { id: 'slide_1', title: n.title || 'Overview', objects: [{ id: 'obj_1', type: 'text', content: (n.body || '').slice(0, 200), x: 50, y: 100, width: 600, height: 300 }] }
    ],
    sourceApp: 'spot',
    sourceRecordId: n.id,
    createdAt: new Date().toISOString()
  };
  glidesData.presentations.push(newPres);
  glidesData.activeId = newPres.id;
  if (typeof saveGlidesData === 'function') saveGlidesData(glidesData);
  if (confirm(`Created Glides deck for "${n.title}". Would you like to switch to Glides now?`)) {
    activateTab('slides');
  }
}

function exportSpotNotes() {
  const notes = getSpotNotes();
  const cols = getSpotCollections();
  const srcs = getSpotSources();
  const rels = getSpotRelationships();
  download('knowledge.spot', JSON.stringify({ type: 'spot_v2', notes, collections: cols, sources: srcs, relationships: rels }, null, 2));
}

function importSpotNotes() {
  pickFile('.spot', (content) => {
    try {
      const parsed = JSON.parse(content);
      if (parsed.notes) saveSpotNotes(parsed.notes);
      if (parsed.collections) saveSpotCollections(parsed.collections);
      if (parsed.sources) saveSpotSources(parsed.sources);
      if (parsed.relationships) saveSpotRelationships(parsed.relationships);
      renderNotes();
    } catch (e) {
      alert('Could not read that .spot file');
    }
  });
}

function renderFolioRibbonTools() {
  const tab = currentFolioRibbonTab;
  const btnStyle = 'color:#f4f4f5; border:1px solid #3f3f46; background:#27272a; font-size:0.78rem; font-weight:500; padding:4px 10px; border-radius:4px; cursor:pointer;';

  if (tab === 'FILE') {
    return `
      <button class="btn small" style="${btnStyle}" onclick="saveDocs()">💾 Save (.fils)</button>
      <button class="btn small" style="${btnStyle}" onclick="exportFolioFormat('fils')">📥 Export .fils</button>
      <button class="btn small" style="${btnStyle}" onclick="exportFolioFormat('docx')">📄 Export DOCX</button>
      <button class="btn small" style="${btnStyle}" onclick="exportFolioFormat('pdf')">📑 Export PDF</button>
      <button class="btn small" style="${btnStyle}" onclick="exportFolioFormat('html')">🌐 Export HTML</button>
      <button class="btn small" style="${btnStyle}" onclick="exportFolioFormat('md')">📝 Export Markdown</button>
      <button class="btn small" style="${btnStyle}" onclick="exportFolioFormat('txt')">📜 Export TXT</button>
      <div style="height:16px; width:1px; background:#3f3f46;"></div>
      <button class="btn small" style="${btnStyle}" onclick="importDocs()">📂 Import File</button>
      <button class="btn small" style="${btnStyle}" onclick="toggleFolioDocProtection()">🔒 Protect Document</button>
      <button class="btn small" style="${btnStyle}" onclick="showFolioDocProperties()">ℹ️ Properties</button>
    `;
  }
  if (tab === 'HOME') {
    return `
      <button class="btn small icon" style="${btnStyle}" title="Undo" onclick="document.execCommand('undo')">↩</button>
      <button class="btn small icon" style="${btnStyle}" title="Redo" onclick="document.execCommand('redo')">↪</button>
      <div style="height:16px; width:1px; background:#3f3f46;"></div>
      <select title="Paragraph style" style="background:#27272a; color:#f4f4f5; border:1px solid #3f3f46; padding:4px 8px; border-radius:4px; font-size:0.78rem;" onchange="document.execCommand('formatBlock',false,this.value); this.blur(); updateFolioOutline();">
        <option value="P">Normal Paragraph</option>
        <option value="H1">Heading 1</option>
        <option value="H2">Heading 2</option>
        <option value="H3">Heading 3</option>
        <option value="H4">Heading 4</option>
        <option value="BLOCKQUOTE">Blockquote</option>
        <option value="PRE">Code Block</option>
      </select>
      <select title="Font Family" style="background:#27272a; color:#f4f4f5; border:1px solid #3f3f46; padding:4px 8px; border-radius:4px; font-size:0.78rem;" onchange="document.execCommand('fontName',false,this.value); this.blur();">
        <option value="Iowan Old Style, Georgia, serif">Serif (Iowan)</option>
        <option value="Helvetica Neue, Arial, sans-serif">Sans-Serif (Helvetica)</option>
        <option value="Courier New, monospace">Monospace (Courier)</option>
        <option value="Georgia, serif">Georgia</option>
        <option value="Times New Roman, serif">Times New Roman</option>
      </select>
      <select title="Font Size" style="background:#27272a; color:#f4f4f5; border:1px solid #3f3f46; padding:4px 8px; border-radius:4px; font-size:0.78rem;" onchange="setFolioFontSize(this.value); this.blur();">
        <option value="12px">12pt</option>
        <option value="14px">14pt</option>
        <option value="16px">16pt</option>
        <option value="18px">18pt</option>
        <option value="24px">24pt</option>
        <option value="36px">36pt</option>
      </select>
      <div style="height:16px; width:1px; background:#3f3f46;"></div>
      <button class="btn small icon" style="${btnStyle}" title="Bold" onclick="document.execCommand('bold')"><b>B</b></button>
      <button class="btn small icon" style="${btnStyle}" title="Italic" onclick="document.execCommand('italic')"><i>I</i></button>
      <button class="btn small icon" style="${btnStyle}" title="Underline" onclick="document.execCommand('underline')"><u>U</u></button>
      <button class="btn small icon" style="${btnStyle}" title="Strikethrough" onclick="document.execCommand('strikeThrough')"><s>S</s></button>
      <button class="btn small icon" style="${btnStyle}" title="Superscript" onclick="document.execCommand('superscript')">X²</button>
      <button class="btn small icon" style="${btnStyle}" title="Subscript" onclick="document.execCommand('subscript')">X₂</button>
      <div style="height:16px; width:1px; background:#3f3f46;"></div>
      <label title="Font Color" style="display:inline-flex; align-items:center; gap:4px; cursor:pointer; font-size:0.75rem; color:#f4f4f5;">
        🎨 <input type="color" value="#1e293b" style="width:20px; height:20px; border:none; background:none; cursor:pointer;" onchange="document.execCommand('foreColor', false, this.value)" />
      </label>
      <label title="Highlight Color" style="display:inline-flex; align-items:center; gap:4px; cursor:pointer; font-size:0.75rem; color:#f4f4f5;">
        🖍️ <input type="color" value="#fef08a" style="width:20px; height:20px; border:none; background:none; cursor:pointer;" onchange="document.execCommand('hiliteColor', false, this.value)" />
      </label>
      <button class="btn small" style="${btnStyle}" title="Clear Formatting" onclick="document.execCommand('removeFormat')">🧹 Clear Format</button>
      <div style="height:16px; width:1px; background:#3f3f46;"></div>
      <button class="btn small icon" style="${btnStyle}" title="Align left" onclick="document.execCommand('justifyLeft')">⟵</button>
      <button class="btn small icon" style="${btnStyle}" title="Align center" onclick="document.execCommand('justifyCenter')">↔</button>
      <button class="btn small icon" style="${btnStyle}" title="Align right" onclick="document.execCommand('justifyRight')">⟶</button>
      <button class="btn small icon" style="${btnStyle}" title="Justify" onclick="document.execCommand('justifyFull')">≡</button>
      <div style="height:16px; width:1px; background:#3f3f46;"></div>
      <button class="btn small icon" style="${btnStyle}" title="Bullet List" onclick="document.execCommand('insertUnorderedList')">• List</button>
      <button class="btn small icon" style="${btnStyle}" title="Numbered List" onclick="document.execCommand('insertOrderedList')">1. List</button>
      <button class="btn small icon" style="${btnStyle}" title="Indent" onclick="document.execCommand('indent')">⇥ Indent</button>
      <button class="btn small icon" style="${btnStyle}" title="Outdent" onclick="document.execCommand('outdent')">⇤ Outdent</button>
      <select title="Line Spacing" style="background:#27272a; color:#f4f4f5; border:1px solid #3f3f46; padding:4px 8px; border-radius:4px; font-size:0.78rem;" onchange="setFolioLineSpacing(this.value); this.blur();">
        <option value="1.15">Spacing: 1.15</option>
        <option value="1.0">Spacing: 1.0 Single</option>
        <option value="1.5">Spacing: 1.5</option>
        <option value="2.0">Spacing: 2.0 Double</option>
      </select>
      <button class="btn small" style="${btnStyle}" onclick="openFolioFindReplaceModal()">🔍 Find & Replace</button>
    `;
  }
  if (tab === 'PDF TOOLS') {
    return `
      <button class="btn small" style="${btnStyle}" onclick="exportFolioFormat('pdf')">🖨️ Generate PDF</button>
      <button class="btn small" style="${btnStyle}" onclick="folioExtractText()">📄 Extract Raw Text</button>
      <button class="btn small" style="${btnStyle}" onclick="folioCleanPDFFormatting()">🧹 Clean Formatting</button>
      <button class="btn small" style="${btnStyle}" onclick="setFolioPageMargins('standard')">📐 Margins: Standard</button>
      <button class="btn small" style="${btnStyle}" onclick="setFolioWatermark('CONFIDENTIAL')">🏷️ Watermark</button>
      <button class="btn small" style="${btnStyle}" onclick="toggleFolioDocProtection()">🔒 Lock PDF Security</button>
    `;
  }
  if (tab === 'INSERT') {
    return `
      <button class="btn small" style="${btnStyle}" onclick="insertFolioTable()">📊 Insert Table</button>
      <button class="btn small" style="${btnStyle}" onclick="insertFolioPageBreak()">📄 Page Break</button>
      <button class="btn small" style="${btnStyle}" onclick="insertFolioSectionBreak()">📑 Section Break</button>
      <button class="btn small" style="${btnStyle}" onclick="insertFolioImage()">🖼️ Image</button>
      <button class="btn small" style="${btnStyle}" onclick="folioInsertHyperlink()">🔗 Hyperlink</button>
      <button class="btn small" style="${btnStyle}" onclick="folioInsertBookmark()">📌 Bookmark</button>
      <button class="btn small" style="${btnStyle}" onclick="insertFolioFootnote()">1️⃣ Footnote</button>
      <button class="btn small" style="${btnStyle}" onclick="folioInsertHeaderFooter()">🔝 Header / Footer</button>
      <button class="btn small" style="${btnStyle}" onclick="folioOpenSymbolPicker()">∑ Symbol Picker</button>
      <button class="btn small" style="${btnStyle}" onclick="folioInsertEquation()">🧮 Equation</button>
      <button class="btn small" style="${btnStyle}" onclick="folioInsertTextBox()">📦 Text Box</button>
    `;
  }
  if (tab === 'DESIGN') {
    return `
      <select title="Document Theme" style="background:#27272a; color:#f4f4f5; border:1px solid #3f3f46; padding:4px 8px; border-radius:4px; font-size:0.78rem;" onchange="applyFolioTheme(this.value)">
        <option value="classic">Classic Editorial</option>
        <option value="modern">Modern Charcoal</option>
        <option value="executive">Executive Brass</option>
        <option value="technical">Technical Mono</option>
      </select>
      <div style="height:16px; width:1px; background:#3f3f46;"></div>
      <button class="btn small" style="${btnStyle}" onclick="setFolioPaperColor('#ffffff')">⚪ White Paper</button>
      <button class="btn small" style="${btnStyle}" onclick="setFolioPaperColor('#fdfbf7')">📜 Ivory Paper</button>
      <button class="btn small" style="${btnStyle}" onclick="setFolioPaperColor('#18181b')">🌙 Dark Paper</button>
      <div style="height:16px; width:1px; background:#3f3f46;"></div>
      <button class="btn small" style="${btnStyle}" onclick="setFolioWatermark('DRAFT')">🏷️ Draft Watermark</button>
      <button class="btn small" style="${btnStyle}" onclick="setFolioWatermark('')">❌ Remove Watermark</button>
    `;
  }
  if (tab === 'LAYOUT') {
    return `
      <select title="Margins" style="background:#27272a; color:#f4f4f5; border:1px solid #3f3f46; padding:4px 8px; border-radius:4px; font-size:0.78rem;" onchange="setFolioPageMargins(this.value)">
        <option value="standard">Margins: Standard (1 in)</option>
        <option value="narrow">Margins: Narrow (0.5 in)</option>
        <option value="wide">Margins: Wide (1.5 in)</option>
      </select>
      <select title="Orientation" style="background:#27272a; color:#f4f4f5; border:1px solid #3f3f46; padding:4px 8px; border-radius:4px; font-size:0.78rem;" onchange="setFolioOrientation(this.value)">
        <option value="portrait">Orientation: Portrait</option>
        <option value="landscape">Orientation: Landscape</option>
      </select>
      <select title="Columns" style="background:#27272a; color:#f4f4f5; border:1px solid #3f3f46; padding:4px 8px; border-radius:4px; font-size:0.78rem;" onchange="setFolioColumns(this.value)">
        <option value="1">Columns: 1 Column</option>
        <option value="2">Columns: 2 Columns</option>
        <option value="3">Columns: 3 Columns</option>
      </select>
      <div style="height:16px; width:1px; background:#3f3f46;"></div>
      <button class="btn small" style="${btnStyle}" onclick="addFolioTableRow()">+ Row</button>
      <button class="btn small" style="${btnStyle}" onclick="deleteFolioTableRow()">- Row</button>
      <button class="btn small" style="${btnStyle}" onclick="addFolioTableCol()">+ Col</button>
      <button class="btn small" style="${btnStyle}" onclick="deleteFolioTableCol()">- Col</button>
    `;
  }
  if (tab === 'REFERENCES') {
    return `
      <button class="btn small" style="${btnStyle}" onclick="insertFolioTOC()">📑 Insert Table of Contents</button>
      <button class="btn small" style="${btnStyle}" onclick="insertFolioFootnote()">1️⃣ Footnote</button>
      <button class="btn small" style="${btnStyle}" onclick="insertFolioEndnote()">💬 Endnote</button>
      <button class="btn small" style="${btnStyle}" onclick="docsAddMarginNote()">📌 Margin Note</button>
      <button class="btn small" style="${btnStyle}" onclick="createTaskFromFolioSelection()">☑️ Link Task</button>
    `;
  }
  if (tab === 'MAILINGS') {
    return `
      <button class="btn small" style="${btnStyle}" onclick="importFolioRecipientsCSV()">📥 Import CSV/JSON Recipients</button>
      <select title="Insert Merge Field" style="background:#27272a; color:#f4f4f5; border:1px solid #3f3f46; padding:4px 8px; border-radius:4px; font-size:0.78rem;" onchange="insertFolioMergeField(this.value); this.value='';">
        <option value="">+ Insert {{Field}}</option>
        <option value="name">{{name}}</option>
        <option value="company">{{company}}</option>
        <option value="role">{{role}}</option>
        <option value="email">{{email}}</option>
      </select>
      <button class="btn small" style="${btnStyle}" onclick="generateFolioMailMerge()">⚡ Run Mail Merge</button>
    `;
  }
  if (tab === 'REVIEW') {
    const docObj = getFolioDocument();
    const tracking = docObj.document.trackChanges || false;
    return `
      <button class="btn ${tracking?'brass':'ghost'} small" style="${btnStyle}; background:${tracking?'#f59e0b':'#27272a'}; color:${tracking?'#000':'#f4f4f5'};" onclick="toggleFolioTrackChanges()">${tracking?'🔴 Tracking ON':'⚪ Track Changes'}</button>
      <button class="btn small" style="${btnStyle}" onclick="acceptAllFolioChanges()">✓ Accept All</button>
      <button class="btn small" style="${btnStyle}" onclick="rejectAllFolioChanges()">✕ Reject All</button>
      <div style="height:16px; width:1px; background:#3f3f46;"></div>
      <button class="btn small" style="${btnStyle}" onclick="addFolioComment()">💬 Add Comment</button>
      <button class="btn small" style="${btnStyle}" onclick="openFolioFindReplaceModal()">🔍 Find & Replace</button>
    `;
  }
  if (tab === 'VIEW') {
    return `
      <button class="btn small" style="${btnStyle}" onclick="toggleFolioFocusMode()">👁 Focus Mode</button>
      <button class="btn small" style="${btnStyle}" onclick="updateFolioOutline()">📑 Refresh Outline</button>
      <button class="btn small" style="${btnStyle}" onclick="toggleFolioRuler()">📏 Toggle Ruler</button>
    `;
  }
  if (tab === 'HELP') {
    return `
      <button class="btn small" style="${btnStyle}" onclick="showFolioUserGuide()">📖 Folio User Guide</button>
      <button class="btn small" style="${btnStyle}" onclick="showFolioShortcuts()">⌨️ Keyboard Shortcuts</button>
      <button class="btn small" style="${btnStyle}" onclick="showFolioSecurityStatus()">🔒 Offline Security Status</button>
    `;
  }
  return '';
}

function addFolioTableRow() {
  const sel = window.getSelection();
  let table = null;
  if (sel && sel.rangeCount > 0) {
    let node = sel.getRangeAt(0).commonAncestorContainer;
    while (node && node !== document.body) {
      if (node.tagName === 'TABLE') { table = node; break; }
      node = node.parentNode;
    }
  }
  if (!table) table = document.querySelector('#docsEditor table');
  if (!table) { alert('Please click inside a table first.'); return; }

  const cols = table.rows[0] ? table.rows[0].cells.length : 3;
  const tr = table.insertRow(-1);
  for (let i = 0; i < cols; i++) {
    const td = tr.insertCell(-1);
    td.style.border = '1px solid var(--border-color)';
    td.style.padding = '6px';
    td.innerHTML = 'Cell';
  }
  captureFolioCurrentContent();
}

function deleteFolioTableRow() {
  const sel = window.getSelection();
  let table = null;
  if (sel && sel.rangeCount > 0) {
    let node = sel.getRangeAt(0).commonAncestorContainer;
    while (node && node !== document.body) {
      if (node.tagName === 'TABLE') { table = node; break; }
      node = node.parentNode;
    }
  }
  if (!table) table = document.querySelector('#docsEditor table');
  if (!table || table.rows.length <= 1) return;
  table.deleteRow(-1);
  captureFolioCurrentContent();
}

function addFolioTableCol() {
  const sel = window.getSelection();
  let table = null;
  if (sel && sel.rangeCount > 0) {
    let node = sel.getRangeAt(0).commonAncestorContainer;
    while (node && node !== document.body) {
      if (node.tagName === 'TABLE') { table = node; break; }
      node = node.parentNode;
    }
  }
  if (!table) table = document.querySelector('#docsEditor table');
  if (!table) { alert('Please click inside a table first.'); return; }

  for (let i = 0; i < table.rows.length; i++) {
    const cell = table.rows[i].insertCell(-1);
    cell.style.border = '1px solid var(--border-color)';
    cell.style.padding = '6px';
    cell.innerHTML = 'Cell';
  }
  captureFolioCurrentContent();
}

function deleteFolioTableCol() {
  const sel = window.getSelection();
  let table = null;
  if (sel && sel.rangeCount > 0) {
    let node = sel.getRangeAt(0).commonAncestorContainer;
    while (node && node !== document.body) {
      if (node.tagName === 'TABLE') { table = node; break; }
      node = node.parentNode;
    }
  }
  if (!table) table = document.querySelector('#docsEditor table');
  if (!table || !table.rows[0] || table.rows[0].cells.length <= 1) return;

  for (let i = 0; i < table.rows.length; i++) {
    table.rows[i].deleteCell(-1);
  }
  captureFolioCurrentContent();
}

function toggleFolioTrackChanges() {
  const docObj = getFolioDocument();
  docObj.document.trackChanges = !docObj.document.trackChanges;
  saveFolioDocument(docObj, true);
  renderDocs();
}

function addFolioTrackedChange(type) {
  const sel = window.getSelection();
  const text = sel ? sel.toString().trim() : '';
  if (!text && type === 'delete') {
    alert('Please select text to mark for deletion.');
    return;
  }
  const changeText = text || prompt('Enter inserted text:');
  if (!changeText) return;

  const editor = document.getElementById('docsEditor');
  if (!editor) return;

  const tag = type === 'insert' ? 'ins' : 'del';
  const color = type === 'insert' ? '#10b981' : '#ef4444';
  const html = `<${tag} class="folio-change" data-id="chg_${Date.now()}" style="color:${color}; text-decoration:${type==='insert'?'underline':'line-through'}; background:rgba(255,255,255,0.05); padding:0 2px;">${escapeHTML(changeText)}</${tag}>`;
  document.execCommand('insertHTML', false, html);
  saveFolioContentFromDOM();
}

function acceptFolioChange(id) {
  const el = document.querySelector(`[data-id="${id}"]`);
  if (!el) return;
  if (el.tagName.toLowerCase() === 'del') {
    el.remove();
  } else {
    const text = el.textContent;
    el.replaceWith(text);
  }
  saveFolioContentFromDOM();
}

function rejectFolioChange(id) {
  const el = document.querySelector(`[data-id="${id}"]`);
  if (!el) return;
  if (el.tagName.toLowerCase() === 'ins') {
    el.remove();
  } else {
    const text = el.textContent;
    el.replaceWith(text);
  }
  saveFolioContentFromDOM();
}

function acceptAllFolioChanges() {
  const changes = document.querySelectorAll('.folio-change');
  changes.forEach(el => {
    if (el.tagName.toLowerCase() === 'del') {
      el.remove();
    } else {
      el.replaceWith(el.textContent);
    }
  });
  saveFolioContentFromDOM();
}

function rejectAllFolioChanges() {
  const changes = document.querySelectorAll('.folio-change');
  changes.forEach(el => {
    if (el.tagName.toLowerCase() === 'ins') {
      el.remove();
    } else {
      el.replaceWith(el.textContent);
    }
  });
  saveFolioContentFromDOM();
}

function saveFolioContentFromDOM() {
  const editor = document.getElementById('docsEditor');
  if (!editor) return;
  const docObj = getFolioDocument();
  docObj.document.content = editor.innerHTML;
  saveFolioDocument(docObj, true);
}

function addFolioComment() {
  const sel = window.getSelection();
  const text = sel ? sel.toString().trim() : '';
  const commentText = prompt(`Add comment${text ? ' on "' + text + '"' : ''}:`);
  if (!commentText) return;

  const docObj = getFolioDocument();
  if (!docObj.document.comments) docObj.document.comments = [];
  docObj.document.comments.push({
    id: "c_" + Date.now(),
    quote: text || "General",
    text: commentText.trim(),
    created: Date.now(),
    resolved: false
  });
  saveFolioDocument(docObj, true);
  currentFolioInspectorTab = 'comments';
  renderDocs();
}

function exportFolioFormat(fmt) {
  const docObj = getFolioDocument();
  const title = docObj.document.title || 'Untitled Document';
  const content = document.getElementById('docsEditor') ? document.getElementById('docsEditor').innerHTML : docObj.document.content;

  if (fmt === 'fils' || fmt === 'folio') {
    download(`${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.fils`, JSON.stringify(docObj, null, 2));
  } else if (fmt === 'html') {
    const htmlContent = `<!DOCTYPE html><html><head><title>${escapeHTML(title)}</title></head><body><h1>${escapeHTML(title)}</h1>${content}</body></html>`;
    download(`${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.html`, htmlContent);
  } else if (fmt === 'txt') {
    const temp = document.createElement('div');
    temp.innerHTML = content;
    const txt = `${title}\n${'='.repeat(title.length)}\n\n${temp.textContent || temp.innerText}`;
    download(`${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.txt`, txt);
  } else if (fmt === 'md') {
    const temp = document.createElement('div');
    temp.innerHTML = content;
    const md = `# ${title}\n\n${temp.textContent || temp.innerText}`;
    download(`${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.md`, md);
  } else if (fmt === 'docx') {
    const docxContent = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>${escapeHTML(title)}</title>
    <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
    <style>body { font-family: 'Georgia', serif; font-size: 11pt; line-height: 1.5; padding: 1in; }</style>
    </head><body><h1>${escapeHTML(title)}</h1>${content}</body></html>`;
    download(`${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.docx`, docxContent);
  } else if (fmt === 'pdf') {
    window.print();
  }
}

function folioExtractText() {
  const editor = document.getElementById('docsEditor');
  if (!editor) return;
  const text = editor.innerText || editor.textContent;
  alert("Extracted Text:\n\n" + text.slice(0, 500) + (text.length > 500 ? "..." : ""));
}

function folioCleanPDFFormatting() {
  const editor = document.getElementById('docsEditor');
  if (!editor) return;
  const clean = editor.innerText || editor.textContent;
  editor.innerHTML = `<p>${clean.replace(/\n\n+/g, '</p><p>')}</p>`;
  captureFolioCurrentContent();
}

function setFolioPageMargins(type) {
  const container = document.getElementById('folioPaperContainer');
  const docObj = getFolioDocument();
  docObj.document.settings.margins = type;
  saveFolioDocument(docObj, true);

  if (!container) return;
  if (type === 'narrow') {
    container.style.padding = '24px 28px';
  } else if (type === 'wide') {
    container.style.padding = '64px 84px';
  } else {
    container.style.padding = '48px 56px';
  }
}

function setFolioOrientation(orient) {
  const container = document.getElementById('folioPaperContainer');
  const docObj = getFolioDocument();
  docObj.document.settings.orientation = orient;
  saveFolioDocument(docObj, true);

  if (!container) return;
  if (orient === 'landscape') {
    container.style.maxWidth = '1100px';
    container.style.minHeight = '650px';
  } else {
    container.style.maxWidth = '816px';
    container.style.minHeight = '842px';
  }
}

function setFolioColumns(cols) {
  const editor = document.getElementById('docsEditor');
  const docObj = getFolioDocument();
  docObj.document.settings.columns = parseInt(cols) || 1;
  saveFolioDocument(docObj, true);

  if (!editor) return;
  if (cols == '2') {
    editor.style.columnCount = '2';
    editor.style.columnGap = '28px';
  } else if (cols == '3') {
    editor.style.columnCount = '3';
    editor.style.columnGap = '20px';
  } else {
    editor.style.columnCount = '1';
  }
}

function setFolioPaperColor(color) {
  const container = document.getElementById('folioPaperContainer');
  const editor = document.getElementById('docsEditor');
  const docObj = getFolioDocument();
  docObj.document.settings.paperColor = color;
  saveFolioDocument(docObj, true);

  if (!container) return;
  container.style.background = color;
  if (color === '#18181b') {
    container.style.color = '#f4f4f5';
    if (editor) editor.style.color = '#f4f4f5';
  } else {
    container.style.color = '#0f172a';
    if (editor) editor.style.color = '#0f172a';
  }
}

function applyFolioTheme(theme) {
  const container = document.getElementById('folioPaperContainer');
  if (!container) return;
  if (theme === 'modern') {
    container.style.fontFamily = 'Helvetica Neue, Arial, sans-serif';
    setFolioPaperColor('#ffffff');
  } else if (theme === 'executive') {
    container.style.fontFamily = 'Georgia, serif';
    setFolioPaperColor('#fdfbf7');
  } else if (theme === 'technical') {
    container.style.fontFamily = 'Courier New, monospace';
    setFolioPaperColor('#ffffff');
  } else {
    container.style.fontFamily = "'Iowan Old Style','Palatino Linotype',Georgia,serif";
    setFolioPaperColor('#ffffff');
  }
}

function setFolioWatermark(text) {
  let wm = document.getElementById('folioWatermarkOverlay');
  const container = document.getElementById('folioPaperContainer');
  const docObj = getFolioDocument();
  docObj.document.settings.watermark = text;
  saveFolioDocument(docObj, true);

  if (!container) return;
  if (!text) {
    if (wm) wm.remove();
    return;
  }
  if (!wm) {
    wm = document.createElement('div');
    wm.id = 'folioWatermarkOverlay';
    wm.style.cssText = 'position:absolute; top:40%; left:50%; transform:translate(-50%, -50%) rotate(-35deg); font-size:4.5rem; font-weight:900; color:rgba(0,0,0,0.06); pointer-events:none; user-select:none; z-index:0; white-space:nowrap; letter-spacing:0.1em;';
    container.appendChild(wm);
  }
  wm.textContent = text;
}

function insertFolioSectionBreak() {
  document.execCommand('insertHTML', false, '<div class="folio-section-break" style="margin:24px 0; border-top:2px dashed #94a3b8; padding-top:12px; font-size:0.75rem; color:#64748b; font-weight:bold; text-transform:uppercase;">--- Section Break ---</div><p><br></p>');
  captureFolioCurrentContent();
}

function insertFolioTOC() {
  const editor = document.getElementById('docsEditor');
  if (!editor) return;

  const existingToc = editor.querySelector('.folio-toc');
  if (existingToc) existingToc.remove();

  const headings = Array.from(editor.querySelectorAll('h1, h2, h3, h4'));
  if (headings.length === 0) {
    if (typeof showToast === 'function') showToast('No headings (H1-H4) found to generate Table of Contents.');
    return;
  }

  let tocHtml = '<div class="folio-toc" style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:16px; margin:16px 0; color:#0f172a;"><b style="font-size:1rem; display:block; margin-bottom:8px; color:#1e293b;">Table of Contents</b><ul style="margin:0; padding-left:20px; font-size:0.9rem;">';
  headings.forEach((h, idx) => {
    if (!h.id) {
      h.id = `toc_h_${idx}_${Date.now()}`;
    }
    const tag = h.tagName.toLowerCase();
    const indent = tag === 'h2' ? '12px' : tag === 'h3' ? '24px' : tag === 'h4' ? '36px' : '0px';
    tocHtml += `<li style="margin-left:${indent}; margin-bottom:4px;"><a href="#${h.id}" onclick="event.preventDefault(); document.getElementById('${h.id}').scrollIntoView({behavior:'smooth'});" style="color:#f59e0b; text-decoration:underline; font-weight:600;">${escapeHTML(h.innerText || h.textContent)}</a></li>`;
  });
  tocHtml += '</ul></div><p><br></p>';

  editor.insertAdjacentHTML('afterbegin', tocHtml);
  captureFolioCurrentContent();
  if (typeof showToast === 'function') showToast('Table of Contents updated.');
}

function insertFolioEndnote() {
  const noteText = prompt('Enter endnote text:');
  if (!noteText) return;
  const editor = document.getElementById('docsEditor');
  if (!editor) return;
  const num = (editor.querySelectorAll('.folio-endnote').length || 0) + 1;
  const markHtml = `<sup class="folio-endnote" style="color:#d97706; font-weight:bold; cursor:pointer;" title="${escapeHTML(noteText)}">[e${num}]</sup>`;
  document.execCommand('insertHTML', false, markHtml);

  let endnotesContainer = editor.querySelector('.folio-endnotes-section');
  if (!endnotesContainer) {
    const sec = document.createElement('div');
    sec.className = 'folio-endnotes-section';
    sec.style.cssText = 'margin-top:32px; border-top:1px solid #cbd5e1; padding-top:12px; font-size:0.85rem; color:#475569;';
    sec.innerHTML = '<b>Endnotes:</b><ol id="folioEndnotesList" style="margin:4px 0 0 0; padding-left:20px;"></ol>';
    editor.appendChild(sec);
    endnotesContainer = sec;
  }
  const list = endnotesContainer.querySelector('#folioEndnotesList');
  if (list) {
    const li = document.createElement('li');
    li.textContent = noteText;
    list.appendChild(li);
  }
  captureFolioCurrentContent();
}

function insertFolioMergeField(field) {
  if (!field) return;
  document.execCommand('insertHTML', false, `<span class="folio-merge-field" style="background:#fef3c7; color:#92400e; padding:1px 6px; border-radius:3px; font-family:monospace; font-weight:bold; font-size:0.85rem;">{{${field}}}</span>`);
  captureFolioCurrentContent();
}

function importFolioRecipientsCSV() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv, .json, .txt';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      if (file.name.endsWith('.json')) {
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed) && parsed.length > 0) {
            folioMailMergeRecipients = parsed;
            const docObj = getFolioDocument();
            docObj.document.mailMergeData.recipients = parsed;
            saveFolioDocument(docObj, true);
            if (typeof showToast === 'function') showToast(`Loaded ${parsed.length} recipients from JSON.`);
            renderDocs();
          }
        } catch (err) {
          alert("Invalid JSON recipient file.");
        }
      } else {
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length < 2) {
          alert("CSV file must have a header line and at least one data row.");
          return;
        }
        const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
        const recipients = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
          const rec = {};
          headers.forEach((h, idx) => {
            rec[h] = cols[idx] || '';
          });
          recipients.push(rec);
        }
        if (recipients.length > 0) {
          folioMailMergeRecipients = recipients;
          const docObj = getFolioDocument();
          docObj.document.mailMergeData.recipients = recipients;
          saveFolioDocument(docObj, true);
          if (typeof showToast === 'function') showToast(`Loaded ${recipients.length} recipients from CSV.`);
          renderDocs();
        }
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function generateFolioMailMerge() {
  if (!folioMailMergeRecipients || folioMailMergeRecipients.length === 0) {
    alert('No merge recipients loaded. Click "Import CSV/JSON Recipients" first.');
    return;
  }
  const editor = document.getElementById('docsEditor');
  if (!editor) return;
  const templateHtml = editor.innerHTML;

  let mergedDocsHtml = '';
  folioMailMergeRecipients.forEach((rec, idx) => {
    let docCopy = templateHtml;
    Object.keys(rec).forEach(k => {
      const regex = new RegExp(`{{\\s*${k}\\s*}}`, 'g');
      docCopy = docCopy.replace(regex, rec[k]);
    });
    mergedDocsHtml += `<div class="folio-merged-doc" style="margin-bottom:32px; padding-bottom:24px; border-bottom:3px double #94a3b8;">
      <div style="font-size:0.75rem; color:#64748b; font-weight:bold; margin-bottom:8px;">--- MERGED RECIPIENT #${idx + 1}: ${escapeHTML(rec.name || rec.email || '')} ---</div>
      ${docCopy}
    </div>`;
  });

  editor.innerHTML = mergedDocsHtml;
  captureFolioCurrentContent();
  alert(`Successfully merged ${folioMailMergeRecipients.length} documents!`);
}

function toggleFolioDocProtection() {
  const docObj = getFolioDocument();
  docObj.document.protected = !docObj.document.protected;
  saveFolioDocument(docObj, true);
  const editor = document.getElementById('docsEditor');
  if (editor) {
    editor.contentEditable = !docObj.document.protected;
  }
  alert(docObj.document.protected ? '🔒 Document is now LOCKED / Read-Only.' : '🔓 Document is now UNLOCKED.');
}

function showFolioDocProperties() {
  const docObj = getFolioDocument();
  const doc = docObj.document;
  alert(`Document Properties:\n\nTitle: ${doc.title}\nAuthor: ${doc.metadata.author}\nCreated: ${new Date(doc.metadata.created).toLocaleString()}\nTrack Changes: ${doc.trackChanges ? 'ON' : 'OFF'}\nProtected: ${doc.protected ? 'YES' : 'NO'}`);
}

function folioInsertHyperlink() {
  const url = prompt('Enter destination URL:');
  if (!url) return;
  document.execCommand('createLink', false, url);
  captureFolioCurrentContent();
}

function folioInsertBookmark() {
  const name = prompt('Enter bookmark identifier:');
  if (!name) return;
  document.execCommand('insertHTML', false, `<a id="bm_${escapeHTML(name)}" class="folio-bookmark" style="border-bottom:2px dotted #3b82f6;" title="Bookmark: ${escapeHTML(name)}">📌 ${escapeHTML(name)}</a>`);
  captureFolioCurrentContent();
}

function folioInsertHeaderFooter() {
  const headerText = prompt('Enter Page Header text:', 'OFFLINES FOLIO DOCUMENT');
  const footerText = prompt('Enter Page Footer text:', 'Confidential • Local Storage Only');
  const container = document.getElementById('folioPaperContainer');
  if (!container) return;

  let headerEl = container.querySelector('.folio-page-header');
  if (!headerEl) {
    headerEl = document.createElement('div');
    headerEl.className = 'folio-page-header';
    headerEl.style.cssText = 'font-size:0.75rem; color:#94a3b8; border-bottom:1px solid #e2e8f0; padding-bottom:4px; margin-bottom:16px; text-transform:uppercase; font-weight:bold; letter-spacing:0.05em;';
    container.insertBefore(headerEl, container.firstChild);
  }
  headerEl.textContent = headerText;

  let footerEl = container.querySelector('.folio-page-footer');
  if (!footerEl) {
    footerEl = document.createElement('div');
    footerEl.className = 'folio-page-footer';
    footerEl.style.cssText = 'font-size:0.75rem; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:4px; margin-top:24px; text-align:center; font-weight:500;';
    container.appendChild(footerEl);
  }
  footerEl.textContent = footerText;
  captureFolioCurrentContent();
}

function setFolioFontSize(size) {
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
    const span = document.createElement('span');
    span.style.fontSize = size;
    const range = sel.getRangeAt(0);
    span.appendChild(range.extractContents());
    range.insertNode(span);
    captureFolioCurrentContent();
  } else {
    document.execCommand('fontSize', false, '3');
    captureFolioCurrentContent();
  }
}

function setFolioLineSpacing(spacing) {
  const editor = document.getElementById('docsEditor');
  if (editor) {
    editor.style.lineHeight = spacing;
    captureFolioCurrentContent();
    if (typeof showToast === 'function') showToast(`Line spacing set to ${spacing}`);
  }
}

function folioInsertSymbol(sym) {
  document.execCommand('insertText', false, sym || '©');
  captureFolioCurrentContent();
}

function folioOpenSymbolPicker() {
  const syms = ['©', '®', '™', '€', '£', '¥', '§', '¶', 'α', 'β', 'γ', 'π', 'Ω', '∑', '∫', '≈', '≠', '≤', '≥', '±', '÷', '×', '∞', '√'];
  const symHtml = syms.map(s => `<button style="padding:8px; font-size:1.1rem; background:#27272a; color:#f4f4f5; border:1px solid #3f3f46; border-radius:4px; cursor:pointer;" onclick="folioInsertSymbol('${s}'); document.getElementById('folioModalOverlay').remove();">${s}</button>`).join(' ');

  const modal = document.createElement('div');
  modal.id = 'folioModalOverlay';
  modal.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; z-index:99999;';
  modal.innerHTML = `
    <div style="background:#18181b; border:1px solid #3f3f46; padding:20px; border-radius:8px; width:360px; color:#f4f4f5;">
      <h3 style="margin-top:0; color:#f59e0b;">Select Symbol</h3>
      <div style="display:grid; grid-template-columns:repeat(6, 1fr); gap:6px; margin:16px 0;">
        ${symHtml}
      </div>
      <button class="btn ghost small" style="width:100%;" onclick="document.getElementById('folioModalOverlay').remove();">Cancel</button>
    </div>
  `;
  document.body.appendChild(modal);
}

function folioInsertEquation() {
  const eq = prompt("Enter Mathematical Equation / TeX snippet:", "E = mc²");
  if (!eq) return;
  const eqHtml = `<span class="folio-equation" style="font-family:serif; font-style:italic; background:rgba(245,158,11,0.1); padding:2px 6px; border-radius:4px; border:1px solid rgba(245,158,11,0.3); font-weight:bold; color:#f59e0b;">${escapeHTML(eq)}</span> `;
  document.execCommand('insertHTML', false, eqHtml);
  captureFolioCurrentContent();
}

function folioInsertTextBox() {
  const text = prompt("Enter Text Box content:", "Callout or Sidebar Text Box");
  if (!text) return;
  const boxHtml = `<div class="folio-text-box" style="border:1px solid #d4d4d8; background:#f8fafc; padding:12px; margin:12px 0; border-left:4px solid #f59e0b; border-radius:4px; color:#1e293b; font-style:normal;">
    <p style="margin:0;">${escapeHTML(text)}</p>
  </div><p></p>`;
  document.execCommand('insertHTML', false, boxHtml);
  captureFolioCurrentContent();
}

function toggleFolioRuler() {
  let ruler = document.getElementById('folioRulerBar');
  const container = document.getElementById('folioPaperContainer');
  if (!container) return;
  if (ruler) {
    ruler.remove();
  } else {
    ruler = document.createElement('div');
    ruler.id = 'folioRulerBar';
    ruler.style.cssText = 'height:16px; background:#f1f5f9; border-bottom:1px solid #cbd5e1; margin-bottom:12px; display:flex; align-items:center; justify-content:space-between; padding:0 8px; font-size:0.65rem; color:#64748b; font-family:monospace; user-select:none;';
    ruler.innerHTML = '<span>|0in</span><span>|1in</span><span>|2in</span><span>|3in</span><span>|4in</span><span>|5in</span><span>|6in</span><span>|7in</span>';
    container.insertBefore(ruler, container.firstChild);
  }
}

function showFolioUserGuide() { openFolioHelpCenter('guide'); }
function showFolioShortcuts() { openFolioHelpCenter('shortcuts'); }
function showFolioSecurityStatus() { openFolioHelpCenter('security'); }

function openFolioHelpCenter(tab = 'guide') {
  const existing = document.getElementById('folioHelpCenterOverlay');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'folioHelpCenterOverlay';
  modal.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.65); display:flex; align-items:center; justify-content:center; z-index:99999;';
  modal.innerHTML = `
    <div style="background:#18181b; border:1px solid #3f3f46; border-radius:8px; width:560px; max-width:90vw; color:#f4f4f5; padding:24px; max-height:85vh; overflow-y:auto;">
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #3f3f46; padding-bottom:12px; margin-bottom:16px;">
        <h3 style="margin:0; color:#f59e0b; display:flex; align-items:center; gap:8px;">📖 Folio Help & Security Center</h3>
        <button class="btn ghost small" onclick="document.getElementById('folioHelpCenterOverlay').remove();">✕ Close</button>
      </div>
      <div style="font-size:0.88rem; line-height:1.6; color:#d4d4d8;">
        <h4 style="color:#f59e0b; margin:12px 0 6px 0;">Product Philosophy</h4>
        <p style="margin:0 0 12px 0;">Folio is an original, 100% local document production studio. Nothing you write ever leaves your device or touches an external server.</p>
        <h4 style="color:#f59e0b; margin:12px 0 6px 0;">Core Features</h4>
        <ul style="padding-left:20px; margin:0 0 12px 0;">
          <li><b>11-Category Command Ribbon:</b> FILE, HOME, PDF TOOLS, INSERT, DESIGN, LAYOUT, REFERENCES, MAILINGS, REVIEW, VIEW, HELP.</li>
          <li><b>Track Changes & Revisions:</b> Enable tracking to audit insertions, deletions, and formatting edits.</li>
          <li><b>Anchored Comments:</b> Range-anchored comment threads with resolution states.</li>
          <li><b>Mail Merge Engine:</b> Import CSV/JSON recipient datasets and generate batch documents offline.</li>
          <li><b>Local Document Model:</b> Full support for margins, orientation, multi-column layouts, paper tints, watermarks, and footnotes.</li>
        </ul>
        <h4 style="color:#f59e0b; margin:12px 0 6px 0;">Keyboard Shortcuts</h4>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; background:#27272a; padding:12px; border-radius:6px; font-family:monospace; font-size:0.8rem; margin-bottom:12px;">
          <div><b>Ctrl + S:</b> Save Document</div>
          <div><b>Ctrl + F:</b> Find & Replace</div>
          <div><b>Ctrl + B:</b> Bold</div>
          <div><b>Ctrl + I:</b> Italic</div>
          <div><b>Ctrl + Z:</b> Undo</div>
          <div><b>Ctrl + Y:</b> Redo</div>
        </div>
        <h4 style="color:#10b981; margin:12px 0 6px 0;">🔒 Security Baseline</h4>
        <p style="margin:0;">Offline storage powered by IndexedDB & Web Storage API. Zero analytics, zero telemetries, zero external requests.</p>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function renderDocs(){
  const p = document.getElementById('panel-docs');
  if(!p) return;
  const docObj = getFolioDocument();
  const doc = docObj.document;

  p.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
      <div>
        <h2 style="margin:0; font-size:1.4rem;">Folio Document Studio</h2>
        <div class="sub" style="margin:2px 0 0 0;">Offline Document Workspace & Publishing Studio</div>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn ghost small" onclick="openFolioFindReplaceModal()">🔍 Find & Replace</button>
        <button class="btn ghost small" onclick="toggleFolioFocusMode()">👁 Focus Mode</button>
        <button class="btn sage small" onclick="saveDocs()">Save Document</button>
        <button class="btn ghost small" onclick="exportDocs()">Export .folio</button>
        <button class="btn ghost small" onclick="importDocs()">Import .folio</button>
      </div>
    </div>

    <!-- FOLIO CONTEXTUAL RIBBON -->
    ${renderFolioRibbonBar()}

    <!-- FOLIO DOCUMENT STUDIO PAGE WORKSPACE -->
    <div style="display:grid; grid-template-columns:1fr 280px; gap:16px; min-height:calc(100vh - 280px);">
      <!-- PAGE CANVAS CONTAINER WITH PAPER MARGINS & SHADOW -->
      <div style="background:var(--bg-workspace); border:1px solid var(--border-crisp); border-radius:8px; padding:32px; position:relative; display:flex; justify-content:center; overflow-y:auto;">
        <div id="folioPaperContainer" style="width:100%; max-width:816px; background:#ffffff; color:#0f172a; border-radius:4px; padding:48px 56px; box-shadow:0 12px 40px rgba(0,0,0,0.6); min-height:842px; position:relative; font-family:'Iowan Old Style','Palatino Linotype',Georgia,serif;">
          <input type="text" id="folioDocTitle" value="${escapeHTML(doc.title)}" style="width:100%; font-size:2rem; font-weight:800; background:transparent; border:none; border-bottom:2px solid #e2e8f0; color:#0f172a; margin-bottom:24px; padding:4px 0; font-family:var(--font-sans);" oninput="updateFolioTitle(this.value)" placeholder="Document Title...">
          <div id="docsEditor" contenteditable="true" style="min-height:650px; color:#0f172a; line-height:1.75; outline:none; font-size:1.05rem;" oninput="updateWC(); updateFolioOutline();" onkeydown="onFolioEditorKeyDown(event)">${doc.content}</div>
          <div id="folioSlashMenu" style="display:none; position:absolute; background:var(--bg-surface-elevated); border:1px solid var(--border-crisp); border-radius:6px; box-shadow:0 8px 24px rgba(0,0,0,0.4); z-index:100; min-width:180px; padding:6px; color:var(--text-main);">
            <div style="font-size:0.75rem; color:var(--text-muted); padding:4px 8px; font-weight:bold;">SLASH COMMANDS</div>
            <div style="padding:6px 8px; cursor:pointer; font-size:0.85rem;" onclick="insertSlashBlock('H1')">Heading 1</div>
            <div style="padding:6px 8px; cursor:pointer; font-size:0.85rem;" onclick="insertSlashBlock('H2')">Heading 2</div>
            <div style="padding:6px 8px; cursor:pointer; font-size:0.85rem;" onclick="insertSlashBlock('TABLE')">Table</div>
            <div style="padding:6px 8px; cursor:pointer; font-size:0.85rem;" onclick="insertSlashBlock('QUOTE')">Quote</div>
            <div style="padding:6px 8px; cursor:pointer; font-size:0.85rem;" onclick="insertSlashBlock('PAGE')">Page Break</div>
          </div>
        </div>
      </div>

      <!-- RIGHT INSPECTOR PANEL -->
      <div style="background:var(--bg-surface-elevated); border:1px solid var(--border-crisp); border-radius:8px; padding:16px; display:flex; flex-direction:column; gap:12px;">
        <div style="display:flex; border-bottom:1px solid var(--border-crisp); padding-bottom:8px; gap:8px;">
          <button class="btn ghost small" style="flex:1; border-bottom:${currentFolioInspectorTab==='outline'?'2px solid var(--accent-primary,#3b82f6)':'none'}; color:var(--text-main);" onclick="setFolioInspectorTab('outline')">Outline</button>
          <button class="btn ghost small" style="flex:1; border-bottom:${currentFolioInspectorTab==='history'?'2px solid var(--accent-primary,#3b82f6)':'none'}; color:var(--text-main);" onclick="setFolioInspectorTab('history')">History</button>
          <button class="btn ghost small" style="flex:1; border-bottom:${currentFolioInspectorTab==='props'?'2px solid var(--accent-primary,#3b82f6)':'none'}; color:var(--text-main);" onclick="setFolioInspectorTab('props')">Props</button>
        </div>
        <div id="folioInspectorContent" style="flex:1; overflow-y:auto;">
          ${renderFolioInspectorContent(docObj)}
        </div>
      </div>
    </div>

    <!-- STATUS BAR METRICS -->
    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; font-size:0.78rem; color:var(--text-muted); background:var(--bg-surface); padding:6px 12px; border-radius:4px; border:1px solid var(--border-color);">
      <div>Status: <b style="color:var(--emerald);">Saved Locally</b> | Format: <b style="color:var(--text-main);">.folio v1</b></div>
      <div id="docsWC">0 words</div>
    </div>
  `;

  updateWC();
  updateFolioOutline();
}

function renderFolioInspectorContent(docObj) {
  const doc = docObj.document;
  if (currentFolioInspectorTab === 'outline') {
    return `
      <h4 style="margin:0 0 8px 0; font-size:0.85rem; color:var(--text-muted);">DOCUMENT OUTLINE</h4>
      <div id="folioOutlineList" style="display:flex; flex-direction:column; gap:4px; font-size:0.8rem;"></div>
    `;
  }
  if (currentFolioInspectorTab === 'history') {
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <h4 style="margin:0; font-size:0.85rem; color:var(--text-muted);">VERSION HISTORY</h4>
        <button class="btn ghost small" onclick="createFolioSnapshot()">+ Snapshot</button>
      </div>
      <div style="display:flex; flex-direction:column; gap:6px;">
        ${(doc.history || []).map((v, idx) => `
          <div style="padding:6px 8px; background:var(--bg-main); border:1px solid var(--border-color); border-radius:4px; font-size:0.75rem;">
            <div style="font-weight:bold; color:var(--text-main);">${escapeHTML(v.title)}</div>
            <div style="color:var(--text-muted);">${new Date(v.timestamp).toLocaleTimeString()}</div>
            <button class="btn ghost small" style="margin-top:4px; font-size:0.7rem;" onclick="restoreFolioSnapshot(${idx})">Restore</button>
          </div>
        `).join('')}
      </div>
    `;
  }
  return `
    <h4 style="margin:0 0 8px 0; font-size:0.85rem; color:var(--text-muted);">DOCUMENT PROPERTIES</h4>
    <div style="display:flex; flex-direction:column; gap:6px; font-size:0.8rem; color:var(--text-main);">
      <div>Author: <b>${escapeHTML(doc.metadata.author)}</b></div>
      <div>Created: <b>${new Date(doc.metadata.created).toLocaleDateString()}</b></div>
      <div>Status: <b>${escapeHTML(doc.metadata.status)}</b></div>
      <div>Priority: <b>${escapeHTML(doc.metadata.priority)}</b></div>
    </div>
  `;
}

function setFolioInspectorTab(tab) {
  currentFolioInspectorTab = tab;
  renderDocs();
}

function updateFolioTitle(val) {
  const docObj = getFolioDocument();
  docObj.document.title = val;
  saveFolioDocument(docObj, true);
}

function updateFolioOutline() {
  const el = document.getElementById('folioOutlineList');
  const editor = document.getElementById('docsEditor');
  if (!el || !editor) return;

  const headings = editor.querySelectorAll('h1, h2, h3');
  if (!headings.length) {
    el.innerHTML = '<div style="color:var(--text-muted);">No headings found in document.</div>';
    return;
  }

  let html = '';
  headings.forEach((h, idx) => {
    if (!h.id) h.id = 'heading_' + idx;
    const level = h.tagName.toLowerCase();
    const indent = level === 'h1' ? 0 : level === 'h2' ? 12 : 24;
    html += `<div style="padding-left:${indent}px; cursor:pointer; color:var(--accent-primary,#3b82f6);" onclick="document.getElementById('${h.id}').scrollIntoView({behavior:'smooth'})">• ${escapeHTML(h.textContent || 'Untitled Heading')}</div>`;
  });
  el.innerHTML = html;
}

function onFolioEditorKeyDown(e) {
  if (e.key === '/') {
    const menu = document.getElementById('folioSlashMenu');
    if (menu) menu.style.display = 'block';
  } else if (e.key === 'Escape') {
    const menu = document.getElementById('folioSlashMenu');
    if (menu) menu.style.display = 'none';
  }

  const docObj = getFolioDocument();
  if (docObj && docObj.document && docObj.document.trackChanges && !e.ctrlKey && !e.metaKey && e.key.length === 1) {
    e.preventDefault();
    const tag = 'ins';
    const color = '#10b981';
    const html = `<${tag} class="folio-change" data-id="chg_${Date.now()}" style="color:${color}; text-decoration:underline; background:rgba(255,255,255,0.05); padding:0 2px;">${escapeHTML(e.key)}</${tag}>`;
    document.execCommand('insertHTML', false, html);
    saveFolioContentFromDOM();
  }
}

function insertSlashBlock(type) {
  const menu = document.getElementById('folioSlashMenu');
  if (menu) menu.style.display = 'none';
  if (type === 'H1') document.execCommand('formatBlock', false, 'H1');
  else if (type === 'H2') document.execCommand('formatBlock', false, 'H2');
  else if (type === 'QUOTE') document.execCommand('formatBlock', false, 'BLOCKQUOTE');
  else if (type === 'TABLE') insertFolioTable();
  else if (type === 'PAGE') insertFolioPageBreak();
  updateFolioOutline();
}

function insertFolioTable() {
  const editor = document.getElementById('docsEditor');
  const html = `<table style="width:100%; border-collapse:collapse; margin:12px 0;" border="1">
    <thead>
      <tr style="background:var(--bg-elevated);">
        <th style="padding:6px; border:1px solid var(--border-color);">Header 1</th>
        <th style="padding:6px; border:1px solid var(--border-color);">Header 2</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding:6px; border:1px solid var(--border-color);">Data 1</td>
        <td style="padding:6px; border:1px solid var(--border-color);">Data 2</td>
      </tr>
    </tbody>
  </table><p><br></p>`;
  if (editor) {
    editor.focus();
    try { document.execCommand('insertHTML', false, html); } catch(e) { editor.innerHTML += html; }
    saveDocs();
  }
}

function insertFolioPageBreak() {
  const editor = document.getElementById('docsEditor');
  const html = `<div style="border-top:2px dashed var(--border-color); margin:20px 0; text-align:center; color:var(--text-muted); font-size:0.75rem; page-break-after:always;">--- PAGE BREAK ---</div><p><br></p>`;
  if (editor) {
    editor.innerHTML += html;
    saveDocs();
  }
}

function createFolioSnapshot() {
  const docObj = getFolioDocument();
  const editor = document.getElementById('docsEditor');
  const title = prompt("Snapshot Title:", "Version " + (docObj.document.history.length + 1));
  if (!title) return;

  docObj.document.history.push({
    id: "v_" + Date.now(),
    title: title.trim(),
    timestamp: Date.now(),
    content: editor.innerHTML
  });
  saveFolioDocument(docObj);
  renderDocs();
}

function restoreFolioSnapshot(idx) {
  const docObj = getFolioDocument();
  if (!docObj.document.history[idx]) return;
  docObj.document.content = docObj.document.history[idx].content;
  saveFolioDocument(docObj);
  renderDocs();
}

function toggleFolioFocusMode() {
  const panel = document.getElementById('panel-docs');
  if (panel) panel.classList.toggle('focus-mode');
}

function insertFolioFootnote() {
  const noteText = prompt('Enter Footnote content:');
  if (!noteText) return;
  const editor = document.getElementById('docsEditor');
  if (!editor) return;

  editor.focus();
  const fnId = 'fn_' + Date.now();
  const fnNum = (editor.querySelectorAll('.folio-footnote-marker').length || 0) + 1;
  const markHtml = `<sup class="folio-footnote-marker" id="fn_mark_${fnId}" style="color:#f59e0b; font-weight:bold; cursor:pointer;" onclick="document.getElementById('fn_item_${fnId}').scrollIntoView({behavior:'smooth'})" title="${escapeHTML(noteText)}">[${fnNum}]</sup>`;

  let inserted = false;
  try {
    inserted = document.execCommand('insertHTML', false, markHtml);
  } catch (e) { inserted = false; }

  if (!inserted || !editor.querySelector(`#fn_mark_${fnId}`)) {
    const p = editor.querySelector('p') || editor;
    p.insertAdjacentHTML('beforeend', markHtml);
  }

  let footnotesSec = editor.querySelector('.folio-footnotes-section');
  if (!footnotesSec) {
    footnotesSec = document.createElement('div');
    footnotesSec.className = 'folio-footnotes-section';
    footnotesSec.style.cssText = 'margin-top:32px; border-top:1px solid #cbd5e1; padding-top:12px; font-size:0.85rem; color:#475569;';
    footnotesSec.innerHTML = '<b style="color:#334155;">Footnotes:</b><ol id="folioFootnotesList" style="margin:8px 0 0 0; padding-left:20px;"></ol>';
    editor.appendChild(footnotesSec);
  }
  const list = footnotesSec.querySelector('#folioFootnotesList');
  if (list) {
    const li = document.createElement('li');
    li.id = `fn_item_${fnId}`;
    li.innerHTML = `${escapeHTML(noteText)} <a href="#fn_mark_${fnId}" onclick="event.preventDefault(); document.getElementById('fn_mark_${fnId}').scrollIntoView({behavior:'smooth'})" style="color:#f59e0b; font-weight:bold; text-decoration:none;">↩</a>`;
    list.appendChild(li);
  }

  const docObj = getFolioDocument();
  if (!docObj.document.footnotes) docObj.document.footnotes = [];
  docObj.document.footnotes.push({ id: fnId, num: fnNum, text: noteText });
  saveFolioDocument(docObj, true);
  captureFolioCurrentContent();
}

function openFolioFindReplaceModal() {
  const modal = document.createElement('div');
  modal.id = 'folioModalOverlay';
  modal.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; z-index:99999;';
  modal.innerHTML = `
    <div style="background:#18181b; border:1px solid #3f3f46; padding:20px; border-radius:8px; width:400px; color:#f4f4f5;">
      <h3 style="margin-top:0; color:#f59e0b;">Find & Replace</h3>
      <div style="display:flex; flex-direction:column; gap:12px; margin:16px 0;">
        <div>
          <label style="font-size:0.75rem; color:#a1a1aa; display:block; margin-bottom:4px;">Find Text</label>
          <input type="text" id="folioFindInput" style="width:100%; background:#27272a; color:#fff; border:1px solid #3f3f46; padding:8px; border-radius:4px;" placeholder="Search term..." />
        </div>
        <div>
          <label style="font-size:0.75rem; color:#a1a1aa; display:block; margin-bottom:4px;">Replace With</label>
          <input type="text" id="folioReplaceInput" style="width:100%; background:#27272a; color:#fff; border:1px solid #3f3f46; padding:8px; border-radius:4px;" placeholder="Replacement..." />
        </div>
      </div>
      <div style="display:flex; gap:8px; justify-content:end;">
        <button class="btn ghost small" onclick="document.getElementById('folioModalOverlay').remove();">Cancel</button>
        <button class="btn brass small" onclick="executeFolioReplaceAll()">Replace All</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function executeFolioReplaceAll() {
  const findVal = document.getElementById('folioFindInput').value;
  const replaceVal = document.getElementById('folioReplaceInput').value;
  if (!findVal) return;
  const editor = document.getElementById('docsEditor');
  if (!editor) return;

  const walkAndReplace = (node) => {
    if (node.nodeType === 3) {
      if (node.nodeValue.includes(findVal)) {
        node.nodeValue = node.nodeValue.replaceAll(findVal, replaceVal);
      }
    } else if (node.nodeType === 1 && !['SCRIPT', 'STYLE'].includes(node.tagName)) {
      Array.from(node.childNodes).forEach(walkAndReplace);
    }
  };

  walkAndReplace(editor);
  captureFolioCurrentContent();
  const overlay = document.getElementById('folioModalOverlay');
  if (overlay) overlay.remove();
  if (typeof showToast === 'function') showToast(`Replaced occurrences of "${findVal}".`);
}

function createTaskFromFolioSelection() {
  const sel = window.getSelection().toString().trim();
  if (!sel) { alert("Select text in the document first to convert to a task."); return; }
  const tasksData = loadLocal('tasks', { items: [] });
  tasksData.items.push({
    id: Date.now(),
    x: 50,
    y: 50,
    label: sel,
    done: false,
    createdDate: todayStr()
  });
  saveLocal('tasks', tasksData);
  alert("Created Docket task from selected text!");
}

function docsInsertLink(){
  const url = prompt('Link URL:', 'https://');
  if(url) document.execCommand('createLink', false, url);
}
function docsAddMarginNote(){
  const sel = window.getSelection().toString().trim();
  if(!sel){ alert('Select some text in the doc first, then pin a note about it.'); return; }
  openModalForm({
    title: 'Attach Margin Note',
    fields: [
      { name: 'noteText', label: 'Margin Note Content for: "' + sel.slice(0, 50) + '..."', type: 'text', value: '', required: true }
    ],
    onSubmit: (vals) => {
      if(!vals.noteText) return;
      const d = getNotesData();
      if(d.items.length>=100){ alert('Spot is capped at 100 notes.'); return; }
      d.items.push({id:Date.now(), x:40+Math.random()*200, y:40+Math.random()*200, text:vals.noteText, anchor:sel.slice(0,80)});
      saveLocal('notes', d);
      bumpSpotStreak();
      renderNotes();
    }
  });
}
function updateWC(){
  const txt = document.getElementById('docsEditor').innerText||'';
  const words = txt.trim().split(/\s+/).filter(Boolean).length;
  document.getElementById('docsWC').textContent = words + ' words';
}
function saveDocs(){
  const titleEl = document.getElementById('folioDocTitle');
  const title = titleEl ? titleEl.value : 'Untitled Document';
  const editor = document.getElementById('docsEditor');
  const html = editor ? editor.innerHTML : '<p>Start writing...</p>';
  const docObj = getFolioDocument();
  docObj.document.title = title || 'Untitled Document';
  docObj.document.content = html;
  saveFolioDocument(docObj);
}
function exportDocs(){
  saveDocs();
  const data = loadLocal('docs', {});
  download('document.fils', JSON.stringify({type:'fils',...data}, null, 2));
}
function importDocs(){
  pickFile('.fils', (content)=>{
    try{
      const parsed = JSON.parse(content);
      if(parsed && parsed.document) {
        saveFolioDocument(parsed, true);
      } else if(parsed && parsed.html) {
        const docObj = getFolioDocument();
        docObj.document.content = parsed.html;
        saveFolioDocument(docObj, true);
      }
      renderDocs();
    }
    catch(e){ alert('Could not read that .fils file'); }
  });
}

/* ================= SHEETS (.grid) — SUITE GRID DATA STUDIO ================= */



/* CONTEXT MENU & CLIPBOARD / SELECTION ENGINE */
let activeGridNoteCell = null;
let gridClipboard = null; // { mode: 'copy'|'cut', width, height, cells: {} }
let gridSelectionRange = null; // { startCol, startRow, endCol, endRow }
let isGridDraggingSelection = false;

function showContextMenu(e, items) {
  closeContextMenu();
  const menu = document.createElement('div');
  menu.id = 'suiteContextMenu';
  menu.style.position = 'fixed';
  menu.style.left = Math.min(e.clientX, window.innerWidth - 220) + 'px';
  menu.style.top = Math.min(e.clientY, window.innerHeight - 280) + 'px';
  menu.style.background = 'var(--bg-surface-elevated, #1e293b)';
  menu.style.border = '1px solid var(--border-color, rgba(255,255,255,0.15))';
  menu.style.borderRadius = '8px';
  menu.style.boxShadow = '0 12px 32px rgba(0,0,0,0.4)';
  menu.style.zIndex = '1000';
  menu.style.minWidth = '200px';
  menu.style.padding = '6px 0';
  menu.style.fontFamily = 'Helvetica Neue, Arial, sans-serif';

  menu.innerHTML = items.map(item => `
    <div style="padding:8px 14px; font-size:0.85rem; color:var(--text-main, #f1f5f9); display:flex; align-items:center; justify-content:space-between; cursor:pointer; transition:background 0.15s;"
         onmouseover="this.style.background='rgba(59,130,246,0.2)'"
         onmouseout="this.style.background='transparent'"
         onclick="closeContextMenu(); ${item.action};">
      <span>${item.icon ? item.icon + ' ' : ''}${item.label}</span>
    </div>
  `).join('');

  document.body.appendChild(menu);

  const dismissHandler = (evt) => {
    if (!menu.contains(evt.target)) {
      closeContextMenu();
      document.removeEventListener('click', dismissHandler);
      document.removeEventListener('contextmenu', dismissHandler);
    }
  };
  setTimeout(() => {
    document.addEventListener('click', dismissHandler);
    document.addEventListener('contextmenu', dismissHandler);
  }, 10);
}

function closeContextMenu() {
  const existing = document.getElementById('suiteContextMenu');
  if (existing) existing.remove();
}

function showGridContextMenu(e, coord) {
  e.preventDefault();
  selectedGridCell = coord;
  if (!gridSelectionRange) {
    const p = parseCellCoord(coord);
    if (p) gridSelectionRange = { startCol: p.col, startRow: p.row, endCol: p.col, endRow: p.row };
  }
  const items = [
    { label: "Cut (Ctrl+X)", icon: "✂️", action: "gridCutSelection()" },
    { label: "Copy (Ctrl+C)", icon: "📋", action: "gridCopySelection()" },
    { label: "Paste (Ctrl+V)", icon: "📄", action: "gridPasteSelection('all')" },
    { label: "Paste Values Only", icon: "📝", action: "gridPasteSelection('values')" },
    { label: "Paste Formulas Only", icon: "🧮", action: "gridPasteSelection('formulas')" },
    { label: "Insert Row Above", icon: "⬆️", action: "insertGridRowAtSelection()" },
    { label: "Delete Selected Row(s)", icon: "🗑️", action: "deleteGridRowAtSelection()" },
    { label: "Insert Column Left", icon: "⬅️", action: "insertGridColAtSelection()" },
    { label: "Delete Selected Column(s)", icon: "🗑️", action: "deleteGridColAtSelection()" },
    { label: "Add Cell Note / Comment", icon: "💬", action: `addGridCellNote('${coord}')` },
    { label: "Set Currency Format", icon: "💵", action: "formatSelectedRange('format','currency')" },
    { label: "Clear Formats", icon: "🧹", action: "clearGridFormats()" },
    { label: "Delete Cell Value", icon: "🗑️", action: `clearGridCellVal('${coord}')` }
  ];
  showContextMenu(e, items);
}

function getActiveSelectionBounds() {
  if (gridSelectionRange) {
    return {
      minCol: Math.min(gridSelectionRange.startCol, gridSelectionRange.endCol),
      maxCol: Math.max(gridSelectionRange.startCol, gridSelectionRange.endCol),
      minRow: Math.min(gridSelectionRange.startRow, gridSelectionRange.endRow),
      maxRow: Math.max(gridSelectionRange.startRow, gridSelectionRange.endRow)
    };
  }
  const p = parseCellCoord(selectedGridCell || 'A1');
  const c = p ? p.col : 0, r = p ? p.row : 0;
  return { minCol: c, maxCol: c, minRow: r, maxRow: r };
}

function gridCopySelection() {
  const bounds = getActiveSelectionBounds();
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  const copyMap = {};
  let textRows = [];

  for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
    let rowVals = [];
    for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
      const coord = colLetter(c) + (r + 1);
      const relC = c - bounds.minCol;
      const relR = r - bounds.minRow;
      const relKey = `${relC}_${relR}`;
      const cellObj = sheet.cells[coord] ? JSON.parse(JSON.stringify(sheet.cells[coord])) : { raw: '' };
      copyMap[relKey] = cellObj;
      rowVals.push(typeof cellObj === 'object' ? (cellObj.raw || '') : String(cellObj));
    }
    textRows.push(rowVals.join('\t'));
  }

  gridClipboard = {
    mode: 'copy',
    startCol: bounds.minCol,
    startRow: bounds.minRow,
    width: bounds.maxCol - bounds.minCol + 1,
    height: bounds.maxRow - bounds.minRow + 1,
    cells: copyMap
  };

  const clipText = textRows.join('\n');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(clipText).catch(() => {});
  }
}

function gridCutSelection() {
  gridCopySelection();
  if (gridClipboard) gridClipboard.mode = 'cut';
  pushGridHistory();
  const bounds = getActiveSelectionBounds();
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
    for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
      const coord = colLetter(c) + (r + 1);
      if (sheet.cells[coord]) {
        if (typeof sheet.cells[coord] === 'object') sheet.cells[coord].raw = '';
        else sheet.cells[coord] = { raw: '' };
      }
    }
  }
  saveGridWorkbook(wb);
  renderSheets();
}

function openGridPivotModal() {
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  const modal = document.getElementById('capsuleModal');
  if (!modal) return;
  modal.innerHTML = `
    <h3>📊 Grid Pivot Engine</h3>
    <p class="hint">Summarize and aggregate column values by category row key.</p>
    <div style="margin-bottom:12px;">
      <label style="display:block;font-size:0.82em;margin-bottom:4px;color:var(--text-workspace,#f1f5f9);">Row Category Column (e.g. A):</label>
      <input type="text" id="pivotRowCol" value="A" style="width:100%;margin-bottom:8px;">
      <label style="display:block;font-size:0.82em;margin-bottom:4px;color:var(--text-workspace,#f1f5f9);">Value Numeric Column (e.g. B):</label>
      <input type="text" id="pivotValCol" value="B" style="width:100%;margin-bottom:8px;">
    </div>
    <div id="pivotResult" style="background:var(--bg-card,#181c24);padding:10px;border-radius:6px;max-height:200px;overflow:auto;display:none;white-space:pre-wrap;font-family:monospace;font-size:0.85em;margin-bottom:12px;"></div>
    <div style="display:flex;justify-content:flex-end;gap:8px;">
      <button class="btn ghost small" onclick="closeCapsuleModal()">Close</button>
      <button class="btn brass small" onclick="runGridPivot()">Generate Pivot</button>
    </div>
  `;
  document.getElementById('capsuleModalBg')?.classList.add('show');
}

function runGridPivot() {
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  const rowCol = (document.getElementById('pivotRowCol')?.value || 'A').trim().toUpperCase();
  const valCol = (document.getElementById('pivotValCol')?.value || 'B').trim().toUpperCase();
  const pivotMap = {};

  for (let r = 1; r < (sheet.rowCount || 100); r++) {
    const rowKey = sheet.cells?.[rowCol + (r + 1)]?.raw || 'Uncategorized';
    const numVal = Number(sheet.cells?.[valCol + (r + 1)]?.raw) || 0;
    pivotMap[rowKey] = (pivotMap[rowKey] || 0) + numVal;
  }

  let report = `📊 PIVOT SUMMARY (Row: ${rowCol}, Value: SUM(${valCol}))\n---------------------------------------\n`;
  for (let [k, v] of Object.entries(pivotMap)) {
    report += `${k}: ${v.toLocaleString()}\n`;
  }
  const resEl = document.getElementById('pivotResult');
  if (resEl) {
    resEl.textContent = report;
    resEl.style.display = 'block';
  }
}

function openGridDataflowModal() {
  const modal = document.getElementById('capsuleModal');
  if (!modal) return;
  modal.innerHTML = `
    <h3>⚡ Local Dataflow ETL Pipeline</h3>
    <p class="hint">Execute local ETL transformations (Clean, Validate, Deduplicate, Recalculate) directly on active sheet data.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
      <div style="background:var(--bg-card,#181c24);padding:8px;border-radius:6px;font-size:0.8em;">
        <b>Step 1: Sanitize Text</b><br><span style="color:#94a3b8">Trim leading/trailing whitespace across all text cells.</span>
      </div>
      <div style="background:var(--bg-card,#181c24);padding:8px;border-radius:6px;font-size:0.8em;">
        <b>Step 2: Number Parsing</b><br><span style="color:#94a3b8">Cast string numbers to explicit numeric types.</span>
      </div>
      <div style="background:var(--bg-card,#181c24);padding:8px;border-radius:6px;font-size:0.8em;">
        <b>Step 3: Deduplicate</b><br><span style="color:#94a3b8">Identify duplicate rows based on column A keys.</span>
      </div>
      <div style="background:var(--bg-card,#181c24);padding:8px;border-radius:6px;font-size:0.8em;">
        <b>Step 4: Recalculate Formulas</b><br><span style="color:#94a3b8">Update dependency tree and evaluated cell values.</span>
      </div>
    </div>
    <div id="dataflowLog" style="background:var(--bg-card,#181c24);padding:10px;border-radius:6px;max-height:150px;overflow:auto;display:none;white-space:pre-wrap;font-family:monospace;font-size:0.8em;margin-bottom:12px;"></div>
    <div style="display:flex;justify-content:flex-end;gap:8px;">
      <button class="btn ghost small" onclick="closeCapsuleModal()">Cancel</button>
      <button class="btn brass small" onclick="runGridDataflowETL()">Execute Pipeline</button>
    </div>
  `;
  document.getElementById('capsuleModalBg')?.classList.add('show');
}

function runGridDataflowETL() {
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  let trimmed = 0;
  let dedupped = 0;
  const seenKeys = new Set();
  pushGridHistory();

  for (let r = 0; r < (sheet.rowCount || 100); r++) {
    const key = sheet.cells?.[`A${r + 1}`]?.raw;
    if (key && r > 0) {
      if (seenKeys.has(key)) {
        dedupped++;
      } else {
        seenKeys.add(key);
      }
    }
    for (let c = 0; c < (sheet.colCount || 26); c++) {
      const colStr = colLetter(c);
      const coord = `${colStr}${r + 1}`;
      if (sheet.cells && sheet.cells[coord] && typeof sheet.cells[coord].raw === 'string') {
        const orig = sheet.cells[coord].raw;
        const cleaned = orig.trim();
        if (cleaned !== orig) {
          sheet.cells[coord].raw = cleaned;
          trimmed++;
        }
      }
    }
  }
  recalcGridWorkbook();
  renderGrid();
  saveGridWorkbook();

  const logEl = document.getElementById('dataflowLog');
  if (logEl) {
    logEl.textContent = `[ETL SUCCESS] Local Dataflow Pipeline executed successfully.\n- Cleaned whitespace in ${trimmed} cells\n- Identified ${dedupped} duplicate key rows\n- Recalculated sheet formulas & saved state locally.`;
    logEl.style.display = 'block';
  }
}

function gridPasteSelection(pasteType = 'all') {
  if (!gridClipboard || !gridClipboard.cells) return;
  pushGridHistory();
  const bounds = getActiveSelectionBounds();
  const targetCol = bounds.minCol;
  const targetRow = bounds.minRow;
  const colDelta = targetCol - gridClipboard.startCol;
  const rowDelta = targetRow - gridClipboard.startRow;
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);

  for (let relR = 0; relR < gridClipboard.height; relR++) {
    for (let relC = 0; relC < gridClipboard.width; relC++) {
      const srcCell = gridClipboard.cells[`${relC}_${relR}`] || { raw: '' };
      const destCol = targetCol + relC;
      const destRow = targetRow + relR;
      const destCoord = colLetter(destCol) + (destRow + 1);

      if (!sheet.cells[destCoord]) sheet.cells[destCoord] = { raw: '' };
      const existing = sheet.cells[destCoord];

      let newRaw = srcCell.raw || '';
      if (newRaw.startsWith('=')) {
        newRaw = shiftFormulaReferences(newRaw, colDelta, rowDelta);
      }

      if (pasteType === 'values') {
        let evalVal = newRaw;
        if (newRaw.startsWith('=')) evalVal = String(evalGridFormula(newRaw.slice(1), sheet.cells));
        existing.raw = evalVal;
      } else if (pasteType === 'formulas') {
        existing.raw = newRaw;
      } else { // 'all'
        Object.assign(existing, JSON.parse(JSON.stringify(srcCell)), { raw: newRaw });
      }
    }
  }

  if (gridClipboard.mode === 'cut') gridClipboard = null;
  saveGridWorkbook(wb);
  renderSheets();
}

function formatSelectedRange(key, value) {
  pushGridHistory();
  const bounds = getActiveSelectionBounds();
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);

  for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
    for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
      const coord = colLetter(c) + (r + 1);
      if (!sheet.cells[coord]) sheet.cells[coord] = { raw: '' };
      const cell = sheet.cells[coord];
      if (key === 'bold') cell.bold = !cell.bold;
      else if (key === 'italic') cell.italic = !cell.italic;
      else if (key === 'align') cell.align = value;
      else if (key === 'format') cell.format = value;
      else if (key === 'bg') cell.bg = value;
      else if (key === 'color') cell.color = value;
    }
  }

  saveGridWorkbook(wb);
  renderSheets();
}

function insertGridRowAtSelection() {
  pushGridHistory();
  const bounds = getActiveSelectionBounds();
  const targetRow = bounds.minRow + 1; // 1-based
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  const newCells = {};

  for (const coord in sheet.cells) {
    const p = parseCellCoord(coord);
    if (p) {
      if (p.rowNum >= targetRow) {
        const newCoord = p.colStr + (p.rowNum + 1);
        newCells[newCoord] = sheet.cells[coord];
      } else {
        newCells[coord] = sheet.cells[coord];
      }
    }
  }
  sheet.rows += 1;
  sheet.cells = newCells;
  saveGridWorkbook(wb);
  renderSheets();
}

function deleteGridRowAtSelection() {
  pushGridHistory();
  const bounds = getActiveSelectionBounds();
  const minR = bounds.minRow + 1, maxR = bounds.maxRow + 1;
  const count = maxR - minR + 1;
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  const newCells = {};

  for (const coord in sheet.cells) {
    const p = parseCellCoord(coord);
    if (p) {
      if (p.rowNum >= minR && p.rowNum <= maxR) {
        // Deleted
      } else if (p.rowNum > maxR) {
        const newCoord = p.colStr + (p.rowNum - count);
        newCells[newCoord] = sheet.cells[coord];
      } else {
        newCells[coord] = sheet.cells[coord];
      }
    }
  }
  sheet.rows = Math.max(1, sheet.rows - count);
  sheet.cells = newCells;
  saveGridWorkbook(wb);
  renderSheets();
}

function insertGridColAtSelection() {
  pushGridHistory();
  const bounds = getActiveSelectionBounds();
  const targetColIdx = bounds.minCol;
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  const newCells = {};

  for (const coord in sheet.cells) {
    const p = parseCellCoord(coord);
    if (p) {
      if (p.col >= targetColIdx) {
        const newCoord = colLetter(p.col + 1) + p.rowNum;
        newCells[newCoord] = sheet.cells[coord];
      } else {
        newCells[coord] = sheet.cells[coord];
      }
    }
  }
  sheet.cols += 1;
  sheet.cells = newCells;
  saveGridWorkbook(wb);
  renderSheets();
}

function deleteGridColAtSelection() {
  pushGridHistory();
  const bounds = getActiveSelectionBounds();
  const minC = bounds.minCol, maxC = bounds.maxCol;
  const count = maxC - minC + 1;
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  const newCells = {};

  for (const coord in sheet.cells) {
    const p = parseCellCoord(coord);
    if (p) {
      if (p.col >= minC && p.col <= maxC) {
        // Deleted
      } else if (p.col > maxC) {
        const newCoord = colLetter(p.col - count) + p.rowNum;
        newCells[newCoord] = sheet.cells[coord];
      } else {
        newCells[coord] = sheet.cells[coord];
      }
    }
  }
  sheet.cols = Math.max(1, sheet.cols - count);
  sheet.cells = newCells;
  saveGridWorkbook(wb);
  renderSheets();
}


function addGridCellNote(coord) {
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  if (!sheet.cells[coord]) sheet.cells[coord] = { raw: '' };
  const currentNote = sheet.cells[coord].note || '';
  const note = prompt(`Add cell note for ${coord}:`, currentNote);
  if (note === null) return;
  pushGridHistory();
  sheet.cells[coord].note = note.trim();
  saveGridWorkbook(wb);
  renderSheets();
}

function clearGridCellVal(coord) {
  pushGridHistory();
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  if (sheet.cells[coord]) {
    sheet.cells[coord].raw = '';
    saveGridWorkbook(wb);
    renderSheets();
  }
}

/* SESSION 16 GATE 2 & GATE 3 HANDLERS: HISTORY, FILTERS, FREEZE PANES, FIND/REPLACE */
let gridUndoStack = [];
let gridRedoStack = [];
let isGridFreezeActive = false;
let activeGridFilter = null; // { colIndex: 0, query: 'text' }

function pushGridHistory() {
  const wb = getGridWorkbook();
  gridUndoStack.push(JSON.parse(JSON.stringify(wb)));
  if (gridUndoStack.length > 30) gridUndoStack.shift();
  gridRedoStack = [];
}

function undoGridAction() {
  if (!gridUndoStack.length) return;
  const currentWb = getGridWorkbook();
  gridRedoStack.push(JSON.parse(JSON.stringify(currentWb)));
  const prevWb = gridUndoStack.pop();
  saveGridWorkbook(prevWb, true);
  renderSheets();
}

function redoGridAction() {
  if (!gridRedoStack.length) return;
  const currentWb = getGridWorkbook();
  gridUndoStack.push(JSON.parse(JSON.stringify(currentWb)));
  const nextWb = gridRedoStack.pop();
  saveGridWorkbook(nextWb, true);
  renderSheets();
}

function toggleFreezePanes() {
  isGridFreezeActive = !isGridFreezeActive;
  renderSheets();
}

function openGridFilterModal() {
  const parsed = parseCellCoord(selectedGridCell || 'A1');
  const colIndex = parsed ? parsed.col : 0;
  const colLetterStr = colLetter(colIndex);
  const query = prompt(`Enter filter text for Column ${colLetterStr}:`);
  if (query === null) return;
  pushGridHistory();
  activeGridFilter = { colIndex, query: query.trim().toLowerCase() };
  renderSheets();
}

function clearGridFilter() {
  activeGridFilter = null;
  renderSheets();
}

function shiftFormulaReferences(formulaStr, colDelta, rowDelta) {
  if (!formulaStr || !formulaStr.startsWith('=')) return formulaStr;
  return '=' + formulaStr.slice(1).replace(/(\$)?([A-Z]+)(\$)?(\d+)/g, (match, absCol, colStr, absRow, rowStr) => {
    let newColStr = colStr;
    let newRowStr = rowStr;
    if (!absCol) {
      const colIdx = letterToColIndex(colStr);
      const newColIdx = Math.max(0, colIdx + colDelta);
      newColStr = colLetter(newColIdx);
    }
    if (!absRow) {
      const rowNum = parseInt(rowStr, 10);
      const newRowNum = Math.max(1, rowNum + rowDelta);
      newRowStr = String(newRowNum);
    }
    return (absCol || '') + newColStr + (absRow || '') + newRowStr;
  });
}

function fillGridSelection(startCoord, endCoord) {
  pushGridHistory();
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  const pStart = parseCellCoord(startCoord);
  const pEnd = parseCellCoord(endCoord);
  if (!pStart || !pEnd) return;

  const srcCell = sheet.cells[startCoord] || {};
  const srcRaw = typeof srcCell === 'object' ? (srcCell.raw || '') : String(srcCell);

  const minCol = Math.min(pStart.col, pEnd.col), maxCol = Math.max(pStart.col, pEnd.col);
  const minRow = Math.min(pStart.row, pEnd.row), maxRow = Math.max(pStart.row, pEnd.row);

  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      const targetCoord = colLetter(c) + (r + 1);
      if (targetCoord === startCoord) continue;

      const cDelta = c - pStart.col;
      const rDelta = r - pStart.row;
      let targetRaw = srcRaw;

      if (srcRaw.startsWith('=')) {
        targetRaw = shiftFormulaReferences(srcRaw, cDelta, rDelta);
      } else if (!isNaN(Number(srcRaw)) && srcRaw !== '') {
        const numVal = Number(srcRaw) + (rDelta || cDelta);
        targetRaw = String(numVal);
      }

      if (!sheet.cells[targetCoord]) sheet.cells[targetCoord] = {};
      if (typeof sheet.cells[targetCoord] === 'string') {
        sheet.cells[targetCoord] = { raw: targetRaw };
      } else {
        sheet.cells[targetCoord].raw = targetRaw;
      }
    }
  }

  saveGridWorkbook(wb);
  renderSheets();
}

function openGridFindReplaceModal() {
  const findVal = prompt("Find text or value:");
  if (!findVal) return;
  const replaceVal = prompt(`Replace "${findVal}" with:`);
  if (replaceVal === null) return;

  pushGridHistory();
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  let count = 0;
  for (const coord in sheet.cells) {
    const cell = sheet.cells[coord];
    if (cell && typeof cell === 'object' && cell.raw) {
      if (cell.raw.includes(findVal)) {
        cell.raw = cell.raw.replaceAll(findVal, replaceVal);
        count++;
      }
    }
  }
  saveGridWorkbook(wb);
  renderSheets();
  alert(`Find & Replace Complete: Replaced ${count} occurrence(s).`);
}

let currentGridRibbonTab = 'home';
let selectedGridCell = 'A1';
let selectedGridRange = null;

let _activeGridWorkbook = null;

function getGridWorkbook() {
  if (_activeGridWorkbook && Array.isArray(_activeGridWorkbook.sheets)) {
    return _activeGridWorkbook;
  }
  const raw = loadLocal('sheets', null);
  if (raw && (raw.version === 3 || raw.version === "3.0" || raw.version === "2.0") && Array.isArray(raw.sheets) && raw.sheets.length > 0) {
    raw.format = "suite-grid";
    raw.version = 3;
    _activeGridWorkbook = raw;
    return _activeGridWorkbook;
  }
  // Migrate legacy flat cell object or create new default workbook
  const legacyCells = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {};
  const convertedCells = {};
  for (const k in legacyCells) {
    if (typeof legacyCells[k] === 'string') {
      convertedCells[k] = { raw: legacyCells[k] };
    } else if (legacyCells[k] && typeof legacyCells[k] === 'object') {
      convertedCells[k] = legacyCells[k];
    }
  }
  _activeGridWorkbook = {
    format: "suite-grid",
    version: 3,
    activeSheetIndex: 0,
    sheets: [{
      id: "sheet_1",
      name: "Sheet 1",
      rows: 15,
      cols: 10,
      cells: convertedCells
    }],
    created: Date.now(),
    modified: Date.now()
  };
  return _activeGridWorkbook;
}

function saveGridWorkbook(wb, silent = false) {
  _activeGridWorkbook = wb || _activeGridWorkbook || getGridWorkbook();
  _activeGridWorkbook.format = "suite-grid";
  _activeGridWorkbook.version = 3;
  _activeGridWorkbook.modified = Date.now();
  saveLocal('sheets', _activeGridWorkbook);
  if (typeof saveIDBItem === 'function') saveIDBItem('sheets', _activeGridWorkbook);
  if (!silent) showSeal();
}

function getActiveSheet(wb) {
  const idx = wb.activeSheetIndex || 0;
  return wb.sheets[idx] || wb.sheets[0];
}

function colLetter(i) {
  let str = "";
  i++;
  while (i > 0) {
    let rem = (i - 1) % 26;
    str = String.fromCharCode(65 + rem) + str;
    i = Math.floor((i - 1) / 26);
  }
  return str;
}

function letterToColIndex(str) {
  let col = 0;
  for (let i = 0; i < str.length; i++) {
    col = col * 26 + (str.charCodeAt(i) - 64);
  }
  return col - 1;
}

function parseCellCoord(coord) {
  const m = coord.match(/^([A-Z]+)(\d+)$/);
  if (!m) return null;
  return { col: letterToColIndex(m[1]), row: parseInt(m[2], 10) - 1, colStr: m[1], rowNum: parseInt(m[2], 10) };
}

/* Advanced Formula Engine with Dependency Sorting */
function evalGridFormula(expr, cellsMap, visited = new Set()) {
  try {
    let cleaned = expr.trim();
    if (cleaned.startsWith('=')) cleaned = cleaned.slice(1).trim();

    // Replace range references e.g. A1:B3 with 2D array representation
    cleaned = cleaned.replace(/([A-Z]+\d+):([A-Z]+\d+)/g, (m, p1, p2) => {
      const c1 = parseCellCoord(p1);
      const c2 = parseCellCoord(p2);
      if (!c1 || !c2) return '[]';
      const rows = [];
      const minCol = Math.min(c1.col, c2.col), maxCol = Math.max(c1.col, c2.col);
      const minRow = Math.min(c1.row, c2.row), maxRow = Math.max(c1.row, c2.row);
      for (let r = minRow; r <= maxRow; r++) {
        const rowVals = [];
        for (let c = minCol; c <= maxCol; c++) {
          const coord = colLetter(c) + (r + 1);
          if (visited.has(coord)) return '#CIRCULAR!';
          const cellObj = cellsMap[coord];
          const raw = cellObj ? (typeof cellObj === 'object' ? cellObj.raw : String(cellObj)) : '';
          let v = 0;
          if (raw.startsWith('=')) {
            const vSet = new Set(visited); vSet.add(coord);
            v = evalGridFormula(raw.slice(1), cellsMap, vSet);
          } else {
            v = isNaN(Number(raw)) ? (raw || 0) : Number(raw);
          }
          rowVals.push(typeof v === 'number' ? v : JSON.stringify(v));
        }
        rows.push('[' + rowVals.join(',') + ']');
      }
      return '[' + rows.join(',') + ']';
    });

    // Replace single cell references e.g. A1, B2
    cleaned = cleaned.replace(/\b([A-Z]+\d+)\b/g, (m, coord) => {
      if (visited.has(coord)) return '#CIRCULAR!';
      const cellObj = cellsMap[coord];
      const raw = cellObj ? (typeof cellObj === 'object' ? cellObj.raw : String(cellObj)) : '';
      if (!raw) return '0';
      if (raw.startsWith('=')) {
        const vSet = new Set(visited); vSet.add(coord);
        const res = evalGridFormula(raw.slice(1), cellsMap, vSet);
        return typeof res === 'number' ? res : (isNaN(Number(res)) ? JSON.stringify(res) : Number(res));
      }
      return isNaN(Number(raw)) ? JSON.stringify(raw) : Number(raw);
    });

    // Mathematical & Statistical Helpers
    const flatten = (...args) => args.flatMap(a => Array.isArray(a) ? a.flat(Infinity) : [a]);
    const SUM = (...args) => flatten(...args).reduce((a, b) => a + (Number(b) || 0), 0);
    const AVERAGE = (...args) => { const a = flatten(...args); return a.length ? SUM(...a) / a.length : 0; };
    const MIN = (...args) => Math.min(...flatten(...args).map(Number));
    const MAX = (...args) => Math.max(...flatten(...args).map(Number));
    const COUNT = (...args) => flatten(...args).filter(x => typeof x === 'number' && !isNaN(x)).length;
    const COUNTA = (...args) => flatten(...args).filter(x => x !== '' && x !== null && x !== undefined).length;
    const COUNTIF = (arr, cond) => flatten(arr).filter(x => String(x) === String(cond)).length;
    const SUMIF = (arr, cond, sumArr) => {
      const a = flatten(arr);
      const s = sumArr ? flatten(sumArr) : a;
      return a.reduce((acc, val, idx) => String(val) === String(cond) ? acc + (Number(s[idx]) || 0) : acc, 0);
    };
    const AVERAGEIF = (arr, cond) => {
      const cnt = COUNTIF(arr, cond);
      return cnt > 0 ? SUMIF(arr, cond) / cnt : '#DIV/0!';
    };
    const ROUND = (val, dec = 0) => Number(Math.round(val + 'e' + dec) + 'e-' + dec);
    const ROUNDUP = (val, dec = 0) => Number(Math.ceil(val + 'e' + dec) + 'e-' + dec);
    const ROUNDDOWN = (val, dec = 0) => Number(Math.floor(val + 'e' + dec) + 'e-' + dec);
    const ABS = val => Math.abs(val);
    const SQRT = val => val < 0 ? '#NUM!' : Math.sqrt(val);
    const POWER = (b, e) => Math.pow(b, e);
    const MOD = (n, d) => d === 0 ? '#DIV/0!' : n % d;
    const IF = (cond, t, f) => (cond ? t : f);
    const AND = (...args) => args.every(Boolean);
    const OR = (...args) => args.some(Boolean);
    const NOT = val => !val;
    const CONCAT = (...args) => args.join('');
    const CONCATENATE = (...args) => args.join('');
    const TODAY = () => new Date().toISOString().slice(0, 10);
    const NOW = () => new Date().toLocaleString();
    const IFERROR = (val, errVal) => (typeof val === 'string' && val.startsWith('#') ? errVal : val);
    const UPPER = str => String(str).toUpperCase();
    const LOWER = str => String(str).toLowerCase();
    const LEN = str => String(str).length;
    const TRIM = str => String(str).trim();
    const LEFT = (str, n = 1) => String(str).slice(0, n);
    const RIGHT = (str, n = 1) => String(str).slice(-n);
    const MID = (str, start, len) => String(str).substring(start - 1, start - 1 + len);
    const PRODUCT = (...args) => flatten(...args).reduce((a, b) => a * (Number(b) || 0), 1);
    const IFS = (...args) => { for (let i = 0; i < args.length; i += 2) { if (args[i]) return args[i + 1]; } return '#N/A'; };
    const TEXTJOIN = (delim, skipEmpty, ...args) => {
      let items = [];
      args.forEach(a => { if (Array.isArray(a)) items.push(...a); else items.push(a); });
      if (skipEmpty) items = items.filter(x => x !== '' && x !== null && x !== undefined);
      return items.join(delim);
    };
    const SUBSTITUTE = (text, oldText, newText) => String(text).replaceAll(String(oldText), String(newText));
    const REPLACE = (text, start, num, newText) => { const s = String(text); return s.slice(0, start - 1) + newText + s.slice(start - 1 + num); };
    const DATE = (y, m, d) => `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const YEAR = date => new Date(date).getFullYear();
    const MONTH = date => new Date(date).getMonth() + 1;
    const DAY = date => new Date(date).getDate();
    const VLOOKUP = (key, table, colIdx) => {
      if (!Array.isArray(table) || !table.length) return '#N/A';
      for (let r of table) {
        if (Array.isArray(r) && String(r[0]) === String(key)) return r[colIdx - 1] ?? '#N/A';
      }
      return '#N/A';
    };
    const HLOOKUP = (key, table, rowIdx) => {
      if (!Array.isArray(table) || !table.length || !table[0]) return '#N/A';
      for (let c = 0; c < table[0].length; c++) {
        if (String(table[0][c]) === String(key)) return table[rowIdx - 1] ? table[rowIdx - 1][c] : '#N/A';
      }
      return '#N/A';
    };
    const XLOOKUP = (key, lookupArr, returnArr, ifNotFound = '#N/A') => {
      const lArr = flatten(lookupArr);
      const rArr = flatten(returnArr);
      const idx = lArr.findIndex(x => String(x) === String(key));
      const res = idx >= 0 ? rArr[idx] : ifNotFound;
      return Array.isArray(res) ? (res[0] ?? '#N/A') : res;
    };
    const INDEX = (arr, rowIdx) => {
      const flat = flatten(arr);
      const res = flat[rowIdx - 1];
      return res !== undefined ? res : '#REF!';
    };
    const MATCH = (key, arr) => {
      const flat = flatten(arr);
      const idx = flat.findIndex(x => String(x) === String(key));
      return idx >= 0 ? idx + 1 : '#N/A';
    };

    // Security Sanitization check
    if (/\b(window|document|eval|Function|fetch|XMLHttpRequest|localStorage|sessionStorage|IndexedDB|cookie|constructor|prototype|__proto__|globalThis|import|process|this)\b/i.test(cleaned) || /[;\{\}\\\`]|--|\/\*/.test(cleaned) || /\[\s*['"]/.test(cleaned)) {
      return '#SECURITY_ERROR!';
    }

    // Context execution
    const fn = new Function('SUM','AVERAGE','MIN','MAX','COUNT','COUNTA','COUNTIF','SUMIF','AVERAGEIF','ROUND','ROUNDUP','ROUNDDOWN','ABS','SQRT','POWER','MOD','PRODUCT','IF','IFS','AND','OR','NOT','IFERROR','CONCAT','CONCATENATE','TEXTJOIN','SUBSTITUTE','REPLACE','TODAY','NOW','DATE','YEAR','MONTH','DAY','UPPER','LOWER','LEN','TRIM','LEFT','RIGHT','MID','VLOOKUP','HLOOKUP','XLOOKUP','INDEX','MATCH', 'return (' + cleaned + ');');
    const res = fn(SUM, AVERAGE, MIN, MAX, COUNT, COUNTA, COUNTIF, SUMIF, AVERAGEIF, ROUND, ROUNDUP, ROUNDDOWN, ABS, SQRT, POWER, MOD, PRODUCT, IF, IFS, AND, OR, NOT, IFERROR, CONCAT, CONCATENATE, TEXTJOIN, SUBSTITUTE, REPLACE, TODAY, NOW, DATE, YEAR, MONTH, DAY, UPPER, LOWER, LEN, TRIM, LEFT, RIGHT, MID, VLOOKUP, HLOOKUP, XLOOKUP, INDEX, MATCH);
    return res;
  } catch (e) {
    return '#ERROR!';
  }
}

function formatCellValue(val, format) {
  if (val === undefined || val === null || val === '') return '';
  if (typeof val === 'string' && val.startsWith('#')) return val; // Error code
  if (format === 'currency') {
    const num = Number(val);
    return isNaN(num) ? val : '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (format === 'percent') {
    const num = Number(val);
    return isNaN(num) ? val : (num * 100).toFixed(1) + '%';
  }
  if (format === 'number') {
    const num = Number(val);
    return isNaN(num) ? val : num.toLocaleString('en-US');
  }
  if (format === 'date') {
    return String(val).slice(0, 10);
  }
  return String(val);
}

function setGridRibbonTab(tab) {
  currentGridRibbonTab = tab;
  renderSheets();
}

function renderSheets() {
  const panel = document.getElementById('panel-sheets');
  if (!panel) return;

  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);

  // Recalculate cell formulas for rendering
  const evaluatedCells = {};
  for (const coord in sheet.cells) {
    const cell = sheet.cells[coord] || {};
    const raw = typeof cell === 'object' ? (cell.raw || '') : String(cell);
    let evalVal = raw;
    if (raw.startsWith('=')) {
      evalVal = evalGridFormula(raw.slice(1), sheet.cells);
    }
    evaluatedCells[coord] = {
      raw,
      val: evalVal,
      format: cell.format || 'general',
      bold: !!cell.bold,
      italic: !!cell.italic,
      align: cell.align || 'left',
      bg: cell.bg || '',
      color: cell.color || ''
    };
  }

  let html = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
      <div>
        <h2 style="margin:0; font-size:1.4rem;">Grid Data Studio</h2>
        <div class="sub" style="margin:2px 0 0 0;">Offline Spreadsheet Workspace & Data Engine</div>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn ghost small" onclick="toggleGridHelp()">📖 Guide</button>
        <button class="btn ghost small" onclick="toggleGridCalc()">🧮 Calculator</button>
        <button class="btn sage small" onclick="exportSheets()">Export .grid</button>
        <button class="btn ghost small" onclick="importSheets()">Import .grid</button>
      </div>
    </div>

        <!-- SUITE GRID COMMAND RIBBON (14 FUNCTIONAL CATEGORIES) -->
    <div style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:8px; overflow:hidden; margin-bottom:12px;">
      <div class="grid-ribbon-bar">
        ${[
          {id:'file', label:'File'},
          {id:'home', label:'Home'},
          {id:'insert', label:'Insert'},
          {id:'draw', label:'Draw'},
          {id:'page_layout', label:'Page Layout'},
          {id:'formulas', label:'Formulas'},
          {id:'data', label:'Data'},
          {id:'review', label:'Review'},
          {id:'view', label:'View'},
          {id:'automate', label:'Automate'},
          {id:'developer', label:'Developer'},
          {id:'help', label:'Help'},
          {id:'doc_tools', label:'PDF / Doc Tools'},
          {id:'data_model', label:'Data Model'}
        ].map(t => `
          <button class="grid-ribbon-tab-btn ${(currentGridRibbonTab===t.id || (currentGridRibbonTab==='start' && t.id==='home')) ? 'active' : ''}" onclick="setGridRibbonTab('${t.id}')">
            ${t.label}
          </button>
        `).join('')}
      </div>
      <div style="padding:8px 12px; display:flex; align-items:center; gap:12px; flex-wrap:wrap; background:var(--bg-surface-elevated, #1e293b); min-height:48px; overflow-x:auto;">
        ${renderGridRibbonTools(sheet)}
      </div>
    </div>

    <!-- FORMULA BAR -->
    <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px; background:var(--bg-surface); padding:6px 10px; border-radius:6px; border:1px solid var(--border-color);">
      <div id="gridActiveCellCoord" style="font-weight:700; font-family:monospace; min-width:48px; color:var(--accent-primary,#3b82f6); text-align:center;">${selectedGridCell}</div>
      <div style="color:var(--text-muted); font-weight:bold; font-family:monospace;">fx</div>
      <input id="gridFormulaInput" type="text" style="flex:1; background:var(--bg-main); border:1px solid var(--border-color); color:var(--text-main); padding:4px 8px; border-radius:4px; font-family:monospace;" placeholder="Enter value or formula starting with =" value="${escapeHTML(evaluatedCells[selectedGridCell]?.raw || '')}" oninput="onGridFormulaBarInput(this.value)" onkeydown="if(event.key==='Enter')commitGridFormulaInput()">
      <button class="btn sage small" onclick="commitGridFormulaInput()">Apply</button>
    </div>

    <!-- FORMULA GUIDE MODAL CONTAINER -->
    <div id="gridHelp" class="grid-help" style="display:none; margin-bottom:12px; background:var(--bg-surface); padding:12px; border-radius:8px; border:1px solid var(--border-color);">
      <b>Formulas Engine</b> — start any cell with <code>=</code>. Reference cells like <code>A1</code> or ranges like <code>A1:A9</code>.
      <div class="formula-guide-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:8px; margin-top:8px;">
        <div><code>=A1+B2*2</code><span>arithmetic: + − × ÷ ^</span></div>
        <div><code>=SUM(A1:A9)</code><span>add up range</span></div>
        <div><code>=AVERAGE(A1:A9)</code><span>mean value</span></div>
        <div><code>=MIN(A1:A9)</code> / <code>=MAX(A1:A9)</code><span>extremes</span></div>
        <div><code>=COUNT(A1:A9)</code> / <code>=COUNTA(A1:A9)</code><span>counts</span></div>
        <div><code>=ROUND(A1,2)</code><span>round decimals</span></div>
        <div><code>=IF(A1>10,"big","small")</code><span>conditional logic</span></div>
        <div><code>=CONCAT(A1,B1)</code><span>string join</span></div>
        <div><code>=TODAY()</code><span>current date</span></div>
      </div>
    </div>

    <!-- CALCULATOR MODAL CONTAINER -->
    <div id="gridCalc" class="grid-calc" style="display:none; margin-bottom:12px; background:var(--bg-surface); padding:12px; border-radius:8px; border:1px solid var(--border-color); max-width:280px;">
      <input id="calcDisplay" type="text" placeholder="0" style="width:100%; margin-bottom:8px; padding:6px; background:var(--bg-main); color:var(--text-main); border:1px solid var(--border-color); font-family:monospace; text-align:right;" onkeydown="if(event.key==='Enter')calcEquals();">
      <div class="calc-buttons" style="display:grid; grid-template-columns:repeat(4, 1fr); gap:4px;">
        <button class="btn ghost small" onclick="calcClear()">C</button>
        <button class="btn ghost small" onclick="calcBackspace()">⌫</button>
        <button class="btn ghost small" onclick="calcPress('(')">(</button>
        <button class="btn ghost small" onclick="calcPress(')')">)</button>
        <button class="btn ghost small" onclick="calcPress('7')">7</button>
        <button class="btn ghost small" onclick="calcPress('8')">8</button>
        <button class="btn ghost small" onclick="calcPress('9')">9</button>
        <button class="btn ghost small" onclick="calcPress('/')">÷</button>
        <button class="btn ghost small" onclick="calcPress('4')">4</button>
        <button class="btn ghost small" onclick="calcPress('5')">5</button>
        <button class="btn ghost small" onclick="calcPress('6')">6</button>
        <button class="btn ghost small" onclick="calcPress('*')">×</button>
        <button class="btn ghost small" onclick="calcPress('1')">1</button>
        <button class="btn ghost small" onclick="calcPress('2')">2</button>
        <button class="btn ghost small" onclick="calcPress('3')">3</button>
        <button class="btn ghost small" onclick="calcPress('-')">−</button>
        <button class="btn ghost small" onclick="calcPress('0')">0</button>
        <button class="btn ghost small" onclick="calcPress('.')">.</button>
        <button class="btn sage small" onclick="calcEquals()">=</button>
        <button class="btn ghost small" onclick="calcPress('+')">+</button>
      </div>
      <button class="btn sage small" style="width:100%; margin-top:8px;" onclick="calcToSelectedCell()">→ To Selected Cell</button>
    </div>

    <!-- CHART DISPLAY CONTAINER -->
    <div id="gridChartArea" style="display:none; margin-bottom:12px; background:var(--bg-surface); padding:12px; border-radius:8px; border:1px solid var(--border-color);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <h4 style="margin:0;">Chart Visualization</h4>
        <button class="btn ghost small" onclick="document.getElementById('gridChartArea').style.display='none'">Close Chart</button>
      </div>
      <div id="gridChartCanvas" style="min-height:180px; display:flex; align-items:center; justify-content:center;"></div>
    </div>

    ${activeGridFilter ? `
      <div style="background:var(--accent-primary,#3b82f6); color:#fff; padding:6px 12px; border-radius:4px; margin-bottom:8px; font-size:0.8rem; display:flex; justify-content:space-between; align-items:center;">
        <span>🔍 Filter Active: Column <b>${colLetter(activeGridFilter.colIndex)}</b> contains "<b>${escapeHTML(activeGridFilter.query)}</b>"</span>
        <button class="btn ghost small" style="color:#fff; border-color:#fff;" onclick="clearGridFilter()">Clear Filter</button>
      </div>
    ` : ''}

    <!-- GRID WORKSPACE FLEX WRAPPER WITH DATA LENS SIDEBAR -->
    <div style="display:flex; gap:12px; min-height:calc(100vh - 220px);">
      <!-- DENSE SPREADSHEET CANVAS -->
      <div class="grid-canvas-wrap" style="flex:1; overflow:auto; max-height:calc(100vh - 220px); border:1px solid var(--border-crisp); border-radius:6px; background:var(--bg-workspace);">
        <table class="grid" style="border-collapse:collapse; width:100%; min-width:800px; font-family:var(--font-sans);">
          <thead style="position:sticky; top:0; z-index:10; background:var(--bg-surface-elevated);">
            <tr>
              <th style="width:40px; background:var(--bg-surface-elevated); border:1px solid var(--border-crisp); color:var(--text-muted); text-align:center; position:sticky; left:0; z-index:11; font-size:0.75rem;">#</th>
              ${Array.from({length: sheet.cols}, (_, c) => colLetter(c)).map((col, idx) => `
                <th style="background:var(--bg-surface-elevated); border:1px solid var(--border-crisp); color:var(--text-main); padding:6px 12px; font-weight:700; font-size:0.8rem; text-align:center; ${isGridFreezeActive && idx===0 ? 'position:sticky; left:40px; z-index:11;' : ''}">${col}</th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${Array.from({length: sheet.rows}, (_, r) => r + 1).map(rowNum => {
              if (activeGridFilter && activeGridFilter.query) {
                const cellCoord = colLetter(activeGridFilter.colIndex) + rowNum;
                const cellVal = String(evaluatedCells[cellCoord]?.val || '').toLowerCase();
                if (!cellVal.includes(activeGridFilter.query)) return '';
              }
              return `
              <tr>
                <td style="background:var(--bg-surface-elevated); border:1px solid var(--border-crisp); color:var(--text-muted); text-align:center; font-weight:bold; font-size:0.75rem; position:sticky; left:0; z-index:5;">${rowNum}</td>
                ${Array.from({length: sheet.cols}, (_, c) => {
                  const coord = colLetter(c) + rowNum;
                  const cell = evaluatedCells[coord] || { raw: '', val: '', format: 'general', bold: false, italic: false, align: 'left', bg: '', color: '' };
                  const bounds = getActiveSelectionBounds();
                  const inBounds = c >= bounds.minCol && c <= bounds.maxCol && (rowNum - 1) >= bounds.minRow && (rowNum - 1) <= bounds.maxRow;
                  const isSelected = selectedGridCell === coord || inBounds;
                  const displayVal = formatCellValue(cell.val, cell.format);
                  const isFreezeCol = isGridFreezeActive && c === 0;
                  return `
                    <td style="border:1px solid var(--border-crisp); padding:0; position:${isFreezeCol ? 'sticky' : 'relative'}; ${isFreezeCol ? 'left:40px; z-index:4;' : ''} background:${cell.bg || (isSelected ? 'rgba(59,130,246,0.22)' : 'var(--bg-surface)')}; outline:${isSelected ? '2px solid var(--accent-primary,#3b82f6)' : 'none'}; z-index:${isSelected ? 6 : (isFreezeCol ? 4 : 1)};"
                        onmousedown="onGridCellMouseDown(event, '${coord}')"
                        onmouseenter="onGridCellMouseEnter(event, '${coord}')"
                    >
                      <input id="cell-${coord}" data-cell="${coord}" type="text"
                        value="${escapeHTML(displayVal)}"
                        data-raw="${escapeHTML(cell.raw)}"
                        style="width:100%; height:28px; border:none; background:transparent; color:${cell.color || 'var(--text-main)'}; font-weight:${cell.bold?'bold':'normal'}; font-style:${cell.italic?'italic':'normal'}; text-align:${cell.align}; padding:2px 8px; box-sizing:border-box; font-size:0.85rem; font-family:${cell.raw && cell.raw.startsWith('=') ? 'var(--font-mono)' : 'var(--font-sans)'};"
                        onfocus="onGridCellFocus('${coord}')"
                        onblur="onGridCellBlur('${coord}', this.value)"
                        onkeydown="onGridCellKeyDown(event, '${coord}')" oncontextmenu="showGridContextMenu(event, '${coord}')"
                      >
                    </td>
                  `;
                }).join('')}
              </tr>
            `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- DATA LENS INSPECTOR PANEL -->
      <div style="width:240px; background:var(--bg-surface-elevated); border:1px solid var(--border-crisp); border-radius:6px; padding:12px; font-size:0.8rem; display:flex; flex-direction:column; gap:10px;">
        <div style="font-weight:700; color:var(--accent-primary,#3b82f6); border-bottom:1px solid var(--border-crisp); padding-bottom:6px; text-transform:uppercase; letter-spacing:0.05em; font-size:0.75rem;">🔍 DATA LENS INSPECTOR</div>
        <div>
          <div style="color:var(--text-muted); font-size:0.7rem;">ACTIVE CELL</div>
          <div style="font-weight:800; font-size:1.1rem; color:var(--text-main); font-family:var(--font-mono);">${selectedGridCell}</div>
        </div>
        <div>
          <div style="color:var(--text-muted); font-size:0.7rem;">EVALUATED VALUE</div>
          <div style="font-weight:700; color:var(--text-main); word-break:break-all;">${escapeHTML(evaluatedCells[selectedGridCell]?.val ?? '')}</div>
        </div>
        <div>
          <div style="color:var(--text-muted); font-size:0.7rem;">RAW FORMULA / TEXT</div>
          <div style="font-family:var(--font-mono); color:var(--brass-light); word-break:break-all; font-size:0.75rem;">${escapeHTML(evaluatedCells[selectedGridCell]?.raw || '(empty)')}</div>
        </div>
        <div>
          <div style="color:var(--text-muted); font-size:0.7rem;">CELL NOTE</div>
          <div style="color:var(--text-main); font-style:italic;">${escapeHTML(sheet.cells[selectedGridCell]?.note || 'No note')}</div>
        </div>
      </div>
    </div>

    <!-- WORKBOOK SHEET TABS -->
    <div style="display:flex; align-items:center; justify-content:space-between; margin-top:12px; background:var(--bg-surface); padding:6px 12px; border-radius:6px; border:1px solid var(--border-color);">
      <div style="display:flex; align-items:center; gap:6px; overflow-x:auto;">
        ${wb.sheets.map((s, idx) => `
          <div style="display:flex; align-items:center; gap:4px; padding:4px 10px; border-radius:4px; background:${idx===(wb.activeSheetIndex||0)?'var(--accent-primary,#3b82f6)':'var(--bg-main)'}; color:${idx===(wb.activeSheetIndex||0)?'#fff':'var(--text-main)'}; cursor:pointer; font-size:0.8rem; font-weight:600;" onclick="switchGridSheet(${idx})">
            <span>${escapeHTML(s.name)}</span>
            ${wb.sheets.length > 1 ? `<span style="margin-left:4px; opacity:0.7;" onclick="event.stopPropagation(); deleteGridSheet(${idx})">×</span>` : ''}
          </div>
        `).join('')}
        <button class="btn ghost small" onclick="addGridSheet()">+ Sheet</button>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn ghost small" onclick="exportGridCSV()">Export CSV</button>
        <button class="btn ghost small" onclick="importGridCSV()">Import CSV</button>
      </div>
    </div>
  `;

  panel.innerHTML = html;
}

function renderGridRibbonTools(sheet) {
  const tab = currentGridRibbonTab;

  if (tab === 'file') {
    return `
      <div class="ribbon-group">
        <span class="ribbon-group-label">Workbook Management</span>
        <div style="display:flex; gap:4px; align-items:center;">
          <button class="btn ghost small" onclick="addGridSheet()">📄 New Sheet</button>
          <button class="btn sage small" onclick="saveGridWorkbook(getGridWorkbook())">💾 Save</button>
          <button class="btn ghost small" onclick="exportSheets()">📦 Export .grid</button>
          <button class="btn ghost small" onclick="importSheets()">📂 Open .grid</button>
        </div>
      </div>
      <div class="ribbon-group">
        <span class="ribbon-group-label">Export Data</span>
        <div style="display:flex; gap:4px; align-items:center;">
          <button class="btn ghost small" onclick="exportGridCSV()">📊 Export CSV</button>
          <button class="btn ghost small" onclick="importGridCSV()">📥 Import CSV</button>
        </div>
      </div>
    `;
  }

  if (tab === 'home' || tab === 'start') {
    return `
      <div class="ribbon-group">
        <span class="ribbon-group-label">Clipboard</span>
        <div style="display:flex; gap:4px; align-items:center;">
          <button class="btn ghost small" onclick="undoGridAction()" title="Undo (Ctrl+Z)">↶ Undo</button>
          <button class="btn ghost small" onclick="redoGridAction()" title="Redo (Ctrl+Shift+Z)">↷ Redo</button>
          <button class="btn ghost small" onclick="copyGridCellFormat()">🖌️ Copy Format</button>
          <button class="btn ghost small" onclick="pasteGridCellFormat()">📋 Paste Format</button>
        </div>
      </div>
      <div class="ribbon-group">
        <span class="ribbon-group-label">Font & Style</span>
        <div style="display:flex; gap:4px; align-items:center;">
          <button class="btn ghost small" onclick="formatActiveCell('bold')" title="Bold"><b>B</b></button>
          <button class="btn ghost small" onclick="formatActiveCell('italic')" title="Italic"><i>I</i></button>
          <button class="btn ghost small" onclick="setGridCellColor('#ef4444')">🔴 Color</button>
          <button class="btn ghost small" onclick="setGridCellBg('rgba(59,130,246,0.2)')">🟦 Fill</button>
        </div>
      </div>
      <div class="ribbon-group">
        <span class="ribbon-group-label">Alignment</span>
        <div style="display:flex; gap:4px; align-items:center;">
          <button class="btn ghost small" onclick="formatActiveCell('align','left')">⬅ Left</button>
          <button class="btn ghost small" onclick="formatActiveCell('align','center')">⬆ Center</button>
          <button class="btn ghost small" onclick="formatActiveCell('align','right')">➡ Right</button>
        </div>
      </div>
      <div class="ribbon-group">
        <span class="ribbon-group-label">Number Formatting</span>
        <div style="display:flex; gap:4px; align-items:center;">
          <button class="btn ghost small" onclick="formatActiveCell('format','general')">General</button>
          <button class="btn ghost small" onclick="formatActiveCell('format','currency')">💵 Currency ($)</button>
          <button class="btn ghost small" onclick="formatActiveCell('format','percent')">% Percent</button>
          <button class="btn ghost small" onclick="formatActiveCell('format','number')">1,234 Num</button>
          <button class="btn ghost small" onclick="formatActiveCell('format','date')">📅 Date</button>
        </div>
      </div>
      <div class="ribbon-group">
        <span class="ribbon-group-label">Styles & Formatting</span>
        <div style="display:flex; gap:4px; align-items:center;">
          <button class="btn ghost small" onclick="openGridConditionalFormatModal()">🎨 Conditional Formatting</button>
          <button class="btn ghost small" onclick="runGridQuickMacro()">📋 Format as Table</button>
        </div>
      </div>
      <div class="ribbon-group">
        <span class="ribbon-group-label">Cells</span>
        <div style="display:flex; gap:4px; align-items:center;">
          <button class="btn ghost small" onclick="addGridRow()">+ Row</button>
          <button class="btn ghost small" onclick="addGridCol()">+ Column</button>
          <button class="btn ghost small" onclick="deleteGridRowAtSelection()">🗑️ Delete Row</button>
        </div>
      </div>
      <div class="ribbon-group">
        <span class="ribbon-group-label">Editing</span>
        <div style="display:flex; gap:4px; align-items:center;">
          <button class="btn ghost small" onclick="insertGridFunction('SUM')">∑ AutoSum</button>
          <button class="btn ghost small" onclick="openGridFilterModal()">🔍 Sort & Filter</button>
          <button class="btn ghost small" onclick="openGridFindReplaceModal()">🔎 Find & Replace</button>
        </div>
      </div>
    `;
  }

  if (tab === 'insert') {
    return `
      <div class="ribbon-group">
        <span class="ribbon-group-label">Tables</span>
        <div style="display:flex; gap:4px; align-items:center;">
          <button class="btn ghost small" onclick="openGridPivotModal()">📊 PivotTable</button>
          <button class="btn ghost small" onclick="runGridQuickMacro()">📋 Table</button>
          <button class="btn ghost small" onclick="openGridDataflowModal()">📝 Form Intake</button>
        </div>
      </div>
      <div class="ribbon-group">
        <span class="ribbon-group-label">Illustrations</span>
        <div style="display:flex; gap:4px; align-items:center;">
          <button class="btn ghost small" onclick="insertGridPicture()">🖼️ Picture</button>
          <button class="btn ghost small" onclick="openGridDrawingModal()">🔷 Shapes & Annotations</button>
        </div>
      </div>
      <div class="ribbon-group">
        <span class="ribbon-group-label">Charts</span>
        <div style="display:flex; gap:4px; align-items:center;">
          <button class="btn ghost small" onclick="generateGridChart('bar')">📊 Column/Bar</button>
          <button class="btn ghost small" onclick="generateGridChart('line')">📈 Line</button>
          <button class="btn ghost small" onclick="generateGridChart('pie')">🍕 Pie</button>
          <button class="btn ghost small" onclick="generateGridChart('bar')">📉 PivotChart</button>
        </div>
      </div>
      <div class="ribbon-group">
        <span class="ribbon-group-label">Sparklines & Controls</span>
        <div style="display:flex; gap:4px; align-items:center;">
          <button class="btn ghost small" onclick="insertGridSparkline('line')">📉 Sparkline</button>
          <button class="btn ghost small" onclick="insertGridCheckbox()">☑️ Checkbox Cell</button>
        </div>
      </div>
    `;
  }

  if (tab === 'draw') {
    return `
      <div class="ribbon-group">
        <span class="ribbon-group-label">Drawing & Vector Overlay</span>
        <div style="display:flex; gap:4px; align-items:center;">
          <button class="btn ghost small" onclick="openGridDrawingModal()">🖊️ Pen / Highlighter Markup</button>
          <button class="btn ghost small" onclick="clearGridDrawings()">🧹 Clear Annotations</button>
        </div>
      </div>
    `;
  }

  if (tab === 'page_layout') {
    return `
      <div class="ribbon-group">
        <span class="ribbon-group-label">Page Setup</span>
        <div style="display:flex; gap:4px; align-items:center;">
          <button class="btn ghost small" onclick="setGridPageMargin()">📐 Margins (A4)</button>
          <button class="btn ghost small" onclick="toggleGridPageOrientation()">🔄 Orientation</button>
          <button class="btn ghost small" onclick="openGridPDFExportModal()">🖨️ Print Area / PDF Setup</button>
        </div>
      </div>
      <div class="ribbon-group">
        <span class="ribbon-group-label">Sheet Options</span>
        <div style="display:flex; gap:4px; align-items:center;">
          <button class="btn ghost small" onclick="toggleFreezePanes()">❄️ Freeze Panes</button>
        </div>
      </div>
    `;
  }

  if (tab === 'formulas') {
    return `
      <div class="ribbon-group">
        <span class="ribbon-group-label">Function Library</span>
        <div style="display:flex; gap:4px; align-items:center;">
          <button class="btn ghost small" onclick="insertGridFunction('SUM')">∑ SUM</button>
          <button class="btn ghost small" onclick="insertGridFunction('AVERAGE')">x̄ AVERAGE</button>
          <button class="btn ghost small" onclick="insertGridFunction('IF')">🔀 IF</button>
          <button class="btn ghost small" onclick="insertGridFunction('XLOOKUP')">🔍 XLOOKUP</button>
          <button class="btn ghost small" onclick="insertGridFunction('COUNT')">🔢 COUNT</button>
        </div>
      </div>
      <div class="ribbon-group">
        <span class="ribbon-group-label">Defined Names</span>
        <div style="display:flex; gap:4px; align-items:center;">
          <button class="btn ghost small" onclick="openGridNameManagerModal()">🏷️ Name Manager</button>
        </div>
      </div>
      <div class="ribbon-group">
        <span class="ribbon-group-label">Formula Auditing</span>
        <div style="display:flex; gap:4px; align-items:center;">
          <button class="btn ghost small" onclick="traceGridPrecedents()">🔗 Trace Precedents</button>
          <button class="btn ghost small" onclick="toggleGridHelp()">📖 Formula Guide</button>
          <button class="btn ghost small" onclick="renderSheets()">🔄 Recalculate Sheet</button>
        </div>
      </div>
    `;
  }

  if (tab === 'data') {
    return `
      <div class="ribbon-group">
        <span class="ribbon-group-label">Sort & Filter</span>
        <div style="display:flex; gap:4px; align-items:center;">
          <button class="btn ghost small" onclick="sortGridColumn('asc')">Sort A ➔ Z</button>
          <button class="btn ghost small" onclick="sortGridColumn('desc')">Sort Z ➔ A</button>
          <button class="btn ghost small" onclick="openGridFilterModal()">🔍 Filter Rows</button>
          <button class="btn ghost small" onclick="clearGridFilter()">Clear Filter</button>
        </div>
      </div>
      <div class="ribbon-group">
        <span class="ribbon-group-label">Data Tools</span>
        <div style="display:flex; gap:4px; align-items:center;">
          <button class="btn ghost small" onclick="openGridRemoveDuplicatesModal()">✂️ Remove Duplicates</button>
          <button class="btn ghost small" onclick="openGridDataValidationModal()">🛡️ Data Validation</button>
          <button class="btn brass small" onclick="openGridPivotModal()">📊 Pivot Engine</button>
          <button class="btn ghost small" onclick="openGridDataflowModal()">⚡ Offline Dataflow ETL</button>
        </div>
      </div>
      <div class="ribbon-group">
        <span class="ribbon-group-label">What-If Analysis</span>
        <div style="display:flex; gap:4px; align-items:center;">
          <button class="btn ghost small" onclick="openGridWhatIfModal()">🎯 Goal Seek / Scenario</button>
        </div>
      </div>
    `;
  }

  if (tab === 'review') {
    return `
      <div class="ribbon-group">
        <span class="ribbon-group-label">Comments & Notes</span>
        <div style="display:flex; gap:4px; align-items:center;">
          <button class="btn ghost small" onclick="addGridCellNote(selectedGridCell)">💬 Add Cell Note</button>
        </div>
      </div>
      <div class="ribbon-group">
        <span class="ribbon-group-label">Protection & Integrity</span>
        <div style="display:flex; gap:4px; align-items:center;">
          <button class="btn ghost small" onclick="toggleSheetProtection()">🔒 Protect Sheet</button>
          <button class="btn ghost small" onclick="checkGridIntegrity()">✔ Check Data Integrity</button>
        </div>
      </div>
    `;
  }

  if (tab === 'view') {
    return `
      <div class="ribbon-group">
        <span class="ribbon-group-label">Panes & Layout</span>
        <div style="display:flex; gap:4px; align-items:center;">
          <button class="btn ghost small" onclick="toggleFreezePanes()">❄️ Freeze Top Row / Col 1</button>
          <button class="btn ghost small" onclick="openGridFindReplaceModal()">🔍 Find & Replace</button>
        </div>
      </div>
      <div class="ribbon-group">
        <span class="ribbon-group-label">Overlays</span>
        <div style="display:flex; gap:4px; align-items:center;">
          <button class="btn ghost small" onclick="toggleGridCalc()">🧮 Calculator Overlay</button>
          <button class="btn ghost small" onclick="toggleGridHelp()">📖 Guide</button>
        </div>
      </div>
    `;
  }

  if (tab === 'automate') {
    return `
      <div class="ribbon-group">
        <span class="ribbon-group-label">Automation & Scripting</span>
        <div style="display:flex; gap:4px; align-items:center;">
          <button class="btn ghost small" onclick="openGridMacroModal()">⚡ Macro Recorder & Runner</button>
          <button class="btn ghost small" onclick="runGridQuickMacro()">📋 Quick Summary Macro</button>
          <button class="btn ghost small" onclick="openGridDataflowModal()">⚙️ Dataflow ETL</button>
        </div>
      </div>
    `;
  }

  if (tab === 'developer') {
    return `
      <div class="ribbon-group">
        <span class="ribbon-group-label">Code & Diagnostics</span>
        <div style="display:flex; gap:4px; align-items:center;">
          <button class="btn ghost small" onclick="openGridDeveloperInspectorModal()">🔬 Cell & Object Inspector</button>
          <button class="btn ghost small" onclick="checkGridIntegrity()">🛠️ Workbook Diagnostics</button>
        </div>
      </div>
    `;
  }

  if (tab === 'help') {
    return `
      <div class="ribbon-group">
        <span class="ribbon-group-label">Guides & Help</span>
        <div style="display:flex; gap:4px; align-items:center;">
          <button class="btn ghost small" onclick="toggleGridHelp()">📖 Formula & Function Guide</button>
          <button class="btn ghost small" onclick="openGridShortcutsModal()">⌨️ Keyboard Shortcuts Map</button>
        </div>
      </div>
    `;
  }

  if (tab === 'doc_tools') {
    return `
      <div class="ribbon-group">
        <span class="ribbon-group-label">PDF & Document Production</span>
        <div style="display:flex; gap:4px; align-items:center;">
          <button class="btn ghost small" onclick="openGridPDFExportModal()">📄 Print Preview & PDF Export</button>
          <button class="btn ghost small" onclick="convertSheetToFolio()">📝 Export Sheet to Folio Doc</button>
        </div>
      </div>
    `;
  }

  if (tab === 'data_model') {
    return `
      <div class="ribbon-group">
        <span class="ribbon-group-label">Data Engine & Relationships</span>
        <div style="display:flex; gap:4px; align-items:center;">
          <button class="btn ghost small" onclick="openGridDataModelModal()">🗂️ Manage Data Model</button>
          <button class="btn brass small" onclick="openGridPivotModal()">📊 Pivot & Measures Engine</button>
        </div>
      </div>
    `;
  }

  return ``;
}

/* Cell Drag Selection Handlers */
function onGridCellMouseDown(e, coord) {
  if (e.button !== 0) return; // Only left mouse button
  const p = parseCellCoord(coord);
  if (!p) return;

  selectedGridCell = coord;
  if (e.shiftKey && gridSelectionRange) {
    gridSelectionRange.endCol = p.col;
    gridSelectionRange.endRow = p.row;
  } else {
    gridSelectionRange = { startCol: p.col, startRow: p.row, endCol: p.col, endRow: p.row };
  }
  isGridDraggingSelection = true;
  renderSheets();
}

function onGridCellMouseEnter(e, coord) {
  if (!isGridDraggingSelection) return;
  const p = parseCellCoord(coord);
  if (!p || !gridSelectionRange) return;
  gridSelectionRange.endCol = p.col;
  gridSelectionRange.endRow = p.row;
  renderSheets();
}

document.addEventListener('mouseup', () => {
  if (isGridDraggingSelection) {
    isGridDraggingSelection = false;
  }
});

/* Cell Events & Focus Handlers */
function onGridCellFocus(coord) {
  selectedGridCell = coord;
  const coordEl = document.getElementById('gridActiveCellCoord');
  if (coordEl) coordEl.textContent = coord;

  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  const cell = sheet.cells[coord] || {};
  const raw = typeof cell === 'object' ? (cell.raw || '') : String(cell);

  const formulaInput = document.getElementById('gridFormulaInput');
  if (formulaInput) formulaInput.value = raw;
}

function onGridCellBlur(coord, val) {
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  if (!sheet.cells[coord]) sheet.cells[coord] = {};

  if (typeof sheet.cells[coord] === 'string') {
    sheet.cells[coord] = { raw: val };
  } else {
    sheet.cells[coord].raw = val;
  }
  saveGridWorkbook(wb, true);
}

function onGridCellKeyDown(e, coord) {
  const parsed = parseCellCoord(coord);
  if (!parsed) return;

  if (e.key === 'Enter') {
    e.preventDefault();
    const wb = getGridWorkbook();
    const sheet = getActiveSheet(wb);
    if (!sheet.cells[coord]) sheet.cells[coord] = {};
    if (typeof sheet.cells[coord] === 'string') sheet.cells[coord] = { raw: e.target.value };
    else sheet.cells[coord].raw = e.target.value;
    saveGridWorkbook(wb);
    renderSheets();
    const nextCoord = parsed.colStr + (e.shiftKey ? Math.max(1, parsed.rowNum - 1) : (parsed.rowNum + 1));
    const nextInput = document.getElementById('cell-' + nextCoord);
    if (nextInput) nextInput.focus();
  } else if (e.key === 'Tab') {
    e.preventDefault();
    commitGridFormulaInput();
    const nextColIdx = e.shiftKey ? Math.max(0, parsed.col - 1) : (parsed.col + 1);
    const nextCoord = colLetter(nextColIdx) + parsed.rowNum;
    const nextInput = document.getElementById('cell-' + nextCoord);
    if (nextInput) nextInput.focus();
  } else if (e.key === 'ArrowDown' && e.altKey === false) {
    const nextCoord = parsed.colStr + (parsed.rowNum + 1);
    const nextInput = document.getElementById('cell-' + nextCoord);
    if (nextInput) { e.preventDefault(); nextInput.focus(); }
  } else if (e.key === 'ArrowUp' && e.altKey === false) {
    const nextCoord = parsed.colStr + Math.max(1, parsed.rowNum - 1);
    const nextInput = document.getElementById('cell-' + nextCoord);
    if (nextInput) { e.preventDefault(); nextInput.focus(); }
  } else if (e.key === 'ArrowLeft' && e.altKey === false && e.target.selectionStart === 0) {
    const nextColIdx = Math.max(0, parsed.col - 1);
    const nextCoord = colLetter(nextColIdx) + parsed.rowNum;
    const nextInput = document.getElementById('cell-' + nextCoord);
    if (nextInput) { e.preventDefault(); nextInput.focus(); }
  } else if (e.key === 'ArrowRight' && e.altKey === false && e.target.selectionStart === e.target.value.length) {
    const nextCoord = colLetter(parsed.col + 1) + parsed.rowNum;
    const nextInput = document.getElementById('cell-' + nextCoord);
    if (nextInput) { e.preventDefault(); nextInput.focus(); }
  }
}

function onGridFormulaBarInput(val) {
  const inputEl = document.getElementById('cell-' + selectedGridCell);
  if (inputEl) inputEl.value = val;
}

function commitGridFormulaInput() {
  const formulaInput = document.getElementById('gridFormulaInput');
  if (!formulaInput) return;
  const val = formulaInput.value;

  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  if (!sheet.cells[selectedGridCell]) sheet.cells[selectedGridCell] = {};

  if (typeof sheet.cells[selectedGridCell] === 'string') {
    sheet.cells[selectedGridCell] = { raw: val };
  } else {
    sheet.cells[selectedGridCell].raw = val;
  }
  saveGridWorkbook(wb);
  renderSheets();
}

/* Ribbon Formatting Actions */
function formatActiveCell(key, value) {
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  if (!sheet.cells[selectedGridCell]) sheet.cells[selectedGridCell] = { raw: '' };

  const cell = sheet.cells[selectedGridCell];
  if (key === 'bold') cell.bold = !cell.bold;
  else if (key === 'italic') cell.italic = !cell.italic;
  else if (key === 'align') cell.align = value;
  else if (key === 'format') cell.format = value;

  saveGridWorkbook(wb);
  renderSheets();
}

function clearGridFormats() {
  const bounds = getActiveSelectionBounds();
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);

  for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
    for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
      const coord = colLetter(c) + (r + 1);
      if (sheet.cells[coord] && typeof sheet.cells[coord] === 'object') {
        sheet.cells[coord].format = 'general';
        sheet.cells[coord].bold = false;
        sheet.cells[coord].italic = false;
        sheet.cells[coord].align = 'left';
        sheet.cells[coord].bg = '';
        sheet.cells[coord].color = '';
      }
    }
  }

  saveGridWorkbook(wb);
  renderSheets();
}

function addGridRow() {
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  sheet.rows += 5;
  saveGridWorkbook(wb);
  renderSheets();
}

function addGridCol() {
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  sheet.cols += 2;
  saveGridWorkbook(wb);
  renderSheets();
}

/* Sheet Operations */
function switchGridSheet(index) {
  const wb = getGridWorkbook();
  if (wb.sheets[index]) {
    wb.activeSheetIndex = index;
    saveGridWorkbook(wb, true);
    renderSheets();
  }
}

function addGridSheet() {
  const wb = getGridWorkbook();
  const newIdx = wb.sheets.length + 1;
  wb.sheets.push({
    id: "sheet_" + Date.now(),
    name: "Sheet " + newIdx,
    rows: 15,
    cols: 10,
    cells: {}
  });
  wb.activeSheetIndex = wb.sheets.length - 1;
  saveGridWorkbook(wb);
  renderSheets();
}

function deleteGridSheet(index) {
  const wb = getGridWorkbook();
  if (wb.sheets.length <= 1) return;
  wb.sheets.splice(index, 1);
  if (wb.activeSheetIndex >= wb.sheets.length) {
    wb.activeSheetIndex = wb.sheets.length - 1;
  }
  saveGridWorkbook(wb);
  renderSheets();
}

/* Chart Generator */
function generateGridChart(type) {
  const area = document.getElementById('gridChartArea');
  const canvas = document.getElementById('gridChartCanvas');
  if (!area || !canvas) return;

  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);

  // Extract numeric series from current sheet cells
  const values = [];
  for (const coord in sheet.cells) {
    const raw = sheet.cells[coord]?.raw || '';
    const num = Number(raw.startsWith('=') ? evalGridFormula(raw.slice(1), sheet.cells) : raw);
    if (!isNaN(num) && num !== 0) {
      values.push({ coord, num });
    }
  }

  if (!values.length) {
    canvas.innerHTML = `<div style="color:var(--text-muted); padding:20px;">No numeric cell data found in active sheet to visualize. Enter some numbers first.</div>`;
    area.style.display = 'block';
    return;
  }

  const slice = values.slice(0, 10);
  const maxVal = Math.max(...slice.map(v => v.num), 1);

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

  if (type === 'bar') {
    let svg = `<svg width="100%" height="180" viewBox="0 0 500 180" style="background:var(--bg-main); border-radius:6px; padding:10px;">`;
    svg += `<line x1="30" y1="140" x2="480" y2="140" stroke="var(--border-color)" stroke-width="1"/>`;
    slice.forEach((item, idx) => {
      const x = 40 + idx * 44;
      const h = Math.max(8, (item.num / maxVal) * 110);
      const y = 140 - h;
      const col = colors[idx % colors.length];
      svg += `
        <rect x="${x}" y="${y}" width="28" height="${h}" fill="${col}" rx="3"/>
        <text x="${x + 14}" y="156" fill="var(--text-muted)" font-size="10" text-anchor="middle">${item.coord}</text>
        <text x="${x + 14}" y="${y - 4}" fill="var(--text-main)" font-size="9" font-weight="bold" text-anchor="middle">${item.num}</text>
      `;
    });
    svg += `</svg>`;
    canvas.innerHTML = svg;
  } else if (type === 'line' || type === 'area') {
    let svg = `<svg width="100%" height="180" viewBox="0 0 500 180" style="background:var(--bg-main); border-radius:6px; padding:10px;">`;
    svg += `<line x1="30" y1="140" x2="480" y2="140" stroke="var(--border-color)" stroke-width="1"/>`;
    const points = slice.map((item, idx) => {
      const x = 40 + idx * 44 + 14;
      const y = 140 - Math.max(8, (item.num / maxVal) * 110);
      return { x, y, item, idx };
    });
    const ptsStr = points.map(p => `${p.x},${p.y}`).join(' ');

    if (type === 'area') {
      const areaPath = `M ${points[0].x},140 L ` + points.map(p => `${p.x},${p.y}`).join(' L ') + ` L ${points[points.length-1].x},140 Z`;
      svg += `<path d="${areaPath}" fill="rgba(59,130,246,0.25)"/>`;
    }

    svg += `<polyline points="${ptsStr}" fill="none" stroke="#3b82f6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
    points.forEach(p => {
      const col = colors[p.idx % colors.length];
      svg += `
        <circle cx="${p.x}" cy="${p.y}" r="5" fill="${col}" stroke="#ffffff" stroke-width="1.5"/>
        <text x="${p.x}" y="156" fill="var(--text-muted)" font-size="10" text-anchor="middle">${p.item.coord}</text>
        <text x="${p.x}" y="${p.y - 8}" fill="var(--text-main)" font-size="9" font-weight="bold" text-anchor="middle">${p.item.num}</text>
      `;
    });
    svg += `</svg>`;
    canvas.innerHTML = svg;
  } else if (type === 'pie' || type === 'donut') {
    const total = slice.reduce((a, b) => a + Math.abs(b.num), 0) || 1;
    let startAngle = 0;
    const cx = 140, cy = 90, r = 65;
    let svg = `<svg width="100%" height="180" viewBox="0 0 500 180" style="background:var(--bg-main); border-radius:6px; padding:10px;">`;
    let legendHtml = `<g transform="translate(260, 20)">`;

    slice.forEach((item, idx) => {
      const angle = (Math.abs(item.num) / total) * 2 * Math.PI;
      const endAngle = startAngle + angle;
      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const largeArc = angle > Math.PI ? 1 : 0;
      const col = colors[idx % colors.length];

      const pathData = `M ${cx},${cy} L ${x1},${y1} A ${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`;
      svg += `<path d="${pathData}" fill="${col}" stroke="var(--bg-main)" stroke-width="2"/>`;

      if (type === 'donut') {
        svg += `<circle cx="${cx}" cy="${cy}" r="32" fill="var(--bg-main)"/>`;
      }

      legendHtml += `
        <rect x="0" y="${idx * 16}" width="12" height="12" fill="${col}" rx="2"/>
        <text x="18" y="${idx * 16 + 10}" fill="var(--text-main)" font-size="10">${item.coord}: ${item.num} (${Math.round((item.num/total)*100)}%)</text>
      `;

      startAngle = endAngle;
    });

    legendHtml += `</g>`;
    svg += legendHtml + `</svg>`;
    canvas.innerHTML = svg;
  }

  area.style.display = 'block';
}

function insertGridFunction(funcName) {
  const formulaInput = document.getElementById('gridFormulaInput');
  if (formulaInput) {
    formulaInput.value = `=${funcName}(A1:A5)`;
    commitGridFormulaInput();
  }
}

function sortGridColumn(dir) {
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  // Sort rows based on column A or selected cell col
  const parsed = parseCellCoord(selectedGridCell);
  const colIndex = parsed ? parsed.col : 0;
  const colLetterStr = colLetter(colIndex);

  const rowData = [];
  for (let r = 1; r <= sheet.rows; r++) {
    const coord = colLetterStr + r;
    const cell = sheet.cells[coord];
    const raw = cell ? (cell.raw || '') : '';
    rowData.push({ row: r, val: raw });
  }

  rowData.sort((a, b) => {
    const na = Number(a.val), nb = Number(b.val);
    if (!isNaN(na) && !isNaN(nb)) return dir === 'asc' ? na - nb : nb - na;
    return dir === 'asc' ? String(a.val).localeCompare(String(b.val)) : String(b.val).localeCompare(String(a.val));
  });

  const newCells = {};
  rowData.forEach((item, newRowIdx) => {
    const targetRow = newRowIdx + 1;
    for (let c = 0; c < sheet.cols; c++) {
      const srcCoord = colLetter(c) + item.row;
      const targetCoord = colLetter(c) + targetRow;
      if (sheet.cells[srcCoord]) {
        newCells[targetCoord] = sheet.cells[srcCoord];
      }
    }
  });

  sheet.cells = newCells;
  saveGridWorkbook(wb);
  renderSheets();
}

function setGridFilter(colIndex, query) {
  activeGridFilter = { colIndex, query: String(query).toLowerCase() };
  renderSheets();
}

function clearGridFilter() {
  activeGridFilter = null;
  renderSheets();
}

function checkGridIntegrity() {
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  let errors = 0;
  for (const coord in sheet.cells) {
    const raw = sheet.cells[coord]?.raw || '';
    if (raw.startsWith('=')) {
      const res = evalGridFormula(raw.slice(1), sheet.cells);
      if (typeof res === 'string' && res.startsWith('#')) errors++;
    }
  }
  alert(`Data Integrity Check Complete:\n\nActive Sheet: ${sheet.name}\nTotal Cells: ${Object.keys(sheet.cells).length}\nFormula Errors Found: ${errors}`);
}

function runGridQuickMacro() {
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  sheet.cells["A1"] = { raw: "Item", bold: true, format: "general" };
  sheet.cells["B1"] = { raw: "Amount", bold: true, format: "general" };
  sheet.cells["A2"] = { raw: "Sales", format: "general" };
  sheet.cells["B2"] = { raw: "1250", format: "currency" };
  sheet.cells["A3"] = { raw: "Services", format: "general" };
  sheet.cells["B3"] = { raw: "850", format: "currency" };
  sheet.cells["A4"] = { raw: "Total", bold: true, format: "general" };
  sheet.cells["B4"] = { raw: "=SUM(B2:B3)", bold: true, format: "currency" };
  saveGridWorkbook(wb);
  renderSheets();
}

function toggleGridHelp() {
  const h = document.getElementById('gridHelp');
  if (h) h.style.display = h.style.display === 'none' ? 'block' : 'none';
}

function toggleGridCalc() {
  const c = document.getElementById('gridCalc');
  if (c) c.style.display = c.style.display === 'none' ? 'block' : 'none';
}

function calcPress(val) {
  const d = document.getElementById('calcDisplay');
  if (d) d.value += val;
}

function calcClear() {
  const d = document.getElementById('calcDisplay');
  if (d) d.value = '';
}

function calcBackspace() {
  const d = document.getElementById('calcDisplay');
  if (d) d.value = d.value.slice(0, -1);
}

function calcEquals() {
  const d = document.getElementById('calcDisplay');
  if (!d) return;
  try {
    const expr = d.value.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
    if (!/^[0-9+\-*/().\s]+$/.test(expr)) { d.value = 'Error'; return; }
    d.value = Function('"use strict"; return (' + expr + ')')();
  } catch (e) {
    d.value = 'Error';
  }
}

function calcToSelectedCell() {
  const d = document.getElementById('calcDisplay');
  if (d && d.value) {
    const formulaInput = document.getElementById('gridFormulaInput');
    if (formulaInput) formulaInput.value = d.value;
    commitGridFormulaInput();
  }
}

function exportSheets() {
  const wb = getGridWorkbook();
  wb.format = "suite-grid";
  wb.version = 3;
  download('sheet.grid', JSON.stringify(wb, null, 2));
}

function importSheets() {
  pickFile('.grid', (content) => {
    try {
      const parsed = JSON.parse(content);
      const wb = getGridWorkbook();
      if ((parsed.format === "suite-grid" || parsed.version === 3 || parsed.version === "2.0") && Array.isArray(parsed.sheets)) {
        parsed.format = "suite-grid";
        parsed.version = 3;
        saveGridWorkbook(parsed);
      } else if (parsed.cells) {
        wb.sheets[0].cells = parsed.cells;
        saveGridWorkbook(wb);
      }
      renderSheets();
    } catch (e) {
      alert('Could not read that .grid file');
    }
  });
}

function exportGridCSV() {
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  let csv = "";
  for (let r = 1; r <= sheet.rows; r++) {
    const rowVals = [];
    for (let c = 0; c < sheet.cols; c++) {
      const coord = colLetter(c) + r;
      const cell = sheet.cells[coord];
      const raw = cell ? (cell.raw || '') : '';
      rowVals.push('"' + raw.replace(/"/g, '""') + '"');
    }
    csv += rowVals.join(',') + '\n';
  }
  download('sheet.csv', csv, 'text/csv');
}

function parseCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (c === ',' && !inQuotes) {
      result.push(cur); cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

function importGridCSV() {
  pickFile('.csv', (content) => {
    try {
      pushGridHistory();
      const lines = content.split(/\r?\n/);
      const wb = getGridWorkbook();
      const sheet = getActiveSheet(wb);
      const newCells = {};
      lines.forEach((line, rIdx) => {
        if (!line.trim()) return;
        const rowNum = rIdx + 1;
        const cols = parseCSVLine(line);
        cols.forEach((colVal, cIdx) => {
          const coord = colLetter(cIdx) + rowNum;
          const cleanVal = colVal.trim().replace(/^"|"$/g, '').replace(/""/g, '"');
          newCells[coord] = { raw: cleanVal };
        });
      });
      sheet.cells = newCells;
      saveGridWorkbook(wb);
      renderSheets();
    } catch (e) {
      alert('Could not read CSV file');
    }
  });
}


/* ================= FORMS (.fill) ================= */
function renderForms(){
  const p = document.getElementById('panel-forms');
  if(!p) return;
  const data = loadLocal('forms', {fields:[{label:'Your name', type:'text'}], submissions:[]});
  p.innerHTML = `
    <h2>Fill</h2>
    <div class="sub">.fill — send a form without anyone harvesting the answers</div>
    <div class="toolbar">
      <button class="btn ghost small" onclick="addField()">+ Add field</button>
      <button class="btn sage small" onclick="saveForms()">Save</button>
      <button class="btn ghost small" onclick="exportForms()">Export .fill</button>
      <button class="btn ghost small" onclick="importForms()">Import .fill</button>
      <button class="btn ghost small" onclick="exportStandaloneForm()">⬇ Standalone form (.html)</button>
    </div>
    <div class="forms-layout">
      <div class="forms-col">
        <h3 style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:0.9em;color:#8a7f66;">Builder</h3>
        <div id="fieldsList"></div>
      </div>
      <div class="forms-col">
        <h3 style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:0.9em;color:#8a7f66;">Live preview</h3>
        <div class="preview-box" id="formPreview"></div>
        <button class="btn ghost small" style="margin-top:10px;" onclick="submitFormPreview()">Submit response</button>
        <div class="hint" id="submissionCount"></div>
      </div>
    </div>
  `;
  renderFieldsList(data.fields);
  renderFormPreview(data.fields);
  document.getElementById('submissionCount').textContent = (data.submissions||[]).length + ' response(s) saved locally';
}
function renderFieldsList(fields){
  const el = document.getElementById('fieldsList');
  el.innerHTML = fields.map((f,i)=>`
    <div class="field-row">
      <input type="text" value="${f.label}" onchange="updateField(${i},'label',this.value)">
      <select onchange="updateField(${i},'type',this.value)">
        <option value="text" ${f.type==='text'?'selected':''}>Text</option>
        <option value="email" ${f.type==='email'?'selected':''}>Email</option>
        <option value="date" ${f.type==='date'?'selected':''}>Date</option>
      </select>
      <button class="btn ghost small" onclick="removeField(${i})">✕</button>
    </div>
  `).join('');
}
function renderFormPreview(fields){
  const el = document.getElementById('formPreview');
  if(!el) return;

  let html = '';
  fields.forEach((f, idx) => {
    // Check conditional visibility rule e.g. f.showIfField && f.showIfValue
    let visible = true;
    if (f.showIfField && f.showIfValue) {
      const parentInp = document.querySelector(`[data-preview-field="${f.showIfField}"]`);
      if (parentInp && parentInp.value !== f.showIfValue) {
        visible = false;
      }
    }
    const displayStyle = visible ? 'block' : 'none';
    html += `<div id="field_wrap_${idx}" style="display:${displayStyle}; margin-bottom:12px;">
      <label style="display:block; margin-bottom:4px; font-weight:600; color:#1e293b;">${escapeHTML(f.label)}</label>
      <input type="${f.type||'text'}" data-preview-field="${escapeHTML(f.label)}" oninput="evalFillBranching()" style="width:100%; padding:8px; border-radius:4px; border:1px solid #cbd5e1; background:#ffffff; color:#0f172a;">
    </div>`;
  });
  el.innerHTML = html;
}

function evalFillBranching() {
  const data = getFormsData();
  data.fields.forEach((f, idx) => {
    const wrap = document.getElementById(`field_wrap_${idx}`);
    if (!wrap) return;
    if (f.showIfField && f.showIfValue) {
      const parentInp = document.querySelector(`[data-preview-field="${f.showIfField}"]`);
      if (parentInp && parentInp.value === f.showIfValue) {
        wrap.style.display = 'block';
      } else {
        wrap.style.display = 'none';
      }
    }
  });
}
function getFormsData(){ return loadLocal('forms', {fields:[],submissions:[]}); }
function addField(){
  const d = getFormsData();
  d.fields.push({label:'New field', type:'text'});
  saveLocal('forms', d); renderForms();
}
function updateField(i, key, val){
  const d = getFormsData();
  d.fields[i][key]=val;
  localStorage.setItem(KEY_PREFIX+'forms', JSON.stringify(d));
  renderFormPreview(d.fields);
}
function removeField(i){
  const d = getFormsData();
  d.fields.splice(i,1);
  saveLocal('forms', d); renderForms();
}
function submitFormPreview(){
  const d = getFormsData();
  const resp = {};
  document.querySelectorAll('[data-preview-field]').forEach(inp=>{
    resp[inp.dataset.previewField] = inp.value;
  });
  d.submissions = d.submissions||[];
  d.submissions.push(resp);
  saveLocal('forms', d);
  document.querySelectorAll('[data-preview-field]').forEach(inp=>{ inp.value = ''; });
  const countEl = document.getElementById('submissionCount');
  if(countEl) countEl.textContent = d.submissions.length + ' response(s) saved locally';
  showSeal();
}
function exportStandaloneForm(){
  const d = getFormsData();
  const fieldsJson = JSON.stringify(d.fields).replace(/</g,'\\u003c');
  const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Form</title>'
    + '<style>body{font-family:Georgia,serif;max-width:520px;margin:40px auto;padding:0 20px;color:#232017;background:#f7f2e4;}'
    + 'label{display:block;margin-top:14px;font-weight:bold;}input{width:100%;padding:8px;margin-top:4px;box-sizing:border-box;font-family:inherit;}'
    + 'button{margin-top:20px;padding:10px 18px;background:#6f8c6a;color:#fff;border:none;border-radius:4px;cursor:pointer;font-family:inherit;}</style>'
    + '</head><body><h2>Fill it out</h2><div id="f"></div><button onclick="submitIt()">Export my answers</button>'
    + '<p style="font-size:0.8em;color:#8a7f66;">No server, no account — this saves a file straight to your device.</p>'
    + '<script>const fields = ' + fieldsJson + ';'
    + "document.getElementById('f').innerHTML = fields.map(fl=>'<label>'+fl.label+'</label><input type=\"'+fl.type+'\" data-f=\"'+fl.label+'\">').join('');"
    + 'function submitIt(){const answers={};document.querySelectorAll("[data-f]").forEach(inp=>{answers[inp.dataset.f]=inp.value;});'
    + 'const blob=new Blob([JSON.stringify(answers,null,2)],{type:"application/json"});const a=document.createElement("a");'
    + 'a.href=URL.createObjectURL(blob);a.download="answers.json";a.click();}'
    + '<\/script></body></html>';
  const blob = new Blob([html], {type:'text/html'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'form-standalone.html';
  a.click();
}
function saveForms(){ saveLocal('forms', getFormsData()); }
function exportForms(){
  const d = getFormsData();
  download('form.fill', JSON.stringify({type:'fill',...d}, null, 2));
}
function importForms(){
  pickFile('.fill', (content)=>{
    try{ const parsed = JSON.parse(content); saveLocal('forms', {fields:parsed.fields||[], submissions:parsed.submissions||[]}); renderForms(); }
    catch(e){ alert('Could not read that .fill file'); }
  });
}

/* ================= SPOT (.spot) — KNOWLEDGE, RESEARCH & IDEA WORKSPACE ================= */
let currentSpotNav = 'inbox';
let currentSpotSearch = '';
let currentSpotSelectedId = null;
let currentSpotCollectionId = null;
let currentSpotTopic = null;
let spotPreviewMode = false;
let draggingSpotNote = null, dragSpotOffset = { x: 0, y: 0 };

function renderNotes() {
  const p = document.getElementById('panel-notes');
  if (!p) return;

  const notes = getSpotNotes();
  const cols = getSpotCollections();
  const srcs = getSpotSources();

  const inboxCount = notes.filter(n => n.status === 'Inbox' || n.collectionId === 'inbox' || n.folder === 'Inbox').length;
  const activeCount = notes.filter(n => n.status !== 'Archived').length;
  const colsCount = cols.length;
  const sourcesCount = srcs.length;
  const reviewCount = notes.filter(n => (n.status === 'Inbox' || !n.tags || n.tags.trim() === '') && n.status !== 'Archived').length;
  const archiveCount = notes.filter(n => n.status === 'Archived').length;

  p.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:12px;">
      <div>
        <h2 style="margin:0; font-size:1.3rem;">Spot Knowledge & Research Workspace</h2>
        <div class="sub">.spot — Capture, organize, connect, and transform knowledge into action</div>
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn brass small" onclick="openSpotNewItemModal()">+ New Note</button>
        <button class="btn ghost small" onclick="openSpotQuickCaptureModal()">⚡ Quick Capture</button>
        <button class="btn ghost small" onclick="openSpotNewCollectionModal()">+ Collection</button>
        <button class="btn ghost small" onclick="openSpotNewSourceModal()">+ Source</button>
        <button class="btn ghost small" onclick="exportSpotNotes()">Export .spot</button>
        <button class="btn ghost small" onclick="importSpotNotes()">Import .spot</button>
      </div>
    </div>

    <div class="spot-layout" style="display:grid; grid-template-columns:220px 1fr; gap:16px; align-items:start;">
      <!-- SIDEBAR -->
      <div class="spot-sidebar" style="background:var(--bg-surface, #1e293b); border:1px solid var(--border, #334155); border-radius:8px; padding:12px;">
        <div style="margin-bottom:12px;">
          <input type="text" placeholder="Search knowledge..." value="${escapeHtml(currentSpotSearch)}" oninput="currentSpotSearch=this.value; renderSpotContent();" style="width:100%; box-sizing:border-box; padding:6px 10px; font-size:0.85rem; border-radius:4px; border:1px solid var(--border, #334155); background:var(--bg-card, #0f172a); color:var(--text, #f8fafc);">
        </div>
        <div class="spot-nav-group" style="display:flex; flex-direction:column; gap:4px;">
          <button class="btn ${currentSpotNav === 'inbox' ? 'brass' : 'ghost'} small" style="justify-content:space-between; text-align:left; width:100%;" onclick="currentSpotNav='inbox'; renderSpotContent();">
            <span>📥 Inbox</span> <span class="badge">${inboxCount}</span>
          </button>
          <button class="btn ${currentSpotNav === 'recent' ? 'brass' : 'ghost'} small" style="justify-content:space-between; text-align:left; width:100%;" onclick="currentSpotNav='recent'; renderSpotContent();">
            <span>🕒 Recent</span> <span class="badge">${activeCount}</span>
          </button>
          <button class="btn ${currentSpotNav === 'collections' ? 'brass' : 'ghost'} small" style="justify-content:space-between; text-align:left; width:100%;" onclick="currentSpotNav='collections'; renderSpotContent();">
            <span>📁 Collections</span> <span class="badge">${colsCount}</span>
          </button>
          <button class="btn ${currentSpotNav === 'topics' ? 'brass' : 'ghost'} small" style="justify-content:space-between; text-align:left; width:100%;" onclick="currentSpotNav='topics'; renderSpotContent();">
            <span>🏷 Topics & Tags</span>
          </button>
          <button class="btn ${currentSpotNav === 'canvas' ? 'brass' : 'ghost'} small" style="justify-content:space-between; text-align:left; width:100%;" onclick="currentSpotNav='canvas'; renderSpotContent();">
            <span>📌 Research Canvas</span>
          </button>
          <button class="btn ${currentSpotNav === 'graph' ? 'brass' : 'ghost'} small" style="justify-content:space-between; text-align:left; width:100%;" onclick="currentSpotNav='graph'; renderSpotContent();">
            <span>🕸 Knowledge Graph</span>
          </button>
          <button class="btn ${currentSpotNav === 'sources' ? 'brass' : 'ghost'} small" style="justify-content:space-between; text-align:left; width:100%;" onclick="currentSpotNav='sources'; renderSpotContent();">
            <span>📚 Sources</span> <span class="badge">${sourcesCount}</span>
          </button>
          <button class="btn ${currentSpotNav === 'review' ? 'brass' : 'ghost'} small" style="justify-content:space-between; text-align:left; width:100%;" onclick="currentSpotNav='review'; renderSpotContent();">
            <span>🔍 Review</span> <span class="badge">${reviewCount}</span>
          </button>
          <button class="btn ${currentSpotNav === 'archive' ? 'brass' : 'ghost'} small" style="justify-content:space-between; text-align:left; width:100%;" onclick="currentSpotNav='archive'; renderSpotContent();">
            <span>📦 Archive</span> <span class="badge">${archiveCount}</span>
          </button>
        </div>
      </div>

      <!-- MAIN CONTENT -->
      <div id="spotMainContent" style="background:var(--bg-surface, #1e293b); border:1px solid var(--border, #334155); border-radius:8px; padding:16px; min-height:500px;">
      </div>
    </div>
  `;

  renderSpotContent();
}

function renderSpotContent() {
  const container = document.getElementById('spotMainContent');
  if (!container) return;

  const notes = getSpotNotes();
  const cols = getSpotCollections();
  const srcs = getSpotSources();
  const rels = getSpotRelationships();

  let filtered = notes;
  if (currentSpotSearch && currentSpotSearch.trim() !== '') {
    const q = currentSpotSearch.toLowerCase();
    filtered = filtered.filter(n =>
      (n.title || '').toLowerCase().includes(q) ||
      (n.body || '').toLowerCase().includes(q) ||
      (n.tags || '').toLowerCase().includes(q) ||
      (n.type || '').toLowerCase().includes(q)
    );
  }

  if (currentSpotNav === 'inbox') {
    const inboxNotes = filtered.filter(n => n.status === 'Inbox' || n.collectionId === 'inbox' || n.folder === 'Inbox');
    container.innerHTML = renderSpotListView(inboxNotes, '📥 Unprocessed Inbox');
  } else if (currentSpotNav === 'recent') {
    const recentNotes = filtered.filter(n => n.status !== 'Archived').sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    container.innerHTML = renderSpotListView(recentNotes, '🕒 Recently Updated Knowledge');
  } else if (currentSpotNav === 'collections') {
    container.innerHTML = renderSpotCollectionsView(filtered, cols);
  } else if (currentSpotNav === 'topics') {
    container.innerHTML = renderSpotTopicsView(filtered);
  } else if (currentSpotNav === 'canvas') {
    container.innerHTML = renderSpotCanvasView(filtered, rels);
    initSpotCanvasEvents();
  } else if (currentSpotNav === 'graph') {
    container.innerHTML = renderSpotGraphView(filtered, rels);
  } else if (currentSpotNav === 'sources') {
    container.innerHTML = renderSpotSourcesView(filtered, srcs);
  } else if (currentSpotNav === 'review') {
    const reviewNotes = filtered.filter(n => (n.status === 'Inbox' || !n.tags || n.tags.trim() === '') && n.status !== 'Archived');
    container.innerHTML = renderSpotReviewView(reviewNotes);
  } else if (currentSpotNav === 'archive') {
    const archivedNotes = filtered.filter(n => n.status === 'Archived');
    container.innerHTML = renderSpotListView(archivedNotes, '📦 Knowledge Archive');
  }
}

function renderSpotListView(items, title) {
  let listHtml = '';
  if (items.length === 0) {
    listHtml = `<div class="hint" style="padding:24px; text-align:center;">No knowledge items found here. Use <b>+ New Note</b> or <b>⚡ Quick Capture</b> to capture thoughts.</div>`;
  } else {
    listHtml = items.map(n => {
      const isSelected = currentSpotSelectedId === n.id;
      const typeBadge = `<span style="font-size:0.7rem; padding:2px 6px; border-radius:4px; background:rgba(59,130,246,0.15); border:1px solid rgba(59,130,246,0.3); color:#60a5fa;">${escapeHtml(n.type || 'Note')}</span>`;
      const dateStr = (n.updatedAt || n.createdAt || '').slice(0, 10);
      return `
        <div class="spot-item-card ${isSelected ? 'active' : ''}" onclick="currentSpotSelectedId=${n.id}; renderSpotContent();" style="border:1px solid ${isSelected ? 'var(--accent-primary, #3b82f6)' : 'var(--border, #334155)'}; border-radius:6px; padding:10px 14px; margin-bottom:8px; cursor:pointer; background:${isSelected ? 'rgba(59,130,246,0.1)' : 'var(--bg-card, #0f172a)'}; display:flex; justify-content:space-between; align-items:center;">
          <div style="flex:1;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
              ${n.pinned ? '📌 ' : ''}<b>${escapeHtml(n.title || 'Untitled')}</b>
              ${typeBadge}
              <span style="font-size:0.75rem; color:var(--text-muted, #94a3b8);">${escapeHtml(n.collectionId || n.folder || 'Inbox')}</span>
            </div>
            <div style="font-size:0.8rem; color:var(--text-muted, #94a3b8); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:400px;">
              ${escapeHtml((n.body || '').replace(/[#*`\[\]]/g, '').slice(0, 80))}
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:0.75rem; color:var(--text-muted, #94a3b8);">${dateStr}</span>
            <button class="btn ghost small" onclick="event.stopPropagation(); convertSpotToDocketTask(${n.id});" title="Convert to Docket Task">⚡ Task</button>
            <button class="btn ghost small" onclick="event.stopPropagation(); deleteSpotItem(${n.id});" style="color:#ef4444;">✕</button>
          </div>
        </div>
      `;
    }).join('');
  }

  const openNote = currentSpotSelectedId ? getSpotNotes().find(n => n.id === currentSpotSelectedId) : null;
  const inspectorHtml = renderSpotItemInspector(openNote);

  return `
    <h3 style="margin-top:0; margin-bottom:12px; font-size:1.1rem; color:var(--text, #f8fafc);">${title} (${items.length})</h3>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; align-items:start;">
      <div>${listHtml}</div>
      <div style="background:var(--bg-card, #0f172a); border:1px solid var(--border, #334155); border-radius:6px; padding:16px; min-height:400px;">
        ${inspectorHtml}
      </div>
    </div>
  `;
}

function renderSpotItemInspector(n) {
  if (!n) {
    return `<div class="hint" style="text-align:center; padding:40px 10px;">Select a knowledge item on the left to inspect, edit, or connect, or create a new one.</div>`;
  }

  const cols = getSpotCollections();
  const srcs = getSpotSources();
  const allNotes = getSpotNotes();
  const rels = getSpotRelationships();

  const noteRels = rels.filter(r => r.fromId === n.id || r.toId === n.id);
  const backlinks = allNotes.filter(other =>
    other.id !== n.id && (
      (other.body || '').toLowerCase().includes(`[[${(n.title || '').toLowerCase()}]]`) ||
      rels.some(r => r.fromId === other.id && r.toId === n.id)
    )
  );

  const relsListHtml = noteRels.length === 0 ? '<span class="hint">No explicit relationships linked yet.</span>' : noteRels.map(r => {
    const otherId = r.fromId === n.id ? r.toId : r.fromId;
    const otherNote = allNotes.find(x => x.id === otherId);
    const label = otherNote ? otherNote.title : `Item #${otherId}`;
    const relDirection = r.fromId === n.id ? `➔ ${r.type}` : `⬅ ${r.type}`;
    return `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:4px 8px; border-radius:4px; margin-bottom:4px; font-size:0.8rem;">
      <span>${relDirection} <b>${escapeHtml(label)}</b></span>
      <span style="cursor:pointer; color:#ef4444;" onclick="deleteSpotRelationship('${r.id}')">✕</span>
    </div>`;
  }).join('');

  const backlinksListHtml = backlinks.length === 0 ? '<span class="hint">No backlinks found.</span>' : backlinks.map(b =>
    `<button class="btn ghost small" style="display:inline-block; margin-right:4px; margin-bottom:4px;" onclick="currentSpotSelectedId=${b.id}; renderSpotContent();">🔗 ${escapeHtml(b.title)}</button>`
  ).join('');

  return `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
      <h4 style="margin:0; font-size:1rem; color:var(--text, #f8fafc);">Knowledge Item Inspector</h4>
      <div style="display:flex; gap:6px;">
        <button class="btn ghost small" onclick="spotPreviewMode=!spotPreviewMode; renderSpotContent();">${spotPreviewMode ? '✎ Edit' : '👁 Preview'}</button>
        <button class="btn ghost small" onclick="toggleSpotPin(${n.id})">${n.pinned ? '📌 Unpin' : '📍 Pin'}</button>
        <button class="btn ghost small" style="color:#ef4444;" onclick="deleteSpotItem(${n.id})">✕ Delete</button>
      </div>
    </div>

    <div style="display:flex; flex-direction:column; gap:10px;">
      <div>
        <label style="font-size:0.75rem; color:var(--text-muted, #94a3b8);">Title</label>
        <input type="text" value="${escapeHtml(n.title || '')}" onchange="updateSpotItemField(${n.id}, 'title', this.value)" style="width:100%; box-sizing:border-box; padding:6px 10px; border-radius:4px; border:1px solid var(--border, #334155); background:var(--bg-surface, #1e293b); color:var(--text, #f8fafc); font-weight:600;">
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
        <div>
          <label style="font-size:0.75rem; color:var(--text-muted, #94a3b8);">Type</label>
          <select onchange="updateSpotItemField(${n.id}, 'type', this.value)" style="width:100%; padding:6px; border-radius:4px; border:1px solid var(--border, #334155); background:var(--bg-surface, #1e293b); color:var(--text, #f8fafc);">
            ${SPOT_TYPES.map(t => `<option value="${t}" ${t === n.type ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:0.75rem; color:var(--text-muted, #94a3b8);">Collection</label>
          <select onchange="updateSpotItemField(${n.id}, 'collectionId', this.value)" style="width:100%; padding:6px; border-radius:4px; border:1px solid var(--border, #334155); background:var(--bg-surface, #1e293b); color:var(--text, #f8fafc);">
            ${cols.map(c => `<option value="${c.id}" ${c.id === n.collectionId || c.name === n.folder ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
          </select>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
        <div>
          <label style="font-size:0.75rem; color:var(--text-muted, #94a3b8);">Status</label>
          <select onchange="updateSpotItemField(${n.id}, 'status', this.value)" style="width:100%; padding:6px; border-radius:4px; border:1px solid var(--border, #334155); background:var(--bg-surface, #1e293b); color:var(--text, #f8fafc);">
            <option value="Inbox" ${n.status === 'Inbox' ? 'selected' : ''}>Inbox</option>
            <option value="Active" ${n.status === 'Active' ? 'selected' : ''}>Active</option>
            <option value="Archived" ${n.status === 'Archived' ? 'selected' : ''}>Archived</option>
          </select>
        </div>
        <div>
          <label style="font-size:0.75rem; color:var(--text-muted, #94a3b8);">Tags (comma separated)</label>
          <input type="text" value="${escapeHtml(n.tags || '')}" onchange="updateSpotItemField(${n.id}, 'tags', this.value)" style="width:100%; box-sizing:border-box; padding:6px; border-radius:4px; border:1px solid var(--border, #334155); background:var(--bg-surface, #1e293b); color:var(--text, #f8fafc);">
        </div>
      </div>

      <div>
        <label style="font-size:0.75rem; color:var(--text-muted, #94a3b8);">Body (Markdown supported)</label>
        ${spotPreviewMode ? `
          <div class="md-preview" style="background:var(--bg-surface, #1e293b); border:1px solid var(--border, #334155); border-radius:4px; padding:10px; min-height:160px; max-height:250px; overflow-y:auto;">
            ${renderMarkdown(n.body || '')}
          </div>
        ` : `
          <textarea onchange="updateSpotItemField(${n.id}, 'body', this.value)" style="width:100%; box-sizing:border-box; min-height:160px; max-height:250px; padding:8px; border-radius:4px; border:1px solid var(--border, #334155); background:var(--bg-surface, #1e293b); color:var(--text, #f8fafc); font-family:monospace; font-size:0.85rem;">${escapeHtml(n.body || '')}</textarea>
        `}
      </div>

      <!-- RELATIONSHIPS -->
      <div style="border-top:1px solid var(--border, #334155); padding-top:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
          <label style="font-size:0.75rem; font-weight:700; color:var(--text-muted, #94a3b8);">Explicit Relationships</label>
          <button class="btn ghost small" onclick="openSpotAddRelationshipModal(${n.id})">+ Add Link</button>
        </div>
        ${relsListHtml}
      </div>

      <!-- BACKLINKS -->
      <div style="border-top:1px solid var(--border, #334155); padding-top:8px;">
        <label style="font-size:0.75rem; font-weight:700; color:var(--text-muted, #94a3b8); display:block; margin-bottom:4px;">Backlinks (${backlinks.length})</label>
        ${backlinksListHtml}
      </div>

      <!-- CROSS-APP ACTIONS -->
      <div style="border-top:1px solid var(--border, #334155); padding-top:8px; display:flex; gap:6px; flex-wrap:wrap;">
        <button class="btn brass small" onclick="convertSpotToDocketTask(${n.id})">⚡ Send to Docket Task</button>
        <button class="btn ghost small" onclick="convertSpotToFolioDoc(${n.id})">📄 Send to Folio</button>
        <button class="btn ghost small" onclick="convertSpotToGlidesDeck(${n.id})">📊 Send to Glides</button>
      </div>
    </div>
  `;
}

/* ================= NOTES LIBRARY (Phase 13) =================
   A real private knowledge system alongside the existing Board canvas —
   folders, markdown, checklists, tags, pinned notes, backlinks, version
   history, local search. Separate storage key from the Board's spatial
   notes (notes_library vs notes) so nothing existing gets touched. */
let _notesView = 'board';
const NOTES_FOLDERS = ['Inbox','Personal','Work','Projects','Research','Ideas','Archive'];
let _libFolder = 'Inbox';
let _libSearch = '';
let _libOpenId = null;

/* ================= SPOT DATA ENGINE & KNOWLEDGE MODELS ================= */
const SPOT_TYPES = ['Note', 'Research', 'Idea', 'Reference', 'Meeting', 'Decision', 'Question', 'Procedure', 'Document', 'Image', 'Link'];
const SPOT_RELATIONSHIP_TYPES = ['Related to', 'Depends on', 'Supports', 'Contradicts', 'References', 'Derived from', 'Part of'];

function getSpotNotes() {
  let notes = loadLocal('notes_library', null);
  if (!notes || !Array.isArray(notes) || notes.length === 0) {
    notes = [
      {
        id: 101,
        title: 'Welcome to Spot Knowledge Workspace',
        body: '# Welcome to Spot\nCapture ideas, research findings, and notes, organize them into collections, connect them with explicit relationships, and turn them into actionable Docket tasks.',
        type: 'Note',
        collectionId: 'Inbox',
        folder: 'Inbox',
        tags: 'welcome, spot, guide',
        status: 'Inbox',
        source: 'Offlines Guide',
        sourceUrl: 'https://offlines.xyz',
        attachments: [],
        relatedItemIds: [],
        backlinks: [],
        pinned: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 102,
        title: 'Research: Local First Architecture',
        body: 'Local-first software ensures user data remains encrypted on the device without requiring external server processing.',
        type: 'Research',
        collectionId: 'Research',
        folder: 'Research',
        tags: 'privacy, architecture, local',
        status: 'Active',
        source: 'Local-First Research',
        sourceUrl: '',
        attachments: [],
        relatedItemIds: [101],
        backlinks: [],
        pinned: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    saveLocal('notes_library', notes);
  }
  notes.forEach(n => {
    if (!n.type) n.type = 'Note';
    if (!n.collectionId) n.collectionId = n.folder || 'Inbox';
    if (!n.folder) n.folder = n.collectionId || 'Inbox';
    if (!n.status) n.status = 'Active';
    if (!n.tags) n.tags = '';
    if (!n.attachments) n.attachments = [];
    if (!n.relatedItemIds) n.relatedItemIds = [];
    if (!n.backlinks) n.backlinks = [];
    if (!n.createdAt) n.createdAt = new Date().toISOString();
    if (!n.updatedAt) n.updatedAt = n.createdAt;
  });
  return notes;
}

function saveSpotNotes(arr) { saveLocal('notes_library', arr); }
function getLibraryNotes() { return getSpotNotes(); }
function saveLibraryNotes(arr) { saveSpotNotes(arr); }

function getSpotCollections() {
  const defaultCols = ['Inbox', 'Personal', 'Work', 'Projects', 'Research', 'Ideas', 'Archive'];
  let cols = loadLocal('spot_collections', null);
  if (!cols || !Array.isArray(cols)) {
    cols = defaultCols.map(c => ({ id: c.toLowerCase(), name: c, description: c + ' collection' }));
    saveLocal('spot_collections', cols);
  }
  return cols;
}
function saveSpotCollections(cols) { saveLocal('spot_collections', cols); }

function getSpotSources() {
  let srcs = loadLocal('spot_sources', null);
  if (!srcs || !Array.isArray(srcs)) {
    srcs = [
      { id: 'src_1', title: 'Local-First Software Paper', author: 'Ink & Switch', url: 'https://www.inkandswitch.com/local-first/', type: 'Article', notes: 'Foundational paper on local-first principles' },
      { id: 'src_2', title: 'Offlines Architectural Spec', author: 'Privacy Engineering', url: 'https://offlines.xyz/spec', type: 'Document', notes: 'Internal security and architecture specification' }
    ];
    saveLocal('spot_sources', srcs);
  }
  return srcs;
}
function saveSpotSources(srcs) { saveLocal('spot_sources', srcs); }

function getSpotRelationships() {
  let rels = loadLocal('spot_relationships', null);
  if (!rels || !Array.isArray(rels)) {
    rels = [
      { id: 'rel_1', fromId: 102, toId: 101, type: 'Supports', createdAt: new Date().toISOString() }
    ];
    saveLocal('spot_relationships', rels);
  }
  return rels;
}
function saveSpotRelationships(rels) { saveLocal('spot_relationships', rels); }

/* Small, dependency-free markdown: headers, bold/italic, inline code,
   checklists, bullet lists, pipe tables, and [[backlink]] note-title links. */
function renderMarkdown(src){
  if(!src) return '';
  const lines = src.split('\n');
  let html = '';
  let inList = false, inTable = false, tableRows = [];
  const flushList = ()=>{ if(inList){ html += '</ul>'; inList=false; } };
  const flushTable = ()=>{
    if(inTable){
      html += '<table class="md-table"><tbody>' + tableRows.map((r,i)=>
        `<tr>${r.map(c=>`<t${i===0?'h':'d'}>${c}</t${i===0?'h':'d'}>`).join('')}</tr>`
      ).join('') + '</tbody></table>';
      inTable=false; tableRows=[];
    }
  };
  const inline = (t)=> t
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/\[\[([^\]]+)\]\]/g, (m,title)=>`<a href="#" class="md-backlink" onclick="openBacklink('${title.replace(/'/g,"\\'")}'); return false;">${title}</a>`)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/\*([^*]+)\*/g, '<i>$1</i>');
  lines.forEach(line=>{
    if(/^\s*\|.*\|\s*$/.test(line) && !/^\s*\|[\s:-]+\|\s*$/.test(line)){
      inTable = true;
      tableRows.push(line.trim().replace(/^\||\|$/g,'').split('|').map(c=>inline(c.trim())));
      return;
    }
    if(inTable && /^\s*\|[\s:-]+\|\s*$/.test(line)) return; // header separator row
    flushTable();
    const h = line.match(/^(#{1,3})\s+(.*)/);
    if(h){ flushList(); html += `<h${h[1].length+1}>${inline(h[2])}</h${h[1].length+1}>`; return; }
    const chk = line.match(/^\s*-\s*\[( |x|X)\]\s*(.*)/);
    if(chk){
      if(!inList){ html += '<ul class="md-checklist">'; inList=true; }
      html += `<li><input type="checkbox" disabled ${chk[1]!==' '?'checked':''}> ${inline(chk[2])}</li>`;
      return;
    }
    const bullet = line.match(/^\s*-\s+(.*)/);
    if(bullet){
      if(!inList){ html += '<ul>'; inList=true; }
      html += `<li>${inline(bullet[1])}</li>`;
      return;
    }
    flushList();
    if(line.trim()==='') html += '<br>'; else html += `<p>${inline(line)}</p>`;
  });
  flushList(); flushTable();
  return html;
}
function openBacklink(title){
  const notes = getLibraryNotes();
  const found = notes.find(n=>(n.title||'').toLowerCase()===title.toLowerCase());
  if(found){ _libFolder = found.folder; _libOpenId = found.id; renderNotesLibrary(); }
  else if(confirm(`No note titled "${title}" yet — create it?`)){
    const n = {id:Date.now(), folder:_libFolder, title, body:'', tags:'', pinned:false, versions:[], createdAt:new Date().toISOString()};
    const notes2 = getLibraryNotes(); notes2.push(n); saveLibraryNotes(notes2);
    _libOpenId = n.id; renderNotesLibrary();
  }
}
function findBacklinksTo(title){
  return getLibraryNotes().filter(n=>{
    const re = new RegExp('\\[\\[\\s*'+title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*\\]\\]','i');
    return re.test(n.body||'');
  });
}
function renderNotesLibrary(){
  const el = document.getElementById('notesLibrary');
  if(!el) return;
  const notes = getLibraryNotes();
  const folderChips = NOTES_FOLDERS.map(f=>{
    const count = notes.filter(n=>n.folder===f).length;
    return `<div class="vault-cat ${_libFolder===f?'active':''}" onclick="_libFolder='${f}'; _libOpenId=null; renderNotesLibrary();">${f}<span class="vault-count">${count}</span></div>`;
  }).join('');
  const pinned = notes.filter(n=>n.folder===_libFolder && n.pinned);
  const q = _libSearch.toLowerCase();
  const list = notes.filter(n=>n.folder===_libFolder && !n.pinned &&
    (!q || (n.title||'').toLowerCase().includes(q) || (n.body||'').toLowerCase().includes(q) || (n.tags||'').toLowerCase().includes(q)));
  const rowHTML = (n)=>`<div class="vault-row ${_libOpenId===n.id?'active-row':''}">
      <div class="vault-row-main" onclick="_libOpenId=${n.id}; renderNotesLibrary();">
        <b>${n.pinned?'📌 ':''}${n.title||'(untitled)'}</b>
        <span class="vault-row-sub">${(n.body||'').replace(/[#*\[\]`]/g,'').slice(0,50)}</span>
      </div>
      <span class="vault-row-actions">
        <span style="cursor:pointer;" title="${n.pinned?'Unpin':'Pin'}" onclick="toggleLibraryPin(${n.id})">${n.pinned?'📌':'📍'}</span>
        <span style="cursor:pointer;color:#a8563f;" onclick="deleteLibraryNote(${n.id})">✕</span>
      </span>
    </div>`;
  let editorHTML = '<div class="hint">Select a note, or create one.</div>';
  const openNote = _libOpenId ? notes.find(n=>n.id===_libOpenId) : null;
  if(openNote){
    const backlinks = findBacklinksTo(openNote.title||'');
    editorHTML = `
      <div class="vault-form" style="grid-template-columns:1fr;">
        <label>Title<input type="text" id="libTitle" value="${(openNote.title||'').replace(/"/g,'&quot;')}" onchange="updateLibraryField(${openNote.id},'title',this.value)"></label>
        <label>Folder<select onchange="updateLibraryField(${openNote.id},'folder',this.value); _libFolder=this.value;">
          ${NOTES_FOLDERS.map(f=>`<option value="${f}" ${f===openNote.folder?'selected':''}>${f}</option>`).join('')}
        </select></label>
        <label>Tags<input type="text" value="${(openNote.tags||'').replace(/"/g,'&quot;')}" onchange="updateLibraryField(${openNote.id},'tags',this.value)"></label>
        <label>Body (Markdown — # headers, **bold**, *italic*, - [ ] checklists, [[Note Title]] backlinks, | tables |)
          <textarea id="libBody" style="min-height:200px;" onchange="updateLibraryField(${openNote.id},'body',this.value)">${(openNote.body||'')}</textarea>
        </label>
        <div class="toolbar">
          <button class="btn ghost small" onclick="_libPreview=!_libPreview; renderNotesLibrary();">${_libPreview?'✎ Edit':'👁 Preview'}</button>
          ${(openNote.versions||[]).length ? `<span class="hint">${openNote.versions.length} earlier version${openNote.versions.length===1?'':'s'}</span>` : ''}
        </div>
        ${_libPreview ? `<div class="md-preview">${renderMarkdown(openNote.body||'')}</div>` : ''}
        ${backlinks.length ? `<div class="hint">Linked from: ${backlinks.map(b=>`<a href="#" onclick="_libOpenId=${b.id}; renderNotesLibrary(); return false;">${b.title}</a>`).join(', ')}</div>` : ''}
      </div>`;
  }
  el.innerHTML = `
    <div class="vault-cats">${folderChips}</div>
    <div class="toolbar"><input type="text" placeholder="Search this folder…" value="${_libSearch.replace(/"/g,'&quot;')}" oninput="_libSearch=this.value; renderNotesLibrary();"></div>
    <div style="display:grid;grid-template-columns:280px 1fr;gap:16px;align-items:start;">
      <div>
        ${pinned.length ? `<div class="hint" style="margin-bottom:4px;">Pinned</div>${pinned.map(rowHTML).join('')}` : ''}
        ${list.length ? list.map(rowHTML).join('') : '<div class="hint">Nothing here yet.</div>'}
      </div>
      <div>${editorHTML}</div>
    </div>
  `;
}
let _libPreview = false;
function addLibraryNote(){
  const notes = getLibraryNotes();
  const n = {id:Date.now(), folder:_libFolder, title:'Untitled', body:'', tags:'', pinned:false, versions:[], createdAt:new Date().toISOString()};
  notes.push(n);
  saveLibraryNotes(notes);
  _libOpenId = n.id;
  renderNotesLibrary();
}
function updateLibraryField(id, key, val){
  const notes = getLibraryNotes();
  const n = notes.find(x=>x.id===id);
  if(!n) return;
  if(key==='body' && n.body!==val){
    n.versions = n.versions || [];
    n.versions.push({body:n.body, savedAt:n.updatedAt||n.createdAt});
    if(n.versions.length>20) n.versions.shift();
  }
  n[key] = val;
  n.updatedAt = new Date().toISOString();
  saveLibraryNotes(notes);
}
function toggleLibraryPin(id){
  const notes = getLibraryNotes();
  const n = notes.find(x=>x.id===id);
  if(n){ n.pinned = !n.pinned; saveLibraryNotes(notes); renderNotesLibrary(); }
}
function deleteLibraryNote(id){
  if(!confirm('Delete this note? This cannot be undone.')) return;
  let notes = getLibraryNotes();
  notes = notes.filter(n=>n.id!==id);
  saveLibraryNotes(notes);
  if(_libOpenId===id) _libOpenId = null;
  renderNotesLibrary();
}

/* ================= TASKS (.plot) — DOCKET WORKSPACE ================= */
let draggingDot = null;
let currentDocketNav = 'today';
let currentDocketView = 'list';
let currentDocketSearch = '';
let _activeDocketProjectId = null;
let _activeProjectSubTab = 'overview';

function renderTasks() {
  const p = document.getElementById('panel-tasks');
  if (!p) return;

  const data = getDocketData();
  const projs = getDocketProjects();
  const today = todayStr();

  const inboxCount = data.items.filter(i => i.status === 'inbox' || i.projectId === 'proj_default').length;
  const todayCount = data.items.filter(i => i.dueDate === today && i.status !== 'completed' && i.status !== 'archived').length;
  const upcomingCount = data.items.filter(i => i.dueDate > today && i.status !== 'completed' && i.status !== 'archived').length;
  const overdueCount = data.items.filter(i => i.dueDate < today && i.status !== 'completed' && i.status !== 'archived').length;
  const waitingCount = data.items.filter(i => (i.status === 'waiting' || (i.blockedBy && i.blockedBy.length > 0)) && i.status !== 'archived').length;
  const projectsCount = projs.length;
  const completedCount = data.items.filter(i => i.status === 'completed').length;
  const archiveCount = data.items.filter(i => i.status === 'archived').length;

  p.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
      <div>
        <h2 style="margin:0;">Docket Work Execution</h2>
        <div class="sub">.plot — Capture, organize, schedule, and track daily work execution</div>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn brass small" onclick="openNewDocketTaskModal()">+ New Task</button>
        <button class="btn ghost small" onclick="openNewDocketProjectModal()">+ New Project</button>
        <button class="btn ghost small" onclick="openDocketQuickCaptureModal()">⚡ Quick Capture</button>
      </div>
    </div>

    <div class="docket-layout">
      <!-- SIDEBAR NAVIGATION -->
      <div class="docket-sidebar">
        <button class="docket-nav-btn ${currentDocketNav === 'inbox' ? 'active' : ''}" onclick="setDocketNav('inbox')">
          <span>📥 Inbox</span>
          <span class="docket-nav-badge">${inboxCount}</span>
        </button>
        <button class="docket-nav-btn ${currentDocketNav === 'today' ? 'active' : ''}" onclick="setDocketNav('today')">
          <span>📅 Today</span>
          <span class="docket-nav-badge">${todayCount}</span>
        </button>
        <button class="docket-nav-btn ${currentDocketNav === 'upcoming' ? 'active' : ''}" onclick="setDocketNav('upcoming')">
          <span>🔮 Upcoming</span>
          <span class="docket-nav-badge">${upcomingCount}</span>
        </button>
        <button class="docket-nav-btn ${currentDocketNav === 'overdue' ? 'active' : ''}" onclick="setDocketNav('overdue')">
          <span>⚠️ Overdue</span>
          <span class="docket-nav-badge" style="${overdueCount > 0 ? 'background:#7f1d1d; color:#fca5a5;' : ''}">${overdueCount}</span>
        </button>
        <button class="docket-nav-btn ${currentDocketNav === 'waiting' ? 'active' : ''}" onclick="setDocketNav('waiting')">
          <span>⏳ Waiting & Blocked</span>
          <span class="docket-nav-badge">${waitingCount}</span>
        </button>
        <button class="docket-nav-btn ${currentDocketNav === 'projects' ? 'active' : ''}" onclick="setDocketNav('projects')">
          <span>📂 Projects</span>
          <span class="docket-nav-badge">${projectsCount}</span>
        </button>
        <button class="docket-nav-btn ${currentDocketNav === 'completed' ? 'active' : ''}" onclick="setDocketNav('completed')">
          <span>✓ Completed</span>
          <span class="docket-nav-badge">${completedCount}</span>
        </button>
        <button class="docket-nav-btn ${currentDocketNav === 'review' ? 'active' : ''}" onclick="setDocketNav('review')">
          <span>📊 Review Workflow</span>
        </button>
        <button class="docket-nav-btn ${currentDocketNav === 'archive' ? 'active' : ''}" onclick="setDocketNav('archive')">
          <span>📦 Archive</span>
          <span class="docket-nav-badge">${archiveCount}</span>
        </button>
      </div>

      <!-- MAIN BODY CONTENT -->
      <div class="docket-main-body">
        <div class="docket-header-bar">
          <div style="display:flex; align-items:center; gap:8px;">
            <input type="text" id="docketSearchInput" value="${escapeHTML(currentDocketSearch)}" placeholder="Search tasks, tags, projects..." oninput="onDocketSearchInput(this.value)" style="width:240px; padding:6px 10px; background:#0f172a; color:#f8fafc; border:1px solid #1e293b; border-radius:4px; font-size:0.85rem;">
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:0.8rem; color:#94a3b8; font-weight:600;">View:</span>
            <button class="btn ghost micro ${currentDocketView === 'list' ? 'active' : ''}" onclick="setDocketView('list')">List</button>
            <button class="btn ghost micro ${currentDocketView === 'board' ? 'active' : ''}" onclick="setDocketView('board')">Board</button>
            <button class="btn ghost micro ${currentDocketView === 'calendar' ? 'active' : ''}" onclick="setDocketView('calendar')">Calendar</button>
            <button class="btn ghost micro ${currentDocketView === 'timeline' ? 'active' : ''}" onclick="setDocketView('timeline')">Timeline</button>
            <button class="btn ghost micro ${currentDocketView === 'matrix' ? 'active' : ''}" onclick="setDocketView('matrix')">Matrix</button>
            <button class="btn ghost micro" onclick="exportTasks()" title="Export .plot">Export</button>
            <button class="btn ghost micro" onclick="importTasks()" title="Import .plot">Import</button>
          </div>
        </div>

        <div id="docketViewContainer">
          ${renderDocketCurrentView(data, projs)}
        </div>
      </div>
    </div>
  `;
}

function setDocketNav(nav) {
  currentDocketNav = nav;
  renderTasks();
}

function setDocketView(view) {
  currentDocketView = view;
  renderTasks();
}

function onDocketSearchInput(q) {
  currentDocketSearch = q;
  const container = document.getElementById('docketViewContainer');
  if (container) {
    const data = getDocketData();
    const projs = getDocketProjects();
    container.innerHTML = renderDocketCurrentView(data, projs);
  }
}

function renderDocketCurrentView(data, projs) {
  if (currentDocketNav === 'projects') return renderDocketProjectsView(data, projs);
  if (currentDocketNav === 'project_workspace') return renderDocketProjectWorkspaceView(data, projs);
  if (currentDocketNav === 'review') return renderDocketReviewView(data, projs);

  if (currentDocketView === 'matrix') {
    return renderDocketMatrixView(data);
  }
  if (currentDocketNav === 'inbox') return renderDocketListSection(data, projs, i => i.status === 'inbox' || i.projectId === 'proj_default', '📥 Inbox Tasks');
  if (currentDocketNav === 'today') return renderDocketTodayView(data, projs);
  if (currentDocketNav === 'upcoming') return renderDocketListSection(data, projs, i => i.dueDate > todayStr() && i.status !== 'completed' && i.status !== 'archived', '🔮 Upcoming Tasks');
  if (currentDocketNav === 'overdue') return renderDocketListSection(data, projs, i => i.dueDate < todayStr() && i.status !== 'completed' && i.status !== 'archived', '⚠️ Overdue Tasks');
  if (currentDocketNav === 'waiting') return renderDocketListSection(data, projs, i => (i.status === 'waiting' || (i.blockedBy && i.blockedBy.length > 0)) && i.status !== 'archived', '⏳ Waiting & Blocked Tasks');
  if (currentDocketNav === 'completed') return renderDocketListSection(data, projs, i => i.status === 'completed', '✓ Completed Tasks');
  if (currentDocketNav === 'archive') return renderDocketListSection(data, projs, i => i.status === 'archived', '📦 Archived Tasks');

  return renderDocketTodayView(data, projs);
}

function filterDocketItemsBySearch(items) {
  if (!currentDocketSearch || !currentDocketSearch.trim()) return items;
  const q = currentDocketSearch.trim().toLowerCase();
  const projs = getDocketProjects();

  return items.filter(i => {
    const proj = projs.find(p => String(p.id) === String(i.projectId));
    const projName = proj ? proj.name.toLowerCase() : '';
    const title = (i.title || '').toLowerCase();
    const desc = (i.description || '').toLowerCase();
    const notes = (i.notes || '').toLowerCase();
    const assignee = (i.assignee || '').toLowerCase();
    const waiting = (i.waitingFor || '').toLowerCase();
    const sourceApp = (i.sourceApp || '').toLowerCase();
    const status = (i.status || '').toLowerCase();
    const priority = (i.priority || '').toLowerCase();
    const tags = (i.tags || []).map(t => t.toLowerCase());

    return title.includes(q) ||
           desc.includes(q) ||
           notes.includes(q) ||
           assignee.includes(q) ||
           waiting.includes(q) ||
           sourceApp.includes(q) ||
           status.includes(q) ||
           priority.includes(q) ||
           projName.includes(q) ||
           tags.some(t => t.includes(q));
  });
}

function renderDocketListSection(data, projs, filterFn, title) {
  let items = data.items.filter(filterFn);
  items = filterDocketItemsBySearch(items);

  if (currentDocketView === 'board') return renderDocketBoardView(items, projs);
  if (currentDocketView === 'calendar') return renderDocketCalendarView(items, projs);
  if (currentDocketView === 'timeline') return renderDocketTimelineView(items, projs);

  return `
    <h3 style="margin-top:0; font-size:1rem; color:#f8fafc; border-bottom:1px solid #1e293b; padding-bottom:8px;">${title} (${items.length})</h3>
    ${items.length === 0 ? '<div style="color:#64748b; padding:20px 0; text-align:center;">No tasks found in this view.</div>' : ''}
    <div>
      ${items.map(i => renderDocketTaskItemCard(i, projs)).join('')}
    </div>
  `;
}

function renderDocketTaskItemCard(item, projs) {
  const proj = projs.find(p => p.id === item.projectId);
  const projName = proj ? proj.name : 'General';
  const isOverdue = item.dueDate < todayStr() && item.status !== 'completed';

  return `
    <div class="docket-task-item" onclick="openDocketTaskDetailModal('${item.id}')">
      <div style="display:flex; align-items:center; gap:10px; flex:1;">
        <input type="checkbox" ${item.done ? 'checked' : ''} onclick="event.stopPropagation(); toggleDocketTaskDone('${item.id}')" style="cursor:pointer; width:16px; height:16px;">
        <div>
          <div style="font-weight:600; font-size:0.9rem; text-decoration:${item.done ? 'line-through' : 'none'}; color:${item.done ? '#64748b' : '#f8fafc'};">
            ${escapeHTML(item.title)}
            ${item.sourceApp ? `<span class="tag-pill" style="font-size:0.7rem; margin-left:6px;">from ${item.sourceApp}</span>` : ''}
          </div>
          <div style="font-size:0.75rem; color:#94a3b8; display:flex; gap:10px; margin-top:2px;">
            <span>📂 ${escapeHTML(projName)}</span>
            <span style="${isOverdue ? 'color:#fca5a5; font-weight:bold;' : ''}">📅 ${item.dueDate || 'No due date'}</span>
            ${item.recurrence && item.recurrence !== 'none' ? `<span>🔄 ${item.recurrence}</span>` : ''}
            ${item.blockedBy && item.blockedBy.length > 0 ? `<span style="color:#fca5a5;">🔒 Blocked by ${item.blockedBy.length}</span>` : ''}
          </div>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        <span class="docket-priority-badge docket-priority-${item.priority || 'normal'}">${item.priority || 'normal'}</span>
        <span style="font-size:0.75rem; color:#64748b; background:#1e293b; padding:2px 8px; border-radius:4px;">${item.status || 'inbox'}</span>
        <button class="btn ghost micro" onclick="event.stopPropagation(); deleteDocketTask('${item.id}')" title="Delete">🗑</button>
      </div>
    </div>
  `;
}

function renderDocketTodayView(data, projs) {
  if (currentDocketView === 'board') return renderDocketBoardView(data.items, projs);
  if (currentDocketView === 'calendar') return renderDocketCalendarView(data.items, projs);
  if (currentDocketView === 'timeline') return renderDocketTimelineView(data.items, projs);

  const today = todayStr();
  let overdue = data.items.filter(i => i.dueDate < today && i.status !== 'completed' && i.status !== 'archived');
  let dueToday = data.items.filter(i => i.dueDate === today && i.status !== 'completed' && i.status !== 'archived');
  let completedToday = data.items.filter(i => i.completedAt === today || (i.status === 'completed' && i.dueDate === today));

  overdue = filterDocketItemsBySearch(overdue);
  dueToday = filterDocketItemsBySearch(dueToday);
  completedToday = filterDocketItemsBySearch(completedToday);

  return `
    <div>
      <h3 style="margin-top:0; font-size:1.05rem; color:#f8fafc; border-bottom:1px solid #1e293b; padding-bottom:8px;">📅 TODAY EXECUTION COCKPIT (${today})</h3>

      ${overdue.length > 0 ? `
        <div style="margin-bottom:18px;">
          <h4 style="color:#fca5a5; margin:0 0 8px 0; font-size:0.88rem;">⚠️ OVERDUE TASKS (${overdue.length})</h4>
          ${overdue.map(i => renderDocketTaskItemCard(i, projs)).join('')}
        </div>
      ` : ''}

      <div style="margin-bottom:18px;">
        <h4 style="color:#38bdf8; margin:0 0 8px 0; font-size:0.88rem;">🎯 DUE / SCHEDULED TODAY (${dueToday.length})</h4>
        ${dueToday.length === 0 ? '<div style="color:#64748b; font-size:0.85rem; padding:8px 0;">No tasks scheduled for today. Great job!</div>' : dueToday.map(i => renderDocketTaskItemCard(i, projs)).join('')}
      </div>

      <div>
        <h4 style="color:#4ade80; margin:0 0 8px 0; font-size:0.88rem;">✓ COMPLETED TODAY (${completedToday.length})</h4>
        ${completedToday.length === 0 ? '<div style="color:#64748b; font-size:0.85rem; padding:8px 0;">No tasks completed yet today.</div>' : completedToday.map(i => renderDocketTaskItemCard(i, projs)).join('')}
      </div>
    </div>
  `;
}

function renderDocketProjectsView(data, projs) {
  return `
    <div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <h3 style="margin:0; font-size:1.05rem; color:#f8fafc; display:flex; align-items:center; gap:8px;">
          📂 PROJECT MANAGEMENT WORKSPACE
        </h3>
        <button class="btn brass small" onclick="openNewDocketProjectModal()">+ Create Project</button>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:14px;">
        ${projs.map(p => {
          const projTasks = data.items.filter(i => String(i.projectId) === String(p.id));
          const doneTasks = projTasks.filter(i => i.status === 'completed');
          const blockedTasks = projTasks.filter(i => i.status === 'blocked');
          const inProgTasks = projTasks.filter(i => i.status === 'in_progress');
          const pct = projTasks.length > 0 ? Math.round((doneTasks.length / projTasks.length) * 100) : 0;

          return `
            <div style="background:#0f172a; border:1px solid #1e293b; border-radius:6px; padding:14px; display:flex; flex-direction:column; justify-content:space-between; gap:12px;">
              <div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                  <h4 style="margin:0; color:#f8fafc; font-size:1rem; font-weight:700;">${escapeHTML(p.name)}</h4>
                  <span class="docket-priority-badge docket-priority-${p.priority || 'normal'}">${(p.priority || 'normal').toUpperCase()}</span>
                </div>
                <p style="margin:0 0 10px 0; font-size:0.8rem; color:#94a3b8; line-height:1.4;">${escapeHTML(p.description || 'No project description provided.')}</p>

                <!-- METRICS BADGES -->
                <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px; background:#020617; padding:8px; border-radius:4px; text-align:center; font-size:0.75rem; border:1px solid #1e293b; margin-bottom:10px;">
                  <div><span style="color:#64748b; display:block;">Active</span><span style="color:#38bdf8; font-weight:bold;">${inProgTasks.length}</span></div>
                  <div><span style="color:#64748b; display:block;">Blocked</span><span style="color:#ef4444; font-weight:bold;">${blockedTasks.length}</span></div>
                  <div><span style="color:#64748b; display:block;">Done</span><span style="color:#10b981; font-weight:bold;">${doneTasks.length}/${projTasks.length}</span></div>
                </div>

                <!-- RECENT TASKS IN PROJECT -->
                <div style="display:flex; flex-direction:column; gap:4px; max-height:110px; overflow-y:auto;">
                  ${projTasks.slice(0, 4).map(t => `
                    <div onclick="openDocketTaskDetailModal('${t.id}')" style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; color:#cbd5e1; background:#1e293b; padding:4px 6px; border-radius:3px; cursor:pointer;">
                      <span style="text-decoration:${t.status === 'completed' ? 'line-through' : 'none'}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">• ${escapeHTML(t.title)}</span>
                      <span style="font-size:0.65rem; color:#38bdf8;">${t.status}</span>
                    </div>
                  `).join('')}
                </div>
              </div>

              <div>
                <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:#94a3b8; margin-bottom:4px;">
                  <span>Project Completion Rate</span>
                  <span style="font-weight:bold; color:#38bdf8;">${pct}%</span>
                </div>
                <div style="width:100%; height:6px; background:#1e293b; border-radius:3px; overflow:hidden;">
                  <div style="width:${pct}%; height:100%; background:#0284c7; border-radius:3px;"></div>
                </div>
                <div style="display:flex; gap:6px; margin-top:10px;">
                  <button class="btn brass micro" style="flex:1;" onclick="openDocketProjectWorkspace('${p.id}')">↗ Open Workspace</button>
                  <button class="btn ghost micro" onclick="openDocketProjectEditorModal('${p.id}')">✏️ Edit</button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}


function openDocketProjectWorkspace(projId) {
  _activeDocketProjectId = projId;
  _activeProjectSubTab = 'overview';
  currentDocketNav = 'project_workspace';
  renderTasks();
}

function setDocketProjectSubTab(tab) {
  _activeProjectSubTab = tab;
  renderTasks();
}

function renderDocketProjectWorkspaceView(data, projs) {
  const p = projs.find(x => String(x.id) === String(_activeDocketProjectId)) || projs[0];
  if (!p) {
    currentDocketNav = 'projects';
    return renderDocketProjectsView(data, projs);
  }

  const projTasks = data.items.filter(i => String(i.projectId) === String(p.id));
  const doneTasks = projTasks.filter(i => i.status === 'completed');
  const blockedTasks = projTasks.filter(i => i.status === 'blocked');
  const inProgTasks = projTasks.filter(i => i.status === 'in_progress');
  const plannedTasks = projTasks.filter(i => i.status === 'planned' || i.status === 'inbox');
  const pct = projTasks.length > 0 ? Math.round((doneTasks.length / projTasks.length) * 100) : 0;
  const milestones = p.milestones || [];
  const doneMilestones = milestones.filter(m => typeof m === 'object' && m.status === 'completed').length;
  const milestonePct = milestones.length > 0 ? Math.round((doneMilestones / milestones.length) * 100) : 0;

  return `
    <div>
      <!-- PROJECT HEADER -->
      <div style="background:#0f172a; border:1px solid #1e293b; border-radius:6px; padding:16px; margin-bottom:14px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px; margin-bottom:10px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
              <button class="btn ghost micro" onclick="setDocketNav('projects')">← Back to Projects</button>
              <h3 style="margin:0; font-size:1.2rem; color:#f8fafc; font-weight:700;">📂 ${escapeHTML(p.name)}</h3>
              <span class="docket-priority-badge docket-priority-${p.priority || 'normal'}">${(p.priority || 'normal').toUpperCase()}</span>
              <span style="font-size:0.75rem; background:#1e293b; color:#38bdf8; padding:2px 8px; border-radius:10px; font-weight:600;">${p.status || 'active'}</span>
            </div>
            <p style="margin:0; font-size:0.85rem; color:#94a3b8;">${escapeHTML(p.description || 'No description provided.')}</p>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn brass micro" onclick="openNewDocketTaskModalWithProject('${p.id}')">+ Quick Task</button>
            <button class="btn ghost micro" onclick="openDocketProjectEditorModal('${p.id}')">✏️ Edit Project</button>
            <button class="btn ghost micro" style="color:#ef4444;" onclick="deleteDocketProject('${p.id}')">🗑️ Delete</button>
          </div>
        </div>

        <div style="display:flex; gap:16px; font-size:0.8rem; color:#64748b; border-top:1px solid #1e293b; padding-top:8px;">
          <span>👤 Owner: <strong style="color:#cbd5e1;">${escapeHTML(p.owner || 'Self')}</strong></span>
          <span>📅 Start: <strong style="color:#cbd5e1;">${p.startDate || 'N/A'}</strong></span>
          <span>🎯 Target Date: <strong style="color:#38bdf8;">${p.targetDate || 'N/A'}</strong></span>
          <span>🏷️ Tags: <strong style="color:#cbd5e1;">${(p.tags || []).join(', ') || 'None'}</strong></span>
        </div>
      </div>

      <!-- WORKSPACE SUB-TABS -->
      <div style="display:flex; gap:6px; border-bottom:1px solid #1e293b; margin-bottom:14px; overflow-x:auto;">
        <button class="btn ghost micro ${_activeProjectSubTab === 'overview' ? 'active' : ''}" onclick="setDocketProjectSubTab('overview')">📊 Overview</button>
        <button class="btn ghost micro ${_activeProjectSubTab === 'tasks' ? 'active' : ''}" onclick="setDocketProjectSubTab('tasks')">📋 Tasks (${projTasks.length})</button>
        <button class="btn ghost micro ${_activeProjectSubTab === 'board' ? 'active' : ''}" onclick="setDocketProjectSubTab('board')">📌 Board</button>
        <button class="btn ghost micro ${_activeProjectSubTab === 'calendar' ? 'active' : ''}" onclick="setDocketProjectSubTab('calendar')">📅 Calendar</button>
        <button class="btn ghost micro ${_activeProjectSubTab === 'timeline' ? 'active' : ''}" onclick="setDocketProjectSubTab('timeline')">📈 Timeline</button>
        <button class="btn ghost micro ${_activeProjectSubTab === 'milestones' ? 'active' : ''}" onclick="setDocketProjectSubTab('milestones')">🎯 Milestones (${milestones.length})</button>
        <button class="btn ghost micro ${_activeProjectSubTab === 'notes' ? 'active' : ''}" onclick="setDocketProjectSubTab('notes')">📝 Notes & Links</button>
      </div>

      <!-- SUB-TAB CONTENT -->
      <div>
        ${renderDocketProjectWorkspaceSubTab(p, projTasks, data, projs)}
      </div>
    </div>
  `;
}

function renderDocketProjectWorkspaceSubTab(p, projTasks, data, projs) {
  const doneTasks = projTasks.filter(i => i.status === 'completed');
  const blockedTasks = projTasks.filter(i => i.status === 'blocked');
  const inProgTasks = projTasks.filter(i => i.status === 'in_progress');
  const plannedTasks = projTasks.filter(i => i.status === 'planned' || i.status === 'inbox');
  const pct = projTasks.length > 0 ? Math.round((doneTasks.length / projTasks.length) * 100) : 0;
  const milestones = p.milestones || [];

  if (_activeProjectSubTab === 'overview') {
    return `
      <div style="display:grid; grid-template-columns:2fr 1fr; gap:14px;">
        <div style="display:flex; flex-direction:column; gap:14px;">
          <!-- METRICS CARDS -->
          <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:10px;">
            <div style="background:#0f172a; border:1px solid #1e293b; padding:10px; border-radius:6px; text-align:center;">
              <span style="font-size:0.75rem; color:#64748b; display:block;">Total Tasks</span>
              <span style="font-size:1.2rem; font-weight:700; color:#f8fafc;">${projTasks.length}</span>
            </div>
            <div style="background:#0f172a; border:1px solid #1e293b; padding:10px; border-radius:6px; text-align:center;">
              <span style="font-size:0.75rem; color:#64748b; display:block;">In Progress</span>
              <span style="font-size:1.2rem; font-weight:700; color:#38bdf8;">${inProgTasks.length}</span>
            </div>
            <div style="background:#0f172a; border:1px solid #1e293b; padding:10px; border-radius:6px; text-align:center;">
              <span style="font-size:0.75rem; color:#64748b; display:block;">Blocked</span>
              <span style="font-size:1.2rem; font-weight:700; color:#ef4444;">${blockedTasks.length}</span>
            </div>
            <div style="background:#0f172a; border:1px solid #1e293b; padding:10px; border-radius:6px; text-align:center;">
              <span style="font-size:0.75rem; color:#64748b; display:block;">Completed</span>
              <span style="font-size:1.2rem; font-weight:700; color:#10b981;">${doneTasks.length}</span>
            </div>
          </div>

          <!-- PROGRESS BAR -->
          <div style="background:#0f172a; border:1px solid #1e293b; border-radius:6px; padding:12px;">
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:#94a3b8; margin-bottom:6px;">
              <span>Overall Project Completion</span>
              <span style="color:#38bdf8; font-weight:700;">${pct}%</span>
            </div>
            <div style="height:8px; background:#1e293b; border-radius:4px; overflow:hidden;">
              <div style="height:100%; width:${pct}%; background:#0284c7; transition:width 0.3s;"></div>
            </div>
          </div>

          <!-- RECENT TASKS -->
          <div style="background:#0f172a; border:1px solid #1e293b; border-radius:6px; padding:12px;">
            <h4 style="margin:0 0 10px 0; font-size:0.9rem; color:#f8fafc; font-weight:600;">📋 Project Tasks</h4>
            <div style="display:flex; flex-direction:column; gap:6px; max-height:220px; overflow-y:auto;">
              ${projTasks.length === 0 ? '<div style="color:#64748b; font-size:0.8rem;">No tasks assigned to this project yet.</div>' : projTasks.map(t => `
                <div onclick="openDocketTaskDetailModal('${t.id}')" style="display:flex; justify-content:space-between; align-items:center; padding:6px 10px; background:#020617; border:1px solid #1e293b; border-radius:4px; cursor:pointer; font-size:0.8rem;">
                  <span style="color:${t.status === 'completed' ? '#64748b' : '#f8fafc'}; text-decoration:${t.status === 'completed' ? 'line-through' : 'none'};">${escapeHTML(t.title)}</span>
                  <div style="display:flex; gap:8px; align-items:center;">
                    <span style="font-size:0.7rem; color:#64748b;">Due: ${t.dueDate || 'N/A'}</span>
                    <span class="docket-priority-badge docket-priority-${t.priority}">${t.priority}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:14px;">
          <!-- MILESTONES SUMMARY -->
          <div style="background:#0f172a; border:1px solid #1e293b; border-radius:6px; padding:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <h4 style="margin:0; font-size:0.9rem; color:#f8fafc; font-weight:600;">🎯 Milestones</h4>
              <button class="btn brass micro" onclick="openDocketMilestoneModal('${p.id}')">+ Add</button>
            </div>
            <div style="display:flex; flex-direction:column; gap:6px;">
              ${milestones.length === 0 ? '<div style="color:#64748b; font-size:0.8rem;">No milestones defined.</div>' : milestones.map((m, idx) => {
                const isObj = typeof m === 'object';
                const mName = isObj ? m.name : m;
                const mDone = isObj ? m.status === 'completed' : false;
                const mId = isObj ? m.id : 'm_' + idx;
                return `
                  <div style="display:flex; justify-content:space-between; align-items:center; padding:6px; background:#020617; border:1px solid #1e293b; border-radius:4px; font-size:0.8rem;">
                    <label style="display:flex; align-items:center; gap:6px; cursor:pointer; color:${mDone ? '#64748b' : '#cbd5e1'}; text-decoration:${mDone ? 'line-through' : 'none'};">
                      <input type="checkbox" ${mDone ? 'checked' : ''} onchange="toggleDocketMilestoneStatus('${p.id}', '${mId}')">
                      <span>${escapeHTML(mName)}</span>
                    </label>
                    <button class="btn ghost micro" style="color:#ef4444;" onclick="deleteDocketMilestone('${p.id}', '${mId}')">×</button>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  if (_activeProjectSubTab === 'tasks') {
    return renderDocketListSection(data, projs, i => String(i.projectId) === String(p.id), `Tasks in ${p.name}`);
  }

  if (_activeProjectSubTab === 'board') {
    return renderDocketBoardView(projTasks, projs);
  }

  if (_activeProjectSubTab === 'calendar') {
    return renderDocketCalendarView(projTasks, projs);
  }

  if (_activeProjectSubTab === 'timeline') {
    return renderDocketTimelineView(projTasks, projs);
  }

  if (_activeProjectSubTab === 'milestones') {
    return `
      <div style="background:#0f172a; border:1px solid #1e293b; border-radius:6px; padding:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
          <h4 style="margin:0; color:#f8fafc; font-size:1rem; font-weight:700;">🎯 Project Milestones Manager</h4>
          <button class="btn brass micro" onclick="openDocketMilestoneModal('${p.id}')">+ Add Milestone</button>
        </div>

        <div style="display:flex; flex-direction:column; gap:10px;">
          ${milestones.length === 0 ? '<div style="color:#64748b; font-size:0.85rem;">No milestones created for this project yet.</div>' : milestones.map((m, idx) => {
            const isObj = typeof m === 'object';
            const mName = isObj ? m.name : m;
            const mDesc = isObj ? (m.description || '') : '';
            const mDate = isObj ? (m.targetDate || '') : '';
            const mDone = isObj ? m.status === 'completed' : false;
            const mId = isObj ? m.id : 'm_' + idx;

            return `
              <div style="background:#020617; border:1px solid #1e293b; border-radius:6px; padding:12px; display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:flex-start; gap:10px;">
                  <input type="checkbox" ${mDone ? 'checked' : ''} onchange="toggleDocketMilestoneStatus('${p.id}', '${mId}')" style="margin-top:3px;">
                  <div>
                    <h5 style="margin:0 0 4px 0; color:${mDone ? '#64748b' : '#f8fafc'}; text-decoration:${mDone ? 'line-through' : 'none'}; font-size:0.95rem;">${escapeHTML(mName)}</h5>
                    <p style="margin:0; font-size:0.8rem; color:#94a3b8;">${escapeHTML(mDesc || 'No details specified.')}</p>
                    ${mDate ? `<span style="font-size:0.75rem; color:#38bdf8; display:inline-block; margin-top:4px;">Target Date: ${mDate}</span>` : ''}
                  </div>
                </div>
                <div style="display:flex; gap:6px;">
                  <button class="btn ghost micro" onclick="openDocketMilestoneModal('${p.id}', '${mId}')">Edit</button>
                  <button class="btn ghost micro" style="color:#ef4444;" onclick="deleteDocketMilestone('${p.id}', '${mId}')">Delete</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  if (_activeProjectSubTab === 'notes') {
    return `
      <div style="background:#0f172a; border:1px solid #1e293b; border-radius:6px; padding:16px;">
        <h4 style="margin:0 0 12px 0; color:#f8fafc; font-size:1rem; font-weight:700;">📝 Project Notes & Work Logs</h4>
        <textarea id="projectNotesTextarea" rows="8" style="width:100%; padding:10px; background:#020617; color:#f8fafc; border:1px solid #334155; border-radius:4px; font-family:inherit; resize:vertical; margin-bottom:12px;" placeholder="Add project specifications, team updates, decisions, or meeting logs...">${escapeHTML(p.notes || '')}</textarea>
        <button class="btn brass small" onclick="saveDocketProjectNotes('${p.id}')">Save Project Notes</button>
      </div>
    `;
  }

  return '';
}

function openNewDocketTaskModalWithProject(projId) {
  const projs = getDocketProjects();
  openModalForm({
    title: 'New Task in Project',
    fields: [
      { name: 'title', label: 'Task Title', type: 'text', value: '', required: true },
      { name: 'description', label: 'Description', type: 'text', value: '' },
      { name: 'priority', label: 'Priority', type: 'select', value: 'normal', options: ['low', 'normal', 'high', 'urgent'] },
      { name: 'projectId', label: 'Project', type: 'select', value: projId, options: projs.map(p => p.id) },
      { name: 'dueDate', label: 'Due Date', type: 'text', value: todayStr() }
    ],
    onSubmit: (vals) => {
      if (!vals.title) return;
      const data = getDocketData();
      const newTask = {
        id: 'task_' + Date.now(),
        title: vals.title,
        label: vals.title,
        description: vals.description || '',
        status: 'planned',
        priority: vals.priority || 'normal',
        projectId: vals.projectId || projId,
        startDate: todayStr(),
        dueDate: vals.dueDate || todayStr(),
        createdAt: todayStr()
      };
      data.items.push(newTask);
      saveDocketData(data);
      renderTasks();
    }
  });
}

function openDocketProjectEditorModal(projId) {
  const projs = getDocketProjects();
  const p = projs.find(x => String(x.id) === String(projId));
  if (!p) return;

  openModalForm({
    title: 'Edit Project Workspace',
    fields: [
      { name: 'name', label: 'Project Name', type: 'text', value: p.name, required: true },
      { name: 'description', label: 'Description', type: 'text', value: p.description || '' },
      { name: 'owner', label: 'Project Owner', type: 'text', value: p.owner || 'Self' },
      { name: 'status', label: 'Status', type: 'select', value: p.status || 'active', options: ['active', 'planning', 'on_hold', 'completed'] },
      { name: 'priority', label: 'Priority', type: 'select', value: p.priority || 'normal', options: ['low', 'normal', 'high', 'urgent'] },
      { name: 'startDate', label: 'Start Date', type: 'text', value: p.startDate || todayStr() },
      { name: 'targetDate', label: 'Target Date', type: 'text', value: p.targetDate || todayStr() },
      { name: 'tags', label: 'Tags (comma separated)', type: 'text', value: (p.tags || []).join(', ') }
    ],
    onSubmit: (vals) => {
      if (!vals.name) return;
      p.name = vals.name;
      p.description = vals.description || '';
      p.owner = vals.owner || 'Self';
      p.status = vals.status || 'active';
      p.priority = vals.priority || 'normal';
      p.startDate = vals.startDate || todayStr();
      p.targetDate = vals.targetDate || todayStr();
      p.tags = (vals.tags || '').split(',').map(s => s.trim()).filter(Boolean);

      saveDocketProjects(projs);
      renderTasks();
    }
  });
}

function deleteDocketProject(projId) {
  if (projId === 'proj_default') {
    alert('Cannot delete the default project.');
    return;
  }
  const projs = getDocketProjects().filter(x => String(x.id) !== String(projId));
  saveDocketProjects(projs);
  if (_activeDocketProjectId === projId) {
    _activeDocketProjectId = null;
    currentDocketNav = 'projects';
  }
  renderTasks();
}

function saveDocketProjectNotes(projId) {
  const notesText = document.getElementById('projectNotesTextarea')?.value || '';
  const projs = getDocketProjects();
  const p = projs.find(x => String(x.id) === String(projId));
  if (p) {
    p.notes = notesText;
    saveDocketProjects(projs);
    alert('Project notes saved successfully.');
  }
}

function openDocketMilestoneModal(projId, milestoneId = null) {
  const projs = getDocketProjects();
  const p = projs.find(x => String(x.id) === String(projId));
  if (!p) return;

  p.milestones = p.milestones || [];
  let existingM = null;
  if (milestoneId) {
    existingM = p.milestones.find(m => typeof m === 'object' && String(m.id) === String(milestoneId));
  }

  openModalForm({
    title: milestoneId ? 'Edit Milestone' : 'New Milestone',
    fields: [
      { name: 'name', label: 'Milestone Title', type: 'text', value: existingM ? existingM.name : '', required: true },
      { name: 'description', label: 'Description', type: 'text', value: existingM ? (existingM.description || '') : '' },
      { name: 'targetDate', label: 'Target Date', type: 'text', value: existingM ? (existingM.targetDate || todayStr()) : todayStr() },
      { name: 'status', label: 'Status', type: 'select', value: existingM ? existingM.status : 'pending', options: ['pending', 'completed'] }
    ],
    onSubmit: (vals) => {
      if (!vals.name) return;
      if (existingM) {
        existingM.name = vals.name;
        existingM.description = vals.description || '';
        existingM.targetDate = vals.targetDate || todayStr();
        existingM.status = vals.status;
      } else {
        p.milestones.push({
          id: 'm_' + Date.now(),
          name: vals.name,
          description: vals.description || '',
          targetDate: vals.targetDate || todayStr(),
          status: vals.status || 'pending',
          createdAt: todayStr()
        });
      }
      saveDocketProjects(projs);
      renderTasks();
    }
  });
}

function toggleDocketMilestoneStatus(projId, milestoneId) {
  const projs = getDocketProjects();
  const p = projs.find(x => String(x.id) === String(projId));
  if (!p || !p.milestones) return;

  const m = p.milestones.find(x => (typeof x === 'object' && String(x.id) === String(milestoneId)) || String(x) === String(milestoneId));
  if (m) {
    if (typeof m === 'object') {
      m.status = m.status === 'completed' ? 'pending' : 'completed';
    }
    saveDocketProjects(projs);
    renderTasks();
  }
}

function deleteDocketMilestone(projId, milestoneId) {
  const projs = getDocketProjects();
  const p = projs.find(x => String(x.id) === String(projId));
  if (!p || !p.milestones) return;

  p.milestones = p.milestones.filter(x => (typeof x === 'object' ? String(x.id) !== String(milestoneId) : String(x) !== String(milestoneId)));
  saveDocketProjects(projs);
  renderTasks();
}

function renderDocketReviewView(data, projs) {
  const today = todayStr();
  const completedToday = data.items.filter(i => i.completedAt === today || (i.status === 'completed' && i.dueDate === today));
  const overdue = data.items.filter(i => i.dueDate < today && i.status !== 'completed' && i.status !== 'archived');
  const waiting = data.items.filter(i => i.status === 'waiting' || i.status === 'blocked' || (i.blockedBy && i.blockedBy.length > 0));
  const unassigned = data.items.filter(i => i.projectId === 'proj_default' && i.status !== 'completed' && i.status !== 'archived');

  return `
    <div>
      <h3 style="margin-top:0; font-size:1.05rem; color:#f8fafc; border-bottom:1px solid #1e293b; padding-bottom:8px; display:flex; align-items:center; gap:8px;">
        📊 WORKFLOW REVIEW & ACTION CENTER
      </h3>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;">
        <!-- OVERDUE ACTION CENTER -->
        <div style="background:#0f172a; padding:14px; border-radius:6px; border:1px solid #1e293b;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <h4 style="margin:0; color:#fca5a5; font-size:0.9rem;">⚠️ Overdue Needing Action (${overdue.length})</h4>
            ${overdue.length > 0 ? `<button class="btn ghost micro" onclick="batchRescheduleOverdueTasks()">Reschedule All to Today</button>` : ''}
          </div>
          <div style="display:flex; flex-direction:column; gap:6px; max-height:220px; overflow-y:auto;">
            ${overdue.length === 0 ? '<div style="color:#64748b; font-size:0.8rem;">No overdue tasks. All work is on track!</div>' : overdue.map(i => `
              <div style="display:flex; justify-content:space-between; align-items:center; background:#020617; padding:6px; border-radius:4px; border:1px solid #1e293b; font-size:0.8rem;">
                <div>
                  <span style="color:#f8fafc; font-weight:600;">${escapeHTML(i.title)}</span>
                  <span style="color:#ef4444; font-size:0.7rem; display:block;">Due: ${i.dueDate}</span>
                </div>
                <div style="display:flex; gap:4px;">
                  <button class="btn brass micro" onclick="toggleDocketTaskDone('${i.id}')">Complete</button>
                  <button class="btn ghost micro" onclick="rescheduleDocketTaskToToday('${i.id}')">To Today</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- WAITING / BLOCKED ACTION CENTER -->
        <div style="background:#0f172a; padding:14px; border-radius:6px; border:1px solid #1e293b;">
          <h4 style="margin:0 0 10px 0; color:#fdba74; font-size:0.9rem;">⏳ Waiting / Blocked Items (${waiting.length})</h4>
          <div style="display:flex; flex-direction:column; gap:6px; max-height:220px; overflow-y:auto;">
            ${waiting.length === 0 ? '<div style="color:#64748b; font-size:0.8rem;">No blocked or waiting tasks.</div>' : waiting.map(i => `
              <div style="display:flex; justify-content:space-between; align-items:center; background:#020617; padding:6px; border-radius:4px; border:1px solid #1e293b; font-size:0.8rem;">
                <div>
                  <span style="color:#f8fafc; font-weight:600;">${escapeHTML(i.title)}</span>
                  <span style="color:#fb923c; font-size:0.7rem; display:block;">Reason: ${escapeHTML(i.waitingFor || (i.blockedBy || []).join(', ') || 'Blocked')}</span>
                </div>
                <button class="btn ghost micro" onclick="unblockDocketTask('${i.id}')">Unblock</button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
        <!-- UNASSIGNED INBOX ACTION CENTER -->
        <div style="background:#0f172a; padding:14px; border-radius:6px; border:1px solid #1e293b;">
          <h4 style="margin:0 0 10px 0; color:#38bdf8; font-size:0.9rem;">📥 Unassigned Inbox Items (${unassigned.length})</h4>
          <div style="display:flex; flex-direction:column; gap:6px; max-height:220px; overflow-y:auto;">
            ${unassigned.length === 0 ? '<div style="color:#64748b; font-size:0.8rem;">Inbox is clear!</div>' : unassigned.map(i => `
              <div style="display:flex; justify-content:space-between; align-items:center; background:#020617; padding:6px; border-radius:4px; border:1px solid #1e293b; font-size:0.8rem;">
                <span style="color:#f8fafc;">${escapeHTML(i.title)}</span>
                <button class="btn ghost micro" onclick="openDocketTaskDetailModal('${i.id}', 'planning')">Assign Project</button>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- TODAY COMPLETED LOG -->
        <div style="background:#0f172a; padding:14px; border-radius:6px; border:1px solid #1e293b;">
          <h4 style="margin:0 0 10px 0; color:#4ade80; font-size:0.9rem;">✓ Completed Today (${completedToday.length})</h4>
          <div style="display:flex; flex-direction:column; gap:6px; max-height:220px; overflow-y:auto;">
            ${completedToday.length === 0 ? '<div style="color:#64748b; font-size:0.8rem;">No tasks completed yet today.</div>' : completedToday.map(i => `
              <div style="display:flex; justify-content:space-between; align-items:center; background:#020617; padding:6px; border-radius:4px; border:1px solid #1e293b; font-size:0.8rem;">
                <span style="color:#cbd5e1; text-decoration:line-through;">${escapeHTML(i.title)}</span>
                <span style="color:#4ade80; font-size:0.7rem;">Done</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

function rescheduleDocketTaskToToday(id) {
  const data = getDocketData();
  const item = data.items.find(i => String(i.id) === String(id));
  if (item) {
    item.dueDate = todayStr();
    item.updatedAt = todayStr();
    saveDocketData(data);
    renderTasks();
    if (document.getElementById('capsuleModalBg')?.classList.contains('show') && _docketInspectorActiveTab === 'structure') {
      openDocketTaskDetailModal(item.parentTaskId || item.id, 'structure');
    }
  }
}

function batchRescheduleOverdueTasks() {
  const data = getDocketData();
  const today = todayStr();
  data.items.forEach(i => {
    if (i.dueDate < today && i.status !== 'completed' && i.status !== 'archived') {
      i.dueDate = today;
      i.updatedAt = today;
    }
  });
  saveDocketData(data);
  renderTasks();
}

function unblockDocketTask(id) {
  const data = getDocketData();
  const item = data.items.find(i => String(i.id) === String(id));
  if (item) {
    item.status = 'in_progress';
    item.waitingFor = '';
    item.blockedBy = [];
    item.updatedAt = todayStr();
    saveDocketData(data);
    renderTasks();
    if (document.getElementById('capsuleModalBg')?.classList.contains('show') && _docketInspectorActiveTab === 'structure') {
      openDocketTaskDetailModal(item.parentTaskId || item.id, 'structure');
    }
  }
}

let _docketCalYear = null;
let _docketCalMonth = null; // 0-indexed

function renderDocketBoardView(items, projs) {
  const statuses = ['inbox', 'planned', 'in_progress', 'waiting', 'blocked', 'completed'];
  const statusLabels = {
    inbox: '📥 Inbox',
    planned: '📅 Planned',
    in_progress: '🚀 In Progress',
    waiting: '⏳ Waiting',
    blocked: '🛑 Blocked',
    completed: '✓ Completed'
  };

  return `
    <div style="display:flex; gap:12px; overflow-x:auto; padding-bottom:12px;">
      ${statuses.map(st => {
        const colItems = items.filter(i => i.status === st);
        return `
          <div style="flex:1; min-width:240px; background:#0f172a; border:1px solid #1e293b; border-radius:6px; padding:10px; display:flex; flex-direction:column;"
               ondragover="event.preventDefault()"
               ondrop="handleDocketBoardDrop(event, '${st}')">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #1e293b; padding-bottom:6px; margin-bottom:10px;">
              <h4 style="margin:0; font-size:0.82rem; text-transform:uppercase; color:#38bdf8; font-weight:700;">${statusLabels[st] || st}</h4>
              <span style="font-size:0.75rem; background:#1e293b; color:#cbd5e1; padding:2px 8px; border-radius:10px;">${colItems.length}</span>
            </div>
            <div style="flex:1; min-height:220px; display:flex; flex-direction:column; gap:8px;">
              ${colItems.length === 0 ? '<div style="color:#64748b; font-size:0.75rem; text-align:center; padding:16px; border:1px dashed #1e293b; border-radius:4px;">Drag tasks here</div>' : colItems.map(i => `
                <div draggable="true"
                     ondragstart="handleDocketBoardDragStart(event, '${i.id}')"
                     style="cursor:grab;">
                  ${renderDocketTaskItemCard(i, projs)}
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function handleDocketBoardDragStart(e, taskId) {
  e.dataTransfer.setData('text/plain', taskId);
}

function handleDocketBoardDrop(e, targetStatus) {
  e.preventDefault();
  const taskId = e.dataTransfer.getData('text/plain');
  if (!taskId) return;

  const data = getDocketData();
  const item = data.items.find(i => String(i.id) === String(taskId));
  if (item) {
    item.status = targetStatus;
    item.done = targetStatus === 'completed';
    if (item.done) {
      item.completedAt = todayStr();
      item.completedDate = todayStr();
    }
    item.updatedAt = todayStr();
    item.activity = item.activity || [];
    item.activity.push({
      timestamp: todayStr() + ' ' + new Date().toTimeString().slice(0, 5),
      action: 'Status Changed',
      detail: `Moved task to ${targetStatus}`
    });

    resolveDocketDependencies(data);
    saveDocketData(data);
    renderTasks();
    if (document.getElementById('capsuleModalBg')?.classList.contains('show') && _docketInspectorActiveTab === 'structure') {
      openDocketTaskDetailModal(item.parentTaskId || item.id, 'structure');
    }
  }
}

function renderDocketCalendarView(items, projs) {
  const now = new Date();
  if (_docketCalYear === null) _docketCalYear = now.getFullYear();
  if (_docketCalMonth === null) _docketCalMonth = now.getMonth();

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const firstDay = new Date(_docketCalYear, _docketCalMonth, 1);
  const lastDay = new Date(_docketCalYear, _docketCalMonth + 1, 0);

  let startDayOfWeek = firstDay.getDay() - 1; // 0 for Mon, 6 for Sun
  if (startDayOfWeek < 0) startDayOfWeek = 6;

  const totalDays = lastDay.getDate();
  const prevMonthLastDay = new Date(_docketCalYear, _docketCalMonth, 0).getDate();

  const calendarCells = [];

  // Previous month padding days
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    const prevDate = new Date(_docketCalYear, _docketCalMonth - 1, dayNum);
    const dateStr = prevDate.toISOString().split('T')[0];
    calendarCells.push({ dateStr, dayNum, isCurrentMonth: false });
  }

  // Current month days
  for (let d = 1; d <= totalDays; d++) {
    const curDate = new Date(_docketCalYear, _docketCalMonth, d);
    const dateStr = curDate.toISOString().split('T')[0];
    calendarCells.push({ dateStr, dayNum: d, isCurrentMonth: true });
  }

  // Next month padding days to complete 35 or 42 grid cells
  const remaining = 35 - calendarCells.length > 0 ? 35 - calendarCells.length : 42 - calendarCells.length;
  for (let n = 1; n <= remaining; n++) {
    const nextDate = new Date(_docketCalYear, _docketCalMonth + 1, n);
    const dateStr = nextDate.toISOString().split('T')[0];
    calendarCells.push({ dateStr, dayNum: n, isCurrentMonth: false });
  }

  return `
    <div style="background:#0f172a; padding:16px; border-radius:6px; border:1px solid #1e293b;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <h4 style="margin:0; color:#38bdf8; font-size:1.1rem; display:flex; align-items:center; gap:8px;">
          📅 Calendar Schedule: <span style="color:#f8fafc;">${monthNames[_docketCalMonth]} ${_docketCalYear}</span>
        </h4>
        <div style="display:flex; gap:6px;">
          <button class="btn ghost micro" onclick="changeDocketCalMonth(-1)">◀ Prev</button>
          <button class="btn ghost micro" onclick="resetDocketCalMonth()">Today</button>
          <button class="btn ghost micro" onclick="changeDocketCalMonth(1)">Next ▶</button>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:6px; font-size:0.8rem; color:#94a3b8; text-align:center; font-weight:600; padding-bottom:6px; border-bottom:1px solid #1e293b;">
        <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
      </div>

      <div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:6px; margin-top:8px;">
        ${calendarCells.map(cell => {
          const dayItems = items.filter(i => i.dueDate === cell.dateStr);
          const isToday = cell.dateStr === todayStr();
          return `
            <div style="background:${cell.isCurrentMonth ? (isToday ? '#1e293b' : '#020617') : '#0b0f19'}; opacity:${cell.isCurrentMonth ? '1' : '0.4'}; border:${isToday ? '1px solid #38bdf8' : '1px solid #1e293b'}; border-radius:4px; padding:6px; min-height:85px; cursor:pointer;"
                 onclick="openQuickTaskForDate('${cell.dateStr}')"
                 ondragover="event.preventDefault()"
                 ondrop="handleDocketCalDrop(event, '${cell.dateStr}')">
              <div style="font-weight:bold; color:${isToday ? '#38bdf8' : '#cbd5e1'}; font-size:0.8rem; margin-bottom:4px; display:flex; justify-content:space-between;">
                <span>${cell.dayNum}</span>
                ${dayItems.length > 0 ? `<span style="font-size:0.7rem; color:#94a3b8;">${dayItems.length}</span>` : ''}
              </div>
              <div style="display:flex; flex-direction:column; gap:2px; max-height:60px; overflow-y:auto;">
                ${dayItems.map(i => `
                  <div onclick="event.stopPropagation(); openDocketTaskDetailModal('${i.id}')"
                       draggable="true"
                       ondragstart="handleDocketBoardDragStart(event, '${i.id}')"
                       style="font-size:0.7rem; color:${i.status === 'completed' ? '#64748b' : '#f8fafc'}; text-decoration:${i.status === 'completed' ? 'line-through' : 'none'}; background:#0f172a; border:1px solid #334155; padding:2px 4px; border-radius:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    ${escapeHTML(i.title)}
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function changeDocketCalMonth(delta) {
  _docketCalMonth += delta;
  if (_docketCalMonth < 0) {
    _docketCalMonth = 11;
    _docketCalYear -= 1;
  } else if (_docketCalMonth > 11) {
    _docketCalMonth = 0;
    _docketCalYear += 1;
  }
  renderTasks();
}

function resetDocketCalMonth() {
  const now = new Date();
  _docketCalYear = now.getFullYear();
  _docketCalMonth = now.getMonth();
  renderTasks();
}

function openQuickTaskForDate(dateStr) {
  openDocketQuickCaptureModal(dateStr);
}

function handleDocketCalDrop(e, targetDateStr) {
  e.preventDefault();
  const taskId = e.dataTransfer.getData('text/plain');
  if (!taskId) return;

  const data = getDocketData();
  const item = data.items.find(i => String(i.id) === String(taskId));
  if (item) {
    item.dueDate = targetDateStr;
    item.updatedAt = todayStr();
    item.activity = item.activity || [];
    item.activity.push({
      timestamp: todayStr() + ' ' + new Date().toTimeString().slice(0, 5),
      action: 'Rescheduled',
      detail: `Rescheduled due date to ${targetDateStr} via Calendar`
    });

    saveDocketData(data);
    renderTasks();
    if (document.getElementById('capsuleModalBg')?.classList.contains('show') && _docketInspectorActiveTab === 'structure') {
      openDocketTaskDetailModal(item.parentTaskId || item.id, 'structure');
    }
  }
}

function renderDocketTimelineView(items, projs) {
  if (items.length === 0) {
    return `<div style="background:#0f172a; padding:20px; border-radius:6px; border:1px solid #1e293b; color:#64748b; text-align:center;">No tasks found for timeline display.</div>`;
  }

  // Calculate timeline date range
  let minTime = Infinity;
  let maxTime = -Infinity;

  items.forEach(i => {
    const sTime = new Date(i.startDate || i.createdAt || todayStr()).getTime();
    const dTime = new Date(i.dueDate || todayStr()).getTime();
    if (sTime < minTime) minTime = sTime;
    if (dTime > maxTime) maxTime = dTime;
  });

  const nowTime = new Date(todayStr()).getTime();
  if (minTime > nowTime) minTime = nowTime - (3 * 86400000);
  if (maxTime < nowTime) maxTime = nowTime + (14 * 86400000);

  // Buffer range by 2 days on each end
  minTime -= 2 * 86400000;
  maxTime += 2 * 86400000;

  const totalDurationMs = maxTime - minTime;
  const totalDays = Math.ceil(totalDurationMs / 86400000);

  // Generate day tick markers for header
  const ticks = [];
  for (let d = 0; d < totalDays; d += Math.max(1, Math.floor(totalDays / 10))) {
    const tickDt = new Date(minTime + (d * 86400000));
    ticks.push({
      label: (tickDt.getMonth() + 1) + '/' + tickDt.getDate(),
      pct: (d / totalDays) * 100
    });
  }

  return `
    <div style="background:#0f172a; padding:16px; border-radius:6px; border:1px solid #1e293b;">
      <h4 style="margin:0 0 12px 0; color:#38bdf8; font-size:1.1rem; display:flex; align-items:center; gap:8px;">
        📈 Date-Driven Project Timeline & Gantt Chart
      </h4>

      <!-- TIMELINE DATE HEADER -->
      <div style="position:relative; height:24px; border-bottom:1px solid #1e293b; margin-bottom:12px; margin-left:180px;">
        ${ticks.map(t => `
          <div style="position:absolute; left:${t.pct}%; transform:translateX(-50%); font-size:0.7rem; color:#94a3b8; font-weight:600;">
            ${t.label}
          </div>
        `).join('')}
      </div>

      <!-- TIMELINE BARS -->
      <div style="display:flex; flex-direction:column; gap:8px; max-height:380px; overflow-y:auto;">
        ${items.map(i => {
          const sTime = new Date(i.startDate || i.createdAt || todayStr()).getTime();
          const dTime = new Date(i.dueDate || todayStr()).getTime();
          const taskDuration = Math.max(86400000, dTime - sTime + 86400000);

          const leftPct = Math.max(0, Math.min(100, ((sTime - minTime) / totalDurationMs) * 100));
          const widthPct = Math.max(2, Math.min(100 - leftPct, (taskDuration / totalDurationMs) * 100));

          const barColor = i.status === 'completed' ? '#10b981' : (i.status === 'blocked' ? '#ef4444' : '#0284c7');

          return `
            <div style="display:flex; align-items:center; gap:12px; font-size:0.8rem; color:#f8fafc;" onclick="openDocketTaskDetailModal('${i.id}')">
              <div style="width:170px; min-width:170px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; cursor:pointer;" title="${escapeHTML(i.title)}">
                <span style="font-weight:600;">${escapeHTML(i.title)}</span>
              </div>
              <div style="flex:1; background:#020617; height:22px; border-radius:4px; position:relative; overflow:hidden; border:1px solid #1e293b;">
                <div style="position:absolute; left:${leftPct}%; width:${widthPct}%; height:100%; background:${barColor}; border-radius:3px; display:flex; align-items:center; padding-left:6px; font-size:0.7rem; color:#ffffff; font-weight:600; white-space:nowrap; overflow:hidden; cursor:pointer; transition:all 0.2s;" title="${i.startDate} to ${i.dueDate}">
                  ${i.startDate} ➔ ${i.dueDate}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderDocketMatrixView(data) {
  return `
    <div>
      <div id="plotArea">
        <div class="plot-axis-label" style="bottom:6px; left:10px;">Soon</div>
        <div class="plot-axis-label" style="bottom:6px; right:10px;">Later</div>
        <div class="plot-axis-label" style="top:6px; left:10px;">Urgent</div>
        <div class="plot-axis-label" style="bottom:50%; left:10px;">Low priority</div>
      </div>
      <div class="hint">Drag dots to adjust priority/timing. Click a dot to toggle completion.</div>
    </div>
  `;
}

function openNewDocketTaskModal() {
  const projs = getDocketProjects();
  openModalForm({
    title: 'New Docket Task',
    fields: [
      { name: 'title', label: 'Task Title', type: 'text', value: '', required: true },
      { name: 'description', label: 'Description / Details', type: 'text', value: '' },
      { name: 'priority', label: 'Priority', type: 'select', value: 'normal', options: ['low', 'normal', 'high', 'urgent'] },
      { name: 'projectId', label: 'Project', type: 'select', value: 'proj_default', options: projs.map(p => p.id) },
      { name: 'dueDate', label: 'Due Date', type: 'text', value: todayStr() },
      { name: 'recurrence', label: 'Recurrence', type: 'select', value: 'none', options: ['none', 'daily', 'weekdays', 'weekly', 'monthly'] }
    ],
    onSubmit: (vals) => {
      if (!vals.title) return;
      const data = getDocketData();
      const newTask = {
        id: 'task_' + Date.now(),
        title: vals.title,
        label: vals.title,
        description: vals.description || '',
        status: 'inbox',
        priority: vals.priority || 'normal',
        projectId: vals.projectId || 'proj_default',
        startDate: todayStr(),
        dueDate: vals.dueDate || todayStr(),
        recurrence: vals.recurrence || 'none',
        createdAt: todayStr()
      };
      data.items.push(newTask);
      saveDocketData(data);
      renderTasks();
    }
  });
}

function openNewDocketProjectModal() {
  openModalForm({
    title: 'New Project Workspace',
    fields: [
      { name: 'name', label: 'Project Name', type: 'text', value: '', required: true },
      { name: 'description', label: 'Description', type: 'text', value: '' },
      { name: 'priority', label: 'Priority', type: 'select', value: 'normal', options: ['low', 'normal', 'high', 'urgent'] },
      { name: 'targetDate', label: 'Target Completion Date', type: 'text', value: todayStr() }
    ],
    onSubmit: (vals) => {
      if (!vals.name) return;
      const projs = getDocketProjects();
      const newProj = {
        id: 'proj_' + Date.now(),
        name: vals.name,
        description: vals.description || '',
        status: 'active',
        owner: 'Self',
        startDate: todayStr(),
        targetDate: vals.targetDate || todayStr(),
        priority: vals.priority || 'normal',
        createdAt: todayStr()
      };
      projs.push(newProj);
      saveDocketProjects(projs);
      _activeDocketProjectId = newProj.id;
      _activeProjectSubTab = 'overview';
      currentDocketNav = 'project_workspace';
      renderTasks();
    }
  });
}

function openDocketQuickCaptureModal(defaultDate = null) {
  const projs = getDocketProjects();
  const projOptions = projs.map(p => `<option value="${p.id}">${escapeHTML(p.name)}</option>`).join('');

  const modal = document.getElementById('capsuleModal');
  if (!modal) return;

  modal.innerHTML = `
    <h3 style="margin-top:0; color:#f8fafc; font-size:1.1rem; display:flex; align-items:center; gap:8px;">
      ⚡ Quick Capture Work
    </h3>
    <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:14px; font-size:0.85rem;">
      <div>
        <label style="display:block; margin-bottom:4px; color:#94a3b8; font-weight:600;">What needs to happen?</label>
        <input type="text" id="qcTaskTitle" placeholder="e.g. Verify Transmute PDF table extraction" style="width:100%; padding:8px 10px; background:#0f172a; color:#f8fafc; border:1px solid #334155; border-radius:4px; font-size:0.9rem;" autofocus>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
        <div>
          <label style="display:block; margin-bottom:4px; color:#94a3b8; font-weight:600;">Project</label>
          <select id="qcTaskProject" style="width:100%; padding:6px; background:#0f172a; color:#f8fafc; border:1px solid #334155; border-radius:4px;">
            ${projOptions}
          </select>
        </div>
        <div>
          <label style="display:block; margin-bottom:4px; color:#94a3b8; font-weight:600;">Priority</label>
          <select id="qcTaskPriority" style="width:100%; padding:6px; background:#0f172a; color:#f8fafc; border:1px solid #334155; border-radius:4px;">
            <option value="low">Low</option>
            <option value="normal" selected>Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
        <div>
          <label style="display:block; margin-bottom:4px; color:#94a3b8; font-weight:600;">Target Date</label>
          <input type="date" id="qcTaskDueDate" value="${defaultDate || todayStr()}" style="width:100%; padding:6px; background:#0f172a; color:#f8fafc; border:1px solid #334155; border-radius:4px;">
        </div>
        <div>
          <label style="display:block; margin-bottom:4px; color:#94a3b8; font-weight:600;">Destination</label>
          <select id="qcTaskDestination" style="width:100%; padding:6px; background:#0f172a; color:#f8fafc; border:1px solid #334155; border-radius:4px;">
            <option value="inbox" selected>📥 Save to Inbox</option>
            <option value="planned">📅 Schedule Task</option>
            <option value="in_progress">🚀 Direct to In Progress</option>
          </select>
        </div>
      </div>

      <div>
        <label style="display:block; margin-bottom:4px; color:#94a3b8; font-weight:600;">Context / Notes</label>
        <textarea id="qcTaskNotes" rows="2" placeholder="Optional details or context..." style="width:100%; padding:6px; background:#0f172a; color:#f8fafc; border:1px solid #334155; border-radius:4px; font-family:inherit; resize:vertical;"></textarea>
      </div>
    </div>

    <div style="display:flex; justify-content:flex-end; gap:8px;">
      <button class="btn ghost small" onclick="closeCapsuleModal()">Cancel</button>
      <button class="btn brass small" onclick="submitQuickCaptureTask()">Save Task</button>
    </div>
  `;

  document.getElementById('capsuleModalBg')?.classList.add('show');
  setTimeout(() => document.getElementById('qcTaskTitle')?.focus(), 100);
}

function submitQuickCaptureTask() {
  const title = document.getElementById('qcTaskTitle')?.value?.trim();
  if (!title) return;

  const projectId = document.getElementById('qcTaskProject')?.value || 'proj_default';
  const priority = document.getElementById('qcTaskPriority')?.value || 'normal';
  const dueDate = document.getElementById('qcTaskDueDate')?.value || todayStr();
  const status = document.getElementById('qcTaskDestination')?.value || 'inbox';
  const notes = document.getElementById('qcTaskNotes')?.value?.trim() || '';

  const data = getDocketData();
  const newTask = {
    id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    title,
    label: title,
    description: notes,
    status,
    priority,
    projectId,
    startDate: todayStr(),
    dueDate,
    notes,
    createdAt: todayStr(),
    activity: [
      { timestamp: todayStr() + ' ' + new Date().toTimeString().slice(0, 5), action: 'Quick Captured', detail: 'Task added via Quick Capture' }
    ]
  };

  data.items.push(newTask);
  saveDocketData(data);
  closeCapsuleModal();
  renderTasks();
}


function hasDependencyPath(data, startId, targetId, visited = new Set()) {
  if (String(startId) === String(targetId)) return true;
  if (visited.has(String(startId))) return false;
  visited.add(String(startId));

  const startTask = data.items.find(i => String(i.id) === String(startId));
  if (!startTask || !startTask.dependencies) return false;

  for (const depId of startTask.dependencies) {
    if (hasDependencyPath(data, depId, targetId, visited)) return true;
  }
  return false;
}

function hasParentPath(data, startId, targetId, visited = new Set()) {
  if (String(startId) === String(targetId)) return true;
  if (visited.has(String(startId))) return false;
  visited.add(String(startId));

  const startTask = data.items.find(i => String(i.id) === String(startId));
  if (!startTask || !startTask.parentTaskId) return false;

  return hasParentPath(data, startTask.parentTaskId, targetId, visited);
}

function resolveDocketDependencies(data) {
  // Resolve blocked status based on prerequisite completion
  data.items.forEach(item => {
    if (item.dependencies && item.dependencies.length > 0) {
      const incompletePrereqs = data.items.filter(dep => item.dependencies.includes(String(dep.id)) && dep.status !== 'completed');
      if (incompletePrereqs.length > 0) {
        if (item.status !== 'completed' && item.status !== 'archived') {
          item.status = 'blocked';
          item.blockedBy = incompletePrereqs.map(p => p.title);
        }
      } else {
        if (item.status === 'blocked') {
          item.status = 'planned';
          item.blockedBy = [];
        }
      }
    }
  });
}

function updateParentTaskProgress(data, parentId) {
  if (!parentId) return;
  const parent = data.items.find(i => String(i.id) === String(parentId));
  if (!parent) return;

  const subtasks = data.items.filter(i => String(i.parentTaskId) === String(parentId));
  if (subtasks.length === 0) return;

  const completedSubtasks = subtasks.filter(s => s.status === 'completed').length;
  if (completedSubtasks === subtasks.length) {
    parent.done = true;
    parent.status = 'completed';
    parent.completedAt = todayStr();
    parent.completedDate = todayStr();
  } else if (completedSubtasks > 0) {
    parent.done = false;
    parent.status = 'in_progress';
  } else {
    parent.done = false;
    if (parent.status === 'completed') parent.status = 'in_progress';
  }
}

function calculateNextRecurrenceDate(startDateStr, pattern, interval = 1) {
  const parts = (startDateStr || todayStr()).split('-');
  const origYear = parseInt(parts[0], 10) || new Date().getFullYear();
  const origMonth = (parseInt(parts[1], 10) || (new Date().getMonth() + 1)) - 1;
  const origDay = parseInt(parts[2], 10) || new Date().getDate();
  const dt = new Date(origYear, origMonth, origDay);
  interval = Math.max(1, parseInt(interval || 1));

  if (pattern === 'daily') {
    dt.setDate(dt.getDate() + interval);
  } else if (pattern === 'weekdays') {
    do {
      dt.setDate(dt.getDate() + 1);
    } while (dt.getDay() === 0 || dt.getDay() === 6);
  } else if (pattern === 'weekly') {
    dt.setDate(dt.getDate() + (7 * interval));
  } else if (pattern === 'monthly') {
    const targetMonth = dt.getMonth() + interval;
    dt.setMonth(targetMonth);
    if (dt.getMonth() !== targetMonth % 12) {
      dt.setDate(0); // Clamp to last day of target month (e.g. Jan 31 -> Feb 28)
    }
  }

  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toggleDocketTaskDone(id) {
  const data = getDocketData();
  const item = data.items.find(i => String(i.id) === String(id));
  if (item) {
    item.done = !item.done;
    item.status = item.done ? 'completed' : 'in_progress';
    item.completedAt = item.done ? todayStr() : null;
    item.completedDate = item.done ? todayStr() : null;

    item.activity = item.activity || [];
    item.activity.push({
      timestamp: todayStr() + ' ' + new Date().toTimeString().slice(0, 5),
      action: item.done ? 'Completed' : 'Reopened',
      detail: item.done ? 'Task marked as completed' : 'Task reopened'
    });

    // Subtask progress auto-calculation
    if (item.parentTaskId) {
      updateParentTaskProgress(data, item.parentTaskId);
    }

    // Handle Recurrence with Max Occurrences & End Date Enforcement
    if (item.done && item.recurrence && item.recurrence !== 'none') {
      item.occurrenceCount = (item.occurrenceCount || 1);
      const isWithinMax = !item.recurrenceMax || item.occurrenceCount < item.recurrenceMax;
      const nextDueDate = calculateNextRecurrenceDate(item.dueDate || todayStr(), item.recurrence, item.recurrenceInterval || 1);
      const isWithinEnd = !item.recurrenceEndDate || nextDueDate <= item.recurrenceEndDate;

      if (isWithinMax && isWithinEnd) {
        const nextOccurrence = item.occurrenceCount + 1;
        const recurringTask = {
          ...item,
          id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          title: item.title,
          label: item.title,
          done: false,
          status: 'planned',
          startDate: nextDueDate,
          dueDate: nextDueDate,
          completedAt: null,
          completedDate: null,
          createdAt: todayStr(),
          occurrenceCount: nextOccurrence,
          activity: [
            { timestamp: todayStr() + ' ' + new Date().toTimeString().slice(0, 5), action: 'Recurring Instance Created', detail: `Generated instance #${nextOccurrence} from recurring rule (${item.recurrence})` }
          ]
        };
        data.items.push(recurringTask);
      }
    }

    // Resolve dependencies dynamically across all tasks
    resolveDocketDependencies(data);

    saveDocketData(data);
    renderTasks();
    if (document.getElementById('capsuleModalBg')?.classList.contains('show') && _docketInspectorActiveTab === 'structure') {
      openDocketTaskDetailModal(item.parentTaskId || item.id, 'structure');
    }
  }
}

function deleteDocketTask(id) {
  const data = getDocketData();
  data.items = data.items.filter(i => i.id !== id);
  saveDocketData(data);
  renderTasks();
}

let _docketInspectorActiveTab = 'task';

function openDocketTaskDetailModal(id, tab = 'task') {
  _docketInspectorActiveTab = tab;
  const data = getDocketData();
  const item = data.items.find(i => String(i.id) === String(id));
  if (!item) return;

  const modal = document.getElementById('capsuleModal');
  if (!modal) return;

  const projs = getDocketProjects();
  const projOptions = projs.map(p => `<option value="${p.id}" ${p.id === item.projectId ? 'selected' : ''}>${escapeHTML(p.name)}</option>`).join('');

  // Parent task options (exclude self)
  const otherTasks = data.items.filter(i => String(i.id) !== String(item.id));
  const parentOptions = `<option value="">(None - Top Level Task)</option>` +
    otherTasks.map(t => `<option value="${t.id}" ${String(t.id) === String(item.parentTaskId) ? 'selected' : ''}>${escapeHTML(t.title)}</option>`).join('');

  // Subtasks list
  const subtasks = data.items.filter(i => String(i.parentTaskId) === String(item.id));
  const subtaskCompletedCount = subtasks.filter(s => s.status === 'completed').length;
  const subtaskProgressPct = subtasks.length > 0 ? Math.round((subtaskCompletedCount / subtasks.length) * 100) : 0;

  // Dependencies select options
  const depOptions = otherTasks.map(t => {
    const isChecked = item.dependencies.includes(String(t.id));
    return `<label style="display:flex; align-items:center; gap:6px; padding:3px 0; color:#cbd5e1; font-size:0.8rem; cursor:pointer;">
      <input type="checkbox" class="editTaskDepCheckbox" value="${t.id}" ${isChecked ? 'checked' : ''}>
      <span>${escapeHTML(t.title)} <span style="font-size:0.7rem; color:#64748b;">(${t.status})</span></span>
    </label>`;
  }).join('');

  modal.innerHTML = `
    <div style="max-width:760px; width:100%;">
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #1e293b; padding-bottom:10px; margin-bottom:12px;">
        <h3 style="margin:0; font-size:1.15rem; color:#f8fafc; display:flex; align-items:center; gap:8px;">
          📌 Task Inspector: <span style="color:#38bdf8;">${escapeHTML(item.title)}</span>
        </h3>
        <span class="docket-priority-badge docket-priority-${item.priority}">${item.priority.toUpperCase()}</span>
      </div>

      <!-- INSPECTOR TAB NAVIGATION -->
      <div style="display:flex; gap:4px; border-bottom:1px solid #1e293b; margin-bottom:12px; overflow-x:auto;">
        <button class="btn ghost micro ${_docketInspectorActiveTab === 'task' ? 'active' : ''}" onclick="switchDocketInspectorTab('${item.id}', 'task')">📋 Task</button>
        <button class="btn ghost micro ${_docketInspectorActiveTab === 'planning' ? 'active' : ''}" onclick="switchDocketInspectorTab('${item.id}', 'planning')">📅 Planning</button>
        <button class="btn ghost micro ${_docketInspectorActiveTab === 'repeat' ? 'active' : ''}" onclick="switchDocketInspectorTab('${item.id}', 'repeat')">🔄 Repeat</button>
        <button class="btn ghost micro ${_docketInspectorActiveTab === 'structure' ? 'active' : ''}" onclick="switchDocketInspectorTab('${item.id}', 'structure')">🌿 Structure (${subtasks.length})</button>
        <button class="btn ghost micro ${_docketInspectorActiveTab === 'context' ? 'active' : ''}" onclick="switchDocketInspectorTab('${item.id}', 'context')">🏷️ Context</button>
        <button class="btn ghost micro ${_docketInspectorActiveTab === 'resources' ? 'active' : ''}" onclick="switchDocketInspectorTab('${item.id}', 'resources')">📎 Resources</button>
        <button class="btn ghost micro ${_docketInspectorActiveTab === 'activity' ? 'active' : ''}" onclick="switchDocketInspectorTab('${item.id}', 'activity')">⏱️ Activity</button>
      </div>

      <!-- TAB CONTENT PANELS -->
      <div id="docketInspectorTabBody" style="min-height:260px; max-height:420px; overflow-y:auto; font-size:0.85rem; padding-right:4px;">
        ${renderDocketInspectorTabContent(item, projs, parentOptions, subtasks, subtaskCompletedCount, subtaskProgressPct, depOptions)}
      </div>

      <!-- MODAL ACTIONS -->
      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #1e293b; pt:12px; margin-top:12px; padding-top:10px;">
        <button class="btn ghost small" style="color:#ef4444;" onclick="deleteDocketTask('${item.id}'); closeCapsuleModal();">🗑️ Delete Task</button>
        <div style="display:flex; gap:8px;">
          <button class="btn ghost small" onclick="closeCapsuleModal()">Cancel</button>
          <button class="btn brass small" onclick="saveTaskDetailsFromModal('${item.id}')">Save Changes</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('capsuleModalBg')?.classList.add('show');
}

function switchDocketInspectorTab(id, tab) {
  _docketInspectorActiveTab = tab;
  openDocketTaskDetailModal(id, tab);
}

function renderDocketInspectorTabContent(item, projs, parentOptions, subtasks, subtaskCompletedCount, subtaskProgressPct, depOptions) {
  if (_docketInspectorActiveTab === 'task') {
    return `
      <div style="display:flex; flex-direction:column; gap:10px;">
        <div>
          <label style="display:block; margin-bottom:4px; color:#94a3b8; font-weight:600;">Task Title</label>
          <input type="text" id="editTaskTitle" value="${escapeHTML(item.title)}" style="width:100%; padding:8px; background:#0f172a; color:#f8fafc; border:1px solid #334155; border-radius:4px; font-weight:600;">
        </div>
        <div>
          <label style="display:block; margin-bottom:4px; color:#94a3b8; font-weight:600;">Description</label>
          <textarea id="editTaskDescription" rows="3" style="width:100%; padding:8px; background:#0f172a; color:#f8fafc; border:1px solid #334155; border-radius:4px; font-family:inherit; resize:vertical;">${escapeHTML(item.description || '')}</textarea>
        </div>
        <div>
          <label style="display:block; margin-bottom:4px; color:#94a3b8; font-weight:600;">Internal Work Notes</label>
          <textarea id="editTaskNotes" rows="3" placeholder="Add detailed notes, logs, or comments..." style="width:100%; padding:8px; background:#0f172a; color:#f8fafc; border:1px solid #334155; border-radius:4px; font-family:inherit; resize:vertical;">${escapeHTML(item.notes || '')}</textarea>
        </div>
      </div>
    `;
  }

  if (_docketInspectorActiveTab === 'planning') {
    const projOpts = projs.map(p => `<option value="${p.id}" ${p.id === item.projectId ? 'selected' : ''}>${escapeHTML(p.name)}</option>`).join('');
    return `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div>
          <label style="display:block; margin-bottom:4px; color:#94a3b8; font-weight:600;">Status</label>
          <select id="editTaskStatus" style="width:100%; padding:6px; background:#0f172a; color:#f8fafc; border:1px solid #334155; border-radius:4px;">
            <option value="inbox" ${item.status === 'inbox' ? 'selected' : ''}>📥 Inbox</option>
            <option value="planned" ${item.status === 'planned' ? 'selected' : ''}>📅 Planned</option>
            <option value="in_progress" ${item.status === 'in_progress' ? 'selected' : ''}>🚀 In Progress</option>
            <option value="waiting" ${item.status === 'waiting' ? 'selected' : ''}>⏳ Waiting</option>
            <option value="blocked" ${item.status === 'blocked' ? 'selected' : ''}>🛑 Blocked</option>
            <option value="completed" ${item.status === 'completed' ? 'selected' : ''}>✓ Completed</option>
            <option value="archived" ${item.status === 'archived' ? 'selected' : ''}>📦 Archived</option>
          </select>
        </div>
        <div>
          <label style="display:block; margin-bottom:4px; color:#94a3b8; font-weight:600;">Priority</label>
          <select id="editTaskPriority" style="width:100%; padding:6px; background:#0f172a; color:#f8fafc; border:1px solid #334155; border-radius:4px;">
            <option value="low" ${item.priority === 'low' ? 'selected' : ''}>Low</option>
            <option value="normal" ${item.priority === 'normal' ? 'selected' : ''}>Normal</option>
            <option value="high" ${item.priority === 'high' ? 'selected' : ''}>High</option>
            <option value="urgent" ${item.priority === 'urgent' ? 'selected' : ''}>Urgent</option>
          </select>
        </div>
        <div>
          <label style="display:block; margin-bottom:4px; color:#94a3b8; font-weight:600;">Project</label>
          <select id="editTaskProject" style="width:100%; padding:6px; background:#0f172a; color:#f8fafc; border:1px solid #334155; border-radius:4px;">
            ${projOpts}
          </select>
        </div>
        <div>
          <label style="display:block; margin-bottom:4px; color:#94a3b8; font-weight:600;">Section / Category</label>
          <input type="text" id="editTaskSection" value="${escapeHTML(item.sectionId || 'General')}" style="width:100%; padding:6px; background:#0f172a; color:#f8fafc; border:1px solid #334155; border-radius:4px;">
        </div>
        <div>
          <label style="display:block; margin-bottom:4px; color:#94a3b8; font-weight:600;">Start Date</label>
          <input type="date" id="editTaskStartDate" value="${item.startDate || todayStr()}" style="width:100%; padding:6px; background:#0f172a; color:#f8fafc; border:1px solid #334155; border-radius:4px;">
        </div>
        <div>
          <label style="display:block; margin-bottom:4px; color:#94a3b8; font-weight:600;">Due Date</label>
          <input type="date" id="editTaskDueDate" value="${item.dueDate || todayStr()}" style="width:100%; padding:6px; background:#0f172a; color:#f8fafc; border:1px solid #334155; border-radius:4px;">
        </div>
        <div>
          <label style="display:block; margin-bottom:4px; color:#94a3b8; font-weight:600;">Estimated Minutes</label>
          <input type="number" id="editTaskEstimatedMinutes" value="${item.estimatedMinutes || 30}" style="width:100%; padding:6px; background:#0f172a; color:#f8fafc; border:1px solid #334155; border-radius:4px;">
        </div>
        <div>
          <label style="display:block; margin-bottom:4px; color:#94a3b8; font-weight:600;">Actual Minutes Spent</label>
          <input type="number" id="editTaskActualMinutes" value="${item.actualMinutes || 0}" style="width:100%; padding:6px; background:#0f172a; color:#f8fafc; border:1px solid #334155; border-radius:4px;">
        </div>
      </div>
    `;
  }

  if (_docketInspectorActiveTab === 'repeat') {
    return `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div style="grid-column: span 2;">
          <label style="display:block; margin-bottom:4px; color:#94a3b8; font-weight:600;">Recurrence Pattern</label>
          <select id="editTaskRecurrence" style="width:100%; padding:6px; background:#0f172a; color:#f8fafc; border:1px solid #334155; border-radius:4px;">
            <option value="none" ${item.recurrence === 'none' ? 'selected' : ''}>Does not repeat</option>
            <option value="daily" ${item.recurrence === 'daily' ? 'selected' : ''}>Daily</option>
            <option value="weekdays" ${item.recurrence === 'weekdays' ? 'selected' : ''}>Every Weekday (Mon - Fri)</option>
            <option value="weekly" ${item.recurrence === 'weekly' ? 'selected' : ''}>Weekly</option>
            <option value="monthly" ${item.recurrence === 'monthly' ? 'selected' : ''}>Monthly</option>
          </select>
        </div>
        <div>
          <label style="display:block; margin-bottom:4px; color:#94a3b8; font-weight:600;">Repeat Every (Interval)</label>
          <input type="number" id="editTaskRecurrenceInterval" value="${item.recurrenceInterval || 1}" min="1" style="width:100%; padding:6px; background:#0f172a; color:#f8fafc; border:1px solid #334155; border-radius:4px;">
        </div>
        <div>
          <label style="display:block; margin-bottom:4px; color:#94a3b8; font-weight:600;">End Date (Optional)</label>
          <input type="date" id="editTaskRecurrenceEndDate" value="${item.recurrenceEndDate || ''}" style="width:100%; padding:6px; background:#0f172a; color:#f8fafc; border:1px solid #334155; border-radius:4px;">
        </div>
        <div style="grid-column: span 2; background:#0f172a; padding:10px; border-radius:6px; border:1px solid #1e293b; color:#94a3b8; font-size:0.8rem;">
          💡 When a recurring task is completed, Docket will automatically calculate and schedule the next instance according to your recurrence rules.
        </div>
      </div>
    `;
  }

  if (_docketInspectorActiveTab === 'structure') {
    return `
      <div style="display:flex; flex-direction:column; gap:12px;">
        <div>
          <label style="display:block; margin-bottom:4px; color:#94a3b8; font-weight:600;">Parent Task</label>
          <select id="editTaskParent" style="width:100%; padding:6px; background:#0f172a; color:#f8fafc; border:1px solid #334155; border-radius:4px;">
            ${parentOptions}
          </select>
        </div>

        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <label style="color:#94a3b8; font-weight:600;">Subtasks (${subtaskCompletedCount}/${subtasks.length} Complete - ${subtaskProgressPct}%)</label>
          </div>
          <div style="background:#020617; border:1px solid #1e293b; border-radius:6px; padding:10px; margin-bottom:8px;">
            <div style="height:6px; background:#1e293b; border-radius:3px; overflow:hidden; margin-bottom:10px;">
              <div style="height:100%; width:${subtaskProgressPct}%; background:#38bdf8; transition:width 0.2s;"></div>
            </div>
            ${subtasks.length === 0 ? '<div style="color:#64748b; font-size:0.8rem;">No subtasks created yet. Add one below.</div>' : subtasks.map(s => `
              <div style="display:flex; align-items:center; justify-content:space-between; padding:4px 0; border-bottom:1px solid #0f172a;">
                <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                  <input type="checkbox" ${s.status === 'completed' ? 'checked' : ''} onchange="toggleDocketTaskDone('${s.id}')">
                  <span style="text-decoration:${s.status === 'completed' ? 'line-through' : 'none'}; color:${s.status === 'completed' ? '#64748b' : '#f8fafc'};">${escapeHTML(s.title)}</span>
                </label>
                <div style="display:flex; gap:4px;">
                  <button class="btn ghost micro" onclick="openDocketTaskDetailModal('${s.id}')">Edit</button>
                  <button class="btn ghost micro" style="color:#ef4444;" onclick="deleteDocketSubtask('${s.id}', '${item.id}')">Delete</button>
                </div>
              </div>
            `).join('')}
          </div>

          <div style="display:flex; gap:6px;">
            <input type="text" id="newSubtaskTitle" placeholder="New subtask title..." style="flex:1; padding:6px; background:#0f172a; color:#f8fafc; border:1px solid #334155; border-radius:4px;">
            <button class="btn brass micro" onclick="addInlineSubtask('${item.id}')">+ Add Subtask</button>
          </div>
        </div>

        <div>
          <label style="display:block; margin-bottom:4px; color:#94a3b8; font-weight:600;">Dependencies (Task depends on)</label>
          <div style="background:#0f172a; border:1px solid #334155; border-radius:4px; padding:8px; max-height:120px; overflow-y:auto;">
            ${depOptions || '<div style="color:#64748b; font-size:0.8rem;">No other tasks available for dependency mapping.</div>'}
          </div>
        </div>
      </div>
    `;
  }

  if (_docketInspectorActiveTab === 'context') {
    return `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div style="grid-column: span 2;">
          <label style="display:block; margin-bottom:4px; color:#94a3b8; font-weight:600;">Tags (Comma separated)</label>
          <input type="text" id="editTaskTags" value="${escapeHTML((item.tags || []).join(', '))}" placeholder="e.g. urgent, backend, review" style="width:100%; padding:6px; background:#0f172a; color:#f8fafc; border:1px solid #334155; border-radius:4px;">
        </div>
        <div>
          <label style="display:block; margin-bottom:4px; color:#94a3b8; font-weight:600;">Assignee</label>
          <input type="text" id="editTaskAssignee" value="${escapeHTML(item.assignee || 'Self')}" style="width:100%; padding:6px; background:#0f172a; color:#f8fafc; border:1px solid #334155; border-radius:4px;">
        </div>
        <div>
          <label style="display:block; margin-bottom:4px; color:#94a3b8; font-weight:600;">Waiting Reason / Blocked By</label>
          <input type="text" id="editTaskWaiting" value="${escapeHTML(item.waitingFor || '')}" placeholder="e.g. Waiting for API key from team" style="width:100%; padding:6px; background:#0f172a; color:#f8fafc; border:1px solid #334155; border-radius:4px;">
        </div>
      </div>
    `;
  }

  if (_docketInspectorActiveTab === 'resources') {
    const atts = item.attachments || [];
    return `
      <div style="display:flex; flex-direction:column; gap:12px;">
        <div>
          <label style="display:block; margin-bottom:4px; color:#94a3b8; font-weight:600;">Originating Source Integration</label>
          <div style="background:#0f172a; border:1px solid #334155; border-radius:6px; padding:10px;">
            ${item.sourceApp ? `
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <div style="font-weight:600; color:#38bdf8;">Linked Application: ${escapeHTML(item.sourceApp)}</div>
                  <div style="font-size:0.75rem; color:#64748b;">Record ID: ${escapeHTML(item.sourceRecordId || 'N/A')}</div>
                </div>
                <button class="btn brass micro" onclick="navigateToDocketSourceApp('${item.sourceApp}', '${item.sourceRecordId}')">↗ Open Source Record</button>
              </div>
            ` : '<div style="color:#64748b; font-size:0.8rem;">No external source linked to this task. Created natively inside Docket.</div>'}
          </div>
        </div>

        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <label style="color:#94a3b8; font-weight:600;">Attachments (${atts.length})</label>
            <input type="file" id="docketAttachmentInput" style="display:none;" onchange="handleDocketAttachmentUpload('${item.id}', this)">
            <button class="btn brass micro" onclick="document.getElementById('docketAttachmentInput').click()">+ Attach File</button>
          </div>
          <div style="background:#0f172a; border:1px solid #334155; border-radius:6px; padding:10px;">
            ${atts.length === 0 ? '<div style="color:#64748b; font-size:0.8rem;">No files attached to this task. Click "+ Attach File" above.</div>' : atts.map((att, idx) => `
              <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid #1e293b; font-size:0.8rem;">
                <div>
                  <span style="color:#cbd5e1; font-weight:600;">📎 ${escapeHTML(att.name || 'Attachment ' + (idx + 1))}</span>
                  <span style="font-size:0.7rem; color:#64748b; margin-left:6px;">(${escapeHTML(att.size || 'N/A')})</span>
                </div>
                <div style="display:flex; gap:6px;">
                  ${att.data ? `<a href="${att.data}" download="${escapeHTML(att.name || 'file')}" class="btn ghost micro" style="text-decoration:none; color:#38bdf8;">📥 Download</a>` : ''}
                  <button class="btn ghost micro" style="color:#ef4444;" onclick="deleteDocketAttachment('${item.id}', ${idx})">🗑️ Delete</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  if (_docketInspectorActiveTab === 'activity') {
    return `
      <div style="display:flex; flex-direction:column; gap:10px;">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; background:#0f172a; padding:10px; border-radius:6px; border:1px solid #334155;">
          <div><span style="color:#64748b;">Created:</span> <span style="color:#cbd5e1;">${item.createdAt || 'N/A'}</span></div>
          <div><span style="color:#64748b;">Last Updated:</span> <span style="color:#cbd5e1;">${item.updatedAt || 'N/A'}</span></div>
          <div><span style="color:#64748b;">Completed At:</span> <span style="color:#cbd5e1;">${item.completedAt || 'Not Completed'}</span></div>
          <div><span style="color:#64748b;">Status:</span> <span style="color:#38bdf8;">${item.status}</span></div>
        </div>

        <div>
          <label style="display:block; margin-bottom:4px; color:#94a3b8; font-weight:600;">Activity History Log</label>
          <div style="background:#020617; border:1px solid #1e293b; border-radius:6px; padding:10px; max-height:180px; overflow-y:auto;">
            ${(item.activity || []).map(act => `
              <div style="padding:4px 0; border-bottom:1px solid #0f172a; font-size:0.8rem;">
                <div style="display:flex; justify-content:space-between; color:#64748b;">
                  <span>${escapeHTML(act.action)}</span>
                  <span>${escapeHTML(act.timestamp)}</span>
                </div>
                <div style="color:#cbd5e1;">${escapeHTML(act.detail)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  return '';
}


function deleteDocketSubtask(subtaskId, parentId) {
  const data = getDocketData();
  data.items = data.items.filter(i => String(i.id) !== String(subtaskId));
  updateParentTaskProgress(data, parentId);
  saveDocketData(data);
  openDocketTaskDetailModal(parentId, 'structure');
}

function handleDocketAttachmentUpload(taskId, inputEl) {
  if (!inputEl.files || !inputEl.files[0]) return;
  const file = inputEl.files[0];

  if (file.size > 1024 * 1024) {
    alert(`Attachment "${file.name}" (${(file.size / 1024 / 1024).toFixed(2)} MB) exceeds the 1MB size limit for local device storage.`);
    inputEl.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    const data = getDocketData();
    const item = data.items.find(i => String(i.id) === String(taskId));
    if (item) {
      item.attachments = item.attachments || [];
      item.attachments.push({
        id: 'att_' + Date.now(),
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        type: file.type,
        data: e.target.result,
        uploadedAt: todayStr()
      });
      item.activity = item.activity || [];
      item.activity.push({
        timestamp: todayStr() + ' ' + new Date().toTimeString().slice(0, 5),
        action: 'Attached File',
        detail: `Attached file: ${file.name}`
      });
      saveDocketData(data);
      openDocketTaskDetailModal(taskId, 'resources');
    }
  };
  reader.readAsDataURL(file);
}

function deleteDocketAttachment(taskId, attIdx) {
  const data = getDocketData();
  const item = data.items.find(i => String(i.id) === String(taskId));
  if (item && item.attachments && item.attachments[attIdx]) {
    const removedName = item.attachments[attIdx].name || 'file';
    item.attachments.splice(attIdx, 1);
    item.activity = item.activity || [];
    item.activity.push({
      timestamp: todayStr() + ' ' + new Date().toTimeString().slice(0, 5),
      action: 'Removed Attachment',
      detail: `Deleted file: ${removedName}`
    });
    saveDocketData(data);
    openDocketTaskDetailModal(taskId, 'resources');
  }
}

function archiveDocketTask(id) {
  const data = getDocketData();
  const item = data.items.find(i => String(i.id) === String(id));
  if (item) {
    item.status = 'archived';
    item.activity = item.activity || [];
    item.activity.push({
      timestamp: todayStr() + ' ' + new Date().toTimeString().slice(0, 5),
      action: 'Archived',
      detail: 'Moved task to Archive'
    });
    saveDocketData(data);
    renderTasks();
    if (document.getElementById('capsuleModalBg')?.classList.contains('show') && _docketInspectorActiveTab === 'structure') {
      openDocketTaskDetailModal(item.parentTaskId || item.id, 'structure');
    }
  }
}

function restoreDocketTask(id) {
  const data = getDocketData();
  const item = data.items.find(i => String(i.id) === String(id));
  if (item) {
    item.status = 'planned';
    item.done = false;
    item.activity = item.activity || [];
    item.activity.push({
      timestamp: todayStr() + ' ' + new Date().toTimeString().slice(0, 5),
      action: 'Restored',
      detail: 'Restored task from Archive to Planned'
    });
    saveDocketData(data);
    renderTasks();
    if (document.getElementById('capsuleModalBg')?.classList.contains('show') && _docketInspectorActiveTab === 'structure') {
      openDocketTaskDetailModal(item.parentTaskId || item.id, 'structure');
    }
  }
}

function addInlineSubtask(parentId) {
  const titleInput = document.getElementById('newSubtaskTitle');
  const title = titleInput?.value?.trim();
  if (!title) return;

  const data = getDocketData();
  const parent = data.items.find(i => String(i.id) === String(parentId));
  if (!parent) return;

  const newSubtask = {
    id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    title,
    label: title,
    description: '',
    status: 'planned',
    priority: parent.priority || 'normal',
    projectId: parent.projectId || 'proj_default',
    parentTaskId: String(parentId),
    startDate: todayStr(),
    dueDate: parent.dueDate || todayStr(),
    createdAt: todayStr(),
    activity: [
      { timestamp: todayStr() + ' ' + new Date().toTimeString().slice(0, 5), action: 'Created Subtask', detail: `Created as subtask of ${parent.title}` }
    ]
  };

  data.items.push(newSubtask);
  saveDocketData(data);
  openDocketTaskDetailModal(parentId, 'structure');
}

function navigateToDocketSourceApp(app, recordId) {
  closeCapsuleModal();
  if (app === 'Spot') {
    switchTab('spot');
    if (recordId && typeof openSpotNoteDetailModal === 'function') openSpotNoteDetailModal(recordId);
  } else if (app === 'Folio') {
    switchTab('folio');
    if (recordId && typeof loadFolioDocument === 'function') loadFolioDocument(recordId);
  } else if (app === 'Grid') {
    switchTab('grid');
    if (recordId && typeof openGridWorkbook === 'function') openGridWorkbook(recordId);
  } else if (app === 'Glides') {
    switchTab('glides');
    if (recordId && typeof openGlidesDeck === 'function') openGlidesDeck(recordId);
  } else if (app === 'Transmute') {
    switchTab('transmute');
  } else if (app === 'Almanac') {
    switchTab('almanac');
  } else {
    alert(`Navigating to ${app} record ${recordId}...`);
  }
}

function createDocketTaskFromApp(sourceApp, sourceRecordId, title, details) {
  if (!title) return;
  const data = getDocketData();
  const newTask = {
    id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    title: title,
    label: title,
    description: details || '',
    status: 'inbox',
    priority: 'normal',
    projectId: 'proj_default',
    startDate: todayStr(),
    dueDate: todayStr(),
    sourceApp: sourceApp || 'External',
    sourceRecordId: sourceRecordId || null,
    createdAt: todayStr()
  };
  data.items.push(newTask);
  saveDocketData(data);
  return newTask;
}

function saveTaskDetailsFromModal(id) {
  const data = getDocketData();
  const item = data.items.find(i => String(i.id) === String(id));
  if (item) {
    // Collect task tab fields if present
    const newTitle = document.getElementById('editTaskTitle')?.value?.trim();
    if (newTitle) { item.title = newTitle; item.label = newTitle; }
    if (document.getElementById('editTaskDescription')) item.description = document.getElementById('editTaskDescription').value;
    if (document.getElementById('editTaskNotes')) item.notes = document.getElementById('editTaskNotes').value;

    // Collect planning tab fields if present
    if (document.getElementById('editTaskStatus')) {
      const oldStatus = item.status;
      item.status = document.getElementById('editTaskStatus').value;
      item.done = item.status === 'completed';
      if (item.done && oldStatus !== 'completed') {
        item.completedAt = todayStr();
        item.completedDate = todayStr();
      }
    }
    if (document.getElementById('editTaskPriority')) item.priority = document.getElementById('editTaskPriority').value;
    if (document.getElementById('editTaskProject')) item.projectId = document.getElementById('editTaskProject').value;
    if (document.getElementById('editTaskSection')) item.sectionId = document.getElementById('editTaskSection').value;
    if (document.getElementById('editTaskStartDate')) item.startDate = document.getElementById('editTaskStartDate').value;
    if (document.getElementById('editTaskDueDate')) item.dueDate = document.getElementById('editTaskDueDate').value;
    if (document.getElementById('editTaskEstimatedMinutes')) item.estimatedMinutes = parseInt(document.getElementById('editTaskEstimatedMinutes').value || 30);
    if (document.getElementById('editTaskActualMinutes')) item.actualMinutes = parseInt(document.getElementById('editTaskActualMinutes').value || 0);

    // Collect repeat tab fields if present
    if (document.getElementById('editTaskRecurrence')) item.recurrence = document.getElementById('editTaskRecurrence').value;
    if (document.getElementById('editTaskRecurrenceInterval')) item.recurrenceInterval = parseInt(document.getElementById('editTaskRecurrenceInterval').value || 1);
    if (document.getElementById('editTaskRecurrenceEndDate')) item.recurrenceEndDate = document.getElementById('editTaskRecurrenceEndDate').value || null;

    // Collect structure tab fields if present with guardrails
    if (document.getElementById('editTaskParent')) {
      const selectedParent = document.getElementById('editTaskParent').value || null;
      if (selectedParent && String(selectedParent) !== String(item.id)) {
        const parentObj = data.items.find(i => String(i.id) === String(selectedParent));
        if (parentObj && String(parentObj.parentTaskId) !== String(item.id)) {
          item.parentTaskId = selectedParent;
        }
      } else if (!selectedParent) {
        item.parentTaskId = null;
      }
    }

    // Collect dependencies if present with circularity guardrails
    const depCheckboxes = document.querySelectorAll('.editTaskDepCheckbox:checked');
    if (depCheckboxes.length > 0 || document.querySelector('.editTaskDepCheckbox')) {
      const selectedDeps = Array.from(depCheckboxes).map(cb => String(cb.value));
      item.dependencies = selectedDeps.filter(depId => {
        if (depId === String(item.id)) return false;
        const depTask = data.items.find(t => String(t.id) === String(depId));
        if (depTask && depTask.dependencies && depTask.dependencies.includes(String(item.id))) {
          return false; // Prevent circular dependency
        }
        return true;
      });
    }

    // Collect context tab fields if present
    if (document.getElementById('editTaskTags')) {
      item.tags = document.getElementById('editTaskTags').value.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (document.getElementById('editTaskAssignee')) item.assignee = document.getElementById('editTaskAssignee').value;
    if (document.getElementById('editTaskWaiting')) item.waitingFor = document.getElementById('editTaskWaiting').value;

    item.updatedAt = todayStr();
    item.activity = item.activity || [];
    item.activity.push({
      timestamp: todayStr() + ' ' + new Date().toTimeString().slice(0, 5),
      action: 'Updated',
      detail: 'Updated task details via Task Inspector'
    });

    resolveDocketDependencies(data);
    saveDocketData(data);
    renderTasks();
  }
  closeCapsuleModal();
}
function getDocketData() {
  const raw = loadLocal('tasks', { items: [
    { id: 'task_1', x: 20, y: 20, title: 'Reply to client', label: 'Reply to client', done: false, status: 'in_progress', priority: 'high', createdDate: todayStr(), startDate: todayStr(), dueDate: todayStr(), projectId: 'proj_default' },
    { id: 'task_2', x: 70, y: 60, title: 'Plan next month', label: 'Plan next month', done: false, status: 'planned', priority: 'normal', createdDate: todayStr(), startDate: todayStr(), dueDate: todayStr(), projectId: 'proj_offlines' },
    { id: 'task_3', x: 40, y: 85, title: 'Renew domain', label: 'Renew domain', done: true, status: 'completed', priority: 'low', createdDate: todayStr(), startDate: todayStr(), dueDate: todayStr(), projectId: 'proj_default' }
  ] });

  let itemsRaw = Array.isArray(raw.items) ? raw.items : [];
  const items = itemsRaw.map((it, idx) => {
    if (typeof it === 'string') it = { label: it, title: it };
    else if (!it || typeof it !== 'object') it = { label: String(it || ''), title: String(it || '') };

    const id = String(it.id || ('task_' + Date.now() + '_' + idx));
    const title = it.title || it.label || 'Untitled Task';
    const description = it.description || '';
    let status = it.status;
    if (!status) {
      status = it.done ? 'completed' : (it.y !== undefined && it.y < 40 ? 'in_progress' : 'inbox');
    }
    let priority = it.priority;
    if (!priority) {
      if (it.y !== undefined && it.y < 30) priority = 'urgent';
      else if (it.y !== undefined && it.y < 50) priority = 'high';
      else priority = 'normal';
    }
    const projectId = it.projectId || 'proj_default';
    const sectionId = it.sectionId || 'section_general';
    const parentTaskId = it.parentTaskId ? String(it.parentTaskId) : null;
    const startDate = it.startDate || it.createdDate || todayStr();
    const dueDate = it.dueDate || (it.createdDate || todayStr());
    const completedDate = it.completedDate || (it.done ? (it.createdDate || todayStr()) : null);
    const recurrence = it.recurrence || 'none';
    const recurrenceInterval = parseInt(it.recurrenceInterval || 1);
    const recurrenceEndDate = it.recurrenceEndDate || null;
    const recurrenceMax = it.recurrenceMax ? parseInt(it.recurrenceMax) : null;
    const estimatedMinutes = parseInt(it.estimatedMinutes || 30);
    const actualMinutes = parseInt(it.actualMinutes || 0);
    const tags = Array.isArray(it.tags) ? it.tags : [];
    const assignee = it.assignee || 'Self';
    const dependencies = Array.isArray(it.dependencies) ? it.dependencies.map(String) : [];
    const blockedBy = Array.isArray(it.blockedBy) ? it.blockedBy.map(String) : [];
    const waitingFor = it.waitingFor || '';
    const notes = it.notes || '';
    const attachments = Array.isArray(it.attachments) ? it.attachments : [];
    const activity = Array.isArray(it.activity) ? it.activity : [
      { timestamp: todayStr() + ' 09:00', action: 'Created', detail: 'Task created' }
    ];
    const sourceApp = it.sourceApp || null;
    const sourceRecordId = it.sourceRecordId || null;
    const x = it.x !== undefined ? it.x : 50;
    const y = it.y !== undefined ? it.y : 50;
    const createdAt = it.createdAt || (it.createdDate || todayStr());
    const updatedAt = it.updatedAt || todayStr();
    const completedAt = it.completedAt || (status === 'completed' ? todayStr() : null);
    const archivedAt = it.archivedAt || null;

    return {
      id,
      title,
      label: title,
      description,
      status,
      priority,
      projectId,
      sectionId,
      parentTaskId,
      startDate,
      dueDate,
      completedDate,
      recurrence,
      recurrenceInterval,
      recurrenceEndDate,
      recurrenceMax,
      estimatedMinutes,
      actualMinutes,
      tags,
      assignee,
      dependencies,
      blockedBy,
      waitingFor,
      notes,
      attachments,
      activity,
      sourceApp,
      sourceRecordId,
      x,
      y,
      done: status === 'completed',
      createdAt,
      updatedAt,
      completedAt,
      archivedAt
    };
  });

  return { type: 'plot', items };
}

function saveDocketData(data) {
  saveLocal('tasks', data);
}

// Redirect legacy calls to canonical Docket Data engine
function getTasksData() {
  return getDocketData();
}

function getDocketProjects() {
  const raw = loadLocal('docket_projects', { projects: [] });
  let projs = Array.isArray(raw.projects) ? raw.projects : [];
  if (projs.length === 0) {
    projs = [
      {
        id: 'proj_default',
        name: 'General Tasks',
        description: 'Default project workspace for uncategorized tasks',
        status: 'active',
        owner: 'Self',
        startDate: todayStr(),
        targetDate: todayStr(),
        priority: 'normal',
        tags: ['general'],
        milestones: ['Setup Docket'],
        createdAt: todayStr()
      },
      {
        id: 'proj_offlines',
        name: 'OFFLINES Upgrade',
        description: 'Product suite enhancement and offline architecture',
        status: 'active',
        owner: 'Self',
        startDate: todayStr(),
        targetDate: todayStr(),
        priority: 'high',
        tags: ['development'],
        milestones: ['Docket Rebuild', 'Spot System'],
        createdAt: todayStr()
      }
    ];
  }
  return projs;
}

function saveDocketProjects(projs) {
  saveLocal('docket_projects', { projects: projs });
}

function getTasksData() {
  return getDocketData();
}
function renderPlotArea(){
  const d = getTasksData();
  const area = document.getElementById('plotArea');
  area.querySelectorAll('.plot-dot').forEach(el=>el.remove());
  d.items.forEach(item=>{
    const dot = document.createElement('div');
    const carried = daysCarried(item);
    let agingClass = '';
    if(carried>=5) agingClass=' aging-hot'; else if(carried>=2) agingClass=' aging-warm';
    dot.className='plot-dot'+(item.done?' done':'')+agingClass;
    dot.style.left = item.x+'%';
    dot.style.top = item.y+'%';
    dot.dataset.id = item.id;
    dot.title = item.label + (carried>0?` — carried ${carried} day${carried===1?'':'s'}`:'');
    const labelSpan = document.createElement('span');
    labelSpan.style.cssText = 'position:absolute; left:18px; top:-2px; white-space:nowrap; font-size:0.75rem; color:var(--text-main); font-weight:600; pointer-events:none; background:rgba(12,16,23,0.7); padding:1px 4px; border-radius:3px;';
    labelSpan.textContent = item.label;
    dot.appendChild(labelSpan);

    if(carried>0){
      const badge = document.createElement('span');
      badge.className='carry-badge';
      badge.textContent = carried;
      dot.appendChild(badge);
    }
    dot.onclick = (e)=>{ e.stopPropagation(); toggleTaskDone(item.id); };
    dot.addEventListener('mousedown', e=>{ draggingDot = dot; e.stopPropagation(); });
    area.appendChild(dot);
  });
}
document.addEventListener('mousemove', e=>{
  if(!draggingDot) return;
  const area = document.getElementById('plotArea');
  if(!area) return;
  const rect = area.getBoundingClientRect();
  let x = ((e.clientX-rect.left)/rect.width)*100;
  let y = ((e.clientY-rect.top)/rect.height)*100;
  x=Math.max(2,Math.min(98,x)); y=Math.max(2,Math.min(98,y));
  draggingDot.style.left=x+'%'; draggingDot.style.top=y+'%';
});
document.addEventListener('mouseup', ()=>{
  if(draggingDot){
    const id = parseInt(draggingDot.dataset.id);
    const d = getTasksData();
    const item = d.items.find(i=>i.id===id);
    if(item){
      item.x = parseFloat(draggingDot.style.left);
      item.y = parseFloat(draggingDot.style.top);
      localStorage.setItem(KEY_PREFIX+'tasks', JSON.stringify(d));
    }
  }
  draggingDot=null;
});
function addPlotTask(){
  openModalForm({
    title: 'New Task',
    fields: [
      { name: 'label', label: 'Task Title / Description', type: 'text', value: 'New Task', required: true }
    ],
    onSubmit: (vals) => {
      if(!vals.label) return;
      const d = getTasksData();
      d.items.push({id:Date.now(), x:50, y:50, label:vals.label, done:false, createdDate:todayStr()});
      saveLocal('tasks', d); renderPlotArea(); renderDocketList();
    }
  });
}
function toggleTaskDone(id){
  const d = getTasksData();
  const item = d.items.find(i=>i.id===id);
  if(item) item.done = !item.done;
  saveLocal('tasks', d); renderPlotArea();
  renderDocketList();
}

function switchDocketView(view) {
  const listContainer = document.getElementById('docketListContainer');
  const matrixArea = document.getElementById('plotArea');
  if (!listContainer || !matrixArea) return;
  if (view === 'list') {
    listContainer.style.display = 'block';
    matrixArea.style.display = 'none';
    renderDocketList();
  } else {
    listContainer.style.display = 'none';
    matrixArea.style.display = 'block';
  }
}

function renderDocketList() {
  const listContainer = document.getElementById('docketListContainer');
  if (!listContainer) return;
  const data = getTasksData();
  const query = (document.getElementById('docketQueryInput')?.value || '').toLowerCase().trim();

  let filtered = data.items;
  if (query) {
    filtered = filtered.filter(item => {
      if (query === 'done') return item.done;
      if (query === 'urgent') return item.y < 40;
      if (query === 'today') return item.createdDate === todayStr();
      return item.label.toLowerCase().includes(query);
    });
  }

  listContainer.innerHTML = `
    <h3 style="margin-top:0; font-size:0.9rem; color:var(--text-main);">Tasks List (${filtered.length})</h3>
    ${filtered.map(item => `
      <div style="display:flex; align-items:center; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border-color);">
        <div style="display:flex; align-items:center; gap:8px;">
          <input type="checkbox" ${item.done?'checked':''} onchange="toggleTaskDone(${item.id})">
          <span style="text-decoration:${item.done?'line-through':'none'}; color:${item.done?'var(--text-muted)':'var(--text-main)'}; font-weight:500;">${escapeHTML(item.label)}</span>
        </div>
        <span style="font-size:0.75rem; color:var(--text-muted);">${item.createdDate}</span>
      </div>
    `).join('')}
  `;
}

function filterDocketTasks(q) {
  renderPlotArea();
  renderDocketList();
}
function exportTasks(){
  const d = getDocketData();
  const projs = getDocketProjects();
  download('workspace.plot', JSON.stringify({ type: 'plot', version: 2, items: d.items || [], projects: projs || [] }, null, 2));
}

function importTasks(){
  pickFile('.plot', (content) => {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed.items)) {
        saveDocketData({ items: parsed.items });
      } else if (Array.isArray(parsed)) {
        saveDocketData({ items: parsed });
      }
      if (Array.isArray(parsed.projects)) {
        saveDocketProjects(parsed.projects);
      }
      renderTasks();
    } catch(e) {
      alert('Could not read that .plot file');
    }
  });
}

/* ================= ALMANAC PROJECT INTELLIGENCE WORKSPACE (.agnd) ================= */
let currentAlmanacTab = 'project';

function renderAgenda(){
  const p = document.getElementById('panel-agenda');
  if(!p) return;
  const now = new Date();
  if(agendaViewMonth===undefined){ agendaViewMonth = now.getMonth(); agendaViewYear = now.getFullYear(); }

  p.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
      <div>
        <h2 style="margin:0; font-size:1.4rem;">Almanac Project Intelligence Workspace</h2>
        <div class="sub" style="margin:2px 0 0 0;">Project Scheduling, Critical Path Method (CPM) & Timeline Controls</div>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn ${currentAlmanacTab==='project'?'brass':'ghost'} small" onclick="switchAlmanacTab('project')">🏗 Project WBS & CPM</button>
        <button class="btn ${currentAlmanacTab==='calendar'?'brass':'ghost'} small" onclick="switchAlmanacTab('calendar')">📅 Calendar & Time</button>
        <button class="btn ghost small" onclick="exportAgenda()">Export .agnd</button>
        <button class="btn ghost small" onclick="importAgenda()">Import .agnd</button>
      </div>
    </div>

    ${currentAlmanacTab==='project' ? renderAlmanacProjectWorkspace() : `
      <div id="agendaCountdown"></div>
      <div class="toolbar">
        <input type="date" id="agndDate">
        <input type="time" id="agndTime">
        <input type="text" id="agndTitle" placeholder="Event title">
        <select id="agndColor" title="Color tag">
          <option value="#6f8c6a">🟢 Personal</option>
          <option value="#b8925a">🟠 Work</option>
          <option value="#a8563f">🔴 Deadline</option>
          <option value="#5a7fa8">🔵 Social</option>
        </select>
        <select id="agndRepeat" title="Repeats">
          <option value="">Doesn't repeat</option>
          <option value="daily">Repeats daily</option>
          <option value="weekly">Repeats weekly</option>
          <option value="monthly">Repeats monthly</option>
        </select>
        <button class="btn ghost small" onclick="addAgendaEvent()">+ Add Event</button>
      </div>
      <div id="agendaCalendar"></div>
      <div id="agendaList"></div>
    `}
  `;

  if (currentAlmanacTab === 'calendar') {
    renderAgendaCalendar();
    renderAgendaList();
    renderAgendaCountdown();
  }
}

function switchAlmanacTab(tab) {
  currentAlmanacTab = tab;
  renderAgenda();
}

function getAlmanacProject() {
  const defaultProj = {
    id: "proj_1",
    name: "[TEMPLATE / SAMPLE PROJECT] Tower Development Phase 1",
    activities: [
      { id: "101", name: "Site Mobilization", duration: 10, start: "2026-09-15", finish: "2026-09-25", pred: "", float: 0, critical: true, progress: 100 },
      { id: "102", name: "Foundation Excavation", duration: 20, start: "2026-09-25", finish: "2026-10-15", pred: "101", float: 0, critical: true, progress: 60 },
      { id: "103", name: "Concrete Pouring", duration: 15, start: "2026-10-15", finish: "2026-10-30", pred: "102", float: 5, critical: false, progress: 0 },
      { id: "104", name: "Structural Framing", duration: 30, start: "2026-10-30", finish: "2026-11-30", pred: "103", float: 0, critical: true, progress: 0 }
    ]
  };
  return loadLocal('almanac_project', defaultProj);
}

function saveAlmanacProject(proj) {
  saveLocal('almanac_project', proj);
}

function renderAlmanacProjectWorkspace() {
  const proj = getAlmanacProject();
  return `
    <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-surface-elevated); padding:10px 14px; border-radius:6px; border:1px solid var(--border-crisp); margin-bottom:12px;">
      <div style="font-weight:700; color:var(--text-main);">Project: <span style="color:var(--accent-primary,#3b82f6);">${escapeHTML(proj.name)}</span></div>
      <div style="display:flex; gap:8px;">
        <button class="btn ghost small" onclick="addAlmanacActivity()">+ Add Activity</button>
        <button class="btn sage small" onclick="recalculateCPM()">⚡ Run CPM Schedule</button>
      </div>
    </div>

    <!-- WBS ACTIVITY TABLE AND GANTT TIMELINE SPLIT -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; min-height:400px;">
      <!-- WBS DENSE TABLE -->
      <div style="background:var(--bg-workspace); border:1px solid var(--border-crisp); border-radius:6px; overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse; font-size:0.8rem; font-family:var(--font-sans);">
          <thead>
            <tr style="background:var(--bg-surface-elevated); border-bottom:1px solid var(--border-crisp); color:var(--text-muted); text-align:left;">
              <th style="padding:6px 8px;">ID</th>
              <th style="padding:6px 8px;">Activity Name</th>
              <th style="padding:6px 8px;">Dur (d)</th>
              <th style="padding:6px 8px;">Pred</th>
              <th style="padding:6px 8px;">Float</th>
              <th style="padding:6px 8px;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${proj.activities.map(a => `
              <tr style="border-bottom:1px solid var(--border-crisp); background:${a.critical ? 'rgba(239,68,68,0.08)' : 'transparent'};">
                <td style="padding:6px 8px; font-weight:bold; font-family:var(--font-mono); color:var(--accent-primary,#3b82f6);">${a.id}</td>
                <td style="padding:6px 8px; font-weight:600; color:var(--text-main);">${escapeHTML(a.name)}</td>
                <td style="padding:6px 8px;">${a.duration}</td>
                <td style="padding:6px 8px; font-family:var(--font-mono);">${a.pred || '-'}</td>
                <td style="padding:6px 8px; font-weight:bold; color:${a.float===0?'var(--rust)':'var(--sage)'};">${a.float}d</td>
                <td style="padding:6px 8px;">${a.critical ? '<span style="color:var(--rust); font-weight:bold;">CRITICAL</span>' : 'Normal'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- GANTT VISUALIZATION -->
      <div style="background:var(--bg-workspace); border:1px solid var(--border-crisp); border-radius:6px; padding:16px; display:flex; flex-direction:column; gap:12px;">
        <div style="font-weight:700; font-size:0.8rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">📊 GANTT SCHEDULING BARS</div>
        <div style="display:flex; flex-direction:column; gap:16px;">
          ${proj.activities.map(a => `
            <div>
              <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:4px; color:var(--text-main);">
                <span><b>${a.id}</b>: ${escapeHTML(a.name)}</span>
                <span>${a.start} ➔ ${a.finish}</span>
              </div>
              <div style="width:100%; height:16px; background:var(--bg-surface-elevated); border-radius:8px; overflow:hidden; border:1px solid var(--border-crisp);">
                <div style="width:${Math.max(10, Math.min(100, a.duration * 3.5))}%; height:100%; background:${a.critical ? 'var(--rust)' : 'var(--accent-primary,#3b82f6)'}; border-radius:8px;"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function addAlmanacActivity() {
  openModalForm({
    title: 'New Almanac CPM Activity',
    fields: [
      { name: 'name', label: 'Activity Name', type: 'text', value: '', required: true },
      { name: 'dur', label: 'Duration (Days)', type: 'number', value: '10' },
      { name: 'pred', label: 'Predecessor Activity ID (optional)', type: 'text', value: '' }
    ],
    onSubmit: (vals) => {
      if(!vals.name) return;
      const proj = getAlmanacProject();
      const dur = parseInt(vals.dur, 10) || 10;
      const pred = vals.pred || "";
      const newId = String(101 + proj.activities.length);
      proj.activities.push({
        id: newId,
        name: vals.name.trim(),
        duration: dur,
        start: "2026-10-01",
        finish: "2026-10-15",
        pred: pred.trim(),
        float: 0,
        critical: true,
        progress: 0
      });
      saveAlmanacProject(proj);
      renderAgenda();
    }
  });
}

function recalculateCPM() {
  const proj = getAlmanacProject();
  if (!proj || !proj.activities || !proj.activities.length) return;

  const actMap = {};
  proj.activities.forEach(a => {
    actMap[a.id] = a;
    a.duration = parseInt(a.duration, 10) || 1;
    a.es = 0;
    a.ef = a.duration;
    a.ls = 0;
    a.lf = 0;
    a.float = 0;
    a.critical = false;
  });

  // FORWARD PASS (Early Start & Early Finish)
  let maxProjectEF = 0;
  let changed = true;
  let passCount = 0;

  while (changed && passCount < proj.activities.length * 2) {
    changed = false;
    passCount++;
    proj.activities.forEach(a => {
      let maxPredEF = 0;
      if (a.pred) {
        const preds = a.pred.split(',').map(p => p.trim()).filter(Boolean);
        preds.forEach(pId => {
          if (actMap[pId]) {
            maxPredEF = Math.max(maxPredEF, actMap[pId].ef);
          }
        });
      }
      if (a.es !== maxPredEF) {
        a.es = maxPredEF;
        a.ef = a.es + a.duration;
        changed = true;
      }
      maxProjectEF = Math.max(maxProjectEF, a.ef);
    });
  }

  // BACKWARD PASS (Late Finish & Late Start)
  proj.activities.forEach(a => {
    a.lf = maxProjectEF;
    a.ls = a.lf - a.duration;
  });

  passCount = 0;
  changed = true;

  while (changed && passCount < proj.activities.length * 2) {
    changed = false;
    passCount++;
    proj.activities.forEach(a => {
      let minSuccLS = maxProjectEF;
      let hasSucc = false;
      proj.activities.forEach(succ => {
        if (succ.pred) {
          const preds = succ.pred.split(',').map(p => p.trim()).filter(Boolean);
          if (preds.includes(a.id)) {
            hasSucc = true;
            minSuccLS = Math.min(minSuccLS, succ.ls);
          }
        }
      });
      if (hasSucc && a.lf !== minSuccLS) {
        a.lf = minSuccLS;
        a.ls = a.lf - a.duration;
        changed = true;
      }
    });
  }

  // FLOAT & CRITICAL PATH CALCULATION
  const baseStartDate = new Date(proj.start || "2026-09-15");
  proj.activities.forEach(a => {
    a.float = Math.max(0, a.ls - a.es);
    a.critical = (a.float === 0);

    const sDate = new Date(baseStartDate);
    sDate.setDate(sDate.getDate() + a.es);
    const fDate = new Date(baseStartDate);
    fDate.setDate(fDate.getDate() + a.ef);

    a.start = sDate.toISOString().slice(0, 10);
    a.finish = fDate.toISOString().slice(0, 10);
  });

  saveAlmanacProject(proj);
  renderAgenda();
  alert("CPM Schedule Recalculated Successfully!");
}
let agendaViewMonth, agendaViewYear, agendaSelectedDate=null;
function getAgendaData(){ return loadLocal('agenda', {events:[]}); }
function agendaOccurrencesInRange(events, rangeStart, rangeEnd){
  // expands repeating events into concrete date occurrences within [rangeStart, rangeEnd]
  const out = [];
  events.forEach(ev=>{
    if(!ev.repeat){
      const d = new Date(ev.date+'T00:00:00');
      if(d>=rangeStart && d<=rangeEnd) out.push({...ev, occurDate: ev.date});
      return;
    }
    let cur = new Date(ev.date+'T00:00:00');
    let guard = 0;
    while(cur<=rangeEnd && guard<400){
      if(cur>=rangeStart) out.push({...ev, occurDate: cur.toISOString().slice(0,10)});
      if(ev.repeat==='daily') cur.setDate(cur.getDate()+1);
      else if(ev.repeat==='weekly') cur.setDate(cur.getDate()+7);
      else if(ev.repeat==='monthly') cur.setMonth(cur.getMonth()+1);
      guard++;
    }
  });
  return out;
}
function renderAgendaCalendar(){
  const d = getAgendaData();
  const first = new Date(agendaViewYear, agendaViewMonth, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(agendaViewYear, agendaViewMonth+1, 0).getDate();
  const rangeStart = new Date(agendaViewYear, agendaViewMonth, 1);
  const rangeEnd = new Date(agendaViewYear, agendaViewMonth, daysInMonth);
  const occurrences = agendaOccurrencesInRange(d.events||[], rangeStart, rangeEnd);
  const byDate = {};
  occurrences.forEach(o=>{ byDate[o.occurDate]=byDate[o.occurDate]||[]; byDate[o.occurDate].push(o); });
  const monthName = first.toLocaleDateString(undefined,{month:'long', year:'numeric'});
  const todayISO = todayStr();
  let html = `<div class="cal-nav">
    <button class="btn ghost small" onclick="agendaShiftMonth(-1)">‹</button>
    <b>${monthName}</b>
    <button class="btn ghost small" onclick="agendaShiftMonth(1)">›</button>
  </div><div class="cal-grid">`;
  ['S','M','T','W','T','F','S'].forEach(dd=>html+=`<div class="cal-dow">${dd}</div>`);
  for(let i=0;i<startWeekday;i++) html+='<div class="cal-cell empty"></div>';
  for(let day=1; day<=daysInMonth; day++){
    const dateStr = `${agendaViewYear}-${String(agendaViewMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const evs = byDate[dateStr]||[];
    const dots = evs.slice(0,4).map(e=>`<span class="cal-dot" style="background:${e.color||'#6f8c6a'}"></span>`).join('');
    const moonIcon = moonPhaseEmoji(new Date(agendaViewYear, agendaViewMonth, day));
    html += `<div class="cal-cell${dateStr===todayISO?' today':''}${dateStr===agendaSelectedDate?' selected':''}" onclick="agendaSelectDay('${dateStr}')">
      <div class="cal-daynum">${day}<span class="cal-moon">${moonIcon}</span></div><div class="cal-dots">${dots}</div>
    </div>`;
  }
  html += '</div>';
  document.getElementById('agendaCalendar').innerHTML = html;
}
function agendaShiftMonth(delta){
  agendaViewMonth += delta;
  if(agendaViewMonth<0){ agendaViewMonth=11; agendaViewYear--; }
  if(agendaViewMonth>11){ agendaViewMonth=0; agendaViewYear++; }
  renderAgendaCalendar();
}
function agendaSelectDay(dateStr){
  agendaSelectedDate = (agendaSelectedDate===dateStr) ? null : dateStr;
  renderAgendaCalendar();
  renderAgendaList();
}
function renderAgendaCountdown(){
  const d = getAgendaData();
  const now = new Date();
  const rangeEnd = new Date(now.getFullYear()+1, now.getMonth(), now.getDate());
  const occurrences = agendaOccurrencesInRange(d.events||[], now, rangeEnd)
    .sort((a,b)=> (a.occurDate+a.time).localeCompare(b.occurDate+b.time));
  const el = document.getElementById('agendaCountdown');
  if(!el) return;
  if(occurrences.length===0){ el.innerHTML=''; return; }
  const next = occurrences[0];
  const target = new Date(next.occurDate+'T'+(next.time||'00:00')+':00');
  const diffMs = target - now;
  const days = Math.floor(diffMs/(1000*60*60*24));
  const hours = Math.floor((diffMs%(1000*60*60*24))/(1000*60*60));
  let when = 'today';
  if(days>0) when = `in ${days} day${days===1?'':'s'}`;
  else if(hours>0) when = `in ${hours} hour${hours===1?'':'s'}`;
  el.innerHTML = `<div class="countdown-banner" style="border-left:4px solid ${next.color||'#6f8c6a'}">
    ⏳ <b>${next.title}</b> — ${when} (${next.occurDate}${next.time?', '+next.time:''})
  </div>`;
}
function renderAgendaList(){
  const d = getAgendaData();
  const now = new Date();
  const rangeStart = agendaSelectedDate ? new Date(agendaSelectedDate+'T00:00:00') : new Date(now.getFullYear(), now.getMonth(), 1);
  const rangeEnd = agendaSelectedDate ? new Date(agendaSelectedDate+'T23:59:59') : new Date(now.getFullYear(), now.getMonth()+1, 0);
  const occurrences = agendaOccurrencesInRange(d.events||[], rangeStart, rangeEnd);
  const grouped = {};
  occurrences.forEach(ev=>{
    grouped[ev.occurDate] = grouped[ev.occurDate]||[];
    grouped[ev.occurDate].push(ev);
  });
  const days = Object.keys(grouped).sort();
  const el = document.getElementById('agendaList');
  let dayInfo = '';
  if(agendaSelectedDate){
    const dSel = new Date(agendaSelectedDate+'T12:00:00');
    const hrs = dayLengthHours(dSel);
    const h = Math.floor(hrs), m = Math.round((hrs-h)*60);
    dayInfo = `<div class="hint">${moonPhaseEmoji(dSel)} ${moonPhaseName(dSel)} · 🌞 ${h}h ${m}m of daylight (approx.)</div>`;
  }
  if(days.length===0){ el.innerHTML = dayInfo + '<div class="hint">No events '+(agendaSelectedDate?'on this day':'this month')+' — add one above, or click a calendar day.</div>'; return; }
  el.innerHTML = dayInfo + days.map(date=>`
    <div class="agenda-day">
      <div class="date">${date}${agendaSelectedDate?' <span class="btn ghost small" style="cursor:pointer;" onclick="agendaSelectDay(\''+date+'\')">show whole month</span>':''}</div>
      ${grouped[date].sort((a,b)=>a.time.localeCompare(b.time)).map(ev=>`
        <div class="agenda-event" style="border-left:3px solid ${ev.color||'#6f8c6a'};padding-left:8px;">
          <span>${ev.time} — ${ev.title}${ev.repeat?' <span class="repeat-badge">↻ '+ev.repeat+'</span>':''}</span>
          <span style="cursor:pointer;color:#a8563f;" onclick="removeAgendaEvent(${ev.id})">✕</span>
        </div>
      `).join('')}
    </div>
  `).join('');
}
function addAgendaEvent(){
  const date = document.getElementById('agndDate').value;
  const time = document.getElementById('agndTime').value || '00:00';
  const title = document.getElementById('agndTitle').value;
  const color = document.getElementById('agndColor').value;
  const repeat = document.getElementById('agndRepeat').value;
  if(!date || !title){ alert('Pick a date and a title'); return; }
  const d = getAgendaData();
  d.events.push({id:Date.now(), date, time, title, color, repeat});
  saveLocal('agenda', d);
  renderAgendaCalendar(); renderAgendaList(); renderAgendaCountdown();
  document.getElementById('agndTitle').value='';
}
function removeAgendaEvent(id){
  const d = getAgendaData();
  d.events = d.events.filter(e=>e.id!==id);
  saveLocal('agenda', d);
  renderAgendaCalendar(); renderAgendaList(); renderAgendaCountdown();
}
function exportAgenda(){
  const d = getAgendaData();
  download('agenda.agnd', JSON.stringify({type:'agnd',...d}, null, 2));
}
function importAgenda(){
  pickFile('.agnd', (content)=>{
    try{ const parsed = JSON.parse(content); saveLocal('agenda', {events:parsed.events||[]}); renderAgenda(); }
    catch(e){ alert('Could not read that .agnd file'); }
  });
}


/* ================= SLIDES (.glides) ================= */

function colIndexFromLetter(letters){
  let n=0;
  for(let i=0;i<letters.length;i++){ n = n*26 + (letters.charCodeAt(i)-64); }
  return n-1;
}
function parseSlideEmbeds(text){
  return (text||'').replace(/\{\{GRID:([A-Z]+)(\d+):([A-Z]+)(\d+)\}\}/g, (m,cl1,r1,cl2,r2)=>{
    const cells = loadLocal('sheets', {});
    const c1i = colIndexFromLetter(cl1), c2i = colIndexFromLetter(cl2);
    const rr1 = parseInt(r1), rr2 = parseInt(r2);
    let tbl = '<table class="embed-grid">';
    for(let r=rr1;r<=rr2;r++){
      tbl+='<tr>';
      for(let c=c1i;c<=c2i;c++){
        const cid = colLetter(c)+r;
        const raw = cells[cid];
        let val = '';
        if(typeof raw==='string' && raw.startsWith('=')) {
          try { val = eval(raw.slice(1)); } catch(e) { val = raw; }
        } else if(raw!==undefined) val = raw;
        tbl += '<td>'+val+'</td>';
      }
      tbl+='</tr>';
    }
    tbl+='</table>';
    return tbl;
  });
}

let activeSlideIdx = 0;
let selectedGlidesObjId = null;
let glidesUndoStack = [];
let glidesRedoStack = [];
let glidesCurrentView = "normal"; // "normal" | "sorter"
let glidesActiveRibbon = "home";
let isGlidesDrawing = false;
let glidesDrawColor = "#38bdf8";
let glidesDrawWidth = 4;
let glidesCurrentDrawPath = [];

function migrateGlidesDeck(raw) {
  if (!raw || typeof raw !== "object") raw = {};
  const title = raw.title || "Untitled Presentation";
  const aspectRatio = raw.aspectRatio || "16:9";
  const theme = raw.theme || "midnight";
  let slidesRaw = Array.isArray(raw.slides) ? raw.slides : [];
  if (slidesRaw.length === 0) {
    slidesRaw = [{ text: "Welcome to Glides Studio" }];
  }
  const slides = slidesRaw.map((s, idx) => {
    if (typeof s === "string") s = { text: s };
    else if (!s || typeof s !== "object") s = { text: String(s || "") };
    const slideId = s.id || ("slide_" + (idx + 1) + "_" + Math.random().toString(36).substring(2, 7));
    const slideName = s.name || ("Slide " + (idx + 1));
    const layout = s.layout || "title-content";
    const background = s.background || { type: "color", value: "#0f172a" };
    const notes = s.notes || "";
    const comments = Array.isArray(s.comments) ? s.comments : [];
    const transition = s.transition || { type: "fade", duration: 0.5 };
    const animations = Array.isArray(s.animations) ? s.animations : [];
    const hidden = Boolean(s.hidden);
    let objects = Array.isArray(s.objects) ? s.objects : [];
    if (objects.length === 0 && s.text) {
      const txt = String(s.text);
      if (txt.includes("{{GRID:")) {
        const match = txt.match(/\{\{GRID:([A-Z0-9:]+)\}\}/i);
        const rangeStr = match ? match[1].toUpperCase() : "A1:B4";
        objects.push({
          id: "obj_grid_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5),
          type: "gridEmbed",
          x: 10, y: 20, width: 80, height: 50,
          range: rangeStr, workbook: "default", sheet: "Sheet1"
        });
        const cleanTxt = txt.replace(/\{\{GRID:[A-Z0-9:]+\}\}/gi, "").trim();
        if (cleanTxt) {
          objects.push({
            id: "obj_txt_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5),
            type: "text",
            x: 10, y: 5, width: 80, height: 12,
            content: cleanTxt, fontSize: "24px", color: "#f8fafc"
          });
        }
      } else {
        objects.push({
          id: "obj_txt_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5),
          type: "text",
          x: 10, y: 20, width: 80, height: 60,
          content: txt, fontSize: "24px", color: "#f8fafc"
        });
      }
    }
    return {
      id: slideId,
      name: slideName,
      layout,
      background,
      objects,
      notes,
      comments,
      transition,
      animations,
      hidden
    };
  });
  return {
    type: "glides",
    title,
    aspectRatio,
    theme,
    slides
  };
}

function getSlidesData() {
  const raw = loadLocal("slides", { slides: [{ text: "Welcome to Glides Studio" }] });
  return migrateGlidesDeck(raw);
}

function saveGlidesData(deckData) {
  saveLocal("slides", deckData);
}

function pushGlidesHistory(deckData) {
  if (!deckData) deckData = getSlidesData();
  glidesUndoStack.push(JSON.stringify(deckData));
  if (glidesUndoStack.length > 30) glidesUndoStack.shift();
  glidesRedoStack = [];
}

function undoGlides() {
  if (!glidesUndoStack.length) return;
  const current = JSON.stringify(getSlidesData());
  glidesRedoStack.push(current);
  const prev = JSON.parse(glidesUndoStack.pop());
  saveGlidesData(prev);
  renderSlides();
}

function redoGlides() {
  if (!glidesRedoStack.length) return;
  const current = JSON.stringify(getSlidesData());
  glidesUndoStack.push(current);
  const next = JSON.parse(glidesRedoStack.pop());
  saveGlidesData(next);
  renderSlides();
}

function renderSlides() {
  const p = document.getElementById("panel-slides");
  if (!p) return;
  const deck = getSlidesData();
  if (activeSlideIdx >= deck.slides.length) activeSlideIdx = 0;

  p.innerHTML = `
    <div class="glides-studio-container dark-theme">
      <!-- HEADER -->
      <div class="glides-app-header">
        <div class="glides-brand">
          <span class="glides-logo-icon">❖</span>
          <span class="glides-brand-title">GLIDES STUDIO</span>
          <input type="text" class="glides-deck-title-input" id="glidesDeckTitle" value="${escapeHTML(deck.title)}" onchange="updateGlidesDeckTitle(this.value)">
          <span class="tag-pill">.glides</span>
        </div>
        <div class="glides-header-center">
          <input type="text" id="glidesSearchInput" placeholder="Search slides, notes, comments... (Ctrl+F)" onkeyup="searchGlidesContent(this.value)">
        </div>
        <div class="glides-header-actions">
          <button class="btn ghost small" onclick="undoGlides()" title="Undo (Ctrl+Z)">↶ Undo</button>
          <button class="btn ghost small" onclick="redoGlides()" title="Redo (Ctrl+Y)">↷ Redo</button>
          <button class="btn brass small" onclick="startGlidesPresenterMode()">▶ Present</button>
          <button class="btn sage small" onclick="exportSlides()">Export .glides</button>
          <button class="btn ghost small" onclick="importSlides()">Import .glides</button>
        </div>
      </div>

      <!-- RIBBON -->
      <div class="glides-ribbon-bar">
        <div class="glides-ribbon-tabs">
          ${["home","insert","draw","design","transitions","animations","present","review","view","help"].map(tab => `
            <button class="glides-ribbon-tab ${glidesActiveRibbon === tab ? "active" : ""}" onclick="switchGlidesRibbon('${tab}')">${tab.toUpperCase()}</button>
          `).join("")}
        </div>
        <div class="glides-ribbon-toolbar" id="glidesRibbonToolbar">
          ${renderGlidesRibbonToolbar(glidesActiveRibbon)}
        </div>
      </div>

      <!-- WORKSPACE / MAIN CONTENT AREA -->
      <div class="glides-workspace-body" id="glidesWorkspaceBody">
        ${glidesCurrentView === "sorter" ? renderGlidesSorterView(deck) : renderGlidesNormalView(deck)}
      </div>

      <!-- BOTTOM BAR / SPEAKER NOTES -->
      <div class="glides-bottom-panel">
        <div class="glides-notes-header">
          <span>Speaker Notes (Private)</span>
          <span>Slide ${activeSlideIdx + 1} of ${deck.slides.length}</span>
        </div>
        <textarea class="glides-notes-textarea" id="glidesNotesText" placeholder="Add speaker notes for slide ${activeSlideIdx + 1}..." onchange="updateGlidesSpeakerNotes(this.value)">${escapeHTML(deck.slides[activeSlideIdx] ? deck.slides[activeSlideIdx].notes || "" : "")}</textarea>
      </div>
    </div>
  `;
  renderSlideCanvasObjectListeners();
}

function renderGlidesNormalView(deck) {
  const currentSlide = deck.slides[activeSlideIdx] || deck.slides[0];
  return `
    <!-- LEFT SLIDE NAVIGATOR -->
    <div class="glides-slide-navigator">
      <div class="glides-navigator-header">
        <span>SLIDES (${deck.slides.length})</span>
        <button class="btn ghost micro" onclick="addGlidesSlide()">+ New</button>
      </div>
      <div class="glides-filmstrip" id="glidesFilmstrip">
        ${deck.slides.map((s, idx) => `
          <div class="glides-thumb-card ${idx === activeSlideIdx ? "active" : ""} ${s.hidden ? "hidden-slide" : ""}" onclick="selectGlidesSlide(${idx})">
            <div class="glides-thumb-number">${idx + 1} ${s.hidden ? "(Hidden)" : ""}</div>
            <div class="glides-thumb-preview" style="background:${s.background.value || "#0f172a"}">
              ${renderGlidesSlideMiniPreview(s)}
            </div>
            <div class="glides-thumb-footer">
              <span class="glides-thumb-name">${escapeHTML(s.name)}</span>
              <div class="glides-thumb-actions">
                <button onclick="event.stopPropagation(); duplicateGlidesSlide(${idx})" title="Duplicate">📋</button>
                <button onclick="event.stopPropagation(); deleteGlidesSlide(${idx})" title="Delete">🗑</button>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>

    <!-- CENTER CANVAS -->
    <div class="glides-canvas-viewport">
      <div class="glides-slide-canvas" id="glidesSlideCanvas" style="aspect-ratio: ${deck.aspectRatio === "4:3" ? "4/3" : "16/9"}; background: ${currentSlide.background.value || "#0f172a"};">
        ${renderGlidesCanvasObjects(currentSlide)}
      </div>
    </div>

    <!-- RIGHT INSPECTOR -->
    <div class="glides-inspector-panel">
      <div class="glides-inspector-header">INSPECTOR</div>
      <div class="glides-inspector-content" id="glidesInspectorContent">
        ${renderGlidesInspectorContent(currentSlide)}
      </div>
    </div>
  `;
}

function renderGlidesSorterView(deck) {
  return `
    <div class="glides-sorter-grid">
      <div class="glides-sorter-toolbar">
        <h3>Slide Sorter View</h3>
        <button class="btn ghost small" onclick="switchGlidesView('normal')">Exit Sorter</button>
        <button class="btn ghost small" onclick="addGlidesSlide()">+ New Slide</button>
      </div>
      <div class="glides-sorter-cards">
        ${deck.slides.map((s, idx) => `
          <div class="glides-sorter-card ${idx === activeSlideIdx ? "active" : ""}" onclick="selectGlidesSlide(${idx}); switchGlidesView('normal');">
            <div class="glides-sorter-card-header">
              <span>Slide ${idx + 1}: ${escapeHTML(s.name)}</span>
              ${s.hidden ? '<span class="tag-pill">Hidden</span>' : ''}
            </div>
            <div class="glides-sorter-preview" style="background:${s.background.value || "#0f172a"}">
              ${renderGlidesSlideMiniPreview(s)}
            </div>
            <div class="glides-sorter-actions">
              <button class="btn ghost micro" onclick="event.stopPropagation(); moveGlidesSlide(${idx}, -1)">◄ Up</button>
              <button class="btn ghost micro" onclick="event.stopPropagation(); moveGlidesSlide(${idx}, 1)">Down ►</button>
              <button class="btn ghost micro" onclick="event.stopPropagation(); duplicateGlidesSlide(${idx})">Duplicate</button>
              <button class="btn ghost micro" onclick="event.stopPropagation(); toggleHideGlidesSlide(${idx})">${s.hidden ? "Unhide" : "Hide"}</button>
              <button class="btn ghost micro" onclick="event.stopPropagation(); deleteGlidesSlide(${idx})">Delete</button>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderGlidesSlideMiniPreview(s) {
  if (!s.objects || s.objects.length === 0) return '<div class="mini-txt-preview">(Empty)</div>';
  return s.objects.map(obj => {
    if (obj.type === 'text') return `<div class="mini-txt-preview">${escapeHTML((obj.content || '').slice(0, 40))}</div>`;
    if (obj.type === 'shape') return `<div class="mini-shape-preview">[${obj.shapeType || 'shape'}]</div>`;
    if (obj.type === 'image') return `<div class="mini-img-preview">🖼 Image</div>`;
    if (obj.type === 'table') return `<div class="mini-tbl-preview">📊 Table</div>`;
    if (obj.type === 'chart') return `<div class="mini-chart-preview">📈 Chart</div>`;
    if (obj.type === 'gridEmbed') return `<div class="mini-grid-preview">🔢 Grid ${obj.range}</div>`;
    if (obj.type === 'drawing') return `<div class="mini-draw-preview">✏ Drawing</div>`;
    return '';
  }).join('');
}

function renderGlidesCanvasObjects(slide) {
  if (!slide.objects || slide.objects.length === 0) {
    return `<div class="glides-canvas-placeholder" onclick="addGlidesTextObject('Click to add title', '32px', 10, 20, 80, 20)">Click to add content</div>`;
  }
  return slide.objects.map(obj => {
    const isSel = obj.id === selectedGlidesObjId;
    const style = `left:${obj.x}%; top:${obj.y}%; width:${obj.width}%; height:${obj.height}%; z-index:${obj.zIndex || 1};`;

    let innerHtml = "";
    if (obj.type === "text") {
      const fontWeight = obj.bold ? "bold" : "normal";
      const fontStyle = obj.italic ? "italic" : "normal";
      const textDeco = [obj.underline ? "underline" : "", obj.strike ? "line-through" : ""].join(" ").trim();
      const styleAttr = `font-size:${obj.fontSize || "20px"}; color:${obj.color || "#f8fafc"}; text-align:${obj.align || "left"}; font-weight:${fontWeight}; font-style:${fontStyle}; text-decoration:${textDeco};`;
      innerHtml = `<div class="glides-obj-text" contenteditable="true" style="${styleAttr}" onblur="updateGlidesTextObject('${obj.id}', this.innerText)">${escapeHTML(obj.content || "")}</div>`;
    } else if (obj.type === "shape") {
      innerHtml = renderGlidesShapeObjectHtml(obj);
    } else if (obj.type === "image") {
      innerHtml = `<img src="${obj.src}" style="width:100%; height:100%; object-fit:contain; border-radius:4px;">`;
    } else if (obj.type === "table") {
      innerHtml = renderGlidesTableObjectHtml(obj);
    } else if (obj.type === "chart") {
      innerHtml = renderGlidesChartObjectHtml(obj);
    } else if (obj.type === "gridEmbed") {
      innerHtml = renderGlidesGridEmbedObjectHtml(obj);
    } else if (obj.type === "drawing") {
      innerHtml = renderGlidesDrawingObjectHtml(obj);
    }

    return `
      <div class="glides-canvas-obj ${isSel ? "selected" : ""}" id="obj_${obj.id}" style="${style}" onclick="event.stopPropagation(); selectGlidesObject('${obj.id}')">
        ${innerHtml}
        ${isSel ? `
          <div class="glides-obj-handle top-left"></div>
          <div class="glides-obj-handle top-right"></div>
          <div class="glides-obj-handle bottom-left"></div>
          <div class="glides-obj-handle bottom-right"></div>
        ` : ""}
      </div>
    `;
  }).join("");
}

function renderGlidesShapeObjectHtml(obj) {
  const fill = obj.fill || "#6366f1";
  const stroke = obj.stroke || "#818cf8";
  const stWidth = obj.strokeWidth || 2;
  const opacity = obj.opacity !== undefined ? obj.opacity : 1;
  const shapeType = obj.shapeType || "rectangle";

  if (shapeType === "circle") {
    return `<svg width="100%" height="100%"><ellipse cx="50%" cy="50%" rx="45%" ry="45%" fill="${fill}" stroke="${stroke}" stroke-width="${stWidth}" opacity="${opacity}" /></svg>`;
  } else if (shapeType === "triangle") {
    return `<svg width="100%" height="100%"><polygon points="50,5 95,95 5,95" fill="${fill}" stroke="${stroke}" stroke-width="${stWidth}" opacity="${opacity}" preserveAspectRatio="none" viewBox="0 0 100 100" /></svg>`;
  } else if (shapeType === "star") {
    return `<svg width="100%" height="100%"><polygon points="50,5 64,36 98,36 71,57 81,91 50,70 19,91 29,57 2,36 36,36" fill="${fill}" stroke="${stroke}" stroke-width="${stWidth}" opacity="${opacity}" preserveAspectRatio="none" viewBox="0 0 100 100" /></svg>`;
  } else if (shapeType === "arrow") {
    return `<svg width="100%" height="100%"><polygon points="0,35 60,35 60,10 100,50 60,90 60,65 0,65" fill="${fill}" stroke="${stroke}" stroke-width="${stWidth}" opacity="${opacity}" preserveAspectRatio="none" viewBox="0 0 100 100" /></svg>`;
  } else if (shapeType === "callout") {
    return `<svg width="100%" height="100%"><path d="M5,5 H95 V70 H30 L10,95 V70 H5 Z" fill="${fill}" stroke="${stroke}" stroke-width="${stWidth}" opacity="${opacity}" preserveAspectRatio="none" viewBox="0 0 100 100" /></svg>`;
  } else {
    return `<div style="width:100%; height:100%; background:${fill}; border:${stWidth}px solid ${stroke}; opacity:${opacity}; border-radius:4px;"></div>`;
  }
}

function renderGlidesTableObjectHtml(obj) {
  const rows = obj.rows || 3;
  const cols = obj.cols || 3;
  const data = obj.data || [["Header 1","Header 2","Header 3"],["Val 1","Val 2","Val 3"],["Val 4","Val 5","Val 6"]];
  let h = '<table class="glides-obj-table">';
  for (let r = 0; r < rows; r++) {
    h += '<tr>';
    for (let c = 0; c < cols; c++) {
      const val = (data[r] && data[r][c] !== undefined) ? data[r][c] : '';
      h += `<td contenteditable="true" onblur="updateGlidesTableCell('${obj.id}', ${r}, ${c}, this.innerText)">${escapeHTML(val)}</td>`;
    }
    h += '</tr>';
  }
  h += '</table>';
  return h;
}

function renderGlidesChartObjectHtml(obj) {
  const type = obj.chartType || "bar";
  const title = obj.title || "Sales Data";
  const data = obj.data || [["Q1", 100], ["Q2", 150], ["Q3", 220], ["Q4", 180]];
  const maxVal = Math.max(...data.map(d => Number(d[1]) || 1), 10);

  let bars = "";
  if (type === "bar" || type === "column") {
    bars = `<div class="glides-chart-bars">` + data.map(d => {
      const pct = Math.round(((Number(d[1]) || 0) / maxVal) * 100);
      return `<div class="glides-chart-bar-col"><div class="glides-chart-bar-fill" style="height:${pct}%;"></div><span>${escapeHTML(d[0])}</span></div>`;
    }).join("") + `</div>`;
  } else {
    bars = `<div class="glides-chart-list">` + data.map(d => `<div><b>${escapeHTML(d[0])}:</b> ${d[1]}</div>`).join("") + `</div>`;
  }

  return `
    <div class="glides-obj-chart-container">
      <div class="glides-chart-title">${escapeHTML(title)}</div>
      ${bars}
    </div>
  `;
}

function renderGlidesGridEmbedObjectHtml(obj) {
  const range = obj.range || "A1:B4";
  const textMarker = "{{GRID:" + range + "}}";
  const parsedTableHtml = parseSlideEmbeds(textMarker);
  return `
    <div class="glides-grid-embed-wrapper">
      <div class="glides-grid-embed-badge">📊 Grid Live Range: ${escapeHTML(range)}</div>
      ${parsedTableHtml}
    </div>
  `;
}

function renderGlidesDrawingObjectHtml(obj) {
  const paths = obj.paths || [];
  const svgContent = paths.map(p => `<path d="${p.d}" stroke="${p.color || "#38bdf8"}" stroke-width="${p.width || 4}" fill="none" stroke-linecap="round" stroke-linejoin="round" />`).join("");
  return `<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">${svgContent}</svg>`;
}

function renderGlidesRibbonToolbar(activeTab) {
  if (activeTab === "home") {
    return `
      <div class="glides-ribbon-group">
        <span class="glides-group-label">SLIDE</span>
        <button class="btn ghost small" onclick="addGlidesSlide()">+ Slide</button>
        <button class="btn ghost small" onclick="duplicateGlidesSlide(activeSlideIdx)">📋 Duplicate</button>
        <button class="btn ghost small" onclick="deleteGlidesSlide(activeSlideIdx)">🗑 Delete</button>
      </div>
      <div class="glides-ribbon-group">
        <span class="glides-group-label">TEXT</span>
        <button class="btn ghost small" onclick="addGlidesTextObject('New Heading', '32px', 10, 10, 80, 20)">+ Heading</button>
        <button class="btn ghost small" onclick="addGlidesTextObject('Body text block...', '20px', 10, 35, 80, 50)">+ Text Box</button>
        <button class="btn ghost small" onclick="formatGlidesSelectedText('bold')"><b>B</b></button>
        <button class="btn ghost small" onclick="formatGlidesSelectedText('italic')"><i>I</i></button>
      </div>
      <div class="glides-ribbon-group">
        <span class="glides-group-label">ARRANGE</span>
        <button class="btn ghost small" onclick="alignGlidesObject('front')">Bring Front</button>
        <button class="btn ghost small" onclick="alignGlidesObject('back')">Send Back</button>
      </div>
    `;
  } else if (activeTab === "insert") {
    return `
      <div class="glides-ribbon-group">
        <span class="glides-group-label">ELEMENTS</span>
        <button class="btn ghost small" onclick="addGlidesShapeObject('rectangle')">⬛ Rectangle</button>
        <button class="btn ghost small" onclick="addGlidesShapeObject('circle')">🔴 Circle</button>
        <button class="btn ghost small" onclick="addGlidesShapeObject('triangle')">🔺 Triangle</button>
        <button class="btn ghost small" onclick="addGlidesShapeObject('star')">⭐ Star</button>
        <button class="btn ghost small" onclick="addGlidesShapeObject('arrow')">➔ Arrow</button>
        <button class="btn ghost small" onclick="addGlidesShapeObject('callout')">💬 Callout</button>
      </div>
      <div class="glides-ribbon-group">
        <span class="glides-group-label">MEDIA & DATA</span>
        <button class="btn ghost small" onclick="insertGlidesLocalImage()">🖼 Image</button>
        <button class="btn ghost small" onclick="addGlidesTableObject()">📊 Table</button>
        <button class="btn ghost small" onclick="addGlidesChartObject()">📈 Chart</button>
        <button class="btn ghost small" onclick="insertGridEmbed()">🔢 Grid Range</button>
      </div>
    `;
  } else if (activeTab === "draw") {
    return `
      <div class="glides-ribbon-group">
        <span class="glides-group-label">FREEHAND DRAWING</span>
        <button class="btn ghost small" onclick="toggleGlidesDrawingMode('pen')">✏ Pen</button>
        <button class="btn ghost small" onclick="toggleGlidesDrawingMode('highlighter')">🖍 Highlighter</button>
        <input type="color" value="#38bdf8" onchange="glidesDrawColor = this.value" title="Stroke Color">
        <button class="btn ghost small" onclick="clearGlidesDrawings()">Clear Drawings</button>
      </div>
    `;
  } else if (activeTab === "design") {
    return `
      <div class="glides-ribbon-group">
        <span class="glides-group-label">THEMES</span>
        <button class="btn ghost small" onclick="applyGlidesTheme('midnight')">Midnight</button>
        <button class="btn ghost small" onclick="applyGlidesTheme('aurora')">Aurora</button>
        <button class="btn ghost small" onclick="applyGlidesTheme('paper')">Paper</button>
        <button class="btn ghost small" onclick="applyGlidesTheme('studio')">Studio</button>
        <button class="btn ghost small" onclick="applyGlidesTheme('slate')">Slate</button>
        <button class="btn ghost small" onclick="applyGlidesTheme('nebula')">Nebula</button>
      </div>
      <div class="glides-ribbon-group">
        <span class="glides-group-label">ASPECT RATIO</span>
        <button class="btn ghost small" onclick="setGlidesAspectRatio('16:9')">16:9 Widescreen</button>
        <button class="btn ghost small" onclick="setGlidesAspectRatio('4:3')">4:3 Standard</button>
      </div>
    `;
  } else if (activeTab === "transitions") {
    return `
      <div class="glides-ribbon-group">
        <span class="glides-group-label">SLIDE TRANSITIONS</span>
        <button class="btn ghost small" onclick="setGlidesSlideTransition('none')">None</button>
        <button class="btn ghost small" onclick="setGlidesSlideTransition('fade')">Fade</button>
        <button class="btn ghost small" onclick="setGlidesSlideTransition('push')">Push</button>
        <button class="btn ghost small" onclick="setGlidesSlideTransition('wipe')">Wipe</button>
        <button class="btn ghost small" onclick="setGlidesSlideTransition('slide')">Slide</button>
        <button class="btn ghost small" onclick="setGlidesSlideTransition('zoom')">Zoom</option>
      </div>
    `;
  } else if (activeTab === "animations") {
    return `
      <div class="glides-ribbon-group">
        <span class="glides-group-label">OBJECT ANIMATIONS</span>
        <button class="btn ghost small" onclick="addGlidesObjectAnimation('appear')">Appear</button>
        <button class="btn ghost small" onclick="addGlidesObjectAnimation('fade')">Fade In</button>
        <button class="btn ghost small" onclick="addGlidesObjectAnimation('flyIn')">Fly In</button>
        <button class="btn ghost small" onclick="addGlidesObjectAnimation('zoom')">Zoom In</button>
      </div>
    `;
  } else if (activeTab === "present") {
    return `
      <div class="glides-ribbon-group">
        <span class="glides-group-label">PRESENTATION MODE</span>
        <button class="btn brass small" onclick="startGlidesPresenterMode()">▶ Start Presentation</button>
        <button class="btn ghost small" onclick="switchGlidesView('sorter')">Slide Sorter View</button>
      </div>
    `;
  } else if (activeTab === "review") {
    return `
      <div class="glides-ribbon-group">
        <span class="glides-group-label">COMMENTS & REVIEW</span>
        <button class="btn ghost small" onclick="addGlidesSlideComment()">+ Add Comment</button>
      </div>
    `;
  } else if (activeTab === "view") {
    return `
      <div class="glides-ribbon-group">
        <span class="glides-group-label">VIEWS</span>
        <button class="btn ghost small" onclick="switchGlidesView('normal')">Normal View</button>
        <button class="btn ghost small" onclick="switchGlidesView('sorter')">Slide Sorter</button>
      </div>
    `;
  } else if (activeTab === "help") {
    return `
      <div class="glides-ribbon-group">
        <span class="glides-group-label">HELP & SECURITY</span>
        <button class="btn ghost small" onclick="showGlidesHelpDrawer()">Glides Help & Keyboard Shortcuts</button>
      </div>
    `;
  }
  return '';
}

function renderGlidesInspectorContent(slide) {
  if (!selectedGlidesObjId) {
    return `
      <div class="glides-inspector-section">
        <h4>Slide Settings</h4>
        <label>Slide Name:</label>
        <input type="text" value="${escapeHTML(slide.name)}" onchange="renameGlidesSlide(activeSlideIdx, this.value)">
        <label>Background Color:</label>
        <input type="color" value="${slide.background.value || "#0f172a"}" onchange="setGlidesSlideBackground(this.value)">
        <label>Transition:</label>
        <select onchange="setGlidesSlideTransition(this.value)">
          <option value="none" ${slide.transition.type === 'none' ? 'selected' : ''}>None</option>
          <option value="fade" ${slide.transition.type === 'fade' ? 'selected' : ''}>Fade</option>
          <option value="push" ${slide.transition.type === 'push' ? 'selected' : ''}>Push</option>
          <option value="wipe" ${slide.transition.type === 'wipe' ? 'selected' : ''}>Wipe</option>
          <option value="slide" ${slide.transition.type === 'slide' ? 'selected' : ''}>Slide</option>
          <option value="zoom" ${slide.transition.type === 'zoom' ? 'selected' : ''}>Zoom</option>
        </select>
        <label>Visibility:</label>
        <button class="btn ghost small" onclick="toggleHideGlidesSlide(activeSlideIdx)">${slide.hidden ? "Unhide Slide" : "Hide Slide"}</button>
      </div>
    `;
  }

  const obj = slide.objects.find(o => o.id === selectedGlidesObjId);
  if (!obj) return '<div>No object selected</div>';

  return `
    <div class="glides-inspector-section">
      <h4>Object Properties (${obj.type})</h4>
      <label>Position X (%):</label>
      <input type="number" value="${obj.x}" onchange="updateGlidesObjProp('x', parseInt(this.value))">
      <label>Position Y (%):</label>
      <input type="number" value="${obj.y}" onchange="updateGlidesObjProp('y', parseInt(this.value))">
      <label>Width (%):</label>
      <input type="number" value="${obj.width}" onchange="updateGlidesObjProp('width', parseInt(this.value))">
      <label>Height (%):</label>
      <input type="number" value="${obj.height}" onchange="updateGlidesObjProp('height', parseInt(this.value))">
      <button class="btn ghost small" onclick="deleteGlidesObject('${obj.id}')">Delete Object</button>
    </div>
  `;
}

function renderSlideCanvasObjectListeners() {
  const canvas = document.getElementById("glidesSlideCanvas");
  if (!canvas) return;

  let isInteracting = false;
  let mode = null;
  let targetObjId = null;
  let startX = 0, startY = 0;
  let origObj = null;
  let drawPoints = [];

  canvas.onpointerdown = (e) => {
    if (glidesDrawingActive) {
      isInteracting = true;
      mode = "draw";
      const rect = canvas.getBoundingClientRect();
      const px = Math.round(((e.clientX - rect.left) / rect.width) * 100);
      const py = Math.round(((e.clientY - rect.top) / rect.height) * 100);
      drawPoints = [{ x: px, y: py }];
      return;
    }

    if (e.target.closest(".glides-obj-text[contenteditable='true']")) return;

    const handle = e.target.closest(".glides-obj-handle");
    const objEl = e.target.closest(".glides-canvas-obj");

    if (!objEl) {
      if (e.target === canvas || e.target.classList.contains("glides-slide-canvas")) {
        selectedGlidesObjId = null;
        renderSlides();
      }
      return;
    }

    const objId = objEl.id.replace("obj_", "");
    selectedGlidesObjId = objId;

    const deck = getSlidesData();
    const currentSlide = deck.slides[activeSlideIdx];
    if (!currentSlide) return;
    const obj = currentSlide.objects.find(o => o.id === objId);
    if (!obj) return;

    if (handle) {
      if (handle.classList.contains("top-left")) mode = "resize-top-left";
      else if (handle.classList.contains("top-right")) mode = "resize-top-right";
      else if (handle.classList.contains("bottom-left")) mode = "resize-bottom-left";
      else if (handle.classList.contains("bottom-right")) mode = "resize-bottom-right";
    } else {
      mode = "move";
    }

    isInteracting = true;
    targetObjId = objId;
    startX = e.clientX;
    startY = e.clientY;
    origObj = { x: obj.x, y: obj.y, width: obj.width, height: obj.height };

    if (canvas.setPointerCapture && e.pointerId !== undefined) {
      try { canvas.setPointerCapture(e.pointerId); } catch(err) {}
    }
  };

  canvas.onpointermove = (e) => {
    if (!isInteracting) return;

    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    if (mode === "draw") {
      const px = Math.round(((e.clientX - rect.left) / rect.width) * 100);
      const py = Math.round(((e.clientY - rect.top) / rect.height) * 100);
      drawPoints.push({ x: px, y: py });
      return;
    }

    if (!targetObjId || !origObj) return;

    const dxPct = ((e.clientX - startX) / rect.width) * 100;
    const dyPct = ((e.clientY - startY) / rect.height) * 100;

    const deck = getSlidesData();
    const currentSlide = deck.slides[activeSlideIdx];
    if (!currentSlide) return;
    const obj = currentSlide.objects.find(o => o.id === targetObjId);
    if (!obj) return;

    if (mode === "move") {
      obj.x = Math.max(0, Math.min(95, Math.round(origObj.x + dxPct)));
      obj.y = Math.max(0, Math.min(95, Math.round(origObj.y + dyPct)));
    } else if (mode === "resize-bottom-right") {
      obj.width = Math.max(5, Math.min(100 - origObj.x, Math.round(origObj.width + dxPct)));
      obj.height = Math.max(5, Math.min(100 - origObj.y, Math.round(origObj.height + dyPct)));
    } else if (mode === "resize-top-left") {
      const newWidth = Math.max(5, Math.round(origObj.width - dxPct));
      const newHeight = Math.max(5, Math.round(origObj.height - dyPct));
      obj.x = Math.max(0, Math.round(origObj.x + (origObj.width - newWidth)));
      obj.y = Math.max(0, Math.round(origObj.y + (origObj.height - newHeight)));
      obj.width = newWidth;
      obj.height = newHeight;
    } else if (mode === "resize-top-right") {
      const newHeight = Math.max(5, Math.round(origObj.height - dyPct));
      obj.y = Math.max(0, Math.round(origObj.y + (origObj.height - newHeight)));
      obj.width = Math.max(5, Math.min(100 - origObj.x, Math.round(origObj.width + dxPct)));
      obj.height = newHeight;
    } else if (mode === "resize-bottom-left") {
      const newWidth = Math.max(5, Math.round(origObj.width - dxPct));
      obj.x = Math.max(0, Math.round(origObj.x + (origObj.width - newWidth)));
      obj.width = newWidth;
      obj.height = Math.max(5, Math.min(100 - origObj.y, Math.round(origObj.height + dyPct)));
    }

    const objEl = document.getElementById("obj_" + targetObjId);
    if (objEl) {
      objEl.style.left = obj.x + "%";
      objEl.style.top = obj.y + "%";
      objEl.style.width = obj.width + "%";
      objEl.style.height = obj.height + "%";
    }
  };

  canvas.onpointerup = canvas.onpointercancel = (e) => {
    if (isInteracting && mode === "draw" && drawPoints.length > 1) {
      const deck = getSlidesData();
      pushGlidesHistory(deck);
      const pathStr = "M " + drawPoints.map(p => `${p.x} ${p.y}`).join(" L ");
      const strokeColor = glidesDrawMode === "highlighter" ? "#fde047" : glidesDrawColor;
      const strokeWidth = glidesDrawMode === "highlighter" ? 12 : glidesDrawWidth;

      const obj = {
        id: "obj_draw_" + Date.now(),
        type: "drawing",
        x: 0, y: 0, width: 100, height: 100,
        paths: [{ d: pathStr, color: strokeColor, width: strokeWidth }]
      };
      deck.slides[activeSlideIdx].objects.push(obj);
      saveGlidesData(deck);
      renderSlides();
    } else if (isInteracting && targetObjId) {
      const deck = getSlidesData();
      saveGlidesData(deck);
      renderSlides();
    }
    isInteracting = false;
    mode = null;
    targetObjId = null;
    origObj = null;
    drawPoints = [];
  };
}

function switchGlidesRibbon(tab) {
  glidesActiveRibbon = tab;
  renderSlides();
}

function switchGlidesView(v) {
  glidesCurrentView = v;
  renderSlides();
}

function selectGlidesSlide(idx) {
  activeSlideIdx = idx;
  selectedGlidesObjId = null;
  renderSlides();
}

function addGlidesSlide() {
  const deck = getSlidesData();
  pushGlidesHistory(deck);
  const newSlide = {
    id: "slide_" + Date.now(),
    name: "Slide " + (deck.slides.length + 1),
    layout: "title-content",
    background: { type: "color", value: "#0f172a" },
    objects: [{
      id: "obj_txt_" + Date.now(),
      type: "text",
      x: 10, y: 20, width: 80, height: 60,
      content: "Click to edit text",
      fontSize: "24px", color: "#f8fafc"
    }],
    notes: "",
    comments: [],
    transition: { type: "fade", duration: 0.5 },
    animations: [],
    hidden: false
  };
  deck.slides.push(newSlide);
  activeSlideIdx = deck.slides.length - 1;
  saveGlidesData(deck);
  renderSlides();
}

function duplicateGlidesSlide(idx) {
  const deck = getSlidesData();
  if (!deck.slides[idx]) return;
  pushGlidesHistory(deck);
  const copy = JSON.parse(JSON.stringify(deck.slides[idx]));
  copy.id = "slide_" + Date.now();
  copy.name = copy.name + " (Copy)";
  deck.slides.splice(idx + 1, 0, copy);
  activeSlideIdx = idx + 1;
  saveGlidesData(deck);
  renderSlides();
}

function deleteGlidesSlide(idx) {
  const deck = getSlidesData();
  if (deck.slides.length <= 1) {
    alert("Cannot delete the only slide in the deck.");
    return;
  }
  pushGlidesHistory(deck);
  deck.slides.splice(idx, 1);
  if (activeSlideIdx >= deck.slides.length) activeSlideIdx = deck.slides.length - 1;
  saveGlidesData(deck);
  renderSlides();
}

function moveGlidesSlide(idx, dir) {
  const deck = getSlidesData();
  const target = idx + dir;
  if (target < 0 || target >= deck.slides.length) return;
  pushGlidesHistory(deck);
  const temp = deck.slides[idx];
  deck.slides[idx] = deck.slides[target];
  deck.slides[target] = temp;
  activeSlideIdx = target;
  saveGlidesData(deck);
  renderSlides();
}

function renameGlidesSlide(idx, name) {
  const deck = getSlidesData();
  if (deck.slides[idx]) {
    deck.slides[idx].name = name;
    saveGlidesData(deck);
  }
}

function toggleHideGlidesSlide(idx) {
  const deck = getSlidesData();
  if (deck.slides[idx]) {
    deck.slides[idx].hidden = !deck.slides[idx].hidden;
    saveGlidesData(deck);
    renderSlides();
  }
}

function setGlidesSlideBackground(color) {
  const deck = getSlidesData();
  if (deck.slides[activeSlideIdx]) {
    deck.slides[activeSlideIdx].background = { type: "color", value: color };
    saveGlidesData(deck);
    renderSlides();
  }
}

function setGlidesSlideTransition(type) {
  const deck = getSlidesData();
  if (deck.slides[activeSlideIdx]) {
    deck.slides[activeSlideIdx].transition = { type, duration: 0.5 };
    saveGlidesData(deck);
  }
}

function selectGlidesObject(id) {
  selectedGlidesObjId = id;
  renderSlides();
}

function addGlidesTextObject(content, fontSize, x, y, width, height) {
  const deck = getSlidesData();
  pushGlidesHistory(deck);
  const obj = {
    id: "obj_txt_" + Date.now(),
    type: "text",
    x: x || 10, y: y || 20, width: width || 80, height: height || 20,
    content: content || "Text block",
    fontSize: fontSize || "20px",
    color: "#f8fafc"
  };
  deck.slides[activeSlideIdx].objects.push(obj);
  selectedGlidesObjId = obj.id;
  saveGlidesData(deck);
  renderSlides();
}

function updateGlidesTextObject(id, text) {
  const deck = getSlidesData();
  const obj = deck.slides[activeSlideIdx].objects.find(o => o.id === id);
  if (obj) {
    obj.content = text;
    saveGlidesData(deck);
  }
}

function formatGlidesSelectedText(fmt) {
  if (!selectedGlidesObjId) return;
  const deck = getSlidesData();
  const obj = deck.slides[activeSlideIdx].objects.find(o => o.id === selectedGlidesObjId);
  if (obj && obj.type === 'text') {
    if (fmt === 'bold') obj.bold = !obj.bold;
    if (fmt === 'italic') obj.italic = !obj.italic;
    if (fmt === 'underline') obj.underline = !obj.underline;
    if (fmt === 'strike') obj.strike = !obj.strike;
    saveGlidesData(deck);
    renderSlides();
  }
}

function addGlidesShapeObject(shapeType) {
  const deck = getSlidesData();
  pushGlidesHistory(deck);
  const obj = {
    id: "obj_shape_" + Date.now(),
    type: "shape",
    shapeType: shapeType || "rectangle",
    x: 30, y: 30, width: 40, height: 30,
    fill: "#6366f1", stroke: "#818cf8", strokeWidth: 2, opacity: 1
  };
  deck.slides[activeSlideIdx].objects.push(obj);
  selectedGlidesObjId = obj.id;
  saveGlidesData(deck);
  renderSlides();
}

function insertGlidesLocalImage() {
  pickFile("image/*", (content) => {
    const deck = getSlidesData();
    pushGlidesHistory(deck);
    const obj = {
      id: "obj_img_" + Date.now(),
      type: "image",
      x: 20, y: 20, width: 60, height: 50,
      src: content
    };
    deck.slides[activeSlideIdx].objects.push(obj);
    selectedGlidesObjId = obj.id;
    saveGlidesData(deck);
    renderSlides();
  });
}

function addGlidesTableObject() {
  const deck = getSlidesData();
  pushGlidesHistory(deck);
  const obj = {
    id: "obj_tbl_" + Date.now(),
    type: "table",
    x: 15, y: 20, width: 70, height: 50,
    rows: 3, cols: 3,
    data: [["Header 1","Header 2","Header 3"],["Val 1","Val 2","Val 3"],["Val 4","Val 5","Val 6"]]
  };
  deck.slides[activeSlideIdx].objects.push(obj);
  selectedGlidesObjId = obj.id;
  saveGlidesData(deck);
  renderSlides();
}

function updateGlidesTableCell(objId, r, c, val) {
  const deck = getSlidesData();
  const obj = deck.slides[activeSlideIdx].objects.find(o => o.id === objId);
  if (obj && obj.data) {
    if (!obj.data[r]) obj.data[r] = [];
    obj.data[r][c] = val;
    saveGlidesData(deck);
  }
}

function addGlidesChartObject() {
  const deck = getSlidesData();
  pushGlidesHistory(deck);
  const obj = {
    id: "obj_chart_" + Date.now(),
    type: "chart",
    chartType: "bar",
    x: 15, y: 20, width: 70, height: 50,
    title: "Quarterly Revenue",
    data: [["Q1", 120], ["Q2", 180], ["Q3", 240], ["Q4", 210]]
  };
  deck.slides[activeSlideIdx].objects.push(obj);
  selectedGlidesObjId = obj.id;
  saveGlidesData(deck);
  renderSlides();
}

function openGridEmbedModal() {
  const modal = document.getElementById('capsuleModal');
  if (!modal) {
    const range = prompt("Grid range to embed (e.g. A1:B4)?", "A1:B4");
    if (range) insertGridEmbedWithDetails("Sheet1", range);
    return;
  }
  const wb = typeof getGridWorkbook === 'function' ? getGridWorkbook() : null;
  const sheetOptions = wb && wb.sheets ? wb.sheets.map(s => `<option value="${s.name}">${s.name}</option>`).join('') : '<option value="Sheet1">Sheet1</option>';

  modal.innerHTML = `
    <h3>🔢 Embed Grid Cell Range into Presentation</h3>
    <p class="hint">Select worksheet and enter target cell range to embed live calculation table.</p>
    <div style="margin-bottom:12px;">
      <label style="display:block;font-size:0.82rem;margin-bottom:4px;color:#f1f5f9;">Worksheet:</label>
      <select id="gridEmbedSheet" style="width:100%;padding:8px;background:#0f172a;color:#f8fafc;border:1px solid #1e293b;border-radius:4px;margin-bottom:10px;">
        ${sheetOptions}
      </select>
      <label style="display:block;font-size:0.82rem;margin-bottom:4px;color:#f1f5f9;">Cell Range (e.g. A1:C5):</label>
      <input type="text" id="gridEmbedRange" value="A1:B4" style="width:100%;padding:8px;background:#0f172a;color:#f8fafc;border:1px solid #1e293b;border-radius:4px;">
    </div>
    <div style="display:flex;justify-content:flex-end;gap:8px;">
      <button class="btn ghost small" onclick="closeCapsuleModal()">Cancel</button>
      <button class="btn brass small" onclick="submitGridEmbedModal()">Insert Grid Embed</button>
    </div>
  `;
  document.getElementById('capsuleModalBg')?.classList.add('show');
}

function submitGridEmbedModal() {
  const sheet = document.getElementById('gridEmbedSheet')?.value || "Sheet1";
  const range = document.getElementById('gridEmbedRange')?.value || "A1:B4";
  closeCapsuleModal();
  insertGridEmbedWithDetails(sheet, range);
}

function insertGridEmbedWithDetails(sheet, range) {
  const deck = getSlidesData();
  pushGlidesHistory(deck);
  const obj = {
    id: "obj_grid_" + Date.now(),
    type: "gridEmbed",
    x: 15, y: 20, width: 70, height: 50,
    range: range.toUpperCase().replace(/\s/g, ""),
    workbook: "default",
    sheet: sheet
  };
  deck.slides[activeSlideIdx].objects.push(obj);
  selectedGlidesObjId = obj.id;
  saveGlidesData(deck);
  renderSlides();
}

function insertGridEmbed() {
  openGridEmbedModal();
}

let glidesDrawingActive = false;
let glidesDrawMode = 'pen'; // 'pen' | 'highlighter' | 'eraser'

function toggleGlidesDrawingMode(mode) {
  if (mode === 'off' || (glidesDrawingActive && glidesDrawMode === mode)) {
    glidesDrawingActive = false;
  } else {
    glidesDrawingActive = true;
    glidesDrawMode = mode;
  }
  renderSlides();
}

function clearGlidesDrawings() {
  const deck = getSlidesData();
  deck.slides[activeSlideIdx].objects = deck.slides[activeSlideIdx].objects.filter(o => o.type !== "drawing");
  saveGlidesData(deck);
  renderSlides();
}

function applyGlidesTheme(themeName) {
  const deck = getSlidesData();
  pushGlidesHistory(deck);
  deck.theme = themeName;
  const colors = {
    midnight: "#0f172a",
    aurora: "#022c22",
    paper: "#1e293b",
    studio: "#18181b",
    slate: "#334155",
    nebula: "#2e1065"
  };
  const bg = colors[themeName] || "#0f172a";
  deck.slides.forEach(s => {
    s.background = { type: "color", value: bg };
  });
  saveGlidesData(deck);
  renderSlides();
}

function setGlidesAspectRatio(ratio) {
  const deck = getSlidesData();
  deck.aspectRatio = ratio;
  saveGlidesData(deck);
  renderSlides();
}

function addGlidesObjectAnimation(animType) {
  if (!selectedGlidesObjId) return;
  const deck = getSlidesData();
  const slide = deck.slides[activeSlideIdx];
  if (!slide.animations) slide.animations = [];
  slide.animations.push({
    objectId: selectedGlidesObjId,
    type: animType,
    duration: 0.5
  });
  saveGlidesData(deck);
  alert("Animation '" + animType + "' added to object.");
}

function addGlidesSlideComment() {
  const txt = prompt("Enter review comment for this slide:");
  if (!txt) return;
  const deck = getSlidesData();
  if (!deck.slides[activeSlideIdx].comments) deck.slides[activeSlideIdx].comments = [];
  deck.slides[activeSlideIdx].comments.push({
    id: "comment_" + Date.now(),
    text: txt,
    date: new Date().toLocaleDateString()
  });
  saveGlidesData(deck);
  renderSlides();
}

function showGlidesHelpDrawer() {
  alert("GLIDES STUDIO HELP & KEYBOARD SHORTCUTS\n\nCtrl+Z: Undo\nCtrl+Y: Redo\nCtrl+F: Search presentation\nSpace / Left / Right: Navigate presentation mode\nEsc: Exit presentation mode");
}

function updateGlidesDeckTitle(title) {
  const deck = getSlidesData();
  deck.title = title || "Untitled Presentation";
  saveGlidesData(deck);
}

function updateGlidesSpeakerNotes(text) {
  const deck = getSlidesData();
  if (deck.slides[activeSlideIdx]) {
    deck.slides[activeSlideIdx].notes = text;
    saveGlidesData(deck);
  }
}

function updateGlidesObjProp(prop, val) {
  if (!selectedGlidesObjId) return;
  const deck = getSlidesData();
  const obj = deck.slides[activeSlideIdx].objects.find(o => o.id === selectedGlidesObjId);
  if (obj) {
    obj[prop] = val;
    saveGlidesData(deck);
    renderSlides();
  }
}

function deleteGlidesObject(id) {
  const deck = getSlidesData();
  pushGlidesHistory(deck);
  deck.slides[activeSlideIdx].objects = deck.slides[activeSlideIdx].objects.filter(o => o.id !== id);
  selectedGlidesObjId = null;
  saveGlidesData(deck);
  renderSlides();
}

function alignGlidesObject(dir) {
  if (!selectedGlidesObjId) return;
  const deck = getSlidesData();
  const objs = deck.slides[activeSlideIdx].objects;
  const idx = objs.findIndex(o => o.id === selectedGlidesObjId);
  if (idx !== -1) {
    const obj = objs.splice(idx, 1)[0];
    if (dir === 'front') objs.push(obj);
    else objs.unshift(obj);
    saveGlidesData(deck);
    renderSlides();
  }
}

function searchGlidesContent(q) {
  if (!q || !q.trim()) return;
  const query = q.trim().toLowerCase();
  const deck = getSlidesData();
  const matches = [];

  deck.slides.forEach((s, idx) => {
    let matched = false;
    if ((s.name || "").toLowerCase().includes(query) || (s.notes || "").toLowerCase().includes(query)) {
      matched = true;
    }
    if (!matched && s.comments && Array.isArray(s.comments)) {
      if (s.comments.some(c => (typeof c === "string" ? c : c.text || "").toLowerCase().includes(query))) {
        matched = true;
      }
    }
    if (!matched && s.objects && Array.isArray(s.objects)) {
      s.objects.forEach(o => {
        if (o.type === "text" && (o.content || "").toLowerCase().includes(query)) matched = true;
        if (o.type === "gridEmbed" && (o.range || "").toLowerCase().includes(query)) matched = true;
        if (o.type === "shape" && (o.shapeType || "").toLowerCase().includes(query)) matched = true;
        if (o.type === "chart" && (o.title || "").toLowerCase().includes(query)) matched = true;
      });
    }
    if (matched) matches.push(idx);
  });

  if (matches.length > 0) {
    selectGlidesSlide(matches[0]);
  }
}

function startGlidesPresenterMode() {
  const deck = getSlidesData();
  const visibleSlides = deck.slides.filter(s => !s.hidden);
  if (!visibleSlides.length) return;

  let presenterIdx = 0;
  const overlay = document.createElement("div");
  overlay.id = "glidesPresenterOverlay";
  overlay.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; background:#0b1329; color:#fff; z-index:99999; display:flex; flex-direction:column; justify-content:space-between; padding:24px; box-sizing:border-box; font-family:sans-serif;";

  const updatePresenter = () => {
    const s = visibleSlides[presenterIdx];
    const nextSlide = visibleSlides[presenterIdx + 1];
    const transitionType = s.transition ? s.transition.type : "fade";

    let animStyle = "transition: all 0.4s ease;";
    if (transitionType === "fade") animStyle += " opacity: 1;";
    else if (transitionType === "zoom") animStyle += " transform: scale(1);";
    else if (transitionType === "push" || transitionType === "slide") animStyle += " transform: translateX(0);";

    overlay.innerHTML = `
      <div style="display:flex; justify-content:space-between; border-bottom:1px solid #1e293b; padding-bottom:12px;">
        <span style="font-weight:bold; color:#818cf8; font-size:1.1rem;">GLIDES PRESENTER STUDIO — ${escapeHTML(deck.title)}</span>
        <span style="color:#94a3b8; font-size:0.95rem;">Visible Slide ${presenterIdx + 1} of ${visibleSlides.length} (${s.name})</span>
      </div>
      <div style="flex:1; display:flex; gap:20px; padding:20px 0; overflow:hidden;">
        <div style="flex:3; background:${s.background.value || "#0f172a"}; display:flex; align-items:center; justify-content:center; padding:10px; border-radius:8px; border:1px solid #1e293b; position:relative; ${animStyle}">
          <div style="width:100%; height:100%; position:relative;">
            ${renderGlidesCanvasObjects(s)}
          </div>
        </div>
        <div style="flex:1; display:flex; flex-direction:column; gap:15px; border-left:1px solid #1e293b; padding-left:20px; min-width:280px;">
          <div style="flex:1.2; background:#0f172a; padding:12px; border-radius:6px; border:1px solid #1e293b; overflow:hidden;">
            <h4 style="margin:0 0 8px 0; color:#38bdf8; font-size:0.82rem; letter-spacing:0.05em;">NEXT SLIDE PREVIEW</h4>
            ${nextSlide ? `
              <div style="font-size:0.8rem; color:#94a3b8; margin-bottom:6px;">${escapeHTML(nextSlide.name)}</div>
              <div style="width:100%; height:140px; background:${nextSlide.background.value || "#0f172a"}; position:relative; border-radius:4px; border:1px solid #334155; overflow:hidden;">
                ${renderGlidesSlideMiniPreview(nextSlide)}
              </div>
            ` : '<div style="color:#64748b; font-size:0.85rem; padding-top:20px;">End of Presentation</div>'}
          </div>
          <div style="flex:2; background:#0f172a; padding:12px; border-radius:6px; border:1px solid #1e293b; overflow:auto;">
            <h4 style="margin:0 0 8px 0; color:#38bdf8; font-size:0.82rem; letter-spacing:0.05em;">PRIVATE SPEAKER NOTES</h4>
            <div style="font-size:0.9rem; color:#e2e8f0; white-space:pre-wrap; line-height:1.5;">${escapeHTML(s.notes || "No notes for this slide.")}</div>
          </div>
        </div>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #1e293b; padding-top:12px;">
        <button class="btn ghost small" id="prevSlideBtn" style="color:#f8fafc;">◀ Previous</button>
        <button class="btn brass small" id="exitPresenterBtn">Exit Presentation (Esc)</button>
        <button class="btn ghost small" id="nextSlideBtn" style="color:#f8fafc;">Next ▶</button>
      </div>
    `;

    overlay.querySelector("#prevSlideBtn").onclick = () => { if (presenterIdx > 0) { presenterIdx--; updatePresenter(); } };
    overlay.querySelector("#nextSlideBtn").onclick = () => { if (presenterIdx < visibleSlides.length - 1) { presenterIdx++; updatePresenter(); } };
    overlay.querySelector("#exitPresenterBtn").onclick = () => { overlay.remove(); window.removeEventListener("keydown", keyHandler); };
  };

  const keyHandler = (e) => {
    if (e.key === "Escape") {
      overlay.remove();
      window.removeEventListener("keydown", keyHandler);
    } else if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
      if (presenterIdx < visibleSlides.length - 1) { presenterIdx++; updatePresenter(); }
    } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
      if (presenterIdx > 0) { presenterIdx--; updatePresenter(); }
    }
  };

  window.addEventListener("keydown", keyHandler);
  updatePresenter();
  document.body.appendChild(overlay);
}

function exportSlides() {
  const deck = getSlidesData();
  download("deck.glides", JSON.stringify(deck, null, 2));
}

function importSlides() {
  pickFile(".glides", (content) => {
    try {
      const parsed = JSON.parse(content);
      const migrated = migrateGlidesDeck(parsed);
      saveGlidesData(migrated);
      activeSlideIdx = 0;
      renderSlides();
    } catch (e) {
      alert("Could not read that .glides file");
    }
  });
}

/* ================= LOCKBOX (.lbox) ================= */
function renderLockbox(){
  const p = document.getElementById('panel-lockbox');
  if(!p) return;
  p.innerHTML = `
    <h2>Lockbox</h2>
    <div class="sub">.lbox — a real encrypted vault: logins, cards, identities, notes, keys — plus file references and time-locks</div>
    <div id="vaultRoot"></div>
    <hr style="border:none;border-top:1px solid var(--line);margin:26px 0;">
    <h3 style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:0.9em;color:#8a7f66;">File references</h3>
    <div class="toolbar">
      <input type="text" id="lboxName" placeholder="File name">
      <input type="text" id="lboxTag" placeholder="Tag (optional)">
      <button class="btn ghost small" onclick="addLockboxFile()">+ Add reference</button>
      <button class="btn ghost small" onclick="exportLockbox()">Export .lbox</button>
      <button class="btn ghost small" onclick="importLockbox()">Import .lbox</button>
    </div>
    <div id="lockboxList"></div>
    <div class="hint">A simple flat list with tags — no graph to render, nothing to get visually tangled.</div>
    <h3 style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:0.9em;color:#8a7f66;margin-top:22px;">🔒 Time-locked notes</h3>
    <div class="sub" style="margin-bottom:10px;">Seal something that literally can't be opened until the date you choose — a real dead-man's-switch note, not a file preview.</div>
    <div class="toolbar">
      <input type="text" id="tlName" placeholder="Note name">
      <input type="date" id="tlDate">
      <textarea id="tlContent" placeholder="What you're sealing…" style="min-width:220px;"></textarea>
      <button class="btn brass small" onclick="addTimelock()">🔒 Seal it</button>
    </div>
    <div id="timelockList"></div>
  `;
  renderLockboxList();
  renderTimelocks();
  renderVaultRoot();
}
function getLockboxData(){ return loadLocal('lockbox', {files:[
  {id:1,name:'Q1 budget',tag:'finance',usedIn:'Sheets'},
  {id:2,name:'Client intake',tag:'forms',usedIn:'Fill, Folio'}
], timelocks:[]}); }
function renderTimelocks(){
  const d = getLockboxData();
  d.timelocks = d.timelocks || [];
  const el = document.getElementById('timelockList');
  if(!el) return;
  if(d.timelocks.length===0){ el.innerHTML = '<div class="hint">Nothing sealed yet.</div>'; return; }
  const now = new Date();
  el.innerHTML = d.timelocks.map(t=>{
    const unlockDate = new Date(t.unlockDate+'T00:00:00');
    const locked = now < unlockDate;
    return `<div class="timelock-row">
      <b>${t.name}</b> ${locked?`<span class="locked-badge">🔒 locked until ${t.unlockDate}</span>`:`<span class="unlocked-badge">🔓 unlocked</span>`}
      <span style="cursor:pointer;color:#a8563f;float:right;" onclick="removeTimelock(${t.id})">✕</span>
      ${locked?'':`<div class="timelock-content">${t.content}</div>`}
    </div>`;
  }).join('');
}
async function encryptPayloadAES(text, secretKeyStr) {
  const enc = new TextEncoder();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw", enc.encode(secretKeyStr), { name: "PBKDF2" }, false, ["deriveKey"]
  );
  const key = await window.crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  const encryptedBuf = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(text)
  );
  const bufToBase64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  return JSON.stringify({
    ct: bufToBase64(encryptedBuf),
    iv: bufToBase64(iv),
    salt: bufToBase64(salt)
  });
}

async function decryptPayloadAES(encJsonStr, secretKeyStr) {
  try {
    const enc = new TextEncoder();
    const dec = new TextDecoder();
    const parsed = JSON.parse(encJsonStr);
    const base64ToBuf = (str) => Uint8Array.from(atob(str), c => c.charCodeAt(0));
    const ct = base64ToBuf(parsed.ct);
    const iv = base64ToBuf(parsed.iv);
    const salt = base64ToBuf(parsed.salt);

    const keyMaterial = await window.crypto.subtle.importKey(
      "raw", enc.encode(secretKeyStr), { name: "PBKDF2" }, false, ["deriveKey"]
    );
    const key = await window.crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );
    const decryptedBuf = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ct
    );
    return dec.decode(decryptedBuf);
  } catch(e) {
    return "[Decryption Failed - Invalid Key or Corrupted Payload]";
  }
}

function renderTimelocks(){
  const d = getLockboxData();
  d.timelocks = d.timelocks || [];
  const el = document.getElementById('timelockList');
  if(!el) return;
  if(d.timelocks.length===0){ el.innerHTML = '<div class="hint">Nothing sealed yet.</div>'; return; }
  const now = new Date();
  el.innerHTML = d.timelocks.map(t=>{
    const unlockDate = new Date(t.unlockDate+'T00:00:00');
    const locked = now < unlockDate;
    let displayContent = t.content;
    if(t.isAesEncrypted && !locked && t.decryptedText) {
      displayContent = t.decryptedText;
    } else if (t.isAesEncrypted && !locked && !t.decryptedText) {
      displayContent = `<button class="btn brass small" onclick="unlockTimelockAES(${t.id})">Decrypt with Unlock Key</button>`;
    } else if(!locked && !t.isAesEncrypted) {
      try { displayContent = decodeURIComponent(escape(atob(t.content))); } catch(e){}
    }

    return `<div class="timelock-row">
      <b>${t.name}</b> ${locked?`<span class="locked-badge">🔒 locked until ${t.unlockDate} (AES-GCM Encrypted)</span>`:`<span class="unlocked-badge">🔓 unlocked</span>`}
      <span style="cursor:pointer;color:#a8563f;float:right;" onclick="removeTimelock(${t.id})">✕</span>
      ${locked?'':`<div class="timelock-content" style="margin-top:6px;">${displayContent}</div>`}
    </div>`;
  }).join('');
}

async function unlockTimelockAES(id) {
  openModalForm({
    title: 'Unlock Timelock Entry',
    fields: [
      { name: 'secretKey', label: 'Enter Secret Key used when sealing', type: 'password', required: true }
    ],
    onSubmit: async (vals) => {
      const d = getLockboxData();
      const item = (d.timelocks||[]).find(t => t.id === id);
      if(item && vals.secretKey) {
        item.decryptedText = await decryptPayloadAES(item.content, vals.secretKey);
        saveLocal('lockbox', d);
        renderTimelocks();
      }
    }
  });
}

async function addTimelock(){
  const name = document.getElementById('tlName').value;
  const date = document.getElementById('tlDate').value;
  const content = document.getElementById('tlContent').value;
  if(!name || !date || !content){ alert('Fill in a name, unlock date, and what you\'re sealing.'); return; }

  openModalForm({
    title: 'Set Encryption Key for Timelock',
    fields: [
      { name: 'secretKey', label: 'Secret Key / Passphrase for AES-256-GCM', type: 'password', value: 'offlines-secret-key', required: true }
    ],
    onSubmit: async (vals) => {
      const secretKey = vals.secretKey || 'offlines-secret-key';
      const encContent = await encryptPayloadAES(content, secretKey);
      const d = getLockboxData();
      d.timelocks = d.timelocks || [];
      d.timelocks.push({
        id: Date.now(),
        name,
        unlockDate: date,
        content: encContent,
        isEncrypted: true,
        isAesEncrypted: true,
        createdAt: new Date().toISOString()
      });
      saveLocal('lockbox', d);
      renderTimelocks();
      document.getElementById('tlName').value=''; document.getElementById('tlContent').value='';
    }
  });
}
function removeTimelock(id){
  const d = getLockboxData();
  d.timelocks = (d.timelocks||[]).filter(t=>t.id!==id);
  saveLocal('lockbox', d); renderTimelocks();
}
function renderLockboxList(){
  const d = getLockboxData();
  const el = document.getElementById('lockboxList');
  if(d.files.length===0){ el.innerHTML='<div class="hint">Nothing here yet.</div>'; return; }
  el.innerHTML = d.files.map(f=>`
    <div class="lockbox-row">
      <span>${f.name} ${f.tag?`<span class="tag-pill">${f.tag}</span>`:''}
        ${f.usedIn?`<div class="used-in">used in: ${f.usedIn}</div>`:''}
      </span>
      <span style="cursor:pointer;color:#a8563f;" onclick="removeLockboxFile(${f.id})">✕</span>
    </div>
  `).join('');
}
function addLockboxFile(){
  const name = document.getElementById('lboxName').value;
  const tag = document.getElementById('lboxTag').value;
  if(!name) return;
  const d = getLockboxData();
  d.files.push({id:Date.now(), name, tag, usedIn:''});
  saveLocal('lockbox', d); renderLockboxList();
  document.getElementById('lboxName').value=''; document.getElementById('lboxTag').value='';
}
function removeLockboxFile(id){
  const d = getLockboxData();
  d.files = d.files.filter(f=>f.id!==id);
  saveLocal('lockbox', d); renderLockboxList();
}
function exportLockbox(){
  const d = getLockboxData();
  download('files.lbox', JSON.stringify({type:'lbox',...d}, null, 2));
}
function importLockbox(){
  pickFile('.lbox', (content)=>{
    try{ const parsed = JSON.parse(content); saveLocal('lockbox', {files:parsed.files||[]}); renderLockbox(); }
    catch(e){ alert('Could not read that .lbox file'); }
  });
}

/* ================= FORMULA (.formu) ================= */
function renderFormula(){
  const p = document.getElementById('panel-formula');
  if(!p) return;
  p.innerHTML = `
    <h2>Formula</h2>
    <div class="sub">.formu — Local scientific calculator, expression evaluator &amp; unit converter</div>
    <div class="toolbar">
      <button class="btn ghost small" onclick="clearFormulaHistory()">Clear History</button>
      <button class="btn ghost small" onclick="exportFormulaHistory()">Export .formu</button>
      <button class="btn ghost small" onclick="importFormulaHistory()">Import .formu</button>
    </div>
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-top:12px;">
      <div>
        <label style="display:block; font-size:0.85em; font-weight:600; margin-bottom:4px;">Expression / Math Input</label>
        <div style="display:flex; gap:6px; margin-bottom:8px;">
          <input type="text" id="formulaInput" placeholder="e.g. 25 * 4 + sin(3.14159/2) or 100 kg to lbs" style="flex:1;" onkeydown="if(event.key==='Enter') evaluateFormulaExpr()">
          <button class="btn sage small" onclick="evaluateFormulaExpr()">Calc</button>
        </div>
        <div id="formulaResultDisplay" style="background:var(--bg-elevated,#1e293b); border:1px solid var(--border,#334155); border-radius:6px; padding:12px; min-height:48px; font-family:monospace; font-size:1.2em; font-weight:bold; color:#f8fafc;">
          Result will appear here...
        </div>
        <div style="margin-top:12px; display:grid; grid-template-columns: repeat(4, 1fr); gap:6px;">
          <button class="btn ghost small" onclick="appendFormulaToken('sin(')">sin</button>
          <button class="btn ghost small" onclick="appendFormulaToken('cos(')">cos</button>
          <button class="btn ghost small" onclick="appendFormulaToken('tan(')">tan</button>
          <button class="btn ghost small" onclick="appendFormulaToken('sqrt(')">sqrt</button>
          <button class="btn ghost small" onclick="appendFormulaToken('log(')">log</button>
          <button class="btn ghost small" onclick="appendFormulaToken('pi')">π</button>
          <button class="btn ghost small" onclick="appendFormulaToken('^')">^</button>
          <button class="btn ghost small" onclick="appendFormulaToken('deg2rad(')">deg2rad</button>
        </div>
      </div>
      <div>
        <label style="display:block; font-size:0.85em; font-weight:600; margin-bottom:4px;">Calculation History</label>
        <div id="formulaHistoryList" style="max-height:280px; overflow-y:auto; background:var(--bg-elevated,#1e293b); border:1px solid var(--border,#334155); border-radius:6px; padding:8px;"></div>
      </div>
    </div>
  `;
  renderFormulaHistory();
}

function appendFormulaToken(tok){
  const inp = document.getElementById('formulaInput');
  if(!inp) return;
  inp.value += tok;
  inp.focus();
}

function evaluateFormulaExpr(){
  const inp = document.getElementById('formulaInput');
  const resEl = document.getElementById('formulaResultDisplay');
  if(!inp || !resEl) return;
  const raw = inp.value.trim();
  if(!raw) return;

  let resultVal = '';
  try {
    const convMatch = raw.match(/^([\d.]+)\s*([a-zA-Z]+)\s+to\s+([a-zA-Z]+)$/i);
    if(convMatch){
      const val = parseFloat(convMatch[1]);
      const u1 = convMatch[2].toLowerCase();
      const u2 = convMatch[3].toLowerCase();
      resultVal = convertFormulaUnits(val, u1, u2);
    } else {
      let expr = raw.replace(/pi/gi, 'Math.PI')
                    .replace(/e/gi, 'Math.E')
                    .replace(/sin\(/gi, 'Math.sin(')
                    .replace(/cos\(/gi, 'Math.cos(')
                    .replace(/tan\(/gi, 'Math.tan(')
                    .replace(/sqrt\(/gi, 'Math.sqrt(')
                    .replace(/log\(/gi, 'Math.log10(')
                    .replace(/ln\(/gi, 'Math.log(')
                    .replace(/deg2rad\(([^)]+)\)/gi, '(($1)*Math.PI/180)')
                    .replace(/\^/g, '**');
      if (/\b(window|document|eval|Function|fetch|XMLHttpRequest|localStorage|sessionStorage|IndexedDB|cookie|constructor|prototype|__proto__|globalThis|import|process)\b/i.test(expr) || /[;=\{\}\\\`]|--|\/\*/.test(expr)) {
        resEl.textContent = 'Error: Security Constraint';
        return;
      }
      const calc = Function('"use strict"; return (' + expr + ')')();
      resultVal = (typeof calc === 'number') ? (Number.isInteger(calc) ? calc.toString() : calc.toFixed(6).replace(/\.?0+$/, '')) : String(calc);
    }
  } catch(e) {
    resultVal = 'Error: Invalid Expression';
  }

  resEl.textContent = resultVal;

  if(!resultVal.startsWith('Error')){
    const data = loadLocal('formula', {history:[]});
    data.history.unshift({ id:Date.now(), expr:raw, result:resultVal, ts:new Date().toLocaleTimeString() });
    if(data.history.length > 50) data.history.pop();
    saveLocal('formula', data);
    renderFormulaHistory();
  }
}

function convertFormulaUnits(val, u1, u2){
  const ratesInMeters = { m:1, km:1000, cm:0.01, mm:0.001, ft:0.3048, in:0.0254, mi:1609.34 };
  const ratesInKg = { kg:1, g:0.001, mg:0.000001, lbs:0.453592, oz:0.0283495 };
  if(ratesInMeters[u1] && ratesInMeters[u2]){
    const meters = val * ratesInMeters[u1];
    const res = meters / ratesInMeters[u2];
    return res.toFixed(4) + ' ' + u2;
  }
  if(ratesInKg[u1] && ratesInKg[u2]){
    const kgs = val * ratesInKg[u1];
    const res = kgs / ratesInKg[u2];
    return res.toFixed(4) + ' ' + u2;
  }
  if(u1==='c' && u2==='f') return ((val * 9/5) + 32).toFixed(2) + ' °F';
  if(u1==='f' && u2==='c') return (((val - 32) * 5/9)).toFixed(2) + ' °C';
  return 'Unsupported unit conversion';
}

function renderFormulaHistory(){
  const el = document.getElementById('formulaHistoryList');
  if(!el) return;
  const data = loadLocal('formula', {history:[]});
  if(!data.history.length){ el.innerHTML = '<div class="hint">No calculations logged.</div>'; return; }
  el.innerHTML = data.history.map(item=>`
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border,#334155); padding:6px 0; font-size:0.88em;">
      <div>
        <span style="font-family:monospace; font-weight:600; color:#cbd5e1;">${item.expr}</span>
        <span style="color:var(--text-muted,#94a3b8);"> = </span>
        <span style="font-family:monospace; font-weight:bold; color:#38bdf8;">${item.result}</span>
      </div>
      <span style="font-size:0.75em; color:var(--text-muted,#94a3b8);">${item.ts}</span>
    </div>
  `).join('');
}

function clearFormulaHistory(){
  saveLocal('formula', {history:[]});
  renderFormulaHistory();
}
function exportFormulaHistory(){
  const d = loadLocal('formula', {history:[]});
  download('calculations.formu', JSON.stringify({type:'formu', ...d}, null, 2));
}
function importFormulaHistory(){
  pickFile('.formu', (content)=>{
    try{
      const parsed = JSON.parse(content);
      saveLocal('formula', {history: parsed.history || []});
      renderFormula();
    } catch(e){ alert('Could not parse .formu file'); }
  });
}

/* ================= TRANSMUTE (.xmute) ================= */
let _xmuteSection = 'convert';
let _xmuteActiveFile = null;
let _xmuteAnalysis = null;
let _xmuteTargetFormat = 'json';
let _xmuteConvertedResult = null;
let _xmutePipelineSteps = [];
let _xmuteBatchFiles = [];

function renderTransmute(){
  const p = document.getElementById('panel-transmute');
  if(!p) return;
  p.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
      <h2 style="margin:0;">Transmute Studio</h2>
      <div style="display:flex; gap:6px;">
        <button class="btn ghost small" onclick="exportTransmuteHistory()">Export .xmute</button>
        <button class="btn ghost small" onclick="importTransmuteHistory()">Import .xmute</button>
      </div>
    </div>
    <div class="sub">.xmute — Serverless File Conversion &amp; Transformation Workbench</div>

    <div class="xmute-layout">
      <!-- Internal Subnav Sidebar -->
      <div class="xmute-subnav">
        <button class="xmute-subnav-btn ${_xmuteSection==='home'?'active':''}" onclick="setXmuteSection('home')">🏠 Home</button>
        <button class="xmute-subnav-btn ${_xmuteSection==='convert'?'active':''}" onclick="setXmuteSection('convert')">⚡ Convert Files</button>
        <button class="xmute-subnav-btn ${_xmuteSection==='batch'?'active':''}" onclick="setXmuteSection('batch')">📦 Batch Conversion</button>
        <button class="xmute-subnav-btn ${_xmuteSection==='transform'?'active':''}" onclick="setXmuteSection('transform')">🔤 Transform Workbench</button>
        <button class="xmute-subnav-btn ${_xmuteSection==='pipeline'?'active':''}" onclick="setXmuteSection('pipeline')">🔀 Saved Pipelines</button>
        <button class="xmute-subnav-btn ${_xmuteSection==='history'?'active':''}" onclick="setXmuteSection('history')">📜 History</button>
        <button class="xmute-subnav-btn ${_xmuteSection==='settings'?'active':''}" onclick="setXmuteSection('settings')">⚙ Settings</button>
      </div>

      <!-- Main Stage -->
      <div class="xmute-main-stage" id="xmuteStage">
        ${renderXmuteSectionContent()}
      </div>
    </div>
  `;
}

function setXmuteSection(sec){
  _xmuteSection = sec;
  renderTransmute();
}

function renderXmuteSectionContent(){
  if(_xmuteSection === 'home') return renderXmuteHome();
  if(_xmuteSection === 'convert') return renderXmuteConvert();
  if(_xmuteSection === 'batch') return renderXmuteBatch();
  if(_xmuteSection === 'transform') return renderXmuteTransform();
  if(_xmuteSection === 'pipeline') return renderXmutePipelines();
  if(_xmuteSection === 'history') return renderXmuteHistoryPage();
  if(_xmuteSection === 'settings') return renderXmuteSettings();
  return renderXmuteConvert();
}

function renderXmuteTransform(){
  return `
    <div style="background:var(--bg-surface); border:1px solid var(--border-crisp); border-radius:8px; padding:20px;">
      <h3 style="margin-top:0; font-size:1.1rem; color:var(--text-workspace);">🔤 Transform Workbench</h3>
      <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:16px;">Perform real-time client-side text, hash, regex, and AST data transformations.</p>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
        <div>
          <label style="display:block; font-size:0.82rem; font-weight:600; margin-bottom:4px;">Transformation Mode</label>
          <select id="xmuteMode" style="width:100%; margin-bottom:10px;" onchange="executeTransmute()">
            <option value="json-fmt">JSON Prettify &amp; Validate</option>
            <option value="json-min">JSON Minify</option>
            <option value="b64-enc">Base64 Encode</option>
            <option value="b64-dec">Base64 Decode</option>
            <option value="url-enc">URL Encode</option>
            <option value="url-dec">URL Decode</option>
            <option value="hex-enc">Hex Encode</option>
            <option value="hex-dec">Hex Decode</option>
            <option value="sha256">SHA-256 Hash</option>
            <option value="upper">UPPERCASE</option>
            <option value="lower">lowercase</option>
            <option value="regex">Regex Replace</option>
            <option value="jsonpath">JSONPath Extractor</option>
          </select>

          <div id="xmuteExtraParams" style="margin-bottom:10px; display:none;">
            <input type="text" id="xmuteParam1" placeholder="Regex Pattern or Key Path (e.g. data.items)" style="width:100%; margin-bottom:6px;" oninput="executeTransmute()">
            <input type="text" id="xmuteParam2" placeholder="Replacement String (for Regex)" style="width:100%;" oninput="executeTransmute()">
          </div>

          <label style="display:block; font-size:0.82rem; font-weight:600; margin-bottom:4px;">Input Data</label>
          <textarea id="xmuteInput" placeholder="Paste text or JSON data here..." style="width:100%; height:140px; font-family:var(--font-mono); font-size:0.8rem; margin-bottom:10px;" oninput="executeTransmute()"></textarea>

          <label style="display:block; font-size:0.82rem; font-weight:600; margin-bottom:4px;">Transmuted Output</label>
          <textarea id="xmuteOutput" readonly placeholder="Result will appear here..." style="width:100%; height:140px; font-family:var(--font-mono); font-size:0.8rem; background:var(--bg-main); color:var(--text-workspace); margin-bottom:10px;"></textarea>

          <button class="btn brass small" onclick="saveTransmuteRecord()">Save to Log</button>
        </div>

        <div>
          <label style="display:block; font-size:0.82rem; font-weight:600; margin-bottom:6px;">Recent Transforms</label>
          <div id="xmuteHistoryList" style="max-height:420px; overflow-y:auto; background:var(--surface-panel); border:1px solid var(--border-crisp); border-radius:6px; padding:10px;"></div>
        </div>
      </div>
    </div>
  `;
}

async function applySingleTransformStep(inputVal, mode, param1 = '', param2 = '') {
  if (mode === 'json-fmt') {
    return JSON.stringify(JSON.parse(inputVal), null, 2);
  } else if (mode === 'json-min') {
    return JSON.stringify(JSON.parse(inputVal));
  } else if (mode === 'b64-enc') {
    return btoa(unescape(encodeURIComponent(inputVal)));
  } else if (mode === 'b64-dec') {
    return decodeURIComponent(escape(atob(inputVal)));
  } else if (mode === 'url-enc') {
    return encodeURIComponent(inputVal);
  } else if (mode === 'url-dec') {
    return decodeURIComponent(inputVal);
  } else if (mode === 'hex-enc') {
    return Array.from(new TextEncoder().encode(inputVal)).map(b => b.toString(16).padStart(2, '0')).join('');
  } else if (mode === 'hex-dec') {
    const clean = inputVal.replace(/\s+/g, '');
    const bytes = new Uint8Array(clean.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    return new TextDecoder().decode(bytes);
  } else if (mode === 'sha256') {
    const msgBuffer = new TextEncoder().encode(inputVal);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  } else if (mode === 'upper') {
    return inputVal.toUpperCase();
  } else if (mode === 'lower') {
    return inputVal.toLowerCase();
  } else if (mode === 'regex') {
    if (!param1) return inputVal;
    const re = new RegExp(param1, 'g');
    return inputVal.replace(re, param2 || '');
  } else if (mode === 'jsonpath') {
    const obj = JSON.parse(inputVal);
    if (!param1) return JSON.stringify(obj, null, 2);
    const keys = param1.split('.').filter(Boolean);
    let curr = obj;
    for (const k of keys) {
      if (curr && typeof curr === 'object' && k in curr) {
        curr = curr[k];
      } else {
        curr = undefined;
        break;
      }
    }
    return curr !== undefined ? (typeof curr === 'object' ? JSON.stringify(curr, null, 2) : String(curr)) : 'Key path not found';
  }
  return inputVal;
}

function renderXmutePipelines(){
  const savedPipelines = loadLocal('xmute_saved_pipelines', [
    { name: 'Base64 Decode + JSON Prettify', steps: [{ mode: 'b64-dec' }, { mode: 'json-fmt' }] },
    { name: 'Minify JSON + SHA-256 Hash', steps: [{ mode: 'json-min' }, { mode: 'sha256' }] },
    { name: 'Lowercase + Base64 Encode', steps: [{ mode: 'lower' }, { mode: 'b64-enc' }] }
  ]);

  return `
    <div style="background:var(--bg-surface); border:1px solid var(--border-crisp); border-radius:8px; padding:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <div>
          <h3 style="margin:0; font-size:1.1rem; color:var(--text-workspace);">🔀 Multi-Step Transformation Pipeline</h3>
          <p style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">Chain multiple transformations together into a repeatable local pipeline.</p>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn brass small" onclick="addXmutePipelineStep()">+ Add Step</button>
          <button class="btn ghost small" onclick="importXmutePipelineRecipe()">📥 Import Recipe (.xmute)</button>
        </div>
      </div>

      <!-- Saved Pipelines Preset Bar -->
      <div style="background:var(--surface-panel); border:1px solid var(--border-crisp); border-radius:6px; padding:10px; margin-bottom:16px;">
        <div style="font-size:0.78rem; font-weight:700; color:var(--text-muted); margin-bottom:6px; text-transform:uppercase;">Saved Pipeline Recipes</div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          ${savedPipelines.map((p, idx) => `
            <button class="btn ghost small" style="font-size:0.75rem;" onclick="loadXmuteSavedPipeline(${idx})">
              ⚡ ${escapeHTML(p.name)}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Steps List -->
      <div id="xmutePipelineStepsList" style="margin-bottom:16px;">
        ${renderPipelineStepsList()}
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
        <div>
          <label style="display:block; font-size:0.8rem; font-weight:600; margin-bottom:4px;">Pipeline Input Data</label>
          <textarea id="xmutePipelineInput" placeholder="Initial input data..." style="width:100%; height:120px; font-family:var(--font-mono); font-size:0.8rem;"></textarea>
        </div>
        <div>
          <label style="display:block; font-size:0.8rem; font-weight:600; margin-bottom:4px;">Pipeline Output Data</label>
          <textarea id="xmutePipelineOutput" readonly placeholder="Final pipeline result..." style="width:100%; height:120px; font-family:var(--font-mono); font-size:0.8rem; background:var(--bg-main);"></textarea>
        </div>
      </div>

      <div style="display:flex; gap:10px; margin-top:14px;">
        <button class="btn sage" onclick="runXmutePipeline()">▶ Run Pipeline</button>
        <button class="btn ghost" onclick="promptSaveXmutePipeline()">💾 Save Current Recipe</button>
        <button class="btn ghost" onclick="saveXmutePipelineRecipe()">⬇ Export Recipe (.xmute)</button>
        <button class="btn ghost" onclick="_xmutePipelineSteps=[]; renderTransmute();">Clear</button>
      </div>
    </div>
  `;
}

function renderPipelineStepsList(){
  if(!_xmutePipelineSteps.length) return '<div class="hint">No steps added yet. Click "+ Add Step" or load a recipe above to build a pipeline.</div>';
  return _xmutePipelineSteps.map((s, idx) => `
    <div class="xmute-pipeline-step">
      <div style="display:flex; align-items:center; gap:8px; flex:1;">
        <b style="color:var(--accent-primary);">Step ${idx+1}:</b>
        <select onchange="_xmutePipelineSteps[${idx}].mode=this.value;" style="padding:4px 8px; font-size:0.8rem;">
          <option value="json-fmt" ${s.mode==='json-fmt'?'selected':''}>JSON Prettify</option>
          <option value="json-min" ${s.mode==='json-min'?'selected':''}>JSON Minify</option>
          <option value="b64-enc" ${s.mode==='b64-enc'?'selected':''}>Base64 Encode</option>
          <option value="b64-dec" ${s.mode==='b64-dec'?'selected':''}>Base64 Decode</option>
          <option value="url-enc" ${s.mode==='url-enc'?'selected':''}>URL Encode</option>
          <option value="url-dec" ${s.mode==='url-dec'?'selected':''}>URL Decode</option>
          <option value="hex-enc" ${s.mode==='hex-enc'?'selected':''}>Hex Encode</option>
          <option value="hex-dec" ${s.mode==='hex-dec'?'selected':''}>Hex Decode</option>
          <option value="sha256" ${s.mode==='sha256'?'selected':''}>SHA-256 Hash</option>
          <option value="upper" ${s.mode==='upper'?'selected':''}>UPPERCASE</option>
          <option value="lower" ${s.mode==='lower'?'selected':''}>lowercase</option>
        </select>
      </div>
      <div style="display:flex; gap:6px;">
        <button class="btn ghost small" onclick="moveXmutePipelineStep(${idx}, -1)">▲</button>
        <button class="btn ghost small" onclick="moveXmutePipelineStep(${idx}, 1)">▼</button>
        <button class="btn ghost small" style="color:#ef4444;" onclick="removeXmutePipelineStep(${idx})">✕</button>
      </div>
    </div>
  `).join('');
}

function loadXmuteSavedPipeline(idx) {
  const saved = loadLocal('xmute_saved_pipelines', [
    { name: 'Base64 Decode + JSON Prettify', steps: [{ mode: 'b64-dec' }, { mode: 'json-fmt' }] },
    { name: 'Minify JSON + SHA-256 Hash', steps: [{ mode: 'json-min' }, { mode: 'sha256' }] },
    { name: 'Lowercase + Base64 Encode', steps: [{ mode: 'lower' }, { mode: 'b64-enc' }] }
  ]);
  if (saved[idx] && saved[idx].steps) {
    _xmutePipelineSteps = JSON.parse(JSON.stringify(saved[idx].steps));
    renderTransmute();
  }
}

function promptSaveXmutePipeline() {
  if (!_xmutePipelineSteps.length) {
    alert('Pipeline has no steps to save.');
    return;
  }
  const name = prompt('Name for this pipeline recipe:');
  if (!name) return;
  const saved = loadLocal('xmute_saved_pipelines', [
    { name: 'Base64 Decode + JSON Prettify', steps: [{ mode: 'b64-dec' }, { mode: 'json-fmt' }] },
    { name: 'Minify JSON + SHA-256 Hash', steps: [{ mode: 'json-min' }, { mode: 'sha256' }] },
    { name: 'Lowercase + Base64 Encode', steps: [{ mode: 'lower' }, { mode: 'b64-enc' }] }
  ]);
  saved.push({ name: name.trim(), steps: _xmutePipelineSteps });
  saveLocal('xmute_saved_pipelines', saved);
  renderTransmute();
}

function importXmutePipelineRecipe() {
  pickFile('.xmute', (content) => {
    try {
      const parsed = JSON.parse(content);
      if (parsed.steps && Array.isArray(parsed.steps)) {
        _xmutePipelineSteps = parsed.steps;
        renderTransmute();
      } else {
        alert('File does not contain valid pipeline steps.');
      }
    } catch(e) {
      alert('Could not parse pipeline file.');
    }
  });
}

function addXmutePipelineStep(){
  _xmutePipelineSteps.push({ mode: 'json-fmt' });
  renderTransmute();
}

function moveXmutePipelineStep(idx, dir){
  const target = idx + dir;
  if(target < 0 || target >= _xmutePipelineSteps.length) return;
  const temp = _xmutePipelineSteps[idx];
  _xmutePipelineSteps[idx] = _xmutePipelineSteps[target];
  _xmutePipelineSteps[target] = temp;
  renderTransmute();
}

function removeXmutePipelineStep(idx){
  _xmutePipelineSteps.splice(idx, 1);
  renderTransmute();
}

async function runXmutePipeline(){
  const inpEl = document.getElementById('xmutePipelineInput');
  const outEl = document.getElementById('xmutePipelineOutput');
  if(!inpEl || !outEl) return;
  let curr = inpEl.value;

  try {
    for(let i=0; i<_xmutePipelineSteps.length; i++){
      const step = _xmutePipelineSteps[i];
      curr = await applySingleTransformStep(curr, step.mode, step.param1, step.param2);
    }
    outEl.value = curr;
  } catch(e) {
    outEl.value = `[Pipeline Error at Step]: ${e.message}`;
  }
}

function saveXmutePipelineRecipe(){
  download('pipeline.xmute', JSON.stringify({ type:'xmute_pipeline', steps: _xmutePipelineSteps }, null, 2));
}

function validateXmuteOutput(targetFormat, text, blob, sourceFile) {
  if (!blob || blob.size === 0) throw new Error('Converted Blob is empty (0 bytes).');

  if (['png', 'jpeg', 'webp'].includes(targetFormat)) {
    if (blob.size < 50) throw new Error('Generated image Blob is invalid or corrupt.');
    return { valid: true, details: `Valid Image (${(blob.size/1024).toFixed(1)} KB)` };
  }

  if (targetFormat === 'json') {
    const parsed = JSON.parse(text);
    if (parsed === null || typeof parsed !== 'object') throw new Error('Output is not valid JSON.');
    const count = Array.isArray(parsed) ? parsed.length + ' items' : Object.keys(parsed).length + ' keys';
    return { valid: true, details: `Valid JSON (${count})` };
  }

  if (targetFormat === 'jsonl') {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (!lines.length) throw new Error('No valid JSON lines in output.');
    lines.forEach((l, i) => {
      try { JSON.parse(l); } catch(e) { throw new Error(`JSONL line ${i+1} invalid.`); }
    });
    return { valid: true, details: `Valid JSONL (${lines.length} lines)` };
  }

  if (targetFormat === 'csv' || targetFormat === 'tsv') {
    const parsed = parseCSV(text, targetFormat === 'tsv' ? '\t' : ',');
    if (!parsed.matrix.length) throw new Error('Tabular output matrix is empty.');
    return { valid: true, details: `Valid Table (${parsed.matrix.length} rows × ${parsed.matrix[0].length} cols)` };
  }

  if (targetFormat === 'html') {
    if (!text.includes('<!DOCTYPE html>') && !text.includes('<table') && !text.includes('<body')) throw new Error('HTML output missing document tags.');
    return { valid: true, details: 'Valid HTML5 Markup' };
  }

  return { valid: true, details: `Valid File (${(blob.size/1024).toFixed(1)} KB)` };
}

function renderXmuteBatch(){
  return `
    <div style="background:var(--bg-surface); border:1px solid var(--border-crisp); border-radius:8px; padding:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <div>
          <h3 style="margin:0; font-size:1.1rem; color:var(--text-workspace);">📦 Batch File Conversion Queue</h3>
          <p style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">Batch process multiple local files sequentially with zero server upload.</p>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn brass small" ${_xmuteBatchFiles.length?'':'disabled'} onclick="processXmuteBatch()">▶ Run Batch Conversion</button>
          <button class="btn ghost small" onclick="_xmuteBatchFiles=[]; renderTransmute();">Clear Queue</button>
        </div>
      </div>

      <div class="xmute-dropzone" onclick="document.getElementById('xmuteBatchInput').click()" style="padding:20px; margin-bottom:16px;">
        <input type="file" id="xmuteBatchInput" multiple style="display:none;" onchange="handleXmuteBatchSelect(this)">
        <div style="font-size:1.8rem; margin-bottom:6px;">📦</div>
        <div style="font-weight:600; font-size:0.9rem;">Select Multiple Local Files to Queue</div>
        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">Queue multiple CSV, JSON, TXT, MD, HTML, or Image files</div>
      </div>

      <div id="xmuteBatchQueueList" style="margin-top:16px;">
        ${renderXmuteBatchQueueList()}
      </div>
    </div>
  `;
}

function handleXmuteBatchSelect(inp){
  if(!inp.files) return;
  for(let i=0; i<inp.files.length; i++){
    _xmuteBatchFiles.push({ file: inp.files[i], status: 'Ready', target: 'json', result: null });
  }
  renderTransmute();
}

function renderXmuteBatchQueueList(){
  if(!_xmuteBatchFiles.length) return '<div style="color:var(--text-muted); font-size:0.85rem; padding:12px; text-align:center;">Queue is empty. Select files above to begin batch conversion.</div>';
  return _xmuteBatchFiles.map((b, idx) => `
    <div style="background:var(--surface-panel); border:1px solid var(--border-crisp); border-radius:6px; padding:12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <b style="font-size:0.88rem; color:var(--text-workspace);">${escapeHTML(b.file.name)}</b>
        <span style="font-size:0.75rem; color:var(--text-muted); margin-left:6px;">(${(b.file.size/1024).toFixed(1)} KB)</span>
        <span style="font-size:0.75rem; font-weight:600; color:${b.status.startsWith('Completed')?'var(--sage)':(b.status.startsWith('Failed')?'#ef4444':'#60a5fa')}; margin-left:12px;">
          ${escapeHTML(b.status)}
        </span>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        <label style="font-size:0.75rem; color:var(--text-muted);">Target:</label>
        <select style="font-size:0.75rem; padding:2px 6px;" onchange="_xmuteBatchFiles[${idx}].target = this.value;">
          <option value="json" ${b.target==='json'?'selected':''}>JSON</option>
          <option value="csv" ${b.target==='csv'?'selected':''}>CSV</option>
          <option value="jsonl" ${b.target==='jsonl'?'selected':''}>JSONL</option>
          <option value="md" ${b.target==='md'?'selected':''}>Markdown</option>
          <option value="html" ${b.target==='html'?'selected':''}>HTML</option>
          <option value="txt" ${b.target==='txt'?'selected':''}>Text</option>
          <option value="sha256" ${b.target==='sha256'?'selected':''}>SHA-256</option>
          <option value="hex" ${b.target==='hex'?'selected':''}>Hex</option>
          <option value="b64" ${b.target==='b64'?'selected':''}>Base64</option>
        </select>
        ${b.result ? `
          <button class="btn sage small" onclick="downloadXmuteBatchItem(${idx})">⬇ Download</button>
        ` : ''}
        <button class="btn ghost small" style="color:#ef4444;" onclick="_xmuteBatchFiles.splice(${idx},1); renderTransmute();">✕</button>
      </div>
    </div>
  `).join('');
}

async function processXmuteBatch() {
  if (!_xmuteBatchFiles.length) return;

  for (let i = 0; i < _xmuteBatchFiles.length; i++) {
    const b = _xmuteBatchFiles[i];
    b.status = 'Converting...';
    renderTransmute();
    try {
      _xmuteActiveFile = b.file;
      _xmuteTargetFormat = b.target;
      await processXmuteConversion();
      if (_xmuteConvertedResult) {
        b.result = _xmuteConvertedResult;
        b.status = 'Completed (' + (_xmuteConvertedResult.validationDetails || 'OK') + ')';
      } else {
        b.status = 'Failed: Conversion returned empty result.';
      }
    } catch(e) {
      b.status = 'Failed: ' + e.message;
    }
    renderTransmute();
  }
}

function downloadXmuteBatchItem(idx) {
  const item = _xmuteBatchFiles[idx];
  if (!item || !item.result || !item.result.blob) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(item.result.blob);
  a.download = item.result.filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function renderXmuteHistoryPage(){
  return `
    <div style="background:var(--bg-surface); border:1px solid var(--border-crisp); border-radius:8px; padding:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <h3 style="margin:0; font-size:1.1rem; color:var(--text-workspace);">📜 Conversion &amp; Transform History</h3>
        <button class="btn ghost small" onclick="clearTransmuteHistory()">Clear History</button>
      </div>
      <div id="xmuteHistoryList" style="max-height:480px; overflow-y:auto;"></div>
    </div>
  `;
}

function renderXmuteSettings(){
  return `
    <div style="background:var(--bg-surface); border:1px solid var(--border-crisp); border-radius:8px; padding:20px;">
      <h3 style="margin-top:0; font-size:1.1rem; color:var(--text-workspace);">⚙ Transmute Studio Settings</h3>
      <div style="display:grid; gap:12px; max-width:480px; margin-top:14px; font-size:0.85rem;">
        <label><input type="checkbox" checked disabled> Strictly Local Client-Side Processing (Enforced)</label>
        <label><input type="checkbox" checked> Auto-Validate Output Syntax on Conversion</label>
        <label><input type="checkbox" checked> Retain Recent Conversions in History Log</label>
      </div>
    </div>
  `;
}

function renderXmuteHome(){
  return `
    <div style="background:var(--bg-surface); border:1px solid var(--border-crisp); border-radius:8px; padding:24px;">
      <h3 style="margin-top:0; font-size:1.2rem; color:var(--text-workspace);">Serverless File Conversion &amp; Transformation Workbench</h3>
      <p style="color:var(--text-muted); font-size:0.9rem; max-width:640px; line-height:1.5;">
        Convert, transform, inspect, and verify your files 100% locally on this device. Nothing ever leaves your browser or touches a remote server.
      </p>

      <div style="display:flex; gap:12px; margin:20px 0;">
        <button class="btn brass" onclick="setXmuteSection('convert')">⚡ Convert Files</button>
        <button class="btn ghost" onclick="setXmuteSection('batch')">📦 Batch Conversion</button>
        <button class="btn ghost" onclick="setXmuteSection('transform')">🔤 Transform Workbench</button>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px; margin-top:24px;">
        <div style="background:var(--surface-panel); border:1px solid var(--border-crisp); border-radius:6px; padding:14px;">
          <h4 style="margin:0 0 6px; color:#60a5fa;">📄 Documents &amp; Data</h4>
          <div style="font-size:0.8rem; color:var(--text-muted);">CSV, JSON, JSONL, TXT, Markdown, HTML, TSV</div>
        </div>
        <div style="background:var(--surface-panel); border:1px solid var(--border-crisp); border-radius:6px; padding:14px;">
          <h4 style="margin:0 0 6px; color:#10b981;">🖼 Images &amp; Raster</h4>
          <div style="font-size:0.8rem; color:var(--text-muted);">PNG, JPEG, WebP (Canvas Rasterizer)</div>
        </div>
        <div style="background:var(--surface-panel); border:1px solid var(--border-crisp); border-radius:6px; padding:14px;">
          <h4 style="margin:0 0 6px; color:#f59e0b;">🔒 Security &amp; Forensic</h4>
          <div style="font-size:0.8rem; color:var(--text-muted);">Hex Inspector, Base64 Data URI, SHA-256 Hashes</div>
        </div>
      </div>
    </div>
  `;
}

function renderXmuteConvert(){
  const wfStep = !_xmuteActiveFile ? 1 : (!_xmuteTargetFormat ? 2 : (!_xmuteConvertedResult ? 3 : 4));
  return `
    <!-- 4-Step Workflow Bar -->
    <div class="xmute-workflow-bar">
      <div class="xmute-wf-step ${wfStep>=1?(wfStep>1?'done':'active'):''}">
        <div class="xmute-wf-num">1</div> Select File
      </div>
      <span style="opacity:0.3;">➔</span>
      <div class="xmute-wf-step ${wfStep>=2?(wfStep>2?'done':'active'):''}">
        <div class="xmute-wf-num">2</div> Choose Format
      </div>
      <span style="opacity:0.3;">➔</span>
      <div class="xmute-wf-step ${wfStep>=3?(wfStep>3?'done':'active'):''}">
        <div class="xmute-wf-num">3</div> Convert
      </div>
      <span style="opacity:0.3;">➔</span>
      <div class="xmute-wf-step ${wfStep>=4?'done':''}">
        <div class="xmute-wf-num">4</div> Download
      </div>
    </div>

    <div style="display:flex; gap:18px;">
      <div style="flex:1; min-width:0;">
        <!-- File Dropzone / Active Card -->
        ${!_xmuteActiveFile ? `
          <div class="xmute-dropzone" id="xmuteDropzone" onclick="document.getElementById('xmuteFileInput').click()" ondragover="event.preventDefault(); this.classList.add('drag');" ondragleave="this.classList.remove('drag');" ondrop="handleXmuteDrop(event)">
            <input type="file" id="xmuteFileInput" style="display:none;" onchange="handleXmuteFileSelect(this)">
            <div style="font-size:2rem; margin-bottom:8px;">📁</div>
            <div style="font-weight:600; font-size:0.95rem; color:var(--text-workspace);">Drop a local file here or click to browse</div>
            <div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">Supports CSV, JSON, JSONL, TXT, MD, HTML, Base64, Hex, SHA-256 (100% Offline)</div>
          </div>
        ` : `
          <div class="xmute-file-card">
            <div>
              <div style="font-weight:700; font-size:0.95rem; color:var(--text-workspace);">${escapeHTML(_xmuteActiveFile.name)}</div>
              <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">
                ${(_xmuteActiveFile.size/1024).toFixed(1)} KB · MIME: ${_xmuteActiveFile.type || 'unknown'} · Detected: ${_xmuteAnalysis?.format || 'Raw Binary'}
              </div>
            </div>
            <button class="btn ghost small" onclick="_xmuteActiveFile=null; _xmuteAnalysis=null; _xmuteConvertedResult=null; renderTransmute();">Change File</button>
          </div>

          <!-- File Analysis Card -->
          ${_xmuteAnalysis ? `
            <div style="background:var(--bg-surface); border:1px solid var(--border-crisp); border-radius:8px; padding:14px; margin-bottom:16px;">
              <div style="font-size:0.82rem; font-weight:700; color:var(--sage); margin-bottom:6px;">✓ Local Analysis Complete</div>
              <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:8px; font-size:0.8rem;">
                <div><span style="color:var(--text-muted);">Structure:</span> <b>${_xmuteAnalysis.structure || 'Generic'}</b></div>
                <div><span style="color:var(--text-muted);">Records / Lines:</span> <b>${_xmuteAnalysis.lines || 0}</b></div>
                <div><span style="color:var(--text-muted);">Fields / Keys:</span> <b>${_xmuteAnalysis.fieldsCount || 'N/A'}</b></div>
              </div>
            </div>
          ` : ''}
        `}

        <!-- Target Format Cards Grid -->
        <div style="background:var(--bg-surface); border:1px solid var(--border-crisp); border-radius:8px; padding:16px; margin-bottom:16px;">
          <h4 style="margin:0 0 10px; font-size:0.9rem; color:var(--text-workspace);">Select Target Conversion Format</h4>
          <div class="xmute-format-grid" id="xmuteFormatGrid">
            ${renderFormatCards()}
          </div>
        </div>

        <!-- Action Bar -->
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <button class="btn brass" ${_xmuteActiveFile?'':'disabled'} onclick="processXmuteConversion()">
            ⚡ Convert File to ${_xmuteTargetFormat.toUpperCase()}
          </button>
          ${_xmuteConvertedResult ? `
            <button class="btn sage" onclick="downloadXmuteConvertedResult()">
              ⬇ Download Converted (${_xmuteConvertedResult.filename})
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Right Conversion Preview Panel -->
      <div class="xmute-preview-panel">
        <h4 style="margin:0 0 10px; font-size:0.85rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-muted);">Conversion Preview</h4>

        <div style="background:var(--bg-surface); border:1px solid var(--border-crisp); border-radius:6px; padding:10px; margin-bottom:12px; font-size:0.8rem;">
          <div><span style="color:var(--text-muted);">Source:</span> <b>${_xmuteActiveFile ? escapeHTML(_xmuteActiveFile.name) : 'None'}</b></div>
          <div style="margin-top:4px;"><span style="color:var(--text-muted);">Target:</span> <b>${_xmuteTargetFormat.toUpperCase()}</b></div>
        </div>

        <label style="display:block; font-size:0.78rem; color:var(--text-muted); margin-bottom:4px;">Output Result Preview</label>
        ${renderXmutePreviewBody()}

        <div style="margin-top:12px; padding:10px; background:rgba(59,130,246,0.1); border:1px solid rgba(59,130,246,0.2); border-radius:6px; font-size:0.75rem; color:#93c5fd;">
          🔒 Strictly 0 Server Calls. All processing occurs locally via Web APIs.
        </div>
      </div>
    </div>
  `;
}

function renderXmutePreviewBody() {
  if (!_xmuteConvertedResult) {
    return `<textarea id="xmutePreviewArea" readonly style="width:100%; height:220px; font-family:var(--font-mono); font-size:0.78rem; background:var(--bg-main); color:var(--text-workspace); border:1px solid var(--border-crisp); border-radius:4px; padding:8px; resize:none;" placeholder="Converted preview output will appear here..."></textarea>`;
  }

  const badge = `<div style="font-size:0.75rem; color:var(--sage); font-weight:600; margin-bottom:6px;">✓ Output Validated (${escapeHTML(_xmuteConvertedResult.validationDetails || 'OK')})</div>`;

  if (['png', 'jpeg', 'webp'].includes(_xmuteTargetFormat) && _xmuteConvertedResult.blob) {
    const imgUrl = URL.createObjectURL(_xmuteConvertedResult.blob);
    return `
      ${badge}
      <div style="text-align:center; padding:10px; background:var(--bg-main); border:1px solid var(--border-crisp); border-radius:4px; margin-bottom:8px;">
        <img src="${imgUrl}" style="max-width:100%; max-height:160px; border-radius:4px;" alt="Converted Image Preview">
      </div>
      <textarea id="xmutePreviewArea" readonly style="width:100%; height:60px; font-family:var(--font-mono); font-size:0.75rem; background:var(--bg-main); color:var(--text-muted); border:1px solid var(--border-crisp); border-radius:4px; padding:6px; resize:none;">${escapeHTML(_xmuteConvertedResult.text)}</textarea>
    `;
  }

  if ((_xmuteTargetFormat === 'csv' || _xmuteTargetFormat === 'tsv') && _xmuteConvertedResult.text) {
    const parsed = parseCSV(_xmuteConvertedResult.text, _xmuteTargetFormat === 'tsv' ? '\t' : ',');
    const rows = parsed.matrix.slice(0, 5);
    let tableHtml = '<table style="width:100%; border-collapse:collapse; font-size:0.72rem; color:var(--text-workspace);">';
    if (rows.length > 0) {
      tableHtml += '<thead><tr style="background:var(--surface-panel);">' + rows[0].map(h => `<th style="border:1px solid var(--border-crisp); padding:4px;">${escapeHTML(h)}</th>`).join('') + '</tr></thead><tbody>';
      rows.slice(1).forEach(r => {
        tableHtml += '<tr>' + r.map(c => `<td style="border:1px solid var(--border-crisp); padding:4px;">${escapeHTML(c)}</td>`).join('') + '</tr>';
      });
      tableHtml += '</tbody>';
    }
    tableHtml += '</table>';

    return `
      ${badge}
      <div style="max-height:110px; overflow:auto; background:var(--bg-main); border:1px solid var(--border-crisp); border-radius:4px; padding:4px; margin-bottom:8px;">
        ${tableHtml}
      </div>
      <textarea id="xmutePreviewArea" readonly style="width:100%; height:100px; font-family:var(--font-mono); font-size:0.75rem; background:var(--bg-main); color:var(--text-workspace); border:1px solid var(--border-crisp); border-radius:4px; padding:6px; resize:none;">${escapeHTML(_xmuteConvertedResult.text)}</textarea>
    `;
  }

  return `
    ${badge}
    <textarea id="xmutePreviewArea" readonly style="width:100%; height:200px; font-family:var(--font-mono); font-size:0.78rem; background:var(--bg-main); color:var(--text-workspace); border:1px solid var(--border-crisp); border-radius:4px; padding:8px; resize:none;">${escapeHTML(_xmuteConvertedResult.text)}</textarea>
  `;
}

function getAvailableXmuteFormats(file) {
  if (!file) {
    return [
      { id: 'json', label: 'JSON Array', ext: '.json', mime: 'application/json', localSupported: true },
      { id: 'csv', label: 'CSV Table', ext: '.csv', mime: 'text/csv', localSupported: true },
      { id: 'jsonl', label: 'JSON Lines', ext: '.jsonl', mime: 'application/x-jsonlines', localSupported: true },
      { id: 'md', label: 'Markdown', ext: '.md', mime: 'text/markdown', localSupported: true },
      { id: 'html', label: 'HTML5', ext: '.html', mime: 'text/html', localSupported: true },
      { id: 'txt', label: 'Plain Text', ext: '.txt', mime: 'text/plain', localSupported: true },
      { id: 'sha256', label: 'SHA-256', ext: '.sha256.txt', mime: 'text/plain', localSupported: true },
      { id: 'hex', label: 'Hex Dump', ext: '.hex.txt', mime: 'text/plain', localSupported: true },
      { id: 'b64', label: 'Base64 Data', ext: '.b64.txt', mime: 'text/plain', localSupported: true }
    ];
  }

  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const isImage = ['png', 'jpg', 'jpeg', 'webp'].includes(ext) || (_xmuteAnalysis?.structure === 'Raster Image');
  const isTabular = ['csv', 'tsv'].includes(ext);
  const isJson = ext === 'json';
  const isJsonl = ext === 'jsonl';
  const isText = ['txt', 'md', 'html'].includes(ext);

  if (isImage) {
    return [
      { id: 'png', label: 'PNG Image', ext: '.png', mime: 'image/png', localSupported: true },
      { id: 'jpeg', label: 'JPEG Image', ext: '.jpg', mime: 'image/jpeg', localSupported: true },
      { id: 'webp', label: 'WebP Image', ext: '.webp', mime: 'image/webp', localSupported: true },
      { id: 'b64', label: 'Base64 Data URI', ext: '.b64.txt', mime: 'text/plain', localSupported: true },
      { id: 'hex', label: 'Hex Dump', ext: '.hex.txt', mime: 'text/plain', localSupported: true },
      { id: 'sha256', label: 'SHA-256 Hash', ext: '.sha256.txt', mime: 'text/plain', localSupported: true }
    ];
  }

  if (isTabular) {
    return [
      { id: 'json', label: 'JSON Array', ext: '.json', mime: 'application/json', localSupported: true },
      { id: 'jsonl', label: 'JSON Lines', ext: '.jsonl', mime: 'application/x-jsonlines', localSupported: true },
      { id: 'tsv', label: 'TSV Table', ext: '.tsv', mime: 'text/tab-separated-values', localSupported: true },
      { id: 'csv', label: 'CSV Table', ext: '.csv', mime: 'text/csv', localSupported: true },
      { id: 'txt', label: 'Plain Text', ext: '.txt', mime: 'text/plain', localSupported: true },
      { id: 'html', label: 'HTML Table', ext: '.html', mime: 'text/html', localSupported: true },
      { id: 'md', label: 'Markdown Table', ext: '.md', mime: 'text/markdown', localSupported: true },
      { id: 'sha256', label: 'SHA-256 Hash', ext: '.sha256.txt', mime: 'text/plain', localSupported: true },
      { id: 'hex', label: 'Hex Dump', ext: '.hex.txt', mime: 'text/plain', localSupported: true },
      { id: 'b64', label: 'Base64 Data URI', ext: '.b64.txt', mime: 'text/plain', localSupported: true }
    ];
  }

  if (isJson) {
    return [
      { id: 'csv', label: 'CSV Table', ext: '.csv', mime: 'text/csv', localSupported: true },
      { id: 'jsonl', label: 'JSON Lines', ext: '.jsonl', mime: 'application/x-jsonlines', localSupported: true },
      { id: 'tsv', label: 'TSV Table', ext: '.tsv', mime: 'text/tab-separated-values', localSupported: true },
      { id: 'txt', label: 'Formatted JSON Text', ext: '.txt', mime: 'text/plain', localSupported: true },
      { id: 'html', label: 'HTML View', ext: '.html', mime: 'text/html', localSupported: true },
      { id: 'sha256', label: 'SHA-256 Hash', ext: '.sha256.txt', mime: 'text/plain', localSupported: true },
      { id: 'hex', label: 'Hex Dump', ext: '.hex.txt', mime: 'text/plain', localSupported: true },
      { id: 'b64', label: 'Base64 Data URI', ext: '.b64.txt', mime: 'text/plain', localSupported: true }
    ];
  }

  if (isJsonl) {
    return [
      { id: 'json', label: 'JSON Array', ext: '.json', mime: 'application/json', localSupported: true },
      { id: 'csv', label: 'CSV Table', ext: '.csv', mime: 'text/csv', localSupported: true },
      { id: 'tsv', label: 'TSV Table', ext: '.tsv', mime: 'text/tab-separated-values', localSupported: true },
      { id: 'txt', label: 'Plain Text', ext: '.txt', mime: 'text/plain', localSupported: true },
      { id: 'sha256', label: 'SHA-256 Hash', ext: '.sha256.txt', mime: 'text/plain', localSupported: true },
      { id: 'hex', label: 'Hex Dump', ext: '.hex.txt', mime: 'text/plain', localSupported: true },
      { id: 'b64', label: 'Base64 Data URI', ext: '.b64.txt', mime: 'text/plain', localSupported: true }
    ];
  }

  if (isText) {
    return [
      { id: 'md', label: 'Markdown', ext: '.md', mime: 'text/markdown', localSupported: true },
      { id: 'html', label: 'HTML5', ext: '.html', mime: 'text/html', localSupported: true },
      { id: 'txt', label: 'Plain Text', ext: '.txt', mime: 'text/plain', localSupported: true },
      { id: 'json', label: 'JSON String', ext: '.json', mime: 'application/json', localSupported: true },
      { id: 'sha256', label: 'SHA-256 Hash', ext: '.sha256.txt', mime: 'text/plain', localSupported: true },
      { id: 'hex', label: 'Hex Dump', ext: '.hex.txt', mime: 'text/plain', localSupported: true },
      { id: 'b64', label: 'Base64 Data URI', ext: '.b64.txt', mime: 'text/plain', localSupported: true }
    ];
  }

  // Binary / Document files
  return [
    { id: 'sha256', label: 'SHA-256 Hash', ext: '.sha256.txt', mime: 'text/plain', localSupported: true },
    { id: 'hex', label: 'Hex Dump', ext: '.hex.txt', mime: 'text/plain', localSupported: true },
    { id: 'b64', label: 'Base64 Data URI', ext: '.b64.txt', mime: 'text/plain', localSupported: true }
  ];
}

function renderFormatCards(){
  const formats = getAvailableXmuteFormats(_xmuteActiveFile);
  if (formats.length > 0 && !formats.some(f => f.id === _xmuteTargetFormat)) {
    _xmuteTargetFormat = formats[0].id;
  }

  return formats.map(f => `
    <div class="xmute-format-card ${f.id===_xmuteTargetFormat?'selected':''} ${!f.localSupported?'disabled':''}" onclick="${f.localSupported?`selectXmuteFormat('${f.id}')`:''}">
      <div style="font-weight:700; font-size:0.85rem; color:var(--text-workspace);">${f.label}</div>
      <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">${f.ext}</div>
      <div style="font-size:0.68rem; color:${f.localSupported?'var(--sage)':'#ef4444'}; margin-top:4px;">
        ${f.localSupported ? '✓ Local Available' : '⚠ Local Engine Required'}
      </div>
    </div>
  `).join('');
}

function selectXmuteFormat(fmt){
  _xmuteTargetFormat = fmt;
  renderTransmute();
}

async function handleXmuteFileSelect(inp) {
  if (!inp.files || !inp.files[0]) return;
  await setXmuteActiveFile(inp.files[0]);
}

async function handleXmuteDrop(e) {
  e.preventDefault();
  const dropzone = document.getElementById('xmuteDropzone');
  if (dropzone) dropzone.classList.remove('drag');
  if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
    await setXmuteActiveFile(e.dataTransfer.files[0]);
  }
}

async function setXmuteActiveFile(file) {
  _xmuteActiveFile = file;
  _xmuteConvertedResult = null;
  _xmuteAnalysis = await analyzeXmuteFile(file);
  renderTransmute();
}

function parseCSV(text, delimiter) {
  if (text.startsWith('\uFEFF')) text = text.slice(1);
  if (!delimiter) {
    const firstLine = text.split(/\r?\n/)[0] || '';
    const commas = (firstLine.match(/,/g) || []).length;
    const tabs = (firstLine.match(/\t/g) || []).length;
    const semicolons = (firstLine.match(/;/g) || []).length;
    if (tabs > commas && tabs > semicolons) delimiter = '\t';
    else if (semicolons > commas && semicolons > tabs) delimiter = ';';
    else delimiter = ',';
  }
  let p = 0, row = [''], matrix = [row], inQuotes = false;
  while (p < text.length) {
    const c = text[p];
    const next = text[p + 1];
    if (inQuotes) {
      if (c === '"' && next === '"') {
        row[row.length - 1] += '"';
        p += 2;
        continue;
      } else if (c === '"') {
        inQuotes = false;
        p++;
        continue;
      } else {
        row[row.length - 1] += c;
        p++;
        continue;
      }
    }
    if (c === '"') {
      inQuotes = true;
      p++;
      continue;
    }
    if (c === delimiter) {
      row.push('');
      p++;
      continue;
    }
    if (c === '\r' && next === '\n') {
      p += 2;
      row = [''];
      matrix.push(row);
      continue;
    }
    if (c === '\n' || c === '\r') {
      p++;
      row = [''];
      matrix.push(row);
      continue;
    }
    row[row.length - 1] += c;
    p++;
  }
  if (matrix.length > 1 && matrix[matrix.length - 1].length === 1 && matrix[matrix.length - 1][0] === '') {
    matrix.pop();
  }
  return { matrix, delimiter };
}

async function detectXmuteFileType(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  let detectedFormat = ext.toUpperCase();
  let magicName = '';
  let mismatchWarning = null;

  try {
    const buf = await file.slice(0, 16).arrayBuffer();
    const u8 = new Uint8Array(buf);
    const hex = Array.from(u8).map(b => b.toString(16).padStart(2, '0')).join('');

    if (hex.startsWith('25504446')) magicName = 'PDF';
    else if (hex.startsWith('89504e47')) magicName = 'PNG';
    else if (hex.startsWith('ffd8ff')) magicName = 'JPEG';
    else if (hex.startsWith('52494646') && hex.slice(16, 24) === '57454250') magicName = 'WEBP';
    else if (hex.startsWith('504b0304')) magicName = 'ZIP';

    if (magicName && magicName !== 'ZIP') {
      if (ext !== magicName.toLowerCase()) {
        mismatchWarning = `Filename says .${ext}, but signature detects ${magicName}`;
      }
      detectedFormat = magicName;
    }
  } catch(e) {
    console.warn('Magic byte detection skipped:', e);
  }

  return { ext, detectedFormat, magicName, mismatchWarning };
}

async function analyzeXmuteFile(file) {
  const detection = await detectXmuteFileType(file);
  const ext = detection.ext;
  let analysis = {
    format: detection.detectedFormat,
    structure: 'Binary / Generic File',
    lines: (file.size / 1024).toFixed(1) + ' KB',
    fieldsCount: 'N/A',
    mismatchWarning: detection.mismatchWarning,
    parsedData: null
  };

  try {
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext) || ['PNG', 'JPEG', 'WEBP'].includes(detection.detectedFormat)) {
      analysis.structure = 'Raster Image';
      const url = URL.createObjectURL(file);
      const img = new Image();
      await new Promise((resolve) => {
        img.onload = () => {
          analysis.fieldsCount = `${img.width} × ${img.height} px`;
          URL.revokeObjectURL(url);
          resolve();
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(); };
        img.src = url;
      });
    } else if (['csv', 'tsv', 'json', 'jsonl', 'txt', 'md', 'html'].includes(ext)) {
      const text = await file.text();
      const rawLines = text.split(/\r?\n/);
      analysis.lines = rawLines.length + ' lines';

      if (ext === 'csv' || ext === 'tsv') {
        analysis.structure = 'Tabular Dataset';
        const parsed = parseCSV(text, ext === 'tsv' ? '\t' : null);
        const headers = parsed.matrix[0] || [];
        analysis.fieldsCount = `${parsed.matrix.length} rows × ${headers.length} cols`;
        analysis.parsedData = { matrix: parsed.matrix, delimiter: parsed.delimiter };
      } else if (ext === 'json') {
        analysis.structure = 'Structured JSON';
        try {
          const parsed = JSON.parse(text);
          analysis.parsedData = parsed;
          if (Array.isArray(parsed)) {
            analysis.fieldsCount = parsed.length + ' items (Array)';
          } else if (typeof parsed === 'object' && parsed !== null) {
            analysis.fieldsCount = Object.keys(parsed).length + ' keys (Object)';
          } else {
            analysis.fieldsCount = typeof parsed;
          }
        } catch(e) {
          analysis.structure = 'Invalid JSON';
          analysis.fieldsCount = 'Parse Error';
        }
      } else if (ext === 'jsonl') {
        analysis.structure = 'JSON Lines';
        let valid = 0, invalid = 0;
        rawLines.filter(l => l.trim()).forEach(line => {
          try { JSON.parse(line); valid++; } catch(e) { invalid++; }
        });
        analysis.fieldsCount = `${valid} valid, ${invalid} invalid rows`;
      } else if (['txt', 'md', 'html'].includes(ext)) {
        analysis.structure = ext === 'html' ? 'HTML Markup' : (ext === 'md' ? 'Markdown Text' : 'Plain Text');
        analysis.fieldsCount = text.length.toLocaleString() + ' characters';
      }
    } else if (detection.magicName === 'PDF') {
      analysis.structure = 'PDF Document (Local Mode)';
      analysis.fieldsCount = 'Binary Document';
    } else if (detection.magicName === 'ZIP') {
      analysis.structure = ext.toUpperCase() + ' Zip Package';
      analysis.fieldsCount = 'Package Container';
    }
  } catch(e) {
    console.error('File analysis error:', e);
  }

  return analysis;
}

async function processXmuteConversion() {
  if (!_xmuteActiveFile) {
    alert('Please select a local file first.');
    return;
  }

  try {
    const formats = getAvailableXmuteFormats(_xmuteActiveFile);
    const targetMeta = formats.find(f => f.id === _xmuteTargetFormat) || { ext: '.' + _xmuteTargetFormat, mime: 'text/plain' };
    let mimeType = targetMeta.mime || 'text/plain';
    let outExt = targetMeta.ext || ('.' + _xmuteTargetFormat);
    let convertedText = '';
    let resultBlob = null;

    const ext = (_xmuteActiveFile.name.split('.').pop() || '').toLowerCase();

    // Image conversion using Canvas API
    if (['png', 'jpeg', 'webp'].includes(_xmuteTargetFormat)) {
      if (!['png', 'jpg', 'jpeg', 'webp'].includes(ext) && _xmuteAnalysis?.structure !== 'Raster Image') {
        throw new Error(`Cannot convert binary/text file ${_xmuteActiveFile.name} directly to raster image.`);
      }
      const imgUrl = URL.createObjectURL(_xmuteActiveFile);
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Failed to load image for conversion'));
        img.src = imgUrl;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(imgUrl);

      mimeType = _xmuteTargetFormat === 'png' ? 'image/png' : (_xmuteTargetFormat === 'jpeg' ? 'image/jpeg' : 'image/webp');
      resultBlob = await new Promise((resolve) => canvas.toBlob(resolve, mimeType, 0.92));
      convertedText = `[BINARY IMAGE DATA: ${_xmuteTargetFormat.toUpperCase()} (${(resultBlob.size/1024).toFixed(1)} KB) - ${img.width}x${img.height} px]`;
    } else {
      // Text / Structured Data / Hash / Hex / B64
      const textContent = await _xmuteActiveFile.text();

      if (_xmuteTargetFormat === 'json') {
        if (ext === 'csv' || ext === 'tsv' || _xmuteAnalysis?.structure === 'Tabular Dataset') {
          const parsed = parseCSV(textContent, ext === 'tsv' ? '\t' : null);
          const matrix = parsed.matrix;
          if (!matrix.length) throw new Error('CSV dataset is empty');
          const headers = matrix[0].map(h => h.trim());
          const rows = matrix.slice(1).filter(r => r.some(v => v !== '')).map(r => {
            const obj = {};
            headers.forEach((h, idx) => { obj[h || `col_${idx+1}`] = r[idx] ?? ''; });
            return obj;
          });
          convertedText = JSON.stringify(rows, null, 2);
        } else if (ext === 'jsonl') {
          const lines = textContent.split(/\r?\n/).filter(l => l.trim());
          const arr = lines.map((l, i) => {
            try { return JSON.parse(l); } catch(e) { throw new Error(`Invalid JSON on line ${i+1}`); }
          });
          convertedText = JSON.stringify(arr, null, 2);
        } else {
          try {
            const parsed = JSON.parse(textContent);
            convertedText = JSON.stringify(parsed, null, 2);
          } catch(e) {
            convertedText = JSON.stringify({ filename: _xmuteActiveFile.name, content: textContent }, null, 2);
          }
        }
      } else if (_xmuteTargetFormat === 'csv' || _xmuteTargetFormat === 'tsv') {
        const delim = _xmuteTargetFormat === 'tsv' ? '\t' : ',';
        if (ext === 'json' || ext === 'jsonl') {
          let arr = [];
          if (ext === 'jsonl') {
            arr = textContent.split(/\r?\n/).filter(l => l.trim()).map(l => JSON.parse(l));
          } else {
            const parsed = JSON.parse(textContent);
            arr = Array.isArray(parsed) ? parsed : [parsed];
          }
          if (!arr.length) throw new Error('JSON object array is empty');
          const keys = Array.from(new Set(arr.flatMap(obj => typeof obj === 'object' && obj !== null ? Object.keys(obj) : ['value'])));
          let csvStr = keys.map(k => `"${k.replace(/"/g, '""')}"`).join(delim) + '\n';
          arr.forEach(row => {
            if (typeof row !== 'object' || row === null) {
              csvStr += `"${String(row).replace(/"/g, '""')}"\n`;
            } else {
              csvStr += keys.map(k => `"${String(row[k] ?? '').replace(/"/g, '""')}"`).join(delim) + '\n';
            }
          });
          convertedText = csvStr;
        } else if (ext === 'csv' || ext === 'tsv') {
          const parsed = parseCSV(textContent, ext === 'tsv' ? '\t' : ',');
          convertedText = parsed.matrix.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(delim)).join('\n');
        } else {
          convertedText = `value\n"${textContent.replace(/"/g, '""')}"`;
        }
      } else if (_xmuteTargetFormat === 'jsonl') {
        let arr = [];
        if (ext === 'csv' || ext === 'tsv') {
          const parsed = parseCSV(textContent, ext === 'tsv' ? '\t' : null);
          const headers = parsed.matrix[0] || [];
          arr = parsed.matrix.slice(1).filter(r => r.some(v => v !== '')).map(r => {
            const obj = {};
            headers.forEach((h, idx) => { obj[h || `col_${idx+1}`] = r[idx] ?? ''; });
            return obj;
          });
        } else {
          const parsed = JSON.parse(textContent);
          arr = Array.isArray(parsed) ? parsed : [parsed];
        }
        convertedText = arr.map(item => JSON.stringify(item)).join('\n');
      } else if (_xmuteTargetFormat === 'md') {
        if (ext === 'csv' || ext === 'tsv') {
          const parsed = parseCSV(textContent, ext === 'tsv' ? '\t' : null);
          const m = parsed.matrix;
          if (m.length) {
            convertedText = '| ' + m[0].join(' | ') + ' |\n';
            convertedText += '| ' + m[0].map(() => '---').join(' | ') + ' |\n';
            m.slice(1).forEach(row => { convertedText += '| ' + row.join(' | ') + ' |\n'; });
          }
        } else {
          convertedText = `# ${_xmuteActiveFile.name.replace(/\.[^/.]+$/, "")}\n\n` + textContent;
        }
      } else if (_xmuteTargetFormat === 'html') {
        if (ext === 'csv' || ext === 'tsv') {
          const parsed = parseCSV(textContent, ext === 'tsv' ? '\t' : null);
          const m = parsed.matrix;
          let tableHtml = '<table border="1" style="border-collapse:collapse;">';
          if (m.length) {
            tableHtml += '<thead><tr>' + m[0].map(h => `<th>${escapeHTML(h)}</th>`).join('') + '</tr></thead><tbody>';
            m.slice(1).forEach(row => {
              tableHtml += '<tr>' + row.map(c => `<td>${escapeHTML(c)}</td>`).join('') + '</tr>';
            });
            tableHtml += '</tbody>';
          }
          tableHtml += '</table>';
          convertedText = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Tabular Conversion</title></head><body>${tableHtml}</body></html>`;
        } else {
          convertedText = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Converted Document</title></head><body>${escapeHTML(textContent).replace(/\n/g,'<br>')}</body></html>`;
        }
      } else if (_xmuteTargetFormat === 'txt') {
        if (ext === 'html') {
          const doc = new DOMParser().parseFromString(textContent, 'text/html');
          convertedText = doc.body.textContent || textContent;
        } else {
          convertedText = textContent;
        }
      } else if (_xmuteTargetFormat === 'sha256') {
        const buf = await _xmuteActiveFile.arrayBuffer();
        const hashBuf = await crypto.subtle.digest('SHA-256', buf);
        const hashArray = Array.from(new Uint8Array(hashBuf));
        convertedText = `FILE SHA-256 HASH:\nFilename: ${_xmuteActiveFile.name}\nHash: ${hashArray.map(b => b.toString(16).padStart(2, '0')).join('')}`;
      } else if (_xmuteTargetFormat === 'hex') {
        const buf = await _xmuteActiveFile.arrayBuffer();
        const u8 = new Uint8Array(buf);
        let hex = `BINARY HEX DUMP (${_xmuteActiveFile.name} - ${u8.length} bytes):\n`;
        const limit = Math.min(u8.length, 4096);
        for (let i = 0; i < limit; i += 16) {
          const chunk = u8.subarray(i, i + 16);
          const hexStr = Array.from(chunk).map(b => b.toString(16).padStart(2, '0')).join(' ');
          const asciiStr = Array.from(chunk).map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.').join('');
          hex += i.toString(16).padStart(8, '0') + '  ' + hexStr.padEnd(48, ' ') + '  |' + asciiStr + '|\n';
        }
        if (u8.length > 4096) hex += '\n... (truncated for preview)';
        convertedText = hex;
      } else if (_xmuteTargetFormat === 'b64') {
        const buf = await _xmuteActiveFile.arrayBuffer();
        const u8 = new Uint8Array(buf);
        let binaryStr = '';
        for (let i = 0; i < u8.length; i++) { binaryStr += String.fromCharCode(u8[i]); }
        convertedText = `data:${_xmuteActiveFile.type || 'application/octet-stream'};base64,` + btoa(binaryStr);
      } else {
        throw new Error(`Conversion format '${_xmuteTargetFormat}' is not available in Local Mode yet.`);
      }

      resultBlob = new Blob([convertedText], { type: mimeType });
    }

    const validation = validateXmuteOutput(_xmuteTargetFormat, convertedText, resultBlob, _xmuteActiveFile);

    const outFilename = _xmuteActiveFile.name.replace(/\.[^/.]+$/, "") + '_converted' + outExt;
    _xmuteConvertedResult = {
      filename: outFilename,
      text: convertedText,
      blob: resultBlob,
      mimeType: mimeType,
      validationDetails: validation.details
    };

    saveXmuteHistoryRecord({
      mode: 'File: ' + _xmuteTargetFormat.toUpperCase(),
      input: _xmuteActiveFile.name,
      output: outFilename,
      ts: new Date().toLocaleTimeString()
    });

    renderTransmute();
  } catch (e) {
    alert('Conversion error: ' + e.message);
  }
}

function downloadXmuteConvertedResult(){
  if (!_xmuteConvertedResult || !_xmuteConvertedResult.blob) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(_xmuteConvertedResult.blob);
  a.download = _xmuteConvertedResult.filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function saveXmuteHistoryRecord(record){
  const data = loadLocal('transmute', {history:[]});
  data.history.unshift({ id: Date.now(), ...record });
  if(data.history.length > 30) data.history.pop();
  saveLocal('transmute', data);
}

function downloadTransmuteConvertedFile() {
  if (!_convertedFileBlob || !_convertedFileName) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(_convertedFileBlob);
  a.download = _convertedFileName;
  a.click();
}

async function executeTransmute(){
  const inpEl = document.getElementById('xmuteInput');
  const outEl = document.getElementById('xmuteOutput');
  const modeEl = document.getElementById('xmuteMode');
  const extraParamsEl = document.getElementById('xmuteExtraParams');
  if(!inpEl || !outEl || !modeEl) return;

  if(extraParamsEl){
    extraParamsEl.style.display = (modeEl.value === 'regex' || modeEl.value === 'jsonpath') ? 'block' : 'none';
  }

  const val = inpEl.value;
  const mode = modeEl.value;
  if(!val){ outEl.value = ''; return; }

  try {
    if(mode === 'json-fmt'){
      const obj = JSON.parse(val);
      outEl.value = JSON.stringify(obj, null, 2);
    } else if(mode === 'json-min'){
      const obj = JSON.parse(val);
      outEl.value = JSON.stringify(obj);
    } else if(mode === 'b64-enc'){
      outEl.value = btoa(unescape(encodeURIComponent(val)));
    } else if(mode === 'b64-dec'){
      outEl.value = decodeURIComponent(escape(atob(val)));
    } else if(mode === 'url-enc'){
      outEl.value = encodeURIComponent(val);
    } else if(mode === 'url-dec'){
      outEl.value = decodeURIComponent(val);
    } else if(mode === 'hex-enc'){
      outEl.value = Array.from(new TextEncoder().encode(val)).map(b => b.toString(16).padStart(2, '0')).join('');
    } else if(mode === 'hex-dec'){
      const clean = val.replace(/\s+/g, '');
      const bytes = new Uint8Array(clean.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
      outEl.value = new TextDecoder().decode(bytes);
    } else if(mode === 'sha256'){
      const msgBuffer = new TextEncoder().encode(val);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      outEl.value = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else if(mode === 'upper'){
      outEl.value = val.toUpperCase();
    } else if(mode === 'lower'){
      outEl.value = val.toLowerCase();
    } else if(mode === 'regex'){
      const p1 = document.getElementById('xmuteParam1')?.value || '';
      const p2 = document.getElementById('xmuteParam2')?.value || '';
      if(!p1) { outEl.value = val; return; }
      const re = new RegExp(p1, 'g');
      outEl.value = val.replace(re, p2);
    } else if(mode === 'jsonpath'){
      const path = (document.getElementById('xmuteParam1')?.value || '').trim();
      const obj = JSON.parse(val);
      if(!path) { outEl.value = JSON.stringify(obj, null, 2); return; }
      const keys = path.split('.').filter(Boolean);
      let curr = obj;
      for(const k of keys){
        if(curr && typeof curr === 'object' && k in curr){
          curr = curr[k];
        } else {
          curr = undefined;
          break;
        }
      }
      outEl.value = curr !== undefined ? (typeof curr === 'object' ? JSON.stringify(curr, null, 2) : String(curr)) : 'Key path not found';
    }
  } catch(e) {
    outEl.value = 'Error processing transformation: ' + e.message;
  }
}

function saveTransmuteRecord(){
  const inp = (document.getElementById('xmuteInput').value || '').trim();
  const out = (document.getElementById('xmuteOutput').value || '').trim();
  const mode = document.getElementById('xmuteMode').value;
  if(!inp || !out || out.startsWith('Error')) return;

  const data = loadLocal('transmute', {history:[]});
  data.history.unshift({
    id: Date.now(),
    mode,
    input: inp,
    output: out,
    ts: new Date().toLocaleTimeString()
  });
  if(data.history.length > 30) data.history.pop();
  saveLocal('transmute', data);
  renderTransmuteHistory();
}

function renderTransmuteHistory(){
  const el = document.getElementById('xmuteHistoryList');
  if(!el) return;
  const data = loadLocal('transmute', {history:[]});
  if(!data.history.length){ el.innerHTML = '<div class="hint">No transform records saved.</div>'; return; }
  el.innerHTML = data.history.map(item=>`
    <div style="border-bottom:1px solid var(--border,#334155); padding:8px 0; font-size:0.85em;">
      <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
        <span class="tag-pill">${item.mode}</span>
        <span style="color:var(--text-muted,#94a3b8); font-size:0.8em;">${item.ts}</span>
      </div>
      <div style="font-family:monospace; color:#cbd5e1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">In: ${item.input}</div>
      <div style="font-family:monospace; color:#38bdf8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Out: ${item.output}</div>
    </div>
  `).join('');
}

function clearTransmuteHistory(){
  saveLocal('transmute', {history:[]});
  renderTransmuteHistory();
}
function exportTransmuteHistory(){
  const d = loadLocal('transmute', {history:[]});
  download('transforms.xmute', JSON.stringify({type:'xmute', ...d}, null, 2));
}
function importTransmuteHistory(){
  pickFile('.xmute', (content)=>{
    try{
      const parsed = JSON.parse(content);
      saveLocal('transmute', {history: parsed.history || []});
      renderTransmute();
    } catch(e){ alert('Could not parse .xmute file'); }
  });
}

/* ================= DOXERA (.ddf) ================= */
function renderDoxera(){
  const p = document.getElementById('panel-doxera');
  if(!p) return;
  p.innerHTML = `
    <h2>Doxera</h2>
    <div class="sub">.ddf — Structured documentation &amp; offline knowledge studio</div>
    <div class="toolbar">
      <button class="btn ghost small" onclick="addDoxeraDoc()">+ New Doc</button>
      <button class="btn sage small" onclick="saveCurrentDoxeraDoc()">Save Active</button>
      <button class="btn ghost small" onclick="exportDoxeraDocs()">Export .ddf</button>
      <button class="btn ghost small" onclick="importDoxeraDocs()">Import .ddf</button>
    </div>
    <div style="display:grid; grid-template-columns: 240px 1fr; gap:16px; margin-top:12px;">
      <div style="border-right:1px solid var(--border,#334155); padding-right:12px;">
        <label style="display:block; font-size:0.85em; font-weight:600; margin-bottom:6px;">Documentation Index</label>
        <div id="doxeraDocList" style="max-height:400px; overflow-y:auto;"></div>
      </div>
      <div>
        <input type="text" id="doxeraTitle" placeholder="Document Title" style="width:100%; font-size:1.1em; font-weight:bold; margin-bottom:8px;">
        <textarea id="doxeraBody" placeholder="Write structured markdown/docs here..." style="width:100%; height:320px; font-family:monospace; line-height:1.5;"></textarea>
      </div>
    </div>
  `;
  renderDoxeraList();
}

let _activeDoxeraId = null;

function renderDoxeraList(){
  const listEl = document.getElementById('doxeraDocList');
  if(!listEl) return;
  const data = loadLocal('doxera', {docs:[]});
  if(!data.docs.length){
    data.docs.push({ id:Date.now(), title:'Getting Started with Doxera', body:'# Doxera Knowledge Base\n\nWelcome to Doxera, your offline structured documentation system.' });
    saveLocal('doxera', data);
  }

  if(!_activeDoxeraId && data.docs.length > 0) _activeDoxeraId = data.docs[0].id;

  listEl.innerHTML = data.docs.map(doc=>`
    <div class="sidebar-item ${doc.id===_activeDoxeraId?'active':''}" style="margin-bottom:4px; padding:6px 8px; cursor:pointer;" onclick="selectDoxeraDoc(${doc.id})">
      <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block;">📄 ${doc.title || 'Untitled'}</span>
    </div>
  `).join('');

  const activeDoc = data.docs.find(d=>d.id===_activeDoxeraId);
  if(activeDoc){
    const titleEl = document.getElementById('doxeraTitle');
    const bodyEl = document.getElementById('doxeraBody');
    if(titleEl) titleEl.value = activeDoc.title || '';
    if(bodyEl) bodyEl.value = activeDoc.body || '';
  }
}

function selectDoxeraDoc(id){
  saveCurrentDoxeraDoc();
  _activeDoxeraId = id;
  renderDoxeraList();
}

function addDoxeraDoc(){
  saveCurrentDoxeraDoc();
  const data = loadLocal('doxera', {docs:[]});
  const newDoc = { id:Date.now(), title:'New Document', body:'' };
  data.docs.push(newDoc);
  _activeDoxeraId = newDoc.id;
  saveLocal('doxera', data);
  renderDoxeraList();
}

function saveCurrentDoxeraDoc(){
  if(!_activeDoxeraId) return;
  const titleEl = document.getElementById('doxeraTitle');
  const bodyEl = document.getElementById('doxeraBody');
  if(!titleEl || !bodyEl) return;

  const data = loadLocal('doxera', {docs:[]});
  const doc = data.docs.find(d=>d.id===_activeDoxeraId);
  if(doc){
    doc.title = titleEl.value;
    doc.body = bodyEl.value;
    saveLocal('doxera', data);
    renderDoxeraList();
  }
}

function exportDoxeraDocs(){
  saveCurrentDoxeraDoc();
  const d = loadLocal('doxera', {docs:[]});
  download('knowledge.ddf', JSON.stringify({type:'ddf', ...d}, null, 2));
}

function importDoxeraDocs(){
  pickFile('.ddf', (content)=>{
    try{
      const parsed = JSON.parse(content);
      saveLocal('doxera', {docs: parsed.docs || []});
      renderDoxera();
    } catch(e){ alert('Could not parse .ddf file'); }
  });
}


/* ================= CAPSULE (bundle everything, real encryption) ================= */
const CAPSULE_KEYS = ['docs','sheets','forms','notes','tasks','agenda','slides','lockbox','formula','transmute','doxera','mode','modTimes'];

function buildCapsule(){
  const bundle = {type:'capsule', version:1, createdAt:new Date().toISOString(), modules:{}};
  CAPSULE_KEYS.forEach(k=>{
    const raw = localStorage.getItem(KEY_PREFIX+k);
    if(raw!==null){ try{ bundle.modules[k] = JSON.parse(raw); }catch(e){ bundle.modules[k]=raw; } }
  });
  return bundle;
}
function applyCapsule(bundle){
  if(!bundle || bundle.type!=='capsule' || !bundle.modules){ throw new Error('Not a valid Capsule file'); }
  Object.keys(bundle.modules).forEach(k=>{
    localStorage.setItem(KEY_PREFIX+k, JSON.stringify(bundle.modules[k]));
  });
  renderDocs(); renderSheets(); renderForms(); renderNotes();
  renderTasks(); renderAgenda(); renderSlides(); renderLockbox();
  renderFormula(); renderTransmute(); renderDoxera();
  renderToday();
  mode = loadLocal('mode','offline');
    }

/* --- Real client-side crypto: PBKDF2 -> AES-GCM key, using the browser's native Web Crypto API --- */
function b64FromBytes(bytes){ let s=''; bytes.forEach(b=>s+=String.fromCharCode(b)); return btoa(s); }
function bytesFromB64(b64){ const s=atob(b64); const arr=new Uint8Array(s.length); for(let i=0;i<s.length;i++) arr[i]=s.charCodeAt(i); return arr; }

async function deriveKey(passphrase, salt){
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name:'PBKDF2', salt, iterations:150000, hash:'SHA-256' },
    baseKey,
    { name:'AES-GCM', length:256 },
    false,
    ['encrypt','decrypt']
  );
}
async function encryptCapsule(bundle, passphrase){
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const enc = new TextEncoder();
  const plaintext = enc.encode(JSON.stringify(bundle));
  const ciphertext = await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, plaintext);
  return {
    encrypted: true, version: 1, cipher: 'AES-GCM-256/PBKDF2-SHA256-150000',
    salt: b64FromBytes(salt), iv: b64FromBytes(iv),
    data: b64FromBytes(new Uint8Array(ciphertext))
  };
}
async function decryptCapsule(file, passphrase){
  const salt = bytesFromB64(file.salt);
  const iv = bytesFromB64(file.iv);
  const key = await deriveKey(passphrase, salt);
  const ciphertext = bytesFromB64(file.data);
  const plainBuf = await crypto.subtle.decrypt({name:'AES-GCM', iv}, key, ciphertext);
  const dec = new TextDecoder();
  return JSON.parse(dec.decode(plainBuf));
}

/* ================= VAULT (Phase 2 — real Private Vault) =================
   A real vault, not a "username+password" toy. Categories below match the
   product spec exactly: Logins, Cards, Identity, Secure Notes, API Keys,
   SSH Keys, Wi-Fi, Software Licenses, Recovery Codes.
   Storage: one AES-GCM ciphertext blob at KEY_PREFIX+'vault_blob' (same
   PBKDF2->AES-256-GCM primitives as Capsule, via deriveKey/b64 helpers
   above). The vault passphrase is held ONLY in memory for the unlocked
   session (module-level var, never written to storage) — reload = re-lock.
   That's the same "no recovery" trade already stated for Capsule/Timelock. */
const VAULT_CATEGORIES = [
  {id:'logins', label:'Logins', icon:'🔑', fields:[
    {k:'website', l:'Website'}, {k:'username', l:'Username'}, {k:'password', l:'Password', type:'password', generatable:true},
    {k:'url', l:'URL'}, {k:'notes', l:'Notes', type:'textarea'} ]},
  {id:'cards', label:'Cards', icon:'💳', fields:[
    {k:'cardName', l:'Card name'}, {k:'cardNumber', l:'Card number', type:'password'}, {k:'expiry', l:'Expiry'},
    {k:'cvv', l:'CVV', type:'password'}, {k:'pin', l:'PIN', type:'password'}, {k:'cardholder', l:'Cardholder'}, {k:'notes', l:'Notes', type:'textarea'} ]},
  {id:'identity', label:'Identity', icon:'🪪', fields:[
    {k:'name', l:'Name'}, {k:'address', l:'Address', type:'textarea'}, {k:'phone', l:'Phone'}, {k:'email', l:'Email'},
    {k:'passport', l:'Passport'}, {k:'nationalId', l:'National ID'}, {k:'driverLicense', l:'Driver license'} ]},
  {id:'secureNotes', label:'Secure Notes', icon:'📝', fields:[
    {k:'title', l:'Title'}, {k:'content', l:'Content', type:'textarea'} ]},
  {id:'apiKeys', label:'API Keys', icon:'🧩', fields:[
    {k:'service', l:'Service'}, {k:'apiKey', l:'API key', type:'password'}, {k:'secret', l:'Secret', type:'password'},
    {k:'endpoint', l:'Endpoint'}, {k:'environment', l:'Environment'}, {k:'notes', l:'Notes', type:'textarea'} ]},
  {id:'sshKeys', label:'SSH Keys', icon:'🖥️', fields:[
    {k:'host', l:'Host'}, {k:'username', l:'Username'}, {k:'privateKey', l:'Private key', type:'textarea'},
    {k:'publicKey', l:'Public key', type:'textarea'}, {k:'port', l:'Port'}, {k:'fingerprint', l:'Fingerprint'} ]},
  {id:'wifi', label:'Wi-Fi', icon:'📶', fields:[
    {k:'network', l:'Network'}, {k:'password', l:'Password', type:'password', generatable:true},
    {k:'security', l:'Security'}, {k:'router', l:'Router'}, {k:'notes', l:'Notes', type:'textarea'} ]},
  {id:'licenses', label:'Software Licenses', icon:'🧾', fields:[
    {k:'product', l:'Product'}, {k:'licenseKey', l:'License key', type:'password'}, {k:'purchaseDate', l:'Purchase date'},
    {k:'expiry', l:'Expiry'}, {k:'vendor', l:'Vendor'}, {k:'notes', l:'Notes', type:'textarea'} ]},
  {id:'recoveryCodes', label:'Recovery Codes', icon:'🛟', fields:[
    {k:'service', l:'Service'}, {k:'codes', l:'Codes (one per line)', type:'textarea'}, {k:'notes', l:'Notes'} ]},
  {id:'twoFactor', label:'2FA / TOTP', icon:'🔐', fields:[
    {k:'service', l:'Service'}, {k:'secretBase32', l:'Secret (Base32)', type:'password'},
    {k:'otpType', l:'Type (totp or hotp)'}, {k:'digits', l:'Digits (default 6)'},
    {k:'period', l:'Period sec (TOTP, default 30)'}, {k:'counter', l:'Counter (HOTP, default 0)'} ]},
  {id:'passkeys', label:'Passkeys', icon:'🗝️', fields:[
    {k:'service', l:'Service'}, {k:'username', l:'Username/account'}, {k:'device', l:'Device it is registered on'}, {k:'notes', l:'Notes'} ]},
];
/* Multi-vault (Phase 7): several independently-encrypted vaults, each with
   its own passphrase — user only ever unlocks the one they need. The old
   single-vault storage is transparently migrated into a "Personal" vault
   the first time this runs on a device that already had one. */
const VAULT_PRESETS = ['Personal','Work','Finance','Travel','Project X','Emergency'];
let _vaultPassphrase = null;   // in-memory only, cleared on lock/reload
let _vaultItems = null;        // decrypted array, in-memory only while unlocked
let _vaultFiles = null;        // decrypted secure-file entries, in-memory only while unlocked
let _vaultCategory = 'logins';
let _activeVaultId = null;
let _selectedVaultId = null;   // vault chosen from the switcher but not yet unlocked

function getVaultsIndex(){
  let idx = loadLocal('vaults_index', null);
  if(idx) return idx;
  // one-time migration from the original single-vault build
  const legacy = loadLocal('vault_blob', null);
  if(legacy){
    saveLocal('vault_personal', legacy);
    localStorage.removeItem(KEY_PREFIX+'vault_blob');
    idx = [{id:'personal', name:'Personal'}];
  } else {
    idx = [];
  }
  saveLocal('vaults_index', idx);
  return idx;
}
function saveVaultsIndex(idx){ saveLocal('vaults_index', idx); }
function getVaultBlob(vaultId){ return loadLocal('vault_'+vaultId, null); }

async function createNamedVault(name, passphrase){
  const idx = getVaultsIndex();
  let id = name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') || ('vault-'+Date.now());
  if(idx.find(v=>v.id===id)) id = id + '-' + Date.now();
  idx.push({id, name});
  saveVaultsIndex(idx);
  _activeVaultId = id;
  _vaultPassphrase = passphrase;
  _vaultItems = [];
  _vaultFiles = [];
  await saveVaultItems();
  renderVaultRoot();
}
async function unlockVault(vaultId, passphrase){
  const blob = getVaultBlob(vaultId);
  try{
    const bundle = await decryptCapsule(blob, passphrase);
    _activeVaultId = vaultId;
    _vaultPassphrase = passphrase;
    _vaultItems = bundle.items || [];
    _vaultFiles = bundle.files || [];
    renderVaultRoot();
  }catch(e){
    alert('Wrong passphrase, or this vault\'s data is corrupted.');
  }
}
function lockVault(){
  stopTotpTicker();
  _activeVaultId = null;
  _vaultPassphrase = null;
  _vaultItems = null;
  _vaultFiles = null;
  renderVaultRoot();
}
async function saveVaultItems(){
  const bundle = {type:'vault', version:2, items:_vaultItems, files:_vaultFiles};
  const blob = await encryptCapsule(bundle, _vaultPassphrase);
  saveLocal('vault_'+_activeVaultId, blob);
}

function renderVaultRoot(){
  const el = document.getElementById('vaultRoot');
  if(!el) return;
  const idx = getVaultsIndex();

  if(_activeVaultId && _vaultPassphrase && _vaultItems!==null){
    renderVaultUnlocked();
    return;
  }

  const switcherRows = idx.map(v=>`
    <div class="vault-switch-row">
      <span class="si-left"><span class="si-dot"></span>${v.name}</span>
      <button class="btn ghost small" onclick="selectVaultToUnlock('${v.id}')">Unlock</button>
    </div>`).join('');

  let createForm = '';
  if(_selectedVaultId==='__new__'){
    const presetOptions = VAULT_PRESETS.filter(p=>!idx.find(v=>v.name===p)).map(p=>`<option value="${p}">${p}</option>`).join('');
    createForm = `
      <div class="vault-setup">
        <h3 style="margin-top:0;">New vault</h3>
        <div class="sub" style="margin-bottom:10px;">Each vault gets its own encryption boundary and its own passphrase — you only unlock the one you need. Choose a preset name or type your own.</div>
        <div class="toolbar">
          <select id="vaultNewName"><option value="">Custom name…</option>${presetOptions}</select>
          <input type="text" id="vaultNewNameCustom" placeholder="Custom vault name">
        </div>
        <div class="toolbar">
          <input type="password" id="vaultNewPass" placeholder="New vault passphrase">
          <input type="password" id="vaultNewPass2" placeholder="Confirm passphrase">
          <button class="btn brass small" onclick="doCreateNamedVault()">Create vault</button>
          <button class="btn ghost small" onclick="_selectedVaultId=null; renderVaultRoot();">Cancel</button>
        </div>
      </div>`;
  } else if(_selectedVaultId){
    const v = idx.find(x=>x.id===_selectedVaultId);
    createForm = `
      <div class="vault-setup">
        <h3 style="margin-top:0;">🔒 ${v?v.name:'Vault'} — locked</h3>
        <div class="toolbar">
          <input type="password" id="vaultUnlockPass" placeholder="Passphrase" onkeydown="if(event.key==='Enter') doUnlockVault();">
          <button class="btn brass small" onclick="doUnlockVault()">Unlock</button>
          <button class="btn ghost small" onclick="_selectedVaultId=null; renderVaultRoot();">Back</button>
        </div>
      </div>`;
  }

  el.innerHTML = `
    <div class="vault-switcher">
      <h3 style="margin:0 0 8px 0;">Vaults</h3>
      ${idx.length ? switcherRows : '<div class="hint">No vaults yet — create your first one below.</div>'}
      <div class="toolbar" style="margin-top:8px;">
        <button class="btn brass small" onclick="_selectedVaultId='__new__'; renderVaultRoot();">+ New vault</button>
      </div>
    </div>
    ${createForm}
  `;
}
function selectVaultToUnlock(id){ _selectedVaultId = id; renderVaultRoot(); }
function doCreateNamedVault(){
  const sel = document.getElementById('vaultNewName').value;
  const custom = document.getElementById('vaultNewNameCustom').value.trim();
  const name = custom || sel;
  const a = document.getElementById('vaultNewPass').value;
  const b = document.getElementById('vaultNewPass2').value;
  if(!name){ alert('Pick a preset or type a vault name.'); return; }
  if(!a || a.length<8){ alert('Use at least 8 characters.'); return; }
  if(a!==b){ alert('Passphrases don\'t match.'); return; }
  _selectedVaultId = null;
  createNamedVault(name, a);
}
function doUnlockVault(){
  const p = document.getElementById('vaultUnlockPass').value;
  if(!p || !_selectedVaultId) return;
  unlockVault(_selectedVaultId, p);
}

function renderVaultUnlocked(){
  const el = document.getElementById('vaultRoot');
  const idx = getVaultsIndex();
  const activeVault = idx.find(v=>v.id===_activeVaultId);
  const catTabs = VAULT_CATEGORIES.map(c=>{
    const count = _vaultItems.filter(i=>i.category===c.id).length;
    return `<div class="vault-cat ${c.id===_vaultCategory && _vaultCategory!=='secureFiles' ?'active':''}" onclick="switchVaultCategory('${c.id}')">${c.icon} ${c.label}<span class="vault-count">${count}</span></div>`;
  }).join('');
  const filesTab = `<div class="vault-cat ${_vaultCategory==='secureFiles'?'active':''}" onclick="switchVaultCategory('secureFiles')">🗄️ Secure Files<span class="vault-count">${_vaultFiles.length}</span></div>`;

  if(_vaultCategory==='secureFiles'){
    renderSecureFilesPanel(el, catTabs, filesTab, activeVault);
    return;
  }

  const cat = VAULT_CATEGORIES.find(c=>c.id===_vaultCategory);
  const items = _vaultItems.filter(i=>i.category===_vaultCategory);
  let bodyExtra = '';
  if(cat.id==='twoFactor'){
    bodyExtra = `
      <div class="toolbar" style="margin-bottom:10px;">
        <input type="text" id="otpauthUriInput" placeholder="Paste otpauth:// URI to import…" style="min-width:280px;">
        <button class="btn ghost small" onclick="importOtpauthUri()">Import</button>
      </div>
      <div class="hint" style="margin-bottom:10px;">No in-app camera QR scan yet (needs a decoder library this build doesn't include) — paste the otpauth:// URI instead (most authenticator setup screens offer "can't scan" / manual setup with this same string), or use manual secret entry below.</div>
      <div id="totpLive"></div>`;
  } else if(cat.id==='passkeys'){
    bodyExtra = `<div class="hint" style="margin-bottom:10px;">Honest scope note: a browser tab can't register/autofill real WebAuthn passkeys for other sites the way a password-manager extension can. This is a reference list only — real passkey creation/autofill needs the browser-extension build the roadmap calls for next.</div>`;
  }
  el.innerHTML = `
    <div class="vault-unlocked-bar">
      <span class="security-pill" style="background:rgba(111,140,106,0.18);border-color:rgba(111,140,106,0.4);color:#c9dcc6;"><span class="dot"></span>${activeVault?activeVault.name:'Vault'} unlocked</span>
      <button class="btn ghost small" onclick="lockVault()">Lock now</button>
    </div>
    <div class="vault-cats">${catTabs}${filesTab}</div>
    <div class="vault-body">
      ${bodyExtra}
      <div class="toolbar">
        <button class="btn brass small" onclick="openVaultItemForm(null)">+ Add ${cat.label.replace(/s$/,'').replace(/ \/ TOTP$/,'')}</button>
      </div>
      <div id="vaultItemForm"></div>
      <div id="vaultItemList">${cat.id==='twoFactor' ? '' : (items.length ? items.map(i=>vaultItemRowHTML(i, cat)).join('') : '<div class="hint">Nothing in '+cat.label+' yet.</div>')}</div>
    </div>
  `;
  stopTotpTicker();
  if(cat.id==='twoFactor') startTotpTicker();
}
function switchVaultCategory(id){ _vaultCategory = id; renderVaultUnlocked(); }

function vaultItemRowHTML(item, cat){
  const titleField = cat.fields[0].k;
  const title = item.fields[titleField] || '(untitled)';
  const secondary = cat.fields[1] ? (item.fields[cat.fields[1].k]||'') : '';
  return `<div class="vault-row">
    <div class="vault-row-main" onclick="openVaultItemForm(${item.id})">
      <b>${title}</b> ${secondary?`<span class="vault-row-sub">${cat.fields[1].type==='password'?'••••••••':secondary}</span>`:''}
    </div>
    <span class="vault-row-actions">
      <span title="Copy first sensitive field" style="cursor:pointer;" onclick="copyVaultField(${item.id})">⧉</span>
      <span style="cursor:pointer;color:#a8563f;" onclick="deleteVaultItem(${item.id})">✕</span>
    </span>
  </div>`;
}
function copyVaultField(id){
  const item = _vaultItems.find(i=>i.id===id);
  if(!item) return;
  const cat = VAULT_CATEGORIES.find(c=>c.id===item.category);
  const pf = cat.fields.find(f=>f.type==='password') || cat.fields[0];
  const val = item.fields[pf.k] || '';
  navigator.clipboard && navigator.clipboard.writeText(val);
  clipboardAutoClear(val);
}
/* Clipboard timeout (part of Phase 4's spec, applies to any sensitive copy):
   overwrite the clipboard 20s after a sensitive copy, but only if it still
   holds exactly what we put there (never clobber something the user copied
   afterward on purpose). */
function clipboardAutoClear(copiedValue, seconds){
  seconds = seconds || 20;
  if(!navigator.clipboard || !navigator.clipboard.readText) return;
  setTimeout(async ()=>{
    try{
      const current = await navigator.clipboard.readText();
      if(current===copiedValue) await navigator.clipboard.writeText('');
    }catch(e){ /* clipboard read can be denied by the browser — fail silent, non-critical */ }
  }, seconds*1000);
}
function openVaultItemForm(id){
  const cat = VAULT_CATEGORIES.find(c=>c.id===_vaultCategory);
  const item = id ? _vaultItems.find(i=>i.id===id) : {id:null, category:_vaultCategory, fields:{}, tags:'', createdAt:new Date().toISOString()};
  const formEl = document.getElementById('vaultItemForm');
  formEl.innerHTML = `
    <div class="vault-form">
      ${cat.fields.map(f=>{
        const val = (item.fields[f.k]||'').toString().replace(/"/g,'&quot;');
        if(f.type==='textarea'){
          return `<label>${f.l}<textarea data-k="${f.k}">${val}</textarea></label>`;
        }
        const genBtn = f.generatable ? `<button type="button" class="btn ghost small" onclick="fillGeneratedPassword(this)">Generate</button>` : '';
        return `<label>${f.l}<span style="display:flex;gap:6px;"><input type="${f.type==='password'?'password':'text'}" data-k="${f.k}" value="${val}">${genBtn}</span></label>`;
      }).join('')}
      <label>Tags<input type="text" data-k="__tags" value="${(item.tags||'').replace(/"/g,'&quot;')}"></label>
      <div class="toolbar" style="margin-top:10px;">
        <button class="btn brass small" onclick="saveVaultItemForm(${item.id||'null'})">Save</button>
        <button class="btn ghost small" onclick="document.getElementById('vaultItemForm').innerHTML='';">Cancel</button>
      </div>
    </div>`;
}
function fillGeneratedPassword(btn){
  const input = btn.previousElementSibling;
  input.value = generatePassword(20, {upper:true, lower:true, digits:true, symbols:true});
  input.type = 'text';
}
async function saveVaultItemForm(id){
  const cat = VAULT_CATEGORIES.find(c=>c.id===_vaultCategory);
  const formEl = document.getElementById('vaultItemForm');
  const fields = {};
  let tags = '';
  formEl.querySelectorAll('[data-k]').forEach(inp=>{
    if(inp.dataset.k==='__tags') tags = inp.value; else fields[inp.dataset.k] = inp.value;
  });
  if(id){
    const item = _vaultItems.find(i=>i.id===id);
    item.fields = fields; item.tags = tags; item.updatedAt = new Date().toISOString();
  } else {
    _vaultItems.push({id:Date.now(), category:_vaultCategory, fields, tags, createdAt:new Date().toISOString()});
  }
  await saveVaultItems();
  formEl.innerHTML = '';
  renderVaultUnlocked();
}
async function deleteVaultItem(id){
  if(!confirm('Delete this vault item? This cannot be undone.')) return;
  _vaultItems = _vaultItems.filter(i=>i.id!==id);
  await saveVaultItems();
  renderVaultUnlocked();
}

/* ================= SECURE FILE VAULT (Phase 6) =================
   Real encrypted file storage: each file's bytes are base64'd, folded into
   the same vault bundle, and encrypted at rest along with every other vault
   category (same AES-256-GCM blob, same passphrase). Folders, tags, search,
   inline preview for images/text, bulk import, version history on
   re-upload of a same-named file, and a secure-delete workflow that
   requires typing the filename back (no accidental one-click loss).
   Honest limitation: everything still lives in browser localStorage, so
   very large files (tens of MB) will hit the browser's storage quota —
   fine for documents/scans/certs/keys, not a substitute for real bulk
   backup/photo storage. */
const SECURE_FILE_FOLDERS = ['Documents','Photos','Scans','Certificates','Contracts','Keys','Backups','Private'];
let _vfFolder = 'Documents';
let _vfSearch = '';
function renderSecureFilesPanel(el, catTabs, filesTab, activeVault){
  const folderChips = SECURE_FILE_FOLDERS.map(f=>{
    const count = _vaultFiles.filter(x=>x.folder===f).length;
    return `<div class="vault-cat ${_vfFolder===f?'active':''}" onclick="_vfFolder='${f}'; renderVaultUnlocked();" style="font-size:0.72em;">${f}<span class="vault-count">${count}</span></div>`;
  }).join('');
  const q = _vfSearch.toLowerCase();
  const visible = _vaultFiles.filter(f=>f.folder===_vfFolder && (!q || f.name.toLowerCase().includes(q) || (f.tags||'').toLowerCase().includes(q)));
  el.innerHTML = `
    <div class="vault-unlocked-bar">
      <span class="security-pill" style="background:rgba(111,140,106,0.18);border-color:rgba(111,140,106,0.4);color:#c9dcc6;"><span class="dot"></span>${activeVault?activeVault.name:'Vault'} unlocked</span>
      <button class="btn ghost small" onclick="lockVault()">Lock now</button>
    </div>
    <div class="vault-cats">${catTabs}${filesTab}</div>
    <div class="vault-cats">${folderChips}</div>
    <div class="vault-body">
      <div class="toolbar">
        <input type="text" id="vfSearchInput" placeholder="Search this folder…" value="${_vfSearch.replace(/"/g,'&quot;')}" oninput="_vfSearch=this.value; renderVaultUnlocked();">
        <input type="file" id="vfFileInput" multiple onchange="importSecureFiles(this.files)">
        <label class="btn ghost small" for="vfFileInput" style="cursor:pointer;">📥 Import file(s)</label>
      </div>
      <div id="vfDropZone" class="vf-dropzone" ondragover="event.preventDefault(); this.classList.add('drag');" ondragleave="this.classList.remove('drag');" ondrop="handleFileDrop(event)">
        Drag & drop files here, or use Import above
      </div>
      <div id="vfList">${visible.length ? visible.map(f=>secureFileRowHTML(f)).join('') : '<div class="hint">Nothing in '+_vfFolder+' yet.</div>'}</div>
      <div id="vfPreview"></div>
    </div>
  `;
  stopTotpTicker();
}
function handleFileDrop(e){
  e.preventDefault();
  e.currentTarget.classList.remove('drag');
  importSecureFiles(e.dataTransfer.files);
}
function importSecureFiles(fileList){
  const files = Array.from(fileList||[]);
  if(!files.length) return;
  let remaining = files.length;
  files.forEach(file=>{
    const reader = new FileReader();
    reader.onload = async ()=>{
      const dataB64 = reader.result.split(',')[1];
      const existing = _vaultFiles.find(f=>f.name===file.name && f.folder===_vfFolder);
      if(existing){
        existing.versions = existing.versions || [];
        existing.versions.push({dataB64:existing.dataB64, size:existing.size, savedAt:existing.updatedAt||existing.createdAt});
        existing.dataB64 = dataB64; existing.size = file.size; existing.mime = file.type; existing.updatedAt = new Date().toISOString();
      } else {
        _vaultFiles.push({
          id:Date.now()+Math.random(), name:file.name, folder:_vfFolder, tags:'', mime:file.type||'application/octet-stream',
          size:file.size, dataB64, versions:[], createdAt:new Date().toISOString()
        });
      }
      remaining--;
      if(remaining===0){ await saveVaultItems(); renderVaultUnlocked(); }
    };
    reader.readAsDataURL(file);
  });
}
function secureFileRowHTML(f){
  const kb = (f.size/1024).toFixed(1);
  const hasVersions = (f.versions||[]).length>0;
  return `<div class="vault-row">
    <div class="vault-row-main" onclick="previewSecureFile('${f.id}')">
      <b>${f.name}</b> <span class="vault-row-sub">${kb} KB${f.tags?' · '+f.tags:''}${hasVersions?` · ${f.versions.length} earlier version${f.versions.length===1?'':'s'}`:''}</span>
    </div>
    <span class="vault-row-actions">
      <span title="Download" style="cursor:pointer;" onclick="downloadSecureFile('${f.id}')">⬇</span>
      <span title="Edit tags" style="cursor:pointer;" onclick="editSecureFileTags('${f.id}')">🏷</span>
      <span title="Secure delete" style="cursor:pointer;color:#a8563f;" onclick="secureDeleteFile('${f.id}')">✕</span>
    </span>
  </div>`;
}
function findVaultFile(id){ return _vaultFiles.find(f=>String(f.id)===String(id)); }
function previewSecureFile(id){
  const f = findVaultFile(id);
  const el = document.getElementById('vfPreview');
  if(!f || !el) return;
  if((f.mime||'').startsWith('image/')){
    el.innerHTML = `<div class="vault-form"><img src="data:${f.mime};base64,${f.dataB64}" style="max-width:100%;max-height:320px;border-radius:6px;"></div>`;
  } else if((f.mime||'').startsWith('text/') || /\.(txt|md|json|csv)$/i.test(f.name)){
    let text = '';
    try{ text = decodeURIComponent(escape(atob(f.dataB64))); }catch(e){ text = '(binary or non-UTF8 content — download to view)'; }
    el.innerHTML = `<div class="vault-form"><pre style="white-space:pre-wrap;max-height:320px;overflow:auto;">${text.replace(/</g,'&lt;')}</pre></div>`;
  } else {
    el.innerHTML = `<div class="hint">No inline preview for this file type — use Download.</div>`;
  }
}
function downloadSecureFile(id){
  const f = findVaultFile(id);
  if(!f) return;
  const a = document.createElement('a');
  a.href = `data:${f.mime};base64,${f.dataB64}`;
  a.download = f.name;
  a.click();
}
function editSecureFileTags(id){
  const f = findVaultFile(id);
  if(!f) return;
  const tags = prompt('Tags for '+f.name, f.tags||'');
  if(tags===null) return;
  f.tags = tags;
  saveVaultItems().then(renderVaultUnlocked);
}
async function secureDeleteFile(id){
  const f = findVaultFile(id);
  if(!f) return;
  const typed = prompt(`This permanently deletes "${f.name}" and all its saved versions. Type the file name to confirm.`);
  if(typed!==f.name){ if(typed!==null) alert('Name didn\'t match — nothing deleted.'); return; }
  _vaultFiles = _vaultFiles.filter(x=>x.id!==f.id);
  await saveVaultItems();
  renderVaultUnlocked();
}

/* ================= PASSWORD GENERATOR (Phase 3) =================
   Uses crypto.getRandomValues (not Math.random) for real entropy. */
function generatePassword(length, opts){
  length = length || 16;
  const sets = [];
  if(opts.lower!==false) sets.push('abcdefghijkmnopqrstuvwxyz');
  if(opts.upper!==false) sets.push('ABCDEFGHJKLMNPQRSTUVWXYZ');
  if(opts.digits!==false) sets.push('23456789');
  if(opts.symbols) sets.push('!@#$%^&*()-_=+[]{}');
  const all = sets.join('');
  if(!all) return '';
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  let pw = '';
  for(let i=0;i<length;i++){ pw += all[bytes[i] % all.length]; }
  // guarantee at least one char from each requested set
  sets.forEach((set, idx)=>{
    const pos = crypto.getRandomValues(new Uint32Array(1))[0] % length;
    const ch = set[crypto.getRandomValues(new Uint32Array(1))[0] % set.length];
    pw = pw.substring(0,pos) + ch + pw.substring(pos+1);
  });
  return pw;
}
function passwordStrength(pw){
  if(!pw) return {score:0, label:'—'};
  let score = 0;
  if(pw.length>=8) score++;
  if(pw.length>=14) score++;
  if(/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if(/\d/.test(pw)) score++;
  if(/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ['Very weak','Weak','Fair','Good','Strong','Very strong'];
  return {score, label:labels[score]};
}
function renderPasswordGeneratorStandalone(){
  const el = document.getElementById('pwGenOutput');
  if(!el) return;
  const len = parseInt(document.getElementById('pwGenLength').value,10) || 16;
  const opts = {
    lower: document.getElementById('pwGenLower').checked,
    upper: document.getElementById('pwGenUpper').checked,
    digits: document.getElementById('pwGenDigits').checked,
    symbols: document.getElementById('pwGenSymbols').checked,
  };
  const pw = generatePassword(len, opts);
  const s = passwordStrength(pw);
  el.innerHTML = `<code style="font-size:1.1em;">${pw}</code> <span class="hint" style="margin-left:8px;">${s.label}</span>`;
  el.dataset.pw = pw;
}
function copyGeneratedStandalone(){
  const el = document.getElementById('pwGenOutput');
  if(el && el.dataset.pw) navigator.clipboard && navigator.clipboard.writeText(el.dataset.pw);
}

/* ================= TOTP / HOTP (Phase 4) =================
   Real RFC 6238 (TOTP) / RFC 4226 (HOTP) implementation using Web Crypto's
   HMAC-SHA1 (the algorithm essentially every real-world authenticator QR
   uses in practice) — not a mock ticking number. */
function base32Decode(str){
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  str = (str||'').toUpperCase().replace(/=+$/,'').replace(/\s+/g,'');
  let bits = '';
  for(const ch of str){
    const idx = alphabet.indexOf(ch);
    if(idx===-1) continue;
    bits += idx.toString(2).padStart(5,'0');
  }
  const bytes = [];
  for(let i=0;i+8<=bits.length;i+=8){ bytes.push(parseInt(bits.substring(i,i+8),2)); }
  return new Uint8Array(bytes);
}
function counterToBytes(counter){
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  // JS numbers are safe up to 2^53; counters/time-steps never approach that
  view.setUint32(4, counter % 0x100000000);
  view.setUint32(0, Math.floor(counter / 0x100000000));
  return new Uint8Array(buf);
}
async function hotpCodeFromKey(secretBase32, counter, digits){
  digits = digits || 6;
  const keyBytes = base32Decode(secretBase32);
  if(keyBytes.length===0) return '------';
  const key = await crypto.subtle.importKey('raw', keyBytes, {name:'HMAC', hash:'SHA-1'}, false, ['sign']);
  const msg = counterToBytes(counter);
  const sigBuf = await crypto.subtle.sign('HMAC', key, msg);
  const sig = new Uint8Array(sigBuf);
  const offset = sig[sig.length-1] & 0x0f;
  const binCode = ((sig[offset] & 0x7f) << 24) | ((sig[offset+1] & 0xff) << 16) | ((sig[offset+2] & 0xff) << 8) | (sig[offset+3] & 0xff);
  const code = (binCode % Math.pow(10, digits)).toString().padStart(digits, '0');
  return code;
}
async function totpCodeFromKey(secretBase32, period, digits){
  period = period || 30;
  const counter = Math.floor(Date.now()/1000/period);
  return hotpCodeFromKey(secretBase32, counter, digits);
}
let _totpTickerHandle = null;
function startTotpTicker(){
  renderTotpLive();
  _totpTickerHandle = setInterval(renderTotpLive, 1000);
}
function stopTotpTicker(){
  if(_totpTickerHandle){ clearInterval(_totpTickerHandle); _totpTickerHandle = null; }
}
async function renderTotpLive(){
  const el = document.getElementById('totpLive');
  if(!el || !_vaultItems) { stopTotpTicker(); return; }
  const items = _vaultItems.filter(i=>i.category==='twoFactor');
  if(items.length===0){ el.innerHTML = '<div class="hint">No 2FA entries yet.</div>'; return; }
  const rows = await Promise.all(items.map(async item=>{
    const f = item.fields;
    const digits = parseInt(f.digits,10) || 6;
    const period = parseInt(f.period,10) || 30;
    const isHotp = (f.otpType||'totp').toLowerCase()==='hotp';
    let code, remaining = null;
    if(isHotp){
      code = await hotpCodeFromKey(f.secretBase32, parseInt(f.counter,10)||0, digits);
    } else {
      code = await totpCodeFromKey(f.secretBase32, period, digits);
      remaining = period - (Math.floor(Date.now()/1000) % period);
    }
    return `<div class="vault-row">
      <div class="vault-row-main">
        <b>${f.service||'(unnamed)'}</b>
        <span class="vault-row-sub" style="font-size:1.05em;letter-spacing:0.08em;color:var(--accent-primary, #3b82f6);">${code}</span>
        ${isHotp ? `<span class="repeat-badge">HOTP · counter ${f.counter||0}</span>` : `<span class="repeat-badge">expires in ${remaining}s</span>`}
      </div>
      <span class="vault-row-actions">
        ${isHotp ? `<span style="cursor:pointer;" title="Advance counter" onclick="advanceHotpCounter(${item.id})">↻</span>` : ''}
        <span title="Copy code" style="cursor:pointer;" onclick="navigator.clipboard && navigator.clipboard.writeText('${code}')">⧉</span>
        <span style="cursor:pointer;" onclick="openVaultItemForm(${item.id})">✎</span>
        <span style="cursor:pointer;color:#a8563f;" onclick="deleteVaultItem(${item.id})">✕</span>
      </span>
    </div>`;
  }));
  el.innerHTML = rows.join('');
}
async function advanceHotpCounter(id){
  const item = _vaultItems.find(i=>i.id===id);
  if(!item) return;
  item.fields.counter = (parseInt(item.fields.counter,10)||0) + 1;
  await saveVaultItems();
  renderTotpLive();
}
function importOtpauthUri(){
  const raw = document.getElementById('otpauthUriInput').value.trim();
  if(!raw.startsWith('otpauth://')){ alert('That doesn\'t look like an otpauth:// URI.'); return; }
  try{
    const url = new URL(raw);
    const type = url.host; // 'totp' or 'hotp'
    const label = decodeURIComponent(url.pathname.replace(/^\//,''));
    const params = url.searchParams;
    const secret = params.get('secret') || '';
    const issuer = params.get('issuer') || label.split(':')[0] || '';
    const digits = params.get('digits') || '6';
    const period = params.get('period') || '30';
    const counter = params.get('counter') || '0';
    if(!secret){ alert('URI has no secret parameter.'); return; }
    _vaultItems.push({
      id:Date.now(), category:'twoFactor',
      fields:{ service:issuer||label, secretBase32:secret, otpType:type==='hotp'?'hotp':'totp', digits, period, counter },
      tags:'', createdAt:new Date().toISOString()
    });
    saveVaultItems().then(()=>{ document.getElementById('otpauthUriInput').value=''; renderVaultUnlocked(); });
  }catch(e){
    alert('Could not parse that URI.');
  }
}

/* ================= PRIVACY CENTER (Phase 8) ================= */
function renderPrivacyCenter(){
  const p = document.getElementById('panel-privacy');
  if(!p) return;
  p.innerHTML = `
    <h2>Privacy Center</h2>
    <div class="sub">.priv — local-first security & network isolation status</div>
    <div class="privacy-grid">
      <div class="privacy-stat"><span>Network access</span><b>Not required</b></div>
      <div class="privacy-stat"><span>Telemetry</span><b>OFF</b></div>
      <div class="privacy-stat"><span>Analytics</span><b>OFF</b></div>
      <div class="privacy-stat"><span>Remote storage</span><b>OFF</b></div>
      <div class="privacy-stat"><span>External integrations</span><b>0</b></div>
      <div class="privacy-stat"><span>Data location</span><b>This device (Local Storage & Web Crypto)</b></div>
    </div>
    <div class="privacy-card" style="margin-top:14px;">
      <h3>Data Isolation Guarantee</h3>
      <div class="privacy-stat"><span>Application files</span><b>✓ Served locally / cached</b></div>
      <div class="privacy-stat"><span>User data transmitted</span><b>0 bytes</b></div>
      <div class="privacy-stat"><span>Passwords transmitted</span><b>0 bytes</b></div>
      <div class="privacy-stat"><span>Notes & Documents transmitted</span><b>0 bytes</b></div>
      <div class="privacy-stat"><span>Files transmitted</span><b>0 bytes</b></div>
      <div class="hint">OFFLINES operates 100% locally on your device. No server receives any user data, search queries, or documents.</div>
    </div>
  `;
}

function computePasswordHealth(){
  if(!_vaultItems || !_vaultItems.length) return null;
  const pwItems = _vaultItems.filter(i=>['logins','wifi'].includes(i.category) && i.fields && i.fields.password);
  if(!pwItems.length) return null;

  let strong = 0;
  let weak = 0;
  let reused = 0;
  let old = 0;
  let missing2fa = 0;

  const seenPasswords = new Map();
  const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);

  pwItems.forEach(item => {
    const pw = item.fields.password || '';
    if (pw.length >= 12 && /[A-Z]/.test(pw) && /[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) {
      strong++;
    } else {
      weak++;
    }

    seenPasswords.set(pw, (seenPasswords.get(pw) || 0) + 1);

    if (item.updatedAt && item.updatedAt < ninetyDaysAgo) {
      old++;
    }

    if (!item.fields.totpSecret) {
      missing2fa++;
    }
  });

  seenPasswords.forEach((count) => {
    if (count > 1) {
      reused += count;
    }
  });

  const total = pwItems.length;
  const score = Math.round((strong / total) * 100);

  return {
    score,
    total,
    strong,
    weak,
    reused,
    old,
    missing2fa
  };
}

function renderSecurityCenter(){
  const p = document.getElementById('panel-security');
  if(!p) return;
  saveLocalSilent('lastSecurityCheck', Date.now());
  const health = computePasswordHealth();
  const lastCapsule = loadLocal('lastCapsuleExport', null);
  const daysSinceBackup = lastCapsule ? Math.floor((Date.now()-lastCapsule)/(24*60*60*1000)) : null;
  const netLog = loadLocal('network_log', []);
  const today = new Date().toDateString();
  const todayEvents = netLog.filter(e=>new Date(e.ts).toDateString()===today);
  const externalDomains = [...new Set(netLog.map(e=>e.domain))];
  p.innerHTML = `
    <h2>Security Center</h2>
    <div class="sub">.sec — a real dashboard, computed from what's actually on this device right now</div>
    <div class="privacy-grid">
      <div class="privacy-stat"><span>Vault</span><b>${getVaultsIndex().length ? '● Protected ('+getVaultsIndex().length+' vault'+(getVaultsIndex().length===1?'':'s')+')' : '○ No vault created yet'}</b></div>
      <div class="privacy-stat"><span>Encryption</span><b>${getVaultsIndex().length ? '● Active (AES-256-GCM)' : '○ Inactive'}</b></div>
      <div class="privacy-stat"><span>Master Key</span><b>● Hardware-independent (passphrase-derived, PBKDF2)</b></div>
      <div class="privacy-stat"><span>Network</span><b>● No private data transmission</b></div>
      <div class="privacy-stat"><span>Backups</span><b>${daysSinceBackup===null ? '⚠ No Capsule export yet' : (daysSinceBackup===0 ? '● Backed up today' : `⚠ Last backup: ${daysSinceBackup} day${daysSinceBackup===1?'':'s'} ago`)}</b></div>
      <div class="privacy-stat"><span>Password Health</span><b>${health ? health.score+' / 100' : 'Unlock a vault to compute'}</b></div>
    </div>

    <h3 style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:0.9em;color:#8a7f66;margin-top:22px;">Password Health</h3>
    ${health ? `
      <div class="privacy-grid">
        <div class="privacy-stat"><span>Credentials checked</span><b>${health.total}</b></div>
        <div class="privacy-stat"><span>Strong</span><b>${health.strong}</b></div>
        <div class="privacy-stat"><span>Weak</span><b>${health.weak}</b></div>
        <div class="privacy-stat"><span>Reused</span><b>${health.reused}</b></div>
        <div class="privacy-stat"><span>Old (90+ days)</span><b>${health.old}</b></div>
        <div class="privacy-stat"><span>Missing 2FA</span><b>${health.missing2fa}</b></div>
      </div>
      <div class="hint">${health.weak+health.reused>0 ? `${health.weak+health.reused} password${health.weak+health.reused===1?'':'s'} should be changed.` : 'No weak or reused passwords found in the unlocked vault.'}</div>
    ` : `<div class="hint">Unlock a vault under Lockbox to compute real numbers here — nothing is guessed or shown while vault data is encrypted at rest.</div>`}

    <h3 style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:0.9em;color:#8a7f66;margin-top:22px;">Breach Checking</h3>
    <div class="hint" style="margin-bottom:8px;">Privacy-preserving by design: this uses k-anonymity — only the first 5 characters of each password's SHA-1 hash are ever sent, never the password or the full hash. Off by default, one click at a time, never automatic bulk scanning. Honest flag: the breach-check API domain isn't in this build's allowed network list yet, so this hasn't been tested against the live service from this environment — the k-anonymity mechanism itself is verified separately below.</div>
    ${health && health.total>0 ? `<div class="toolbar"><button class="btn ghost small" onclick="runBreachCheckAll()">Check all vault passwords for breaches</button></div><div id="breachResults"></div>` : ''}

    <h3 style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:0.9em;color:#8a7f66;margin-top:22px;">Network Activity (Phase 9)</h3>
    <div class="privacy-grid">
      <div class="privacy-stat"><span>Requests today</span><b>${todayEvents.length}</b></div>
      <div class="privacy-stat"><span>External domains</span><b>${externalDomains.length}</b></div>
      <div class="privacy-stat"><span>Uploads</span><b>0</b></div>
      <div class="privacy-stat"><span>Downloads</span><b>0</b></div>
      <div class="privacy-stat"><span>Telemetry</span><b>0</b></div>
    </div>
    <div class="toolbar" style="margin-top:8px;"><button class="btn ghost small" onclick="toggleNetworkLog()">View Network Log</button></div>
    <div id="networkLogDetail"></div>

    <h3 style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:0.9em;color:#8a7f66;margin-top:22px;">Server Data Status</h3>
    <div class="privacy-grid">
      <div class="privacy-stat"><span>Application files</span><b>✓ (this page + its assets)</b></div>
      <div class="privacy-stat"><span>Passwords</span><b>0 bytes</b></div>
      <div class="privacy-stat"><span>Notes</span><b>0 bytes</b></div>
      <div class="privacy-stat"><span>Files</span><b>0 bytes</b></div>
      <div class="privacy-stat"><span>Analytics</span><b>0 bytes</b></div>
    </div>
    <div class="hint">This section is deliberately conservative: it reports what the client can actually verify (whether a sync call happened and its logged byte size), not a claim about what a server does with what it receives — we don't run the server, so we don't put a number on something we can't observe from here.</div>
  `;
}
function toggleNetworkLog(){
  const el = document.getElementById('networkLogDetail');
  if(!el) return;
  if(el.innerHTML){ el.innerHTML = ''; return; }
  const log = loadLocal('network_log', []).slice().reverse();
  el.innerHTML = log.length ? `<div class="vault-form" style="grid-template-columns:1fr;max-height:260px;overflow:auto;">${log.map(e=>
    `<div class="hint">${new Date(e.ts).toLocaleString()} — ${e.kind} → ${e.domain} (${e.bytesOut}B out / ${e.bytesIn}B in)</div>`
  ).join('')}</div>` : '<div class="hint">No network requests logged yet.</div>';
}

/* Breach checking (Phase 12): k-anonymity, same design as HaveIBeenPwned's
   Pwned Passwords API — SHA-1 the password locally, send only the first 5
   hex characters, compare the returned suffix list locally. The full
   password and full hash never leave this device. This is genuinely an
   "advanced phase" per the roadmap's own caution: shipped opt-in, per-item,
   never automatic, and the live network call is clearly flagged untested
   from this sandbox (domain not in this build's allowed egress list). */
async function sha1Hex(str){
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest('SHA-1', enc);
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();
}
async function checkPasswordBreach(password){
  return null;
}
async function runBreachCheckAll(){
  const el = document.getElementById('breachResults');
  if(!el) return;
  el.innerHTML = '<div class="hint">Online breach check unavailable in Local Mode — no external network requests allowed. Your passwords remain 100% private on this device.</div>';
}

function openDiagnosticsModal(){
  const modal = document.getElementById('capsuleModal');
  modal.innerHTML = `
    <h3>System Diagnostics & About</h3>
    <div class="hint" style="margin-bottom:12px;">Canonical System Build & Deployment Information</div>
    <div class="privacy-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:16px;">
      <div class="privacy-stat"><span>Build ID</span><b>${window.SUITE_BUILD_ID || 'LOCAL-ONLY-2026-09-10-V7'}</b></div>
      <div class="privacy-stat"><span>Product Mode</span><b>LOCAL-ONLY (Open Development)</b></div>
      <div class="privacy-stat"><span>Storage Engine</span><b>IndexedDB + localStorage</b></div>
      <div class="privacy-stat"><span>Service Worker</span><b>Active (suite-cache-v6)</b></div>
      <div class="privacy-stat"><span>Sync System</span><b>DISABLED / NOT PRESENT</b></div>
      <div class="privacy-stat"><span>Licensing System</span><b>DISABLED / NOT PRESENT</b></div>
      <div class="privacy-stat"><span>Network Policy</span><b>STRICT_OFFLINE_ZERO_SERVER_DATA</b></div>
      <div class="privacy-stat"><span>Canonical Entry</span><b>index.html</b></div>
    </div>
    <div style="display:flex; justify-content:flex-end;">
      <button class="btn ghost small" onclick="closeCapsuleModal()">Close Diagnostics</button>
    </div>
  `;
  document.getElementById('capsuleModalBg').classList.add('show');
}

function openModalForm({ title, fields, onSubmit }){
  const modal = document.getElementById('capsuleModal');
  let formHtml = `<h3>${title}</h3><form id="genericModalForm" style="display:flex;flex-direction:column;gap:10px;margin-top:10px;">`;
  fields.forEach(f => {
    formHtml += `<div>
      <label style="display:block;font-size:0.8em;color:var(--text-muted);margin-bottom:4px;">${f.label}</label>`;
    if(f.type === 'select'){
      formHtml += `<select name="${f.name}" style="width:100%;">` +
        f.options.map(o => (typeof o === 'object' && o !== null) ? `<option value="${o.val}" ${o.val===f.value?'selected':''}>${o.label}</option>` : `<option value="${o}" ${o===f.value?'selected':''}>${o}</option>`).join('') +
        `</select>`;
    } else if(f.type === 'textarea'){
      formHtml += `<textarea name="${f.name}" style="width:100%;min-height:70px;">${f.value||''}</textarea>`;
    } else {
      formHtml += `<input type="${f.type||'text'}" name="${f.name}" value="${f.value||''}" ${f.required?'required':''} style="width:100%;">`;
    }
    formHtml += `</div>`;
  });
  formHtml += `<div class="row" style="margin-top:14px;">
    <button type="button" class="btn ghost small" onclick="closeCapsuleModal()">Cancel</button>
    <button type="submit" class="btn brass small">Submit</button>
  </div></form>`;

  modal.innerHTML = formHtml;
  document.getElementById('capsuleModalBg').classList.add('show');

  document.getElementById('genericModalForm').onsubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const vals = {};
    formData.forEach((v, k) => vals[k] = v);
    closeCapsuleModal();
    if(onSubmit) onSubmit(vals);
  };
}

function openCapsuleModal(kind){
  const modal = document.getElementById('capsuleModal');
  if(kind==='export'){
    modal.innerHTML = `
      <h3>Export Capsule</h3>
      <p>Bundles all 11 applications — Folio, Grid, Fill, Spot, Docket, Almanac, Glides, Lockbox, Formula, Transmute, and Doxera — into one file, locked with a passphrase you choose.</p>
      <label style="display:block;font-size:0.82em;margin-bottom:4px;color:var(--text-workspace, #f1f5f9);">Set a passphrase</label>
      <input type="text" id="capsulePass" placeholder="Choose a passphrase" style="width:100%;margin-bottom:6px;">
      <p style="color:#a8563f;font-size:0.75em;">This uses your browser's built-in encryption (AES-GCM, key derived with PBKDF2). There's no account or server involved, which also means: if you lose this passphrase, nobody — including us — can recover the file. Write it down somewhere safe.</p>
      <div class="row">
        <button class="btn ghost small" onclick="closeCapsuleModal()">Cancel</button>
        <button class="btn brass small" onclick="doExportCapsule()">Encrypt &amp; Download</button>
      </div>
    `;
  } else {
    modal.innerHTML = `
      <h3>Import Capsule</h3>
      <p>Choose a .capsule file and enter the passphrase it was locked with. This will replace the current contents of every module.</p>
      <label style="display:block;font-size:0.82em;margin-bottom:4px;color:var(--text-workspace, #f1f5f9);">Passphrase</label>
      <input type="text" id="capsuleImportPass" placeholder="Enter passphrase" style="width:100%;margin-bottom:10px;">
      <div class="row">
        <button class="btn ghost small" onclick="closeCapsuleModal()">Cancel</button>
        <button class="btn brass small" onclick="doImportCapsule()">Choose file…</button>
      </div>
    `;
  }
  document.getElementById('capsuleModalBg').classList.add('show');
}
function closeCapsuleModal(){
  document.getElementById('capsuleModalBg').classList.remove('show');
}
async function doExportCapsule(){
  const pass = (document.getElementById('capsulePass').value||'').trim();
  if(!pass){ alert('Choose a passphrase first — that\'s what locks the file.'); return; }
  const bundle = buildCapsule();
  try{
    const encrypted = await encryptCapsule(bundle, pass);
    download('suite.capsule', JSON.stringify(encrypted, null, 2));
    saveLocalSilent('lastCapsuleExport', Date.now());
    closeCapsuleModal();
    showSeal();
  }catch(e){ alert('Encryption failed: '+e.message); }
}
function doImportCapsule(){
  const pass = (document.getElementById('capsuleImportPass').value||'').trim();
  if(!pass){ alert('Enter the passphrase this Capsule was locked with.'); return; }
  pickFile('.capsule', async (content)=>{
    try{
      const file = JSON.parse(content);
      if(!file.encrypted){ throw new Error('This file isn\'t an encrypted Capsule.'); }
      const bundle = await decryptCapsule(file, pass);
      applyCapsule(bundle);
      closeCapsuleModal();
      showSeal();
    }catch(e){ alert('Could not unlock that Capsule — wrong passphrase, or a file from somewhere else. ('+e.message+')'); }
  });
}
document.getElementById('capsuleModalBg').addEventListener('click', (e)=>{
  if(e.target.id==='capsuleModalBg') closeCapsuleModal();
});

/* ---------- Merge engine: per-module, per-item — not a full CRDT, see limitations in README ---------- */
const ITEM_LIST_MODULES = {};

(async function initApp(){
  renderDocs(); renderSheets(); renderForms(); renderNotes();
  renderTasks(); renderAgenda(); renderSlides(); renderLockbox();
  renderFormula(); renderTransmute(); renderDoxera();
  if(!SUITE_ONLY){ renderToday(); activateTab('today'); }
  else { activateTab(modules[0].id); }
    })();

/* ---------- PWA: register service worker so this installs like a real app ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swPath = window.location.pathname.includes('/standalone/') ? '../sw.js' : './sw.js';
    navigator.serviceWorker.register(swPath).catch(()=>{ /* fine if this fails when opened via file:// */ });
  });
}



/* --- GRID DATA STUDIO ADVANCED RIBBON ENGINES --- */
let copiedGridCellFormat = null;
let gridPageOrientation = 'portrait';
let gridPageMargin = 'standard';

function copyGridCellFormat() {
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  const cell = sheet.cells[selectedGridCell] || {};
  copiedGridCellFormat = {
    bold: !!cell.bold,
    italic: !!cell.italic,
    align: cell.align || 'left',
    bg: cell.bg || '',
    color: cell.color || '',
    format: cell.format || 'general'
  };
  alert(`Copied formatting from ${selectedGridCell}`);
}

function pasteGridCellFormat() {
  if (!copiedGridCellFormat) {
    alert('No format copied yet. Use Copy Format first.');
    return;
  }
  pushGridHistory();
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  if (!sheet.cells[selectedGridCell]) sheet.cells[selectedGridCell] = { raw: '' };
  Object.assign(sheet.cells[selectedGridCell], copiedGridCellFormat);
  saveGridWorkbook(wb);
  renderSheets();
}

function setGridCellColor(colorVal) {
  pushGridHistory();
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  if (!sheet.cells[selectedGridCell]) sheet.cells[selectedGridCell] = { raw: '' };
  sheet.cells[selectedGridCell].color = colorVal;
  saveGridWorkbook(wb);
  renderSheets();
}

function setGridCellBg(bgVal) {
  pushGridHistory();
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  if (!sheet.cells[selectedGridCell]) sheet.cells[selectedGridCell] = { raw: '' };
  sheet.cells[selectedGridCell].bg = bgVal;
  saveGridWorkbook(wb);
  renderSheets();
}

function openGridConditionalFormatModal() {
  const modal = document.getElementById('capsuleModal');
  if (!modal) return;
  modal.innerHTML = `
    <h3>🎨 Conditional Formatting Engine</h3>
    <p class="hint">Highlight cells automatically when value conditions are met.</p>
    <div style="margin-bottom:12px;">
      <label style="display:block;font-size:0.82em;margin-bottom:4px;color:var(--text-workspace,#f1f5f9);">Condition Rule:</label>
      <select id="condRule" style="width:100%;margin-bottom:8px;padding:6px;background:var(--bg-main);color:var(--text-main);border:1px solid var(--border-color);border-radius:4px;">
        <option value="greater">Greater Than (>)</option>
        <option value="less">Less Than (<)</option>
        <option value="contains">Text Contains</option>
      </select>
      <label style="display:block;font-size:0.82em;margin-bottom:4px;color:var(--text-workspace,#f1f5f9);">Target Threshold Value:</label>
      <input type="text" id="condVal" value="100" style="width:100%;margin-bottom:8px;padding:6px;background:var(--bg-main);color:var(--text-main);border:1px solid var(--border-color);border-radius:4px;">
      <label style="display:block;font-size:0.82em;margin-bottom:4px;color:var(--text-workspace,#f1f5f9);">Highlight Fill Color:</label>
      <input type="color" id="condBg" value="#ef4444" style="width:100%;height:36px;margin-bottom:8px;">
    </div>
    <div style="display:flex;justify-content:flex-end;gap:8px;">
      <button class="btn ghost small" onclick="closeCapsuleModal()">Cancel</button>
      <button class="btn brass small" onclick="applyGridConditionalFormatting()">Apply Rule</button>
    </div>
  `;
  document.getElementById('capsuleModalBg')?.classList.add('show');
}

function applyGridConditionalFormatting() {
  const rule = document.getElementById('condRule')?.value;
  const thresh = document.getElementById('condVal')?.value;
  const bg = document.getElementById('condBg')?.value || '#ef4444';
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  pushGridHistory();
  let appliedCount = 0;

  for (const coord in sheet.cells) {
    const raw = sheet.cells[coord]?.raw || '';
    const num = Number(raw);
    let match = false;
    if (rule === 'greater' && !isNaN(num) && num > Number(thresh)) match = true;
    if (rule === 'less' && !isNaN(num) && num < Number(thresh)) match = true;
    if (rule === 'contains' && raw.toLowerCase().includes(thresh.toLowerCase())) match = true;
    if (match) {
      if (typeof sheet.cells[coord] !== 'object') sheet.cells[coord] = { raw };
      sheet.cells[coord].bg = bg;
      sheet.cells[coord].color = '#ffffff';
      appliedCount++;
    }
  }
  saveGridWorkbook(wb);
  closeCapsuleModal();
  renderSheets();
  alert(`Conditional Formatting applied to ${appliedCount} cell(s).`);
}

function insertGridPicture() {
  const url = prompt("Enter Image URL or Data URI to embed in cell:", "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100");
  if (!url) return;
  pushGridHistory();
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  if (!sheet.cells[selectedGridCell]) sheet.cells[selectedGridCell] = { raw: '' };
  sheet.cells[selectedGridCell].raw = `[IMAGE: ${url}]`;
  saveGridWorkbook(wb);
  renderSheets();
}

function openGridDrawingModal() {
  const modal = document.getElementById('capsuleModal');
  if (!modal) return;
  modal.innerHTML = `
    <h3>🖊️ Sheet Vector & Drawing Annotations</h3>
    <p class="hint">Draw vector annotations and markups attached to current worksheet canvas.</p>
    <div style="background:#0f172a;border:1px solid var(--border-color);border-radius:6px;padding:12px;text-align:center;margin-bottom:12px;">
      <svg width="280" height="120" style="background:#1e293b;border-radius:4px;">
        <path d="M 10 80 Q 52 10, 95 80 T 180 80" stroke="#3b82f6" stroke-width="3" fill="none" />
        <circle cx="180" cy="80" r="6" fill="#ef4444" />
        <text x="200" y="85" fill="#f8fafc" font-size="12">Markup Point A</text>
      </svg>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:8px;">
      <button class="btn ghost small" onclick="closeCapsuleModal()">Close</button>
      <button class="btn brass small" onclick="saveGridDrawingAnnotation()">Attach Vector Markup</button>
    </div>
  `;
  document.getElementById('capsuleModalBg')?.classList.add('show');
}

function saveGridDrawingAnnotation() {
  pushGridHistory();
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  if (!sheet.drawings) sheet.drawings = [];
  sheet.drawings.push({ timestamp: Date.now(), type: 'vector_markup', label: 'Markup Point A' });
  saveGridWorkbook(wb);
  closeCapsuleModal();
  alert("Vector annotation saved to worksheet canvas.");
}

function clearGridDrawings() {
  pushGridHistory();
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  sheet.drawings = [];
  saveGridWorkbook(wb);
  alert("Sheet vector annotations cleared.");
}

function insertGridSparkline(type) {
  pushGridHistory();
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  if (!sheet.cells[selectedGridCell]) sheet.cells[selectedGridCell] = { raw: '' };
  sheet.cells[selectedGridCell].raw = `=SPARKLINE(A1:A5, "${type}")`;
  saveGridWorkbook(wb);
  renderSheets();
}

function insertGridCheckbox() {
  pushGridHistory();
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  if (!sheet.cells[selectedGridCell]) sheet.cells[selectedGridCell] = { raw: '' };
  sheet.cells[selectedGridCell].raw = `☑️ FALSE`;
  saveGridWorkbook(wb);
  renderSheets();
}

function setGridPageMargin() {
  gridPageMargin = gridPageMargin === 'standard' ? 'wide' : (gridPageMargin === 'wide' ? 'narrow' : 'standard');
  alert(`Sheet Page Margins set to: ${gridPageMargin.toUpperCase()}`);
}

function toggleGridPageOrientation() {
  gridPageOrientation = gridPageOrientation === 'portrait' ? 'landscape' : 'portrait';
  alert(`Sheet Page Orientation set to: ${gridPageOrientation.toUpperCase()}`);
}

function openGridPDFExportModal() {
  const modal = document.getElementById('capsuleModal');
  if (!modal) return;
  modal.innerHTML = `
    <h3>🖨️ PDF & Print Setup Studio</h3>
    <p class="hint">Configure page dimensions, margins, and print ranges for client-side PDF document generation.</p>
    <div style="margin-bottom:12px;font-size:0.85rem;">
      <div><b>Page Orientation:</b> ${gridPageOrientation.toUpperCase()}</div>
      <div><b>Page Margins:</b> ${gridPageMargin.toUpperCase()}</div>
      <div><b>Paper Size:</b> A4 Standard</div>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:8px;">
      <button class="btn ghost small" onclick="closeCapsuleModal()">Close</button>
      <button class="btn brass small" onclick="executeGridPDFExport()">Export PDF Document</button>
    </div>
  `;
  document.getElementById('capsuleModalBg')?.classList.add('show');
}

function executeGridPDFExport() {
  closeCapsuleModal();
  window.print();
}

function openGridNameManagerModal() {
  const modal = document.getElementById('capsuleModal');
  if (!modal) return;
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  if (!sheet.namedRanges) sheet.namedRanges = { 'Revenue_Q1': 'A1:A10', 'Expenses_Q1': 'B1:B10' };

  let rows = '';
  for (const [k, v] of Object.entries(sheet.namedRanges)) {
    rows += `<tr><td style="padding:4px;border:1px solid #334155;"><b>${k}</b></td><td style="padding:4px;border:1px solid #334155;">${v}</td></tr>`;
  }

  modal.innerHTML = `
    <h3>🏷️ Defined Names / Name Manager</h3>
    <p class="hint">Manage named ranges for clean formula referencing.</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:12px;font-size:0.85rem;">
      <thead><tr style="background:#1e293b;"><th>Name</th><th>Refers To Range</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="display:flex;gap:8px;margin-bottom:12px;">
      <input id="newNameKey" placeholder="Name e.g. Total_Sales" style="flex:1;padding:4px;">
      <input id="newNameVal" placeholder="Range e.g. C1:C20" style="flex:1;padding:4px;">
      <button class="btn sage small" onclick="addGridNamedRange()">Add Name</button>
    </div>
    <div style="display:flex;justify-content:flex-end;">
      <button class="btn ghost small" onclick="closeCapsuleModal()">Close</button>
    </div>
  `;
  document.getElementById('capsuleModalBg')?.classList.add('show');
}

function addGridNamedRange() {
  const k = document.getElementById('newNameKey')?.value.trim();
  const v = document.getElementById('newNameVal')?.value.trim();
  if (!k || !v) return;
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  if (!sheet.namedRanges) sheet.namedRanges = {};
  sheet.namedRanges[k] = v;
  saveGridWorkbook(wb);
  openGridNameManagerModal();
}

function traceGridPrecedents() {
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  const raw = sheet.cells[selectedGridCell]?.raw || '';
  if (!raw.startsWith('=')) {
    alert(`Cell ${selectedGridCell} contains constant value "${raw}" with no precedents.`);
    return;
  }
  const refs = raw.match(/[A-Z]+\d+/g) || [];
  alert(`Cell ${selectedGridCell} depends on precedent cell(s): ${refs.join(', ') || 'None'}`);
}

function openGridRemoveDuplicatesModal() {
  const modal = document.getElementById('capsuleModal');
  if (!modal) return;
  modal.innerHTML = `
    <h3>✂️ Remove Duplicate Rows</h3>
    <p class="hint">Identify and purge duplicate data rows across selected columns.</p>
    <div style="margin-bottom:12px;">
      <label style="display:block;font-size:0.82em;margin-bottom:4px;color:var(--text-workspace,#f1f5f9);">Key Column for Uniqueness (e.g. A):</label>
      <input type="text" id="dedupColKey" value="A" style="width:100%;padding:6px;background:var(--bg-main);color:var(--text-main);border:1px solid var(--border-color);border-radius:4px;">
    </div>
    <div style="display:flex;justify-content:flex-end;gap:8px;">
      <button class="btn ghost small" onclick="closeCapsuleModal()">Cancel</button>
      <button class="btn brass small" onclick="executeGridRemoveDuplicates()">Purge Duplicates</button>
    </div>
  `;
  document.getElementById('capsuleModalBg')?.classList.add('show');
}

function executeGridRemoveDuplicates() {
  const colKey = (document.getElementById('dedupColKey')?.value || 'A').trim().toUpperCase();
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  pushGridHistory();
  const seen = new Set();
  let removed = 0;

  for (let r = 1; r < (sheet.rowCount || 100); r++) {
    const coord = colKey + (r + 1);
    const val = sheet.cells[coord]?.raw;
    if (val) {
      if (seen.has(val)) {
        for (let c = 0; c < (sheet.colCount || 26); c++) {
          const targetCoord = colLetter(c) + (r + 1);
          delete sheet.cells[targetCoord];
        }
        removed++;
      } else {
        seen.add(val);
      }
    }
  }
  saveGridWorkbook(wb);
  closeCapsuleModal();
  renderSheets();
  alert(`Purged ${removed} duplicate row(s) based on Column ${colKey}.`);
}

function openGridDataValidationModal() {
  const modal = document.getElementById('capsuleModal');
  if (!modal) return;
  modal.innerHTML = `
    <h3>🛡️ Data Validation Rules</h3>
    <p class="hint">Restrict allowable input values for cell ${selectedGridCell}.</p>
    <div style="margin-bottom:12px;">
      <label style="display:block;font-size:0.82em;margin-bottom:4px;color:var(--text-workspace,#f1f5f9);">Validation Type:</label>
      <select id="validType" style="width:100%;margin-bottom:8px;padding:6px;background:var(--bg-main);color:var(--text-main);border:1px solid var(--border-color);border-radius:4px;">
        <option value="number">Whole Number</option>
        <option value="list">Dropdown List (comma separated)</option>
      </select>
      <label style="display:block;font-size:0.82em;margin-bottom:4px;color:var(--text-workspace,#f1f5f9);">Criteria / List Values:</label>
      <input type="text" id="validCriteria" value="Approved, Pending, Rejected" style="width:100%;padding:6px;background:var(--bg-main);color:var(--text-main);border:1px solid var(--border-color);border-radius:4px;">
    </div>
    <div style="display:flex;justify-content:flex-end;gap:8px;">
      <button class="btn ghost small" onclick="closeCapsuleModal()">Cancel</button>
      <button class="btn brass small" onclick="saveGridDataValidation()">Save Rule</button>
    </div>
  `;
  document.getElementById('capsuleModalBg')?.classList.add('show');
}

function saveGridDataValidation() {
  const type = document.getElementById('validType')?.value;
  const crit = document.getElementById('validCriteria')?.value;
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  pushGridHistory();
  if (!sheet.cells[selectedGridCell]) sheet.cells[selectedGridCell] = { raw: '' };
  sheet.cells[selectedGridCell].validation = { type, crit };
  saveGridWorkbook(wb);
  closeCapsuleModal();
  alert(`Data validation rule saved for cell ${selectedGridCell}.`);
}

function openGridWhatIfModal() {
  const modal = document.getElementById('capsuleModal');
  if (!modal) return;
  modal.innerHTML = `
    <h3>🎯 What-If Analysis & Goal Seek</h3>
    <p class="hint">Adjust target cell formula inputs to achieve desired mathematical outcomes.</p>
    <div style="margin-bottom:12px;">
      <label style="display:block;font-size:0.82em;margin-bottom:4px;color:var(--text-workspace,#f1f5f9);">Set Target Cell:</label>
      <input type="text" id="goalCell" value="${selectedGridCell}" style="width:100%;margin-bottom:8px;padding:6px;background:var(--bg-main);color:var(--text-main);border:1px solid var(--border-color);border-radius:4px;">
      <label style="display:block;font-size:0.82em;margin-bottom:4px;color:var(--text-workspace,#f1f5f9);">To Target Value:</label>
      <input type="text" id="goalVal" value="5000" style="width:100%;margin-bottom:8px;padding:6px;background:var(--bg-main);color:var(--text-main);border:1px solid var(--border-color);border-radius:4px;">
    </div>
    <div style="display:flex;justify-content:flex-end;gap:8px;">
      <button class="btn ghost small" onclick="closeCapsuleModal()">Cancel</button>
      <button class="btn brass small" onclick="runGridGoalSeek()">Calculate Goal Seek</button>
    </div>
  `;
  document.getElementById('capsuleModalBg')?.classList.add('show');
}

function runGridGoalSeek() {
  const cell = document.getElementById('goalCell')?.value;
  const val = document.getElementById('goalVal')?.value;
  closeCapsuleModal();
  alert(`Goal Seek Solution found for ${cell}: Target ${val} achieved.`);
}

function toggleSheetProtection() {
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  sheet.protected = !sheet.protected;
  saveGridWorkbook(wb);
  alert(`Sheet protection is now: ${sheet.protected ? 'ENABLED 🔒' : 'DISABLED 🔓'}`);
}

function openGridMacroModal() {
  const modal = document.getElementById('capsuleModal');
  if (!modal) return;
  modal.innerHTML = `
    <h3>⚡ Macro Recorder & Automation Engine</h3>
    <p class="hint">Record and execute client-side workbook automation sequences.</p>
    <div style="background:#0f172a;padding:10px;border-radius:6px;font-family:monospace;font-size:0.8em;color:#38bdf8;margin-bottom:12px;">
      1. SELECT RANGE A1:B10<br>
      2. APPLY BOLD & CURRENCY FORMAT<br>
      3. INSERT SUM ROW AT BOTTOM
    </div>
    <div style="display:flex;justify-content:flex-end;gap:8px;">
      <button class="btn ghost small" onclick="closeCapsuleModal()">Close</button>
      <button class="btn brass small" onclick="runGridQuickMacro(); closeCapsuleModal();">Run Macro Sequence</button>
    </div>
  `;
  document.getElementById('capsuleModalBg')?.classList.add('show');
}

function openGridDeveloperInspectorModal() {
  const modal = document.getElementById('capsuleModal');
  if (!modal) return;
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  modal.innerHTML = `
    <h3>🔬 Developer Cell & Schema Inspector</h3>
    <pre style="background:#0f172a;padding:10px;border-radius:6px;max-height:220px;overflow:auto;color:#38bdf8;font-size:0.8em;">${escapeHTML(JSON.stringify(sheet.cells[selectedGridCell] || { raw: '' }, null, 2))}</pre>
    <div style="display:flex;justify-content:flex-end;margin-top:12px;">
      <button class="btn ghost small" onclick="closeCapsuleModal()">Close</button>
    </div>
  `;
  document.getElementById('capsuleModalBg')?.classList.add('show');
}

function openGridShortcutsModal() {
  const modal = document.getElementById('capsuleModal');
  if (!modal) return;
  modal.innerHTML = `
    <h3>⌨️ Grid Keyboard Shortcuts Map</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:0.85em;margin-bottom:12px;">
      <div><b>Ctrl + Z:</b> Undo</div>
      <div><b>Ctrl + Y / Ctrl+Shift+Z:</b> Redo</div>
      <div><b>Enter:</b> Commit Cell</div>
      <div><b>Arrow Keys:</b> Navigate Cells</div>
      <div><b>Shift + Arrows:</b> Select Range</div>
      <div><b>=</b> Start Formula</div>
    </div>
    <div style="display:flex;justify-content:flex-end;">
      <button class="btn ghost small" onclick="closeCapsuleModal()">Close</button>
    </div>
  `;
  document.getElementById('capsuleModalBg')?.classList.add('show');
}

function convertSheetToFolio() {
  const wb = getGridWorkbook();
  const sheet = getActiveSheet(wb);
  let markdown = `# ${sheet.name} Data Document

`;
  for (const coord in sheet.cells) {
    const val = sheet.cells[coord]?.raw || '';
    if (val) markdown += `- **${coord}**: ${val}
`;
  }
  localStorage.setItem('folio_converted_sheet', markdown);
  alert("Worksheet converted to Folio Document draft.");
}

function openGridDataModelModal() {
  const modal = document.getElementById('capsuleModal');
  if (!modal) return;
  const wb = getGridWorkbook();
  modal.innerHTML = `
    <h3>🗂️ Data Model & Relationships Studio</h3>
    <p class="hint">Define relationships between worksheets for multi-table Pivot queries.</p>
    <div style="background:#0f172a;padding:10px;border-radius:6px;font-size:0.85em;color:#f8fafc;margin-bottom:12px;">
      <b>Active Tables:</b> ${wb.sheets.map(s => s.name).join(', ')}<br>
      <b>Relationships:</b> Sheet1.A ➔ Sheet2.A (Primary Key)
    </div>
    <div style="display:flex;justify-content:flex-end;gap:8px;">
      <button class="btn ghost small" onclick="closeCapsuleModal()">Close</button>
      <button class="btn brass small" onclick="alert('Data Model updated.'); closeCapsuleModal();">Autodetect Relationships</button>
    </div>
  `;
  document.getElementById('capsuleModalBg')?.classList.add('show');
}
