/* Artigos: editor (blocos estilo Gutenberg), autor, schema, vídeo do YouTube e nota de SEO.
   Usado pelas páginas psicologos.html, artigos.html, usuarios.html e config.html. Os arquivos rodam em ordem e dividem as mesmas variáveis. */
/* =============== ARTIGOS =============== */
function novoArtigo() {
  const a = { id: 'a' + Date.now(), titulo: '', slug: '', slugManual: false, categoria: linhas(state.config.categorias)[0] || '', data: hojeISO(), ...autorInicial(), tituloSeo: '', descricao: '', palavras: [], faq: [], schemaExtra: '', capa: null, html: '', criado: Date.now(), atualizado: Date.now(), geradoEm: null, alterado: false };
  state.artigos.unshift(a); salvarAgora(); abrirArtigo(a.id); renderListaArtigos();
  setTimeout(() => $('#a-titulo').focus(), 30);
}
function artigoAtual() { return state.artigos.find(x => x.id === atualA); }
function minutos(html) { return Math.max(1, Math.round(contarPalavras(html) / 200)); }

/* Autor do artigo: nome, cargo/registro e foto (se o artigo não tiver, usa o padrão das Configurações) */
/* artigos antigos guardavam "Psicólogo · CRP 11/14186" num campo só: separa o cargo e o número */
function lerCargo(t) {
  t = String(t || '');
  const trat = /psic[oó]loga/i.test(t) ? 'Psicóloga' : /psic[oó]logo/i.test(t) ? 'Psicólogo' : '';
  const crp = (t.match(/CRP\s*:?\s*([0-9]{1,2}\s*\/\s*[0-9.-]+)/i) || [])[1] || '';
  return { trat, crp: crp.replace(/\s+/g, '') };
}
/* Autor principal (Configurações > Artigos): todo artigo novo começa com ele */
function autorInicial() {
  const au = autorDe({});
  return { autor: au.nome, autorTrat: au.trat, autorCrp: au.crp, autorOpp: au.opp, autorFoto: au.foto || '' };
}
const normNome = t => String(t || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const ehPrincipal = a => !String(a.autor || '').trim() || normNome(a.autor) === normNome(state.config.autor);
function autorDe(a) {
  const c = state.config;
  const padrao = { trat: c.autorTrat || lerCargo(c.autorCargo).trat || 'Psicólogo', crp: c.autorCrp != null ? c.autorCrp : lerCargo(c.autorCargo).crp };
  const velho = a.autorCargo != null ? lerCargo(a.autorCargo) : null;
  const limpa = v => String(v || '').trim().replace(/^(crp|opp)\s*:?\s*/i, '');
  return {
    nome: (a.autor || c.autor || '').trim(),
    trat: a.autorTrat || (velho && velho.trat) || padrao.trat,
    crp: limpa(a.autorCrp != null ? a.autorCrp : velho ? velho.crp : padrao.crp),
    opp: limpa(a.autorOpp != null ? a.autorOpp : c.autorOpp),
    foto: a.autorFoto != null ? a.autorFoto : (c.autorFoto || ''),
    /* o que aparece embaixo do nome (ex.: Psicólogo · CRP 11/14186 · OPP 12345) */
    get linha() { return [this.trat, this.crp && 'CRP ' + this.crp, this.opp && 'OPP ' + this.opp].filter(Boolean).join(' · '); }
  };
}
/* CRP: digita só os números e a barra entra sozinha (11/14186) */
function mascaraCrp(el) {
  const d = el.value.replace(/\D/g, '').slice(0, 7);
  el.value = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
}
/* Mesmo HTML da página do artigo no site (js/artigo-pagina.js) */
function linhaAutor(au, data, min) {
  const ini = au.nome.split(/\s+/).filter(w => w.length > 2).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '•';
  return `<div class="artigo-autor">
        <span class="autor-foto">${au.foto ? `<img src="${au.foto}" alt="" width="48" height="48">` : esc(ini)}</span>
        <span class="autor-txt"><b>${esc(au.nome)}</b>${au.linha ? `<small>${esc(au.linha)}</small>` : ''}</span>
        <span class="autor-data">${data ? `Publicado em ${esc(data)}` : ''}${min ? `<small>${min} min de leitura</small>` : ''}</span>
      </div>`;
}
function mostrarFotoAutor(sel, data) {
  const p = $(sel); if (!p) return;
  if (data) { p.style.backgroundImage = `url("${data}")`; p.textContent = ''; }
  else { p.style.backgroundImage = ''; p.textContent = 'Sem foto'; }
}
function corpoArtigo(a, textoHtml, capaSrc) {
  const cat = a.categoria ? `<span class="artigo-cat">${esc(a.categoria)}</span>` : '';
  const capa = capaSrc ? `<figure class="artigo-capa"><img src="${capaSrc}" alt="${esc((a.capa && a.capa.alt) || a.titulo)}"${a.capa && a.capa.w ? ` width="${a.capa.w}" height="${a.capa.h}"` : ''} fetchpriority="high"></figure>` : '';
  return `<article class="artigo">
  <div class="artigo-wrap">
    <nav class="trilha" aria-label="Você está em"><a href="/">Início</a> › <a href="/blog/">Artigos</a>${a.categoria ? ` › <span>${esc(a.categoria)}</span>` : ''}</nav>
    <header class="artigo-topo">
      ${cat}
      <h1>${esc(a.titulo || 'Sem título')}</h1>
      ${a.descricao ? `<p class="artigo-resumo">${esc(a.descricao)}</p>` : ''}
      ${linhaAutor(autorDe(a), dataBR(a.data), minutos(a.html))}
    </header>
    ${capa}
    <div class="artigo-texto">
${textoHtml}
    </div>
${faqHtml(a)}
    <aside class="cta">
      <h2>Quer conversar com um psicólogo?</h2>
      <p>Atendimento online, com sigilo, de onde você estiver.</p>
      <a class="cta-btn" href="${waLink(null, 'Olá! Li o artigo "' + a.titulo + '" e quero agendar uma consulta.')}">Agendar pelo WhatsApp</a>
    </aside>
  </div>
</article>`;
}

/* ---------- Schema (dados estruturados) ---------- */
const faqValidas = a => (a.faq || []).filter(f => (f.p || '').trim() && (f.r || '').trim());
const respostaHtml = t => String(t || '').trim().split(/\n\s*\n/).map(x => `<p>${esc(x.trim()).replace(/\n/g, '<br>')}</p>`).join('');
function faqHtml(a) {
  const L = faqValidas(a); if (!L.length) return '';
  return `    <section class="faq" id="perguntas-frequentes">
      <h2>Perguntas frequentes</h2>
${L.map(f => `      <details>
        <summary>${esc(f.p.trim())}</summary>
        <div class="faq-resp">${respostaHtml(f.r)}</div>
      </details>`).join('\n')}
    </section>`;
}
function lerSchemaExtra(txt) {
  let t = String(txt || '').trim();
  if (!t) return { ok: true, itens: [] };
  t = t.replace(/<script[^>]*>/gi, '\n').replace(/<\/script>/gi, '\n').trim();
  // vários blocos colados um depois do outro
  const pedacos = []; let nivel = 0, ini = -1, emStr = false, esc_ = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (emStr) { if (esc_) esc_ = false; else if (c === '\\') esc_ = true; else if (c === '"') emStr = false; continue; }
    if (c === '"') { emStr = true; continue; }
    if (c === '{' || c === '[') { if (nivel === 0) ini = i; nivel++; }
    else if (c === '}' || c === ']') { nivel--; if (nivel === 0 && ini > -1) { pedacos.push(t.slice(ini, i + 1)); ini = -1; } }
  }
  if (!pedacos.length || nivel !== 0) return { ok: false, erro: 'O código parece incompleto: confira se todas as chaves { } fecham.' };
  const itens = [];
  for (const p of pedacos) {
    let j; try { j = JSON.parse(p); } catch (e) { return { ok: false, erro: 'Código inválido: ' + e.message.replace(/^JSON\.parse: /, '') }; }
    (Array.isArray(j) ? j : [j]).forEach(o => itens.push(o));
  }
  for (const o of itens) {
    if (!o || typeof o !== 'object') return { ok: false, erro: 'Cada schema precisa ser um objeto { }.' };
    if (!o['@type'] && !o['@graph']) return { ok: false, erro: 'Falta o "@type" em um dos schemas (ex.: "@type": "HowTo").' };
    if (!o['@context']) o['@context'] = 'https://schema.org';
  }
  return { ok: true, itens };
}
function schemasArtigo(a, capaUrl) {
  const url = `${base()}/${a.slug}/`;
  const artigo = {
    '@context': 'https://schema.org', '@type': 'BlogPosting',
    headline: a.titulo, description: a.descricao, inLanguage: 'pt-BR',
    datePublished: a.data, dateModified: hojeISO(),
    author: { '@type': 'Person', name: a.autor || state.config.autor },
    publisher: { '@type': 'Organization', name: 'Psicólogos Brasil', url: base() + '/' },
    mainEntityOfPage: url, articleSection: a.categoria, wordCount: contarPalavras(a.html)
  };
  if (capaUrl) artigo.image = base() + capaUrl;
  if ((a.palavras || []).length) artigo.keywords = a.palavras.join(', ');
  const trilha = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: base() + '/' },
      { '@type': 'ListItem', position: 2, name: 'Artigos', item: base() + '/blog/' },
      { '@type': 'ListItem', position: 3, name: a.titulo, item: url }
    ]
  };
  const L = [artigo, trilha];
  const faq = faqValidas(a);
  if (faq.length) L.push({
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faq.map(f => ({ '@type': 'Question', name: f.p.trim(), acceptedAnswer: { '@type': 'Answer', text: textoPuro(respostaHtml(f.r)) } }))
  });
  const extra = lerSchemaExtra(a.schemaExtra);
  if (extra.ok) L.push(...extra.itens);
  return L;
}
function capaUrlDe(a) { return a.capa && a.capa.data ? `/assets/imagens/artigos/${slugify(a.slug) || 'link-do-artigo'}-capa.${extDe(a.capa.data)}` : ''; }
function renderFaq(a) {
  const L = a.faq || [];
  $('#a-faq').innerHTML = L.map((f, i) => `
    <div class="faq-item" data-i="${i}">
      <div class="faq-cab"><span>Pergunta ${i + 1}</span><button type="button" class="btn pequeno perigo" data-rem="${i}">Remover</button></div>
      <input type="text" data-c="p" value="${esc(f.p)}" placeholder="Ex.: Terapia online funciona para ansiedade?">
      <textarea data-c="r" rows="3" placeholder="Resposta curta e direta, de 2 a 4 frases.">${esc(f.r)}</textarea>
    </div>`).join('') || '<p class="faq-vazio">Nenhuma pergunta ainda.</p>';
}
function renderSchema(a) {
  const ex = lerSchemaExtra(a.schemaExtra), c = $('#a-schema-c');
  if (!String(a.schemaExtra || '').trim()) { c.textContent = ''; c.className = 'contador'; }
  else if (ex.ok) { c.textContent = `✓ Código válido · ${ex.itens.length} schema(s): ${ex.itens.map(o => o['@type'] || '@graph').join(', ')}`; c.className = 'contador bom'; }
  else { c.textContent = '✗ ' + ex.erro; c.className = 'contador ruim'; }
  const tipos = schemasArtigo(a, capaUrlDe(a)).map(o => o['@type'] || '@graph');
  const st = $('#a-schema-status');
  st.textContent = ex.ok ? tipos.join(' · ') : 'Erro no schema personalizado';
  st.className = 'seo-nota ' + (ex.ok ? 'bom' : 'ruim');
  if ($('#a-schema-ver').open) atualizarSchemaFinal(a);
}
function atualizarSchemaFinal(a) {
  $('#a-schema-final').value = schemasArtigo({ ...a, slug: slugify(a.slug) || 'link-do-artigo' }, capaUrlDe(a))
    .map(j => `<script type="application/ld+json">\n${JSON.stringify(j, null, 2)}\n<\/script>`).join('\n\n');
}

