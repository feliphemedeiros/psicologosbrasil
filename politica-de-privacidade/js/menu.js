/* Psicólogos Brasil — menu.js
   1) Menu do celular: cartão flutuante que abre logo abaixo do botão ☰.
   2) Botão flutuante de baixo: some quando a pessoa rola para baixo e volta quando ela para ou rola para cima. */

(function () {
  const btn = $("#mbtn"), dr = $("#mpanel"), sc = $("#scrim");
  if (!btn || !dr) return;
  const ICO_MENU = btn.innerHTML;
  const ICO_X = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const aberto = () => dr.classList.contains("open");
  /* o cartão abre logo abaixo do botão ☰, alinhado à direita dele */
  const posicionar = () => {
    const r = btn.getBoundingClientRect();
    dr.style.setProperty("--menu-top", Math.round(r.bottom + 8) + "px");
    dr.style.setProperty("--menu-right", Math.max(12, Math.round(window.innerWidth - r.right)) + "px");
  };
  let yAbriu = 0;
  const abrir = () => {
    posicionar(); yAbriu = window.scrollY;
    dr.classList.add("open"); sc.classList.add("show"); document.documentElement.classList.add("menu-open");   /* esconde o botão flutuante de baixo */
    btn.setAttribute("aria-expanded", "true"); btn.setAttribute("aria-label", "Fechar menu"); btn.innerHTML = ICO_X;
    const primeiro = dr.querySelector(".drawer-nav a");
    setTimeout(() => primeiro && primeiro.focus({ preventScroll: true }), 60);
  };
  const fechar = (voltarFoco = true) => {
    if (!aberto()) return;
    dr.classList.remove("open"); sc.classList.remove("show"); document.documentElement.classList.remove("menu-open");
    btn.setAttribute("aria-expanded", "false"); btn.setAttribute("aria-label", "Abrir menu"); btn.innerHTML = ICO_MENU;
    if (voltarFoco) btn.focus({ preventScroll: true });
  };
  btn.addEventListener("click", () => (aberto() ? fechar() : abrir()));
  sc.addEventListener("click", () => fechar(false));
  const x = $("#mclose"); if (x) x.addEventListener("click", () => fechar());
  dr.addEventListener("click", (e) => { if (e.target.closest("a")) fechar(false); });
  /* fecha quando a pessoa rola de verdade (ignora pequenos ajustes do navegador ao tocar) */
  window.addEventListener("scroll", () => { if (aberto() && Math.abs(window.scrollY - yAbriu) > 24) fechar(false); }, { passive: true });
  window.addEventListener("resize", () => { if (aberto()) posicionar(); });
  document.addEventListener("keydown", (e) => {
    if (!aberto()) return;
    if (e.key === "Escape") return fechar();
    if (e.key !== "Tab") return;
    const f = [...dr.querySelectorAll(".drawer-nav a[href], .drawer-cta a[href]")], a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  });
  matchMedia("(min-width:1181px)").addEventListener("change", (m) => m.matches && fechar(false));
})();

(function () {
  const fab = $("#fab");
  if (!fab) return;
  const cel = matchMedia("(max-width:760px)");
  let ultimo = window.scrollY, espera;
  /* A barra começa escondida e aparece logo na primeira rolagem (a partir de 60px),
     em todas as páginas, inclusive na inicial. */
  const limite = () => 60;
  const mostrar = () => { if (window.scrollY > limite()) fab.classList.remove("is-hidden"); };
  const esconder = () => fab.classList.add("is-hidden");
  /* começa escondida sem a animação de sair (para não "piscar" ao abrir a página) */
  fab.style.transition = "none"; esconder();
  requestAnimationFrame(() => requestAnimationFrame(() => { fab.style.transition = ""; }));
  window.addEventListener("scroll", () => {
    if (!cel.matches) return;
    clearTimeout(espera);
    const y = Math.max(0, window.scrollY), d = y - ultimo;
    if (y <= limite()) { esconder(); ultimo = y; return; }  // no começo da página: escondida
    if (d > 8) { esconder(); ultimo = y; }           // descendo: some
    else if (d < -8) { mostrar(); ultimo = y; }      // subindo: aparece
    espera = setTimeout(mostrar, 450);               // parou de rolar: aparece (devagar)
  }, { passive: true });
})();
