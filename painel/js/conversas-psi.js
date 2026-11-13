/* =====================================================================
   MINHA AGENDA → "Conversas 15 min" (v267)
   O psicólogo liga "Aceito fazer conversas de 15 min" e marca, no calendário,
   os horários de 15 em 15 minutos em que aceita a conversa do
   "Conheça o psicólogo em 15 minutos". A equipe só oferece esses horários.
   - Horário com sessão paga (ou conversa já marcada) por cima: bloqueado.
   - Mudanças ficam num rascunho até "Salvar horários".
   Admin/suporte também abrem esta aba vindo de Psicólogos (?psi=ID).
   ===================================================================== */
(async function () {
  const { $, $$, esc } = U;
  const sec = $('[data-painel="conversas"]');
  if (!sec || !window.DB || !DB.obterConversas15) return;
  const sess = Auth.sessao();
  if (!sess) return;
  const psiPedido = new URLSearchParams(location.search).get('psi');
  const VISAO_EQUIPE = !!(['admin', 'suporte'].includes(sess.papel) && psiPedido);
  if (!VISAO_EQUIPE && sess.papel !== 'psicologo') return;
  const PSI_ID = VISAO_EQUIPE ? psiPedido : sess.id;
  const C = window.AGENDA_CONFIG;
  const DUR = C.duracaoConhecer || 15;
  const TOQUE = matchMedia('(hover: none) and (pointer: coarse)').matches;
  const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0];
  const HORAS = Array.from({ length: 15 }, (_, i) => U.pad(7 + i));        /* 7h às 21h */
  const QUARTOS = ['00', '15', '30', '45'];
  const minutos = h => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));

  let conv = { ativo: false, datas: {} }, rasc = {}, ags = [], fuso = U.FUSO_BR;
  const sel = new Set();
  let mes = U.mesAtual();
  const hoje = () => U.hojeISO(fuso);
  const limite = () => U.addDias(hoje(), C.diasVisiveis);
  const listaDe = d => (d in rasc ? rasc[d] : conv.datas[d]) || [];

  async function carregar() {
    try { const p = await DB.obterPsicologo(PSI_ID); if (p && p.fuso) fuso = p.fuso; } catch (e) { /* Brasília */ }
    conv = await DB.obterConversas15(PSI_ID);
    conv.datas = conv.datas || {};
    const l = await DB.listarAgendamentos({ psiId: PSI_ID, de: hoje() });
    ags = l.filter(a => a.psiId === PSI_ID && ['pendente', 'confirmado', 'realizado', 'falta'].includes(a.status));
  }

  /* o que está em cima deste horário: sessão paga ou conversa já marcada */
  function ocupacao(data, h) {
    const ini = minutos(h);
    const a = ags.find(x => x.data === data && ini < minutos(x.hora) + (x.duracao || C.duracaoSessao) && ini + DUR > minutos(x.hora));
    if (!a) return null;
    return a.tipo === 'conhecer' ? { tipo: 'conversa', a } : { tipo: 'sessao', a };
  }
  const passou = (data, h) => U.dataHora(data, h, fuso).getTime() < Date.now() + 30 * 60e3;

  /* ---------------- ligar / desligar ---------------- */
  function desenharLiga() {
    $('#cv-ativo').checked = !!conv.ativo;
    $('#cv-liga').classList.toggle('on', !!conv.ativo);
    $('#cv-liga-sub').textContent = conv.ativo
      ? 'Ligado: a equipe pode marcar conversas nos horários que você abrir aqui embaixo.'
      : 'Desligado: você não aparece para a equipe nas indicações.';
    const n = Object.entries(conv.datas).filter(([d, l]) => d >= hoje() && l.length).length;
    const cont = $('[data-cont="cv"]'); if (cont) cont.textContent = '';
    sec.classList.toggle('cv-desligado', !conv.ativo);
    if (!conv.ativo && n) $('#cv-liga-sub').textContent += ` Seus horários continuam guardados (${n} dia${n > 1 ? 's' : ''}).`;
  }
  $('#cv-ativo').addEventListener('change', async e => {
    const ativo = e.target.checked;
    $('#cv-liga').setAttribute('aria-busy', 'true');
    try {
      conv = await DB.salvarConversas15(PSI_ID, { ativo });
      U.toast(ativo ? 'Pronto! A equipe já pode marcar conversas com você.' : 'Conversas de 15 min desligadas.', 'ok');
    } catch (err) { e.target.checked = !ativo; U.toast(err.message || 'Não consegui salvar.', 'erro'); }
    finally { $('#cv-liga').removeAttribute('aria-busy'); desenharLiga(); }
  });

  /* ---------------- calendário ---------------- */
  function diasDoMes(m) {
    const [y, mm] = m.split('-').map(Number);
    return Array.from({ length: new Date(y, mm, 0).getDate() }, (_, i) => `${m}-${U.pad(i + 1)}`);
  }
  const podeEditar = d => d >= hoje() && d <= limite();
  function desenharCal() {
    $('#cv-mes-nome').textContent = U.fmtMes(mes).replace(/^./, c => c.toUpperCase());
    $('#cv-mes-ant').disabled = mes <= U.mesAtual();
    $('#cv-mes-prox').disabled = U.addMes(mes, 1) > limite().slice(0, 7);
    const dias = diasDoMes(mes);
    const vazios = (U.diaSemana(dias[0]) + 6) % 7;
    let html = ORDEM_DIAS.map(d => `<button type="button" class="cal-sem" data-semana="${d}" title="Escolher todas as ${U.DIAS_PLURAL[d]} deste mês">${U.DIAS[d]}</button>`).join('');
    html += '<span></span>'.repeat(vazios);
    html += dias.map(data => {
      const n = listaDe(data).length, marc = ags.filter(a => a.data === data && a.tipo === 'conhecer' && a.status === 'confirmado').length;
      const ed = podeEditar(data);
      const cls = ['cal-dia', n ? 'tem-cv' : '', sel.has(data) ? 'sel' : '', data === hoje() ? 'hoje' : '', data in rasc ? 'mudou' : ''].filter(Boolean).join(' ');
      return `<button type="button" class="${cls}" data-data="${data}" ${ed ? '' : 'disabled'} aria-pressed="${sel.has(data)}" aria-label="${esc(U.fmtLonga(data))}: ${n ? n + ' horários de conversa' : 'sem horários de conversa'}">
        <strong>${Number(data.slice(8))}</strong><small>${n ? `${n} conv.` : ed ? '—' : ''}</small>${marc ? `<i class="cal-ponto cv-ponto" title="${marc} conversa(s) marcada(s)"></i>` : ''}</button>`;
    }).join('');
    $('#cv-cal').innerHTML = html;
    desenharHoras();
  }

  /* ---------------- horários (15 em 15 min) ---------------- */
  function desenharHoras() {
    const box = $('#cv-horas');
    const dias = [...sel].sort();
    if (!dias.length) {
      box.innerHTML = `<div class="cal-vazio"><strong>Nenhum dia escolhido</strong>${TOQUE ? 'Toque' : 'Clique'} em um ou mais dias no calendário para marcar os horários de conversa.</div>`;
      return;
    }
    const titulo = dias.length === 1 ? U.fmtLonga(dias[0]).replace(/^./, c => c.toUpperCase()) : `${dias.length} dias escolhidos`;
    const um = dias.length === 1 ? dias[0] : null;
    const todos = h => dias.every(d => listaDe(d).includes(h));
    const algum = h => dias.some(d => listaDe(d).includes(h));
    const qtd = um ? listaDe(um).length : 0;
    box.innerHTML = `
      <div class="cal-horas-topo">
        <div><h3>${esc(titulo)}</h3><p class="muted">${um ? `${qtd ? `${qtd} horário${qtd > 1 ? 's' : ''} de conversa` : 'Sem horários de conversa'} · cada conversa dura ${DUR} min` : esc(dias.map(U.fmtDDMM).join(', '))}</p></div>
        <span class="cv-topo-bts"><button type="button" class="btn-link" data-cv-limpar>Limpar ${dias.length > 1 ? 'estes dias' : 'o dia'}</button><button type="button" class="btn-link" data-cv-dessel>Desmarcar dias</button></span>
      </div>
      <p class="cv-dica">${TOQUE ? 'Toque' : 'Clique'} nos horários em que você aceita uma conversa. Os que já têm sessão ficam bloqueados.</p>
      <div class="cv-linhas">${HORAS.map(H => `
        <div class="cv-linha"><b>${Number(H)}h</b>${QUARTOS.map(q => {
          const h = `${H}:${q}`;
          const oc = um ? ocupacao(um, h) : null;
          const velho = um ? passou(um, h) : dias.every(d => passou(d, h));
          if (oc && oc.tipo === 'sessao') return `<span class="cv-h ses" title="Sessão marcada neste horário">Sessão</span>`;
          if (oc) return `<span class="cv-h marc" title="Conversa marcada com ${esc(oc.a.paciente.nome)}">Marcada<small>${esc(U.primeiroNome(oc.a.paciente.nome))}</small></span>`;
          const est = todos(h) ? 'on' : algum(h) ? 'meio' : '';
          return `<button type="button" class="cv-h ${est}" data-h="${h}" aria-pressed="${est === 'on'}" ${velho ? 'disabled' : ''}>${h}</button>`;
        }).join('')}</div>`).join('')}
      </div>
      <div class="legenda">
        <span><i class="l-cv-on"></i>Aceita conversa</span>
        ${dias.length > 1 ? '<span><i class="l-meio"></i>Só em alguns dos dias</span>' : ''}
        ${um ? '<span><i class="l-ses"></i>Sessão marcada</span><span><i class="l-marc"></i>Conversa marcada</span>' : ''}
      </div>`;
  }

  function mudar(fn) {
    [...sel].forEach(d => {
      const s = new Set(listaDe(d));
      fn(s, d);
      /* não mexe em horário que já tem conversa marcada nem em sessão */
      ags.filter(a => a.data === d && a.tipo === 'conhecer' && a.status === 'confirmado').forEach(a => s.add(a.hora));
      rasc[d] = [...s].filter(h => !ocupacao(d, h) || ocupacao(d, h).tipo === 'conversa').sort();
    });
    barra();
    desenharCal();
  }
  function barra() {
    const n = Object.keys(rasc).length;
    $('#cv-barra').hidden = !n;
    $('#cv-barra-qtd').textContent = n ? `${n} dia${n > 1 ? 's' : ''} com horários de conversa alterados, ainda não salvo${n > 1 ? 's' : ''}` : '';
  }

  $('#cv-cal').addEventListener('click', e => {
    const dia = e.target.closest('[data-data]');
    if (dia && !dia.disabled) {
      const d = dia.dataset.data, eraVazio = !sel.size;
      sel.has(d) ? sel.delete(d) : sel.add(d);
      desenharCal();
      if (eraVazio && sel.size && innerWidth < 760) $('#cv-horas').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const sem = e.target.closest('[data-semana]');
    if (sem) {
      const alvo = diasDoMes(mes).filter(d => U.diaSemana(d) === Number(sem.dataset.semana) && podeEditar(d));
      const tudo = alvo.length && alvo.every(d => sel.has(d));
      alvo.forEach(d => (tudo ? sel.delete(d) : sel.add(d)));
      desenharCal();
    }
  });
  $('#cv-horas').addEventListener('click', e => {
    if (e.target.closest('[data-cv-dessel]')) { sel.clear(); desenharCal(); return; }
    if (e.target.closest('[data-cv-limpar]')) { mudar(s => s.clear()); return; }
    const b = e.target.closest('[data-h]');
    if (!b || b.disabled) return;
    const h = b.dataset.h, ligar = !b.classList.contains('on');
    mudar((s, d) => { if (ligar) { if (!passou(d, h)) s.add(h); } else s.delete(h); });
  });
  $('#cv-mes-ant').onclick = () => { mes = U.addMes(mes, -1); desenharCal(); };
  $('#cv-mes-prox').onclick = () => { mes = U.addMes(mes, 1); desenharCal(); };

  $('#cv-salvar').addEventListener('click', async () => {
    const b = $('#cv-salvar'); b.disabled = true; b.textContent = 'Salvando…';
    try {
      const mud = { ...rasc };
      if ($('#cv-repetir').checked) {
        /* copia cada dia mudado para o mesmo dia da semana nas 4 semanas seguintes */
        Object.entries(rasc).forEach(([d, l]) => {
          for (let k = 1; k <= 4; k++) {
            const nd = U.addDias(d, 7 * k);
            if (nd > limite() || nd in rasc) continue;
            const marcadas = ags.filter(a => a.data === nd && a.tipo === 'conhecer' && a.status === 'confirmado').map(a => a.hora);
            mud[nd] = [...new Set([...l, ...marcadas])].filter(h => !ocupacao(nd, h) || ocupacao(nd, h).tipo === 'conversa').sort();
          }
        });
      }
      conv = await DB.salvarConversas15(PSI_ID, { mudancas: mud });
      rasc = {}; $('#cv-repetir').checked = false; barra();
      await carregar(); desenharLiga(); desenharCal();
      U.toast(conv.ativo ? 'Horários de conversa salvos.' : 'Horários salvos. Ligue “Aceito fazer conversas” para a equipe ver.', 'ok');
    } catch (err) { U.toast(err.message || 'Não consegui salvar. Tente de novo.', 'erro'); }
    finally { b.disabled = false; b.textContent = 'Salvar horários'; }
  });
  $('#cv-descartar').addEventListener('click', () => { rasc = {}; barra(); desenharCal(); });

  /* ---------------- próximas conversas ---------------- */
  function desenharProx() {
    const l = ags.filter(a => a.tipo === 'conhecer' && a.status === 'confirmado').sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
    const cont = $('[data-cont="cv"]'); if (cont) cont.textContent = l.length || '';
    $('#cv-prox').innerHTML = !l.length
      ? '<p class="muted">Nenhuma conversa marcada ainda. Quando a equipe marcar, ela aparece aqui e em Atendimentos.</p>'
      : l.map(a => {
        const r = a.resumo || {};
        return `<div class="cv-it">
          <div class="cv-it-q"><b>${esc(U.fmtCurta(a.data))}</b><small>${esc(U.intervalo(a.hora, a.duracao || DUR))}</small></div>
          <div class="cv-it-p"><b>${esc(a.paciente.nome)}</b><small>${esc([(r.motivos || []).join(', '), r.horario ? 'prefere ' + r.horario.toLowerCase() : ''].filter(Boolean).join(' · '))}</small>
            ${(r.objetivos || []).length || (r.preferencias || []).length || r.sobre ? `<details><summary>Ver resumo</summary>
              ${r.tipoSessao ? `<p><b>Para:</b> ${esc(r.tipoSessao)}</p>` : ''}${(r.objetivos || []).length ? `<p><b>Objetivos:</b> ${esc(r.objetivos.join(', '))}</p>` : ''}${(r.preferencias || []).length ? `<p><b>Prefere:</b> ${esc(r.preferencias.join(', '))}</p>` : ''}${r.sobre ? `<p class="cv-sobre">${esc(r.sobre)}</p>` : ''}</details>` : ''}</div>
          ${a.linkMeet ? `<a class="btn btn-secundario btn-peq" href="${esc(a.linkMeet)}" target="_blank" rel="noopener">Entrar na sala</a>` : ''}
        </div>`;
      }).join('');
  }

  /* não perder o rascunho */
  window.addEventListener('beforeunload', e => { if (Object.keys(rasc).length) { e.preventDefault(); e.returnValue = ''; } });

  try {
    await carregar();
    desenharLiga(); desenharCal(); desenharProx();
  } catch (err) {
    $('#cv-horas').innerHTML = `<div class="cal-vazio"><strong>Não consegui carregar.</strong>${esc(err.message || 'Tente de novo em instantes.')}</div>`;
  }
})();