/* ---------- Schema do psicólogo (mesmo modelo do artigo) ----------
   p.faq: perguntas próprias (se tiver pelo menos uma válida, substituem as automáticas).
   p.schemaExtra: código JSON-LD colado à mão. As automáticas abaixo são as mesmas do js/perfil.js. */
function faqAutoPsi(p) {
  const pn = (p.nome || '').trim().split(/\s+/)[0] || 'o psicólogo';
  const dur = Number(p.duracao) || 50;
  const reais = v => 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: Number(v) % 1 ? 2 : 0 });
  const f = [{ p: `Como é a primeira sessão com ${pn}?`, r: `É uma conversa por videochamada de ${dur} minutos, de onde você estiver. Serve para vocês se conhecerem: você conta o que está vivendo, no seu ritmo, e ${pn} explica como pode te ajudar.` }];
  if (p.valor) f.push({ p: 'Quanto custa a sessão?', r: `Cada sessão de ${dur} minutos custa ${reais(p.valor)}. O pagamento é por Pix, depois que o horário é confirmado.` });
  f.push({ p: 'As sessões são sigilosas?', r: 'Sim. Tudo o que você conta fica entre você e o psicólogo, como manda o Código de Ética do Conselho Federal de Psicologia. As sessões acontecem por videochamada segura.' });
  const id = (p.idiomas && p.idiomas.length) ? p.idiomas : ['Português'];
  if (id.some(i => i !== 'Português')) {
    const l = id.map(i => i.toLowerCase());
    f.push({ p: 'Em quais idiomas são as sessões?', r: `Em ${l.length < 2 ? l[0] : l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1]}. É só avisar o idioma quando for agendar.` });
  }
  return f;
}
function faqDoPsi(p) {
  const proprias = faqValidas(p);
  return proprias.length ? proprias.map(f => ({ p: f.p.trim(), r: textoPuro(respostaHtml(f.r)) })) : faqAutoPsi(p);
}
function schemasPsi(p) {
  const url = `${base()}/especialista/${slugify(p.slug || p.nome) || 'link-do-perfil'}/`;
  const pessoa = { '@type': 'Person', name: p.nome, jobTitle: p.tratamento, url,
    worksFor: { '@type': 'Organization', name: 'Psicólogos Brasil', url: base() + '/' } };
  if (especialidadesDe(p).length) pessoa.knowsAbout = especialidadesDe(p);
  if ((p.idiomas || []).length) pessoa.knowsLanguage = p.idiomas;
  if (p.crp) pessoa.identifier = { '@type': 'PropertyValue', propertyID: 'CRP', value: p.crp };
  const L = [{ '@context': 'https://schema.org', '@graph': [
    { '@type': 'ProfilePage', url, mainEntity: pessoa },
    { '@type': 'FAQPage', mainEntity: faqDoPsi(p).map(f => ({ '@type': 'Question', name: f.p, acceptedAnswer: { '@type': 'Answer', text: f.r } })) }
  ] }];
  const extra = lerSchemaExtra(p.schemaExtra);
  if (extra.ok) L.push(...extra.itens);
  return L;
}
function renderFaqPsi(p) {
  const L = p.faq || [];
  $('#p-faq').innerHTML = L.map((f, i) => `
    <div class="faq-item" data-i="${i}">
      <div class="faq-cab"><span>Pergunta ${i + 1}</span><button type="button" class="btn pequeno perigo" data-rem="${i}">Remover</button></div>
      <input type="text" data-c="p" value="${esc(f.p)}" placeholder="Ex.: Você atende casais?">
      <textarea data-c="r" rows="3" placeholder="Resposta curta e direta, de 2 a 4 frases.">${esc(f.r)}</textarea>
    </div>`).join('') || '<p class="faq-vazio">Nenhuma pergunta própria: a página usa as perguntas automáticas.</p>';
}
function renderSchemaPsi(p) {
  const ex = lerSchemaExtra(p.schemaExtra), c = $('#p-schema-c');
  if (!String(p.schemaExtra || '').trim()) { c.textContent = ''; c.className = 'contador'; }
  else if (ex.ok) { c.textContent = `✓ Código válido · ${ex.itens.length} schema(s): ${ex.itens.map(o => o['@type'] || '@graph').join(', ')}`; c.className = 'contador bom'; }
  else { c.textContent = '✗ ' + ex.erro; c.className = 'contador ruim'; }
  const tipos = ['ProfilePage', 'Person', faqValidas(p).length ? 'FAQPage (próprio)' : 'FAQPage', ...(ex.ok ? ex.itens.map(o => o['@type'] || '@graph') : [])];
  const st = $('#p-schema-status');
  st.textContent = ex.ok ? tipos.join(' · ') : 'Erro no schema personalizado';
  st.className = 'seo-nota ' + (ex.ok ? 'bom' : 'ruim');
  if ($('#p-schema-ver').open) atualizarSchemaFinalPsi(p);
}
function atualizarSchemaFinalPsi(p) {
  $('#p-schema-final').value = schemasPsi(p).map(j => `<script type="application/ld+json">\n${JSON.stringify(j, null, 2)}\n<\/script>`).join('\n\n');
}

