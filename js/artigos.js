/* Psicólogos Brasil — artigos.js: textos dos artigos e montagem da página artigos.html */

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

(function () {
  const box = document.getElementById("artigosLista");
  if (!box || typeof ARTIGOS === "undefined") return;
  box.innerHTML = ARTIGOS.map((a) =>
    `<details class="post"><summary><div><span class="tag">${esc(a.tema)}</span><h2>${esc(a.titulo)}</h2><p>${esc(a.resumo)}</p></div></summary><div class="body">` +
    a.texto.trim().split(/\n\s*\n/).map((p) => `<p>${esc(p.trim())}</p>`).join("") +
    `<a class="btn" href="psicologos.html?tema=${encodeURIComponent(a.tema)}">Encontrar meu terapeuta</a></div></details>`).join("");
})();
