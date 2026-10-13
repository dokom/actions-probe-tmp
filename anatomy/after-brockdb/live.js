
const DATA = __DATA__;
const { P, routes, tubes, paths, stations, principles } = DATA;
const stage = document.querySelector(".ab-stage");
const svg = stage.querySelector("svg");
const itemsG = svg.querySelector(".ab-items");
const pool = svg.querySelector('[data-part="carriers"]');
const readout = document.querySelector("[data-readout]");
const status = document.querySelector("[data-status]");
const panel = document.querySelector(".ab-panel");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const NS = "http://www.w3.org/2000/svg";

// ---- index the drawing ------------------------------------------------------------------
const items = [...itemsG.children];
const chunkEl = {};
for (const el of items) if (el.dataset.chunk !== undefined && el.dataset.tube) (chunkEl[el.dataset.tube] ||= [])[+el.dataset.chunk] = el;
const all = (selector) => [...svg.querySelectorAll(selector)];

// ---- routes: arc length, points, projection ---------------------------------------------
for (const r of Object.values(routes)) {
  r.cum = [0];
  for (let i = 1; i < r.points.length; i++) {
    const [a, b] = [r.points[i - 1], r.points[i]];
    r.cum.push(r.cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
  }
}
function pointAt(r, s) {
  s = Math.max(0, Math.min(r.total, s));
  let i = 1;
  while (i < r.cum.length - 1 && r.cum[i] < s) i++;
  const [a, b] = [r.points[i - 1], r.points[i]];
  const span = r.cum[i] - r.cum[i - 1] || 1;
  const t = (s - r.cum[i - 1]) / span;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
const chunkAt = (id, s) => {
  const list = routes[id].chunks;
  let best = list[0];
  let gap = Infinity;
  for (const c of list) {
    if (s >= c.from && s <= c.to) return c;
    const d = Math.min(Math.abs(s - c.from), Math.abs(s - c.to));
    if (d < gap) { gap = d; best = c; }
  }
  return best;
};

// ---- carriers: a lit capsule inside the tube, drawn right after the chunk it is in ---------
const CAP = 11;
const WIDTH = (DATA.TR * 2 - 1.4) * DATA.KS;
const carriers = [];
function carrier(index) {
  if (carriers[index]) return carriers[index];
  const g = document.createElementNS(NS, "g");
  g.setAttribute("class", "carrier");
  g.innerHTML = `<path class="cr-edge" style="stroke-width:${(WIDTH + 1.4).toFixed(2)}px"/><path class="cr-body" style="stroke-width:${WIDTH.toFixed(2)}px"/>`;
  pool.append(g);
  return (carriers[index] = g);
}
// The capsule is clipped to the drawn run it is in (never inside a flange or a bulkhead fitting),
// and drawn after the last chunk it overlaps, so the tube it travels in never covers it.
function runOf(r, s) {
  let from = 0;
  for (const [g0, g1] of r.gaps) {
    if (s < g0) return [from, g0];
    if (s <= g1) return null;
    from = g1;
  }
  return [from, r.total];
}
function placeCarrier(index, id, s) {
  const g = carrier(index);
  const r = routes[id];
  const run = runOf(r, s);
  if (!run || run[1] - run[0] < 2) { g.setAttribute("hidden", ""); return; }
  const a = Math.max(run[0] + 0.6, s - CAP / 2);
  const b = Math.min(run[1] - 0.6, s + CAP / 2);
  if (b - a < 1.5) { g.setAttribute("hidden", ""); return; }
  const pts = [];
  for (let i = 0; i <= 6; i++) pts.push(iso(pointAt(r, a + ((b - a) * i) / 6), P));
  const d = "M" + pts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L");
  for (const path of g.children) path.setAttribute("d", d);
  let host = null;
  for (const c of r.chunks) {
    if (c.to < a || c.from > b) continue;
    const el = chunkEl[id][c.index];
    if (el && (!host || host.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) host = el;
  }
  if (host && host.nextSibling !== g) host.after(g);
  g.removeAttribute("hidden");
}
function hideCarriers() {
  for (const g of carriers) if (g) { g.setAttribute("hidden", ""); pool.append(g); }
}

// ---- pointers on the two drums ----------------------------------------------------------
const drums = DATA.drums;
const pointer = Object.fromEntries(Object.keys(drums).map((id) => [id, { el: svg.querySelector(`[data-pointer="${id}"]`), angle: drums[id].rest, target: drums[id].rest }]));
function aimAt(id, tube) {
  const d = drums[id];
  if (!d || d.ports[tube] === undefined) return;
  const p = pointer[id];
  let target = d.ports[tube];
  while (target - p.angle > Math.PI) target -= Math.PI * 2;
  while (target - p.angle < -Math.PI) target += Math.PI * 2;
  p.target = target;
}
function drawPointer(id) {
  const d = drums[id];
  const p = pointer[id];
  const tip = [d.c[0] + Math.cos(p.angle) * d.len, d.c[1] + Math.sin(p.angle) * d.len];
  const tail = [d.c[0] + Math.cos(p.angle) * d.r0, d.c[1] + Math.sin(p.angle) * d.r0];
  p.el.setAttribute("d", lineOnTop(tail, tip, d.z, P));
}

// ---- marks --------------------------------------------------------------------------------
const lit = (selector, on = true) => all(selector).forEach((el) => (on ? el.setAttribute("data-lit", "") : el.removeAttribute("data-lit")));
let printed = 0;
const MARKS = {
  card: () => lit('[data-card="1"]'),
  hold: () => lit('[data-mark="hold"]'),
  dials: () => lit('[data-mark="dials"]'),
  bulkhead: () => lit('[data-mark="bulkhead"]'),
  teams: () => lit('[data-mark="slot-teams"]'),
  "slot-coop": () => lit('[data-mark="slot-coop"]'),
  "slot-dept": () => lit('[data-mark="slot-dept"]'),
  caps: () => lit('[data-mark="caps"]'),
  raw: () => lit('[data-mark="raw"]'),
  entities: () => lit('[data-mark="entities"]'),
  certified: () => lit('[data-mark="certified"]'),
  owners: () => lit('[data-mark="owners"]'),
  catalog: () => lit('[data-mark="catalog"]'),
  tag: () => lit('[data-mark="tag"]'),
  glass: () => lit('[data-mark="glass"]'),
  seal: () => lit('[data-mark="seal"]'),
  cartridge: () => { lit('[data-mark="cartridge"]'); slide.target = 1; slide.back = 1.4; },
  sweep: () => {},
  "all-lamps": () => all("[data-watch]").forEach((el) => el.setAttribute("data-ran", "")),
  version: () => lit('[data-mark="version"]'),
  "version-bump": () => { lit('[data-mark="version"]'); setVersion(4); },
  badge: () => lit('[data-mark="badge"]'),
  reader: () => lit('[data-mark="reader"]'),
  print: () => {},
  "coop-off": () => { lit('[data-mark="coop-off"]'); toggleOff = true; drawToggle(); },
};
for (const id of Object.keys(tubes)) MARKS[`lamp-${id}`] = () => lit(`[data-watch="${id}"]`);
const versionEl = svg.querySelector("[data-version]");
const versionText = (n) => versionEl.querySelector("text").textContent.replace(/\d+/, String(n));
function setVersion(n) { const t = versionEl.querySelector("text"); if (t) t.textContent = `v${n}`; }
// Banner's release cartridge slides out and back.
const cartEl = svg.querySelector('[data-mark="cartridge"]');
const slide = { x: 0, target: 0, back: 0 };
// BrockDB's co-op toggle.
const toggleEl = svg.querySelector('[data-toggle="0"]');
const toggleRest = toggleEl.getAttribute("d");
let toggleOff = false;
function drawToggle() {
  const t = DATA.toggle;
  toggleEl.setAttribute("d", toggleOff ? t.off : toggleRest);
}
function printRow() {
  const rows = all("[data-row]");
  rows.forEach((el) => el.removeAttribute("data-lit"));
  const row = rows[printed % rows.length];
  row.setAttribute("data-lit", "");
  row.setAttribute("data-printed", "");
  printed++;
}
function clearMarks() {
  all("[data-lit]").forEach((el) => el.removeAttribute("data-lit"));
  all("[data-ran]").forEach((el) => el.removeAttribute("data-ran"));
  all("[data-printed]").forEach((el) => el.removeAttribute("data-printed"));
  all("[data-lamp-on]").forEach((el) => el.removeAttribute("data-lamp-on"));
  printed = 0;
  setVersion(3);
  toggleOff = false;
  drawToggle();
  slide.target = 0;
}

// ---- path focus ------------------------------------------------------------------------------
const tubeOf = (run) => run.replace(/^-/, "");
function membersOf(path) {
  const st = new Set();
  const tb = new Set();
  for (const hop of path.hops) {
    for (const a of hop.at ?? []) st.add(a);
    for (const run of (hop.runs ?? []).flat()) {
      const t = tubeOf(run);
      tb.add(t);
      st.add(tubes[t].from);
      st.add(tubes[t].to);
    }
  }
  return { st, tb };
}
function focusPath(path) {
  const { st, tb } = membersOf(path);
  const border = [...tb].some((t) => tubes[t].border);
  for (const el of items) {
    const on = (el.dataset.st && st.has(el.dataset.st)) || (el.dataset.tube && tb.has(el.dataset.tube)) || (border && el.dataset.mark === "bulkhead" && !el.dataset.tube);
    on ? el.setAttribute("data-on", "") : el.removeAttribute("data-on");
  }
  itemsG.setAttribute("data-focus", "");
}
function heat(stationIds) {
  for (const el of items) {
    const hot = el.dataset.st && stationIds.includes(el.dataset.st);
    hot ? el.setAttribute("data-hot", "") : el.removeAttribute("data-hot");
  }
  all("[data-lamp]").forEach((el) => (stationIds.includes(el.dataset.lamp) ? el.setAttribute("data-lamp-on", "") : el.removeAttribute("data-lamp-on")));
}

// ---- the tour: paths, hops, runs ----------------------------------------------------------
const SPEED = 150; // world units a second
const state = { path: 0, hop: 0, groups: [], group: 0, t: 0, phase: "dwell", dwell: 0, playing: !still.matches, auto: true };
const dwellOf = (hop) => 1.9 + hop.text.length * 0.028;
// What a hop leaves behind: its marks, a watch lamp for every tube it ran, a register line.
function effects(hop) {
  for (const run of (hop.runs ?? []).flat()) all(`[data-watch="${tubeOf(run)}"]`).forEach((el) => el.setAttribute("data-ran", ""));
  for (const mark of hop.marks ?? []) MARKS[mark]?.();
  if ((hop.runs ?? []).length || (hop.marks ?? []).includes("print")) printRow();
}
function startHop(index, { announce = true } = {}) {
  const path = paths[state.path];
  const next = Math.max(0, Math.min(path.hops.length - 1, index));
  // A jump replays the hops before it at once, so the bench shows what they left behind.
  if (next !== state.hop + 1 || state.phase === "end") {
    clearMarks();
    for (let i = 0; i < next; i++) effects(path.hops[i]);
    slide.back = 0;
    slide.target = 0;
    slide.x = 0;
    cartEl.removeAttribute("transform");
  } else if (state.phase === "run") {
    // Skipping ahead mid-run: the hop being skipped still leaves its marks.
    effects(path.hops[state.hop]);
  }
  hideCarriers();
  state.hop = next;
  const hop = path.hops[state.hop];
  state.groups = (hop.runs ?? []).map((run) => (Array.isArray(run) ? run : [run]));
  state.group = 0;
  state.t = 0;
  heat([]);
  // Marks set by earlier hops stay; the register prints one line for every hop.
  if (state.groups.length && !still.matches) state.phase = "run";
  else arrive();
  renderPanel();
  say();
  if (announce) status.textContent = `${path.title}, hop ${state.hop + 1} of ${path.hops.length}. ${hop.text}`;
  kick();
}
function arrive() {
  const hop = paths[state.path].hops[state.hop];
  hideCarriers();
  heat(hop.at ?? []);
  effects(hop);
  state.phase = "dwell";
  state.dwell = dwellOf(hop);
  say();
}
function selectPath(index, { auto = false } = {}) {
  state.path = (index + paths.length) % paths.length;
  state.auto = auto;
  state.hop = -1;
  state.phase = "dwell";
  clearMarks();
  focusPath(paths[state.path]);
  panel.querySelectorAll("[data-path]").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.path === state.path)));
  startHop(0);
}
function say(text) {
  const path = paths[state.path];
  const line = text ?? `${state.path + 1} · hop ${state.hop + 1} of ${path.hops.length}${state.phase === "run" ? " · in the tubes" : ""}`;
  if (readout.textContent !== line) readout.textContent = line;
}

