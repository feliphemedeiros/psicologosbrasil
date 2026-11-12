/* Base: utilidades, imagens, armazenamento, pasta do site e o HTML/CSS das páginas geradas.
   Usado pelas páginas psicologos.html, artigos.html, usuarios.html e config.html. Os arquivos rodam em ordem e dividem as mesmas variáveis. */
/* =========================================================
   Painel Psicólogos Brasil
   Roda 100% no navegador. Nada é enviado para a internet.
   ========================================================= */
/* Cada área tem a sua página (psicologos.html, artigos.html, usuarios.html, config.html) e todas
   usam estes mesmos arquivos. Quando o código pede um campo de OUTRA área (ex.: #a-titulo na página
   de Psicólogos), $ devolve uma caixa vazia e escondida, fora da tela, em vez de dar erro. */
const PAGINA = document.body.dataset.pagina || '';
const AREA_ARQ = { psicologos: 'psicologos.html', artigos: 'artigos.html', usuarios: 'usuarios.html', config: 'config.html' };
const FORA = new Map();
function foraDaPagina(s) {
  let e = FORA.get(s);
  if (!e) { e = document.createElement('div'); e.hidden = true; e.value = ''; e.checked = false; FORA.set(s, e); }
  return e;
}
const $ = s => document.querySelector(s) || (PAGINA && /^#[\w-]+$/.test(s) ? foraDaPagina(s) : null);
const $$ = s => [...document.querySelectorAll(s)];
const CHAVE = 'pb-painel-v1';

const HEADER_PADRAO = `<!-- Cole aqui o <header> do seu site (links começando com /) -->
<header class="topo">
  <div class="wrap">
    <a href="/" class="logo"><img class="logo-img" src="/assets/imagens/logo.svg" alt="Psicólogos Brasil"></a>
    <nav class="menu">
      <a href="/">Início</a>
      <a href="/blog/">Artigos</a>
      <a href="/psicologos/">Psicólogos</a>
      <a href="/quem-somos/">Quem somos</a>
      <a href="/contato/">Contato</a>
    </nav>
  </div>
</header>`;
const FOOTER_PADRAO = `<!-- Cole aqui o <footer> do seu site -->
<footer class="rodape">
  <div class="wrap">
    <p>Psicólogos Brasil © 2026 · <a href="/politica-de-privacidade/">Política de privacidade</a> · <a href="/termos-de-uso/">Termos de uso</a></p>
    <p>Em caso de crise, ligue 188 (CVV) ou 192 (SAMU).</p>
  </div>
</footer>`;

const CONFIG_PADRAO = {
  siteUrl: 'https://www.psicologosbrasil.com.br',
  whatsapp: '5588996997631',
  autor: 'Fábio Medeiros',
  autorCargo: 'Psicólogo · CRP 11/14186',
  autorFoto: '',
  categorias: 'Terapia online\nAnsiedade\nDepressão\nRelacionamentos\nAutoconhecimento\nLuto',
  abordagens: 'TCC\nPsicanálise\nAbordagem Centrada na Pessoa\nFenomenológico-Existencial\nGestalt-terapia',
  paginasFixas: '/\n/quem-somos/\n/psicologos/\n/blog/\n/contato/\n/ansiedade/\n/terapia-brasileiros-eua/\n/politica-de-privacidade/\n/termos-de-uso/',
  head: '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<!-- Cole aqui o <link> das fontes do Google que está no <head> das suas páginas -->',
  header: HEADER_PADRAO,
  footer: FOOTER_PADRAO,
  scripts: '<script src="/js/main.js"><\/script>\n<script src="/js/menu.js"><\/script>'
};
const RESERVADOS = ['blog','psicologos','psicologo','contato','quem-somos','ansiedade','servicos','agendamento','terapia-brasileiros-eua','painel','css','js','assets','data','politica-de-privacidade','termos-de-uso','admin','404'];

let state = { artigos: [], psicologos: [], config: { ...CONFIG_PADRAO } };
let atualA = null, atualP = null, pasta = null, pastaGuardada = null;

/* ---------- utilidades ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slugify = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
const hojeISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const dataBR = iso => { try { return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return iso; } };
const quando = ts => new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const linhas = t => String(t || '').split('\n').map(s => s.trim()).filter(Boolean);
const base = () => state.config.siteUrl.replace(/\/+$/, '');
const textoPuro = html => { const d = document.createElement('div'); d.innerHTML = html || ''; return (d.textContent || '').replace(/\s+/g, ' ').trim(); };
const contarPalavras = html => { const t = textoPuro(html); return t ? t.split(' ').length : 0; };
const extDe = d => { const m = (d.match(/^data:image\/(\w+)/) || [])[1] || 'jpg'; return m === 'jpeg' ? 'jpg' : m; };
function dataParaBlob(d) {
  const [cab, b64] = d.split(',');
  const mime = (cab.match(/data:(.*?);/) || [])[1] || 'application/octet-stream';
  const bin = atob(b64); const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return new Blob([u], { type: mime });
}
function toast(msg, tipo = '') {
  const el = document.createElement('div'); el.className = 'toast ' + tipo; el.textContent = msg;
  const box = $('#toast'); box.appendChild(el); setTimeout(() => el.remove(), tipo === 'erro' ? 7000 : 4200);
  /* na frente de tudo, inclusive de uma janela aberta */
  if (typeof box.showPopover === 'function') { if (!box.hasAttribute('popover')) box.setAttribute('popover', 'manual'); try { if (box.matches(':popover-open')) box.hidePopover(); box.showPopover(); } catch (e) {} }
}
function baixar(blob, nome) {
  const u = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = u; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 3000);
}
function waLink(numero, texto) {
  return `https://api.whatsapp.com/send?phone=${String(numero || state.config.whatsapp).replace(/\D/g, '')}&text=${encodeURIComponent(texto)}`;
}

