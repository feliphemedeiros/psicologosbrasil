/* Psicólogos Brasil — perfil.js: página de perfil de cada psicólogo (/psicologos/perfil/?p=nome-do-psicologo).
   Usa os mesmos dados da lista (js/dados-psicologos.js). Não precisa criar uma página por psicólogo:
   todo psicólogo cadastrado ganha o próprio perfil automaticamente. */
(function () {
  const alvo = $("#perfil");
  if (!alvo) return;
  const { SELO, ICO, iniciais, juntar } = PSI;
  const slug = new URLSearchParams(location.search).get("p") || "";

  const ICO2 = {
    video: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="13" height="12" rx="3"/><path d="M16 10l5-3v10l-5-3z"/></svg>',
    escudo: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg>',
    partilhar: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/></svg>',
    livro: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 5.5C5 4.5 8.5 4.5 12 6.5c3.5-2 7-2 9.5-1V19c-2.5-1-6-1-9.5 1-3.5-2-7-2-9.5-1z"/><path d="M12 6.5V20"/></svg>'
  };

  const primeiroNome = (n) => n.trim().split(/\s+/)[0];
  const paragrafos = (t) => String(t).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
  const foto = (x, cls) => x.foto
    ? `<span class="${cls}"><img src="${esc(x.foto)}" alt="Foto de ${esc(x.nome)}"></span>`
    : `<span class="${cls}" aria-hidden="true">${esc(iniciais(x.nome))}</span>`;
  const linkTema = (t) => `<a href="${BASE}psicologos/?tema=${encodeURIComponent(t)}">${esc(t)}</a>`;

  function naoEncontrado() {
    document.title = "Perfil não encontrado | Psicólogos Brasil";
    alvo.innerHTML = `<div class="pc-vazio"><h1>Perfil não encontrado</h1><p>Este perfil não existe mais ou o endereço está incompleto. Veja todos os psicólogos ou fale com a nossa equipe para receber uma indicação.</p><div class="pc-acoes"><a class="btn ghost" href="${BASE}psicologos/">Ver todos os psicólogos</a><a class="btn" href="https://api.whatsapp.com/send?phone=${WHATS}&text=${encodeURIComponent("Olá! Quero ajuda para escolher um psicólogo.")}" target="_blank" rel="noopener">${ICO.zap}Pedir indicação</a></div></div>`;
  }

  function montar(x, todos, demo) {
    const nome = esc(x.nome);
    const titulo = x.tratamento || "Psicologia";
    const wa = PSI.whatsapp(x);
    const waAttr = `href="${wa.href}"${wa.proprio ? " data-whatsapp-proprio" : ""} target="_blank" rel="noopener"`;

    /* Título da aba e descrição para compartilhamento */
    document.title = `${x.nome} — ${titulo}${x.crp ? " · CRP " + x.crp : ""} | Psicólogos Brasil`;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", (x.resumo || `${titulo} com atendimento online.`) + (x.temas.length ? ` Temas: ${x.temas.slice(0, 5).join(", ")}.` : ""));

    const sobre = x.bio ? paragrafos(x.bio) : x.resumo ? `<p>${esc(x.resumo)}</p>` : "";
    const meta = [];
    meta.push(`<li>${ICO2.video}<span>Sessões online, por videochamada</span></li>`);
    if (x.publico.length) meta.push(`<li>${ICO.pessoas}<span>Atende ${esc(juntar(x.publico.map((p) => p.toLowerCase())))}</span></li>`);
    meta.push(`<li>${ICO.idioma}<span>Sessões em ${esc(juntar(x.idiomas.map((p) => p.toLowerCase())))}</span></li>`);
    x.acessibilidade.forEach((a) => meta.push(`<li>${ICO.acess}<span>${esc(a)}</span></li>`));

    const outros = todos.filter((o) => o.slug !== x.slug)
      .sort((a, b) => b.temas.filter((t) => x.temas.includes(t)).length - a.temas.filter((t) => x.temas.includes(t)).length)
      .slice(0, 3);

    alvo.innerHTML = `
${demo ? '<p class="aviso-demo pf-demo">Perfil de demonstração. Os perfis reais aparecem aqui assim que forem cadastrados pelo painel.</p>' : ""}
<article class="pf-topo">
  ${foto(x, "pf-foto")}
  <div class="pf-id">
    <h1 class="pf-nome" tabindex="-1">${nome}${x.verificado ? `<span class="pc-verif" title="Perfil verificado: CRP conferido pela equipe">${SELO}<span class="pc-sr">Perfil verificado</span></span>` : ""}</h1>
    <p class="pf-prof">${esc(titulo)}${x.crp ? ` · CRP ${esc(x.crp)}` : ""}${x.abordagens.length ? ` · ${esc(x.abordagens.join(", "))}` : ""}</p>
    ${x.temas.length ? `<ul class="pc-temas">${x.temas.slice(0, 6).map((t) => `<li>${esc(t)}</li>`).join("")}${x.temas.length > 6 ? `<li class="mais">+${x.temas.length - 6}</li>` : ""}</ul>` : ""}
    <div class="pc-acoes pf-acoes">
      <a class="btn lg" ${waAttr}>${ICO.zap}Agendar com ${esc(primeiroNome(x.nome))}</a>
      <button type="button" class="btn ghost lg" id="partilhar">${ICO2.partilhar}Compartilhar perfil</button>
    </div>
  </div>
</article>

<div class="pf-grid">
  <div class="pf-corpo">
    ${sobre ? `<section class="pf-bloco"><h2>Sobre ${esc(primeiroNome(x.nome))}</h2>${sobre}</section>` : ""}
    ${x.temas.length ? `<section class="pf-bloco"><h2>Temas que atende</h2><div class="pf-temas">${x.temas.map(linkTema).join("")}</div></section>` : ""}
    ${x.abordagens.length ? `<section class="pf-bloco"><h2>Abordagem terapêutica</h2><p>${esc(juntar(x.abordagens))}.</p></section>` : ""}
    ${x.formacao.length ? `<section class="pf-bloco"><h2>Formação</h2><ul class="pf-lista">${x.formacao.map((f) => `<li>${ICO2.livro}<span>${esc(f)}</span></li>`).join("")}</ul></section>` : ""}
  </div>

  <aside class="pf-lado">
    <div class="pf-card">
      ${x.valor ? `<p class="pf-valor"><b>R$ ${Number(x.valor).toLocaleString("pt-BR")}</b><span>sessão de ${x.duracao || 50} minutos</span></p>` : ""}
      <ul class="pc-meta">${meta.join("")}</ul>
      <a class="btn lg pf-cta" ${waAttr}>${ICO.zap}Agendar pelo WhatsApp</a>
      ${x.crp ? `<p class="pf-crp">${ICO2.escudo}<span>${x.verificado ? "Registro conferido pela nossa equipe. " : ""}Você também pode consultar o CRP ${esc(x.crp)} no <a href="https://cadastro.cfp.org.br/" target="_blank" rel="noopener">Cadastro Nacional do CFP</a>.</span></p>` : ""}
    </div>
  </aside>
</div>

${outros.length ? `<section class="pf-outros"><h2>Outros psicólogos</h2><div class="pf-outros-lista">${outros.map((o) => `
  <a class="pf-mini" href="${esc(o.url)}">${foto(o, "pf-mini-foto")}<span><b>${esc(o.nome)}</b><small>${esc(o.tratamento || "Psicologia")}${o.abordagens.length ? " · " + esc(o.abordagens[0]) : ""}</small>${o.temas.length ? `<em>${esc(o.temas.slice(0, 3).join(" · "))}</em>` : ""}</span></a>`).join("")}</div>
  <p class="pf-todos"><a href="${BASE}psicologos/">Ver todos os psicólogos →</a></p></section>` : ""}`;

    /* Compartilhar: no celular abre o menu de compartilhar; no computador copia o link */
    const b = $("#partilhar");
    b.addEventListener("click", async () => {
      const dados = { title: document.title, text: `Conheça ${x.nome}, ${titulo.toLowerCase()} na Psicólogos Brasil.`, url: location.href };
      try {
        if (navigator.share) { await navigator.share(dados); return; }
        await navigator.clipboard.writeText(location.href);
        const antes = b.innerHTML;
        b.textContent = "Link copiado!";
        setTimeout(() => { b.innerHTML = antes; }, 2000);
      } catch (e) { /* a pessoa cancelou */ }
    });
  }

  PSI.carregar().then(({ lista, demo }) => {
    const x = lista.find((p) => p.slug === slug);
    if (x) montar(x, lista, demo); else naoEncontrado();
  });
})();
