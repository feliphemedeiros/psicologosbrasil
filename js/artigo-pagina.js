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
  /* Veio por /blog/artigo/?a=...: troca o endereço na barra para o curto, sem recarregar
     (menos no computador/localhost, onde o endereço curto não abriria ao recarregar).
     Antes, deixa os links do menu e rodapé completos, para não quebrarem com o endereço novo. */
  if (slug && /^[a-z0-9-]+$/.test(slug) && location.search && !(typeof SITE_LOCAL !== "undefined" && SITE_LOCAL)) {
    document.querySelectorAll("a[href]").forEach((a) => { if (!/^(https?:|mailto:|tel:|#)/.test(a.getAttribute("href"))) a.setAttribute("href", a.href); });
    try { history.replaceState(null, "", urlCurta + location.hash); } catch (e) { /* tudo bem */ }
  }

  const dataBR = (iso) => { try { return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" }); } catch (e) { return iso || ""; } };
  const paragrafos = (t) => String(t || "").trim().split(/\n\s*\n/).map((x) => `<p>${esc(x.trim()).replace(/\n/g, "<br>")}</p>`).join("");
  const SITE = "https://www.psicologosbrasil.com.br";

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

  /* Autor: foto redonda, nome, cargo/registro e, ao lado, a data de publicação (mesmo HTML da prévia do Painel) */
  function linhaAutor(a) {
    const nome = a.autor || "Psicólogos Brasil";
    const ini = nome.split(/\s+/).filter((w) => w.length > 2).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "•";
    const foto = /^(data:image\/|https?:\/\/)/.test(a.autorFoto || "") ? `<img src="${esc(a.autorFoto)}" alt="" width="48" height="48">` : esc(ini);
    return `<div class="artigo-autor">
        <span class="autor-foto">${foto}</span>
        <span class="autor-txt"><b>${esc(nome)}</b>${a.autorCargo ? `<small>${esc(a.autorCargo)}</small>` : ""}</span>
        <span class="autor-data">${a.data ? "Publicado em " + esc(dataBR(a.data)) : ""}${a.minutos ? `<small>${+a.minutos} min de leitura</small>` : ""}</span>
      </div>`;
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
      ${linhaAutor(a)}
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
    /* Vídeos do YouTube no texto: o vídeo só carrega quando a pessoa clica no play */
    const videos = [...alvo.querySelectorAll(".artigo-texto figure.video[data-video]")].filter((f) => /^[\w-]{11}$/.test(f.dataset.video));
    videos.forEach((f) => {
      const id = f.dataset.video, link = f.querySelector("a");
      const nome = (f.querySelector("figcaption") || {}).textContent || "Vídeo";
      if (!link) return;
      link.setAttribute("role", "button");
      link.setAttribute("aria-label", "Assistir ao vídeo: " + nome);
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const tela = document.createElement("div");
        tela.className = "video-tela";
        tela.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1&modestbranding=1" title="${esc(nome)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
        link.replaceWith(tela);
      });
      ld.push({ "@context": "https://schema.org", "@type": "VideoObject", name: nome, description: a.descricao || nome,
        thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, embedUrl: `https://www.youtube.com/embed/${id}`,
        contentUrl: `https://www.youtube.com/watch?v=${id}`, uploadDate: a.data || undefined });
    });
    ld.forEach((j) => { const s = document.createElement("script"); s.type = "application/ld+json"; s.textContent = JSON.stringify(j); document.head.appendChild(s); });
    ajustarBarra(a, titulo, wa);
  }

  /* Barra flutuante de baixo (celular) com o tema do artigo:
     "Psicólogos para ansiedade" → lista de psicólogos já filtrada por esse tema.
     Categorias gerais (ex.: "Terapia online") continuam com "Psicólogos online".
     O WhatsApp da barra abre com o nome do artigo, como o botão do fim do texto. */
  const GERAIS = ["terapia online", "psicologia", "geral", "outros", "novidades", "saude mental", "bem-estar", "dicas"];
  const semAcento = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  function ajustarBarra(a, titulo, wa) {
    const fab = document.getElementById("fab");
    if (!fab) return;
    const zap = fab.querySelector(".fab-wa");
    if (zap) zap.href = wa;
    const pilula = fab.querySelector(".fab-psi");
    const cat = String(a.categoria || "").trim();
    if (!pilula || !cat || GERAIS.includes(semAcento(cat))) return;
    /* o tema em destaque com a primeira letra maiúscula: "Depressão", "Luto" */
    const tema = cat.charAt(0).toUpperCase() + cat.slice(1), texto = "Psicólogos para " + tema.toLowerCase();
    pilula.href = RAIZ_ABS + "psicologos/?tema=" + encodeURIComponent(cat);
    pilula.innerHTML = `<span class="fab-dot" aria-hidden="true"></span><span class="fab-psi-txt fab-tema"><small>Psicólogos para</small>${esc(tema)}</span>`;
    pilula.setAttribute("aria-label", texto + ": ver a lista");
  }

  /* Autor que é psicólogo publicado no site: foto e nome viram link para o perfil dele.
     Acha pelo CRP (mais seguro) ou, sem CRP, pelo nome. Quem não tem perfil publicado fica sem link. */
  async function ligarAutor(a) {
    try {
      const box = alvo.querySelector(".artigo-autor");
      if (!box || !a.autor) return;
      const l = (await NUVEM.lista("psicologos")).filter((x) => x && x.nome && x.ativo !== false);
      const dig = (t) => String(t || "").replace(/\D/g, "");
      const crp = dig((String(a.autorCargo || "").match(/CRP\s*([\d./\s-]+)/i) || [])[1]);
      const p = (crp.length >= 4 && l.find((x) => dig(x.crp) === crp)) || l.find((x) => semAcento(x.nome) === semAcento(a.autor));
      const s = p && (p.slug || (String(p.url || "").match(/especialista\/([^/]+)/) || [])[1]);
      if (!s) return;
      const link = document.createElement("a");
      link.className = "autor-link";
      link.href = (typeof SITE_LOCAL !== "undefined" && SITE_LOCAL) ? RAIZ_ABS + "psicologos/perfil/?p=" + encodeURIComponent(s) : RAIZ_ABS + "especialista/" + encodeURIComponent(s) + "/";
      link.setAttribute("aria-label", `Ver o perfil de ${p.nome}`);
      box.insertBefore(link, box.firstChild);
      link.append(box.querySelector(".autor-foto"), box.querySelector(".autor-txt"));
      link.querySelector(".autor-txt b").insertAdjacentHTML("beforeend", ' <span class="autor-ver" aria-hidden="true">Ver perfil ›</span>');
    } catch (e) { /* sem link: fica como estava */ }
  }

  if (!slug) { naoEncontrado(); return; }
  NUVEM.artigo(slug)
    .then(async (a) => {
      if (!a) return naoEncontrado();
      a.html = await NUVEM.resolverTexto(a.html || "");
      a.capa = await NUVEM.resolverTexto(a.capa || "");
      a.autorFoto = await NUVEM.resolverTexto(a.autorFoto || "");
      montar(a);
      ligarAutor(a);
    })
    .catch(() => {
      alvo.innerHTML = `<div class="artigo"><div class="artigo-wrap"><h1>Não foi possível carregar o artigo</h1><p class="artigo-resumo">Verifique sua conexão e atualize a página.</p></div></div>`;
    });
})();
