/* Psicólogos Brasil — dados-psicologos.js
   Dados dos psicólogos, usados pela lista (/psicologos/) e pela página de perfil (/psicologos/perfil/).
   - Os dados reais vêm de /data/psicologos.json (gerado pelo Painel).
   - Se esse arquivo não existir, aparecem os perfis de demonstração abaixo.

   Campos de cada psicólogo (todos opcionais, menos "nome"):
     nome, tratamento ("Psicóloga", "Psicólogo"…), crp, verificado (true/false), foto (endereço da imagem),
     abordagens [lista], temas [lista], publico [lista], idiomas [lista], acessibilidade [lista],
     valor (número), duracao (minutos), resumo (texto curto do cartão),
     bio (texto longo da página de perfil; parágrafos separados por uma linha em branco),
     formacao [lista], whatsapp (só se o psicólogo atender pelo próprio número),
     slug (final do endereço do perfil; se não tiver, é criado a partir do nome), ativo (false esconde o perfil). */
const PSI = (function () {
  const CORES = ["#bfe3dc", "#f6dca0", "#d9d2f0", "#f3c9c0", "#c8e6f2", "#e2eec2"];

  /* ===== Perfis de demonstração (somem quando o Painel gerar /data/psicologos.json) ===== */
  const DEMO = [
    { nome: "Helena Prado", tratamento: "Psicóloga", crp: "11/10234", verificado: true, abordagens: ["TCC"], temas: ["Ansiedade", "Pânico", "Depressão", "Autoestima", "TOC"], publico: ["Adolescentes", "Adultos"], idiomas: ["Português", "Inglês"], acessibilidade: [], valor: 120, duracao: 50, resumo: "Um espaço sem julgamentos, onde você pode se expressar com segurança. Trabalho com ansiedade e crises de pânico há mais de 10 anos." },
    { nome: "Lucas Almeida", tratamento: "Psicólogo", crp: "06/18872", verificado: true, abordagens: ["Abordagem Centrada na Pessoa"], temas: ["Carreira", "Burnout", "Estresse", "Síndrome do impostor", "Orientação profissional"], publico: ["Adultos"], idiomas: ["Português", "Espanhol"], acessibilidade: ["Sessão por texto (chat)"], valor: 110, duracao: 50, resumo: "Ajudo profissionais a lidar com esgotamento, mudanças de carreira e a cobrança por resultados." },
    { nome: "Beatriz Sales", tratamento: "Psicóloga", crp: "05/44120", verificado: false, abordagens: ["Fenomenológico-Existencial"], temas: ["Luto", "Depressão", "Crise existencial", "Solidão"], publico: ["Adultos", "Idosos"], idiomas: ["Português"], acessibilidade: ["Atendimento em Libras"], valor: 130, duracao: 50, resumo: "Acolhimento para quem atravessa perdas, despedidas e momentos de transição na vida." },
    { nome: "Tiago Moreira", tratamento: "Psicólogo", crp: "08/20931", verificado: true, abordagens: ["Psicanálise"], temas: ["Terapia de casal", "Relacionamentos", "Ciúmes", "Conflitos familiares", "Divórcio e separação", "Sexualidade"], publico: ["Adultos", "Casais", "Famílias"], idiomas: ["Português"], acessibilidade: [], valor: 150, duracao: 50, resumo: "Atendo casais e famílias que querem se comunicar melhor e atravessar crises juntos." },
    { nome: "Aline Duarte", tratamento: "Psicóloga", crp: "11/15560", verificado: true, abordagens: ["TCC"], temas: ["TDAH", "Autismo (TEA)", "Dificuldades de aprendizagem", "Adolescência", "Ansiedade"], publico: ["Crianças", "Adolescentes"], idiomas: ["Português"], acessibilidade: ["Experiência com pessoas com deficiência"], valor: 115, duracao: 50, resumo: "Atendimento infantojuvenil com orientação aos pais, para crianças e adolescentes neurodivergentes." },
    { nome: "Sam Oliveira", tratamento: "Psicólogue", crp: "04/33018", verificado: false, abordagens: ["Gestalt-terapia"], temas: ["LGBTQIA+", "Identidade de gênero", "Autoestima", "Ansiedade", "Morar fora do Brasil"], publico: ["Adolescentes", "Adultos"], idiomas: ["Português", "Inglês", "Francês"], acessibilidade: ["Sessão por texto (chat)"], valor: 100, duracao: 50, resumo: "Um espaço seguro e afirmativo para falar de identidade, relações e recomeços, aqui ou no exterior." }
  ];

  const SELO = '<svg class="pc-selo" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 1.5l2.6 1.9 3.2-.1 1 3 2.6 1.9-1 3 1 3-2.6 1.9-1 3-3.2-.1L12 22.5l-2.6-1.9-3.2.1-1-3L2.6 15.8l1-3-1-3 2.6-1.9 1-3 3.2.1z"/><path d="M7.5 12.3l3 3 6-6.3" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ICO = {
    pessoas: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c.6-3.4 3-5.5 6-5.5s5.4 2.1 6 5.5"/><path d="M16 4.8a3 3 0 0 1 0 6M18 14.6c1.6.7 2.7 2.4 3 5.4"/></svg>',
    idioma: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg>',
    acess: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="4.5" r="1.8"/><path d="M5 8.5l7 1.5 7-1.5M12 10v4.5M12 14.5L8.5 21M12 14.5l3.5 6.5"/></svg>',
    relogio: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    zap: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-11.9 7L4 20l1.5-4A8 8 0 1 1 20 11.5z"/></svg>'
  };

  const generoDe = (x) => x.genero || (x.tratamento === "Psicólogo" ? "Homem" : x.tratamento === "Psicóloga" ? "Mulher" : x.tratamento ? "Não binário" : "");
  const lista_ = (v) => (Array.isArray(v) ? v : String(v || "").split(",")).map((s) => String(s).trim()).filter(Boolean);
  const slugDe = (t) => norm(String(t)).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  /* Caminhos do painel começam com "/": aqui viram relativos (funciona no GitHub Pages e na Hostinger). */
  const caminho = (u) => (/^(https?:)?\/\//.test(u) || /^data:/.test(u) || String(u).startsWith(BASE) ? u : BASE + String(u).replace(/^\/+/, ""));
  const perfilUrl = (slug) => BASE + "psicologos/perfil/?p=" + encodeURIComponent(slug);

  function preparar(arr) {
    const usados = {};
    return arr.filter((x) => x && x.nome && x.ativo !== false).map((x, i) => {
      let slug = slugDe(x.slug || x.nome) || "perfil-" + (i + 1);
      if (usados[slug]) slug += "-" + (++usados[slug]); else usados[slug] = 1;
      return {
        ...x,
        temas: lista_(x.temas && x.temas.length ? x.temas : x.especialidades),
        abordagens: lista_(x.abordagens),
        publico: lista_(x.publico),
        idiomas: lista_(x.idiomas).length ? lista_(x.idiomas) : ["Português"],
        acessibilidade: lista_(x.acessibilidade),
        formacao: lista_(x.formacao),
        genero: generoDe(x),
        slug,
        foto: x.foto ? caminho(x.foto) : "",
        url: x.url ? caminho(x.url) : perfilUrl(slug),
        _cor: CORES[i % CORES.length]
      };
    });
  }

  /* Carrega os dados reais (ou a demonstração). Devolve { lista, demo }. */
  /* Ordem de busca: 1) Painel online (js/nuvem.js)  2) data/psicologos.json  3) perfis de demonstração. */
  function carregar() {
    const daNuvem = typeof NUVEM !== "undefined"
      ? NUVEM.lista("psicologos")
        .then((l) => Promise.all(l.filter((x) => x && x.nome && x.ativo !== false)
          .map(async (x) => ({ ...x, foto: await NUVEM.resolverTexto(x.foto || "") }))))
        .catch(() => [])
      : Promise.resolve([]);
    return daNuvem
      .then((l) => l.length ? l : fetch(BASE + "data/psicologos.json", { cache: "no-cache" })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []))
      .then((d) => (Array.isArray(d) && d.some((x) => x && x.ativo !== false)
        ? { lista: preparar(d), demo: false }
        : { lista: preparar(DEMO), demo: true }));
  }

  /* Link de WhatsApp para agendar com o psicólogo.
     Usa o número central do site (js/config.js), a menos que o psicólogo tenha número próprio. */
  function whatsapp(x, mensagem) {
    const fone = String(x.whatsapp || WHATS).replace(/\D/g, "");
    return {
      href: `https://api.whatsapp.com/send?phone=${fone}&text=${encodeURIComponent(mensagem || `Olá! Quero agendar uma consulta com ${x.nome}.`)}`,
      proprio: !!x.whatsapp
    };
  }

  const iniciais = (n) => n.split(/\s+/).filter((w) => w.length > 2 || /^[A-Z]/.test(w)).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const juntar = (a) => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " e " + a[a.length - 1];

  return { carregar, whatsapp, iniciais, juntar, SELO, ICO };
})();