function montarArtigo(a) {
  const slug = a.slug, arquivos = [];
  const t = document.createElement('template'); t.innerHTML = limpar(a.html);
  let n = 0;
  t.content.querySelectorAll('img').forEach(img => {
    const src = img.getAttribute('src') || '';
    const w = img.getAttribute('data-w'), h = img.getAttribute('data-h');
    if (src.startsWith('data:')) {
      n++; const nome = `${slug}-${n}.${extDe(src)}`;
      arquivos.push({ caminho: `assets/imagens/artigos/${nome}`, blob: dataParaBlob(src) });
      img.setAttribute('src', `/assets/imagens/artigos/${nome}`);
    }
    img.removeAttribute('data-w'); img.removeAttribute('data-h');
    if (!img.hasAttribute('alt')) img.setAttribute('alt', '');
    if (w && h) { img.setAttribute('width', w); img.setAttribute('height', h); }
    img.setAttribute('loading', 'lazy'); img.setAttribute('decoding', 'async');
  });
  let capaUrl = '';
  if (a.capa && a.capa.data) {
    const nome = `${slug}-capa.${extDe(a.capa.data)}`;
    arquivos.push({ caminho: `assets/imagens/artigos/${nome}`, blob: dataParaBlob(a.capa.data) });
    capaUrl = `/assets/imagens/artigos/${nome}`;
  }
  const url = `${base()}/${slug}/`;
  const titulo = (a.tituloSeo || a.titulo) + ' | Psicólogos Brasil';
  const jsonld = schemasArtigo(a, capaUrl);
  const html = pagina({ titulo, descricao: a.descricao, url, imagem: capaUrl ? base() + capaUrl : '', tipo: 'article', css: 'artigo-gerado.css', corpo: corpoArtigo(a, t.innerHTML, capaUrl), jsonld });
  arquivos.unshift({ caminho: `blog/${slug}/index.html`, texto: html });
  return { html, arquivos, capaUrl };
}

function preencherArtigo(a) {
  $('#a-titulo').value = a.titulo; $('#a-slug').value = a.slug; $('#a-data').value = a.data;
  $('#a-autor').value = a.autor; $('#a-autorTrat').value = autorDe(a).trat; $('#a-autorCrp').value = autorDe(a).crp; $('#a-autorOpp').value = autorDe(a).opp; mostrarFotoAutor('#a-autorFoto-prev', autorDe(a).foto); $('#a-tituloSeo').value = a.tituloSeo; $('#a-descricao').value = a.descricao;
  resumoAutor(); $('#a-extras').open = !!((a.faq || []).some(f => (f.p || '').trim()) || (a.schemaExtra || '').trim());
  preencherCategorias(a.categoria);
  $('#a-capa-alt').value = a.capa ? (a.capa.alt || '') : '';
  mostrarCapa(a);
  $('#a-texto').innerHTML = a.html || '';
  $('#a-schema').value = a.schemaExtra || ''; renderFaq(a);
  prepararEditor();
  contadores(); infoArtigo();
}
/* "Autor: Fulano · Psicólogo · CRP …" na caixa 3 (clique em "trocar" para abrir os campos) */
function resumoAutor() {
  const n = ($('#a-autor').value || '').trim();
  const l = autorDe({ autor: n, autorTrat: $('#a-autorTrat').value, autorCrp: $('#a-autorCrp').value, autorOpp: $('#a-autorOpp').value }).linha;
  $('#a-autor-resumo').textContent = n ? n + (l ? ' · ' + l : '') : 'sem autor';
  const outro = !ehPrincipal({ autor: n });
  $('#a-autor-det').classList.toggle('outro', outro);
  $('#a-autor-selo').textContent = outro ? 'outro autor' : 'principal';
  $('#a-autor-aviso').hidden = !outro;
  $('#a-autor-voltar-box').hidden = !outro;
  $('#a-autor-det .autor-trocar').textContent = outro ? 'editar' : '+ Usar outro autor';
}
function mostrarCapa(a) {
  const p = $('#a-capa-prev');
  if (a.capa && a.capa.data) { p.style.backgroundImage = `url("${a.capa.data}")`; p.textContent = ''; }
  else { p.style.backgroundImage = ''; p.textContent = 'Sem capa'; }
}
function preencherCategorias(sel) {
  const cats = linhas(state.config.categorias);
  if (sel && !cats.includes(sel)) cats.push(sel);
  $('#a-categoria').innerHTML = cats.map(c => `<option ${c === sel ? 'selected' : ''}>${esc(c)}</option>`).join('');
}
function abrirArtigo(id) {
  atualA = id; const a = artigoAtual();
  $('#artigoVazio').hidden = !!a; $('#artigoEd').hidden = !a;
  if (a) { trocarAba('artigo', 'editar'); preencherArtigo(a); }
  renderListaArtigos();
}
function marcarAlterado(o) { o.atualizado = Date.now(); if (o.geradoEm) o.alterado = true; }
function contadores() {
  const d = $('#a-descricao').value.length, cd = $('#a-descricao-c');
  cd.textContent = `${d} caracteres · ideal entre 120 e 160`; cd.className = 'contador ' + (d === 0 ? '' : d >= 120 && d <= 160 ? 'bom' : d > 160 ? 'ruim' : '');
  const ts = ($('#a-tituloSeo').value || $('#a-titulo').value).length + 21, ct = $('#a-tituloSeo-c');
  ct.textContent = `${ts} caracteres no Google · ideal até 60`; ct.className = 'contador ' + (ts > 65 ? 'ruim' : 'bom');
}
function statusSelo(o) {
  if (!o.geradoEm) return '<span class="selo rasc">Rascunho</span>';
  if (o.alterado) return '<span class="selo alt">Alterado</span>';
  return '<span class="selo ok">Salvo no site</span>';
}
function infoArtigo() {
  const a = artigoAtual(); if (!a) return;
  const pal = contarPalavras(a.html);
  renderSeo(a); renderSchema(a);
  $('#a-info').innerHTML = `${pal.toLocaleString('pt-BR')} palavras · ${minutos(a.html)} min de leitura · ${statusSelo(a)}${a.geradoEm ? ` <span>em ${quando(a.geradoEm)}</span>` : ''}`;
}
function renderListaArtigos() {
  const el = $('#listaArtigos');
  $('#qtdArtigos').textContent = state.artigos.length; $('#qtdArtigosT').textContent = state.artigos.length;
  if (!state.artigos.length) { el.innerHTML = '<div class="vazio-lista">Nenhum artigo ainda.<br>Comece pelo botão “+ Novo artigo”.</div>'; return; }
  el.innerHTML = [...state.artigos].sort((x, y) => y.atualizado - x.atualizado).map(a => `
    <button class="item ${a.id === atualA ? 'sel' : ''}" data-id="${a.id}">
      ${a.capa && a.capa.data ? `<img src="${a.capa.data}" alt="">` : '<span class="ph">A</span>'}
      <span style="min-width:0"><span class="t">${esc(a.titulo || 'Sem título')}</span>
      <span class="m">${esc(a.categoria || '')} ${statusSelo(a)} ${seloSeo(a)}</span></span>
    </button>`).join('');
}

