// Fig 1 · After BrockDB, request paths: the target architecture built as a pneumatic tube
// installation on a bench. Every request is a carrier; it can only travel where a tube is laid.
// node build.mjs            writes after-brockdb.html (the artifact) and two local check pages
// node build.mjs --audit    also proves the geometry (kit/audit.mjs)
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { tubePieces } from "../kit/tube.mjs";
import * as A from "../kit/audit.mjs";
import { kitScript } from "../scripts/inline-kit.mjs";
import { STATIONS, TUBES, PATHS, PRINCIPLES, ROLES, TODAY, AFTER, ENDING, checkModel } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const problems = checkModel();
if (problems.length) throw new Error(problems.join("\n"));

const W = 1040;
const H = 560;
const AZIMUTH = 68;
const ELEVATION = 38;

// ---------------------------------------------------------------------------------------------
// World. x runs along the bench, y toward the viewer, z up; about 1 unit per px.
const TZ = 16; // tube axis height
const TR = 3; // tube radius
const FL = 1.6; // flange thickness
const PLATE_H = 10;
const FOOT_H = 6;
const BROCK = { x: 150, y: 0, w: 680, d: 400, r: 8 };
const ELLU = { x: 0, y: 0, w: 146, d: 400, r: 8 };
const JOINT_X = 148;

const SITES = {
  EXP: { plan: { x: 34, y: 24, w: 72, d: 44, r: 2 }, h: 26 },
  ETHOS: { plan: { x: 42, y: 128, w: 56, d: 48, r: 2 }, h: 26 },
  BANNER: { plan: { x: 30, y: 232, w: 80, d: 58, r: 2 }, h: 40 },
  PP: { plan: { x: 262, y: 22, w: 140, d: 42, r: 2 }, h: 26 },
  AI: { plan: { x: 428, y: 26, w: 46, d: 36, r: 2 }, h: 26 },
  PBI: { plan: { x: 556, y: 24, w: 66, d: 44, r: 2 }, h: 24 },
  DOOR1: { plan: { x: 226, y: 122, w: 256, d: 60, r: 3 }, h: 34 },
  WD: { plan: { x: 240, y: 236, w: 56, d: 42, r: 2 }, h: 30 },
  APPS: { plan: { x: 326, y: 236, w: 56, d: 42, r: 2 }, h: 30 },
  CAMPUS: { plan: { x: 408, y: 236, w: 80, d: 42, r: 2 }, h: 24 },
  VENDOR: { plan: { x: 514, y: 240, w: 44, d: 36, r: 2 }, h: 26 },
  DOOR2: { plan: { x: 180, y: 322, w: 420, d: 44, r: 3 }, h: 30 },
  SIGNIN: { plan: { x: 704, y: 30, w: 72, d: 56, r: 2 }, h: 24 },
  REGISTER: { plan: { x: 704, y: 114, w: 72, d: 62, r: 2 }, h: 22 },
  WATCH: { plan: { x: 704, y: 204, w: 72, d: 60, r: 2 }, h: 24 },
  ARCHIVE: { plan: { x: 704, y: 292, w: 72, d: 68, r: 2 }, h: 38 },
};
const centreOf = (id) => {
  const { plan, h } = SITES[id];
  return [plan.x + plan.w / 2, plan.y + plan.d / 2, h / 2];
};

const z = TZ;
const ROUTE_POINTS = {
  T1: [[70, 68, z], [70, 128, z]],
  T2: [[70, 176, z], [70, 232, z]],
  T3: [[332, 64, z], [332, 122, z]],
  T4: [[226, 152, z], [98, 152, z]],
  T5: [[106, 46, z], [246, 46, z], [246, 122, z]],
  T6: [[268, 182, z], [268, 236, z]],
  T7: [[354, 182, z], [354, 236, z]],
  T8: [[448, 182, z], [448, 236, z]],
  T9: [[482, 160, z], [536, 160, z], [536, 240, z]],
  T10: [[70, 290, z], [70, 344, z], [180, 344, z]],
  T11: [[268, 278, z], [268, 322, z]],
  T12: [[354, 278, z], [354, 322, z]],
  T13: [[448, 278, z], [448, 322, z]],
  T14: [[536, 276, z], [536, 322, z]],
  T15: [[600, 344, z], [664, 344, z], [664, 46, z], [622, 46, z]],
  T16: [[514, 258, z], [488, 258, z]],
  T17: [[451, 62, z], [451, 122, z]],
};
const BULKHEAD = { x0: JOINT_X - 5, x1: JOINT_X + 5 };
const STANDOFFS = { T4: [[190, 152], [120, 152]], T5: [[200, 46], [124, 46], [246, 88]], T10: [[118, 344]], T15: [[664, 296], [664, 228], [664, 92]], T9: [[536, 206]] };
const COLLAR = 1.2;
// The vendor pipe's flow indicator: a sight glass the watch panel reads. Arc length from its start.
const SIGHT = { T16: 19.5 };
const BULKHEAD_Y = { T5: 46, T4: 152, T10: 344 };

// ---------------------------------------------------------------------------------------------
// Camera.
const P = k.fitProjection(
  [
    ...k.boxCorners({ x: ELLU.x, y: BROCK.y, w: BROCK.x + BROCK.w - ELLU.x, d: BROCK.d, r: 0 }, -PLATE_H - FOOT_H, 0),
    ...Object.values(SITES).flatMap(({ plan, h }) => k.boxCorners(plan, 0, h + 16)),
  ],
  W,
  H,
  { pad: 26, azimuth: AZIMUTH, elevation: ELEVATION },
);
const V = G.viewOf(P);
const KS = G.scaleOf(P);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const path3 = (points, closed = false) => k.pathOf(points.map(at), closed);
const f2 = (v) => Math.round(v * 100) / 100;

