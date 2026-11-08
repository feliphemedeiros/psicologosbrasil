/* =====================================================================
   CAMPO DE TELEFONE COM PAÍS (painel)
   ---------------------------------------------------------------------
   Transforma um <input type="tel"> em: [bandeira +código ▾] [número].
   · O país abre numa janela com busca (no celular, sobe de baixo).
   · No número só entram algarismos, com a máscara do país
     (Brasil "(85) 99999-9999", Portugal "912 345 678", EUA "(305) 555-1234").
   · O valor sai no formato do banco: "+5585999999999", "+351912345678".

   Uso:
     const tel = CampoTelefone(document.getElementById('c-whats'));
     tel.definir('+351912345678');   // mostra 🇵🇹 +351 e "912 345 678"
     tel.valor();                    // "+351912345678" (ou "" se vazio)
     tel.valido();                   // true / false
     tel.pais();                     // { iso, nome, ddi, min, max, ex }
   ===================================================================== */
(function () {
  'use strict';
  const BAND = (() => { try { return new URL('../../assets/imagens/bandeiras/', document.currentScript.src).href; } catch (e) { return '../assets/imagens/bandeiras/'; } })();
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const norm = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const REGIAO = { BR: 'América do Sul', AR: 'América do Sul', CL: 'América do Sul', UY: 'América do Sul', PY: 'América do Sul',
    US: 'América do Norte e Central', CA: 'América do Norte e Central', MX: 'América do Norte e Central',
    PT: 'Europa', GB: 'Europa', IE: 'Europa', ES: 'Europa', FR: 'Europa', IT: 'Europa', DE: 'Europa', CH: 'Europa', NL: 'Europa', BE: 'Europa',
    AO: 'África', MZ: 'África', JP: 'Ásia e Oceania', AU: 'Ásia e Oceania', AE: 'Ásia e Oceania', XX: 'Outros' };
  const ORDEM = ['América do Sul', 'Europa', 'América do Norte e Central', 'África', 'Ásia e Oceania', 'Outros'];
  const bandeira = (p, cls) => p.iso === 'XX'
    ? `<span class="${cls} ct-mundo" aria-hidden="true">🌍</span>`
    : `<img class="${cls}" src="${BAND}${p.iso.toLowerCase()}.webp" alt="" width="24" height="18" loading="lazy" decoding="async">`;

  /* máscara do número (sem o código do país) */
  function mascarar(p, valor) {
    if (p.iso === 'BR') {
      const n = U.digitos(valor).slice(0, 11);
      if (n.length > 7) return `(${n.slice(0, 2)}) ${n.slice(2, n.length === 11 ? 7 : 6)}-${n.slice(n.length === 11 ? 7 : 6)}`;
      if (n.length > 2) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
      return n;
    }
    const dg = U.digitos(valor).slice(0, p.iso === 'XX' ? 15 : p.max);
    if ((p.iso === 'US' || p.iso === 'CA') && dg.length > 3) return `(${dg.slice(0, 3)}) ${dg.slice(3, 6)}${dg.length > 6 ? '-' + dg.slice(6) : ''}`;
    return dg.replace(/(\d{3})(?=\d)/g, '$1 ');
  }

  window.CampoTelefone = function (input, o = {}) {
    let pais = U.paisTel('BR');
    const caixa = document.createElement('div');
    caixa.className = 'ct';
    input.parentNode.insertBefore(caixa, input);
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'ct-pais'; btn.setAttribute('aria-haspopup', 'dialog');
    caixa.append(btn, input);
    input.setAttribute('inputmode', 'tel');
    input.setAttribute('autocomplete', 'tel-national');

    function desenharBotao() {
      btn.innerHTML = `${bandeira(pais, 'ct-band')}<span class="ct-ddi">${pais.ddi ? '+' + pais.ddi : '+'}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`;
      btn.setAttribute('aria-label', `País do número: ${pais.nome}${pais.ddi ? ' +' + pais.ddi : ''}. Trocar`);
      btn.disabled = input.readOnly || input.disabled;
      input.placeholder = pais.iso === 'XX' ? 'Código do país + número' : pais.ex;
    }
    function definir(v) {
      const t = String(v || '').trim();
      if (!U.digitos(t)) { pais = U.paisTel(o.paisPadrao || 'BR'); input.value = ''; desenharBotao(); return; }
      pais = U.paisDoNumero(t);
      const n = U.digitos(U.whatsNormalizar(t));
      input.value = pais.iso === 'XX' ? n : mascarar(pais, n.slice(pais.ddi.length));
      desenharBotao();
    }
    function valor() {
      const d = U.digitos(input.value);
      if (!d) return '';
      if (pais.iso === 'XX') return '+' + d.replace(/^00/, '');
      return U.whatsNormalizar(d, pais.ddi);
    }
    function valido() {
      const d = U.digitos(input.value);
      if (!d) return true;
      if (pais.iso === 'XX') return d.length >= 8 && d.length <= 15;
      return d.length >= pais.min && d.length <= pais.max && U.whatsValido(valor());
    }
    function erro() {
      if (pais.iso === 'BR') return 'WhatsApp: coloque o DDD e o número (ex.: (85) 99999-9999).';
      if (pais.iso === 'XX') return 'WhatsApp: coloque o código do país e o número (8 a 15 algarismos).';
      return `WhatsApp de ${pais.nome}: ${pais.min === pais.max ? pais.min : `${pais.min} a ${pais.max}`} algarismos (ex.: ${pais.ex}).`;
    }

    /* só algarismos, com a máscara do país */
    input.addEventListener('input', () => {
      const fim = input.selectionStart === input.value.length;
      input.value = mascarar(pais, input.value);
      if (fim) input.setSelectionRange(input.value.length, input.value.length);
    });
    input.addEventListener('keydown', e => { if (e.key.length === 1 && !/[\d\s()+-]/.test(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault(); });

    /* janela de países */
    btn.addEventListener('click', () => {
      const fundo = document.createElement('div');
      fundo.className = 'ct-fundo';
      fundo.innerHTML = `<div class="ct-caixa" role="dialog" aria-modal="true" aria-labelledby="ct-tit">
        <span class="ct-alca" aria-hidden="true"></span>
        <div class="ct-cab"><h2 id="ct-tit">País do WhatsApp</h2><button type="button" class="ct-x" aria-label="Fechar">×</button></div>
        <label class="ct-busca"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input type="search" placeholder="Digite o país ou o código (ex.: 351)" aria-label="Buscar país ou código" autocomplete="off"></label>
        <div class="ct-lista" role="listbox" aria-labelledby="ct-tit"></div></div>`;
      document.body.appendChild(fundo);
      document.documentElement.classList.add('ct-aberto');
      const lista = fundo.querySelector('.ct-lista'), busca = fundo.querySelector('input');
      const op = p => `<button type="button" class="ct-op" role="option" aria-selected="${p.iso === pais.iso}" data-iso="${p.iso}">
        <span class="ct-op-band">${bandeira(p, 'ct-img')}</span><span class="ct-op-nome"><b>${esc(p.nome)}</b><small>${p.iso === 'XX' ? 'Digite o código do país e o número' : 'Ex.: ' + esc(p.ex)}</small></span>
        <span class="ct-op-ddi">${p.ddi ? '+' + p.ddi : ''}</span>${p.iso === pais.iso ? '<i aria-hidden="true">✓</i>' : ''}</button>`;
      const desenhar = () => {
        const q = norm(busca.value.trim()), qd = q.replace(/[^0-9]/g, '');
        const achados = U.PAISES_TEL.filter(p => !q || (qd && qd === q.replace(/[+\s]/g, '') ? p.ddi.startsWith(qd) : norm(`${p.nome} ${p.iso}`).includes(q)));
        if (!achados.length) { lista.innerHTML = `<p class="ct-vazio">Não achamos "${esc(busca.value.trim())}". Use <b>Outro país</b>, no fim da lista.</p>`; return; }
        lista.innerHTML = ORDEM.map(g => { const l = achados.filter(p => (REGIAO[p.iso] || 'Outros') === g); return l.length ? `<p class="ct-grupo">${g}</p>${l.map(op).join('')}` : ''; }).join('');
      };
      desenhar();
      const fechar = () => { fundo.remove(); document.documentElement.classList.remove('ct-aberto'); document.removeEventListener('keydown', tecla); };
      const tecla = e => { if (e.key === 'Escape') { fechar(); btn.focus(); } };
      document.addEventListener('keydown', tecla);
      busca.addEventListener('input', desenhar);
      busca.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const b = lista.querySelector('.ct-op'); if (b) b.click(); } });
      fundo.addEventListener('click', e => {
        if (e.target === fundo || e.target.closest('.ct-x')) { fechar(); btn.focus(); return; }
        const b = e.target.closest('.ct-op'); if (!b) return;
        const novo = U.paisTel(b.dataset.iso);
        fechar();
        if (novo.iso !== pais.iso) { pais = novo; input.value = ''; desenharBotao(); input.dispatchEvent(new Event('input', { bubbles: true })); }
        input.focus();
      });
      const sel = lista.querySelector('[aria-selected="true"]'); if (sel) sel.scrollIntoView({ block: 'center' });
      if (matchMedia('(hover: hover) and (pointer: fine)').matches) busca.focus();
    });

    definir(o.valor || input.value);
    return { definir, valor, valido, erro, pais: () => pais, atualizar: desenharBotao };
  };
})();