/* ---------- imagens: redimensiona e converte para WebP ---------- */
/* exato = true: a imagem sai SEMPRE com o lado maior = max (aumenta as pequenas), ex.: capa 1600 × 900 */
function processarImagem(file, max = 1600, quadrado = false, proporcao = 0, exato = false) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onerror = rej;
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => rej(new Error('Imagem inválida'));
      img.onload = () => {
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (quadrado) proporcao = 1;
        if (proporcao) { if (sw / sh > proporcao) { const n = sh * proporcao; sx = (sw - n) / 2; sw = n; } else { const n = sw / proporcao; sy = (sh - n) / 2; sh = n; } }
        const esc_ = exato ? max / Math.max(sw, sh) : Math.min(1, max / Math.max(sw, sh));
        const w = Math.round(sw * esc_), h = Math.round(sh * esc_);
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
        let data = cv.toDataURL('image/webp', 0.82);
        if (!data.startsWith('data:image/webp')) data = cv.toDataURL('image/jpeg', 0.85);
        res({ data, w, h });
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}

/* ---------- limpeza do HTML do editor ---------- */
const CLASSES_OK = ['centro', 'botao', 'video'];
const PERM = { P: ['class'], H2: ['class'], H3: ['class'], H4: ['class'], STRONG: [], EM: [], U: [], S: [], CODE: [], A: ['href'], UL: [], OL: [], LI: [], BLOCKQUOTE: ['class'], BR: [], HR: [], IMG: ['src', 'alt', 'data-w', 'data-h'], FIGURE: ['class', 'data-video', 'contenteditable'], FIGCAPTION: [] };
function limparNo(n) {
  if (n.nodeType === 8) { n.remove(); return; }
  if (n.nodeType !== 1) return;
  let tag = n.tagName;
  if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'META', 'LINK', 'TITLE', 'svg', 'SVG'].includes(tag)) { n.remove(); return; }
  const troca = { B: 'strong', I: 'em', STRIKE: 's', DEL: 's', DIV: 'p', H1: 'h2', H5: 'h4', H6: 'h4' }[tag];
  if (troca) { const novo = document.createElement(troca); while (n.firstChild) novo.appendChild(n.firstChild); n.replaceWith(novo); n = novo; tag = novo.tagName; }
  if (!PERM[tag]) { const filhos = [...n.childNodes]; n.replaceWith(...filhos); filhos.forEach(limparNo); return; }
  [...n.attributes].forEach(a => { if (!PERM[tag].includes(a.name)) n.removeAttribute(a.name); });
  if (n.hasAttribute('class')) { const ok = n.className.split(/\s+/).filter(c => CLASSES_OK.includes(c)); if (ok.length) n.setAttribute('class', ok.join(' ')); else n.removeAttribute('class'); }
  if (tag === 'A') {
    const h = (n.getAttribute('href') || '').trim();
    if (!h || /^(javascript|data|vbscript):/i.test(h)) n.removeAttribute('href');
    else if (/^https?:\/\//i.test(h) && !h.includes(new URL(state.config.siteUrl).host)) { n.setAttribute('target', '_blank'); n.setAttribute('rel', 'noopener'); }
  }
  [...n.childNodes].forEach(limparNo);
}
function limpar(html) {
  const t = document.createElement('template'); t.innerHTML = html || '';
  [...t.content.childNodes].forEach(limparNo);
  // texto solto vira parágrafo
  [...t.content.childNodes].forEach(n => {
    if ((n.nodeType === 3 && n.textContent.trim()) || (n.nodeType === 1 && ['STRONG', 'EM', 'A', 'U', 'S', 'CODE', 'IMG'].includes(n.tagName))) {
      const p = document.createElement('p'); n.replaceWith(p); p.appendChild(n);
    } else if (n.nodeType === 3) n.remove();
  });
  t.content.querySelectorAll('p,h2,h3,h4,li,blockquote').forEach(el => { if (!el.textContent.trim() && !el.querySelector('img')) el.remove(); });
  t.content.querySelectorAll('br').forEach(br => { if (!br.nextSibling && br.parentNode && br.parentNode !== t.content) br.remove(); });
  return t.innerHTML.trim();
}

