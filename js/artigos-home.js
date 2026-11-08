/* Psicólogos Brasil — artigos-home.js
   Seção "Artigos recentes" da página inicial.
   Mostra os 3 artigos mais novos publicados pelo Painel (js/nuvem.js), com capa,
   categoria e link certo. Se houver menos de 3 publicados, completa com os cards
   que já estão escritos no index.html (e, sem nenhum publicado, ficam só eles).
   Modo teste (Firebase ainda não ligado): lê o que foi publicado NESTE navegador. */
(function () {
  "use strict";
  const grade = document.querySelector("#artigos .art-grid");
  if (!grade || typeof NUVEM === "undefined") return;
  /* cards fixos do index.html, para completar até 3 */
  const fixos = [...grade.querySelectorAll(".art-card")].map((c) => {
    const copia = c.cloneNode(true);
    copia.classList.add("in");      /* já aparece, sem esperar a animação de entrada */
    return copia.outerHTML;
  });

  const caminho = (u) => {
    u = String(u || "");
    if (!u || /^(https?:)?\/\//.test(u) || /^data:/.test(u) || u.startsWith(BASE)) return u;
    return BASE + u.replace(/^\/+/, "");
  };
  const LIVRO = '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 5.5C5 4.5 8.5 4.5 12 6.5c3.5-2 7-2 9.5-1V19c-2.5-1-6-1-9.5 1-3.5-2-7-2-9.5-1z"/><path d="M12 6.5V20"/></svg>';
  const SETA = '<svg class="seta-i" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  function card(a, capa) {
    return `<a class="art-card rv in" href="${esc(linkArtigo(a.slug))}">` +
      `<div class="art-img">${LIVRO}${capa ? `<img src="${esc(caminho(capa))}" alt="" width="800" height="500" loading="lazy" onerror="this.remove()">` : ""}</div>` +
      `<div class="art-body">${a.categoria ? `<span class="art-tag">${esc(a.categoria)}</span>` : ""}<h3>${esc(a.titulo || "")}</h3>` +
      `<span class="art-go">Ler artigo${SETA}</span></div></a>`;
  }

  NUVEM.lista("artigos")
    .then((l) => (l || []).filter((a) => a && a.slug && a.titulo).slice(0, 3))
    .then((l) => (l.length ? Promise.all(l.map((a) => NUVEM.resolverTexto(a.capa || "").catch(() => "").then((c) => card(a, c)))) : null))
    .then((html) => {
      if (!html) return;
      const resto = fixos.slice(0, Math.max(0, 3 - html.length));
      grade.innerHTML = html.concat(resto).join("");
    })
    .catch(() => { /* sem conexão: ficam os cards de exemplo */ });
})();
