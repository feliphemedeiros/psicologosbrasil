/* Listas de Psicólogos e Artigos: filtros, paginação, lista/quadros e a ficha do psicólogo.
   Usado pelas páginas psicologos.html, artigos.html, usuarios.html e config.html. Os arquivos rodam em ordem e dividem as mesmas variáveis. */
/* =========================================================
   PAINEL ÚNICO (v10)
   - quem entra: o login é a tela /painel/ (index.html), sempre com código
   - admin vê Psicólogos, Artigos, Agenda e Configurações
   - suporte vê Psicólogos e Agenda
   - listas grandes: busca, filtros, ordem e páginas de 20 itens
   - cada psicólogo pode ganhar acesso à agenda (mesmo id do perfil)
   ========================================================= */
const SESSAO = Auth.sessao() || {};
const ADMIN = SESSAO.papel === 'admin';
const POR_PAG = 10;   /* perfis e artigos: 10 por página em lista */
const POR_PAG_QUADROS = 12;   /* em quadros: 12 (3 linhas de 4; no celular, 6 linhas de 2), sem linha pela metade */
const AGC = window.AGENDA_CONFIG;
const FILTRO = {
  artigos: { q: '', status: '', cat: '', mes: '', ordem: 'recentes', pag: 1 },
  psicologos: { q: '', status: '', visivel: '', agenda: '', verif: '', abord: '', letra: '', ordem: 'az', pag: 1 }
};
let AGENDA_MAP = {};
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES_L = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const dataCurta = iso => { const [y, m, d] = String(iso || '').split('-'); return d ? `${+d} ${MESES[+m - 1]} ${y}` : '—'; };
const situacao = o => !o.geradoEm ? 'rascunho' : o.alterado ? 'alterado' : 'publicado';
const plural = (n, um, varios) => `${n.toLocaleString('pt-BR')} ${n === 1 ? um : varios}`;
const notaCache = new Map();
function notaSeo(a) {
  const c = notaCache.get(a.id);
  if (c && c.t === a.atualizado) return c.n;
  const n = analisarSeo(a).nota; notaCache.set(a.id, { t: a.atualizado, n }); return n;
}
const primeiraLetra = nome => (norm(nome).match(/[a-z]/) || ['#'])[0].toUpperCase();

/* ---------- paginação ---------- */
function paginar(lista, f, por = POR_PAG) {
  const total = lista.length, paginas = Math.max(1, Math.ceil(total / por));
  if (f.pag > paginas) f.pag = paginas;
  const ini = (f.pag - 1) * por;
  return { itens: lista.slice(ini, ini + por), total, paginas, ini, por };
}
function htmlPaginacao(r, f, nome) {
  if (!r.total) return '';
  const fim = Math.min(r.ini + (r.por || POR_PAG), r.total);
  let nums = [];
  for (let i = 1; i <= r.paginas; i++) if (i === 1 || i === r.paginas || Math.abs(i - f.pag) <= 1) nums.push(i);
  let html = '', ant = 0;
  nums.forEach(n => { if (n - ant > 1) html += '<span class="ret">…</span>'; html += `<button type="button" data-pag="${n}" class="${n === f.pag ? 'on' : ''}" ${n === f.pag ? 'aria-current="page"' : ''}>${n}</button>`; ant = n; });
  return `<span>Mostrando ${(r.ini + 1).toLocaleString('pt-BR')}–${fim.toLocaleString('pt-BR')} de ${plural(r.total, nome[0], nome[1])}</span>
    ${r.paginas > 1 ? `<span class="pags"><button type="button" data-pag="${f.pag - 1}" ${f.pag === 1 ? 'disabled' : ''} aria-label="Página anterior">‹</button>${html}<button type="button" data-pag="${f.pag + 1}" ${f.pag === r.paginas ? 'disabled' : ''} aria-label="Próxima página">›</button></span>` : ''}`;
}
function preencherSelect(sel, opcoes, valor, rotuloTodos) {
  const el = $(sel); if (!el) return;
  el.innerHTML = `<option value="">${rotuloTodos}</option>` + opcoes.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('');
  el.value = opcoes.some(([v]) => v === valor) ? valor : '';
}

