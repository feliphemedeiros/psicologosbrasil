/* Psicólogos Brasil — página de Ansiedade.
   1) "Ler mais": abre o texto completo logo abaixo dos cartões (um de cada vez).
   2) Chamada do meio: mostra fotos de psicólogos que atendem ansiedade
      (só com os perfis publicados; com os de demonstração fica só o botão). */
(function () {
  /* ===== 1) Ler mais ===== */
  const botoes = Array.from(document.querySelectorAll(".ax-mais"));
  const fecharTodos = (exceto) => botoes.forEach((b) => {
    if (b === exceto) return;
    b.setAttribute("aria-expanded", "false");
    b.closest("article")?.classList.remove("aberto");
    const t = document.getElementById(b.getAttribute("aria-controls"));
    if (t) t.hidden = true;
  });
  const rotulo = (b, aberto) => { b.firstChild.nodeValue = aberto ? "Fechar" : "Ler mais"; };
  botoes.forEach((b) => {
    const txt = document.getElementById(b.getAttribute("aria-controls"));
    if (!txt) return;
    b.addEventListener("click", () => {
      const abrir = txt.hidden;
      fecharTodos(b); botoes.forEach((o) => o !== b && rotulo(o, false));
      txt.hidden = !abrir;
      b.setAttribute("aria-expanded", String(abrir));
      b.closest("article")?.classList.toggle("aberto", abrir);
      rotulo(b, abrir);
      if (abrir) {
        const r = txt.getBoundingClientRect();
        if (r.bottom > window.innerHeight || r.top < 70) txt.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
      }
    });
  });
  document.querySelectorAll("[data-fechar]").forEach((f) => f.addEventListener("click", () => {
    const b = document.querySelector(`.ax-mais[aria-controls="${f.dataset.fechar}"]`);
    if (b) { b.click(); b.focus(); }
  }));

  /* ===== 2) Fotos dos psicólogos que atendem ansiedade ===== */
  const ul = document.getElementById("ax-cta-fotos");
  if (!ul || typeof PSI === "undefined") return;
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const tem = (x) => (x.temas || []).some((t) => /ansiedade|p[âa]nico/i.test(t));
  PSI.carregar().then(({ lista, demo }) => {
    if (demo) return;
    const d = new Date(), hoje = d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate();
    const hash = (t) => { let h = 2166136261; for (const c of t + hoje) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
    const sel = lista.filter(tem).sort((a, b) => hash(a.slug) - hash(b.slug)).slice(0, 4);
    if (!sel.length) return;
    ul.innerHTML = sel.map((x) => `<li><a href="${esc(x.url)}" title="${esc(x.nome)}">${x.foto
      ? `<img src="${esc(x.foto)}" alt="${esc(x.nome)}" width="52" height="52" loading="lazy">`
      : `<span style="background:${esc(x._cor)}" aria-label="${esc(x.nome)}">${esc(PSI.iniciais(x.nome))}</span>`}</a></li>`).join("");
    ul.hidden = false;
  }).catch(() => {});
})();
