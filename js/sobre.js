/* Psicólogos Brasil — Página Quem somos.
   Usa os psicólogos publicados (os mesmos da lista) para mostrar números reais:
   - quantos psicólogos atendem hoje (cartão do topo)
   - o menor valor de sessão ("Sessões a partir de R$ …")
   - fotos de parte da equipe, com rodízio diário
   Com os perfis de demonstração nada disso aparece: a página fica com os textos fixos. */
(function () {
  if (typeof PSI === "undefined") return;
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reais = (v) => "R$\u00a0" + Number(v).toLocaleString("pt-BR", { minimumFractionDigits: Number(v) % 1 ? 2 : 0 });

  PSI.carregar().then(({ lista, demo }) => {
    if (demo || !lista.length) return;

    /* número de psicólogos */
    const total = document.querySelector("[data-qs-total]");
    if (total && lista.length >= 3) {
      total.innerHTML = `<b>${lista.length} psicólogos</b><span>com registro ativo no conselho, atendendo online</span>`;
    }

    /* menor valor */
    const valores = lista.map((x) => Number(x.valor)).filter((v) => v > 0);
    const preco = document.querySelector("[data-qs-preco]");
    if (preco && valores.length) {
      preco.textContent = `Sessões a partir de ${reais(Math.min(...valores))}, pagas por Pix depois que o horário é confirmado.`;
    }

    /* parte da equipe: até 6, mudando a ordem a cada dia */
    const ul = document.getElementById("qs-time");
    const sec = document.getElementById("equipe");
    if (!ul || !sec || lista.length < 2) return;
    const d = new Date(), hoje = d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate();
    const hash = (t) => { let h = 2166136261; for (const c of t + hoje) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
    const time = lista.slice().sort((a, b) => hash(a.slug) - hash(b.slug)).slice(0, 6);
    ul.innerHTML = time.map((x) => {
      const foto = x.foto
        ? `<img src="${esc(x.foto)}" alt="" width="120" height="120" loading="lazy">`
        : `<span class="qs-ini" style="background:${esc(x._cor)}">${esc(PSI.iniciais(x.nome))}</span>`;
      const linha = [x.tratamento, x.abordagens[0]].filter(Boolean).join(" · ");
      return `<li><a href="${esc(x.url)}">${foto}<b>${esc(x.nome)}</b><span>${esc(linha)}</span>${x.crp ? `<small>CRP ${esc(x.crp)}</small>` : ""}</a></li>`;
    }).join("");
    sec.hidden = false;
  }).catch(() => {});
})();
