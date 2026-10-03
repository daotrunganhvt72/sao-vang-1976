/* ═══════════════════════════════════════════════════════════════
   SAO VÀNG · 1976 — engine hạt biến hình theo cuộn trang
   (thuần JS: canvas 2 lớp, morphing giữa các hình, không thư viện)
   ═══════════════════════════════════════════════════════════════ */
(() => {
  "use strict";

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TAU = Math.PI * 2;

  /* ── RNG deterministic để hình ổn định ── */
  const mulberry32 = seed => () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };

  /* ── màu ── */
  const C = {
    gold:  [226, 177, 60],
    gold2: [198, 152, 50],
    bright:[255, 216, 132],
    red:   [198, 62, 55],
    redD:  [148, 30, 30],
    dim:   [120, 100, 58]
  };
  const mixC = (a, b, t) => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t
  ];

  /* ═══════════ CÁC HÌNH MẪU (toạ độ chuẩn hoá, tâm 0,0) ═══════════ */

  function starPts(rng, cx, cy, rO, rI, rot, n, fillRatio, colorA, colorB) {
    const v = [];
    for (let k = 0; k < 10; k++) {
      const a = rot + k * Math.PI / 5 - Math.PI / 2;
      const r = k % 2 === 0 ? rO : rI;
      v.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    const pts = new Float32Array(n * 2), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      let x, y;
      if (rng() < fillRatio) {
        const j = Math.floor(rng() * 10);
        const t1 = Math.sqrt(rng()), t2 = rng();
        x = (1 - t1) * cx + t1 * ((1 - t2) * v[j][0] + t2 * v[(j + 1) % 10][0]);
        y = (1 - t1) * cy + t1 * ((1 - t2) * v[j][1] + t2 * v[(j + 1) % 10][1]);
      } else {
        const seg = Math.floor(rng() * 10), t = rng();
        const a = v[seg], b = v[(seg + 1) % 10];
        x = a[0] + (b[0] - a[0]) * t; y = a[1] + (b[1] - a[1]) * t;
        x += (rng() - .5) * .012; y += (rng() - .5) * .012;
      }
      pts[i * 2] = x; pts[i * 2 + 1] = y;
      const c = colorB && rng() < .3 ? colorB : (rng() < .5 ? colorA : mixC(colorA, C.bright, rng() * .5));
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    }
    return { pts, col };
  }

  function ringPts(rng, cx, cy, r, n, thickness, color, fillRatio) {
    const pts = new Float32Array(n * 2), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = rng() * TAU;
      const rr = rng() < fillRatio ? r * Math.sqrt(rng()) : r + (rng() - .5) * thickness;
      pts[i * 2] = cx + rr * Math.cos(a); pts[i * 2 + 1] = cy + rr * Math.sin(a);
      const c = rng() < .4 ? mixC(color, C.bright, rng() * .6) : color;
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    }
    return { pts, col };
  }

  function barPts(rng, x1, y1, x2, y2, th, n, color) {
    const pts = new Float32Array(n * 2), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const t = rng();
      const bx = x1 + (x2 - x1) * t, by = y1 + (y2 - y1) * t;
      const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
      const o = (rng() - .5) * th;
      pts[i * 2] = bx + (-dy / L) * o; pts[i * 2 + 1] = by + (dx / L) * o;
      const c = rng() < .35 ? mixC(color, C.bright, rng() * .5) : color;
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    }
    return { pts, col };
  }

  function rectFillPts(rng, x1, y1, x2, y2, n, color) {
    const pts = new Float32Array(n * 2), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pts[i * 2] = x1 + rng() * (x2 - x1); pts[i * 2 + 1] = y1 + rng() * (y2 - y1);
      const c = rng() < .12 ? mixC(color, C.bright, rng() * .4) : color;
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    }
    return { pts, col };
  }

  function gauss(rng) { return (rng() + rng() + rng() - 1.5) / 1.5; }

  /* ── dựng một hình theo "công thức" chia nhóm hạt ── */
  function buildShape(ratios, builders, n) {
    const pts = new Float32Array(n * 2), col = new Float32Array(n * 3);
    let at = 0;
    for (let g = 0; g < ratios.length; g++) {
      const cnt = g === ratios.length - 1 ? n - at : Math.round(n * ratios[g]);
      const b = builders[g](at, cnt);
      for (let i = 0; i < cnt; i++) {
        pts[(at + i) * 2] = b.pts[i * 2]; pts[(at + i) * 2 + 1] = b.pts[i * 2 + 1];
        col[(at + i) * 3] = b.col[i * 3]; col[(at + i) * 3 + 1] = b.col[i * 3 + 1]; col[(at + i) * 3 + 2] = b.col[i * 3 + 2];
      }
      at += cnt;
    }
    return { pts, col };
  }

  /* ═══════════ 8 CẢNH ═══════════ */
  const SCENES = [
    { name: "KHỞI ĐẦU", rot: .10, make: (rng, n) =>
        starPts(rng, 0, 0, .58, .235, 0, n, .55, C.gold, C.gold2) },

    { name: "HAI NHÀ NƯỚC", rot: 0, make: (rng, n) => {
        const h = Math.floor(n / 2);
        const A = ringPts(rng, -.52, 0, .34, h, .05, C.gold2, .3);
        const B = ringPts(rng, .52, 0, .34, n - h, .05, C.red, .3);
        const pts = new Float32Array(n * 2), col = new Float32Array(n * 3);
        pts.set(A.pts, 0); col.set(A.col, 0);
        pts.set(B.pts, h * 2); col.set(B.col, h * 3);
        return { pts, col };
      } },

    { name: "HIỆP THƯƠNG", rot: 0, make: (rng, n) => {
        const pts = new Float32Array(n * 2), col = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          const cl = i % 22;
          const row = cl < 11 ? 0 : 1, k = cl % 11;
          const cx = -.86 + k * .172;
          const cy = row === 0 ? -.17 : .17;
          pts[i * 2] = cx + gauss(rng) * .05; pts[i * 2 + 1] = cy + gauss(rng) * .05;
          const c = rng() < .3 ? C.bright : C.gold;
          col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
        }
        return { pts, col };
      } },

    { name: "TỔNG TUYỂN CỬ", rot: 0, make: (rng, n) => polyBallot(rng, n) },

    { name: "KHAI MẠC", rot: 0, make: (rng, n) => hallShape(rng, n) },

    { name: "QUỐC KỲ", rot: 0, make: (rng, n) => {
        const field = Math.round(n * .74), st = n - field;
        const F = rectFillPts(rng, -.92, -.4, .52, .4, field, C.redD);
        const S = starPts(rng, -.2, 0, .2, .082, 0, st, .5, C.gold, C.bright);
        const pts = new Float32Array(n * 2), col = new Float32Array(n * 3);
        pts.set(F.pts, 0); col.set(F.col, 0);
        pts.set(S.pts, field * 2); col.set(S.col, field * 3);
        return { pts, col };
      } },

    { name: "QUỐC HUY", rot: .05, make: (rng, n) =>
        emblemShape(rng, n) },

    { name: "MỘT CÁI TÊN", rot: 0, make: (rng, n) => textShape("1976", rng, n) }
  ];

  function polyBallot(rng, n) {
    const pts = new Float32Array(n * 2), col = new Float32Array(n * 3);
    const nPaper = Math.round(n * .44), nCheck = Math.round(n * .44), nRest = n - nPaper - nCheck;
    for (let i = 0; i < n; i++) {
      let x, y, c;
      if (i < nPaper) { // tờ giấy nghiêng
        const u = rng(), v = rng();
        x = -.42 + u * .78; y = -.5 + v * 1.0;
        if (rng() < .62) { // viền
          const e = Math.floor(rng() * 4);
          if (e === 0) y = -.5; else if (e === 1) y = .5;
          else if (e === 2) x = -.42; else x = .36;
        }
        c = rng() < .1 ? C.bright : C.gold2;
      } else if (i < nPaper + nCheck) { // dấu tick
        const t = rng();
        if (t < .42) { x = -.34 + t * .5; y = .05 + t * .28; }
        else { const s = (t - .42) / .58; x = -.13 + s * .52; y = .33 - s * .62; }
        x += gauss(rng) * .016; y += gauss(rng) * .016;
        c = rng() < .55 ? C.bright : C.gold;
      } else { // dòng chữ trên giấy
        const line = Math.floor(rng() * 4);
        x = -.28 + rng() * .5; y = -.36 + line * .13;
        x += gauss(rng) * .01;
        c = C.dim;
      }
      pts[i * 2] = x; pts[i * 2 + 1] = y;
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    }
    return { pts, col };
  }

  function hallShape(rng, n) {
    const pts = new Float32Array(n * 2), col = new Float32Array(n * 3);
    const parts = [
      { r: .07, f: (u, v) => { // bậc nền
          const x = -.8 + u * 1.6, y = .52 + v * .14; return [x, y]; }, c: C.gold2 },
      { r: .32, f: (u, v) => { // 6 cột
          const col6 = Math.floor(u * 6), cu = (u * 6) % 1;
          const x = -.62 + col6 * .248 + (cu - .5) * .07, y = -.04 + v * .56; return [x, y]; }, c: C.gold },
      { r: .07, f: (u, v) => { // thanh ngang trên
          const x = -.8 + u * 1.6, y = -.16 + v * .08; return [x, y]; }, c: C.gold2 },
      { r: .24, f: (u, v) => { // mái tam giác (biên + ruột)
          const t1 = Math.sqrt(v), t2 = u;
          const ax = 0, ay = -.46, bx = -.8, by = -.16, cx2 = .8, cy2 = -.16;
          const x = (1 - t1) * ax + t1 * ((1 - t2) * bx + t2 * cx2);
          const y = (1 - t1) * ay + t1 * ((1 - t2) * by + t2 * cy2);
          return [x, y]; }, c: C.gold },
      { r: .16, f: (u, v) => { // ô cửa trên bục
          const k = Math.floor(u * 5);
          const x = -.56 + k * .28 + ((u * 5) % 1) * .14, y = .1 + v * .34; return [x, y]; }, c: C.dim },
      { r: .14, f: (u, v) => { // ngôi sao trên mái
          const a = rng() * TAU, rr = .085 * (rng() < .5 ? 1 : Math.sqrt(rng()));
          return [rr * Math.cos(a), -.68 + rr * Math.sin(a)]; }, c: C.bright }
    ];
    let at = 0;
    for (let g = 0; g < parts.length; g++) {
      const cnt = g === parts.length - 1 ? n - at : Math.round(n * parts[g].r);
      for (let i = 0; i < cnt; i++) {
        const [x, y] = parts[g].f(rng(), rng());
        pts[(at + i) * 2] = x; pts[(at + i) * 2 + 1] = y;
        const c = rng() < .22 ? mixC(parts[g].c, C.bright, rng() * .6) : parts[g].c;
        col[(at + i) * 3] = c[0]; col[(at + i) * 3 + 1] = c[1]; col[(at + i) * 3 + 2] = c[2];
      }
      at += cnt;
    }
    return { pts, col };
  }

  function emblemShape(rng, n) {
    const pts = new Float32Array(n * 2), col = new Float32Array(n * 3);
    const parts = [
      { r: .16, f: () => { const a = rng() * TAU, r = .6 + (rng() - .5) * .04; return [r * Math.cos(a), r * Math.sin(a)]; }, c: C.gold }, // vành
      { r: .18, f: () => { const a = rng() * TAU, r = .46 * Math.sqrt(rng()); return [r * Math.cos(a), r * Math.sin(a)]; }, c: C.redD }, // nền đỏ
      { r: .14, f: () => { // ngôi sao giữa
          const seg = Math.floor(rng() * 10), t = rng();
          const v = []; for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5 - Math.PI / 2, r = k % 2 === 0 ? .19 : .078; v.push([r * Math.cos(a), r * Math.sin(a)]); }
          const a = v[seg], b = v[(seg + 1) % 10];
          const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
          const j = Math.sqrt(rng()) * .95;
          return [x * j + gauss(rng) * .006, y * j + gauss(rng) * .006]; }, c: C.bright },
      { r: .22, f: () => { // bông lúa hai bên
          const side = rng() < .5 ? 1 : -1;
          const a = side > 0 ? (-.28 + rng() * 1.0) : (Math.PI - (-.28 + rng() * 1.0));
          const r = .55 + rng() * .1;
          const x = r * Math.cos(a), y = r * Math.sin(a);
          return [x, y + gauss(rng) * .012]; }, c: C.gold2 },
      { r: .16, f: () => { // nửa bánh xe răng cưa
          const a = Math.PI * (.12 + rng() * .76); // nửa dưới
          const r = .3 + (rng() < .3 ? rng() * .05 : 0);
          const x = r * Math.cos(a), y = r * Math.sin(a) * 1.0;
          return [x, Math.abs(y) * .9 + .04]; }, c: C.gold },
      { r: .14, f: () => { // dòng chữ tên nước (vệt cong dưới)
          const t = rng(); const a = Math.PI * (.15 + t * .7);
          const r = .72 + gauss(rng) * .015;
          return [r * Math.cos(a), Math.abs(r * Math.sin(a)) * .55 + .12]; }, c: C.dim }
    ];
    let at = 0;
    for (let g = 0; g < parts.length; g++) {
      const cnt = g === parts.length - 1 ? n - at : Math.round(n * parts[g].r);
      for (let i = 0; i < cnt; i++) {
        const [x, y] = parts[g].f();
        pts[(at + i) * 2] = x; pts[(at + i) * 2 + 1] = y;
        const c = rng() < .18 ? mixC(parts[g].c, C.bright, rng() * .6) : parts[g].c;
        col[(at + i) * 3] = c[0]; col[(at + i) * 3 + 1] = c[1]; col[(at + i) * 3 + 2] = c[2];
      }
      at += cnt;
    }
    return { pts, col };
  }

  function textShape(str, rng, n) {
    const pts = new Float32Array(n * 2), col = new Float32Array(n * 3);
    const fill = (canvas, ctx2) => {
      const w = 640, h = 240;
      canvas.width = w; canvas.height = h;
      ctx2.clearRect(0, 0, w, h);
      ctx2.fillStyle = "#fff";
      ctx2.font = "900 200px 'Be Vietnam Pro', 'Segoe UI', sans-serif";
      ctx2.textAlign = "center"; ctx2.textBaseline = "middle";
      ctx2.fillText(str, w / 2, h / 2 + 8);
      const data = ctx2.getImageData(0, 0, w, h).data;
      const hot = [];
      for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2)
        if (data[(y * w + x) * 4 + 3] > 110) hot.push([x, y]);
      if (!hot.length) return null;
      return hot;
    };
    const cv = document.createElement("canvas"), cx2 = cv.getContext("2d", { willReadFrequently: true });
    let hot = fill(cv, cx2);
    if (!hot) hot = [[320, 120]];
    for (let i = 0; i < n; i++) {
      const [px, py] = hot[Math.floor(rng() * hot.length)];
      pts[i * 2] = (px / 640 - .5) * 1.9 + gauss(rng) * .008;
      pts[i * 2 + 1] = (py / 240 - .5) * .86 + gauss(rng) * .008;
      const c = rng() < .3 ? C.bright : C.gold;
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    }
    return { pts, col };
  }

  /* ═══════════ KHỞI TẠO ═══════════ */
  const core = $("#core"), fx = $("#fx");
  const cCore = core.getContext("2d"), cFx = fx.getContext("2d");
  let W = 0, H = 0, DPR = 1, R = 300, CX = 0, CY = 0;

  const isMobile = () => innerWidth < 720;
  let N = isMobile() ? 620 : 1150;
  let hash = new Float32Array(N), phase = new Float32Array(N), size = new Float32Array(N);
  function initParticles() {
    const r = mulberry32(19760702);
    hash = new Float32Array(N); phase = new Float32Array(N); size = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      hash[i] = r(); phase[i] = r() * TAU;
      size[i] = .9 + r() * 1.5;
    }
  }
  initParticles();

  let shapes = [];
  function buildShapes() {
    shapes = SCENES.map((s, idx) => {
      try { return s.make(mulberry32(4177 + idx), N); }
      catch (err) {
        return starPts(mulberry32(99 + idx), 0, 0, .5, .2, 0, N, .5, C.gold, C.gold2);
      }
    });
  }
  buildShapes();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { shapes[7] = SCENES[7].make(mulberry32(4177 + 7), N); });
  }

  function resize() {
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    for (const cv of [core, fx]) {
      cv.width = W * DPR; cv.height = H * DPR;
      cv.getContext("2d").setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    R = Math.min(W, H) * (isMobile() ? .3 : .33);
    CX = isMobile() ? W * .5 : W * .585;
    CY = isMobile() ? H * .40 : H * .5;
  }
  resize(); addEventListener("resize", resize);

  /* ── tiến độ cuộn (làm mượt kiểu Lenis-lite) ── */
  let pTarget = 0, pCur = 0;
  const readScroll = () => {
    const h = document.documentElement;
    pTarget = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
  };
  addEventListener("scroll", readScroll, { passive: true }); readScroll();

  /* ── chuột parallax ── */
  let mx = 0, my = 0, mxs = 0, mys = 0;
  addEventListener("pointermove", e => {
    mx = (e.clientX / W - .5) * 2; my = (e.clientY / H - .5) * 2;
  }, { passive: true });

  /* ── panels & chip ── */
  const panels = $$(".panel");
  const chipNo = $("#chipNo"), chipName = $("#chipName"), pFill = $("#pFill");
  let lastChip = -1;
  const smooth = t => t * t * (3 - 2 * t);
  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;

  /* ── vòng lặp vẽ ── */
  let last = performance.now(), time = 0;
  const S = SCENES.length;

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now; time += dt;

    const k = 1 - Math.exp(-dt * 7.5);
    pCur += (pTarget - pCur) * k;
    mxs += (mx - mxs) * .06; mys += (my - mys) * .06;

    pFill.style.width = (pCur * 100).toFixed(2) + "%";

    const x = pCur * (S - 1);
    const ki = Math.max(0, Math.min(S - 1, Math.floor(x)));
    const f = x - ki;
    const k2 = Math.min(S - 1, ki + 1);
    const e = smooth(clamp01((f - .62) / .38));

    /* chip */
    const chipIdx = Math.round(x);
    if (chipIdx !== lastChip) {
      lastChip = chipIdx;
      chipNo.textContent = String(chipIdx + 1).padStart(2, "0");
      chipName.textContent = SCENES[chipIdx].name;
    }

    /* panels: fi = 0 khi hình đúng ở scene này */
    for (let i = 0; i < panels.length; i++) {
      const el = panels[i], sc = +el.dataset.scene;
      const fi = sc - x;
      const inP = smooth(clamp01((.62 - fi) / .3));
      const outP = smooth(clamp01((-.62 - fi) / .28));
      const op = inP * (1 - outP);
      const dy = (1 - inP) * 44 - outP * 44;
      el.style.opacity = op.toFixed(3);
      el.style.visibility = op > .02 ? "visible" : "hidden";
      el.style.transform = el.classList.contains("panel--center")
        ? `translate(-50%, calc(-50% + ${dy.toFixed(1)}px))`
        : `translateY(calc(-50% + ${dy.toFixed(1)}px))`;
    }

    /* ── vẽ hạt ── */
    const A = shapes[ki].pts, B = shapes[k2].pts;
    const cA = shapes[ki].col, cB = shapes[k2].col;
    const angA = time * SCENES[ki].rot, angB = time * SCENES[k2].rot;
    const ca = Math.cos(angA), sa = Math.sin(angA), cb = Math.cos(angB), sb = Math.sin(angB);
    const ox = mxs * .04, oy = mys * .03;
    const breathe = 1 + Math.sin(time * .55) * .012;

    cCore.clearRect(0, 0, W, H);
    cFx.clearRect(0, 0, W, H);
    cCore.globalCompositeOperation = "lighter";
    cFx.globalCompositeOperation = "lighter";

    for (let i = 0; i < N; i++) {
      const d = hash[i] * .22;
      const t = smooth(clamp01((e - d) / (1 - d)));
      let ax = A[i * 2], ay = A[i * 2 + 1];
      let bx = B[i * 2], by = B[i * 2 + 1];
      // xoay riêng từng hình
      let rx = ax * ca - ay * sa, ry = ax * sa + ay * ca;
      let rx2 = bx * cb - by * sb, ry2 = bx * sb + by * cb;
      let X = (rx + (rx2 - rx) * t);
      let Y = (ry + (ry2 - ry) * t) * breathe;
      // dao động sống
      X += Math.sin(time * .7 + phase[i]) * .007;
      Y += Math.cos(time * .62 + phase[i] * 1.7) * .007;

      const px = CX + (X + ox) * R;
      const py = CY + (Y + oy) * R;

      const cr = cA[i * 3] + (cB[i * 3] - cA[i * 3]) * t;
      const cg = cA[i * 3 + 1] + (cB[i * 3 + 1] - cA[i * 3 + 1]) * t;
      const cb2 = cA[i * 3 + 2] + (cB[i * 3 + 2] - cA[i * 3 + 2]) * t;
      const tw = .72 + .28 * Math.sin(time * 1.4 + phase[i] * 3);

      const s = size[i];
      cCore.fillStyle = `rgba(${cr | 0},${cg | 0},${cb2 | 0},${(.85 * tw).toFixed(3)})`;
      cCore.beginPath(); cCore.arc(px, py, s, 0, 7); cCore.fill();

      cFx.fillStyle = `rgba(${cr | 0},${cg | 0},${cb2 | 0},${(.12 * tw).toFixed(3)})`;
      cFx.beginPath(); cFx.arc(px, py, s * 3.2, 0, 7); cFx.fill();
    }
  }

  if (reduced) {
    // bản tĩnh: vẽ hình cuối một lần
    resize();
    const A = shapes[7].pts, cA = shapes[7].col;
    cCore.globalCompositeOperation = "lighter";
    for (let i = 0; i < N; i++) {
      const px = CX + A[i * 2] * R, py = CY + A[i * 2 + 1] * R;
      cCore.fillStyle = `rgba(${cA[i * 3] | 0},${cA[i * 3 + 1] | 0},${cA[i * 3 + 2] | 0},.85)`;
      cCore.beginPath(); cCore.arc(px, py, size[i], 0, 7); cCore.fill();
    }
    panels.forEach(p => { p.style.opacity = 1; p.style.visibility = "visible"; p.style.position = "static"; });
  } else {
    requestAnimationFrame(frame);
  }

  /* ── về đầu trang ── */
  $("#toTop").addEventListener("click", e => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  });
})();
