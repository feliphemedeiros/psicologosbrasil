/* Psicólogos Brasil — menu.js
   1) Menu do celular: cartão flutuante que abre logo abaixo do botão ☰.
   2) Botão flutuante de baixo: some quando a pessoa rola para baixo e volta quando ela para ou rola para cima. */

(function () {
  const btn = $("#mbtn"), dr = $("#mpanel"), sc = $("#scrim");
  if (!btn || !dr) return;
  /* v240: ícone de 3 risquinhos que gira e vira X ao abrir (não troca mais o desenho) */
  btn.innerHTML = '<span class="mb-ico" aria-hidden="true"><i class="mb-l mb-1"></i><i class="mb-l"></i><i class="mb-l mb-3"></i></span>';
  /* ícone pequeno ao lado de cada link do cartão (pelo endereço) */
  const ICONES = {
    inicio: '<path d="M4 11l8-7 8 7v8.5a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 19.5z"/>',
    psicologos: '<circle cx="9" cy="8" r="3.4"/><path d="M3 20c.6-3.3 3-5.3 6-5.3s5.4 2 6 5.3"/><path d="M16 4.6a3.4 3.4 0 0 1 0 6.8M18 14.9c1.6.6 2.7 2.4 3 5.1"/>',
    blog: '<path d="M5 4h10l4 4v12H5z"/><path d="M14 4v5h5M8 13h8M8 17h6"/>',
    ansiedade: '<path d="M12 20.5s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.9c0 5.6-7.5 10-7.5 10z"/>',
    "quem-somos": '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.6v.1"/>',
    contato: '<path d="M20 11.5a8 8 0 0 1-11.9 7L4 20l1.5-4A8 8 0 1 1 20 11.5z"/>',
    "para-psicologos": '<rect x="3.5" y="7.5" width="17" height="12" rx="2"/><path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M3.5 13h17"/>',
    conhecer: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'
  };
  dr.querySelectorAll(".drawer-nav a").forEach((a, i) => {
    a.style.setProperty("--i", i);
    let k = "inicio";
    try { const seg = new URL(a.href, location.href).pathname.split("/").filter(Boolean); k = seg.length ? seg[seg.length - 1].replace(/\.html$/, "") : "inicio"; if (k === "index") k = seg.length > 1 ? seg[seg.length - 2] : "inicio"; } catch (e) { /* fica o da casa */ }
    if (!a.classList.contains("drawer-psi") && ICONES[k] && !a.querySelector(".mi-ico")) a.insertAdjacentHTML("afterbegin", `<span class="mi-ico" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONES[k]}</svg></span>`);
  });
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
    btn.setAttribute("aria-expanded", "true"); btn.setAttribute("aria-label", "Fechar menu"); btn.classList.add("ativo");
    const primeiro = dr.querySelector(".drawer-nav a");
    setTimeout(() => primeiro && primeiro.focus({ preventScroll: true }), 60);
  };
  const fechar = (voltarFoco = true) => {
    if (!aberto()) return;
    dr.classList.remove("open"); sc.classList.remove("show"); document.documentElement.classList.remove("menu-open");
    btn.setAttribute("aria-expanded", "false"); btn.setAttribute("aria-label", "Abrir menu"); btn.classList.remove("ativo");
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

/* v240: a faixa "Conheça o psicólogo em 15 minutos" fica fixa no topo ao rolar; o menu fica logo abaixo dela */
(function () {
  const ann = document.querySelector(".ann");
  if (!ann) return;
  /* a faixa inteira é clicável: tocar fora do botão também abre "Conheça o psicólogo" */
  const link = ann.querySelector("a[href]");
  if (link) ann.addEventListener("click", (e) => { if (!e.target.closest("a")) link.click(); });
  const medir = () => document.documentElement.style.setProperty("--ann-h", ann.offsetHeight + "px");
  medir();
  window.addEventListener("resize", medir);
  if (window.ResizeObserver) new ResizeObserver(medir).observe(ann);
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
