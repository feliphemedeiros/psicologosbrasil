/* Modo online: imagens, rascunhos na nuvem, publicar/excluir/desativar no site e login.
   Usado pelas páginas psicologos.html, artigos.html, usuarios.html e config.html. Os arquivos rodam em ordem e dividem as mesmas variáveis. */
/* =========================================================
   PAINEL ONLINE — login + botão "Publicar no site"
   ---------------------------------------------------------
   MODO TESTE (js/firebase-config.js vazio):
     usuário "admin", senha "psicologos2026".
     Tudo fica guardado SÓ neste navegador; o site mostra o que foi
     publicado apenas neste mesmo navegador. Serve para testar o fluxo.
   MODO FIREBASE (chaves coladas em js/firebase-config.js):
     login com e-mail e senha criados no Firebase; rascunhos e
     publicações ficam na nuvem e todo visitante vê o que foi publicado.
   ========================================================= */
const ONLINE = { modo: NUVEM.modo, email: '', nome: '', authMod: null, auth: null };
const LOGIN_TESTE = { usuario: 'admin', senha: 'psicologos2026' };
const SITE_REL = '../'; // o painel fica em /painel/; o site está uma pasta acima
/* no computador (Live Server) o endereço curto do artigo também não funciona: lá usa blog/artigo/?a= */
const linkArtigo = slug => /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) ? `${SITE_REL}blog/artigo/?a=${encodeURIComponent(slug)}` : `${SITE_REL}${encodeURIComponent(slug)}/`;
/* no computador (Live Server) o endereço curto não funciona sem o .htaccess: lá usa ?p= */
const linkPerfil = slug => /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) ? `${SITE_REL}psicologos/perfil/?p=${encodeURIComponent(slug)}` : `${SITE_REL}especialista/${encodeURIComponent(slug)}/`;

/* ---------- imagens: guardadas à parte, cada uma com um código ---------- */
function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) { ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}
const idImagem = d => cyrb53(d, 1).toString(36) + cyrb53(d, 7).toString(36);
const RE_DATA = /data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g;
const LIMITE_IMG = 900000; // o Firebase aceita até ~1 MB por item
const imgsNaNuvem = new Set();

function reduzirImagem(d, fator) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const w = Math.max(1, Math.round(img.width * fator)), h = Math.max(1, Math.round(img.height * fator));
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      let r = cv.toDataURL('image/webp', 0.75);
      if (!r.startsWith('data:image/webp')) r = cv.toDataURL('image/jpeg', 0.75);
      res(r);
    };
    img.onerror = () => res(d);
    img.src = d;
  });
}
async function caber(d) { let r = d, f = 0.8; while (r.length > LIMITE_IMG && f > 0.1) { r = await reduzirImagem(d, f); f -= 0.15; } return r; }

/* Troca as imagens dentro de um objeto por "pbimg:código" e devolve as imagens separadas. */
async function desidratar(obj) {
  const imagens = {};
  async function texto(s) {
    const achados = s.match(RE_DATA); if (!achados) return s;
    for (const d of new Set(achados)) {
      const id = idImagem(d);
      if (!imagens[id]) imagens[id] = await caber(d);
      s = s.split(d).join(NUVEM.PREFIXO + id);
    }
    return s;
  }
  async function andar(v) {
    if (typeof v === 'string') return texto(v);
    if (Array.isArray(v)) { const r = []; for (const x of v) r.push(await andar(x)); return r; }
    if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) if (v[k] !== undefined) o[k] = await andar(v[k]); return o; }
    return v === undefined ? null : v;
  }
  return { obj: await andar(obj), imagens };
}
/* O contrário: troca "pbimg:código" pela imagem de verdade. */
async function hidratar(v) {
  if (typeof v === 'string') { (v.match(NUVEM.RE) || []).forEach(r => imgsNaNuvem.add(r.slice(NUVEM.PREFIXO.length))); return NUVEM.resolverTexto(v); }
  if (Array.isArray(v)) return Promise.all(v.map(hidratar));
  if (v && typeof v === 'object') { const o = {}; await Promise.all(Object.keys(v).map(async k => { o[k] = await hidratar(v[k]); })); return o; }
  return v;
}
async function gravarImagens(imagens) {
  const ids = Object.keys(imagens); if (!ids.length) return;
  if (ONLINE.modo === 'firebase') {
    const { fs, db } = await NUVEM.firebase();
    for (const id of ids) {
      if (imgsNaNuvem.has(id)) continue;
      await fs.setDoc(fs.doc(db, 'imagens', id), { data: imagens[id] });
      imgsNaNuvem.add(id);
    }
  } else {
    const pub = NUVEM.lerLocal(); ids.forEach(id => { pub.imagens[id] = imagens[id]; }); NUVEM.gravarLocal(pub);
  }
}

