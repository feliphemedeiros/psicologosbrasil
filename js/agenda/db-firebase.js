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
    const limite = t + C.antecedenciaMinHoras * 3600e3;
    return ((disp.datas || {})[data] || [])
      .filter(h => !bloqueadas.has(h) && !ocupadas.has(h) && U.dataHora(data, h).getTime() > limite)
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
        fs.where(fs.documentId(), '>=', `${psiId}__${U.hojeISO()}`),
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
        whatsapp: U.digitos(dados.whatsapp || (antes && antes.whatsapp) || ''),
        usuario: String(dados.usuario || (antes && antes.usuario) || '').trim().toLowerCase(),
        comissao: Number(dados.comissao ?? (antes && antes.comissao) ?? C.comissaoPadrao),
        valor: Number(dados.valor ?? (antes && antes.valor) ?? C.valorPadrao),
        valorMensal: Number(dados.valorMensal ?? (antes && antes.valorMensal) ?? 0) || null,
        ativo: dados.ativo !== false, doisFatores: true, atualizado: agora(),
        pausada: !!(dados.pausada ?? (antes && antes.pausada) ?? false)
      };
      const pub = { id, nome: p.nome, crp: p.crp, abordagem: p.abordagem, ativo: p.ativo, pausada: p.pausada, valor: p.valor, valorMensal: p.valorMensal };
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
      if (dados.email !== undefined) mud.email = String(dados.email).trim().toLowerCase();
      if (dados.whatsapp !== undefined) mud.whatsapp = U.digitos(dados.whatsapp);
      let aviso = '';
      if (ehEquipe()) {
        if (dados.nome !== undefined) mud.nome = String(dados.nome).trim();
        if (dados.crp !== undefined) mud.crp = String(dados.crp).trim();
        await fs.updateDoc(ref, mud);
        const pub = {}; if (mud.nome) pub.nome = mud.nome; if (mud.crp !== undefined) pub.crp = mud.crp;
        if (Object.keys(pub).length) await fs.updateDoc(fs.doc(db, 'agenda_publico', psiId), pub);
        if (antes.uid && mud.nome) await fs.updateDoc(fs.doc(db, 'usuarios', antes.uid), { nome: mud.nome });
        if (mud.email && mud.email !== antes.email) aviso = 'Dados salvos. O e-mail de login continua o antigo: só a própria pessoa troca, em Minha conta.';
      } else {
        if (psiDaSessao() !== psiId) throw new Error('Sem permissão.');
        const trocouEmail = mud.email && mud.email !== antes.email;
        if (trocouEmail) {
          const x = await NUVEM.authPronta();
          try { await x.authMod.verifyBeforeUpdateEmail(x.auth.currentUser, mud.email); }
          catch (e) {
            if (e && e.code === 'auth/requires-recent-login') throw new Error('Por segurança, saia e entre de novo para trocar o e-mail.');
            if (e && e.code === 'auth/email-already-in-use') throw new Error('Esse e-mail já é usado em outra conta.');
            throw e;
          }
          aviso = `Mandamos um link para ${mud.email}. O e-mail de login muda quando você clicar nele.`;
        }
        await fs.updateDoc(ref, mud);
        if (trocouEmail && antes.uid) { try { await fs.updateDoc(fs.doc(db, 'usuarios', antes.uid), { email: mud.email }); } catch (e) { /* só exibição */ } }
      }
      return { aviso };
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
    diasComHorario: comErro(async (psiId, { semanas = 1 } = {}) => {
      const b = await lerBase(psiId);
      if (b.psi && b.psi.pausada) return [];   /* agenda online desligada no perfil */
      const hoje = U.hojeISO();
      const dias = [];
      for (let i = 0; i < C.diasVisiveis; i++) {
        const data = U.addDias(hoje, i);
        const horas = livresSemanas(b.psi, b.disp, b.slots, data, semanas, []);
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
    criarPreReserva: comErro(async ({ psiId, data, hora, tipo = 'avulsa', paciente }) => {
      const nome = String(paciente?.nome || '').trim();
      const email = String(paciente?.email || '').trim();
      const whatsapp = U.digitos(paciente?.whatsapp);
      if (nome.length < 3) throw new Error('Informe seu nome completo.');
      if (!U.emailValido(email)) throw new Error('Informe um e-mail válido.');
      if (!U.whatsValido(whatsapp)) throw new Error('Informe um WhatsApp com DDD.');
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
          status: 'pendente', criadoEm: t, expiraEm: t + C.expiracaoPreReservaHoras * 3600e3,
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
      const t = agora();
      await fs.runTransaction(db, async tx => {
        const refsSlot = lista.map(a => fs.doc(db, 'slots', slotId(a.psiId, a.data, a.hora)));
        const snaps = [];
        for (const r of refsSlot) snaps.push(await tx.get(r));
        lista.forEach((a, k) => {
          const s = snaps[k].exists() ? snaps[k].data() : null;
          const passou = U.dataHora(a.data, a.hora).getTime() < t;
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
          tx.update(ref, { status: 'cancelado', historico });
          if (ss.exists() && ss.data().agId === id) tx.update(sref, { status: 'cancelado' });
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
        if (velho.exists() && velho.data().agId === id) tx.update(velhoRef, { status: 'cancelado' });
        tx.set(novoRef, { psiId: a.psiId, data, hora, status: OCUPA.includes(a.status) ? a.status : 'confirmado', grupo: a.grupo, agId: a.id, expiraEm: a.status === 'pendente' ? a.expiraEm : null });
        a.data = data; a.hora = hora; a.psiCiente = false;
        a.historico = [...(a.historico || []), { em: agora(), texto: `Remarcado de ${antes} para ${U.fmtDDMM(data)} às ${U.fmtHora(hora)} por ${por}` }];
        tx.update(ref, { data, hora, psiCiente: false, historico: a.historico });
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
      const doMes = ags.filter(a => a.data.startsWith(mes) && (!alvo || a.psiId === alvo));
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
  Firebase.definirSenhaPsicologo = comErro(async (psiId, senha) => {
    if (!ehEquipe()) throw new Error('Só a equipe pode trocar senhas.');
    if (!senha || senha.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
    const { fs, db } = await fb();
    const ag = await fs.getDoc(fs.doc(db, 'psicologos_agenda', psiId));
    const uid = ag.exists() ? ag.data().uid : null;
    if (!uid) throw new Error('Este psicólogo ainda não tem login.');
    const s = sessao();
    const ref = await fs.addDoc(fs.collection(db, 'trocas_senha'), { uid, psiId, senha, status: 'pendente', por: (s && s.uid) || '', em: Date.now() });
    const fim = Date.now() + 30000;
    while (Date.now() < fim) {
      await new Promise(r => setTimeout(r, 1200));
      const d = await fs.getDoc(ref);
      const x = d.exists() ? d.data() : {};
      if (x.status === 'ok') return;
      if (x.status === 'erro') throw new Error('Não consegui trocar a senha: ' + (x.erro || 'erro desconhecido'));
    }
    throw new Error('O Firebase não respondeu. Confira se a função foi instalada/atualizada (passo 12.2 do guia) ou use “Enviar link de nova senha por e-mail”.');
  });
  /* o psicólogo ainda usa a senha padrão (nome + 123)? */
  Firebase.senhaPadraoAtiva = comErro(async () => {
    const x = await NUVEM.authPronta();
    const u = x.auth.currentUser; if (!u) return false;
    const d = await x.fs.getDoc(x.fs.doc(x.db, 'usuarios', u.uid));
    return !!(d.exists() && d.data().senhaPadrao);
  });

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
      await fs.setDoc(fs.doc(db, 'usuarios', uid), { papel, nome: nome.trim(), email, ativo: true, criadoEm: agora() });
      return uid;
    }),
    ativar: comErro(async (uid, ativo) => {
      if (!ehAdmin()) throw new Error('Só o administrador pode mudar acessos.');
      const s = sessao();
      if (s && s.uid === uid && !ativo) throw new Error('Você não pode desligar o seu próprio acesso.');
      const { fs, db } = await fb();
      const ref = fs.doc(db, 'usuarios', uid);
      const d = await fs.getDoc(ref);
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
      return { nome: p.nome || '', email: u.email || p.email || '', papel: p.papel };
    }),
    salvar: comErro(async (_id, { nome, email }) => {
      const x = await NUVEM.authPronta();
      const u = x.auth.currentUser; if (!u) throw new Error('Entre de novo.');
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