/* ---------- armazenamento ---------- */
function carregar() {
  try {
    const s = JSON.parse(localStorage.getItem(CHAVE));
    if (s) { state.artigos = s.artigos || []; state.psicologos = s.psicologos || []; state.config = { ...CONFIG_PADRAO, ...(s.config || {}) }; }
  } catch (e) { /* começa vazio */ }
}
let tSalvar;
function salvar() { clearTimeout(tSalvar); tSalvar = setTimeout(salvarAgora, 400); }
function salvarAgora() {
  clearTimeout(tSalvar);
  try { localStorage.setItem(CHAVE, JSON.stringify(state)); }
  catch (e) { toast('O navegador ficou sem espaço para guardar tudo (as imagens ocupam muito). Exporte um backup em Configurações.', 'erro'); }
}

/* ---------- pasta do site (Chrome / Edge) ---------- */
function abrirDB() {
  return new Promise((res, rej) => { const r = indexedDB.open('pb-painel', 1); r.onupgradeneeded = () => r.result.createObjectStore('h'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
}
async function guardarHandle(h) { try { const db = await abrirDB(); db.transaction('h', 'readwrite').objectStore('h').put(h, 'pasta'); } catch (e) {} }
async function lerHandle() {
  try { const db = await abrirDB(); return await new Promise(res => { const q = db.transaction('h').objectStore('h').get('pasta'); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); }
  catch (e) { return null; }
}
async function escrever(raiz, caminho, conteudo) {
  const partes = caminho.split('/'); const nome = partes.pop(); let d = raiz;
  for (const p of partes) d = await d.getDirectoryHandle(p, { create: true });
  const fh = await d.getFileHandle(nome, { create: true });
  const w = await fh.createWritable(); await w.write(conteudo); await w.close();
}
async function existe(raiz, caminho) {
  try { const partes = caminho.split('/'); const nome = partes.pop(); let d = raiz; for (const p of partes) d = await d.getDirectoryHandle(p); await d.getFileHandle(nome); return true; }
  catch (e) { return false; }
}
async function conectarPasta() {
  if (pastaGuardada && !pasta) {
    try { if ((await pastaGuardada.requestPermission({ mode: 'readwrite' })) === 'granted') { pasta = pastaGuardada; atualizarPasta(); toast(`Pasta “${pasta.name}” conectada.`, 'ok'); return; } } catch (e) {}
  }
  if (!('showDirectoryPicker' in window)) { toast('Este navegador não deixa salvar direto na pasta. Use o Chrome ou o Edge, ou use “Baixar .zip”.', 'erro'); return; }
  try {
    const h = await window.showDirectoryPicker({ mode: 'readwrite', id: 'site-pb' });
    pasta = h; pastaGuardada = h; await guardarHandle(h); atualizarPasta();
    if (await existe(h, 'index.html')) toast(`Pasta “${h.name}” conectada.`, 'ok');
    else toast(`Pasta “${h.name}” conectada, mas não achei um index.html nela. Confira se é a pasta principal do site.`, 'aviso');
  } catch (e) {
    if (e.name !== 'AbortError') toast('Não consegui abrir a pasta aqui. Abra o painel.html direto no Chrome ou Edge (dois cliques no arquivo) ou use “Baixar .zip”.', 'erro');
  }
}
function atualizarPasta() {
  const nome = $('#pastaNome');
  if (pasta) { nome.textContent = '📁 ' + pasta.name; nome.classList.remove('off'); $('#btnPasta').textContent = 'Trocar pasta'; $('#pastaDica').textContent = 'As páginas são salvas direto nesta pasta. Depois é só enviar para a Hostinger.'; }
  else if (pastaGuardada) { nome.textContent = '📁 ' + pastaGuardada.name + ' (clique para liberar)'; nome.classList.add('off'); $('#btnPasta').textContent = 'Reconectar pasta'; }
  else { nome.textContent = 'Não conectada'; nome.classList.add('off'); $('#btnPasta').textContent = 'Conectar pasta'; }
  $('#a-gerar').textContent = pasta ? 'Salvar na pasta do site' : 'Gerar e baixar .zip';
  $('#p-gerar').textContent = pasta ? 'Salvar na pasta do site' : 'Gerar e baixar .zip';
  $('#a-zip').hidden = !pasta; $('#p-zip').hidden = !pasta;
}

/* ---------- CSS das páginas geradas ---------- */
/* vai para css/artigo-gerado.css (NÃO css/artigo.css, que é da página /blog/artigo/) */
const CSS_ARTIGO = `/* Página de artigo, criada pelo Painel. Pode editar à vontade. */
.artigo{padding:32px 0 72px}
.artigo-wrap{max-width:760px;margin:0 auto;padding:0 20px}
.trilha{font-size:.85rem;color:#6b7280;margin:0 0 20px}
.trilha a{color:inherit;text-decoration:none}
.trilha a:hover{color:var(--sea,#1f35b5)}
.artigo-cat{display:inline-block;background:#eef1fc;color:var(--sea,#1f35b5);font-weight:600;font-size:.8rem;padding:5px 12px;border-radius:999px;margin-bottom:14px;text-decoration:none}
.artigo-topo h1{font-size:clamp(1.8rem,4.2vw,2.6rem);line-height:1.15;margin:0 0 14px}
.artigo-resumo{font-size:1.15rem;line-height:1.55;color:#4b5563;margin:0 0 14px}
.artigo-meta{font-size:.9rem;color:#6b7280;margin:0 0 26px}  .artigo-autor{display:flex;align-items:center;flex-wrap:wrap;gap:12px 14px;margin:6px 0 28px} .autor-foto{width:48px;height:48px;border-radius:50%;overflow:hidden;flex:none;display:grid;place-items:center;background:#e9edfb;color:var(--sea,#1f35b5);font-weight:700;font-size:.95rem} .autor-foto img{width:100%;height:100%;object-fit:cover;display:block} .autor-txt{display:flex;flex-direction:column;line-height:1.3} .autor-txt b{font-size:1rem;color:var(--ink,#101a4f)} .autor-txt small{font-size:.88rem;color:#6b7280} .autor-data{display:flex;flex-direction:column;line-height:1.3;font-size:.88rem;color:#4b5563;padding-left:16px;margin-left:4px;border-left:1px solid #dbe1f3} .autor-data small{font-size:.82rem;color:#6b7280} @media (max-width:520px){.autor-data{display:block;flex-basis:100%;padding:10px 0 0;margin:0;border-left:0;border-top:1px solid #dbe1f3}.autor-data small{display:inline;font-size:.88rem}.autor-data small::before{content:" · "}} 
.artigo-capa{margin:4px 0 40px;width:min(960px,calc(100vw - 40px));margin-left:calc(50% - min(480px,50vw - 20px))}
.artigo-capa img{width:100%;height:auto;border-radius:22px;display:block}
.artigo-texto{font-size:1.08rem;line-height:1.8;color:#1f2937}
.artigo-texto h2{font-size:1.6rem;line-height:1.25;margin:2em 0 .6em}
.artigo-texto h3{font-size:1.25rem;margin:1.6em 0 .5em}
.artigo-texto p{margin:0 0 1.15em}
.artigo-texto img{max-width:100%;height:auto;border-radius:14px;margin:1.2em 0;display:block}
.artigo-texto a{color:var(--sea,#1f35b5)}
.artigo-texto blockquote{border-left:4px solid var(--sea,#1f35b5);background:#f6f8fe;margin:1.6em 0;padding:16px 20px;border-radius:0 12px 12px 0;color:#374151}
.artigo-texto ul,.artigo-texto ol{padding-left:1.4em;margin:0 0 1.15em}
.artigo-texto li{margin-bottom:.45em}
.artigo-texto h4{font-size:1.1rem;margin:1.4em 0 .5em}
.artigo-texto .centro{text-align:center}
.artigo-texto .centro img{margin-left:auto;margin-right:auto}
.artigo-texto hr{border:0;border-top:1px solid #e5e7eb;margin:2.4em auto;width:40%}
.artigo-texto code{background:#f1f3f8;padding:.1em .35em;border-radius:5px;font-size:.92em}
.artigo-texto .botao{text-align:center;margin:1.8em 0}
.artigo-texto .botao a{display:inline-block;background:var(--sea,#1f35b5);color:#fff;font-weight:700;padding:14px 28px;border-radius:999px;text-decoration:none}
.faq{margin-top:48px}
.faq h2{font-size:1.6rem;margin:0 0 16px}
.faq details{border:1px solid #e5e7eb;border-radius:14px;margin-bottom:10px;background:#fff}
.faq summary{cursor:pointer;padding:16px 20px;font-weight:600;list-style:none;display:flex;justify-content:space-between;gap:12px}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:'+';font-size:1.3rem;line-height:1;color:var(--sea,#1f35b5)}
.faq details[open] summary::after{content:'−'}
.faq-resp{padding:0 20px 16px;line-height:1.7;color:#374151}
.faq-resp p{margin:0 0 .8em}
.cta{margin-top:52px;background:var(--sea,#1f35b5);color:#fff;border-radius:22px;padding:34px 28px;text-align:center}
.cta h2{margin:0 0 8px;color:#fff;font-size:1.5rem}
.cta p{margin:0 0 22px;opacity:.9}
.cta-btn{display:inline-block;background:var(--sun,#ffd84d);color:#111;font-weight:700;padding:14px 28px;border-radius:999px;text-decoration:none}
.cta-btn:hover{filter:brightness(.95)}

/* Vídeo do YouTube dentro do artigo: miniatura com play; o vídeo só carrega ao clicar */
.artigo-texto figure.video{margin:1.8em 0}
.artigo-texto figure.video a,.artigo-texto .video-tela{position:relative;display:block;aspect-ratio:16/9;border-radius:16px;overflow:hidden;background:#0b0f2a}
.artigo-texto figure.video img{width:100%;height:100%;object-fit:cover;margin:0;border-radius:0;color:transparent;font-size:0;transition:transform .3s,filter .3s}
.artigo-texto figure.video a::before{content:"";position:absolute;left:50%;top:50%;width:76px;height:76px;margin:-38px 0 0 -38px;border-radius:50%;background:rgba(255,255,255,.95);box-shadow:0 12px 30px -8px rgba(0,0,0,.55);transition:transform .2s}
.artigo-texto figure.video a::after{content:"";position:absolute;left:50%;top:50%;margin:-14px 0 0 -8px;border-style:solid;border-width:14px 0 14px 24px;border-color:transparent transparent transparent var(--sea,#1f35b5)}
.artigo-texto figure.video a:hover img{transform:scale(1.03);filter:brightness(.9)}
.artigo-texto figure.video a:hover::before{transform:scale(1.08)}
.artigo-texto figure.video a:focus-visible{outline:3px solid var(--sea,#1f35b5);outline-offset:3px}
.artigo-texto .video-tela iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.artigo-texto figure.video figcaption{margin-top:10px;text-align:center;font-size:.92rem;color:var(--muted,#646a8a)}
@media (max-width:560px){.artigo-texto figure.video a::before{width:60px;height:60px;margin:-30px 0 0 -30px}.artigo-texto figure.video a::after{margin:-11px 0 0 -6px;border-width:11px 0 11px 19px}}
`;
/* vai para css/perfil-gerado.css (NÃO css/perfil.css, que é da página /psicologos/perfil/ e era apagada ao publicar) */
const CSS_PERFIL = `/* Página do psicólogo, criada pelo Painel. Usa as cores e fontes do global.css. Pode editar à vontade. */
.pf section{padding:0}
.pf h1,.pf h2,.pf h3{font-family:"Bricolage Grotesque",Georgia,serif;letter-spacing:-.02em}

/* Topo */
.pf-hero{padding:48px 0 64px!important;background:var(--surface,#fff);border-bottom:1px solid var(--line,#dbe1f3)}
.pf-hero-grid{display:grid;grid-template-columns:.85fr 1.15fr;gap:56px;align-items:center}
.pf-foto{margin:0;aspect-ratio:4/5;border-radius:32px;overflow:hidden;background:var(--mist,#e9edfb);box-shadow:var(--sh)}
.pf-foto img{width:100%;height:100%;object-fit:cover;display:block}
.pf-foto-vazia{display:grid;place-items:center;height:100%;font:700 5rem "Bricolage Grotesque",serif;color:var(--sea,#1f35b5)}
.pf-trilha{font-size:.85rem;color:var(--muted,#4b4b4b);margin:0 0 22px}
.pf-trilha a{color:inherit;text-decoration:none}
.pf-trilha a:hover{color:var(--sea,#1f35b5)}
.pf-nome{display:flex;align-items:center;gap:8px;font-weight:700;color:var(--sea,#1f35b5);margin:0 0 10px;font-size:1.05rem}
.pf-selo{width:24px;height:24px;color:var(--sea,#1f35b5);flex:none}
.pf-verif{display:inline-flex}
.pf-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.pf-hero h1{font-size:clamp(2.1rem,4.6vw,3.6rem);line-height:1.05;margin:0 0 16px}
.pf-sub{text-transform:uppercase;letter-spacing:.1em;font-size:.82rem;font-weight:700;color:var(--muted,#4b4b4b);margin:0 0 14px}
.pf-verif-txt{display:inline-flex;align-items:center;gap:8px;background:var(--mist,#e9edfb);color:var(--sea-d,#162a8f);font-weight:600;font-size:.88rem;padding:7px 14px 7px 8px;border-radius:999px;margin:0 0 16px}
.pf-verif-txt .pf-selo{width:20px;height:20px}
.pf-tags{list-style:none;padding:0;margin:0 0 26px;display:flex;flex-wrap:wrap;gap:8px}
.pf-tags li{border:1px solid var(--line,#dbe1f3);background:var(--bg,#f5f7fd);border-radius:999px;padding:6px 14px;font-size:.9rem;font-weight:500}
.pf-cta{display:flex;flex-wrap:wrap;align-items:center;gap:14px 20px}
.pf-cta span{color:var(--muted,#4b4b4b);font-weight:600;font-variant-numeric:tabular-nums}

/* Frase */
.pf-quote{padding:80px 0!important;text-align:center}
.pf-quote blockquote{margin:0 auto;max-width:860px;background:none;padding:0;border:0}
.pf-quote p{font:500 clamp(1.5rem,3.2vw,2.35rem)/1.3 "Bricolage Grotesque",Georgia,serif;letter-spacing:-.02em;color:var(--ink,#101a4f);margin:0}
.pf-quote footer{margin-top:18px;color:var(--muted,#4b4b4b);font:600 .95rem Figtree,sans-serif}

/* 3 passos */
.pf-passos{padding:0 0 80px!important}
.pf-cards{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}
.pf-card{border-radius:24px;padding:30px 26px;border:1px solid var(--line,#dbe1f3)}
.pf-card-1{background:var(--mist,#e9edfb)}
.pf-card-2{background:#fff6dd;border-color:#f6e2a6}
.pf-card-3{background:var(--surface,#fff);box-shadow:var(--sh)}
.pf-card h2{font-size:1.45rem;line-height:1.2;margin:0 0 12px}
.pf-card h2 span{color:var(--sea,#1f35b5)}
.pf-card p{color:var(--muted,#4b4b4b);line-height:1.65;margin:0}

/* Sobre */
.pf-sobre{padding:0 0 80px!important}
.pf-sobre-grid{display:grid;grid-template-columns:1.4fr .8fr;gap:48px;align-items:start}
.pf-bio h2{font-size:clamp(1.7rem,3.4vw,2.4rem);margin:0 0 18px}
.pf-bio p{color:var(--muted,#4b4b4b);font-size:1.06rem;line-height:1.75;margin:0 0 14px;max-width:62ch}
.pf-esp{background:var(--surface,#fff);border:1px solid var(--line,#dbe1f3);border-radius:22px;padding:24px}
.pf-esp h3{font-size:1.05rem;margin:0 0 12px}
.pf-esp h3:not(:first-child){margin-top:20px}
.pf-esp p{margin:0;color:var(--muted,#4b4b4b);font-size:.95rem}
.pf-esp ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px}
.pf-esp li{background:var(--mist,#e9edfb);color:var(--sea-d,#162a8f);border-radius:999px;padding:6px 14px;font-size:.9rem;font-weight:600}

/* O que esperar */
.pf-esperar{padding:0 0 96px!important}
.pf-esperar-box{display:grid;grid-template-columns:1.1fr .9fr;align-items:center}
.pf-amb{margin:0;border-radius:32px;overflow:hidden;aspect-ratio:4/3;grid-column:1/3;grid-row:1;width:72%}
.pf-amb img{width:100%;height:100%;object-fit:cover;display:block}
.pf-esperar-card{grid-column:2;grid-row:1;position:relative;background:var(--night,#0f1c66);color:#eef1ff;border-radius:28px;padding:40px 36px;box-shadow:var(--sh)}
.pf-esperar-box.sem-img{grid-template-columns:1fr}
.pf-esperar-box.sem-img .pf-esperar-card{grid-column:1;max-width:760px;margin:0 auto;width:100%}
.pf-esperar-card h2{color:#fff;font-size:clamp(1.8rem,3.4vw,2.5rem);margin:0 0 20px}
.pf-esperar-card ul{list-style:none;margin:0 0 28px;padding:0}
.pf-esperar-card li{display:flex;gap:12px;align-items:flex-start;padding:13px 0;border-top:1px solid rgba(255,255,255,.14);color:#dde3fa;line-height:1.5}
.pf-esperar-card li:last-child{border-bottom:1px solid rgba(255,255,255,.14)}
.pf-esperar-card li::before{content:"→";color:var(--sun,#ffc83d);font-weight:700;flex:none}
.pf-esperar-card .btn{background:var(--sun,#ffc83d);color:#101a4f}

/* Celular */
@media (max-width:860px){
  .pf-hero{padding:28px 0 48px!important}
  .pf-hero-grid,.pf-sobre-grid{grid-template-columns:1fr;gap:28px}
  .pf-foto{max-width:360px;width:100%;margin:0 auto}
  .pf-hero-txt{text-align:center}
  .pf-nome,.pf-tags,.pf-cta{justify-content:center}
  .pf-quote{padding:56px 0!important}
  .pf-cards{grid-template-columns:1fr;gap:14px}
  .pf-passos,.pf-sobre{padding-bottom:56px!important}
  .pf-esperar-box{grid-template-columns:1fr}
  .pf-amb{grid-column:1;width:100%;aspect-ratio:16/10}
  .pf-esperar-card{grid-column:1;grid-row:2;margin:-48px 14px 0;padding:30px 22px}
  .pf-esperar{padding-bottom:64px!important}
}

/* Nome no H1 (grande) e a frase logo abaixo; o selo de verificado fica só ao lado do nome */
.pf-hero .pf-h1{display:flex;align-items:center;flex-wrap:wrap;gap:6px 14px;font-size:clamp(2.1rem,4.6vw,3.6rem);line-height:1.05;margin:0 0 12px}
.pf-h1 .pf-verif{display:inline-flex}
.pf-h1 .pf-selo{width:.62em;height:.62em;min-width:26px;min-height:26px}
.pf-frase{font:500 clamp(1.2rem,2.1vw,1.55rem)/1.3 "Bricolage Grotesque",Georgia,serif;letter-spacing:-.01em;color:var(--sea,#1f35b5);margin:0 0 16px;max-width:30ch}
.pf-reg{display:flex;gap:10px;align-items:flex-start;margin:0 0 18px;padding:0 0 16px;border-bottom:1px solid var(--line,#dbe1f3);font-size:.9rem;line-height:1.5;color:var(--muted,#4b4b4b)}
.pf-reg .pf-selo{width:22px;height:22px;flex:none;margin-top:1px}
.pf-reg b{color:var(--ink,#101a4f)}
.pf-reg a{color:var(--sea,#1f35b5);font-weight:600;white-space:nowrap}
@media (max-width:860px){
  .pf-hero .pf-h1{justify-content:center}
  .pf-frase{margin-left:auto;margin-right:auto}
}
`;
const CSS_PREVIA = `:root{--bg:#f5f7fd;--surface:#fff;--ink:#101a4f;--muted:#4b4b4b;--sea:#1f35b5;--sea-d:#162a8f;--on-sea:#fff;--mist:#e9edfb;--sun:#ffc83d;--line:#dbe1f3;--night:#0f1c66;--sh:0 1px 2px rgba(16,26,79,.06),0 14px 28px -14px rgba(16,26,79,.3)}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:400 17px/1.6 Figtree,system-ui,sans-serif}
h1,h2,h3{font-family:"Bricolage Grotesque",Georgia,serif;line-height:1.1;margin:0;letter-spacing:-.025em}
p{margin:0}
.wrap{max-width:1120px;margin:0 auto;padding:0 20px}
section{padding:56px 0}
.btn{display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:999px;padding:14px 26px;font:600 1rem Figtree,sans-serif;text-decoration:none;background:var(--sea);color:var(--on-sea)}
.btn.lg{padding:16px 32px;font-size:1.05rem}
.previa-topo{background:#fff;border-bottom:1px solid var(--line);padding:14px 20px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;font-size:14px}
.previa-topo span{color:#98a2b3;font-size:12px}
`;

/* ---------- página completa ---------- */
function pagina({ titulo, descricao, url, imagem, tipo, css, corpo, jsonld }) {
  const c = state.config;
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descricao)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:locale" content="pt_BR">
<meta property="og:type" content="${tipo}">
<meta property="og:site_name" content="Psicólogos Brasil">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descricao)}">
<meta property="og:url" content="${url}">
${imagem ? `<meta property="og:image" content="${imagem}">\n` : ''}<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/icones/favicon.svg" type="image/svg+xml">
${c.head || ''}
<link rel="stylesheet" href="/css/global.css">
<link rel="stylesheet" href="/css/header.css">
<link rel="stylesheet" href="/css/footer.css">
<link rel="stylesheet" href="/css/${css}">
${(Array.isArray(jsonld) ? jsonld : [jsonld]).map(j => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}<\/script>`).join('\n')}
<\/head>
<body>
${c.header}

<main id="conteudo">
${corpo}
</main>

${c.footer}
${c.scripts}
<\/body>
<\/html>
`;
}
function docPrevia(corpo) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Figtree:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${CSS_PREVIA}${CSS_ARTIGO}${CSS_PERFIL}</style><\/head><body>
<div class="previa-topo"><b>Psicólogos Brasil</b><span>Prévia · no site entram o seu topo, rodapé e CSS</span></div>
<main>${corpo}</main><\/body><\/html>`;
}