/* ---------- rascunhos na nuvem (modo Firebase) ---------- */
const ultimo = {}; // o que já está salvo na nuvem, para só enviar o que mudou
let tNuvem = null, sincronizando = false, pendente = false;
/* o suporte não mexe nas configurações; artigos só com o acesso extra "Artigos" (as regras do banco também barram) */
const souAdmin = () => ((Auth.sessao() || {}).papel === 'admin');
const podeArtigos = () => Auth.pode('artigos');
function chavesAtuais() {
  const m = {};
  if (podeArtigos()) state.artigos.forEach(o => { m['painel_artigos/' + o.id] = o; });
  state.psicologos.forEach(o => { m['painel_psicologos/' + o.id] = o; });
  if (souAdmin()) m['painel_config/geral'] = state.config;
  return m;
}
const precisaSalvar = () => { const a = chavesAtuais(); return Object.keys(a).some(k => ultimo[k] !== JSON.stringify(a[k])) || Object.keys(ultimo).some(k => !(k in a)); };
function statusNuvem(txt, tipo) { const el = $('#nuvemStatus'); if (el) { el.textContent = txt; el.className = 'nuvem-status ' + (tipo || ''); } }
function agendarNuvem() { clearTimeout(tNuvem); statusNuvem('Salvando…'); tNuvem = setTimeout(sincronizar, 1000); }
async function sincronizar() {
  tNuvem = null;
  if (sincronizando) { pendente = true; return; }
  sincronizando = true;
  try {
    const { fs, db } = await NUVEM.firebase();
    const atuais = chavesAtuais();
    for (const [k, o] of Object.entries(atuais)) {
      const j = JSON.stringify(o); if (ultimo[k] === j) continue;
      const { obj, imagens } = await desidratar(o);
      await gravarImagens(imagens);
      const [col, id] = k.split('/');
      await fs.setDoc(fs.doc(db, col, id), obj);
      ultimo[k] = j;
    }
    for (const k of Object.keys(ultimo)) if (!(k in atuais)) { const [col, id] = k.split('/'); await fs.deleteDoc(fs.doc(db, col, id)); delete ultimo[k]; }
    statusNuvem('✓ Tudo salvo na nuvem', 'ok');
  } catch (e) {
    console.error(e);
    statusNuvem(e && e.code === 'permission-denied' ? 'Sem permissão para salvar. Entre de novo.' : 'Sem conexão. Tentando salvar de novo…', 'erro');
    clearTimeout(tNuvem); tNuvem = setTimeout(sincronizar, 6000);
  } finally {
    sincronizando = false;
    if (pendente) { pendente = false; agendarNuvem(); }
  }
}
async function carregarNuvem() {
  statusNuvem('Carregando…');
  const { fs, db } = await NUVEM.firebase();
  const [sa, sp, sc] = await Promise.all([
    podeArtigos() ? fs.getDocs(fs.collection(db, 'painel_artigos')) : Promise.resolve({ docs: [] }),
    fs.getDocs(fs.collection(db, 'painel_psicologos')),
    fs.getDoc(fs.doc(db, 'painel_config', 'geral'))
  ]);
  state.artigos = (await Promise.all(sa.docs.map(d => hidratar(d.data())))).sort((x, y) => (y.criado || 0) - (x.criado || 0));
  state.psicologos = (await Promise.all(sp.docs.map(d => hidratar(d.data())))).sort((x, y) => (y.criado || 0) - (x.criado || 0));
  state.config = { ...CONFIG_PADRAO, ...(sc.exists() ? sc.data() : {}) };
  Object.entries(chavesAtuais()).forEach(([k, o]) => { ultimo[k] = JSON.stringify(o); });
  if (!sc.exists()) delete ultimo['painel_config/geral'];
  statusNuvem('✓ Tudo salvo na nuvem', 'ok');
}
window.addEventListener('beforeunload', e => {
  if (ONLINE.modo === 'firebase' && document.body.classList.contains('logado') && precisaSalvar()) { e.preventDefault(); e.returnValue = ''; }
});

