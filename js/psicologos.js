/* Psicólogos Brasil — psicologos.js: lista de profissionais com busca e filtros (/psicologos/).
   Os dados (e os perfis de demonstração) ficam em js/dados-psicologos.js.
   Clicar em um cartão abre a página de perfil do psicólogo (/especialista/nome/). */
(function () {
  const lista = $("#lista");
  if (!lista) return;

  /* ===== Listas dos filtros (pode acrescentar itens) ===== */
  const TEMAS = [
    "Abuso físico ou emocional", "Abuso sexual", "Adolescência", "Adoção de filho", "Agressividade", "Alcoolismo",
    "Ansiedade", "Aposentadoria", "Assédio moral", "Assédio sexual", "Autismo (TEA)", "Autoconhecimento", "Autoestima",
    "Bullying", "Burnout", "Carreira", "Ciúmes", "Compulsão alimentar", "Conflitos familiares", "Crise existencial",
    "Dependência química", "Depressão", "Dificuldades de aprendizagem", "Divórcio e separação", "Dor crônica", "Estresse",
    "Fobias", "Gestação e pós-parto", "Identidade de gênero", "Insônia", "LGBTQIA+", "Luto", "Maternidade e paternidade",
    "Medos", "Morar fora do Brasil", "Orientação profissional", "Pânico", "Perfeccionismo", "Procrastinação", "Racismo",
    "Relacionamentos", "Saúde da mulher", "Sexualidade", "Síndrome do impostor", "Solidão", "TDAH", "Terapia de casal",
    "TOC", "Transtorno alimentar", "Transtorno bipolar", "Trauma e estresse pós-traumático", "Violência doméstica"
  ];
  const GENEROS = ["Mulher", "Homem", "Não binário"];
  const PUBLICO = ["Crianças", "Adolescentes", "Adultos", "Idosos", "Casais", "Famílias", "LGBTQIA+"];
  const IDIOMAS = ["Português", "Inglês", "Espanhol", "Francês", "Italiano", "Alemão"];
  const ACESS = ["Atendimento em Libras", "Sessão por texto (chat)", "Experiência com pessoas com deficiência"];

  const { SELO, ICO, iniciais, juntar } = PSI;

  let pros = [];
  const st = { q: "", tema: "", genero: "", publico: [], idiomas: [], acess: [] };
  const P = new URLSearchParams(location.search);
  st.q = P.get("q") || "";


  /* ===== Montagem dos filtros ===== */
  function grupo(id, titulo, itens, tipo) {
    return `<fieldset class="radios" id="${id}"><legend>${titulo}</legend>${
      (tipo === "radio" ? [["", "Todos"]] : []).concat(itens.map((x) => [x, x])).map(([v, t]) =>
        `<label><input type="${tipo}" name="${id}" value="${esc(v)}"${tipo === "radio" && v === "" ? " checked" : ""}><span>${esc(t)}</span></label>`).join("")
    }</fieldset>`;
  }
  $("#painelFiltros").innerHTML =
    grupo("f-genero", "Gênero do profissional", GENEROS, "radio") +
    grupo("f-publico", "Público atendido", PUBLICO, "checkbox") +
    grupo("f-idiomas", "Idiomas que você fala", IDIOMAS, "checkbox") +
    grupo("f-acess", "Acessibilidade", ACESS, "checkbox") +
    `<div class="filtros-pe"><button type="button" class="btn ghost sm" id="limpar">Limpar filtros</button><button type="button" class="btn sm" id="aplicar">Ver resultados</button></div>`;

  function preencherTemas() {
    const todos = [...new Set([...TEMAS, ...pros.flatMap((x) => x.temas)])].sort((a, b) => a.localeCompare(b, "pt-BR"));
    const sel = $("#tema");
    sel.innerHTML = '<option value="">Todos os temas</option>' + todos.map((t) => `<option>${esc(t)}</option>`).join("");
    const temaURL = P.get("tema");
    if (temaURL) {
      const alvo = norm(temaURL);
      const achou = todos.find((t) => norm(t) === alvo) || todos.find((t) => norm(t).includes(alvo));
      if (achou) st.tema = achou;
    }
    sel.value = st.tema;
    if (seletorTema) seletorTema.montar();
  }

  /* ===== "Com experiência em": lista própria nas cores do site =====
     A lista nativa do <select> usa as cores do navegador (ex.: faixa amarela ao
     escolher) e não aceita estilo. Aqui o <select id="tema"> continua existindo,
     escondido, guardando o valor; esta lista só mostra e escolhe as opções.
     Teclado: ↑ ↓ para andar, Enter para escolher, Esc para fechar, digitar filtra. */
  const seletorTema = (function () {
    const sel = $("#tema");
    const caixa = sel && sel.closest(".busca-tema");
    if (!caixa) return null;
    caixa.classList.add("tema-pronto");
    const CHEV = '<svg class="tema-chev" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
    const CHECK = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
    caixa.insertAdjacentHTML("beforeend",
      `<button type="button" class="tema-sel" id="temaBtn" aria-haspopup="listbox" aria-expanded="false" aria-controls="temaLista">
        <span class="tema-rot">Com experiência em</span><span class="tema-valor">Todos os temas</span>${CHEV}
      </button>
      <div class="tema-painel" id="temaPainel" hidden>
        <div class="tema-busca"><input type="text" id="temaFiltro" placeholder="Procurar tema…" autocomplete="off" aria-label="Procurar tema"></div>
        <ul class="tema-lista" id="temaLista" role="listbox" aria-label="Com experiência em"></ul>
      </div>`);
    const btn = $("#temaBtn"), painel = $("#temaPainel"), listaT = $("#temaLista"), filtro = $("#temaFiltro");
    let ativo = -1;

    function itens() { return [...listaT.querySelectorAll("li:not([hidden])")]; }
    function montar() {
      listaT.innerHTML = [...sel.options].map((o, i) =>
        `<li role="option" id="temaOp${i}" data-v="${esc(o.value)}" aria-selected="${o.value === sel.value}">${CHECK}<span>${esc(o.text)}</span></li>`).join("");
      rotulo();
    }
    function rotulo() {
      const o = sel.options[sel.selectedIndex];
      btn.querySelector(".tema-valor").textContent = o ? o.text : "Todos os temas";
      btn.classList.toggle("tem-valor", !!sel.value);
      listaT.querySelectorAll("li").forEach((li) => li.setAttribute("aria-selected", String(li.dataset.v === sel.value)));
    }
    function marcar(i) {
      const L = itens();
      L.forEach((li) => li.classList.remove("ativo"));
      if (!L.length) { ativo = -1; filtro.removeAttribute("aria-activedescendant"); return; }
      ativo = Math.max(0, Math.min(i, L.length - 1));
      L[ativo].classList.add("ativo");
      filtro.setAttribute("aria-activedescendant", L[ativo].id);
      L[ativo].scrollIntoView({ block: "nearest" });
    }
    function abrir() {
      painel.hidden = false; btn.setAttribute("aria-expanded", "true"); caixa.classList.add("aberto");
      filtro.value = ""; filtrar();
      const L = itens(); marcar(Math.max(0, L.findIndex((li) => li.dataset.v === sel.value)));
      if (matchMedia("(hover: hover)").matches) filtro.focus();
    }
    function fechar(voltarFoco) {
      if (painel.hidden) return;
      painel.hidden = true; btn.setAttribute("aria-expanded", "false"); caixa.classList.remove("aberto");
      if (voltarFoco) btn.focus();
    }
    function escolher(li) {
      if (!li) return;
      if (sel.value !== li.dataset.v) { sel.value = li.dataset.v; sel.dispatchEvent(new Event("change", { bubbles: true })); }
      rotulo(); fechar(true);
    }
    function filtrar() {
      const q = norm(filtro.value.trim());
      listaT.querySelectorAll("li").forEach((li) => { li.hidden = !!q && !norm(li.textContent).includes(q); });
      marcar(0);
    }
    btn.addEventListener("click", () => (painel.hidden ? abrir() : fechar(false)));
    btn.addEventListener("keydown", (e) => { if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); abrir(); } });
    filtro.addEventListener("input", filtrar);
    filtro.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); marcar(ativo + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); marcar(ativo - 1); }
      else if (e.key === "Enter") { e.preventDefault(); escolher(itens()[ativo]); }
      else if (e.key === "Escape") { e.preventDefault(); fechar(true); }
      else if (e.key === "Tab") fechar(false);
    });
    listaT.addEventListener("click", (e) => escolher(e.target.closest("li")));
    listaT.addEventListener("mousemove", (e) => { const li = e.target.closest("li"); if (li) marcar(itens().indexOf(li)); });
    document.addEventListener("click", (e) => { if (!caixa.contains(e.target)) fechar(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !painel.hidden) fechar(true); });
    montar();
    return { montar, rotulo, fechar };
  })();

  /* ícones dos 3 botões do cartão (vídeo, compartilhar, ver perfil) */
  const ICO2 = {
    video: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M10 8.5l5.5 3.5-5.5 3.5z" fill="currentColor"/></svg>',
    compartilhar: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/></svg>',
    play: '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5.5v13l11-6.5z"/></svg>',
    perfil: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/></svg>'
  };

  /* Vídeo de apresentação: YouTube e Vimeo abrem numa janela por cima da página;
     outros links abrem em outra aba. */
  function linkEmbutido(u) {
    try {
      const url = new URL(u);
      const h = url.hostname.replace(/^www\.|^m\./, "");
      let id = "";
      if (h === "youtu.be") id = url.pathname.slice(1);
      else if (h.endsWith("youtube.com")) id = url.searchParams.get("v") || (url.pathname.match(/\/(shorts|embed|live)\/([^/?]+)/) || [])[2] || "";
      if (id) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id.split(/[?&]/)[0])}?autoplay=1&rel=0&playsinline=1&modestbranding=1`;
      if (h === "vimeo.com") { const v = (url.pathname.match(/\/(\d+)/) || [])[1]; if (v) return `https://player.vimeo.com/video/${v}?autoplay=1`; }
    } catch (e) { /* link inválido */ }
    return "";
  }
  function abrirVideo(u, nomeTxt, origem, formato) {
    const emb = linkEmbutido(u);
    const nome = esc(nomeTxt);
    /* vertical: link de Shorts do YouTube, ou "vertical" escolhido no painel */
    const vertical = formato === "vertical" || (formato !== "horizontal" && /youtube\.com\/shorts\//i.test(u));
    if (!emb) { window.open(u, "_blank", "noopener"); return; }
    const fundo = document.createElement("div");
    fundo.className = "pc-video-fundo";
    fundo.innerHTML = `<div class="pc-video${vertical ? " vertical" : ""}" role="dialog" aria-modal="true" aria-label="Vídeo de apresentação de ${nome}">
      <div class="pc-video-topo"><b>${nome}</b><button type="button" class="pc-video-fechar" aria-label="Fechar vídeo">×</button></div>
      <div class="pc-video-tela"><iframe src="${emb}" title="Vídeo de apresentação de ${nome}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>
    </div>`;
    document.body.appendChild(fundo);
    document.body.style.overflow = "hidden";
    const fechar = () => { fundo.remove(); document.body.style.overflow = ""; document.removeEventListener("keydown", tecla); if (origem) origem.focus(); };
    function tecla(e) { if (e.key === "Escape") fechar(); }
    document.addEventListener("keydown", tecla);
    fundo.addEventListener("click", (e) => { if (e.target === fundo || e.target.closest(".pc-video-fechar")) fechar(); });
    fundo.querySelector(".pc-video-fechar").focus();
  }
  /* Compartilhar: no celular abre o menu de compartilhar; no computador copia o link */
  async function compartilhar(btn) {
    const url = new URL(btn.dataset.compartilhar, location.href).href;
    const dados = { title: `${btn.dataset.nome} | Psicólogos Brasil`, text: `Conheça ${btn.dataset.nome} na Psicólogos Brasil.`, url };
    const rotulo = btn.querySelector("span");
    const original = rotulo.dataset.texto || (rotulo.dataset.texto = rotulo.textContent);
    try {
      if (navigator.share) { await navigator.share(dados); return; }
      await navigator.clipboard.writeText(url);
      rotulo.textContent = "Link copiado!";
    } catch (e) {
      if (e && e.name === "AbortError") return; /* a pessoa cancelou */
      rotulo.textContent = "Não deu para copiar";
    }
    setTimeout(() => { rotulo.textContent = original; }, 2200);
  }

  /* ===== Cartão ===== */
  function cartao(x) {
    const temas = st.tema ? [st.tema, ...x.temas.filter((t) => norm(t) !== norm(st.tema))] : x.temas;
    const mostrar = temas.slice(0, 5), resto = temas.length - mostrar.length;
    const nome = esc(x.nome);
    const foto = x.foto ? `<img src="${esc(x.foto)}" alt="Foto de ${nome}" loading="lazy">` : `<span>${esc(iniciais(x.nome))}</span>`;
    const wa = PSI.whatsapp(x);
    const meta = [];
    /* lista todos os públicos marcados no painel (siglas como LGBTQIA+ continuam em maiúsculas) */
    if (x.publico.length) meta.push(`<li>${ICO.pessoas}<span>Atende ${esc(juntar(x.publico.map((p) => (p === p.toUpperCase() ? p : p.toLowerCase()))))}</span></li>`);
    if (x.idiomas.some((i) => i !== "Português")) meta.push(`<li>${ICO.idioma}<span>Sessões em ${esc(juntar(x.idiomas.map((p) => p.toLowerCase())))}</span></li>`);
    x.acessibilidade.forEach((a) => meta.push(`<li>${ICO.acess}<span>${esc(a)}</span></li>`));
    /* com a agenda ao lado, o valor já aparece nela: aqui fica só a duração */
    if (window.AgendaPerfil) meta.push(`<li>${ICO.relogio}<span>Sessão de ${x.duracao || 50} min</span></li>`);
    else if (x.valor) meta.push(`<li>${ICO.relogio}<span>Sessão de ${x.duracao || 50} min · <b>R$ ${Number(x.valor).toLocaleString("pt-BR")}</b></span></li>`);
    const abrir = (conteudo, cls) => x.url ? `<a class="${cls}" href="${esc(x.url)}">${conteudo}</a>` : `<span class="${cls}">${conteudo}</span>`;
    /* Agenda online (js/agenda/): cartão único, psicólogo à esquerda e "Agende sua sessão" à direita */
    const agenda = !!window.AgendaPerfil;
    const selo = x.verificado ? `<span class="pc-verif" title="Perfil verificado: CRP conferido pela equipe">${SELO}<span class="pc-sr">Perfil verificado</span></span>` : "";
    if (agenda) return `<div class="pc-linha"><article class="pc pc-v" data-url="${esc(x.url)}">
      <div class="pc-cab">
        <div class="pc-foto-box">
          ${abrir(foto, "pc-foto")}
          ${x.video ? `<button type="button" class="pc-play" data-video="${esc(x.video)}" data-formato="${esc(x.videoFormato || "auto")}" data-nome="${nome}" aria-label="Assistir a apresentação de ${nome}"><span class="pc-play-ico">${ICO2.play}</span>Apresentação</button>` : ""}
        </div>
        <div class="pc-cab-txt">
          <h2 class="pc-nome">${x.url ? `<a href="${esc(x.url)}">${nome}</a>` : nome}${selo}</h2>
          <p class="pc-prof">${esc(x.tratamento || "Psicologia")}${x.crp ? ` · CRP ${esc(x.crp)}` : ""}${x.opp ? ` · OPP ${esc(x.opp)}` : ""}</p>
          ${x.abordagens.length ? `<p class="pc-abord">${esc(x.abordagens.slice(0, 2).join(" · "))}</p>` : ""}
          ${temas.length ? `<ul class="pc-temas">${temas.slice(0, 8).map((t, i) => `<li class="${[st.tema && norm(t) === norm(st.tema) ? "on" : "", i >= 3 ? "t-extra" : ""].join(" ").trim()}">${esc(t)}</li>`).join("")}${temas.length > 3 ? `<li class="mais mais-cel">+${temas.length - 3}</li>` : ""}${temas.length > 8 ? `<li class="mais mais-pc">+${temas.length - 8}</li>` : ""}</ul>` : ""}
        </div>
      </div>
      ${x.bio || x.resumo ? `<p class="pc-bio">${esc(String(x.bio || x.resumo).replace(/\s+/g, " ").trim())}</p>` : ""}
      ${meta.length ? `<ul class="pc-meta">${meta.join("")}</ul>` : ""}
      <div class="pc-acoes pc-acoes-2">
        ${x.url ? `<a class="pc-pilula" href="${esc(x.url)}">${ICO2.perfil}<span>Ver perfil</span></a>` : ""}
        <button type="button" class="pc-pilula" data-compartilhar="${esc(x.url)}" data-nome="${nome}">${ICO2.compartilhar}<span>Compartilhar</span></button>
      </div>
      <div class="pc-acoes"><button type="button" class="btn ghost pc-ver-horarios" data-ver-horarios aria-expanded="false" aria-controls="agendar-${esc(x.slug)}">${ICO.relogio}Ver horários livres</button></div>
    </article><div class="pc-agenda" id="agendar-${esc(x.slug)}" data-agenda-psi="${esc(x.agenda || x.slug)}" data-agenda-tarde></div></div>`;
    return `${agenda ? '<div class="pc-linha">' : ""}<article class="pc" data-url="${esc(x.url)}">
      ${abrir(foto, "pc-foto")}
      <div class="pc-info">
        <h2 class="pc-nome">${x.url ? `<a href="${esc(x.url)}">${nome}</a>` : nome}${x.verificado ? `<span class="pc-verif" title="Perfil verificado: CRP conferido pela equipe">${SELO}<span class="pc-sr">Perfil verificado</span></span>` : ""}</h2>
        <p class="pc-prof">${esc(x.tratamento || "Psicologia")}${x.crp ? ` · CRP ${esc(x.crp)}` : ""}${x.opp ? ` · OPP ${esc(x.opp)}` : ""}${x.abordagens.length ? ` · ${esc(x.abordagens[0])}` : ""}</p>
        ${mostrar.length ? `<ul class="pc-temas">${mostrar.map((t) => `<li${st.tema && norm(t) === norm(st.tema) ? ' class="on"' : ""}>${esc(t)}</li>`).join("")}${resto > 0 ? `<li class="mais">+${resto}</li>` : ""}</ul>` : ""}
        ${x.resumo ? `<p class="pc-bio">${esc(x.resumo)}</p>` : ""}
        ${meta.length ? `<ul class="pc-meta">${meta.join("")}</ul>` : ""}
        <div class="pc-acoes"><a class="btn" href="${wa.href}"${wa.proprio ? " data-whatsapp-proprio" : ""} target="_blank" rel="noopener">${ICO.zap}Quero me consultar</a>${x.url ? `<a class="btn ghost" href="${esc(x.url)}">Ver perfil</a>` : ""}${agenda ? `<button type="button" class="btn ghost pc-ver-horarios" data-ver-horarios aria-expanded="false" aria-controls="agendar-${esc(x.slug)}">${ICO.relogio}Ver horários livres</button>` : ""}</div>
      </div>
    </article>${agenda ? `<div class="pc-agenda" id="agendar-${esc(x.slug)}" data-agenda-psi="${esc(x.agenda || x.slug)}" data-agenda-tarde></div></div>` : ""}`;
  }

  /* ===== Filtrar e mostrar ===== */
  function ativos() {
    const a = [];
    if (st.tema) a.push(["tema", st.tema, "Experiência em " + st.tema]);
    if (st.genero) a.push(["genero", st.genero, st.genero]);
    st.publico.forEach((v) => a.push(["publico", v, v]));
    st.idiomas.forEach((v) => a.push(["idiomas", v, v]));
    st.acess.forEach((v) => a.push(["acess", v, v]));
    return a;
  }
  /* ===== Mostra 6 psicólogos por vez; "Ver mais psicólogos" traz mais 6 =====
     Para mudar a quantidade, troque só POR_VEZ. */
  const POR_VEZ = 6;
  let mostrando = POR_VEZ, resultado = [];
  lista.insertAdjacentHTML("afterend",
    `<div class="pc-mais" id="pcMais" hidden>
      <p class="pc-mais-txt" id="pcMaisTxt" aria-live="polite"></p>
      <button type="button" class="btn ghost lg pc-mais-btn" id="pcMaisBtn">Ver mais psicólogos<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>
    </div>`);
  function atualizarMais() {
    const total = resultado.length, vistos = Math.min(mostrando, total);
    $("#pcMais").hidden = total <= POR_VEZ;
    $("#pcMaisTxt").textContent = `Mostrando ${vistos} de ${total} psicólogos`;
    $("#pcMaisBtn").hidden = vistos >= total;
  }
  $("#pcMaisBtn").addEventListener("click", () => {
    const de = mostrando;
    mostrando += POR_VEZ;
    /* só acrescenta os novos: quem já estava escolhendo horário não perde nada */
    lista.insertAdjacentHTML("beforeend", resultado.slice(de, mostrando).map(cartao).join(""));
    if (window.AgendaPerfil) window.AgendaPerfil.iniciar();
    atualizarMais();
    /* leva o foco (teclado e leitor de tela) para o primeiro psicólogo novo */
    const el = lista.children[de], novo = el && (el.querySelector(".pc-nome a") || el.querySelector("a, button"));
    if (novo) novo.focus({ preventScroll: true });
  });

  function render() {
    const q = norm(st.q.trim());
    const r = pros.filter((x) =>
      (!q || norm([x.nome, x.tratamento, x.crp, x.opp || "", ...x.temas, ...x.abordagens, x.resumo || ""].join(" ")).includes(q)) &&
      (!st.tema || x.temas.some((t) => norm(t) === norm(st.tema))) &&
      (!st.genero || x.genero === st.genero) &&
      (!st.publico.length || st.publico.some((v) => x.publico.includes(v))) &&
      (!st.idiomas.length || st.idiomas.some((v) => x.idiomas.includes(v))) &&
      (!st.acess.length || st.acess.every((v) => x.acessibilidade.includes(v)))
    );
    lista.classList.toggle("com-agenda", !!window.AgendaPerfil);
    resultado = r; mostrando = POR_VEZ;   /* filtro novo: volta a mostrar os 6 primeiros */
    lista.innerHTML = r.length ? r.slice(0, mostrando).map(cartao).join("") :
      `<div class="pc-vazio"><h2>Nenhum profissional com esses filtros</h2><p>Tente tirar algum filtro ou fale com a nossa equipe: a gente indica o profissional certo para você.</p><div class="pc-acoes"><button type="button" class="btn ghost" data-limpar>Limpar filtros</button><a class="btn" href="https://api.whatsapp.com/send?phone=${WHATS}&text=${encodeURIComponent("Olá! Quero ajuda para escolher um psicólogo.")}" target="_blank" rel="noopener">Pedir indicação</a></div></div>`;
    $("#contagem").textContent = r.length === 1 ? "1 profissional encontrado" : `${r.length} profissionais encontrados`;
    const at = ativos();
    $("#ativos").innerHTML = at.map(([k, v, t]) => `<button type="button" data-k="${k}" data-v="${esc(v)}" aria-label="Remover filtro ${esc(t)}">${esc(t)}<span aria-hidden="true">×</span></button>`).join("");
    const n = at.filter(([k]) => k !== "tema").length;
    $("#nFiltros").textContent = n; $("#nFiltros").hidden = !n;
    const u = new URL(location.href);
    st.q ? u.searchParams.set("q", st.q) : u.searchParams.delete("q");
    st.tema ? u.searchParams.set("tema", st.tema) : u.searchParams.delete("tema");
    history.replaceState(null, "", u);
    if (window.AgendaPerfil) window.AgendaPerfil.iniciar();
    if (seletorTema) seletorTema.rotulo();
    atualizarMais();
  }
  function lerPainel() {
    st.genero = ($("#f-genero input:checked") || {}).value || "";
    st.publico = [...document.querySelectorAll("#f-publico input:checked")].map((i) => i.value);
    st.idiomas = [...document.querySelectorAll("#f-idiomas input:checked")].map((i) => i.value);
    st.acess = [...document.querySelectorAll("#f-acess input:checked")].map((i) => i.value);
  }
  function escreverPainel() {
    document.querySelectorAll("#painelFiltros input").forEach((i) => {
      const g = i.name, v = i.value;
      i.checked = g === "f-genero" ? v === st.genero : (g === "f-publico" ? st.publico : g === "f-idiomas" ? st.idiomas : st.acess).includes(v);
    });
  }
  function limpar() { st.q = ""; st.tema = ""; st.genero = ""; st.publico = []; st.idiomas = []; st.acess = []; $("#q").value = ""; $("#tema").value = ""; escreverPainel(); render(); }
  function abrirPainel(abrir) {
    const p = $("#painelFiltros"), b = $("#btnFiltros");
    p.hidden = !abrir; b.setAttribute("aria-expanded", abrir);
  }

  $("#q").value = st.q;
  $("#q").addEventListener("input", (e) => { st.q = e.target.value; render(); });
  $("#tema").addEventListener("change", (e) => { st.tema = e.target.value; render(); });
  $("#btnFiltros").addEventListener("click", () => abrirPainel($("#painelFiltros").hidden));
  $("#painelFiltros").addEventListener("change", () => { lerPainel(); render(); });
  document.addEventListener("click", (e) => {
    if (e.target.closest("#limpar") || e.target.closest("[data-limpar]")) limpar();
    if (e.target.closest("#aplicar")) { abrirPainel(false); $("#contagem").scrollIntoView({ behavior: "smooth", block: "start" }); }
    const b = e.target.closest("#ativos button");
    if (b) {
      const { k, v } = b.dataset;
      if (k === "tema") { st.tema = ""; $("#tema").value = ""; }
      else if (k === "genero") st.genero = "";
      else st[k] = st[k].filter((x) => x !== v);
      escreverPainel(); render();
    }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#painelFiltros").hidden) { abrirPainel(false); $("#btnFiltros").focus(); } });

  /* ===== Clicar em qualquer parte do cartão abre o perfil ===== */
  lista.addEventListener("click", (e) => {
    const bv = e.target.closest("[data-video]");
    if (bv) { abrirVideo(bv.dataset.video, bv.dataset.nome, bv, bv.dataset.formato); return; }
    const bc = e.target.closest("[data-compartilhar]");
    if (bc) { compartilhar(bc); return; }
    /* celular: "Ver horários livres" abre e fecha a caixa de agendamento embaixo do cartão */
    const vh = e.target.closest("[data-ver-horarios]");
    if (vh) {
      const linha = vh.closest(".pc-linha");
      const aberta = linha.classList.toggle("aberta");
      vh.setAttribute("aria-expanded", String(aberta));
      vh.lastChild.textContent = aberta ? "Esconder horários" : "Ver horários livres";
      if (aberta) linha.querySelector(".pc-agenda").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
      return;
    }
    if (e.target.closest("a, button, input, select, label")) return; /* links e botões continuam funcionando normalmente */
    const c = e.target.closest(".pc[data-url]");
    if (c && !String(getSelection())) location.href = c.dataset.url;
  });

  /* ===== Busca presa no topo: marca quando "grudou" (para a sombra e o modo compacto) ===== */
  const fixa = $("#buscaFixa");
  if (fixa) {
    /* Um marcador parado logo ACIMA da barra diz se ela grudou. Ele não se mexe quando a
       barra muda de tamanho, então não fica "liga/desliga" (era isso que tremia no celular).
       E um espaço logo ABAIXO repõe a altura que a barra perde no modo compacto,
       para a lista não pular. */
    const marco = document.createElement("div");
    marco.setAttribute("aria-hidden", "true");
    marco.style.cssText = "height:0;margin:0;padding:0";
    const espaco = document.createElement("div");
    espaco.setAttribute("aria-hidden", "true");
    espaco.className = "busca-fixa-espaco";
    fixa.before(marco);
    fixa.after(espaco);
    let presa = false, pendente = false;
    const celular = matchMedia("(max-width: 760px)");
    const marcar = () => {
      pendente = false;
      let agora;
      if (celular.matches) {
        /* CELULAR: a busca grande rola junto com a página. Só depois que ela some
           inteira lá em cima é que a barra compacta desce, presa no topo da tela.
           O espaço embaixo guarda a altura da busca grande (fora da tela), então
           nada pula e não sobra buraco entre a barra e a lista. */
        const ref = presa ? espaco : fixa;
        agora = ref.getBoundingClientRect().bottom < 0;
        if (agora === presa) return;
        presa = agora;
        if (presa) { espaco.style.height = fixa.offsetHeight + "px"; fixa.classList.add("presa"); }
        else { fixa.classList.remove("presa"); espaco.style.height = "0px"; }
        return;
      }
      /* COMPUTADOR: a busca gruda logo abaixo do menu do topo (mesmo tamanho; só ganha sombra) */
      const topo = parseFloat(getComputedStyle(fixa).top) || 0;
      agora = marco.getBoundingClientRect().top < topo;
      if (agora === presa) return;
      presa = agora;
      const antes = fixa.offsetHeight + espaco.offsetHeight;   // altura total que a barra ocupa na página
      fixa.classList.toggle("presa", presa);
      espaco.style.height = presa ? Math.max(0, antes - fixa.offsetHeight) + "px" : "0px";
    };
    addEventListener("scroll", () => { if (!pendente) { pendente = true; requestAnimationFrame(marcar); } }, { passive: true });
    addEventListener("resize", () => { espaco.style.height = "0px"; fixa.classList.remove("presa"); presa = false; marcar(); });
    marcar();
  }

  /* ===== Veio do perfil ("Ver horários e agendar" = ?q=Nome#agendar) =====
     Centraliza na tela o cartão do psicólogo com o "Agende sua sessão" ao lado,
     sem ficar cortado embaixo nem escondido atrás do topo e da busca fixa.
     No celular, já abre os horários e mostra a caixa logo abaixo da busca. */
  const VEIO_AGENDAR = location.hash === "#agendar";
  if (VEIO_AGENDAR && "scrollRestoration" in history) history.scrollRestoration = "manual";
  function focarAgenda() {
    const linha = lista.querySelector(".pc-linha");
    if (!linha) return;
    const celular = matchMedia("(max-width: 1000px)").matches;
    const suave = matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    let alvo = linha;
    if (celular) {
      const vh = linha.querySelector("[data-ver-horarios]");
      if (vh && !linha.classList.contains("aberta")) {
        linha.classList.add("aberta");
        vh.setAttribute("aria-expanded", "true");
        vh.lastChild.textContent = "Esconder horários";
      }
      alvo = linha.querySelector(".pc-agenda") || linha;
    }
    const posicao = () => {
      const fixa = $("#buscaFixa");
      const topoMenu = celular ? 0 : ((document.querySelector("header.site") || {}).offsetHeight || 0);
      /* no celular a busca fica compacta (cerca de 80px) depois que gruda no topo */
      const buscaPresa = fixa && getComputedStyle(fixa).position === "sticky";
      const alturaBusca = celular ? 84 : (buscaPresa ? fixa.offsetHeight : 0);
      const areaTopo = topoMenu + alturaBusca;
      const areaAltura = innerHeight - areaTopo;
      const r = alvo.getBoundingClientRect();
      const topoAlvo = r.top + scrollY;
      /* cabe na tela: fica no meio do espaço livre; não cabe: começa logo abaixo da busca */
      const folga = celular ? 8 : Math.max(4, (areaAltura - r.height) / 2);
      return Math.max(0, Math.round(topoAlvo - areaTopo - folga));
    };
    scrollTo({ top: posicao(), behavior: suave });
    /* a caixa da agenda termina de montar logo depois: confere e ajusta se mudou */
    setTimeout(() => { const y = posicao(); if (Math.abs(y - scrollY) > 4) scrollTo({ top: y, behavior: suave }); }, 700);
    history.replaceState(null, "", location.pathname + location.search);   /* tira o #agendar: recarregar não rola de novo */
  }

  /* ===== Carregar os dados ===== */
  PSI.carregar().then(({ lista: dados, demo }) => {
    pros = dados;
    $("#avisoDemo").hidden = !demo;
    preencherTemas(); render();
    if (VEIO_AGENDAR) requestAnimationFrame(() => requestAnimationFrame(focarAgenda));
  });
})();
