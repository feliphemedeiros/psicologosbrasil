/* Psicólogos Brasil — psicologos.js: busca, filtros e horários da página psicologos.html */
(function () {
  const lista = $("#lista");
  if (!lista) return;
  const st = { q: "", tn: "", cat: "Todos" };
  const tema = new URLSearchParams(location.search).get("tema");
  if (tema && CATS.includes(tema)) st.cat = tema;
  const pad = (n) => String(n).padStart(2, "0");

  $("#turno").innerHTML = '<option value="">Qualquer horário</option>' + Object.keys(HR).map((k) => `<option value="${k}">${k}</option>`).join("");

  function chips() {
    $("#chips").innerHTML = CATS.map((c) => `<button type="button" class="chip" aria-pressed="${c === st.cat}" data-c="${c}">${c}</button>`).join("");
  }
  function slots(x) {
    const [h, m] = HR[x.t], f = new Intl.DateTimeFormat("pt-BR", { weekday: "short" }), i = PROS.indexOf(x);
    return [1, 2, 4].map((d) => {
      const D = new Date(); D.setDate(D.getDate() + d);
      const hh = `${pad(h)}:${pad(m)}`;
      return `<a class="chip" href="agendamento.html?tipo=sessao&p=${i}&d=${d}&h=${hh}">${f.format(D)} ${hh}</a>`;
    }).join("");
  }
  function render() {
    const q = norm(st.q.trim());
    const r = PROS.filter((x) => (st.cat === "Todos" || x.e === st.cat) && (!st.tn || x.t === st.tn) && (!q || norm(x.e + " " + x.a + " " + x.n).includes(q)));
    lista.innerHTML = r.length ? r.map((x) => {
      const i = PROS.indexOf(x);
      return `<article class="card"><div class="av" style="background:${x.c}">${x.n.split(" ").slice(1, 3).map((w) => w[0]).join("")}</div><h3>${x.n}</h3><span class="tag">${x.e}</span><small>${x.a}</small><div class="foot"><strong>R$ ${x.p}</strong><button class="btn ghost sm more" type="button" aria-expanded="false" aria-controls="s${i}">Ver horários</button></div><div class="slots" id="s${i}" hidden>${slots(x)}</div></article>`;
    }).join("") : '<p class="empty">Nenhum profissional com esses filtros. Tente outro motivo ou horário.</p>';
  }
  lista.addEventListener("click", (e) => {
    const m = e.target.closest(".more");
    if (!m) return;
    const s = document.getElementById(m.getAttribute("aria-controls")), o = s.hidden;
    s.hidden = !o; m.setAttribute("aria-expanded", o);
  });
  $("#chips").addEventListener("click", (e) => { const b = e.target.closest(".chip"); if (!b) return; st.cat = b.dataset.c; chips(); render(); });
  $("#q").addEventListener("input", (e) => { st.q = e.target.value; render(); });
  $("#turno").addEventListener("change", (e) => { st.tn = e.target.value; render(); });
  chips(); render();
})();
