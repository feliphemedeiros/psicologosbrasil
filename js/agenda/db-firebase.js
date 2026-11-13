/* =====================================================================
   AGENDA NO FIREBASE (Firestore) — Psicólogos Brasil
   ---------------------------------------------------------------------
   Liga sozinho quando js/firebase-config.js tem as chaves
   (AGENDA_CONFIG.banco = 'firebase'). Implementa as MESMAS funções do
   modo teste (js/agenda/db.js), então as telas não mudam.

   Coleções no banco:
     usuarios/{uid}                 quem pode entrar no painel e o papel
                                    { papel: admin|suporte|psicologo, nome, email, psiId?, ativo }
     psicologos_agenda/{psiId}      dados internos (e-mail, WhatsApp, comissão, uid)  → só equipe
     agenda_publico/{psiId}         o que o site precisa (nome, CRP, valor, ativo)   → público
     disponibilidade/{psiId}        dias e horários abertos + bloqueios               → público
     disponibilidade_motivos/{psiId} motivo de cada bloqueio                          → privado
     slots/{psiId__data__hora}      "trava" de cada horário marcado (sem dados do paciente)
                                    → é ela que impede duas pessoas no mesmo horário
     agendamentos/{id}              o agendamento completo, com os dados do paciente  → privado
     mail/{id}                      e-mails (compatível com a extensão "Trigger Email")

   Quem pode ler e gravar o quê está em firestore.rules.
   ===================================================================== */
