/* Psicólogos Brasil — nuvem.js
   Lê o conteúdo publicado pelo Painel online (artigos e psicólogos).
   - Com o Firebase ativado (js/firebase-config.js): lê do Firebase. Todo visitante vê.
   - Sem Firebase (MODO TESTE): lê do navegador. Só quem publicou, neste navegador, vê.
   Carregue DEPOIS de js/firebase-config.js. Não precisa mexer aqui. */
var NUVEM = (function () {
  "use strict";
  const C = window.FIREBASE_CONFIG;
  const CFG = C && C.apiKey && C.projectId ? C : null;
  const SDK = window.FIREBASE_SDK || "https://www.gstatic.com/firebasejs/10.12.2/";
  const LOCAL = "pb-publicado-v1";
  const PREFIXO = "pbimg:";
  const RE = /pbimg:[a-z0-9]{6,40}/g;
  let fbP = null;

  /* Carrega o Firebase só quando precisa (as páginas sem conteúdo do painel não pagam esse peso). */
  function firebase() {
    if (!CFG) return Promise.reject(new Error("Firebase não configurado"));
    if (!fbP) {
      fbP = Promise.all([import(SDK + "firebase-app.js"), import(SDK + "firebase-firestore.js")])
        .then(([app, fs]) => {
          const a = app.getApps().length ? app.getApp() : app.initializeApp(CFG);
          return { app: a, fs, db: fs.getFirestore(a) };
        });
      fbP.catch(() => { fbP = null; });
    }
    return fbP;
  }
  /* Login do Firebase (só o painel usa). A sessão vale só nesta aba:
     fechar a aba = sair, como antes. "authPronta" espera o Firebase dizer
     quem está logado (ou que ninguém está). */
  let authP = null, prontaP = null;
  function auth() {
    if (!CFG) return Promise.reject(new Error("Firebase não configurado"));
    if (!authP) {
      authP = Promise.all([firebase(), import(SDK + "firebase-auth.js")]).then(async ([base, mod]) => {
        const a = mod.getAuth(base.app);
        a.languageCode = "pt";
        try { await mod.setPersistence(a, mod.browserSessionPersistence); } catch (e) { /* segue com o padrão */ }
        return { ...base, authMod: mod, auth: a };
      });
      authP.catch(() => { authP = null; });
    }
    return authP;
  }
  function authPronta() {
    if (!prontaP) prontaP = auth().then((x) => new Promise((ok) => {
      const parar = x.authMod.onAuthStateChanged(x.auth, (u) => { parar(); ok({ ...x, usuario: u }); });
    }));
    return prontaP;
  }

  /* Não deixa a página esperando para sempre se a internet ou o Firebase falharem. */
  const comPrazo = (p, ms = 9000) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("tempo esgotado")), ms))]);

  function lerLocal() {
    try {
      const d = JSON.parse(localStorage.getItem(LOCAL));
      if (d && typeof d === "object") return { artigos: d.artigos || {}, psicologos: d.psicologos || {}, imagens: d.imagens || {} };
    } catch (e) { /* vazio */ }
    return { artigos: {}, psicologos: {}, imagens: {} };
  }
  function gravarLocal(d) { localStorage.setItem(LOCAL, JSON.stringify(d)); }

  /* O que aparece no cartão da lista de artigos (sem o texto inteiro). */
  const resumoArtigo = (a) => ({
    slug: a.slug, titulo: a.titulo || "", resumo: a.descricao || "", categoria: a.categoria || "",
    data: a.data || "", minutos: a.minutos || 0, capa: a.capa || "", atualizado: a.atualizado || 0
  });
  const ordenar = (l) => l.sort((x, y) => String(y.data || "").localeCompare(String(x.data || "")) || (y.atualizado || 0) - (x.atualizado || 0));

  /* Lista publicada: "artigos" (resumos) ou "psicologos" (dados completos). */
  async function lista(tipo) {
    let l;
    if (CFG) {
      const { fs, db } = await comPrazo(firebase());
      const s = await comPrazo(fs.getDoc(fs.doc(db, "indice", tipo)));
      l = s.exists() ? (s.data().itens || []) : [];
    } else {
      l = Object.values(lerLocal()[tipo]);
      if (tipo === "artigos") l = l.map(resumoArtigo);
    }
    return tipo === "artigos" ? ordenar(l) : l;
  }

  /* Um artigo completo, pelo final do link (slug). */
  async function artigo(slug) {
    if (!slug) return null;
    if (CFG) {
      const { fs, db } = await comPrazo(firebase());
      const s = await comPrazo(fs.getDoc(fs.doc(db, "artigos", slug)));
      return s.exists() ? s.data() : null;
    }
    return lerLocal().artigos[slug] || null;
  }

  /* Imagens ficam guardadas à parte e o texto aponta para elas com "pbimg:código". */
  const cache = {};
  function imagem(id) {
    if (!cache[id]) {
      cache[id] = CFG
        ? comPrazo(firebase()).then(({ fs, db }) => comPrazo(fs.getDoc(fs.doc(db, "imagens", id)))).then((s) => (s.exists() ? s.data().data || "" : ""))
        : Promise.resolve(lerLocal().imagens[id] || "");
      cache[id].catch(() => { delete cache[id]; });
    }
    return cache[id];
  }
  async function resolverTexto(t) {
    if (typeof t !== "string" || t.indexOf(PREFIXO) < 0) return t;
    const refs = [...new Set(t.match(RE) || [])];
    const datas = await Promise.all(refs.map((r) => imagem(r.slice(PREFIXO.length)).catch(() => "")));
    refs.forEach((r, i) => { t = t.split(r).join(datas[i]); });
    return t;
  }

  return { modo: CFG ? "firebase" : "teste", CFG, SDK, LOCAL, PREFIXO, RE, firebase, auth, authPronta, comPrazo, lerLocal, gravarLocal, resumoArtigo, ordenar, lista, artigo, imagem, resolverTexto };
})();
