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
      { id: 'helena-prado',  nome: 'Helena Prado',  crp: '11/10234', abordagem: 'TCC',                          email: 'helena@exemplo.com',  whatsapp: '5588900000001', usuario: 'helena',  senha: 'helena123',  doisFatores: true,  ativo: true, comissao: 30, valor: 120 },
      { id: 'lucas-almeida', nome: 'Lucas Almeida', crp: '06/18872', abordagem: 'Abordagem Centrada na Pessoa', email: 'lucas@exemplo.com',   whatsapp: '5588900000002', usuario: 'lucas',   senha: 'lucas123',   doisFatores: true, ativo: true, comissao: 30, valor: 110 },
      { id: 'beatriz-sales', nome: 'Beatriz Sales', crp: '05/44120', abordagem: 'Fenomenológico-Existencial',   email: 'beatriz@exemplo.com', whatsapp: '5588900000003', usuario: 'beatriz', senha: 'beatriz123', doisFatores: true, ativo: true, comissao: 30, valor: 130 },
      { id: 'tiago-moreira', nome: 'Tiago Moreira', crp: '08/20931', abordagem: 'Psicanálise',                  email: 'tiago@exemplo.com',   whatsapp: '5588900000004', usuario: 'tiago',   senha: 'tiago123',   doisFatores: true, ativo: true, comissao: 30, valor: 150 },
      { id: 'aline-duarte',  nome: 'Aline Duarte',  crp: '11/15560', abordagem: 'TCC',                          email: 'aline@exemplo.com',   whatsapp: '5588900000005', usuario: 'aline',   senha: 'aline123',   doisFatores: true, ativo: true, comissao: 25, valor: 115 },
      { id: 'sam-oliveira',  nome: 'Sam Oliveira',  crp: '04/33018', abordagem: 'Gestalt-terapia',              email: 'sam@exemplo.com',     whatsapp: '5588900000006', usuario: 'sam',     senha: 'sam123',     doisFatores: true, ativo: true, comissao: 25, valor: 100 }
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
        expiraEm: t + C.expiracaoPreReservaHoras * 3600e3,
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
      versao: 3,
      usuarios: [
        { id: 'u-admin',   usuario: 'admin',   senha: 'admin123',   papel: 'admin',   nome: 'Administrador',     email: 'admin@psicologosbrasil.com.br', doisFatores: false },
        { id: 'u-suporte', usuario: 'suporte', senha: 'suporte123', papel: 'suporte', nome: 'Equipe de suporte', email: 'suporte@psicologosbrasil.com.br', doisFatores: false }
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
    if (!d || d.versao !== 3) { d = semente(); salvar(d); }  // versão 3 = psicólogos iguais aos do site
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
    const limite = agora() + C.antecedenciaMinHoras * 3600e3;
    return ((disp.datas || {})[data] || [])
      .filter(h => !bloqueadas.has(h) && !ocupadas.has(h) && U.dataHora(data, h).getTime() > limite)
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
     ADAPTADOR LOCAL — implementa todas as funções do DB
     ------------------------------------------------------------------ */
  const Local = {
    /* ---------- login ---------- */
    async autenticar(usuario, senha) {
      const d = carregar();
      const u = String(usuario || '').trim().toLowerCase();
      const adm = d.usuarios.find(x => x.usuario.toLowerCase() === u && x.senha === senha);
      if (adm && adm.ativo === false) throw new Error('Seu acesso está desativado. Fale com o administrador.');
      if (adm) return { id: adm.id, papel: adm.papel, nome: adm.nome, email: adm.email, doisFatores: true };
      const psi = d.psicologos.find(x => x.usuario.toLowerCase() === u && x.senha === senha);
      if (psi) {
        if (!psi.ativo) throw new Error('Seu acesso está desativado. Fale com a equipe.');
        return { id: psi.id, papel: 'psicologo', nome: psi.nome, email: psi.email, doisFatores: true };
      }
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
      if (dados.usuario !== undefined) {
        const u = String(dados.usuario || '').trim().toLowerCase();
        if (!/^[a-z0-9._-]{3,}$/.test(u)) throw new Error('Usuário: pelo menos 3 letras ou números, sem espaço.');
        if ([...d.psicologos, ...d.usuarios].some(x => String(x.usuario).toLowerCase() === u && x.id !== psiId)) throw new Error('Esse usuário já existe. Escolha outro.');
        p.usuario = u;
      }
      ['nome', 'crp', 'email', 'whatsapp'].forEach(k => { if (dados[k] !== undefined) p[k] = k === 'whatsapp' ? U.digitos(dados[k]) : String(dados[k]).trim(); });
      salvar(d);
      return { psi: clone(p) };
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
    async diasComHorario(psiId, { semanas = 1 } = {}) {
      const d = carregar();
      const ps = d.psicologos.find(p => p.id === psiId);
      if (ps && ps.pausada) return [];   /* agenda online desligada no perfil: sem horários no site */
      const hoje = U.hojeISO();
      const dias = [];
      for (let i = 0; i < C.diasVisiveis; i++) {
        const data = U.addDias(hoje, i);
        const horas = livresSemanas(d, psiId, data, semanas, []);
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
    async criarPreReserva({ psiId, data, hora, tipo = 'avulsa', paciente }) {
      const d = carregar();
      const nome = String(paciente?.nome || '').trim();
      const email = String(paciente?.email || '').trim();
      const whatsapp = U.digitos(paciente?.whatsapp);
      if (nome.length < 3) throw new Error('Informe seu nome completo.');
      if (!U.emailValido(email)) throw new Error('Informe um e-mail válido.');
      if (!U.whatsValido(whatsapp)) throw new Error('Informe um WhatsApp com DDD.');
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
          status: 'pendente', criadoEm: t, expiraEm: t + C.expiracaoPreReservaHoras * 3600e3,
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
      const ids = lista.map(a => a.id);
      for (const a of lista) {
        if (a.status === 'expirado') {
          /* pré-reserva expirada: só confirma se ninguém pegou o horário e ele ainda não passou */
          const passou = U.dataHora(a.data, a.hora).getTime() < agora();
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

    async remarcar(id, data, hora, por) {
      const d = carregar();
      const a = d.agendamentos.find(x => x.id === id);
      if (!a) throw new Error('Agendamento não encontrado.');
      if (!livresNoDia(d, a.psiId, data, [a.id]).includes(hora)) throw new Error('Esse horário não está livre.');
      const antes = `${U.fmtDDMM(a.data)} às ${U.fmtHora(a.hora)}`;
      a.data = data; a.hora = hora; a.psiCiente = false;
      hist(a, `Remarcado de ${antes} para ${U.fmtDDMM(data)} às ${U.fmtHora(hora)} por ${por}`);
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
      const doMes = d.agendamentos.filter(a => a.data.startsWith(mes) && (!psiId || a.psiId === psiId));
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
        const u = carregar().usuarios.find(x => x.id === id);
        return u ? clone({ nome: u.nome, email: u.email, usuario: u.usuario, papel: u.papel }) : null;
      },
      async salvar(id, { nome, email, usuario }) {
        const d = carregar();
        const u = d.usuarios.find(x => x.id === id);
        if (!u) throw new Error('Conta não encontrada.');
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
        const principal = (d.usuarios.find(u => u.papel === 'admin' && u.principal) || d.usuarios.find(u => u.papel === 'admin') || {}).id;
        return clone([
          ...d.usuarios.map(u => ({ uid: u.id, papel: u.papel, nome: u.nome, email: u.email, usuario: u.usuario, ativo: u.ativo !== false, principal: u.id === principal })),
          ...d.psicologos.map(p => ({ uid: p.id, papel: 'psicologo', nome: p.nome, email: p.email, usuario: p.usuario, psiId: p.id, ativo: !!p.ativo }))
        ].sort((a, b) => (a.nome || '').localeCompare(b.nome || '')));
      },
      async criar({ nome, email, senha, papel }) {
        const d = carregar();
        if (!['admin', 'suporte'].includes(papel)) throw new Error('Papel inválido.');
        if (!String(nome || '').trim()) throw new Error('Coloque o nome.');
        email = String(email || '').trim().toLowerCase();
        if (!U.emailValido(email)) throw new Error('Coloque um e-mail válido.');
        if (!senha || senha.length < 6) throw new Error('Senha inicial: pelo menos 6 caracteres.');
        const usuario = email.split('@')[0];
        if ([...d.usuarios, ...d.psicologos].some(x => String(x.usuario).toLowerCase() === usuario)) throw new Error(`O usuário "${usuario}" já existe. Use outro e-mail.`);
        const u = { id: U.id('u'), usuario, senha, papel, nome: nome.trim(), email, doisFatores: true, ativo: true };
        d.usuarios.push(u); salvar(d);
        return u.id;
      },
      async ativar(uid, ativo) {
        const d = carregar();
        const u = d.usuarios.find(x => x.id === uid) || d.psicologos.find(x => x.id === uid);
        if (!u) throw new Error('Usuário não encontrado.');
        u.ativo = !!ativo; salvar(d);
      },
      async excluir(uid) {
        const d = carregar();
        const s = JSON.parse(sessionStorage.getItem('pb_painel_sessao') || 'null');
        if (s && s.id === uid) throw new Error('Você não pode excluir o seu próprio acesso.');
        const u = d.usuarios.find(x => x.id === uid);
        if (!u) throw new Error(d.psicologos.some(x => x.id === uid) ? 'Psicólogos não são excluídos: desative o acesso.' : 'Usuário não encontrado.');
        const principal = (d.usuarios.find(x => x.papel === 'admin' && x.principal) || d.usuarios.find(x => x.papel === 'admin') || {}).id;
        if (u.id === principal) throw new Error('O administrador principal não pode ser excluído.');
        d.usuarios = d.usuarios.filter(x => x.id !== uid); salvar(d);
      },
      async novaSenha() { throw new Error('No modo teste não há envio de e-mail. Com o Firebase, o link de nova senha vai para o e-mail da pessoa.'); }
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
