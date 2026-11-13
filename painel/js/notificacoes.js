/* =====================================================================
   TOPO DO PAINEL: SININHO DE NOTIFICAÇÕES + MENU DA CONTA
   - O sininho mostra só o que precisa de ação. Cada aviso some sozinho
     quando a coisa é resolvida (não existe "lido / não lido").
   - Cada pessoa vê só o que pode acessar (papel e nível do suporte).
   - O botão da conta vira um menu: Minha conta e Sair.
   - O modo escuro fica no menu da conta (liga/desliga) e em Minha conta.
   Vai em todas as telas do painel, depois de js/sessao.js.
   ===================================================================== */
(function () {
  if (!window.Auth || !window.DB || !window.U) return;
  const S = Auth.sessao();
  if (!S) return;
  const esc = U.esc;
  const ms = a => U.dataHora(a.data, a.hora, a.fuso).getTime();
  const fim = a => ms(a) + (a.duracao || 50) * 60e3;
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

  const ICO = {
    lupa: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    sino: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9.5a6 6 0 0 1 12 0c0 4.6 1.6 6.3 2.3 7a.6.6 0 0 1-.4 1H4.1a.6.6 0 0 1-.4-1c.7-.7 2.3-2.4 2.3-7z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/></svg>',
    relogio: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="16" rx="2.5"/><path d="M3.5 9h17M8 3v3M16 3v3M9 14.5l2 2 4-4"/></svg>',
    msg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12z"/></svg>',
    dinheiro: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12.5" rx="2.5"/><circle cx="12" cy="12.25" r="2.6"/><path d="M6 9.5v5.5M18 9.5v5.5"/></svg>',
    novo: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="16" rx="2.5"/><path d="M3.5 9h17M8 3v3M16 3v3M12 12v5M9.5 14.5h5"/></svg>',
    seta: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>',
    conta: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c.8-3.9 3.7-6 7.5-6s6.7 2.1 7.5 6"/></svg>',
    lua: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z"/></svg>',
    sair: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4.5h3.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H14"/><path d="M10 16.5 5.5 12 10 7.5M5.5 12H15"/></svg>'
  };

  /* ---------------- o que entra no sininho ---------------- */
  async function calcular() {
    const itens = [], agora = Date.now();
    if (S.papel === 'psicologo') {
      const ags = await DB.listarAgendamentos({ psiId: S.id, status: ['confirmado'] });
      const novas = ags.filter(a => !a.psiCiente && fim(a) > agora);
      if (novas.length) itens.push({
        n: novas.length, cor: 'azul', ico: ICO.novo,
        titulo: (cv => novas.length === 1 ? (cv ? 'Conversa de 15 min nova' : 'Sessão nova ou remarcada') : cv ? `${novas.length} conversas de 15 min novas` : novas.some(a => a.tipo === 'conhecer') ? `${novas.length} atendimentos novos` : `${novas.length} sessões novas ou remarcadas`)(novas.every(a => a.tipo === 'conhecer')),
        sub: novas.length === 1 ? `${novas[0].paciente.nome} · ${U.fmtQuando(ms(novas[0]))}. ${window.matchMedia('(hover: none) and (pointer: coarse)').matches ? 'Toque' : 'Clique'} em "Estou ciente".` : `A próxima: ${U.fmtQuando(ms(novas[0]))}. ${window.matchMedia('(hover: none) and (pointer: coarse)').matches ? 'Toque' : 'Clique'} em "Estou ciente" em cada uma.`,
        link: 'minha-agenda.html#atendimentos'
      });
      const sem = ags.filter(a => fim(a) <= agora);
      if (sem.length) itens.push({
        n: sem.length, cor: 'amarelo', ico: ICO.check,
        titulo: `${plural(sem.length, 'sessão', 'sessões')} sem marcar`,
        sub: 'Já passaram. Marque Realizado ou Faltou para o seu repasse entrar.',
        link: 'minha-agenda.html#atendimentos'
      });
      return itens;
    }

    /* administrador e suporte */
    if (!Auth.pode('agenda')) return itens;
    const [ags, psis] = await Promise.all([
      DB.listarAgendamentos({ status: ['pendente', 'confirmado', 'realizado', 'falta'] }),
      DB.listarPsicologos({ todos: true }).catch(() => [])
    ]);
    const nomePsi = id => (psis.find(p => p.id === id) || {}).nome || 'Psicólogo';

    /* Conferir o Pix: o admin vê cada pedido com os botões; o suporte vê a resposta até confirmar */
    const gruposConf = {};
    ags.filter(a => a.status === 'pendente' && a.conferencia).forEach(a => { if (!gruposConf[a.grupo]) gruposConf[a.grupo] = []; gruposConf[a.grupo].push(a); });
    Object.values(gruposConf).forEach(g => {
      const a = g[0], c = a.conferencia, total = g.reduce((t, x) => t + (Number(x.valor) || 0), 0);
      const sessao = `${nomePsi(a.psiId)}, ${U.fmtCurta(a.data)} ${U.fmtHora(a.hora)}`;
      if (c.status === 'pedida' && S.papel === 'admin') itens.push({
        n: 1, cor: 'amarelo', ico: ICO.lupa, conf: a.grupo,
        titulo: `Conferir Pix · ${U.moeda(total)}`,
        sub: `${U.primeiroNome(c.pedidoPor) || 'O suporte'} pediu para conferir o pagamento de ${a.paciente.nome} (sessão com ${sessao}). Veja no extrato do banco.`,
        link: 'agenda.html#pre'
      });
      if ((c.status === 'caiu' || c.status === 'nao') && S.papel !== 'admin') itens.push({
        n: 1, cor: c.status === 'caiu' ? 'verde' : 'vermelho', ico: ICO.lupa,
        titulo: c.status === 'caiu' ? `Pix conferido: caiu · ${a.paciente.nome}` : `Pix não caiu · ${a.paciente.nome}`,
        sub: c.status === 'caiu' ? `${U.primeiroNome(c.respPor)} conferiu ${U.moeda(total)}. Agora é só confirmar o pagamento.` : `${U.primeiroNome(c.respPor)} não achou ${U.moeda(total)} no extrato. Fale com o paciente.`,
        link: 'agenda.html#pre'
      });
    });

    const pend = ags.filter(a => a.status === 'pendente' && (!a.expiraEm || a.expiraEm > agora)).sort((a, b) => (a.expiraEm || 9e15) - (b.expiraEm || 9e15));
    if (pend.length) itens.push({
      n: pend.length, cor: 'amarelo', ico: ICO.relogio,
      titulo: `${plural(pend.length, 'pré-reserva', 'pré-reservas')} esperando pagamento`,
      sub: pend[0].expiraEm ? `A primeira vence ${U.fmtQuando(pend[0].expiraEm)} (${pend[0].paciente.nome}).` : `${pend[0].paciente.nome} com ${nomePsi(pend[0].psiId)}.`,
      link: 'agenda.html#pre'
    });

    const semBaixa = {};
    ags.filter(a => a.status === 'confirmado' && fim(a) <= agora).forEach(a => { (semBaixa[a.psiId] = semBaixa[a.psiId] || []).push(a); });
    Object.keys(semBaixa).sort((a, b) => nomePsi(a).localeCompare(nomePsi(b), 'pt-BR')).forEach(id => {
      const l = semBaixa[id];
      itens.push({
        n: l.length, cor: 'amarelo', ico: ICO.check,
        titulo: `${nomePsi(id)}: ${plural(l.length, 'sessão', 'sessões')} sem marcar`,
        sub: 'Já passaram e ninguém marcou Realizado ou Faltou. O repasse fica parado até marcar.',
        link: Auth.pode('acompanhar') ? `minha-agenda.html?psi=${encodeURIComponent(id)}#atendimentos` : 'agenda.html#agenda'
      });
    });

    /* v279: conversa de 15 min — o psicólogo clicou em "Estou ciente": é hora de mandar o horário e o link ao paciente */
    const cvProntas = ags.filter(a => a.tipo === 'conhecer' && a.status === 'confirmado' && a.psiCiente && !(a.lembretes || {}).horario && fim(a) > agora)
      .sort((a, b) => ms(a) - ms(b));
    if (cvProntas.length) itens.push({
      n: cvProntas.length, cor: 'verde', ico: ICO.msg,
      titulo: cvProntas.length === 1 ? `Conversa de 15 min: avise ${cvProntas[0].paciente.nome}` : `${cvProntas.length} conversas de 15 min para avisar o paciente`,
      sub: cvProntas.length === 1 ? `${nomePsi(cvProntas[0].psiId)} confirmou a conversa de ${U.fmtQuando(ms(cvProntas[0]))}. Envie o horário e o link ao paciente.` : 'Os psicólogos já confirmaram. Envie o horário e o link aos pacientes.',
      link: 'agenda.html#conhecer'
    });

    const lem = U.lembretes(ags);
    if (lem.pendentes) itens.push({
      n: lem.pendentes, cor: 'verde', ico: ICO.msg,
      titulo: `${plural(lem.pendentes, 'lembrete', 'lembretes')} para enviar`,
      sub: lem.fins.length ? 'Sessões das próximas 24 horas e fim de plano mensal.' : 'Sessões das próximas 24 horas.',
      link: 'agenda.html#lembretes'
    });

    if (Auth.pode('financeiro')) {
      const com = Object.fromEntries(psis.map(p => [p.id, Number(p.comissao) || 0]));
      const rep = ags.filter(a => ['realizado', 'falta'].includes(a.status) && !a.repasse);
      if (rep.length) {
        const tot = rep.reduce((s, a) => s + (Number(a.valor) || 0) * (1 - (com[a.psiId] || 0) / 100), 0);
        const nPsi = new Set(rep.map(a => a.psiId)).size;
        itens.push({
          n: 0, cor: 'azul', ico: ICO.dinheiro,   /* repasse não soma na bolinha: é rotina, não urgência */
          titulo: `${plural(rep.length, 'repasse', 'repasses')} a pagar · ${U.moeda(tot)}`,
          sub: `Para ${plural(nPsi, 'psicólogo', 'psicólogos')}.`,
          link: 'financeiro.html'
        });
      }
    }
    return itens;
  }

  /* ---------------- monta o topo ---------------- */
  let ITENS = [], aberto = null;
  function montar() {
    const user = document.querySelector('.topo-user');
    if (!user || user.querySelector('.notif-btn')) return false;
    const conta = user.querySelector('#btn-conta');
    const sair = user.querySelector('[data-sair]');

    /* sininho */
    const wrapN = document.createElement('div');
    wrapN.className = 'topo-pop';
    wrapN.innerHTML = `<button type="button" class="notif-btn" aria-haspopup="true" aria-expanded="false" aria-controls="notif-painel" title="Notificações">${ICO.sino}<span class="notif-qtd" hidden></span></button>
      <div class="notif-painel" id="notif-painel" role="dialog" aria-label="Notificações" hidden>
        <div class="notif-cab"><strong>Notificações</strong><span class="notif-cab-sub">Só o que precisa de ação</span></div>
        <div class="notif-lista" data-notif-lista><p class="notif-vazio">Carregando…</p></div>
      </div>`;
    user.insertBefore(wrapN, conta || sair || null);


    /* menu da conta */
    if (conta) {
      const wrapC = document.createElement('div');
      wrapC.className = 'topo-pop';
      conta.parentNode.insertBefore(wrapC, conta);
      wrapC.appendChild(conta);
      conta.classList.add('conta-menu-btn');
      conta.setAttribute('aria-haspopup', 'true');
      conta.setAttribute('aria-expanded', 'false');
      /* v268: no lugar da setinha, os 3 risquinhos do menu do site, que viram X ao abrir */
      conta.insertAdjacentHTML('beforeend', `<span class="conta-seta cm-ico" aria-hidden="true"><i class="cm-l cm-1"></i><i class="cm-l cm-2"></i><i class="cm-l cm-3"></i></span>`);
      const href = conta.getAttribute('href') || 'conta.html';
      const ini = (conta.querySelector('.conta-ava') || {}).textContent || '';
      wrapC.insertAdjacentHTML('beforeend', `<div class="conta-menu" role="menu" hidden>
        <div class="conta-menu-cab"><span class="conta-ava" aria-hidden="true">${esc(ini)}</span><span><b>${esc(S.nome || '')}</b><small>${esc(Auth.nomePapel ? Auth.nomePapel(S) : '')}</small></span></div>
        <a role="menuitem" href="${esc(href)}"${S.papel === 'psicologo' ? ' class="menu-conta-psi"' : ''}>${ICO.conta}Minha conta</a>
        <button role="menuitemcheckbox" type="button" class="menu-tema" data-menu-tema aria-checked="false">${ICO.lua}<span>Modo escuro</span><span class="chave" aria-hidden="true"><span></span></span></button>
        <button role="menuitem" type="button" data-menu-sair>${ICO.sair}Sair</button>
      </div>`);
      wrapC.querySelectorAll('.conta-menu > *').forEach((el, i) => el.style.setProperty('--i', i));   /* itens entram um por um */
      conta.onclick = null;
      conta.addEventListener('click', e => { e.preventDefault(); e.stopImmediatePropagation(); alternar(wrapC); }, true);
      /* "Minha conta" na mesma página (psicólogo: Minha agenda → parte Conta): abre sem recarregar */
      wrapC.querySelector('.conta-menu a').addEventListener('click', e => {
        const alvo = new URL(e.currentTarget.href, location.href);
        if (alvo.pathname !== location.pathname) return;
        e.preventDefault(); fechar();
        history.replaceState(null, '', alvo.pathname + alvo.search + alvo.hash);
        window.dispatchEvent(new Event('pb:minha-conta'));
      });
      /* modo escuro: liga e desliga sem fechar o menu */
      const bTema = wrapC.querySelector('[data-menu-tema]');
      const escuro = () => document.documentElement.getAttribute('data-tema') === 'escuro';
      const marcarTema = () => bTema.setAttribute('aria-checked', escuro() ? 'true' : 'false');
      marcarTema();
      new MutationObserver(marcarTema).observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] });
      bTema.addEventListener('click', () => { if (window.PainelTema) PainelTema.definir(escuro() ? 'claro' : 'escuro'); });
      wrapC.querySelector('[data-menu-sair]').addEventListener('click', () => { fechar(); if (sair) sair.click(); else Auth.sair(); });
      if (sair) sair.classList.add('sair-no-menu');
    }
    wrapN.querySelector('.notif-btn').addEventListener('click', () => { alternar(wrapN); if (aberto === wrapN) atualizar(); });
    document.addEventListener('click', e => { if (aberto && !aberto.contains(e.target)) fechar(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && aberto) { const b = aberto.querySelector('button, a'); fechar(); if (b) b.focus(); } });
    return true;
  }
  function alternar(w) { if (aberto === w) { fechar(); return; } fechar(); aberto = w; w.classList.add('aberto'); w.querySelector('[aria-expanded]').setAttribute('aria-expanded', 'true'); const cx = w.querySelector('.notif-painel, .conta-menu'); clearTimeout(cx._t); cx.classList.remove('saindo'); cx.hidden = false; }
  /* admin respondeu a conferência do Pix direto no sininho */
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-conf-sim], [data-conf-nao]'); if (!b || !DB.responderConferencia) return;
    const caiu = b.hasAttribute('data-conf-sim'), grupo = b.dataset.confSim || b.dataset.confNao;
    b.closest('.notif-acoes').querySelectorAll('button').forEach(x => { x.disabled = true; });
    try {
      await DB.responderConferencia(grupo, caiu, S.nome);
      if (U.toast) U.toast(caiu ? 'Pronto: o suporte já vê que o Pix caiu.' : 'Pronto: o suporte vai avisar o paciente.');
      window.dispatchEvent(new Event('pb:conferencia'));
    } catch (err) { if (U.toast) U.toast(err.message || 'Não consegui responder.', 'erro'); }
    atualizar();
  });
  /* clicou num aviso: fecha a caixa (se o aviso for desta mesma tela, a tela só troca de aba) */
  document.addEventListener('click', e => { if (e.target.closest('.notif-item')) setTimeout(fechar, 0); });
  function fechar() {
    if (!aberto) return; const w = aberto; aberto = null; w.classList.remove('aberto'); w.querySelector('[aria-expanded]').setAttribute('aria-expanded', 'false');
    const cx = w.querySelector('.notif-painel, .conta-menu');
    /* v268: o menu da conta encolhe de volta para o botão antes de sumir */
    if (cx.classList.contains('conta-menu') && !matchMedia('(prefers-reduced-motion: reduce)').matches) { cx.classList.add('saindo'); clearTimeout(cx._t); cx._t = setTimeout(() => { cx.hidden = true; cx.classList.remove('saindo'); }, 180); }
    else cx.hidden = true;
  }

  function desenhar() {
    const total = ITENS.reduce((s, i) => s + i.n, 0);
    const qtd = document.querySelector('.notif-qtd'), btn = document.querySelector('.notif-btn');
    if (!qtd) return;
    qtd.textContent = total > 99 ? '99+' : total;
    qtd.hidden = !total;
    btn.classList.toggle('tem', total > 0);
    const rotulo = total ? `Notificações: ${total} ${total === 1 ? 'pendência' : 'pendências'}` : 'Notificações: tudo em dia';
    btn.title = rotulo; btn.setAttribute('aria-label', rotulo);
    document.querySelector('[data-notif-lista]').innerHTML = ITENS.length
      ? ITENS.map(i => i.conf
        ? `<div class="notif-item ${i.cor} notif-conf"><span class="notif-ico">${i.ico}</span><span class="notif-txt"><b>${esc(i.titulo)}</b><small>${esc(i.sub)}</small>
            <span class="notif-acoes"><button type="button" class="notif-sim" data-conf-sim="${esc(i.conf)}">✓ Caiu na conta</button><button type="button" class="notif-nao" data-conf-nao="${esc(i.conf)}">Não caiu</button></span></span></div>`
        : `<a class="notif-item ${i.cor}" href="${esc(i.link)}"><span class="notif-ico">${i.ico}</span><span class="notif-txt"><b>${esc(i.titulo)}</b><small>${esc(i.sub)}</small></span></a>`).join('')
      : '<p class="notif-vazio"><span aria-hidden="true">✓</span> Tudo em dia. Nada esperando por você.</p>';
  }

  let rodando = false, deNovo = false;
  async function atualizar() {
    if (rodando) { deNovo = true; return; }
    rodando = true;
    try { ITENS = await calcular(); } catch (e) { console.warn('notificações', e); }
    rodando = false;
    desenhar();
    if (deNovo) { deNovo = false; atualizar(); }
  }

  /* depois de qualquer mudança feita nesta tela (marcar realizado, pagar, confirmar...) */
  function vigiarMudancas() {
    const nomes = Object.keys(DB).filter(k => typeof DB[k] === 'function' && /^(atualizar|marcar|remarcar|confirmar|cancelar|criar|excluir|salvar|pedir|responder)/.test(k));
    nomes.forEach(k => {
      const orig = DB[k];
      try {
        DB[k] = function () { const r = orig.apply(this, arguments); Promise.resolve(r).then(() => setTimeout(atualizar, 150), () => {}); return r; };
      } catch (e) { /* objeto travado: segue só com o relógio */ }
    });
  }

  function iniciar() {
    montar();
    if (!document.querySelector('.topo-user .notif-btn')) return;
    vigiarMudancas();
    atualizar();
    try { DB.aoMudar(() => atualizar()); } catch (e) { /* sem tempo real */ }
    window.addEventListener('pb:conferencia', () => atualizar());   /* v279: algo marcado nesta tela (ex.: horário enviado ao paciente) */
    setInterval(atualizar, 60e3);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) atualizar(); });
  }
  /* ---------------- senha provisória: no 1º acesso, cria a própria senha antes de usar o painel ----------------
     Vale para psicólogo e equipe. A equipe nunca fica sabendo a senha final da pessoa. */
  async function pedirSenhaNova() {
    if (!DB.minhaSenhaProvisoria || !DB.trocarSenhaProvisoria || !Auth.formulario) return;
    try { if (!(await DB.minhaSenhaProvisoria())) return; } catch (e) { return; }
    await Auth.formulario({
      titulo: 'Crie a sua senha',
      texto: `Olá, ${String(S.nome || '').split(' ')[0]}! Você entrou com uma senha provisória. Para continuar, crie uma senha só sua: nem a equipe vai saber qual é.`,
      icone: 'ok', bloqueada: true, ok: 'Salvar e continuar', cancelar: 'Sair', mostrarSenhas: true,
      campos: [
        { nome: 'nova', rotulo: 'Nova senha', tipo: 'password', auto: 'new-password', ajuda: 'Pelo menos 8 caracteres. Misture letras e números.' },
        { nome: 'conf', rotulo: 'Repita a nova senha', tipo: 'password', auto: 'new-password' }
      ],
      aoCancelar: () => Auth.sairAgora(),
      aoEnviar: async v => {
        if (v.nova.length < 8) throw new Error('A senha precisa ter pelo menos 8 caracteres.');
        if (v.nova !== v.conf) throw new Error('As duas senhas não estão iguais.');
        await DB.trocarSenhaProvisoria(v.nova);
      }
    });
    const av = document.getElementById('aviso-senha'); if (av) av.remove();
    if (U.toast) U.toast('Pronto! Sua senha foi criada.');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pedirSenhaNova); else pedirSenhaNova();

  window.Notificacoes = { atualizar, montar, itens: () => ITENS.slice() };
  /* o sininho e o menu da conta entram já (sem esperar a página toda): assim não aparece o "Sair" antigo por um instante */
  montar();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();