/* editor de texto */
let rangeSalvo = null;
function guardarSelecao() {
  const s = window.getSelection();
  if (s.rangeCount && $('#a-texto').contains(s.getRangeAt(0).commonAncestorContainer)) rangeSalvo = s.getRangeAt(0).cloneRange();
}
function restaurarSelecao() {
  const ed = $('#a-texto'); ed.focus();
  const s = window.getSelection(); s.removeAllRanges();
  if (rangeSalvo) s.addRange(rangeSalvo);
  else { const r = document.createRange(); r.selectNodeContents(ed); r.collapse(false); s.addRange(r); }
}
function editorMudou() {
  const a = artigoAtual(); if (!a) return;
  a.html = $('#a-texto').innerHTML; marcarAlterado(a); salvar(); infoArtigo(); renderListaArtigosDebounce();
}
let tLista; function renderListaArtigosDebounce() { clearTimeout(tLista); tLista = setTimeout(renderListaArtigos, 600); }
async function inserirImagemNoTexto(file) {
  try {
    const r = await processarImagem(file, 1400);
    const alt = (await Auth.perguntar('Descreva a imagem', '', { texto: 'Em poucas palavras. Ajuda no Google e na acessibilidade.', ok: 'Inserir imagem', cancelar: 'Sem descrição', placeholder: 'Ex.: mulher sorrindo em sessão online' })) || '';
    const ed = ED(); const b = rangeSalvo ? blocoDe(rangeSalvo.startContainer) : null;
    const bl = document.createElement('p');
    bl.innerHTML = `<img src="${r.data}" alt="${esc(alt)}" data-w="${r.w}" data-h="${r.h}">`;
    if (b && blocoVazio(b)) b.replaceWith(bl); else if (b) b.after(bl); else ed.appendChild(bl);
    let prox = bl.nextElementSibling;
    if (!prox || !blocoVazio(prox)) { prox = novoP(); bl.after(prox); }
    caretEm(prox); editorMudou();
  } catch (e) { toast('Não consegui ler essa imagem.', 'erro'); }
}

/* =============== EDITOR DE BLOCOS (estilo Gutenberg) =============== */
const ICO = {
  cima: '<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>',
  baixo: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  esq: '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h10M4 18h14"/></svg>',
  centro: '<svg viewBox="0 0 24 24"><path d="M4 6h16M7 12h10M5 18h14"/></svg>',
  link: '<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5"/></svg>',
  seta: '<svg viewBox="0 0 24 24"><path d="M7 10l5 5 5-5"/></svg>',
  pontos: '<svg viewBox="0 0 24 24" class="cheio"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>',
  mais: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  desfazer: '<svg viewBox="0 0 24 24"><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
  refazer: '<svg viewBox="0 0 24 24"><path d="M15 14l5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/></svg>'
};
const BLOCOS = [
  { id: 'p', nome: 'Parágrafo', desc: 'Texto normal', ico: '¶', kw: 'paragrafo texto' },
  { id: 'h2', nome: 'Título', desc: 'Título de seção (H2)', ico: 'H2', kw: 'titulo heading cabecalho' },
  { id: 'h3', nome: 'Subtítulo', desc: 'Dentro de uma seção (H3)', ico: 'H3', kw: 'subtitulo heading' },
  { id: 'h4', nome: 'Título menor', desc: 'Nível H4', ico: 'H4', kw: 'titulo menor heading' },
  { id: 'ul', nome: 'Lista', desc: 'Lista com marcadores', ico: '•', kw: 'lista marcadores topicos' },
  { id: 'ol', nome: 'Lista numerada', desc: '1, 2, 3…', ico: '1.', kw: 'lista numerada passos' },
  { id: 'blockquote', nome: 'Citação', desc: 'Destaque ou citação', ico: '❝', kw: 'citacao destaque quote' },
  { id: 'img', nome: 'Imagem', desc: 'Enviar uma imagem', ico: '🖼', kw: 'imagem foto figura' },
  { id: 'hr', nome: 'Separador', desc: 'Linha entre seções', ico: '—', kw: 'separador linha divisor' },
  { id: 'botao', nome: 'Botão de agendamento', desc: 'Botão para o WhatsApp', ico: '☎', kw: 'botao whatsapp agendar cta' },
  { id: 'video', nome: 'Vídeo do YouTube', desc: 'Cole o link: aparece com botão de play', ico: '▶', kw: 'video youtube play filme' }
];
const TIPOS_TEXTO = ['p', 'h2', 'h3', 'h4', 'ul', 'ol', 'blockquote'];
const NOME_TIPO = { p: '¶', h2: 'H2', h3: 'H3', h4: 'H4', ul: '• Lista', ol: '1. Lista', blockquote: '❝', img: '🖼', hr: '—', botao: 'Botão', video: '▶ Vídeo' };
const ED = () => $('#a-texto');
let blocoAtual = null, menuB = { aberto: false }, edFocado = false, fixarAte = 0;

