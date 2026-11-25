/* Psicólogos Brasil — main.js
   Dados e utilidades usados em todas as páginas.
   - PROS: lista de psicólogos (página /psicologos/).
   - WHATS: número do WhatsApp (somente números, com DDI+DDD).
   Carregue este arquivo ANTES dos outros em cada página. */

/* O número fica em js/config.js (CONFIG.whatsapp). */
const WHATS = String(CONFIG.whatsapp).replace(/\D/g, "");
/* Endereço base do site (definido no <html data-base>). Use BASE + "pasta/" nos links montados pelo JavaScript. */
const BASE = document.documentElement.dataset.base || "/";
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
/* No computador (Live Server / localhost) não existe o .htaccess, então o endereço curto do artigo
   (psicologosbrasil.com.br/nome-do-artigo/) não abre. Lá o link usa blog/artigo/?a=nome-do-artigo. */
const SITE_LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === "file:";
const linkArtigo = (slug) => SITE_LOCAL ? BASE + "blog/artigo/?a=" + encodeURIComponent(slug) : BASE + encodeURIComponent(slug) + "/";

/* PSICÓLOGOS — n: nome, e: especialidade, t: turno (Manhã/Tarde/Noite), p: preço, c: cor do avatar, a: abordagem */
const PROS = [
  {
    n: "Dra. Helena Prado",
    e: "Ansiedade",
    t: "Noite",
    p: 120,
    c: "#bfe3dc",
    a: "Terapia cognitivo-comportamental",
  },
  {
    n: "Dr. Lucas Almeida",
    e: "Carreira",
    t: "Tarde",
    p: 110,
    c: "#f6dca0",
    a: "Orientação de carreira e burnout",
  },
  {
    n: "Dra. Beatriz Sales",
    e: "Luto",
    t: "Manhã",
    p: 130,
    c: "#d9d2f0",
    a: "Abordagem humanista",
  },
  {
    n: "Dr. Tiago Moreira",
    e: "Relacionamentos",
    t: "Noite",
    p: 100,
    c: "#f3c9c0",
    a: "Terapia de casal e família",
  },
  {
    n: "Dra. Aline Duarte",
    e: "Ansiedade",
    t: "Manhã",
    p: 115,
    c: "#c8e6f2",
    a: "Psicanálise",
  },
  {
    n: "Dra. Sofia Nunes",
    e: "Autoestima",
    t: "Tarde",
    p: 105,
    c: "#e2eec2",
    a: "Terapia de aceitação e compromisso",
  },
];
const CATS = ["Todos", ...new Set(PROS.map((x) => x.e))];
const HR = { Manhã: [9, 0], Tarde: [15, 0], Noite: [19, 30] };

/* Faixa de temas que rola (só na página inicial): duas fileiras, em sentidos opostos.
   Cada tema abre a lista de psicólogos já filtrada por ele. */
(function () {
  const l1 = $("#marqin"), l2 = $("#marqin2");
  if (!l1) return;
  const TEMAS_1 = ["Ansiedade", "Depressão", "Autoestima", "Relacionamentos", "Burnout", "Luto", "Estresse", "Pânico", "Terapia de casal", "TDAH", "Autoconhecimento", "Insônia", "Carreira"];
  const TEMAS_2 = ["Autismo (TEA)", "Conflitos familiares", "Solidão", "Transtorno bipolar", "Fobias", "TOC", "Síndrome do impostor", "Morar fora do Brasil", "Gestação e pós-parto", "Ciúmes", "Procrastinação", "Adolescência", "LGBTQIA+"];
  const montar = (lista) => {
    const h = lista.map((c) => `<a class="chip" href="${BASE}psicologos/?tema=${encodeURIComponent(c)}">${esc(c)}</a>`).join("");
    /* repete para a volta ficar sem emenda; a cópia fica escondida dos leitores de tela */
    return h + h.replace(/<a /g, '<a aria-hidden="true" tabindex="-1" ');
  };
  l1.innerHTML = montar(TEMAS_1);
  if (l2) l2.innerHTML = montar(TEMAS_2);
})();

/* Efeito de entrada: elementos com a classe "rv" aparecem suavemente ao rolar a página. */
(function () {
  const els = document.querySelectorAll(".rv");
  if (!("IntersectionObserver" in window)) return els.forEach((el) => el.classList.add("in"));
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.15 });
  els.forEach((el) => io.observe(el));
})();

/* Aviso de cookies (LGPD): carregado em todas as páginas do site. Ver js/cookies.js */
(function () {
  if (window.PBCookies || document.getElementById("pb-ck-js")) return;
  const s = document.createElement("script");
  s.id = "pb-ck-js"; s.src = BASE + "js/cookies.js?v=262"; s.defer = true;
  document.head.appendChild(s);
})();
