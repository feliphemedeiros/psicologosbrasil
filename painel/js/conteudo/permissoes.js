/* Permissões, menu das áreas e contadores do topo.
   Usado pelas páginas psicologos.html, artigos.html, usuarios.html e config.html. Os arquivos rodam em ordem e dividem as mesmas variáveis. */
/* =============== permissões, menu e início =============== */
let AREA_ATUAL = 'psicologos';
function irPara(view) {
  /* outra área = outra página */
  if (PAGINA && AREA_ARQ[view] && view !== PAGINA) { location.href = AREA_ARQ[view]; return; }
  if (view === 'psicologos' || view === 'artigos' || view === 'config' || view === 'usuarios') {
    if ((view === 'config' || view === 'usuarios') ? !ADMIN : !Auth.pode(view)) return;
    if (view !== 'config' && view !== 'usuarios') AREA_ATUAL = view;
    /* nas abas aparece só a área atual. Configurações virou uma área do topo
       (ao lado de Agenda), então ela não aparece mais como aba aqui embaixo */
    $$('.nav button[data-view]').forEach(x => { x.hidden = x.dataset.view !== view; });
    Auth.menuAreas($('[data-areas]'), view);
    const NOMES = { artigos: 'Artigos', psicologos: 'Psicólogos', config: 'Configurações', usuarios: 'Usuários' };
    if (view === 'usuarios' && typeof equipePapel === 'function' && $('#eq-papel')) { equipePapel(); equipeRender(); }
    $('#marcaSub').textContent = NOMES[view];
    document.title = NOMES[view] + ' · Painel Psicólogos Brasil';
  }
  if (typeof montarFicha === 'function') montarFicha(view === 'psicologos' && $('#cartaoPsi') && !$('#cartaoPsi').hidden ? psiAtual() : null);
  const b = $(`.nav button[data-view="${view}"]`);
  if (!b || b.hidden) return;
  $$('.nav button').forEach(x => x.classList.toggle('ativo', x === b));
  $$('.view').forEach(v => v.classList.toggle('ativa', v.id === 'view-' + view));
  if (!PAGINA) history.replaceState(null, '', '#' + view);
}
function aplicarPermissoes() {
  const pode = { artigos: Auth.pode('artigos'), psicologos: Auth.pode('psicologos'), config: ADMIN, usuarios: ADMIN };
  $$('.nav button[data-view]').forEach(b => { b.hidden = !pode[b.dataset.view]; });
  if (!ADMIN) $$('[data-so-admin]').forEach(e => e.remove());
  /* topo: quem está logado e botão Sair (igual à agenda) */
  $('[data-nome]').textContent = SESSAO.nome || '';
  $('[data-papel]').textContent = Auth.nomePapel(SESSAO);
  $('[data-sair]').addEventListener('click', () => Auth.sair({
    antes: async () => { if (ONLINE.modo === 'firebase') { if (precisaSalvar()) { clearTimeout(tNuvem); await sincronizar(); } await ONLINE.authMod.signOut(ONLINE.auth); } }
  }));
  /* com o Firebase, mostra no topo se o rascunho já foi salvo na nuvem */
  const st = $('#nuvemStatus');
  if (st && ONLINE.modo === 'firebase') $('.topo-user').prepend(st);
}
function ligarListas() {
  /* filtros */
  const liga = (id, tipo, k, ev = 'change') => { const el = $(id); if (el) el.addEventListener(ev, () => { FILTRO[tipo][k] = el.value; FILTRO[tipo].pag = 1; tipo === 'artigos' ? renderListaArtigos() : renderListaPsicologos(); }); };
  let tq;
  [['#fa-q', 'artigos'], ['#fp-q', 'psicologos']].forEach(([id, tipo]) => { const el = $(id); if (el) el.addEventListener('input', () => { clearTimeout(tq); tq = setTimeout(() => { FILTRO[tipo].q = el.value; FILTRO[tipo].pag = 1; tipo === 'artigos' ? renderListaArtigos() : renderListaPsicologos(); }, 150); }); });
  [['#fa-status', 'status'], ['#fa-cat', 'cat'], ['#fa-mes', 'mes'], ['#fa-ordem', 'ordem']].forEach(([id, k]) => liga(id, 'artigos', k));
  [['#fp-status', 'status'], ['#fp-visivel', 'visivel'], ['#fp-agenda', 'agenda'], ['#fp-verif', 'verif'], ['#fp-abord', 'abord'], ['#fp-ordem', 'ordem']].forEach(([id, k]) => liga(id, 'psicologos', k));
  /* linhas, páginas e letras */
  const abre = (lista, fn) => { const el = $(lista); if (el) el.addEventListener('click', e => { const b = e.target.closest('.lin'); if (b) fn(b.dataset.id); }); };
  abre('#listaArtigos', abrirArtigo); abre('#listaPsicologos', abrirPsicologo);
  [['#pagArtigos', 'artigos'], ['#pagPsicologos', 'psicologos']].forEach(([id, tipo]) => { const el = $(id); if (el) el.addEventListener('click', e => {
    const b = e.target.closest('[data-pag]'); if (!b || b.disabled) return;
    FILTRO[tipo].pag = +b.dataset.pag; tipo === 'artigos' ? renderListaArtigos() : renderListaPsicologos();
    $(tipo === 'artigos' ? '#telaArtigos' : '#telaPsicologos').scrollIntoView({ block: 'start' });
  }); });
  $('#letrasPsi').addEventListener('click', e => { const b = e.target.closest('[data-letra]'); if (!b || b.disabled) return; FILTRO.psicologos.letra = b.dataset.letra; FILTRO.psicologos.pag = 1; renderListaPsicologos(); });
  /* voltar para a lista */
  $$('[data-voltar]').forEach(b => b.addEventListener('click', () => { if (b.dataset.voltar === 'artigo') abrirArtigo(null); else abrirPsicologo(null); }));
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || e.target.closest('input,textarea,[contenteditable="true"],select') || !$('#a-menu').hidden) return;
    if (atualA && $('#view-artigos.ativa')) abrirArtigo(null);
    else if (atualP && $('#view-psicologos.ativa')) abrirPsicologo(null);
  });
  /* acesso à agenda */
  $('#p-acesso-salvar').addEventListener('click', salvarAcesso);
  $('#p-video').addEventListener('input', pillVideo);
  /* CRP: só números, no formato 11/12345 · OPP: só números */
  $('#p-crp').addEventListener('input', e => {
    const d = e.target.value.replace(/\D/g, '').slice(0, 7);
    e.target.value = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
  }, true);
  $('#p-opp').addEventListener('input', e => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
    const p = psiAtual(); if (!p) return;
    p.opp = e.target.value; p.atualizado = Date.now(); marcarAlterado(p); salvar(); infoPsi();
  });
  $('#p-senha-padrao').addEventListener('click', () => { const p = psiAtual(); if (!p) return; $('#p-senha').value = senhaPadrao(p.nome); $('#p-senha').focus(); });
  $('#p-senha-link').addEventListener('click', async () => {
    const p = psiAtual(), ag = agendaDe(p); if (!ag || !ag.email) return;
    const b = $('#p-senha-link'); b.disabled = true;
    try { await DB.equipe.novaSenha(ag.email); toast(`Link para criar nova senha enviado para ${ag.email}.`, 'ok'); }
    catch (e) { toast(e.message || 'Não consegui enviar o link.', 'erro'); }
    finally { b.disabled = false; }
  });
  /* a dica da senha padrão acompanha o nome digitado */
  $('#p-nome').addEventListener('input', () => {
    const p = psiAtual(); if (!p || agendaDe(p)) return;
    const senha = $('#p-senha').value, email = $('#p-email').value, usuario = $('#p-usuario').value;
    preencherAcesso(p);
    $('#p-senha').value = senha; $('#p-email').value = email; $('#p-usuario').value = usuario;
  });
  ['#p-email', '#p-usuario'].forEach(id => $(id).addEventListener('input', () => {
    const p = psiAtual(); if (!p || p.agendaId) return;
    p.acessoRasc = { email: $('#p-email').value.trim(), usuario: $('#p-usuario').value.trim() }; salvar();
  }));
  /* sugestão de usuário pelo nome */
  $('#p-usuario').addEventListener('focus', () => {
    const p = psiAtual(); if (!p || $('#p-usuario').value) return;
    const partes = slugify(p.nome).split('-').filter(Boolean);
    if (partes.length) $('#p-usuario').value = partes.length > 1 ? partes[0] + '.' + partes[partes.length - 1] : partes[0];
  });
  /* contador de pré-reservas na lateral */
  if (Auth.pode('agenda')) DB.listarAgendamentos({ status: 'pendente' }).then(l => { $('#qtdPend').textContent = l.length || ''; }).catch(() => {});
}