function tipoBloco(b) {
  if (!b || b.nodeType !== 1) return '';
  if (b.tagName === 'HR') return 'hr';
  if (b.classList.contains('botao')) return 'botao';
  if (b.tagName === 'FIGURE' && b.classList.contains('video')) return 'video';
  if (b.tagName === 'P' && b.querySelector('img') && !b.textContent.trim()) return 'img';
  return b.tagName.toLowerCase();
}
function blocoDe(n) {
  const ed = ED();
  if (!n || n === ed || !ed.contains(n)) return null;
  while (n.parentNode !== ed) n = n.parentNode;
  if (n.nodeType === 3) { const p = document.createElement('p'); n.replaceWith(p); p.appendChild(n); return p; }
  return n;
}
const blocoVazio = b => !!b && b.tagName === 'P' && !b.classList.contains('botao') && !b.textContent.trim() && !b.querySelector('img');
function novoP() { const p = document.createElement('p'); p.innerHTML = '<br>'; return p; }
function caretEm(el, inicio) {
  if (!el) return;
  if (tipoBloco(el) === 'hr') { fixarAte = Date.now() + 300; edFocado = true; setAtual(el); return; }
  const ed = ED(); ed.focus({ preventScroll: true });
  const r = document.createRange(); r.selectNodeContents(el); r.collapse(!!inicio);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  rangeSalvo = r.cloneRange(); edFocado = true; setAtual(el);
}
function normalizarEditor() {
  const ed = ED(); let ultimo = null;
  [...ed.childNodes].forEach(n => {
    if (n.nodeType === 8 || (n.nodeType === 3 && !n.textContent.trim())) { n.remove(); return; }
    if (n.nodeType === 1 && n.tagName === 'BR') { n.remove(); return; }
    if (n.nodeType === 1 && n.tagName === 'DIV') { const p = document.createElement('p'); while (n.firstChild) p.appendChild(n.firstChild); n.replaceWith(p); ultimo = p; return; }
    if (n.nodeType === 3 || !/^(P|H2|H3|H4|UL|OL|BLOCKQUOTE|HR|FIGURE)$/.test(n.tagName)) { const p = document.createElement('p'); n.replaceWith(p); p.appendChild(n); ultimo = p; }
  });
  if (!ed.firstElementChild) { ultimo = novoP(); ed.appendChild(ultimo); }
  return ultimo;
}
function blocoDaSelecao() {
  const s = getSelection(), ed = ED();
  if (s.rangeCount && s.anchorNode && s.anchorNode !== ed && ed.contains(s.anchorNode)) {
    const b = blocoDe(s.anchorNode);
    if (b && b !== blocoAtual) setAtual(b);
    return b;
  }
  return blocoAtual;
}
function setAtual(b) {
  const ed = ED();
  if (blocoAtual && blocoAtual !== b) blocoAtual.classList.remove('b-sel', 'b-vazio');
  blocoAtual = b && b.parentNode === ed ? b : null;
  if (blocoAtual) { blocoAtual.classList.add('b-sel'); blocoAtual.classList.toggle('b-vazio', blocoVazio(blocoAtual)); }
  posicionarUI();
}
function posicionarUI() {
  const bt = $('#a-bt'), ins = $('#a-ins'), b = blocoAtual;
  if (!b || !b.isConnected || !edFocado) { bt.hidden = true; ins.hidden = true; $('#eb-dica').hidden = false; fecharPop(); return; }
  const tipo = tipoBloco(b);
  bt.querySelectorAll('[data-para]').forEach(el => { el.hidden = !el.dataset.para.split(' ').includes(tipo); });
  $('#a-bt-tipo').textContent = NOME_TIPO[tipo] || 'Bloco';
  $('#a-bt-alinhar').innerHTML = b.classList.contains('centro') ? ICO.centro : ICO.esq;
  bt.hidden = false; $('#eb-dica').hidden = true;
  if (blocoVazio(b)) { ins.hidden = false; ins.style.top = (b.offsetTop + (b.offsetHeight - 28) / 2) + 'px'; ins.style.left = (b.offsetLeft + b.offsetWidth - 28) + 'px'; }
  else ins.hidden = true;
}