/* ---------- publicar no site ---------- */
function artigoPublico(a) {
  const t = document.createElement('template'); t.innerHTML = limpar(a.html);
  t.content.querySelectorAll('[contenteditable]').forEach(e => e.removeAttribute('contenteditable'));
  t.content.querySelectorAll('img').forEach(img => {
    const w = img.getAttribute('data-w'), h = img.getAttribute('data-h');
    img.removeAttribute('data-w'); img.removeAttribute('data-h');
    if (!img.hasAttribute('alt')) img.setAttribute('alt', '');
    if (w && h) { img.setAttribute('width', w); img.setAttribute('height', h); }
    img.setAttribute('loading', 'lazy'); img.setAttribute('decoding', 'async');
  });
  const c = a.capa || {};
  return {
    slug: a.slug, titulo: a.titulo.trim(), tituloSeo: (a.tituloSeo || '').trim(), descricao: (a.descricao || '').trim(),
    categoria: a.categoria || '', data: a.data || hojeISO(), autor: a.autor || state.config.autor, autorCargo: autorDe(a).linha, autorFoto: autorDe(a).foto, palavras: a.palavras || [],
    minutos: minutos(a.html), html: t.innerHTML, capa: c.data || '', capaAlt: c.alt || '', capaW: c.w || 0, capaH: c.h || 0,
    faq: faqValidas(a).map(f => ({ p: f.p.trim(), r: f.r.trim() })), atualizado: Date.now()
  };
}
function psiPublico(p) {
  return {
    slug: p.slug, nome: p.nome.trim(), tratamento: p.tratamento, crp: (p.crp || '').trim(), opp: (p.opp || '').trim(), verificado: !!p.verificado,
    foto: (p.foto && p.foto.data) || '', abordagens: p.abordagens || [], temas: especialidadesDe(p), publico: p.publico || [],
    idiomas: (p.idiomas && p.idiomas.length) ? p.idiomas : ['Português'], acessibilidade: p.acessibilidade || [],
    valor: p.valor ? Number(p.valor) : null, duracao: Number(p.duracao) || 50,
    resumo: textoPuro(bioHtml(p.bio)).slice(0, 160), bio: p.bio || '', whatsapp: '',   /* agendamento pelo WhatsApp: sempre o número geral do site */
    /* textos e foto do ambiente da página do psicólogo (mesmo modelo da prévia) */
    video: (p.video || '').trim(), videoFormato: p.videoFormato || 'auto',
    titulo: (p.titulo || '').trim(), citacao: (p.citacao || '').trim(),
    passos: (p.passos || []).slice(0, 3).map(x => ({ t: ((x && x.t) || '').trim(), x: ((x && x.x) || '').trim() })),
    esperar: (p.esperar || '').trim(), ambiente: (p.ambiente && p.ambiente.data) || '',
    /* perguntas próprias (vazio = a página usa as automáticas) e schema personalizado já conferido */
    faq: faqValidas(p).map(f => ({ p: f.p.trim(), r: f.r.trim() })),
    schemaExtra: (() => { const ex = lerSchemaExtra(p.schemaExtra); return ex.ok ? ex.itens : []; })(),
    ativo: p.ativo !== false, genero: p.tratamento === 'Psicólogo' ? 'Homem' : p.tratamento === 'Psicóloga' ? 'Mulher' : 'Não binário',
    desde: p.criado || null,   /* data de entrada na plataforma (para o destaque de "novo") */
    atualizado: Date.now()
  };
}
/* indice/artigos e indice/psicologos: as listas que o site lê (uma leitura só por visita). */
async function atualizarIndice(tipo, tirar, item) {
  const { fs, db } = await NUVEM.firebase();
  const ref = fs.doc(db, 'indice', tipo);
  const s = await fs.getDoc(ref);
  let itens = s.exists() ? (s.data().itens || []) : [];
  itens = itens.filter(x => !tirar.includes(x.slug));
  if (item) itens.push(item);
  if (tipo === 'artigos') NUVEM.ordenar(itens);
  await fs.setDoc(ref, { itens, atualizado: Date.now() });
}
async function publicarDoc(tipo, slugNovo, slugAntigo, doc) {
  const { obj, imagens } = await desidratar(doc);
  await gravarImagens(imagens);
  if (ONLINE.modo === 'firebase') {
    const { fs, db } = await NUVEM.firebase();
    if (tipo === 'artigos') {
      await fs.setDoc(fs.doc(db, 'artigos', slugNovo), obj);
      if (slugAntigo && slugAntigo !== slugNovo) await fs.deleteDoc(fs.doc(db, 'artigos', slugAntigo));
    }
    await atualizarIndice(tipo, [slugAntigo, slugNovo].filter(Boolean), tipo === 'artigos' ? NUVEM.resumoArtigo(obj) : obj);
  } else {
    const pub = NUVEM.lerLocal();
    if (slugAntigo) delete pub[tipo][slugAntigo];
    pub[tipo][slugNovo] = obj;
    NUVEM.gravarLocal(pub);
  }
}
async function despublicar(tipo, slug) {
  if (!slug) return;
  if (ONLINE.modo === 'firebase') {
    const { fs, db } = await NUVEM.firebase();
    if (tipo === 'artigos') await fs.deleteDoc(fs.doc(db, 'artigos', slug));
    await atualizarIndice(tipo, [slug], null);
  } else {
    const pub = NUVEM.lerLocal(); delete pub[tipo][slug]; NUVEM.gravarLocal(pub);
  }
}
function erroAmigavel(e) {
  const m = String((e && (e.code || e.name || e.message)) || e);
  if (/permission/i.test(m)) return 'Sem permissão para publicar. Saia e entre de novo; se continuar, confira o papel do seu usuário na coleção “usuarios” do Firebase.';
  if (/quota/i.test(m)) return 'O navegador ficou sem espaço (modo teste guarda tudo aqui). Use imagens menores ou ative o Firebase.';
  if (/unavailable|network|tempo esgotado|failed to fetch/i.test(m)) return 'Sem conexão com a internet ou com o Firebase. Tente de novo em instantes.';
  return 'Não consegui publicar: ' + ((e && e.message) || m);
}
const sufixoModo = () => ONLINE.modo === 'teste' ? ' (modo teste: só aparece neste navegador)' : '';

