/* =====================================================================
   PAINEL DO PSICÓLOGO
   ===================================================================== */
(async function () {
  /* No celular (sem mouse) as instruções dizem "Toque"; no computador, "Clique" */
  const TOQUE = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  const clique = (maiuscula) => TOQUE ? (maiuscula ? 'Toque' : 'toque') : (maiuscula ? 'Clique' : 'clique');
  if (TOQUE) document.querySelectorAll('[data-clique]').forEach(el => { el.innerHTML = el.innerHTML.replace(/Clique/g, 'Toque').replace(/clique/g, 'toque'); });
  /* Esta tela serve para dois casos:
     - o psicólogo, vendo a própria agenda;
     - admin ou suporte, vindo de "Psicólogos" (psicologos.html), com ?psi=ID:
       vê e mexe na agenda daquele psicólogo (VISAO_EQUIPE). */
  const sess = Auth.sessao();
  const psiPedido = new URLSearchParams(location.search).get('psi');
  const VISAO_EQUIPE = !!(sess && ['admin', 'suporte'].includes(sess.papel) && psiPedido);
  const S = Auth.exigir([VISAO_EQUIPE ? 'acompanhar' : 'minhaAgenda']);
  if (!S) return;
  const C = window.AGENDA_CONFIG;
  const { $, $$, esc } = U;
  const PSI_ID = VISAO_EQUIPE ? psiPedido : S.id;

  $('[data-nome]').textContent = S.nome;
  $('[data-sair]').onclick = () => Auth.sair();
  const h = new Date().getHours();
  $('[data-saudacao]').textContent = `${h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'}, ${U.primeiroNome(S.nome)}!`;
  if (VISAO_EQUIPE) {
    const psi = await DB.obterPsicologo(PSI_ID).catch(() => null);
    if (!psi) { location.replace('conteudo.html#psicologos'); return; }
    const nomePsi = psi.nome || 'Psicólogo';
    document.title = `${nomePsi} · Painel Psicólogos Brasil`;
    document.querySelectorAll('.papel').forEach(e => { e.textContent = Auth.nomePapel(S); });
    $('.marca').href = 'conteudo.html#psicologos';
    $('.marca small').textContent = 'Psicólogos';
    Auth.menuAreas($('[data-areas]'), 'psicologos');
    $('.aba[data-aba="conta"]').textContent = 'Conta';
    /* primeira aba: volta para a página do psicólogo no site (a ficha em "Psicólogos") */
    if (Auth.pode('psiPagina')) $('.abas').insertAdjacentHTML('afterbegin', `<a class="aba aba-pagina" href="conteudo.html#psicologos/a:${encodeURIComponent(PSI_ID)}">Página no site</a>`);
    /* suporte: só Atendimentos e Disponibilidade (Resumo tem valores; Conta tem dados e Pix) */
    [['resumo', 'psiResumo'], ['conta', 'psiConta']].forEach(([aba, area]) => {
      if (Auth.pode(area)) return;
      const b = $(`.aba[data-aba="${aba}"]`); if (b) b.remove();
      const p = $(`[data-painel="${aba}"]`); if (p) { p.hidden = true; p.dataset.bloqueado = '1'; }   /* fica vazio: nada é carregado nele */
    });
    $('.abas').classList.add('abas-quebra');   /* celular: as 5 abas em botões, todas à vista (sem arrastar) */
    /* o nome do psicólogo bem visível ao lado do título de cada parte */
    const titulos = { atendimentos: 'Atendimentos', disponibilidade: 'Disponibilidade', resumo: 'Resumo', conta: 'Conta' };
    window.marcarNomePsi = nome => {
      const ini = String(nome || '').split(/\s+/).filter(w => w.length > 2).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '•';
      const pill = `<span class="psi-pill" title="Você está mexendo na agenda de ${esc(nome)}"><span class="psi-pill-ava" aria-hidden="true">${esc(ini)}</span>${esc(nome)}</span>`;
      Object.entries(titulos).forEach(([aba, t]) => {
        const h = document.querySelector(`[data-painel="${aba}"] h1`);
        if (h) h.innerHTML = `<span>${t}</span>${pill}`;
      });
      const b = document.querySelector('.visao-equipe strong'); if (b) b.textContent = nome;
    };
    marcarNomePsi(nomePsi);
    document.querySelector('.topo').insertAdjacentHTML('afterend', `
      <div class="visao-equipe"><div class="visao-equipe-in">
        <a href="conteudo.html#psicologos" class="visao-voltar">← Todos os psicólogos</a>
        <span>Você está vendo a agenda de <strong>${esc(nomePsi)}</strong> como ${S.papel === 'admin' ? 'administrador' : 'suporte'}. O que você mudar aqui vale para ela(e) também.</span>
      </div></div>`);
  }

  /* ---------------- abas ---------------- */
  function ativar(aba) {
    const pb = $(`[data-painel="${aba}"]`);
    if (!pb || pb.dataset.bloqueado) aba = 'atendimentos';
    $$('.aba[data-aba]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.aba === aba)));
    const bc = document.getElementById('btn-conta'); if (bc) bc.classList.toggle('atual', aba === 'conta');
    $$('[data-painel]').forEach(p => (p.hidden = p.dataset.painel !== aba));
    history.replaceState(null, '', '#' + aba);
  }
  $$('.aba[data-aba]').forEach(b => (b.onclick = () => ativar(b.dataset.aba)));
  if (!VISAO_EQUIPE) {
    /* "Minha conta" sai das abas: o psicólogo abre clicando no próprio nome, lá em cima */
    const abaConta = $('.aba[data-aba="conta"]'); if (abaConta) abaConta.remove();
    const nomeBox = $('.topo-user .nome-txt');
    const pronto = document.getElementById('btn-conta');
    /* o botão da conta lá em cima abre o menu (Minha conta · Sair); "Minha conta" do menu chega aqui */
    window.addEventListener('pb:minha-conta', () => ativar('conta'));
    window.addEventListener('hashchange', () => { if (location.hash === '#conta') ativar('conta'); });
    if (nomeBox && !pronto) {
      const ini = String(S.nome || '').split(/\s+/).filter(w => w.length > 2).slice(0, 2).map(w => w[0]).join('').toUpperCase();
      nomeBox.outerHTML = `<button type="button" class="conta-btn" id="btn-conta" title="Minha conta" aria-label="Minha conta: ${esc(S.nome)}">
        <span class="conta-ava" aria-hidden="true">${esc(ini || '•')}</span>
        <span class="conta-txt"><span data-nome>${esc(S.nome)}</span><small>Minha conta</small></span></button>`;
      $('#btn-conta').onclick = () => ativar('conta');
    }
  }
  const pedida = location.hash.slice(1);
  ativar($(`.aba[data-aba="${pedida}"]`) || (pedida === 'conta' && !VISAO_EQUIPE) ? pedida : 'atendimentos');
  /* link para outra aba desta mesma tela (ex.: sininho "Sessão nova" estando em Disponibilidade): troca a aba */
  window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if ($(`.aba[data-aba="${h}"]`) || h === 'conta') { ativar(h); window.scrollTo(0, 0); } });

  /* =====================================================================
     ATENDIMENTOS
     ===================================================================== */
  async function renderAtend() {
    const hoje = U.hojeISO();
    const lista = await DB.listarAgendamentos({
      psiId: PSI_ID,
      status: ['pendente', 'confirmado', 'realizado', 'falta'],
      de: U.addDias(hoje, -14)
    });
    const futuros = lista.filter(a => a.data >= hoje);
    const passados = lista.filter(a => a.data < hoje).reverse();
    const novos = lista.filter(a => a.status === 'confirmado' && !a.psiCiente).length;
    $('[data-cont="novos"]').textContent = novos || '';

    const box = $('#lista-atend');
    const sb = await semBaixa();
    const aviso = sb.length ? `<div class="baixa-aviso" role="alert">
        <span class="baixa-aviso-ico" aria-hidden="true">!</span>
        <div><strong>${sb.length === 1 ? '1 sessão já passou e ainda não foi marcada' : `${sb.length} sessões já passaram e ainda não foram marcadas`}</strong>
        <span>${VISAO_EQUIPE ? 'O repasse só vai para o Financeiro depois de marcar Realizado ou Faltou.' : 'Marque se o atendimento foi realizado ou se o paciente faltou. O seu repasse só entra para pagamento depois disso.'}</span></div>
        <button type="button" class="btn btn-primario btn-peq" data-acao="abrir-baixa">Marcar agora</button>
      </div>` : '';
    if (!futuros.length && !passados.length) {
      box.innerHTML = aviso + `<div class="vazio"><strong>Nenhum atendimento por enquanto.</strong>Confira se a sua disponibilidade está marcada para os pacientes encontrarem horários no site.</div>`;
      return;
    }

    const porDia = {};
    futuros.forEach(a => (porDia[a.data] = porDia[a.data] || []).push(a));
    let html = '';
    const dias = Object.keys(porDia).sort();
    if (!dias.length) html += `<div class="vazio"><strong>Nenhum atendimento nos próximos dias.</strong></div>`;
    dias.forEach(d => {
      const ehHoje = d === hoje, amanha = d === U.addDias(hoje, 1);
      html += `<h2 class="dia-titulo">${ehHoje ? '<span class="hoje-tag">Hoje</span>' : ''}${amanha ? 'Amanhã · ' : ''}${U.fmtLonga(d)}</h2>`;
      html += porDia[d].map(cartao).join('');
    });
    if (passados.length) {
      html += `<details style="margin-top:28px"><summary class="dia-titulo" style="cursor:pointer">Últimos 14 dias (${passados.length})</summary>${passados.map(cartao).join('')}</details>`;
    }
    box.innerHTML = aviso + html;
  }

  function cartao(a) {
    const inicio = U.dataHora(a.data, a.hora, a.fuso).getTime();
    const jaComecou = Date.now() >= inicio - 10 * 60e3;
    const passou = Date.now() >= inicio;
    let acoes = '';
    if (a.status === 'confirmado') {
      /* "Estou ciente" é a confirmação do próprio psicólogo: a equipe só vê se ele já confirmou */
      acoes += a.psiCiente
        ? `<span class="ciente-ok">✓ Ciente</span>`
        : VISAO_EQUIPE ? `<span class="ciente-nao">Ainda não viu</span>` : `<button class="btn btn-ok btn-peq" data-acao="ciente" data-id="${a.id}">Estou ciente</button>`;
      acoes += `<a class="btn ${jaComecou ? 'btn-primario' : 'btn-secundario'} btn-peq" href="${esc(a.linkMeet)}" target="_blank" rel="noopener">Entrar na sala</a>`;
      if (passou) {
        acoes += `<button class="btn btn-secundario btn-peq" data-acao="realizado" data-id="${a.id}">Realizado</button>`;
        acoes += `<button class="btn btn-perigo btn-peq" data-acao="falta" data-id="${a.id}">Faltou</button>`;
      }
    }
    const det = {
      pendente: 'Horário reservado, aguardando o pagamento do paciente',
      confirmado: a.tipo === 'mensal' ? `Plano mensal · sessão ${a.sessao} de ${a.totalSessoes}` : 'Sessão avulsa',
      realizado: 'Sessão realizada',
      falta: 'Paciente faltou'
    }[a.status];
    return `
      <div class="atend st-${a.status}">
        <div class="atend-hora">${U.fmtHora(a.hora)}<small>até ${U.fmtHora(U.horaFim(a.hora, a.duracao))}</small></div>
        <div>
          <div class="atend-nome">${a.status === 'pendente' ? 'Pré-reserva' : esc(a.paciente.nome)}</div>
          <div class="atend-det">${U.badge(a.status)}<span>${det}</span></div>
          ${(n => n ? `<div class="nota-fuso">🌍 ${esc(n)}</div>` : '')(U.notaFuso(a, VISAO_EQUIPE))}
        </div>
        <div class="atend-acoes">${acoes}</div>
      </div>`;
  }

  /* ---------------- sessões sem baixa ----------------
     Sessão confirmada cujo horário já terminou e que ninguém marcou como
     Realizado ou Faltou. Sem isso o repasse não aparece no Financeiro.
     Ao entrar no painel, o psicólogo vê uma janela pedindo para marcar. */
  async function semBaixa() {
    const l = await DB.listarAgendamentos({ psiId: PSI_ID, status: ['confirmado'] });
    const agora = Date.now();
    return l.filter(a => U.dataHora(a.data, a.hora, a.fuso).getTime() + (a.duracao || 50) * 60e3 <= agora)
      .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
  }
  async function abrirBaixa() {
    const l = await semBaixa();
    if (!l.length) { U.toast('Nenhuma sessão esperando para marcar.'); return; }
    if (document.querySelector('dialog.modal-baixa')) return;
    let feitas = 0;
    const m = U.modal({
      titulo: 'Confirme seus atendimentos',
      corpo: `<p class="baixa-intro">${l.length === 1 ? 'Esta sessão já passou' : `Estas ${l.length} sessões já passaram`} e ainda não ${l.length === 1 ? 'foi marcada' : 'foram marcadas'}. Diga se o atendimento <b>foi realizado</b> ou se o <b>paciente faltou</b>: o seu repasse só entra para pagamento depois disso.</p>
        <div class="baixa-lista">${l.map(a => `<div class="baixa-linha" data-id="${esc(a.id)}">
          <div class="baixa-quem"><b>${esc(U.fmtCurta(a.data))} · ${esc(U.intervalo(a.hora, a.duracao))}</b><small>${esc(a.paciente.nome)} · ${a.tipo === 'mensal' ? `Plano mensal ${a.sessao}/${a.totalSessoes}` : 'Avulsa'}</small></div>
          <div class="baixa-bts">
            <button type="button" class="btn btn-ok btn-peq" data-b="realizado">Realizado</button>
            <button type="button" class="btn btn-secundario btn-peq" data-b="falta">Faltou</button>
          </div>
        </div>`).join('')}</div>`,
      acoes: [{ texto: 'Marcar depois', classe: 'btn-secundario' }]
    });
    m.el.classList.add('modal-baixa');
    m.corpo.addEventListener('click', async e => {
      const b = e.target.closest('[data-b]'); if (!b) return;
      const linha = b.closest('.baixa-linha'), id = linha.dataset.id;
      /* "Faltou" pede um segundo clique para confirmar */
      if (b.dataset.b === 'falta' && !b.classList.contains('btn-perigo')) {
        b.classList.replace('btn-secundario', 'btn-perigo'); b.textContent = 'Confirmar falta';
        return;
      }
      linha.querySelectorAll('button').forEach(x => (x.disabled = true));
      try {
        await DB.atualizarStatus(id, b.dataset.b, S.nome);
        linha.classList.add('feita');
        linha.querySelector('.baixa-bts').innerHTML = b.dataset.b === 'realizado' ? '<span class="baixa-ok">✓ Realizado</span>' : '<span class="baixa-falta">✓ Falta registrada</span>';
        feitas++;
        if (feitas === l.length) {
          setTimeout(() => { m.fechar(); U.toast('Tudo marcado! Obrigado.', 'ok'); }, 700);
        }
      } catch (err) {
        linha.querySelectorAll('button').forEach(x => (x.disabled = false));
        U.toast(err.message || 'Não consegui marcar.', 'erro');
      }
    });
    m.el.addEventListener('close', () => { if (feitas) renderAtend(); });
  }

  $('#lista-atend').addEventListener('click', async e => {
    const b = e.target.closest('[data-acao]');
    if (!b) return;
    if (b.dataset.acao === 'abrir-baixa') { abrirBaixa(); return; }
    const id = b.dataset.id;
    if (b.dataset.acao === 'ciente') { await DB.marcarCiente(id, S.nome); U.toast('Pronto! A equipe já sabe que você viu.'); }
    if (b.dataset.acao === 'realizado') { await DB.atualizarStatus(id, 'realizado', S.nome); U.toast('Sessão marcada como realizada.'); }
    if (b.dataset.acao === 'falta') {
      const ok = await U.confirmar('Paciente faltou?', 'A equipe será avisada no painel. Pela regra, falta sem aviso conta como sessão realizada.', 'Marcar falta', true);
      if (!ok) return;
      await DB.atualizarStatus(id, 'falta', S.nome);
      U.toast('Falta registrada.');
    }
    renderAtend();
  });

  /* =====================================================================
     DISPONIBILIDADE — calendário do mês
     ===================================================================== */
  const HORAS = [];
  for (let hh = C.horaInicio; hh <= C.horaFim; hh++) HORAS.push(`${U.pad(hh)}:00`);
  const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0]; // segunda primeiro
  const PERIODOS = [
    { nome: 'Manhã', de: 7, ate: 11 },
    { nome: 'Tarde', de: 12, ate: 17 },
    { nome: 'Noite', de: 18, ate: 21 }
  ];
  const cal = {
    mes: U.mesAtual(),
    sel: new Set(),        // datas selecionadas
    datas: {},             // horários abertos por data
    ocupados: {},          // data → horas já agendadas
    bloqueios: []
  };
  const limiteData = () => U.addDias(U.hojeISO(), C.diasAgendaPsicologo);
  const podeEditar = data => data >= U.hojeISO() && data <= limiteData();

  /* Rascunho: os horários mudados ficam aqui até clicar em "Publicar no site" */
  let RASC = {};
  const temRascunho = () => Object.keys(RASC).length > 0;
  function aplicarRascunho() {
    Object.entries(RASC).forEach(([d, hs]) => { if (hs.length) cal.datas[d] = [...hs].sort(); else delete cal.datas[d]; });
  }
  function barraPublicar() {
    const n = Object.keys(RASC).length;
    $('#pub-barra').hidden = !n;
    $('#pub-qtd').textContent = n ? `${n} dia${n > 1 ? 's' : ''} com horários alterados, ainda não publicado${n > 1 ? 's' : ''}` : '';
  }

  async function carregarCal() {
    const disp = await DB.obterDisponibilidade(PSI_ID);
    cal.datas = disp.datas || {};
    aplicarRascunho();
    cal.bloqueios = disp.bloqueios || [];
    const ags = await DB.listarAgendamentos({ psiId: PSI_ID, status: ['pendente', 'confirmado'], de: U.hojeISO() });
    cal.ocupados = {};
    ags.forEach(a => (cal.ocupados[a.data] = cal.ocupados[a.data] || []).push(a.hora));
  }

  function diasDoMes(m) {
    const [y, mm] = m.split('-').map(Number);
    const total = new Date(y, mm, 0).getDate();
    return Array.from({ length: total }, (_, i) => `${m}-${U.pad(i + 1)}`);
  }

  function renderCal() {
    const hoje = U.hojeISO();
    $('#mes-nome').textContent = U.fmtMes(cal.mes).replace(/^./, c => c.toUpperCase());
    $('#mes-ant').disabled = cal.mes <= U.mesAtual();
    $('#mes-prox').disabled = U.addMes(cal.mes, 1) > limiteData().slice(0, 7);

    const dias = diasDoMes(cal.mes);
    const vazios = (U.diaSemana(dias[0]) + 6) % 7; // quantas casas antes do dia 1 (semana começa na segunda)
    let html = ORDEM_DIAS.map(d => `<button type="button" class="cal-sem" data-semana="${d}" title="Selecionar todas as ${U.DIAS_PLURAL[d]} deste mês">${U.DIAS[d]}</button>`).join('');
    html += '<span></span>'.repeat(vazios);
    html += dias.map(data => {
      const n = (cal.datas[data] || []).length;
      const bloq = cal.bloqueios.some(b => b.data === data && !b.hora);
      const agend = (cal.ocupados[data] || []).length;
      const edit = podeEditar(data);
      const cls = ['cal-dia', n ? 'tem' : '', cal.sel.has(data) ? 'sel' : '', data === hoje ? 'hoje' : '', bloq ? 'bloq' : ''].filter(Boolean).join(' ');
      return `<button type="button" class="${cls}" data-data="${data}" ${edit ? '' : 'disabled'} aria-pressed="${cal.sel.has(data)}"
        aria-label="${U.fmtLonga(data)}: ${bloq ? 'folga' : n ? n + ' horários' : 'sem horários'}">
        <strong>${Number(data.slice(8))}</strong>
        <small>${bloq ? 'folga' : n ? `${n} h` : edit ? '—' : ''}</small>
        ${agend ? `<i class="cal-ponto" title="${agend} atendimento(s)"></i>` : ''}
      </button>`;
    }).join('');
    $('#cal-grade').innerHTML = html;
    renderHoras();
    dicaCopiarMes();
  }

  function renderHoras() {
    const box = $('#cal-horas');
    const sel = [...cal.sel].sort();
    if (!sel.length) {
      box.innerHTML = `<div class="cal-vazio"><strong>Nenhum dia selecionado</strong>${clique(true)} em um ou mais dias no calendário para escolher os horários.</div>`;
      return;
    }
    const titulo = sel.length === 1 ? U.fmtLonga(sel[0]).replace(/^./, c => c.toUpperCase()) : `${sel.length} dias selecionados`;
    const temTodos = h => sel.every(d => (cal.datas[d] || []).includes(h));
    const temAlgum = h => sel.some(d => (cal.datas[d] || []).includes(h));
    const ocupadoEm = h => sel.some(d => (cal.ocupados[d] || []).includes(h));
    const bloqueado = h => sel.length === 1 && cal.bloqueios.some(b => b.data === sel[0] && (!b.hora || b.hora === h));

    box.innerHTML = `
      <div class="cal-horas-topo">
        <div>
          <h3>${titulo}</h3>
          <p class="muted">${sel.length === 1 ? `Sessões de ${C.duracaoSessao} minutos.` : sel.map(U.fmtDDMM).join(', ')}</p>
        </div>
        <button type="button" class="btn-link" data-limpar-sel>Desmarcar dias</button>
      </div>
      <div class="cal-atalhos">
        ${PERIODOS.map((p, i) => `<button type="button" class="btn btn-secundario btn-peq" data-periodo="${i}">+ ${p.nome}</button>`).join('')}
        <button type="button" class="btn btn-secundario btn-peq" data-tudo>Dia todo</button>
        <button type="button" class="btn btn-perigo btn-peq" data-nenhum>Limpar</button>
      </div>
      ${PERIODOS.map(p => `
        <div class="cal-periodo">
          <span>${p.nome}</span>
          <div class="cal-chips">
            ${HORAS.filter(h => { const n = Number(h.slice(0, 2)); return n >= p.de && n <= p.ate; }).map(h => {
              const oc = ocupadoEm(h);
              const est = temTodos(h) ? 'on' : temAlgum(h) ? 'meio' : '';
              return `<button type="button" class="chip ${est} ${oc ? 'ocupado' : ''} ${bloqueado(h) ? 'bloq' : ''}" data-hora="${h}"
                aria-pressed="${est === 'on'}" ${oc ? 'title="Já tem atendimento marcado neste horário"' : ''}>
                ${U.fmtHora(h)}${oc ? '<small>agendado</small>' : ''}</button>`;
            }).join('')}
          </div>
        </div>`).join('')}
      <div class="legenda">
        <span><i class="l-ok"></i>Aberto para agendamento</span>
        ${sel.length > 1 ? '<span><i class="l-meio"></i>Aberto só em alguns dos dias</span>' : ''}
        <span><i class="l-ag"></i>Já agendado</span>
      </div>
      ${sel.length === 1 && (cal.datas[sel[0]] || []).length ? `
        <div class="cal-copiar">
          <span>Repetir estes horários em todas as <strong>${U.DIAS_PLURAL[U.diaSemana(sel[0])]}</strong> seguintes?</span>
          <button type="button" class="btn btn-secundario btn-peq" data-copiar>Repetir nas próximas semanas</button>
        </div>` : ''}`;
  }

  let timerSalvo;
  async function aplicar(fn, msg = 'Alterado') {
    const mud = {};
    [...cal.sel].forEach(d => {
      const atual = new Set(cal.datas[d] || []);
      fn(atual, d);
      (cal.ocupados[d] || []).forEach(h => atual.add(h)); // não fecha horário já agendado
      mud[d] = [...atual];
      if (mud[d].length) cal.datas[d] = [...atual].sort(); else delete cal.datas[d];
    });
    Object.assign(RASC, mud);
    barraPublicar();
    const st = $('#status-salvo');
    st.textContent = `${msg} · falta publicar`;
    st.classList.add('vis');
    clearTimeout(timerSalvo);
    timerSalvo = setTimeout(() => st.classList.remove('vis'), 2200);
    renderCal();
  }

  /* Publicar / descartar */
  $('#pub-ok').addEventListener('click', async () => {
    const b = $('#pub-ok'); b.disabled = true; b.textContent = 'Publicando…';
    try {
      await DB.salvarDatas(PSI_ID, RASC);
      RASC = {}; barraPublicar();
      await carregarCal(); renderCal(); avisosAgenda();
      $('#status-salvo').classList.remove('vis');
      U.toast('Publicado! Os horários já aparecem no site.', 'ok');
    } catch (err) { U.toast(err.message || 'Não consegui publicar. Tente de novo.', 'erro'); }
    finally { b.disabled = false; b.textContent = 'Publicar no site'; }
  });
  $('#pub-descartar').addEventListener('click', async () => {
    const ok = await U.confirmar('Descartar alterações?', 'Os horários voltam a ser como estão publicados no site.', 'Descartar', true);
    if (!ok) return;
    RASC = {}; barraPublicar();
    await carregarCal(); renderCal();
    $('#status-salvo').classList.remove('vis');
  });
  /* não perder o que não foi publicado */
  window.addEventListener('beforeunload', e => { if (temRascunho()) { e.preventDefault(); e.returnValue = ''; } });
  document.addEventListener('click', async e => {
    const a = e.target.closest('a[href]');
    if (!a || !temRascunho() || a.target === '_blank' || a.getAttribute('href').startsWith('#') || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    const sair = await U.confirmar('Horários não publicados', 'Você mudou horários e ainda não publicou. Se sair agora, essas mudanças se perdem.', 'Sair sem publicar', true);
    if (sair) { RASC = {}; location.href = a.href; }
  }, true);

  $('#mes-ant').onclick = () => { cal.mes = U.addMes(cal.mes, -1); renderCal(); };
  $('#mes-prox').onclick = () => { cal.mes = U.addMes(cal.mes, 1); renderCal(); };

  $('#cal-grade').addEventListener('click', e => {
    const dia = e.target.closest('[data-data]');
    if (dia && !dia.disabled) {
      const d = dia.dataset.data;
      const eraVazio = !cal.sel.size;
      cal.sel.has(d) ? cal.sel.delete(d) : cal.sel.add(d);
      renderCal();
      /* no celular os horários ficam embaixo do calendário: rola até eles */
      if (eraVazio && cal.sel.size && window.innerWidth < 760) $('#cal-horas').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const sem = e.target.closest('[data-semana]');
    if (sem) {
      const alvo = diasDoMes(cal.mes).filter(d => U.diaSemana(d) === Number(sem.dataset.semana) && podeEditar(d));
      const todos = alvo.length && alvo.every(d => cal.sel.has(d));
      alvo.forEach(d => (todos ? cal.sel.delete(d) : cal.sel.add(d)));
      renderCal();
    }
  });

  $('#cal-horas').addEventListener('click', async e => {
    const b = e.target.closest('button');
    if (!b) return;
    if ('limparSel' in b.dataset) { cal.sel.clear(); return renderCal(); }
    if (b.dataset.hora) {
      const h = b.dataset.hora;
      if (b.classList.contains('ocupado') && b.classList.contains('on')) return U.toast('Esse horário já tem atendimento. Para fechar, fale com a equipe.', 'erro');
      const ligar = !b.classList.contains('on');
      return aplicar(set => (ligar ? set.add(h) : set.delete(h)));
    }
    if (b.dataset.periodo) {
      const p = PERIODOS[Number(b.dataset.periodo)];
      return aplicar(set => HORAS.forEach(h => { const n = Number(h.slice(0, 2)); if (n >= p.de && n <= p.ate) set.add(h); }));
    }
    if ('tudo' in b.dataset) return aplicar(set => HORAS.forEach(h => set.add(h)));
    if ('nenhum' in b.dataset) return aplicar(set => set.clear(), 'Horários removidos');
    if ('copiar' in b.dataset) {
      const base = [...cal.sel][0];
      const horas = cal.datas[base] || [];
      const alvo = [];
      for (let d = U.addDias(base, 7); d <= limiteData(); d = U.addDias(d, 7)) alvo.push(d);
      const ok = await U.confirmar('Repetir horários',
        `Os mesmos ${horas.length} horários de ${U.fmtDDMM(base)} serão abertos em ${alvo.length} ${U.DIAS_PLURAL[U.diaSemana(base)]}, até ${U.fmtDDMM(alvo[alvo.length - 1] || base)}. Horários que já existem nesses dias continuam.`,
        'Repetir');
      if (!ok) return;
      const antes = new Set(cal.sel);
      cal.sel = new Set(alvo);
      await aplicar(set => horas.forEach(h => set.add(h)), `Repetido em ${alvo.length} semanas`);
      cal.sel = antes;
      renderCal();
    }
  });

  /* =====================================================================
     DISPONIBILIDADE — folgas
     ===================================================================== */
  const bData = $('#b-data');
  bData.min = U.hojeISO();
  $('#b-hora').innerHTML = `<option value="">Dia inteiro</option>` + HORAS.map(hr => `<option value="${hr}">${U.intervalo(hr, C.duracaoSessao)}</option>`).join('');

  async function renderBloqueios() {
    const disp = await DB.obterDisponibilidade(PSI_ID);
    const futuros = disp.bloqueios.filter(b => b.data >= U.hojeISO());
    $('#lista-bloq').innerHTML = futuros.length
      ? futuros.map(b => `
        <li>
          <span><strong>${U.fmtLonga(b.data)}</strong> · ${b.hora ? U.intervalo(b.hora, C.duracaoSessao) : 'dia inteiro'}${b.motivo ? ` <span class="muted">· ${esc(b.motivo)}</span>` : ''}</span>
          <button class="btn btn-secundario btn-peq" data-remover="${b.id}">Desbloquear</button>
        </li>`).join('')
      : `<li class="muted">Nenhuma folga marcada.</li>`;
  }

  $('#form-bloq').addEventListener('submit', async e => {
    e.preventDefault();
    const data = bData.value, hora = $('#b-hora').value, motivo = $('#b-motivo').value.trim();
    if (!data) return U.toast('Escolha a data.', 'erro');
    const conflitos = (await DB.listarAgendamentos({ psiId: PSI_ID, status: ['pendente', 'confirmado'], de: data, ate: data }))
      .filter(a => !hora || a.hora === hora);
    if (conflitos.length) {
      U.modal({
        titulo: 'Já existe atendimento nesse período',
        corpo: `<p>Você tem ${conflitos.length} atendimento${conflitos.length > 1 ? 's' : ''} marcado${conflitos.length > 1 ? 's' : ''} ${hora ? 'nesse horário' : 'nesse dia'}:</p>
          <ul>${conflitos.map(a => `<li>${U.fmtHora(a.hora)} · ${a.status === 'pendente' ? 'pré-reserva' : esc(a.paciente.nome)}</li>`).join('')}</ul>
          <p>O bloqueio vale para novos agendamentos. Para remarcar esses pacientes, fale com a equipe.</p>`,
        acoes: [
          { texto: 'Voltar' },
          { texto: 'Bloquear mesmo assim', classe: 'btn-primario', onClick: () => salvarBloqueio(data, hora, motivo) }
        ]
      });
      return;
    }
    await salvarBloqueio(data, hora, motivo);
  });

  async function salvarBloqueio(data, hora, motivo) {
    await DB.adicionarBloqueio(PSI_ID, { data, hora, motivo });
    $('#b-motivo').value = '';
    U.toast('Bloqueado. Esse período não aparece mais no site.');
    renderBloqueios();
    await carregarCal(); renderCal();
  }

  $('#lista-bloq').addEventListener('click', async e => {
    const b = e.target.closest('[data-remover]');
    if (!b) return;
    await DB.removerBloqueio(PSI_ID, b.dataset.remover);
    U.toast('Desbloqueado.');
    renderBloqueios();
    await carregarCal(); renderCal();
  });

  /* =====================================================================
     RESUMO DO MÊS
     ===================================================================== */
  const rMes = $('#r-mes');
  rMes.value = U.mesAtual();
  rMes.addEventListener('change', renderResumo);
  async function renderResumo() {
    const [r] = await DB.relatorioMes(rMes.value, { psiId: PSI_ID });
    const x = r || { realizadas: 0, faltas: 0, faturado: 0, repasse: 0, previstas: 0, valorPrevisto: 0 };
    $('#numeros-resumo').innerHTML = `
      <div class="numero"><span>Sessões realizadas</span><strong>${x.realizadas}</strong></div>
      <div class="numero"><span>Faltas (contam como feitas)</span><strong>${x.faltas}</strong></div>
      <div class="numero"><span>A receber</span><strong>${U.moeda(x.repasse)}</strong></div>
      <div class="numero"><span>Ainda por vir no mês</span><strong>${x.previstas} · ${U.moeda(x.valorPrevisto)}</strong></div>`;
  }

  /* =====================================================================
     CONTA
     ===================================================================== */
  async function renderConta() {
    const p = await DB.obterPsicologo(PSI_ID);
    if (!p) return;
    const FB = DB.modo === 'firebase';
    /* o psicólogo muda e-mail, WhatsApp e usuário; nome e CRP só a equipe (eles também aparecem no site) */
    $('#c-nome').value = p.nome || ''; $('#c-crp').value = p.crp || '';
    /* OPP: da agenda; se ainda não estiver lá, do cadastro do perfil (Psicólogos) */
    let opp = p.opp || '';
    if (!opp && DB.modo !== 'firebase') { try { const c = JSON.parse(localStorage.getItem('pb-painel-v1')) || {}; const x = (c.psicologos || []).find(y => y.agendaId === PSI_ID); opp = (x && x.opp) || ''; } catch (e) { /* sem cadastro */ } }
    $('#c-opp').value = opp;
    $('#c-email').value = p.email || '';
    /* WhatsApp com país (bandeira + código) e só algarismos: js/campo-telefone.js */
    if (!window.TEL_CONTA && window.CampoTelefone) window.TEL_CONTA = CampoTelefone($('#c-whats'));
    if (window.TEL_CONTA) window.TEL_CONTA.definir(p.whatsapp || ''); else $('#c-whats').value = p.whatsapp ? U.fmtTelefoneCampo(p.whatsapp) : '';
    $('#c-usuario').value = p.usuario || '';
    montarPix(p);
    pixOriginal = { pix: p.pix || '', pixTipo: p.pixTipo || U.pixAdivinhar(p.pix) || '' };
    pixAberto = false; travarPix(!PIX_DIRETO);
    $('#c-pix-alterar').hidden = VISAO_EQUIPE;   /* só o próprio psicólogo vê o botão (com código no e-mail) */
    $('#c-pix-alterar').textContent = 'Alterar chave Pix';
    atualizarPix();
    /* Disponibilidade: avisa em qual fuso estão os horários (quando não é Brasília) */
    { const df = $('#disp-fuso'), f = p.fuso || U.FUSO_BR;
      df.hidden = U.mesmoRelogio(f, U.FUSO_BR);
      df.innerHTML = df.hidden ? '' : `🌍 Horários no fuso de <b>${esc(U.nomeFuso(f))}</b>${VISAO_EQUIPE ? `, onde ${esc(U.primeiroNome(p.nome || ''))} atende` : ''}. Cada paciente vê no fuso dele.`; }
    /* fuso horário de onde atende: a equipe escolhe; o psicólogo só vê */
    const selF = $('#c-fuso'), fusoAtual = p.fuso || U.FUSO_BR;
    const listaF = U.FUSOS.some(f => f.id === fusoAtual) ? U.FUSOS : [{ id: fusoAtual, nome: U.nomeFuso(fusoAtual), pais: '' }, ...U.FUSOS];
    const gruposF = []; listaF.forEach(f => { const r = f.regiao || 'Outros'; let g = gruposF.find(x => x.r === r); if (!g) gruposF.push(g = { r, l: [] }); g.l.push(f); });
    selF.innerHTML = gruposF.map(g => `<optgroup label="${esc(g.r)}">${g.l.map(f => `<option value="${esc(f.id)}">${esc(f.pais ? `${f.nome} (${f.pais})` : f.nome)}</option>`).join('')}</optgroup>`).join('');
    selF.value = fusoAtual; selF.dataset.antes = fusoAtual; selF.disabled = !VISAO_EQUIPE;
    $('#c-fuso-ajuda').textContent = VISAO_EQUIPE
      ? 'A disponibilidade e os atendimentos ficam neste fuso. Os pacientes veem no fuso deles.'
      : 'Seus horários ficam neste fuso; cada paciente vê no fuso dele. Para mudar, fale com a equipe.';
    /* o psicólogo muda só o WhatsApp de contato e a chave Pix; nome, CRP, OPP, e-mail e fuso: só a equipe */
    $('#c-nome').readOnly = !VISAO_EQUIPE; $('#c-crp').readOnly = !VISAO_EQUIPE; $('#c-opp').readOnly = !VISAO_EQUIPE; $('#c-email').readOnly = !VISAO_EQUIPE;
    ['#c-nome', '#c-crp', '#c-opp', '#c-email'].forEach(id => $(id).closest('.campo').classList.toggle('so-equipe', !VISAO_EQUIPE));
    $("#campo-usuario").hidden = true;   /* o login é o e-mail */
    $('#c-ajuda').innerHTML = VISAO_EQUIPE
      ? `Nome, CRP e OPP também mudam na página do site (em <a href="conteudo.html#psicologos">Psicólogos</a> ela fica como “alterada”: publique de novo para o site mostrar).${FB ? ' O e-mail de login só a própria pessoa troca: aqui você muda o e-mail de contato.' : ''}`
      : 'Aqui você muda o seu <b>WhatsApp de contato</b> e a <b>chave Pix</b>. Para mudar nome, CRP, OPP ou e-mail, fale com o suporte.';
    $('#c-2fa').textContent = 'Acesso com e-mail e senha. Esqueceu a senha? Use “Esqueci a senha” na tela de login. A troca da chave Pix é confirmada com um código no seu e-mail.';
    $('#c-2fa').hidden = VISAO_EQUIPE;
    $('#bloco-senha').hidden = VISAO_EQUIPE;    /* senha de outra pessoa: link de nova senha em Usuários */
    /* equipe: botão para abrir a conversa com o psicólogo no WhatsApp (segue o número do campo) */
    const irWhats = () => {
      const b = $('#c-whats-ir'), T = window.TEL_CONTA, num = T ? T.valor() : $('#c-whats').value;
      b.hidden = !VISAO_EQUIPE || !num || (T ? !T.valido() : U.digitos(num).length < 10);
      if (!b.hidden) {
        b.href = U.linkWhats(num, `Olá, ${U.primeiroNome(p.nome || '')}! Aqui é ${U.primeiroNome(S.nome || '')}, da equipe Psicólogos Brasil.`);
        b.setAttribute('aria-label', `Abrir conversa com ${p.nome || 'o psicólogo'} no WhatsApp`);
      }
    };
    irWhats();
    if (!$('#c-whats').dataset.ligadoWhats) { $('#c-whats').dataset.ligadoWhats = '1'; $('#c-whats').addEventListener('input', irWhats); }
    $('#bloco-aparencia').hidden = VISAO_EQUIPE; /* a aparência é de quem está usando: a equipe muda em Configurações ou na própria conta */
    if (VISAO_EQUIPE) {
      marcarNomePsi(p.nome || 'Psicólogo');
      $('#conta-sub').innerHTML = FB
        ? `Dados de contato e de acesso. Senha: <button type="button" class="btn-link" id="link-senha-psi">enviar link de nova senha para ${esc(p.email || '')}</button>.`
        : 'Dados de contato e de acesso. Para desligar o acesso, use <a href="conteudo.html#usuarios">Usuários</a>.';
      const bl = $('#link-senha-psi');
      if (bl) bl.onclick = async () => { try { await DB.equipe.novaSenha(p.email); U.toast('Link de nova senha enviado.'); } catch (e) { U.toast(e.message, 'erro'); } };
    }
  }

  /* a equipe mudou nome/CRP/WhatsApp: leva para o cadastro do perfil (Perfis) também */
  async function atualizarPerfil(dados) {
    try {
      if (DB.modo === 'firebase') {
        const { fs, db } = await NUVEM.authPronta();
        const s = await fs.getDocs(fs.query(fs.collection(db, 'painel_psicologos'), fs.where('agendaId', '==', PSI_ID)));
        for (const d of s.docs) {
          const at = d.data();
          await fs.updateDoc(d.ref, { nome: dados.nome, crp: dados.crp, opp: dados.opp || '', whats: dados.whatsapp, atualizado: Date.now(), alterado: !!at.geradoEm });
        }
      } else {
        const c = JSON.parse(localStorage.getItem('pb-painel-v1')) || {};
        (c.psicologos || []).filter(x => x.agendaId === PSI_ID).forEach(x => {
          Object.assign(x, { nome: dados.nome, crp: dados.crp, opp: dados.opp || '', whats: dados.whatsapp, atualizado: Date.now() });
          if (x.geradoEm) x.alterado = true;
        });
        localStorage.setItem('pb-painel-v1', JSON.stringify(c));
      }
    } catch (e) { console.warn('perfil', e); }
  }

  /* ---------- chave Pix: tipo (CPF, CNPJ, celular, e-mail, aleatória) + chave ----------
     O botão "Copiar" aparece só para o administrador (quem faz os repasses).
     O psicólogo vê e edita a chave e o tipo, sem o botão de copiar. */
  const PODE_COPIAR_PIX = VISAO_EQUIPE && S.papel === 'admin';
  let pixTipo = '';
  const inpPix = $('#c-pix');
  /* Quem muda a chave Pix: o administrador direto; o psicólogo com código no e-mail (botão "Alterar chave Pix");
     o suporte só vê. */
  const PIX_DIRETO = VISAO_EQUIPE && S.papel === 'admin';
  let pixAberto = false, pixOriginal = { pix: '', pixTipo: '' };
  function travarPix(travar) {
    $$('#c-pix-tipos [data-pix-tipo]').forEach(b => { b.disabled = travar; });
    inpPix.readOnly = travar;
    $('.pix-campo').classList.toggle('pix-travado', travar);
  }
  function abrirPix(abrir) {
    pixAberto = abrir;
    travarPix(!abrir);
    const b = $('#c-pix-alterar');
    b.textContent = abrir ? 'Cancelar troca da chave' : 'Alterar chave Pix';
    if (!abrir) { marcarTipoPix(pixOriginal.pixTipo, false); inpPix.value = pixOriginal.pixTipo ? U.pixFormatar(pixOriginal.pixTipo, pixOriginal.pix) : pixOriginal.pix; atualizarPix(); }
    else inpPix.focus();
  }
  function marcarTipoPix(t, limpar) {
    pixTipo = t;
    const info = U.PIX_TIPOS.find(x => x.id === t);
    $$('#c-pix-tipos [data-pix-tipo]').forEach(b => b.setAttribute('aria-checked', b.dataset.pixTipo === t ? 'true' : 'false'));
    inpPix.disabled = !t;
    inpPix.placeholder = info ? `Ex.: ${info.dica}` : 'Escolha acima o tipo da chave';
    inpPix.inputMode = t === 'email' ? 'email' : t === 'celular' ? 'tel' : (t === 'cpf' || t === 'cnpj') ? 'numeric' : 'text';
    if (limpar) inpPix.value = '';
    atualizarPix();
  }
  function atualizarPix() {
    const v = inpPix.value.trim(), n = pixTipo ? U.pixNormalizar(pixTipo, v) : { ok: true, valor: '' };
    const b = $('#c-pix-copiar');
    b.hidden = !PODE_COPIAR_PIX; b.disabled = !v || !n.ok;
    const aj = $('#c-pix-ajuda');
    aj.classList.toggle('erro', !!v && !n.ok && document.activeElement !== inpPix);
    aj.textContent = v && !n.ok && document.activeElement !== inpPix ? n.erro
      : PODE_COPIAR_PIX ? 'O botão Copiar copia a chave no formato que o banco aceita.'
      : VISAO_EQUIPE ? 'Copiar a chave: só administrador.' : 'É para esta chave que a equipe manda os seus repasses.';
    if (!PIX_DIRETO && !(n && !n.ok && v && document.activeElement !== inpPix)) {
      if (!VISAO_EQUIPE) aj.textContent = pixAberto ? 'Escolha o tipo e digite a nova chave. Ao salvar, mandamos um código para o seu e-mail para confirmar a troca.' : 'É para esta chave que a equipe manda os seus repasses. Para trocar, toque em “Alterar chave Pix”: confirmamos com um código no seu e-mail.';
      else aj.textContent = 'Só o administrador muda a chave Pix.' + (PODE_COPIAR_PIX ? ' O botão Copiar copia a chave no formato que o banco aceita.' : '');
    }
  }
  function montarPix(p) {
    $('#c-pix-tipos').innerHTML = U.PIX_TIPOS.map(t => `<button type="button" role="radio" aria-checked="false" data-pix-tipo="${t.id}">${esc(t.nome)}</button>`).join('');
    const t = p.pixTipo || U.pixAdivinhar(p.pix);
    inpPix.value = t ? U.pixFormatar(t, p.pix || '') : (p.pix || '');
    marcarTipoPix(t, false);
  }
  $('#c-pix-alterar').addEventListener('click', () => abrirPix(!pixAberto));
  $('#c-pix-tipos').addEventListener('click', e => {
    const b = e.target.closest('[data-pix-tipo]'); if (!b || b.disabled || b.dataset.pixTipo === pixTipo) return;
    /* trocou o tipo: a chave antiga não serve no tipo novo, começa em branco */
    marcarTipoPix(b.dataset.pixTipo, true);
    inpPix.focus();
  });
  inpPix.addEventListener('input', () => {
    if (pixTipo === 'cpf' || pixTipo === 'cnpj' || pixTipo === 'celular') {
      const d = U.digitos(inpPix.value).slice(0, pixTipo === 'cnpj' ? 14 : 11);
      if (pixTipo === 'cpf') inpPix.value = d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
      else if (pixTipo === 'cnpj') inpPix.value = d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2');
      else inpPix.value = d.length > 2 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}${d.length > 7 ? '-' + d.slice(7) : ''}` : d;
    }
    atualizarPix();
  });
  inpPix.addEventListener('blur', atualizarPix);
  $('#c-pix-copiar').addEventListener('click', async () => {
    const b = $('#c-pix-copiar'), n = U.pixNormalizar(pixTipo, inpPix.value);
    if (!n.ok || !n.valor) return;
    try { await navigator.clipboard.writeText(n.valor); }
    catch (e) { const t = document.createElement('textarea'); t.value = n.valor; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (e2) { /* nada */ } t.remove(); }
    b.classList.add('copiado'); b.querySelector('span').textContent = 'Copiado';
    setTimeout(() => { b.classList.remove('copiado'); b.querySelector('span').textContent = 'Copiar'; }, 1600);
    U.toast(`${U.pixNomeTipo(pixTipo)} copiado: ${n.valor}`);
  });

  $('#form-dados').addEventListener('submit', async e => {
    e.preventDefault();
    const dados = {
      nome: $('#c-nome').value.trim(), crp: $('#c-crp').value.trim(), opp: U.digitos($('#c-opp').value).slice(0, 6),
      email: $('#c-email').value.trim().toLowerCase(),
      whatsapp: window.TEL_CONTA ? window.TEL_CONTA.valor() : (U.digitos($('#c-whats').value) ? U.whatsNormalizar($('#c-whats').value) : ''),
      usuario: $('#c-usuario').value.trim().toLowerCase(),
      pix: $('#c-pix').value.trim()
    };
    {
      const n = dados.pix ? U.pixNormalizar(pixTipo, dados.pix) : { ok: true, valor: '' };
      if (!n.ok) { atualizarPix(); inpPix.focus(); return U.toast(n.erro, 'erro'); }
      dados.pix = n.valor; dados.pixTipo = n.valor ? pixTipo : '';
    }
    if (VISAO_EQUIPE) {
      const f = $('#c-fuso').value;
      if (f !== $('#c-fuso').dataset.antes) {
        const futuros = (await DB.listarAgendamentos({ psiId: PSI_ID, status: ['pendente', 'confirmado'] })).filter(a => U.msAg(a) > Date.now()).length;
        const ok = await U.confirmar('Mudar o fuso horário?', `Passa a ser <b>${esc(U.nomeFuso(f))}</b>. Os horários da disponibilidade${futuros ? ` e os ${futuros} atendimento${futuros > 1 ? 's' : ''} já marcado${futuros > 1 ? 's' : ''}` : ''} continuam com os mesmos números (ex.: 9h), mas passam a valer no novo fuso.${futuros ? ' Avise os pacientes se o horário deles mudar.' : ''}`, 'Mudar fuso');
        if (!ok) return;
      }
      dados.fuso = f;
    }
    if (VISAO_EQUIPE && dados.nome.length < 3) return U.toast('Coloque o nome completo.', 'erro');
    if (VISAO_EQUIPE && !U.emailValido(dados.email)) return U.toast('Coloque um e-mail válido.', 'erro');
    if (window.TEL_CONTA && !window.TEL_CONTA.valido()) { $('#c-whats').focus(); return U.toast(window.TEL_CONTA.erro(), 'erro'); }
    if (!window.TEL_CONTA && dados.whatsapp && !U.whatsValido(dados.whatsapp)) return U.toast('WhatsApp inválido.', 'erro');
    const b = $('#c-salvar'); b.disabled = true;
    try {
      const trocaPix = !VISAO_EQUIPE && pixAberto && (dados.pix !== pixOriginal.pix || dados.pixTipo !== pixOriginal.pixTipo);
      if (!VISAO_EQUIPE && pixAberto && !dados.pix) { b.disabled = false; inpPix.focus(); return U.toast('Digite a nova chave Pix ou toque em “Cancelar troca da chave”.', 'erro'); }
      const whatsAntes = (await DB.obterPsicologo(PSI_ID) || {}).whatsapp || '';
      const r = await DB.atualizarContato(PSI_ID, VISAO_EQUIPE ? (PIX_DIRETO ? dados : { ...dados, pix: undefined, pixTipo: undefined }) : { whatsapp: dados.whatsapp });
      if (trocaPix && !(await confirmarTrocaPix(dados))) {
        /* cancelou o código: nada muda na chave (aviso em amarelo, não em verde) */
        abrirPix(false);
        const mudouWhats = !VISAO_EQUIPE && (dados.whatsapp || '') !== (whatsAntes ? U.whatsNormalizar(whatsAntes) : '');
        U.toast(mudouWhats ? 'WhatsApp salvo. A troca da chave Pix foi cancelada: sua chave continua a mesma.' : 'Troca da chave Pix cancelada. Sua chave continua a mesma.', 'aviso');
        b.disabled = false; return;
      }
      if (VISAO_EQUIPE) await atualizarPerfil(dados);
      U.toast(r && r.aviso ? r.aviso : 'Dados salvos.');
      await renderConta();
      if (VISAO_EQUIPE) marcarNomePsi(dados.nome);
    } catch (err) { U.toast(err.message, 'erro'); }
    finally { b.disabled = false; }
  });

  /* psicólogo trocando a chave Pix: código de 6 números no e-mail dele */
  async function confirmarTrocaPix(dados) {
    let r;
    try { r = await DB.pedirCodigoPix(PSI_ID, { pix: dados.pix, pixTipo: dados.pixTipo }); }
    catch (e) { U.toast(e.message, 'erro'); return false; }
    if (r.codigo) await Servicos.enviarEmail({ para: r.email, assunto: 'Código para trocar sua chave Pix', corpo: `Seu código para confirmar a nova chave Pix na Psicólogos Brasil é ${r.codigo}. Ele vale por 10 minutos.\n\nSe não foi você, não digite o código e fale com o suporte: sua chave continua a mesma.` });
    const esconder = e => { const [n, d] = String(e || '').split('@'); return d ? n.slice(0, 2) + '•••@' + d : String(e || ''); };
    const ok = await Auth.formulario({
      titulo: 'Confirme a nova chave Pix',
      texto: `Mandamos um código de 6 números para ${esconder(r.email)}. Digite abaixo para confirmar a troca. O código vale por 10 minutos.` + (DB.modo === 'local' && r.codigo ? ` (Modo de teste: o código é ${r.codigo}.)` : ''),
      icone: 'ok', ok: 'Confirmar troca',
      campos: [{ nome: 'codigo', rotulo: 'Código do e-mail', auto: 'one-time-code', ajuda: 'Não chegou? Confira a caixa de spam. Para mandar outro, cancele e salve de novo.' }],
      aoEnviar: async v => {
        const c = U.digitos(v.codigo);
        if (c.length !== 6) throw new Error('Digite os 6 números do código.');
        const x = await DB.confirmarCodigoPix(PSI_ID, c);
        if (DB.modo === 'local' && x && x.email) await Servicos.enviarEmail({ para: x.email, assunto: 'Sua chave Pix foi alterada', corpo: 'A chave Pix para receber os repasses da Psicólogos Brasil foi alterada agora. Se não foi você, fale com o suporte imediatamente.' });
      }
    });
    if (ok) U.toast('Chave Pix trocada. Mandamos um aviso para o seu e-mail.');
    return !!ok;
  }

  $('#s-mostrar').addEventListener('change', e => { ['#s-atual', '#s-nova', '#s-conf'].forEach(id => { $(id).type = e.target.checked ? 'text' : 'password'; }); });
  $('#c-opp').addEventListener('input', e => { e.target.value = U.digitos(e.target.value).slice(0, 6); });
  $('#form-senha').addEventListener('submit', async e => {
    e.preventDefault();
    if (!$('#s-atual').value || !$('#s-nova').value) { U.toast('Preencha a senha atual e a nova senha.', 'erro'); return; }
    if ($('#s-nova').value !== $('#s-conf').value) { U.toast('A confirmação não é igual à nova senha. Digite de novo.', 'erro'); $('#s-conf').focus(); return; }
    try {
      await DB.alterarSenha(PSI_ID, $('#s-atual').value, $('#s-nova').value);
      e.target.reset(); ['#s-atual', '#s-nova', '#s-conf'].forEach(id => { $(id).type = 'password'; });
      const av = document.getElementById('aviso-senha'); if (av) av.remove();
      U.toast('Senha alterada.');
    } catch (err) { U.toast(err.message, 'erro'); }
  });

  /* ---------------- senha padrão: pede para trocar ---------------- */
  async function avisoSenhaPadrao() {
    if (VISAO_EQUIPE || !DB.senhaPadraoAtiva) return;
    try { if (!(await DB.senhaPadraoAtiva(PSI_ID))) return; } catch (e) { return; }
    const av = document.createElement('div');
    av.className = 'aviso-senha'; av.id = 'aviso-senha'; av.setAttribute('role', 'alert');
    av.innerHTML = `<div class="aviso-senha-in"><span><b>Você está com uma senha provisória.</b> Por segurança, crie uma senha só sua.</span>
      <button type="button" class="btn btn-primario btn-peq" id="aviso-senha-btn">Trocar senha agora</button></div>`;
    const main = $('main'); main.parentNode.insertBefore(av, main);
    $('#aviso-senha-btn').onclick = () => { ativar('conta'); const f = $('#bloco-senha'); if (f) { f.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => $('#s-atual').focus({ preventScroll: true }), 400); } };
  }
  avisoSenhaPadrao();

  /* ---------------- repetir o mês no próximo ----------------
     Cada dia do mês seguinte recebe os horários do mesmo dia da semana deste mês
     (a última segunda com horários vale para todas as segundas, e assim por diante).
     Dias que já têm horários no mês seguinte não mudam. Fica como rascunho: falta publicar. */
  function padraoDoMes(m) {
    const p = {};
    diasDoMes(m).forEach(d => { const h = cal.datas[d]; if (h && h.length && !cal.bloqueios.some(b => b.data === d && !b.hora)) p[U.diaSemana(d)] = h; });
    return p;
  }
  function dicaCopiarMes() {
    const prox = U.addMes(cal.mes, 1), pad = padraoDoMes(cal.mes), b = $('#copiar-mes');
    const passa = diasDoMes(prox)[0] > limiteData();
    b.disabled = !Object.keys(pad).length || passa;
    b.textContent = `Repetir ${U.fmtMes(cal.mes).split(' de ')[0]} em ${U.fmtMes(prox).split(' de ')[0]}`;
    $('#copiar-mes-dica').textContent = passa ? 'O próximo mês ainda não pode ser aberto.' : !Object.keys(pad).length ? 'Abra horários neste mês para poder repetir.' : '';
  }
  $('#copiar-mes').addEventListener('click', async () => {
    const prox = U.addMes(cal.mes, 1), pad = padraoDoMes(cal.mes);
    const alvo = diasDoMes(prox).filter(d => podeEditar(d) && pad[U.diaSemana(d)] && !(cal.datas[d] || []).length && !cal.bloqueios.some(b => b.data === d && !b.hora));
    if (!alvo.length) return U.toast('Nada para repetir: os dias do próximo mês já têm horários.', 'erro');
    const ok = await U.confirmar('Repetir no próximo mês',
      `Os horários de cada dia da semana de ${U.fmtMes(cal.mes)} vão ser abertos em ${alvo.length} dias de ${U.fmtMes(prox)}. Dias que já têm horários continuam como estão. Depois é só conferir e clicar em “Publicar no site”.`, 'Repetir');
    if (!ok) return;
    cal.mes = prox;
    cal.sel = new Set(alvo);
    await aplicar((set, d) => pad[U.diaSemana(d)].forEach(h => set.add(h)), `Repetido em ${alvo.length} dias`);
    cal.sel = new Set();
    renderCal();
  });

  /* ---------------- avisos no topo: agenda offline e horários acabando ---------------- */
  let estadoAgenda = { pausada: false };
  function avisosAgenda() {
    let box = $('#aviso-agenda');
    if (!box) {
      box = document.createElement('div'); box.id = 'aviso-agenda'; box.setAttribute('role', 'status');
      const ref = $('#aviso-senha') || $('.visao-equipe') || $('.topo');
      ref.after(box);
    }
    const hoje = U.hojeISO();
    const futuras = Object.keys(cal.datas).filter(d => d >= hoje && (cal.datas[d] || []).length && !RASC[d]).sort();
    const ultima = futuras[futuras.length - 1];
    const voce = VISAO_EQUIPE ? 'A agenda' : 'Sua agenda';
    if (estadoAgenda.pausada) {
      box.className = 'aviso-agenda off';
      box.innerHTML = `<div class="aviso-agenda-in"><span><b>${voce} está offline.</b> Os pacientes não conseguem marcar horário.</span><button type="button" class="btn btn-peq aviso-agenda-btn" data-ligar>Ligar agenda</button></div>`;
    } else if (!ultima || ultima < U.addDias(hoje, 7)) {
      box.className = 'aviso-agenda fim';
      box.innerHTML = `<div class="aviso-agenda-in"><span><b>${ultima ? `Os horários abertos acabam em ${U.fmtDDMM(ultima)}.` : 'Não há horários abertos.'}</b> Abra mais para não perder pacientes.</span><button type="button" class="btn btn-peq aviso-agenda-btn" data-abrir>Abrir horários</button></div>`;
    } else { box.className = 'aviso-agenda'; box.innerHTML = ''; }
    box.hidden = !box.innerHTML;
  }
  document.addEventListener('click', async e => {
    if (e.target.closest('#aviso-agenda [data-abrir]')) { ativar('disponibilidade'); scrollTo({ top: 0, behavior: 'smooth' }); }
    if (e.target.closest('#aviso-agenda [data-ligar]')) {
      try { await DB.definirAgendaOnline(PSI_ID, true); estadoAgenda.pausada = false; mostrarAgendaOnline(true); avisosAgenda(); U.toast('Agenda online: os pacientes já podem agendar.', 'ok'); }
      catch (err) { U.toast(err.message || 'Não consegui ligar a agenda.', 'erro'); }
    }
  });

  /* ---------------- agenda online / offline (férias, pausa) ---------------- */
  function mostrarAgendaOnline(on) {
    estadoAgenda.pausada = !on; avisosAgenda();
    $('#agenda-online').checked = on;
    $('#agenda-online-box').classList.toggle('off', !on);
    $('#agenda-online-tit').textContent = on ? 'Agenda online' : 'Agenda offline';
    $('#agenda-online-sub').textContent = on
      ? 'Os pacientes veem seus horários livres e podem agendar pelo site.'
      : 'Seu perfil continua no site, mas sem horários para agendar. Ligue de novo quando voltar.';
  }
  async function renderAgendaOnline() {
    const p = await DB.obterPsicologo(PSI_ID).catch(() => null);
    if (p) {
      mostrarAgendaOnline(!p.pausada);
      /* "Ver como os pacientes veem": a lista do site já filtrada neste psicólogo, com a agenda ao lado */
      $('#ver-no-site').href = `../psicologos/?q=${encodeURIComponent(p.nome || '')}#agendar`;
    }
  }
  $('#agenda-online').addEventListener('change', async e => {
    const on = e.target.checked, box = $('#agenda-online-box');
    if (!on && !(await U.confirmar('Deixar a agenda offline?', 'Seu perfil continua no site, mas os pacientes não conseguem marcar horário até você ligar de novo. Os atendimentos já marcados continuam valendo.', 'Deixar offline', true))) { mostrarAgendaOnline(true); return; }
    box.setAttribute('aria-busy', 'true');
    try {
      await DB.definirAgendaOnline(PSI_ID, on);
      mostrarAgendaOnline(on);
      U.toast(on ? 'Agenda online: os pacientes já podem agendar.' : 'Agenda offline: o perfil mostra “Sem horários livres no momento”.', 'ok');
    } catch (err) { mostrarAgendaOnline(!on); U.toast(err.message || 'Não consegui mudar a agenda.', 'erro'); }
    finally { box.removeAttribute('aria-busy'); }
  });

  /* ---------------- início ---------------- */
  async function render() {
    await renderAtend();
    await carregarCal();
    renderCal();
    await renderBloqueios();
    await renderAgendaOnline();
    if (Auth.pode(VISAO_EQUIPE ? 'psiResumo' : 'minhaAgenda')) await renderResumo();
    if (Auth.pode(VISAO_EQUIPE ? 'psiConta' : 'minhaAgenda')) await renderConta();
  }
  await render();
  /* janela "Confirme seus atendimentos": só para o próprio psicólogo, toda vez que entra */
  if (!VISAO_EQUIPE && (await semBaixa()).length) abrirBaixa();
  DB.aoMudar(render);
  setInterval(renderAtend, 60 * 1000);
})();
