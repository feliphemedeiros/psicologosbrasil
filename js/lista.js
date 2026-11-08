/* =====================================================================
   LISTAS DO SITE (<select> dos formulários, ex.: Contato)
   No computador, a lista abre numa caixinha com a cara do site (bordas
   redondas, texto que quebra linha, mesma largura do campo), no lugar da
   lista do navegador, que saía para fora do formulário e cortava o texto.
   No celular continua a lista do próprio aparelho (mais fácil de tocar).
   O campo continua o mesmo: mesmo nome, valor e evento "change".
   ===================================================================== */
(function () {
  "use strict";
  const COMPUTADOR = matchMedia("(hover: hover) and (pointer: fine)");
  /* o visual vem junto com este arquivo (assim funciona mesmo se o navegador guardou o global.css antigo) */
  if (!document.getElementById("lista-estilo")) {
    const st = document.createElement("style");
    st.id = "lista-estilo";
    st.textContent = `/* listas (select) dos formulários: seta própria e texto longo com "…" em vez de cortado */
.field { position: relative; }
.field select {
  appearance: none; -webkit-appearance: none; cursor: pointer;
  padding-right: 44px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%231f35b5' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 14px center; background-size: 18px;
}
.field select:hover { border-color: #b8c3ea; }
.field.lista-aberta select { border-color: var(--sea); box-shadow: 0 0 0 3px rgba(31, 53, 181, .14); }
/* caixinha que abre no computador (js/lista.js) */
.lista-caixa {
  position: absolute; left: 0; right: 0; z-index: 40; max-height: 320px; overflow-y: auto;
  background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 6px;
  box-shadow: 0 18px 40px -14px rgba(16, 26, 79, .35), 0 2px 6px rgba(16, 26, 79, .06);
  animation: lista-entra .14s ease-out;
}
@keyframes lista-entra { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .lista-caixa { animation: none; } }
.lista-op { padding: 10px 12px; border-radius: 10px; cursor: pointer; line-height: 1.35; color: var(--ink); font-size: .97rem; }
.lista-op.foco { background: var(--mist); }
.lista-op.on { color: var(--sea); font-weight: 700; }
.lista-op.on::after { content: "✓"; float: right; margin-left: 10px; }`;
    document.head.appendChild(st);
  }
  let aberta = null;

  function fechar(voltarFoco) {
    if (!aberta) return;
    const { caixa, sel } = aberta;
    caixa.remove(); sel.setAttribute("aria-expanded", "false"); sel.closest(".field").classList.remove("lista-aberta");
    aberta = null;
    if (voltarFoco) sel.focus();
  }

  function abrir(sel) {
    fechar(false);
    const campo = sel.closest(".field");
    const caixa = document.createElement("div");
    caixa.className = "lista-caixa";
    caixa.setAttribute("role", "listbox");
    caixa.id = sel.id + "-lista";
    const opcoes = Array.from(sel.options);
    caixa.innerHTML = opcoes.map((o, i) =>
      `<div class="lista-op${o.selected ? " on" : ""}" role="option" id="${sel.id}-op${i}" data-i="${i}" aria-selected="${o.selected}">${o.textContent.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]))}</div>`).join("");
    campo.appendChild(caixa);
    campo.classList.add("lista-aberta");
    sel.setAttribute("aria-expanded", "true");
    sel.setAttribute("aria-controls", caixa.id);
    caixa.style.top = (sel.offsetTop + sel.offsetHeight + 6) + "px";
    let ativo = sel.selectedIndex;
    const marcar = i => {
      ativo = Math.max(0, Math.min(opcoes.length - 1, i));
      caixa.querySelectorAll(".lista-op").forEach((el, k) => el.classList.toggle("foco", k === ativo));
      const el = caixa.children[ativo]; if (el) { el.scrollIntoView({ block: "nearest" }); sel.setAttribute("aria-activedescendant", el.id); }
    };
    const escolher = i => {
      if (sel.selectedIndex !== i) { sel.selectedIndex = i; sel.dispatchEvent(new Event("input", { bubbles: true })); sel.dispatchEvent(new Event("change", { bubbles: true })); }
      fechar(true);
    };
    marcar(ativo);
    caixa.addEventListener("mousedown", e => e.preventDefault());   /* não tira o foco do campo */
    caixa.addEventListener("click", e => { const o = e.target.closest(".lista-op"); if (o) escolher(Number(o.dataset.i)); });
    caixa.addEventListener("mousemove", e => { const o = e.target.closest(".lista-op"); if (o && Number(o.dataset.i) !== ativo) marcar(Number(o.dataset.i)); });
    aberta = { caixa, sel, marcar, escolher, ativo: () => ativo };
  }

  function preparar(sel) {
    if (sel.dataset.lista) return;
    sel.dataset.lista = "1";
    sel.setAttribute("aria-haspopup", "listbox");
    sel.setAttribute("aria-expanded", "false");
    sel.addEventListener("mousedown", e => {
      if (!COMPUTADOR.matches || e.button !== 0) return;
      e.preventDefault(); sel.focus();
      if (aberta && aberta.sel === sel) fechar(false); else abrir(sel);
    });
    sel.addEventListener("keydown", e => {
      if (!COMPUTADOR.matches) return;
      const a = aberta && aberta.sel === sel ? aberta : null;
      if (!a) {
        if (e.key === "Enter" || e.key === " " || (e.altKey && e.key === "ArrowDown")) { e.preventDefault(); abrir(sel); }
        return;   /* setas com a lista fechada: o navegador já troca a opção */
      }
      if (e.key === "ArrowDown") { e.preventDefault(); a.marcar(a.ativo() + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); a.marcar(a.ativo() - 1); }
      else if (e.key === "Home") { e.preventDefault(); a.marcar(0); }
      else if (e.key === "End") { e.preventDefault(); a.marcar(sel.options.length - 1); }
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); a.escolher(a.ativo()); }
      else if (e.key === "Escape") { e.preventDefault(); fechar(true); }
      else if (e.key === "Tab") fechar(false);
    });
    sel.addEventListener("blur", () => { setTimeout(() => { if (aberta && aberta.sel === sel && document.activeElement !== sel) fechar(false); }, 0); });
  }

  document.addEventListener("mousedown", e => { if (aberta && !aberta.caixa.contains(e.target) && e.target !== aberta.sel) fechar(false); });
  window.addEventListener("resize", () => fechar(false));
  const iniciar = () => document.querySelectorAll(".field select").forEach(preparar);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();