(function () {
  const C = window.AGENDA_CONFIG;
  if (!C || C.banco !== 'firebase' || typeof NUVEM === 'undefined' || NUVEM.modo !== 'firebase') return;

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
  /* v266: "Conheça o psicólogo em 15 minutos" (igual ao db.js) */
  /* nome com a primeira letra maiúscula ("joao da silva" → "Joao da Silva") */
  const nomeProprio = n => String(n || '').trim().replace(/\s+/g, ' ').split(' ').map((w, i) => { const l = w.toLocaleLowerCase('pt-BR'); return i > 0 && ['de', 'da', 'do', 'das', 'dos', 'e'].includes(l) ? l : l.charAt(0).toLocaleUpperCase('pt-BR') + l.slice(1); }).join(' ');
  const MOTIVOS_NAO = { nao_respondeu: 'Não respondeu', caro: 'Achou caro', horario: 'Não tinha horário bom', outro_lugar: 'Escolheu outro lugar', outro: 'Outro motivo' };
  const CONHECER_STATUS = { novo: 'Pedido novo', contato: 'Em contato pelo WhatsApp', marcada: 'Conversa marcada', paciente: 'Virou paciente', nao: 'Não seguiu' };
  const resumoConhecer = p => ({ tipoSessao: p.tipoSessao || '', motivos: p.motivos || [], objetivos: p.objetivos || [], preferencias: p.preferencias || [], horario: p.horario || '', sobre: p.sobre || '' });
  const FATURA = ['realizado', 'falta'];
  const agora = () => Date.now();
  const clone = o => JSON.parse(JSON.stringify(o));
  const slotId = (psiId, data, hora) => `${psiId}__${data}__${String(hora).replace(':', '')}`;

  /* quem está usando (sessão do painel; paciente no site = ninguém) */
  function sessao() { try { return JSON.parse(sessionStorage.getItem('pb_painel_sessao')) || null; } catch (e) { return null; } }
  const ehEquipe = () => { const s = sessao(); return !!s && (s.papel === 'admin' || s.papel === 'suporte'); };
  const ehAdmin = () => { const s = sessao(); return !!s && s.papel === 'admin'; };
  const psiDaSessao = () => { const s = sessao(); return s && s.papel === 'psicologo' ? s.id : null; };

  /* Firebase pronto (com o login já conferido, para as regras reconhecerem quem é) */
  async function fb() {
    if (sessao()) return NUVEM.authPronta();
    return NUVEM.firebase();
  }
  const erroAmigavel = e => {
    const c = String((e && (e.code || e.message)) || e);
    if (/permission/i.test(c)) return new Error('Sem permissão para isso. Saia e entre de novo; se continuar, fale com o administrador.');
    if (/unavailable|network|offline/i.test(c)) return new Error('Sem conexão com o banco de dados. Confira a internet e tente de novo.');
    return e instanceof Error ? e : new Error(String(e));
  };
  const comErro = fn => async (...args) => { try { return await fn(...args); } catch (e) { throw erroAmigavel(e); } };

  /* ------------------------------------------------------------------
     HORÁRIOS LIVRES (mesma regra do modo teste)
     ------------------------------------------------------------------ */
  function ocupa(s, t) {
    if (!s || !OCUPA.includes(s.status)) return false;
    return !(s.status === 'pendente' && s.expiraEm && s.expiraEm < t);
  }
  function livresNoDia(psi, disp, slots, data, ignorarIds = []) {
    if (!psi || !psi.ativo || !disp) return [];
    const bloq = disp.bloqueios || [];
    if (bloq.some(b => b.data === data && !b.hora)) return [];
    const bloqueadas = new Set(bloq.filter(b => b.data === data && b.hora).map(b => b.hora));
    const t = agora();
    const ocupadas = new Set(slots.filter(s => s.data === data && ocupa(s, t) && !ignorarIds.includes(s.agId)).map(s => s.hora));
    const limite = U.somarHorasEquipe(t, U.equipe().antecedenciaHoras);   /* antecedência mínima, no horário da equipe */
    return ((disp.datas || {})[data] || [])
      .filter(h => !bloqueadas.has(h) && !ocupadas.has(h) && U.dataHora(data, h, psi.fuso).getTime() > limite)   /* horário no fuso do psicólogo */
      .sort();
  }
  function livresSemanas(psi, disp, slots, data, semanas, ignorarIds) {
    let lista = livresNoDia(psi, disp, slots, data, ignorarIds);
    for (let k = 1; k < semanas && lista.length; k++) {
      const outras = new Set(livresNoDia(psi, disp, slots, U.addDias(data, 7 * k), ignorarIds));
      lista = lista.filter(h => outras.has(h));
    }
    return lista;
  }
  async function lerBase(psiId) {
    const { fs, db } = await fb();
    const [p, d, s] = await Promise.all([
      fs.getDoc(fs.doc(db, 'agenda_publico', psiId)),
      fs.getDoc(fs.doc(db, 'disponibilidade', psiId)),
      /* só as travas deste psicólogo, de hoje em diante (busca pelo começo do nome do documento) */
      fs.getDocs(fs.query(fs.collection(db, 'slots'),
        fs.where(fs.documentId(), '>=', `${psiId}__${U.addDias(U.hojeISO(), -1)}`),
        fs.where(fs.documentId(), '<', `${psiId}__`)))
    ]);
    return {
      psi: p.exists() ? p.data() : null,
      disp: d.exists() ? d.data() : { datas: {}, bloqueios: [] },
      slots: s.docs.map(x => x.data())
    };
  }

  /* ------------------------------------------------------------------
     CRIAR CONTA DE LOGIN PARA OUTRA PESSOA (sem tirar o admin do login)
     Usa uma segunda "instância" do Firebase só na memória.
     ------------------------------------------------------------------ */
  async function criarContaLogin(email, senha) {
    const [{ app: base }, appMod, authMod] = await Promise.all([
      NUVEM.firebase(), import(NUVEM.SDK + 'firebase-app.js'), import(NUVEM.SDK + 'firebase-auth.js')
    ]);
    const nome = 'criar-conta-' + Date.now();
    const app2 = appMod.initializeApp(base.options, nome);
    try {
      const a2 = authMod.initializeAuth(app2, { persistence: authMod.inMemoryPersistence });
      a2.languageCode = 'pt';
      let cred;
      try { cred = await authMod.createUserWithEmailAndPassword(a2, email, senha); }
      catch (e) {
        if (e && e.code === 'auth/email-already-in-use') throw new Error('Esse e-mail já tem uma conta de login. Use outro e-mail ou peça ao administrador para reaproveitar a conta.');
        if (e && e.code === 'auth/weak-password') throw new Error('Senha fraca: use pelo menos 8 caracteres, misturando letras e números.');
        if (e && e.code === 'auth/invalid-email') throw new Error('E-mail inválido.');
        throw e;
      }
      /* a pessoa confirma o e-mail antes do primeiro login (exigência do Firebase para o app autenticador) */
      try { await authMod.sendEmailVerification(cred.user); } catch (e) { /* segue: dá para reenviar no login */ }
      const uid = cred.user.uid;
      await authMod.signOut(a2);
      return uid;
    } finally {
      try { await appMod.deleteApp(app2); } catch (e) { /* ok */ }
    }
  }

  /* Expira pré-reservas vencidas (só a equipe grava; para os outros, só mostra) */
  async function expirar(lista) {
    const t = agora();
    const vencidas = lista.filter(a => a.status === 'pendente' && a.expiraEm && a.expiraEm < t);
    if (!vencidas.length) return lista;
    vencidas.forEach(a => { a.status = 'expirado'; a.historico = [...(a.historico || []), { em: t, texto: 'Pré-reserva expirou sem confirmação de pagamento' }]; });
    if (ehEquipe()) {
      try {
        const { fs, db } = await fb();
        const lote = fs.writeBatch(db);
        vencidas.forEach(a => lote.update(fs.doc(db, 'agendamentos', a.id), { status: 'expirado', historico: a.historico }));
        await lote.commit();
      } catch (e) { console.warn('expirar', e); }
    }
    return lista;
  }

  const Firebase = {
    /* ---------- login: no Firebase é feito em painel/index.html ---------- */
    async autenticar() { throw new Error('No Firebase o login é feito pela tela do painel.'); },
    async gerarCodigo2FA() { throw new Error('No Firebase o código vem do app autenticador.'); },
    async validarCodigo2FA() { return false; },

    /* ---------- psicólogos ---------- */
    listarPsicologos: comErro(async ({ todos = false } = {}) => {
      const { fs, db } = await fb();
      let l;
      if (ehEquipe()) {
        const s = await fs.getDocs(fs.collection(db, 'psicologos_agenda'));
        l = s.docs.map(d => d.data());
      } else {
        const s = await fs.getDocs(fs.query(fs.collection(db, 'agenda_publico'), fs.where('ativo', '==', true)));
        l = s.docs.map(d => d.data());
      }
      return clone(l.filter(p => todos || p.ativo).sort((a, b) => (a.nome || '').localeCompare(b.nome || '')));
    }),
    obterPsicologo: comErro(async id => {
      if (!id) return null;
      const { fs, db } = await fb();
      if (ehEquipe() || psiDaSessao() === id) {
        const s = await fs.getDoc(fs.doc(db, 'psicologos_agenda', id));
        if (s.exists()) return s.data();
      }
      const p = await fs.getDoc(fs.doc(db, 'agenda_publico', id));
      return p.exists() ? p.data() : null;
    }),
    salvarPsicologo: comErro(async dados => {
      if (!ehEquipe()) throw new Error('Só a equipe pode criar ou mudar acessos.');
      const { fs, db } = await fb();
      const email = String(dados.email || '').trim().toLowerCase();
      if (!dados.nome) throw new Error('Preencha o nome.');
      let id = String(dados.id || '').trim() || U.id('psi');
      const ref = fs.doc(db, 'psicologos_agenda', id);
      const atual = await fs.getDoc(ref);
      const antes = atual.exists() ? atual.data() : null;
      let uid = antes && antes.uid;
      if (!antes) {
        if (!U.emailValido(email)) throw new Error('Coloque um e-mail válido: é com ele que o psicólogo entra no painel.');
        if (!dados.senha || dados.senha.length < 6) throw new Error('Senha inicial: pelo menos 6 caracteres.');
        uid = await criarContaLogin(email, dados.senha);
      }
      const p = {
        id, uid: uid || null,
        nome: String(dados.nome).trim(), crp: String(dados.crp || '').trim(), abordagem: String(dados.abordagem || ''),
        email: antes ? (antes.email || email) : email,
        whatsapp: U.whatsNormalizar(dados.whatsapp || (antes && antes.whatsapp) || ''),
        usuario: String(dados.usuario || (antes && antes.usuario) || '').trim().toLowerCase(),
        comissao: Number(dados.comissao ?? (antes && antes.comissao) ?? C.comissaoPadrao),
        valor: Number(dados.valor ?? (antes && antes.valor) ?? C.valorPadrao),
        valorMensal: Number(dados.valorMensal ?? (antes && antes.valorMensal) ?? 0) || null,
        ativo: dados.ativo !== false, doisFatores: true, atualizado: agora(),
        pausada: !!(dados.pausada ?? (antes && antes.pausada) ?? false),
        opp: String(dados.opp ?? (antes && antes.opp) ?? '').trim(),
        /* sala fixa do Google Meet (privada: só vai no e-mail depois do pagamento confirmado) */
        salaMeet: String(dados.salaMeet ?? (antes && antes.salaMeet) ?? '').trim(),
        /* fuso horário de onde o psicólogo atende (os horários dele ficam nesse fuso) */
        fuso: U.fusoValido(dados.fuso) ? dados.fuso : ((antes && antes.fuso) || U.FUSO_BR)
      };
      const pub = { id, nome: p.nome, crp: p.crp, abordagem: p.abordagem, ativo: p.ativo, pausada: p.pausada, valor: p.valor, valorMensal: p.valorMensal, fuso: p.fuso };
      const lote = fs.writeBatch(db);
      lote.set(ref, p);
      lote.set(fs.doc(db, 'agenda_publico', id), pub);
      if (!antes) lote.set(fs.doc(db, 'disponibilidade', id), { datas: {}, bloqueios: [] }, { merge: true });
      if (uid) lote.set(fs.doc(db, 'usuarios', uid), { papel: 'psicologo', nome: p.nome, email: p.email, psiId: id, ativo: p.ativo, atualizado: agora(), ...(!antes ? { criadoEm: agora(), senhaPadrao: !!dados.senhaPadrao } : {}) }, { merge: true });
      await lote.commit();
      return clone(p);
    }),
    /* Excluir o psicólogo de vez (Perfis → Excluir): agenda, horários e o usuário.
       A conta de login some sozinha com a função instalada (functions/). Atendimentos antigos ficam no histórico. */
    excluirPsicologo: comErro(async psiId => {
      if (!ehEquipe()) throw new Error('Só a equipe pode excluir.');
      const { fs, db } = await fb();
      const ref = fs.doc(db, 'psicologos_agenda', psiId);
      const s = await fs.getDoc(ref);
      const uid = s.exists() ? s.data().uid : null;
      const lote = fs.writeBatch(db);
      lote.delete(ref);
      lote.delete(fs.doc(db, 'agenda_publico', psiId));
      lote.delete(fs.doc(db, 'disponibilidade', psiId));
      lote.delete(fs.doc(db, 'disponibilidade_motivos', psiId));
      if (uid) lote.delete(fs.doc(db, 'usuarios', uid));
      await lote.commit();
    }),
    /* Dados de contato (tela Conta).
       Equipe: muda nome, CRP, e-mail de contato e WhatsApp (o e-mail de LOGIN só a pessoa troca).
       Psicólogo: muda o próprio e-mail (o Firebase manda um link de confirmação) e o WhatsApp. */
    atualizarContato: comErro(async (psiId, dados) => {
      const { fs, db } = await fb();
      const ref = fs.doc(db, 'psicologos_agenda', psiId);
      const s0 = await fs.getDoc(ref);
      if (!s0.exists()) throw new Error('Psicólogo não encontrado.');
      const antes = s0.data();
      const mud = { atualizado: agora() };
      if (!ehEquipe()) throw new Error('Seus dados são atualizados pela equipe. Fale com o suporte.');   /* o psicólogo só troca a senha */
      dados = { ...dados }; delete dados.pix; delete dados.pixTipo;   /* chave Pix: só pelo código no e-mail de quem troca (pedirCodigoPix) */
      if (dados.email !== undefined) mud.email = String(dados.email).trim().toLowerCase();
      if (dados.whatsapp !== undefined) {
        mud.whatsapp = U.whatsNormalizar(dados.whatsapp);
        if (mud.whatsapp && !U.whatsValido(mud.whatsapp)) throw new Error('WhatsApp inválido: confira o país e o número.');
      }
      if (dados.pix !== undefined) mud.pix = String(dados.pix).trim().slice(0, 140);
      if (dados.pixTipo !== undefined) mud.pixTipo = ['cpf', 'cnpj', 'celular', 'email', 'aleatoria'].includes(dados.pixTipo) ? dados.pixTipo : '';
      let aviso = '';
      if (ehEquipe()) {
        if (dados.nome !== undefined) mud.nome = String(dados.nome).trim();
        if (dados.crp !== undefined) mud.crp = String(dados.crp).trim();
        if (dados.opp !== undefined) mud.opp = String(dados.opp).trim();
        if (dados.fuso !== undefined) { if (!U.fusoValido(dados.fuso)) throw new Error('Fuso horário inválido.'); mud.fuso = dados.fuso; }
        await fs.updateDoc(ref, mud);
        const pub = {}; if (mud.nome) pub.nome = mud.nome; if (mud.crp !== undefined) pub.crp = mud.crp; if (mud.fuso) pub.fuso = mud.fuso;
        if (Object.keys(pub).length) await fs.updateDoc(fs.doc(db, 'agenda_publico', psiId), pub);
        if (antes.uid && mud.nome) await fs.updateDoc(fs.doc(db, 'usuarios', antes.uid), { nome: mud.nome });
        /* e-mail novo = login novo (a função do Firebase troca o e-mail da conta) */
        if (mud.email && mud.email !== antes.email && antes.uid) {
          try { await pedirTroca({ uid: antes.uid, psiId, email: mud.email }); await fs.updateDoc(fs.doc(db, 'usuarios', antes.uid), { email: mud.email }); aviso = `Dados salvos. ${U.primeiroNome(mud.nome || antes.nome || '')} passa a entrar com ${mud.email}.`; }
          catch (e) { aviso = 'Dados salvos, mas o e-mail de login não mudou: ' + e.message; }
        }
      } else {
        if (psiDaSessao() !== psiId) throw new Error('Sem permissão.');
        await fs.updateDoc(ref, mud);
      }
      return { aviso };
    }),

    /* Agenda online/offline (o próprio psicólogo ou a equipe) */
    definirAgendaOnline: comErro(async (psiId, online) => {
      const { fs, db } = await fb();
      await fs.updateDoc(fs.doc(db, 'psicologos_agenda', psiId), { pausada: !online, atualizado: agora() });
      await fs.updateDoc(fs.doc(db, 'agenda_publico', psiId), { pausada: !online });
    }),

    /* Firebase pede um login recente para trocar a senha; se não for, manda o link por e-mail */
    alterarSenha: comErro(async (_id, atual, nova) => {
      if (!nova || nova.length < 8) throw new Error('A nova senha precisa ter pelo menos 8 caracteres.');
      const x = await NUVEM.authPronta();
      const u = x.auth.currentUser;
      if (!u) throw new Error('Entre de novo para trocar a senha.');
      try {
        await x.authMod.updatePassword(u, nova);
      } catch (e) {
        if (e && e.code === 'auth/requires-recent-login') {
          await x.authMod.sendPasswordResetEmail(x.auth, u.email);
          throw new Error('Por segurança, mandamos um link para o seu e-mail. Abra o link para criar a nova senha.');
        }
        if (e && e.code === 'auth/weak-password') throw new Error('Senha fraca: use pelo menos 8 caracteres, misturando letras e números.');
        throw e;
      }
      try { await x.fs.updateDoc(x.fs.doc(x.db, 'usuarios', u.uid), { senhaPadrao: false }); } catch (e) { /* aviso some no próximo login */ }
    }),

    /* ---------- disponibilidade ---------- */
    obterDisponibilidade: comErro(async psiId => {
      const { fs, db } = await fb();
      const [d, m] = await Promise.all([
        fs.getDoc(fs.doc(db, 'disponibilidade', psiId)),
        fs.getDoc(fs.doc(db, 'disponibilidade_motivos', psiId)).catch(() => null)
      ]);
      const disp = d.exists() ? d.data() : { datas: {}, bloqueios: [] };
      const motivos = m && m.exists() ? (m.data().motivos || {}) : {};
      disp.datas = disp.datas || {};
      disp.bloqueios = (disp.bloqueios || []).map(b => ({ ...b, motivo: motivos[b.id] || '' }));
      return clone(disp);
    }),
    salvarDatas: comErro(async (psiId, mudancas) => {
      const { fs, db } = await fb();
      const ref = fs.doc(db, 'disponibilidade', psiId);
      await fs.runTransaction(db, async tx => {
        const s = await tx.get(ref);
        const disp = s.exists() ? s.data() : { datas: {}, bloqueios: [] };
        const datas = { ...(disp.datas || {}) };
        Object.entries(mudancas).forEach(([data, horas]) => {
          const lista = [...new Set(horas)].sort();
          if (lista.length) datas[data] = lista; else delete datas[data];
        });
        const hoje = U.hojeISO();
        Object.keys(datas).forEach(k => { if (k < hoje) delete datas[k]; });
        tx.set(ref, { datas, bloqueios: disp.bloqueios || [] });
      });
    }),
    adicionarBloqueio: comErro(async (psiId, { data, hora = '', motivo = '' }) => {
      if (!data) throw new Error('Escolha a data.');
      const { fs, db } = await fb();
      const ref = fs.doc(db, 'disponibilidade', psiId);
      const id = U.id('bl');
      await fs.runTransaction(db, async tx => {
        const s = await tx.get(ref);
        const disp = s.exists() ? s.data() : { datas: {}, bloqueios: [] };
        const bloq = disp.bloqueios || [];
        if (bloq.some(b => b.data === data && (b.hora === hora || !b.hora))) throw new Error('Esse período já está bloqueado.');
        bloq.push({ id, data, hora });
        bloq.sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
        tx.set(ref, { datas: disp.datas || {}, bloqueios: bloq });
      });
      if (motivo) await fs.setDoc(fs.doc(db, 'disponibilidade_motivos', psiId), { motivos: { [id]: motivo } }, { merge: true });
    }),
    removerBloqueio: comErro(async (psiId, bloqueioId) => {
      const { fs, db } = await fb();
      const ref = fs.doc(db, 'disponibilidade', psiId);
      await fs.runTransaction(db, async tx => {
        const s = await tx.get(ref);
        if (!s.exists()) return;
        const disp = s.data();
        tx.set(ref, { datas: disp.datas || {}, bloqueios: (disp.bloqueios || []).filter(b => b.id !== bloqueioId) });
      });
    }),

    /* ---------- horários livres (o que o paciente vê no site) ---------- */
    horariosLivres: comErro(async (psiId, data, { semanas = 1, ignorarIds = [] } = {}) => {
      const b = await lerBase(psiId);
      return livresSemanas(b.psi, b.disp, b.slots, data, semanas, ignorarIds);
    }),
    diasComHorario: comErro(async (psiId, { semanas = 1, ignorarIds = [], equipe = false } = {}) => {
      const b = await lerBase(psiId);
      if (b.psi && b.psi.pausada && !equipe) return [];   /* agenda online desligada no perfil (a equipe ainda vê, para remarcar) */
      const hoje = U.hojeISO(b.psi && b.psi.fuso || U.FUSO_BR);   /* "hoje" no relógio do psicólogo */
      const dias = [];
      for (let i = 0; i < C.diasVisiveis; i++) {
        const data = U.addDias(hoje, i);
        const horas = livresSemanas(b.psi, b.disp, b.slots, data, semanas, ignorarIds);
        if (horas.length) dias.push({ data, horas });
      }
      return dias;
    }),

    /* ---------- agendamentos ---------- */
    listarAgendamentos: comErro(async ({ psiId, status, de, ate, grupo } = {}) => {
      if (typeof status === 'string') status = [status];
      const { fs, db } = await fb();
      const col = fs.collection(db, 'agendamentos');
      const meu = psiDaSessao();
      let q;
      if (meu) q = fs.query(col, fs.where('psiId', '==', meu));               /* psicólogo: só os dele */
      else if (grupo) q = fs.query(col, fs.where('grupo', '==', grupo));
      else if (status && status.length && status.length <= 10 && !de && !ate) q = fs.query(col, fs.where('status', 'in', status));
      else if (de) q = fs.query(col, fs.where('data', '>=', de));
      else q = col;
      const s = await fs.getDocs(q);
      let l = s.docs.map(d => d.data());
      l = await expirar(l);
      return clone(l
        .filter(a => (!psiId || a.psiId === psiId)
          && (!status || status.includes(a.status))
          && (!de || a.data >= de)
          && (!ate || a.data <= ate)
          && (!grupo || a.grupo === grupo))
        .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora)));
    }),
    obterAgendamento: comErro(async id => {
      const { fs, db } = await fb();
      const s = await fs.getDoc(fs.doc(db, 'agendamentos', id));
      if (!s.exists()) return null;
      return clone((await expirar([s.data()]))[0]);
    }),

    /* Paciente escolheu horário no site.
       Tudo numa transação: confere se o horário continua livre e grava a
       "trava" (slots) junto com o agendamento. Se duas pessoas tentarem o
       mesmo horário ao mesmo tempo, só uma consegue. */
    /* v220: "Conheça o psicólogo em 15 minutos" — coleção conhecer/{id} (o site só cria; a equipe lê) */
    enviarConhecer: comErro(async (p = {}) => {
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
      const { fs, db } = await NUVEM.firebase();
      await fs.setDoc(fs.doc(db, 'conhecer', pedido.id), pedido);
      return clone(pedido);
    }),
    listarConhecer: comErro(async () => {
      const { fs, db } = await fb();
      const r = await fs.getDocs(fs.query(fs.collection(db, 'conhecer'), fs.orderBy('criadoEm', 'desc'), fs.limit(300)));
      return r.docs.map(x => x.data());
    }),
    /* v266: aba "Conversas 15 min" (painel da equipe) */
    atualizarConhecer: comErro(async (id, { status, motivo } = {}, por = '') => {
      if (!CONHECER_STATUS[status]) throw new Error('Situação inválida.');
      const { fs, db } = await fb();
      const ref = fs.doc(db, 'conhecer', id);
      const s = await fs.getDoc(ref);
      if (!s.exists()) throw new Error('Pedido não encontrado.');
      const p = s.data(), t = agora();
      const mn = status === 'nao' && MOTIVOS_NAO[motivo] ? motivo : null;   /* v286: motivo de "não seguiu" (opcional) */
      const mud = { status, motivoNao: mn, historico: [...(p.historico || []), { em: t, texto: `${CONHECER_STATUS[status]}${mn ? ': ' + MOTIVOS_NAO[mn] : ''} (por ${por})` }] };
      if (status === 'contato' && !p.contato) mud.contato = { em: t, por };
      await fs.updateDoc(ref, mud);
      return clone({ ...p, ...mud });
    }),
    /* v267: horários de conversa do psicólogo (coleção conversas15/{psiId}) */
    obterConversas15: comErro(async psiId => {
      const { fs, db } = await fb();
      const s = await fs.getDoc(fs.doc(db, 'conversas15', psiId));
      return s.exists() ? { ativo: false, datas: {}, ...s.data() } : { ativo: false, datas: {} };
    }),
    listarConversas15: comErro(async () => {
      const { fs, db } = await fb();
      const r = await fs.getDocs(fs.collection(db, 'conversas15'));
      const o = {}; r.docs.forEach(x => { o[x.id] = x.data(); });
      return o;
    }),
    salvarConversas15: comErro(async (psiId, { ativo, mudancas = {} } = {}) => {
      const { fs, db } = await fb();
      const ref = fs.doc(db, 'conversas15', psiId);
      return await fs.runTransaction(db, async tx => {
        const s = await tx.get(ref);
        const c = s.exists() ? { ativo: false, datas: {}, ...s.data() } : { ativo: false, datas: {} };
        c.datas = { ...(c.datas || {}) };
        if (typeof ativo === 'boolean') c.ativo = ativo;
        Object.entries(mudancas).forEach(([data, hs]) => { const l = [...new Set(hs)].filter(h => /^\d{2}:\d{2}$/.test(h)).sort(); if (l.length) c.datas[data] = l; else delete c.datas[data]; });
        const hoje = U.hojeISO(); Object.keys(c.datas).forEach(k => { if (k < hoje) delete c.datas[k]; });
        tx.set(ref, { ativo: !!c.ativo, datas: c.datas, atualizado: agora() });
        return clone(c);
      });
    }),
    listarConversas: comErro(async ({ psiId } = {}) => {
      const { fs, db } = await fb();
      const col = fs.collection(db, 'agendamentos'), meu = psiDaSessao();
      const alvo = meu || psiId;
      const q = alvo ? fs.query(col, fs.where('psiId', '==', alvo), fs.where('tipo', '==', 'conhecer')) : fs.query(col, fs.where('tipo', '==', 'conhecer'));
      return (await fs.getDocs(q)).docs.map(d => d.data());
    }),
    livres15: comErro(async psiId => {
      const [conv, ags, pub] = await Promise.all([
        Firebase.obterConversas15(psiId),
        Firebase.listarAgendamentos({ psiId, de: U.hojeISO() }),
        fb().then(({ fs, db }) => fs.getDoc(fs.doc(db, 'agenda_publico', psiId))).catch(() => null)
      ]);
      const psi = pub && pub.exists() ? pub.data() : {};
      if (psi.ativo === false) return [];
      return calcLivres15(conv, ags.filter(a => a.psiId === psiId), psiId, psi.fuso);
    }),
    marcarConversa: comErro(async (id, { psiId, data, hora, linkMeet = '', por = '' }) => {
      const { fs, db } = await fb();
      const t = agora();
      /* antes da transação: limite por paciente e o horário ainda livre (sessões e conversas do dia) */
      const pedidoSnap = await fs.getDoc(fs.doc(db, 'conhecer', id));
      if (!pedidoSnap.exists()) throw new Error('Pedido não encontrado.');
      conferirLimite(await Firebase.listarConversas(), pedidoSnap.data().paciente, psiId);
      if (!(await Firebase.livres15(psiId)).some(x => x.data === data && x.hora === hora)) throw new Error('Esse horário de conversa acabou de ser ocupado. Escolha outro.');
      return await fs.runTransaction(db, async tx => {
        const cRef = fs.doc(db, 'conhecer', id);
        const cSnap = await tx.get(cRef);
        if (!cSnap.exists()) throw new Error('Pedido não encontrado.');
        const p = cSnap.data();
        if (p.agId) {
          const velho = await tx.get(fs.doc(db, 'agendamentos', p.agId));
          if (velho.exists() && velho.data().status === 'confirmado') throw new Error('Esta pessoa já tem uma conversa marcada. Desmarque antes de marcar outra.');
        }
        const pSnap = await tx.get(fs.doc(db, 'agenda_publico', psiId));
        const psi = pSnap.exists() ? pSnap.data() : null;
        if (!psi || !psi.ativo) throw new Error('Psicólogo não encontrado.');
        const dSnap = await tx.get(fs.doc(db, 'disponibilidade', psiId));
        const disp = dSnap.exists() ? dSnap.data() : { datas: {}, bloqueios: [] };
        /* trava o horário da conversa e os horários de sessão que cruzam com ela (o site não oferece a sessão por cima) */
        const dur = C.duracaoConhecer || 15, ini = minutos(hora);
        const horasTrava = [...new Set([hora, ...((disp.datas || {})[data] || []).filter(h => minutos(h) < ini + dur && minutos(h) + C.duracaoSessao > ini)])];
        const travaRefs = horasTrava.map(h => fs.doc(db, 'slots', slotId(psiId, data, h)));
        const travaSnaps = [];
        for (const r of travaRefs) travaSnaps.push(await tx.get(r));
        if (travaSnaps.some(x => x.exists() && ocupa(x.data(), t))) throw new Error('Esse horário acabou de ser ocupado. Escolha outro.');
        const a = {
          id: U.id('ag'), codigo: U.codigo(), grupo: U.id('g'), sessao: 1, totalSessoes: 1,
          psiId, data, hora, duracao: C.duracaoConhecer || 15, tipo: 'conhecer', valor: 0,
          paciente: { ...clone(p.paciente), nome: nomeProprio(p.paciente.nome) }, fuso: psi.fuso || U.FUSO_BR, fusoPaciente: psi.fuso || U.FUSO_BR,
          status: 'confirmado', criadoEm: t, expiraEm: null, confirmadoEm: t, linkMeet, psiCiente: false,
          conhecerId: p.id, resumo: resumoConhecer(p),
          historico: [{ em: t, texto: `Conversa de 15 min marcada por ${por}` }]
        };
        a.travas = horasTrava;
        horasTrava.forEach((h, k) => tx.set(travaRefs[k], { psiId, data, hora: h, status: 'confirmado', grupo: a.grupo, agId: a.id, expiraEm: null, conversa: true }));
        tx.set(fs.doc(db, 'agendamentos', a.id), a);
        tx.update(cRef, {
          status: 'marcada', agId: a.id, psiId, ...(p.contato ? {} : { contato: { em: t, por } }),
          historico: [...(p.historico || []), { em: t, texto: `Conversa marcada com ${psi.nome}: ${U.fmtCurta(data)}, ${U.fmtHora(hora)} (por ${por})` }]
        });
        return clone(a);
      });
    }),
    desmarcarConversa: comErro(async (id, por = '') => {
      const { fs, db } = await fb();
      const ref = fs.doc(db, 'conhecer', id);
      const s = await fs.getDoc(ref);
      if (!s.exists()) throw new Error('Pedido não encontrado.');
      const p = s.data();
      if (p.agId) await Firebase.cancelar([p.agId], por, 'conversa de 15 min desmarcada');
      const mud = { status: 'contato', agId: null, psiId: null, historico: [...(p.historico || []), { em: agora(), texto: `Conversa desmarcada (por ${por})` }] };
      await fs.updateDoc(ref, mud);
      return clone({ ...p, ...mud });
    }),
    criarPreReserva: comErro(async ({ psiId, data, hora, tipo = 'avulsa', paciente }) => {
      const nome = String(paciente?.nome || '').trim();
      const email = String(paciente?.email || '').trim();
      const whatsapp = U.whatsNormalizar(paciente?.whatsapp);   /* "+55…", "+351…" */
      if (nome.length < 3) throw new Error('Informe seu nome completo.');
      if (!U.emailValido(email)) throw new Error('Informe um e-mail válido.');
      if (!U.whatsValido(whatsapp)) throw new Error('Confira o WhatsApp: número com DDD (Brasil) ou com o código do país.');
      const { fs, db } = await NUVEM.firebase();
      const semanas = tipo === 'mensal' ? C.sessoesMensal : 1;
      const t = agora();
      const grupo = U.id('g');
      const codigo = U.codigo();
      const ocupado = new Error('Esse horário acabou de ser reservado por outra pessoa. Escolha outro, por favor.');
      return await fs.runTransaction(db, async tx => {
        const pSnap = await tx.get(fs.doc(db, 'agenda_publico', psiId));
        const psi = pSnap.exists() ? pSnap.data() : null;
        if (!psi || !psi.ativo) throw new Error('Psicólogo não encontrado.');
        if (psi.pausada) throw new Error('Este profissional está sem horários livres no momento.');
        const dSnap = await tx.get(fs.doc(db, 'disponibilidade', psiId));
        const disp = dSnap.exists() ? dSnap.data() : { datas: {}, bloqueios: [] };
        const datas = Array.from({ length: semanas }, (_, k) => U.addDias(data, 7 * k));
        const refs = datas.map(d => fs.doc(db, 'slots', slotId(psiId, d, hora)));
        const snaps = [];
        for (const r of refs) snaps.push(await tx.get(r));
        const slots = snaps.filter(s => s.exists()).map(s => s.data());
        if (!livresSemanas(psi, disp, slots, data, semanas, []).includes(hora)) throw ocupado;
        const valor = tipo === 'mensal' ? U.precoMensal(psi) / semanas : U.precoSessao(psi);
        const criados = datas.map((d, k) => ({
          id: U.id('ag'), codigo, grupo, sessao: k + 1, totalSessoes: semanas,
          psiId, data: d, hora, duracao: C.duracaoSessao,
          tipo, valor, paciente: { nome, email, whatsapp },
          fuso: psi.fuso || U.FUSO_BR, fusoPaciente: U.fusoValido(paciente?.fuso) ? paciente.fuso : (psi.fuso || U.FUSO_BR),
          aceite: { em: t, versao: C.termosVersao || '' },   /* marcou "Li e aceito os Termos de uso": quando e qual versão */
          status: 'pendente', criadoEm: t, expiraEm: Math.min(U.somarHorasEquipe(t, U.equipe().prazoHoras), t + 7 * 24 * 3600e3),
          confirmadoEm: null, linkMeet: '', psiCiente: false,
          historico: [{ em: t, texto: 'Pré-reserva feita pelo site' }]
        }));
        criados.forEach((a, k) => {
          tx.set(refs[k], { psiId, data: a.data, hora, status: 'pendente', grupo, agId: a.id, expiraEm: a.expiraEm });
          tx.set(fs.doc(db, 'agendamentos', a.id), a);
        });
        return clone(criados);
      });
    }),

    /* Equipe confirmou o pagamento → confirma todas as sessões do grupo */
    confirmarGrupo: comErro(async (grupo, { linkMeet, por }) => {
      const { fs, db } = await fb();
      const lista = (await Firebase.listarAgendamentos({ grupo })).filter(a => ['pendente', 'expirado'].includes(a.status));
      if (!lista.length) throw new Error('Nada para confirmar nesse agendamento.');
      /* v214: o suporte só confirma depois que o admin conferiu que o Pix caiu (a regra do Firestore também confere) */
      if (!ehAdmin() && !lista.every(a => a.conferencia && a.conferencia.status === 'caiu')) throw new Error('O pagamento só pode ser confirmado depois que o admin conferir que o Pix caiu na conta.');
      const t = agora();
      await fs.runTransaction(db, async tx => {
        const refsSlot = lista.map(a => fs.doc(db, 'slots', slotId(a.psiId, a.data, a.hora)));
        const snaps = [];
        for (const r of refsSlot) snaps.push(await tx.get(r));
        lista.forEach((a, k) => {
          const s = snaps[k].exists() ? snaps[k].data() : null;
          const passou = U.dataHora(a.data, a.hora, a.fuso).getTime() < t;
          const deOutro = s && s.agId !== a.id && ocupa(s, t);
          if (a.status === 'expirado' && (passou || deOutro)) throw new Error(`O horário ${U.fmtDDMM(a.data)} às ${U.fmtHora(a.hora)} já foi ocupado. Remarque antes de confirmar.`);
          if (deOutro) throw new Error(`O horário ${U.fmtDDMM(a.data)} às ${U.fmtHora(a.hora)} está com outra pessoa.`);
        });
        lista.forEach((a, k) => {
          a.status = 'confirmado'; a.confirmadoEm = t; a.expiraEm = null; a.linkMeet = linkMeet; a.psiCiente = false;
          a.historico = [...(a.historico || []), { em: t, texto: `Pagamento confirmado por ${por}` }];
          tx.update(fs.doc(db, 'agendamentos', a.id), { status: a.status, confirmadoEm: t, expiraEm: null, linkMeet, psiCiente: false, historico: a.historico });
          tx.set(refsSlot[k], { psiId: a.psiId, data: a.data, hora: a.hora, status: 'confirmado', grupo: a.grupo, agId: a.id, expiraEm: null });
        });
      });
      return clone(lista);
    }),

    atualizarStatus: comErro(async (id, status, por) => {
      const { fs, db } = await fb();
      const ref = fs.doc(db, 'agendamentos', id);
      return await fs.runTransaction(db, async tx => {
        const s = await tx.get(ref);
        if (!s.exists()) throw new Error('Agendamento não encontrado.');
        const a = s.data();
        const sref = fs.doc(db, 'slots', slotId(a.psiId, a.data, a.hora));
        const ss = await tx.get(sref);
        a.status = status;
        a.historico = [...(a.historico || []), { em: agora(), texto: `${U.STATUS[status]?.rotulo || status} (por ${por})` }];
        tx.update(ref, { status, historico: a.historico });
        if (ss.exists() && ss.data().agId === id) tx.update(sref, { status });
        return clone(a);
      });
    }),

    cancelar: comErro(async (ids, por, motivo = '') => {
      const { fs, db } = await fb();
      for (const id of ids) {
        const ref = fs.doc(db, 'agendamentos', id);
        await fs.runTransaction(db, async tx => {
          const s = await tx.get(ref);
          if (!s.exists()) return;
          const a = s.data();
          const sref = fs.doc(db, 'slots', slotId(a.psiId, a.data, a.hora));
          const ss = await tx.get(sref);
          const historico = [...(a.historico || []), { em: agora(), texto: `Cancelado por ${por}${motivo ? ': ' + motivo : ''}` }];
          /* v267: conversa de 15 min trava também os horários de sessão que cruzam com ela */
          const extras = (a.travas || []).filter(h => h !== a.hora).map(h => fs.doc(db, 'slots', slotId(a.psiId, a.data, h)));
          const extrasSnap = [];
          for (const r of extras) extrasSnap.push(await tx.get(r));
          tx.update(ref, { status: 'cancelado', historico });
          if (ss.exists() && ss.data().agId === id) tx.update(sref, { status: 'cancelado' });
          extrasSnap.forEach((x, k) => { if (x.exists() && x.data().agId === id) tx.update(extras[k], { status: 'cancelado' }); });
        });
      }
    }),

    marcarCiente: comErro(async (id, nome) => {
      const { fs, db } = await fb();
      const ref = fs.doc(db, 'agendamentos', id);
      const s = await fs.getDoc(ref);
      if (!s.exists()) throw new Error('Agendamento não encontrado.');
      const a = s.data();
      a.psiCiente = true;
      a.historico = [...(a.historico || []), { em: agora(), texto: `${nome} confirmou que está ciente` }];
      await fs.updateDoc(ref, { psiCiente: true, historico: a.historico });
      return clone(a);
    }),

    marcarRepasse: comErro(async (ids, pago, por) => {
      if (!ehAdmin()) throw new Error('Só o administrador marca repasses.');
      const { fs, db } = await fb();
      for (const id of ids) {
        const ref = fs.doc(db, 'agendamentos', id), s = await fs.getDoc(ref);
        if (!s.exists()) continue;
        const a = s.data(), ps = await fs.getDoc(fs.doc(db, 'psicologos_agenda', a.psiId)), psi = ps.exists() ? ps.data() : {};
        const repasse = pago ? { pagoEm: agora(), por, valor: Math.round(a.valor * (1 - (Number(psi.comissao) || 0) / 100) * 100) / 100, pix: psi.pix || '' } : null;
        await fs.updateDoc(ref, { repasse, historico: [...(a.historico || []), { em: agora(), texto: pago ? `Repasse ao psicólogo pago (por ${por})` : `Repasse desmarcado (por ${por})` }] });
      }
    }),
    /* Conferir o Pix: suporte pede (segura a pré-reserva por mais 2 h da equipe, também no slot do site); admin responde */
    pedirConferencia: comErro(async (grupo, por) => {
      const { fs, db } = await fb();
      const l = (await Firebase.listarAgendamentos({ grupo })).filter(a => a.status === 'pendente');
      if (!l.length) throw new Error('Essa pré-reserva não está mais esperando pagamento.');
      const t = agora(), segura = U.somarHorasEquipe(t, 2), lote = fs.writeBatch(db);
      l.forEach(a => {
        const exp = a.expiraEm && a.expiraEm < segura ? segura : a.expiraEm;
        a.conferencia = { status: 'pedida', pedidoEm: t, pedidoPor: por };
        a.historico = [...(a.historico || []), { em: t, texto: `Conferência do Pix pedida ao administrador (por ${por})` }];
        lote.update(fs.doc(db, 'agendamentos', a.id), { conferencia: a.conferencia, expiraEm: exp, historico: a.historico });
        if (exp !== a.expiraEm) lote.set(fs.doc(db, 'slots', slotId(a.psiId, a.data, a.hora)), { expiraEm: exp }, { merge: true });
        a.expiraEm = exp;
      });
      await lote.commit();
      return clone(l);
    }),
    /* v209: a equipe marcou que já mandou a 1ª mensagem no WhatsApp (todos da equipe veem) */
    marcarMensagemEnviada: comErro(async (grupo, por, campo = 'mensagem') => {   /* v217: campo 'pixEnviado' marca o Pix enviado */
      const { fs, db } = await fb();
      const pix = campo === 'pixEnviado', k = pix ? 'pixEnviado' : 'mensagem';
      const l = (await Firebase.listarAgendamentos({ grupo })).filter(a => a.status === 'pendente');
      if (!l.length) return [];
      const t = agora(), lote = fs.writeBatch(db);
      l.forEach(a => {
        a[k] = { em: t, por };
        a.historico = [...(a.historico || []), { em: t, texto: pix ? `Pix enviado ao paciente (por ${por})` : `Mensagem no WhatsApp enviada ao paciente (por ${por})` }];
        lote.update(fs.doc(db, 'agendamentos', a.id), { [k]: a[k], historico: a.historico });
      });
      await lote.commit();
      return clone(l);
    }),
    responderConferencia: comErro(async (grupo, caiu, por) => {
      const { fs, db } = await fb();
      const l = (await Firebase.listarAgendamentos({ grupo })).filter(a => ['pendente', 'expirado'].includes(a.status));
      if (!l.length) throw new Error('Essa pré-reserva já foi tratada.');
      const t = agora(), lote = fs.writeBatch(db);
      l.forEach(a => {
        a.conferencia = { ...(a.conferencia || {}), status: caiu ? 'caiu' : 'nao', respEm: t, respPor: por };
        a.historico = [...(a.historico || []), { em: t, texto: caiu ? `Administrador conferiu: o Pix caiu na conta (por ${por})` : `Administrador conferiu: o Pix NÃO caiu na conta (por ${por})` }];
        lote.update(fs.doc(db, 'agendamentos', a.id), { conferencia: a.conferencia, historico: a.historico });
      });
      await lote.commit();
      return clone(l);
    }),
    marcarLembrete: comErro(async (id, tipo, por) => {
      const { fs, db } = await fb();
      const ref = fs.doc(db, 'agendamentos', id);
      const s = await fs.getDoc(ref);
      if (!s.exists()) throw new Error('Agendamento não encontrado.');
      const a = s.data();
      a.lembretes = { ...(a.lembretes || {}), [tipo]: agora() };
      a.historico = [...(a.historico || []), { em: agora(), texto: { paciente: 'Lembrete enviado ao paciente', psicologo: 'Lembrete enviado ao psicólogo', renovacao: 'Renovação do plano oferecida ao paciente', horario: 'Horário e link da conversa enviados ao paciente' }[tipo] + ` (por ${por})` }];
      await fs.updateDoc(ref, { lembretes: a.lembretes, historico: a.historico });
      return clone(a);
    }),

    /* ---------- pacientes: observações da equipe (coleção "pacientes", só equipe) ---------- */
    listarPacientesExtra: comErro(async () => {
      const { fs, db } = await fb();
      const s = await fs.getDocs(fs.collection(db, 'pacientes'));
      const r = {}; s.forEach(x => { r[x.id] = x.data(); }); return r;
    }),
    salvarPacienteObs: comErro(async (chave, obs, por) => {
      const { fs, db } = await fb();
      const dados = { obs: String(obs || '').slice(0, 2000), obsPor: por, obsEm: agora() };
      await fs.setDoc(fs.doc(db, 'pacientes', chave), dados, { merge: true }); return dados;
    }),
    excluirPaciente: comErro(async (agIds, chaves, por) => {
      const { fs, db } = await fb();
      for (const id of agIds) {
        const ref = fs.doc(db, 'agendamentos', id), s = await fs.getDoc(ref);
        if (!s.exists()) continue;
        const historico = [...(s.data().historico || []), { em: agora(), texto: `Dados do paciente excluídos (por ${por})` }];
        await fs.updateDoc(ref, { paciente: { nome: 'Paciente removido', email: '', whatsapp: '' }, lembretes: {}, historico });
      }
      for (const k of chaves) { try { await fs.deleteDoc(fs.doc(db, 'pacientes', k)); } catch (e) { /* não existia */ } }
    }),
    marcarContatoPaciente: comErro(async (chave, agId) => {
      const { fs, db } = await fb();
      const ref = fs.doc(db, 'pacientes', chave), s = await fs.getDoc(ref), p = s.exists() ? s.data() : {};
      const pedidos = { ...(p.pedidos || {}), [agId]: agora() };
      await fs.setDoc(ref, { pedidos }, { merge: true }); return { ...p, pedidos };
    }),

    remarcar: comErro(async (id, data, hora, por) => {
      const { fs, db } = await fb();
      const ref = fs.doc(db, 'agendamentos', id);
      return await fs.runTransaction(db, async tx => {
        const s = await tx.get(ref);
        if (!s.exists()) throw new Error('Agendamento não encontrado.');
        const a = s.data();
        const pSnap = await tx.get(fs.doc(db, 'agenda_publico', a.psiId));
        const dSnap = await tx.get(fs.doc(db, 'disponibilidade', a.psiId));
        const novoRef = fs.doc(db, 'slots', slotId(a.psiId, data, hora));
        const velhoRef = fs.doc(db, 'slots', slotId(a.psiId, a.data, a.hora));
        const novo = await tx.get(novoRef);
        const velho = await tx.get(velhoRef);
        const psi = pSnap.exists() ? pSnap.data() : null;
        const disp = dSnap.exists() ? dSnap.data() : { datas: {}, bloqueios: [] };
        if (!livresNoDia(psi, disp, novo.exists() ? [novo.data()] : [], data, [a.id]).includes(hora)) throw new Error('Esse horário não está livre.');
        const antes = `${U.fmtDDMM(a.data)} às ${U.fmtHora(a.hora)}`;
        /* sessão que estava como Falta (ou Realizado) e foi remarcada: volta a ser Confirmada no novo horário */
        const era = ['falta', 'realizado'].includes(a.status) ? a.status : null;
        if (era) a.status = 'confirmado';
        if (velho.exists() && velho.data().agId === id) tx.update(velhoRef, { status: 'cancelado' });
        tx.set(novoRef, { psiId: a.psiId, data, hora, status: OCUPA.includes(a.status) ? a.status : 'confirmado', grupo: a.grupo, agId: a.id, expiraEm: a.status === 'pendente' ? a.expiraEm : null });
        a.data = data; a.hora = hora; a.psiCiente = false;
        a.historico = [...(a.historico || []), { em: agora(), texto: `Remarcado de ${antes} para ${U.fmtDDMM(data)} às ${U.fmtHora(hora)} por ${por}${era ? ` (estava como ${era === 'falta' ? 'Falta' : 'Realizado'}; voltou para Confirmado)` : ''}` }];
        tx.update(ref, { data, hora, psiCiente: false, historico: a.historico, ...(era ? { status: 'confirmado' } : {}) });
        return clone(a);
      });
    }),

    /* ---------- e-mails ----------
       Ficam na coleção "mail". Com a função de e-mail instalada (pasta
       functions/, passo 12 do guia), o Firebase envia sozinho pelo SMTP de
       Configurações. Sem ela, aparecem em "E-mails enviados" para conferir. */
    registrarEmail: comErro(async ({ para, assunto, corpo, agId = null }) => {
      if (!ehEquipe()) return;   /* paciente no site não grava e-mails */
      const { fs, db } = await fb();
      await fs.addDoc(fs.collection(db, 'mail'), {
        to: para, message: { subject: assunto, text: corpo },
        para, assunto, corpo, agId, em: agora()
      });
    }),
    listarCaixaSaida: comErro(async () => {
      const { fs, db } = await fb();
      const s = await fs.getDocs(fs.collection(db, 'mail'));
      return s.docs.map(d => {
        const x = d.data();
        const estado = x.delivery && x.delivery.state;
        return { id: d.id, para: x.para || x.to, assunto: x.assunto || (x.message || {}).subject || '', corpo: x.corpo || (x.message || {}).text || '', agId: x.agId || null, em: x.em || 0, estado: estado || '' };
      }).sort((a, b) => b.em - a.em).slice(0, 200);
    }),
    limparCaixaSaida: comErro(async () => {
      if (!ehAdmin()) throw new Error('Só o administrador pode limpar a lista.');
      const { fs, db } = await fb();
      const s = await fs.getDocs(fs.collection(db, 'mail'));
      for (let i = 0; i < s.docs.length; i += 400) {
        const lote = fs.writeBatch(db);
        s.docs.slice(i, i + 400).forEach(d => lote.delete(d.ref));
        await lote.commit();
      }
    }),

    /* ---------- relatório de repasse ---------- */
    relatorioMes: comErro(async (mes, { psiId } = {}) => {
      const { fs, db } = await fb();
      const meu = psiDaSessao();
      let psis, ags;
      if (meu) {
        const p = await Firebase.obterPsicologo(meu);
        psis = p ? [p] : [];
        const s = await fs.getDocs(fs.query(fs.collection(db, 'agendamentos'), fs.where('psiId', '==', meu)));
        ags = s.docs.map(d => d.data());
      } else {
        psis = await Firebase.listarPsicologos({ todos: true });
        const s = await fs.getDocs(fs.query(fs.collection(db, 'agendamentos'), fs.where('data', '>=', mes + '-01'), fs.where('data', '<=', mes + '-31')));
        ags = s.docs.map(d => d.data());
      }
      const alvo = psiId || meu;
      const doMes = ags.filter(a => a.data.startsWith(mes) && (!alvo || a.psiId === alvo) && a.tipo !== 'conhecer');   /* conversa de 15 min não entra no financeiro */
      return psis
        .filter(p => !alvo || p.id === alvo)
        .map(p => {
          const meus = doMes.filter(a => a.psiId === p.id);
          const feitas = meus.filter(a => FATURA.includes(a.status));
          const previstas = meus.filter(a => a.status === 'confirmado');
          const faturado = feitas.reduce((s, a) => s + a.valor, 0);
          const pct = Number(p.comissao ?? C.comissaoPadrao);
          const comissao = faturado * (pct / 100);
          return {
            psiId: p.id, nome: p.nome, comissaoPct: pct,
            realizadas: meus.filter(a => a.status === 'realizado').length,
            faltas: meus.filter(a => a.status === 'falta').length,
            faturado, comissao, repasse: faturado - comissao,
            previstas: previstas.length,
            valorPrevisto: previstas.reduce((s, a) => s + a.valor, 0) * (1 - pct / 100)
          };
        })
        .filter(r => alvo || r.faturado || r.previstas);
    }),

    async resetarDemo() { throw new Error('Com o Firebase não existem dados de exemplo para apagar.'); },

    /* Avisa a tela quando algo muda no banco (ex.: paciente marcou no site) */
    aoMudar(cb) {
      const s = sessao();
      if (!s) return;   /* site (paciente): sem escuta contínua */
      let t = null;
      const avisar = () => { clearTimeout(t); t = setTimeout(cb, 400); };
      fb().then(({ fs, db }) => {
        const col = fs.collection(db, 'agendamentos');
        const q = s.papel === 'psicologo'
          ? fs.query(col, fs.where('psiId', '==', s.id))
          : fs.query(col, fs.where('data', '>=', U.addDias(U.hojeISO(), -1)));
        let primeira = true;
        fs.onSnapshot(q, () => { if (primeira) { primeira = false; return; } avisar(); }, e => console.warn('aoMudar', e));
      }).catch(e => console.warn('aoMudar', e));
    }
  };

  /* ------------------------------------------------------------------
     EQUIPE E ACESSOS (atalhos do administrador, usados em Configurações)
     ------------------------------------------------------------------ */
  /* O administrador principal: o que tem principal: true, ou o administrador mais antigo */
  function marcarPrincipal(lista) {
    const adms = lista.filter(u => u.papel === 'admin');
    const p = adms.find(u => u.principal === true) || adms.slice().sort((a, b) => (a.criadoEm || 0) - (b.criadoEm || 0))[0];
    return lista.map(u => ({ ...u, principal: !!p && u.uid === p.uid }));
  }
  /* A equipe define uma senha nova para o psicólogo (ex.: esqueceu a senha).
     O navegador não pode mudar a senha de outra pessoa: o pedido vai para trocas_senha/{id}
     e a função do Firebase (functions/) troca a senha e apaga a senha do pedido. */
  /* Pedido para a função do Firebase (functions/) trocar a senha e/ou o e-mail de login de outra pessoa.
     O navegador não pode fazer isso direto; a função confere quem pediu e apaga a senha do pedido. */
  async function pedirTroca(pedido) {
    const { fs, db } = await fb();
    const s = sessao();
    const ref = await fs.addDoc(fs.collection(db, 'trocas_senha'), { ...pedido, status: 'pendente', por: (s && s.uid) || '', em: Date.now() });
    const fim = Date.now() + 30000;
    while (Date.now() < fim) {
      await new Promise(r => setTimeout(r, 1200));
      const d = await fs.getDoc(ref);
      const x = d.exists() ? d.data() : {};
      if (x.status === 'ok') return;
      if (x.status === 'erro') throw new Error('Não consegui fazer a troca: ' + (x.erro || 'erro desconhecido'));
    }
    throw new Error('O Firebase não respondeu. Confira se a função foi instalada/atualizada (passo 12.2 do guia) ou use “Enviar link de nova senha”.');
  }
  Firebase.definirSenhaPsicologo = comErro(async (psiId, senha) => {
    if (!ehEquipe()) throw new Error('Só a equipe pode trocar senhas.');
    if (!senha || senha.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
    const { fs, db } = await fb();
    const ag = await fs.getDoc(fs.doc(db, 'psicologos_agenda', psiId));
    const uid = ag.exists() ? ag.data().uid : null;
    if (!uid) throw new Error('Este psicólogo ainda não tem login.');
    await pedirTroca({ uid, psiId, senha });
  });
  /* Troca da chave Pix pelo próprio psicólogo, com código no e-mail.
     O navegador só PEDE (coleção trocas_pix); a função do Firebase gera o código,
     manda o e-mail, confere o código e troca a chave. O código nunca passa pelo navegador. */
  const PEDIDO_PIX = {};
  async function esperarPix(ref, estados) {
    const { fs } = await fb();
    const fim = Date.now() + 30000;
    while (Date.now() < fim) {
      await new Promise(r => setTimeout(r, 1200));
      const d = await fs.getDoc(ref); const x = d.exists() ? d.data() : {};
      if (estados.includes(x.status)) return x;
    }
    throw new Error('O Firebase não respondeu. Confira se a função foi atualizada (passo 12.2 do guia).');
  }
  Firebase.pedirCodigoPix = comErro(async (psiId, { pix, pixTipo }) => {
    if (!ehEquipe()) throw new Error('A chave Pix é trocada pela equipe.');   /* a função confere: admin ou suporte com "Psicólogos (completo)" */
    const n = U.pixNormalizar(pixTipo, pix);
    if (!n.ok || !n.valor) throw new Error(n.erro || 'Chave Pix inválida.');
    const { fs, db } = await fb(); const s = sessao();
    const ref = await fs.addDoc(fs.collection(db, 'trocas_pix'), { psiId, pix: n.valor, pixTipo, status: 'pendente', por: s.uid, em: Date.now() });
    const x = await esperarPix(ref, ['codigo_enviado', 'erro']);
    if (x.status === 'erro') throw new Error(x.erro || 'Não consegui mandar o código.');
    PEDIDO_PIX[psiId] = ref;
    return { email: x.emailMasc || '' };
  });
  Firebase.confirmarCodigoPix = comErro(async (psiId, codigo) => {
    const ref = PEDIDO_PIX[psiId];
    if (!ref) throw new Error('Peça um código novo.');
    const { fs } = await fb();
    await fs.updateDoc(ref, { codigo: String(codigo || '').trim(), status: 'conferindo' });
    const x = await esperarPix(ref, ['ok', 'codigo_errado', 'erro']);
    if (x.status === 'ok') { delete PEDIDO_PIX[psiId]; return { pix: x.pix, pixTipo: x.pixTipo }; }
    if (x.status === 'erro') delete PEDIDO_PIX[psiId];
    throw new Error(x.erro || 'Código incorreto. Confira no e-mail.');
  });

  /* o psicólogo ainda usa a senha padrão (nome + 123)? */
  Firebase.senhaPadraoAtiva = comErro(async () => {
    const x = await NUVEM.authPronta();
    const u = x.auth.currentUser; if (!u) return false;
    const d = await x.fs.getDoc(x.fs.doc(x.db, 'usuarios', u.uid));
    return !!(d.exists() && d.data().senhaPadrao);
  });
  /* quem está logado (psicólogo ou equipe) está com senha provisória? */
  Firebase.minhaSenhaProvisoria = Firebase.senhaPadraoAtiva;
  /* troca a provisória pela senha da pessoa, logo depois de entrar */
  Firebase.trocarSenhaProvisoria = nova => Firebase.alterarSenha(null, null, nova);

  Firebase.equipe = {
    listar: comErro(async () => {
      const { fs, db } = await fb();
      const s = await fs.getDocs(fs.collection(db, 'usuarios'));
      return marcarPrincipal(s.docs.map(d => ({ uid: d.id, ...d.data() })).sort((a, b) => (a.nome || '').localeCompare(b.nome || '')));
    }),
    /* Excluir: só suporte e administradores (nunca você mesmo nem o administrador principal).
       Psicólogos não são excluídos aqui: desative o acesso e oculte o perfil em Perfis.
       A conta de login some sozinha se a função de e-mail/contas estiver instalada (functions/). */
    excluir: comErro(async uid => {
      if (!ehAdmin()) throw new Error('Só o administrador pode excluir usuários.');
      const s = sessao();
      if (s && s.uid === uid) throw new Error('Você não pode excluir o seu próprio acesso.');
      const { fs, db } = await fb();
      const lista = marcarPrincipal((await fs.getDocs(fs.collection(db, 'usuarios'))).docs.map(d => ({ uid: d.id, ...d.data() })));
      const u = lista.find(x => x.uid === uid);
      if (!u) throw new Error('Usuário não encontrado.');
      if (u.papel === 'psicologo') throw new Error('Psicólogos não são excluídos: desative o acesso.');
      if (u.principal) throw new Error('O administrador principal não pode ser excluído.');
      await fs.deleteDoc(fs.doc(db, 'usuarios', uid));
    }),
    criar: comErro(async ({ nome, email, senha, papel }) => {
      if (!ehAdmin()) throw new Error('Só o administrador pode criar acessos.');
      if (!['admin', 'suporte'].includes(papel)) throw new Error('Papel inválido.');
      if (!String(nome || '').trim()) throw new Error('Coloque o nome.');
      email = String(email || '').trim().toLowerCase();
      if (!U.emailValido(email)) throw new Error('Coloque um e-mail válido.');
      if (!senha || senha.length < 8) throw new Error('Senha inicial: pelo menos 8 caracteres.');
      const uid = await criarContaLogin(email, senha);
      const { fs, db } = await fb();
      await fs.setDoc(fs.doc(db, 'usuarios', uid), { papel, nome: nome.trim(), email, ativo: true, senhaPadrao: true, criadoEm: agora() });
      return uid;
    }),
    /* corrigir nome e e-mail (administrador ou suporte; nunca você mesmo nem o principal).
       E-mail novo = login novo: a função do Firebase troca o e-mail da conta de login. */
    /* nome, e-mail, papel (suporte ⇄ administrador) e acessos extras do suporte.
       Papel e administradores: só o principal (as regras do banco conferem o campo principal: true). */
    editar: comErro(async (uid, { nome, email, papel, extras }) => {
      if (!ehAdmin()) throw new Error('Só o administrador pode editar usuários.');
      const s = sessao();
      if (s && s.uid === uid) throw new Error('Para mudar os seus dados, use Minha conta.');
      if (!String(nome || '').trim()) throw new Error('Coloque o nome.');
      email = String(email || '').trim().toLowerCase();
      if (!U.emailValido(email)) throw new Error('Coloque um e-mail válido.');
      const { fs, db } = await fb();
      const ref = fs.doc(db, 'usuarios', uid), d = await fs.getDoc(ref);
      if (!d.exists() || !['admin', 'suporte'].includes(d.data().papel)) throw new Error('Só administradores e suporte são editados aqui.');
      if (d.data().principal === true) throw new Error('O administrador principal muda os próprios dados em Minha conta.');
      papel = papel || d.data().papel;
      if (!['admin', 'suporte'].includes(papel)) throw new Error('Papel inválido.');
      const lista = marcarPrincipal((await fs.getDocs(fs.collection(db, 'usuarios'))).docs.map(x => ({ uid: x.id, ...x.data() })));
      const souPrincipal = !!lista.find(x => x.principal && s && x.uid === s.uid);
      if ((d.data().papel === 'admin' || papel !== d.data().papel) && !souPrincipal) throw new Error('Só o administrador principal muda administradores e o papel de alguém.');
      const OK = ['psicologos', 'pacientes', 'artigos', 'financeiro'], ANT = { psiResumo: 'psicologos', financeiroPagar: 'financeiro' };
      const ex = papel === 'suporte' ? [...new Set((Array.isArray(extras) ? extras : (d.data().extras || [])).map(k => ANT[k] || k).filter(k => OK.includes(k)))] : [];
      if (String(d.data().email || '').toLowerCase() !== email) await pedirTroca({ uid, email });
      await fs.updateDoc(ref, { nome: nome.trim(), email, papel, extras: ex, atualizado: agora() });
    }),
    /* senha provisória definida pelo administrador: no próximo login a pessoa cria a dela */
    senhaProvisoria: comErro(async (uid, senha) => {
      if (!ehAdmin()) throw new Error('Só o administrador pode definir senhas.');
      const s = sessao();
      if (s && s.uid === uid) throw new Error('Para trocar a sua senha, use Minha conta.');
      if (!senha || senha.length < 8) throw new Error('A senha provisória precisa ter pelo menos 8 caracteres.');
      await pedirTroca({ uid, senha });
    }),
    ativar: comErro(async (uid, ativo) => {
      if (!ehAdmin()) throw new Error('Só o administrador pode mudar acessos.');
      const s = sessao();
      if (s && s.uid === uid && !ativo) throw new Error('Você não pode desligar o seu próprio acesso.');
      const { fs, db } = await fb();
      const ref = fs.doc(db, 'usuarios', uid);
      const d = await fs.getDoc(ref);
      if (!ativo && d.exists() && d.data().principal === true) throw new Error('O administrador principal não pode ser desativado.');
      await fs.updateDoc(ref, { ativo: !!ativo, atualizado: agora() });
      const psiId = d.exists() ? d.data().psiId : null;
      if (psiId) {
        await fs.updateDoc(fs.doc(db, 'psicologos_agenda', psiId), { ativo: !!ativo });
        await fs.updateDoc(fs.doc(db, 'agenda_publico', psiId), { ativo: !!ativo });
      }
    }),
    novaSenha: comErro(async email => {
      const x = await NUVEM.authPronta();
      await x.authMod.sendPasswordResetEmail(x.auth, email);
    })
  };

  /* Minha conta da equipe (painel/conta.html): nome e e-mail do próprio usuário */
  Firebase.minhaConta = {
    obter: comErro(async () => {
      const x = await NUVEM.authPronta();
      const u = x.auth.currentUser; if (!u) return null;
      const d = await x.fs.getDoc(x.fs.doc(x.db, 'usuarios', u.uid));
      const p = d.exists() ? d.data() : {};
      return { nome: p.nome || '', email: u.email || p.email || '', papel: p.papel, principal: p.principal === true };
    }),
    /* nome e e-mail: só o administrador principal (principal: true) muda os próprios */
    salvar: comErro(async (_id, { nome, email }) => {
      const x = await NUVEM.authPronta();
      const u = x.auth.currentUser; if (!u) throw new Error('Entre de novo.');
      const eu = await x.fs.getDoc(x.fs.doc(x.db, 'usuarios', u.uid));
      if (!eu.exists() || eu.data().principal !== true) throw new Error('Nome e e-mail só um administrador muda, em Usuários.');
      if (!String(nome || '').trim()) throw new Error('Coloque o nome.');
      email = String(email || '').trim().toLowerCase();
      if (!U.emailValido(email)) throw new Error('Coloque um e-mail válido.');
      let aviso = '';
      await x.fs.updateDoc(x.fs.doc(x.db, 'usuarios', u.uid), { nome: nome.trim() });
      if (email !== String(u.email || '').toLowerCase()) {
        try { await x.authMod.verifyBeforeUpdateEmail(u, email); }
        catch (e) {
          if (e && e.code === 'auth/requires-recent-login') throw new Error('Por segurança, saia e entre de novo para trocar o e-mail.');
          if (e && e.code === 'auth/email-already-in-use') throw new Error('Esse e-mail já é usado em outra conta.');
          throw e;
        }
        aviso = `Nome salvo. Mandamos um link para ${email}: o e-mail de login muda quando você clicar nele.`;
      }
      return { aviso };
    })
  };

  Firebase.modo = 'firebase';
  window.DB = Firebase;
})();
