/* =====================================================================
   Psicólogos Brasil — cookies.js
   Aviso de cookies (LGPD) com as cores do site. Carregado pelo js/main.js
   em todas as páginas do site (o painel não usa).

   Categorias:
     essenciais .. sempre ligados (o site precisa para funcionar: preferências,
                   segurança, a agenda online). Não pedem permissão.
     analise ..... estatísticas de visitas (ex.: Google Analytics). Só depois
                   que a pessoa aceita.

   Como ligar o Google Analytics só depois do "Aceitar"
   (Painel → Configurações → "Código extra no <head>"):
     troque  <script>            por  <script type="text/plain" data-cookies="analise">
     e       <script async src=  por  <script type="text/plain" data-cookies="analise" data-src=
   O script só roda quando a pessoa aceita. Se ela recusar, nunca roda.

   Para os desenvolvedores:
     PBCookies.permitido('analise')  → true/false
     PBCookies.abrir()               → abre as preferências de novo
     window.addEventListener('pb:cookies', e => e.detail)  → mudou a escolha
   Qualquer link com  data-cookies-abrir  abre as preferências.
   ===================================================================== */
(function () {
  if (window.PBCookies) return;
  const CHAVE = "pb_cookies_v1";
  const VALIDADE_DIAS = 365;                      /* depois de 1 ano, pergunta de novo */
  const base = (document.documentElement.dataset.base || "/");
  const POLITICA = base + "politica-de-privacidade/";
  const params = new URLSearchParams(location.search);
  /* não aparece dentro da prévia do painel */
  const NA_PREVIA = params.has("previa") || window.top !== window.self;

  /* ---------- guardar / ler a escolha ---------- */
  function ler() {
    try {
      const c = JSON.parse(localStorage.getItem(CHAVE));
      if (!c || !c.em || Date.now() - c.em > VALIDADE_DIAS * 864e5) return null;
      return c;
    } catch (e) { return null; }
  }
  function gravar(analise) {
    const c = { v: 1, essenciais: true, analise: !!analise, em: Date.now() };
    try { localStorage.setItem(CHAVE, JSON.stringify(c)); } catch (e) { /* sem armazenamento: vale só nesta página */ }
    aplicar(c);
    window.dispatchEvent(new CustomEvent("pb:cookies", { detail: c }));
    return c;
  }

  /* ---------- ligar o que foi permitido ---------- */
  function aplicar(c) {
    /* Google (Consent Mode): se o gtag já existir, avisa a escolha */
    if (typeof window.gtag === "function") {
      try {
        window.gtag("consent", "update", {
          analytics_storage: c.analise ? "granted" : "denied",
          ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied"
        });
      } catch (e) { /* tudo bem */ }
    }
    if (!c.analise) return;
    document.querySelectorAll('script[type="text/plain"][data-cookies="analise"]:not([data-cookies-ok])').forEach((velho) => {
      velho.setAttribute("data-cookies-ok", "1");
      const s = document.createElement("script");
      [...velho.attributes].forEach((a) => {
        if (["type", "data-cookies", "data-cookies-ok", "data-src"].includes(a.name)) return;
        s.setAttribute(a.name, a.value);
      });
      if (velho.dataset.src) s.src = velho.dataset.src; else s.textContent = velho.textContent;
      velho.parentNode.insertBefore(s, velho.nextSibling);
    });
  }

  /* ---------- aparência (cores do site: css/global.css) ---------- */
  function estilos() {
    if (document.getElementById("pb-ck-css")) return;
    const css = document.createElement("style");
    css.id = "pb-ck-css";
    css.textContent = `
.pb-ck{position:fixed;left:20px;bottom:20px;z-index:2147483000;width:min(440px,calc(100vw - 40px));background:var(--surface,#fff);color:var(--ink,#101a4f);border:1px solid var(--line,#dbe1f3);border-radius:22px;box-shadow:0 2px 4px rgba(16,26,79,.06),0 24px 48px -16px rgba(16,26,79,.38);padding:22px 22px 20px;font-family:"Figtree",system-ui,-apple-system,"Segoe UI",sans-serif;font-size:15px;line-height:1.55;animation:pbCkEntra .45s cubic-bezier(.23,1,.32,1)}
.pb-ck *{box-sizing:border-box}
.pb-ck-topo{display:flex;align-items:center;gap:12px;margin-bottom:8px}
.pb-ck-ico{flex:none;width:44px;height:44px;border-radius:14px;background:var(--mist,#e9edfb);color:var(--sea,#1f35b5);display:grid;place-items:center}
.pb-ck-ico svg{width:24px;height:24px}
.pb-ck h2{margin:0;font-family:"Bricolage Grotesque",Georgia,serif;font-size:1.22rem;line-height:1.2;color:var(--ink,#101a4f);font-weight:700}
.pb-ck p{margin:0 0 16px;color:var(--muted,#4b4b4b)}
.pb-ck a{color:var(--sea,#1f35b5);font-weight:600}
.pb-ck-acoes{display:flex;flex-wrap:wrap;gap:8px}
.pb-ck button{font:inherit;font-weight:700;font-size:14.5px;border-radius:999px;padding:11px 18px;cursor:pointer;border:1.5px solid transparent;transition:background-color .15s,border-color .15s,color .15s,transform .1s}
.pb-ck button:active{transform:scale(.97)}
.pb-ck button:focus-visible{outline:3px solid rgba(31,53,181,.35);outline-offset:2px}
.pb-ck-sim{background:var(--sea,#1f35b5);color:var(--on-sea,#fff);flex:1 1 auto}
.pb-ck-sim:hover{background:var(--sea-d,#162a8f)}
.pb-ck-nao{background:var(--surface,#fff);color:var(--ink,#101a4f);border-color:var(--line,#dbe1f3)!important;flex:1 1 auto}
.pb-ck-nao:hover{border-color:var(--sea,#1f35b5)!important;color:var(--sea,#1f35b5)}
.pb-ck-mais{background:none;color:var(--sea,#1f35b5);padding:11px 6px!important;text-decoration:underline;text-underline-offset:3px;font-weight:600!important}
.pb-ck-cats{display:grid;gap:10px;margin:4px 0 16px}
.pb-ck-cat{display:flex;gap:12px;align-items:flex-start;justify-content:space-between;padding:12px 14px;border:1px solid var(--line,#dbe1f3);border-radius:14px;background:var(--bg,#f5f7fd)}
.pb-ck-cat b{display:block;color:var(--ink,#101a4f);font-size:14.5px}
.pb-ck-cat small{display:block;color:var(--muted,#4b4b4b);font-size:13px;line-height:1.45;margin-top:2px}
.pb-ck-sempre{flex:none;font-size:12px;font-weight:700;color:var(--sea,#1f35b5);background:var(--mist,#e9edfb);border-radius:999px;padding:4px 10px;white-space:nowrap}
.pb-ck-sw{flex:none;position:relative;width:46px;height:26px;margin-top:2px}
.pb-ck-sw input{position:absolute;inset:0;opacity:0;margin:0;cursor:pointer;z-index:1}
.pb-ck-sw span{position:absolute;inset:0;border-radius:999px;background:#b9c0d8;transition:background .2s}
.pb-ck-sw span::after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:transform .2s}
.pb-ck-sw input:checked+span{background:var(--sea,#1f35b5)}
.pb-ck-sw input:checked+span::after{transform:translateX(20px)}
.pb-ck-sw input:focus-visible+span{outline:3px solid rgba(31,53,181,.35);outline-offset:2px}
.pb-ck-faixa{height:4px;border-radius:999px;background:linear-gradient(90deg,var(--sea,#1f35b5),var(--sun,#ffc83d));margin:-6px 0 14px;width:56px}
@keyframes pbCkEntra{from{opacity:0;transform:translateY(16px)}}
@media (max-width:560px){.pb-ck{left:10px;right:10px;bottom:10px;width:auto;padding:18px 16px 16px;border-radius:20px}.pb-ck-acoes button{flex:1 1 100%}.pb-ck-mais{flex:1 1 100%!important;text-align:center}}
@media (prefers-reduced-motion:reduce){.pb-ck{animation:none}.pb-ck-sw span,.pb-ck-sw span::after{transition:none}}
.pb-ck-link{background:none;border:0;padding:0;font:inherit;color:inherit;text-decoration:underline;text-underline-offset:3px;cursor:pointer;opacity:.85}
.pb-ck-link:hover{opacity:1}`;
    document.head.appendChild(css);
  }

  const ICONE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.9 12.6A9 9 0 1 1 11.4 3.1a3 3 0 0 0 3.6 3.6 3 3 0 0 0 3.7 3.7 3 3 0 0 0 2.2 2.2z"/><circle cx="8.5" cy="10" r="1" fill="currentColor"/><circle cx="12" cy="15.5" r="1" fill="currentColor"/><circle cx="15.8" cy="12.6" r="1" fill="currentColor"/><circle cx="8" cy="15" r=".6" fill="currentColor"/></svg>';

  let caixa = null, voltarFoco = null;
  function fechar() {
    if (!caixa) return;
    caixa.remove(); caixa = null;
    if (voltarFoco && voltarFoco.focus) try { voltarFoco.focus({ preventScroll: true }); } catch (e) { /* tudo bem */ }
  }

  /* ---------- a barra ---------- */
  function mostrar(detalhes) {
    estilos();
    fechar();
    voltarFoco = document.activeElement;
    const atual = ler();
    caixa = document.createElement("section");
    caixa.className = "pb-ck";
    caixa.setAttribute("role", "dialog");
    caixa.setAttribute("aria-live", "polite");
    caixa.setAttribute("aria-labelledby", "pb-ck-tit");
    caixa.innerHTML = detalhes ? `
      <div class="pb-ck-topo"><span class="pb-ck-ico">${ICONE}</span><h2 id="pb-ck-tit">Preferências de cookies</h2></div>
      <div class="pb-ck-faixa" aria-hidden="true"></div>
      <div class="pb-ck-cats">
        <div class="pb-ck-cat"><div><b>Essenciais</b><small>Fazem o site funcionar: navegação, segurança e a agenda online. Não dá para desligar.</small></div><span class="pb-ck-sempre">Sempre ligados</span></div>
        <label class="pb-ck-cat"><div><b>Estatísticas</b><small>Contam visitas e cliques de forma anônima (ex.: Google Analytics) para melhorarmos o site.</small></div><span class="pb-ck-sw"><input type="checkbox" id="pb-ck-analise" ${atual && atual.analise ? "checked" : ""} aria-label="Permitir cookies de estatísticas"><span></span></span></label>
      </div>
      <p style="margin-bottom:14px">Mais detalhes na <a href="${POLITICA}">Política de privacidade</a>.</p>
      <div class="pb-ck-acoes">
        <button type="button" class="pb-ck-sim" data-ck="salvar">Salvar escolha</button>
        <button type="button" class="pb-ck-nao" data-ck="todos">Aceitar todos</button>
      </div>` : `
      <div class="pb-ck-topo"><span class="pb-ck-ico">${ICONE}</span><h2 id="pb-ck-tit">Sua privacidade importa</h2></div>
      <div class="pb-ck-faixa" aria-hidden="true"></div>
      <p>Usamos cookies essenciais para o site funcionar e, com a sua permissão, cookies de estatísticas para entender as visitas e melhorar a sua experiência. Nada do que você conversa com o psicólogo passa por cookies. Saiba mais na <a href="${POLITICA}">Política de privacidade</a>.</p>
      <div class="pb-ck-acoes">
        <button type="button" class="pb-ck-sim" data-ck="todos">Aceitar</button>
        <button type="button" class="pb-ck-nao" data-ck="essenciais">Só os essenciais</button>
        <button type="button" class="pb-ck-mais" data-ck="detalhes">Personalizar</button>
      </div>`;
    document.body.appendChild(caixa);
    caixa.addEventListener("click", (e) => {
      const b = e.target.closest("[data-ck]"); if (!b) return;
      const acao = b.dataset.ck;
      if (acao === "todos") { gravar(true); fechar(); }
      else if (acao === "essenciais") { gravar(false); fechar(); }
      else if (acao === "salvar") { gravar(!!caixa.querySelector("#pb-ck-analise").checked); fechar(); }
      else if (acao === "detalhes") { mostrar(true); }
    });
    caixa.addEventListener("keydown", (e) => { if (e.key === "Escape" && ler()) fechar(); });
    const primeiro = caixa.querySelector(detalhes ? "#pb-ck-analise" : ".pb-ck-sim");
    if (detalhes && primeiro) primeiro.focus({ preventScroll: true });
  }

  /* ---------- link "Preferências de cookies" no rodapé ---------- */
  function linkRodape() {
    const alvo = document.querySelector("footer.site .ft-legal") || document.querySelector("footer .ft-bottom") || document.querySelector("footer");
    if (!alvo || alvo.querySelector("[data-cookies-abrir]")) return;
    const p = document.createElement("p");
    p.innerHTML = '<button type="button" class="pb-ck-link" data-cookies-abrir>Preferências de cookies</button>';
    alvo.appendChild(p);
  }
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-cookies-abrir]"); if (!a) return;
    e.preventDefault(); mostrar(true);
  });

  window.PBCookies = {
    permitido: (cat) => cat === "essenciais" || !!(ler() || {})[cat],
    consentimento: ler,
    abrir: () => mostrar(true)
  };

  function iniciar() {
    estilos();
    linkRodape();
    const c = ler();
    if (c) aplicar(c);
    else if (!NA_PREVIA) mostrar(false);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();
