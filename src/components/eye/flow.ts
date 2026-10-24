/**
 * Cursor "ink" for the homepage eye: a small 2-D fluid on a coarse grid that the mouse stirs.
 * The eye image is read through a coordinate map the fluid carries along (like dye in water),
 * so moving the cursor smears and swirls the eye under it; when the cursor rests, the map
 * eases back to the undistorted image. Only the image is moved — the letters stay on their grid.
 *
 * Units: one unit = one character cell of the eye grid. The fluid runs on cells of SCALE×SCALE.
 */

const SCALE = 4;          // fine cells per fluid cell
const PRESSURE_ITERS = 14;

export interface FlowTuning {
  /** 0 = off … 1 = strong. Scales how much the mouse pushes the fluid. */
  strength: number;
  /** 0 = settles quickly … 1 = lingers. How long the swirl keeps moving and the image stays smeared. */
  linger: number;
}

export class EyeFlow {
  private gw = 0; private gh = 0; private n = 0;
  private u = new Float32Array(0); private v = new Float32Array(0);
  private u2 = new Float32Array(0); private v2 = new Float32Array(0);
  private p = new Float32Array(0); private div = new Float32Array(0);
  /** where each fluid cell currently reads the image from (fine-cell units) */
  private mx = new Float32Array(0); private my = new Float32Array(0);
  private mx2 = new Float32Array(0); private my2 = new Float32Array(0);
  private splats: number[] = [];
  /** largest displacement / speed in the last step: lets the renderer skip work when calm */
  energy = 0;

  resize(cols: number, rows: number) {
    this.gw = Math.max(2, Math.ceil(cols / SCALE) + 1);
    this.gh = Math.max(2, Math.ceil(rows / SCALE) + 1);
    const n = (this.n = this.gw * this.gh);
    this.u = new Float32Array(n); this.v = new Float32Array(n);
    this.u2 = new Float32Array(n); this.v2 = new Float32Array(n);
    this.p = new Float32Array(n); this.div = new Float32Array(n);
    this.mx = new Float32Array(n); this.my = new Float32Array(n);
    this.mx2 = new Float32Array(n); this.my2 = new Float32Array(n);
    this.resetMap();
    this.splats.length = 0;
    this.energy = 0;
  }

  private resetMap() {
    for (let j = 0, i = 0; j < this.gh; j++) for (let x = 0; x < this.gw; x++, i++) { this.mx[i] = x * SCALE; this.my[i] = j * SCALE; }
  }

  /** Mouse moved from (x0,y0) to (x1,y1), in fine-cell units. */
  push(x0: number, y0: number, x1: number, y1: number) {
    if (this.splats.length > 4 * 24) this.splats.splice(0, 4); // never grows without bound
    this.splats.push(x0, y0, x1, y1);
  }

  /** Clears all motion (e.g. after a resize or when switched off). */
  calm() {
    this.u.fill(0); this.v.fill(0); this.p.fill(0);
    this.resetMap();
    this.splats.length = 0;
    this.energy = 0;
  }

  /** Advances the fluid by one frame (dt in frames of 1/30 s). */
  step(dt: number, t: FlowTuning) {
    const { gw, gh, n } = this;
    if (!n) return;
    const u = this.u, v = this.v;
    // 1. the mouse: add velocity along its path, softly around the pointer
    const s = this.splats;
    if (s.length && t.strength > 0) {
      const R = Math.max(1.6, Math.min(gw, gh) * 0.09); // radius, in fluid cells
      const R2 = R * R;
      for (let q = 0; q < s.length; q += 4) {
        const x0 = s[q] / SCALE, y0 = s[q + 1] / SCALE, x1 = s[q + 2] / SCALE, y1 = s[q + 3] / SCALE;
        // push in fine cells per frame (the mouse's own speed), capped so fast flicks don't explode
        let fx = s[q + 2] - s[q], fy = s[q + 3] - s[q + 1];
        const fl = Math.hypot(fx, fy);
        if (fl < 1e-3) continue;
        const cap = 14;
        if (fl > cap) { fx *= cap / fl; fy *= cap / fl; }
        const len = Math.hypot(x1 - x0, y1 - y0);
        const k = 0.55 * t.strength;
        const steps = Math.max(1, Math.min(8, Math.ceil(len / (R * 0.5))));
        for (let st = 1; st <= steps; st++) {
          const cx = x0 + ((x1 - x0) * st) / steps, cy = y0 + ((y1 - y0) * st) / steps;
          const xa = Math.max(0, Math.floor(cx - R * 2)), xb = Math.min(gw - 1, Math.ceil(cx + R * 2));
          const ya = Math.max(0, Math.floor(cy - R * 2)), yb = Math.min(gh - 1, Math.ceil(cy + R * 2));
          for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
            const dx = x - cx, dy = y - cy, w = Math.exp(-(dx * dx + dy * dy) / R2) * (k / steps);
            const i = y * gw + x;
            u[i] += fx * w; v[i] += fy * w;
          }
        }
      }
    }
    s.length = 0;