/* Botões Publicar e Excluir (substituem "gerar arquivo / baixar .zip") */
gerarArtigo = async function () {
  const a = artigoAtual(); if (!a) return;
  a.slug = slugify(a.slug); $('#a-slug').value = a.slug;
  if (!(await validarArtigo(a))) return;
  const btn = $('#a-gerar'); btn.disabled = true; btn.textContent = 'Publicando…';
  try {
    await publicarDoc('artigos', a.slug, a.pubSlug, artigoPublico(a));
    a.pubSlug = a.slug; a.geradoEm = Date.now(); a.alterado = false; a.desativado = false;
    salvarAgora(); renderListaArtigos(); infoArtigo();
    toast('Publicado! O artigo já está na página Artigos' + sufixoModo() + '.', 'ok');
  } catch (e) { console.error(e); toast(erroAmigavel(e), 'erro'); }
  finally { btn.disabled = false; btn.textContent = 'Publicar no site'; }
};
gerarPsi = async function () {
  const p = psiAtual(); if (!p) return;
  p.slug = slugify(p.slug); $('#p-slug').value = p.slug;
  if (!(await validarPsi(p))) return;
  const btn = $('#p-gerar'); btn.disabled = true; btn.textContent = 'Publicando…';
  try {
    await publicarDoc('psicologos', p.slug, p.pubSlug, psiPublico(p));
    p.pubSlug = p.slug; p.geradoEm = Date.now(); p.alterado = false;
    salvarAgora(); renderListaPsicologos(); infoPsi();
    toast((p.ativo ? 'Publicado! O perfil já está na lista de psicólogos' : 'Salvo no site como oculto: o perfil não aparece na lista') + sufixoModo() + '.', 'ok');
  } catch (e) { console.error(e); toast(erroAmigavel(e), 'erro'); }
  finally { btn.disabled = false; btn.textContent = 'Publicar no site'; }
};
excluir = async function (tipo) {
  const lista = tipo === 'artigo' ? state.artigos : state.psicologos;
  const id = tipo === 'artigo' ? atualA : atualP;
  const o = lista.find(x => x.id === id); if (!o) return;
  const nome = tipo === 'artigo' ? (o.titulo || 'Sem título') : (o.nome || 'Sem nome');
  if (!(await Auth.confirmar(`Excluir “${nome}”?`, `${o.pubSlug ? 'Ele também sai do site.\n\n' : ''}Dica: antes de excluir, você pode exportar um backup em Configurações.`, { ok: 'Excluir', perigo: true, icone: 'lixo' }))) return;
  try { if (o.pubSlug) await despublicar(tipo === 'artigo' ? 'artigos' : 'psicologos', o.pubSlug); }
  catch (e) { console.error(e); toast(erroAmigavel(e), 'erro'); return; }
  lista.splice(lista.indexOf(o), 1); salvarAgora();
  if (tipo === 'artigo') { atualA = null; abrirArtigo(null); renderListaArtigos(); }
  else { atualP = null; abrirPsicologo(null); renderListaPsicologos(); }
  toast('Excluído' + (o.pubSlug ? ' do painel e do site.' : '.'), 'ok');
};

