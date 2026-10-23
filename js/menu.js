/* Psicólogos Brasil — menu.js
   1) Menu lateral do celular (abre pela direita).
   2) Botão flutuante de baixo: some quando a pessoa rola para baixo e volta quando ela para ou rola para cima. */

(function () {
  const btn = $("#mbtn"), dr = $("#mpanel"), sc = $("#scrim"), x = $("#mclose");
  if (!btn || !dr) return;
  const root = document.documentElement;
  const abrir = () => {
    dr.classList.add("open"); sc.classList.add("show"); root.classList.add("menu-open");
    btn.setAttribute("aria-expanded", "true");
    setTimeout(() => x.focus(), 60);
  };
  const fechar = (voltarFoco = true) => {
    dr.classList.remove("open"); sc.classList.remove("show"); root.classList.remove("menu-open");
    btn.setAttribute("aria-expanded", "false");
    if (voltarFoco) btn.focus();
  };
  btn.addEventListener("click", abrir);
  x.addEventListener("click", () => fechar());
  sc.addEventListener("click", () => fechar());
  dr.addEventListener("click", (e) => { if (e.target.closest("a")) fechar(false); });
  document.addEventListener("keydown", (e) => {
    if (!dr.classList.contains("open")) return;
    if (e.key === "Escape") return fechar();
    if (e.key !== "Tab") return;
    const f = [...dr.querySelectorAll("a[href],button")], a = f[0], z = f[f.length - 1];
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
  const mostrar = () => fab.classList.remove("is-hidden");
  const esconder = () => fab.classList.add("is-hidden");
  window.addEventListener("scroll", () => {
    if (!cel.matches) return;
    clearTimeout(espera);
    const y = Math.max(0, window.scrollY), d = y - ultimo;
    if (y <= 80) mostrar();                          // no topo: sempre aparece
    else if (d > 8) { esconder(); ultimo = y; }      // descendo: some
    else if (d < -8) { mostrar(); ultimo = y; }      // subindo: aparece
    espera = setTimeout(mostrar, 450);               // parou de rolar: aparece (devagar)
  }, { passive: true });
})();
