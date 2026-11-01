/**
 * Pure orthogonal routing for the playbook's 1000×620 SVG.
 * Nodes are centered rectangles (140×66). Paths keep 8px clearance from
 * other nodes. The short terminal legs necessarily enter their own node's
 * clearance margin, ending at its actual border.
 *
 * Input edges must already be filtered for the visible step/lastStep.
 * Returns new edge objects; never mutates input. A failed route has
 * points:[], labelPoint:null, labelMaxWidth:0 and error:{code,message}.
 * labelPoint is the intended centered SVG text baseline, not its top-left.
 * labelMaxWidth is an available layout width, not a text measurement.
 */
export function routeDiagram(nodes, edges) {
  const W = 1000,
    H = 620,
    HW = 70,
    HH = 33,
    MARGIN = 8,
    GAP = 2,
    BOUND = 10,
    TURN = 18,
    EPS = 1e-7;
  if (!Array.isArray(nodes) || !Array.isArray(edges))
    throw new TypeError('routeDiagram expects node and edge arrays');
  const fail = (edge, code, message) => ({
    ...edge,
    points: [],
    labelPoint: null,
    labelMaxWidth: 0,
    error: { code, message },
  });
  const ids = new Map(),
    rects = [];
  for (const n of nodes) {
    if (
      !n ||
      typeof n.id !== 'string' ||
      !Number.isFinite(n.x) ||
      !Number.isFinite(n.y) ||
      ids.has(n.id) ||
      n.x - HW < 0 ||
      n.x + HW > W ||
      n.y - HH < 0 ||
      n.y + HH > H
    ) {
      return edges.map((e) =>
        fail(
          e,
          'INVALID_NODE',
          'Node IDs must be unique; finite centered 140×66 rectangles must fit the 1000×620 viewBox.',
        ),
      );
    }
    ids.set(n.id, n);
    rects.push({
      id: n.id,
      l: n.x - HW - MARGIN,
      r: n.x + HW + MARGIN,
      t: n.y - HH - MARGIN,
      b: n.y + HH + MARGIN,
    });
  }
  const inside = (p, r) => p.x > r.l + EPS && p.x < r.r - EPS && p.y > r.t + EPS && p.y < r.b - EPS;
  function crosses(a, b, r) {
    if (Math.abs(a.x - b.x) < EPS)
      return (
        a.x > r.l + EPS &&
        a.x < r.r - EPS &&
        Math.max(a.y, b.y) > r.t + EPS &&
        Math.min(a.y, b.y) < r.b - EPS
      );
    if (Math.abs(a.y - b.y) < EPS)
      return (
        a.y > r.t + EPS &&
        a.y < r.b - EPS &&
        Math.max(a.x, b.x) > r.l + EPS &&
        Math.min(a.x, b.x) < r.r - EPS
      );
    return true; // Never silently accept a diagonal.
  }
  const inBounds = (p) =>
    p.x >= BOUND - EPS && p.x <= W - BOUND + EPS && p.y >= BOUND - EPS && p.y <= H - BOUND + EPS;
  function ports(n) {
    return [
      {
        name: 'right',
        axis: 0,
        normal: { x: 1, y: 0 },
        inner: { x: n.x + HW, y: n.y },
        outer: { x: n.x + HW + MARGIN + GAP, y: n.y },
      },
      {
        name: 'bottom',
        axis: 1,
        normal: { x: 0, y: 1 },
        inner: { x: n.x, y: n.y + HH },
        outer: { x: n.x, y: n.y + HH + MARGIN + GAP },
      },
      {
        name: 'left',
        axis: 0,
        normal: { x: -1, y: 0 },
        inner: { x: n.x - HW, y: n.y },
        outer: { x: n.x - HW - MARGIN - GAP, y: n.y },
      },
      {
        name: 'top',
        axis: 1,
        normal: { x: 0, y: -1 },
        inner: { x: n.x, y: n.y - HH },
        outer: { x: n.x, y: n.y - HH - MARGIN - GAP },
      },
    ].filter(
      (p) =>
        inBounds(p.outer) &&
        !rects.some((r) => r.id !== n.id && (inside(p.outer, r) || crosses(p.inner, p.outer, r))),
    );
  }
  const portMap = new Map(nodes.map((n) => [n.id, ports(n)]));
  const xs = [BOUND, W - BOUND],
    ys = [BOUND, H - BOUND];
  for (const n of nodes) {
    xs.push(n.x, n.x - HW - MARGIN - GAP, n.x + HW + MARGIN + GAP);
    ys.push(n.y, n.y - HH - MARGIN - GAP, n.y + HH + MARGIN + GAP);
  }
  const unique = (v, max) =>
    [...new Set(v.filter((x) => x >= BOUND && x <= max - BOUND))].sort((a, b) => a - b);
  const X = unique(xs, W),
    Y = unique(ys, H),
    NX = X.length,
    NY = Y.length,
    N = NX * NY;
  const xm = new Map(X.map((x, i) => [x, i])),
    ym = new Map(Y.map((y, i) => [y, i]));
  const point = (i) => ({ x: X[i % NX], y: Y[Math.floor(i / NX)] });
  const index = (p) => ym.get(p.y) * NX + xm.get(p.x);
  const blocked = new Uint8Array(N),
    neighbors = Array.from({ length: N }, () => []);
  for (let i = 0; i < N; i++) blocked[i] = rects.some((r) => inside(point(i), r)) ? 1 : 0;
  function connect(a, b, axis) {
    if (blocked[a] || blocked[b]) return;
    const pa = point(a),
      pb = point(b);
    if (rects.some((r) => crosses(pa, pb, r))) return;
    const length = Math.abs(pa.x - pb.x) + Math.abs(pa.y - pb.y);
    neighbors[a].push({ to: b, axis, length });
    neighbors[b].push({ to: a, axis, length });
  }
  for (let y = 0; y < NY; y++)
    for (let x = 0; x < NX; x++) {
      const i = y * NX + x;
      if (x + 1 < NX) connect(i, i + 1, 0);
      if (y + 1 < NY) connect(i, i + NX, 1);
    }
  class Heap {
    constructor() {
      this.a = [];
    }
    push(v) {
      let i = this.a.length;
      this.a.push(v);
      while (i) {
        const p = (i - 1) >> 1;
        if (this.a[p].f <= v.f) break;
        this.a[i] = this.a[p];
        i = p;
      }
      this.a[i] = v;
    }
    pop() {
      const a = this.a,
        out = a[0],
        v = a.pop();
      if (a.length) {
        let i = 0;
        while (i * 2 + 1 < a.length) {
          let c = i * 2 + 1;
          if (c + 1 < a.length && a[c + 1].f < a[c].f) c++;
          if (a[c].f >= v.f) break;
          a[i] = a[c];
          i = c;
        }
        a[i] = v;
      }
      return out;
    }
    get length() {
      return this.a.length;
    }
  }
  const bias = (p, from, to) => {
    const d = (to.x - from.x) * p.normal.x + (to.y - from.y) * p.normal.y;
    return d > 0 ? 0 : d < 0 ? 32 : 10;
  };
  const used = new Map();
  const key = (a, b) => (a < b ? `${a}:${b}` : `${b}:${a}`);
  function search(starts, ends, from, to) {
    const dist = new Float64Array(N * 2);
    dist.fill(Infinity);
    const parent = new Int32Array(N * 2);
    parent.fill(-1);
    const origin = new Int8Array(N * 2);
    origin.fill(-1);
    const goals = new Map();
    ends.forEach((p, i) => {
      const v = index(p.outer);
      if (!goals.has(v)) goals.set(v, []);
      goals.get(v).push(i);
    });
    const h = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      const p = point(i);
      h[i] = Math.min(...ends.map((q) => Math.abs(p.x - q.outer.x) + Math.abs(p.y - q.outer.y)));
    }
    const heap = new Heap();
    starts.forEach((p, i) => {
      const vertex = index(p.outer),
        s = vertex * 2 + p.axis,
        g = MARGIN + GAP + bias(p, from, to);
      if (g < dist[s]) {
        dist[s] = g;
        origin[s] = i;
        heap.push({ s, g, f: g + h[vertex] });
      }
    });
    let best = null;
    while (heap.length) {
      const q = heap.pop();
      if (q.g !== dist[q.s]) continue;
      if (best && q.f >= best.cost) break;
      const vertex = q.s >> 1,
        axis = q.s & 1;
      for (const gi of goals.get(vertex) || []) {
        const p = ends[gi],
          cost = q.g + MARGIN + GAP + (axis === p.axis ? 0 : TURN) + bias(p, to, from);
        if (!best || cost < best.cost) best = { s: q.s, goal: gi, cost };
      }
      for (const n of neighbors[vertex]) {
        const state = n.to * 2 + n.axis;
        // A small reuse penalty favors alternative corridors without making
        // crossings of other *edges* illegal. Only nodes are hard obstacles.
        const congestion = (used.get(key(vertex, n.to)) || 0) * Math.min(12, n.length * 0.12);
        const g = q.g + n.length + (axis === n.axis ? 0 : TURN) + congestion;
        if (g + EPS < dist[state]) {
          dist[state] = g;
          parent[state] = q.s;
          origin[state] = origin[q.s];
          heap.push({ s: state, g, f: g + h[n.to] });
        }
      }
    }
    if (!best) return null;
    const vertices = [];
    let s = best.s;
    while (s >= 0) {
      vertices.push(s >> 1);
      s = parent[s];
    }
    vertices.reverse();
    const start = starts[origin[best.s]],
      end = ends[best.goal];
    return { vertices, start, end, cost: best.cost };
  }
  function simplify(ps) {
    const out = [];
    for (const p of ps) {
      if (out.length && Math.abs(out.at(-1).x - p.x) < EPS && Math.abs(out.at(-1).y - p.y) < EPS)
        continue;
      if (out.length > 1) {
        const a = out.at(-2),
          b = out.at(-1);
        if (
          (Math.abs(a.x - b.x) < EPS &&
            Math.abs(b.x - p.x) < EPS &&
            (b.y - a.y) * (p.y - b.y) >= 0) ||
          (Math.abs(a.y - b.y) < EPS && Math.abs(b.y - p.y) < EPS && (b.x - a.x) * (p.x - b.x) >= 0)
        )
          out.pop();
      }
      out.push({ x: p.x, y: p.y });
    }
    return out;
  }
  const placedLabels = [];
  function labelFor(ps) {
    const segments = [];
    for (let i = 1; i < ps.length; i++) {
      const a = ps[i - 1],
        b = ps[i],
        length = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
      if (length > 14) segments.push({ a, b, length, horizontal: Math.abs(a.y - b.y) < EPS });
    }
    segments.sort(
      (a, b) => b.length + (b.horizontal ? 55 : 0) - (a.length + (a.horizontal ? 55 : 0)),
    );
    // Width is reduced until a conservative text rectangle fits away from nodes.
    for (const seg of segments)
      for (const f of [0.5, 0.33, 0.67]) {
        const x = seg.a.x + (seg.b.x - seg.a.x) * f,
          y = seg.a.y + (seg.b.y - seg.a.y) * f;
        const candidates = seg.horizontal
          ? [
              { x, y: y - 8 },
              { x, y: y + 22 },
            ]
          : [
              { x: x + 62, y: y + 5 },
              { x: x - 62, y: y + 5 },
              { x, y: y - 8 },
            ];
        for (const p of candidates)
          for (
            let width = Math.min(180, seg.horizontal ? seg.length - 16 : 110);
            width >= 36;
            width -= 12
          ) {
            const box = { l: p.x - width / 2, r: p.x + width / 2, t: p.y - 14, b: p.y + 3 };
            if (box.l < BOUND || box.r > W - BOUND || box.t < BOUND || box.b > H - BOUND) continue;
            if (rects.some((r) => box.l < r.r && box.r > r.l && box.t < r.b && box.b > r.t))
              continue;
            if (
              placedLabels.some(
                (r) => box.l < r.r + 6 && box.r > r.l - 6 && box.t < r.b + 5 && box.b > r.t - 5,
              )
            )
              continue;
            placedLabels.push(box);
            return { labelPoint: p, labelMaxWidth: Math.floor(width) };
          }
      }
    // Keep the path usable if no readable label rectangle fits. Parent can use
    // the textual flow index instead of painting a label over a node.
    return { labelPoint: null, labelMaxWidth: 0, labelWarning: 'NO_CLEAR_LABEL_POSITION' };
  }
  return edges.map((edge) => {
    const from = ids.get(edge.from),
      to = ids.get(edge.to);
    if (!from || !to)
      return fail(edge, 'MISSING_ENDPOINT', 'Both endpoints must exist among the visible nodes.');
    const starts = portMap.get(from.id),
      ends = portMap.get(to.id);
    if (!starts.length || !ends.length)
      return fail(edge, 'NO_VALID_PORT', 'No unobstructed terminal port fits inside the viewBox.');
    let route;
    if (from.id === to.id) {
      // Distinct terminal faces prevent a zero-length out-and-back self-loop.
      for (const p of starts) {
        const r = search(
          [p],
          ends.filter((q) => q.name !== p.name),
          from,
          to,
        );
        if (r && (!route || r.cost < route.cost)) route = r;
      }
    } else route = search(starts, ends, from, to);
    if (!route)
      return fail(edge, 'NO_ROUTE', 'No orthogonal route with the required node clearance exists.');
    const points = simplify([route.start.inner, ...route.vertices.map(point), route.end.inner]);
    // Defensive final validation catches any future change to the graph or ports.
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        b = points[i];
      for (const r of rects) {
        const terminal =
          (i === 1 && r.id === from.id) || (i === points.length - 1 && r.id === to.id);
        if (!terminal && crosses(a, b, r))
          return fail(
            edge,
            'VALIDATION_FAILED',
            'A generated segment intersects a node clearance rectangle.',
          );
      }
    }
    for (let i = 1; i < route.vertices.length; i++) {
      const k = key(route.vertices[i - 1], route.vertices[i]);
      used.set(k, (used.get(k) || 0) + 1);
    }
    return {
      ...edge,
      points,
      ...labelFor(points),
      sourcePort: route.start.name,
      targetPort: route.end.name,
    };
  });
}