/* menus suspensos da barra */
function abrirPop(btn, itens) {
  const pop = $('#a-pop');
  if (!pop.hidden && pop.dataset.dono === btn.dataset.bt) { fecharPop(); return; }
  pop.dataset.dono = btn.dataset.bt; pop._itens = itens;
  pop.innerHTML = itens.map((it, i) => it === '-' ? '<hr>' : `<button type="button" data-i="${i}" class="${it.on ? 'on' : ''} ${it.perigo ? 'perigo' : ''}">${it.ico ? `<span class="pop-ico">${it.ico}</span>` : ''}${esc(it.nome)}</button>`).join('');
  pop.hidden = false;
  const barra = pop.parentNode.getBoundingClientRect(), r = btn.getBoundingClientRect();
  pop.style.left = Math.max(0, Math.min(r.left - barra.left, barra.width - pop.offsetWidth)) + 'px';
}
function fecharPop() { const pop = $('#a-pop'); pop.hidden = true; pop.dataset.dono = ''; }
function fmt(c) { restaurarSelecao(); document.execCommand(c, false, null); editorMudou(); }
function codigoInline() {
  restaurarSelecao(); const t = getSelection().toString();
  if (!t) { toast('Selecione o texto primeiro.', 'aviso'); return; }
  document.execCommand('insertHTML', false, `<code>${esc(t)}</code>`); editorMudou();
}
function depoisMover(b) { caretEm(b); editorMudou(); b.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
function excluirBloco(b) {
  const ed = ED(); const alvo = b.previousElementSibling || b.nextElementSibling;
  b.remove(); if (!ed.firstElementChild) ed.appendChild(novoP());
  caretEm(alvo && alvo.isConnected ? alvo : ed.firstElementChild); editorMudou();
}
function transformar(b, tipo) {
  const atual = tipoBloco(b);
  if (atual === tipo) { caretEm(b); return; }
  let partes;
  if (atual === 'ul' || atual === 'ol') partes = [...b.children].map(li => li.innerHTML);
  else if (atual === 'blockquote') { const f = [...b.children].filter(c => c.tagName === 'P'); partes = f.length ? f.map(c => c.innerHTML) : [b.innerHTML]; }
  else partes = [b.innerHTML];
  partes = partes.map(h => h.replace(/^(\s*<br\s*\/?>\s*)+$/i, ''));
  const centro = b.classList.contains('centro');
  let novos;
  if (tipo === 'ul' || tipo === 'ol') {
    const l = document.createElement(tipo);
    partes.forEach(h => { const li = document.createElement('li'); li.innerHTML = h || '<br>'; l.appendChild(li); });
    novos = [l];
  } else if (tipo === 'p' && partes.length > 1) {
    novos = partes.map(h => { const p = document.createElement('p'); p.innerHTML = h || '<br>'; return p; });
  } else {
    const el = document.createElement(tipo); el.innerHTML = partes.filter(Boolean).join('<br>') || '<br>'; novos = [el];
  }
  if (centro && tipo !== 'ul' && tipo !== 'ol') novos.forEach(n => n.classList.add('centro'));
  b.replaceWith(...novos);
  caretEm(novos[novos.length - 1]); editorMudou();
}
function acaoBt(acao, btn) {
  const b = blocoAtual; if (!b) return; const tipo = tipoBloco(b);
  if (acao !== 'tipo' && acao !== 'alinhar' && acao !== 'mais' && acao !== 'opcoes') fecharPop();
  switch (acao) {
    case 'tipo':
      if (!TIPOS_TEXTO.includes(tipo)) return;
      abrirPop(btn, BLOCOS.filter(x => TIPOS_TEXTO.includes(x.id)).map(x => ({ nome: x.nome, ico: `<b>${x.ico}</b>`, on: x.id === tipo, fn: () => transformar(b, x.id) })));
      break;
    case 'cima': if (b.previousElementSibling) { b.previousElementSibling.before(b); depoisMover(b); } break;
    case 'baixo': if (b.nextElementSibling) { b.nextElementSibling.after(b); depoisMover(b); } break;
    case 'alinhar': {
      const c = b.classList.contains('centro');
      abrirPop(btn, [
        { nome: 'Alinhar à esquerda', ico: ICO.esq, on: !c, fn: () => { b.classList.remove('centro'); editorMudou(); posicionarUI(); } },
        { nome: 'Centralizar', ico: ICO.centro, on: c, fn: () => { b.classList.add('centro'); editorMudou(); posicionarUI(); } }
      ]);
      break;
    }
    case 'bold': case 'italic': fmt(acao); break;
    case 'link':
      if (tipo === 'video') { pedirVideo(b); break; }
      if (tipo === 'botao') {
        const a = b.querySelector('a');
        Auth.perguntar('Endereço do botão', a ? a.getAttribute('href') : '', { ok: 'Salvar', placeholder: '/ansiedade/ ou https://...' }).then(u => { if (u && a) { a.setAttribute('href', u.trim()); editorMudou(); } });
      } else {
        restaurarSelecao();
        if (!getSelection().toString()) { toast('Selecione primeiro o texto que vai virar link.', 'aviso'); return; }
        Auth.perguntar('Endereço do link', '/', { texto: 'Ex.: /ansiedade/ ou https://...', ok: 'Criar link' }).then(u => { if (u) { restaurarSelecao(); document.execCommand('createLink', false, u.trim()); editorMudou(); } });
      }
      break;
    case 'mais':
      abrirPop(btn, [
        { nome: 'Sublinhado', ico: '<u>U</u>', fn: () => fmt('underline') },
        { nome: 'Tachado', ico: '<s>S</s>', fn: () => fmt('strikeThrough') },
        { nome: 'Código', ico: '&lt;/&gt;', fn: codigoInline },
        '-',
        { nome: 'Limpar formatação', ico: '⌫', fn: () => fmt('removeFormat') }
      ]);
      break;
    case 'alt': {
      const img = b.querySelector('img');
      Auth.perguntar('Descrição da imagem', img.getAttribute('alt') || '', { texto: 'Ajuda no Google e na acessibilidade.', ok: 'Salvar' }).then(v => { if (v !== null) { img.setAttribute('alt', v.trim()); editorMudou(); } });
      break;
    }
    case 'opcoes':
      abrirPop(btn, [
        { nome: 'Duplicar', fn: () => { const c = b.cloneNode(true); c.classList.remove('b-sel', 'b-vazio'); b.after(c); caretEm(c); editorMudou(); } },
        { nome: 'Adicionar bloco antes', fn: () => { const p = novoP(); b.before(p); caretEm(p); editorMudou(); } },
        { nome: 'Adicionar bloco depois', fn: () => { const p = novoP(); b.after(p); caretEm(p); editorMudou(); } },
        '-',
        { nome: 'Excluir bloco', perigo: true, fn: () => excluirBloco(b) }
      ]);
      break;
  }
}

/* menu de blocos ( + e / ) */
function filtrados() { const q = norm(menuB.q || ''); return BLOCOS.filter(x => !q || norm(x.nome + ' ' + x.kw + ' ' + x.id).includes(q)); }
function renderMenu() {
  const L = filtrados(); if (menuB.idx >= L.length) menuB.idx = 0;
  $('#a-menu-lista').innerHTML = L.length
    ? L.map((x, i) => `<button type="button" data-id="${x.id}" class="${i === menuB.idx ? 'ativo' : ''}"><span class="mb-ico">${x.ico}</span><span><b>${esc(x.nome)}</b><small>${esc(x.desc)}</small></span></button>`).join('')
    : '<p class="mb-vazio">Nenhum bloco encontrado</p>';
  const at = $('#a-menu-lista .ativo'); if (at) at.scrollIntoView({ block: 'nearest' });
}
function abrirMenu(origem, alvo, q) {
  const m = $('#a-menu'), busca = $('#a-menu-busca');
  menuB = { aberto: true, origem, alvo, q: q || '', idx: 0 };
  busca.hidden = origem === 'slash'; busca.value = '';
  renderMenu(); m.hidden = false; fecharPop();
  const larg = $('#a-ed-wrap').clientWidth;
  if (origem === 'topo' || !alvo || !alvo.isConnected) { m.style.top = '8px'; m.style.left = '8px'; }
  else {
    m.style.top = (alvo.offsetTop + alvo.offsetHeight + 8) + 'px';
    const esq = origem === 'ins' ? alvo.offsetLeft + alvo.offsetWidth - m.offsetWidth : alvo.offsetLeft;
    m.style.left = Math.max(6, Math.min(esq, larg - m.offsetWidth - 6)) + 'px';
  }
  if (origem !== 'slash') setTimeout(() => busca.focus(), 0);
}
function fecharMenu() { $('#a-menu').hidden = true; menuB = { aberto: false }; }
function navMenu(e) {
  if (!menuB.aberto) return false;
  const L = filtrados(), n = Math.max(1, L.length);
  if (e.key === 'ArrowDown') { menuB.idx = (menuB.idx + 1) % n; renderMenu(); }
  else if (e.key === 'ArrowUp') { menuB.idx = (menuB.idx - 1 + n) % n; renderMenu(); }
  else if (e.key === 'Enter') { if (L[menuB.idx]) escolherBloco(L[menuB.idx].id); else fecharMenu(); }
  else if (e.key === 'Escape') { const o = menuB.origem, alvo = menuB.alvo; fecharMenu(); if (o !== 'slash' && alvo) caretEm(alvo); }
  else return false;
  e.preventDefault(); return true;
}
function escolherBloco(id) {
  const ed = ED(); let alvo = menuB.alvo; const origem = menuB.origem; fecharMenu();
  if (!alvo || !alvo.isConnected) alvo = blocoAtual && blocoAtual.isConnected ? blocoAtual : ed.lastElementChild;
  if (origem === 'slash' && alvo) alvo.innerHTML = '<br>';
  if (!blocoVazio(alvo)) { const p = novoP(); if (alvo && alvo.parentNode === ed) alvo.after(p); else ed.appendChild(p); alvo = p; }
  if (TIPOS_TEXTO.includes(id)) { if (id === 'p') { caretEm(alvo); editorMudou(); } else transformar(alvo, id); }
  else if (id === 'img') { caretEm(alvo); $('#a-img-file').click(); }
  else if (id === 'hr') { alvo.before(document.createElement('hr')); caretEm(alvo); editorMudou(); }
  else if (id === 'video') { pedirVideo(null, alvo); }
  else if (id === 'botao') {
    const p = document.createElement('p'); p.className = 'botao';
    p.innerHTML = `<a href="${esc(waLink(null, 'Olá! Quero agendar uma consulta.'))}">Agendar consulta pelo WhatsApp</a>`;
    alvo.before(p); caretEm(alvo); editorMudou();
  }
}
/* ---------- Vídeo do YouTube no texto ----------
   Fica guardado como: <figure class="video" data-video="ID"><a href="link do YouTube"><img miniatura></a><figcaption>título</figcaption></figure>
   No site, js/artigo-pagina.js troca pelo vídeo só quando a pessoa clica no play. */
function idYoutube(u) {
  u = String(u || '').trim();
  if (/^[\w-]{11}$/.test(u)) return u;
  try {
    const url = new URL(/^https?:/i.test(u) ? u : 'https://' + u);
    const h = url.hostname.replace(/^(www\.|m\.|music\.)/, '');
    let id = '';
    if (h === 'youtu.be') id = url.pathname.slice(1);
    else if (/(^|\.)youtube(-nocookie)?\.com$/.test(h)) id = url.searchParams.get('v') || (url.pathname.match(/\/(shorts|embed|live|v)\/([^/?]+)/) || [])[2] || '';
    id = id.split(/[?&/]/)[0];
    return /^[\w-]{11}$/.test(id) ? id : '';
  } catch (e) { return ''; }
}
function htmlVideo(id, titulo) {
  return `<a href="https://www.youtube.com/watch?v=${id}"><img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="${esc(titulo ? 'Vídeo: ' + titulo : 'Vídeo do YouTube')}" width="480" height="360" loading="lazy"></a>${titulo ? `<figcaption>${esc(titulo)}</figcaption>` : ''}`;
}
/* novo vídeo (alvo = linha onde entra) ou trocar o link de um que já existe (fig) */
async function pedirVideo(fig, alvo) {
  const atual = fig ? `https://www.youtube.com/watch?v=${fig.dataset.video}` : '';
  const u = await Auth.perguntar(fig ? 'Trocar o vídeo' : 'Link do vídeo do YouTube', atual, { texto: 'Cole o link do vídeo (ex.: https://www.youtube.com/watch?v=… ou https://youtu.be/…).', ok: fig ? 'Salvar' : 'Continuar', placeholder: 'https://www.youtube.com/watch?v=...' });
  if (u == null || !u.trim()) { if (alvo) caretEm(alvo); return; }
  const id = idYoutube(u);
  if (!id) { toast('Não reconheci esse link. Use o link de um vídeo do YouTube.', 'erro'); if (alvo) caretEm(alvo); return; }
  const tituloAtual = fig ? ((fig.querySelector('figcaption') || {}).textContent || '') : '';
  const titulo = await Auth.perguntar('Título do vídeo (opcional)', tituloAtual, { texto: 'Aparece embaixo do vídeo e ajuda no Google. Pode deixar vazio.', ok: 'Pronto', cancelar: 'Sem título', placeholder: 'Ex.: 3 sinais de ansiedade no trabalho' });
  const f = fig || document.createElement('figure');
  f.className = 'video'; f.dataset.video = id; f.setAttribute('contenteditable', 'false');
  f.innerHTML = htmlVideo(id, (titulo || '').trim());
  if (!fig) { if (alvo && alvo.isConnected) alvo.before(f); else ED().appendChild(f); caretEm(alvo); }
  editorMudou();
}
function prepararEditor() {
  const ed = ED();
  ed.querySelectorAll('figure.video').forEach(f => f.setAttribute('contenteditable', 'false'));
  ed.querySelectorAll('.b-sel, .b-vazio').forEach(x => x.classList.remove('b-sel', 'b-vazio'));
  normalizarEditor(); blocoAtual = null; edFocado = false; fecharMenu(); fecharPop(); posicionarUI();
}
function iniciarEditorBlocos() {
  ED().addEventListener('click', e => { if (e.target.closest('figure.video a')) e.preventDefault(); });
  const ed = ED(), wrap = $('#a-ed-wrap'), bt = $('#a-bt'), pop = $('#a-pop'), menu = $('#a-menu'), ins = $('#a-ins');
  $$('[data-ico]').forEach(el => { el.innerHTML = ICO[el.dataset.ico]; });

  document.addEventListener('selectionchange', () => {
    const s = getSelection(); if (!s.rangeCount) return;
    const n = s.anchorNode; if (!n || n === ed || !ed.contains(n)) return;
    if (Date.now() < fixarAte) return;
    const b = blocoDe(n); if (!b) return;
    rangeSalvo = s.getRangeAt(0).cloneRange();
    if (b !== blocoAtual) setAtual(b); else { b.classList.toggle('b-vazio', blocoVazio(b)); posicionarUI(); }
  });
  ed.addEventListener('focus', () => { edFocado = true; posicionarUI(); });
  wrap.addEventListener('focusout', () => setTimeout(() => {
    const at = document.activeElement;
    if (at !== ed) { edFocado = false; posicionarUI(); }
    if (!wrap.contains(at)) fecharMenu();
  }, 150));
  ed.addEventListener('mousedown', e => {
    if (e.target.tagName === 'HR') { e.preventDefault(); ed.focus({ preventScroll: true }); fixarAte = Date.now() + 300; edFocado = true; setAtual(e.target); }
  });
  ed.addEventListener('keydown', e => {
    if (navMenu(e)) return;
    const b = Date.now() < fixarAte ? blocoAtual : blocoDaSelecao();
    if (b && tipoBloco(b) === 'hr' && (e.key === 'Backspace' || e.key === 'Delete')) { e.preventDefault(); excluirBloco(b); return; }
    if (b && tipoBloco(b) === 'hr' && e.key === 'Enter') { e.preventDefault(); const p = novoP(); b.after(p); caretEm(p); editorMudou(); return; }
    if (e.key === 'Enter' && !e.shiftKey && b && b.classList.contains('botao')) { e.preventDefault(); const p = novoP(); b.after(p); caretEm(p); editorMudou(); return; }
    if (e.key === 'Escape') fecharPop();
  });
  ed.addEventListener('input', () => {
    const criado = normalizarEditor();
    if (criado) caretEm(criado);
    const b = blocoDaSelecao();
    if (b && b.tagName === 'P' && !b.classList.contains('botao')) {
      const m = b.textContent.match(/^\/([^\s/]{0,24})$/);
      if (m) { if (menuB.aberto && menuB.origem === 'slash' && menuB.alvo === b) { menuB.q = m[1]; menuB.idx = 0; renderMenu(); } else abrirMenu('slash', b, m[1]); }
      else if (menuB.aberto && menuB.origem === 'slash') fecharMenu();
    }
    posicionarUI();
  });

  bt.addEventListener('mousedown', e => e.preventDefault());
  bt.addEventListener('click', e => { const btn = e.target.closest('button[data-bt]'); if (btn) acaoBt(btn.dataset.bt, btn); });
  pop.addEventListener('mousedown', e => e.preventDefault());
  pop.addEventListener('click', e => {
    const btn = e.target.closest('button[data-i]'); if (!btn) return;
    const it = pop._itens[+btn.dataset.i]; fecharPop(); if (it && it.fn) it.fn();
  });
  ins.addEventListener('mousedown', e => e.preventDefault());
  ins.addEventListener('click', () => abrirMenu('ins', blocoAtual));
  menu.addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); });
  menu.addEventListener('click', e => { const btn = e.target.closest('button[data-id]'); if (btn) escolherBloco(btn.dataset.id); });
  $('#a-menu-busca').addEventListener('input', e => { menuB.q = e.target.value; menuB.idx = 0; renderMenu(); });
  $('#a-menu-busca').addEventListener('keydown', navMenu);

  $('#eb-add').addEventListener('mousedown', e => e.preventDefault());
  $('#eb-add').addEventListener('click', () => { if (menuB.aberto) fecharMenu(); else abrirMenu('topo', blocoAtual); });
  $('#eb-desfazer').addEventListener('mousedown', e => e.preventDefault());
  $('#eb-refazer').addEventListener('mousedown', e => e.preventDefault());
  $('#eb-desfazer').addEventListener('click', () => { ed.focus(); document.execCommand('undo'); editorMudou(); posicionarUI(); });
  $('#eb-refazer').addEventListener('click', () => { ed.focus(); document.execCommand('redo'); editorMudou(); posicionarUI(); });

  document.addEventListener('mousedown', e => {
    const t = e.target;
    if (!pop.hidden && !pop.contains(t) && !bt.contains(t)) fecharPop();
    if (menuB.aberto && !menu.contains(t) && !ins.contains(t) && !$('#eb-add').contains(t)) fecharMenu();
  });
  window.addEventListener('resize', posicionarUI);
}

