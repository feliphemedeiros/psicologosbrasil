/* Configurações e os eventos (cliques e campos) do editor de artigos e de perfis.
   Usado pelas páginas psicologos.html, artigos.html, usuarios.html e config.html. Os arquivos rodam em ordem e dividem as mesmas variáveis. */
/* =============== configurações =============== */
const CFG = ['head', 'siteUrl', 'whatsapp', 'autor', 'autorTrat', 'autorCrp', 'autorOpp', 'categorias', 'paginasFixas', 'header', 'footer', 'scripts'];
function preencherConfig() { if (state.config.autorTrat == null) { const v = lerCargo(state.config.autorCargo); state.config.autorTrat = v.trat || 'Psicólogo'; state.config.autorCrp = v.crp; } CFG.forEach(k => { $('#cfg-' + k).value = state.config[k] || ''; }); mostrarFotoAutor('#cfg-autorFoto-prev', state.config.autorFoto); $('#a-dominio').textContent = state.config.siteUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '') + '/blog/'; if (window.preencherLista) preencherLista(); if (window.renderCategorias) renderCategorias(); if (window.preencherEquipe) preencherEquipe(); }

/* =============== eventos =============== */
function ligar() {
  // navegação
  $$('.nav button').forEach(b => b.addEventListener('click', () => {
    $$('.nav button').forEach(x => x.classList.toggle('ativo', x === b));
    $$('.view').forEach(v => v.classList.toggle('ativa', v.id === 'view-' + b.dataset.view));
    if (b.dataset.view === 'artigos' && atualA) preencherCategorias(artigoAtual().categoria);
    if (b.dataset.view === 'psicologos' && atualP) preencherAbordagens(psiAtual().abordagens);
  }));
  $('#btnPasta').addEventListener('click', conectarPasta);
  $$('.abas').forEach(ab => ab.addEventListener('click', e => { const b = e.target.closest('button'); if (b) trocarAba(ab.dataset.tipo, b.dataset.aba); }));
  $$('.disp').forEach(d => d.addEventListener('click', e => { const b = e.target.closest('button[data-larg]'); if (b) d.parentNode.querySelectorAll('.previa-frame').forEach(f => { f.style.width = b.dataset.larg; }); }));

  // artigos
  $('#novoArtigo').addEventListener('click', novoArtigo);
  $('#listaArtigos').addEventListener('click', e => { const b = e.target.closest('.item'); if (b) abrirArtigo(b.dataset.id); });
  ['#a-autorCrp', '#cfg-autorCrp'].forEach(id => $(id).addEventListener('input', e => mascaraCrp(e.target), true));
  ['#a-autorOpp', '#cfg-autorOpp'].forEach(id => $(id).addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 8); }, true));
  ['#a-autor', '#a-autorTrat', '#a-autorCrp', '#a-autorOpp'].forEach(id => $(id).addEventListener('input', resumoAutor));
  /* autor escolhido da lista de Perfis: cargo, CRP, OPP e foto vêm do perfil */
  $('#a-autor').addEventListener('focus', () => {
    $('#a-autor-lista').innerHTML = state.psicologos.filter(p => (p.nome || '').trim()).map(p => `<option value="${esc(p.nome.trim())}"></option>`).join('');
  });
  $('#a-autor').addEventListener('input', e => {
    const p = state.psicologos.find(x => (x.nome || '').trim().toLowerCase() === e.target.value.trim().toLowerCase());
    const a = artigoAtual(); if (!a) return;
    /* trocou para outra pessoa: não deixa o CRP, a OPP e a foto do autor principal no artigo dela */
    if (!p && !ehPrincipal({ autor: e.target.value })) {
      const c = state.config, limpa = v => String(v || '').replace(/\D/g, '');
      if (a.autorCrp && limpa(a.autorCrp) === limpa(c.autorCrp)) { a.autorCrp = ''; $('#a-autorCrp').value = ''; }
      if (a.autorOpp && limpa(a.autorOpp) === limpa(c.autorOpp)) { a.autorOpp = ''; $('#a-autorOpp').value = ''; }
      if (a.autorFoto && a.autorFoto === c.autorFoto) { a.autorFoto = ''; const fp = $('#a-autorFoto-prev'); if (fp) { fp.style.backgroundImage = ''; fp.textContent = 'Sem foto'; } }
      marcarAlterado(a); salvar(); resumoAutor();
    }
    if (!p) return;
    a.autorTrat = p.tratamento === 'Psicóloga' ? 'Psicóloga' : 'Psicólogo'; a.autorCrp = (p.crp || '').trim(); a.autorOpp = (p.opp || '').trim();
    if (p.foto && p.foto.data) a.autorFoto = p.foto.data;
    $('#a-autorTrat').value = a.autorTrat; $('#a-autorCrp').value = a.autorCrp; $('#a-autorOpp').value = a.autorOpp;
    mostrarFotoAutor('#a-autorFoto-prev', autorDe(a).foto);
    marcarAlterado(a); salvar(); resumoAutor(); infoArtigo();
  });
  const camposA = { 'a-titulo': 'titulo', 'a-data': 'data', 'a-autor': 'autor', 'a-autorTrat': 'autorTrat', 'a-autorCrp': 'autorCrp', 'a-autorOpp': 'autorOpp', 'a-tituloSeo': 'tituloSeo', 'a-descricao': 'descricao', 'a-categoria': 'categoria' };
  Object.entries(camposA).forEach(([id, k]) => $('#' + id).addEventListener('input', e => {
    const a = artigoAtual(); if (!a) return;
    a[k] = e.target.value;
    if (k === 'titulo' && !a.slugManual) { a.slug = slugify(a.titulo); $('#a-slug').value = a.slug; }
    marcarAlterado(a); salvar(); contadores(); infoArtigo(); renderListaArtigosDebounce();
  }));
  $('#a-slug').addEventListener('input', e => { const a = artigoAtual(); a.slug = e.target.value.toLowerCase().replace(/\s+/g, '-'); a.slugManual = !!a.slug; marcarAlterado(a); salvar(); });
  $('#a-slug').addEventListener('blur', e => { const a = artigoAtual(); if (!a) return; a.slug = slugify(a.slug); e.target.value = a.slug; salvar(); });
  $('#a-autorFoto-btn').addEventListener('click', () => $('#a-autorFoto-file').click());
  $('#a-autorFoto-file').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try { const r = await processarImagem(f, 160, true); const a = artigoAtual(); a.autorFoto = r.data; marcarAlterado(a); salvarAgora(); mostrarFotoAutor('#a-autorFoto-prev', r.data); infoArtigo(); }
    catch (err) { toast('Não consegui ler essa imagem.', 'erro'); }
  });
  $('#a-autorFoto-rem').addEventListener('click', () => { const a = artigoAtual(); a.autorFoto = ''; marcarAlterado(a); salvarAgora(); mostrarFotoAutor('#a-autorFoto-prev', ''); });
  /* volta o artigo para o autor principal (Configurações > Artigos) */
  $('#a-autor-voltar').addEventListener('click', () => {
    const a = artigoAtual(); if (!a) return;
    Object.assign(a, autorInicial());
    $('#a-autor').value = a.autor; $('#a-autorTrat').value = a.autorTrat; $('#a-autorCrp').value = a.autorCrp; $('#a-autorOpp').value = a.autorOpp;
    const fp = $('#a-autorFoto-prev'); if (fp) { fp.style.backgroundImage = ''; fp.textContent = 'Sem foto'; } mostrarFotoAutor('#a-autorFoto-prev', a.autorFoto);
    marcarAlterado(a); salvarAgora(); resumoAutor(); infoArtigo();
    $('#a-autor-det').open = false;
    toast('Autor de volta para ' + a.autor + '.', 'ok');
  });
  /* Resumo para o Google: preenche com o começo do texto (frases inteiras, até ~155 caracteres) */
  $('#a-resumo-auto').addEventListener('click', async () => {
    const a = artigoAtual(); if (!a) return;
    const t = textoPuro(a.html);
    if (!t) { toast('Escreva o texto do artigo primeiro.', 'erro'); return; }
    if ((a.descricao || '').trim() && !(await Auth.confirmar('Trocar o resumo?', 'O resumo que você escreveu vai ser trocado pelo começo do texto.', { ok: 'Trocar', icone: 'editar' }))) return;
    const frases = t.match(/[^.!?]+[.!?]+["”»]?\s*/g) || [t];
    let r = '';
    for (const f of frases) { if ((r + f).trim().length > 158) break; r += f; }
    r = r.trim();
    if (r.length < 70) { r = t.slice(0, 155); r = r.length < t.length ? r.replace(/\s+\S*$/, '') + '…' : r; }
    const el = $('#a-descricao'); el.value = r;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.focus();
  });
  /* Perfil: o botão Prévia da barra troca entre Prévia e Editar */
  const abaPsi = n => document.querySelector(`.abas[data-tipo="psi"] button[data-aba="${n}"]`);
  const psiNaPrevia = () => { const t = abaPsi('previa'); return !!(t && t.classList.contains('ativo')); };
  const rotuloPreviaPsi = () => { $('#p-ver-previa').textContent = psiNaPrevia() ? 'Voltar a editar' : 'Prévia'; };
  document.querySelectorAll('.abas[data-tipo="psi"] button').forEach(b => b.addEventListener('click', () => setTimeout(rotuloPreviaPsi)));
  $('#p-ver-previa').addEventListener('click', () => {
    const t = abaPsi(psiNaPrevia() ? 'editar' : 'previa'); if (t) t.click();
    $('#psiEd').scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(rotuloPreviaPsi);
  });
  /* Prévia ↔ Escrever: o mesmo botão da barra troca entre os dois */
  const abaArt = n => document.querySelector(`.abas[data-tipo="artigo"] button[data-aba="${n}"]`);
  const naPrevia = () => { const t = abaArt('previa'); return !!(t && t.classList.contains('ativo')); };
  const rotuloPrevia = () => { $('#a-ver-previa').textContent = naPrevia() ? 'Voltar a escrever' : 'Prévia'; };
  document.querySelectorAll('.abas[data-tipo="artigo"] button').forEach(b => b.addEventListener('click', () => setTimeout(rotuloPrevia)));
  $('#a-ver-previa').addEventListener('click', () => {
    const t = abaArt(naPrevia() ? 'editar' : 'previa'); if (t) t.click();
    $('#artigoEd').scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(rotuloPrevia);
  });
  $('#a-desativar').addEventListener('click', () => alternarArtigo());
  $('#a-seo-flutua').addEventListener('click', () => { if (naPrevia()) { abaArt('editar').click(); rotuloPrevia(); } const c = $('#a-seo-nota').closest('.caixa-art'); c.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  $('#a-capa-btn').addEventListener('click', () => $('#a-capa-file').click());
  $('#a-capa-file').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    /* capa: sempre 16:9, recortada no centro e salva em 1600 × 900 */
    try { const r = await processarImagem(f, 1600, false, 16 / 9, true); const a = artigoAtual(); a.capa = { ...r, alt: $('#a-capa-alt').value }; marcarAlterado(a); salvarAgora(); mostrarCapa(a); renderListaArtigos(); infoArtigo(); }
    catch (err) { toast('Não consegui ler essa imagem.', 'erro'); }
  });
  $('#a-capa-rem').addEventListener('click', () => { const a = artigoAtual(); a.capa = null; marcarAlterado(a); salvarAgora(); mostrarCapa(a); renderListaArtigos(); });
  $('#a-capa-alt').addEventListener('input', e => { const a = artigoAtual(); if (a.capa) { a.capa.alt = e.target.value; marcarAlterado(a); salvar(); infoArtigo(); } });
  $('#a-faq-add').addEventListener('click', () => {
    const a = artigoAtual(); a.faq = a.faq || []; a.faq.push({ p: '', r: '' });
    renderFaq(a); marcarAlterado(a); salvar(); infoArtigo();
    const ult = $$('#a-faq .faq-item input'); if (ult.length) ult[ult.length - 1].focus();
  });
  $('#a-faq').addEventListener('input', e => {
    const it = e.target.closest('.faq-item'); if (!it) return; const a = artigoAtual();
    a.faq[+it.dataset.i][e.target.dataset.c] = e.target.value; marcarAlterado(a); salvar(); infoArtigo();
  });
  $('#a-faq').addEventListener('click', e => {
    const b = e.target.closest('[data-rem]'); if (!b) return; const a = artigoAtual();
    a.faq.splice(+b.dataset.rem, 1); renderFaq(a); marcarAlterado(a); salvar(); infoArtigo();
  });
  $('#a-schema').addEventListener('input', e => { const a = artigoAtual(); a.schemaExtra = e.target.value; marcarAlterado(a); salvar(); renderSchema(a); });
  $('#a-schema-ver').addEventListener('toggle', () => { const a = artigoAtual(); if (a && $('#a-schema-ver').open) atualizarSchemaFinal(a); });
  $('#a-schema-copiar').addEventListener('click', () => { const a = artigoAtual(); atualizarSchemaFinal(a); copiar('#a-schema-final'); });
  /* schema e FAQ do psicólogo */
  $('#p-faq-add').addEventListener('click', () => {
    const p = psiAtual(); if (!p) return; p.faq = p.faq || []; p.faq.push({ p: '', r: '' });
    renderFaqPsi(p); renderSchemaPsi(p); marcarAlterado(p); salvar(); infoPsi();
    const ult = $$('#p-faq .faq-item input'); if (ult.length) ult[ult.length - 1].focus();
  });
  $('#p-faq').addEventListener('input', e => {
    const it = e.target.closest('.faq-item'); if (!it) return; const p = psiAtual();
    p.faq[+it.dataset.i][e.target.dataset.c] = e.target.value; marcarAlterado(p); salvar(); renderSchemaPsi(p); infoPsi();
  });
  $('#p-faq').addEventListener('click', e => {
    const b = e.target.closest('[data-rem]'); if (!b) return; const p = psiAtual();
    p.faq.splice(+b.dataset.rem, 1); renderFaqPsi(p); renderSchemaPsi(p); marcarAlterado(p); salvar(); infoPsi();
  });
  $('#p-schema').addEventListener('input', e => { const p = psiAtual(); if (!p) return; p.schemaExtra = e.target.value; marcarAlterado(p); salvar(); renderSchemaPsi(p); });
  $('#p-schema-ver').addEventListener('toggle', () => { const p = psiAtual(); if (p && $('#p-schema-ver').open) atualizarSchemaFinalPsi(p); });
  $('#p-schema-copiar').addEventListener('click', () => { const p = psiAtual(); if (!p) return; atualizarSchemaFinalPsi(p); copiar('#p-schema-final'); });
  const tagIn = $('#a-tag-input');
  tagIn.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ',') && tagIn.value.trim()) { e.preventDefault(); addPalavra(tagIn.value); tagIn.value = ''; }
    else if (e.key === 'Enter') e.preventDefault();
    else if (e.key === 'Backspace' && !tagIn.value) { const a = artigoAtual(); if (a && (a.palavras || []).length) { a.palavras.pop(); marcarAlterado(a); salvar(); infoArtigo(); } }
  });
  tagIn.addEventListener('blur', () => { if (tagIn.value.trim()) { addPalavra(tagIn.value); tagIn.value = ''; } });
  $('#a-tags').addEventListener('click', e => {
    const a = artigoAtual(); if (!a) return;
    const x = e.target.closest('.tag-x'), t = e.target.closest('.tag');
    if (x) { a.palavras.splice(+x.dataset.x, 1); }
    else if (t && +t.dataset.i > 0) { const [k] = a.palavras.splice(+t.dataset.i, 1); a.palavras.unshift(k); }
    else { tagIn.focus(); return; }
    marcarAlterado(a); salvar(); infoArtigo(); renderListaArtigosDebounce();
  });

  const ed = $('#a-texto');
  try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) {}
  ed.addEventListener('input', editorMudou);
  ed.addEventListener('keyup', guardarSelecao); ed.addEventListener('mouseup', guardarSelecao);
  ed.addEventListener('paste', e => {
    const cd = e.clipboardData; if (!cd) return;
    const img = [...(cd.files || [])].find(f => f.type.startsWith('image/'));
    e.preventDefault();
    if (img) { guardarSelecao(); inserirImagemNoTexto(img); return; }
    const html = cd.getData('text/html'), txt = cd.getData('text/plain');
    if (html) document.execCommand('insertHTML', false, limpar(html));
    else document.execCommand('insertHTML', false, txt.split(/\n\s*\n/).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join(''));
    normalizarEditor(); editorMudou();
  });
  ed.addEventListener('drop', e => {
    const f = [...(e.dataTransfer.files || [])].find(x => x.type.startsWith('image/'));
    if (f) { e.preventDefault(); rangeSalvo = null; inserirImagemNoTexto(f); }
  });
  $('#a-img-file').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) inserirImagemNoTexto(f); });
  iniciarEditorBlocos();

  $('#a-gerar').addEventListener('click', () => gerarArtigo(false));
  $('#a-zip').addEventListener('click', () => gerarArtigo(true));
  $('#a-excluir').addEventListener('click', () => excluir('artigo'));
  $('#a-copiar').addEventListener('click', () => copiar('#a-html'));

  // psicólogos
  $('#novoPsicologo').addEventListener('click', novoPsicologo);
  $('#listaPsicologos').addEventListener('click', e => { const b = e.target.closest('.item'); if (b) abrirPsicologo(b.dataset.id); });
  const camposP = { 'p-nome': 'nome', 'p-tratamento': 'tratamento', 'p-crp': 'crp', 'p-especialidades': 'especialidades', 'p-valor': 'valor', 'p-duracao': 'duracao', 'p-bio': 'bio', 'p-video': 'video', 'p-video-formato': 'videoFormato' };
  Object.entries(camposP).forEach(([id, k]) => $('#' + id).addEventListener('input', e => {
    const p = psiAtual(); if (!p) return;
    p[k] = e.target.value;
    if (k === 'nome' && !p.slugManual) { p.slug = slugify(p.nome); $('#p-slug').value = p.slug; }
    marcarAlterado(p); salvar(); infoPsi(); clearTimeout(tLista); tLista = setTimeout(renderListaPsicologos, 600);
  }));
  $('#p-slug').addEventListener('input', e => { const p = psiAtual(); p.slug = e.target.value.toLowerCase().replace(/\s+/g, '-'); p.slugManual = !!p.slug; marcarAlterado(p); salvar(); });
  $('#p-slug').addEventListener('blur', e => { const p = psiAtual(); if (!p) return; p.slug = slugify(p.slug); e.target.value = p.slug; salvar(); });
  [['p-temas', 'temas'], ['p-publico', 'publico'], ['p-idiomas', 'idiomas'], ['p-acess', 'acessibilidade']].forEach(([id, k]) =>
    $('#' + id).addEventListener('change', () => {
      const p = psiAtual(); p[k] = $$('#' + id + ' input:checked').map(i => i.value);
      if (k === 'temas') $('#p-temas-n').textContent = p.temas.length;
      marcarAlterado(p); salvarAgora(); infoPsi();
    }));
  /* "Marcar todos os públicos" (e desmarcar, se já estiverem todos) */
  const botaoTodosPublico = () => { const ins = $$('#p-publico input'); $('#p-publico-todos').textContent = ins.length && ins.every(i => i.checked) ? 'Desmarcar todos' : 'Marcar todos os públicos'; };
  $('#p-publico-todos').addEventListener('click', () => {
    const ins = $$('#p-publico input'); const todos = ins.every(i => i.checked);
    ins.forEach(i => { i.checked = !todos; });
    $('#p-publico').dispatchEvent(new Event('change'));
  });
  $('#p-publico').addEventListener('change', botaoTodosPublico);
  new MutationObserver(botaoTodosPublico).observe($('#p-publico'), { childList: true });
  $('#p-temas-busca').addEventListener('input', e => {
    const q = norm(e.target.value);
    $$('#p-temas label').forEach(l => { l.hidden = !!q && !norm(l.textContent).includes(q); });
  });
  $('#p-abordagens').addEventListener('change', () => { const p = psiAtual(); p.abordagens = $$('#p-abordagens input:checked').map(i => i.value); marcarAlterado(p); salvarAgora(); infoPsi(); });
  $('#p-foto-btn').addEventListener('click', () => $('#p-foto-file').click());
  $('#p-foto-file').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try { const r = await processarImagem(f, 900, false, 0.8); const p = psiAtual(); p.foto = r; marcarAlterado(p); salvarAgora(); mostrarFoto(p); renderListaPsicologos(); infoPsi(); }
    catch (err) { toast('Não consegui ler essa imagem.', 'erro'); }
  });
  $('#p-foto-rem').addEventListener('click', () => { const p = psiAtual(); p.foto = null; marcarAlterado(p); salvarAgora(); mostrarFoto(p); renderListaPsicologos(); });
  const camposP2 = { 'p-titulo': 'titulo', 'p-citacao': 'citacao', 'p-esperar': 'esperar', 'p-verif-data': 'verificadoEm' };
  Object.entries(camposP2).forEach(([id, k]) => $('#' + id).addEventListener('input', e => { const p = psiAtual(); if (!p) return; p[k] = e.target.value; marcarAlterado(p); salvar(); infoPsi(); }));
  $('#p-verificado').addEventListener('change', e => {
    const p = psiAtual(); p.verificado = e.target.checked;
    if (p.verificado && !p.verificadoEm) { p.verificadoEm = hojeISO(); $('#p-verif-data').value = p.verificadoEm; }
    if (p.verificado && !(p.crp || '').trim() && !(p.opp || '').trim()) toast('Preencha o CRP ou a OPP: o selo indica que o registro foi conferido.', 'aviso');
    $('#p-verif-data-l').hidden = !p.verificado; $('#p-verif-box').classList.toggle('on', p.verificado);
    marcarAlterado(p); salvarAgora(); infoPsi(); renderListaPsicologos();
  });
  $('#p-passos').addEventListener('input', e => {
    const c = e.target.closest('[data-i]'); if (!c) return; const p = psiAtual();
    p.passos = p.passos || []; const i = +c.dataset.i; p.passos[i] = p.passos[i] || {};
    p.passos[i][e.target.dataset.c] = e.target.value; marcarAlterado(p); salvar(); infoPsi();
  });
  $('#p-amb-btn').addEventListener('click', () => $('#p-amb-file').click());
  $('#p-amb-file').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try { const r = await processarImagem(f, 1400); const p = psiAtual(); p.ambiente = r; marcarAlterado(p); salvarAgora(); mostrarAmb(p); infoPsi(); }
    catch (err) { toast('Não consegui ler essa imagem.', 'erro'); }
  });
  $('#p-amb-rem').addEventListener('click', () => { const p = psiAtual(); p.ambiente = null; marcarAlterado(p); salvarAgora(); mostrarAmb(p); });
  $('#p-gerar').addEventListener('click', () => gerarPsi(false));
  $('#p-zip').addEventListener('click', () => gerarPsi(true));
  $('#p-excluir').addEventListener('click', () => excluir('psi'));
  $('#p-desativar').addEventListener('click', () => alternarDesativado());
  /* Sala do Google Meet: fica no perfil e vai para a agenda (o link entra sozinho ao confirmar o pagamento) */
  let tSala;
  $('#p-salaMeet').addEventListener('input', e => {
    const p = psiAtual(); if (!p) return;
    const v = e.target.value.trim();
    p.salaMeet = v; p.atualizado = Date.now(); salvar(); msgSalaMeet();
    clearTimeout(tSala);
    if (v && !salaMeetValida(v)) return;
    tSala = setTimeout(async () => {
      const ag = agendaDe(p); if (!ag) return;
      try { await DB.salvarPsicologo({ ...ag, salaMeet: salaMeetValida(v) ? normalizarSala(v) : '', senha: '' }); await atualizarAgendaMap(); }
      catch (err) { toast(err.message || 'Não consegui salvar a sala na agenda.', 'erro'); }
    }, 700);
  });
  /* plano mensal e comissão: ficam no perfil e já valem na agenda (se o acesso existir) */
  let tValores;
  ['#p-mensal', '#p-comissao'].forEach(id => { const el = $(id); if (el) el.addEventListener('input', () => {
    const p = psiAtual(); if (!p) return;
    p.valorMensal = Number($('#p-mensal').value) || null;
    if ($('#p-comissao') && $('#p-comissao').value !== '') p.comissao = Math.max(0, Math.min(100, Number($('#p-comissao').value)));
    p.atualizado = Date.now(); salvar();
    clearTimeout(tValores);
    tValores = setTimeout(async () => {
      const ag = agendaDe(p); if (!ag) return;
      try {
        await DB.salvarPsicologo({ ...ag, valorMensal: p.valorMensal, ...(ADMIN && p.comissao != null ? { comissao: p.comissao } : {}), senha: '' });
        await atualizarAgendaMap();
      } catch (e) { toast(e.message || 'Não consegui salvar os valores na agenda.', 'erro'); }
    }, 700);
  }); });
  /* Agenda online ligada/desligada: vale na hora, sem publicar */
  $('#p-valor').addEventListener('input', () => { $('#p-mensal').placeholder = 'Automático: R$ ' + U.precoMensal({ valor: Number($('#p-valor').value) || AGC.valorPadrao }); });
  $('#p-agenda-ativa').addEventListener('change', async e => {
    const p = psiAtual(); if (!p) return;
    const ligada = e.target.checked, box = e.target.closest('.agenda-switch');
    p.agendaPausada = !ligada; p.atualizado = Date.now(); salvar(); visualAgendaSwitch();
    const ag = agendaDe(p);
    if (!ag) { toast(ligada ? 'Agenda online ligada.' : 'Agenda online desligada: vale assim que o acesso for criado.', 'ok'); return; }
    box.setAttribute('aria-busy', 'true');
    try {
      await DB.salvarPsicologo({ ...ag, pausada: !ligada, senha: '' }); await atualizarAgendaMap(); renderListaPsicologos();
      toast(ligada ? `Agenda de ${p.nome.split(' ')[0]} ligada: os horários livres voltaram ao site.` : `Agenda de ${p.nome.split(' ')[0]} desligada: o perfil mostra “Sem horários livres no momento”.`, 'ok');
    } catch (err) {
      e.target.checked = !ligada; p.agendaPausada = ligada; visualAgendaSwitch();
      toast(err.message || 'Não consegui mudar a agenda.', 'erro');
    } finally { box.removeAttribute('aria-busy'); }
  });
  $('#p-copiar').addEventListener('click', () => copiar('#p-html'));

  // configurações
  CFG.forEach(k => $('#cfg-' + k).addEventListener('input', e => {
    state.config[k] = e.target.value; salvar();
    if (k === 'siteUrl') $('#a-dominio').textContent = e.target.value.replace(/^https?:\/\//, '').replace(/\/+$/, '') + '/';
    if (['head', 'header', 'footer', 'scripts', 'siteUrl', 'whatsapp'].includes(k)) {
      [...state.artigos, ...state.psicologos].forEach(o => { if (o.geradoEm) o.alterado = true; });
      renderListaArtigos(); renderListaPsicologos();
    }
  }));
  $('#cfg-restaurar').addEventListener('click', async () => {
    if (!(await Auth.confirmar('Restaurar topo e rodapé?', 'Eles voltam para o exemplo. O que você colou será perdido.', { ok: 'Restaurar', perigo: true }))) return;
    state.config.header = HEADER_PADRAO; state.config.footer = FOOTER_PADRAO; salvarAgora(); preencherConfig();
  });
  // horário da equipe e pré-reserva (prazo e antecedência contam só nele)
  const EQH_LOCAL = 'pb-ajustes-agenda-v1';
  const eqhLer = () => ({
    dias: [...document.querySelectorAll('#eqh-dias input:checked')].map(i => Number(i.value)),
    inicio: Number($('#eqh-inicio').value), fim: Number($('#eqh-fim').value),
    prazoHoras: Math.max(1, Math.min(48, parseInt($('#eqh-prazo').value, 10) || 2)),
    antecedenciaHoras: Math.max(0, Math.min(48, parseInt($('#eqh-antes').value, 10) || 0))
  });
  const eqhExemplo = () => {
    const v = eqhLer(), antes = U._ajustesAgenda; U._ajustesAgenda = v;
    try {
      const sex = new Date(); sex.setDate(sex.getDate() + ((5 - sex.getDay() + 7) % 7 || 7)); sex.setHours(19, 0, 0, 0);   /* próxima sexta, 19h */
      const diaSem = ms => U.fmtDataCompleta(ms).split(', ').filter((x, i) => i !== 1).join(' ');   /* "segunda-feira às 9h" */
      const curto = v.antecedenciaHoras < v.prazoHoras + 1;
      $('#eqh-exemplo').innerHTML = !v.dias.length ? '<b style="color:var(--erro)">Marque pelo menos um dia.</b>'
        : `<span class="eqh-linha">Horário: <b>${esc(U.textoHorarioEquipe())}</b>.</span>`
        + `<span class="eqh-linha"><b>Prazo:</b> uma pré-reserva feita agora vence <b>${esc(U.fmtQuando(U.somarHorasEquipe(Date.now(), v.prazoHoras)))}</b>; feita numa sexta às 19h, vence <b>${esc(diaSem(U.somarHorasEquipe(sex.getTime(), v.prazoHoras)))}</b>.</span>`
        + `<span class="eqh-linha"><b>Antecedência:</b> quem entra no site agora vê horários a partir de <b>${esc(U.fmtQuando(U.somarHorasEquipe(Date.now(), v.antecedenciaHoras)))}</b>; numa sexta às 19h, a partir de <b>${esc(diaSem(U.somarHorasEquipe(sex.getTime(), v.antecedenciaHoras)))}</b>.</span>`
        + (curto ? `<span class="eqh-linha eqh-alerta">Atenção: deixe a antecedência pelo menos 1 hora maior que o prazo (aqui, ${v.prazoHoras + 1}h ou mais). Assim a pré-reserva sempre vence antes da sessão e dá tempo de mandar o link.</span>` : '');
    } finally { U._ajustesAgenda = antes; }
  };
  window.preencherEquipe = () => {
    const e = { ...U.equipe(), ...(state.config.agendaEquipe || {}) };
    document.querySelectorAll('#eqh-dias input').forEach(i => { i.checked = e.dias.includes(Number(i.value)); });
    $('#eqh-inicio').value = String(e.inicio); $('#eqh-fim').value = String(e.fim);
    $('#eqh-prazo').value = e.prazoHoras; $('#eqh-antes').value = e.antecedenciaHoras; eqhExemplo();
  };
  preencherEquipe();
  $('#eqh-cartao').addEventListener('input', eqhExemplo);
  $('#eqh-cartao').addEventListener('change', eqhExemplo);
  $('#eqh-salvar').addEventListener('click', async () => {
    const v = eqhLer();
    if (!v.dias.length) { toast('Marque pelo menos um dia de atendimento.', 'erro'); return; }
    if (v.fim <= v.inicio) { toast('O horário de término precisa ser depois do início.', 'erro'); return; }
    if (v.antecedenciaHoras < v.prazoHoras + 1) { toast(`A antecedência precisa ser pelo menos ${v.prazoHoras + 1}h (1 hora a mais que o prazo da pré-reserva).`, 'erro'); $('#eqh-antes').focus(); return; }
    state.config.agendaEquipe = v; salvarAgora();
    const b = $('#eqh-salvar'); b.disabled = true;
    try {
      if (ONLINE.modo === 'firebase') { const { fs, db } = await NUVEM.firebase(); await fs.setDoc(fs.doc(db, 'indice', 'agenda'), { ...v, atualizado: Date.now() }); U._ajustesAgenda = v; }
      else localStorage.setItem(EQH_LOCAL, JSON.stringify(v));
      $('#eqh-status').textContent = 'Salvo. Já vale para as próximas pré-reservas.';
      toast('Horário da equipe salvo e aplicado no site.', 'ok'); eqhExemplo();
    } catch (e) { toast('Não deu para aplicar no site agora. Tente de novo.', 'erro'); }
    finally { b.disabled = false; }
  });
  // Pix da clínica (o paciente paga aqui; a Agenda usa no botão "Enviar Pix ao paciente")
  const PIXC_LOCAL = 'pb-pix-clinica-v1';
  if ($('#pixc-salvar').isConnected) {
    /* a chave só aceita o que cabe no tipo escolhido (números, e-mail ou chave aleatória) e já entra formatada */
    const inp = $('#pixc-chave'), aj = $('#pixc-ajuda');
    const FALTA = { cpf: '11 números', cnpj: '14 números', celular: 'DDD + 9 números', aleatoria: '32 letras e números' };
    const conferir = (final) => {
      const t = $('#pixc-tipo').value, v = inp.value.trim(), n = U.pixNormalizar(t, v);
      inp.classList.toggle('pixc-ok', !!v && n.ok); inp.classList.toggle('pixc-erro', !!v && !n.ok && final);
      aj.className = 'aj pixc-ajuda' + (v && n.ok ? ' ok' : v && !n.ok && final ? ' erro' : '');
      aj.textContent = !v ? `${U.pixNomeTipo(t)}: ${FALTA[t] ? FALTA[t] + ', ' : ''}ex.: ${(U.PIX_TIPOS.find(x => x.id === t) || {}).dica || ''}`
        : n.ok ? `✓ ${U.pixNomeTipo(t)} ${t === 'aleatoria' ? 'válida' : 'válido'}`
        : final ? n.erro : (FALTA[t] ? `Faltam números: ${FALTA[t]}` : 'Continue digitando…');
      if (t === 'aleatoria' && v && !n.ok && !final) aj.textContent = `${v.replace(/[^0-9a-f]/gi, '').length} de 32 caracteres`;
      if (t === 'cpf' || t === 'cnpj' || t === 'celular') {
        const tem = U.digitos(v).length, total = t === 'cnpj' ? 14 : 11;
        if (v && !n.ok && !final) {
          if (tem < total) aj.textContent = `${tem} de ${total} números`;
          else { aj.textContent = n.erro; aj.className = 'aj pixc-ajuda erro'; inp.classList.add('pixc-erro'); }   /* completo, mas não existe */
        }
      }
    };
    const dica = (limpar) => {
      const t = $('#pixc-tipo').value, info = U.PIX_TIPOS.find(x => x.id === t);
      inp.placeholder = info ? 'Ex.: ' + info.dica : '';
      inp.inputMode = t === 'email' ? 'email' : t === 'celular' ? 'tel' : (t === 'cpf' || t === 'cnpj') ? 'numeric' : 'text';
      inp.maxLength = { cpf: 14, cnpj: 18, celular: 15, email: 77, aleatoria: 36 }[t] || 80;
      if (limpar) inp.value = '';
      else inp.value = U.pixMascara(t, inp.value);
      conferir(false);
    };
    /* trocou o tipo: a chave antiga não serve no tipo novo, começa em branco */
    $('#pixc-tipo').addEventListener('change', () => { dica(true); inp.focus(); });
    inp.addEventListener('input', () => { const m = U.pixMascara($('#pixc-tipo').value, inp.value); if (m !== inp.value) inp.value = m; conferir(false); });
    inp.addEventListener('blur', () => conferir(true));
    U.pixClinica().then(px => {
      if (px) { $('#pixc-tipo').value = px.tipo || 'cnpj'; $('#pixc-chave').value = U.pixFormatar(px.tipo, px.chave); $('#pixc-nome').value = px.nome || ''; $('#pixc-banco').value = px.banco || ''; $('#pixc-status').textContent = 'Cadastrado.'; }
      dica(false);
    });
    $('#pixc-salvar').addEventListener('click', async () => {
      const tipo = $('#pixc-tipo').value, n = U.pixNormalizar(tipo, $('#pixc-chave').value);
      if (!n.ok) { toast(n.erro, 'erro'); $('#pixc-chave').focus(); return; }
      if (!n.valor) { toast('Digite a chave Pix da clínica.', 'erro'); $('#pixc-chave').focus(); return; }
      const nome = $('#pixc-nome').value.trim();
      if (!nome) { toast('Digite o nome de quem recebe (aparece no app do banco e dá segurança ao paciente).', 'erro'); $('#pixc-nome').focus(); return; }
      const v = { tipo, chave: n.valor, nome, banco: $('#pixc-banco').value.trim(), atualizado: Date.now(), por: SESSAO.nome || '' };
      const b = $('#pixc-salvar'); b.disabled = true;
      try {
        if (ONLINE.modo === 'firebase') { const { fs, db } = await NUVEM.firebase(); await fs.setDoc(fs.doc(db, 'painel_config', 'pix'), v); }
        else localStorage.setItem(PIXC_LOCAL, JSON.stringify(v));
        $('#pixc-chave').value = U.pixFormatar(tipo, n.valor); conferir(true);
        $('#pixc-status').textContent = 'Salvo. Já vale no botão “Enviar Pix ao paciente” da Agenda.';
        toast('Pix da clínica salvo.', 'ok');
      } catch (e) { toast('Não consegui salvar agora. Tente de novo.', 'erro'); }
      finally { b.disabled = false; }
    });
  }
  // foto do autor principal
  $('#cfg-autorFoto-btn').addEventListener('click', () => $('#cfg-autorFoto-file').click());
  $('#cfg-autorFoto-file').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try { const r = await processarImagem(f, 160, true); state.config.autorFoto = r.data; salvarAgora(); mostrarFotoAutor('#cfg-autorFoto-prev', r.data); toast('Foto do autor principal salva. Vale para os artigos novos.', 'ok'); }
    catch (err) { toast('Não consegui ler essa imagem.', 'erro'); }
  });
  $('#cfg-autorFoto-rem').addEventListener('click', () => { state.config.autorFoto = ''; salvarAgora(); mostrarFotoAutor('#cfg-autorFoto-prev', ''); const p = $('#cfg-autorFoto-prev'); if (p) { p.style.backgroundImage = ''; p.textContent = 'Sem foto'; } });
  // categorias dos artigos: botões que somam e tiram (guardadas uma por linha, como antes)
  const catTxt = $('#cfg-categorias'), catIn = $('#cfg-cat-input');
  const catLista = () => linhas(catTxt.value);
  const catGravar = (l) => { catTxt.value = l.join('\n'); catTxt.dispatchEvent(new Event('input')); window.renderCategorias(); };
  window.renderCategorias = () => {
    const box = $('#cfg-cat-tags');
    if (!box.isConnected) return;   /* só na página de Configurações */
    box.querySelectorAll('.tag').forEach(t => t.remove());
    catLista().forEach((c, i) => {
      const t = document.createElement('span'); t.className = 'tag';
      t.innerHTML = `<button type="button" class="tag-x" aria-label="Tirar a categoria ${esc(c)}">×</button>${esc(c)}`;
      t.querySelector('button').addEventListener('click', () => { const l = catLista(); l.splice(i, 1); catGravar(l); });
      box.insertBefore(t, catIn);
    });
  };
  const catAdd = () => {
    const v = catIn.value.trim().replace(/\s+/g, ' ');
    if (!v) { catIn.focus(); return; }
    const l = catLista();
    if (l.some(c => c.toLowerCase() === v.toLowerCase())) { toast('Essa categoria já existe.', 'aviso'); catIn.select(); return; }
    l.push(v); catIn.value = ''; catGravar(l); catIn.focus();
  };
  $('#cfg-cat-add').addEventListener('click', catAdd);
  catIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); catAdd(); } });
  $('#cfg-cat-tags').addEventListener('click', e => { if (e.target.id === 'cfg-cat-tags') catIn.focus(); });
  renderCategorias();
  // ordem da lista de psicólogos (destaque para novos e com pouco atendimento)
  const LST_PADRAO = { ativo: false, lugares: 5, novoDias: 30, poucos: 2 };
  const lstLer = () => ({ ...LST_PADRAO, ...(state.config.lista || {}) });
  const lstVisual = () => { const on = $('#lst-ativo').checked; $('#lst-switch').classList.toggle('off', !on); $('#lst-tit').textContent = on ? 'Destaque ligado' : 'Destaque desligado'; };
  window.preencherLista = () => { const l = lstLer(); $('#lst-ativo').checked = !!l.ativo; $('#lst-lugares').value = String(l.lugares); $('#lst-novoDias').value = l.novoDias; $('#lst-poucos').value = l.poucos; lstVisual(); };
  preencherLista();
  $('#lst-ativo').addEventListener('change', lstVisual);
  $('#lst-salvar').addEventListener('click', async () => {
    const n = (id, min, max, pad) => { const v = parseInt($(id).value, 10); return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : pad; };
    const l = { ativo: $('#lst-ativo').checked, lugares: n('#lst-lugares', 1, 5, 5), novoDias: n('#lst-novoDias', 0, 365, 30), poucos: n('#lst-poucos', 0, 100, 2) };
    state.config.lista = l; salvarAgora(); preencherLista();
    const b = $('#lst-salvar'); b.disabled = true;
    try {
      if (ONLINE.modo === 'firebase') { const { fs, db } = await NUVEM.firebase(); await fs.setDoc(fs.doc(db, 'indice', 'lista'), { ...l, atualizado: Date.now() }); }
      else localStorage.setItem(NUVEM.LOCAL_LISTA, JSON.stringify(l));
      $('#lst-status').textContent = l.ativo ? `Ligado: ${l.lugares} ${l.lugares > 1 ? 'lugares' : 'lugar'} de destaque, já valendo no site.` : 'Desligado: a lista volta à ordem normal.';
      toast('Ordem da lista salva e aplicada no site.', 'ok');
    } catch (e) { toast('Não deu para aplicar no site agora. Tente de novo.', 'erro'); }
    finally { b.disabled = false; }
  });
  $('#cfg-sitemap').addEventListener('click', atualizarGerais);
  $('#cfg-exportar').addEventListener('click', () => {
    baixar(new Blob([JSON.stringify(state)], { type: 'application/json' }), `painel-backup-${hojeISO()}.json`);
    toast('Backup baixado. Guarde em um lugar seguro.', 'ok');
  });
  $('#cfg-importar').addEventListener('click', () => $('#cfg-importar-file').click());
  $('#cfg-importar-file').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      const s = JSON.parse(await f.text());
      if (!Array.isArray(s.artigos) || !Array.isArray(s.psicologos)) throw new Error('arquivo inválido');
      if (!(await Auth.confirmar('Importar backup?', `${s.artigos.length} artigos e ${s.psicologos.length} perfis. Isso substitui o que está no painel agora.`, { ok: 'Importar', perigo: true }))) return;
      state = { artigos: s.artigos, psicologos: s.psicologos, config: { ...CONFIG_PADRAO, ...(s.config || {}) } };
      salvarAgora(); atualA = atualP = null; iniciarTelas(); toast('Backup importado.', 'ok');
    } catch (err) { toast('Esse arquivo não é um backup do painel.', 'erro'); }
  });
}
async function copiar(sel) {
  const t = $(sel);
  try { await navigator.clipboard.writeText(t.value); }
  catch (e) { t.select(); document.execCommand('copy'); }
  toast('HTML copiado.', 'ok');
}
function iniciarTelas() {
  preencherConfig(); renderListaArtigos(); renderListaPsicologos();
  abrirArtigo(atualA); abrirPsicologo(atualP);
}
