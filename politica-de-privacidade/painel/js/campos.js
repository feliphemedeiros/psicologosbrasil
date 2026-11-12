/* =====================================================================
   CAMPOS DO PAINEL — listas (select) e datas com a cara do painel
   ---------------------------------------------------------------------
   No computador, as listas que abrem (<select>) e os calendários dos
   campos de data e mês abrem uma caixinha própria, com bordas redondas
   e as cores do painel (claro e escuro), no lugar da do navegador.
   No celular continua a do próprio aparelho (é mais fácil de usar).

   Não precisa mudar nada nas telas: os campos continuam os mesmos
   (mesmo id, mesmo valor, mesmos eventos "input" e "change").
   Carregado em todas as páginas do painel, com "defer".
   ===================================================================== */
(function () {
  'use strict';
  /* só com mouse (computador); no toque fica o seletor do aparelho */
  const COMPUTADOR = window.matchMedia('(hover: hover) and (pointer: fine)');
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const MESES_C = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const SEMANA = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  let aberta = null;   /* { caixa, campo, fechar } */

  function avisar(el) {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function fecharAberta(voltarFoco) {
    if (!aberta) return;
    const a = aberta; aberta = null;
    a.caixa.remove();
    a.campo.classList.remove('pc-aberto');
    a.campo.setAttribute('aria-expanded', 'false');
    if (voltarFoco) try { a.campo.focus({ preventScroll: true }); } catch (e) { /* ok */ }
  }
  /* coloca a caixinha embaixo do campo (ou em cima, se não couber) */
  function posicionar(caixa, campo) {
    const r = campo.getBoundingClientRect();
    if (caixa.classList.contains('pc-lista')) caixa.style.minWidth = r.width + 'px';
    const h = caixa.offsetHeight, w = caixa.offsetWidth;
    const embaixo = innerHeight - r.bottom, cima = r.top;
    const top = (embaixo < h + 12 && cima > embaixo) ? r.top - h - 6 : r.bottom + 6;
    const left = Math.min(Math.max(8, r.left), innerWidth - w - 8);
    caixa.style.top = Math.max(8, top) + 'px';
    caixa.style.left = left + 'px';
  }
  function abrir(campo, caixa, aoTecla) {
    fecharAberta(false);
    document.body.appendChild(caixa);
    campo.classList.add('pc-aberto');
    campo.setAttribute('aria-expanded', 'true');
    posicionar(caixa, campo);
    aberta = { caixa, campo, aoTecla };
  }
  document.addEventListener('mousedown', e => {
    if (aberta && !aberta.caixa.contains(e.target) && e.target !== aberta.campo) fecharAberta(false);
  }, true);
  window.addEventListener('resize', () => fecharAberta(false));
  document.addEventListener('scroll', e => { if (aberta && !aberta.caixa.contains(e.target)) posicionar(aberta.caixa, aberta.campo); }, true);
  document.addEventListener('keydown', e => {
    if (!aberta) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fecharAberta(true); return; }
    if (e.key === 'Tab') { fecharAberta(false); return; }
    if (aberta.aoTecla) aberta.aoTecla(e);
  }, true);

  /* ================= LISTAS (select) ================= */
  function abrirLista(sel) {
    const caixa = document.createElement('div');
    caixa.className = 'pc-pop pc-lista';
    caixa.setAttribute('role', 'listbox');
    const itens = [];
    let html = '';
    [...sel.children].forEach(n => {
      if (n.tagName === 'OPTGROUP') {
        html += `<div class="pc-grupo">${esc(n.label)}</div>`;
        [...n.children].forEach(o => { itens.push(o); html += item(o, itens.length - 1); });
      } else if (n.tagName === 'OPTION') { itens.push(n); html += item(n, itens.length - 1); }
    });
    function item(o, i) {
      return `<div class="pc-op${o.selected ? ' sel' : ''}${o.disabled ? ' off' : ''}" role="option" aria-selected="${o.selected}" data-i="${i}">${esc(o.textContent)}</div>`;
    }
    caixa.innerHTML = html || '<div class="pc-op off">Sem opções</div>';
    let ativo = Math.max(0, itens.findIndex(o => o.selected));
    const els = () => [...caixa.querySelectorAll('.pc-op[data-i]')];
    const marcar = i => {
      const L = els(); if (!L.length) return;
      ativo = Math.max(0, Math.min(i, L.length - 1));
      L.forEach(x => x.classList.remove('ativo'));
      L[ativo].classList.add('ativo');
      L[ativo].scrollIntoView({ block: 'nearest' });
    };
    const escolher = i => {
      const o = itens[i]; if (!o || o.disabled) return;
      const mudou = sel.selectedIndex !== o.index;
      sel.selectedIndex = o.index;
      fecharAberta(true);
      if (mudou) avisar(sel);
    };
    let busca = '', tBusca;
    abrir(sel, caixa, e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); marcar(ativo + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); marcar(ativo - 1); }
      else if (e.key === 'Home') { e.preventDefault(); marcar(0); }
      else if (e.key === 'End') { e.preventDefault(); marcar(itens.length - 1); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); escolher(ativo); }
      else if (e.key.length === 1) {   /* digitar pula para a opção */
        busca += e.key.toLowerCase(); clearTimeout(tBusca); tBusca = setTimeout(() => { busca = ''; }, 700);
        const n = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
        const j = itens.findIndex(o => n(o.textContent.trim()).startsWith(n(busca)));
        if (j >= 0) marcar(j);
      }
    });
    marcar(ativo);
    caixa.addEventListener('mousedown', e => e.preventDefault());   /* o foco fica no campo */
    caixa.addEventListener('click', e => { const b = e.target.closest('.pc-op[data-i]'); if (b) escolher(Number(b.dataset.i)); });
    caixa.addEventListener('mousemove', e => { const b = e.target.closest('.pc-op[data-i]'); if (b && Number(b.dataset.i) !== ativo) marcar(Number(b.dataset.i)); });
  }
  function ligarLista(sel) {
    if (sel.multiple || Number(sel.size) > 1 || sel.dataset.nativo != null) return;
    sel.classList.add('pc-sel');
    sel.setAttribute('aria-haspopup', 'listbox');
    sel.addEventListener('mousedown', e => {
      if (!COMPUTADOR.matches || sel.disabled || e.button !== 0) return;
      e.preventDefault();
      sel.focus({ preventScroll: true });
      if (aberta && aberta.campo === sel) fecharAberta(false); else abrirLista(sel);
    });
    sel.addEventListener('keydown', e => {
      if (!COMPUTADOR.matches || sel.disabled || (aberta && aberta.campo === sel)) return;
      if (e.key === 'Enter' || e.key === ' ' || (e.altKey && e.key === 'ArrowDown') || e.key === 'F4') { e.preventDefault(); abrirLista(sel); }
    });
  }

  /* ================= DATAS (date) e MESES (month) ================= */
  function lerData(v) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function abrirCalendario(inp) {
    const mes = inp.type === 'month';
    const caixa = document.createElement('div');
    caixa.className = 'pc-pop pc-cal' + (mes ? ' pc-cal-mes' : '');
    const hoje = new Date();
    const atual = mes ? lerData((inp.value || '') + '-01') : lerData(inp.value);
    let vista = atual ? new Date(atual) : new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    vista.setDate(1);
    const min = inp.min || '', max = inp.max || '';
    const fora = v => (min && v < min) || (max && v > max);

    function desenhar() {
      const y = vista.getFullYear(), m = vista.getMonth();
      if (mes) {
        caixa.innerHTML = `<div class="pc-cal-topo"><button type="button" class="pc-nav" data-ano="-1" aria-label="Ano anterior">‹</button><b>${y}</b><button type="button" class="pc-nav" data-ano="1" aria-label="Próximo ano">›</button></div>
          <div class="pc-meses">${MESES_C.map((n, i) => { const v = `${y}-${pad(i + 1)}`; return `<button type="button" class="pc-mes${inp.value === v ? ' sel' : ''}${v === iso(hoje).slice(0, 7) ? ' hoje' : ''}" data-v="${v}" ${fora(v) ? 'disabled' : ''}>${n}</button>`; }).join('')}</div>
          <div class="pc-cal-pe"><button type="button" class="pc-link" data-v="${iso(hoje).slice(0, 7)}">Este mês</button>${inp.required ? '' : '<button type="button" class="pc-link" data-limpar>Limpar</button>'}</div>`;
        return;
      }
      const antes = (new Date(y, m, 1).getDay() + 6) % 7;
      const total = new Date(y, m + 1, 0).getDate();
      let dias = '<span></span>'.repeat(antes);
      for (let d = 1; d <= total; d++) {
        const v = `${y}-${pad(m + 1)}-${pad(d)}`;
        dias += `<button type="button" class="pc-dia${inp.value === v ? ' sel' : ''}${v === iso(hoje) ? ' hoje' : ''}" data-v="${v}" ${fora(v) ? 'disabled' : ''}>${d}</button>`;
      }
      caixa.innerHTML = `<div class="pc-cal-topo"><button type="button" class="pc-nav" data-mes="-1" aria-label="Mês anterior">‹</button><b>${MESES[m].replace(/^./, c => c.toUpperCase())} de ${y}</b><button type="button" class="pc-nav" data-mes="1" aria-label="Próximo mês">›</button></div>
        <div class="pc-semana">${SEMANA.map(s => `<span>${s}</span>`).join('')}</div>
        <div class="pc-dias">${dias}</div>
        <div class="pc-cal-pe"><button type="button" class="pc-link" data-v="${iso(hoje)}" ${fora(iso(hoje)) ? 'disabled' : ''}>Hoje</button>${inp.required ? '' : '<button type="button" class="pc-link" data-limpar>Limpar</button>'}</div>`;
    }
    function escolher(v) {
      const mudou = inp.value !== v;
      inp.value = v;
      fecharAberta(true);
      if (mudou) avisar(inp);
    }
    desenhar();
    abrir(inp, caixa, null);
    caixa.addEventListener('mousedown', e => e.preventDefault());
    caixa.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      if (b.dataset.mes) { vista.setMonth(vista.getMonth() + Number(b.dataset.mes)); desenhar(); posicionar(caixa, inp); }
      else if (b.dataset.ano) { vista.setFullYear(vista.getFullYear() + Number(b.dataset.ano)); desenhar(); }
      else if ('limpar' in b.dataset) escolher('');
      else if (b.dataset.v) escolher(b.dataset.v);
    });
  }
  function ligarData(inp) {
    inp.classList.add('pc-data');
    inp.addEventListener('click', e => {
      if (!COMPUTADOR.matches || inp.disabled || inp.readOnly) return;
      e.preventDefault();
      if (aberta && aberta.campo === inp) fecharAberta(false); else abrirCalendario(inp);
    });
    inp.addEventListener('keydown', e => {
      if (!COMPUTADOR.matches || inp.disabled || inp.readOnly) return;
      if ((e.altKey && e.key === 'ArrowDown') || e.key === 'F4' || (e.key === 'Enter' && !(aberta && aberta.campo === inp))) { e.preventDefault(); abrirCalendario(inp); }
    });
  }

  /* ================= liga em tudo (também no que aparecer depois) ================= */
  function ligar(raiz) {
    (raiz.querySelectorAll ? raiz : document).querySelectorAll('select:not([data-pc]), input[type=date]:not([data-pc]), input[type=month]:not([data-pc])').forEach(el => {
      el.setAttribute('data-pc', '');
      if (el.tagName === 'SELECT') ligarLista(el); else ligarData(el);
    });
  }
  function iniciar() {
    /* avisos logo abaixo do menu do topo (a altura do menu muda de tela para tela) */
    const topo = () => { const t = document.querySelector('.topo'); const b = t ? t.getBoundingClientRect().bottom : 0; document.documentElement.style.setProperty('--pc-aviso-topo', Math.max(12, Math.round(b) + 12) + 'px'); };
    topo(); window.addEventListener('resize', topo); window.addEventListener('scroll', topo, { passive: true });
    /* clicar no aviso fecha */
    document.addEventListener('click', e => { const t = e.target.closest('#toast .toast, #toasts .toast'); if (t) t.remove(); });
    ligar(document);
    new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) { if (n.matches && n.matches('select, input[type=date], input[type=month]')) ligar(n.parentNode || document); else ligar(n); } }))).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
