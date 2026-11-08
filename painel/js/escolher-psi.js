/* =====================================================================
   ESCOLHER PSICÓLOGO — campo com busca para filtros (feito para 600+ psicólogos)
   ---------------------------------------------------------------------
   Troca uma <select> comum por um campo que:
   · ao abrir, mostra só os 5 que mais atenderam nos últimos 30 dias, com a
     quantidade de sessões (a lista nunca fica grande, mesmo com 600);
   · digitando, procura em TODOS por nome ou CRP (sem ligar para acento),
     mostrando até 8 nomes;
   · escolhido, mostra as iniciais + nome e um × para voltar a "Todos".
   A <select> original continua existindo (escondida) com o mesmo id, valor
   e evento "change": o resto da tela não precisa mudar nada.

   Uso:
     const ep = EscolherPsi(selectEl, {
       lista:  () => [{ id, nome, crp }],
       contar: async () => ({ por: { psiId: n },   // sessões em 30 dias (destaque e selos)
                              total: n })         // sessões no filtro atual (linha "Todos")
     });
     ep.atualizar();       // depois de mudar a lista ou o valor por código
     ep.escolher(psiId);   // escolhe e dispara "change"
   ===================================================================== */
(function () {
  'use strict';
  const MAX = 8;          /* nomes ao digitar */
  const DESTAQUE = 5;     /* nomes ao abrir, sem digitar */
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const norm = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const iniciais = n => {
    const p = String(n || '').trim().split(/\s+/).filter(w => w.length > 2 || /^[A-ZÁÉÍÓÚ]/.test(w));
    return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  };
  const sessoes = n => `${n} ${n === 1 ? 'sessão' : 'sessões'}`;
  const SETA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  const LUPA = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';

  function marcar(nome, q) {
    if (!q) return esc(nome);
    const n = norm(nome), i = n.indexOf(q);
    if (i < 0) return esc(nome);
    return esc(nome.slice(0, i)) + '<mark>' + esc(nome.slice(i, i + q.length)) + '</mark>' + esc(nome.slice(i + q.length));
  }

  window.EscolherPsi = function (sel, o) {
    sel.hidden = true;
    sel.dataset.pc = '1';              /* campos.js não mexe nela */
    const raiz = document.createElement('div');
    raiz.className = 'ep';
    raiz.innerHTML = `<button type="button" class="ep-btn" aria-haspopup="listbox" aria-expanded="false"></button>`;
    sel.after(raiz);
    const lbl = document.querySelector(`label[for="${sel.id}"]`);
    const btn = raiz.querySelector('.ep-btn');
    if (lbl) { lbl.htmlFor = ''; lbl.addEventListener('click', () => btn.focus()); btn.setAttribute('aria-label', lbl.textContent.trim()); }

    let pop = null, ativo = 0, itens = [], contagem = null;

    function desenharBotao() {
      const p = sel.value ? o.lista().find(x => x.id === sel.value) : null;
      btn.innerHTML = p
        ? `<span class="ep-esc"><span class="ep-av" aria-hidden="true">${esc(iniciais(p.nome))}</span><span class="ep-nome">${esc(p.nome)}</span></span><span class="ep-x" role="button" tabindex="-1" aria-label="Voltar para todos os psicólogos" title="Todos os psicólogos">×</span>`
        : `<span class="ep-nome">Todos os psicólogos</span>${SETA}`;
      raiz.classList.toggle('tem', !!p);
    }

    function escolher(id) {
      fechar();
      if (sel.value === (id || '')) { desenharBotao(); return; }
      if (id && !Array.from(sel.options).some(op => op.value === id)) sel.add(new Option('', id));
      sel.value = id || '';
      desenharBotao();
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function linha(p, q, i) {
      const n = contagem && contagem.por[p.id];
      return `<div class="ep-op${i === ativo ? ' foco' : ''}${p.id === sel.value ? ' on' : ''}" role="option" id="${sel.id}-ep${i}" data-i="${i}" aria-selected="${p.id === sel.value}">
        <span class="ep-av" aria-hidden="true">${esc(iniciais(p.nome))}</span>
        <span class="ep-txt"><b>${marcar(p.nome, q)}</b>${p.crp ? `<small>CRP ${esc(p.crp)}</small>` : ''}</span>
        ${n ? `<span class="ep-q">${sessoes(n)}</span>` : ''}</div>`;
    }

    function desenharLista() {
      const caixa = pop.querySelector('.ep-lista');
      const qBruto = pop.querySelector('input').value.trim(), q = norm(qBruto), qd = qBruto.replace(/\D/g, '');
      const todos = o.lista();
      let html = '';
      itens = [];
      if (!q) {
        itens.push({ id: '' });
        html += `<div class="ep-op ep-todos${ativo === 0 ? ' foco' : ''}${!sel.value ? ' on' : ''}" role="option" id="${sel.id}-ep0" data-i="0" aria-selected="${!sel.value}"><span class="ep-txt"><b>Todos os psicólogos</b></span>${contagem ? `<span class="ep-q">${sessoes(contagem.total)}</span>` : ''}</div>`;
        if (!contagem) { html += '<p class="ep-nota">Contando os atendimentos…</p>'; }
        else {
          const top = todos.filter(p => contagem.por[p.id]).sort((a, b) => contagem.por[b.id] - contagem.por[a.id] || a.nome.localeCompare(b.nome, 'pt-BR')).slice(0, DESTAQUE);
          if (top.length) {
            html += `<p class="ep-grupo">Mais atendimentos nos últimos 30 dias</p>`;
            top.forEach(p => { html += linha(p, '', itens.length); itens.push(p); });
          }
          const resto = todos.length - top.length;
          html += `<p class="ep-nota">${top.length ? '' : 'Ninguém atendeu nos últimos 30 dias. '}${resto > 0 ? `Para ${top.length ? `os outros ${resto}` : `qualquer um dos ${resto}`} psicólogos, digite o nome ou o CRP.` : ''}</p>`;
        }
      } else {
        const achados = todos.filter(p => norm(p.nome).includes(q) || (qd.length >= 2 && String(p.crp || '').replace(/\D/g, '').includes(qd)))
          .sort((a, b) => (norm(b.nome).startsWith(q) - norm(a.nome).startsWith(q)) || (((contagem && contagem.por[b.id]) || 0) - ((contagem && contagem.por[a.id]) || 0)) || a.nome.localeCompare(b.nome, 'pt-BR'));
        if (!achados.length) html = `<p class="ep-nota">Nenhum psicólogo com "${esc(qBruto)}". Confira o nome ou procure pelo CRP.</p>`;
        else {
          html += `<p class="ep-grupo">${achados.length === 1 ? '1 encontrado' : `${achados.length} encontrados`}</p>`;
          achados.slice(0, MAX).forEach(p => { html += linha(p, q, itens.length); itens.push(p); });
          if (achados.length > MAX) html += `<p class="ep-nota">E mais ${achados.length - MAX}: continue digitando.</p>`;
        }
      }
      if (ativo >= itens.length) ativo = Math.max(0, itens.length - 1);
      caixa.innerHTML = html;
      const f = caixa.querySelector('.foco');
      pop.querySelector('input').setAttribute('aria-activedescendant', f ? f.id : '');
    }

    function mover(d) {
      if (!itens.length) return;
      ativo = (ativo + d + itens.length) % itens.length;
      pop.querySelectorAll('.ep-op').forEach(el => el.classList.toggle('foco', Number(el.dataset.i) === ativo));
      const f = pop.querySelector('.ep-op.foco');
      if (f) { f.scrollIntoView({ block: 'nearest' }); pop.querySelector('input').setAttribute('aria-activedescendant', f.id); }
    }

    async function abrir() {
      if (pop) return;
      contagem = null;
      pop = document.createElement('div');
      pop.className = 'ep-pop';
      pop.innerHTML = `<label class="ep-busca">${LUPA}<input type="search" placeholder="Digite o nome ou o CRP" aria-label="Procurar psicólogo pelo nome ou CRP" autocomplete="off" role="combobox" aria-expanded="true" aria-controls="${sel.id}-ep-lista"></label><div class="ep-lista" role="listbox" id="${sel.id}-ep-lista"></div>`;
      raiz.appendChild(pop);
      raiz.classList.add('aberto');
      btn.setAttribute('aria-expanded', 'true');
      const inp = pop.querySelector('input');
      ativo = 0;
      desenharLista();
      inp.focus();
      inp.addEventListener('input', () => { ativo = 0; desenharLista(); });
      inp.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown') { e.preventDefault(); mover(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); mover(-1); }
        else if (e.key === 'Enter') { e.preventDefault(); if (itens[ativo]) escolher(itens[ativo].id); }
        else if (e.key === 'Escape') { e.preventDefault(); fechar(); btn.focus(); }
        else if (e.key === 'Tab') fechar();
      });
      pop.addEventListener('mousedown', e => { if (e.target.closest('.ep-op')) e.preventDefault(); });
      pop.addEventListener('click', e => { const op = e.target.closest('.ep-op'); if (op && itens[Number(op.dataset.i)]) escolher(itens[Number(op.dataset.i)].id); });
      pop.addEventListener('mousemove', e => { const op = e.target.closest('.ep-op'); if (op && Number(op.dataset.i) !== ativo) { ativo = Number(op.dataset.i); pop.querySelectorAll('.ep-op').forEach(el => el.classList.toggle('foco', Number(el.dataset.i) === ativo)); } });
      try { contagem = o.contar ? await o.contar() : null; } catch (e) { contagem = null; }
      if (pop) desenharLista();
    }

    function fechar() {
      if (!pop) return;
      pop.remove(); pop = null;
      raiz.classList.remove('aberto');
      btn.setAttribute('aria-expanded', 'false');
    }

    btn.addEventListener('click', e => {
      if (e.target.closest('.ep-x')) { e.stopPropagation(); escolher(''); btn.focus(); return; }
      if (pop) fechar(); else abrir();
    });
    btn.addEventListener('keydown', e => {
      if ((e.key === 'Backspace' || e.key === 'Delete') && sel.value) { e.preventDefault(); escolher(''); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); abrir(); }
    });
    document.addEventListener('mousedown', e => { if (pop && !raiz.contains(e.target)) fechar(); });
    sel.addEventListener('change', desenharBotao);

    desenharBotao();
    return { atualizar: desenharBotao, escolher, fechar };
  };
})();
