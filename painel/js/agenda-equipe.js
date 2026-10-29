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
  $('[data-papel]').textContent = ADMIN ? 'Administrador' : 'Suporte';
  $('[data-sair]').onclick = () => Auth.sair();
  Auth.menuAreas($('[data-areas]'), 'agenda');
  if (!ADMIN) $$('[data-so-admin]').forEach(e => e.remove());
  if (!ADMIN && DB.modo !== 'local') { const lc = $('#limpar-caixa'); if (lc) lc.remove(); }
  if (DB.modo !== 'local') { $$('[data-rodape-teste],[data-aviso-sim]').forEach(e => e.remove()); }

  /* ---------------- abas ---------------- */
  function ativar(aba) {
    $$('.aba').forEach(b => b.setAttribute('aria-selected', String(b.dataset.aba === aba)));
    $$('[data-painel]').forEach(p => (p.hidden = p.dataset.painel !== aba));
    history.replaceState(null, '', '#' + aba);
  }
  $$('.aba').forEach(b => (b.onclick = () => ativar(b.dataset.aba)));
  const pedida = location.hash.slice(1);
  ativar($(`.aba[data-aba="${pedida}"]`) ? pedida : 'pre');

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
  const rotuloPlano = g => g[0].tipo === 'mensal' ? `Plano mensal (${g.length} sessões)` : 'Sessão avulsa';
  const listaSessoesHTML = g => `<ul class="sessoes">${g.map(a => `<li>${U.fmtCurta(a.data)} · ${U.intervalo(a.hora, a.duracao)}${a.status !== g[0].status ? ' ' + U.badge(a.status) : ''}</li>`).join('')}</ul>`;

  /* =====================================================================
     PRÉ-RESERVAS
     ===================================================================== */
  const PRE_POR_PAGINA = 6;      /* pré-reservas: 6 quadrados por página */
  const AG_POR_PAGINA = 20;      /* tabela da agenda: 20 linhas por página */
  let PRE = [], prePag = 1, AG = [], agPag = 1;
  const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  /* o que a busca procura num agendamento: paciente, código, e-mail, WhatsApp e psicólogo */
  const textoBusca = a => norm(`${a.paciente.nome} ${a.codigo} #${a.codigo} ${a.paciente.email} ${a.paciente.whatsapp} ${U.digitos ? U.digitos(a.paciente.whatsapp) : ''} ${nomePsi(a.psiId)}`);
  const casa = (a, q) => !q || q.split(/\s+/).every(t => textoBusca(a).includes(t) || (U.digitos && /\d{3,}/.test(t) && U.digitos(a.paciente.whatsapp).includes(U.digitos(t))));

  async function renderPre() {
    const ags = await DB.listarAgendamentos({ status: ['pendente'] });
    PRE = agrupar(ags).sort((a, b) => b[0].criadoEm - a[0].criadoEm);
    $('[data-cont="pre"]').textContent = PRE.length || '';
    desenharPre();
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
      return `
      <article class="card card-pend">
        <div class="card-topo">
          <span class="codigo">#${esc(a.codigo)}</span>
          ${U.badge('pendente')}
          <span class="direita ${resta < 30 * 60e3 ? 'expira-alerta' : ''}">expira em ${U.tempoRestante(resta)}</span>
        </div>
        <h3>${esc(a.paciente.nome)}</h3>
        <div class="contato">${esc(U.fmtTelefone(a.paciente.whatsapp))} · ${esc(a.paciente.email)}</div>
        <dl class="info">
          <dt>Psicólogo</dt><dd>${esc(nomePsi(a.psiId))}</dd>
          <dt>Plano</dt><dd>${rotuloPlano(g)}</dd>
          <dt>Valor</dt><dd>${U.moeda(totalGrupo(g))}</dd>
          <dt>${g.length > 1 ? 'Sessões' : 'Sessão'}</dt><dd>${listaSessoesHTML(g)}</dd>
        </dl>
        <div class="acoes">
          <button class="btn btn-ok" data-acao="confirmar" data-grupo="${a.grupo}">Confirmar pagamento</button>
          <a class="btn btn-secundario" target="_blank" rel="noopener" href="${U.linkWhats(a.paciente.whatsapp, `Olá, ${U.primeiroNome(a.paciente.nome)}! Recebemos sua pré-reserva #${a.codigo}.`)}">WhatsApp</a>
          <button class="btn btn-perigo" data-acao="cancelar-grupo" data-grupo="${a.grupo}">Cancelar</button>
        </div>
      </article>`;
    }).join('')}</div>`;
  }

  $('#pre-q').addEventListener('input', () => { prePag = 1; desenharPre(); });
  Paginacao.ligar($('#pre-pag'), n => { prePag = n; desenharPre(); }, $('#lista-pre'));

  $('#lista-pre').addEventListener('click', async e => {
    const b = e.target.closest('[data-acao]');
    if (!b) return;
    if (b.dataset.acao === 'confirmar') abrirConfirmacao(b.dataset.grupo);
    if (b.dataset.acao === 'cancelar-grupo') cancelarGrupo(b.dataset.grupo);
  });

  /* ---------- confirmar pagamento ---------- */
  async function abrirConfirmacao(grupo) {
    const g = (await DB.listarAgendamentos({ grupo })).filter(a => ['pendente', 'expirado'].includes(a.status));
    if (!g.length) return U.toast('Esse agendamento já foi tratado.', 'erro');
    const a = g[0];
    const psi = PSIS[a.psiId];
    const link = a.linkMeet || await Servicos.gerarLinkMeet(g);

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
          <div class="link-meet">
            <input type="text" id="m-link" value="${esc(link)}">
            ${DB.modo === 'local' ? '<button type="button" class="btn btn-secundario" id="m-novo-link">Gerar outro</button>' : '<a class="btn btn-secundario" href="https://meet.new" target="_blank" rel="noopener">Criar sala no Meet</a>'}
          </div>
          <p class="ajuda">${DB.modo === 'local' ? 'Modo de teste: link simulado. Com o banco de verdade, o Google Meet é criado automaticamente na conta da plataforma.' : 'Crie a sala na conta Google da plataforma: <a href="https://meet.google.com/" target="_blank" rel="noopener">meet.google.com</a> → “Nova reunião” → “Criar uma reunião para depois”, e cole o link aqui.'}${g.length > 1 ? ' O mesmo link vale para todas as sessões do plano.' : ''}</p>
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
    const btn = document.getElementById('m-novo-link');
    if (btn) btn.onclick = async () => { document.getElementById('m-link').value = await Servicos.gerarLinkMeet(g); };
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
          <a class="btn btn-whats" target="_blank" rel="noopener" href="${U.linkWhats(ags[0].paciente.whatsapp, t.whatsPaciente(ags, psi))}">WhatsApp do paciente</a>
          <a class="btn btn-whats" target="_blank" rel="noopener" href="${U.linkWhats(psi.whatsapp, t.whatsPsicologo(ags, psi))}">WhatsApp do psicólogo</a>
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
  const fPsi = $('#f-psi'), fStatus = $('#f-status'), fDe = $('#f-de'), fAte = $('#f-ate');
  fDe.value = U.addDias(U.hojeISO(), -7);
  fAte.value = U.addDias(U.hojeISO(), 30);
  [fPsi, fStatus, fDe, fAte].forEach(el => el.addEventListener('change', () => { agPag = 1; renderAgenda(); }));

  function preencherFiltroPsi() {
    const atual = fPsi.value;
    fPsi.innerHTML = `<option value="">Todos</option>` + Object.values(PSIS).map(p => `<option value="${p.id}">${esc(p.nome)}</option>`).join('');
    fPsi.value = PSIS[atual] ? atual : '';
  }

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
          <td class="mono">${U.fmtCurta(a.data)}</td>
          <td class="mono">${U.intervalo(a.hora, a.duracao)}</td>
          <td>${esc(nomePsi(a.psiId))}</td>
          <td>${esc(a.paciente.nome)}</td>
          <td>${a.tipo === 'mensal' ? `Mensal ${a.sessao}/${a.totalSessoes}` : 'Avulsa'}</td>
          <td>${U.badge(a.status)}</td>
          <td>${a.status === 'confirmado' ? (a.psiCiente ? '<span class="ciente-ok">✓ Ciente</span>' : '<span class="muted">Ainda não</span>') : '<span class="muted">—</span>'}</td>
        </tr>`).join('')}
      </tbody>`;
  }

  $('#f-q').addEventListener('input', () => { agPag = 1; desenharAgenda(); });
  Paginacao.ligar($('#ag-pag'), n => { agPag = n; desenharAgenda(); }, $('#tabela-agenda'));

  $('#tabela-agenda').addEventListener('click', e => {
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
      acoes.push({ texto: 'Confirmar pagamento', classe: 'btn-ok', onClick: () => { setTimeout(() => abrirConfirmacao(a.grupo), 50); } });
    }
    if (a.status === 'confirmado') {
      acoes.push({ texto: 'Cancelar', classe: 'btn-perigo', onClick: async () => {
        const ok = await U.confirmar('Cancelar sessão', `Cancelar a sessão de ${esc(a.paciente.nome)} em ${U.fmtCurta(a.data)}?`, 'Cancelar sessão', true);
        if (!ok) return false;
        await DB.cancelar([a.id], S.nome); U.toast('Sessão cancelada.'); render();
      } });
      acoes.push({ texto: 'Remarcar', onClick: () => { setTimeout(() => abrirRemarcar(a), 50); } });
      acoes.push({ texto: 'Faltou', onClick: async () => { await DB.atualizarStatus(a.id, 'falta', S.nome); U.toast('Marcado como falta.'); render(); } });
      acoes.push({ texto: 'Realizado', classe: 'btn-primario', onClick: async () => { await DB.atualizarStatus(a.id, 'realizado', S.nome); U.toast('Marcado como realizado.'); render(); } });
    }
    if (['realizado', 'falta'].includes(a.status)) {
      acoes.push({ texto: 'Voltar para confirmado', onClick: async () => { await DB.atualizarStatus(a.id, 'confirmado', S.nome); render(); } });
    }
    acoes.push({ texto: 'Fechar', classe: 'btn-secundario' });

    const m = U.modal({
      titulo: `Atendimento #${esc(a.codigo)}`,
      largo: true,
      corpo: `
        <div class="resumo-modal">
          <dl class="info">
            <dt>Situação</dt><dd>${U.badge(a.status)} ${a.status === 'confirmado' ? (a.psiCiente ? '<span class="ciente-ok">✓ psicólogo ciente</span>' : '<span class="muted">psicólogo ainda não confirmou que viu</span>') : ''}</dd>
            <dt>Quando</dt><dd>${U.fmtLonga(a.data)}, ${U.intervalo(a.hora, a.duracao)}</dd>
            <dt>Psicólogo</dt><dd>${esc(psi?.nome)}</dd>
            <dt>Paciente</dt><dd>${esc(a.paciente.nome)}<br><span class="muted">${esc(U.fmtTelefone(a.paciente.whatsapp))} · ${esc(a.paciente.email)}</span></dd>
            <dt>Plano</dt><dd>${a.tipo === 'mensal' ? `Mensal, sessão ${a.sessao} de ${a.totalSessoes}` : 'Avulsa'} · ${U.moeda(a.valor)} esta sessão</dd>
            ${a.linkMeet ? `<dt>Sala</dt><dd><a href="${esc(a.linkMeet)}" target="_blank" rel="noopener">${esc(a.linkMeet)}</a></dd>` : ''}
          </dl>
        </div>
        ${a.status === 'confirmado' ? `
        <div class="acoes" style="margin-bottom:16px">
          <a class="btn btn-whats btn-peq" target="_blank" rel="noopener" href="${U.linkWhats(a.paciente.whatsapp, t.whatsPaciente([a], psi))}">Link no WhatsApp do paciente</a>
          <a class="btn btn-whats btn-peq" target="_blank" rel="noopener" href="${U.linkWhats(psi.whatsapp, t.whatsPsicologo([a], psi))}">Link no WhatsApp do psicólogo</a>
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

  function abrirRemarcar(a) {
    const psi = PSIS[a.psiId];
    U.modal({
      titulo: 'Remarcar sessão',
      corpo: `
        <p>${esc(a.paciente.nome)} com ${esc(psi.nome)}. Hoje: <strong>${U.fmtCurta(a.data)}, ${U.fmtHora(a.hora)}</strong>.</p>
        <div class="campos-2">
          <div class="campo"><label for="r-data">Nova data</label><input type="date" id="r-data" min="${U.hojeISO()}" value="${a.data}"></div>
          <div class="campo"><label for="r-hora">Horário livre</label><select id="r-hora"></select></div>
        </div>
        <p class="ajuda">Só aparecem os horários livres da disponibilidade de ${esc(U.primeiroNome(psi.nome))}. O link da sala continua o mesmo, e paciente e psicólogo recebem um e-mail.</p>`,
      acoes: [
        { texto: 'Voltar' },
        { texto: 'Salvar nova data', classe: 'btn-primario', onClick: async ({ corpo }) => {
          const data = $('#r-data', corpo).value, hora = $('#r-hora', corpo).value;
          if (!data || !hora) { U.toast('Escolha data e horário livres.', 'erro'); return false; }
          const novo = await DB.remarcar(a.id, data, hora, S.nome);
          await Servicos.notificarRemarcacao(novo, psi);
          U.toast('Sessão remarcada e e-mails enviados.');
          render();
        } }
      ]
    });
    const dataEl = document.getElementById('r-data'), horaEl = document.getElementById('r-hora');
    const carregar = async () => {
      const horas = await DB.horariosLivres(a.psiId, dataEl.value, { ignorarIds: [a.id] });
      horaEl.innerHTML = horas.length
        ? horas.map(h => `<option value="${h}">${U.intervalo(h, a.duracao)}</option>`).join('')
        : `<option value="">Sem horários livres neste dia</option>`;
    };
    dataEl.addEventListener('change', carregar);
    carregar();
  }

  /* Cadastro de psicólogos (acesso, valor e comissão) fica na área
     "Psicólogos" do painel (conteudo.html#psicologos). */

  /* =====================================================================
     REPASSES (só admin)
     ===================================================================== */
  let ultimoRelatorio = [];
  async function renderRepasse() {
    const fMes = $('#f-mes');
    if (!fMes) return;
    if (!fMes.value) fMes.value = U.mesAtual();
    const linhas = await DB.relatorioMes(fMes.value);
    ultimoRelatorio = linhas;
    const soma = k => linhas.reduce((s, r) => s + r[k], 0);
    $('#numeros-repasse').innerHTML = `
      <div class="numero"><span>Sessões feitas</span><strong>${soma('realizadas') + soma('faltas')}</strong></div>
      <div class="numero"><span>Faturado</span><strong>${U.moeda(soma('faturado'))}</strong></div>
      <div class="numero"><span>Fica com a plataforma</span><strong>${U.moeda(soma('comissao'))}</strong></div>
      <div class="numero"><span>A repassar</span><strong>${U.moeda(soma('repasse'))}</strong></div>`;
    const tab = $('#tabela-repasse');
    if (!linhas.length) { tab.innerHTML = `<tbody><tr><td class="muted" style="text-align:center;padding:32px">Nenhum atendimento em ${U.fmtMes(fMes.value)}.</td></tr></tbody>`; return; }
    tab.innerHTML = `
      <thead><tr><th>Psicólogo</th><th class="num">Realizadas</th><th class="num">Faltas</th><th class="num">Faturado</th><th class="num">Comissão</th><th class="num">Repasse</th><th class="num">Ainda por vir</th></tr></thead>
      <tbody>${linhas.map(r => `
        <tr>
          <td>${esc(r.nome)}</td>
          <td class="num">${r.realizadas}</td>
          <td class="num">${r.faltas}</td>
          <td class="num">${U.moeda(r.faturado)}</td>
          <td class="num">${U.moeda(r.comissao)} <span class="muted">(${r.comissaoPct}%)</span></td>
          <td class="num"><strong>${U.moeda(r.repasse)}</strong></td>
          <td class="num muted">${r.previstas} · ${U.moeda(r.valorPrevisto)}</td>
        </tr>`).join('')}
      </tbody>
      <tfoot><tr><td>Total</td><td class="num">${soma('realizadas')}</td><td class="num">${soma('faltas')}</td><td class="num">${U.moeda(soma('faturado'))}</td><td class="num">${U.moeda(soma('comissao'))}</td><td class="num">${U.moeda(soma('repasse'))}</td><td></td></tr></tfoot>`;
  }

  if (ADMIN) {
    $('#f-mes').addEventListener('change', renderRepasse);
    $('#exportar-csv').onclick = () => {
      const n = v => String(v.toFixed(2)).replace('.', ',');
      const linhas = [['Psicólogo', 'Realizadas', 'Faltas', 'Faturado', 'Comissão %', 'Comissão', 'Repasse']]
        .concat(ultimoRelatorio.map(r => [r.nome, r.realizadas, r.faltas, n(r.faturado), r.comissaoPct, n(r.comissao), n(r.repasse)]));
      const csv = '﻿' + linhas.map(l => l.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      a.download = `repasses-${$('#f-mes').value}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    };
  }

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
     ATUALIZAÇÃO
     ===================================================================== */
  async function render() {
    await carregarPsis();
    preencherFiltroPsi();
    await renderPre();
    await renderAgenda();
    if (ADMIN) await renderRepasse();
    await renderCaixa();
  }

  await render();
  DB.aoMudar(render);                 // paciente marcou no site em outra aba
  setInterval(renderPre, 60 * 1000);  // atualiza o "expira em"
})();
