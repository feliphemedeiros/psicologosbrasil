/* Psicólogos Brasil — psicologos.js: lista de profissionais com busca e filtros (/psicologos/).
   Os dados (e os perfis de demonstração) ficam em js/dados-psicologos.js.
   Clicar em um cartão abre a página de perfil do psicólogo (/psicologos/perfil/?p=nome). */
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
  const PUBLICO = ["Crianças", "Adolescentes", "Adultos", "Idosos", "Casais", "Famílias"];
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
    grupo("f-publico", "Atendimento por idade", PUBLICO, "checkbox") +
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
  }

  /* ===== Cartão ===== */
  function cartao(x) {
    const temas = st.tema ? [st.tema, ...x.temas.filter((t) => norm(t) !== norm(st.tema))] : x.temas;
    const mostrar = temas.slice(0, 5), resto = temas.length - mostrar.length;
    const nome = esc(x.nome);
    const foto = x.foto ? `<img src="${esc(x.foto)}" alt="Foto de ${nome}" loading="lazy">` : `<span>${esc(iniciais(x.nome))}</span>`;
    const wa = PSI.whatsapp(x);
    const meta = [];
    if (x.publico.length) meta.push(`<li>${ICO.pessoas}<span>Atende ${esc(juntar(x.publico.map((p) => p.toLowerCase())))}</span></li>`);
    if (x.idiomas.some((i) => i !== "Português")) meta.push(`<li>${ICO.idioma}<span>Sessões em ${esc(juntar(x.idiomas.map((p) => p.toLowerCase())))}</span></li>`);
    x.acessibilidade.forEach((a) => meta.push(`<li>${ICO.acess}<span>${esc(a)}</span></li>`));
    if (x.valor) meta.push(`<li>${ICO.relogio}<span>Sessão de ${x.duracao || 50} min · <b>R$ ${Number(x.valor).toLocaleString("pt-BR")}</b></span></li>`);
    const abrir = (conteudo, cls) => x.url ? `<a class="${cls}" href="${esc(x.url)}">${conteudo}</a>` : `<span class="${cls}">${conteudo}</span>`;
    return `<article class="pc" data-url="${esc(x.url)}">
      ${abrir(foto, "pc-foto")}
      <div class="pc-info">
        <h2 class="pc-nome">${x.url ? `<a href="${esc(x.url)}">${nome}</a>` : nome}${x.verificado ? `<span class="pc-verif" title="Perfil verificado: CRP conferido pela equipe">${SELO}<span class="pc-sr">Perfil verificado</span></span>` : ""}</h2>
        <p class="pc-prof">${esc(x.tratamento || "Psicologia")}${x.crp ? ` · CRP ${esc(x.crp)}` : ""}${x.abordagens.length ? ` · ${esc(x.abordagens[0])}` : ""}</p>
        ${mostrar.length ? `<ul class="pc-temas">${mostrar.map((t) => `<li${st.tema && norm(t) === norm(st.tema) ? ' class="on"' : ""}>${esc(t)}</li>`).join("")}${resto > 0 ? `<li class="mais">+${resto}</li>` : ""}</ul>` : ""}
        ${x.resumo ? `<p class="pc-bio">${esc(x.resumo)}</p>` : ""}
        ${meta.length ? `<ul class="pc-meta">${meta.join("")}</ul>` : ""}
        <div class="pc-acoes"><a class="btn" href="${wa.href}"${wa.proprio ? " data-whatsapp-proprio" : ""} target="_blank" rel="noopener">${ICO.zap}Quero me consultar</a>${x.url ? `<a class="btn ghost" href="${esc(x.url)}">Ver perfil</a>` : ""}</div>
      </div>
    </article>`;
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
  function render() {
    const q = norm(st.q.trim());
    const r = pros.filter((x) =>
      (!q || norm([x.nome, x.tratamento, x.crp, ...x.temas, ...x.abordagens, x.resumo || ""].join(" ")).includes(q)) &&
      (!st.tema || x.temas.some((t) => norm(t) === norm(st.tema))) &&
      (!st.genero || x.genero === st.genero) &&
      (!st.publico.length || st.publico.some((v) => x.publico.includes(v))) &&
      (!st.idiomas.length || st.idiomas.some((v) => x.idiomas.includes(v))) &&
      (!st.acess.length || st.acess.every((v) => x.acessibilidade.includes(v)))
    );
    lista.innerHTML = r.length ? r.map(cartao).join("") :
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
    if (e.target.closest("a, button, input, select, label")) return; /* links e botões continuam funcionando normalmente */
    const c = e.target.closest(".pc[data-url]");
    if (c && !String(getSelection())) location.href = c.dataset.url;
  });

  /* ===== Carregar os dados ===== */
  PSI.carregar().then(({ lista: dados, demo }) => {
    pros = dados;
    $("#avisoDemo").hidden = !demo;
    preencherTemas(); render();
  });
})();
