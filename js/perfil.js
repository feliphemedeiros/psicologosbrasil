/* Psicólogos Brasil — perfil.js: a "landing page" de cada psicólogo.
   Endereço: psicologosbrasil.com.br/especialista/nome-do-psicologo/
   - Na Hostinger: o .htaccess abre esta página (psicologos/perfil/index.html) para esse endereço.
   - No GitHub Pages: o 404.html manda para /psicologos/perfil/?p=nome e aqui o endereço volta a ficar curto.
   Todo psicólogo publicado no painel ganha esta página sozinho, pronta para compartilhar.
   Seções: topo (foto, nome, frase, botões e números), barra fixa de agendar, vídeo de
   apresentação, frase de destaque, "Como posso te ajudar", "Sobre", "Como funciona",
   "O que esperar?", perguntas frequentes, chamada final e outros psicólogos.
   Campos vazios no painel usam os textos padrão abaixo.

   A "Prévia do perfil" do painel abre ESTA MESMA página (?previa=1) e manda o rascunho
   por mensagem: o que aparece na prévia é exatamente o que vai para o site. */
(function () {
  const alvo = $("#perfil");
  if (!alvo) return;
  const { ICO, iniciais } = PSI;
  const params = new URLSearchParams(location.search);
  const PREVIA = params.has("previa");
  const RAIZ = new URL(BASE, location.href).pathname;
  let slug = (params.get("p") || "").trim().toLowerCase();
  if (!slug) { const m = decodeURIComponent(location.pathname.slice(RAIZ.length)).match(/^especialista\/([a-z0-9-]+)\/?$/); if (m) slug = m[1]; }
  /* Veio por ?p=nome: troca o endereço na barra para o curto (/especialista/nome/), sem recarregar.
     Antes, deixa os links completos, para não quebrarem com o endereço novo. */
  if (slug && /^[a-z0-9-]+$/.test(slug) && params.has("p") && !PREVIA && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) && location.protocol !== "file:") {
    document.querySelectorAll("a[href]").forEach((a) => { if (!/^(https?:|mailto:|tel:|#)/.test(a.getAttribute("href"))) a.setAttribute("href", a.href); });
    document.querySelectorAll("img[src],link[href]").forEach((el) => { const at = el.tagName === "IMG" ? "src" : "href"; const v = el.getAttribute(at); if (v && !/^(https?:|data:|\/\/)/.test(v)) el.setAttribute(at, el[at]); });
    try { history.replaceState(null, "", location.origin + RAIZ + "especialista/" + slug + "/" + location.hash); } catch (e) { /* tudo bem */ }
  }
  /* Registro profissional: CRP (Brasil) e/ou OPP (Portugal) */
  const registro = (x) => [x.crp ? "CRP " + x.crp : "", x.opp ? "OPP " + x.opp : ""].filter(Boolean).join(" · ");
  const reduzMovimento = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- textos padrão (iguais aos do painel) ---------- */
  const PASSOS_PADRAO = [
    { t: "Fale comigo", x: "Clique em agendar e mande uma mensagem pelo WhatsApp. A equipe confirma o melhor dia e horário para você." },
    { t: "Comece no seu ritmo", x: "A primeira sessão é para nos conhecermos. Você conta o que está vivendo, sem pressa e sem julgamentos." },
    { t: "Cuide de você", x: "Com encontros regulares por vídeo, construímos juntos caminhos para você se sentir melhor no dia a dia." }
  ];
  const ESPERAR_PADRAO = "Sessões de 50 minutos por videochamada, de onde você estiver\nSigilo total, seguindo o Código de Ética do Conselho Federal de Psicologia\nUm espaço acolhedor e sem julgamentos para falar do que sente\nRecibo para pedir reembolso ao seu plano de saúde";
  const CITACAO_PADRAO = "Estou aqui para ouvir, acolher e caminhar com você, para que a sua jornada fique mais leve e mais clara.";

  /* ---------- ícones ---------- */
  const SELO = '<svg class="lp-selo" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 1.5l2.6 1.9 3.2-.1 1 3 2.6 1.9-1 3 1 3-2.6 1.9-1 3-3.2-.1L12 22.5l-2.6-1.9-3.2.1-1-3L2.6 15.8l1-3-1-3 2.6-1.9 1-3 3.2.1z"/><path d="M7.5 12.3l3 3 6-6.3" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const svg = (d, w = 20) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const I = {
    agenda: svg('<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
    play: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5.5v13l11-6.5z"/></svg>',
    partilhar: svg('<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>'),
    video: svg('<rect x="3" y="6" width="13" height="12" rx="3"/><path d="M16 10l5-3v10l-5-3z"/>'),
    relogio: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    pessoas: svg('<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.6-3.4 3-5.5 6-5.5s5.4 2.1 6 5.5"/><path d="M16 4.8a3 3 0 0 1 0 6M18 14.6c1.6.7 2.7 2.4 3 5.4"/>'),
    idioma: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>'),
    acess: svg('<circle cx="12" cy="4.5" r="1.8"/><path d="M5 8.5l7 1.5 7-1.5M12 10v4.5M12 14.5L8.5 21M12 14.5l3.5 6.5"/>'),
    cerebro: svg('<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3h1V4z"/><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3h-1V4z"/>'),
    livro: svg('<path d="M2.5 5.5C5 4.5 8.5 4.5 12 6.5c3.5-2 7-2 9.5-1V19c-2.5-1-6-1-9.5 1-3.5-2-7-2-9.5-1z"/><path d="M12 6.5V20"/>'),
    escudo: svg('<path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>'),
    seta: svg('<path d="M5 12h14M13 6l6 6-6 6"/>', 18),
    mais: svg('<path d="M12 5v14M5 12h14"/>', 18)
  };

  const CHEV = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';

  /* ---------- utilidades ---------- */
  const primeiroNome = (n) => String(n || "").trim().split(/\s+/)[0] || "";
  const linhas = (t) => String(t || "").split("\n").map((s) => s.trim()).filter(Boolean);
  const paragrafos = (t) => String(t).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("\n");
  const passosDe = (x) => PASSOS_PADRAO.map((d, i) => { const p = (x.passos || [])[i] || {}; return { t: (p.t || "").trim() || d.t, x: (p.x || "").trim() || d.x }; });
  const lista_ = (v) => (Array.isArray(v) ? v : String(v || "").split(",")).map((s) => String(s).trim()).filter(Boolean);
  const juntarE = (a) => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " e " + a[a.length - 1];
  const reais = (v) => "R$ " + Number(v).toLocaleString("pt-BR");
  const miniFoto = (o) => o.foto
    ? `<span class="lp-mini-foto"><img src="${esc(o.foto)}" alt="" loading="lazy"></span>`
    : `<span class="lp-mini-foto" aria-hidden="true">${esc(iniciais(o.nome))}</span>`;

  /* ---------- vídeo do YouTube / Vimeo, tocado aqui na página ---------- */
  function idYoutube(u) {
    try {
      const url = new URL(u); const h = url.hostname.replace(/^www\.|^m\./, "");
      if (h === "youtu.be") return url.pathname.slice(1).split(/[?&/]/)[0];
      if (h.endsWith("youtube.com")) return url.searchParams.get("v") || (url.pathname.match(/\/(shorts|embed|live)\/([^/?]+)/) || [])[2] || "";
    } catch (e) { /* link inválido */ }
    return "";
  }
  function linkEmbutido(u) {
    const id = idYoutube(u);
    if (id) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&playsinline=1&modestbranding=1`;
    try { const url = new URL(u); if (/vimeo\.com$/.test(url.hostname)) { const v = (url.pathname.match(/\/(\d+)/) || [])[1]; if (v) return `https://player.vimeo.com/video/${v}?autoplay=1`; } } catch (e) { }
    return "";
  }
  const ehVertical = (x) => x.videoFormato === "vertical" || (x.videoFormato !== "horizontal" && /youtube\.com\/shorts\//i.test(x.video || ""));

  function naoEncontrado() {
    document.title = "Perfil não encontrado | Psicólogos Brasil";
    alvo.innerHTML = `<div class="wrap lp-msg-wrap"><div class="pc-vazio"><h1>Perfil não encontrado</h1><p>Este perfil não existe mais ou o endereço está incompleto. Veja todos os psicólogos ou fale com a nossa equipe para receber uma indicação.</p><div class="pc-acoes"><a class="btn ghost" href="${BASE}psicologos/">Ver todos os psicólogos</a><a class="btn" href="https://api.whatsapp.com/send?phone=${WHATS}&text=${encodeURIComponent("Olá! Quero ajuda para escolher um psicólogo.")}" target="_blank" rel="noopener">${ICO.zap}Pedir indicação</a></div></div></div>`;
  }

  /* ---------- perguntas frequentes (montadas com os dados do psicólogo) ---------- */
  function perguntas(x, pn, dur) {
    /* perguntas próprias, cadastradas no painel (Schema do psicólogo): se tiver, substituem as automáticas */
    const proprias = (Array.isArray(x.faq) ? x.faq : []).filter((f) => f && String(f.p || "").trim() && String(f.r || "").trim());
    if (proprias.length) return proprias.map((f) => ({ p: String(f.p).trim(), r: String(f.r).trim() }));
    const f = [];
    f.push({ p: `Como é a primeira sessão com ${primeiroNome(x.nome)}?`, r: `É uma conversa por videochamada de ${dur} minutos, de onde você estiver. Serve para vocês se conhecerem: você conta o que está vivendo, no seu ritmo, e ${pn} explica como pode te ajudar.` });
    if (x.valor) f.push({ p: "Quanto custa a sessão?", r: `Cada sessão de ${dur} minutos custa ${reais(x.valor)}. Você paga por Pix ou cartão, direto com a nossa equipe, depois de escolher o horário.` });
    f.push({ p: "As sessões são sigilosas?", r: "Sim. Tudo o que você conta fica entre você e o psicólogo, como manda o Código de Ética do Conselho Federal de Psicologia. As sessões acontecem por videochamada segura." });
    const outros = (x.idiomas || []).filter((i) => i !== "Português");
    if (outros.length) f.push({ p: "Em quais idiomas são as sessões?", r: `Em ${juntarE(x.idiomas.map((i) => i.toLowerCase()))}. É só avisar o idioma quando for agendar.` });
    return f;
  }

  /* ---------- dados estruturados para o Google ---------- */
  function schema(x, faq) {
    let tag = document.getElementById("lp-schema");
    if (!tag) { tag = document.createElement("script"); tag.type = "application/ld+json"; tag.id = "lp-schema"; document.head.appendChild(tag); }
    const url = location.href.split("#")[0];
    const pessoa = {
      "@type": "Person", name: x.nome, jobTitle: x.tratamento || "Psicólogo(a)", url,
      ...(x.foto && !/^data:/.test(x.foto) ? { image: new URL(x.foto, location.href).href } : {}),
      ...(x.resumo ? { description: x.resumo } : {}),
      ...((x.idiomas || []).length ? { knowsLanguage: x.idiomas } : {}),
      ...((x.temas || []).length ? { knowsAbout: x.temas } : {}),
      ...(x.crp || x.opp ? { identifier: [x.crp ? { "@type": "PropertyValue", propertyID: "CRP", value: x.crp } : null, x.opp ? { "@type": "PropertyValue", propertyID: "OPP", value: x.opp } : null].filter(Boolean) } : {}),
      worksFor: { "@type": "Organization", name: "Psicólogos Brasil", url: new URL(BASE, location.href).href }
    };
    tag.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "ProfilePage", url, name: document.title, mainEntity: pessoa },
        { "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.p, acceptedAnswer: { "@type": "Answer", text: f.r.replace(/\s+/g, " ") } })) }
      ]
    });
    /* schema personalizado colado no painel (já conferido lá): vai num bloco separado */
    let extra = document.getElementById("lp-schema-extra");
    const itens = (Array.isArray(x.schemaExtra) ? x.schemaExtra : []).filter((o) => o && typeof o === "object");
    if (!itens.length) { if (extra) extra.remove(); return; }
    if (!extra) { extra = document.createElement("script"); extra.type = "application/ld+json"; extra.id = "lp-schema-extra"; document.head.appendChild(extra); }
    extra.textContent = JSON.stringify(itens.length === 1 ? itens[0] : itens).replace(/</g, "\\u003c");
  }

  /* =====================================================================
     MONTA A PÁGINA
     ===================================================================== */
  function montar(x, todos, demo, ambiente) {
    const nome = esc(x.nome);
    const pn = esc(primeiroNome(x.nome));
    const tratamento = x.tratamento || "Psicologia";
    const dur = Number(x.duracao) || 50;
    const wa = PSI.whatsapp(x, `Olá! Vi o perfil de ${x.nome} no site e quero agendar uma sessão.`);
    const waAttr = `href="${wa.href}"${wa.proprio ? " data-whatsapp-proprio" : ""} target="_blank" rel="noopener"`;
    /* "Ver horários e agendar": abre a lista de psicólogos já filtrada, com a agenda dele(a) ao lado */
    const horarios = `${BASE}psicologos/?q=${encodeURIComponent(x.nome)}#agendar`;   /* #agendar: a lista centraliza o cartão com a agenda */

    const titulo = (x.titulo || "").trim() || `${tratamento} online para cuidar de você`;
    const citacao = (x.citacao || "").trim() || CITACAO_PADRAO;
    const abord = x.abordagens || [];
    const esp = x.temas || [];
    const publico = x.publico || [], idiomas = x.idiomas || [], acess = x.acessibilidade || [], formacao = x.formacao || [];
    const esperar = linhas(x.esperar || ESPERAR_PADRAO);
    const faq = perguntas(x, pn, dur);
    const temVideo = !!(x.video && linkEmbutido(x.video));
    const vertical = temVideo && ehVertical(x);
    const thumb = temVideo && idYoutube(x.video) ? `https://i.ytimg.com/vi/${encodeURIComponent(idYoutube(x.video))}/hqdefault.jpg` : "";
    /* o selo fica "colado" na última palavra do nome: nunca desce sozinho para a linha de baixo */
    const partesNome = String(x.nome || "").trim().split(/\s+/);
    const ultimaPalavra = partesNome.pop() || "";
    const selo = x.verificado ? `<span class="lp-verif" title="Perfil verificado: CRP conferido pela equipe Psicólogos Brasil">${SELO}<span class="lp-sr">Perfil verificado</span></span>` : "";

    const nomeComSelo = `${partesNome.length ? esc(partesNome.join(" ")) + " " : ""}<span class="lp-nome-fim">${esc(ultimaPalavra)}${selo}</span>`;

    /* Título da aba e descrição para compartilhamento */
    document.title = `${x.nome} — ${tratamento}${registro(x) ? " · " + registro(x) : ""} | Psicólogos Brasil`;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", (x.resumo || `${tratamento} com atendimento online.`) + (esp.length ? ` Temas: ${esp.slice(0, 5).join(", ")}.` : ""));

    const outros = todos.filter((o) => o.slug !== x.slug)
      .sort((a, b) => (b.temas || []).filter((t) => esp.includes(t)).length - (a.temas || []).filter((t) => esp.includes(t)).length)
      .slice(0, 3);

    /* números do topo */
    const fatos = [];
    fatos.push(`<li><b>${dur} min</b><span>por videochamada</span></li>`);
    if (x.valor) fatos.push(`<li><b>${reais(x.valor)}</b><span>por sessão</span></li>`);
    if (idiomas.length) fatos.push(`<li><b>${esc(idiomas.slice(0, 2).join(" · "))}${idiomas.length > 2 ? ` +${idiomas.length - 2}` : ""}</b><span>${idiomas.length > 1 ? "idiomas" : "idioma"}</span></li>`);

    /* cartões de "Como posso te ajudar" */
    const cartoes = [];
    if (abord.length) cartoes.push(`<div class="lp-bloco">${I.cerebro}<h3>${abord.length > 1 ? "Abordagens" : "Abordagem"}</h3><p>${esc(juntarE(abord))}</p></div>`);
    if (publico.length) cartoes.push(`<div class="lp-bloco">${I.pessoas}<h3>Atende</h3><p>${esc(juntarE(publico))}</p></div>`);
    if (idiomas.length) cartoes.push(`<div class="lp-bloco">${I.idioma}<h3>Idiomas</h3><p>${esc(juntarE(idiomas))}</p></div>`);
    if (acess.length) cartoes.push(`<div class="lp-bloco">${I.acess}<h3>Acessibilidade</h3><p>${esc(acess.join(" · "))}</p></div>`);

    alvo.innerHTML = `<div class="lp">
  ${demo ? '<div class="wrap"><p class="aviso-demo lp-demo">Perfil de demonstração. Os perfis reais aparecem aqui assim que forem publicados pelo painel.</p></div>' : ""}

  <!-- TOPO -->
  <section class="lp-hero" id="lp-topo">
    <div class="wrap lp-hero-grid">
      <div class="lp-hero-txt">
        <nav class="lp-trilha" aria-label="Você está em"><a href="${BASE}">Início</a><span aria-hidden="true">/</span><a href="${BASE}psicologos/">Psicólogos</a><span aria-hidden="true">/</span><span>${nome}</span></nav>
        <p class="lp-online"><i aria-hidden="true"></i>Atendimento online · ${esc(tratamento)}${registro(x) ? ` · ${esc(registro(x))}` : ""}</p>
        <h1 class="lp-nome" tabindex="-1">${nomeComSelo}</h1>
        <p class="lp-frase">${esc(titulo)}</p>
        ${x.bio || x.resumo ? `<p class="lp-resumo">${esc(String(x.bio ? x.bio.split(/\n\s*\n/)[0] : x.resumo).replace(/\s+/g, " ").trim())}</p>` : ""}
        <div class="lp-ctas">
          <a class="btn lg lp-btn-principal" href="${horarios}">${I.agenda}Ver horários e agendar</a>
        </div>
      </div>
      <div class="lp-hero-midia">
        <figure class="lp-foto">
          ${x.foto ? `<img src="${esc(x.foto)}" alt="Foto de ${nome}" fetchpriority="high">` : `<span class="lp-foto-vazia">${esc(iniciais(x.nome))}</span>`}
          ${temVideo ? `<button type="button" class="lp-play" data-video>${I.play}<span>Assistir apresentação</span></button>` : ""}
        </figure>
        ${x.verificado ? `<p class="lp-flutua lp-flutua-crp">${SELO}<span><b>CRP verificado</b>pela equipe Psicólogos Brasil</span></p>` : ""}
        ${abord.length ? `<p class="lp-flutua lp-flutua-abord">${I.cerebro}<span><b>${esc(abord[0])}</b>${abord.length > 1 ? `e mais ${abord.length - 1} ${abord.length > 2 ? "abordagens" : "abordagem"}` : "abordagem principal"}</span></p>` : ""}
      </div>
    </div>
  </section>

  ${temVideo ? `<!-- VÍDEO DE APRESENTAÇÃO -->
  <section class="lp-sec lp-video-sec">
    <div class="wrap lp-video-grid${vertical ? " vertical" : ""}">
      <div class="lp-video-txt">
        <p class="lp-eyebrow">Vídeo de apresentação</p>
        <h2>Conheça ${pn} antes da primeira sessão</h2>
        <p>Veja como ${pn} trabalha e sinta se vocês combinam. Escolher o psicólogo certo faz diferença no seu processo.</p>
        <a class="btn ghost" href="${horarios}">${I.agenda}Ver horários livres</a>
      </div>
      <div class="lp-video-tela${vertical ? " vertical" : ""}">
        <button type="button" class="lp-video-capa" data-video aria-label="Assistir o vídeo de apresentação de ${nome}">
          ${thumb ? `<img src="${thumb}" alt="" loading="lazy" onerror="this.remove()">` : ""}
          <span class="lp-video-play">${I.play}</span>
        </button>
      </div>
    </div>
  </section>` : ""}

  <!-- FRASE -->
  <section class="lp-sec lp-quote">
    <div class="wrap"><blockquote><p>“${esc(citacao)}”</p><footer>${x.foto ? `<img src="${esc(x.foto)}" alt="" loading="lazy">` : ""}<span><b>${nome}</b>${esc(tratamento)}${registro(x) ? ` · ${esc(registro(x))}` : ""}</span></footer></blockquote></div>
  </section>

  ${esp.length || cartoes.length ? `<!-- COMO POSSO TE AJUDAR -->
  <section class="lp-sec lp-ajuda">
    <div class="wrap">
      <div class="lp-cab"><p class="lp-eyebrow">Como posso te ajudar</p><h2>Temas que ${pn} atende</h2></div>
      <div class="lp-bento">
        ${esp.length ? `<div class="lp-bloco lp-bloco-temas">
          <ul class="lp-temas">${esp.map((t) => `<li><a href="${BASE}psicologos/?tema=${encodeURIComponent(t)}">${esc(t)}</a></li>`).join("")}</ul>
          <p class="lp-temas-nota">Não achou o seu tema? Fale com ${pn} mesmo assim: muitas questões se cruzam.</p>
        </div>` : ""}
        ${cartoes.length ? `<div class="lp-bento-lado">${cartoes.join("")}</div>` : ""}
      </div>
    </div>
  </section>` : ""}

  ${x.bio || x.resumo || formacao.length ? `<!-- SOBRE -->
  <section class="lp-sec lp-sobre">
    <div class="wrap">
      <article class="lp-sobre-card">
        <header class="lp-sobre-topo">
          ${x.foto ? `<img class="lp-sobre-foto" src="${esc(x.foto)}" alt="" loading="lazy">` : `<span class="lp-sobre-foto lp-sobre-ini" aria-hidden="true">${esc(iniciais(x.nome))}</span>`}
          <div>
            <p class="lp-eyebrow">Sobre</p>
            <h2>Quem é ${nome}</h2>
            <p class="lp-sobre-sub">${esc(tratamento)}${registro(x) ? ` · ${esc(registro(x))}` : ""}${abord.length ? ` · ${esc(abord.slice(0, 2).join(" · "))}` : ""}</p>
          </div>
        </header>
        <div class="lp-bio">
          ${x.bio ? paragrafos(x.bio) : x.resumo ? `<p>${esc(x.resumo)}</p>` : ""}
          ${formacao.length ? `<h3>Formação</h3><ul class="lp-formacao">${formacao.map((f) => `<li>${I.livro}<span>${esc(f)}</span></li>`).join("")}</ul>` : ""}
        </div>
        ${x.crp ? `<p class="lp-reg">${x.verificado ? SELO : I.escudo}<span>${x.verificado ? `<b>CRP ${esc(x.crp)} conferido</b> pela equipe Psicólogos Brasil.` : `<b>CRP ${esc(x.crp)}</b>.`} <a href="https://cadastro.cfp.org.br/" target="_blank" rel="noopener">Consultar no CFP</a></span></p>` : ""}
        ${x.opp ? `<p class="lp-reg">${x.verificado && !x.crp ? SELO : I.escudo}<span>${x.verificado && !x.crp ? `<b>OPP ${esc(x.opp)} conferida</b> pela equipe Psicólogos Brasil.` : `<b>OPP ${esc(x.opp)}</b> (Ordem dos Psicólogos Portugueses).`} <a href="https://www.ordemdospsicologos.pt/" target="_blank" rel="noopener">Consultar na OPP</a></span></p>` : ""}
      </article>
    </div>
  </section>` : ""}

  <!-- COMO FUNCIONA -->
  <section class="lp-sec lp-passos">
    <div class="wrap">
      <div class="lp-cab"><p class="lp-eyebrow">Como funciona</p><h2>Três passos para começar</h2></div>
      <ol class="lp-passos-lista">
        ${passosDe(x).map((p, i) => `<li><span class="lp-passo-n">${i + 1}</span><h3>${esc(p.t)}</h3><p>${esc(p.x)}</p></li>`).join("\n        ")}
      </ol>
    </div>
  </section>

  <!-- O QUE ESPERAR -->
  <section class="lp-sec lp-esperar">
    <div class="wrap">
      <div class="lp-esperar-box${ambiente ? "" : " sem-img"}">
        ${ambiente ? `<figure class="lp-amb"><img src="${esc(ambiente)}" alt="Ambiente de atendimento de ${nome}" loading="lazy"></figure>` : ""}
        <div class="lp-esperar-card">
          <h2>O que esperar?</h2>
          <ul>${esperar.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
          <a class="btn lp-btn-sol" href="${horarios}">${I.agenda}Agendar minha sessão</a>
        </div>
      </div>
    </div>
  </section>

  <!-- PERGUNTAS FREQUENTES -->
  <section class="lp-sec lp-faq">
    <div class="wrap">
      <h2 class="lp-faq-tit"><strong>Dúvidas</strong> frequentes sobre a <strong>terapia com ${pn}</strong></h2>
      <div class="lp-faq-lista">
        ${faq.map((f) => `<details class="lp-faq-i" name="lp-faq"><summary><span>${esc(f.p)}</span><i aria-hidden="true">${CHEV}</i></summary>${String(f.r).split(/\n\s*\n/).map((t) => `<p>${esc(t.trim()).replace(/\n/g, "<br>")}</p>`).join("")}</details>`).join("\n        ")}
      </div>
      <p class="lp-faq-mais">Ainda com dúvida? <a ${waAttr}>Fale com a nossa equipe no WhatsApp</a>.</p>
    </div>
  </section>

  <!-- CHAMADA FINAL -->
  <section class="lp-sec lp-final">
    <div class="wrap">
      <div class="lp-final-box">
        ${x.foto ? `<img class="lp-final-foto" src="${esc(x.foto)}" alt="" loading="lazy">` : `<span class="lp-final-foto lp-final-ini" aria-hidden="true">${esc(iniciais(x.nome))}</span>`}
        <div class="lp-final-txt">
          <h2>Dê o primeiro passo com ${pn}</h2>
          <p>Escolha um horário livre agora. A nossa equipe confirma tudo com você pelo WhatsApp.</p>
        </div>
        <div class="lp-final-ctas">
          <a class="btn lg lp-btn-sol" href="${horarios}">${I.agenda}Ver horários e agendar</a>
          <button type="button" class="lp-link-claro" data-partilhar>${I.partilhar}<span>Compartilhar este perfil</span></button>
        </div>
      </div>
    </div>
  </section>

  ${outros.length ? `<!-- OUTROS PSICÓLOGOS -->
  <section class="lp-sec lp-outros"><div class="wrap"><div class="lp-cab lp-cab-linha"><h2>Outros psicólogos</h2><a href="${BASE}psicologos/">Ver todos ${I.seta}</a></div><div class="lp-outros-lista">${outros.map((o) => `
    <a class="lp-mini" href="${esc(o.url)}">${miniFoto(o)}<span><b>${esc(o.nome)}</b><small>${esc(o.tratamento || "Psicologia")}${(o.abordagens || []).length ? " · " + esc(o.abordagens[0]) : ""}</small>${(o.temas || []).length ? `<em>${esc(o.temas.slice(0, 3).join(" · "))}</em>` : ""}</span></a>`).join("")}</div></div></section>` : ""}

  <!-- BARRA FIXA DE AGENDAR (aparece depois do topo) -->
  <div class="lp-barra" id="lp-barra" aria-hidden="true">
    <div class="lp-barra-in">
      ${x.foto ? `<img src="${esc(x.foto)}" alt="">` : `<span class="lp-barra-ini">${esc(iniciais(x.nome))}</span>`}
      <span class="lp-barra-txt"><b>${nome}</b><small>${dur} min${x.valor ? ` · ${reais(x.valor)}` : ""} · online</small></span>
      <a class="btn lp-barra-btn" href="${horarios}" tabindex="-1">${I.agenda}<span>Agendar</span></a>
    </div>
  </div>
</div>`;

    ligar(x, nome);
    schema(x, faq);
  }

  /* ---------- interações ---------- */
  function ligar(x, nome) {
    /* vídeo: abre por cima da página, tocando aqui mesmo */
    alvo.querySelectorAll("[data-video]").forEach((b) => b.addEventListener("click", () => abrirVideo(x, nome, b)));
    /* compartilhar */
    alvo.querySelectorAll("[data-partilhar]").forEach((b) => b.addEventListener("click", async () => {
      const dados = { title: document.title, text: `Conheça ${x.nome} na Psicólogos Brasil.`, url: location.origin + RAIZ + "especialista/" + encodeURIComponent(x.slug || slug) + "/" };
      const rot = b.querySelector("span"); const original = rot.dataset.texto || (rot.dataset.texto = rot.textContent);
      try {
        if (navigator.share) { await navigator.share(dados); return; }
        await navigator.clipboard.writeText(dados.url); rot.textContent = "Link copiado!";
      } catch (e) { if (e && e.name === "AbortError") return; rot.textContent = "Não deu para copiar"; }
      setTimeout(() => { rot.textContent = original; }, 2200);
    }));
    /* barra fixa: aparece quando o topo sai da tela e some perto do fim */
    const barra = document.getElementById("lp-barra"), topo = document.getElementById("lp-topo"), fim = alvo.querySelector(".lp-final");
    if (barra && topo && window.IntersectionObserver) {
      let topoFora = false, fimVisivel = false;
      const atualizar = () => {
        const mostrar = topoFora && !fimVisivel;
        barra.classList.toggle("on", mostrar);
        barra.setAttribute("aria-hidden", String(!mostrar));
        barra.querySelector("a").tabIndex = mostrar ? 0 : -1;
      };
      new IntersectionObserver(([e]) => { topoFora = !e.isIntersecting; atualizar(); }, { rootMargin: "-120px 0px 0px 0px" }).observe(topo);
      if (fim) new IntersectionObserver(([e]) => { fimVisivel = e.isIntersecting; atualizar(); }).observe(fim);
    }
    /* entradas suaves das seções (só enfeite: tudo já está visível sem isso) */
    if (!reduzMovimento() && window.IntersectionObserver) {
      const io = new IntersectionObserver((itens) => itens.forEach((it) => { if (it.isIntersecting) { it.target.classList.add("visto"); io.unobserve(it.target); } }), { rootMargin: "0px 0px -8% 0px" });
      alvo.querySelectorAll(".lp-sec").forEach((s) => { if (s.getBoundingClientRect().top > innerHeight) { s.classList.add("entra"); io.observe(s); } });
    }
  }

  function abrirVideo(x, nome, origem) {
    const emb = linkEmbutido(x.video || "");
    if (!emb) return;
    const fundo = document.createElement("div");
    fundo.className = "lp-modal";
    fundo.innerHTML = `<div class="lp-modal-caixa${ehVertical(x) ? " vertical" : ""}" role="dialog" aria-modal="true" aria-label="Vídeo de apresentação de ${nome}">
      <div class="lp-modal-topo"><b>${nome}</b><button type="button" class="lp-modal-fechar" aria-label="Fechar vídeo">×</button></div>
      <div class="lp-modal-tela"><iframe src="${emb}" title="Vídeo de apresentação de ${nome}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>
    </div>`;
    document.body.appendChild(fundo);
    document.body.style.overflow = "hidden";
    const fechar = () => { fundo.remove(); document.body.style.overflow = ""; document.removeEventListener("keydown", tecla); origem.focus(); };
    function tecla(e) { if (e.key === "Escape") fechar(); }
    document.addEventListener("keydown", tecla);
    fundo.addEventListener("click", (e) => { if (e.target === fundo || e.target.closest(".lp-modal-fechar")) fechar(); });
    fundo.querySelector(".lp-modal-fechar").focus();
  }

  /* ---------- deixa o cadastro no formato da página ---------- */
  function normalizar(x) {
    x.temas = lista_(x.temas && x.temas.length ? x.temas : x.especialidades);
    x.abordagens = lista_(x.abordagens);
    x.publico = lista_(x.publico);
    x.idiomas = lista_(x.idiomas).length ? lista_(x.idiomas) : ["Português"];
    x.acessibilidade = lista_(x.acessibilidade);
    x.formacao = lista_(x.formacao);
    return x;
  }

  /* ---------- prévia do painel: espera o rascunho chegar por mensagem ---------- */
  if (PREVIA) {
    document.documentElement.classList.add("lp-previa");
    window.addEventListener("message", (e) => {
      if (e.origin !== location.origin || !e.data || e.data.tipo !== "pb-previa-perfil") return;
      const x = normalizar({ ...e.data.dados });
      x.url = x.url || "#";
      montar(x, [x], false, x.ambiente || "");
    });
    alvo.innerHTML = '<div class="wrap"><p class="lp-msg">Carregando a prévia…</p></div>';
    if (window.parent !== window) window.parent.postMessage({ tipo: "pb-previa-pronta" }, location.origin);
    return;
  }

  PSI.carregar().then(async ({ lista, demo }) => {
    const x = lista.find((p) => p.slug === slug);
    if (!x) return naoEncontrado();
    normalizar(x);
    /* a foto do ambiente vem do painel; no painel online ela fica guardada à parte */
    let ambiente = x.ambiente || "";
    if (ambiente && typeof NUVEM !== "undefined") { try { ambiente = await NUVEM.resolverTexto(ambiente); } catch (e) { ambiente = ""; } }
    montar(x, lista, demo, ambiente);
  });
})();
