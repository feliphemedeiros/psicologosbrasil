/* Psicólogos Brasil — artigo-pagina.js
   Página de cada artigo, com endereço curto: psicologosbrasil.com.br/nome-do-artigo/
   - Na Hostinger: o .htaccess abre esta página para esse endereço.
   - No GitHub Pages: o 404.html manda para /blog/artigo/?a=nome-do-artigo e aqui o endereço volta a ficar curto.
   Mostra o artigo publicado pelo Painel online (via js/nuvem.js). Não precisa criar uma página por artigo. */
(function () {
  const alvo = document.getElementById("artigo");
  if (!alvo || typeof NUVEM === "undefined") return;
  /* Raiz do site ("/" no domínio, "/nome-do-repo/" no GitHub Pages) e o nome do artigo pelo endereço */
  const RAIZ = new URL(BASE, location.href).pathname;
  const RAIZ_ABS = location.origin + RAIZ;
  let slug = (new URLSearchParams(location.search).get("a") || "").trim().toLowerCase();
  if (!slug) { const resto = decodeURIComponent(location.pathname.slice(RAIZ.length)).replace(/\/+$/, ""); if (/^[a-z0-9-]+$/.test(resto) && resto !== "blog") slug = resto; }
  const urlCurta = slug ? RAIZ_ABS + slug + "/" : "";
  /* Veio por /blog/artigo/?a=...: troca o endereço na barra para o curto, sem recarregar.
     Antes, deixa os links do menu e rodapé completos, para não quebrarem com o endereço novo. */
  if (slug && /^[a-z0-9-]+$/.test(slug) && location.search) {
    document.querySelectorAll("a[href]").forEach((a) => { if (!/^(https?:|mailto:|tel:|#)/.test(a.getAttribute("href"))) a.setAttribute("href", a.href); });
    try { history.replaceState(null, "", urlCurta + location.hash); } catch (e) { /* tudo bem */ }
  }

  const dataBR = (iso) => { try { return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" }); } catch (e) { return iso || ""; } };
  const paragrafos = (t) => String(t || "").trim().split(/\n\s*\n/).map((x) => `<p>${esc(x.trim()).replace(/\n/g, "<br>")}</p>`).join("");
  const SITE = "https://psicologosbrasil.com.br";

  /* Segurança extra: o texto já vem limpo do Painel, mas aqui tiramos de novo qualquer código perigoso. */
  function seguro(html) {
    const t = document.createElement("template");
    t.innerHTML = html || "";
    t.content.querySelectorAll("script,style,iframe,object,embed,form,input,button,link,meta,base").forEach((n) => n.remove());
    t.content.querySelectorAll("*").forEach((el) => {
      [...el.attributes].forEach((a) => {
        const nome = a.name.toLowerCase(), v = a.value.trim().toLowerCase();
        if (nome.startsWith("on") || nome === "style" || nome === "srcdoc") el.removeAttribute(a.name);
        else if ((nome === "href" || nome === "src") && /^(javascript|vbscript):/.test(v)) el.removeAttribute(a.name);
        else if (nome === "src" && v.startsWith("data:") && !v.startsWith("data:image/")) el.removeAttribute(a.name);
      });
    });
    return t.innerHTML;
  }

  function meta(nome, valor, prop) {
    const sel = prop ? `meta[property="${nome}"]` : `meta[name="${nome}"]`;
    let m = document.querySelector(sel);
    if (!m) { m = document.createElement("meta"); m.setAttribute(prop ? "property" : "name", nome); document.head.appendChild(m); }
    m.setAttribute("content", valor);
  }

  function naoEncontrado() {
    document.title = "Artigo não encontrado | Psicólogos Brasil";
    meta("robots", "noindex");
    alvo.innerHTML = `<div class="artigo"><div class="artigo-wrap">
      <nav class="trilha" aria-label="Você está em"><a href="${RAIZ_ABS}">Início</a> › <a href="${RAIZ_ABS}blog/">Artigos</a></nav>
      <h1 class="page-title" tabindex="-1">Artigo não encontrado</h1>
      <p class="artigo-resumo">Este artigo não existe mais ou o endereço está incompleto.</p>
      <p><a class="btn" href="${RAIZ_ABS}blog/">Ver todos os artigos</a></p></div></div>`;
  }

  function montar(a) {
    const titulo = a.titulo || "Artigo";
    const faq = (a.faq || []).filter((f) => f && f.p && f.r);
    const wa = `https://api.whatsapp.com/send?phone=${WHATS}&text=${encodeURIComponent('Olá! Li o artigo "' + titulo + '" e quero agendar uma consulta.')}`;
    const capa = a.capa ? `<figure class="artigo-capa"><img src="${esc(a.capa)}" alt="${esc(a.capaAlt || titulo)}"${a.capaW ? ` width="${+a.capaW}" height="${+a.capaH}"` : ""} fetchpriority="high"></figure>` : "";

    alvo.innerHTML = `<article class="artigo">
  <div class="artigo-wrap">
    <nav class="trilha" aria-label="Você está em"><a href="${RAIZ_ABS}">Início</a> › <a href="${RAIZ_ABS}blog/">Artigos</a>${a.categoria ? ` › <span>${esc(a.categoria)}</span>` : ""}</nav>
    <header class="artigo-topo">
      ${a.categoria ? `<span class="artigo-cat">${esc(a.categoria)}</span>` : ""}
      <h1 tabindex="-1">${esc(titulo)}</h1>
      ${a.descricao ? `<p class="artigo-resumo">${esc(a.descricao)}</p>` : ""}
      <p class="artigo-meta">Por ${esc(a.autor || "Psicólogos Brasil")}${a.data ? " · " + esc(dataBR(a.data)) : ""}${a.minutos ? ` · ${+a.minutos} min de leitura` : ""}</p>
    </header>
    ${capa}
    <div class="artigo-texto">${seguro(a.html)}</div>
    ${faq.length ? `<section class="faq" id="perguntas-frequentes"><h2>Perguntas frequentes</h2>${faq.map((f) => `<details><summary>${esc(f.p)}</summary><div class="faq-resp">${paragrafos(f.r)}</div></details>`).join("")}</section>` : ""}
    <aside class="cta">
      <h2>Quer conversar com um psicólogo?</h2>
      <p>Atendimento online, com sigilo, de onde você estiver.</p>
      <a class="cta-btn" href="${wa}" target="_blank" rel="noopener">Agendar pelo WhatsApp</a>
    </aside>
  </div>
</article>`;

    /* Título, descrição e dados para o Google e para compartilhar */
    const tituloSeo = (a.tituloSeo || titulo) + " | Psicólogos Brasil";
    document.title = tituloSeo;
    meta("description", a.descricao || "");
    meta("og:title", tituloSeo, true); meta("og:description", a.descricao || "", true); meta("og:type", "article", true);
    const url = urlCurta;
    const can = document.querySelector('link[rel="canonical"]'); if (can) can.href = url;
    const ld = [{
      "@context": "https://schema.org", "@type": "BlogPosting", headline: titulo, description: a.descricao || "",
      inLanguage: "pt-BR", datePublished: a.data || undefined, author: { "@type": "Person", name: a.autor || "Psicólogos Brasil" },
      publisher: { "@type": "Organization", name: "Psicólogos Brasil", url: SITE + "/" }, mainEntityOfPage: url,
      articleSection: a.categoria || undefined, keywords: (a.palavras || []).join(", ") || undefined
    }, {
      "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: RAIZ_ABS },
        { "@type": "ListItem", position: 2, name: "Artigos", item: RAIZ_ABS + "blog/" },
        { "@type": "ListItem", position: 3, name: titulo, item: url }]
    }];
    if (faq.length) ld.push({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.p, acceptedAnswer: { "@type": "Answer", text: f.r } })) });
    ld.forEach((j) => { const s = document.createElement("script"); s.type = "application/ld+json"; s.textContent = JSON.stringify(j); document.head.appendChild(s); });
  }

  if (!slug) { naoEncontrado(); return; }
  NUVEM.artigo(slug)
    .then(async (a) => {
      if (!a) return naoEncontrado();
      a.html = await NUVEM.resolverTexto(a.html || "");
      a.capa = await NUVEM.resolverTexto(a.capa || "");
      montar(a);
    })
    .catch(() => {
      alvo.innerHTML = `<div class="artigo"><div class="artigo-wrap"><h1>Não foi possível carregar o artigo</h1><p class="artigo-resumo">Verifique sua conexão e atualize a página.</p></div></div>`;
    });
})();
