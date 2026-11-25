/* =====================================================================
   Psicólogos Brasil — home.js (página inicial, versão 300)
   1) Desenha o avatar dos cards de psicólogos (enquanto não há foto).
   2) Seção "Nossos psicólogos": mostra os psicólogos cadastrados no Painel
      (até 6, com foto, CRP, abordagem, temas, público e link do perfil).
      Sem cadastro (ou só os perfis de demonstração), ficam os cards fixos do index.html.
   3) Pergunta "Quanto custa?": escreve o menor valor cadastrado no Painel.
   4) Links dos artigos funcionam também no computador (Live Server).
   6) Seção "Conteúdos": mostra os 3 artigos mais novos publicados no Painel.
   5) Medição no GA4: clique_agendar (botões principais, que levam à agenda), clique_whatsapp
      (com a seção), clique_cta_interno e clique_crise. Só envia se o GA4 (gtag) estiver instalado no site.
   Precisa de: main.js (BASE, esc, norm, linkArtigo) e dados-psicologos.js (PSI).
   ===================================================================== */
(function () {
  "use strict";

  /* ---------- 1) avatar desenhado (as cores vêm do style="--fundo; --roupa; --pele; --cabelo" do card) ---------- */
  const CABELO = {
    longo: '<path style="fill:var(--cabelo)" d="M90 62c0-22 13-36 30-36s30 14 30 36v40h-9V66c-5-9-12-13-21-13s-16 4-21 13v36h-9z"/>',
    curto: '<path style="fill:var(--cabelo)" d="M92 58c0-19 12-31 28-31s28 12 28 31c-7-9-16-12-28-12s-21 3-28 12z"/>',
    coque: '<circle style="fill:var(--cabelo)" cx="120" cy="22" r="11"/><path style="fill:var(--cabelo)" d="M92 58c0-19 12-31 28-31s28 12 28 31c-7-9-16-12-28-12s-21 3-28 12z"/>'
  };
  function avatar(tipo) {
    return '<svg viewBox="0 0 240 150" preserveAspectRatio="xMidYMax meet" aria-hidden="true">' +
      '<circle cx="214" cy="6" r="54" fill="#fff" opacity=".45"/>' +
      '<path style="fill:var(--roupa)" d="M72 150c3-34 22-52 48-52s45 18 48 52z"/>' +
      '<rect style="fill:var(--pele)" x="110" y="80" width="20" height="24" rx="7"/>' +
      '<circle style="fill:var(--pele)" cx="120" cy="60" r="28"/>' +
      (CABELO[tipo] || CABELO.curto) + "</svg>";
  }
  document.querySelectorAll(".h-psi-foto").forEach((el) => {
    if (!el.querySelector("img, svg")) el.innerHTML = avatar(el.dataset.cabelo);
  });

  /* ---------- 4) links de artigos (no computador o endereço curto não abre sem o .htaccess) ---------- */
  if (typeof linkArtigo === "function") {
    document.querySelectorAll("a[data-artigo]").forEach((a) => { a.href = linkArtigo(a.dataset.artigo); });
  }

  /* ---------- 5) medição no GA4 ---------- */
  function evento(nome, params) {
    try { if (typeof window.gtag === "function") window.gtag("event", nome, params); } catch (e) { /* sem GA4: ignora */ }
  }
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;
    if (a.dataset.secao) evento("clique_whatsapp", { secao: a.dataset.secao });
    else if (a.dataset.crise) evento("clique_crise", { destino: a.dataset.crise });
    else if (a.dataset.interno && /-agendar$/.test(a.dataset.interno)) evento("clique_agendar", { secao: a.dataset.interno.replace(/-agendar$/, "") });   /* botões principais: vão para a agenda */
    else if (a.dataset.interno) evento("clique_cta_interno", { secao: a.dataset.interno, destino: a.getAttribute("href") });
  });

  /* ---------- 6) Conteúdos: os 3 artigos mais novos publicados no Painel (uma linha) ----------
     Para ver os outros, a pessoa clica em "Ver todos os conteúdos". Sem nenhum publicado, ficam os 3 cards fixos do index.html. */
  (function () {
    const grade = document.querySelector("#artigos .h-arts");
    if (!grade || typeof NUVEM === "undefined") return;
    const caminho = (u) => {
      u = String(u || "");
      if (!u || /^(https?:)?\/\//.test(u) || /^data:/.test(u) || u.startsWith(BASE)) return u;
      return BASE + u.replace(/^\/+/, "");
    };
    const CORES = ["#e9edfb", "#fff4d6", "#e3e8fa", "#f6eadd", "#eef1f8", "#e1e7fb"];
    const LIVRO = '<svg viewBox="0 0 300 150" aria-hidden="true"><g fill="none" stroke="#1f35b5" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" transform="translate(114 39) scale(3)"><path d="M2.5 5.5C5 4.5 8.5 4.5 12 6.5c3.5-2 7-2 9.5-1V19c-2.5-1-6-1-9.5 1-3.5-2-7-2-9.5-1z" stroke-width="1.6"/><path d="M12 6.5V20" stroke-width="1.6"/></g></svg>';
    NUVEM.lista("artigos")
      .then((l) => (l || []).filter((a) => a && a.slug && a.titulo).slice(0, 3))
      .then((l) => (l.length ? Promise.all(l.map((a) => NUVEM.resolverTexto(a.capa || "").catch(() => "").then((capa) => ({ a, capa })))) : null))
      .then((itens) => {
        if (!itens) return;
        grade.innerHTML = itens.map(({ a, capa }, i) =>
          `<li><a class="h-art" href="${esc(linkArtigo(a.slug))}">` +
          `<div class="h-art-capa" style="background:${CORES[i % CORES.length]}">${LIVRO}` +
          (capa ? `<img src="${esc(caminho(capa))}" alt="" width="600" height="300" loading="lazy" decoding="async" onerror="this.remove()">` : "") +
          `</div><div class="h-art-corpo">${a.categoria ? `<span class="h-art-tag">${esc(a.categoria)}</span>` : ""}<h3>${esc(a.titulo)}</h3></div></a></li>`
        ).join("");
      })
      .catch(() => { /* sem conexão: ficam os cards fixos */ });
  })();

  /* ---------- 2) e 3) dados do Painel ---------- */
  if (typeof PSI === "undefined") return;
  const chave = (s) => (typeof norm === "function" ? norm(String(s || "")) : String(s || "").toLowerCase()).replace(/^(dra?\.?|psic[oó]log[ao])\s+/, "").replace(/\s+/g, " ").trim();
  const minusc = (l) => l.map((t) => /^[A-ZÀ-Ú]{2,}/.test(String(t)) ? String(t) : String(t).toLowerCase());   /* TDAH, TCC ficam em maiúsculas */
  const juntar = (l) => (PSI.juntar ? PSI.juntar(l) : l.join(", "));

  PSI.carregar().then(({ lista, demo }) => {
    if (demo || !lista || !lista.length) return;   /* perfis de demonstração: fica o texto fixo */

    /* cards: os psicólogos cadastrados no Painel (até 6) no lugar dos cards fixos.
       A ordem muda todo dia (rodízio, como na página Psicólogos), para ninguém ficar sempre em primeiro. */
    const grade = document.getElementById("h-psis");
    if (grade) {
      const HOJE = new Date().toISOString().slice(0, 10);
      const rodizio = (x) => { let h = 2166136261; for (const c of (x.slug || x.nome) + HOJE) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
      const seis = lista.slice().sort((a, b) => rodizio(a) - rodizio(b)).slice(0, 6);
      const CFP = "https://cadastro.cfp.org.br/";
      grade.innerHTML = seis.map((x) => {
        const trat = x.tratamento || "Psicólogo(a)";
        const mulher = /psic[oó]loga$/i.test(trat);
        const linhas = [];
        if (x.abordagens.length) linhas.push(["Abordagem", juntar(x.abordagens)]);
        if (x.temas.length) linhas.push(["Temas", juntar(minusc(x.temas.slice(0, 3)))]);
        if (x.publico.length) linhas.push(["Atende", juntar(minusc(x.publico))]);
        const url = esc(x.url || BASE + "psicologos/");
        return `<li class="h-psi" data-nome="${esc(x.nome)}" style="--fundo:${esc(x._cor || "#e9edfb")};--roupa:#1f35b5;--pele:#d9a27c;--cabelo:#3b2a22">` +
          `<div class="h-psi-foto" data-cabelo="${mulher ? "longo" : "curto"}">` +
          (x.foto ? `<img src="${esc(x.foto)}" alt="Foto de ${esc(x.nome)}, ${esc(trat.toLowerCase())}" width="400" height="400" loading="lazy" decoding="async" onerror="this.remove()">` : "") +
          `</div><div class="h-psi-corpo"><h3><a href="${url}">${esc(x.nome)}</a></h3>` +
          `<p class="h-psi-crp">${esc(trat)}${x.crp ? ` · <a href="${CFP}" target="_blank" rel="noopener">CRP ${esc(x.crp)}</a>` : ""}</p>` +
          (linhas.length ? `<dl>${linhas.map(([r, v]) => `<div><dt>${esc(r)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>` : "") +
          `<a class="h-seta" href="${url}">Ver perfil de ${esc(x.nome)}</a></div></li>`;
      }).join("");
      /* sem foto: o desenho entra atrás (e aparece se a foto não carregar) */
      grade.querySelectorAll(".h-psi-foto").forEach((el) => el.insertAdjacentHTML("afterbegin", avatar(el.dataset.cabelo)));
    }

    /* responsável técnico: link para o perfil completo, se o Fábio estiver no Painel */
    const fabio = lista.find((p) => /\bfabio\b/.test(chave(p.nome)) && /medeiros/.test(chave(p.nome)));
    const rt = document.getElementById("h-rt-perfil");
    if (fabio && fabio.url && rt) rt.href = fabio.url;

    /* valor da sessão (só na pergunta "Quanto custa?") */
    const valores = lista.map((p) => Number(p.valor)).filter((v) => v > 0);
    const alvo = document.querySelector("[data-valor-sessao]");
    if (alvo && valores.length) {
      const min = Math.min(...valores);
      const igual = valores.every((v) => v === min);
      alvo.textContent = (igual ? " e custa " : " e custa a partir de ") + min.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }
  }).catch(() => { /* sem conexão: fica o texto fixo */ });
})();
