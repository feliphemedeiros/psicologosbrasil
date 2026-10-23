/* Psicólogos Brasil — artigos.js: textos dos artigos e montagem da página /artigos/ */

/* ARTIGOS — é aqui que você adiciona um artigo novo.

   COMO ADICIONAR
   1) Copie um bloco { ... }, inteiro, e cole logo abaixo de "const ARTIGOS = [" (o mais novo fica no topo).
   2) Troque tema, titulo, resumo e texto. Termine o bloco com vírgula.
   3) Salve e atualize o navegador. O artigo aparece na tela "Artigos" com o layout padrão.

   REGRAS
   - tema: use um destes para o botão filtrar os psicólogos: Ansiedade, Carreira, Luto, Relacionamentos, Autoestima.
   - texto: separe os parágrafos com UMA LINHA EM BRANCO.
   - Não use o sinal ` (crase) dentro do texto, e escreva aspas assim: “ ” ou ' ' (evite ").

   MODELO:
   {
     tema: "Ansiedade",
     titulo: "Título do artigo",
     resumo: "Uma frase que aparece antes de abrir o artigo.",
     texto: `Primeiro parágrafo.

Segundo parágrafo.`,
   },
*/
const ARTIGOS = [
  {
    tema: "Ansiedade",
    titulo: "Ansiedade: quando a preocupação passa do ponto",
    resumo: "Sentir ansiedade de vez em quando é normal. O alerta aparece quando ela é constante e começa a atrapalhar o seu dia.",
    texto: `Sentir ansiedade de vez em quando é normal: ela prepara o corpo para uma prova, uma entrevista ou uma decisão difícil. O sinal de alerta aparece quando a preocupação é constante, difícil de controlar e começa a atrapalhar o sono, o trabalho ou os relacionamentos.

Sintomas comuns incluem coração acelerado, tensão muscular, pensamentos que não param e a sensação de que algo ruim vai acontecer. Respirar devagar, reduzir a cafeína e manter uma rotina de sono ajudam no dia a dia, mas não substituem o acompanhamento profissional.

A terapia, em especial abordagens como a terapia cognitivo-comportamental, ajuda a entender o que alimenta a ansiedade e a criar formas de lidar com ela. Se você se identificou, conversar com um psicólogo é um bom primeiro passo.`,
  },
  {
    tema: "Luto",
    titulo: "Luto: não existe um jeito certo de viver",
    resumo: "Cada pessoa vive a perda no seu tempo. Entender isso alivia a cobrança e abre espaço para pedir ajuda.",
    texto: `O luto não vem só com a morte de alguém. Ele também aparece em separações, mudanças de cidade e no fim de ciclos importantes. A tristeza, a raiva, a culpa e até o alívio são reações comuns e não seguem uma ordem.

Não há prazo para “superar”. O que costuma ajudar é falar sobre a perda, manter pequenas rotinas e aceitar o apoio de quem está por perto. Datas especiais podem reabrir a dor, e isso também é esperado.

Vale procurar um psicólogo quando a dor impede o sono, o trabalho ou o cuidado com você por muitas semanas. A terapia oferece um espaço seguro para falar sem precisar proteger ninguém.`,
  },
  {
    tema: "Carreira",
    titulo: "Burnout: quando o cansaço não passa com o fim de semana",
    resumo: "Exaustão, distanciamento e queda de rendimento podem indicar esgotamento. Saiba reconhecer os sinais.",
    texto: `Burnout é um estado de esgotamento ligado ao trabalho. Os sinais mais comuns são cansaço que não passa com o descanso, irritação, perda de interesse no que antes motivava e a sensação de que nada do que você faz é suficiente.

Conversar com a liderança sobre carga e prazos, criar limites de horário e retomar atividades que dão prazer são passos importantes. Ignorar os sinais costuma piorar o quadro.

A psicoterapia ajuda a identificar o que está pesando, a reorganizar expectativas e a decidir com calma os próximos passos na carreira. Em casos mais intensos, o profissional também pode orientar a buscar avaliação médica.`,
  },
  {
    tema: "Relacionamentos",
    titulo: "Como conversar sobre um assunto difícil sem brigar",
    resumo: "Pequenos ajustes na forma de começar a conversa mudam o rumo dela.",
    texto: `Muitas discussões começam no tom, e não no assunto. Falar do que você sente, em vez de apontar o que a outra pessoa fez, diminui a defesa e abre espaço para ouvir.

Escolha um momento calmo, seja específico sobre o que incomodou e diga o que você precisa daqui para frente. Se a conversa esquentar, combine uma pausa e volte ao tema depois.

Quando os mesmos conflitos se repetem, a terapia individual ou de casal ajuda a enxergar o padrão e a construir uma comunicação mais clara.`,
  },
];

