/* Início da tela: abre o painel e a ficha pedida no endereço.
   Usado pelas páginas psicologos.html, artigos.html, usuarios.html e config.html. Os arquivos rodam em ordem e dividem as mesmas variáveis. */
(async function () {
  if (!Auth.sessao()) return;
  ligar(); prepararOnline(); aplicarPermissoes(); ligarListas(); ligarPerfisExtra();
  await atualizarAgendaMap(); await atualizarSessoes();
  /* cada página abre a sua área; psicologos.html#a:ID abre direto a ficha de alguém */
  const fichaM = location.hash.match(/^#(?:psicologos\/)?a:([^/?#]+)/);
  const fichaPedida = fichaM ? decodeURIComponent(fichaM[1]) : '';
  const areas = ['psicologos', 'artigos'].filter(v => Auth.pode(v));
  const podeAqui = (PAGINA === 'config' || PAGINA === 'usuarios') ? ADMIN : areas.includes(PAGINA);
  if (!podeAqui) { location.replace(areas[0] ? AREA_ARQ[areas[0]] : 'index.html'); return; }
  irPara(PAGINA);
  $('#loginForm').addEventListener('submit', entrar);
  $('#loginEsqueci').addEventListener('click', esqueciSenha);
  if (ONLINE.modo === 'firebase') {
    /* Firebase: o login já foi feito em /painel/; aqui só carrega os dados do banco */
    $('#login').hidden = true;
    iniciarFirebase().catch(e => { console.error(e); toast('Não consegui carregar o Firebase. Confira a internet e o arquivo js/firebase-config.js.', 'erro'); });

  } else { carregar(); abrirPainel(); }
  if (fichaPedida) { let t = 0; (function tentar() { if (!abrirPorEndereco(fichaPedida) && ++t < 40) setTimeout(tentar, 150); })(); }
  if (ADMIN && PAGINA === 'usuarios') { equipeIniciar(); atIniciar(); }
})();