// ---- the panel under the card ------------------------------------------------------------
const el = (selector) => panel.querySelector(selector);
function renderPanel() {
  const path = paths[state.path];
  el("[data-src]").textContent = `Path ${state.path + 1} of ${paths.length} · ${path.source}`;
  el("[data-title]").textContent = path.title;
  el("[data-sub]").textContent = path.sub;
  el("[data-hops]").innerHTML = path.hops.map((hop, i) => `<li${i === state.hop ? ' aria-current="step"' : ""}><button type="button" data-hop="${i}"><span class="ab-hop-n">${i + 1}</span><span class="ab-hop-t">${escapeHtml(hop.text)}</span>${(hop.p ?? []).map((n) => `<span class="ab-chip" title="${escapeHtml(principles[n].name)}">${n}</span>`).join("")}</button></li>`).join("");
  el("[data-who]").innerHTML = path.who.map(([k, v]) => `<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`).join("");
  el("[data-principles]").innerHTML = path.principles.length
    ? path.principles.map((n) => `<span class="ab-pr"><span class="ab-chip">${n}</span><b>${escapeHtml(principles[n].name)}</b> ${escapeHtml(principles[n].text)}</span>`).join("")
    : `<span class="ab-pr ab-pr-none">The text names no principle for this path.</span>`;
  el("[data-note]").textContent = path.note ?? "";
  el("[data-note]").hidden = !path.note;
}
const escapeHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---- the loop ----------------------------------------------------------------------------
let frame = 0;
let last = 0;
let visible = false;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (state.phase === "run") {
    state.t += dt;
    const group = state.groups[state.group];
    let done = true;
    group.forEach((run, i) => {
      const id = tubeOf(run);
      const r = routes[id];
      const s = Math.min(r.total, state.t * SPEED);
      if (s < r.total) done = false;
      placeCarrier(i, id, run.startsWith("-") ? r.total - s : s);
      const ends = [tubes[id].from, tubes[id].to];
      for (const end of ends) if (pointer[end]) aimAt(end, id);
    });
    if (done) {
      for (const run of group) all(`[data-watch="${tubeOf(run)}"]`).forEach((el) => el.setAttribute("data-ran", ""));
      state.group++;
      state.t = 0;
      hideCarriers();
      if (state.group >= state.groups.length) arrive();
    }
  } else if (state.phase === "dwell" && state.playing) {
    state.dwell -= dt;
    if (state.dwell <= 0) {
      const path = paths[state.path];
      if (state.hop < path.hops.length - 1) startHop(state.hop + 1);
      else if (state.auto) selectPath(state.path + 1, { auto: true });
      else { state.playing = false; state.phase = "end"; say(); }
    }
  }
  // Drum pointers and the cartridge ease toward their targets.
  let moving = false;
  for (const id of Object.keys(pointer)) {
    const p = pointer[id];
    const before = p.angle;
    p.angle = calm ? p.target : p.angle + (p.target - p.angle) * (1 - Math.exp(-dt / 0.18));
    if (Math.abs(p.target - p.angle) < 1e-3) p.angle = p.target;
    if (p.angle !== before) { drawPointer(id); moving = true; }
  }
  if (slide.back > 0) { slide.back -= dt; if (slide.back <= 0) slide.target = 0; }
  const sx = slide.x;
  slide.x = calm ? slide.target : slide.x + (slide.target - slide.x) * (1 - Math.exp(-dt / 0.3));
  if (Math.abs(slide.target - slide.x) < 1e-3) slide.x = slide.target;
  if (slide.x !== sx) { cartEl.setAttribute("transform", translateAlong(P, [0, slide.x * 9, 0])); moving = true; }
  const busy = state.phase === "run" || (state.phase === "dwell" && state.playing) || moving || slide.back > 0;
  frame = visible && busy ? requestAnimationFrame(tick) : 0;
}
function kick() { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } }
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) kick(); }, { rootMargin: "120px 0px" }).observe(stage);