/* ---------- ajustes do painel para o modo online ---------- */
const salvarAgoraLocal = salvarAgora;
salvarAgora = function () {
  clearTimeout(tSalvar);
  if (ONLINE.modo === 'firebase') agendarNuvem(); else salvarAgoraLocal();
};
statusSelo = function (o) {
  if (o.desativado) return '<span class="selo ag-off">Desativado</span>';
  if (!o.geradoEm || !o.pubSlug) return '<span class="selo rasc">Rascunho</span>';
  if (o.alterado) return '<span class="selo alt">Alterado · publique de novo</span>';
  return '<span class="selo ok">No site</span>';
};
const infoArtigoBase = infoArtigo;
infoArtigo = function () {
  infoArtigoBase(); const a = artigoAtual();
  if (a && a.pubSlug && a.geradoEm && !a.desativado) $('#a-info').insertAdjacentHTML('beforeend', ` · <a href="${linkArtigo(a.pubSlug)}" target="_blank" rel="noopener">Ver no site ↗</a>`);
  botaoDesativarArtigo();
};
/* Desativar = tira o artigo do site sem apagar nada; Reativar = volta para o site como estava */
function botaoDesativarArtigo() {
  const a = artigoAtual(), b = $('#a-desativar'); if (!b) return;
  b.hidden = !a || !(a.pubSlug && (a.geradoEm || a.desativado));
  if (!a) return;
  b.textContent = a.desativado ? 'Reativar' : 'Desativar';
  b.title = a.desativado ? 'Volta para o site' : 'Tira do site sem apagar (dá para reativar depois)';
}
async function alternarArtigo() {
  const a = artigoAtual(); if (!a || !a.pubSlug) return;
  const desligar = !a.desativado, nome = a.titulo || 'este artigo';
  const ok = await Auth.confirmar(desligar ? `Desativar “${nome}”?` : `Reativar “${nome}”?`,
    desligar ? 'O artigo sai do site (lista de Artigos, página inicial e o link dele). Nada é apagado: dá para reativar quando quiser.'
             : 'O artigo volta para o site, no mesmo link.',
    { ok: desligar ? 'Desativar' : 'Reativar', perigo: desligar });
  if (!ok) return;
  const b = $('#a-desativar'); b.disabled = true;
  try {
    if (desligar) { await despublicar('artigos', a.pubSlug); a.desativado = true; }
    else {
      a.slug = slugify(a.slug);
      if (!(await validarArtigo(a))) return;
      await publicarDoc('artigos', a.slug, a.pubSlug, artigoPublico(a));
      a.desativado = false; a.pubSlug = a.slug; a.geradoEm = Date.now(); a.alterado = false;
    }
    salvarAgora(); renderListaArtigos(); infoArtigo();
    toast(desligar ? 'Artigo desativado: saiu do site.' : 'Artigo reativado: voltou para o site.', 'ok');
  } catch (e) { console.error(e); toast(erroAmigavel(e), 'erro'); }
  finally { b.disabled = false; botaoDesativarArtigo(); }
}
const infoPsiBase = infoPsi;
infoPsi = function () {
  infoPsiBase(); const p = psiAtual();
  if (typeof botaoDesativar === 'function') botaoDesativar();
};
const preencherConfigBase = preencherConfig;
preencherConfig = function () { preencherConfigBase(); $('#a-dominio').textContent = state.config.siteUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '') + '/'; };
atualizarPasta = function () {};

