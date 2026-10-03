/* ═══════════════════════════════════════════════════════════
   SAO VÀNG · 1976 — hồ sơ đỏ: reveal, tiến trình, quiz, tilt
   ═══════════════════════════════════════════════════════════ */
(() => {
  "use strict";
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── reveal từng khối ── */
  const targets = $$(".shead, .date, .headline, .body, .qa, .statcard, .datastrip, .gcard, .mchart, .paper, .photocover, .qlist, .people-strip, .refs, .quiz");
  targets.forEach(el => el.classList.add("rv"));
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
  }, { threshold: 0.18 });
  targets.forEach(el => io.observe(el));

  /* ── thanh tiến trình + pill % ── */
  const barFill = $("#barFill"), pillPct = $("#pillPct"), pillLabel = $("#pillLabel");
  const scenes = $$("[data-name]");
  const onScroll = () => {
    const h = document.documentElement;
    const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
    barFill.style.width = (p * 100).toFixed(1) + "%";
    pillPct.textContent = Math.round(p * 100) + "%";
    let cur = scenes[0];
    for (const s of scenes) if (s.getBoundingClientRect().top <= innerHeight * .45) cur = s;
    if (cur) pillLabel.textContent = cur.dataset.no + " · " + cur.dataset.name;
  };
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  /* ── bộ đếm cảnh trên hero ── */
  const noNow = $("#noNow");
  if (noNow) {
    new IntersectionObserver(([e]) => {
      noNow.textContent = e.isIntersecting ? "01" : noNow.textContent;
    }, { threshold: .5 }).observe($("#dau"));
  }

  /* ── mục lục ── */
  const tocBtn = $("#tocBtn"), tocPanel = $("#tocPanel");
  tocBtn.addEventListener("click", () => { tocPanel.hidden = !tocPanel.hidden; });
  $$("#tocPanel a").forEach(a => a.addEventListener("click", () => { tocPanel.hidden = true; }));
  addEventListener("click", e => {
    if (!tocPanel.hidden && !tocPanel.contains(e.target) && e.target !== tocBtn && !tocBtn.contains(e.target))
      tocPanel.hidden = true;
  });

  /* ── nghiêng thẻ theo chuột ── */
  if (matchMedia("(hover:hover) and (pointer:fine)").matches && !reduced) {
    $$("[data-tilt], .gcard").forEach(card => {
      card.addEventListener("mousemove", e => {
        const r = card.getBoundingClientRect();
        const dx = (e.clientX - r.left) / r.width - .5;
        const dy = (e.clientY - r.top) / r.height - .5;
        card.style.transform =
          `perspective(900px) rotateX(${(-dy * 7).toFixed(2)}deg) rotateY(${(dx * 9).toFixed(2)}deg) scale(1.02)`;
      });
      card.addEventListener("mouseleave", () => { card.style.transform = ""; });
    });
  }

  /* ── quiz ── */
  $$(".qcard").forEach(q => {
    const ex = $(".qcard__ex", q);
    $$(".qcard__opts button", q).forEach(btn => {
      btn.addEventListener("click", () => {
        $$(".qcard__opts button", q).forEach(b => b.disabled = true);
        btn.classList.add(btn.dataset.ok !== undefined ? "is-ok" : "is-no");
        if (btn.dataset.ok === undefined) {
          const ok = $('.qcard__opts button[data-ok]', q);
          if (ok) ok.classList.add("is-ok");
        }
        ex.hidden = false;
      });
    });
  });
})();