/* ---------- SEO (estilo Rank Math) ---------- */
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const SUFIXO = ' | Psicólogos Brasil';
function analisarSeo(a) {
  const k = (a.palavras || [])[0] || '', kn = norm(k);
  const tituloG = a.tituloSeo || a.titulo || '', tg = norm(tituloG);
  const tmp = document.createElement('div'); tmp.innerHTML = a.html || '';
  const tn = norm(tmp.textContent), pal = contarPalavras(a.html);
  const subt = [...tmp.querySelectorAll('h2,h3,h4')].map(h => norm(h.textContent));
  const alts = [...tmp.querySelectorAll('img')].map(i => norm(i.getAttribute('alt'))).concat(a.capa ? [norm(a.capa.alt)] : []);
  const links = [...tmp.querySelectorAll('a[href]')].map(x => x.getAttribute('href') || '');
  let host = ''; try { host = new URL(state.config.siteUrl).host; } catch (e) {}
  const internos = links.filter(h => h.startsWith('/') || (host && h.includes(host))).length;
  const externos = links.filter(h => /^https?:/i.test(h) && !(host && h.includes(host)) && !/whatsapp\.com|wa\.me/i.test(h)).length;
  const d = (a.descricao || '').length, tl = (tituloG + SUFIXO).length;
  const L = [], add = (ok, sim, nao) => L.push({ ok, txt: ok ? sim : nao });
  if (!kn) L.push({ ok: false, txt: 'Adicione a palavra-chave principal para ver a análise completa.' });
  else {
    const ocorr = tn.split(kn).length - 1;
    const dens = pal ? ocorr * kn.split(' ').length / pal * 100 : 0;
    const inicio = tn.slice(0, Math.max(250, Math.floor(tn.length * 0.1)));
    const pos = tg.indexOf(kn);
    const repetida = state.artigos.some(x => x.id !== a.id && norm((x.palavras || [])[0]) === kn);
    add(pos > -1, 'Palavra-chave no título do Google', 'Coloque a palavra-chave no título');
    add(pos > -1 && pos <= tg.length / 2, 'Palavra-chave no começo do título', 'Coloque a palavra-chave mais no começo do título');
    add(norm(a.descricao).includes(kn), 'Palavra-chave no resumo do Google', 'Use a palavra-chave no resumo para o Google');
    add((a.slug || '').includes(slugify(k)), 'Palavra-chave no link', 'Coloque a palavra-chave no link do artigo');
    add(inicio.includes(kn), 'Palavra-chave no início do texto', 'Use a palavra-chave logo no primeiro parágrafo');
    add(subt.some(x => x.includes(kn)), 'Palavra-chave em um Título/Subtítulo do texto', 'Use a palavra-chave em pelo menos um Título ou Subtítulo');
    add(alts.some(x => x.includes(kn)), 'Palavra-chave na descrição de uma imagem', 'Use a palavra-chave na descrição (alt) da capa ou de outra imagem');
    add(dens >= 0.5 && dens <= 2.5, `Palavra-chave aparece ${ocorr}x (${dens.toFixed(1).replace('.', ',')}% do texto)`,
      dens < 0.5 ? `Palavra-chave aparece pouco: ${ocorr}x (${dens.toFixed(1).replace('.', ',')}%). Ideal entre 0,5% e 2,5%` : `Palavra-chave repetida demais: ${dens.toFixed(1).replace('.', ',')}%. Ideal até 2,5%`);
    add(!repetida, 'Palavra-chave principal não é usada em outro artigo', 'Outro artigo já usa essa palavra-chave principal. Os dois vão competir no Google');
  }
  add(pal >= 600, `Texto com ${pal} palavras`, `Texto curto: ${pal} palavras. Recomendado 600 ou mais`);
  add(tl <= 60, `Título do Google com ${tl} caracteres`, `Título do Google com ${tl} caracteres. O Google corta depois de uns 60`);
  add(d >= 120 && d <= 160, `Resumo do Google com ${d} caracteres`, d === 0 ? 'Escreva o resumo para o Google' : `Resumo do Google com ${d} caracteres. Ideal entre 120 e 160`);
  add(internos > 0, `${internos} link(s) para páginas do site`, 'Adicione links para outras páginas do site (ex.: /psicologos/ ou outro artigo)');
  add(externos > 0, `${externos} link(s) para fontes externas`, 'Adicione um link para uma fonte confiável (estudo, órgão oficial)');
  add(!!(a.capa && a.capa.data), 'Tem imagem de capa', 'Adicione uma imagem de capa');
  const nota = Math.round(L.filter(x => x.ok).length / L.length * 100);
  return { L, nota };
}
const classeNota = n => n >= 80 ? 'bom' : n >= 50 ? 'medio' : 'ruim';
function seloSeo(a) { const n = analisarSeo(a).nota; return `<span class="selo seo-${classeNota(n)}">SEO ${n}</span>`; }
function renderTags(a) {
  const box = $('#a-tags'), inp = $('#a-tag-input');
  box.querySelectorAll('.tag').forEach(t => t.remove());
  (a.palavras || []).forEach((k, i) => {
    const t = document.createElement('span');
    t.className = 'tag' + (i === 0 ? ' principal' : ''); t.dataset.i = i;
    t.title = i === 0 ? 'Palavra-chave principal' : 'Clique para tornar principal';
    t.innerHTML = `<button type="button" class="tag-x" data-x="${i}" aria-label="Remover ${esc(k)}">×</button>${i === 0 ? '★ ' : ''}${esc(k)}`;
    box.insertBefore(t, inp);
  });
  inp.placeholder = (a.palavras || []).length ? 'Outra palavra-chave…' : 'Ex.: ansiedade';
}
function renderSeo(a) {
  const tituloG = (a.tituloSeo || a.titulo || 'Título do artigo') + SUFIXO;
  $('#sn-titulo').textContent = tituloG.length > 62 ? tituloG.slice(0, 60).trim() + '…' : tituloG;
  $('#sn-link').textContent = state.config.siteUrl.replace(/\/+$/, '') + ' › ' + (slugify(a.slug) || 'link-do-artigo');
  const desc = a.descricao || '', sd = $('#sn-desc');
  sd.textContent = desc ? (desc.length > 160 ? desc.slice(0, 157).trim() + '…' : desc) : 'Sem resumo: o Google vai pegar um trecho qualquer do texto. Escreva o resumo acima.';
  sd.classList.toggle('vazio', !desc);
  renderTags(a);
  const { L, nota } = analisarSeo(a);
  const el = $('#a-seo-nota'); el.textContent = `${nota} / 100`; el.className = 'seo-nota ' + classeNota(nota);
  const fx = $('#a-seo-nota-fixa'); if (fx) { fx.textContent = el.textContent; fx.className = el.className; }
  $('#a-checks').innerHTML = [...L].sort((x, y) => x.ok - y.ok).map(c => `<li class="${c.ok ? 'ok' : 'no'}"><span class="i">${c.ok ? '✓' : '!'}</span><span>${esc(c.txt)}</span></li>`).join('');
}
function addPalavra(txt) {
  const a = artigoAtual(); if (!a) return;
  a.palavras = a.palavras || [];
  txt.split(',').map(t => t.trim()).filter(Boolean).forEach(t => { if (!a.palavras.some(x => norm(x) === norm(t))) a.palavras.push(t); });
  marcarAlterado(a); salvar(); infoArtigo(); renderListaArtigosDebounce();
}

