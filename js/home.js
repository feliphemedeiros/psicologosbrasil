/* =====================================================================
   Psicólogos Brasil — home.js (página inicial, versão 300)
   1) Links de artigos que funcionam também no computador (Live Server).
   2) "Nossos psicólogos": mostra os psicólogos cadastrados no Painel (até 6),
      com foto, CRP, abordagem, temas, público e link do perfil.
      Sem cadastro (ou só os perfis de demonstração), ficam os 6 cards do index.html.
   3) "Conteúdos": mostra os artigos publicados no Painel (até 6, os mais novos).
      Sem nenhum publicado, ficam os 6 cards do index.html.
   4) Responsável técnico: link para o perfil completo, se o Fábio estiver no Painel.
   5) "Quanto custa?": escreve o menor valor cadastrado no Painel.
   6) Medição no GA4 (só se o GA4 estiver instalado): clique_whatsapp (com a seção),
      clique_cta_interno e clique_crise.
   Precisa de: main.js (BASE, esc, norm, linkArtigo), nuvem.js (NUVEM) e
   dados-psicologos.js (PSI).
   ===================================================================== */
(function () {
  "use strict";

  /* ---------- 1) links de artigos ---------- */
  function ligarArtigos(raiz) {
    if (typeof linkArtigo !== "function") return;
    (raiz || document).querySelectorAll("a[data-artigo]").forEach((a) => { a.href = linkArtigo(a.dataset.artigo); });
  }
  ligarArtigos();

  /* ---------- 6) medição no GA4 ---------- */
  function evento(nome, params) {
    try { if (typeof window.gtag === "function") window.gtag("event", nome, params); } catch (e) { /* sem GA4 */ }
  }
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;
    if (a.dataset.secao) evento("clique_whatsapp", { secao: a.dataset.secao });
    else if (a.dataset.crise) evento("clique_crise", { destino: a.dataset.crise });
    else if (a.dataset.interno) evento("clique_cta_interno", { secao: a.dataset.interno, destino: a.getAttribute("href") });
  });

  const SETA = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
  const FORA = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>';
  const caminho = (u) => {
    u = String(u || "");
    if (!u || /^(https?:)?\/\//.test(u) || /^data:/.test(u) || (typeof BASE === "string" && u.startsWith(BASE))) return u;
    return (typeof BASE === "string" ? BASE : "./") + u.replace(/^\/+/, "");
  };

  /* desenho no lugar da foto (o mesmo estilo dos cards fixos) */
  const FUNDOS = ["#E9EDFB", "#FFF4D6", "#EEF1FC"];
  const PELES = ["#C68A62", "#E0B08A", "#F1C9A5", "#8D5B3F", "#B7835F", "#A86F4C"];
  function avatar(i, mulher) {
    const fundo = FUNDOS[i % FUNDOS.length], pele = PELES[i % PELES.length], roupa = i % 2 ? "#101A4F" : "#1F35B5";
    const cabelo = mulher
      ? '<path d="M50 70c-2-28 12-44 30-44s32 16 30 44c-4-8-6-20-8-24-6 6-16 8-24 8s-16-2-20-6c-4 6-6 14-8 22z" fill="#3B2A22"/><path d="M50 70c0 20 4 34 10 40l-8 2c-6-10-6-26-2-42zM110 70c0 20-4 34-10 40l8 2c6-10 6-26 2-42z" fill="#3B2A22"/>'
      : '<path d="M52 58c0-20 12-32 28-32s28 12 28 32c-6-10-14-14-28-14s-22 4-28 14z" fill="#2B2B2B"/>';
    return `<svg viewBox="-40 4 240 148" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect x="-70" y="-30" width="300" height="180" fill="${fundo}"/><circle cx="150" cy="10" r="56" fill="#fff" opacity=".35"/><path d="M30 150c4-34 24-50 50-50s46 16 50 50z" fill="${roupa}"/><rect x="72" y="84" width="16" height="20" rx="6" fill="${pele}"/><ellipse cx="80" cy="64" rx="25" ry="28" fill="${pele}"/>${cabelo}</svg>`;
  }

  /* ---------- 3) Conteúdos: artigos publicados no Painel ---------- */
  (function () {
    const grade = document.getElementById("nh-arts");
    if (!grade || typeof NUVEM === "undefined") return;
    const CAPAS = ["#E9EDFB", "#FFF4D6", "#EEF1FC"];
    const LIVRO = '<svg viewBox="0 0 300 150" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g fill="none" stroke="#1F35B5" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" transform="translate(114 39) scale(3)"><path d="M2.5 5.5C5 4.5 8.5 4.5 12 6.5c3.5-2 7-2 9.5-1V19c-2.5-1-6-1-9.5 1-3.5-2-7-2-9.5-1z"/><path d="M12 6.5V20"/></g></svg>';
    NUVEM.lista("artigos")
      .then((l) => (l || []).filter((a) => a && a.slug && a.titulo).slice(0, 6))
      .then((l) => (l.length ? Promise.all(l.map((a) => NUVEM.resolverTexto(a.capa || "").catch(() => "").then((capa) => ({ a, capa })))) : null))
      .then((itens) => {
        if (!itens) return;
        grade.innerHTML = itens.map(({ a, capa }, i) =>
          `<a class="nh-card nh-art" href="${esc(linkArtigo(a.slug))}"><div class="nh-th" style="background:${CAPAS[i % CAPAS.length]}">${LIVRO}` +
          (capa ? `<img src="${esc(caminho(capa))}" alt="" width="600" height="360" loading="lazy" decoding="async" onerror="this.remove()">` : "") +
          `</div><div class="nh-ab2">${a.categoria ? `<span class="nh-cat">${esc(a.categoria)}</span>` : ""}<h3>${esc(a.titulo)}</h3></div></a>`
        ).join("");
      })
      .catch(() => { /* sem conexão: ficam os cards fixos */ });
  })();

  /* ---------- 2), 4) e 5) dados dos psicólogos ---------- */
  if (typeof PSI === "undefined") return;
  const juntar = (l) => (PSI.juntar ? PSI.juntar(l) : l.join(", "));
  const minusc = (l) => l.map((t) => (/^[A-ZÀ-Ú]{2,}/.test(String(t)) ? String(t) : String(t).toLowerCase()));   /* TDAH, TCC ficam em maiúsculas */
  const chave = (s) => (typeof norm === "function" ? norm(String(s || "")) : String(s || "").toLowerCase()).replace(/\s+/g, " ").trim();

  PSI.carregar().then(({ lista, demo }) => {
    if (demo || !lista || !lista.length) return;   /* perfis de demonstração: ficam os cards fixos */

    /* cards dos psicólogos: a ordem muda todo dia (rodízio), para ninguém ficar sempre em primeiro */
    const grade = document.getElementById("nh-psis");
    if (grade) {
      const HOJE = new Date().toISOString().slice(0, 10);
      const rodizio = (x) => { let h = 2166136261; for (const c of (x.slug || x.nome) + HOJE) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
      const seis = lista.slice().sort((a, b) => rodizio(a) - rodizio(b)).slice(0, 6);
      grade.innerHTML = seis.map((x, i) => {
        const trat = x.tratamento || "Psicólogo(a)";
        const linhas = [];
        if (x.abordagens.length) linhas.push(["Abordagem", juntar(x.abordagens)]);
        if (x.temas.length) linhas.push(["Temas", juntar(minusc(x.temas.slice(0, 3)))]);
        if (x.publico.length) linhas.push(["Atende", juntar(minusc(x.publico))]);
        const url = esc(x.url || (typeof BASE === "string" ? BASE : "./") + "psicologos/");
        return `<article class="nh-card nh-psi"><div class="nh-foto">${avatar(i, /psic[oó]loga$/i.test(trat))}` +
          (x.foto ? `<img src="${esc(x.foto)}" alt="Foto de ${esc(x.nome)}, ${esc(trat.toLowerCase())}" width="400" height="400" loading="lazy" decoding="async" onerror="this.remove()">` : "") +
          `</div><div class="nh-pb"><h3><a href="${url}">${esc(x.nome)}</a></h3>` +
          `<p class="nh-crp">${esc(trat)}${x.crp ? ` · <a href="https://cadastro.cfp.org.br/" target="_blank" rel="noopener">CRP ${esc(x.crp)} ${FORA}</a>` : ""}</p>` +
          (linhas.length ? `<dl>${linhas.map(([r, v]) => `<dt>${esc(r)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>` : "") +
          `<a class="nh-lk" href="${url}">Ver perfil de ${esc(x.nome)} ${SETA}</a></div></article>`;
      }).join("");
    }

    /* responsável técnico */
    const fabio = lista.find((p) => /\bfabio\b/.test(chave(p.nome)) && /medeiros/.test(chave(p.nome)));
    const rt = document.getElementById("nh-rt-perfil");
    if (fabio && fabio.url && rt) rt.href = fabio.url;

    /* valor da sessão (só na pergunta "Quanto custa?") */
    const valores = lista.map((p) => Number(p.valor)).filter((v) => v > 0);
    const alvo = document.querySelector("[data-valor-sessao]");
    if (alvo && valores.length) {
      const min = Math.min(...valores);
      alvo.textContent = (valores.every((v) => v === min) ? " e custa " : " e custa a partir de ") +
        min.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }
  }).catch(() => { /* sem conexão: ficam os cards fixos */ });
})();