    // 2. velocity carries itself along (gives the swirls)
    this.advect(u, v, u, this.u2, dt);
    this.advect(u, v, v, this.v2, dt);
    this.u.set(this.u2); this.v.set(this.v2);

    // 3. keep it swirling instead of spreading out (pressure projection)
    this.project();

    // 4. gentle fade so a flick settles (about 1–4 s, set by `linger`)
    const fade = Math.pow(0.93 + 0.04 * t.linger, dt);
    let e = 0;
    for (let i = 0; i < n; i++) {
      u[i] *= fade; v[i] *= fade;
      const sp = Math.abs(u[i]) + Math.abs(v[i]);
      if (sp > e) e = sp;
    }

    // 5. the image map flows with the fluid, then eases back to "undistorted"
    this.advect(u, v, this.mx, this.mx2, dt);
    this.advect(u, v, this.my, this.my2, dt);
    const back = 1 - Math.pow(1 - (0.085 - 0.058 * t.linger), dt);
    for (let j = 0, i = 0; j < gh; j++) for (let x = 0; x < gw; x++, i++) {
      const ox = x * SCALE, oy = j * SCALE;
      const ax = this.mx2[i] + (ox - this.mx2[i]) * back;
      const ay = this.my2[i] + (oy - this.my2[i]) * back;
      this.mx[i] = ax; this.my[i] = ay;
      const dd = Math.abs(ax - ox) + Math.abs(ay - oy);
      if (dd > e) e = dd;
    }
    this.energy = e;
    if (e < 0.12) this.calm(); // under an eighth of a letter: invisible, so stop working
  }

  /** Semi-Lagrangian advection of field `f` by (u,v) into `out` (velocities are in fine cells / frame). */
  private advect(u: Float32Array, v: Float32Array, f: Float32Array, out: Float32Array, dt: number) {
    const { gw, gh } = this;
    for (let y = 0, i = 0; y < gh; y++) for (let x = 0; x < gw; x++, i++) {
      let px = x - (u[i] * dt) / SCALE, py = y - (v[i] * dt) / SCALE;
      if (px < 0) px = 0; else if (px > gw - 1) px = gw - 1;
      if (py < 0) py = 0; else if (py > gh - 1) py = gh - 1;
      let x0 = px | 0, y0 = py | 0;
      if (x0 > gw - 2) x0 = gw - 2;
      if (y0 > gh - 2) y0 = gh - 2;
      const fx = px - x0, fy = py - y0, k = y0 * gw + x0;
      const a = f[k] + (f[k + 1] - f[k]) * fx;
      const b = f[k + gw] + (f[k + gw + 1] - f[k + gw]) * fx;
      out[i] = a + (b - a) * fy;
    }
  }

  private project() {
    const { gw, gh, u, v, p, div } = this;
    for (let y = 1; y < gh - 1; y++) for (let x = 1; x < gw - 1; x++) {
      const i = y * gw + x;
      div[i] = -0.5 * (u[i + 1] - u[i - 1] + v[i + gw] - v[i - gw]);
    }
    p.fill(0);
    for (let it = 0; it < PRESSURE_ITERS; it++) {
      for (let y = 1; y < gh - 1; y++) for (let x = 1; x < gw - 1; x++) {
        const i = y * gw + x;
        p[i] = (div[i] + p[i - 1] + p[i + 1] + p[i - gw] + p[i + gw]) / 4;
      }
    }
    for (let y = 1; y < gh - 1; y++) for (let x = 1; x < gw - 1; x++) {
      const i = y * gw + x;
      u[i] -= 0.5 * (p[i + 1] - p[i - 1]);
      v[i] -= 0.5 * (p[i + gw] - p[i - gw]);
    }
    // edges: no flow through the border
    for (let x = 0; x < gw; x++) { v[x] = 0; v[(gh - 1) * gw + x] = 0; }
    for (let y = 0; y < gh; y++) { u[y * gw] = 0; u[y * gw + gw - 1] = 0; }
  }

  /** Where the fine cell (col,row) reads the image from; writes into out[0], out[1]. */
  source(col: number, row: number, out: Float32Array) {
    const gx = col / SCALE, gy = row / SCALE;
    let x0 = gx | 0, y0 = gy | 0;
    if (x0 > this.gw - 2) x0 = this.gw - 2;
    if (y0 > this.gh - 2) y0 = this.gh - 2;
    const fx = gx - x0, fy = gy - y0, gw = this.gw, k = y0 * gw + x0;
    const m = this.mx, n = this.my;
    const ax = m[k] + (m[k + 1] - m[k]) * fx, bx = m[k + gw] + (m[k + gw + 1] - m[k + gw]) * fx;
    const ay = n[k] + (n[k + 1] - n[k]) * fx, by = n[k + gw] + (n[k + gw + 1] - n[k + gw]) * fx;
    out[0] = ax + (bx - ax) * fy;
    out[1] = ay + (by - ay) * fy;
  }
}