/* =============== ARTIGOS =============== */
renderListaArtigos = function () {
  const el = $('#listaArtigos'); if (!el) return;
  el.classList.toggle('grade-art', VISTA.art === 'grade' && state.artigos.length > 0);
  $('#qtdArtigos').textContent = state.artigos.length; $('#qtdArtigosT').textContent = state.artigos.length;
  const f = FILTRO.artigos;
  const cats = [...new Set(state.artigos.map(a => a.categoria).filter(Boolean).concat(linhas(state.config.categorias)))].sort((x, y) => x.localeCompare(y, 'pt-BR'));
  preencherSelect('#fa-cat', cats.map(c => [c, c]), f.cat, 'Todas as categorias');
  const meses = [...new Set(state.artigos.map(a => (a.data || '').slice(0, 7)).filter(Boolean))].sort().reverse();
  preencherSelect('#fa-mes', meses.map(m => [m, `${MESES_L[+m.slice(5) - 1]} de ${m.slice(0, 4)}`]), f.mes, 'Todos os meses');

  const q = norm(f.q);
  let l = state.artigos.filter(a =>
    (!q || norm([a.titulo, a.slug, a.categoria, (a.palavras || []).join(' ')].join(' ')).includes(q)) &&
    (!f.status || situacao(a) === f.status) && (!f.cat || a.categoria === f.cat) && (!f.mes || (a.data || '').startsWith(f.mes)));
  const porData = (x, y) => (y.data || '').localeCompare(x.data || '') || y.criado - x.criado;
  l.sort({
    recentes: porData, antigos: (x, y) => -porData(x, y), editados: (x, y) => y.atualizado - x.atualizado,
    titulo: (x, y) => (x.titulo || '').localeCompare(y.titulo || '', 'pt-BR'), seo: (x, y) => notaSeo(x) - notaSeo(y)
  }[f.ordem] || porData);
  const r = paginar(l, f, VISTA.art === 'grade' ? POR_PAG_QUADROS : POR_PAG);
  if (!state.artigos.length) el.innerHTML = '<div class="tl-vazio"><b>Nenhum artigo ainda.</b>Comece pelo botão “+ Novo artigo”.</div>';
  else if (!r.total) el.innerHTML = '<div class="tl-vazio"><b>Nenhum artigo com esses filtros.</b>Mude a busca ou limpe os filtros.</div>';
  else if (VISTA.art === 'grade') el.innerHTML = r.itens.map(a => `<button class="lin aq" type="button" data-id="${a.id}">
      ${a.capa && a.capa.data ? `<img class="aq-capa" src="${a.capa.data}" alt="" loading="lazy">` : '<span class="aq-capa aq-sem" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 11h7M9 15h7M9 19h4"/></svg></span>'}
      <span class="aq-corpo"><span class="aq-cat">${esc(a.categoria || 'Sem categoria')} · ${dataCurta(a.data)}</span>
      <b class="aq-tit">${esc(a.titulo || 'Sem título')}</b>
      <span class="aq-selos">${statusSelo(a)}${seloSeo(a)}</span></span></button>`).join('');
  else el.innerHTML = `<div class="tl-cab tl-art" aria-hidden="true"><span></span><span>Título</span><span>Data</span><span>SEO</span><span>Situação</span><span></span></div>` +
    r.itens.map(a => `<button class="lin tl-art" type="button" data-id="${a.id}">
      ${a.capa && a.capa.data ? `<img class="lin-img" src="${a.capa.data}" alt="" loading="lazy">` : '<span class="lin-img">A</span>'}
      <span class="lin-t"><b>${esc(a.titulo || 'Sem título')}</b><small>${esc(a.categoria || 'Sem categoria')} · /blog/${esc(a.slug || '…')}</small></span>
      <span class="lin-c">${dataCurta(a.data)}</span>
      <span class="lin-c">${seloSeo(a)}</span>
      <span class="lin-c">${statusSelo(a)}</span>
      <span class="lin-seta" aria-hidden="true">›</span></button>`).join('');
  $('#pagArtigos').innerHTML = htmlPaginacao(r, f, ['artigo', 'artigos']);
};
abrirArtigo = function (id) {
  atualA = id; const a = artigoAtual();
  $('#telaArtigos').hidden = !!a; $('#cartaoArtigo').hidden = !a;
  $('#artigoVazio').hidden = !!a; $('#artigoEd').hidden = !a;
  if (a) {
    trocarAba('artigo', 'editar'); preencherArtigo(a);
    $('#posArtigo').textContent = a.geradoEm ? `Publicado em ${quando(a.geradoEm)}` : 'Rascunho, ainda não está no site';
    window.scrollTo(0, 0);
  }
  renderListaArtigos();
};

