/* =====================================================================
   FINANCEIRO (só administrador)
   - A pagar: repasse de cada sessão realizada (ou falta sem aviso), por psicólogo,
     com a chave Pix para copiar e "Marcar como pago".
   - Pagos: o que já foi pago (data, quem marcou, desfazer).
   - Resumo do mês: faturado, comissão, repasse e quanto já foi pago (CSV).
   A chave Pix é cadastrada pelo próprio psicólogo em "Minha conta".
   ===================================================================== */
(async function () {
  const S = Auth.exigir(['financeiro']);
  if (!S) return;
  const { $, $$, esc } = U;

  $('[data-nome]').textContent = S.nome;
  $('[data-papel]').textContent = Auth.nomePapel(S);
  /* quem pode dar baixa e copiar o Pix: administrador ou suporte com o acesso "Financeiro: marcar como pago" */
  const PAGA = Auth.pode('financeiroPagar');
  $('[data-sair]').onclick = () => Auth.sair();
  Auth.menuAreas($('[data-areas]'), 'financeiro');

  /* ---------- abas ---------- */
  function ativar(aba) {
    $$('.aba').forEach(b => b.setAttribute('aria-selected', String(b.dataset.aba === aba)));
    $$('[data-painel]').forEach(p => (p.hidden = p.dataset.painel !== aba));
    history.replaceState(null, '', '#' + aba);
  }
  $$('.aba').forEach(b => (b.onclick = () => ativar(b.dataset.aba)));
  ativar($(`.aba[data-aba="${location.hash.slice(1)}"]`) ? location.hash.slice(1) : 'apagar');
  /* link para outra aba desta mesma tela: troca a aba */
  window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if ($(`.aba[data-aba="${h}"]`)) { ativar(h); window.scrollTo(0, 0); } });

  const ICO_COPIAR = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';
  const FEITAS = ['realizado', 'falta'];
  let PSIS = {}, AGS = [];
  const ms = a => U.dataHora(a.data, a.hora, a.fuso).getTime();
  const repasseDe = a => { const c = Number(PSIS[a.psiId]?.comissao) || 0; return Math.round(a.valor * (1 - c / 100) * 100) / 100; };

  async function carregar() {
    const psis = await DB.listarPsicologos({ todos: true });
    PSIS = Object.fromEntries(psis.map(p => [p.id, p]));
    AGS = (await DB.listarAgendamentos({ status: FEITAS })).filter(a => a.tipo !== 'conhecer');   /* v266: conversa de 15 min não tem repasse */
  }

  /* busca por nome, CRP ou OPP (sem acento, sem diferença de maiúscula; no CRP/OPP vale só os números) */
  const norm = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const digitos = t => String(t || '').replace(/\D/g, '');
  function casa(psiId, busca) {
    const q = norm(busca); if (!q) return true;
    const p = PSIS[psiId] || {};
    if (norm(p.nome).includes(q)) return true;
    const d = digitos(q);
    return d.length >= 2 && [p.crp, p.opp].some(c => digitos(c).includes(d));
  }
  const registro = p => [p.crp ? 'CRP ' + p.crp : '', p.opp ? 'OPP ' + p.opp : ''].filter(Boolean).join(' · ');

  /* copiar a chave Pix (com plano B para navegador sem permissão) */
  async function copiar(texto, botao) {
    try { await navigator.clipboard.writeText(texto); }
    catch (e) { const t = document.createElement('textarea'); t.value = texto; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (e2) { /* nada */ } t.remove(); }
    const antes = botao.innerHTML; botao.innerHTML = '✓ Copiado'; botao.classList.add('copiado');
    setTimeout(() => { botao.innerHTML = antes; botao.classList.remove('copiado'); }, 1600);
    U.toast('Chave Pix copiada.');
  }

  /* =====================================================================
     A PAGAR
     ===================================================================== */
  const PSI_POR_PAGINA = 5, SESSOES_VISIVEIS = 5;
  let pagAPagar = 1;
  const abertos = new Set();   // psicólogos com "ver todas as sessões" aberto
  function desenharAPagar() {
    const busca = $('#fin-busca').value, ordem = $('#fin-ordem').value;
    const todos = AGS.filter(a => !a.repasse);
    const pend = todos.filter(a => casa(a.psiId, busca)).sort((a, b) => ms(a) - ms(b));
    $('[data-cont="apagar"]').textContent = todos.length || '';
    const total = pend.reduce((s, a) => s + repasseDe(a), 0);
    const mesAtual = U.mesAtual();
    const pagoMes = AGS.filter(a => a.repasse && U.dataISO(new Date(a.repasse.pagoEm)).startsWith(mesAtual)).reduce((s, a) => s + (a.repasse.valor || 0), 0);
    const nPsi = new Set(pend.map(a => a.psiId)).size;
    $('#fin-numeros').innerHTML = `
      <div class="numero"><span>Psicólogos a pagar</span><strong>${nPsi}</strong></div>
      <div class="numero"><span>Sessões a pagar</span><strong>${pend.length}</strong></div>
      <div class="numero destaque"><span>Total a pagar</span><strong>${U.moeda(total)}</strong></div>
      <div class="numero"><span>Pago neste mês</span><strong>${U.moeda(pagoMes)}</strong></div>`;
    $('.fin-filtros').hidden = !todos.length;
    const box = $('#fin-apagar'), nav = $('#fin-apag');
    if (!todos.length) { nav.innerHTML = ''; box.innerHTML = '<div class="vazio"><strong>Nenhum repasse pendente.</strong>Quando um atendimento for marcado como Realizado (ou Faltou), o repasse do psicólogo aparece aqui.</div>'; return; }
    if (!pend.length) { nav.innerHTML = ''; box.innerHTML = `<div class="vazio"><strong>Nenhum psicólogo encontrado.</strong>Ninguém com repasse a pagar combina com "${esc(busca)}". Confira o nome ou o número do CRP/OPP.</div>`; return; }
    const porPsi = {}; pend.forEach(a => { (porPsi[a.psiId] = porPsi[a.psiId] || []).push(a); });
    const soma = id => porPsi[id].reduce((s, a) => s + repasseDe(a), 0);
    const nome = id => PSIS[id]?.nome || '';
    const ids = Object.keys(porPsi).sort(
      ordem === 'nome' ? (a, b) => nome(a).localeCompare(nome(b), 'pt-BR')
      : ordem === 'valor' ? (a, b) => soma(b) - soma(a) || nome(a).localeCompare(nome(b), 'pt-BR')
      : (a, b) => ms(porPsi[a][0]) - ms(porPsi[b][0]));
    const r = Paginacao.fatiar(ids, pagAPagar, PSI_POR_PAGINA); pagAPagar = r.pag;
    box.innerHTML = r.itens.map(id => {
      const psi = PSIS[id] || { nome: '—' }, l = porPsi[id], tot = soma(id);
      const aberto = abertos.has(id), mostrar = aberto ? l : l.slice(0, SESSOES_VISIVEIS), resto = l.length - SESSOES_VISIVEIS;
      const reg = registro(psi), desde = U.fmtCurta(l[0].data);
      return `<article class="fin-psi">
        <header class="fin-psi-topo">
          <div class="fin-psi-quem"><h2>${esc(psi.nome)}</h2><span class="muted">${reg ? esc(reg) + ' · ' : ''}${l.length} ${l.length > 1 ? 'sessões' : 'sessão'}${l.length > 1 ? ' desde ' + esc(desde) : ''} · comissão ${Number(psi.comissao) || 0}%</span></div>
          <div class="fin-pix">
            ${psi.pix && !PAGA ? '<span class="fin-pix-rot">Pix cadastrado</span><span class="fin-sem-pix fin-so-ver">Só administrador ou quem dá baixa vê a chave.</span>'
              : psi.pix
              ? `<span class="fin-pix-rot">Pix · ${esc(U.pixNomeTipo(psi.pixTipo || U.pixAdivinhar(psi.pix)))}</span><code class="fin-pix-chave">${esc(U.pixFormatar(psi.pixTipo || U.pixAdivinhar(psi.pix), psi.pix))}</code><button type="button" class="btn btn-primario btn-peq" data-copiar-pix="${esc(psi.pix)}">${ICO_COPIAR} Copiar Pix</button>`
              : `<span class="fin-sem-pix">Sem chave Pix: peça para ${esc(U.primeiroNome(psi.nome))} cadastrar em <b>Minha conta</b>.</span>`}
          </div>
          <div class="fin-psi-total"><span>Total</span><strong>${U.moeda(tot)}</strong>${l.length > 1 && PAGA ? `<button type="button" class="btn btn-ok btn-peq" data-pagar-todos="${esc(id)}">Paguei tudo (${l.length} sessões)</button><small class="fin-dica">1 Pix só com o total</small>` : ''}</div>
        </header>
        <div class="tabela-rolagem"><table class="tabela fin-tab">
          <thead><tr><th>Sessão</th><th>Paciente</th><th>Situação</th><th class="num">Valor</th><th class="num">Repasse</th><th></th></tr></thead>
          <tbody>${mostrar.map(a => `<tr>
            <td><b>${esc(U.fmtCurta(a.data))}</b><small>${esc(U.intervalo(a.hora, a.duracao))}</small></td>
            <td>${esc(a.paciente.nome)}<small>${a.tipo === 'mensal' ? `Plano mensal ${a.sessao}/${a.totalSessoes}` : 'Avulsa'}</small></td>
            <td>${U.badge(a.status)}</td>
            <td class="num">${U.moeda(a.valor)}</td>
            <td class="num"><strong>${U.moeda(repasseDe(a))}</strong></td>
            <td class="num">${PAGA ? `<button type="button" class="btn btn-secundario btn-peq" data-pagar="${esc(a.id)}">Paguei só esta</button>` : ''}</td>
          </tr>`).join('')}</tbody>
        </table></div>
        ${resto > 0 ? `<button type="button" class="fin-mais" data-ver-todas="${esc(id)}">${aberto ? 'Mostrar menos' : `Ver as outras ${resto} ${resto > 1 ? 'sessões' : 'sessão'}`}</button>` : ''}
      </article>`;
    }).join('');
    nav.innerHTML = Paginacao.html(r, ['psicólogo', 'psicólogos']);
  }
  Paginacao.ligar($('#fin-apag'), n => { pagAPagar = n; desenharAPagar(); }, $('#fin-apagar'));

  /* =====================================================================
     PAGOS
     ===================================================================== */
  let pagPagos = 1;
  function desenharPagos() {
    const mes = $('#fin-pmes').value, busca = $('#fin-pbusca').value;
    const l = AGS.filter(a => a.repasse && (!mes || U.dataISO(new Date(a.repasse.pagoEm)).startsWith(mes)) && casa(a.psiId, busca))
      .sort((a, b) => b.repasse.pagoEm - a.repasse.pagoEm);
    const tab = $('#fin-pagos');
    if (!l.length) { tab.innerHTML = `<tbody><tr><td class="muted" style="text-align:center;padding:32px">Nenhum repasse pago${mes ? ' em ' + esc(U.fmtMes(mes)) : ''}${busca ? ' para "' + esc(busca) + '"' : ''}.</td></tr></tbody>`; $('#fin-pag').innerHTML = ''; return; }
    const r = Paginacao.fatiar(l, pagPagos, 20); pagPagos = r.pag;
    const total = l.reduce((s, a) => s + (a.repasse.valor || 0), 0);
    tab.innerHTML = `<thead><tr><th>Pago em</th><th>Psicólogo</th><th>Sessão</th><th>Paciente</th><th class="num">Repasse</th><th></th></tr></thead>
      <tbody>${r.itens.map(a => `<tr>
        <td><b>${esc(U.fmtDataHoraCompleta(a.repasse.pagoEm))}</b><small>por ${esc(a.repasse.por || '—')}</small></td>
        <td>${esc(PSIS[a.psiId]?.nome || '—')}${PSIS[a.psiId]?.crp ? `<small>CRP ${esc(PSIS[a.psiId].crp)}</small>` : ''}${a.repasse.pix ? `<small>Pix: ${esc(a.repasse.pix)}</small>` : ''}</td>
        <td>${esc(U.fmtCurta(a.data))}<small>${esc(U.intervalo(a.hora, a.duracao))}</small></td>
        <td>${esc(a.paciente.nome)}</td>
        <td class="num"><strong>${U.moeda(a.repasse.valor || 0)}</strong></td>
        <td class="num">${PAGA ? `<button type="button" class="btn-link" data-desfazer="${esc(a.id)}">Desfazer</button>` : ''}</td>
      </tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="4">Total${mes ? ' em ' + esc(U.fmtMes(mes)) : ''}</td><td class="num">${U.moeda(total)}</td><td></td></tr></tfoot>`;
    $('#fin-pag').innerHTML = Paginacao.html(r, ['repasse', 'repasses']);
  }
  Paginacao.ligar($('#fin-pag'), n => { pagPagos = n; desenharPagos(); }, $('#fin-pagos'));

  /* =====================================================================
     RESUMO DO MÊS (o antigo "Repasses" da Agenda, agora com o que já foi pago)
     ===================================================================== */
  let ultimo = [];
  async function desenharResumo() {
    const fMes = $('#f-mes');
    if (!fMes.value) fMes.value = U.mesAtual();
    const linhas = await DB.relatorioMes(fMes.value);
    linhas.forEach(r => {
      const doMes = AGS.filter(a => a.psiId === r.psiId && a.data.startsWith(fMes.value));
      r.pago = doMes.filter(a => a.repasse).reduce((s, a) => s + (a.repasse.valor || 0), 0);
      r.aPagar = doMes.filter(a => !a.repasse).reduce((s, a) => s + repasseDe(a), 0);
    });
    ultimo = linhas;
    const soma = k => linhas.reduce((s, r) => s + (r[k] || 0), 0);
    $('#numeros-repasse').innerHTML = `
      <div class="numero"><span>Sessões feitas</span><strong>${soma('realizadas') + soma('faltas')}</strong></div>
      <div class="numero"><span>Faturado</span><strong>${U.moeda(soma('faturado'))}</strong></div>
      <div class="numero"><span>Fica com a plataforma</span><strong>${U.moeda(soma('comissao'))}</strong></div>
      <div class="numero"><span>Repasse: pago</span><strong>${U.moeda(soma('pago'))}</strong></div>
      <div class="numero destaque"><span>Repasse: a pagar</span><strong>${U.moeda(soma('aPagar'))}</strong></div>`;
    const tab = $('#tabela-repasse');
    if (!linhas.length) { tab.innerHTML = `<tbody><tr><td class="muted" style="text-align:center;padding:32px">Nenhum atendimento em ${esc(U.fmtMes(fMes.value))}.</td></tr></tbody>`; return; }
    tab.innerHTML = `
      <thead><tr><th>Psicólogo</th><th class="num">Realizadas</th><th class="num">Faltas</th><th class="num">Faturado</th><th class="num">Comissão</th><th class="num">Repasse</th><th class="num">Pago</th><th class="num">A pagar</th></tr></thead>
      <tbody>${linhas.map(r => `<tr>
        <td>${esc(r.nome)}</td><td class="num">${r.realizadas}</td><td class="num">${r.faltas}</td>
        <td class="num">${U.moeda(r.faturado)}</td><td class="num">${U.moeda(r.comissao)} <span class="muted">(${r.comissaoPct}%)</span></td>
        <td class="num"><strong>${U.moeda(r.repasse)}</strong></td><td class="num">${U.moeda(r.pago)}</td>
        <td class="num">${r.aPagar ? `<strong class="fin-apagar-v">${U.moeda(r.aPagar)}</strong>` : '—'}</td>
      </tr>`).join('')}</tbody>
      <tfoot><tr><td>Total</td><td class="num">${soma('realizadas')}</td><td class="num">${soma('faltas')}</td><td class="num">${U.moeda(soma('faturado'))}</td><td class="num">${U.moeda(soma('comissao'))}</td><td class="num">${U.moeda(soma('repasse'))}</td><td class="num">${U.moeda(soma('pago'))}</td><td class="num">${U.moeda(soma('aPagar'))}</td></tr></tfoot>`;
  }
  $('#exportar-csv').onclick = () => {
    const n = v => String((v || 0).toFixed(2)).replace('.', ',');
    const linhas = [['Psicólogo', 'Realizadas', 'Faltas', 'Faturado', 'Comissão %', 'Comissão', 'Repasse', 'Pago', 'A pagar']]
      .concat(ultimo.map(r => [r.nome, r.realizadas, r.faltas, n(r.faturado), r.comissaoPct, n(r.comissao), n(r.repasse), n(r.pago), n(r.aPagar)]));
    const csv = '﻿' + linhas.map(l => l.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `repasses-${$('#f-mes').value}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
  };

  /* ---------- ações ---------- */
  document.addEventListener('click', async e => {
    const cp = e.target.closest('[data-copiar-pix]'); if (cp) { copiar(cp.dataset.copiarPix, cp); return; }
    const vt = e.target.closest('[data-ver-todas]');
    if (vt) { const id = vt.dataset.verTodas; abertos.has(id) ? abertos.delete(id) : abertos.add(id); desenharAPagar(); return; }
    const pg = e.target.closest('[data-pagar]');
    const pt = e.target.closest('[data-pagar-todos]');
    const dz = e.target.closest('[data-desfazer]');
    try {
      if (pg) {
        const a = AGS.find(x => x.id === pg.dataset.pagar);
        const ok = await U.confirmar('Marcar repasse como pago?', `<b>${U.moeda(repasseDe(a))}</b> para <b>${esc(PSIS[a.psiId]?.nome || '—')}</b>, pela sessão de ${esc(U.fmtCurta(a.data))} com o(a) paciente ${esc(a.paciente.nome)}.<br><br>Faça o Pix antes de confirmar.`, 'Já paguei');
        if (!ok) return;
        await DB.marcarRepasse([a.id], true, S.nome); U.toast('Repasse marcado como pago.');
      } else if (pt) {
        const l = AGS.filter(a => !a.repasse && a.psiId === pt.dataset.pagarTodos), tot = l.reduce((s, a) => s + repasseDe(a), 0);
        const ok = await U.confirmar('Marcar todas como pagas?', `<b>${l.length} sessões</b> de <b>${esc(PSIS[pt.dataset.pagarTodos]?.nome || '—')}</b>, total <b>${U.moeda(tot)}</b>.<br><br>Faça o Pix antes de confirmar.`, 'Já paguei');
        if (!ok) return;
        await DB.marcarRepasse(l.map(a => a.id), true, S.nome); U.toast('Repasses marcados como pagos.');
      } else if (dz) {
        const ok = await U.confirmar('Desfazer pagamento?', 'O repasse volta para a lista "A pagar". Use só se foi marcado por engano.', 'Desfazer', true);
        if (!ok) return;
        await DB.marcarRepasse([dz.dataset.desfazer], false, S.nome); U.toast('Repasse voltou para "A pagar".');
      } else return;
      await tudo();
    } catch (err) { U.toast(err.message || 'Algo deu errado.', 'erro'); }
  });
  $('#fin-busca').addEventListener('input', () => { pagAPagar = 1; desenharAPagar(); });
  $('#fin-ordem').addEventListener('change', () => { pagAPagar = 1; desenharAPagar(); });
  $('#fin-pmes').addEventListener('change', () => { pagPagos = 1; desenharPagos(); });
  $('#fin-pbusca').addEventListener('input', () => { pagPagos = 1; desenharPagos(); });
  $('#f-mes').addEventListener('change', desenharResumo);

  async function tudo() { await carregar(); desenharAPagar(); desenharPagos(); await desenharResumo(); }
  $('#fin-pmes').value = U.mesAtual();
  await tudo();
  DB.aoMudar(tudo);
})();