/* ===== Lista da página /blog/ =====
   Ordem de busca:
   1) Artigos publicados pelo PAINEL ONLINE (js/nuvem.js) → abrem no endereço curto: /nome-do-artigo/
   2) Se não houver: data/artigos.json (painel antigo, que gerava arquivos).
   3) Se não houver nenhum: os textos de exemplo acima (ARTIGOS).
   A lista sai sempre do mais novo para o mais antigo (pela data do artigo). */
(function () {
  const box = document.getElementById("artigosLista");
  if (!box) return;
  /* Caminhos do painel começam com "/". Aqui viram relativos (funciona no GitHub Pages e na Hostinger). */
  const caminho = (u) => {
    u = String(u || "");
    if (/^(https?:)?\/\//.test(u) || /^data:/.test(u) || u.startsWith(BASE)) return u;
    return BASE + u.replace(/^\/+/, "");
  };
  const dataBR = (iso) => { try { return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" }); } catch (e) { return iso || ""; } };

  function exemplos() {
    if (typeof ARTIGOS === "undefined") return;
    box.innerHTML = ARTIGOS.map((a) =>
      `<details class="post"><summary><div><span class="tag">${esc(a.tema)}</span><h2>${esc(a.titulo)}</h2><p>${esc(a.resumo)}</p></div></summary><div class="body">` +
      a.texto.trim().split(/\n\s*\n/).map((p) => `<p>${esc(p.trim())}</p>`).join("") +
      `<a class="btn" href="${BASE}psicologos/?tema=${encodeURIComponent(a.tema)}">Encontrar meu terapeuta</a></div></details>`).join("");
  }

  function doPainel(lista) {
    const dica = document.querySelector(".pg-artigos .hint");
    if (dica) dica.remove();
    box.innerHTML = lista.map((a) => {
      const meta = [a.data ? dataBR(a.data) : "", a.minutos ? a.minutos + " min de leitura" : ""].filter(Boolean).join(" · ");
      return `<a class="post post-link${a.capa ? " com-capa" : ""}" href="${esc(caminho(a.url))}">` +
        (a.capa ? `<img class="post-capa" src="${esc(caminho(a.capa))}" alt="" loading="lazy">` : "") +
        `<div>${a.categoria ? `<span class="tag">${esc(a.categoria)}</span>` : ""}<h2>${esc(a.titulo || "")}</h2>` +
        (a.resumo ? `<p>${esc(a.resumo)}</p>` : "") +
        (meta ? `<small class="post-meta">${esc(meta)}</small>` : "") +
        `<span class="post-ler">Ler artigo →</span></div></a>`;
    }).join("");
  }

  const daNuvem = typeof NUVEM !== "undefined"
    ? NUVEM.lista("artigos").then((l) => Promise.all(l.map(async (a) => ({
        ...a, url: BASE + encodeURIComponent(a.slug) + "/", capa: await NUVEM.resolverTexto(a.capa || "")
      })))).catch(() => [])
    : Promise.resolve([]);
  daNuvem
    .then((l) => l.length ? l : fetch(BASE + "data/artigos.json", { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []))
    .then((d) => (Array.isArray(d) && d.length ? doPainel(d) : exemplos()));
})();
