/* =====================================================================
   PAGINAÇÃO — usada em Psicólogos (12 por página) e na Agenda
   (pré-reservas: 6 por página; tabela de atendimentos: 20 por página).
   Uso:
     const r = Paginacao.fatiar(lista, pagina, porPagina);
     el.innerHTML = Paginacao.html(r, ['psicólogo', 'psicólogos']);
     Paginacao.ligar(el, n => { pagina = n; render(); });
   ===================================================================== */
(function () {
  const plural = (n, um, varios) => `${n.toLocaleString('pt-BR')} ${n === 1 ? um : varios}`;
  window.Paginacao = {
    fatiar(lista, pag, por) {
      const total = lista.length, paginas = Math.max(1, Math.ceil(total / por));
      pag = Math.min(Math.max(1, pag || 1), paginas);
      const ini = (pag - 1) * por;
      return { itens: lista.slice(ini, ini + por), total, paginas, pag, ini, fim: Math.min(ini + por, total) };
    },
    html(r, nome) {
      if (!r.total) return '';
      const nums = [];
      for (let i = 1; i <= r.paginas; i++) if (i === 1 || i === r.paginas || Math.abs(i - r.pag) <= 1) nums.push(i);
      let botoes = '', ant = 0;
      nums.forEach(n => {
        if (n - ant > 1) botoes += '<span class="ret">…</span>';
        botoes += `<button type="button" data-pag="${n}" class="${n === r.pag ? 'on' : ''}" ${n === r.pag ? 'aria-current="page"' : ''}>${n}</button>`;
        ant = n;
      });
      return `<span>Mostrando ${(r.ini + 1).toLocaleString('pt-BR')}–${r.fim.toLocaleString('pt-BR')} de ${plural(r.total, nome[0], nome[1])}</span>` +
        (r.paginas > 1 ? `<span class="pags"><button type="button" data-pag="${r.pag - 1}" ${r.pag === 1 ? 'disabled' : ''} aria-label="Página anterior">‹</button>${botoes}<button type="button" data-pag="${r.pag + 1}" ${r.pag === r.paginas ? 'disabled' : ''} aria-label="Próxima página">›</button></span>` : '');
    },
    /* liga os cliques; ao trocar de página, sobe até o começo da lista */
    ligar(el, aoTrocar, topo) {
      el.addEventListener('click', e => {
        const b = e.target.closest('button[data-pag]');
        if (!b || b.disabled) return;
        aoTrocar(Number(b.dataset.pag));
        const alvo = topo || el;
        const y = alvo.getBoundingClientRect().top + scrollY - 140;
        if (y < scrollY) scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
      });
    }
  };
})();