function prepararOnline() {
  const box = $('.pasta-box');
  box.innerHTML = `<div class="rot">${ONLINE.modo === 'firebase' ? 'Conectado como' : 'Modo teste'}</div>
    <div class="pasta-nome" id="contaNome"></div>
    <div class="nuvem-status" id="nuvemStatus"></div>
    <button class="btn pequeno" id="btnSair" type="button">Sair</button>
    <p class="dica">${ONLINE.modo === 'firebase'
      ? 'Tudo é salvo na nuvem enquanto você escreve. O site só muda quando você clica em “Publicar no site”.'
      : 'Os dados ficam só neste navegador. Para usar de verdade, ative o Firebase (veja o guia).'}</p>`;
  $('#btnSair').addEventListener('click', sair);
  ['#a-zip', '#p-zip'].forEach(s => { $(s).hidden = true; });
  $('#a-gerar').textContent = 'Publicar no site'; $('#p-gerar').textContent = 'Publicar no site';
  $$('.abas button[data-aba="html"]').forEach(b => { b.hidden = true; });
  ['#cfg-header', '#cfg-sitemap'].forEach(s => { const g = $(s).closest('.cfg-grupo'); if (g) g.hidden = true; });
  { const av = $('#cfg-avancado'); if (av && ![...av.querySelectorAll('.cfg-interno')].some(g => !g.hidden)) av.hidden = true; }
  const subA = $('#view-artigos .sub'); if (subA) subA.textContent = 'Escreva, confira a prévia e publique direto no site.';
  const subP = $('#view-psicologos .sub'); if (subP) subP.textContent = Auth.pode('psiPagina') ? 'Tudo de cada psicólogo num lugar só: página no site, agenda, disponibilidade, resumo e conta.' : 'Toque no psicólogo para ver os atendimentos e a disponibilidade dele.';
  const subC = $('#view-config .sub'); if (subC) subC.textContent = 'Valem para todo o painel.';
}

