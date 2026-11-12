/* =====================================================================
   PACIENTES (equipe: admin e suporte)
   - A lista é montada a partir dos agendamentos: a mesma pessoa é
     reconhecida pelo WhatsApp (ou pelo e-mail, se não tiver WhatsApp).
   - Ficha: contato, psicólogos, números, plano, histórico,
     observações da equipe (só administrativo, nada clínico).
   - Endereço da ficha: pacientes.html#p:CHAVE
   ===================================================================== */
(async function () {
  const S = Auth.exigir(['pacientes']);
  if (!S) return;
  const { $, $$, esc } = U;

  $('[data-nome]').textContent = S.nome;
  $('[data-papel]').textContent = Auth.nomePapel(S);
  $('[data-sair]').onclick = () => Auth.sair();
  Auth.menuAreas($('[data-areas]'), 'pacientes');
  /* Suporte sem o acesso extra "Pacientes (completo)": só busca o paciente e chama no WhatsApp
     (sem abrir a ficha, sem observações e sem excluir). */
  const FICHA = Auth.pode('pacientesFicha');
  if (!FICHA) {
    document.body.classList.add('pc-so-busca');
    const sub = $('h1 + p') || document.querySelector('.secao-topo p');
    if (sub) sub.textContent = 'Procure pelo nome, WhatsApp ou e-mail e fale com o paciente no WhatsApp.';
  }
  const zap = (p, cls = '') => `<a class="btn btn-whats btn-peq pc-zap${cls}" target="_blank" rel="noopener" href="${U.linkWhats(p.whatsapp, `Olá, ${U.primeiroNome(p.nome)}! Aqui é da equipe Psicólogos Brasil.`)}" aria-label="WhatsApp de ${esc(p.nome)}">${ICO_ZAP}<span>WhatsApp</span></a>`;

  const POR_PAGINA = 20;
  const POR_PAGINA_QUADROS = 12;   /* em quadros: 3 linhas de 4 (no celular, 6 de 2) */
  const ICO_ZAP = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Z"/></svg>';
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const ms = a => U.dataHora(a.data, a.hora, a.fuso).getTime();
  const PAGO = ['confirmado', 'realizado', 'falta'];
  let PSIS = {}, EXTRA = {}, LISTA = [], ALIAS = {}, pag = 1, histPag = 1, histDe = null;
  const HIST_POR_PAGINA = 5;
  const NOVO_DIAS = 30;
  const PSIS_VISIVEIS = 6;      /* ficha: psicólogos à vista (os outros abrem em "+ N outros") */         /* "Paciente novo": primeira sessão paga há 30 dias ou menos */    /* histórico da ficha: 5 atendimentos por página */

  /* ---------- montar a lista de pacientes ---------- */
  async function carregar() {
    const [psis, ags, extra] = await Promise.all([DB.listarPsicologos({ todos: true }), DB.listarAgendamentos({}), FICHA ? DB.listarPacientesExtra().catch(() => ({})) : Promise.resolve({})]);
    PSIS = Object.fromEntries(psis.map(p => [p.id, p]));
    EXTRA = extra || {};
    /* A mesma pessoa = mesmo WhatsApp OU mesmo e-mail (quem trocou de número ou de e-mail
       continua na mesma ficha). Junta tudo que estiver ligado por um dos dois. */
    const pai = {}, raiz = k => { while (pai[k] !== k) { pai[k] = pai[pai[k]]; k = pai[k]; } return k; };
    const unir = (a, b) => { pai[a] ??= a; pai[b] ??= b; const ra = raiz(a), rb = raiz(b); if (ra !== rb) pai[rb] = ra; };
    const chaves = a => { const w = U.digitos(a.paciente.whatsapp), e = String(a.paciente.email || '').trim().toLowerCase(); return [w && 'w' + U.whatsNumero(a.paciente.whatsapp), e && 'e' + e].filter(Boolean); };
    ags.forEach(a => { const ks = chaves(a); ks.forEach(k => { pai[k] ??= k; }); for (let i = 1; i < ks.length; i++) unir(ks[0], ks[i]); });
    const m = new Map();
    ALIAS = {};
    ags.forEach(a => {
      const ks = chaves(a); if (!ks.length) return;
      const g = raiz(ks[0]);
      if (!m.has(g)) m.set(g, { chave: null, ags: [], chavesTodas: new Set() });
      const p = m.get(g); p.ags.push(a); ks.forEach(k => p.chavesTodas.add(k));
    });
    m.forEach(p => {
      /* chave fixa da ficha: a do primeiro agendamento (não muda quando a pessoa troca de número) */
      const prim = [...p.ags].sort((a, b) => (a.criadoEm || 0) - (b.criadoEm || 0))[0];
      p.chave = U.chavePaciente(prim.paciente);
      p.chavesTodas.add(p.chave);
      p.chavesTodas.forEach(k => { ALIAS[k] = p.chave; });
      /* observações guardadas com qualquer uma das chaves dessa pessoa */
      const partes = [...p.chavesTodas].map(k => EXTRA[k]).filter(Boolean);
      if (partes.length) {
        const obs = partes.filter(x => x.obs != null).sort((a, b) => (b.obsEm || 0) - (a.obsEm || 0))[0] || {};
        EXTRA[p.chave] = { ...EXTRA[p.chave], obs: obs.obs, obsPor: obs.obsPor, obsEm: obs.obsEm, pedidos: Object.assign({}, ...partes.map(x => x.pedidos || {})) };
      }
    });
    const t = Date.now();
    LISTA = [...m.values()].map(p => {
      p.ags.sort((a, b) => ms(b) - ms(a));                       /* mais recente primeiro */
      const ult = [...p.ags].sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0))[0];
      p.nome = ult.paciente.nome; p.email = ult.paciente.email; p.whatsapp = ult.paciente.whatsapp;
      /* outros números e e-mails que a pessoa já usou */
      p.outrosWhats = [...new Set(p.ags.map(a => U.digitos(a.paciente.whatsapp) ? '+' + U.whatsNumero(a.paciente.whatsapp) : '').filter(w => w && w !== '+' + U.whatsNumero(p.whatsapp)))];
      p.outrosEmails = [...new Set(p.ags.map(a => String(a.paciente.email || '').trim().toLowerCase()).filter(e => e && e !== String(p.email || '').trim().toLowerCase()))];
      p.psis = [...new Set(p.ags.map(a => a.psiId))];
      p.realizadas = p.ags.filter(a => a.status === 'realizado').length;
      p.faltas = p.ags.filter(a => a.status === 'falta').length;
      p.canceladas = p.ags.filter(a => ['cancelado', 'expirado'].includes(a.status)).length;
      p.pago = p.ags.filter(a => PAGO.includes(a.status)).reduce((s, a) => s + (Number(a.valor) || 0), 0);
      const futuras = p.ags.filter(a => ['confirmado', 'pendente'].includes(a.status) && ms(a) > t).sort((a, b) => ms(a) - ms(b));
      p.proxima = futuras[0] || null;
      const passadas = p.ags.filter(a => ['realizado', 'falta'].includes(a.status) || (a.status === 'confirmado' && ms(a) <= t));
      p.ultima = passadas[0] || null;
      p.primeira = passadas[passadas.length - 1] || null;
      p.plano = futuras.find(a => a.tipo === 'mensal' && a.status === 'confirmado') || null;
      /* pré-reserva vencida e nunca fez sessão (nem tem pré-reserva aberta): dá para tentar resgatar */
      p.nunca = !p.ags.some(a => ['confirmado', 'realizado', 'falta'].includes(a.status));
      p.vencida = p.nunca && !p.ags.some(a => a.status === 'pendente')
        ? [...p.ags].filter(a => a.status === 'expirado').sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0))[0] || null : null;
      /* dias sem sessão: só para quem não tem nada marcado (conta da última sessão que já passou) */
      p.diasSem = !p.proxima && p.ultima ? Math.floor((t - ms(p.ultima)) / 864e5) : null;
      /* paciente novo: a primeira sessão paga (confirmada, realizada ou falta) foi marcada há 30 dias ou menos */
      const pagas = p.ags.filter(a => ['confirmado', 'realizado', 'falta'].includes(a.status)).map(a => a.confirmadoEm || a.criadoEm || 0).filter(Boolean);
      p.chegou = pagas.length ? Math.min(...pagas) : null;
      p.diasDesde = p.chegou ? Math.floor((t - p.chegou) / 864e5) : null;
      p.novo = p.diasDesde != null && p.diasDesde <= NOVO_DIAS;
      p.atividade = Math.max(...p.ags.map(a => a.criadoEm || 0), p.proxima ? ms(p.proxima) : 0, p.ultima ? ms(p.ultima) : 0);
      return p;
    });
  }

  /* ---------- lista ---------- */
  const fQ = $('#pc-q'), fPsi = $('#pc-psi'), fSit = $('#pc-sit'), fOrdem = $('#pc-ordem');
  function preencherPsi() {
    const atual = fPsi.value;
    fPsi.innerHTML = '<option value="">Todos os psicólogos</option>' + Object.values(PSIS).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map(p => `<option value="${esc(p.id)}">${esc(p.nome)}</option>`).join('');
    fPsi.value = PSIS[atual] ? atual : '';
  }
  const iniciais = n => String(n || '?').split(/\s+/).filter(w => w.length > 2).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
  /* selo de quem sumiu: amarelo com mais de 30 dias sem sessão, vermelho com mais de 60 */
  const seloParado = p => p.vencida ? `<span class="pc-parado pv" title="Escolheu um horário, não pagou e nunca fez sessão">Pré-reserva vencida</span>` : p.diasSem > 30 ? `<span class="pc-parado ${p.diasSem > 60 ? 'p60' : 'p30'}" title="Sem sessão marcada e a última foi há ${p.diasSem} dias">Sem sessão há ${p.diasSem} dias</span>` : '';
  const seloNovo = p => p.novo ? `<span class="pc-novo" title="Primeira sessão paga em ${esc(new Date(p.chegou).toLocaleDateString('pt-BR'))}">✦ Paciente novo · ${p.diasDesde === 0 ? 'chegou hoje' : p.diasDesde <= 7 ? 'esta semana' : `há ${p.diasDesde} dias`}</span>` : '';
  const nomesPsis = p => p.psis.map(id => PSIS[id]?.nome || '—').join(', ');

  function desenharLista() {
    const q = norm(fQ.value.trim()), qd = U.digitos(fQ.value);
    let l = LISTA.filter(p => (!q || norm(`${p.nome} ${p.email}`).includes(q) || (qd.length >= 3 && U.digitos(p.whatsapp).includes(qd)))
      && (!fPsi.value || p.psis.includes(fPsi.value))
      && (!fSit.value || (fSit.value === 'ativo' ? !!p.proxima : fSit.value === 'plano' ? !!p.plano : fSit.value === 'sem' ? !p.proxima : /^\d+$/.test(fSit.value) ? p.diasSem != null && p.diasSem > Number(fSit.value) : fSit.value === 'vencida' ? !!p.vencida : fSit.value === 'novo' ? p.novo : true)));
    const ord = { recentes: (a, b) => b.atividade - a.atividade, nome: (a, b) => a.nome.localeCompare(b.nome, 'pt-BR'), sessoes: (a, b) => (b.realizadas + b.faltas) - (a.realizadas + a.faltas) || b.atividade - a.atividade, parados: (a, b) => (b.diasSem ?? -1) - (a.diasSem ?? -1) || b.atividade - a.atividade };
    l.sort(ord[fOrdem.value] || ord.recentes);
    $('#pc-qtd').textContent = LISTA.length;
    const r = Paginacao.fatiar(l, pag, vistaPac() === 'grade' ? POR_PAGINA_QUADROS : POR_PAGINA); pag = r.pag;
    $('#pc-pag').innerHTML = Paginacao.html(r, ['paciente', 'pacientes']);
    const box = $('#pc-lista');
    if (!LISTA.length) { box.innerHTML = '<div class="vazio pc-vazio"><strong>Nenhum paciente ainda.</strong>Quando alguém agendar pelo site, a ficha aparece aqui.</div>'; return; }
    if (!l.length) { box.innerHTML = '<div class="vazio pc-vazio"><strong>Ninguém com essa busca.</strong>Confira o nome, o WhatsApp ou o e-mail, ou limpe os filtros.</div>'; return; }
    $('#pc-bloco').classList.toggle('pc-grade', vistaPac() === 'grade');
    if (vistaPac() === 'grade') {
      box.innerHTML = r.itens.map(p => `<${FICHA ? 'a' : 'div'} class="pc-q${p.vencida ? ' vencida' : p.diasSem > 60 ? ' parado60' : p.diasSem > 30 ? ' parado30' : ''}"${FICHA ? ` href="#p:${encodeURIComponent(p.chave)}"` : ''}>
        <span class="pc-ava grande" aria-hidden="true">${esc(iniciais(p.nome))}</span>
        <b class="pc-q-nome">${esc(p.nome)}</b>${seloNovo(p)}
        <small class="pc-q-zap">${esc(U.fmtTelefone(p.whatsapp))}</small>
        <small class="pc-q-mail" title="${esc(p.email)}">${esc(p.email)}</small>
        <span class="pc-num"><span><b>${p.realizadas}</b> realizada${p.realizadas === 1 ? '' : 's'}</span>${p.faltas ? `<span class="pc-falta">${p.faltas} falta${p.faltas === 1 ? '' : 's'}</span>` : ''}${p.plano ? '<span class="tag-plano mensal">Plano mensal</span>' : ''}</span>
        <span class="pc-quando">${p.proxima ? `<span class="pc-prox">Próxima: ${esc(U.fmtCurta(p.proxima.data))}, ${esc(U.fmtHora(p.proxima.hora))}</span>` : ''}${p.ultima ? `<small>Última: ${esc(U.fmtCurta(p.ultima.data))}</small>` : (!p.proxima ? '<small>Ainda sem sessão</small>' : '')}${seloParado(p)}</span>
      ${FICHA ? '' : zap(p)}</${FICHA ? 'a' : 'div'}>`).join('');
      return;
    }
    box.innerHTML = `<div class="pc-cab" aria-hidden="true"><span></span><span>Paciente</span><span>Psicólogo</span><span>Sessões</span><span>Próxima / última</span><span></span></div>` +
      r.itens.map(p => `<${FICHA ? 'a' : 'div'} class="pc-lin${p.vencida ? ' vencida' : p.diasSem > 60 ? ' parado60' : p.diasSem > 30 ? ' parado30' : ''}"${FICHA ? ` href="#p:${encodeURIComponent(p.chave)}"` : ''}>
        <span class="pc-ava" aria-hidden="true">${esc(iniciais(p.nome))}</span>
        <span class="pc-quem"><b>${esc(p.nome)}</b>${seloNovo(p)}<small>${esc(U.fmtTelefone(p.whatsapp))} · ${esc(p.email)}</small></span>
        <span class="pc-psi">${esc(nomesPsis(p))}</span>
        <span class="pc-num"><span><b>${p.realizadas}</b> realizada${p.realizadas === 1 ? '' : 's'}</span>${p.faltas ? `<span class="pc-falta">${p.faltas} falta${p.faltas === 1 ? '' : 's'}</span>` : ''}${p.plano ? '<span class="tag-plano mensal">Plano mensal</span>' : ''}</span>
        <span class="pc-quando">${p.proxima ? `<span class="pc-prox">Próxima: ${esc(U.fmtCurta(p.proxima.data))}, ${esc(U.fmtHora(p.proxima.hora))}</span>` : ''}${p.ultima ? `<small>Última: ${esc(U.fmtCurta(p.ultima.data))}</small>` : (!p.proxima ? '<small>Ainda sem sessão</small>' : '')}${seloParado(p)}</span>
        ${FICHA ? '<span class="pc-seta" aria-hidden="true">›</span>' : zap(p)}
      </${FICHA ? 'a' : 'div'}>`).join('');
  }
  /* lista ou quadros (igual a Psicólogos e Artigos); a escolha fica guardada neste navegador */
  let VISTA = 'lista';
  /* v199: no celular (até 640px) é sempre lista e o botão some */
  const VISTA_CEL = window.matchMedia('(max-width: 640px)');
  function vistaPac() { return VISTA_CEL.matches ? 'lista' : VISTA; }
  VISTA_CEL.addEventListener('change', () => desenharLista());
  try { VISTA = localStorage.getItem('pb_vista_pac') === 'grade' ? 'grade' : 'lista'; } catch (e) { /* lista */ }
  (function () {
    const g = $('#pc-vista'); if (!g) return;
    const marcar = () => g.querySelectorAll('[data-vista]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.vista === VISTA)));
    marcar();
    g.addEventListener('click', e => {
      const b = e.target.closest('[data-vista]'); if (!b || b.dataset.vista === VISTA) return;
      VISTA = b.dataset.vista; marcar();
      try { localStorage.setItem('pb_vista_pac', VISTA); } catch (err) { /* sem problema */ }
      desenharLista();
    });
  })();
  [fQ, fPsi, fSit, fOrdem].forEach(el => el.addEventListener(el === fQ ? 'input' : 'change', () => { pag = 1; desenharLista(); }));
  Paginacao.ligar($('#pc-pag'), n => { pag = n; desenharLista(); }, $('#pc-lista'));

  /* ---------- ficha ---------- */
  function desenharFicha(chave) {
    chave = ALIAS[chave] || chave;   /* link antigo (outro número ou e-mail da mesma pessoa) abre a ficha certa */
    const p = LISTA.find(x => x.chave === chave), tela = $('#pc-ficha-tela');
    if (!p) { tela.innerHTML = `<p><a class="pc-voltar" href="#">← Todos os pacientes</a></p><div class="vazio"><strong>Paciente não encontrado.</strong>Ele pode ter sido apagado nos dados de teste.</div>`; return; }
    const ex = EXTRA[chave] || {}, t = Date.now();
    if (histDe !== chave) { histDe = chave; histPag = 1; }
    const hist = Paginacao.fatiar(p.ags, histPag, HIST_POR_PAGINA); histPag = hist.pag;
    const plano = p.plano ? (() => {
      const g = p.ags.filter(a => a.grupo === p.plano.grupo).sort((a, b) => ms(a) - ms(b));
      const fim = g[g.length - 1];
      return `<div class="pc-card pc-plano"><h2>Plano mensal ativo</h2><p>Sessão <b>${p.plano.sessao} de ${p.plano.totalSessoes}</b> é a próxima, ${esc(U.fmtLonga(p.plano.data))}, ${esc(U.fmtHora(p.plano.hora))}, com ${esc(PSIS[p.plano.psiId]?.nome || '—')}.</p><p class="muted">O plano termina em ${esc(U.fmtLonga(fim.data))}.</p></div>`;
    })() : '';
    tela.innerHTML = `
      <p><a class="pc-voltar" href="#">← Todos os pacientes</a></p>
      <div class="pc-topo">
        <span class="pc-ava grande" aria-hidden="true">${esc(iniciais(p.nome))}</span>
        <div class="pc-topo-txt">
          <h1>${esc(p.nome)}</h1>
          <p class="muted">${esc(U.fmtTelefone(p.whatsapp))} · <a href="mailto:${esc(p.email)}">${esc(p.email)}</a></p>
          ${p.outrosWhats.length || p.outrosEmails.length ? `<p class="muted pc-outros">Também já usou: ${[...p.outrosWhats.map(w => esc(U.fmtTelefone(w))), ...p.outrosEmails.map(e => esc(e))].join(' · ')}</p>` : ''}
          <div class="pc-tags">${seloNovo(p)}${p.proxima ? '<span class="badge badge-ok">Com sessão marcada</span>' : (p.vencida || p.diasSem > 30) ? seloParado(p) : '<span class="badge badge-neutro">Sem sessão marcada</span>'}${p.plano ? '<span class="tag-plano mensal">Plano mensal</span>' : ''}</div>
        </div>
        <a class="btn btn-whats" target="_blank" rel="noopener" href="${U.linkWhats(p.whatsapp, `Olá, ${U.primeiroNome(p.nome)}! Aqui é da equipe Psicólogos Brasil.`)}">${ICO_ZAP} WhatsApp</a>
      </div>

      <div class="pc-numeros">
        <div><b>${p.realizadas}</b><span>Sessões realizadas</span></div>
        <div><b>${p.faltas}</b><span>Faltas</span></div>
        <div><b>${p.canceladas}</b><span>Canceladas ou vencidas</span></div>
        <div><b>${U.moeda(p.pago)}</b><span>Total pago</span></div>
        <div><b>${p.primeira ? esc(U.fmtDDMM(p.primeira.data)) : '—'}</b><span>Primeira sessão</span></div>
        <div><b>${p.proxima ? esc(U.fmtDDMM(p.proxima.data)) : '—'}</b><span>Próxima sessão</span></div>
      </div>

      ${p.vencida ? (() => { const a = p.vencida, psi = PSIS[a.psiId] || { nome: 'o psicólogo' }, feito = (ex.pedidos || {})['resgate:' + a.id]; return `<div class="pc-card pc-resgate pc-larga">
            <h2>Resgatar paciente</h2>
            <p>Escolheu <b>${esc(U.fmtCurta(a.data))}, ${esc(U.fmtHora(a.hora))}</b> com <b>${esc(psi.nome)}</b> (pedido de ${esc(U.fmtDataHoraCompleta(a.criadoEm))}), mas a pré-reserva venceu sem pagamento. Ainda não fez nenhuma sessão.</p>
            <a class="btn btn-whats" target="_blank" rel="noopener" id="pc-resgate" href="${U.linkWhats(p.whatsapp, (Servicos.textos.whatsResgate ? Servicos.textos.whatsResgate(a, psi) : `Olá, ${U.primeiroNome(p.nome)}! Aqui é da equipe Psicólogos Brasil. Vi que você tentou agendar uma sessão com ${psi.nome}. Posso te ajudar a escolher um novo horário?`))}">${ICO_ZAP} Chamar no WhatsApp para resgatar</a>
            ${feito ? `<p class="muted pc-pedido" style="margin-top:8px">Contato feito ${esc(U.fmtQuando(feito))}</p>` : ''}
          </div>`; })() : ''}
      <div class="pc-grade">
        <div class="pc-col">
          ${plano}
          <div class="pc-card pc-psis-card">
            <h2>Psicólogo${p.psis.length > 1 ? 's' : ''}</h2>
            <ul class="pc-psis">${p.psis.map(id => ({ id, n: p.ags.filter(a => a.psiId === id && ['realizado', 'falta'].includes(a.status)).length, atual: !!(p.proxima && p.proxima.psiId === id) }))
              .sort((x, y) => y.n - x.n || y.atual - x.atual || String(PSIS[x.id]?.nome || '').localeCompare(String(PSIS[y.id]?.nome || ''), 'pt-BR'))
              .map((x, i) => `<li class="${x.atual ? 'atual' : ''}${i >= PSIS_VISIVEIS ? ' pc-psi-extra' : ''}"${i >= PSIS_VISIVEIS ? ' hidden' : ''}${x.atual ? ' title="Tem a próxima sessão marcada com este psicólogo"' : ''}><b>${esc(PSIS[x.id]?.nome || '—')}</b><span class="pc-psi-n">${x.n} ${x.n === 1 ? 'sessão' : 'sessões'}</span></li>`).join('')}
              ${p.psis.length > PSIS_VISIVEIS ? `<li class="pc-psi-mais"><button type="button" data-psis-mais>+ ${p.psis.length - PSIS_VISIVEIS} ${p.psis.length - PSIS_VISIVEIS === 1 ? 'outro' : 'outros'}</button></li>` : ''}</ul>
          </div>
        </div>
          <div class="pc-card pc-obs-card">
          <h2>Observações da equipe</h2>
          <p class="muted pc-aviso">Só assuntos administrativos (ex.: "prefere contato à noite"). <b>Nada clínico</b>: o conteúdo das sessões é do psicólogo.</p>
          <textarea id="pc-obs" maxlength="2000" placeholder="Escreva aqui…">${esc(ex.obs || '')}</textarea>
          <div class="pc-obs-rod"><span class="muted" id="pc-obs-info">${ex.obsEm ? `Atualizado por ${esc(ex.obsPor || '—')}, ${esc(U.fmtDataHoraCompleta(ex.obsEm))}` : ''}</span><button class="btn btn-primario btn-peq" id="pc-obs-salvar" type="button">Salvar</button></div>
        </div>
          <div class="pc-card pc-hist-card pc-larga">
            <h2>Histórico</h2>
            <div class="tabela-rolagem"><table class="tabela pc-hist">
              <thead><tr><th>Quando</th><th>Psicólogo</th><th>Situação</th><th class="pc-h-valor">Valor</th></tr></thead>
              <tbody>${hist.itens.map((a, i, l) => { const fut = x => x && ms(x) > t; return `<tr${fut(a) ? ` class="futura${!fut(l[i - 1]) ? ' fut-ini' : ''}${!fut(l[i + 1]) ? ' fut-fim' : ''}"` : ''}><td><b>${esc(U.fmtCurta(a.data))}</b><small>${esc(U.intervalo(a.hora, a.duracao))}</small></td><td>${esc(PSIS[a.psiId]?.nome || '—')}<small>${a.tipo === 'mensal' ? `Plano mensal ${a.sessao}/${a.totalSessoes}` : 'Avulsa'}</small></td><td>${U.badge(a.status)}</td><td class="pc-h-valor">${U.moeda(a.valor)}</td></tr>`; }).join('')}</tbody>
            </table></div>
            <nav class="paginacao pc-hist-pag" id="pc-hist-pag" aria-label="Páginas do histórico">${Paginacao.html(hist, ['atendimento', 'atendimentos'])}</nav>
          </div>
      </div>
          ${S.papel === 'admin' ? `<div class="pc-excluir"><button type="button" class="btn btn-perigo btn-peq" id="pc-excluir">Excluir paciente</button><span class="muted">Apaga nome, WhatsApp, e-mail e observações. Os atendimentos ficam como "Paciente removido" para os repasses.</span></div>` : ''}
      </div>`;

    $('#pc-obs-salvar').onclick = async () => {
      try { const r = await DB.salvarPacienteObs(chave, $('#pc-obs').value, S.nome); EXTRA[chave] = { ...(EXTRA[chave] || {}), ...r }; $('#pc-obs-info').textContent = `Atualizado por ${S.nome}, agora`; U.toast('Observações salvas.'); }
      catch (e) { U.toast(e.message || 'Não consegui salvar.', 'erro'); }
    };
    const hp = $('#pc-hist-pag');
    if (hp) hp.addEventListener('click', e => { const b = e.target.closest('button[data-pag]'); if (!b || b.disabled) return; histPag = Number(b.dataset.pag); desenharFicha(chave); const h = $('.pc-hist'); if (h) h.closest('.pc-card').scrollIntoView({ block: 'start', behavior: 'smooth' }); });
    const exc = $('#pc-excluir');
    if (exc) exc.onclick = async () => {
      const futuras = p.ags.filter(a => ['pendente', 'confirmado'].includes(a.status) && ms(a) > Date.now());
      if (futuras.length) {
        U.modal({ titulo: 'Ainda não dá para excluir', corpo: `<p>${esc(p.nome)} tem <b>${futuras.length} atendimento${futuras.length > 1 ? 's' : ''} marcado${futuras.length > 1 ? 's' : ''}</b> (ou pré-reserva aberta). Cancele na Agenda antes de excluir o paciente.</p>`, acoes: [{ texto: 'Entendi', classe: 'btn-primario' }] });
        return;
      }
      const ok = await U.confirmar(`Excluir ${esc(p.nome)}?`, `Isso <b>não pode ser desfeito</b>. Apaga nome, WhatsApp, e-mail e observações. Os ${p.ags.length} atendimento${p.ags.length > 1 ? 's' : ''} continua${p.ags.length > 1 ? 'm' : ''} na Agenda e nos repasses como <b>"Paciente removido"</b>.<br><br>Use quando a própria pessoa pedir para apagar os dados (LGPD) ou para limpar um cadastro de teste.`, 'Excluir paciente', true);
      if (!ok) return;
      try {
        await DB.excluirPaciente(p.ags.map(a => a.id), [...new Set([chave, ...Object.keys(ALIAS).filter(k => ALIAS[k] === chave)])], S.nome);
        U.toast(`${p.nome} foi excluído.`);
        history.pushState(null, '', location.pathname); await carregar(); rota();
      } catch (e) { U.toast(e.message || 'Não consegui excluir.', 'erro'); }
    };
    const resg = $('#pc-resgate');
    const pm = $('[data-psis-mais]');
    if (pm) pm.addEventListener('click', () => { document.querySelectorAll('.pc-psi-extra').forEach(li => { li.hidden = false; }); pm.closest('li').remove(); });
    if (resg) resg.addEventListener('click', () => { DB.marcarContatoPaciente(chave, 'resgate:' + p.vencida.id).then(r => { EXTRA[chave] = { ...(EXTRA[chave] || {}), ...r }; setTimeout(() => desenharFicha(chave), 300); }).catch(() => {}); });
  }

  /* ---------- navegação (lista ⇄ ficha) ---------- */
  function rota() {
    const h = decodeURIComponent(location.hash.slice(1));
    const ficha = FICHA && h.startsWith('p:');
    $('#pc-lista-tela').hidden = ficha; $('#pc-ficha-tela').hidden = !ficha;
    if (ficha) { desenharFicha(h.slice(2)); scrollTo(0, 0); } else desenharLista();
  }
  document.addEventListener('click', e => { if (e.target.closest('.pc-voltar')) { e.preventDefault(); history.pushState(null, '', location.pathname); rota(); } });
  window.addEventListener('hashchange', rota);
  window.addEventListener('popstate', rota);

  await U.carregarAjustesAgenda();
  await carregar();
  preencherPsi();
  rota();
  DB.aoMudar(async () => { await carregar(); if (!location.hash.startsWith('#p:')) desenharLista(); });
})();
