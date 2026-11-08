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
  function ativar(aba) {
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
  const rotuloPlano = g => g[0].tipo === 'mensal' ? `Plano mensal (${g.length} sessões)` : 'Sessão avulsa';
  const listaSessoesHTML = g => `<ul class="sessoes">${g.map(a => `<li>${U.fmtCurta(a.data)} · ${U.intervalo(a.hora, a.duracao)}${a.status !== g[0].status ? ' ' + U.badge(a.status) : ''}${(n => n ? `<small class="nota-fuso">🌍 ${esc(n)}</small>` : '')(U.notaFuso(a, true))}</li>`).join('')}</ul>`;

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
      return `
      <article class="card card-pend">
        <div class="card-topo">
          <span class="codigo">#${esc(a.codigo)}</span>
          ${U.badge('pendente')}
          <span class="direita ${resta < 30 * 60e3 ? 'expira-alerta' : ''}" title="O prazo conta só no horário da equipe (${esc(U.textoHorarioEquipe())})">${resta <= 0 ? 'venceu' : resta < 60 * 60e3 ? `vence em ${U.tempoRestante(resta)}` : `vence ${U.fmtQuando(a.expiraEm)}`}</span>
        </div>
        <h3>${esc(a.paciente.nome)}</h3>
        <div class="contato">${esc(U.fmtTelefone(a.paciente.whatsapp))} · ${esc(a.paciente.email)}</div>
        ${seloFora(a)}
        <dl class="info">
          <dt>Psicólogo</dt><dd>${esc(nomePsi(a.psiId))}</dd>
          <dt>Plano</dt><dd>${rotuloPlano(g)}</dd>
          <dt>Valor</dt><dd>${U.moeda(totalGrupo(g))}</dd>
          <dt>${g.length > 1 ? 'Sessões' : 'Sessão'}</dt><dd>${listaSessoesHTML(g)}</dd>
        </dl>
        <div class="acoes acoes-pre">
          <button class="btn btn-ok" data-acao="confirmar" data-grupo="${a.grupo}">Confirmar pagamento</button>
          <a class="btn btn-secundario btn-wa-ico" target="_blank" rel="noopener" title="Abrir conversa no WhatsApp" aria-label="Abrir conversa no WhatsApp com ${esc(a.paciente.nome)}" href="${U.linkWhats(a.paciente.whatsapp, Servicos.textos.whatsRecebemos(g, PSIS[a.psiId] || { nome: nomePsi(a.psiId) }))}"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11.5a8 8 0 0 1-11.9 7L4 20l1.5-4A8 8 0 1 1 20 11.5z"/></svg></a>
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
          <a class="btn btn-whats" target="_blank" rel="noopener" href="${U.linkWhats(ags[0].paciente.whatsapp, t.whatsPaciente(ags, psi))}">WhatsApp do paciente</a>
          <a class="btn btn-whats btn-whats-psi" target="_blank" rel="noopener" href="${U.linkWhats(psi.whatsapp, t.whatsPsicologo(ags, psi))}">WhatsApp do psicólogo</a>
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
          <a class="btn btn-whats" target="_blank" rel="noopener" href="${U.linkWhats(a.paciente.whatsapp, t.whatsRemarcacao(a, psi, false))}">WhatsApp do paciente</a>
          <a class="btn btn-whats btn-whats-psi" target="_blank" rel="noopener" href="${U.linkWhats(psi.whatsapp, t.whatsRemarcacao(a, psi, true))}">WhatsApp do psicólogo</a>
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
  const ICO_ZAP = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Z"/></svg>';
  let LEM = { proximas: [], fins: [], pendentes: 0 };
  async function renderLembretes() {
    const hoje = U.hojeISO();
    const ags = await DB.listarAgendamentos({ status: ['confirmado'], de: hoje, ate: U.addDias(hoje, 3) });
    LEM = U.lembretes(ags);
    const cont = $('[data-cont="lem"]'); if (cont) cont.textContent = LEM.pendentes || '';
    const box = $('#lista-lembretes'); if (!box) return;
    const t = Date.now(), T = Servicos.textos;
    const hora = ms => { const m = Math.round((ms - t) / 60000); return m < 60 ? `em ${m} min` : `em ${Math.floor(m / 60)}h${m % 60 ? U.pad(m % 60) : ''}`; };
    const tagPlano = a => a.tipo === 'mensal' ? `<span class="tag-plano mensal" title="Plano mensal: sessão ${a.sessao} de ${a.totalSessoes}">Mensal · ${a.sessao}/${a.totalSessoes}</span>` : '<span class="tag-plano">Avulsa</span>';
    const quando = a => { const ms = U.dataHora(a.data, a.hora, a.fuso).getTime(); return `<div class="lem-quando">${esc(U.fmtQuando(ms))}<small>${esc(U.fmtLonga(a.data))} · ${esc(U.intervalo(a.hora, a.duracao))}</small>${(n => n ? `<small class="nota-fuso">🌍 ${esc(n)}</small>` : '')(U.notaFuso(a, true))}<small class="lem-falta">Começa ${hora(ms)}</small></div>`; };
    const feitoEm = ms => `${U.fmtQuando(ms)}`;
    const botao = (a, tipo, rotulo, numero, texto) => {
      const f = (a.lembretes || {})[tipo];
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
          <span class="cm-p"><b>${esc(a.paciente.nome)}</b><small>${a.tipo === 'mensal' ? `Plano mensal · ${a.sessao}/${a.totalSessoes}` : 'Sessão avulsa'} · ${esc(U.fmtTelefone(a.paciente.whatsapp))}</small>${Auth.pode('pacientes') ? `<a href="pacientes.html#p:${encodeURIComponent(U.chavePaciente(a.paciente))}" data-ficha>Ver ficha do paciente</a>` : ''}</span>
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
          <td class="c-plano">${a.tipo === 'mensal' ? `Mensal ${a.sessao}/${a.totalSessoes}` : 'Avulsa'}</td>
          <td class="c-sit">${U.badge(a.status)}</td>
          <td class="c-viu${a.status === 'confirmado' ? '' : ' c-viu-vazio'}">${a.status === 'confirmado' ? (a.psiCiente ? '<span class="ciente-ok">✓ Ciente</span>' : '<span class="muted">Ainda não</span>') : '<span class="muted">—</span>'}</td>
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
    if (a.status === 'falta') {
      acoes.push({ texto: 'Remarcar', classe: 'btn-primario', onClick: () => { setTimeout(() => abrirRemarcar(a), 50); } });
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
            <dt>Quando</dt><dd>${U.fmtLonga(a.data)}, ${U.intervalo(a.hora, a.duracao)}${(n => n ? `<small class="nota-fuso">🌍 ${esc(n)}</small>` : '')(U.notaFuso(a, true))}</dd>
            <dt>Psicólogo</dt><dd>${esc(psi?.nome)}</dd>
            <dt>Paciente</dt><dd>${esc(a.paciente.nome)}<br><span class="muted">${esc(U.fmtTelefone(a.paciente.whatsapp))} · ${esc(a.paciente.email)}</span>${Auth.pode('pacientes') ? `<br><a href="pacientes.html#p:${encodeURIComponent(U.chavePaciente(a.paciente))}">Ver ficha do paciente →</a>` : ''}</dd>
            <dt>Plano</dt><dd>${a.tipo === 'mensal' ? `Mensal, sessão ${a.sessao} de ${a.totalSessoes}` : 'Avulsa'} · ${U.moeda(a.valor)} esta sessão</dd>
            ${a.linkMeet ? `<dt>Sala</dt><dd><a href="${esc(a.linkMeet)}" target="_blank" rel="noopener">${esc(a.linkMeet)}</a></dd>` : ''}
            ${a.aceite && a.aceite.em ? `<dt>Termos</dt><dd>Aceitou os Termos de uso em ${esc(U.fmtQuando(a.aceite.em))}${a.aceite.versao ? ` <span class="muted">(versão de ${esc(a.aceite.versao.split('-').reverse().join('/'))})</span>` : ''}</dd>` : ''}
          </dl>
        </div>
        ${a.status === 'confirmado' ? `
        <div class="acoes" style="margin-bottom:16px">
          <a class="btn btn-whats btn-peq" target="_blank" rel="noopener" href="${U.linkWhats(a.paciente.whatsapp, t.whatsPaciente([a], psi))}">Link no WhatsApp do paciente</a>
          <a class="btn btn-whats btn-whats-psi btn-peq" target="_blank" rel="noopener" href="${U.linkWhats(psi.whatsapp, t.whatsPsicologo([a], psi))}">Link no WhatsApp do psicólogo</a>
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
        <p>${esc(a.paciente.nome)} com ${esc(psi.nome)}. Era: <strong>${U.fmtCurta(a.data)}, ${U.fmtHora(a.hora)}</strong>${eraFalta ? ' ' + U.badge('falta') : ''}.${(n => n ? ` <span class="nota-fuso" style="display:inline">🌍 ${esc(n)}</span>` : '')(U.notaFuso(a, true))}</p>
        ${eraFalta ? `<p class="remarcar-nota">A sessão <b>muda de data</b> e volta para <b>Confirmado</b> (não vira uma sessão nova). A falta sai do Financeiro${a.repasse ? ' — o repasse dela <b>já foi pago</b>, então não será pago de novo' : ''}; o repasse entra quando a nova sessão for marcada como realizada.</p>` : ''}
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
     "Psicólogos" do painel (conteudo.html#psicologos). */

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
     ATUALIZAÇÃO
     ===================================================================== */
  async function render() {
    if (!U._ajustesAgenda) await U.carregarAjustesAgenda();
    await carregarPsis();
    preencherFiltroPsi();
    await renderPre();
    await renderLembretes();
    await renderCalendario();
    await renderAgenda();
    await renderCaixa();
  }

  await render();
  DB.aoMudar(render);                 // paciente marcou no site em outra aba
  setInterval(() => { renderPre(); renderLembretes(); }, 60 * 1000);  // atualiza o "vence…" e os lembretes
})();
