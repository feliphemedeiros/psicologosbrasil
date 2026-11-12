/* Celular: botão "Mais" nas barras fixas de baixo (perfil e artigo).
   Usado pelas páginas psicologos.html, artigos.html, usuarios.html e config.html. Os arquivos rodam em ordem e dividem as mesmas variáveis. */
/* celular: botão "Mais" nas barras fixas de baixo (perfil e artigo) — mostra/esconde as outras ações */
document.querySelectorAll('.rodape-fixo .acoes').forEach(ac => {
  if (ac.querySelector('.barra-mais')) return;
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'btn barra-mais'; b.setAttribute('aria-expanded', 'false');
  b.innerHTML = 'Mais <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg>';
  ac.insertBefore(b, ac.querySelector('.primario'));
  b.addEventListener('click', () => {
    const barra = ac.closest('.rodape-fixo'), abrir = !barra.classList.contains('mais-aberto');
    barra.classList.toggle('mais-aberto', abrir);
    b.setAttribute('aria-expanded', String(abrir));
    b.firstChild.textContent = abrir ? 'Menos ' : 'Mais ';
  });
});
