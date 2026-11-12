/* Perfil: contador do "Sobre", prévia do cartão, nota de perfil completo e temas em destaque.
   Usado pelas páginas psicologos.html, artigos.html, usuarios.html e config.html. Os arquivos rodam em ordem e dividem as mesmas variáveis. */
/* ---------- contador do "Sobre o profissional" (o ideal é 300 caracteres ou mais) ---------- */
function contadorBio() {
  const el = $('#p-bio-c'), p = psiAtual(); if (!el || !p) return;
  const n = String(p.bio || $('#p-bio').value || '').trim().length;
  el.textContent = n >= 300 ? `${n} caracteres ✓ bom tamanho` : `${n} de 300 caracteres recomendados`;
  el.style.color = n >= 300 ? 'var(--ok)' : n >= 150 ? 'var(--aviso)' : '';
}
/* ---------- prévia do cartão na lista (abre a própria lista do site em modo prévia) ---------- */
let previaCartaoPronta = false, previaQual = 'pagina';   /* a prévia abre na página do perfil; o cartão é a 2ª opção */
function mostrarPreviaCartao(p) {
  const f = $('#p-previa-cartao');
  const enviar = () => { try { f.contentWindow.postMessage({ tipo: 'pb-previa-cartao', dados: { ...dadosPrevia(p), agenda: p.agendaId || slugify(p.slug || p.nome) } }, location.origin); } catch (e) { console.warn(e); } };
  if (previaCartaoPronta) { enviar(); return; }
  if (!f.dataset.aberta) {
    f.dataset.aberta = '1';
    window.addEventListener('message', e => {
      if (e.origin !== location.origin || !e.data || e.data.tipo !== 'pb-previa-cartao-pronta' || e.source !== f.contentWindow) return;
      previaCartaoPronta = true;
      const atual = psiAtual(); if (atual) mostrarPreviaCartao(atual);
    });
    /* &q= com o nome: se o navegador ainda estiver com a lista antiga guardada, ela já abre filtrada neste psicólogo */
    f.src = '../psicologos/?previa=1&q=' + encodeURIComponent(p.nome || '') + '&v=' + Date.now();
  }
}
const _mostrarPreviaPerfilBase = mostrarPreviaPerfil;
mostrarPreviaPerfil = function (p) {
  $('#p-previa').hidden = previaQual !== 'pagina'; $('#p-previa-cartao').hidden = previaQual !== 'cartao';
  if (previaQual === 'cartao') mostrarPreviaCartao(p); else _mostrarPreviaPerfilBase(p);
};
/* =============== Perfis: nota de "perfil completo", temas em destaque e abordagem própria =============== */
/* o que conta para um perfil bem preenchido (peso de cada item) */
function checarPerfil(p) {
  const bio = String(p.bio || '').trim(), temas = especialidadesDe(p);
  return [
    { ok: !!(p.foto && p.foto.data), txt: 'Foto do perfil', p: 20 },
    { ok: !!String(p.nome || '').trim(), txt: 'Nome completo', p: 10 },
    { ok: !!(String(p.crp || '').trim() || String(p.opp || '').trim()), txt: 'CRP (ou OPP)', p: 15 },
    { ok: bio.length >= 300, txt: bio ? `Texto "Sobre" mais completo (${bio.length} de 300 caracteres)` : 'Texto "Sobre o profissional"', p: 20 },
    { ok: (p.abordagens || []).length > 0, txt: 'Pelo menos uma abordagem', p: 10 },
    { ok: temas.length >= 5, txt: `Pelo menos 5 temas em "Com experiência em" (${temas.length} marcados)`, p: 10 },
    { ok: !!Number(p.valor), txt: 'Valor da sessão', p: 5 },
    { ok: !!p.verificado, txt: 'Perfil verificado (selo azul)', p: 5 },
    { ok: !!String(p.video || '').trim(), txt: 'Vídeo de apresentação (opcional, ajuda muito)', p: 5 }
  ];
}
function notaPerfil() {
  const p = psiAtual(), el = $('#p-nota-txt'); if (!p || !el) return;
  const itens = checarPerfil(p), n = itens.reduce((t, i) => t + (i.ok ? i.p : 0), 0);
  el.textContent = n + '%';
  el.className = 'seo-nota ' + (n >= 85 ? 'bom' : n >= 60 ? 'medio' : 'ruim');
}
/* ⭐ até 5 temas que aparecem primeiro no cartão da lista */
function renderDestaques() {
  const p = psiAtual(), box = $('#p-destaques'); if (!p || !box) return;
  const temas = especialidadesDe(p);
  p.destaques = (p.destaques || []).filter(t => temas.includes(t));
  if (!temas.length) { box.innerHTML = '<span class="destaques-vazio">Marque os temas acima: eles aparecem aqui para você escolher os destaques.</span>'; return; }
  const cheio = p.destaques.length >= 5;
  const ord = [...p.destaques, ...temas.filter(t => !p.destaques.includes(t))];
  box.innerHTML = ord.map(t => { const on = p.destaques.includes(t); return `<button type="button" class="destaque${on ? ' on' : ''}" data-t="${esc(t)}" aria-pressed="${on}" ${!on && cheio ? 'disabled title="Já tem 5 destaques"' : ''}><span class="est" aria-hidden="true">★</span>${esc(t)}</button>`; }).join('');
}
const _infoPsiNota = infoPsi;
infoPsi = function () { _infoPsiNota(); notaPerfil(); };
const _preencherPsiDest = preencherPsi;
preencherPsi = function (p) { _preencherPsiDest(p); renderDestaques(); notaPerfil(); contadorBio(); };
/* no site, os temas em destaque vêm primeiro (o cartão mostra os primeiros) */
const _psiPublicoDest = psiPublico;
psiPublico = function (p) {
  const o = _psiPublicoDest(p), d = (p.destaques || []).filter(t => o.temas.includes(t));
  o.temas = [...d, ...o.temas.filter(t => !d.includes(t))];
  return o;
};
function ligarPerfisExtra() {
  $('#p-bio').addEventListener('input', () => setTimeout(contadorBio));
  document.querySelectorAll('.previa-qual [data-pv]').forEach(b => b.addEventListener('click', () => {
    previaQual = b.dataset.pv;
    document.querySelectorAll('.previa-qual [data-pv]').forEach(x => x.classList.toggle('ativo', x === b));
    const p = psiAtual(); if (p) mostrarPreviaPerfil(p);
  }));
  $('#p-destaques').addEventListener('click', e => {
    const b = e.target.closest('.destaque'); if (!b || b.disabled) return;
    const p = psiAtual(); if (!p) return;
    const t = b.dataset.t; p.destaques = p.destaques || [];
    if (p.destaques.includes(t)) p.destaques = p.destaques.filter(x => x !== t);
    else if (p.destaques.length < 5) p.destaques.push(t);
    marcarAlterado(p); salvarAgora(); renderDestaques(); infoPsi();
  });
  ['#p-temas', '#p-especialidades'].forEach(id => $(id).addEventListener(id === '#p-temas' ? 'change' : 'input', () => setTimeout(renderDestaques)));
  /* abordagem que não está na lista: entra na lista (Configurações) e já fica marcada */
  const addAbord = () => {
    const p = psiAtual(), inp = $('#p-abord-nova'); if (!p) return;
    const nome = inp.value.trim().replace(/\s+/g, ' ');
    if (!nome) { inp.focus(); return; }
    const lista = linhas(state.config.abordagens);
    const igual = lista.find(x => norm(x) === norm(nome)) || (p.abordagens || []).find(x => norm(x) === norm(nome));
    const final = igual || nome;
    if (!lista.some(x => norm(x) === norm(final))) { state.config.abordagens = [...lista, final].join('\n'); if ($('#cfg-abordagens')) $('#cfg-abordagens').value = state.config.abordagens; }
    p.abordagens = [...new Set([...(p.abordagens || []), final])];
    inp.value = '';
    preencherAbordagens(p.abordagens); marcarAlterado(p); salvarAgora(); infoPsi();
    toast(igual ? `“${final}” já existia: ficou marcada.` : `Abordagem “${final}” adicionada e marcada.`, 'ok');
  };
  $('#p-abord-add').addEventListener('click', addAbord);
  $('#p-abord-nova').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addAbord(); } });
  /* clique na nota: mostra o que falta */
  $('#p-nota').addEventListener('click', () => {
    const p = psiAtual(); if (!p) return;
    const itens = checarPerfil(p), n = itens.reduce((t, i) => t + (i.ok ? i.p : 0), 0), falta = itens.filter(i => !i.ok);
    Auth.janela({ titulo: `Perfil ${n}% completo`, texto: falta.length ? 'O que ainda falta para o perfil ficar completo:' : 'Tudo preenchido. Perfil pronto para publicar!', ok: 'Entendi', semCancelar: true, icone: falta.length ? 'alerta' : 'ok' });
    const caixa = document.querySelector('#pb-sair .pb-sair-caixa p') || document.querySelector('#pb-sair .pb-sair-caixa h2');
    if (caixa) caixa.insertAdjacentHTML('afterend', `<ul class="falta-lista" style="margin:-8px 0 20px">${itens.map(i => `<li class="${i.ok ? 'ok' : ''}">${esc(i.txt)}</li>`).join('')}</ul>`);
  });
}