async function validarArtigo(a) {
  if (!a.titulo.trim()) { toast('Coloque um título no artigo.', 'erro'); return false; }
  if (!a.slug) { toast('O link do artigo está vazio.', 'erro'); return false; }
  if (RESERVADOS.includes(a.slug)) { toast(`O link “${a.slug}” já é usado por uma página do site. Escolha outro.`, 'erro'); return false; }
  if (state.artigos.some(x => x.id !== a.id && x.slug === a.slug)) { toast('Já existe outro artigo com esse link.', 'erro'); return false; }
  if (!textoPuro(a.html)) { toast('O artigo ainda não tem texto.', 'erro'); return false; }
  const ex = lerSchemaExtra(a.schemaExtra);
  if (!ex.ok) { toast('Corrija o schema personalizado antes de salvar: ' + ex.erro, 'erro'); return false; }
  if ((a.faq || []).some(f => (f.p || '').trim() && !(f.r || '').trim())) { toast('Tem pergunta do FAQ sem resposta.', 'erro'); return false; }
  if (!a.descricao.trim() && !(await Auth.confirmar('Resumo para o Google vazio', 'O resumo ajuda bastante no SEO. Publicar mesmo assim?', { ok: 'Publicar mesmo assim', cancelar: 'Voltar e preencher', icone: 'alerta' }))) return false;
  return true;
}
