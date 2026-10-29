/* =====================================================================
   PAINEL DO PSICÓLOGO
   ===================================================================== */
(async function () {
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
    if (!psi) { location.replace('psicologos.html'); return; }
    const nomePsi = psi.nome || 'Psicólogo';
    document.title = `${nomePsi} · Painel Psicólogos Brasil`;
    document.querySelectorAll('.papel').forEach(e => { e.textContent = Auth.NOMES_PAPEL[S.papel] || ''; });
    $('.marca').href = 'psicologos.html';
    $('.marca small').textContent = 'Psicólogos';
    Auth.menuAreas($('[data-areas]'), 'acompanhar');
    $('.aba[data-aba="conta"]').textContent = 'Conta do psicólogo';
    /* o nome do psicólogo bem visível ao lado do título de cada parte */
    const titulos = { atendimentos: 'Atendimentos', disponibilidade: 'Disponibilidade', resumo: 'Resumo do mês', conta: 'Conta' };
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
        <a href="psicologos.html" class="visao-voltar">← Todos os psicólogos</a>
        <span>Você está vendo a agenda de <strong>${esc(nomePsi)}</strong> como ${S.papel === 'admin' ? 'administrador' : 'suporte'}. O que você mudar aqui vale para ela(e) também.</span>
      </div></div>`);
  }

  /* ---------------- abas ---------------- */
  function ativar(aba) {
    $$('.aba').forEach(b => b.setAttribute('aria-selected', String(b.dataset.aba === aba)));
    const bc = document.getElementById('btn-conta'); if (bc) bc.classList.toggle('atual', aba === 'conta');
    $$('[data-painel]').forEach(p => (p.hidden = p.dataset.painel !== aba));
    history.replaceState(null, '', '#' + aba);
  }
  $$('.aba').forEach(b => (b.onclick = () => ativar(b.dataset.aba)));
  if (!VISAO_EQUIPE) {
    /* "Minha conta" sai das abas: o psicólogo abre clicando no próprio nome, lá em cima */
    const abaConta = $('.aba[data-aba="conta"]'); if (abaConta) abaConta.remove();
    const nomeBox = $('.topo-user .nome-txt');
    const pronto = document.getElementById('btn-conta');
    if (pronto) pronto.addEventListener('click', e => { e.preventDefault(); ativar('conta'); });
    if (nomeBox && !pronto) {
      const ini = String(S.nome || '').split(/\s+/).filter(w => w.length > 2).slice(0, 2).map(w => w[0]).join('').toUpperCase();
      nomeBox.outerHTML = `<button type="button" class="conta-btn" id="btn-conta" title="Minha conta" aria-label="Minha conta: ${esc(S.nome)}">
        <span class="conta-ava" aria-hidden="true">${esc(ini || '•')}</span>
        <span class="conta-txt"><span data-nome>${esc(S.nome)}</span><small>Minha conta</small></span></button>`;
      $('#btn-conta').onclick = () => ativar('conta');
    }
  }
  const pedida = location.hash.slice(1);
  ativar($(`.aba[data-aba="${pedida}"]`) || pedida === 'conta' ? pedida : 'atendimentos');

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
    if (!futuros.length && !passados.length) {
      box.innerHTML = `<div class="vazio"><strong>Nenhum atendimento por enquanto.</strong>Confira se a sua disponibilidade está marcada para os pacientes encontrarem horários no site.</div>`;
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
    box.innerHTML = html;
  }

  function cartao(a) {
    const inicio = U.dataHora(a.data, a.hora).getTime();
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
        </div>
        <div class="atend-acoes">${acoes}</div>
      </div>`;
  }

  $('#lista-atend').addEventListener('click', async e => {
    const b = e.target.closest('[data-acao]');
    if (!b) return;
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
  }

  function renderHoras() {
    const box = $('#cal-horas');
    const sel = [...cal.sel].sort();
    if (!sel.length) {
      box.innerHTML = `<div class="cal-vazio"><strong>Nenhum dia selecionado</strong>Clique em um ou mais dias no calendário para escolher os horários.</div>`;
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
      await carregarCal(); renderCal();
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
    $('#c-email').value = p.email || ''; $('#c-whats').value = p.whatsapp ? U.fmtTelefone(p.whatsapp) : '';
    $('#c-usuario').value = p.usuario || '';
    $('#c-nome').readOnly = !VISAO_EQUIPE; $('#c-crp').readOnly = !VISAO_EQUIPE;
    $('#campo-usuario').hidden = FB;            /* no Firebase o login é pelo e-mail */
    $('#c-ajuda').innerHTML = VISAO_EQUIPE
      ? `Nome e CRP também mudam no perfil do site (em <a href="conteudo.html#psicologos">Perfis</a> ele fica como “alterado”: publique de novo para o site mostrar).${FB ? ' O e-mail de login só a própria pessoa troca: aqui você muda o e-mail de contato.' : ''}`
      : `Para mudar nome ou CRP, fale com a equipe.${FB ? ' Ao trocar o e-mail, você recebe um link no e-mail novo para confirmar.' : ''}`;
    $('#c-2fa').textContent = 'Dois fatores: ' + (FB ? 'sempre ligado (código do app autenticador a cada login).' : 'sempre ligado (código a cada login).');
    $('#bloco-senha').hidden = VISAO_EQUIPE;    /* senha de outra pessoa: link de nova senha em Usuários */
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
          await fs.updateDoc(d.ref, { nome: dados.nome, crp: dados.crp, whats: dados.whatsapp, atualizado: Date.now(), alterado: !!at.geradoEm });
        }
      } else {
        const c = JSON.parse(localStorage.getItem('pb-painel-v1')) || {};
        (c.psicologos || []).filter(x => x.agendaId === PSI_ID).forEach(x => {
          Object.assign(x, { nome: dados.nome, crp: dados.crp, whats: dados.whatsapp, atualizado: Date.now() });
          if (x.geradoEm) x.alterado = true;
        });
        localStorage.setItem('pb-painel-v1', JSON.stringify(c));
      }
    } catch (e) { console.warn('perfil', e); }
  }

  $('#form-dados').addEventListener('submit', async e => {
    e.preventDefault();
    const dados = {
      nome: $('#c-nome').value.trim(), crp: $('#c-crp').value.trim(),
      email: $('#c-email').value.trim().toLowerCase(), whatsapp: U.digitos($('#c-whats').value) ? U.whatsNumero($('#c-whats').value) : '',
      usuario: $('#c-usuario').value.trim().toLowerCase()
    };
    if (VISAO_EQUIPE && dados.nome.length < 3) return U.toast('Coloque o nome completo.', 'erro');
    if (!U.emailValido(dados.email)) return U.toast('Coloque um e-mail válido.', 'erro');
    if (dados.whatsapp && !U.whatsValido(dados.whatsapp)) return U.toast('WhatsApp com DDD, só números (ex.: 85 99999-9999).', 'erro');
    if (DB.modo !== 'firebase' && !/^[a-z0-9._-]{3,}$/.test(dados.usuario)) return U.toast('Usuário: pelo menos 3 letras ou números, sem espaço.', 'erro');
    const b = $('#c-salvar'); b.disabled = true;
    try {
      const r = await DB.atualizarContato(PSI_ID, VISAO_EQUIPE ? dados : { email: dados.email, whatsapp: dados.whatsapp, usuario: dados.usuario });
      if (VISAO_EQUIPE) await atualizarPerfil(dados);
      if (!VISAO_EQUIPE) {
        const s = Auth.sessao();
        if (s && dados.email) sessionStorage.setItem('pb_painel_sessao', JSON.stringify({ ...s, email: dados.email }));
      }
      U.toast(r && r.aviso ? r.aviso : 'Dados salvos.');
      await renderConta();
      if (VISAO_EQUIPE) marcarNomePsi(dados.nome);
    } catch (err) { U.toast(err.message, 'erro'); }
    finally { b.disabled = false; }
  });

  $('#form-senha').addEventListener('submit', async e => {
    e.preventDefault();
    try {
      await DB.alterarSenha(PSI_ID, $('#s-atual').value, $('#s-nova').value);
      e.target.reset();
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

  /* ---------------- início ---------------- */
  async function render() {
    await renderAtend();
    await carregarCal();
    renderCal();
    await renderBloqueios();
    await renderResumo();
    await renderConta();
  }
  await render();
  DB.aoMudar(render);
  setInterval(renderAtend, 60 * 1000);
})();
