/* =====================================================================
   CAMADA DE DADOS — Psicólogos Brasil / Agenda
   ---------------------------------------------------------------------
   Todas as telas (painel admin, painel do psicólogo e agenda do site)
   falam SÓ com o objeto DB abaixo. Nenhuma tela lê o localStorage direto.

   Hoje: modo 'local' → dados no navegador (localStorage), para testes.
   Depois: trocar AGENDA_CONFIG.banco para 'supabase' ou 'firebase' e
   implementar as mesmas funções no adaptador correspondente
   (ver o fim deste arquivo e o LEIA-ME.md).

   Todas as funções são "async" (devolvem Promise) de propósito: um banco
   de verdade responde pela internet, então as telas já esperam por isso.
   ===================================================================== */
(function () {
  const C = window.AGENDA_CONFIG;
  const CHAVE = 'pb_agenda_dados_v1';
  /* Status que ocupam o horário (ninguém mais pode marcar por cima) */
  const OCUPA = ['pendente', 'confirmado', 'realizado', 'falta'];
  /* v267: conversas de 15 min — horários próprios do psicólogo (aba "Conversas 15 min") */
  const minutos = h => Number(String(h).slice(0, 2)) * 60 + Number(String(h).slice(3, 5));
  const cruza = (ini, dur, ocup) => ocup.some(([i, f]) => ini < f && ini + dur > i);
  const mesmaPessoa = (a, b) => {
    const wa = U.whatsNumero(a && a.whatsapp), wb = U.whatsNumero(b && b.whatsapp);
    const ea = String((a && a.email) || '').trim().toLowerCase(), eb = String((b && b.email) || '').trim().toLowerCase();
    return !!((wa && wa === wb) || (ea && ea === eb));
  };
  const CONVERSA_CONTA = ['confirmado', 'realizado', 'falta'];   /* o que conta no limite de conversas por paciente */
  /* intervalos ocupados (em minutos) de um psicólogo num dia: sessões e conversas */
  function ocupacoesDia(ags, psiId, data, ignorarIds = []) {
    const t = agora();
    return ags.filter(a => a.psiId === psiId && a.data === data && OCUPA.includes(a.status) && !ignorarIds.includes(a.id)
        && !(a.status === 'pendente' && a.expiraEm && a.expiraEm < t))
      .map(a => [minutos(a.hora), minutos(a.hora) + (a.duracao || C.duracaoSessao)]);
  }
  /* horários de conversa livres: os que o psicólogo abriu, sem sessão ou conversa por cima e ainda no futuro */
  function calcLivres15(conv, ags, psiId, fuso) {
    if (!conv || !conv.ativo) return [];
    const dur = C.duracaoConhecer || 15, limite = agora() + 30 * 60e3, hoje = U.hojeISO(fuso || U.FUSO_BR), fim = U.addDias(hoje, C.diasVisiveis);
    const l = [];
    Object.keys(conv.datas || {}).filter(d => d >= hoje && d <= fim).sort().forEach(data => {
      const ocup = ocupacoesDia(ags, psiId, data);
      (conv.datas[data] || []).slice().sort().forEach(h => {
        if (U.dataHora(data, h, fuso).getTime() > limite && !cruza(minutos(h), dur, ocup)) l.push({ data, hora: h });
      });
    });
    return l;
  }
  /* limite de conversas por paciente e "já conversou com este psicólogo" */
  function conferirLimite(conversas, paciente, psiId) {
    const minhas = conversas.filter(a => a.tipo === 'conhecer' && CONVERSA_CONTA.includes(a.status) && mesmaPessoa(a.paciente, paciente));
    const lim = C.limiteConversas || 10;
    if (minhas.length >= lim) throw new Error(`Esta pessoa já usou as ${lim} conversas de 15 min.`);
    if (minhas.some(a => a.psiId === psiId)) throw new Error('Esta pessoa já fez (ou tem marcada) uma conversa com este psicólogo. Escolha outro.');
  }
  /* v266: "Conheça o psicólogo em 15 minutos" — situações do pedido e o resumo que vai para o psicólogo */
  /* nome com a primeira letra maiúscula ("joao da silva" → "Joao da Silva") */
  const nomeProprio = n => String(n || '').trim().replace(/\s+/g, ' ').split(' ').map((w, i) => { const l = w.toLocaleLowerCase('pt-BR'); return i > 0 && ['de', 'da', 'do', 'das', 'dos', 'e'].includes(l) ? l : l.charAt(0).toLocaleUpperCase('pt-BR') + l.slice(1); }).join(' ');
  const MOTIVOS_NAO = { nao_respondeu: 'Não respondeu', caro: 'Achou caro', horario: 'Não tinha horário bom', outro_lugar: 'Escolheu outro lugar', outro: 'Outro motivo' };
  const CONHECER_STATUS = { novo: 'Pedido novo', contato: 'Em contato pelo WhatsApp', marcada: 'Conversa marcada', paciente: 'Virou paciente', nao: 'Não seguiu' };
  const resumoConhecer = p => ({ tipoSessao: p.tipoSessao || '', motivos: p.motivos || [], objetivos: p.objetivos || [], preferencias: p.preferencias || [], horario: p.horario || '', sobre: p.sobre || '' });
  /* Status que entram no repasse (falta sem aviso conta como realizada) */
  const FATURA = ['realizado', 'falta'];

  const agora = () => Date.now();
  const clone = o => JSON.parse(JSON.stringify(o));

  /* ------------------------------------------------------------------
     DADOS DE EXEMPLO (só no modo local, na primeira vez que abre)
     ------------------------------------------------------------------ */
  function semente() {
    const hoje = U.hojeISO();
    const manha = ['08:00', '09:00', '10:00', '11:00'];
    const tarde = ['14:00', '15:00', '16:00', '17:00'];
    const noite = ['18:00', '19:00', '20:00'];

    /* Os mesmos psicólogos de demonstração do site (id = final do endereço do perfil,
       ex.: psicologos/perfil/?p=helena-prado). */
    const psicologos = [
      { id: 'helena-prado',  nome: 'Helena Prado',  crp: '11/10234', abordagem: 'TCC',                          email: 'helena@teste.com',  whatsapp: '5588900000001', usuario: 'helena',  senha: 'helena123',  doisFatores: true,  ativo: true, comissao: 30, valor: 120 },
      { id: 'lucas-almeida', nome: 'Lucas Almeida', crp: '06/18872', abordagem: 'Abordagem Centrada na Pessoa', email: 'lucas@teste.com',   whatsapp: '5588900000002', usuario: 'lucas',   senha: 'lucas123',   doisFatores: true, ativo: true, comissao: 30, valor: 110 },
      { id: 'beatriz-sales', nome: 'Beatriz Sales', crp: '05/44120', abordagem: 'Fenomenológico-Existencial',   email: 'beatriz@teste.com', whatsapp: '5588900000003', usuario: 'beatriz', senha: 'beatriz123', doisFatores: true, ativo: true, comissao: 30, valor: 130 },
      { id: 'tiago-moreira', nome: 'Tiago Moreira', crp: '08/20931', abordagem: 'Psicanálise',                  email: 'tiago@teste.com',   whatsapp: '5588900000004', usuario: 'tiago',   senha: 'tiago123',   doisFatores: true, ativo: true, comissao: 30, valor: 150 },
      { id: 'aline-duarte',  nome: 'Aline Duarte',  crp: '11/15560', abordagem: 'TCC',                          email: 'aline@teste.com',   whatsapp: '5588900000005', usuario: 'aline',   senha: 'aline123',   doisFatores: true, ativo: true, comissao: 25, valor: 115 },
      { id: 'sam-oliveira',  nome: 'Sam Oliveira',  crp: '04/33018', abordagem: 'Gestalt-terapia',              email: 'sam@teste.com',     whatsapp: '5588900000006', usuario: 'sam',     senha: 'sam123',     doisFatores: true, ativo: true, comissao: 25, valor: 100 }
    ];

    /* horários de exemplo: preenche os próximos 45 dias seguindo um padrão por dia da semana */
    const padroes = {
      'helena-prado':  { 1: manha, 2: tarde, 3: manha, 4: tarde, 5: manha },
      'lucas-almeida': { 1: noite, 2: noite, 3: noite, 4: noite, 6: manha },
      'beatriz-sales': { 2: [...manha, ...tarde], 4: [...manha, ...tarde] },
      'tiago-moreira': { 1: tarde, 3: tarde, 5: [...tarde, ...noite] },
      'aline-duarte':  { 1: manha, 2: manha, 3: manha, 4: manha },
      'sam-oliveira':  { 2: noite, 3: noite, 4: noite, 6: [...manha] }
    };
    const disponibilidade = {};
    Object.entries(padroes).forEach(([psiId, pad]) => {
      const datas = {};
      for (let i = 0; i < 45; i++) {
        const dt = U.addDias(hoje, i);
        const horas = pad[U.diaSemana(dt)];
        if (horas) datas[dt] = [...horas];
      }
      disponibilidade[psiId] = { datas, bloqueios: [] };
    });

    /* próximo dia (a partir de "hoje + inicio") em que o psicólogo atende */
    const proxDia = (psiId, inicio) => {
      for (let i = inicio; i < inicio + 14; i++) {
        const d = U.addDias(hoje, i);
        if ((disponibilidade[psiId].datas[d] || []).length) return d;
      }
      return U.addDias(hoje, inicio);
    };

    const t = agora();
    const novo = (campos) => Object.assign({
      id: U.id('ag'), codigo: U.codigo(), grupo: U.id('g'), sessao: 1, totalSessoes: 1,
      duracao: C.duracaoSessao, tipo: 'avulsa', valor: 120,
      criadoEm: t, expiraEm: null, confirmadoEm: null, linkMeet: '', psiCiente: false, historico: []
    }, campos);

    const agendamentos = [
      novo({
        psiId: 'helena-prado', data: proxDia('helena-prado', 1), hora: '09:00', status: 'pendente',
        expiraEm: U.somarHorasEquipe(t, U.equipe().prazoHoras),
        paciente: { nome: 'Mariana Souza', email: 'mariana@exemplo.com', whatsapp: '85988887777' },
        historico: [{ em: t, texto: 'Pré-reserva feita pelo site' }]
      }),
      novo({
        psiId: 'helena-prado', data: proxDia('helena-prado', 1), hora: '10:00', status: 'confirmado',
        confirmadoEm: t, linkMeet: 'https://meet.google.com/abc-defg-hij',
        paciente: { nome: 'João Pedro Lima', email: 'joao@exemplo.com', whatsapp: '85977776666' },
        historico: [{ em: t, texto: 'Pré-reserva feita pelo site' }, { em: t, texto: 'Pagamento confirmado por Administrador' }]
      }),
      novo({
        psiId: 'lucas-almeida', data: U.addDias(hoje, -3), hora: '19:00', status: 'realizado',
        confirmadoEm: t, linkMeet: 'https://meet.google.com/xyz-abcd-efg', psiCiente: true,
        paciente: { nome: 'Fernanda Alves', email: 'fernanda@exemplo.com', whatsapp: '85966665555' },
        historico: [{ em: t, texto: 'Sessão marcada como realizada' }]
      })
    ];

    return {
      versao: 4,
      usuarios: [
        { id: 'u-admin',   usuario: 'admin',   senha: 'admin123',   papel: 'admin',   nome: 'Administrador',     email: 'admin@teste.com', doisFatores: false },
        { id: 'u-suporte', usuario: 'suporte', senha: 'suporte123', papel: 'suporte', nome: 'Equipe de suporte', email: 'suporte@teste.com', doisFatores: false }
      ],
      psicologos, disponibilidade, agendamentos,
      caixaSaida: [],
      codigos2fa: {}
    };
  }

  /* ------------------------------------------------------------------
     LEITURA / GRAVAÇÃO (modo local)
     ------------------------------------------------------------------ */
  function carregar() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(CHAVE)); } catch (e) { d = null; }
    if (!d || d.versao !== 4) { d = semente(); salvar(d); }  // versão 4 = contas de teste com e-mail @teste.com (mudar o número zera os dados de teste de todo mundo)
    if (expirarPendentes(d)) salvar(d);
    return d;
  }
  function salvar(d) { localStorage.setItem(CHAVE, JSON.stringify(d)); }

  function expirarPendentes(d) {
    let mudou = false;
    const t = agora();
    d.agendamentos.forEach(a => {
      if (a.status === 'pendente' && a.expiraEm && a.expiraEm < t) {
        a.status = 'expirado';
        a.historico.push({ em: t, texto: 'Pré-reserva expirou sem confirmação de pagamento' });
        mudou = true;
      }
    });
    return mudou;
  }

  function livresNoDia(d, psiId, data, ignorarIds = []) {
    const psi = d.psicologos.find(p => p.id === psiId);
    const disp = d.disponibilidade[psiId];
    if (!psi || !psi.ativo || !disp) return [];
    if (disp.bloqueios.some(b => b.data === data && !b.hora)) return [];
    const bloqueadas = new Set(disp.bloqueios.filter(b => b.data === data && b.hora).map(b => b.hora));
    const ocupadas = new Set(d.agendamentos
      .filter(a => a.psiId === psiId && a.data === data && OCUPA.includes(a.status) && !ignorarIds.includes(a.id))
      .map(a => a.hora));
    const limite = U.somarHorasEquipe(agora(), U.equipe().antecedenciaHoras);   /* antecedência mínima, no horário da equipe */
    const conversasDia = d.agendamentos.filter(a => a.psiId === psiId && a.data === data && a.tipo === 'conhecer' && OCUPA.includes(a.status) && !ignorarIds.includes(a.id))
      .map(a => [minutos(a.hora), minutos(a.hora) + (a.duracao || 15)]);
    return ((disp.datas || {})[data] || [])
      .filter(h => !bloqueadas.has(h) && !ocupadas.has(h) && U.dataHora(data, h, psi.fuso).getTime() > limite   /* horário no fuso do psicólogo */
        && !cruza(minutos(h), C.duracaoSessao, conversasDia))   /* v267: conversa de 15 min no meio da sessão */
      .sort();
  }

  function livresSemanas(d, psiId, data, semanas, ignorarIds) {
    let lista = livresNoDia(d, psiId, data, ignorarIds);
    for (let k = 1; k < semanas && lista.length; k++) {
      const outras = new Set(livresNoDia(d, psiId, U.addDias(data, 7 * k), ignorarIds));
      lista = lista.filter(h => outras.has(h));
    }
    return lista;
  }

  function hist(a, texto) { a.historico.push({ em: agora(), texto }); }

  /* ------------------------------------------------------------------
     REGISTRO DE ATIVIDADES — PRÉVIA (modo teste)
     Na versão final quem grava é o servidor (PHP), com o usuário da sessão,
     o IP e o aparelho, e ninguém consegue apagar. Aqui fica num localStorage
     separado só para ver como a tela "Atividades" funciona.
     ------------------------------------------------------------------ */
  const CHAVE_ATIV = 'pb_atividades_v1';
  const sessaoAtual = () => { try { return JSON.parse(sessionStorage.getItem('pb_painel_sessao') || 'null'); } catch (e) { return null; } };
  function registrar(r) {
    try {
      const q = r.quem || sessaoAtual() || {};
      const l = JSON.parse(localStorage.getItem(CHAVE_ATIV) || '[]');
      l.push({ id: U.id('at'), em: agora(), quemId: q.id || '', quemNome: q.nome || 'Sistema', quemPapel: q.papel || '', tipo: r.tipo || 'outro', acao: r.acao || '', alvo: r.alvo || '', antes: r.antes || null, depois: r.depois || null, aparelho: navigator.userAgent.replace(/^.*?\(([^)]*)\).*$/, '$1').slice(0, 60) });
      localStorage.setItem(CHAVE_ATIV, JSON.stringify(l.slice(-3000)));
    } catch (e) { /* o registro nunca atrapalha a ação */ }
  }
  const principalDe = d => (d.usuarios.find(u => u.papel === 'admin' && u.principal) || d.usuarios.find(u => u.papel === 'admin') || {}).id;
  const NOMES_EXTRAS = { psicologos: 'Psicólogos (completo)', pacientes: 'Pacientes', artigos: 'Artigos', financeiro: 'Financeiro' };
  const EXTRAS_ANTIGOS = { psiResumo: 'psicologos', financeiroPagar: 'financeiro' };
  const normExtras = l => [...new Set((Array.isArray(l) ? l : []).map(k => EXTRAS_ANTIGOS[k] || k).filter(k => NOMES_EXTRAS[k]))];
  const textoExtras = l => (l && l.length ? l.map(k => NOMES_EXTRAS[k] || k).join(', ') : 'nenhum');
  /* tipo da atividade a partir do texto do histórico do agendamento */
  function tipoHist(t) {
    return /Pagamento confirmado/i.test(t) ? 'pagamento' : /^Cancelado/i.test(t) ? 'cancelamento' : /^Remarcado/i.test(t) ? 'remarcacao'
      : /Lembrete|Renovação/i.test(t) ? 'lembrete' : /Repasse/i.test(t) ? 'repasse' : /excluídos/i.test(t) ? 'paciente' : 'status';
  }

  /* ------------------------------------------------------------------
     ADAPTADOR LOCAL — implementa todas as funções do DB
     ------------------------------------------------------------------ */
  const Local = {
    /* ---------- login ---------- */
    async autenticar(usuario, senha) {
      const d = carregar();
      const u = String(usuario || '').trim().toLowerCase();
      /* entra com o e-mail (ou o usuário antigo) */
      const bate = x => (String(x.usuario || '').toLowerCase() === u || String(x.email || '').toLowerCase() === u) && x.senha === senha;
      const adm = d.usuarios.find(bate);
      if (adm && adm.ativo === false) throw new Error('Seu acesso está desativado. Fale com o administrador.');
      if (adm) { registrar({ quem: adm, tipo: 'acesso', acao: 'Entrou no painel (e-mail e senha certos)' }); return { id: adm.id, papel: adm.papel, nome: adm.nome, email: adm.email, doisFatores: true, ...(adm.papel === 'suporte' ? { extras: normExtras(adm.extras) } : {}) }; }
      const psi = d.psicologos.find(bate);
      if (psi) {
        if (!psi.ativo) throw new Error('Seu acesso está desativado. Fale com a equipe.');
        return { id: psi.id, papel: 'psicologo', nome: psi.nome, email: psi.email, doisFatores: true };
      }
      const conhecido = d.usuarios.find(x => String(x.email || '').toLowerCase() === u || String(x.usuario || '').toLowerCase() === u);
      if (conhecido) registrar({ quem: conhecido, tipo: 'acesso', acao: 'Tentou entrar com a senha errada' });
      return null;
    },
    async gerarCodigo2FA(usuarioId) {
      const d = carregar();
      const codigo = String(Math.floor(100000 + Math.random() * 900000));
      d.codigos2fa[usuarioId] = { codigo, expira: agora() + 5 * 60e3 };
      salvar(d);
      return codigo;
    },
    async validarCodigo2FA(usuarioId, codigo) {
      const d = carregar();
      const c = d.codigos2fa[usuarioId];
      const ok = !!c && c.expira > agora() && c.codigo === String(codigo).trim();
      if (ok) { delete d.codigos2fa[usuarioId]; salvar(d); }
      return ok;
    },

    /* ---------- psicólogos ---------- */
    async listarPsicologos({ todos = false } = {}) {
      const d = carregar();
      return clone(d.psicologos.filter(p => todos || p.ativo).sort((a, b) => a.nome.localeCompare(b.nome)));
    },
    async obterPsicologo(id) {
      const p = carregar().psicologos.find(x => x.id === id);
      return p ? clone(p) : null;
    },
    async salvarPsicologo(dados) {
      const d = carregar();
      const usuario = String(dados.usuario || '').trim().toLowerCase();
      if (!dados.nome || !usuario) throw new Error('Preencha pelo menos nome e usuário.');
      const repetido = [...d.psicologos, ...d.usuarios].find(x => x.usuario.toLowerCase() === usuario && x.id !== dados.id);
      if (repetido) throw new Error('Esse usuário já existe. Escolha outro.');
      let p = d.psicologos.find(x => x.id === dados.id);
      if (!p) {
        if (!dados.senha) throw new Error('Defina uma senha inicial.');
        /* o id pode vir do painel de Psicólogos (= final do endereço do perfil) */
        const idNovo = dados.id && !d.psicologos.some(x => x.id === dados.id) ? String(dados.id) : U.id('psi');
        p = { id: idNovo, ativo: true, doisFatores: true, comissao: C.comissaoPadrao, valor: C.valorPadrao };
        d.psicologos.push(p);
        d.disponibilidade[p.id] = { datas: {}, bloqueios: [] };
      }
      const senha = dados.senha || p.senha;
      if (dados.whatsapp !== undefined) dados = { ...dados, whatsapp: U.whatsNormalizar(dados.whatsapp) };   /* "+55…", "+351…" */
      Object.assign(p, dados, { id: p.id, usuario, senha, comissao: Number(dados.comissao ?? p.comissao),
        valor: Number(dados.valor ?? p.valor ?? C.valorPadrao), valorMensal: Number(dados.valorMensal ?? p.valorMensal ?? 0) || null });
      salvar(d);
      return clone(p);
    },
    /* Excluir o psicólogo de vez (Perfis → Excluir): some de Psicólogos e o login deixa de existir.
       Os agendamentos antigos ficam no histórico. */
    async excluirPsicologo(psiId) {
      const d = carregar();
      d.psicologos = d.psicologos.filter(x => x.id !== psiId);
      delete d.disponibilidade[psiId];
      salvar(d);
    },
    /* Dados de contato (tela Conta). dados: { nome?, crp?, email?, whatsapp?, usuario? } */
    async atualizarContato(psiId, dados) {
      const d = carregar();
      const p = d.psicologos.find(x => x.id === psiId);
      if (!p) throw new Error('Psicólogo não encontrado.');
      /* o próprio psicólogo muda só o WhatsApp de contato e a chave Pix; o resto é com a equipe */
      const sess = JSON.parse(sessionStorage.getItem('pb_painel_sessao') || 'null');
      if (sess && sess.papel === 'psicologo') {
        if (sess.id !== psiId) throw new Error('Sem permissão.');
        throw new Error('Seus dados são atualizados pela equipe. Fale com o suporte.');   /* o psicólogo só troca a senha */
      }
      /* chave Pix: ninguém muda direto; só com o código no e-mail de quem troca (pedirCodigoPix / confirmarCodigoPix) */
      dados = { ...dados }; delete dados.pix; delete dados.pixTipo;
      if (dados.whatsapp && !U.whatsValido(U.whatsNormalizar(dados.whatsapp))) throw new Error('WhatsApp inválido: confira o país e o número.');
      if (dados.usuario !== undefined) {
        const u = String(dados.usuario || '').trim().toLowerCase();
        if (!/^[a-z0-9._-]{3,}$/.test(u)) throw new Error('Usuário: pelo menos 3 letras ou números, sem espaço.');
        if ([...d.psicologos, ...d.usuarios].some(x => String(x.usuario).toLowerCase() === u && x.id !== psiId)) throw new Error('Esse usuário já existe. Escolha outro.');
        p.usuario = u;
      }
      ['nome', 'crp', 'opp', 'email', 'whatsapp', 'pix'].forEach(k => { if (dados[k] !== undefined) p[k] = k === 'whatsapp' ? U.whatsNormalizar(dados[k]) : String(dados[k]).trim(); });
      if (dados.pixTipo !== undefined) p.pixTipo = String(dados.pixTipo || '');
      const antesP = { ...p };
      if (dados.fuso !== undefined) { if (!U.fusoValido(dados.fuso)) throw new Error('Fuso horário inválido.'); p.fuso = dados.fuso; }
      salvar(d);
      const ROT = { nome: 'Nome', crp: 'CRP', opp: 'OPP', email: 'E-mail', whatsapp: 'WhatsApp', pix: 'Chave Pix', fuso: 'Fuso' };
      const mud = Object.keys(ROT).filter(k => dados[k] !== undefined && String(antesP[k] || '') !== String(p[k] || ''));
      if (mud.length) registrar({ tipo: 'psicologo', acao: `Mudou ${mud.map(k => ROT[k]).join(', ')} do psicólogo`, alvo: p.nome,
        antes: Object.fromEntries(mud.map(k => [ROT[k], antesP[k] || '—'])), depois: Object.fromEntries(mud.map(k => [ROT[k], p[k] || '—'])) });
      return { psi: clone(p) };
    },
    /* Troca da chave Pix pelo próprio psicólogo: código de 6 números no e-mail dele.
       1) pedirCodigoPix guarda a chave nova (ainda sem valer) e gera o código (vale 10 min);
       2) confirmarCodigoPix confere o código e só então troca a chave. */
    async pedirCodigoPix(psiId, { pix, pixTipo }) {
      const d = carregar();
      const p = d.psicologos.find(x => x.id === psiId);
      if (!p) throw new Error('Psicólogo não encontrado.');
      /* só a equipe troca a chave Pix: administrador ou suporte com "Psicólogos (completo)".
         O código vai para o e-mail de QUEM está trocando (não do psicólogo). */
      const sess = JSON.parse(sessionStorage.getItem('pb_painel_sessao') || 'null');
      const extras = (sess && Array.isArray(sess.extras) ? sess.extras : []).map(k => (k === 'psiResumo' ? 'psicologos' : k));
      if (!sess || !(sess.papel === 'admin' || (sess.papel === 'suporte' && extras.includes('psicologos')))) throw new Error('Sem permissão para trocar a chave Pix.');
      const quem = (d.usuarios || []).find(u => u.id === sess.id || u.uid === sess.id) || {};
      const emailQuem = quem.email || sess.email || '';
      if (!emailQuem) throw new Error('Seu usuário não tem e-mail cadastrado. Cadastre em Minha conta.');
      const n = U.pixNormalizar(pixTipo, pix);
      if (!n.ok || !n.valor) throw new Error(n.erro || 'Chave Pix inválida.');
      const codigo = String(Math.floor(100000 + Math.random() * 900000));
      d.codigos2fa['pix:' + psiId] = { codigo, expira: agora() + 10 * 60e3, pix: n.valor, pixTipo, tentativas: 0, por: sess.nome || '' };
      salvar(d);
      return { codigo, email: emailQuem };
    },
    async confirmarCodigoPix(psiId, codigo) {
      const d = carregar();
      const p = d.psicologos.find(x => x.id === psiId);
      const c = d.codigos2fa['pix:' + psiId];
      if (!p || !c) throw new Error('Peça um código novo.');
      if (c.expira < agora()) { delete d.codigos2fa['pix:' + psiId]; salvar(d); throw new Error('O código venceu. Peça outro.'); }
      if (c.codigo !== String(codigo || '').trim()) {
        c.tentativas = (c.tentativas || 0) + 1;
        if (c.tentativas >= 5) { delete d.codigos2fa['pix:' + psiId]; salvar(d); throw new Error('Código errado muitas vezes. Peça outro código.'); }
        salvar(d); throw new Error('Código incorreto. Confira no e-mail.');
      }
      p.pix = c.pix; p.pixTipo = c.pixTipo; p.pixAlteradoEm = agora(); p.pixAlteradoPor = c.por || '';
      delete d.codigos2fa['pix:' + psiId];
      salvar(d);
      return { pix: p.pix, pixTipo: p.pixTipo, email: p.email };
    },
    /* "Esqueci a senha" (modo de teste): código no e-mail + senha nova */
    async pedirCodigoSenha(email) {
      const d = carregar(), e = String(email || '').trim().toLowerCase();
      const u = [...d.usuarios, ...d.psicologos].find(x => String(x.email || '').toLowerCase() === e && x.ativo !== false);
      if (!u) return null;   /* não conta se o e-mail existe */
      const codigo = String(Math.floor(100000 + Math.random() * 900000));
      d.codigos2fa['senha:' + e] = { codigo, expira: agora() + 10 * 60e3, tentativas: 0 };
      salvar(d);
      return { codigo, email: u.email };
    },
    async redefinirSenhaComCodigo(email, codigo, nova) {
      const d = carregar(), e = String(email || '').trim().toLowerCase(), c = d.codigos2fa['senha:' + e];
      if (!c || c.expira < agora()) throw new Error('O código venceu ou não foi pedido. Peça outro.');
      if (c.codigo !== String(codigo || '').trim()) {
        c.tentativas = (c.tentativas || 0) + 1;
        if (c.tentativas >= 5) delete d.codigos2fa['senha:' + e];
        salvar(d); throw new Error('Código incorreto.');
      }
      if (!nova || nova.length < 8) throw new Error('A nova senha precisa ter pelo menos 8 caracteres.');
      const u = [...d.usuarios, ...d.psicologos].find(x => String(x.email || '').toLowerCase() === e);
      if (!u) throw new Error('Não encontrei esse acesso.');
      u.senha = nova; u.senhaPadrao = false;
      delete d.codigos2fa['senha:' + e];
      salvar(d);
    },
    /* Agenda online (true) ou offline (false): o próprio psicólogo ou a equipe.
       Offline: o perfil continua no site, mas sem horários para agendar (férias, pausa). */
    async definirAgendaOnline(psiId, online) {
      const d = carregar();
      const p = d.psicologos.find(x => x.id === psiId);
      if (!p) throw new Error('Psicólogo não encontrado.');
      p.pausada = !online; salvar(d);
      registrar({ tipo: 'psicologo', acao: online ? 'Ligou a agenda online' : 'Pausou a agenda online', alvo: p.nome });
      return clone(p);
    },
    /* A equipe define uma senha nova para o psicólogo (ex.: esqueceu a senha).
       Fica marcada como provisória: no próximo login o painel pede para ele criar a dele. */
    async definirSenhaPsicologo(psiId, senha) {
      const d = carregar();
      const p = d.psicologos.find(x => x.id === psiId);
      if (!p) throw new Error('Psicólogo não encontrado.');
      if (!senha || senha.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
      p.senha = senha; p.senhaPadrao = true; salvar(d);
    },
    /* o psicólogo ainda usa a senha padrão (nome + 123)? */
    async senhaPadraoAtiva(psiId) { const p = carregar().psicologos.find(x => x.id === psiId); return !!(p && p.senhaPadrao); },
    /* quem está logado está com senha provisória? (psicólogo ou equipe) */
    async minhaSenhaProvisoria() {
      const s = JSON.parse(sessionStorage.getItem('pb_painel_sessao') || 'null'); if (!s) return false;
      const d = carregar(), u = d.psicologos.find(x => x.id === s.id) || d.usuarios.find(x => x.id === s.id);
      return !!(u && u.senhaPadrao);
    },
    /* troca a senha provisória pela senha da pessoa (logo depois de entrar; não pede a provisória de novo) */
    async trocarSenhaProvisoria(nova) {
      const s = JSON.parse(sessionStorage.getItem('pb_painel_sessao') || 'null'); if (!s) throw new Error('Entre de novo.');
      const d = carregar(), u = d.psicologos.find(x => x.id === s.id) || d.usuarios.find(x => x.id === s.id);
      if (!u || !u.senhaPadrao) throw new Error('Sua senha já foi criada. Para trocar, use Minha conta.');
      if (!nova || nova.length < 8) throw new Error('A nova senha precisa ter pelo menos 8 caracteres.');
      if (nova === u.senha) throw new Error('Crie uma senha diferente da provisória.');
      u.senha = nova; u.senhaPadrao = false; salvar(d);
    },
    async alterarSenha(usuarioId, atual, nova) {
      const d = carregar();
      const u = d.psicologos.find(x => x.id === usuarioId) || d.usuarios.find(x => x.id === usuarioId);
      if (!u || u.senha !== atual) throw new Error('Senha atual incorreta.');
      if (!nova || nova.length < 6) throw new Error('A nova senha precisa ter pelo menos 6 caracteres.');
      u.senha = nova; u.senhaPadrao = false;
      salvar(d);
    },

    /* ---------- disponibilidade ---------- */
    async obterDisponibilidade(psiId) {
      return clone(carregar().disponibilidade[psiId] || { datas: {}, bloqueios: [] });
    },
    /* mudancas = { 'AAAA-MM-DD': ['08:00', '09:00'], ... }  (lista vazia = dia sem horários) */
    async salvarDatas(psiId, mudancas) {
      const d = carregar();
      const disp = d.disponibilidade[psiId] = d.disponibilidade[psiId] || { datas: {}, bloqueios: [] };
      disp.datas = disp.datas || {};
      Object.entries(mudancas).forEach(([data, horas]) => {
        const lista = [...new Set(horas)].sort();
        if (lista.length) disp.datas[data] = lista; else delete disp.datas[data];
      });
      /* limpa dias que já passaram */
      const hoje = U.hojeISO();
      Object.keys(disp.datas).forEach(k => { if (k < hoje) delete disp.datas[k]; });
      salvar(d);
    },
    async adicionarBloqueio(psiId, { data, hora = '', motivo = '' }) {
      const d = carregar();
      if (!data) throw new Error('Escolha a data.');
      const disp = d.disponibilidade[psiId] = d.disponibilidade[psiId] || { datas: {}, bloqueios: [] };
      if (disp.bloqueios.some(b => b.data === data && (b.hora === hora || !b.hora))) throw new Error('Esse período já está bloqueado.');
      disp.bloqueios.push({ id: U.id('bl'), data, hora, motivo });
      disp.bloqueios.sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
      salvar(d);
    },
    async removerBloqueio(psiId, bloqueioId) {
      const d = carregar();
      const disp = d.disponibilidade[psiId];
      if (disp) disp.bloqueios = disp.bloqueios.filter(b => b.id !== bloqueioId);
      salvar(d);
    },

    /* ---------- horários livres (o que o paciente vê no site) ---------- */
    async horariosLivres(psiId, data, { semanas = 1, ignorarIds = [] } = {}) {
      return livresSemanas(carregar(), psiId, data, semanas, ignorarIds);
    },
    async diasComHorario(psiId, { semanas = 1, ignorarIds = [], equipe = false } = {}) {
      const d = carregar();
      const ps = d.psicologos.find(p => p.id === psiId);
      if (ps && ps.pausada && !equipe) return [];   /* agenda online desligada no perfil: sem horários no site (a equipe ainda vê, para remarcar) */
      const hoje = U.hojeISO(ps && ps.fuso || U.FUSO_BR);   /* "hoje" no relógio do psicólogo */
      const dias = [];
      for (let i = 0; i < C.diasVisiveis; i++) {
        const data = U.addDias(hoje, i);
        const horas = livresSemanas(d, psiId, data, semanas, ignorarIds);
        if (horas.length) dias.push({ data, horas });
      }
      return dias;
    },

    /* ---------- agendamentos ---------- */
    async listarAgendamentos({ psiId, status, de, ate, grupo } = {}) {
      const d = carregar();
      return clone(d.agendamentos
        .filter(a => (!psiId || a.psiId === psiId)
          && (!status || status.includes(a.status))
          && (!de || a.data >= de)
          && (!ate || a.data <= ate)
          && (!grupo || a.grupo === grupo))
        .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora)));
    },
    async obterAgendamento(id) {
      const a = carregar().agendamentos.find(x => x.id === id);
      return a ? clone(a) : null;
    },

    /* Paciente escolheu horário no site.
       ATENÇÃO (banco de verdade): esta função precisa rodar NO SERVIDOR,
       numa única transação, com uma regra única (psi_id + data + hora para
       status que ocupam). Assim duas pessoas nunca pegam o mesmo horário. */
    /* v220: "Conheça o psicólogo em 15 minutos" — respostas do questionário do site (página /conhecer/).
       Fica em d.conhecer para a equipe ver no painel. */
    async enviarConhecer(p = {}) {
      const txt = (v, n) => String(v || '').trim().slice(0, n);
      const lista = (v, n) => (Array.isArray(v) ? v : []).map(x => txt(x, 60)).filter(Boolean).slice(0, n);
      const nome = txt(p.nome, 80), email = txt(p.email, 120).toLowerCase(), whatsapp = U.whatsNormalizar(p.whatsapp);
      if (nome.length < 3) throw new Error('Informe seu nome completo.');
      if (!U.whatsValido(whatsapp)) throw new Error('Confira o WhatsApp: número com DDD (Brasil) ou com o código do país.');
      if (!U.emailValido(email)) throw new Error('Informe um e-mail válido.');
      if (!p.consentimento) throw new Error('Marque a autorização para podermos falar com você.');
      const pedido = {
        id: U.id('cn'), criadoEm: agora(), status: 'novo',
        paciente: { nome: nomeProprio(nome), whatsapp, email },
        tipoSessao: txt(p.tipoSessao, 30), motivos: lista(p.motivos, 25), objetivos: lista(p.objetivos, 15),
        preferencias: lista(p.preferencias, 12), horario: txt(p.horario, 30), sobre: txt(p.sobre, 1500),
        origem: txt(p.origem, 120), consentimento: true
      };
      const d = carregar();
      d.conhecer = d.conhecer || [];
      d.conhecer.unshift(pedido);
      salvar(d);
      return clone(pedido);
    },
    async listarConhecer() { const d = carregar(); return clone(d.conhecer || []); },
    /* v266: aba "Conversas 15 min" do painel da equipe.
       Situação do pedido: novo → contato → marcada → paciente (virou paciente) | nao (não seguiu). */
    async atualizarConhecer(id, { status, motivo } = {}, por = '') {
      const d = carregar();
      const p = (d.conhecer || []).find(x => x.id === id);
      if (!p) throw new Error('Pedido não encontrado.');
      if (!CONHECER_STATUS[status]) throw new Error('Situação inválida.');
      const t = agora();
      if (status === 'contato' && !p.contato) p.contato = { em: t, por };
      p.status = status;
      /* v286: motivo de "não seguiu" (opcional); reabrir ou virar paciente apaga o motivo */
      p.motivoNao = status === 'nao' && MOTIVOS_NAO[motivo] ? motivo : null;
      p.historico = [...(p.historico || []), { em: t, texto: `${CONHECER_STATUS[status]}${p.motivoNao ? ': ' + MOTIVOS_NAO[p.motivoNao] : ''} (por ${por})` }];
      salvar(d);
      return clone(p);
    },
    /* v267: horários de conversa do psicólogo */
    async obterConversas15(psiId) { const c = (carregar().conversas15 || {})[psiId]; return clone(c || { ativo: false, datas: {} }); },
    async listarConversas15() { return clone(carregar().conversas15 || {}); },
    async salvarConversas15(psiId, { ativo, mudancas = {} } = {}) {
      const d = carregar();
      d.conversas15 = d.conversas15 || {};
      const c = d.conversas15[psiId] = d.conversas15[psiId] || { ativo: false, datas: {} };
      if (typeof ativo === 'boolean') c.ativo = ativo;
      Object.entries(mudancas).forEach(([data, hs]) => { const l = [...new Set(hs)].filter(h => /^\d{2}:\d{2}$/.test(h)).sort(); if (l.length) c.datas[data] = l; else delete c.datas[data]; });
      const hoje = U.hojeISO(); Object.keys(c.datas).forEach(k => { if (k < hoje) delete c.datas[k]; });   /* dias que já passaram saem */
      salvar(d);
      return clone(c);
    },
    async livres15(psiId) {
      const d = carregar();
      const psi = d.psicologos.find(p => p.id === psiId && p.ativo);
      if (!psi) return [];
      return calcLivres15((d.conversas15 || {})[psiId], d.agendamentos, psiId, psi.fuso);
    },
    async listarConversas({ psiId } = {}) { return clone(carregar().agendamentos.filter(a => a.tipo === 'conhecer' && (!psiId || a.psiId === psiId))); },
    /* marca a conversa de 15 min: vira um atendimento "conhecer" (sem valor) que ocupa o horário inteiro do psicólogo */
    async marcarConversa(id, { psiId, data, hora, linkMeet = '', por = '' }) {
      const d = carregar();
      const p = (d.conhecer || []).find(x => x.id === id);
      if (!p) throw new Error('Pedido não encontrado.');
      if (p.agId && d.agendamentos.some(a => a.id === p.agId && a.status === 'confirmado')) throw new Error('Esta pessoa já tem uma conversa marcada. Desmarque antes de marcar outra.');
      const psi = d.psicologos.find(x => x.id === psiId && x.ativo);
      if (!psi) throw new Error('Psicólogo não encontrado.');
      conferirLimite(d.agendamentos, p.paciente, psiId);
      if (!calcLivres15((d.conversas15 || {})[psiId], d.agendamentos, psiId, psi.fuso).some(x => x.data === data && x.hora === hora)) throw new Error('Esse horário de conversa acabou de ser ocupado. Escolha outro.');
      const t = agora();
      const a = {
        id: U.id('ag'), codigo: U.codigo(), grupo: U.id('g'), sessao: 1, totalSessoes: 1,
        psiId, data, hora, duracao: C.duracaoConhecer || 15, tipo: 'conhecer', valor: 0,
        paciente: { ...clone(p.paciente), nome: nomeProprio(p.paciente.nome) }, fuso: psi.fuso || U.FUSO_BR, fusoPaciente: psi.fuso || U.FUSO_BR,
        status: 'confirmado', criadoEm: t, expiraEm: null, confirmadoEm: t, linkMeet, psiCiente: false,
        conhecerId: p.id, resumo: resumoConhecer(p),
        historico: [{ em: t, texto: `Conversa de 15 min marcada por ${por}` }]
      };
      d.agendamentos.push(a);
      if (!p.contato) p.contato = { em: t, por };
      p.status = 'marcada'; p.agId = a.id; p.psiId = psiId;
      p.historico = [...(p.historico || []), { em: t, texto: `Conversa marcada com ${psi.nome}: ${U.fmtCurta(data)}, ${U.fmtHora(hora)} (por ${por})` }];
      salvar(d);
      return clone(a);
    },
    async desmarcarConversa(id, por = '') {
      const d = carregar();
      const p = (d.conhecer || []).find(x => x.id === id);
      if (!p) throw new Error('Pedido não encontrado.');
      const a = p.agId && d.agendamentos.find(x => x.id === p.agId);
      if (a && a.status === 'confirmado') { a.status = 'cancelado'; hist(a, `Conversa desmarcada por ${por}`); }
      p.status = 'contato'; p.agId = null; p.psiId = null;
      p.historico = [...(p.historico || []), { em: agora(), texto: `Conversa desmarcada (por ${por})` }];
      salvar(d);
      return clone(p);
    },
    async criarPreReserva({ psiId, data, hora, tipo = 'avulsa', paciente }) {
      const d = carregar();
      const nome = String(paciente?.nome || '').trim();
      const email = String(paciente?.email || '').trim();
      const whatsapp = U.whatsNormalizar(paciente?.whatsapp);   /* "+55…", "+351…" */
      if (nome.length < 3) throw new Error('Informe seu nome completo.');
      if (!U.emailValido(email)) throw new Error('Informe um e-mail válido.');
      if (!U.whatsValido(whatsapp)) throw new Error('Confira o WhatsApp: número com DDD (Brasil) ou com o código do país.');
      const psi = d.psicologos.find(p => p.id === psiId && p.ativo);
      if (!psi) throw new Error('Psicólogo não encontrado.');
      if (psi.pausada) throw new Error('Este profissional está sem horários livres no momento.');

      const semanas = tipo === 'mensal' ? C.sessoesMensal : 1;
      if (!livresSemanas(d, psiId, data, semanas, []).includes(hora)) {
        throw new Error('Esse horário acabou de ser reservado por outra pessoa. Escolha outro, por favor.');
      }

      const t = agora();
      const grupo = U.id('g');
      let codigo; do { codigo = U.codigo(); } while (d.agendamentos.some(a => a.codigo === codigo && a.status === 'pendente'));
      const valor = tipo === 'mensal' ? U.precoMensal(psi) / semanas : U.precoSessao(psi);
      const criados = [];
      for (let k = 0; k < semanas; k++) {
        const a = {
          id: U.id('ag'), codigo, grupo, sessao: k + 1, totalSessoes: semanas,
          psiId, data: U.addDias(data, 7 * k), hora, duracao: C.duracaoSessao,
          tipo, valor, paciente: { nome, email, whatsapp },
          fuso: psi.fuso || U.FUSO_BR, fusoPaciente: U.fusoValido(paciente?.fuso) ? paciente.fuso : (psi.fuso || U.FUSO_BR),
          aceite: { em: t, versao: C.termosVersao || '' },   /* marcou "Li e aceito os Termos de uso": quando e qual versão */   /* data/hora no fuso do psicólogo; o paciente vê no dele */
          status: 'pendente', criadoEm: t, expiraEm: U.somarHorasEquipe(t, U.equipe().prazoHoras),   /* prazo conta só no horário da equipe */
          confirmadoEm: null, linkMeet: '', psiCiente: false,
          historico: [{ em: t, texto: 'Pré-reserva feita pelo site' }]
        };
        d.agendamentos.push(a);
        criados.push(a);
      }
      salvar(d);
      return clone(criados);
    },

    /* Equipe confirmou o pagamento → confirma todas as sessões do grupo */
    async confirmarGrupo(grupo, { linkMeet, por }) {
      const d = carregar();
      const lista = d.agendamentos.filter(a => a.grupo === grupo && ['pendente', 'expirado'].includes(a.status));
      if (!lista.length) throw new Error('Nada para confirmar nesse agendamento.');
      /* v214: o suporte só confirma depois que o admin conferiu que o Pix caiu */
      const quem = sessaoAtual();
      if (quem && quem.papel !== 'admin' && !lista.every(a => a.conferencia && a.conferencia.status === 'caiu')) throw new Error('O pagamento só pode ser confirmado depois que o admin conferir que o Pix caiu na conta.');
      const ids = lista.map(a => a.id);
      for (const a of lista) {
        if (a.status === 'expirado') {
          /* pré-reserva expirada: só confirma se ninguém pegou o horário e ele ainda não passou */
          const passou = U.dataHora(a.data, a.hora, a.fuso).getTime() < agora();
          const ocupado = d.agendamentos.some(x => x.psiId === a.psiId && x.data === a.data && x.hora === a.hora
            && OCUPA.includes(x.status) && !ids.includes(x.id));
          if (passou || ocupado) throw new Error(`O horário ${U.fmtDDMM(a.data)} às ${U.fmtHora(a.hora)} já foi ocupado. Remarque antes de confirmar.`);
        }
      }
      const t = agora();
      lista.forEach(a => {
        a.status = 'confirmado';
        a.confirmadoEm = t;
        a.expiraEm = null;
        a.linkMeet = linkMeet;
        a.psiCiente = false;
        hist(a, `Pagamento confirmado por ${por}`);
      });
      salvar(d);
      return clone(lista);
    },

    async atualizarStatus(id, status, por) {
      const d = carregar();
      const a = d.agendamentos.find(x => x.id === id);
      if (!a) throw new Error('Agendamento não encontrado.');
      a.status = status;
      hist(a, `${U.STATUS[status]?.rotulo || status} (por ${por})`);
      salvar(d);
      return clone(a);
    },

    async cancelar(ids, por, motivo = '') {
      const d = carregar();
      d.agendamentos.filter(a => ids.includes(a.id)).forEach(a => {
        a.status = 'cancelado';
        hist(a, `Cancelado por ${por}${motivo ? ': ' + motivo : ''}`);
      });
      salvar(d);
    },

    async marcarCiente(id, nome) {
      const d = carregar();
      const a = d.agendamentos.find(x => x.id === id);
      if (!a) throw new Error('Agendamento não encontrado.');
      a.psiCiente = true;
      hist(a, `${nome} confirmou que está ciente`);
      salvar(d);
      return clone(a);
    },

    /* Repasse ao psicólogo (Financeiro): marca as sessões como pagas (ou desfaz) */
    async marcarRepasse(ids, pago, por) {
      const d = carregar();
      d.agendamentos.filter(a => ids.includes(a.id)).forEach(a => {
        const psi = d.psicologos.find(p => p.id === a.psiId) || {};
        a.repasse = pago ? { pagoEm: agora(), por, valor: Math.round(a.valor * (1 - (Number(psi.comissao) || 0) / 100) * 100) / 100, pix: psi.pix || '' } : null;
        hist(a, pago ? `Repasse ao psicólogo pago (por ${por})` : `Repasse desmarcado (por ${por})`);
      });
      salvar(d);
    },

    /* Lembrete enviado pela equipe (Agenda → Lembretes): 'paciente', 'psicologo' ou 'renovacao' */
    /* ---------- Conferir o Pix (suporte pede, o administrador responde) ----------
       conferencia = { status: 'pedida' | 'caiu' | 'nao', pedidoEm, pedidoPor, respEm, respPor }
       Pedir segura a pré-reserva por mais 2 horas (no horário da equipe) enquanto o admin confere. */
    async pedirConferencia(grupo, por) {
      const d = carregar(), t = agora();
      const l = d.agendamentos.filter(a => a.grupo === grupo && a.status === 'pendente');
      if (!l.length) throw new Error('Essa pré-reserva não está mais esperando pagamento.');
      const segura = U.somarHorasEquipe(t, 2);
      l.forEach(a => {
        a.conferencia = { status: 'pedida', pedidoEm: t, pedidoPor: por };
        if (a.expiraEm && a.expiraEm < segura) a.expiraEm = segura;
        hist(a, `Conferência do Pix pedida ao administrador (por ${por})`);
      });
      salvar(d);
      return clone(l);
    },
    /* v209: a equipe marcou que já mandou a 1ª mensagem no WhatsApp (todos da equipe veem) */
    async marcarMensagemEnviada(grupo, por, campo = 'mensagem') {   /* v217: campo 'pixEnviado' marca o Pix enviado */
      const d = carregar(), t = agora(), pix = campo === 'pixEnviado';
      const l = d.agendamentos.filter(a => a.grupo === grupo && a.status === 'pendente');
      if (!l.length) return [];
      l.forEach(a => { a[pix ? 'pixEnviado' : 'mensagem'] = { em: t, por }; hist(a, pix ? `Pix enviado ao paciente (por ${por})` : `Mensagem no WhatsApp enviada ao paciente (por ${por})`); });
      salvar(d);
      return clone(l);
    },
    async responderConferencia(grupo, caiu, por) {
      const d = carregar(), t = agora();
      const l = d.agendamentos.filter(a => a.grupo === grupo && ['pendente', 'expirado'].includes(a.status));
      if (!l.length) throw new Error('Essa pré-reserva já foi tratada.');
      l.forEach(a => {
        a.conferencia = { ...(a.conferencia || {}), status: caiu ? 'caiu' : 'nao', respEm: t, respPor: por };
        hist(a, caiu ? `Administrador conferiu: o Pix caiu na conta (por ${por})` : `Administrador conferiu: o Pix NÃO caiu na conta (por ${por})`);
      });
      salvar(d);
      return clone(l);
    },

    async marcarLembrete(id, tipo, por) {
      const d = carregar();
      const a = d.agendamentos.find(x => x.id === id);
      if (!a) throw new Error('Agendamento não encontrado.');
      a.lembretes = { ...(a.lembretes || {}), [tipo]: agora() };
      hist(a, { paciente: 'Lembrete enviado ao paciente', psicologo: 'Lembrete enviado ao psicólogo', renovacao: 'Renovação do plano oferecida ao paciente', horario: 'Horário e link da conversa enviados ao paciente' }[tipo] + ` (por ${por})`);
      salvar(d);
      return clone(a);
    },

    /* ---------- pacientes (painel → Pacientes): observações da equipe ----------
       Os dados de contato e o histórico vêm dos próprios agendamentos.
       Aqui fica só o que a equipe acrescenta (nada clínico). */
    async listarPacientesExtra() { return clone(carregar().pacientes || {}); },
    async salvarPacienteObs(chave, obs, por) {
      const d = carregar(); d.pacientes = d.pacientes || {};
      const antesObs = (d.pacientes[chave] || {}).obs || '';
      d.pacientes[chave] = { ...(d.pacientes[chave] || {}), obs: String(obs || '').slice(0, 2000), obsPor: por, obsEm: agora() };
      salvar(d);
      const ag = d.agendamentos.find(a => U.chavePaciente(a.paciente) === chave);
      registrar({ tipo: 'paciente', acao: 'Mudou as observações do paciente', alvo: ag ? ag.paciente.nome : '', antes: { Observações: antesObs || '—' }, depois: { Observações: d.pacientes[chave].obs || '—' } });
      return clone(d.pacientes[chave]);
    },
    /* Excluir paciente (LGPD): apaga nome, WhatsApp e e-mail dos atendimentos dele (eles ficam
       como "Paciente removido" para os repasses e números) e apaga as observações. */
    async excluirPaciente(agIds, chaves, por) {
      const d = carregar();
      d.agendamentos.filter(a => agIds.includes(a.id)).forEach(a => {
        a.paciente = { nome: 'Paciente removido', email: '', whatsapp: '' };
        a.lembretes = {};
        a.historico = [...(a.historico || []).map(h => ({ em: h.em, texto: String(h.texto || '').replace(/\(por [^)]*\)/, '').trim() })), { em: agora(), texto: `Dados do paciente excluídos (por ${por})` }];
      });
      d.pacientes = d.pacientes || {};
      chaves.forEach(k => { delete d.pacientes[k]; });
      salvar(d);
    },
    /* anota quando a equipe chamou o paciente (ex.: resgate de pré-reserva vencida) */
    async marcarContatoPaciente(chave, agId) {
      const d = carregar(); d.pacientes = d.pacientes || {};
      const p = d.pacientes[chave] = { ...(d.pacientes[chave] || {}) };
      p.pedidos = { ...(p.pedidos || {}), [agId]: agora() };
      salvar(d); return clone(p);
    },

    async remarcar(id, data, hora, por) {
      const d = carregar();
      const a = d.agendamentos.find(x => x.id === id);
      if (!a) throw new Error('Agendamento não encontrado.');
      if (!livresNoDia(d, a.psiId, data, [a.id]).includes(hora)) throw new Error('Esse horário não está livre.');
      const antes = `${U.fmtDDMM(a.data)} às ${U.fmtHora(a.hora)}`;
      /* sessão que estava como Falta (ou Realizado) e foi remarcada: volta a ser Confirmada no novo horário */
      const era = ['falta', 'realizado'].includes(a.status) ? a.status : null;
      if (era) a.status = 'confirmado';
      a.data = data; a.hora = hora; a.psiCiente = false;
      hist(a, `Remarcado de ${antes} para ${U.fmtDDMM(data)} às ${U.fmtHora(hora)} por ${por}${era ? ` (estava como ${era === 'falta' ? 'Falta' : 'Realizado'}; voltou para Confirmado)` : ''}`);
      salvar(d);
      return clone(a);
    },

    /* ---------- e-mails (simulados: ficam na "Caixa de saída") ---------- */
    async registrarEmail({ para, assunto, corpo, agId = null }) {
      const d = carregar();
      d.caixaSaida.unshift({ id: U.id('em'), para, assunto, corpo, agId, em: agora() });
      d.caixaSaida = d.caixaSaida.slice(0, 200);
      salvar(d);
    },
    async listarCaixaSaida() { return clone(carregar().caixaSaida); },
    async limparCaixaSaida() { const d = carregar(); d.caixaSaida = []; salvar(d); },

    /* ---------- relatório de repasse ---------- */
    async relatorioMes(mes, { psiId } = {}) {
      const d = carregar();
      const doMes = d.agendamentos.filter(a => a.data.startsWith(mes) && (!psiId || a.psiId === psiId) && a.tipo !== 'conhecer');   /* conversa de 15 min não entra no financeiro */
      return d.psicologos
        .filter(p => !psiId || p.id === psiId)
        .map(p => {
          const meus = doMes.filter(a => a.psiId === p.id);
          const feitas = meus.filter(a => FATURA.includes(a.status));
          const previstas = meus.filter(a => a.status === 'confirmado');
          const faturado = feitas.reduce((s, a) => s + a.valor, 0);
          const comissao = faturado * (p.comissao / 100);
          return {
            psiId: p.id, nome: p.nome, comissaoPct: p.comissao,
            realizadas: meus.filter(a => a.status === 'realizado').length,
            faltas: meus.filter(a => a.status === 'falta').length,
            faturado, comissao, repasse: faturado - comissao,
            previstas: previstas.length,
            valorPrevisto: previstas.reduce((s, a) => s + a.valor, 0) * (1 - p.comissao / 100)
          };
        })
        .filter(r => psiId || r.faturado || r.previstas);
    },

    /* ---------- Minha conta da equipe (painel/conta.html) ---------- */
    minhaConta: {
      async obter(id) {
        const d = carregar(), u = d.usuarios.find(x => x.id === id);
        return u ? clone({ nome: u.nome, email: u.email, usuario: u.usuario, papel: u.papel, principal: u.id === principalDe(d) }) : null;
      },
      /* nome e e-mail: só o administrador principal muda os próprios; os outros pedem a um administrador (Usuários → Editar) */
      async salvar(id, { nome, email, usuario }) {
        const d = carregar();
        const u = d.usuarios.find(x => x.id === id);
        if (!u) throw new Error('Conta não encontrada.');
        if (u.id !== principalDe(d)) throw new Error('Nome e e-mail só um administrador muda, em Usuários.');
        if (!String(nome || '').trim()) throw new Error('Coloque o nome.');
        if (!U.emailValido(email)) throw new Error('Coloque um e-mail válido.');
        const us = String(usuario || '').trim().toLowerCase();
        if (!/^[a-z0-9._-]{3,}$/.test(us)) throw new Error('Usuário: pelo menos 3 letras ou números, sem espaço.');
        if ([...d.usuarios, ...d.psicologos].some(x => String(x.usuario).toLowerCase() === us && x.id !== id)) throw new Error('Esse usuário já existe. Escolha outro.');
        Object.assign(u, { nome: nome.trim(), email: email.trim().toLowerCase(), usuario: us });
        salvar(d);
        return { aviso: '' };
      }
    },

    /* ---------- Usuários (tela "Usuários" do painel, modo teste) ---------- */
    equipe: {
      async listar() {
        const d = carregar();
        const principal = principalDe(d);
        return clone([
          ...d.usuarios.map(u => ({ uid: u.id, papel: u.papel, nome: u.nome, email: u.email, usuario: u.usuario, ativo: u.ativo !== false, principal: u.id === principal, ...(u.papel === 'suporte' ? { extras: normExtras(u.extras) } : {}) })),
          ...d.psicologos.map(p => ({ uid: p.id, papel: 'psicologo', nome: p.nome, email: p.email, usuario: p.usuario, psiId: p.id, ativo: !!p.ativo }))
        ].sort((a, b) => (a.nome || '').localeCompare(b.nome || '')));
      },
      /* administradores: só o principal cria, muda, desativa ou exclui (ele é o dono do painel) */
      async criar({ nome, email, senha, papel }) {
        const d = carregar();
        if (!['admin', 'suporte'].includes(papel)) throw new Error('Papel inválido.');
        const s = sessaoAtual();
        if (papel === 'admin' && (!s || s.id !== principalDe(d))) throw new Error('Só o administrador principal cria outro administrador.');
        if (!String(nome || '').trim()) throw new Error('Coloque o nome.');
        email = String(email || '').trim().toLowerCase();
        if (!U.emailValido(email)) throw new Error('Coloque um e-mail válido.');
        if (!senha || senha.length < 6) throw new Error('Senha inicial: pelo menos 6 caracteres.');
        const usuario = email.split('@')[0];
        if ([...d.usuarios, ...d.psicologos].some(x => String(x.usuario).toLowerCase() === usuario)) throw new Error(`O usuário "${usuario}" já existe. Use outro e-mail.`);
        const u = { id: U.id('u'), usuario, senha, senhaPadrao: true, papel, nome: nome.trim(), email, doisFatores: true, ativo: true, ...(papel === 'suporte' ? { extras: [] } : {}) };   /* senha provisória: no 1º acesso a pessoa cria a dela */
        d.usuarios.push(u); salvar(d);
        registrar({ tipo: 'usuarios', acao: `Criou o acesso de ${papel === 'admin' ? 'administrador' : 'suporte'}`, alvo: `${u.nome} (${email})` });
        return u.id;
      },
      /* corrigir nome e e-mail, trocar o papel (suporte ⇄ administrador) e os acessos extras do suporte.
         Nunca o principal nem você mesmo (use Minha conta). Papel e administradores: só o principal. */
      async editar(uid, { nome, email, papel, extras }) {
        const d = carregar();
        const u = d.usuarios.find(x => x.id === uid);
        if (!u) throw new Error('Usuário não encontrado.');
        const s = sessaoAtual(), principal = principalDe(d), souPrincipal = !!s && s.id === principal;
        if (s && s.id === uid) throw new Error('Para mudar os seus dados, use Minha conta.');
        if (u.id === principal) throw new Error('O administrador principal muda os próprios dados em Minha conta.');
        papel = papel || u.papel;
        if (!['admin', 'suporte'].includes(papel)) throw new Error('Papel inválido.');
        if ((u.papel === 'admin' || papel !== u.papel) && !souPrincipal) throw new Error('Só o administrador principal muda administradores e o papel de alguém.');
        if (!String(nome || '').trim()) throw new Error('Coloque o nome.');
        email = String(email || '').trim().toLowerCase();
        if (!U.emailValido(email)) throw new Error('Coloque um e-mail válido.');
        const usuario = email.split('@')[0];
        if ([...d.usuarios, ...d.psicologos].some(x => x.id !== uid && (String(x.email || '').toLowerCase() === email || String(x.usuario).toLowerCase() === usuario))) throw new Error('Já existe um acesso com esse e-mail.');
        const novosExtras = papel === 'suporte' ? normExtras(Array.isArray(extras) ? extras : u.extras) : undefined;
        const antes = { Nome: u.nome, 'E-mail': u.email, Papel: u.papel === 'admin' ? 'Administrador' : 'Suporte', 'Acessos extras': u.papel === 'suporte' ? textoExtras(normExtras(u.extras)) : '—' };
        Object.assign(u, { nome: nome.trim(), email, usuario, papel });
        if (novosExtras) u.extras = novosExtras; else delete u.extras;
        salvar(d);
        const depois = { Nome: u.nome, 'E-mail': u.email, Papel: u.papel === 'admin' ? 'Administrador' : 'Suporte', 'Acessos extras': u.papel === 'suporte' ? textoExtras(normExtras(u.extras)) : '—' };
        const mud = Object.keys(antes).filter(k => antes[k] !== depois[k]);
        if (mud.length) registrar({ tipo: 'usuarios', acao: mud.includes('Papel') ? `Mudou o papel para ${depois.Papel}` : mud.includes('Acessos extras') ? 'Mudou os acessos extras' : 'Editou os dados do usuário', alvo: u.nome,
          antes: Object.fromEntries(mud.map(k => [k, antes[k]])), depois: Object.fromEntries(mud.map(k => [k, depois[k]])) });
      },
      /* o administrador define uma senha provisória (a pessoa esqueceu ou acabou de ser contratada) */
      async senhaProvisoria(uid, senha) {
        const d = carregar();
        const u = d.usuarios.find(x => x.id === uid);
        if (!u) throw new Error('Usuário não encontrado.');
        const s = sessaoAtual();
        if (s && s.id === uid) throw new Error('Para trocar a sua senha, use Minha conta.');
        if (u.papel === 'admin' && (!s || s.id !== principalDe(d))) throw new Error('Só o administrador principal define a senha de outro administrador.');
        if (!senha || senha.length < 8) throw new Error('A senha provisória precisa ter pelo menos 8 caracteres.');
        u.senha = senha; u.senhaPadrao = true; salvar(d);
        registrar({ tipo: 'usuarios', acao: 'Definiu uma senha provisória', alvo: u.nome });
      },
      async ativar(uid, ativo) {
        const d = carregar();
        const u = d.usuarios.find(x => x.id === uid) || d.psicologos.find(x => x.id === uid);
        if (!u) throw new Error('Usuário não encontrado.');
        const principal = principalDe(d), s = sessaoAtual();
        if (!ativo && u.id === principal) throw new Error('O administrador principal não pode ser desativado.');
        if (u.papel === 'admin' && (!s || s.id !== principal)) throw new Error('Só o administrador principal desativa ou reativa outro administrador.');
        u.ativo = !!ativo; salvar(d);
        registrar({ tipo: 'usuarios', acao: ativo ? 'Reativou o acesso' : 'Desativou o acesso', alvo: u.nome });
      },
      async excluir(uid) {
        const d = carregar();
        const s = sessaoAtual();
        if (s && s.id === uid) throw new Error('Você não pode excluir o seu próprio acesso.');
        const u = d.usuarios.find(x => x.id === uid);
        if (!u) throw new Error(d.psicologos.some(x => x.id === uid) ? 'Psicólogos não são excluídos: desative o acesso.' : 'Usuário não encontrado.');
        const principal = principalDe(d);
        if (u.id === principal) throw new Error('O administrador principal não pode ser excluído.');
        if (u.papel === 'admin' && (!s || s.id !== principal)) throw new Error('Só o administrador principal exclui outro administrador.');
        d.usuarios = d.usuarios.filter(x => x.id !== uid); salvar(d);
        registrar({ tipo: 'usuarios', acao: 'Excluiu o acesso', alvo: `${u.nome} (${u.email})` });
      },
      async novaSenha() { throw new Error('No modo teste não há envio de e-mail. Com o Firebase, o link de nova senha vai para o e-mail da pessoa.'); }
    },

    /* ---------- Registro de atividades (prévia) ----------
       Junta o que foi gravado aqui com o histórico de cada sessão ("Cancelado por Maria").
       → [{ id, em, quemId, quemNome, quemPapel, tipo, acao, alvo, antes, depois, aparelho, origem }] */
    atividades: {
      async listar() {
        const d = carregar();
        let l = [];
        try { l = JSON.parse(localStorage.getItem(CHAVE_ATIV) || '[]'); } catch (e) { l = []; }
        const porNome = {}; d.usuarios.forEach(u => { porNome[u.nome] = u; });
        const psis = {}; d.psicologos.forEach(p => { psis[p.id] = p.nome; });
        d.agendamentos.forEach(a => (a.historico || []).forEach((h, i) => {
          const t = String(h.texto || ''), m = /\(por ([^)]+)\)|\bpor ([^:(]+?)(?=:|\s\(|$)/.exec(t);
          if (!m) return;
          const nome = (m[1] || m[2] || '').trim(), u = porNome[nome];
          l.push({ id: `h-${a.id}-${i}`, em: h.em, quemId: u ? u.id : '', quemNome: nome, quemPapel: u ? u.papel : (nome === 'Administrador' ? 'admin' : ''), tipo: tipoHist(t),
            acao: t.replace(/\s*\(por [^)]*\)/, '').replace(/\s+por [^:(]+?(?=:|\s\(|$)/, '').trim(),
            alvo: `${a.paciente.nome} com ${psis[a.psiId] || 'psicólogo'} · ${U.fmtCurta(a.data)}, ${U.fmtHora(a.hora)}`, origem: 'sessao', agId: a.id });
        }));
        return clone(l.sort((x, y) => y.em - x.em));
      }
    },

    /* ---------- testes ---------- */
    async resetarDemo() { localStorage.removeItem(CHAVE); carregar(); },

    /* Avisa a tela quando os dados mudam em outra aba (ex.: paciente
       marcou no site e o painel está aberto em outra aba). */
    aoMudar(cb) { window.addEventListener('storage', e => { if (e.key === CHAVE) cb(); }); }
  };

  /* ------------------------------------------------------------------
     ADAPTADORES FUTUROS
     Implemente aqui as MESMAS funções do objeto Local, com o mesmo
     formato de entrada e saída. As telas não precisam mudar.
     ------------------------------------------------------------------ */
  const naoImplementado = nome => async () => { throw new Error(`${nome}: adaptador ainda não implementado. Veja LEIA-ME.md.`); };
  const criarStub = nomeBanco => new Proxy({}, {
    get: (_, fn) => fn === 'aoMudar' ? () => {} : naoImplementado(`${nomeBanco}.${String(fn)}`)
  });

  /* Supabase (exemplo do que cada função vira):
       autenticar        → supabase.auth.signInWithPassword() + tabela perfis (papel)
       2FA               → supabase.auth.mfa (TOTP) ou código por e-mail numa Edge Function
       listarPsicologos  → supabase.from('psicologos').select('*').eq('ativo', true)
       horariosLivres    → supabase.rpc('horarios_livres', { psi_id, data, semanas })
       criarPreReserva   → supabase.rpc('criar_pre_reserva', {...})   (transação no servidor)
       confirmarGrupo    → Edge Function 'confirmar' (gera Meet + envia e-mails)
       aoMudar           → supabase.channel(...).on('postgres_changes', ...)
     Firebase:
       autenticar        → signInWithEmailAndPassword() + custom claims (papel)
       criarPreReserva   → Cloud Function com runTransaction()
       aoMudar           → onSnapshot()                                              */
  const Supabase = criarStub('supabase');
  const Firebase = criarStub('firebase');

  const adaptadores = { local: Local, supabase: Supabase, firebase: Firebase };
  window.DB = adaptadores[C.banco] || Local;
  window.DB.modo = C.banco;
})();