/* =====================================================================
   v283: ajustes de celular para todas as telas do painel
   1) abas da equipe numa linha só, que desliza (a aba aberta fica à vista)
   2) texto de explicação do topo: 1 linha + "saiba mais" (só no celular)
   3) campo de mês vira "‹ Novembro de 2026 ›"
   4) no celular, "Clique" vira "Toque"
   ===================================================================== */
(function () {
  const CEL = () => matchMedia('(max-width: 640px)').matches;
  const TOQUE = matchMedia('(hover: none) and (pointer: coarse)').matches;

  /* 1) aba aberta sempre à vista na linha que desliza */
  function abaAVista(suave) {
    document.querySelectorAll('.abas-quebra').forEach(nav => {
      const sel = nav.querySelector('.aba[aria-selected="true"]');
      if (!sel || nav.scrollWidth <= nav.clientWidth) return;
      nav.scrollTo({ left: sel.offsetLeft - (nav.clientWidth - sel.offsetWidth) / 2, behavior: suave ? 'smooth' : 'auto' });
    });
  }
  document.addEventListener('click', e => { if (e.target.closest('.abas-quebra .aba')) setTimeout(() => abaAVista(true), 30); });
  document.addEventListener('pb:aba', () => setTimeout(() => abaAVista(true), 30));
  /* trocou de aba ou de tela (barra de baixo, abas, menus): resume o texto da parte que acabou de aparecer */
  document.addEventListener('pb:aba', () => setTimeout(resumirTextos, 60));
  document.addEventListener('click', () => setTimeout(resumirTextos, 120));

  /* 2) explicação do topo: uma linha e "saiba mais" */
  function resumirTextos() {
    document.querySelectorAll('.secao-topo > div > p:not(.disp-fuso):not([data-aviso-sim])').forEach(p => {
      if (p.dataset.resumo || p.hidden || !p.textContent.trim()) return;
      if (!CEL() || !p.offsetParent) return;   /* aba escondida: resume quando ela aparecer */
      p.dataset.resumo = '1';
      p.classList.add('txt-1l');
      if (p.scrollHeight <= p.clientHeight + 2) { p.classList.remove('txt-1l'); return; }   /* já cabe numa linha */
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'btn-link txt-mais'; b.textContent = 'saiba mais';
      b.addEventListener('click', () => { const ab = p.classList.toggle('aberto'); b.textContent = ab ? 'mostrar menos' : 'saiba mais'; });
      p.after(b);
    });
  }

  /* 3) campo de mês: ‹ Novembro de 2026 › (o campo original continua lá, escondido, e recebe o valor) */
  function mesBonito() {
    if (!window.U || !U.fmtMes) return;
    document.querySelectorAll('input[type="month"]:not([data-mes-nav])').forEach(inp => {
      inp.dataset.mesNav = '1';
      const box = document.createElement('div');
      box.className = 'mes-nav';
      box.innerHTML = '<button type="button" class="cal-nav" data-d="-1" aria-label="Mês anterior">‹</button><strong aria-live="polite"></strong><button type="button" class="cal-nav" data-d="1" aria-label="Próximo mês">›</button>';
      inp.after(box);
      inp.classList.add('mes-oculto');
      const rot = box.querySelector('strong');
      const atualizar = () => { const v = inp.value || U.mesAtual(); const t = U.fmtMes(v); rot.textContent = t.charAt(0).toUpperCase() + t.slice(1); };
      const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      Object.defineProperty(inp, 'value', { configurable: true, get() { return desc.get.call(this); }, set(v) { desc.set.call(this, v); atualizar(); } });
      inp.addEventListener('change', atualizar);
      box.addEventListener('click', e => {
        const b = e.target.closest('[data-d]'); if (!b) return;
        inp.value = U.addMes(inp.value || U.mesAtual(), Number(b.dataset.d));
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
      });
      const lab = inp.id && document.querySelector(`label[for="${inp.id}"]`);
      if (lab) lab.removeAttribute('for');
      atualizar();
    });
  }

  /* 4) celular: "Clique" → "Toque" em todo texto que aparecer na tela */
  const TROCA = [[/\bClique\b/g, 'Toque'], [/\bclique\b/g, 'toque'], [/\bClicar\b/g, 'Tocar'], [/\bclicar\b/g, 'tocar'], [/\bClicou\b/g, 'Tocou'], [/\bclicou\b/g, 'tocou'], [/\bclicando\b/g, 'tocando']];
  function trocarTexto(raiz) {
    if (!TOQUE || !raiz) return;
    const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, { acceptNode: n => (/clic/i.test(n.nodeValue) && !n.parentElement.closest('script, style, textarea, input, [contenteditable]')) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
    const l = []; while (w.nextNode()) l.push(w.currentNode);
    l.forEach(n => { let t = n.nodeValue; TROCA.forEach(([re, s]) => { t = t.replace(re, s); }); if (t !== n.nodeValue) n.nodeValue = t; });
    if (raiz.querySelectorAll) raiz.querySelectorAll('[title], [placeholder]').forEach(el => {
      ['title', 'placeholder'].forEach(a => { const v = el.getAttribute(a); if (v && /clic/i.test(v)) { let t = v; TROCA.forEach(([re, s]) => { t = t.replace(re, s); }); el.setAttribute(a, t); } });
    });
  }

  function tudo() { mesBonito(); resumirTextos(); trocarTexto(document.body); abaAVista(false); }
  function iniciar() {
    tudo();
    setTimeout(tudo, 600);    /* textos que as telas montam depois de carregar */
    setTimeout(tudo, 1800);
    let tr; addEventListener('resize', () => { clearTimeout(tr); tr = setTimeout(() => { resumirTextos(); abaAVista(false); }, 200); });   /* janela diminuída depois de abrir */
    if (TOQUE) new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) trocarTexto(n); else if (n.nodeType === 3 && n.parentElement) trocarTexto(n.parentElement); })))
      .observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