/* ---------- login ---------- */
function mostrarLogin(msg) {
  document.body.classList.remove('logado');
  $('#login').hidden = false; document.documentElement.classList.remove('tem-sessao');
  $('#loginErro').textContent = msg || '';
  const fb = ONLINE.modo === 'firebase';
  $('#loginUsuarioRot').textContent = fb ? 'E-mail' : 'Usuário';
  $('#loginUsuario').type = fb ? 'email' : 'text';
  $('#loginUsuario').autocomplete = fb ? 'email' : 'username';
  $('#loginModo').innerHTML = fb ? '🔒 Conexão segura com o Firebase' : '🧪 <b>Modo teste</b> · os dados ficam só neste navegador';
  $('#loginEsqueci').hidden = !fb;
  setTimeout(() => $('#loginUsuario').focus(), 30);
}
function abrirPainel() {
  [...state.artigos, ...state.psicologos].forEach(o => { if (o.geradoEm && !o.pubSlug) { o.geradoEm = null; o.alterado = false; } });
  $('#login').hidden = true;
  document.body.classList.add('logado');
  $('#contaNome').textContent = ONLINE.modo === 'firebase' ? (ONLINE.nome || ONLINE.email) : (Auth.sessao() || {}).nome || '';
  if (ONLINE.modo !== 'firebase') statusNuvem('Salvo neste navegador', 'ok');
  iniciarTelas();
}
let falhas = 0, bloqueadoAte = 0;
async function entrar(e) {
  e.preventDefault();
  const usuario = $('#loginUsuario').value.trim(), senha = $('#loginSenha').value;
  const btn = $('#loginBtn'), erro = $('#loginErro');
  if (Date.now() < bloqueadoAte) { erro.textContent = `Muitas tentativas. Aguarde ${Math.ceil((bloqueadoAte - Date.now()) / 1000)} segundos.`; return; }
  btn.disabled = true; btn.textContent = 'Entrando…'; erro.textContent = '';
  try {
    if (ONLINE.modo === 'firebase') {
      await ONLINE.authMod.signInWithEmailAndPassword(ONLINE.auth, usuario, senha);
      return; // onAuthStateChanged abre o painel
    }
    await new Promise(r => setTimeout(r, 500));
    if (usuario === LOGIN_TESTE.usuario && senha === LOGIN_TESTE.senha) {
      falhas = 0; sessionStorage.setItem('pb-sessao', 'ok'); carregar(); abrirPainel();
    } else throw { code: 'auth/invalid-credential' };
  } catch (err) {
    falhas++;
    if (falhas >= 5) { bloqueadoAte = Date.now() + 60000; falhas = 0; }
    const c = (err && err.code) || '';
    erro.textContent = c === 'auth/too-many-requests' ? 'Muitas tentativas. O acesso foi bloqueado por alguns minutos.'
      : /network/.test(c) ? 'Sem internet. Confira a conexão.'
      : 'Usuário ou senha incorretos.';
    $('#loginSenha').value = ''; $('#loginSenha').focus();
  } finally { btn.disabled = false; btn.textContent = 'Entrar'; }
}
async function esqueciSenha(e) {
  e.preventDefault();
  const email = $('#loginUsuario').value.trim();
  if (!email) { $('#loginErro').textContent = 'Digite seu e-mail acima e clique de novo em “Esqueci a senha”.'; return; }
  try { await ONLINE.authMod.sendPasswordResetEmail(ONLINE.auth, email); } catch (err) { /* não revela se o e-mail existe */ }
  $('#loginErro').textContent = 'Se esse e-mail tiver acesso, você vai receber um link para criar uma nova senha.';
}
async function sair() {
  if (ONLINE.modo === 'firebase') {
    if (precisaSalvar()) { statusNuvem('Salvando antes de sair…'); clearTimeout(tNuvem); await sincronizar(); }
    try { await ONLINE.authMod.signOut(ONLINE.auth); } catch (e) {}
  } else sessionStorage.removeItem('pb-sessao');
  location.reload();
}
async function iniciarFirebase() {
  /* Login único: quem entra é a tela /painel/ (index.html), com o Firebase
     (e-mail + senha + app autenticador). Aqui só confere quem é e o papel. */
  const x = await NUVEM.authPronta();
  ONLINE.authMod = x.authMod; ONLINE.auth = x.auth;
  const u = x.usuario, s = Auth.sessao();
  if (!u || !s || s.uid !== u.uid) { Auth.sairAgora(); return; }
  try {
    const doc = await x.fs.getDoc(x.fs.doc(x.db, 'usuarios', u.uid));
    const d = doc.exists() ? doc.data() : null;
    if (!d || d.ativo === false || !['admin', 'suporte'].includes(d.papel)) { Auth.sairAgora(); return; }
    ONLINE.email = u.email || ''; ONLINE.nome = d.nome || '';
    await carregarNuvem(); abrirPainel();
  } catch (e) {
    console.error(e);
    statusNuvem('Não consegui abrir os dados: confira a internet e as regras do Firebase.', 'erro');
    toast('Não consegui carregar os dados do Firebase. Confira a internet e as regras (firestore.rules).', 'erro');
  }
}

/* o início do painel fica no último script desta página */
