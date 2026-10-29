/* =====================================================================
   MODO ESCURO DO PAINEL — liga e desliga pelo botão de lua/sol no topo.
   A escolha fica guardada neste navegador (vale para todas as telas do
   painel). As cores ficam em painel/css/escuro.css.
   Este arquivo vai no <head> de cada tela do painel, para a página já
   abrir no tema certo, sem piscar.
   ===================================================================== */
(function () {
  const CHAVE = 'pb_painel_tema';
  const raiz = document.documentElement;

  function lerTema() { try { return localStorage.getItem(CHAVE) === 'escuro' ? 'escuro' : 'claro'; } catch (e) { return 'claro'; } }
  function aplicar(t) {
    if (t === 'escuro') raiz.setAttribute('data-tema', 'escuro'); else raiz.removeAttribute('data-tema');
    document.querySelectorAll('.tema-btn').forEach(atualizarBotao);
  }
  function atualizarBotao(b) {
    const escuro = raiz.getAttribute('data-tema') === 'escuro';
    b.setAttribute('aria-pressed', escuro ? 'true' : 'false');
    b.title = escuro ? 'Voltar para o modo claro' : 'Ativar o modo escuro';
    b.setAttribute('aria-label', b.title);
  }
  function trocar() {
    const novo = raiz.getAttribute('data-tema') === 'escuro' ? 'claro' : 'escuro';
    raiz.classList.add('tema-trocando');
    aplicar(novo);
    try { localStorage.setItem(CHAVE, novo); } catch (e) { /* sem armazenamento: vale só nesta tela */ }
    setTimeout(() => raiz.classList.remove('tema-trocando'), 320);
  }
  function criarBotao(solto) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tema-btn' + (solto ? ' tema-solto' : '');
    b.innerHTML =
      '<svg class="ico-lua" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z"/></svg>' +
      '<svg class="ico-sol" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/></svg>';
    b.addEventListener('click', trocar);
    atualizarBotao(b);
    return b;
  }

  /* 0) marca o papel de quem está logado (o topo já guarda o espaço certo, sem pulo) */
  try { const ses = JSON.parse(sessionStorage.getItem('pb_painel_sessao')); if (ses && ses.papel) raiz.setAttribute('data-sessao-papel', ses.papel); } catch (e) { /* sem sessão */ }

  /* 1) já aplica o tema salvo, antes da página aparecer */
  aplicar(lerTema());

  /* 2) põe o botão: no topo (ao lado do nome e do "Sair") e nas telas de login */
  function porBotoes() {
    document.querySelectorAll('.topo-user').forEach(u => {
      if (u.querySelector('.tema-btn')) return;
      const sair = u.querySelector('[data-sair]');
      u.insertBefore(criarBotao(false), sair || null);
    });
    document.querySelectorAll('.login-pagina, .login').forEach(l => {
      if (!l.querySelector('.tema-btn')) l.appendChild(criarBotao(true));
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', porBotoes);
  else porBotoes();

  /* 3) se mudar em outra aba do painel, acompanha */
  window.addEventListener('storage', e => { if (e.key === CHAVE) aplicar(lerTema()); });
})();
