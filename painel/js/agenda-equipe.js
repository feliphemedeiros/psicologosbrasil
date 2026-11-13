/* =====================================================================
   PAINEL DA EQUIPE (admin e suporte)
   ===================================================================== */
(async function () {
  const S = Auth.exigir(['agenda']);
  if (!S) return;
  const ADMIN = S.papel === 'admin';
  const C = window.AGENDA_CONFIG;
  const { $, $$, esc } = U;

  $('[data-nome]').textContent = S.nome;
  $('[data-papel]').textContent = Auth.nomePapel(S);
  $('[data-sair]').onclick = () => Auth.sair();
  Auth.menuAreas($('[data-areas]'), 'agenda');
  if (!ADMIN) $$('[data-so-admin]').forEach(e => e.remove());
  if (!ADMIN && DB.modo !== 'local') { const lc = $('#limpar-caixa'); if (lc) lc.remove(); }
  if (DB.modo !== 'local') { $$('[data-rodape-teste],[data-aviso-sim]').forEach(e => e.remove()); }

  /* ---------------- abas ---------------- */
  let ABA_ATUAL = 'pre';
  function ativar(aba) {
    ABA_ATUAL = aba;
    document.dispatchEvent(new CustomEvent('pb:aba', { detail: aba }));
    $$('.aba').forEach(b => b.setAttribute('aria-selected', String(b.dataset.aba === aba)));
    $$('[data-painel]').forEach(p => (p.hidden = p.dataset.painel !== aba));
    history.replaceState(null, '', '#' + aba);
  }
  $$('.aba').forEach(b => (b.onclick = () => ativar(b.dataset.aba)));
  const pedida = location.hash.slice(1);
  ativar($(`.aba[data-aba="${pedida}"]`) ? pedida : 'pre');
  /* link para outra aba desta mesma tela (ex.: sininho "pré-reserva" estando no Calendário): troca a aba */
  window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if ($(`.aba[data-aba="${h}"]`)) { ativar(h); window.scrollTo(0, 0); } });

  /* ---------------- dados auxiliares ---------------- */
  let PSIS = {};
  async function carregarPsis() {
    const l = await DB.listarPsicologos({ todos: true });
    PSIS = Object.fromEntries(l.map(p => [p.id, p]));
    return l;
  }
  const nomePsi = id => PSIS[id]?.nome || '—';

  function agrupar(lista) {
    const m = new Map();
    lista.forEach(a => { if (!m.has(a.grupo)) m.set(a.grupo, []); m.get(a.grupo).push(a); });
    m.forEach(g => g.sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora)));
    return [...m.values()];
  }
  const totalGrupo = g => g.reduce((s, a) => s + a.valor, 0);
  /* símbolo do Pix (losango) */
  const ICO_PIX = '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 2.8 21.2 12 12 21.2 2.8 12z"/><path d="m7.6 7.6 2.9 2.9a2.1 2.1 0 0 0 3 0l2.9-2.9M7.6 16.4l2.9-2.9a2.1 2.1 0 0 1 3 0l2.9 2.9"/></svg>';
  const rotuloPlano = g => g[0].tipo === 'mensal' ? `Plano mensal (${g.length} sessões)` : 'Sessão avulsa';
  const listaSessoesHTML = g => `<ul class="sessoes">${g.map(a => `<li>${U.fmtCurta(a.data)} · ${U.intervalo(a.hora, a.duracao)}${a.status !== g[0].status ? ' ' + U.badge(a.status) : ''}${(n => n ? `<small class="nota-fuso">🌍 ${esc(n)}</small>` : '')(U.notaFuso(a, true))}</li>`).join('')}</ul>`;

  /* =====================================================================
     PRÉ-RESERVAS
     ===================================================================== */
  const PRE_POR_PAGINA = 6;      /* pré-reservas: 6 quadrados por página */
  const AG_POR_PAGINA = 20;      /* tabela da agenda: 20 linhas por página */
  let PRE = [], prePag = 1, AG = [], agPag = 1;
  let BP = null, bpEm = 0, JA_PAGOU = new Set();   /* busca rápida de paciente: todos os agendamentos (cache curto) */
  const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  /* o que a busca procura num agendamento: paciente, código, e-mail, WhatsApp e psicólogo */
  const textoBusca = a => norm(`${a.paciente.nome} ${a.codigo} #${a.codigo} ${a.paciente.email} ${a.paciente.whatsapp} ${U.digitos ? U.digitos(a.paciente.whatsapp) : ''} ${nomePsi(a.psiId)}`);
  const casa = (a, q) => !q || q.split(/\s+/).every(t => textoBusca(a).includes(t) || (U.digitos && /\d{3,}/.test(t) && U.digitos(a.paciente.whatsapp).includes(U.digitos(t))));

  async function renderPre() {
    const ags = await DB.listarAgendamentos({ status: ['pendente'] });
    /* quem já fez (ou tem confirmada) alguma sessão: a mensagem não diz "que bom que você deu esse passo" */
    JA_PAGOU = new Set((await DB.listarAgendamentos({ status: ['confirmado', 'realizado', 'falta'] })).map(x => U.chavePaciente(x.paciente)));
    PRE = agrupar(ags).sort((a, b) => (a[0].expiraEm || 0) - (b[0].expiraEm || 0));   /* as que vencem primeiro ficam no topo */
    $('[data-cont="pre"]').textContent = PRE.length || '';
    desenharPre();
  }
  /* paciente em outro fuso (outro país ou outro fuso do Brasil): selo bem visível */
  function seloFora(a) {
    const fc = a.fusoPaciente || a.fuso || U.FUSO_BR;
    if (U.mesmoRelogio(fc, U.FUSO_BR, U.msAg(a))) return '';
    const v = U.paraFuso(a.data, a.hora, a.fuso, fc);
    return `<div class="selo-fora">🌍 Paciente em <b>${esc(U.nomeFuso(fc))}</b><span>Para o paciente, a sessão é ${esc(U.fmtCurta(v.data))} às ${esc(U.fmtHora(v.hora))}. No WhatsApp, fale o horário de lá.</span></div>`;
  }
  function desenharPre() {
    const box = $('#lista-pre');
    $('#pre-q').closest('.lista-busca').hidden = !PRE.length;
    if (!PRE.length) {
      box.innerHTML = `<div class="vazio"><strong>Nenhuma pré-reserva esperando.</strong>Quando um paciente escolher um horário no site, ele aparece aqui.</div>`;
      $('#pre-pag').innerHTML = '';
      return;
    }
    const q = norm($('#pre-q').value.trim());
    const vis = PRE.filter(g => casa(g[0], q));
    const r = Paginacao.fatiar(vis, prePag, PRE_POR_PAGINA); prePag = r.pag;
    $('#pre-pag').innerHTML = Paginacao.html(r, ['pré-reserva', 'pré-reservas']);
    if (!vis.length) { box.innerHTML = `<div class="vazio"><strong>Nenhuma pré-reserva com essa busca.</strong>Confira o nome, o código ou o e-mail.</div>`; return; }
    box.innerHTML = `<div class="cards">${r.itens.map(g => {
      const a = g[0];
      const resta = a.expiraEm - Date.now();
      const conf = a.conferencia || null, cs = conf && conf.status;
      const msg = a.mensagem || null;                 /* v209: passo 1 feito? */
      const urgente = resta < 2 * 60 * 60e3;          /* v209: menos de 2 horas para vencer */
      return `
      <article class="card card-pend${msg ? ' msg-feita' : ''}${a.pixEnviado ? ' pix-feita' : ''}${cs === 'pedida' ? ' conferindo' : ''}${cs === 'caiu' ? ' conf-caiu' : ''}">
        <div class="card-topo">
          <span class="codigo">#${esc(a.codigo)}</span>
          ${cs === 'pedida' || cs === 'caiu' ? '' : U.badge('pendente')}${cs === 'pedida' ? '<span class="chip-conf esp">Conferindo</span>' : cs === 'caiu' ? '<span class="chip-conf ok">Pix conferido</span>' : cs === 'nao' ? '<span class="chip-conf nao">Pix não caiu</span>' : ''}
          <span class="direita ${urgente ? 'expira-alerta' : ''}" title="O prazo conta só no horário da equipe (${esc(U.textoHorarioEquipe())})">${urgente ? ICO_RELOGIO_P : ''}${resta <= 0 ? 'venceu' : resta < 60 * 60e3 ? `vence em ${U.tempoRestante(resta)}` : `vence ${U.fmtQuando(a.expiraEm)}`}</span>
        </div>
        <h3>${esc(nomeBonito(a.paciente.nome))}</h3>
        <div class="contato">${esc(U.fmtTelefone(a.paciente.whatsapp))} · ${esc(a.paciente.email)}</div>
        ${seloFora(a)}
        <dl class="info">
          <dt>Psicólogo</dt><dd>${esc(nomePsi(a.psiId))}</dd>
          <dt>Plano</dt><dd>${rotuloPlano(g)}</dd>
          <dt>Valor</dt><dd>${U.moeda(totalGrupo(g))}</dd>
          <dt>${g.length > 1 ? 'Sessões' : 'Sessão'}</dt><dd>${listaSessoesHTML(g)}</dd>
        </dl>
        <!-- v207: na ordem do atendimento — 1) mensagem no WhatsApp, 2) Pix, 3) confirmar quando cair -->
        <a class="btn btn-whats btn-passo btn-wa-pre${msg ? ' feito' : ''}" target="_blank" rel="noopener" data-msg-grupo="${a.grupo}" aria-label="${msg ? 'Mensagem já enviada. Abrir o WhatsApp de novo' : 'Mandar mensagem no WhatsApp'} para ${esc(a.paciente.nome)}" href="${U.linkWhats(a.paciente.whatsapp, Servicos.textos.whatsRecebemos(g, PSIS[a.psiId] || { nome: nomePsi(a.psiId) }, { atendente: S.nome, primeira: !JA_PAGOU.has(U.chavePaciente(a.paciente)) }))}">${msg ? `<span class="passo-n passo-ok" aria-hidden="true">✓</span>Mensagem enviada<small>${esc(U.primeiroNome(msg.por || ''))} · ${esc(U.fmtQuando(msg.em))} · abrir de novo</small>` : `<span class="passo-n" aria-hidden="true">1</span><svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11.5a8 8 0 0 1-11.9 7L4 20l1.5-4A8 8 0 1 1 20 11.5z"/></svg>Mandar mensagem no WhatsApp`}</a>
        ${a.pixEnviado || cs === 'pedida' || cs === 'caiu'
          ? `<button class="btn btn-pix btn-passo pix-feito" type="button" data-acao="pix" data-grupo="${a.grupo}" aria-label="Pix já enviado. Abrir de novo"><span class="passo-n passo-ok" aria-hidden="true">✓</span>Pix enviado · ${U.moeda(totalGrupo(g))}<small>${a.pixEnviado ? `${esc(U.primeiroNome(a.pixEnviado.por || ''))} · ${esc(U.fmtQuando(a.pixEnviado.em))} · ` : ''}abrir de novo</small></button>`
          : `<button class="btn btn-pix btn-passo" type="button" data-acao="pix" data-grupo="${a.grupo}"><span class="passo-n" aria-hidden="true">2</span>${ICO_PIX}Enviar Pix ao paciente · ${U.moeda(totalGrupo(g))}</button>`}
        <div class="acoes acoes-pre">
          ${ADMIN || cs === 'caiu'
            ? `<button class="btn btn-ok btn-passo${cs === 'caiu' ? ' realce-ok' : ''}" data-acao="confirmar" data-grupo="${a.grupo}"><span class="passo-n" aria-hidden="true">3</span>Confirmar pagamento</button>`
            : `<button class="btn btn-ok btn-passo btn-travado" type="button" disabled title="Libera quando o admin conferir que o Pix caiu na conta"><span class="passo-n" aria-hidden="true">3</span><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>Confirmar pagamento</button>`}
          <button class="btn btn-perigo" data-acao="cancelar-grupo" data-grupo="${a.grupo}">Cancelar</button>
        </div>
        ${faixaConferencia(a)}
      </article>`;
    }).join('')}</div>`;
  }

  $('#pre-q').addEventListener('input', () => { prePag = 1; desenharPre(); });
  Paginacao.ligar($('#pre-pag'), n => { prePag = n; desenharPre(); }, $('#lista-pre'));

  $('#lista-pre').addEventListener('click', async e => {
    /* v209: abriu o WhatsApp → marca "mensagem enviada" para toda a equipe (o link abre normalmente) */
    const w = e.target.closest('[data-msg-grupo]');
    if (w) {
      if (!w.classList.contains('feito') && DB.marcarMensagemEnviada) {
        try { await DB.marcarMensagemEnviada(w.dataset.msgGrupo, S.nome); const g = PRE.find(x => x[0].grupo === w.dataset.msgGrupo); if (g) g.forEach(x => { x.mensagem = { em: Date.now(), por: S.nome }; }); setTimeout(desenharPre, 300); } catch (err) { /* o WhatsApp abre mesmo assim */ }
      }
      return;
    }
    const b = e.target.closest('[data-acao]');
    if (!b) return;
    if (b.dataset.acao === 'confirmar') abrirConfirmacao(b.dataset.grupo);
    if (b.dataset.acao === 'pix') abrirPix(b.dataset.grupo);
    if (['conferir', 'conf-sim', 'conf-nao'].includes(b.dataset.acao)) conferencia(b.dataset.acao, b.dataset.grupo, b);
    if (b.dataset.acao === 'cancelar-grupo') cancelarGrupo(b.dataset.grupo);
  });

  /* ---------- Conferir o Pix com o administrador ----------
     Suporte: "Pedir conferência ao admin" → admin recebe no sininho (e vê aqui no cartão) →
     responde "Caiu na conta" ou "Não caiu" → o cartão do suporte fica verde ou vermelho. */
  const ICO_RELOGIO_P = '<svg class="ico-prazo" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  /* v209: nome do paciente com a primeira letra maiúscula ("joao silva" → "Joao Silva"; "de", "da", "dos"… ficam minúsculos) */
  function nomeBonito(n) {
    const peq = ['de', 'da', 'do', 'das', 'dos', 'e'];
    return String(n || '').trim().replace(/\s+/g, ' ').split(' ').map((w, i) => {
      const l = w.toLocaleLowerCase('pt-BR');
      return i > 0 && peq.includes(l) ? l : l.charAt(0).toLocaleUpperCase('pt-BR') + l.slice(1);
    }).join(' ');
  }
  const ICO_LUPA = '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
  const ICO_RELOGIO = '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  const ICO_OK = '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
  const ICO_X = '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  function faixaConferencia(a) {
    const c = a.conferencia, cs = c && c.status;
    const pedir = (txt) => ADMIN ? '' : `<button type="button" class="btn btn-conf" data-acao="conferir" data-grupo="${a.grupo}">${ICO_LUPA}${txt}</button>`;
    if (!cs) return pedir('Pedir conferência ao admin');
    if (cs === 'pedida') return `<div class="faixa-conf esp">${ICO_RELOGIO}<div><b>${ADMIN ? `${esc(U.primeiroNome(c.pedidoPor))} pediu para você conferir este Pix` : 'Conferência pedida ao admin'}</b>
        <small>${ADMIN ? 'Pedido' : esc(U.primeiroNome(c.pedidoPor))} ${ADMIN ? '' : '· '}${esc(U.fmtQuando(c.pedidoEm))}${ADMIN ? ' — veja no extrato do banco se caiu.' : ' — aguardando resposta.<br>A pré-reserva fica guardada por mais 2 horas.'}</small>
        ${ADMIN ? `<span class="faixa-bts"><button type="button" class="btn btn-ok btn-peq" data-acao="conf-sim" data-grupo="${a.grupo}">✓ Caiu na conta</button><button type="button" class="btn btn-secundario btn-peq btn-nao" data-acao="conf-nao" data-grupo="${a.grupo}">Não caiu</button></span>` : ''}</div></div>`;
    if (cs === 'caiu') return `<div class="faixa-conf ok">${ICO_OK}<div><b>${esc(U.primeiroNome(c.respPor))} conferiu: caiu na conta ✓</b><small>${U.moeda(totalGrupo(PRE.find(g => g[0].grupo === a.grupo) || [a]))} · ${esc(U.fmtQuando(c.respEm))}. Agora é só confirmar o pagamento.</small></div></div>`;
    return `<div class="faixa-conf nao">${ICO_X}<div><b>${esc(U.primeiroNome(c.respPor))} conferiu: não caiu na conta</b><small>${esc(U.fmtQuando(c.respEm))}. Fale com o paciente e peça para conferir o pagamento ou mandar o comprovante.</small></div></div>${pedir('Pedir conferência de novo')}`;
  }
  async function conferencia(acao, grupo, botao) {
    if (botao) botao.disabled = true;
    try {
      if (acao === 'conferir') { await DB.pedirConferencia(grupo, S.nome); U.toast('Pedido enviado. O admin vê no sininho e responde por lá.'); }
      else { await DB.responderConferencia(grupo, acao === 'conf-sim', S.nome); U.toast(acao === 'conf-sim' ? 'Pronto: o suporte já vê que o Pix caiu.' : 'Pronto: o suporte vai avisar o paciente.'); }
      await render();
    } catch (e) { U.toast(e.message || 'Não consegui agora. Tente de novo.', 'erro'); if (botao) botao.disabled = false; }
  }
  window.addEventListener('pb:conferencia', () => render());

  /* ---------- Pix da clínica: mensagem pronta com chave e valor ----------
     Tira o "digitar a chave e o valor na mão" (onde nascem os erros). */
  async function abrirPix(grupo) {
    const g = (await DB.listarAgendamentos({ grupo })).filter(a => ['pendente', 'expirado'].includes(a.status)).sort((x, y) => (x.data + x.hora).localeCompare(y.data + y.hora));
    if (!g.length) return U.toast('Essa pré-reserva já foi tratada.', 'erro');
    const a = g[0], psi = PSIS[a.psiId] || { nome: nomePsi(a.psiId) };
    const pix = await U.pixClinica();
    if (!pix || !pix.chave) {
      U.modal({
        titulo: 'Pix da clínica não cadastrado',
        corpo: `<p>${ADMIN ? 'Cadastre a chave em <a href="config.html#pix">Configurações → Pix da clínica</a>. Depois disso, a mensagem sai pronta, com a chave e o valor.' : 'Peça para um administrador cadastrar a chave em Configurações → Pix da clínica. Depois disso, a mensagem sai pronta, com a chave e o valor.'}</p>`,
        acoes: [{ texto: 'Fechar', classe: 'btn-primario' }]
      });
      return;
    }
    const msg = Servicos.textos.whatsPix(g, psi, pix);
    const m = U.modal({
      titulo: 'Enviar Pix ao paciente',
      corpo: `
        <dl class="info pix-resumo">
          <dt>Paciente</dt><dd>${esc(a.paciente.nome)}</dd>
          <dt>Valor</dt><dd><b class="pix-valor">${U.moeda(totalGrupo(g))}</b> <span class="muted">· ${rotuloPlano(g)}</span></dd>
          <dt>Chave Pix</dt><dd><b>${esc(U.pixFormatar(pix.tipo, pix.chave))}</b> <span class="muted">· ${esc(U.pixNomeTipo(pix.tipo))}</span></dd>
          ${pix.nome ? `<dt>Recebedor</dt><dd>${esc(pix.nome)}${pix.banco ? ` <span class="muted">· ${esc(pix.banco)}</span>` : ''}</dd>` : ''}
        </dl>
        <div class="campo"><label for="m-pix-msg">Mensagem para o paciente <span class="muted">(pode ajustar antes de enviar)</span></label>
          <textarea id="m-pix-msg" rows="9">${esc(msg)}</textarea></div>
        <div class="pix-acoes">
          <a class="btn btn-whats" id="m-pix-zap" target="_blank" rel="noopener" href="${U.linkWhats(a.paciente.whatsapp, msg)}">${ICO_ZAP}Enviar no WhatsApp</a>
          <button type="button" class="btn btn-secundario" data-pix-copiar="msg">Copiar mensagem</button>
          <button type="button" class="btn btn-secundario" data-pix-copiar="chave">Copiar só a chave</button>
        </div>
        <p class="ajuda">Quando o pagamento cair, volte aqui e clique em <b>Confirmar pagamento</b>.</p>`,
      acoes: [{ texto: 'Fechar' }]
    });
    const txt = $('#m-pix-msg', m.corpo), zap = $('#m-pix-zap', m.corpo);
    txt.addEventListener('input', () => { zap.href = U.linkWhats(a.paciente.whatsapp, txt.value); });
    /* v217: mandou pelo WhatsApp ou copiou → marca "Pix enviado" para toda a equipe */
    let marcouPix = !!a.pixEnviado;
    const marcarPix = async () => {
      if (marcouPix || !DB.marcarMensagemEnviada) return; marcouPix = true;
      try { await DB.marcarMensagemEnviada(grupo, S.nome, 'pixEnviado'); const gg = PRE.find(x => x[0].grupo === grupo); if (gg) gg.forEach(x => { x.pixEnviado = { em: Date.now(), por: S.nome }; }); desenharPre(); } catch (err) { /* segue */ }
    };
    zap.addEventListener('click', marcarPix);
    m.corpo.addEventListener('click', async e => {
      const b = e.target.closest('[data-pix-copiar]'); if (!b) return;
      marcarPix();
      const ok = await U.copiar(b.dataset.pixCopiar === 'chave' ? pix.chave : txt.value);
      U.toast(ok ? (b.dataset.pixCopiar === 'chave' ? 'Chave Pix copiada.' : 'Mensagem copiada. É só colar no WhatsApp.') : 'Não consegui copiar. Selecione e copie à mão.', ok ? 'ok' : 'erro');
    });
  }

  /* v219: nas janelas (confirmado, remarcado, link da sala), o botão de WhatsApp que já foi tocado fica apagado: "✓ Enviado ao paciente" */
  document.addEventListener('click', e => {
    const w = e.target.closest('a.btn-whats[data-feito]'); if (!w || w.classList.contains('zap-feito')) return;
    setTimeout(() => { w.classList.add('zap-feito'); w.innerHTML = `<span aria-hidden="true">✓</span>${esc(w.dataset.feito)}`; w.title = 'Já enviado. Toque de novo para abrir outra vez.'; }, 0);
  });

  /* ---------- confirmar pagamento ---------- */
  async function abrirConfirmacao(grupo) {
    const g = (await DB.listarAgendamentos({ grupo })).filter(a => ['pendente', 'expirado'].includes(a.status));
    if (!g.length) return U.toast('Esse agendamento já foi tratado.', 'erro');
    /* v214: suporte só confirma depois que o admin conferiu o Pix */
    if (!ADMIN && !g.every(x => x.conferencia && x.conferencia.status === 'caiu')) return U.toast('Peça a conferência ao admin: o “Confirmar pagamento” libera quando ele responder que o Pix caiu.', 'erro');
    const a = g[0];
    const psi = PSIS[a.psiId];
    /* link: o que já estava no atendimento → a sala fixa do psicólogo (cadastrada na ficha).
       Sem sala cadastrada: a equipe cola o link (ou cadastra na ficha). */
    const salaFixa = psi && psi.salaMeet ? psi.salaMeet : '';
    const link = a.linkMeet || salaFixa;

    U.modal({
      titulo: 'Confirmar pagamento',
      corpo: `
        <div class="resumo-modal">
          <dl class="info">
            <dt>Paciente</dt><dd>${esc(a.paciente.nome)}</dd>
            <dt>Psicólogo</dt><dd>${esc(psi.nome)}</dd>
            <dt>Plano</dt><dd>${rotuloPlano(g)} · ${U.moeda(totalGrupo(g))}</dd>
            <dt>${g.length > 1 ? 'Sessões' : 'Sessão'}</dt><dd>${listaSessoesHTML(g)}</dd>
          </dl>
        </div>
        <div class="campo">
          <label for="m-link">Link da videochamada</label>
          <input type="text" id="m-link" value="${esc(link)}"${link ? ' readonly' : ' placeholder="https://meet.google.com/abc-defg-hij"'}>
          ${link
            ? `<p class="ajuda sala-fixa">✓ ${link === salaFixa ? `Sala fixa de ${esc(psi.nome)}, cadastrada na ficha do psicólogo.` : 'Link já salvo neste atendimento.'} Vai no e-mail do paciente e do psicólogo.</p>`
            : `<p class="ajuda sala-falta">${esc(psi.nome)} ainda não tem sala do Google Meet cadastrada. Cadastre na ficha do psicólogo (Informações pessoais → Sala do Google Meet) ou cole o link da sala aqui.</p>`}
        </div>
        <label class="check"><input type="checkbox" id="m-email-pac" checked> Enviar e-mail de confirmação ao paciente</label>
        <label class="check" style="margin-top:8px"><input type="checkbox" id="m-email-psi" checked> Enviar e-mail ao psicólogo</label>`,
      acoes: [
        { texto: 'Voltar' },
        {
          texto: 'Confirmar agendamento', classe: 'btn-ok',
          onClick: async ({ corpo }) => {
            const linkMeet = $('#m-link', corpo).value.trim();
            if (!/^https:\/\/\S+$/.test(linkMeet)) { U.toast('Informe um link que comece com https://', 'erro'); return false; }
            const confirmados = await DB.confirmarGrupo(grupo, { linkMeet, por: S.nome });
            await Servicos.notificarConfirmacao(confirmados, psi, {
              paciente: $('#m-email-pac', corpo).checked,
              psicologo: $('#m-email-psi', corpo).checked
            });
            await render();
            setTimeout(() => posConfirmacao(confirmados, psi), 50);
          }
        }
      ]
    });
  }

  function posConfirmacao(ags, psi) {
    const t = Servicos.textos;
    U.modal({
      titulo: 'Agendamento confirmado',
      corpo: `
        <div class="sucesso-ico" aria-hidden="true">✓</div>
        <p style="text-align:center">O horário ficou <strong>verde</strong> na agenda de ${esc(psi.nome)}.
        Os e-mails foram ${DB.modo === 'local' ? 'registrados em “E-mails enviados”' : 'para a fila de envio (aba “E-mails enviados”)'}.</p>
        <p style="text-align:center" class="muted">Quer mandar também pelo WhatsApp?</p>
        <div class="acoes" style="justify-content:center">
          <a class="btn btn-whats" data-feito="Enviado ao paciente" target="_blank" rel="noopener" href="${U.linkWhats(ags[0].paciente.whatsapp, t.whatsPaciente(ags, psi))}">WhatsApp do paciente</a>
          <a class="btn btn-whats btn-whats-psi" data-feito="Enviado ao psicólogo" target="_blank" rel="noopener" href="${U.linkWhats(psi.whatsapp, t.whatsPsicologo(ags, psi))}">WhatsApp do psicólogo</a>
        </div>`,
      acoes: [{ texto: 'Fechar', classe: 'btn-primario' }]
    });
  }

  /* depois de remarcar: e-mails já foram; oferece avisar pelo WhatsApp (o paciente costuma ver lá primeiro) */
  function posRemarcacao(a, psi, quando) {
    const t = Servicos.textos;
    U.modal({
      titulo: 'Sessão remarcada',
      corpo: `
        <div class="sucesso-ico" aria-hidden="true">✓</div>
        <p style="text-align:center">Nova data: <strong>${esc(quando)}</strong>.<br>Os e-mails foram ${DB.modo === 'local' ? 'registrados em “E-mails enviados”' : 'para a fila de envio'}.</p>
        <p style="text-align:center" class="muted">Avise também pelo WhatsApp: cada um recebe no próprio fuso.</p>
        <div class="acoes" style="justify-content:center">
          <a class="btn btn-whats" data-feito="Enviado ao paciente" target="_blank" rel="noopener" href="${U.linkWhats(a.paciente.whatsapp, t.whatsRemarcacao(a, psi, false))}">WhatsApp do paciente</a>
          <a class="btn btn-whats btn-whats-psi" data-feito="Enviado ao psicólogo" target="_blank" rel="noopener" href="${U.linkWhats(psi.whatsapp, t.whatsRemarcacao(a, psi, true))}">WhatsApp do psicólogo</a>
        </div>`,
      acoes: [{ texto: 'Fechar', classe: 'btn-primario' }]
    });
  }

  async function cancelarGrupo(grupo) {
    const g = await DB.listarAgendamentos({ grupo });
    const ativos = g.filter(a => ['pendente', 'confirmado', 'expirado'].includes(a.status));
    const ok = await U.confirmar('Cancelar agendamento',
      `Cancelar ${ativos.length > 1 ? `as ${ativos.length} sessões` : 'a sessão'} de <strong>${esc(g[0].paciente.nome)}</strong>? O horário volta a ficar livre no site.`,
      'Cancelar agendamento', true);
    if (!ok) return;
    await DB.cancelar(ativos.map(a => a.id), S.nome);
    U.toast('Agendamento cancelado.');
    render();
  }

  /* =====================================================================
     AGENDA (todos os atendimentos)
     ===================================================================== */
  /* celular: "Toque num atendimento" no lugar de "Clique numa linha" */
  if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) document.querySelectorAll('[data-clique]').forEach(el => { el.textContent = el.textContent.replace('Clique numa linha', 'Toque num atendimento'); });
  const fPsi = $('#f-psi'), fStatus = $('#f-status'), fDe = $('#f-de'), fAte = $('#f-ate');
  fDe.value = U.addDias(U.hojeISO(), -7);
  fAte.value = U.addDias(U.hojeISO(), 30);
  [fPsi, fStatus, fDe, fAte].forEach(el => el.addEventListener('change', () => { agPag = 1; contarFiltros(); renderAgenda(); }));
  /* celular: os filtros ficam atrás do botão "Filtros" (só a busca fica à vista) */
  const DE_PADRAO = fDe.value, ATE_PADRAO = fAte.value;
  function contarFiltros() {
    const n = (fPsi.value ? 1 : 0) + (fStatus.value ? 1 : 0) + ((fDe.value !== DE_PADRAO || fAte.value !== ATE_PADRAO) ? 1 : 0);
    $('#f-qtd').textContent = n ? String(n) : '';
  }
  $('#f-mais').addEventListener('click', () => {
    const caixa = $('#f-mais').closest('.filtros');
    const abrir = !caixa.classList.contains('filtros-abertos');
    caixa.classList.toggle('filtros-abertos', abrir);
    $('#f-mais').setAttribute('aria-expanded', String(abrir));
  });

  /* Psicólogo: campo com busca (js/escolher-psi.js), pensado para centenas de psicólogos.
     Ao abrir mostra só quem tem atendimento no período, com a quantidade de sessões. */
  let escolherPsi = null;
  function preencherFiltroPsi() {
    const atual = fPsi.value;
    fPsi.innerHTML = `<option value="">Todos</option>` + Object.values(PSIS).map(p => `<option value="${p.id}">${esc(p.nome)}</option>`).join('');
    fPsi.value = PSIS[atual] ? atual : '';
    if (!escolherPsi && window.EscolherPsi) {
      escolherPsi = EscolherPsi(fPsi, {
        lista: () => Object.values(PSIS).map(p => ({ id: p.id, nome: p.nome, crp: p.crp })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
        contar: async () => {
          /* destaque: sessões confirmadas, realizadas ou faltas dos últimos 30 dias (até hoje) */
          const hoje = U.hojeISO();
          const [mes, filtro] = await Promise.all([
            DB.listarAgendamentos({ status: ['confirmado', 'realizado', 'falta'], de: U.addDias(hoje, -30), ate: hoje }),
            DB.listarAgendamentos({ status: fStatus.value ? fStatus.value.split(',') : ['pendente', 'confirmado', 'realizado', 'falta'], de: fDe.value || undefined, ate: fAte.value || undefined })
          ]);
          const por = {}; mes.forEach(a => { por[a.psiId] = (por[a.psiId] || 0) + 1; });
          return { por, total: filtro.length };
        }
      });
    }
    if (escolherPsi) escolherPsi.atualizar();
  }

  /* =====================================================================
     LEMBRETES: sessões nas próximas 24 h e planos mensais chegando ao fim
     ===================================================================== */
  const CAD_P = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  const ICO_ZAP = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Z"/></svg>';
  let LEM = { proximas: [], fins: [], pendentes: 0 };
  async function renderLembretes() {
    await renderLembretesBase();
    if (ABA_ATUAL === 'lembretes') { try { bpFiltrarDom('#lista-lembretes', $('#bp-q').value.trim()); } catch (e) { /* busca ainda não montada */ } }
  }
  async function renderLembretesBase() {
    const hoje = U.hojeISO();
    const ags = await DB.listarAgendamentos({ status: ['confirmado'], de: hoje, ate: U.addDias(hoje, 3) });
    LEM = U.lembretes(ags);
    const cont = $('[data-cont="lem"]'); if (cont) cont.textContent = LEM.pendentes || '';
    const box = $('#lista-lembretes'); if (!box) return;
    const t = Date.now(), T = Servicos.textos;
    const hora = ms => { const m = Math.round((ms - t) / 60000); return m < 60 ? `em ${m} min` : `em ${Math.floor(m / 60)}h${m % 60 ? U.pad(m % 60) : ''}`; };
    const tagPlano = a => a.tipo === 'conhecer' ? '<span class="tag-plano conhecer">Conversa 15 min</span>' : a.tipo === 'mensal' ? `<span class="tag-plano mensal" title="Plano mensal: sessão ${a.sessao} de ${a.totalSessoes}">Mensal · ${a.sessao}/${a.totalSessoes}</span>` : '<span class="tag-plano">Avulsa</span>';
    const quando = a => { const ms = U.dataHora(a.data, a.hora, a.fuso).getTime(); return `<div class="lem-quando">${esc(U.fmtQuando(ms))}<small>${esc(U.fmtLonga(a.data))} · ${esc(U.intervalo(a.hora, a.duracao))}</small>${(n => n ? `<small class="nota-fuso">🌍 ${esc(n)}</small>` : '')(U.notaFuso(a, true))}<small class="lem-falta">Começa ${hora(ms)}</small></div>`; };
    const feitoEm = ms => `${U.fmtQuando(ms)}`;
    const botao = (a, tipo, rotulo, numero, texto) => {
      const f = (a.lembretes || {})[tipo];
      /* v273: a mensagem ao paciente libera depois que o psicólogo clica em "Estou ciente".
         Faltando menos de 2 horas, aparece "enviar mesmo assim" para o paciente não ficar sem aviso. */
      if (tipo === 'paciente' && !a.psiCiente && !f) {
        const perto = U.dataHora(a.data, a.hora, a.fuso).getTime() - Date.now() < 2 * 3600e3;
        return `<span class="btn btn-travado-psi" title="Libera quando o psicólogo clicar em “Estou ciente”">${CAD_P}Paciente: espera o psicólogo</span>`
          + (perto ? `<a class="lem-mesmo-assim" target="_blank" rel="noopener" href="${U.linkWhats(numero, texto)}" data-lembrete="${tipo}" data-id="${a.id}">Falta menos de 2 h: enviar ao paciente mesmo assim</a>` : '');
      }
      return `<a class="btn ${f ? 'feito' : 'btn-whats'}${tipo === 'psicologo' ? ' btn-whats-psi' : ''}" target="_blank" rel="noopener" href="${U.linkWhats(numero, texto)}" data-lembrete="${tipo}" data-id="${a.id}" title="${f ? 'Já enviado ' + esc(feitoEm(f)) + '. Clique para enviar de novo.' : 'Abre o WhatsApp com a mensagem pronta'}">${f ? '✓ ' : ICO_ZAP}${rotulo}</a>`;
    };
    const fins = LEM.fins.map(a => {
      const psi = PSIS[a.psiId] || { nome: '—' }, f = (a.lembretes || {}).renovacao;
      return `<article class="card card-fim${f ? ' feito' : ''}">
        <div class="card-topo">${f ? '<span class="badge badge-ok">✓ Oferecida</span>' : '<span class="tag-novo">Fim do plano</span>'}${tagPlano(a)}</div>
        ${quando(a)}
        <h3>${esc(a.paciente.nome)}</h3>
        <div class="contato">${esc(U.fmtTelefone(a.paciente.whatsapp))} · com ${esc(psi.nome)}</div>
        <p class="lem-feito-txt">Última sessão do plano. Ofereça continuar no mesmo dia e horário para o paciente não perder a vaga.</p>
        <div class="lem-acoes um">${botao(a, 'renovacao', 'Oferecer renovação ao paciente', a.paciente.whatsapp, T.whatsRenovacao(a, psi))}</div>
      </article>`;
    }).join('');
    const prox = LEM.proximas.map(a => {
      const psi = PSIS[a.psiId] || { nome: '—' }, L = a.lembretes || {}, ok = L.paciente && L.psicologo;
      return `<article class="card card-lem${ok ? ' feito' : ''}">
        <div class="card-topo">${ok ? '<span class="badge badge-ok" title="Lembretes enviados ao paciente e ao psicólogo">✓ Enviados</span>' : '<span class="tag-novo">Lembrar</span>'}${tagPlano(a)}<span class="direita">#${esc(a.codigo)}</span></div>
        ${quando(a)}
        <dl class="info"><dt>Paciente</dt><dd>${esc(a.paciente.nome)}</dd><dt>Psicólogo</dt><dd>${esc(psi.nome)}</dd></dl>
        <div class="lem-acoes">
          ${botao(a, 'paciente', 'Lembrar paciente', a.paciente.whatsapp, T.whatsLembretePaciente(a, psi))}
          ${botao(a, 'psicologo', 'Lembrar psicólogo', psi.whatsapp || '', T.whatsLembretePsicologo(a, psi))}
        </div>
      </article>`;
    }).join('');
    box.innerHTML = (!LEM.fins.length && !LEM.proximas.length)
      ? `<div class="vazio"><strong>Nenhum lembrete agora.</strong>Quando uma sessão estiver a menos de 24 horas, ou um plano mensal chegar na última sessão, ela aparece aqui em verde.</div>`
      : (LEM.fins.length ? `<div class="lem-grupo"><h2>Planos mensais terminando</h2><p>Última sessão nas próximas 48 horas: hora de oferecer a renovação.</p><div class="cards">${fins}</div></div>` : '')
      + (LEM.proximas.length ? `<div class="lem-grupo"><h2>Sessões nas próximas 24 horas</h2><p>Mande o lembrete com o link da sala para o paciente e para o psicólogo.</p><div class="cards">${prox}</div></div>` : '');
  }
  /* clicou no botão do WhatsApp: abre a conversa e marca o lembrete como enviado */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-lembrete]'); if (!b) return;
    DB.marcarLembrete(b.dataset.id, b.dataset.lembrete, S.nome).then(renderLembretes).catch(err => U.toast(err.message || 'Não consegui marcar o lembrete.', 'erro'));
  });

  /* =====================================================================
     CALENDÁRIO: o mês inteiro; clicando no dia, os atendimentos por psicólogo
     ===================================================================== */
  const hojeISO0 = U.hojeISO();
  let calMes = hojeISO0.slice(0, 7), calDia = hojeISO0, CAL = [];
  const corPonto = s => ({ confirmado: '', pendente: 'pend', realizado: 'info', falta: 'erro' }[s] ?? '');
  async function renderCalendario() {
    const grade = $('#cm-grade'); if (!grade) return;
    const [y, m] = calMes.split('-').map(Number);
    const ini = new Date(y, m - 1, 1), offset = (ini.getDay() + 6) % 7;          /* semana começa na segunda */
    const primeiro = U.addDias(U.dataISO(ini), -offset), ultimo = U.addDias(primeiro, 41);
    CAL = await DB.listarAgendamentos({ status: ['pendente', 'confirmado', 'realizado', 'falta'], de: primeiro, ate: ultimo });
    const porDia = {}; CAL.forEach(a => { (porDia[a.data] = porDia[a.data] || []).push(a); });
    { const t = U.fmtMes(calMes); $('#cm-titulo').textContent = t.charAt(0).toUpperCase() + t.slice(1); }
    grade.innerHTML = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => `<span class="cm-sem">${d}</span>`).join('') +
      Array.from({ length: 42 }, (_, i) => {
        const d = U.addDias(primeiro, i), l = porDia[d] || [], fora = d.slice(0, 7) !== calMes;
        if (i >= 35 && fora && U.addDias(primeiro, 35).slice(0, 7) !== calMes) return '';       /* não mostra a 6ª semana vazia */
        return `<button type="button" class="cm-dia${fora ? ' fora' : ''}${d === hojeISO0 ? ' cm-e-hoje' : ''}${d === calDia ? ' sel' : ''}" data-cal-dia="${d}" aria-label="${esc(U.fmtLonga(d))}: ${l.length} atendimento${l.length === 1 ? '' : 's'}">
          <span class="cm-n">${Number(d.slice(8))}</span>
          ${l.length ? `<span class="cm-qtd">${l.length}<span class="cm-qtd-t"> atend.</span></span><span class="cm-pontos">${l.slice(0, 12).map(a => `<i class="${corPonto(a.status)}"></i>`).join('')}</span>` : ''}
        </button>`;
      }).join('');
    desenharCalDia(porDia[calDia] || []);
  }
  function desenharCalDia(l) {
    const box = $('#cm-dia');
    const porPsi = {}; l.forEach(a => { (porPsi[a.psiId] = porPsi[a.psiId] || []).push(a); });
    const ids = Object.keys(porPsi).sort((a, b) => nomePsi(a).localeCompare(nomePsi(b), 'pt-BR'));
    box.innerHTML = `<h2>${esc(U.fmtLonga(calDia))}${calDia === hojeISO0 ? ' · hoje' : ''}</h2>` + (!ids.length
      ? '<div class="vazio"><strong>Nenhum atendimento neste dia.</strong>Escolha outro dia no calendário.</div>'
      : ids.map(id => { const it = porPsi[id].sort((a, b) => a.hora.localeCompare(b.hora)); return `<div class="cm-psi"><h3>${esc(nomePsi(id))}<span>${it.length} atendimento${it.length === 1 ? '' : 's'}</span></h3>${it.map(a => `
        <div class="cm-it" data-cal-ag="${esc(a.id)}">
          <span class="cm-h">${esc(U.intervalo(a.hora, a.duracao))}${(n => n ? `<small class="nota-fuso">🌍 ${esc(n)}</small>` : '')(U.notaFuso(a, true))}</span>
          <span class="cm-p"><b>${esc(a.paciente.nome)}</b><small>${a.tipo === 'conhecer' ? 'Conversa de 15 min' : a.tipo === 'mensal' ? `Plano mensal · ${a.sessao}/${a.totalSessoes}` : 'Sessão avulsa'} · ${esc(U.fmtTelefone(a.paciente.whatsapp))}</small>${Auth.pode('pacientesFicha') ? `<a href="pacientes.html#p:${encodeURIComponent(U.chavePaciente(a.paciente))}" data-ficha>Ver ficha do paciente</a>` : ''}</span>
          ${U.badge(a.status)}
        </div>`).join('')}</div>`; }).join(''));
  }
  document.addEventListener('click', e => {
    const d = e.target.closest('[data-cal-dia]');
    if (d) { calDia = d.dataset.calDia; if (calDia.slice(0, 7) !== calMes) calMes = calDia.slice(0, 7); renderCalendario(); return; }
    const nav = e.target.closest('[data-cal-mes]');
    if (nav) { const [y, m] = calMes.split('-').map(Number); const n = new Date(y, m - 1 + Number(nav.dataset.calMes), 1); calMes = U.dataISO(n).slice(0, 7); calDia = calMes === hojeISO0.slice(0, 7) ? hojeISO0 : calMes + '-01'; renderCalendario(); return; }
    if (e.target.closest('#cm-hoje')) { calMes = hojeISO0.slice(0, 7); calDia = hojeISO0; renderCalendario(); return; }
    const it = e.target.closest('[data-cal-ag]');
    if (it && !e.target.closest('[data-ficha]')) abrirDetalhes(it.dataset.calAg);
  });

  async function renderAgenda() {
    const status = fStatus.value ? fStatus.value.split(',') : ['pendente', 'confirmado', 'realizado', 'falta'];
    AG = await DB.listarAgendamentos({ psiId: fPsi.value || undefined, status, de: fDe.value || undefined, ate: fAte.value || undefined });
    desenharAgenda();
  }
  function desenharAgenda() {
    const tab = $('#tabela-agenda');
    const q = norm($('#f-q').value.trim());
    const lista = AG.filter(a => casa(a, q));
    const r = Paginacao.fatiar(lista, agPag, AG_POR_PAGINA); agPag = r.pag;
    $('#ag-pag').innerHTML = Paginacao.html(r, ['atendimento', 'atendimentos']);
    if (!lista.length) { tab.innerHTML = `<tbody><tr><td class="muted" style="text-align:center;padding:32px">Nenhum atendimento com esses filtros.</td></tr></tbody>`; return; }
    tab.innerHTML = `
      <thead><tr><th>Data</th><th>Horário</th><th>Psicólogo</th><th>Paciente</th><th>Plano</th><th>Situação</th><th>Psicólogo viu?</th></tr></thead>
      <tbody>${r.itens.map(a => `
        <tr class="clicavel" data-id="${a.id}">
          <td class="mono c-data">${U.fmtCurta(a.data)}</td>
          <td class="mono c-hora">${U.intervalo(a.hora, a.duracao)}${(n => n ? `<small class="nota-fuso">🌍 ${esc(n)}</small>` : '')(U.notaFuso(a, true))}</td>
          <td class="c-psi">${fPsi.value ? esc(nomePsi(a.psiId)) : `<button type="button" class="link-psi" data-filtrar-psi="${esc(a.psiId)}" title="Ver só os atendimentos de ${esc(U.primeiroNome(nomePsi(a.psiId)))}">${esc(nomePsi(a.psiId))}</button>`}</td>
          <td class="c-pac">${esc(a.paciente.nome)}</td>
          <td class="c-plano">${a.tipo === 'conhecer' ? 'Conversa 15 min' : a.tipo === 'mensal' ? `Mensal ${a.sessao}/${a.totalSessoes}` : 'Avulsa'}</td>
          <td class="c-sit">${U.badge(a.status)}</td>
          <td class="c-viu${a.status === 'confirmado' ? '' : ' c-viu-vazio'}">${a.status === 'confirmado' ? (a.psiCiente ? '<span class="ciente-ok">✓ Ciente</span>' : '<span class="ciente-nao" title="O psicólogo ainda não clicou em “Estou ciente”"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.4 5.3A10.6 10.6 0 0 1 12 5c5 0 9 4.5 10 7-.4 1-1.3 2.4-2.6 3.7M6.3 6.4C4.3 7.8 2.8 9.8 2 12c1 2.5 5 7 10 7 1.6 0 3.1-.4 4.4-1.1"/></svg>Ainda não viu</span>') : '<span class="muted">—</span>'}</td>
        </tr>`).join('')}
      </tbody>`;
  }

  $('#f-q').addEventListener('input', () => { agPag = 1; desenharAgenda(); });
  Paginacao.ligar($('#ag-pag'), n => { agPag = n; desenharAgenda(); }, $('#tabela-agenda'));

  $('#tabela-agenda').addEventListener('click', e => {
    const fp = e.target.closest('[data-filtrar-psi]');
    if (fp) { e.stopPropagation(); if (escolherPsi) escolherPsi.escolher(fp.dataset.filtrarPsi); else { fPsi.value = fp.dataset.filtrarPsi; fPsi.dispatchEvent(new Event('change')); } return; }
    const tr = e.target.closest('tr[data-id]');
    if (tr) abrirDetalhes(tr.dataset.id);
  });

  async function abrirDetalhes(id) {
    const a = await DB.obterAgendamento(id);
    if (!a) return;
    const psi = PSIS[a.psiId];
    const t = Servicos.textos;
    const acoes = [];

    if (['pendente', 'expirado'].includes(a.status)) {
      acoes.push({ texto: 'Cancelar', classe: 'btn-perigo', onClick: () => { setTimeout(() => cancelarGrupo(a.grupo), 50); } });
      if (ADMIN || (a.conferencia && a.conferencia.status === 'caiu')) acoes.push({ texto: 'Confirmar pagamento', classe: 'btn-ok', onClick: () => { setTimeout(() => abrirConfirmacao(a.grupo), 50); } });
    }
    if (a.status === 'confirmado') {
      acoes.push({ texto: 'Cancelar', classe: 'btn-perigo', onClick: async () => {
        const ok = await U.confirmar('Cancelar sessão', `Cancelar a sessão de ${esc(a.paciente.nome)} em ${U.fmtCurta(a.data)}?`, 'Cancelar sessão', true);
        if (!ok) return false;
        await DB.cancelar([a.id], S.nome); U.toast('Sessão cancelada.'); render();
      } });
      if (a.tipo !== 'conhecer') acoes.push({ texto: 'Remarcar', onClick: () => { setTimeout(() => abrirRemarcar(a), 50); } });
      acoes.push({ texto: 'Faltou', onClick: async () => {
        const ok = await U.confirmar('Paciente faltou?', `Confirma que <b>${esc(a.paciente.nome)}</b> não entrou na sessão de ${esc(U.fmtCurta(a.data))}, ${esc(U.fmtHora(a.hora))}, com ${esc(psi?.nome || 'o psicólogo')}?<br><br>Pela regra, falta sem aviso conta como sessão feita: o repasse ao psicólogo continua.`, 'Marcar falta', true);
        if (!ok) return false;
        await DB.atualizarStatus(a.id, 'falta', S.nome); U.toast('Marcado como falta.'); render();
      } });
      acoes.push({ texto: 'Realizado', classe: 'btn-primario', onClick: async () => { await DB.atualizarStatus(a.id, 'realizado', S.nome); U.toast('Marcado como realizado.'); render(); } });
    }
    if (a.status === 'falta') {
      if (a.tipo !== 'conhecer') acoes.push({ texto: 'Remarcar', classe: 'btn-primario', onClick: () => { setTimeout(() => abrirRemarcar(a), 50); } });
    }
    if (['realizado', 'falta'].includes(a.status)) {
      acoes.push({ texto: 'Voltar para confirmado', onClick: async () => {
        const ok = await U.confirmar('Voltar para confirmado?', `A sessão de <b>${esc(a.paciente.nome)}</b> deixa de contar como <b>${a.status === 'falta' ? 'falta' : 'realizada'}</b> e volta a ficar só confirmada, esperando o psicólogo marcar de novo.`
          + (a.repasse ? '<br><br><b>Atenção:</b> o repasse desta sessão já foi pago ao psicólogo.' : '<br><br>Ela sai do “A pagar” do Financeiro até ser marcada de novo.'), 'Voltar para confirmado', true);
        if (!ok) return false;
        await DB.atualizarStatus(a.id, 'confirmado', S.nome); U.toast('Voltou para confirmado.'); render();
      } });
    }
    acoes.push({ texto: 'Fechar', classe: 'btn-secundario' });

    const m = U.modal({
      titulo: `Atendimento #${esc(a.codigo)}`,
      largo: true,
      corpo: `
        <div class="resumo-modal">
          <dl class="info">
            <dt>Situação</dt><dd>${U.badge(a.status)} ${a.status === 'confirmado' ? (a.psiCiente ? '<span class="ciente-ok">✓ psicólogo ciente</span>' : '<span class="ciente-nao"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.4 5.3A10.6 10.6 0 0 1 12 5c5 0 9 4.5 10 7-.4 1-1.3 2.4-2.6 3.7M6.3 6.4C4.3 7.8 2.8 9.8 2 12c1 2.5 5 7 10 7 1.6 0 3.1-.4 4.4-1.1"/></svg>Psicólogo ainda não viu</span>') : ''}</dd>
            <dt>Quando</dt><dd>${U.fmtLonga(a.data)}, ${U.intervalo(a.hora, a.duracao)}${(n => n ? `<small class="nota-fuso">🌍 ${esc(n)}</small>` : '')(U.notaFuso(a, true))}</dd>
            <dt>Psicólogo</dt><dd>${esc(psi?.nome)}</dd>
            <dt>Paciente</dt><dd>${esc(a.paciente.nome)}<br><span class="muted">${esc(U.fmtTelefone(a.paciente.whatsapp))} · ${esc(a.paciente.email)}</span>${Auth.pode('pacientesFicha') ? `<br><a href="pacientes.html#p:${encodeURIComponent(U.chavePaciente(a.paciente))}">Ver ficha do paciente →</a>` : ''}</dd>
            <dt>Plano</dt><dd>${a.tipo === 'conhecer' ? 'Conversa de 15 min (Conheça o psicólogo) · sem valor' : `${a.tipo === 'mensal' ? `Mensal, sessão ${a.sessao} de ${a.totalSessoes}` : 'Avulsa'} · ${U.moeda(a.valor)} esta sessão`}</dd>
            ${a.linkMeet ? `<dt>Sala</dt><dd><a href="${esc(a.linkMeet)}" target="_blank" rel="noopener">${esc(a.linkMeet)}</a></dd>` : ''}
            ${a.aceite && a.aceite.em ? `<dt>Termos</dt><dd>Aceitou os Termos de uso em ${esc(U.fmtQuando(a.aceite.em))}${a.aceite.versao ? ` <span class="muted">(versão de ${esc(a.aceite.versao.split('-').reverse().join('/'))})</span>` : ''}</dd>` : ''}
          </dl>
        </div>
        ${a.status === 'confirmado' ? `
        <div class="acoes" style="margin-bottom:16px">
          <a class="btn btn-whats btn-peq" data-feito="Link enviado ao paciente" target="_blank" rel="noopener" href="${U.linkWhats(a.paciente.whatsapp, t.whatsPaciente([a], psi))}">Link no WhatsApp do paciente</a>
          <a class="btn btn-whats btn-whats-psi btn-peq" data-feito="Link enviado ao psicólogo" target="_blank" rel="noopener" href="${U.linkWhats(psi.whatsapp, t.whatsPsicologo([a], psi))}">Link no WhatsApp do psicólogo</a>
          <button type="button" class="btn btn-secundario btn-peq" id="m-reenviar">Reenviar e-mails</button>
        </div>` : ''}
        <h3 style="font-size:14px;margin-bottom:6px">Histórico</h3>
        <ul class="historico">${a.historico.slice().reverse().map(h => `<li><time>${U.fmtDataHoraCompleta(h.em)}</time><span>${esc(h.texto)}</span></li>`).join('')}</ul>`,
      acoes
    });
    const reenviar = $('#m-reenviar', m.el);
    if (reenviar) reenviar.onclick = async () => {
      await Servicos.notificarConfirmacao([a], psi);
      U.toast('E-mails reenviados ao paciente e ao psicólogo.');
      renderCaixa();
    };
  }

  /* Remarcar: em vez do calendário do navegador (que ficava atrás da janela),
     mostra só os dias que têm horário livre e, ao escolher o dia, os horários. */
  async function abrirRemarcar(a) {
    const psi = PSIS[a.psiId];
    const fp = a.fuso || psi.fuso || U.FUSO_BR, fc = a.fusoPaciente || fp, fora = !U.mesmoRelogio(fc, fp, U.msAg(a));
    const eraFalta = a.status === 'falta';
    let escolha = { data: '', hora: '' };
    const m = U.modal({
      titulo: 'Remarcar sessão',
      largo: true,
      corpo: `
        <dl class="rm-quem">
          <div><dt class="rm-rot rm-pac">Paciente</dt><dd><strong>${esc(a.paciente.nome)}</strong>${(n => n ? `<span class="nota-fuso">🌍 ${esc(n)}</span>` : '')(U.notaFuso(a, true))}</dd></div>
          <div><dt class="rm-rot rm-psi">Psicólogo</dt><dd><strong>${esc(psi.nome)}</strong></dd></div>
          <div><dt class="rm-rot rm-era">Era</dt><dd><strong>${U.fmtCurta(a.data)}, ${U.fmtHora(a.hora)}</strong>${eraFalta ? ' ' + U.badge('falta') : ''}</dd></div>
        </dl>
        ${eraFalta ? `<p class="remarcar-nota">A sessão <b>muda de data</b> e volta para <b>Confirmado</b> (não vira uma sessão nova). A falta sai do Financeiro${a.repasse ? ' — o repasse dela <b>já foi pago</b>, então não será pago de novo' : ''}; o repasse entra quando a nova sessão for marcada como realizada.</p>` : ''}
        <div class="rm-zap">
          <a class="btn btn-whats" target="_blank" rel="noopener" href="${U.linkWhats(a.paciente.whatsapp, Servicos.textos.whatsRemarcarConvite(a, psi, S.nome))}">${ICO_ZAP}Falar com ${esc(U.primeiroNome(a.paciente.nome))} no WhatsApp</a>
          <span class="muted">Combine o novo dia com o paciente e depois escolha aqui embaixo.</span>
        </div>
        <div data-rm-modo></div>
        <div class="rm-rotulo">1. Escolha o dia <span class="muted" data-rm-qtd></span></div>
        <div class="rm-dias" data-rm-dias><span class="muted">Carregando horários livres…</span></div>
        <div class="rm-rotulo">2. Escolha o horário</div>
        <div class="rm-horas" data-rm-horas><span class="muted">Escolha um dia acima.</span></div>
        <p class="ajuda">${!U.mesmoRelogio(psi.fuso, U.FUSO_BR) ? `<b>Horários no fuso de ${esc(U.nomeFuso(psi.fuso))}</b>, onde ${esc(U.primeiroNome(psi.nome))} atende. ` : ''}Só aparecem os horários livres da disponibilidade de ${esc(U.primeiroNome(psi.nome))} (próximos ${C.diasVisiveis} dias). Se o paciente pedir um horário que não está aqui, ofereça um dos livres ou peça para ${esc(U.primeiroNome(psi.nome))} abrir o horário em Disponibilidade. O link da sala continua o mesmo, e paciente e psicólogo recebem um e-mail.</p>`,
      acoes: [
        { texto: 'Voltar' },
        { texto: 'Salvar nova data', classe: 'btn-primario', onClick: async () => {
          if (!escolha.data || !escolha.hora) { U.toast('Escolha o dia e o horário.', 'erro'); return false; }
          const novo = await DB.remarcar(a.id, escolha.data, escolha.hora, S.nome);
          await Servicos.notificarRemarcacao(novo, psi);
          const vp = U.paraFuso(escolha.data, escolha.hora, fp, fc);
          render();
          posRemarcacao(novo, psi, `${U.fmtCurta(escolha.data)}, ${U.fmtHora(escolha.hora)}${fora ? ` (${U.fmtHora(vp.hora)} para o paciente, em ${U.cidadeFuso(fc)})` : ''}`);
        } }
      ]
    });
    m.el.classList.add('modal-remarcar');
    const boxDias = $('[data-rm-dias]', m.corpo), boxHoras = $('[data-rm-horas]', m.corpo);
    let dias = [];
    try { dias = await DB.diasComHorario(a.psiId, { ignorarIds: [a.id], equipe: true }); }
    catch (err) { boxDias.innerHTML = `<span class="muted">${esc(err.message || 'Não consegui carregar os horários.')}</span>`; return; }
    if (!dias.length) {
      boxDias.innerHTML = `<div class="rm-vazio">${esc(U.primeiroNome(psi.nome))} não tem nenhum horário livre nos próximos ${C.diasVisiveis} dias. Peça para abrir horários em <b>Disponibilidade</b> e tente de novo.</div>`;
      boxHoras.innerHTML = ''; return;
    }
    /* FUSO: dá para ver os horários no fuso do paciente (quando ele está em outro país e pede "quero às 13h")
       ou no do psicólogo. O que se grava é sempre o horário do psicólogo. */
    const rotPsi = U.mesmoRelogio(fp, U.FUSO_BR) ? 'de Brasília' : `de ${U.cidadeFuso(fp)} (psicólogo)`;
    let modo = fora ? 'paciente' : 'psi';
    const fusoVer = () => (modo === 'paciente' ? fc : fp), fusoOutro = () => (modo === 'paciente' ? fp : fc);
    if (fora) {
      $('[data-rm-modo]', m.corpo).innerHTML = `<div class="rm-modo" role="radiogroup" aria-label="Mostrar os horários no fuso de">
        <span>Mostrar no horário:</span>
        <button type="button" role="radio" data-modo="paciente">do paciente (${esc(U.cidadeFuso(fc))})</button>
        <button type="button" role="radio" data-modo="psi">${esc(rotPsi)}</button></div>`;
    }
    let diasV = [];
    const montar = () => {
      const mapa = {};
      dias.forEach(d => d.horas.forEach(h => { const v = U.paraFuso(d.data, h, fp, fusoVer()); (mapa[v.data] = mapa[v.data] || []).push({ v: v.hora, p: { data: d.data, hora: h } }); }));
      diasV = Object.keys(mapa).sort().map(data => ({ data, horas: mapa[data].sort((x, y) => x.v.localeCompare(y.v)) }));
      $('[data-rm-qtd]', m.corpo).textContent = `(${diasV.length} ${diasV.length > 1 ? 'dias' : 'dia'} com horário livre${fora ? `, no horário ${modo === 'paciente' ? `do paciente, em ${U.cidadeFuso(fc)}` : rotPsi}` : ''})`;
      m.corpo.querySelectorAll('[data-modo]').forEach(b => { const on = b.dataset.modo === modo; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
      const hoje = U.hojeISO(fusoVer()), amanha = U.addDias(hoje, 1);
      boxDias.innerHTML = diasV.map(d => `<button type="button" class="rm-dia" data-dia="${d.data}">
          <small>${d.data === hoje ? 'Hoje' : d.data === amanha ? 'Amanhã' : esc(U.fmtCurta(d.data).split(',')[0])}</small>
          <b>${esc(U.fmtDDMM(d.data))}</b>
          <span>${d.horas.length} ${d.horas.length > 1 ? 'horários' : 'horário'}</span>
        </button>`).join('');
      const sel = escolha.data && diasV.find(d => d.horas.some(x => x.p.data === escolha.data && x.p.hora === escolha.hora));
      mostrarHoras(sel ? sel.data : diasV[0].data, true);
    };
    const mostrarHoras = (data, manter) => {
      const d = diasV.find(x => x.data === data);
      if (!manter) escolha = { data: '', hora: '' };
      boxDias.querySelectorAll('.rm-dia').forEach(b => b.classList.toggle('on', b.dataset.dia === data));
      boxHoras.innerHTML = d.horas.map(x => {
        const o = U.paraFuso(x.p.data, x.p.hora, fp, fusoOutro());
        const on = x.p.data === escolha.data && x.p.hora === escolha.hora;
        return `<button type="button" class="rm-hora${on ? ' on' : ''}" data-p="${x.p.data}|${x.p.hora}">${esc(U.intervalo(x.v, a.duracao))}${fora ? `<small>${esc(U.fmtHora(o.hora))}${o.data !== d.data ? ` (${esc(U.fmtCurta(o.data).split(',')[0].toLowerCase())})` : ''} ${modo === 'paciente' ? esc(rotPsi) : `em ${esc(U.cidadeFuso(fc))}`}</small>` : ''}</button>`;
      }).join('');
    };
    boxDias.addEventListener('click', e => { const b = e.target.closest('.rm-dia'); if (b) mostrarHoras(b.dataset.dia); });
    boxHoras.addEventListener('click', e => {
      const b = e.target.closest('.rm-hora'); if (!b) return;
      const [pd, ph] = b.dataset.p.split('|'); escolha = { data: pd, hora: ph };
      boxHoras.querySelectorAll('.rm-hora').forEach(x => x.classList.toggle('on', x === b));
    });
    m.corpo.addEventListener('click', e => { const b = e.target.closest('[data-modo]'); if (b && b.dataset.modo !== modo) { modo = b.dataset.modo; montar(); } });
    montar();
  }

  /* Cadastro de psicólogos (acesso, valor e comissão) fica na área
     "Psicólogos" do painel (psicologos.html). */

  /* =====================================================================
     REPASSES (só admin)
     ===================================================================== */
  /* Repasses: foram para a área Financeiro (painel/financeiro.html) */

  /* =====================================================================
     E-MAILS ENVIADOS
     ===================================================================== */
  /* E-mails enviados: caixinhas, 8 por página; clicou → abre o e-mail inteiro */
  const CAIXA_POR_PAGINA = 8;
  let CAIXA = [], caixaPag = 1;
  async function renderCaixa() {
    CAIXA = await DB.listarCaixaSaida();
    $('#caixa-qtd').textContent = CAIXA.length || '';
    desenharCaixa();
  }
  function situacaoEmail(e) {
    if (DB.modo === 'local') return { cls: 'sim', txt: 'Modo teste' };
    if (e.estado === 'SUCCESS') return { cls: 'ok', txt: '✓ Enviado' };
    if (e.estado === 'ERROR') return { cls: 'erro', txt: '✗ Erro no envio' };
    if (e.estado) return { cls: 'fila', txt: 'Enviando…' };
    return { cls: 'fila', txt: 'Na fila' };
  }
  function desenharCaixa() {
    const box = $('#lista-caixa');
    $('#caixa-q').closest('.lista-busca').hidden = !CAIXA.length;
    if (!CAIXA.length) { box.innerHTML = `<div class="vazio"><strong>Nenhum e-mail ainda.</strong>Confirme uma pré-reserva para ver os e-mails que paciente e psicólogo recebem.</div>`; $('#caixa-pag').innerHTML = ''; return; }
    const q = norm($('#caixa-q').value.trim());
    const vis = CAIXA.filter(e => !q || q.split(/\s+/).every(t => norm(`${e.assunto} ${e.para} ${e.corpo}`).includes(t)));
    const r = Paginacao.fatiar(vis, caixaPag, CAIXA_POR_PAGINA); caixaPag = r.pag;
    $('#caixa-pag').innerHTML = Paginacao.html(r, ['e-mail', 'e-mails']);
    if (!vis.length) { box.innerHTML = `<div class="vazio"><strong>Nenhum e-mail com essa busca.</strong>Confira o assunto ou o destinatário.</div>`; return; }
    const fila = DB.modo !== 'local' && CAIXA.some(e => !e.estado);
    box.innerHTML = (fila ? `<p class="caixa-aviso">“Na fila” = ainda não saiu. O envio automático precisa do SMTP em Configurações e da função de e-mail instalada.</p>` : '') +
      `<div class="caixa-grade">${r.itens.map(e => { const s = situacaoEmail(e); return `
      <button type="button" class="caixa-card" data-email="${esc(e.id)}">
        <span class="caixa-topo"><span class="caixa-sit ${s.cls}">${s.txt}</span><small>${U.fmtDataHoraCompleta(e.em)}</small></span>
        <strong>${esc(e.assunto || '(sem assunto)')}</strong>
        <span class="caixa-para">Para: ${esc(e.para)}</span>
        <span class="caixa-trecho">${esc(String(e.corpo || '').replace(/\s+/g, ' ').slice(0, 140))}</span>
        <span class="caixa-ver">Ver e-mail →</span>
      </button>`; }).join('')}</div>`;
  }
  $('#caixa-q').addEventListener('input', () => { caixaPag = 1; desenharCaixa(); });
  Paginacao.ligar($('#caixa-pag'), n => { caixaPag = n; desenharCaixa(); }, $('#lista-caixa'));
  $('#lista-caixa').addEventListener('click', ev => {
    const b = ev.target.closest('[data-email]'); if (!b) return;
    const e = CAIXA.find(x => String(x.id) === b.dataset.email); if (!e) return;
    const s = situacaoEmail(e);
    U.modal({
      titulo: e.assunto || '(sem assunto)', largo: true,
      corpo: `<div class="caixa-det"><p><b>Para:</b> ${esc(e.para)}<br><b>Quando:</b> ${U.fmtDataHoraCompleta(e.em)}<br><b>Situação:</b> <span class="caixa-sit ${s.cls}">${s.txt}</span></p><pre>${esc(e.corpo)}</pre></div>`,
      acoes: [{ texto: 'Fechar', classe: 'btn-secundario' }]
    });
  });
  $('#limpar-caixa').onclick = async () => { try { await DB.limparCaixaSaida(); renderCaixa(); } catch (e) { U.toast(e.message, 'erro'); } };

  const resetar = $('#resetar');
  if (resetar) resetar.onclick = async () => {
    const ok = await U.confirmar('Apagar dados de teste', 'Isso apaga tudo o que foi feito nos testes e volta aos dados de exemplo.', 'Apagar e recomeçar', true);
    if (!ok) return;
    await DB.resetarDemo();
    U.toast('Dados de exemplo restaurados.');
    render();
  };

  /* =====================================================================
     CONVERSAS DE 15 MIN (v266)
     Pedidos do "Conheça o psicólogo em 15 minutos" (página /conhecer/ do site).
     1) WhatsApp com a pessoa → 2) escolher psicólogo e horário → conversa marcada
     (vira um atendimento "conhecer", sem valor, que ocupa o horário inteiro do psicólogo)
     → depois da conversa: "Virou paciente" ou "Não seguiu".
     ===================================================================== */
  const CN_POR_PAGINA = 6;
  /* v286: por que a pessoa não seguiu (opcional, um toque) */
  const MOTIVOS_NAO = { nao_respondeu: 'Não respondeu', caro: 'Achou caro', horario: 'Não tinha horário bom', outro_lugar: 'Escolheu outro lugar', outro: 'Outro motivo' };
  function perguntarMotivoNao(p) {
    let motivo = '';
    const m = U.modal({
      titulo: 'Não seguiu?',
      corpo: `<p>O pedido de <b>${esc(nomeBonito(p.paciente.nome))}</b> vai para “Concluídos”.</p>
        <p class="cn-mot-tit">Por quê? <span class="muted">(opcional)</span></p>
        <div class="cn-mot-ops" role="radiogroup" aria-label="Motivo">${Object.entries(MOTIVOS_NAO).map(([k, t]) => `<button type="button" role="radio" aria-checked="false" class="cn-mot" data-mot="${k}">${esc(t)}</button>`).join('')}</div>`,
      acoes: [
        { texto: 'Voltar' },
        { texto: 'Mover para Concluídos', classe: 'btn-primario', onClick: async () => {
          try { await DB.atualizarConhecer(p.id, { status: 'nao', motivo }, S.nome); U.toast('Pedido movido para Concluídos.'); renderConhecer(); }
          catch (err) { U.toast(err.message || 'Não consegui.', 'erro'); return false; }
        } }
      ]
    });
    m.corpo.addEventListener('click', e => {
      const b = e.target.closest('[data-mot]'); if (!b) return;
      motivo = motivo === b.dataset.mot ? '' : b.dataset.mot;   /* tocar de novo desmarca */
      m.corpo.querySelectorAll('[data-mot]').forEach(x => x.setAttribute('aria-checked', String(x.dataset.mot === motivo)));
    });
  }
  const CN_FECHADOS = ['paciente', 'nao'];
  const CN_ROTULO = { novo: 'Novo', contato: 'Em contato', marcada: 'Conversa marcada', paciente: 'Virou paciente', nao: 'Não seguiu' };
  let CN = [], cnPag = 1, cnFiltro = 'abertos', CN_AG = {}, PERFIS = null, CONVERSAS = [];
  /* v267: limite de conversas por paciente (mesmo WhatsApp ou mesmo e-mail) */
  const LIMITE_CN = C.limiteConversas || 10;
  const mesmaPessoaCn = (a, b) => { const wa = U.whatsNumero(a && a.whatsapp), wb = U.whatsNumero(b && b.whatsapp), ea = String((a && a.email) || '').trim().toLowerCase(), eb = String((b && b.email) || '').trim().toLowerCase(); return !!((wa && wa === wb) || (ea && ea === eb)); };
  const usadasCn = p => CONVERSAS.filter(a => ['confirmado', 'realizado', 'falta'].includes(a.status) && mesmaPessoaCn(a.paciente, p.paciente)).sort((x, y) => (x.data + x.hora).localeCompare(y.data + y.hora));
  function limiteCnHTML(p) {
    const u = usadasCn(p); if (!u.length) return '';
    const cheio = u.length >= LIMITE_CN, rot = { confirmado: 'marcada', realizado: 'realizada', falta: 'faltou' };
    return `<div class="cn-limite${cheio ? ' cheio' : ''}">
        <div class="cn-limite-t">Conversas usadas <span>${u.length} de ${LIMITE_CN}</span></div>
        <div class="cn-limite-barra"><i style="width:${Math.min(100, Math.round(u.length / LIMITE_CN * 100))}%"></i></div>
        <ul>${u.map(a => `<li><b>${esc(nomePsi(a.psiId))}</b> · ${esc(U.fmtDDMM(a.data))} · ${rot[a.status] || a.status}</li>`).join('')}</ul>
      </div>`;
  }

  /* perfis do site (temas, público, tratamento) para sugerir quem combina com as respostas */
  async function carregarPerfis() {
    if (PERFIS) return PERFIS;
    let l = [];
    try { if (window.NUVEM) l = await NUVEM.lista('psicologos'); } catch (e) { l = []; }
    if (!l.length && !window.FIREBASE_CONFIG) { try { l = (JSON.parse(localStorage.getItem('pb-painel-v1')) || {}).psicologos || []; } catch (e) { l = []; } }
    PERFIS = {};
    l.forEach(p => { const id = p.agendaId || p.slug; if (id) PERFIS[id] = p; });
    return PERFIS;
  }

  const raizes = t => norm(t).split(/[^a-z0-9+]+/).filter(w => w.length >= 3 && !['com', 'para', 'das', 'dos'].includes(w)).map(w => w.slice(0, 5));
  const PUBLICO = { Casal: 'casa', 'Criança': 'cria', Adolescente: 'adole', 'Família': 'famil', Individual: 'adult' };
  /* nota de 0 a N e os motivos da indicação (o que aparece em verde no cartão) */
  function combinar(pedido, psi) {
    const pf = PERFIS[psi.id] || {};
    const temas = (pf.temas || []).map(norm), publico = (pf.publico || []).map(norm);
    let nota = 0; const porque = [];
    (pedido.motivos || []).filter(m => m !== 'Outro').forEach(m => {
      const r = raizes(m);
      if (temas.some(t => r.some(x => t.split(/[^a-z0-9+]+/).some(w => w.startsWith(x))))) { nota += 3; porque.push(m); }
    });
    const pub = PUBLICO[pedido.tipoSessao];
    if (pub && publico.length) {
      if (publico.some(p => p.startsWith(pub))) { nota += pedido.tipoSessao === 'Individual' ? 1 : 3; if (pedido.tipoSessao !== 'Individual') porque.push(`Atende ${pedido.tipoSessao.toLowerCase()}`); }
      else nota -= 5;
    }
    const prefs = pedido.preferencias || [], trat = norm(pf.tratamento || '');
    if (prefs.includes('Psicóloga mulher')) { if (trat === 'psicologa') { nota += 2; porque.push('Psicóloga'); } else nota -= 2; }
    if (prefs.includes('Psicólogo homem')) { if (trat === 'psicologo') { nota += 2; porque.push('Psicólogo'); } else nota -= 2; }
    if (prefs.includes('LGBTQIA+ friendly') && temas.some(t => t.includes('lgbt'))) { nota += 2; porque.push('LGBTQIA+'); }
    return { nota, porque };
  }
  /* o horário cabe no que a pessoa pediu? */
  function noPeriodo(data, hora, pedido) {
    const h = Number(String(hora).slice(0, 2)), dow = new Date(data + 'T12:00:00').getDay();
    switch (pedido.horario) {
      case 'Manhãs': return h < 12;
      case 'Tardes': return h >= 12 && h < 18;
      case 'Noites': return h >= 18;
      case 'Fim de semana': return dow === 0 || dow === 6;
      default: return true;
    }
  }

  /* v276: horários de conversa livres de todos os psicólogos (para a mensagem e o cartão dizerem o horário real) */
  let LIVRES = null, LIVRES_EM = 0;
  async function carregarLivres(forcar) {
    if (!forcar && LIVRES && Date.now() - LIVRES_EM < 60e3) return LIVRES;
    const novo = {}; let conv = {};
    try { conv = DB.listarConversas15 ? await DB.listarConversas15() : {}; } catch (e) { conv = {}; }
    await Promise.all(Object.keys(conv).filter(id => conv[id] && conv[id].ativo && PSIS[id] && PSIS[id].ativo !== false)
      .map(async id => { try { novo[id] = await DB.livres15(id); } catch (e) { novo[id] = []; } }));
    LIVRES = novo; LIVRES_EM = Date.now();
    return LIVRES;
  }
  /* o horário de conversa mais cedo para esta pessoa: primeiro no período que ela marcou; senão, o mais cedo de todos */
  function proximoCn(p) {
    if (!LIVRES) return null;
    const ja = new Set(usadasCn(p).map(a => a.psiId)), todos = [];
    Object.entries(LIVRES).forEach(([id, l]) => { if (!ja.has(id)) l.forEach(x => todos.push({ ...x, psiId: id })); });
    todos.sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
    return todos.find(x => noPeriodo(x.data, x.hora, p)) || todos[0] || null;
  }
  const periodoDe = h => { const n = Number(String(h).slice(0, 2)); return n < 12 ? ' de manhã' : n < 18 ? ' à tarde' : ' à noite'; };
  const diaCn = d => { const hoje = U.hojeISO(); return d === hoje ? 'hoje' : d === U.addDias(hoje, 1) ? 'amanhã' : `${U.fmtLonga(d).split(',')[0]} (${U.fmtDDMM(d)})`; };
  function proximoCnHTML(p) {
    if (!cnAberto(p) || p.status === 'marcada' || !LIVRES) return '';
    const x = proximoCn(p);
    if (!x) {
      /* v278: diz o motivo quando o único psicólogo com horário já conversou com esta pessoa */
      const ja = [...new Set(usadasCn(p).map(a => a.psiId))].filter(id => (LIVRES[id] || []).length);
      return ja.length
        ? `<div class="cn-prox sem">Só ${esc(ja.map(nomePsi).join(' e '))} ${ja.length > 1 ? 'têm' : 'tem'} horário livre, e esta pessoa já conversou com ${esc(ja.map(id => U.primeiroNome(nomePsi(id))).join(' e '))}. Peça a outros psicólogos para abrirem horários.</div>`
        : `<div class="cn-prox sem">Nenhum horário de conversa livre agora. Peça aos psicólogos para abrirem horários.</div>`;
    }
    return `<div class="cn-prox${noPeriodo(x.data, x.hora, p) ? '' : ' fora'}">Próximo horário livre: <b>${esc(diaCn(x.data))}, ${esc(U.fmtHora(x.hora))}</b> · ${esc(nomePsi(x.psiId))}${noPeriodo(x.data, x.hora, p) ? '' : ' <small>(fora do período que a pessoa pediu)</small>'}</div>`;
  }

  async function renderConhecer() {
    if (!DB.listarConhecer) return;
    try { CN = await DB.listarConhecer(); } catch (e) { CN = []; }
    CN.sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
    /* conversa marcada: busca o atendimento para saber se já aconteceu */
    CN_AG = {};
    try { CONVERSAS = DB.listarConversas ? await DB.listarConversas() : []; } catch (e) { CONVERSAS = []; }
    CN.forEach(p => { const a = p.agId && CONVERSAS.find(x => x.id === p.agId); if (a) CN_AG[p.id] = a; });
    if (CN.some(p => cnAberto(p) && p.status !== 'marcada')) await carregarLivres();
    /* v280: o número da aba soma os pedidos novos + as conversas em que o psicólogo já confirmou e falta avisar o paciente */
    const novos = CN.filter(p => p.status === 'novo').length;
    const avisar = CONVERSAS.filter(a => a.status === 'confirmado' && a.psiCiente && !(a.lembretes || {}).horario && U.dataHora(a.data, a.hora, a.fuso).getTime() + (a.duracao || 15) * 60e3 > Date.now()).length;
    const cont = $('[data-cont="cn"]');
    cont.textContent = (novos + avisar) || '';
    cont.title = [novos ? `${novos} pedido${novos > 1 ? 's' : ''} novo${novos > 1 ? 's' : ''}` : '', avisar ? `${avisar} para avisar o paciente` : ''].filter(Boolean).join(' · ');
    desenharConhecer();
  }
  const cnAberto = p => !CN_FECHADOS.includes(p.status);
  const textoCn = p => norm(`${p.paciente.nome} ${p.paciente.email} ${p.paciente.whatsapp} ${U.digitos(p.paciente.whatsapp)} ${(p.motivos || []).join(' ')} ${p.tipoSessao} ${CN_AG[p.id] ? nomePsi(CN_AG[p.id].psiId) : ''}`);
  /* v283: no celular, só as 3 primeiras etiquetas e um "+N" que abre o resto */
  const CHIPS_VIS = 3;
  const chipsCn = (l, cls = '') => (l || []).length ? `<span class="cn-chips">${l.map((x, i) => `<span class="cn-chip${cls}${i >= CHIPS_VIS ? ' cn-chip-extra' : ''}">${esc(x)}</span>`).join('')}${l.length > CHIPS_VIS ? `<button type="button" class="cn-chip cn-chip-mais" data-mais-chips aria-label="Ver mais ${l.length - CHIPS_VIS}">+${l.length - CHIPS_VIS}</button>` : ''}</span>` : '<span class="muted">—</span>';
  document.addEventListener('click', e => { const b = e.target.closest('[data-mais-chips]'); if (!b) return; b.closest('.cn-chips').classList.add('aberto'); b.remove(); });

  function desenharConhecer() {
    const box = $('#lista-cn');
    const abertos = CN.filter(cnAberto), fechados = CN.filter(p => !cnAberto(p));
    $('[data-cn-n="abertos"]').textContent = abertos.length ? ` · ${abertos.length}` : '';
    $('[data-cn-n="fechados"]').textContent = fechados.length ? ` · ${fechados.length}` : '';
    $$('[data-cn-f]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.cnF === cnFiltro)));
    const base = cnFiltro === 'abertos' ? abertos : fechados;
    $('#cn-q').closest('.lista-busca').hidden = !CN.length;
    if (!CN.length) {
      box.innerHTML = `<div class="vazio"><strong>Nenhum pedido ainda.</strong>Quando alguém responder o “Conheça o psicólogo em 15 minutos” no site, o pedido aparece aqui.</div>`;
      $('#cn-pag').innerHTML = ''; return;
    }
    const q = norm($('#cn-q').value.trim());
    const vis = base.filter(p => !q || q.split(/\s+/).every(t => textoCn(p).includes(t)));
    const r = Paginacao.fatiar(vis, cnPag, CN_POR_PAGINA); cnPag = r.pag;
    $('#cn-pag').innerHTML = Paginacao.html(r, ['pedido', 'pedidos']);
    if (!vis.length) {
      box.innerHTML = `<div class="vazio"><strong>${q ? 'Nenhum pedido com essa busca.' : cnFiltro === 'abertos' ? 'Nenhum pedido em aberto.' : 'Nenhum pedido concluído ainda.'}</strong>${q ? 'Confira o nome, o WhatsApp ou o e-mail.' : cnFiltro === 'abertos' ? 'Tudo em dia por aqui.' : 'Quando um pedido virar paciente ou não seguir, ele vem para cá.'}</div>`;
      return;
    }
    box.innerHTML = `<div class="cards">${r.itens.map(cartaoCn).join('')}</div>`;
  }

  function cartaoCn(p) {
    const a = CN_AG[p.id] && CN_AG[p.id].status !== 'cancelado' ? CN_AG[p.id] : null;
    const st = p.status;
    const contato = p.contato || null;
    const nome = nomeBonito(p.paciente.nome);
    const zap1 = `<a class="btn btn-whats btn-passo btn-wa-pre${contato ? ' feito' : ''}" target="_blank" rel="noopener" data-cn-zap="${esc(p.id)}" href="${U.linkWhats(p.paciente.whatsapp, txtCnOla(p))}">${contato
      ? `<span class="passo-n passo-ok" aria-hidden="true">✓</span>Mensagem enviada<small>${esc(U.primeiroNome(contato.por || ''))} · ${esc(U.fmtQuando(contato.em))} · abrir de novo</small>`
      : `<span class="passo-n" aria-hidden="true">1</span>${ICO_ZAP}Falar com ${esc(U.primeiroNome(nome))} no WhatsApp`}</a>`;
    let meio = '', acoes = '';
    if (st === 'marcada' && a) {
      const quando = `${U.fmtLonga(a.data)}, ${U.intervalo(a.hora, a.duracao)}`;
      const feito = a.status === 'realizado', faltou = a.status === 'falta';
      meio = `<div class="cn-marcada${feito ? ' ok' : faltou ? ' falta' : ''}">
          <b>${feito ? '✓ Conversa feita' : faltou ? 'Não compareceu' : 'Conversa marcada'}</b>
          <span>${esc(nomePsi(a.psiId))} · ${esc(quando)}</span>
          ${!feito && !faltou ? `<small>${a.psiCiente ? '✓ Psicólogo ciente' : 'O psicólogo ainda não clicou em “Estou ciente”'}</small>` : ''}
        </div>`;
      if (feito) acoes = `<div class="acoes cn-acoes"><button class="btn btn-ok" data-cn="paciente" data-id="${esc(p.id)}">Virou paciente</button><button class="btn btn-secundario" data-cn="nao" data-id="${esc(p.id)}">Não seguiu</button></div>`;
      else if (faltou) acoes = `<div class="acoes cn-acoes"><button class="btn btn-primario" data-cn="remarcar" data-id="${esc(p.id)}">Marcar de novo</button><button class="btn btn-secundario" data-cn="nao" data-id="${esc(p.id)}">Não seguiu</button></div>`;
      else acoes = (a.psiCiente
        ? ((a.lembretes || {}).horario
          ? `<a class="btn btn-whats btn-passo btn-wa-pre feito" target="_blank" rel="noopener" href="${U.linkWhats(p.paciente.whatsapp, txtCnMarcada(p, a))}"><span class="passo-n passo-ok" aria-hidden="true">✓</span>Horário enviado ao paciente<small>${esc(U.fmtQuando(a.lembretes.horario))} · abrir de novo</small></a>`
          : `<a class="btn btn-whats btn-passo" target="_blank" rel="noopener" data-cn-horario="${esc(a.id)}" href="${U.linkWhats(p.paciente.whatsapp, txtCnMarcada(p, a))}">${ICO_ZAP}Mandar o horário e o link ao paciente</a>`)
        : `<a class="btn btn-whats btn-whats-psi btn-passo" target="_blank" rel="noopener" data-feito="Enviado ao psicólogo" href="${U.linkWhats((PSIS[a.psiId] || {}).whatsapp || '', txtCnPsi(p, a))}">${ICO_ZAP}Avisar o psicólogo no WhatsApp</a>
          <span class="btn btn-passo btn-travado-psi" title="Libera quando o psicólogo clicar em “Estou ciente”">${CAD_P}Paciente: libera quando o psicólogo confirmar</span>`) + `
        <div class="acoes cn-acoes"><button class="btn btn-secundario" data-cn="detalhes" data-ag="${esc(a.id)}">Detalhes</button><button class="btn btn-perigo" data-cn="desmarcar" data-id="${esc(p.id)}">Desmarcar</button></div>`;
    } else if (cnAberto(p) && usadasCn(p).length >= LIMITE_CN) {
      acoes = `<div class="cn-bloq">Limite de conversas atingido<small>Ofereça uma primeira sessão com o psicólogo de que a pessoa mais gostou.</small></div>
        <div class="cn-desistiu"><span>Como terminou?</span><span class="cn-desistiu-bts"><button type="button" class="cn-btn-ok" data-cn="paciente" data-id="${esc(p.id)}">Virou paciente</button><button type="button" class="cn-btn-nao" data-cn="nao" data-id="${esc(p.id)}">Não seguiu</button></span></div>`;
    } else if (cnAberto(p)) {
      acoes = `${zap1}
        <button class="btn btn-primario btn-passo" data-cn="marcar" data-id="${esc(p.id)}"><span class="passo-n" aria-hidden="true">2</span>${ICO_RELOGIO}${usadasCn(p).length ? 'Marcar outra conversa' : 'Escolher psicólogo e horário'}</button>
        <div class="cn-desistiu"><span>A pessoa desistiu?</span><button type="button" class="cn-btn-nao" data-cn="nao" data-id="${esc(p.id)}">Não quis seguir</button></div>`;
    } else {
      acoes = `<div class="cn-desistiu"><span>Pedido encerrado</span><button type="button" class="cn-btn-neutro" data-cn="contato" data-id="${esc(p.id)}">Reabrir pedido</button></div>`;
    }
    return `
      <article class="card card-cn cnc-${st}">
        <div class="card-topo">
          <span class="cn-st cn-st-${st}">${CN_ROTULO[st] || st}</span>
          <span class="direita" title="${esc(U.fmtDataHoraCompleta(p.criadoEm))}">Pediu ${esc(U.fmtQuando(p.criadoEm))}</span>
        </div>
        <h3>${esc(nome)}</h3>
        <div class="contato">${esc(U.fmtTelefone(p.paciente.whatsapp))} · ${esc(p.paciente.email)}</div>
        <dl class="info cn-info">
          <dt>Para</dt><dd>${esc(p.tipoSessao || '—')}</dd>
          <dt>Motivos</dt><dd>${chipsCn(p.motivos)}</dd>
          ${(p.objetivos || []).length ? `<dt>Objetivos</dt><dd>${chipsCn(p.objetivos, ' leve')}</dd>` : ''}
          ${(p.preferencias || []).length ? `<dt>Prefere</dt><dd>${chipsCn(p.preferencias, ' leve')}</dd>` : ''}
          <dt>Horário</dt><dd>${esc(p.horario || '—')}</dd>
        </dl>
        ${p.sobre ? `<details class="cn-sobre"><summary>O que a pessoa contou</summary><p>${esc(p.sobre)}</p></details>` : ''}
        ${st === 'nao' && p.motivoNao && MOTIVOS_NAO[p.motivoNao] ? `<p class="cn-motivo-nao">Motivo: <b>${esc(MOTIVOS_NAO[p.motivoNao])}</b></p>` : ''}
        <div class="cn-rodape">
          ${meio}
          ${proximoCnHTML(p)}
          ${limiteCnHTML(p)}
          ${acoes}
        </div>
      </article>`;
  }

  /* ---------- textos do WhatsApp ---------- */
  /* v274: nome de quem manda a mensagem — conta genérica ("Equipe de suporte") vira "da equipe" */
  const quemAtende = () => { const n = U.primeiroNome(S.nome || ''); return !n || /^(equipe|suporte|admin|administrador)$/i.test(n) ? '' : n; };
  /* v276: primeira mensagem curta, com o horário real mais cedo (hoje, amanhã ou o próximo dia livre) */
  function txtCnOla(p) {
    const quem = quemAtende(), x = proximoCn(p);
    let quando;
    if (!x) quando = 'Já estamos vendo os horários e te mandamos as opções em seguida, tá bom?';
    else {
      const d = diaCn(x.data);
      quando = d === 'hoje' ? `Temos horário ainda hoje${periodoDe(x.hora)}. Pode ser?`
        : d === 'amanhã' ? `Temos horário já amanhã${periodoDe(x.hora)}. Pode ser?`
        : `O próximo horário livre é ${d}${periodoDe(x.hora)}. Pode ser?`;
    }
    return `Olá, ${U.primeiroNome(nomeBonito(p.paciente.nome))}! ${quem ? `Aqui é ${quem}, da equipe Psicólogos Brasil.` : 'Aqui é da equipe Psicólogos Brasil.'} `
      + `Recebemos suas respostas e já separamos psicólogos que combinam com você.\n\n`
      + `A conversa é rápida, 15 minutos por vídeo, para vocês se conhecerem. ${quando}`;
  }
  function txtCnMarcada(p, a) {
    return `Pronto, ${U.primeiroNome(nomeBonito(p.paciente.nome))}! Sua conversa de 15 minutos está marcada.\n\n`
      + `Psicólogo(a): ${nomePsi(a.psiId)}\nQuando: ${U.fmtLonga(a.data)}, às ${U.fmtHora(a.hora)} (horário de Brasília)\nPor vídeo: ${a.linkMeet || '(mandamos o link em seguida)'}\n\n`
      + `É só entrar pelo link no horário. Se precisar mudar, fale com a gente por aqui.`;
  }
  function txtCnPsi(p, a) {
    const r = a.resumo || {};
    return `Olá, ${U.primeiroNome(nomePsi(a.psiId))}! Marcamos uma conversa de 15 minutos (Conheça o psicólogo) com ${nomeBonito(p.paciente.nome)}.\n\n`
      + `Quando: ${U.fmtLonga(a.data)}, às ${U.fmtHora(a.hora)}\nLink: ${a.linkMeet || '—'}\n`
      + `${(r.motivos || []).length ? `Motivos: ${r.motivos.join(', ')}\n` : ''}\nO resumo completo das respostas está na sua agenda no painel. Depois da conversa, marque “Realizado”.`;
  }

  /* ---------- escolher psicólogo e horário ---------- */
  async function abrirMarcarCn(id) {
    const p = CN.find(x => x.id === id); if (!p) return;
    await carregarPerfis();
    let CONV = {};
    try { CONV = await DB.listarConversas15(); } catch (e) { CONV = {}; }
    const jaFalou = new Set(usadasCn(p).map(a => a.psiId));
    if (usadasCn(p).length >= LIMITE_CN) return U.toast(`Esta pessoa já usou as ${LIMITE_CN} conversas de 15 min.`, 'erro');
    const candidatos = Object.values(PSIS).filter(x => x.ativo !== false && CONV[x.id] && CONV[x.id].ativo && !jaFalou.has(x.id))
      .map(x => ({ psi: x, ...combinar(p, x) }))
      .sort((a, b) => b.nota - a.nota || a.psi.nome.localeCompare(b.psi.nome, 'pt-BR'));
    let escolha = null, mostrarTodos = false;
    const m = U.modal({
      titulo: 'Escolher psicólogo e horário',
      largo: true,
      corpo: `
        <div class="cn-m-quem"><b>${esc(nomeBonito(p.paciente.nome))}</b><span>${esc(p.tipoSessao || '')}${(p.motivos || []).length ? ' · ' + esc(p.motivos.join(', ')) : ''}</span><span>Horário: <b>${esc(p.horario || 'qualquer')}</b>${(p.preferencias || []).length ? ' · Prefere: ' + esc(p.preferencias.join(', ')) : ''}</span></div>
        <p class="ajuda">Só aparecem psicólogos que abriram horários de conversa (Minha agenda → Conversas 15 min)${jaFalou.size ? ' e com quem a pessoa ainda não conversou' : ''}. Os horários em azul estão no período que a pessoa pediu. Conversa ${usadasCn(p).length + 1} de ${LIMITE_CN}.</p>
        <div class="cn-m-lista" data-cn-lista><span class="muted">Carregando horários livres…</span></div>
        <div class="cn-m-escolha" data-cn-escolha hidden></div>`,
      acoes: [
        { texto: 'Voltar' },
        { texto: 'Marcar conversa', classe: 'btn-ok', onClick: async ({ corpo }) => {
          if (!escolha) { U.toast('Escolha um horário.', 'erro'); return false; }
          const link = ($('#cn-link', corpo) || {}).value?.trim() || '';
          if (!/^https:\/\/\S+$/.test(link)) { U.toast('Informe o link da videochamada (começa com https://).', 'erro'); return false; }
          try {
            const a = await DB.marcarConversa(p.id, { psiId: escolha.psiId, data: escolha.data, hora: escolha.hora, linkMeet: link, por: S.nome });
            LIVRES = null;
            await render();
            setTimeout(() => posMarcarCn(p, a), 50);
          } catch (e) { U.toast(e.message || 'Não consegui marcar.', 'erro'); return false; }
        } }
      ]
    });
    m.el.classList.add('modal-cn');
    const lista = $('[data-cn-lista]', m.corpo), boxEsc = $('[data-cn-escolha]', m.corpo);
    const HORAS_MAX = 7;
    const cache = {};
    async function horariosDe(psiId) {
      if (!cache[psiId]) {
        try {
          cache[psiId] = (await DB.livres15(psiId)).map(x => ({ ...x, ok: noPeriodo(x.data, x.hora, p) }));
        } catch (e) { cache[psiId] = []; }
      }
      return cache[psiId];
    }
    async function desenhar() {
      /* primeiro só quem combina (até 4); o resto fica em "Ver todos" */
      const bons = candidatos.filter(c => c.nota > 0);
      const base = mostrarTodos ? candidatos : (bons.length ? bons : candidatos).slice(0, 4);
      const itens = await Promise.all(base.map(async c => ({ ...c, horas: await horariosDe(c.psi.id) })));
      /* quem tem horário no período pedido vem antes */
      itens.sort((a, b) => (b.horas.some(h => h.ok) - a.horas.some(h => h.ok)) || b.nota - a.nota);
      lista.innerHTML = itens.map(c => {
        const noPer = c.horas.filter(h => h.ok), fora = c.horas.filter(h => !h.ok);
        const mostra = (noPer.length ? noPer : fora).slice(0, HORAS_MAX);
        return `<div class="cn-m-psi">
          <div class="cn-m-psi-topo"><b>${esc(c.psi.nome)}</b>${c.porque.length ? `<span class="cn-chips">${c.porque.slice(0, 4).map(x => `<span class="cn-chip ok">✓ ${esc(x)}</span>`).join('')}</span>` : '<span class="muted cn-m-sem">Sem temas em comum</span>'}</div>
          ${!c.horas.length ? '<div class="muted cn-m-vazio">Sem horários de conversa livres nos próximos dias.</div>' : `
          ${!noPer.length ? `<div class="cn-m-aviso">Nenhum horário ${p.horario === 'Fim de semana' ? 'no fim de semana' : 'de ' + esc((p.horario || '').toLowerCase())}. Estes são os próximos livres:</div>` : ''}
          <div class="cn-m-horas">${mostra.map(h => `<button type="button" class="cn-m-h${h.ok ? ' ok' : ''}${escolha && escolha.psiId === c.psi.id && escolha.data === h.data && escolha.hora === h.hora ? ' on' : ''}" data-psi="${esc(c.psi.id)}" data-d="${h.data}" data-h="${h.hora}"><small>${esc(U.fmtCurta(h.data).split(',')[0])} ${esc(U.fmtDDMM(h.data))}</small>${esc(U.fmtHora(h.hora))}</button>`).join('')}</div>`}
        </div>`;
      }).join('') + (!mostrarTodos && candidatos.length > base.length ? `<button type="button" class="btn btn-secundario cn-m-todos" data-cn-todos>Ver todos os psicólogos (${candidatos.length})</button>` : '')
        + (!candidatos.length ? `<div class="vazio"><strong>Nenhum psicólogo com horário de conversa.</strong>${jaFalou.size ? 'A pessoa já conversou com todos os que abriram horários. ' : ''}Peça para os psicólogos ligarem “Aceito fazer conversas de 15 min” na aba Conversas 15 min da agenda deles e abrirem horários.</div>` : '');
    }
    function mostrarEscolha() {
      if (!escolha) { boxEsc.hidden = true; return; }
      const psi = PSIS[escolha.psiId] || {};
      const sala = psi.salaMeet || '';
      boxEsc.hidden = false;
      boxEsc.innerHTML = `<p><b>Escolhido:</b> ${esc(psi.nome)} · ${esc(U.fmtLonga(escolha.data))}, ${esc(U.intervalo(escolha.hora, C.duracaoConhecer || 15))}</p>
        <div class="campo"><label for="cn-link">Link da videochamada</label>
          <input type="text" id="cn-link" value="${esc(sala)}" ${sala ? '' : 'placeholder="https://meet.google.com/abc-defg-hij"'}>
          <p class="ajuda">${sala ? `✓ Sala fixa de ${esc(U.primeiroNome(psi.nome))}, cadastrada na ficha do psicólogo.` : `${esc(U.primeiroNome(psi.nome))} ainda não tem sala cadastrada: cole o link aqui.`}</p></div>`;
    }
    lista.addEventListener('click', e => {
      if (e.target.closest('[data-cn-todos]')) { mostrarTodos = true; lista.innerHTML = '<span class="muted">Carregando horários livres…</span>'; desenhar(); return; }
      const b = e.target.closest('.cn-m-h'); if (!b) return;
      escolha = { psiId: b.dataset.psi, data: b.dataset.d, hora: b.dataset.h };
      lista.querySelectorAll('.cn-m-h').forEach(x => x.classList.toggle('on', x === b));
      mostrarEscolha();
      boxEsc.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    await desenhar();
  }

  function posMarcarCn(p, a) {
    const psi = PSIS[a.psiId] || {};
    U.modal({
      titulo: 'Conversa marcada',
      corpo: `
        <div class="sucesso-ico" aria-hidden="true">✓</div>
        <p style="text-align:center">${esc(nomeBonito(p.paciente.nome))} com <strong>${esc(psi.nome || nomePsi(a.psiId))}</strong><br>${esc(U.fmtLonga(a.data))}, ${esc(U.intervalo(a.hora, a.duracao))}.</p>
        <p style="text-align:center" class="muted">O horário já saiu da agenda do psicólogo. Agora avise o psicólogo: quando ele clicar em “Estou ciente”, o botão para mandar o horário ao paciente libera no cartão.</p>
        <div class="acoes" style="justify-content:center">
          <a class="btn btn-whats btn-whats-psi" data-feito="Enviado ao psicólogo" target="_blank" rel="noopener" href="${U.linkWhats(psi.whatsapp || '', txtCnPsi(p, a))}">Avisar o psicólogo no WhatsApp</a>
        </div>`,
      acoes: [{ texto: 'Fechar', classe: 'btn-primario' }]
    });
  }

  $('#cn-q').addEventListener('input', () => { cnPag = 1; desenharConhecer(); });
  Paginacao.ligar($('#cn-pag'), n => { cnPag = n; desenharConhecer(); }, $('#lista-cn'));
  $$('[data-cn-f]').forEach(b => b.addEventListener('click', () => { cnFiltro = b.dataset.cnF; cnPag = 1; desenharConhecer(); }));
  $('#lista-cn').addEventListener('click', async e => {
    /* v279: mandou o horário e o link da conversa ao paciente → fica marcado (e sai do sininho) */
    const hz = e.target.closest('[data-cn-horario]');
    if (hz) { try { await DB.marcarLembrete(hz.dataset.cnHorario, 'horario', S.nome); setTimeout(renderConhecer, 300); window.dispatchEvent(new Event('pb:conferencia')); } catch (err) { /* o WhatsApp abre mesmo assim */ } return; }
    /* 1) abriu o WhatsApp: marca "em contato" (o link abre normalmente) */
    const z = e.target.closest('[data-cn-zap]');
    if (z) {
      const p = CN.find(x => x.id === z.dataset.cnZap);
      if (p && !p.contato) { try { await DB.atualizarConhecer(p.id, { status: p.status === 'novo' ? 'contato' : p.status }, S.nome); setTimeout(renderConhecer, 300); } catch (err) { /* o WhatsApp abre mesmo assim */ } }
      return;
    }
    const b = e.target.closest('[data-cn]'); if (!b) return;
    const acao = b.dataset.cn, p = CN.find(x => x.id === b.dataset.id);
    if (acao === 'detalhes') { abrirDetalhes(b.dataset.ag); return; }
    if (!p) return;
    if (acao === 'marcar') { abrirMarcarCn(p.id); return; }
    if (acao === 'remarcar') {
      try { await DB.desmarcarConversa(p.id, S.nome); LIVRES = null; await renderConhecer(); abrirMarcarCn(p.id); } catch (err) { U.toast(err.message || 'Não consegui.', 'erro'); }
      return;
    }
    if (acao === 'desmarcar') {
      const ok = await U.confirmar('Desmarcar conversa', `Desmarcar a conversa de <b>${esc(nomeBonito(p.paciente.nome))}</b>? O horário volta a ficar livre na agenda do psicólogo.`, 'Desmarcar', true);
      if (!ok) return;
      try { await DB.desmarcarConversa(p.id, S.nome); LIVRES = null; U.toast('Conversa desmarcada.'); render(); } catch (err) { U.toast(err.message || 'Não consegui.', 'erro'); }
      return;
    }
    if (['paciente', 'nao', 'contato'].includes(acao)) {
      if (acao === 'nao') { perguntarMotivoNao(p); return; }
      try {
        await DB.atualizarConhecer(p.id, { status: acao }, S.nome);
        U.toast(acao === 'paciente' ? 'Ótimo! Pedido marcado como “virou paciente”.' : acao === 'nao' ? 'Pedido movido para Concluídos.' : 'Pedido reaberto.');
        renderConhecer();
      } catch (err) { U.toast(err.message || 'Não consegui.', 'erro'); }
    }
  });

  /* =====================================================================
     v288: CELULAR/TABLET — barra flutuante embaixo (igual à do psicólogo)
     Pré-reservas · 15 min · Lembretes · Agenda · Mais (Calendário, E-mails, Buscar paciente)
     ===================================================================== */
  {
    const IC = {
      pre: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
      conhecer: '<path d="M20 11.5a8 8 0 0 1-11.9 7L4 20l1.5-4A8 8 0 1 1 20 11.5z"/><path d="M8.5 11.5h7M8.5 8.5h4"/>',
      lembretes: '<path d="M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
      agenda: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.2"/><circle cx="4.5" cy="12" r="1.2"/><circle cx="4.5" cy="18" r="1.2"/>',
      mais: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
      calendario: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
      caixa: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="m4 7.5 8 6 8-6"/>',
      busca: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'
    };
    const svgNf = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${IC[k]}</svg>`;
    const ITENS = [['pre', 'Pré-reservas', 'pre'], ['conhecer', '15 min', 'cn'], ['lembretes', 'Lembretes', 'lem'], ['agenda', 'Agenda', ''], ['mais', 'Mais', '']];
    const NO_MAIS = ['calendario', 'caixa'];
    const nav = document.createElement('nav');
    nav.className = 'nav-flutuante nav-equipe'; nav.setAttribute('aria-label', 'Agenda da equipe');
    nav.innerHTML = ITENS.map(([k, t, c]) => `<button type="button" data-nf="${k}"${k === 'mais' ? ' aria-haspopup="dialog"' : ''}><span class="nf-ico">${svgNf(k)}${c ? `<span class="nf-cont${c === 'lem' ? ' nf-verde' : ''}" data-nf-cont="${c}"></span>` : ''}</span><span class="nf-txt">${t}</span></button>`).join('');
    document.body.appendChild(nav);
    document.body.classList.add('com-nav-flutuante');
    /* os números das abas de cima aparecem também na barra */
    const copiarNumeros = () => nav.querySelectorAll('[data-nf-cont]').forEach(x => { const o = document.querySelector(`.abas [data-cont="${x.dataset.nfCont}"]`); x.textContent = o ? o.textContent : ''; });
    document.querySelectorAll('.abas [data-cont]').forEach(o => new MutationObserver(copiarNumeros).observe(o, { childList: true, characterData: true, subtree: true }));
    copiarNumeros();
    const marcar = aba => nav.querySelectorAll('[data-nf]').forEach(b => { const on = b.dataset.nf === aba || (b.dataset.nf === 'mais' && NO_MAIS.includes(aba)); b.classList.toggle('on', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    document.addEventListener('pb:aba', e => marcar(e.detail));
    marcar(ABA_ATUAL);
    const ir = aba => { ativar(aba); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    nav.addEventListener('click', e => {
      const b = e.target.closest('[data-nf]'); if (!b) return;
      if (b.dataset.nf === 'mais') abrirMais(); else ir(b.dataset.nf);
    });
    function abrirMais() {
      let dlg = document.getElementById('folha-mais');
      if (!dlg) {
        dlg = document.createElement('dialog');
        dlg.id = 'folha-mais'; dlg.className = 'folha-mais'; dlg.setAttribute('aria-labelledby', 'folha-mais-tit');
        const op = (k, t, d) => `<button type="button" class="fm-op" data-fm="${k}"><span class="fm-ico">${svgNf(k)}</span><span><b>${t}</b><small>${d}</small></span></button>`;
        dlg.innerHTML = `<div class="fm-in"><span class="fm-alca" aria-hidden="true"></span>
          <div class="fm-cab"><h3 id="folha-mais-tit">Mais</h3><button type="button" class="fm-x" data-fm-fechar aria-label="Fechar">×</button></div>
          ${op('calendario', 'Calendário', 'O mês inteiro, dia por dia')}
          ${op('caixa', 'E-mails enviados', 'O que saiu para pacientes e psicólogos')}
          ${op('busca', 'Buscar paciente', 'Nome, WhatsApp, e-mail ou código')}</div>`;
        document.body.appendChild(dlg);
        dlg.addEventListener('click', e => {
          if (e.target === dlg || e.target.closest('[data-fm-fechar]')) { dlg.close(); return; }
          const b = e.target.closest('[data-fm]'); if (!b) return;
          dlg.close();
          if (b.dataset.fm === 'busca') { ir('calendario'); setTimeout(() => { const q = $('#bp-q'); if (q) q.focus(); }, 350); }
          else ir(b.dataset.fm);
        });
        dlg.addEventListener('close', () => document.documentElement.classList.remove('fm-aberta'));
      }
      document.documentElement.classList.add('fm-aberta');
      dlg.showModal();
    }
  }

  /* =====================================================================
     ATUALIZAÇÃO
     ===================================================================== */
  async function render() {
    BP = null;
    if (!U._ajustesAgenda) await U.carregarAjustesAgenda();
    await carregarPsis();
    preencherFiltroPsi();
    await renderPre();
    await renderConhecer();
    await renderLembretes();
    await renderCalendario();
    await renderAgenda();
    await renderCaixa();
  }

  await render();
  /* =====================================================================
     BUSCA RÁPIDA DE PACIENTE (topo, em todas as abas)
     O paciente manda mensagem → digita o nome, o WhatsApp, o e-mail ou o código
     e vê na hora as sessões dele, com o botão do WhatsApp.
     ===================================================================== */
  const BP_MAX = 5, BP_SESSOES = 4;
  let bpT = null;
  async function bpDados() {
    if (!BP || Date.now() - bpEm > 30e3) { BP = await DB.listarAgendamentos({}); bpEm = Date.now(); }
    return BP;
  }
  const bpAntes = { pendente: 0, confirmado: 1 };
  async function bpDesenhar() {
    const box = $('#bp-res'), bruto = $('#bp-q').value.trim();
    const q = norm(bruto).replace(/^#/, ''), qd = U.digitos(bruto);
    if (q.length < 2 && qd.length < 3) { box.hidden = true; box.innerHTML = ''; return; }
    const ags = await bpDados();
    const casaBp = a => norm(`${a.paciente.nome} ${a.paciente.email} ${a.codigo}`).includes(q) || (qd.length >= 3 && U.digitos(a.paciente.whatsapp).includes(qd));
    const m = new Map();
    ags.filter(a => a.paciente && casaBp(a)).forEach(a => { const k = U.chavePaciente(a.paciente); if (!m.has(k)) m.set(k, []); m.get(k).push(a); });
    const agora = Date.now(), quando = a => U.msAg(a);
    const pessoas = [...m.entries()].map(([k, l]) => {
      const futuras = l.filter(a => bpAntes[a.status] != null && quando(a) > agora - 3600e3).sort((x, y) => bpAntes[x.status] - bpAntes[y.status] || quando(x) - quando(y));
      const resto = l.filter(a => !futuras.includes(a)).sort((x, y) => quando(y) - quando(x));
      const rec = [...l].sort((x, y) => (y.criadoEm || 0) - (x.criadoEm || 0))[0];
      return { k, p: rec.paciente, sessoes: [...futuras, ...resto], ativa: futuras.length, pend: futuras.some(a => a.status === 'pendente'), ult: Math.max(...l.map(a => a.criadoEm || 0)) };
    }).sort((a, b) => b.pend - a.pend || b.ativa - a.ativa || b.ult - a.ult);
    box.hidden = false;
    if (!pessoas.length) { box.innerHTML = `<div class="bp-vazio"><b>Nenhum paciente com “${esc(bruto)}”.</b> Confira o nome, o WhatsApp (com DDD) ou o e-mail.</div>`; return; }
    const ficha = Auth.pode('pacientesFicha');
    box.innerHTML = pessoas.slice(0, BP_MAX).map(x => `
      <article class="bp-pessoa">
        <div class="bp-topo">
          <div class="bp-quem"><b>${esc(x.p.nome)}</b><small>${esc(U.fmtTelefone(x.p.whatsapp))}${x.p.email ? ' · ' + esc(x.p.email) : ''}</small></div>
          <div class="bp-botoes">
            ${ficha ? `<a class="btn btn-secundario btn-peq" href="pacientes.html#p:${encodeURIComponent(x.k)}">Ficha</a>` : ''}
            <a class="btn btn-whats btn-peq" target="_blank" rel="noopener" href="${U.linkWhats(x.p.whatsapp, `Olá, ${U.primeiroNome(x.p.nome)}! Aqui é da equipe Psicólogos Brasil.`)}">${ICO_ZAP}WhatsApp</a>
          </div>
        </div>
        <ul class="bp-sessoes">${x.sessoes.slice(0, BP_SESSOES).map(a => `<li><button type="button" class="bp-sessao" data-bp-id="${a.id}">
          <span class="bp-data"><b>${esc(U.fmtCurta(a.data))}</b> ${esc(U.fmtHora(a.hora))}</span>
          <span class="bp-psi">${esc(nomePsi(a.psiId))} · #${esc(a.codigo)}</span>
          ${U.badge(a.status)}
          <span class="bp-ir">${a.status === 'pendente' ? 'Abrir pré-reserva' : 'Detalhes'} ›</span>
        </button></li>`).join('')}</ul>
        ${x.sessoes.length > BP_SESSOES ? `<p class="bp-mais">+ ${x.sessoes.length - BP_SESSOES} ${x.sessoes.length - BP_SESSOES === 1 ? 'outra sessão' : 'outras sessões'}${ficha ? ' (veja na ficha)' : ''}</p>` : ''}
      </article>`).join('')
      + (pessoas.length > BP_MAX ? `<div class="bp-vazio">+ ${pessoas.length - BP_MAX} paciente${pessoas.length - BP_MAX === 1 ? '' : 's'} com essa busca. Digite mais do nome ou o WhatsApp.</div>` : '');
  }
  function bpFechar(limpar) { const b = $('#bp-res'); b.hidden = true; if (limpar) { $('#bp-q').value = ''; b.innerHTML = ''; bpAplicar(); } }

  /* A busca do topo entende a aba aberta:
     Pré-reservas, Agenda e E-mails → filtra a própria lista (usa a busca de cada aba, que fica escondida);
     Lembretes → filtra os cartões; Calendário → procura o paciente e mostra as sessões dele. */
  const CEL = matchMedia('(max-width: 640px)').matches;
  const BP_ABA = {
    pre: { ph: 'Procurar pré-reserva: paciente, código, WhatsApp ou psicólogo', curto: 'Procurar pré-reserva', alvo: '#pre-q' },
    conhecer: { ph: 'Procurar pedido: nome, WhatsApp, e-mail ou motivo', curto: 'Procurar pedido', alvo: '#cn-q' },
    lembretes: { ph: 'Procurar lembrete: paciente, psicólogo ou WhatsApp', curto: 'Procurar lembrete', dom: '#lista-lembretes' },
    calendario: { ph: 'Buscar paciente: nome, WhatsApp, e-mail ou código', curto: 'Buscar paciente', paciente: true },
    agenda: { ph: 'Procurar na agenda: paciente, código, e-mail ou WhatsApp', curto: 'Procurar na agenda', alvo: '#f-q' },
    caixa: { ph: 'Procurar e-mail: assunto, destinatário ou código', curto: 'Procurar e-mail', alvo: '#caixa-q' }
  };
  const bpTexto = {};   /* o que foi digitado em cada aba (cada aba lembra a sua busca) */
  const bpCfg = () => BP_ABA[ABA_ATUAL] || BP_ABA.calendario;
  function bpFiltrarDom(sel, q) {
    const box = $(sel); if (!box) return;
    const n = norm(q), d = U.digitos(q);
    let vis = 0;
    box.querySelectorAll('.bp-sem').forEach(x => x.remove());
    box.querySelectorAll('article').forEach(c => {
      const ok = !n || norm(c.textContent).includes(n) || (d.length >= 3 && U.digitos(c.textContent).includes(d));
      c.hidden = !ok; if (ok) vis++;
    });
    if (n && !vis) box.insertAdjacentHTML('afterbegin', `<div class="vazio bp-sem"><strong>Nada com “${esc(q)}”.</strong>Confira o nome, o WhatsApp ou o psicólogo.</div>`);
  }
  function bpAplicar() {
    const c = bpCfg(), q = $('#bp-q').value;
    bpTexto[ABA_ATUAL] = q;
    if (c.alvo) { const el = $(c.alvo); if (el && el.value !== q) { el.value = q; el.dispatchEvent(new Event('input')); } }
    else if (c.dom) bpFiltrarDom(c.dom, q.trim());
    else { clearTimeout(bpT); bpT = setTimeout(bpDesenhar, 120); return; }
    $('#bp-res').hidden = true;
  }
  function bpAba(aba) {
    const c = BP_ABA[aba] || BP_ABA.calendario, inp = $('#bp-q');
    /* a busca fica embaixo do título de cada aba (igual a Psicólogos e Pacientes) */
    const sec = $(`[data-painel="${aba}"]`), topo = sec && sec.querySelector('.secao-topo');
    if (topo && topo.nextElementSibling !== $('#bp')) topo.after($('#bp'));
    inp.placeholder = CEL ? c.curto : c.ph;
    inp.setAttribute('aria-label', c.ph);
    $('#bp-res').hidden = true;
    inp.value = c.alvo ? (($(c.alvo) || {}).value || '') : (bpTexto[aba] || '');
    if (c.dom) bpFiltrarDom(c.dom, inp.value.trim());
  }
  document.body.classList.add('bp-por-aba');   /* esconde as buscas de dentro das abas: a do topo faz o papel delas */
  document.addEventListener('pb:aba', e => bpAba(e.detail));
  bpAba(ABA_ATUAL);
  $('#bp-q').addEventListener('input', bpAplicar);
  $('#bp-q').addEventListener('focus', () => { if (bpCfg().paciente && $('#bp-q').value.trim()) bpDesenhar(); });
  $('#bp-q').addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); bpFechar(true); } });
  document.addEventListener('click', e => { if (!e.target.closest('#bp')) bpFechar(false); });
  $('#bp-res').addEventListener('click', async e => {
    const b = e.target.closest('[data-bp-id]'); if (!b) return;
    const a = (BP || []).find(x => x.id === b.dataset.bpId); if (!a) return;
    bpFechar(false);
    if (a.status === 'pendente') {
      ativar('pre'); $('#pre-q').value = a.codigo; prePag = 1; desenharPre();
      $('#lista-pre').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else abrirDetalhes(a.id);
  });

  DB.aoMudar(render);                 // paciente marcou no site em outra aba
  setInterval(() => { renderPre(); renderLembretes(); renderConhecer(); }, 60 * 1000);  // atualiza o "vence…" e os lembretes
})();
