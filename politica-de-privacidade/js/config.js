/* =====================================================================
   CONFIGURAÇÕES DO SITE — mude aqui e vale para o site INTEIRO.
   ===================================================================== */
const CONFIG = {
  /* WhatsApp: só números, com 55 (Brasil) + DDD + número. */
  whatsapp: "5588996997631",

  /* Como o número aparece escrito no site (rodapé e textos). */
  whatsappExibicao: "(88) 99699-7631"
};

/* ---------------------------------------------------------------------
   Daqui para baixo não precisa mexer.
   Troca o número em TODOS os botões e textos de WhatsApp da página,
   mantendo a mensagem pronta de cada botão.
   --------------------------------------------------------------------- */
(function () {
  const numero = String(CONFIG.whatsapp).replace(/\D/g, "");
  function aplicar(raiz) {
    raiz.querySelectorAll('a[href*="api.whatsapp.com/send"], a[href*="wa.me/"]').forEach((a) => {
      if (a.hasAttribute("data-whatsapp-proprio")) return; /* botão com número de outra pessoa (ex.: psicólogo) */
      try {
        const u = new URL(a.getAttribute("href"), location.href);
        if (u.hostname.endsWith("wa.me")) {
          u.pathname = "/" + numero;
        } else {
          u.searchParams.set("phone", numero);
        }
        a.setAttribute("href", u.toString());
      } catch (e) { /* link inválido: deixa como está */ }
    });
    raiz.querySelectorAll('[data-whatsapp="texto"]').forEach((el) => { el.textContent = CONFIG.whatsappExibicao; });
  }
  aplicar(document);
  /* Também nos botões que aparecem depois (cartões dos psicólogos, perfis…) */
  new MutationObserver((mudancas) => mudancas.forEach((m) => m.addedNodes.forEach((n) => {
    if (n.nodeType === 1) aplicar(n.parentNode || n);
  }))).observe(document.body, { childList: true, subtree: true });
})();