// ---- input -------------------------------------------------------------------------------
function takeOver() { state.auto = false; }
panel.addEventListener("click", (event) => {
  const pathButton = event.target.closest("[data-path]");
  if (pathButton) { state.playing = !still.matches; selectPath(+pathButton.dataset.path); return; }
  const hopButton = event.target.closest("[data-hop]");
  if (hopButton) { takeOver(); state.playing = false; startHop(+hopButton.dataset.hop); }
});
stage.addEventListener("keydown", (event) => {
  const path = paths[state.path];
  if (/^[1-7]$/.test(event.key)) { event.preventDefault(); state.playing = !still.matches; selectPath(+event.key - 1); return; }
  if (event.key === "ArrowRight") { event.preventDefault(); takeOver(); state.playing = false; startHop(state.hop + 1); }
  else if (event.key === "ArrowLeft") { event.preventDefault(); takeOver(); state.playing = false; startHop(state.hop - 1); }
  else if (event.key === "Home") { event.preventDefault(); takeOver(); state.playing = false; startHop(0); }
  else if (event.key === "End") { event.preventDefault(); takeOver(); state.playing = false; startHop(path.hops.length - 1); }
  else if (event.key === " ") { event.preventDefault(); takeOver(); state.playing = !state.playing; if (state.playing && state.phase === "end") startHop(0); kick(); say(); }
});
// Hover names the part under the pointer.
let hoverTimer = 0;
svg.addEventListener("pointermove", (event) => {
  const it = event.target.closest(".it[data-st]");
  if (!it) return;
  const s = stations[it.dataset.st];
  say(`${s.name} · ${s.part}`);
  clearTimeout(hoverTimer);
  hoverTimer = setTimeout(() => say(), 1600);
});
svg.addEventListener("pointerleave", () => { clearTimeout(hoverTimer); say(); });

Object.keys(pointer).forEach(drawPointer);
selectPath(0, { auto: !still.matches });
if (still.matches) { state.playing = false; }