/* =============== PSICÓLOGOS =============== */
async function atualizarAgendaMap() {
  try { const l = await DB.listarPsicologos({ todos: true }); AGENDA_MAP = Object.fromEntries(l.map(x => [x.id, x])); } catch (e) { AGENDA_MAP = {}; }
}
const agendaDe = p => (p && p.agendaId ? AGENDA_MAP[p.agendaId] : null) || null;
/* Lista (linhas) ou quadros, em Psicólogos e Artigos; a escolha fica guardada neste navegador */
/* v199: no celular (até 640px) é sempre lista e o botão some */
const VISTA_CEL = window.matchMedia('(max-width: 640px)');
const VISTA_ESC = { psi: 'lista', art: 'lista' };
const VISTA = {
  get psi() { return VISTA_CEL.matches ? 'lista' : VISTA_ESC.psi; }, set psi(v) { VISTA_ESC.psi = v; },
  get art() { return VISTA_CEL.matches ? 'lista' : VISTA_ESC.art; }, set art(v) { VISTA_ESC.art = v; }
};
VISTA_CEL.addEventListener('change', () => { try { renderListaPsicologos(); renderListaArtigos(); } catch (e) { /* página sem lista */ } });
function ligarVista(grupo, chave, desenhar) {
  try { VISTA[chave] = localStorage.getItem('pb_vista_' + chave) === 'grade' ? 'grade' : 'lista'; } catch (e) { /* lista */ }
  const g = $(grupo); if (!g) return;
  const marcar = () => g.querySelectorAll('[data-vista]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.vista === VISTA_ESC[chave])));
  marcar();
  g.addEventListener('click', e => {
    const b = e.target.closest('[data-vista]'); if (!b || b.dataset.vista === VISTA_ESC[chave]) return;
    VISTA[chave] = b.dataset.vista; marcar();
    try { localStorage.setItem('pb_vista_' + chave, VISTA_ESC[chave]); } catch (err) { /* sem problema */ }
    desenhar();
  });
}
ligarVista('#fp-vista', 'psi', () => renderListaPsicologos());
ligarVista('#fa-vista', 'art', () => renderListaArtigos());
renderListaPsicologos = function () {
  const el = $('#listaPsicologos'); if (!el) return;
  el.classList.toggle('grade-psi', VISTA.psi === 'grade' && state.psicologos.length > 0);
  $('#qtdPsicologos').textContent = state.psicologos.length; $('#qtdPsicologosT').textContent = state.psicologos.length;
  const f = FILTRO.psicologos;
  const abords = [...new Set(state.psicologos.flatMap(p => p.abordagens || []).concat(linhas(state.config.abordagens)))].sort((x, y) => x.localeCompare(y, 'pt-BR'));
  preencherSelect('#fp-abord', abords.map(a => [a, a]), f.abord, 'Todas as abordagens');

  const q = norm(f.q);
  const base = state.psicologos.filter(p => {
    const ag = agendaDe(p);
    return (!q || norm([p.nome, p.crp, p.opp, p.slug, ag && ag.usuario, ag && ag.email, (p.temas || []).join(' ')].join(' ')).includes(q)) &&
      (!f.status || situacao(p) === f.status) &&
      (!f.visivel || (f.visivel === 'sim') === (p.ativo !== false)) &&
      (!f.agenda || (f.agenda === 'sim') === !!(ag && ag.ativo)) &&
      (!f.verif || (f.verif === 'sim') === !!p.verificado) &&
      (!f.abord || (p.abordagens || []).includes(f.abord));
  });
  /* letras: só aparecem quando a lista fica grande (30 ou mais perfis) */
  const poucos = state.psicologos.length < 30;
  $('#letrasPsi').hidden = poucos; if (poucos) f.letra = '';
  /* quantos filtros estão em uso (aparece no botão "Filtros") */
  const nFiltros = ['status', 'visivel', 'agenda', 'verif', 'abord'].filter(k => f[k]).length + (f.ordem && f.ordem !== 'az' ? 1 : 0);
  $('#fp-n').hidden = !nFiltros; $('#fp-n').textContent = nFiltros;
  const tem = new Set(base.map(p => primeiraLetra(p.nome || '')));
  $('#letrasPsi').innerHTML = `<button type="button" data-letra="" class="${f.letra ? '' : 'on'}">Todos</button>` +
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(L => `<button type="button" data-letra="${L}" class="${f.letra === L ? 'on' : ''}" ${tem.has(L) ? '' : 'disabled'}>${L}</button>`).join('');
  let l = f.letra ? base.filter(p => primeiraLetra(p.nome || '') === f.letra) : base;
  const az = (x, y) => (x.nome || '').localeCompare(y.nome || '', 'pt-BR');
  l.sort({ az, za: (x, y) => -az(x, y), novos: (x, y) => y.criado - x.criado, editados: (x, y) => y.atualizado - x.atualizado }[f.ordem] || az);
  const r = paginar(l, f, VISTA.psi === 'grade' ? POR_PAG_QUADROS : POR_PAG);
  if (!state.psicologos.length) el.innerHTML = '<div class="tl-vazio"><b>Nenhum psicólogo ainda.</b>Comece pelo botão “+ Novo psicólogo”.</div>';
  else if (!r.total) el.innerHTML = '<div class="tl-vazio"><b>Ninguém com esses filtros.</b>Mude a busca ou limpe os filtros.</div>';
  else if (VISTA.psi === 'grade') el.innerHTML = r.itens.map(p => {
      const ag = agendaDe(p), off = !!p.desativado || (ag && !ag.ativo), n = ag && SESSOES[ag.id];
      return `<button class="lin pq${off ? ' off' : ''}" type="button" data-id="${p.id}"${off ? ' title="Desativado: fora do site e sem acesso ao painel"' : ''}>
      ${p.foto && p.foto.data ? `<img class="pq-img" src="${p.foto.data}" alt="" loading="lazy">` : `<span class="pq-img">${esc(primeiraLetra(p.nome || '?'))}</span>`}
      <span class="pq-nome"><span>${esc(p.nome || 'Sem nome')}</span>${p.verificado ? SELO_PAINEL : ''}</span>
      <span class="pq-crp">${[p.crp ? 'CRP ' + esc(p.crp) : '', p.opp ? 'OPP ' + esc(p.opp) : ''].filter(Boolean).join(' · ') || 'Sem CRP'}</span>
      <span class="pq-selos">${seloAgenda(ag)}${seloPerfil(p)}</span>
      ${seloVisto(n) ? `<span class="pq-nv">${seloVisto(n)}</span>` : ''}
      ${ag ? `<span class="pq-nums">${numerosPsi(n)}</span>` : ''}</button>`;
    }).join('');
  else el.innerHTML = `<div class="tl-cab tl-psi" aria-hidden="true"><span></span><span>Nome</span><span>Agenda online</span><span>Atendimentos</span><span>No site</span><span></span></div>` +
    r.itens.map(p => {
      const ag = agendaDe(p), off = !!p.desativado || (ag && !ag.ativo), n = ag && SESSOES[ag.id];
      return `<button class="lin tl-psi${off ? ' off' : ''}" type="button" data-id="${p.id}"${off ? ' title="Desativado: fora do site e sem acesso ao painel"' : ''}>
      ${p.foto && p.foto.data ? `<img class="lin-img" src="${p.foto.data}" alt="" loading="lazy">` : `<span class="lin-img">${esc(primeiraLetra(p.nome || '?'))}</span>`}
      <span class="lin-t"><b>${esc(p.nome || 'Sem nome')} ${p.verificado ? SELO_PAINEL : ''}</b><small>${[p.crp ? 'CRP ' + esc(p.crp) : '', p.opp ? 'OPP ' + esc(p.opp) : ''].filter(Boolean).join(' · ') || 'Sem CRP'}</small></span>
      <span class="lin-c lin-ag">${seloAgenda(ag)}${seloVisto(n)}</span>
      <span class="lin-c lin-nums">${ag ? numerosPsi(n) : ''}</span>
      <span class="lin-c">${seloPerfil(p)}</span>
      <span class="lin-seta" aria-hidden="true">›</span></button>`;
    }).join('');
  $('#pagPsicologos').innerHTML = htmlPaginacao(r, f, ['psicólogo', 'psicólogos']);
};
/* Situação do perfil num selo só: Publicado, Publicado com alterações, Rascunho, Oculto ou Desativado */
function seloPerfil(p) {
  if (p.desativado) return '<span class="selo off">Desativado · fora do site</span>';
  const publicado = !!(p.geradoEm && p.pubSlug);
  if (p.ativo === false) return '<span class="selo oculto">Oculto no site</span>';
  if (!publicado) return '<span class="selo rasc">Rascunho · não publicado</span>';
  if (p.alterado) return '<span class="selo pub-alt">Publicado · alterações não publicadas</span>';
  return '<span class="selo pub">Publicado</span>';
}
/* ---------- FICHA DO PSICÓLOGO ----------
   "Página no site" é esta tela. As outras abas abrem a agenda dele (mesmo painel que o psicólogo usa),
   em minha-agenda.html?psi=ID, com as mesmas abas no topo para voltar. */
let SESSOES = {};   /* agendaId → { hoje, semana, pre, naoViu, conf, feitos30 } (naoViu = confirmadas que o psicólogo ainda não viu) */
/* pedaços da lista de Psicólogos (linhas e quadros) */
const seloAgenda = ag => ag ? (!ag.ativo ? '<span class="selo off">Login bloqueado</span>' : ag.pausada ? '<span class="selo alt">Agenda pausada</span>' : '<span class="selo ag">Agenda ligada</span>') : '<span class="selo ag-off">Sem agenda</span>';
const seloVisto = n => !n || !n.conf ? ''
  : n.naoViu ? `<span class="psi-naoviu" title="Sessões confirmadas em que o psicólogo ainda não clicou em “Estou ciente”"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.4 5.3A10.6 10.6 0 0 1 12 5c5 0 9 4.5 10 7-.4 1-1.3 2.4-2.6 3.7M6.3 6.4C4.3 7.8 2.8 9.8 2 12c1 2.5 5 7 10 7 1.6 0 3.1-.4 4.4-1.1"/></svg>Ainda não viu ${n.naoViu} ${n.naoViu > 1 ? 'sessões' : 'sessão'}</span>`
  : `<span class="psi-viu" title="O psicólogo já clicou em “Estou ciente” em todas as sessões confirmadas"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M5 12.5l4.5 4.5L19 7.5"/></svg>Viu todas as sessões</span>`;
const numerosPsi = n => {
  n = n || { feitos30: 0, semana: 0, pre: 0 };
  return `<span class="psi-num" title="Sessões realizadas ou com falta nos últimos 30 dias"><b>${n.feitos30}</b> ${n.feitos30 === 1 ? 'atendimento' : 'atendimentos'} em 30 dias</span>`
    + (n.semana ? `<span class="psi-num"><b>${n.semana}</b> nos próximos 7 dias</span>` : '')
    + (n.pre ? `<span class="psi-num pre" title="Pré-reservas esperando o pagamento"><b>${n.pre}</b> ${n.pre > 1 ? 'pré-reservas' : 'pré-reserva'}</span>` : '');
};
async function atualizarSessoes() {
  SESSOES = {};
  try {
    const hoje = (typeof U !== 'undefined' && U.hojeISO) ? U.hojeISO() : new Date().toISOString().slice(0, 10);
    const fim = new Date(hoje + 'T12:00:00'); fim.setDate(fim.getDate() + 7); const ate = fim.toISOString().slice(0, 10);
    const ini = new Date(hoje + 'T12:00:00'); ini.setDate(ini.getDate() - 30); const de30 = ini.toISOString().slice(0, 10);
    const ags = await DB.listarAgendamentos({ de: de30 });
    ags.forEach(a => {
      const n = SESSOES[a.psiId] || (SESSOES[a.psiId] = { hoje: 0, semana: 0, pre: 0, naoViu: 0, conf: 0, feitos30: 0 });
      /* atendimentos feitos nos últimos 30 dias (realizado ou falta, que também conta como feita) */
      if (a.data < hoje || (a.data === hoje && ['realizado', 'falta'].includes(a.status))) { if (['realizado', 'falta'].includes(a.status)) n.feitos30++; if (a.data < hoje) return; }
      if (a.status === 'pendente') n.pre++;
      if (a.status === 'confirmado') { n.conf++; if (!a.psiCiente) n.naoViu++; }
      if (!['confirmado', 'realizado'].includes(a.status)) return;
      if (a.data === hoje) n.hoje++;
      if (a.data <= ate) n.semana++;
    });
  } catch (e) { /* sem agenda: tudo bem */ }
}
function montarFicha(p) {
  const nav = $('#psiFicha'); if (!nav) return;
  const topo = $('#psiFichaTopo'), visao = $('#psiVisao');
  document.body.classList.toggle('ficha-aberta', !!p);
  if (topo) topo.hidden = !p;
  if (visao) visao.hidden = !p;
  if (!p) { nav.hidden = true; return; }
  const ag = agendaDe(p), n = (ag && SESSOES[ag.id]) || { hoje: 0, semana: 0, pre: 0 };
  const ini = String(p.nome || '?').split(/\s+/).filter(w => w.length > 2).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
  const url = aba => `minha-agenda.html?psi=${encodeURIComponent(ag.id)}#${aba}`;
  const link = (aba, txt, extra) => ag
    ? `<a href="${url(aba)}">${txt}${extra || ''}</a>`
    : `<span class="off" title="Crie o acesso à agenda em “Acesso ao painel”, no fim do cadastro">${txt}</span>`;
  nav.innerHTML = `<div class="ficha-quem"><span class="ficha-ava">${p.foto && p.foto.data ? `<img src="${p.foto.data}" alt="">` : esc(ini)}</span>
      <span><b>${esc(p.nome || 'Novo psicólogo')}</b><small>${ag ? (n.hoje ? `${n.hoje} ${n.hoje > 1 ? 'sessões' : 'sessão'} hoje · ` : '') + `${n.semana} ${n.semana === 1 ? 'sessão' : 'sessões'} nos próximos 7 dias` : 'Ainda sem acesso à agenda'}</small></span></div>
    <div class="ficha-abas">
      <span class="atual" aria-current="page">Página no site</span>
      ${link('atendimentos', 'Atendimentos', n.pre ? `<span class="n" title="Pré-reservas esperando pagamento">${n.pre}</span>` : '')}
      ${link('disponibilidade', 'Disponibilidade')}
      ${link('resumo', 'Resumo')}
      ${link('conta', 'Conta')}
    </div>`;
  nav.hidden = false;
  /* barra do topo: as mesmas abas, no mesmo lugar da agenda (não "pula" ao trocar de aba) */
  if (topo) {
    const aT = (aba, txt, extra) => ag ? `<a class="aba" data-aba="${aba}" href="${url(aba)}">${txt}${extra || ''}</a>`
      : `<span class="aba off" data-aba="${aba}" title="Crie o acesso à agenda em “Acesso ao painel”, no fim do cadastro">${txt}</span>`;
    topo.innerHTML = `<span class="aba atual" data-aba="pagina" aria-selected="true" aria-current="page">Página no site</span>
      ${aT('atendimentos', 'Atendimentos', n.pre ? `<span class="contador">${n.pre}</span>` : '')}
      ${aT('disponibilidade', 'Disponibilidade')}${aT('resumo', 'Resumo')}${aT('conta', 'Conta')}`;
  }
  if (visao) {
    visao.firstElementChild.innerHTML = `<button type="button" class="visao-voltar" id="psiVoltarTopo">← Todos os psicólogos</button>
      <span>Você está editando a página de <strong>${esc(p.nome || 'novo psicólogo')}</strong> no site.${ag ? '' : ' A agenda ainda não foi criada.'}</span>
      ${(() => {   /* botão verde para falar com o psicólogo no WhatsApp (igual às abas da agenda dele) */
        const num = (ag && ag.whatsapp) || p.whats || '', primeiro = U.primeiroNome(p.nome || '') || 'psicólogo';
        const ico = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Z"/></svg>';
        if (!p.nome) return '';
        if (!U.digitos(num)) return `<span class="visao-whats visao-whats-sem" title="Cadastre o WhatsApp do psicólogo">${ico}Sem WhatsApp cadastrado</span>`;
        return `<a class="visao-whats" target="_blank" rel="noopener" href="${U.linkWhats(num, `Olá, ${primeiro}! Aqui é ${U.primeiroNome(SESSAO.nome || '')}, da equipe da Psicólogos Brasil.`)}" title="${esc(U.fmtTelefone(num))}">${ico}WhatsApp de ${esc(primeiro)}</a>`;
      })()}`;
    $('#psiVoltarTopo').onclick = () => abrirPsicologo(null);
  }
}
/* psicologos.html#a:ID abre direto a ficha de quem tem essa agenda (vindo das abas da agenda) */
/* perfil do psicólogo ligado a um usuário da tela Usuários */
function psiDoUsuario(u) { const id = u.psiId || u.uid; return state.psicologos.find(x => x.agendaId === id) || null; }
function abrirPorEndereco(id) {
  if (!id) return false;
  const p = state.psicologos.find(x => x.agendaId === id);
  if (p) { abrirPsicologo(p.id); history.replaceState(null, '', location.pathname + location.search); return true; }
  return false;
}
/* botão "Filtros" e "Limpar filtros" */
(function () {
  const btn = $('#fp-mais'), caixa = $('#fp-caixa');
  if (!btn || !caixa) return;
  btn.addEventListener('click', () => { const abrir = caixa.hidden; caixa.hidden = !abrir; btn.setAttribute('aria-expanded', String(abrir)); });
  $('#fp-limpar').addEventListener('click', () => {
    const f = FILTRO.psicologos;
    ['status', 'visivel', 'agenda', 'verif', 'abord'].forEach(k => { f[k] = ''; const el = $('#fp-' + k); if (el) el.value = ''; });
    f.ordem = 'az'; $('#fp-ordem').value = 'az'; f.pag = 1;
    document.querySelectorAll('#fp-caixa select').forEach(s => s.dispatchEvent(new Event('pc-sync')));
    renderListaPsicologos();
  });
})();
abrirPsicologo = function (id) {
  atualP = id; const p = psiAtual();
  $('#telaPsicologos').hidden = !!p; $('#cartaoPsi').hidden = !p;
  montarFicha(p);
  $('#psiVazio').hidden = !!p; $('#psiEd').hidden = !p;
  if (p) {
    trocarAba('psi', 'editar'); preencherPsi(p); preencherAcesso(p);
    $('#posPsi').textContent = p.geradoEm ? `Publicado em ${quando(p.geradoEm)}` : 'Rascunho, ainda não está no site';
    window.scrollTo(0, 0);
  }
  renderListaPsicologos();
};
/* Suporte: não abre a "Página no site". Tocar no psicólogo vai direto para os atendimentos dele
   (só Atendimentos e Disponibilidade; Resumo e Conta são do administrador). */
if (!Auth.pode('psiPagina')) {
  const abrirPagina = abrirPsicologo;
  abrirPsicologo = function (id) {
    const p = id && state.psicologos.find(x => x.id === id);
    if (!p) return abrirPagina(null);
    const ag = agendaDe(p);
    if (ag) { location.href = `minha-agenda.html?psi=${encodeURIComponent(ag.id)}#atendimentos`; return; }
    toast(`${p.nome || 'Este psicólogo'} ainda não tem agenda. Peça a um administrador para criar o acesso.`, 'aviso');
  };
  document.documentElement.classList.add('so-agenda-psi');
  const bn = $('#novoPsicologo'); if (bn) bn.style.display = 'none';
  const sub = $('#view-psicologos .sub'); if (sub) sub.textContent = 'Toque no psicólogo para ver os atendimentos e a disponibilidade dele.';
}
