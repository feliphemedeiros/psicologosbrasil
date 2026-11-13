/* =====================================================================
   "Conheça o psicólogo em 15 minutos" — Psicólogos Brasil
   Questionário em etapas (página /conhecer/). No fim a pessoa deixa
   nome, WhatsApp e e-mail e as respostas vão para a equipe (DB.enviarConhecer).

   Para mudar perguntas ou opções, mexa só na lista ETAPAS abaixo.
   ===================================================================== */
(function () {
  'use strict';

  /* ---------- ícones (traço) ---------- */
  const I = {
    montanha: '<path d="M3 19l6-10 4 6 2-3 6 7z"/><circle cx="16" cy="6" r="1.6"/>',
    conversa: '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h7A2.5 2.5 0 0 1 16 6.5v4A2.5 2.5 0 0 1 13.5 13H9l-3.5 3v-3A2.5 2.5 0 0 1 4 10.5z"/><path d="M16 9h1.5A2.5 2.5 0 0 1 20 11.5v4a2.5 2.5 0 0 1-2 2.45V20l-3-2.5h-3.5A2.5 2.5 0 0 1 9 15v-.5"/>',
    broto: '<path d="M12 21v-8"/><path d="M12 13c0-4 3-6.5 8-6.5 0 4.5-3 6.5-8 6.5z"/><path d="M12 15c0-3.2-2.4-5.2-7-5.2 0 3.6 2.4 5.2 7 5.2z"/>',
    boia: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"/><path d="M6 6l3.5 3.5M18 6l-3.5 3.5M6 18l3.5-3.5M18 18l-3.5-3.5"/>',
    digital: '<path d="M7.5 18.5c1.2-1.8 1.8-4 1.8-6.5a2.7 2.7 0 0 1 5.4 0c0 3-.6 5.6-1.8 7.8"/><path d="M5 15c.5-1 .8-2 .8-3a6.2 6.2 0 0 1 12.4 0c0 1.6-.2 3.2-.6 4.6"/><path d="M12 12c0 3-.8 5.6-2.2 7.6"/>',
    medalha: '<circle cx="12" cy="9" r="5"/><path d="M9 13.5L7.5 21l4.5-2.5 4.5 2.5L15 13.5"/>',
    passos: '<path d="M7 4.5c1.6 0 2.5 1.7 2.5 3.6S8.6 12 7 12s-2.5-1.9-2.5-3.9S5.4 4.5 7 4.5z"/><path d="M4.8 14.5h4.4v1.8a2.2 2.2 0 0 1-4.4 0z"/><path d="M17 4.5c1.6 0 2.5 1.7 2.5 3.6S18.6 12 17 12s-2.5-1.9-2.5-3.9.9-3.6 2.5-3.6z"/><path d="M14.8 14.5h4.4v1.8a2.2 2.2 0 0 1-4.4 0z"/>',
    balanca: '<path d="M12 4v16M8 20h8M5 7h14"/><path d="M5 7l-2.5 6a2.5 2.5 0 0 0 5 0zM19 7l-2.5 6a2.5 2.5 0 0 0 5 0z"/>',
    borboleta: '<path d="M12 8v11"/><path d="M12 10C10 5.5 4 4 4 8.5c0 2.8 2.6 4 5 3.6C6 13.4 6 17.5 9 17.5c1.8 0 3-2.2 3-4.5"/><path d="M12 10c2-4.5 8-6 8-1.5 0 2.8-2.6 4-5 3.6 3 1.3 3 5.4 0 5.4-1.8 0-3-2.2-3-4.5"/>',
    maleta: '<rect x="3.5" y="7.5" width="17" height="12" rx="2"/><path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M3.5 13h17"/>',
    orelha: '<path d="M7 9a5 5 0 0 1 10 0c0 2.5-1.5 3.6-2.7 4.7C13 14.9 13 16 13 17a3 3 0 0 1-5.2 2"/><path d="M10 9a2 2 0 0 1 4 0c0 1-.6 1.6-1.4 2"/>',
    alvo: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/><path d="M15 9l5-5"/>',
    lotus: '<path d="M12 19c-4 0-8-2.5-8-6 2 0 4 .8 5 2"/><path d="M12 19c4 0 8-2.5 8-6-2 0-4 .8-5 2"/><path d="M12 19c-2.3-1.5-3.5-4-3.5-6.5S10 7 12 5c2 2 3.5 5 3.5 7.5S14.3 17.5 12 19z"/>',
    lampada: '<path d="M9 17.5h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2V17h5v-1.2c.1-.8.5-1.5 1.1-2A6 6 0 0 0 12 3z"/>',
    diploma: '<rect x="3.5" y="5" width="13" height="10" rx="1.5"/><path d="M6.5 9h7M6.5 12h4"/><circle cx="18" cy="15" r="2.6"/><path d="M16.8 17.3L16 21l2-1 2 1-.8-3.7"/>',
    raio: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>',
    arco: '<path d="M3 18a9 9 0 0 1 18 0"/><path d="M6.5 18a5.5 5.5 0 0 1 11 0"/><path d="M10 18a2 2 0 0 1 4 0"/>',
    pessoa: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20c.8-3.6 3.6-5.6 7-5.6s6.2 2 7 5.6"/>',
    nascer: '<path d="M3 18h18M7 21h10"/><path d="M7 18a5 5 0 0 1 10 0"/><path d="M12 6v2M5.6 9.6l1.4 1.4M18.4 9.6L17 11M3 14h1.5M19.5 14H21"/>',
    sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>',
    lua: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    calendario: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    relogio: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    seta: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    ok: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    whats: '<path d="M20 11.5a8 8 0 0 1-11.9 7L4 20l1.5-4A8 8 0 1 1 20 11.5z"/>',
    presente: '<rect x="3.5" y="8.5" width="17" height="4" rx="1"/><path d="M5 12.5v7a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5v-7M12 8.5V21"/><path d="M12 8.5S10.8 4 8.3 4a2.2 2.2 0 0 0 0 4.5zM12 8.5S13.2 4 15.7 4a2.2 2.2 0 0 1 0 4.5z"/>'
  };
  const svg = (n, w = 22) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;

  /* ---------- as 6 perguntas (+ contato no fim) ---------- */
  const ETAPAS = [
    { id: 'tipoSessao', nome: 'Tipo', titulo: 'Tipo de sessão', sub: 'Para quem é o acompanhamento?', tipo: 'cartoes', obrig: true,
      opcoes: [
        { v: 'Individual', pontos: 'p1', d: 'Para mim' }, { v: 'Casal', pontos: 'p2', d: 'Eu e meu par' },
        { v: 'Criança', pontos: 'p3', d: 'Até 12 anos' }, { v: 'Adolescente', pontos: 'p4', d: '13 a 17 anos' },
        { v: 'Família', pontos: 'p5', d: 'Pais, filhos e quem mora junto' }
      ] },
    { id: 'motivos', nome: 'Motivos', titulo: 'O que traz você aqui?', sub: 'Escolha tudo o que se aplica.', tipo: 'bolhas', obrig: true,
      opcoes: ['Ansiedade', 'Depressão', 'Burnout', 'Luto', 'Autoestima', 'Trauma', 'Estresse', 'Relacionamentos', 'Dependências', 'Sono', 'TOC', 'TEPT', 'Alimentação', 'Raiva', 'Família', 'Estudos', 'Carreira', 'TDAH e autismo', 'Outro'] },
    { id: 'objetivos', nome: 'Objetivos', titulo: 'Quais são os seus objetivos?', sub: 'Escolha um ou mais.', tipo: 'chips',
      opcoes: [
        { v: 'Lidar com desafios', i: 'montanha' }, { v: 'Melhorar relações', i: 'conversa' },
        { v: 'Crescimento pessoal', i: 'broto' }, { v: 'Cuidar das emoções', i: 'boia' },
        { v: 'Me conhecer melhor', i: 'digital' }, { v: 'Ganhar confiança', i: 'medalha' },
        { v: 'Superar medos', i: 'passos' }, { v: 'Vida e trabalho', i: 'balanca' },
        { v: 'Lidar com o passado', i: 'borboleta' }, { v: 'Ferramentas práticas', i: 'maleta' }
      ] },
    { id: 'preferencias', nome: 'Estilo', titulo: 'Como prefere o psicólogo?', sub: 'Opcional. Marque o que for importante.', tipo: 'chips',
      opcoes: [
        { v: 'Acolhedor', i: 'orelha' }, { v: 'Direto e prático', i: 'alvo' },
        { v: 'Mindfulness', i: 'lotus' }, { v: 'Focado em soluções', i: 'lampada' },
        { v: 'Experiente', i: 'diploma' }, { v: 'Jovem e dinâmico', i: 'raio' },
        { v: 'LGBTQIA+ friendly', i: 'arco' }, { v: 'Psicóloga mulher', i: 'pessoa' },
        { v: 'Psicólogo homem', i: 'pessoa' }
      ] },
    { id: 'horario', nome: 'Horários', titulo: 'Quando você tem disponibilidade?', sub: '', tipo: 'lista', obrig: true,
      opcoes: [
        { v: 'Manhãs', i: 'nascer' }, { v: 'Tardes', i: 'sol' }, { v: 'Noites', i: 'lua' },
        { v: 'Fim de semana', i: 'calendario' }, { v: 'Qualquer horário', i: 'relogio' }
      ],
      desc: { 'Manhãs': '8h às 12h', 'Tardes': '12h às 18h', 'Noites': '18h às 22h', 'Fim de semana': 'Sábado e domingo', 'Qualquer horário': 'Eu me adapto' },
      dica: v => v === 'Qualquer horário' ? 'Perfeito: procuramos psicólogos em qualquer horário.' : `Certo: procuramos psicólogos com horários ${v === 'Fim de semana' ? 'no fim de semana' : 'de ' + v.toLowerCase()}.` },
    { id: 'sobre', nome: 'Sobre você', titulo: 'Conte um pouco sobre você', sub: 'Duas ou três frases bastam.', tipo: 'texto', opcional: true,
      inicios: ['Eu me sinto…', 'Ultimamente…', 'Gostaria de…'] },
    { id: 'contato', nome: 'Contato', titulo: 'Seus dados para contato', sub: 'Mandamos os psicólogos indicados pelo WhatsApp.', tipo: 'contato' }
  ];
  const TOTAL = 6;                              /* a barra conta as 6 perguntas; o contato é o fechamento */
  const GUARDA = 'pb_conhecer_v1';               /* respostas guardadas na aba (se recarregar, não perde) */


  /* ---------- v277: WhatsApp com país (igual à caixa "Agende sua sessão" do perfil) ---------- */
  const bandeira = (p, cls) => p.iso === 'XX'
    ? `<span class="${cls} agc-band-mundo" aria-hidden="true">🌍</span>`
    : `<img class="${cls}" src="${base}assets/imagens/bandeiras/${p.iso.toLowerCase()}.webp" alt="" width="32" height="24" decoding="async">`;
  const paisAtual = () => (window.U && U.paisTel) ? U.paisTel(R.pais || (U.paisPeloFuso ? U.paisPeloFuso() : 'BR')) : { iso: 'BR', ddi: '55', nome: 'Brasil', ex: '(85) 99999-9999' };
  function campoTel() {
    const pt = paisAtual();
    return `<div class="cn-campo cn-campo-tel"><label for="cn-whats" class="cn-rot">WhatsApp${pt.iso === 'BR' ? ' com DDD' : ''}</label>
      <div class="agc-tel cn-tel">
        <button type="button" class="agc-tel-pais" data-pais-trocar aria-haspopup="dialog" aria-label="País do seu WhatsApp: ${esc(pt.nome)}${pt.ddi ? ' +' + pt.ddi : ''}. Trocar">${bandeira(pt, 'agc-tel-band')}<span class="agc-tel-ddi">${pt.ddi ? '+' + pt.ddi : '+'}</span><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></button>
        <input id="cn-whats" name="whatsapp" type="tel" inputmode="tel" autocomplete="tel-national" maxlength="22" value="${esc(R.whatsapp)}" placeholder="${esc(pt.ex)}" required>
      </div></div>`;
  }
  function mascaraTel(inp) {
    const pt = paisAtual();
    if (pt.iso !== 'BR') {
      const max = pt.iso === 'XX' ? 15 : pt.max, dg = U.digitos(inp.value).slice(0, max);
      inp.value = (pt.iso === 'US' || pt.iso === 'CA') && dg.length > 3 ? `(${dg.slice(0, 3)}) ${dg.slice(3, 6)}${dg.length > 6 ? '-' + dg.slice(6) : ''}` : dg.replace(/(\d{3})(?=\d)/g, '$1 ');
      return;
    }
    const n = U.digitos(inp.value).replace(/^55(?=\d{11})/, '').slice(0, 11);
    let t = n;
    if (n.length > 2) t = `(${n.slice(0, 2)}) ${n.slice(2)}`;
    if (n.length > 7) t = `(${n.slice(0, 2)}) ${n.slice(2, n.length === 11 ? 7 : 6)}-${n.slice(n.length === 11 ? 7 : 6)}`;
    inp.value = t;
  }
  const REGIAO_PAIS = { BR: 'América do Sul', AR: 'América do Sul', CL: 'América do Sul', UY: 'América do Sul', PY: 'América do Sul',
    US: 'América do Norte e Central', CA: 'América do Norte e Central', MX: 'América do Norte e Central',
    PT: 'Europa', GB: 'Europa', IE: 'Europa', ES: 'Europa', FR: 'Europa', IT: 'Europa', DE: 'Europa', CH: 'Europa', NL: 'Europa', BE: 'Europa',
    AO: 'África', MZ: 'África', JP: 'Ásia e Oceania', AU: 'Ásia e Oceania', AE: 'Ásia e Oceania', XX: 'Outros' };
  function abrirPaises(atual, aoEscolher) {
    let dlg = document.getElementById('agc-pais-dlg');
    if (!dlg) { dlg = document.createElement('dialog'); dlg.id = 'agc-pais-dlg'; dlg.className = 'agc-fuso-dlg agc-pais-dlg'; dlg.setAttribute('aria-labelledby', 'agc-pais-dlg-tit'); document.body.appendChild(dlg); }
    const sugerido = U.paisPeloFuso ? U.paisPeloFuso() : 'BR';
    const norm = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const ordem = ['América do Sul', 'Europa', 'América do Norte e Central', 'África', 'Ásia e Oceania', 'Outros'];
    const lista = U.PAISES_TEL.map(p => ({ ...p, regiao: REGIAO_PAIS[p.iso] || 'Outros' }));
    const opcao = p => { const on = p.iso === atual; return `<button type="button" class="agc-fuso-op agc-pais-op" role="option" aria-selected="${on}" data-pais="${p.iso}">
      <span class="agc-pais-band">${bandeira(p, 'agc-pais-img')}</span>
      <span class="agc-pais-nome"><b>${esc(p.nome)}${p.iso === sugerido && p.iso !== 'XX' ? ' <em>pelo seu fuso</em>' : ''}</b><small>${p.iso === 'XX' ? 'Digite o código do país e o número' : `Ex.: ${esc(p.ex)}`}</small></span>
      <span class="agc-pais-ddi">${p.ddi ? '+' + p.ddi : ''}</span>${on ? '<i aria-hidden="true">✓</i>' : ''}</button>`; };
    dlg.innerHTML = `<div class="agc-fuso-dlg-in">
      <span class="agc-fuso-alca" aria-hidden="true"></span>
      <div class="agc-fuso-dlg-cab"><h3 id="agc-pais-dlg-tit">País do seu WhatsApp</h3><button type="button" class="agc-fuso-x" data-fechar aria-label="Fechar">×</button></div>
      <label class="agc-fuso-busca"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input type="search" placeholder="Digite o país ou o código (ex.: 351)" aria-label="Buscar país ou código" autocomplete="off" enterkeyhint="search"></label>
      <div class="agc-fuso-ops" role="listbox" aria-labelledby="agc-pais-dlg-tit"></div></div>`;
    const caixa = dlg.querySelector('.agc-fuso-ops'), busca = dlg.querySelector('input');
    const desenhar = () => {
      const q = norm(busca.value.trim()), qd = q.replace(/[^0-9]/g, '');
      const achados = lista.filter(p => !q || (qd && qd === q.replace(/[+\s]/g, '') ? p.ddi.startsWith(qd) : norm(`${p.nome} ${p.iso} ${p.regiao}`).includes(q)));
      if (!achados.length) { caixa.innerHTML = `<p class="agc-fuso-vazio">Não achamos "${esc(busca.value.trim())}". Escolha <b>Outro país</b> no fim da lista e digite o código do país junto com o número.</p>`; return; }
      caixa.innerHTML = ordem.map(nome => ({ nome, itens: achados.filter(p => p.regiao === nome) })).filter(g => g.itens.length)
        .map(g => `<p class="agc-fuso-grupo">${esc(g.nome)}</p>${g.itens.map(opcao).join('')}`).join('');
    };
    desenhar();
    busca.addEventListener('input', desenhar);
    busca.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const b = caixa.querySelector('[data-pais]'); if (b) b.click(); } });
    dlg.querySelector('[data-fechar]').onclick = () => dlg.close();
    dlg.onclick = e => {
      if (e.target === dlg) { dlg.close(); return; }
      const b = e.target.closest('[data-pais]'); if (!b) return;
      const iso = b.dataset.pais; dlg.close(); if (iso !== atual) aoEscolher(iso);
    };
    dlg.onclose = () => document.documentElement.classList.remove('agc-sem-rolagem');
    document.documentElement.classList.add('agc-sem-rolagem');
    dlg.showModal();
    const sel = caixa.querySelector('.agc-fuso-op[aria-selected="true"]');
    if (sel) sel.scrollIntoView({ block: 'center' });
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) busca.focus({ preventScroll: true });
  }
  /* ---------- estado ---------- */
  let R = { tipoSessao: '', motivos: [], objetivos: [], preferencias: [], horario: '', sobre: '', nome: '', whatsapp: '', pais: '', email: '', consentimento: false };
  let passo = -1;                               /* -1 = tela de abertura */
  try { const s = JSON.parse(sessionStorage.getItem(GUARDA)); if (s && s.R) { R = Object.assign(R, s.R); passo = Math.min(Math.max(-1, s.passo | 0), ETAPAS.length - 1); } } catch (e) { /* começa do zero */ }
  const guardar = () => { try { sessionStorage.setItem(GUARDA, JSON.stringify({ R, passo })); } catch (e) { /* sem problema */ } };

  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const palco = $('#cn-palco'), lado = $('#cn-lado');
  const base = document.documentElement.getAttribute('data-base') || '../';
  const reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* resumo do que a pessoa respondeu em cada passo (aparece na lateral) */
  function resumo(e) {
    const v = R[e.id];
    if (e.tipo === 'contato') return '';
    if (Array.isArray(v)) return v.length ? (v.length <= 2 ? v.join(', ') : `${v.slice(0, 2).join(', ')} +${v.length - 2}`) : '';
    if (e.tipo === 'texto') return String(v || '').trim() ? 'Escrito' : '';
    return v || '';
  }

  /* ---------- lateral: logo, passos, sigilo ---------- */
  function desenharLado() {
    const abertura = passo < 0;
    const atual = Math.min(passo + 1, TOTAL);
    const pct = abertura ? 0 : Math.round((Math.min(passo, TOTAL) / TOTAL) * 100);
    lado.innerHTML = `
      <a class="cn-logo" href="${base}"><img src="${base}assets/imagens/logo.svg" alt="" width="30" height="30"><span>Psicólogos Brasil</span></a>
      ${abertura ? `
        <div class="cn-lado-pitch">
          <p class="cn-selo">${svg('relogio', 16)}Conversa de 15 minutos</p>
          <h2>Antes de começar a terapia, conheça quem vai cuidar de você.</h2>
          <p>Você conversa por vídeo com o psicólogo indicado, tira dúvidas e só depois decide se quer seguir.</p>
        </div>` : `
        <div class="cn-lado-passo"><span>Passo ${ETAPAS[passo].tipo === 'contato' ? 'final' : `${atual} de ${TOTAL}`}</span><b>${esc(ETAPAS[passo].nome)}</b></div>
        <div class="cn-barra" role="progressbar" aria-label="Progresso" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${ETAPAS[passo].tipo === 'contato' ? 100 : pct}%"></i></div>
        <ol class="cn-passos">${ETAPAS.map((e, k) => {
          const est = k < passo ? 'feito' : k === passo ? 'atual' : 'depois';
          const r = k < passo ? resumo(e) : '';
          return `<li class="${est}">${k < passo ? `<button type="button" data-ir="${k}" aria-label="Voltar para ${esc(e.nome)}">` : '<span class="cn-passo-in">'}
            <span class="cn-bol" aria-hidden="true">${k < passo ? svg('ok', 13) : k + 1}</span>
            <span class="cn-passo-txt"><b>${esc(e.nome)}</b>${r ? `<small>${esc(r)}</small>` : ''}</span>
          ${k < passo ? '</button>' : '</span>'}</li>`;
        }).join('')}</ol>`}
      <p class="cn-lado-sigilo">${svg('ok', 16)}Sigilo profissional · psicólogos com CRP</p>
      ${abertura ? '' : `
      <div class="cn-cel-topo">
        <button type="button" class="cn-cel-voltar" data-voltar aria-label="Voltar">${svg('seta', 20).replace('<svg', '<svg style="transform:scaleX(-1)"')}</button>
        <div class="cn-cel-barra" aria-hidden="true"><i style="width:${ETAPAS[passo].tipo === 'contato' ? 100 : Math.round(((passo + 1) / TOTAL) * 100)}%"></i></div>
        <span class="cn-cel-num">${ETAPAS[passo].tipo === 'contato' ? 'Final' : `${atual}/${TOTAL}`}</span>
        <a class="cn-cel-fechar" href="${base}" aria-label="Sair e voltar ao início">${'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'}</a>
      </div>`}`;
  }

  /* ---------- telas ---------- */
  function telaAbertura() {
    return `
    <section class="cn-tela cn-abertura">
      <p class="cn-kicker">Rápido · Sem compromisso</p>
      <h1 class="cn-h1">Conheça o seu psicólogo <em>em 15 minutos</em></h1>
      <p class="cn-lead">Responda 6 perguntas rápidas. A gente indica os psicólogos certos para você e marca uma conversa rápida para vocês se conhecerem.</p>
      <ol class="cn-como">
        <li><span>1</span><div><b>Você responde</b><small>Leva uns 2 minutos</small></div></li>
        <li><span>2</span><div><b>A equipe indica</b><small>Psicólogos que combinam com você</small></div></li>
        <li><span>3</span><div><b>Vocês conversam</b><small>15 minutos por vídeo, para se conhecerem</small></div></li>
      </ol>
      <div class="cn-abertura-acoes">
        <button type="button" class="cn-cta" data-comecar>Começar agora${svg('seta', 20)}</button>
        <a class="cn-link" href="${base}psicologos/">Já tenho psicólogo</a>
      </div>
      <p class="cn-garantias"><span>${svg('ok', 15)}Sem compromisso</span><span>${svg('ok', 15)}Psicólogos com CRP</span><span>${svg('ok', 15)}Por vídeo, de onde estiver</span></p>
    </section>`;
  }

  function telaEtapa(e) {
    const val = R[e.id];
    let corpo = '';
    if (e.tipo === 'cartoes') {
      corpo = `<div class="cn-tiles" role="radiogroup" aria-label="${esc(e.sub)}">${e.opcoes.map(o => `
        <button type="button" class="cn-tile" role="radio" aria-checked="${val === o.v}" data-v="${esc(o.v)}">
          <span class="cn-pontos ${o.pontos}" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
          <b>${esc(o.v)}</b><small>${esc(o.d)}</small><span class="cn-marca" aria-hidden="true">${svg('ok', 13)}</span>
        </button>`).join('')}</div>`;
    } else if (e.tipo === 'bolhas') {
      corpo = `<div class="cn-tags">${e.opcoes.map(o => `
        <button type="button" class="cn-tag" aria-pressed="${val.includes(o)}" data-v="${esc(o)}"><span class="cn-caixa" aria-hidden="true">${svg('ok', 12)}</span>${esc(o)}</button>`).join('')}</div>
        <p class="cn-contagem" aria-live="polite">${val.length ? `${val.length} ${val.length === 1 ? 'tema escolhido' : 'temas escolhidos'}` : ''}</p>`;
    } else if (e.tipo === 'chips') {
      corpo = `<div class="cn-checks">${e.opcoes.map(o => `
        <button type="button" class="cn-check" aria-pressed="${val.includes(o.v)}" data-v="${esc(o.v)}"><span class="cn-check-ico">${svg(o.i, 20)}</span><span class="cn-check-txt">${esc(o.v)}</span><span class="cn-caixa" aria-hidden="true">${svg('ok', 12)}</span></button>`).join('')}</div>`;
    } else if (e.tipo === 'lista') {
      corpo = `<div class="cn-tiles cn-tiles-hora" role="radiogroup" aria-label="${esc(e.titulo)}">${e.opcoes.map(o => `
        <button type="button" class="cn-tile" role="radio" aria-checked="${val === o.v}" data-v="${esc(o.v)}"><span class="cn-tile-ico">${svg(o.i, 26)}</span><b>${esc(o.v)}</b><small>${esc(e.desc[o.v] || '')}</small><span class="cn-marca" aria-hidden="true">${svg('ok', 13)}</span></button>`).join('')}</div>
        <p class="cn-dica" id="cn-dica" aria-live="polite">${val && e.dica ? esc(e.dica(val)) : ''}</p>`;
    } else if (e.tipo === 'texto') {
      corpo = `<div class="cn-caixa-texto">
        <label class="sr" for="cn-sobre">Conte um pouco sobre você</label>
        <textarea id="cn-sobre" maxlength="1500" placeholder="O que trouxe você até aqui?">${esc(val)}</textarea>
        <div class="cn-inicios"><span>Comece com:</span>${e.inicios.map(t => `<button type="button" data-inicio="${esc(t)}">${esc(t)}</button>`).join('')}</div>
      </div>`;
    } else if (e.tipo === 'contato') {
      corpo = `<form class="cn-form" id="cn-form" novalidate>
        <label class="cn-campo"><span>Nome</span><input id="cn-nome" name="nome" autocomplete="name" maxlength="80" value="${esc(R.nome)}" placeholder="Seu nome completo" required></label>
        <div class="cn-form-2">
          ${campoTel()}
          <label class="cn-campo"><span>E-mail</span><input id="cn-email" name="email" type="email" inputmode="email" autocomplete="email" maxlength="120" value="${esc(R.email)}" placeholder="voce@email.com" required></label>
        </div>
        <label class="cn-consent"><input type="checkbox" id="cn-consent" ${R.consentimento ? 'checked' : ''}><span>Autorizo o uso destas respostas para me indicarem psicólogos e o contato por WhatsApp e e-mail. <a href="${base}politica-de-privacidade/" target="_blank" rel="noopener">Privacidade</a></span></label>
        <p class="cn-erro" id="cn-erro" role="alert" hidden></p>
      </form>`;
    }
    const ultima = e.tipo === 'contato';
    return `
    <section class="cn-tela cn-etapa cn-tipo-${e.tipo} cn-etapa-${e.id}">
      <header class="cn-cab">
        <p class="cn-eyebrow">${ultima ? 'Último passo' : `Pergunta ${passo + 1} de ${TOTAL}`}${e.opcional ? ' · opcional' : ''}</p>
        <h1 class="cn-h2" tabindex="-1">${esc(e.titulo)}</h1>
        ${e.sub ? `<p class="cn-sub">${esc(e.sub)}</p>` : ''}
      </header>
      ${corpo}
      <footer class="cn-acoes">
        <button type="button" class="cn-voltar" data-voltar>${svg('seta', 18).replace('<svg', '<svg style="transform:scaleX(-1)"')}Voltar</button>
        ${ultima
          ? `<button type="submit" form="cn-form" class="cn-cta cn-enviar" id="cn-enviar">Enviar respostas${svg('seta', 20)}</button>`
          : `<button type="button" class="cn-cta cn-seguir" id="cn-seguir">Continuar${svg('seta', 20)}</button>`}
      </footer>
      ${ultima ? `<p class="cn-sigilo">${svg('ok', 15)}Suas respostas ficam só com a nossa equipe, com sigilo.</p>` : ''}
    </section>`;
  }

  /* horário comercial da equipe (o mesmo da agenda: js/agenda/config.js), ex.: "seg a sex, 8h às 20h" */
  function horarioEquipe() {
    let t = 'seg a sex, 8h às 20h';
    try { if (window.U && U.textoHorarioEquipe) t = U.textoHorarioEquipe(U.fusoNavegador ? U.fusoNavegador() : ''); } catch (e) { /* usa o padrão */ }
    /* jeito de conversa: "de seg a sex, das 8h às 20h" */
    return t.replace(/^(.+?), /, 'de $1, ');
  }
  function telaFim(p) {
    const nome = String(p.paciente.nome).trim().split(' ')[0];
    const nomeB = nome.charAt(0).toLocaleUpperCase('pt-BR') + nome.slice(1);
    return `
    <section class="cn-tela cn-fim">
      <span class="cn-fim-ok" aria-hidden="true">${svg('ok', 38)}</span>
      <h1 class="cn-h2" tabindex="-1">Pronto, ${esc(nomeB)}! Recebemos suas respostas.</h1>
      <p class="cn-lead">Vamos chamar você no WhatsApp <b>${esc(window.U ? U.fmtTelefone(p.paciente.whatsapp) : p.paciente.whatsapp)}</b> com os psicólogos indicados e o horário da conversa.</p>
      <ul class="cn-fim-lista">
        <li>${svg('relogio', 17)}Estamos aqui ${esc(horarioEquipe())}</li>
        <li>${svg('whats', 17)}Salve nosso número no celular</li>
        <li>${svg('calendario', 17)}Conversa de 15 minutos por vídeo</li>
      </ul>
      <div class="cn-abertura-acoes">
        <a class="cn-cta" href="${base}psicologos/">Ver os psicólogos${svg('seta', 20)}</a>
        <a class="cn-link" href="${base}">Voltar ao início</a>
      </div>
    </section>`;
  }

  /* ---------- desenhar ---------- */
  function desenhar(foco = true) {
    const e = ETAPAS[passo];
    document.body.classList.toggle('cn-na-abertura', passo < 0);
    desenharLado();
    palco.innerHTML = passo < 0 ? telaAbertura() : telaEtapa(e);
    if (e) atualizarBotao();
    const t = palco.querySelector('.cn-tela');
    if (t && !reduz) t.classList.add('cn-entra');
    if (foco) { const h = palco.querySelector('.cn-h2, .cn-h1'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } window.scrollTo(0, 0); palco.scrollTop = 0; }
    if (e && e.tipo === 'contato') setTimeout(() => { const i = $('#cn-nome'); if (i && !i.value && window.matchMedia('(min-width: 900px)').matches) i.focus(); }, 50);
    guardar();
  }

  function pronto(e) {
    if (!e || !e.obrig) return true;
    const v = R[e.id];
    return Array.isArray(v) ? v.length > 0 : !!v;
  }
  function vazio(e) { const v = R[e.id]; return Array.isArray(v) ? !v.length : !String(v || '').trim(); }

  function atualizarBotao() {
    const e = ETAPAS[passo]; const b = $('#cn-seguir'); if (!e || !b) return;
    b.disabled = !pronto(e);
    b.firstChild.nodeValue = (!e.obrig && vazio(e)) ? 'Pular esta' : passo === TOTAL - 1 ? 'Último passo' : 'Continuar';
    const c = palco.querySelector('.cn-contagem');
    if (c) { const n = R[e.id].length; c.textContent = n ? `${n} ${n === 1 ? 'tema escolhido' : 'temas escolhidos'}` : ''; }
  }

  function ir(n) {
    passo = Math.max(-1, Math.min(n, ETAPAS.length - 1));
    desenhar();
  }
  function avancar() { const e = ETAPAS[passo]; if (!pronto(e)) return; ir(passo + 1); }

  lado.addEventListener('click', ev => {
    const b = ev.target.closest('[data-ir]'); if (b) { ir(+b.dataset.ir); return; }
    if (ev.target.closest('[data-voltar]')) ir(passo - 1);
  });

  /* ---------- cliques ---------- */
  palco.addEventListener('click', ev => {
    if (ev.target.closest('[data-comecar]')) { ir(0); return; }
    if (ev.target.closest('[data-voltar]')) { ir(passo - 1); return; }
    if (ev.target.closest('#cn-seguir')) { avancar(); return; }
    const e = ETAPAS[passo]; if (!e) return;

    const ini = ev.target.closest('[data-inicio]');
    if (ini) {
      const ta = $('#cn-sobre'); const t = ini.dataset.inicio.replace('…', ' ');
      ta.value = (ta.value.trim() ? ta.value.replace(/\s*$/, '') + (/[.!?]$/.test(ta.value.trim()) ? ' ' : '. ') : '') + t;
      R.sobre = ta.value; ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); atualizarBotao(); guardar();
      return;
    }

    const b = ev.target.closest('[data-v]'); if (!b) return;
    const v = b.dataset.v;
    if (e.tipo === 'cartoes' || e.tipo === 'lista') {
      R[e.id] = v;
      palco.querySelectorAll('[data-v]').forEach(x => x.setAttribute('aria-checked', String(x === b)));
      if (e.dica) { const d = $('#cn-dica'); if (d) d.textContent = e.dica(v); }
      atualizarBotao(); guardar();
      setTimeout(() => { if (ETAPAS[passo] === e && R[e.id] === v) avancar(); }, reduz ? 150 : 480);   /* escolha única: segue sozinho */
    } else {
      const l = R[e.id], k = l.indexOf(v);
      if (k >= 0) l.splice(k, 1); else l.push(v);
      b.setAttribute('aria-pressed', String(k < 0));
      atualizarBotao(); guardar();
    }
  });
  palco.addEventListener('input', ev => {
    if (ev.target.id === 'cn-sobre') { R.sobre = ev.target.value; atualizarBotao(); guardar(); }
    if (ev.target.id === 'cn-nome') R.nome = ev.target.value;
    if (ev.target.id === 'cn-whats') { if (window.U && U.paisTel) mascaraTel(ev.target); R.whatsapp = ev.target.value; }
    if (ev.target.id === 'cn-email') R.email = ev.target.value;
    if (ev.target.id === 'cn-consent') R.consentimento = ev.target.checked;
    guardar();
  });
  palco.addEventListener('click', ev => {
    const b = ev.target.closest('[data-pais-trocar]'); if (!b || !window.U || !U.PAISES_TEL) return;
    R.nome = ($('#cn-nome') || {}).value || R.nome; R.email = ($('#cn-email') || {}).value || R.email;
    abrirPaises(paisAtual().iso, iso => {
      R.pais = iso; R.whatsapp = ''; guardar();
      const box = palco.querySelector('.cn-campo-tel'); if (box) { box.outerHTML = campoTel(); const i = $('#cn-whats'); if (i) i.focus(); }
    });
  });
  palco.addEventListener('change', ev => { if (ev.target.id === 'cn-consent') { R.consentimento = ev.target.checked; guardar(); } });

  palco.addEventListener('submit', async ev => {
    ev.preventDefault();
    const erro = $('#cn-erro'), btn = $('#cn-enviar');
    const mostrar = (m, campo) => { erro.textContent = m; erro.hidden = false; if (campo) { const i = $(campo); i.setAttribute('aria-invalid', 'true'); i.focus({ preventScroll: true }); i.scrollIntoView({ block: 'center', behavior: reduz ? 'auto' : 'smooth' }); } else erro.scrollIntoView({ block: 'center' }); };
    palco.querySelectorAll('[aria-invalid]').forEach(i => i.removeAttribute('aria-invalid'));
    erro.hidden = true;
    R.nome = $('#cn-nome').value.trim(); R.whatsapp = $('#cn-whats').value.trim(); R.email = $('#cn-email').value.trim(); R.consentimento = $('#cn-consent').checked;
    if (R.nome.length < 3) return mostrar('Informe seu nome.', '#cn-nome');
    let zap = R.whatsapp;
    if (window.U && U.paisTel) {
      const pt = paisAtual();
      zap = pt.iso === 'XX' ? '+' + U.digitos(R.whatsapp).replace(/^00/, '') : U.whatsNormalizar(R.whatsapp, pt.ddi);
      if (!U.digitos(R.whatsapp) || !U.whatsValido(zap) || (pt.iso === 'BR' && !/^\+55\d{10,11}$/.test(zap))) return mostrar(pt.iso === 'BR' ? 'Informe o WhatsApp com DDD.' : pt.iso === 'XX' ? 'Digite o código do país e o número (ex.: 4475001234567).' : `Confira o WhatsApp: em ${pt.nome}, o número tem ${pt.min === pt.max ? pt.min : `${pt.min} a ${pt.max}`} dígitos (ex.: ${pt.ex}).`, '#cn-whats');
    } else if (window.U && !U.whatsValido(U.whatsNormalizar(R.whatsapp))) return mostrar('Confira o WhatsApp: número com DDD (Brasil) ou com o código do país.', '#cn-whats');
    if (window.U && !U.emailValido(R.email)) return mostrar('Confira o e-mail.', '#cn-email');
    if (!R.consentimento) return mostrar('Marque a autorização para podermos falar com você.', '#cn-consent');
    if (!window.DB || !DB.enviarConhecer) return mostrar('Não consegui enviar agora. Tente de novo em instantes ou fale com a gente pelo WhatsApp.');
    btn.disabled = true; btn.classList.add('enviando'); btn.firstChild.nodeValue = 'Enviando…';
    try {
      let origem = '';
      try { const u = new URL(document.referrer); if (u.host === location.host) origem = u.pathname; } catch (e) { /* veio de fora */ }
      const p = await DB.enviarConhecer({
        tipoSessao: R.tipoSessao, motivos: R.motivos, objetivos: R.objetivos, preferencias: R.preferencias,
        horario: R.horario, sobre: R.sobre, origem, consentimento: true,
        nome: R.nome, whatsapp: zap, email: R.email
      });
      try { sessionStorage.removeItem(GUARDA); } catch (e) { /* ok */ }
      document.body.classList.add('cn-no-fim');
      lado.innerHTML = `<a class="cn-logo" href="${base}"><img src="${base}assets/imagens/logo.svg" alt="" width="30" height="30"><span>Psicólogos Brasil</span></a>
        <div class="cn-lado-pitch"><p class="cn-selo">${svg('ok', 16)}Respostas enviadas</p><h2>Obrigado por confiar na gente.</h2><p>Cuidar de si é um passo grande. A partir daqui, a nossa equipe acompanha você.</p></div>
        <p class="cn-lado-sigilo">${svg('ok', 16)}Sigilo profissional · psicólogos com CRP</p>`;
      palco.innerHTML = telaFim(p);
      const h = palco.querySelector('.cn-h2'); if (h) h.focus({ preventScroll: true });
      window.scrollTo(0, 0); palco.scrollTop = 0;
    } catch (e) {
      btn.disabled = false; btn.classList.remove('enviando'); btn.firstChild.nodeValue = 'Enviar respostas';
      mostrar((e && e.message) || 'Não consegui enviar. Tente de novo.');
    }
  });

  document.addEventListener('keydown', ev => {
    if (ev.key === 'Enter' && passo >= 0 && ETAPAS[passo].tipo !== 'contato' && ETAPAS[passo].tipo !== 'texto' && !ev.target.closest('button,a')) avancar();
  });

  desenhar(false);
})();