// ---------------------------------------------------------------------------------------------
// Recorder: every drawn item records its true shape, so A.settle can order it and the audit
// can prove it.
const R = A.recorder(P);
const record = R.solid;
function put(name, ref, svg, shapes = [], { bias = 0, st, attrs = "", cls = "" } = {}) {
  const tags = `${st ? ` data-st="${st}"` : ""}${cls ? ` data-cls="${cls}"` : ""}${attrs}`;
  return R.put({ name: R.nameFor(name), at: ref, bias, svg, shapes, piece: "bench", attrs: tags });
}
function box(name, plan, z0, h, style = {}, { steps = 3, bevel = 0, inner = "", extra = "", bias = 0, st, attrs, cls, owner } = {}) {
  const shape = record(A.slab(plan, z0, h, { name, owner }, steps));
  const centre = [plan.x + plan.w / 2, plan.y + plan.d / 2, z0 + h / 2];
  put(name, centre, S(k.slabOf(plan, z0, h, P, steps, bevel), { tone: "mid", ...style, inner }) + extra, [shape], { bias, st, attrs, cls });
  return shape;
}
function cyl(name, cx, cy, r, z0, h, style = {}, { steps = 24, bevel = 0, inner = "", extra = "", bias = 0, st, attrs, cls, owner } = {}) {
  const shape = record(A.cylinder(cx, cy, r, z0, h, { name, owner }));
  put(name, [cx, cy, z0 + h / 2], S(k.cylinder(cx, cy, r, z0, h, P, steps, bevel), { tone: "mid", ...style, inner }) + extra, [shape], { bias, st, attrs, cls });
  return shape;
}
function disc(name, F, s0, s1, r, style = {}, { extra = "", bias = 0, st, attrs, cls, owner, bevel = 0 } = {}) {
  const shape = record(A.disc(F, s0, s1, r, { name, owner }));
  put(name, G.add3(F.o, G.mul3(F.a, (s0 + s1) / 2)), S(G.disc(s0, s1, r, F, P, { bevel }), { tone: "mid", ...style }) + extra, [shape], { bias, st, attrs, cls });
  return shape;
}
function ball(name, c, r, style = {}, { bias = 0, st, attrs, cls, extra = "", owner } = {}) {
  const shape = record(A.ball(c, r, { name, owner }));
  put(name, c, S(G.sphereOf(c, r, P, { steps: 32 }), { tone: "mid", ...style }) + extra, [shape], { bias, st, attrs, cls });
  return shape;
}
// A dome: a quarter circle turned about z, standing on z0. Lamps, the agent's eye.
function dome(name, cx, cy, z0, r, style = {}, { st, attrs, cls, owner, bias = 0 } = {}) {
  const F = G.frameOf([cx, cy, z0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  const profile = [];
  for (let i = 0; i <= 8; i++) {
    const t = (i / 8) * (Math.PI / 2);
    profile.push([r * Math.sin(t), r * Math.cos(t), i > 0 && i < 8 ? 1 : 0]);
  }
  const shape = record(A.solid(F, profile.map(([a, b]) => [a, b]), { name, owner }));
  put(name, [cx, cy, z0 + r / 2], S(G.solidOf(profile, F, P), { tone: "hi", ...style }), [shape], { bias, st, attrs, cls });
  return shape;
}
const XF = (o = [0, 0, 0]) => G.frameOf(o, [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const YF = (o = [0, 0, 0]) => G.frameOf(o, [0, 1, 0], [1, 0, 0], [0, 0, 1]);
function prism(name, F, poly, s0, s1, style = {}, { extra = "", inner = "", bias = 0, st, attrs, cls } = {}) {
  const shape = record(A.prism(F, poly, s0, s1, { name }));
  const cu = poly.reduce((a, p) => a + p[0], 0) / poly.length;
  const cv = poly.reduce((a, p) => a + p[1], 0) / poly.length;
  const centre = G.add3(G.add3(G.add3(F.o, G.mul3(F.a, (s0 + s1) / 2)), G.mul3(F.u, cu)), G.mul3(F.v, cv));
  put(name, centre, S(G.prismOf(F, poly, s0, s1, P), { tone: "mid", ...style, inner }) + extra, [shape], { bias, st, attrs, cls });
  return shape;
}
// Lines on the two faces we see: the front (+y) face and the right (+x) face.
const frontRect = (y, x0, x1, z0, z1) => path3([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], true);
const sideRect = (x, y0, y1, z0, z1) => path3([[x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1]], true);
const frontLine = (y, x0, x1, zz) => path3([[x0, y, zz], [x1, y, zz]]);

// ---------------------------------------------------------------------------------------------
// The bench: Brock's long plate, Ellucian's own plate bolted to its left end.
const back = [];
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
back.push(`<path class="iso-halo" d="${k.haloOf({ x: 0, y: 0, w: BROCK.x + BROCK.w, d: BROCK.d, r: 8 }, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`);
const feet = [...k.corners(ELLU, 20), ...k.corners(BROCK, 22), [BROCK.x + BROCK.w / 2, BROCK.y + 22], [BROCK.x + BROCK.w / 2, BROCK.y + BROCK.d - 22]];
for (const [x, y] of byDepth(feet)) {
  back.push(S(k.cylinder(x, y, 8, -PLATE_H - FOOT_H, 1.8, P, 28), { tone: "lo" }));
  back.push(S(k.cylinder(x, y, 6, -PLATE_H - FOOT_H + 1.8, FOOT_H - 1.8, P, 28), { tone: "mid" }));
}
for (const plate of byDepth([[ELLU.x, ELLU.y], [BROCK.x, BROCK.y]]).map(([x]) => (x === ELLU.x ? ELLU : BROCK))) {
  back.push(S(k.slabOf(plate, -PLATE_H, PLATE_H, P, 8, 1.4), { tone: "mid", inner: Ln(k.sideSeam(plate, -4, P, 8), { tone: "faint" }) }));
  record(A.slab(plate, -PLATE_H, PLATE_H, { name: plate === ELLU ? "stand.ellucian" : "stand.brock", ground: true }, 8));
}
// Brock's plate: one continuous groove. Ellucian's plate: a rivet line, its own finish.
back.push(Ln(k.planOutline(k.insetPlan(BROCK, 6), 0, P), { tone: "lo" }));
{
  const inner = k.insetPlan(ELLU, 6);
  const rivets = [];
  for (let x = inner.x + 4; x <= inner.x + inner.w - 3; x += 6.2) rivets.push([x, inner.y], [x, inner.y + inner.d]);
  for (let y = inner.y + 6.2; y <= inner.y + inner.d - 4; y += 6.2) rivets.push([inner.x, y], [inner.x + inner.w, y]);
  back.push(Dots(rivets.map(([x, y]) => at([x, y, 0])), { size: 0.45, tone: "lo" }));
}
{
  const holes = [];
  for (let x = BROCK.x + 16; x <= BROCK.x + BROCK.w - 14; x += 16) for (let y = 16; y <= BROCK.d - 26; y += 16) holes.push(at([x, y, 0]));
  back.push(Dots(holes, { size: 0.42, tone: "faint" }));
}
for (const plate of [ELLU, BROCK]) {
  const screws = k.corners(plate, 11);
  back.push(Ln(screws.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(""), { tone: "lo" }));
  back.push(Dots(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
}
// Ruler strip along the front edge of Brock's plate, and a label plate.
const STRIP = { x: BROCK.x + 16, y: BROCK.y + BROCK.d - 13, w: 470, d: 6, r: 1 };
back.push(S(k.slabOf(STRIP, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
{
  const ticks = k.topTicks(STRIP.x + 4, STRIP.x + STRIP.w - 4, 5, 5, STRIP.y, 0.6, [1.8, 3.4], P);
  back.push(Ln(ticks.minor, { tone: "lo" }), Ln(ticks.major, { tone: "mid" }));
  back.push(Dots([at([STRIP.x + 2, STRIP.y + 3, 0.6]), at([STRIP.x + STRIP.w - 2, STRIP.y + 3, 0.6])], { size: 0.45 }));
}
const LABEL = { x: 690, y: BROCK.d - 30, w: 54, d: 16, r: 1.2 };
back.push(S(k.slabOf(LABEL, 0, 0.8, P, 4), { tone: "lo" }));
back.push(Ln(k.planOutline(k.insetPlan(LABEL, 1.6), 0.8, P, 4), { tone: "faint" }));
back.push(k.faceTextSvg(k.topMatrix([LABEL.x + 5, LABEL.y + 7.4], 0.8, P, "x"), "AFTER BROCKDB", { size: 3.4, tone: "mid" }));
back.push(Ln(k.lineOnTop([LABEL.x + 5, LABEL.y + 11.4], [LABEL.x + 34, LABEL.y + 11.4], 0.8, P), { tone: "lo", free: true }));
back.push(Dots([at([LABEL.x + 2.6, LABEL.y + LABEL.d / 2, 0.8]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d / 2, 0.8])], { size: 0.45 }));
// Joint plates: two steel straps bolt Ellucian's plate to Brock's, front and back.
for (const y of [6, BROCK.d - 18]) box("joint.strap", { x: JOINT_X - 9, y, w: 18, d: 12, r: 1 }, 0, 1.4, { tone: "lo" }, { steps: 2, bevel: 0.3, extra: Dots([[JOINT_X - 5, y + 6], [JOINT_X + 5, y + 6]].map(([x, yy]) => at([x, yy, 1.4])), { size: 0.45 }) });

// ---------------------------------------------------------------------------------------------
// The border: a low rail along the joint, and one bulkhead frame for every tube that crosses.
box("border.rail", { x: JOINT_X - 3, y: 22, w: 6, d: BROCK.d - 44, r: 1 }, 0, 4, { tone: "lo" }, { steps: 2, bevel: 0.4, attrs: ' data-mark="bulkhead"' });
for (const [tube, y] of Object.entries(BULKHEAD_Y)) {
  const frame = { x: BULKHEAD.x0, y: y - 11, w: BULKHEAD.x1 - BULKHEAD.x0, d: 22, r: 1.2 };
  box(`border.frame.${tube}`, frame, 4, TZ + 10 - 4, { tone: "mid" }, { steps: 2, bevel: 0.5, attrs: ` data-mark="bulkhead" data-tube="${tube}"`, extra: Dots([[frame.x + 2.4, y - 7.6], [frame.x + 2.4, y + 7.6], [frame.x + frame.w - 2.4, y - 7.6], [frame.x + frame.w - 2.4, y + 7.6]].map(([x, yy]) => at([x, yy, TZ + 10])), { size: 0.45 }) });
}

// ---------------------------------------------------------------------------------------------
// Tubes. Each route ends on a station face; a flange sits on each end, a bulkhead fitting on
// each face of a frame it passes, and the tube is gapped under every one of them.
const ROUTES = {};
const CHUNKS = {};
// The arc length on a route nearest a floor point.
function sNear(route, [x, y]) {
  let best = 0;
  let gap = Infinity;
  let s = 0;
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1];
    const b = route[i];
    const len = G.len3(G.sub3(b, a));
    const t = len ? Math.max(0, Math.min(1, ((x - a[0]) * (b[0] - a[0]) + (y - a[1]) * (b[1] - a[1])) / (len * len))) : 0;
    const d = Math.hypot(a[0] + (b[0] - a[0]) * t - x, a[1] + (b[1] - a[1]) * t - y);
    if (d < gap) { gap = d; best = s + t * len; }
    s += len;
  }
  return best;
}
function crossings(route, axis, value) {
  const out = [];
  let s = 0;
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1];
    const b = route[i];
    const len = G.len3(G.sub3(b, a));
    if ((a[axis] - value) * (b[axis] - value) < 0) out.push(s + (len * (value - a[axis])) / (b[axis] - a[axis]));
    s += len;
  }
  return out;
}
for (const [id, points] of Object.entries(ROUTE_POINTS)) {
  const route = G.fillet(points, 9, 12, { P, tube: TR });
  const total = G.pathLength(route);
  const gaps = [[0, FL], [total - FL, total]];
  const fittings = [];
  if (TUBES[id].border) {
    const [a, b] = [crossings(route, 0, BULKHEAD.x0)[0], crossings(route, 0, BULKHEAD.x1)[0]].sort((p, q) => p - q);
    gaps.push([a - FL, b + FL]);
    fittings.push([a - FL, a], [b, b + FL]);
  }
  const collars = (STANDOFFS[id] ?? []).map((xy) => sNear(route, xy));
  for (const c of collars) gaps.push([c - COLLAR, c + COLLAR]);
  if (SIGHT[id]) gaps.push([SIGHT[id] - 2.4, SIGHT[id] + 2.4]);
  gaps.sort((p, q) => p[0] - q[0]);
  ROUTES[id] = { route, total, gaps };
  R.route(id, route, TR, { gaps, piece: "bench" });
  const pieces = tubePieces(route, TR, P, { maxLength: 14, spacing: 2.2, gaps });
  CHUNKS[id] = [];
  pieces.forEach((piece, index) => {
    const shine = piece.wide ? `<path class="tb-shine" d="${piece.shine}"/><path class="tb-shade" d="${piece.shade}"/>` : "";
    const svg = `<g class="tb"><path class="tb-body" d="${piece.body}"/>${shine}<path class="iso-line tb-edge" data-tone="hi" d="${piece.edges}"/></g>`;
    put(`${id}.chunk`, piece.mid, svg, [A.tube(piece.points, piece.radii)], { attrs: ` data-tube="${id}" data-chunk="${index}"` });
    CHUNKS[id].push({ from: f2(piece.from), to: f2(piece.to), index });
  });
  // End flanges on the station faces.
  [0, 1].forEach((end) => {
    const s = end ? total : 0;
    const tangent = G.tangentAlong(route, s);
    const F = G.frameAlong(G.pointAlong(route, s), tangent);
    const [s0, s1] = end ? [-FL, 0] : [0, FL];
    const station = end ? TUBES[id].to : TUBES[id].from;
    const faceDots = Dots(G.dotsOf(F, end ? s0 : s1, TR + 1.4, 6, P, { fade: [0.04, 0.42] }), { size: 0.4, tone: "mid" });
    disc(`${id}.flange${end}`, F, s0, s1, TR + 2.4, { tone: "mid" }, { owner: id, extra: faceDots, st: station, attrs: ` data-tube="${id}"`, bias: 0.05 });
  });
  for (const c of collars) {
    const point = G.pointAlong(route, c);
    const F = G.frameAlong(point, G.tangentAlong(route, c));
    disc(`${id}.collar`, F, -COLLAR, COLLAR, TR + 1.5, { tone: "mid" }, { owner: id, attrs: ` data-tube="${id}"`, bias: 0.05, bevel: 0.2, extra: Dots([at([point[0], point[1], point[2] + TR + 1.5])], { size: 0.4, tone: "mid" }) });
    const top = point[2] - TR - 1.5;
    cyl(`${id}.post`, point[0], point[1], 1.3, 1.2, top - 1.2, { tone: "mid" }, { owner: id, steps: 14, attrs: ` data-tube="${id}"` });
    cyl(`${id}.foot`, point[0], point[1], 3, 0, 1.2, { tone: "lo" }, { owner: id, steps: 20, attrs: ` data-tube="${id}"`, extra: Dots([[point[0] - 2, point[1]], [point[0] + 2, point[1]]].map(([x, y]) => at([x, y, 1.2])), { size: 0.35, tone: "mid" }) });
  }
  if (SIGHT[id]) {
    const c = SIGHT[id];
    const point = G.pointAlong(route, c);
    const F = G.frameAlong(point, G.tangentAlong(route, c));
    const ring = (s0) => Ln(G.arcOf(F, s0, TR + 1.9, P), { tone: "lo" });
    disc(`${id}.sight`, F, -2.4, 2.4, TR + 1.9, { tone: "hi" }, { owner: id, attrs: ` data-tube="${id}" data-mark="glass"`, bias: 0.05, extra: ring(-1.2) + ring(1.2) });
  }
  for (const [s0, s1] of fittings) {
    const F = G.frameAlong(G.pointAlong(route, (s0 + s1) / 2), G.tangentAlong(route, (s0 + s1) / 2));
    disc(`${id}.fitting`, F, -(s1 - s0) / 2, (s1 - s0) / 2, TR + 2.8, { tone: "mid" }, { owner: id, attrs: ` data-tube="${id}" data-mark="bulkhead"`, bias: 0.05 });
  }
}

// ---------------------------------------------------------------------------------------------
// Station parts.
function lamp(id, x, y, top, { name = "lamp", r = 2.2, cls } = {}) {
  cyl(`${id}.${name}.base`, x, y, r + 0.8, top, 1.2, { tone: "mid" }, { st: id, steps: 18, cls, owner: `${id}.${name}` });
  dome(`${id}.${name}`, x, y, top + 1.2, r, { tone: "hi" }, { st: id, attrs: ` data-lamp="${id}"`, bias: 0.05, owner: `${id}.${name}` });
}
function body(id, { tone = "mid", seam = true, lidInset = 1.4, plinth = true, cls, extra = "", lidExtra = "" } = {}) {
  const { plan, h } = SITES[id];
  const z0 = plinth ? 3 : 0;
  if (plinth) {
    const base = k.insetPlan(plan, -2.2);
    box(`${id}.plinth`, base, 0, 3, { tone: "lo" }, { st: id, steps: 3, bevel: 0.4, cls, extra: Dots(k.corners(base, 1.1).map(([x, y]) => at([x, y, 3])), { size: 0.4, tone: "mid" }) });
  }
  const inner = seam ? Ln(k.sideSeam(plan, h - 8, P, 3), { tone: "faint" }) : "";
  box(`${id}.body`, plan, z0, h - z0 - 2, { tone }, { st: id, steps: 3, bevel: 0.7, inner, cls, extra });
  const lid = k.insetPlan(plan, lidInset);
  const screws = k.corners(lid, 3);
  box(`${id}.lid`, lid, h - 2, 2, { tone }, { st: id, steps: 3, bevel: 0.5, cls, extra: Dots(screws.map(([x, y]) => at([x, y, h])), { size: 0.42, tone: "mid" }) + lidExtra });
}
// A hatch on the front face: a door plate with a window and a pull.
function hatch(id, x0, x1, z0, z1, { cls } = {}) {
  const { plan } = SITES[id];
  const y = plan.y + plan.d;
  const door = { x: x0, y: y - 0.2, w: x1 - x0, d: 1.4, r: 0.4 };
  const face = y + 1.2;
  const win = Ln(frontRect(face, x0 + 2.2, x1 - 2.2, z0 + (z1 - z0) * 0.45, z1 - 2.2), { tone: "lo" });
  const hinge = Dots([at([x0 + 1.1, face, z0 + 2]), at([x0 + 1.1, face, z1 - 2])], { size: 0.4, tone: "mid" });
  box(`${id}.hatch`, door, z0, z1 - z0, { tone: "mid" }, { st: id, steps: 2, bevel: 0.3, cls, extra: win + hinge });
  box(`${id}.pull`, { x: x1 - 5, y: face, w: 3, d: 1.2, r: 0.4 }, z0 + (z1 - z0) * 0.25, 2, { tone: "mid" }, { st: id, steps: 2, cls });
}
// A badge reader on the right face: every carrier is read here, so it carries an identity.
function reader(id, y, zc, { cls } = {}) {
  const { plan } = SITES[id];
  const x = plan.x + plan.w;
  const R0 = { x: x - 0.2, y: y - 4.5, w: 2.2, d: 9, r: 0.6 };
  const slot = path3([[x + 2, y - 2.6, zc + 2.2], [x + 2, y + 2.6, zc + 2.2]]);
  box(`${id}.reader`, R0, zc - 4, 8.5, { tone: "mid" }, { st: id, steps: 2, bevel: 0.3, cls, attrs: ` data-reader="${id}"`, extra: Ln(slot, { tone: "lo" }) + Dots([at([x + 2, y + 2.8, zc - 1.6])], { size: 0.55, tone: "hi" }) });
}
// A label plate on the right face, three rule lines standing for its printed text.
function plateOnSide(id, y0, y1, z0, z1, { cls } = {}) {
  const { plan } = SITES[id];
  const x = plan.x + plan.w;
  box(`${id}.plate`, { x: x - 0.2, y: y0, w: 0.8, d: y1 - y0, r: 0.3 }, z0, z1 - z0, { tone: "lo" }, {
    st: id,
    steps: 2,
    cls,
    extra:
      Ln([0.3, 0.55, 0.78].map((t, i) => path3([[x + 0.6, y0 + 2, z1 - (z1 - z0) * t], [x + 0.6, y0 + 2 + (y1 - y0 - 4) * [0.9, 0.6, 0.75][i], z1 - (z1 - z0) * t]])).join(""), { tone: "lo", free: true }) +
      Dots([at([x + 0.6, y0 + 1, (z0 + z1) / 2]), at([x + 0.6, y1 - 1, (z0 + z1) / 2])], { size: 0.35, tone: "mid" }),
  });
}

// --- Ellucian Experience: a student kiosk with a sloped card screen.
{
  const id = "EXP";
  const { plan, h } = SITES[id];
  body(id);
  hatch(id, plan.x + 46, plan.x + 66, 5, 20);
  reader(id, plan.y + plan.d - 9, 14);
  // The screen: a wedge on the lid, its face tilted toward the viewer, showing six cards.
  const F = XF([0, 0, 0]);
  const y0 = plan.y + 8;
  const y1 = plan.y + plan.d - 8;
  const wedge = [[y0, h], [y1, h], [y0 + 6, h + 15], [y0, h + 15]];
  const xs = [plan.x + 8, plan.x + plan.w - 8];
  const corner = (u, v) => [xs[0] + (xs[1] - xs[0]) * u, y1 + (y0 + 6 - y1) * v, h + 15 * v];
  let cards = "";
  for (let r = 0; r < 2; r++)
    for (let c = 0; c < 3; c++) {
      const u0 = 0.08 + c * 0.3;
      const v0 = 0.14 + r * 0.42;
      cards += `<path class="exp-card" data-card="${r * 3 + c}" d="${path3([corner(u0, v0), corner(u0 + 0.26, v0), corner(u0 + 0.26, v0 + 0.34), corner(u0, v0 + 0.34)], true)}"/>`;
    }
  const frame = Ln(path3([corner(0.03, 0.06), corner(0.97, 0.06), corner(0.97, 0.94), corner(0.03, 0.94)], true), { tone: "lo" });
  prism(`${id}.screen`, F, wedge, xs[0], xs[1], { tone: "mid" }, { st: id, extra: frame + `<g data-mark="card">${cards}</g>` });
  lamp(id, plan.x + plan.w - 6, plan.y + 6, h);
}

// --- Ethos: Ellucian's exchange, a drum diverter on a base.
{
  const id = "ETHOS";
  const { plan, h } = SITES[id];
  // Ellucian runs it: a riveted housing, the same rivet line as Ellucian's plate.
  const zr = h - 5;
  const rivets = [];
  for (let x = plan.x + 3; x <= plan.x + plan.w - 3; x += 4.4) rivets.push([x, plan.y + plan.d, zr]);
  for (let y = plan.y + 3; y <= plan.y + plan.d - 3; y += 4.4) rivets.push([plan.x + plan.w, y, zr]);
  // The hold: Ellucian's workflow parks a carrier here until the Associate Dean approves it.
  const hold = [plan.x + plan.w - 8, plan.y + plan.d - 8];
  body(id, { extra: Dots(rivets.map(at), { size: 0.42, tone: "mid" }), lidExtra: Ln(k.ring(hold[0], hold[1], 2.6, h, P, 20), { tone: "lo" }) + `<g data-mark="hold">${Dots([at([hold[0], hold[1], h])], { size: 1.3, tone: "hi" })}</g>` });
  const [cx, cy] = [plan.x + plan.w / 2, plan.y + plan.d / 2];
  const ticks = k.radialTicks(cx, cy, 13.2, 36, 3, h + 7, [1, 2.2], P);
  const index = `<path class="iso-line" data-tone="hi" data-pointer="${id}" data-free="end" d="${k.lineOnTop([cx, cy + 6], [cx, cy + 11.4], h + 7, P)}" style="stroke-width:1"/>`;
  cyl(`${id}.drum`, cx, cy, 15, h, 7, { tone: "mid" }, { st: id, steps: 48, bevel: 0.6, inner: Ln(k.sideArc(cx, cy, 15, h + 3.5, P, 40), { tone: "faint" }), extra: Ln(ticks.minor, { tone: "lo" }) + Ln(ticks.major, { tone: "mid" }) + index });
  cyl(`${id}.cap`, cx, cy, 6, h + 7, 1.6, { tone: "mid" }, { st: id, steps: 28, bevel: 0.3 });
  hatch(id, plan.x + 4, plan.x + 20, 5, 19);
  lamp(id, plan.x + plan.w - 6, plan.y + 6, h, { r: 2 });
}

// --- Banner: Ellucian's vault cabinet. Knobs set its configuration; its database port is capped.
{
  const id = "BANNER";
  const { plan, h } = SITES[id];
  body(id);
  // Configuration knobs on the lid: configured, not customised.
  [0, 1, 2, 3].forEach((i) => {
    const x = plan.x + 14 + i * 13;
    const y = plan.y + plan.d - 14;
    cyl(`${id}.knob`, x, y, 4, h, 3.2, { tone: "mid" }, { st: id, steps: 28, extra: Ln(k.knurl(x, y, 4, h, h + 3.2, 24, P), { tone: "lo" }) + Ln(k.lineOnTop([x, y], [x + 3.2 * Math.sin(i * 1.3 + 0.4), y - 3.2 * Math.cos(i * 1.3 + 0.4)], h + 3.2, P), { tone: "hi", free: "end" }), attrs: ' data-mark="dials"' });
  });
  // The release cartridge, in the front face.
  const cart = { x: plan.x + 6, y: plan.y + plan.d - 0.2, w: 26, d: 1.6, r: 0.4 };
  box(`${id}.cartridge`, cart, 24, 10, { tone: "mid" }, { st: id, steps: 2, bevel: 0.3, attrs: ' data-mark="cartridge"', extra: Ln(frontRect(cart.y + 1.6, cart.x + 2, cart.x + cart.w - 2, 26.5, 31.5), { tone: "lo" }) + Dots([at([cart.x + cart.w / 2, cart.y + 1.6, 29])], { size: 0.5 }) });
  hatch(id, plan.x + 52, plan.x + 74, 6, 26);
  // The capped database port on the right face, toward Brock: a blind flange with a wire seal.
  const PORT = G.frameAlong([plan.x + plan.w, plan.y + 20, 22], [1, 0, 0]);
  disc(`${id}.boss`, PORT, 0, 1.2, 7.4, { tone: "mid" }, { st: id });
  const bolts = Dots(G.dotsOf(PORT, 3.4, 5.4, 6, P, { all: true }), { size: 0.45, tone: "mid" });
  disc(`${id}.blind`, PORT, 1.2, 3.4, 6.6, { tone: "mid" }, { st: id, attrs: ' data-mark="seal"', extra: bolts, bias: 0.05 });
  {
    const xs = plan.x + plan.w + 3.4;
    const wire = [[xs, plan.y + 15.5, 18], [xs + 0.2, plan.y + 17, 11], [xs, plan.y + 24.5, 18]];
    put(`${id}.seal`, [xs, plan.y + 20, 14], Ln(path3(wire), { tone: "mid" }) + `<g data-mark="seal">${Dots([at([xs + 0.2, plan.y + 17, 11])], { size: 1.1, tone: "hi" })}</g>`, [record(A.tube(wire, 0.35, { name: `${id}.seal` }))], { st: id, bias: 0.4 });
  }
  lamp(id, plan.x + plan.w - 7, plan.y + 7, h);
}

// --- Power Platform: a staff rack of three send stations on one manifold.
{
  const id = "PP";
  const { plan, h } = SITES[id];
  body(id);
  const slots = [["coop", 0], ["teams", 1], ["dept", 2]];
  for (const [slot, i] of slots) {
    const sx = plan.x + 10 + i * 42;
    const sp = { x: sx, y: plan.y + 8, w: 34, d: 26, r: 1.4 };
    box(`${id}.slot.${slot}`, sp, h, 12, { tone: slot === "dept" ? "lo" : "mid" }, { st: id, steps: 3, bevel: 0.5, attrs: ` data-mark="slot-${slot}"`, extra: Ln(frontRect(sp.y + sp.d, sp.x + 4, sp.x + sp.w - 4, h + 3, h + 9.6), { tone: "lo" }) + Dots([at([sp.x + sp.w - 3, sp.y + sp.d, h + 10.6])], { size: 0.5, tone: "mid" }) });
    lamp(id, sx + sp.w - 5, sp.y + 5, h + 12, { name: `lamp.${slot}`, r: 1.6 });
  }
  // The rest of the outlets are capped: the data policy blocks every connector but the gateway.
  [plan.x + plan.w - 34, plan.x + plan.w - 18].forEach((x, i) => {
    const F = G.frameAlong([x, plan.y + plan.d, 10], [0, 1, 0]);
    disc(`${id}.cap`, F, 0, 2.2, 3.4, { tone: "lo" }, { st: id, attrs: ' data-mark="caps"', extra: Dots([at([x, plan.y + plan.d + 2.2, 10])], { size: 0.6, tone: "mid" }) });
  });
  reader(id, plan.y + plan.d / 2, 13);
}

// --- AI assistant: a small agent terminal with its own badge.
{
  const id = "AI";
  const { plan, h } = SITES[id];
  body(id);
  cyl(`${id}.bezel`, plan.x + plan.w / 2, plan.y + plan.d / 2, 7.6, h, 1.6, { tone: "mid" }, { st: id, steps: 40, bevel: 0.3 });
  dome(`${id}.eye`, plan.x + plan.w / 2, plan.y + plan.d / 2, h + 1.6, 6.4, { tone: "mid" }, { st: id });
  cyl(`${id}.mast`, plan.x + 7, plan.y + 7, 0.9, h, 13, { tone: "mid" }, { st: id, steps: 12, owner: `${id}.mast` });
  dome(`${id}.tip`, plan.x + 7, plan.y + 7, h + 13, 1.6, { tone: "hi" }, { st: id, attrs: ` data-lamp="${id}"`, owner: `${id}.mast` });
  reader(id, plan.y + plan.d / 2, 13);
  box(`${id}.badge`, { x: plan.x + plan.w - 0.2, y: plan.y + 4, w: 1, d: 8, r: 0.5 }, 16, 7, { tone: "hi" }, { st: id, steps: 2, attrs: ' data-mark="badge"' });
}

// --- Power BI: a reading desk with a lectern and a lamp, for leaders.
{
  const id = "PBI";
  const { plan, h } = SITES[id];
  body(id);
  const F = XF([0, 0, 0]);
  const y0 = plan.y + 6;
  const y1 = plan.y + plan.d - 8;
  const on = (u, t, lift = 0) => [plan.x + 8 + (plan.w - 30) * u, y1 + (y0 + 4 - y1) * t, h + 10 * t + lift];
  const sheet = path3([on(0.1, 0.12, 0.15), on(0.9, 0.12, 0.15), on(0.9, 0.9, 0.15), on(0.1, 0.9, 0.15)], true);
  const rules = [0.3, 0.45, 0.6, 0.75].map((t, i) => path3([on(0.18, t, 0.2), on(0.18 + [0.62, 0.5, 0.58, 0.36][i], t, 0.2)])).join("");
  prism(`${id}.lectern`, F, [[y0, h], [y1, h], [y0 + 4, h + 10], [y0, h + 10]], plan.x + 8, plan.x + plan.w - 22, { tone: "mid" }, {
    st: id,
    extra: `<path class="pbi-sheet" d="${sheet}"/>` + Ln(rules, { tone: "lo", free: true }),
  });
  const lx = plan.x + plan.w - 10;
  const ly = plan.y + 10;
  plateOnSide(id, plan.y + 30, plan.y + 42, 5, 11);
  cyl(`${id}.lamp.base`, lx, ly, 4, h, 1.4, { tone: "mid" }, { st: id, steps: 20, owner: `${id}.lamp` });
  cyl(`${id}.lamp.post`, lx, ly, 1, h + 1.4, 14, { tone: "mid" }, { st: id, steps: 12, owner: `${id}.lamp` });
  cyl(`${id}.lamp.collar`, lx, ly, 2.4, h + 15.4, 1.2, { tone: "mid" }, { st: id, steps: 16, owner: `${id}.lamp` });
  dome(`${id}.lamp`, lx, ly, h + 16.6, 3.2, { tone: "hi" }, { st: id, attrs: ` data-lamp="${id}"`, owner: `${id}.lamp` });
}

// --- Door one: the central exchange. A big drum diverter, a reader on every inlet, a version window.
{
  const id = "DOOR1";
  const { plan, h } = SITES[id];
  body(id, { cls: "ink" });
  const [cx, cy] = [plan.x + plan.w / 2, plan.y + plan.d / 2];
  const ticks = k.radialTicks(cx, cy, 22, 48, 4, h + 9, [1.2, 2.6], P);
  const index = `<path class="iso-line" data-tone="hi" data-pointer="${id}" data-free="end" d="${k.lineOnTop([cx, cy + 9], [cx, cy + 19.4], h + 9, P)}" style="stroke-width:1.1"/>`;
  cyl(`${id}.drum`, cx, cy, 24, h, 9, { tone: "mid" }, { st: id, steps: 64, bevel: 0.6, cls: "ink", inner: Ln(k.sideArc(cx, cy, 24, h + 4.5, P, 48), { tone: "faint" }), extra: Ln(ticks.minor, { tone: "lo" }) + Ln(ticks.major, { tone: "mid" }) + index });
  cyl(`${id}.cap`, cx, cy, 9, h + 9, 2, { tone: "mid" }, { st: id, steps: 32, cls: "ink", bevel: 0.4 });
  // Version window on the front face.
  const y = plan.y + plan.d;
  const win = { x0: 384, x1: 416, z0: 15, z1: 25 };
  put(`${id}.version`, [win.x0 + 16, y + 0.2, 20], `<g data-mark="version"><path class="d1-window" d="${frontRect(y + 0.1, win.x0, win.x1, win.z0, win.z1)}"/><g class="d1-digits" data-version>${versionText(3)}</g></g>`, [record(A.box([win.x0, y - 0.1, win.z0], [win.x1, y + 0.3, win.z1], { name: `${id}.version` }))], { st: id, bias: 0.3, cls: "ink" });
  // Readers on the lid by each inlet from a front: every carrier is read as it enters.
  for (const [tube, x] of [["T5", 246], ["T3", 332], ["T17", 451]]) {
    box(`${id}.inlet`, { x: x - 6, y: plan.y + 3, w: 12, d: 7, r: 1 }, h, 3.4, { tone: "mid" }, { st: id, steps: 2, bevel: 0.3, cls: "ink", attrs: ` data-mark="reader" data-tube="${tube}"`, extra: Dots([at([x + 3.6, plan.y + 6.5, h + 3.4])], { size: 0.6, tone: "hi" }) + Ln(k.lineOnTop([x - 3.5, plan.y + 6.5], [x + 1.5, plan.y + 6.5], h + 3.4, P), { tone: "lo" }) });
  }
  const vents = [];
  for (const x0 of [plan.x + 14, plan.x + plan.w - 62]) for (let i = 0; i < 6; i++) vents.push(k.planOutline({ x: x0 + i * 7, y: plan.y + 22, w: 3, d: 22, r: 1.5 }, h, P, 3));
  put(`${id}.vents`, [cx, cy, h], Ln(vents.join(""), { tone: "lo" }), [record(A.box([plan.x + 14, plan.y + 22, h - 0.2], [plan.x + plan.w - 18, plan.y + 44, h + 0.05], { name: `${id}.vents` }))], { st: id, bias: 0.02, cls: "ink" });
  const np = { x: 282, y: y - 0.2, w: 48, d: 0.9, r: 0.3 };
  box(`${id}.nameplate`, np, 20, 8, { tone: "lo" }, { st: id, steps: 2, cls: "ink", extra: Ln([22.6, 24.6, 26.2].map((zz, i) => frontLine(y + 0.7, np.x + 3, np.x + 3 + [38, 27, 32][i], zz)).join(""), { tone: "mid", free: true }) + Dots([at([np.x + 1.4, y + 0.7, 24]), at([np.x + np.w - 1.4, y + 0.7, 24])], { size: 0.38, tone: "mid" }) });
  lamp(id, plan.x + plan.w - 8, plan.y + 8, h);
}
function versionText(n) {
  const y = SITES.DOOR1.plan.y + SITES.DOOR1.plan.d + 0.15;
  return k.faceTextSvg(k.sideMatrix([400, y], 17.4, P, "left"), `v${n}`, { size: 6.6, tone: "hi", anchor: "middle" });
}

// --- Workday, Brock's apps, campus systems, the new vendor product: receiving stations.
{
  const id = "WD";
  const { plan } = SITES[id];
  body(id);
  hatch(id, plan.x + 36, plan.x + 52, 6, 24);
  plateOnSide(id, plan.y + 8, plan.y + 22, 14, 22);
  lamp(id, plan.x + plan.w - 6, plan.y + 6, SITES[id].h);
}
{
  const id = "APPS";
  const { plan, h } = SITES[id];
  body(id);
  // A card file: three drawers on the front, each with a label holder.
  [0, 1, 2].forEach((i) => {
    const z0 = 5 + i * 7.4;
    const dr = { x: plan.x + 34, y: plan.y + plan.d - 0.2, w: 17, d: 1.4, r: 0.3 };
    box(`${id}.drawer`, dr, z0, 6.4, { tone: "mid" }, { st: id, steps: 2, bevel: 0.25, extra: Ln(frontRect(dr.y + 1.4, dr.x + 5, dr.x + 12, z0 + 3.4, z0 + 5.4), { tone: "lo" }) + Dots([at([dr.x + 8.5, dr.y + 1.4, z0 + 1.8])], { size: 0.45 }) });
  });
  plateOnSide(id, plan.y + 8, plan.y + 22, 14, 22);
  lamp(id, plan.x + plan.w - 6, plan.y + 6, h);
}
{
  const id = "CAMPUS";
  const { plan, h } = SITES[id];
  // One housing with four compartments: LMS, library, housing, payments. Seams run the full face.
  const y = plan.y + plan.d;
  const xs = [1, 2, 3].map((i) => plan.x + (i * plan.w) / 4);
  const seams = xs.map((x) => path3([[x, y, 3], [x, y, h - 2]])).join("") + xs.map((x) => path3([[x, plan.y, h], [x, plan.y + plan.d, h]])).join("");
  body(id, { seam: false, extra: Ln(xs.map((x) => path3([[x, y, 3], [x, y, h - 2]])).join(""), { tone: "faint" }), lidExtra: Ln(xs.map((x) => k.lineOnTop([x, plan.y + 1.4], [x, plan.y + plan.d - 1.4], h, P)).join(""), { tone: "faint" }) });
  const doors = [[plan.x + 3, plan.x + 17], [plan.x + 22, plan.x + 34], [plan.x + 46, plan.x + 58], [plan.x + 63, plan.x + 77]];
  doors.forEach(([x0, x1], i) => {
    const dr = { x: x0, y: y - 0.2, w: x1 - x0, d: 1.2, r: 0.3 };
    box(`${id}.door`, dr, 6, h - 12, { tone: "mid" }, { st: id, steps: 2, bevel: 0.25, extra: Ln(frontRect(y + 1, x0 + 2, x1 - 2, h - 12, h - 8.6), { tone: "lo" }) + Dots([at([x1 - 2, y + 1, 9])], { size: 0.4, tone: "mid" }) });
    lamp(id, (plan.x + (i * plan.w) / 4) + plan.w / 8, plan.y + 7, h, { name: `lamp${i}`, r: 1.4 });
  });
}
{
  const id = "VENDOR";
  const { plan, h } = SITES[id];
  body(id);
  hatch(id, plan.x + 29, plan.x + 41, 5, 20);
  plateOnSide(id, plan.y + 4, plan.y + 14, 9, 17);
  lamp(id, plan.x + plan.w - 6, plan.y + 6, h);
}

// --- Door two: the records cabinet. Raw, entities, certified, left to right, with owners' tags.
{
  const id = "DOOR2";
  const { plan, h } = SITES[id];
  body(id, { cls: "ink" });
  const y = plan.y + plan.d;
  const banks = [["raw", plan.x + 26, plan.x + 152], ["entities", plan.x + 160, plan.x + 280], ["certified", plan.x + 288, plan.x + 408]];
  for (const [layer, x0, x1] of banks) {
    const count = 5;
    const step = (x1 - x0) / count;
    for (let c = 0; c < count; c++)
      for (let r = 0; r < 2; r++) {
        const dx0 = x0 + c * step + 1;
        const dz0 = 5 + r * 10;
        const dr = { x: dx0, y: y - 0.2, w: step - 2, d: 1.4, r: 0.3 };
        box(`${id}.${layer}`, dr, dz0, 8.6, { tone: "mid" }, { st: id, steps: 2, bevel: 0.25, cls: "ink", attrs: ` data-mark="${layer}"`, extra: Ln(frontRect(y + 1.2, dx0 + step * 0.3, dx0 + step * 0.66, dz0 + 4.6, dz0 + 7), { tone: "lo" }) + Dots([at([dx0 + (step - 2) / 2, y + 1.2, dz0 + 2.2])], { size: 0.42, tone: "mid" }) });
      }
  }
  // Owners' tags hang from the certified bank: every certified model has a named owner.
  for (let c = 0; c < 5; c++) {
    const x = plan.x + 288 + (c + 0.5) * 24;
    const string = [[x - 2, y + 0.1, 26.6], [x, y + 2.4, 24], [x + 2, y + 0.1, 26.6]];
    put(`${id}.tag`, [x, y + 2, 25], Ln(path3(string), { tone: "lo" }) + Dots([at([x - 2, y, 26.6]), at([x + 2, y, 26.6])], { size: 0.45, tone: "mid" }) + `<path class="d2-tag" data-mark="owners" d="${path3([[x - 2.6, y + 2.6, 24], [x + 2.6, y + 2.6, 24], [x + 2.6, y + 2.6, 21], [x - 2.6, y + 2.6, 21]], true)}"/>`, [record(A.box([x - 2.6, y + 2.4, 21], [x + 2.6, y + 2.8, 24], { name: `${id}.tag` })), record(A.tube(string, 0.3, { name: `${id}.tag.string` }))], { st: id, bias: 0.4, cls: "ink" });
  }
  const vents = [];
  for (let i = 0; i < 14; i++) vents.push(k.planOutline({ x: plan.x + 30 + i * 7, y: plan.y + 12, w: 3, d: 18, r: 1.5 }, h, P, 3));
  put(`${id}.vents`, [plan.x + 80, plan.y + 21, h], Ln(vents.join(""), { tone: "lo" }), [record(A.box([plan.x + 30, plan.y + 12, h - 0.2], [plan.x + 124, plan.y + 30, h + 0.05], { name: `${id}.vents` }))], { st: id, bias: 0.02, cls: "ink" });
  for (const [layer, x0, x1] of banks) lamp(id, (x0 + x1) / 2, plan.y + plan.d - 6, h, { name: `lamp.${layer}`, r: 1.5, cls: "ink" });
  // The catalog: a card index on the lid that shows where every number came from.
  // An open card tray: a floor, four low walls, and index cards standing in it, two with tabs.
  const cat = { x: plan.x + plan.w - 62, y: plan.y + 7, w: 42, d: 26, r: 1.2 };
  const own = `${id}.catalog`;
  box(`${id}.catalog.floor`, cat, h, 1, { tone: "mid" }, { st: id, steps: 3, cls: "ink", bevel: 0.3 });
  const wall = (name, plan) => box(`${id}.catalog.${name}`, plan, h + 1, 4, { tone: "mid" }, { st: id, steps: 2, cls: "ink", bevel: 0.2 });
  wall("back", { x: cat.x, y: cat.y, w: cat.w, d: 1, r: 0.3 });
  wall("left", { x: cat.x, y: cat.y + 1, w: 1, d: cat.d - 2, r: 0.3 });
  for (let i = 0; i < 8; i++) {
    const cy = cat.y + 3 + i * 2.7;
    const tall = i === 2 || i === 6;
    box(`${id}.catalog.card`, { x: cat.x + 2, y: cy, w: cat.w - 4, d: 0.7, r: 0.2 }, h + 1, tall ? 8.4 : 7, { tone: "mid" }, { st: id, steps: 2, cls: "paper", attrs: ' data-mark="catalog"' });
    if (tall) box(`${id}.catalog.tab`, { x: cat.x + (i === 2 ? 6 : 24), y: cy, w: 9, d: 0.7, r: 0.2 }, h + 9.4, 1.8, { tone: "mid" }, { st: id, steps: 2, cls: "paper", attrs: ' data-mark="catalog"' });
  }
  wall("right", { x: cat.x + cat.w - 1, y: cat.y + 1, w: 1, d: cat.d - 2, r: 0.3 });
  wall("front", { x: cat.x, y: cat.y + cat.d - 1, w: cat.w, d: 1, r: 0.3 });
  lamp(id, plan.x + 10, plan.y + 8, h);
}

// --- The foundation: badge issuer, register printer, watch panel, archive safe.
{
  const id = "SIGNIN";
  const { plan, h } = SITES[id];
  body(id, { cls: "ink" });
  // A stack of blank badges on the lid, and the issue slot.
  for (let i = 0; i < 4; i++) box(`${id}.badges`, { x: plan.x + 12, y: plan.y + 10, w: 18, d: 12, r: 1 }, h + i * 0.9, 0.9, { tone: "mid" }, { st: id, steps: 2, cls: "ink" });
  box(`${id}.slot`, { x: plan.x + 40, y: plan.y + 14, w: 22, d: 6, r: 1 }, h, 3, { tone: "mid" }, { st: id, steps: 2, bevel: 0.3, cls: "ink", attrs: ' data-mark="badge"', extra: Ln(k.planOutline({ x: plan.x + 43, y: plan.y + 16, w: 16, d: 2, r: 1 }, h + 3, P, 3), { tone: "hi" }) });
  {
    const y = plan.y + plan.d;
    const cx = plan.x + plan.w / 2;
    box(`${id}.tray`, { x: cx - 13, y: y - 0.2, w: 26, d: 4.2, r: 0.8 }, 6, 1.4, { tone: "mid" }, { st: id, steps: 2, cls: "ink", bevel: 0.3 });
    put(`${id}.outslot`, [cx, y, 11], Ln(frontRect(y + 0.05, cx - 11, cx + 11, 10.2, 11.8), { tone: "lo" }), [record(A.box([cx - 11, y - 0.1, 10.2], [cx + 11, y + 0.1, 11.8], { name: `${id}.outslot` }))], { st: id, bias: 0.02, cls: "ink" });
    plateOnSide(id, plan.y + 16, plan.y + 34, 9, 17, { cls: "ink" });
  }
  lamp(id, plan.x + plan.w - 7, plan.y + plan.d - 9, h);
}
{
  const id = "REGISTER";
  const { plan, h } = SITES[id];
  body(id, { cls: "ink" });
  // A paper roll in a cradle, and the printed tape across the lid: one line per carrier.
  const RF = XF([0, plan.y + 16, h + 7]);
  box(`${id}.cradle`, { x: plan.x + 10, y: plan.y + 8, w: 3, d: 16, r: 0.6 }, h, 8, { tone: "mid" }, { st: id, steps: 2, cls: "ink" });
  box(`${id}.cradle`, { x: plan.x + plan.w - 13, y: plan.y + 8, w: 3, d: 16, r: 0.6 }, h, 8, { tone: "mid" }, { st: id, steps: 2, cls: "ink" });
  disc(`${id}.roll`, RF, plan.x + 13, plan.x + plan.w - 13, 6, { tone: "hi" }, { st: id, extra: Ln(G.arcOf(RF, plan.x + 30, 6, P), { tone: "faint" }) });
  const tape = { x: plan.x + 16, y: plan.y + 24, w: plan.w - 32, d: 32, r: 0.4 };
  let rows = "";
  for (let i = 0; i < 6; i++) {
    const yy = tape.y + 4 + i * 4.6;
    rows += `<path class="iso-line" data-tone="lo" data-free="" data-row="${i}" d="${k.lineOnTop([tape.x + 3, yy], [tape.x + tape.w * (0.55 + 0.35 * ((i * 37) % 10) / 10), yy], h + 0.6, P)}"/>`;
  }
  box(`${id}.tape`, tape, h, 0.6, { tone: "hi" }, { st: id, steps: 2, cls: "paper", attrs: ' data-mark="print"', extra: rows });
  {
    const y = plan.y + plan.d;
    box(`${id}.tearbar`, { x: plan.x + 12, y: y - 0.2, w: plan.w - 24, d: 1.6, r: 0.4 }, h - 5, 2.4, { tone: "mid" }, { st: id, steps: 2, cls: "ink", bevel: 0.3 });
    [plan.x + 14, plan.x + 22].forEach((bx, i) => {
      const F = G.frameAlong([bx, y, 9], [0, 1, 0]);
      disc(`${id}.button`, F, 0, 1.2, 2.2, { tone: "mid" }, { st: id, cls: "ink", bevel: 0.2 });
    });
    plateOnSide(id, plan.y + 18, plan.y + 38, 7, 14, { cls: "ink" });
  }
  lamp(id, plan.x + plan.w - 7, plan.y + plan.d - 6, h, { r: 1.8 });
}
const WATCH_TUBES = Object.keys(TUBES);
{
  const id = "WATCH";
  const { plan, h } = SITES[id];
  body(id, { cls: "ink" });
  // A sloped panel with one lamp for every tube: did it run?
  const F = XF([0, 0, 0]);
  const y0 = plan.y + 8;
  const y1 = plan.y + plan.d - 6;
  const tilt = (u, v) => [plan.x + 8 + (plan.w - 16) * u, y1 + (y0 + 8 - y1) * v, h + 12 * v];
  let lamps = "";
  WATCH_TUBES.forEach((tube, i) => {
    const col = i % 6;
    const row = Math.floor(i / 6);
    const p = at(tilt(0.12 + col * 0.152, 0.2 + row * 0.3));
    lamps += `<circle class="w-lamp" data-watch="${tube}" cx="${f2(p[0])}" cy="${f2(p[1])}" r="1.5"/>`;
  });
  const bezel = Ln(path3([tilt(0.04, 0.06), tilt(0.96, 0.06), tilt(0.96, 0.94), tilt(0.04, 0.94)], true), { tone: "lo" });
  prism(`${id}.panel`, F, [[y0, h], [y1, h], [y0 + 8, h + 12], [y0, h + 12]], plan.x + 8, plan.x + plan.w - 8, { tone: "mid" }, { st: id, cls: "ink", extra: bezel + `<g data-mark="lamps">${lamps}</g>` });
  {
    // A counter on the right face: how many connections the panel watches.
    const x = plan.x + plan.w;
    const win = { y0: plan.y + 10, y1: plan.y + 28, z0: 8, z1: 16 };
    const count = k.faceTextSvg(k.sideMatrix([x + 0.15, (win.y0 + win.y1) / 2], 14.2, P, "right"), String(WATCH_TUBES.length), { size: 5.6, tone: "hi", anchor: "middle" });
    put(`${id}.counter`, [x, win.y0 + 9, 12], `<path class="d1-window" d="${sideRect(x + 0.1, win.y0, win.y1, win.z0, win.z1)}"/>${count}`, [record(A.box([x - 0.1, win.y0, win.z0], [x + 0.3, win.y1, win.z1], { name: `${id}.counter` }))], { st: id, bias: 0.2, cls: "ink" });
    plateOnSide(id, plan.y + 34, plan.y + 52, 8, 15, { cls: "ink" });
  }
}
{
  const id = "ARCHIVE";
  const { plan, h } = SITES[id];
  body(id, { cls: "ink" });
  const y = plan.y + plan.d;
  // The safe door: hinges, a combination dial and a handle.
  box(`${id}.door`, { x: plan.x + 8, y: y - 0.2, w: plan.w - 16, d: 1.8, r: 0.6 }, 6, h - 14, { tone: "mid" }, { st: id, steps: 2, bevel: 0.4, cls: "ink", owner: `${id}.door`, extra: Ln(frontRect(y + 1.6, plan.x + 12, plan.x + plan.w - 12, 9, h - 11), { tone: "lo" }) });
  const DF = G.frameAlong([plan.x + plan.w / 2 - 8, y + 1.6, 18], [0, 1, 0]);
  disc(`${id}.dial`, DF, 0, 2.4, 6.4, { tone: "mid" }, { st: id, cls: "ink", extra: Ln(G.circleOf(DF, 2.4, 5, P), { tone: "lo" }) + Dots(G.dotsOf(DF, 2.4, 5.6, 20, P, { all: true }), { size: 0.3, tone: "lo" }) });
  box(`${id}.handle`, { x: plan.x + plan.w - 22, y: y + 1.6, w: 10, d: 2.2, r: 0.8 }, 16, 3, { tone: "mid" }, { st: id, steps: 2, cls: "ink" });
  for (const zz of [9, h - 18]) cyl(`${id}.hinge`, plan.x + 7.4, y + 1.2, 1.2, zz, 5, { tone: "mid" }, { st: id, steps: 14, cls: "ink", owner: `${id}.door` });
  plateOnSide(id, plan.y + 20, plan.y + 44, 22, 30, { cls: "ink" });
  // BrockDB's old console on the lid: one toggle for each function still on it; co-op goes off.
  [0, 1, 2, 3].forEach((i) => {
    const x = plan.x + 14 + i * 13;
    const yy = plan.y + 18;
    box(`${id}.toggle.base`, { x: x - 3, y: yy - 3, w: 6, d: 6, r: 0.8 }, h, 1.6, { tone: "mid" }, { st: id, steps: 2, cls: "ink" });
    const lever = [[x, yy, h + 1.6], [x, yy - 2.6, h + 6.4]];
    put(`${id}.toggle`, [x, yy, h + 4], `<path class="iso-line ar-toggle" data-tone="hi" data-toggle="${i}" data-free="end" d="${path3(lever)}" style="stroke-width:1.2"/>`, [record(A.tube(lever, 0.5, { name: `${id}.toggle` }))], { st: id, bias: 0.2, cls: "ink", attrs: i === 0 ? ' data-mark="coop-off"' : "" });
  });
  lamp(id, plan.x + plan.w - 7, plan.y + 7, h);
}

// The vendor pipe carries its registration tag and a sight glass: registered and watched.
{
  const { route } = ROUTES.T16;
  const mid = G.pointAlong(route, 13);
  const string = [[mid[0], mid[1] + TR - 0.2, TZ], [mid[0] + 0.4, mid[1] + 5, TZ - 6]];
  put("T16.tag", [mid[0], mid[1] + 4, TZ - 6], Ln(path3(string), { tone: "lo" }) + `<path class="t16-tag" data-mark="tag" d="${path3([[mid[0] - 2.4, mid[1] + 5.2, TZ - 6], [mid[0] + 3.2, mid[1] + 5.2, TZ - 6], [mid[0] + 3.2, mid[1] + 5.2, TZ - 11], [mid[0] - 2.4, mid[1] + 5.2, TZ - 11]], true)}"/>`, [record(A.box([mid[0] - 2.4, mid[1] + 5, TZ - 11], [mid[0] + 3.2, mid[1] + 5.4, TZ - 6], { name: "T16.tag" })), record(A.tube(string, 0.3, { name: "T16.tag.string", owner: "T16" }))], { st: "VENDOR", bias: 1, attrs: ' data-tube="T16"' });
}

// The control harness: door one tells the register and the watch panel what passed. It lies just
// clear of the bench, rises to a connector at each end, and passes under T15.
{
  const r = 1.1;
  const zLow = 2;
  const points = [[482, 140, 9], [492, 140, 9], [497, 140, zLow], [682, 140, zLow], [690, 140, 9], [704, 140, 9]];
  const route = G.fillet(points, 4, 10, { P, tube: r });
  const total = G.pathLength(route);
  const SHELL = 2.8;
  const gaps = [[0, SHELL], [total - SHELL, total]];
  R.route("harness", route, r, { piece: "bench", limp: true, gaps, rims: [r * 1.9, r * 1.9] });
  tubePieces(route, r, P, { maxLength: 18, spacing: 1.2, gaps }).forEach((piece) => put("harness.chunk", piece.mid, `<g class="tb"><path class="tb-body" d="${piece.body}"/><path class="iso-line tb-edge" data-tone="mid" d="${piece.edges}"/></g>`, [A.tube(piece.points, piece.radii)], { bias: 0.02, st: "REGISTER" }));
  [0, 1].forEach((end) => {
    const sAt = end ? total : 0;
    const tangent = G.tangentAlong(route, sAt);
    const F = G.frameAlong(G.pointAlong(route, sAt), tangent);
    const [s0, s1] = end ? [-SHELL, 0] : [0, SHELL];
    disc(`harness.shell${end}`, F, s0, s1, r * 1.9, { tone: "mid" }, { owner: "harness", bias: 0.1, st: end ? "REGISTER" : "DOOR1", bevel: 0.2 });
  });
}

// ---------------------------------------------------------------------------------------------
// Order, page and data.
A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
const groups = R.items.map((item, index) => `<g class="it" data-i="${index}" data-name="${item.name}"${item.attrs ?? ""}>${item.svg}</g>`);

const LABEL_TEXT =
  "A pneumatic tube installation on a bench, laid out like the After BrockDB picture. Ellucian's plate on the left holds Ellucian Experience, Ethos and Banner; Brock's plate holds the Power Platform rack, an AI terminal and a Power BI desk at the back, door one's exchange in the middle with Workday, Brock's apps, campus systems and a new vendor product in front of it, and door two's records cabinet along the front. A badge issuer, a register printer, a watch panel and an archive safe stand on the right. Tubes join the stations as the picture's arrows do; three cross the border through bulkhead frames.";
const svg = k.figureSvg({ width: W, height: H, label: LABEL_TEXT, body: [...back, `<g class="ab-items">${groups.join("")}</g>`, `<g data-part="carriers"></g>`] });

const routeData = Object.fromEntries(Object.entries(ROUTES).map(([id, r]) => [id, { points: r.route.map((p) => p.map(f2)), total: f2(r.total), gaps: r.gaps.map((g) => g.map(f2)), chunks: CHUNKS[id] }]));
// The drum pointers swing toward the port a carrier uses.
function drumOf(id, z, len, r0) {
  const { plan } = SITES[id];
  const c = [plan.x + plan.w / 2, plan.y + plan.d / 2];
  const ports = {};
  for (const [tube, t] of Object.entries(TUBES)) {
    const points = ROUTE_POINTS[tube];
    if (t.from === id) ports[tube] = f2(Math.atan2(points[0][1] - c[1], points[0][0] - c[0]));
    if (t.to === id) ports[tube] = f2(Math.atan2(points[points.length - 1][1] - c[1], points[points.length - 1][0] - c[0]));
  }
  return { c, z, len, r0, rest: f2(Math.PI / 2), ports };
}
const TOGGLE = (() => {
  const { plan, h } = SITES.ARCHIVE;
  const x = plan.x + 14;
  const yy = plan.y + 18;
  return { off: path3([[x, yy, h + 1.6], [x, yy + 2.6, h + 6.4]]) };
})();
const DATA = {
  P,
  TR,
  KS: f2(KS * 1000) / 1000,
  routes: routeData,
  tubes: TUBES,
  paths: PATHS,
  stations: STATIONS,
  principles: PRINCIPLES,
  drums: { DOOR1: drumOf("DOOR1", SITES.DOOR1.h + 9, 19.4, 9), ETHOS: drumOf("ETHOS", SITES.ETHOS.h + 7, 11.4, 6) },
  toggle: TOGGLE,
};

const CSS = readFileSync(join(HERE, "figure.css"), "utf8");
const LIVE = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const figure = k.plateHtml({
  fig: "Fig 1",
  title: "Request paths",
  hint: "Pick a path · ← → hops · space",
  readout: `${PATHS[0].title} · hop 1 of ${PATHS[0].hops.length}`,
  keys: [],
  caption: "",
  body: `<div class="iso-stage ab-stage" tabindex="0" role="group" aria-label="After BrockDB request paths. Number keys 1 to 7 pick a path, left and right arrows step through its hops, space pauses or plays the tour.">${svg}<span class="ab-sr" role="status" aria-live="polite" data-status></span></div>`,
});

const pathButtons = PATHS.map((path, i) => `<button type="button" class="ab-path" data-path="${i}" aria-pressed="${i === 0}"><span class="ab-path-n">${i + 1}</span><span class="ab-path-t">${esc(path.title)}</span><span class="ab-path-s">${esc(path.sub)}</span></button>`).join("");

const page = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("__ISO_CSS__", k.ISO_CSS)
  .replace("__CSS__", CSS)
  .replace("__FIGURE__", figure)
  .replace("__PATH_BUTTONS__", pathButtons)
  .replace("__PRINCIPLES__", Object.entries(PRINCIPLES).map(([n, p]) => `<li><span class="ab-chip">${n}</span><b>${esc(p.name)}</b> ${esc(p.text)}</li>`).join(""))
  .replace("__ROLES__", ROLES.map((r) => `<div class="ab-role"><h3>${esc(r.who)}</h3><p>${esc(r.does)}${r.test ? ` <em>${esc(r.test)}</em>` : ""}</p></div>`).join(""))
  .replace("__TODAY__", TODAY.map((t) => `<li>${esc(t)}</li>`).join(""))
  .replace("__AFTER__", AFTER.map((t) => `<li>${esc(t)}</li>`).join(""))
  .replace("__ENDING__", esc(ENDING))
  .replace("__SCRIPT__", (kitScript() + LIVE).replace(/<\/(script)/gi, "<\\/$1"));

writeFileSync(join(HERE, "after-brockdb.html"), page);
// Local check pages: the artifact page wrapped the way the viewer wraps it, one per theme.
for (const theme of ["light", "dark"])
  writeFileSync(join(HERE, `check-${theme}.html`), `<!doctype html><html lang="en" data-theme="${theme}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${page}</body></html>`);
console.log("wrote after-brockdb.html", `${(page.length / 1024).toFixed(0)} KB`, `${R.items.length} items`, `scale ${KS.toFixed(3)}`);

A.auditOrExit(R, P, {});
