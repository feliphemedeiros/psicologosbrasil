/* Psicólogos Brasil — agendamento.js: formulário de agendamento (envia os dados pelo WhatsApp). */
(function () {
  const f = $("#agForm");
  if (!f) return;
  const prof = $("#prof"), dia = $("#dia"), hora = $("#hora"), sum = $("#agSum"), msg = $("#agMsg");
  const pad = (n) => String(n).padStart(2, "0");
  const fd = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" });
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const tipo = () => f.querySelector('input[name="tipo"]:checked').value;
  const q = new URLSearchParams(location.search);

  prof.innerHTML = PROS.map((x, i) => `<option value="${i}">${esc(x.n)} — ${esc(x.e)}</option>`).join("");
  dia.innerHTML = Array.from({ length: 14 }, (_, i) => { const D = new Date(); D.setDate(D.getDate() + i + 1); return `<option value="${i + 1}">${fd.format(D)}</option>`; }).join("");
  function horas(sel) {
    const [H, M] = HR[PROS[prof.value].t];
    hora.innerHTML = [0, 1, 2].map((k) => { const v = `${pad(H + k)}:${pad(M)}`; return `<option${v === sel ? " selected" : ""}>${v}</option>`; }).join("");
  }
  function resumo() {
    const x = PROS[prof.value], conv = tipo() === "conversa";
    sum.innerHTML = `<dt>Tipo</dt><dd>${conv ? "Primeira conversa gratuita (15 min)" : "Sessão (50 min)"}</dd><dt>Profissional</dt><dd>${esc(x.n)}</dd><dt>Abordagem</dt><dd>${esc(x.a)}</dd><dt>Data</dt><dd>${cap(dia.selectedOptions[0].text)}</dd><dt>Horário</dt><dd>${hora.value}</dd><dt>Valor</dt><dd>${conv ? "Gratuito" : "R$ " + x.p}</dd>`;
  }
  if (q.get("tipo") === "sessao") f.querySelector('input[value="sessao"]').checked = true;
  const p0 = +q.get("p"); if (PROS[p0]) prof.value = p0;
  const d0 = +q.get("d"); if (d0 >= 1 && d0 <= 14) dia.value = d0;
  horas(q.get("h")); resumo();
  prof.addEventListener("change", () => { horas(); resumo(); });
  [dia, hora].forEach((el) => el.addEventListener("change", resumo));
  f.querySelectorAll('input[name="tipo"]').forEach((el) => el.addEventListener("change", resumo));

  const say = (t, ok) => { msg.hidden = false; msg.textContent = t; msg.className = "form-msg " + (ok ? "ok" : "erro"); };
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    const nome = f.nome.value.trim(), tel = f.whats.value.replace(/\D/g, "");
    if (nome.length < 2) { say("Informe o seu nome.", false); f.nome.focus(); return; }
    if (tel.length < 10) { say("Informe o WhatsApp com DDD.", false); f.whats.focus(); return; }
    const x = PROS[prof.value], conv = tipo() === "conversa";
    const txt = [`Olá! Quero agendar ${conv ? "a primeira conversa gratuita (15 min)" : "uma sessão (50 min)"}.`, `Profissional: ${x.n} (${x.e})`, `Data: ${cap(dia.selectedOptions[0].text)}`, `Horário: ${hora.value}`, `Nome: ${nome}`, `WhatsApp: ${f.whats.value.trim()}`, f.motivo.value.trim() && `Motivo: ${f.motivo.value.trim()}`].filter(Boolean).join("\n");
    const url = `https://api.whatsapp.com/send?phone=${WHATS}&text=${encodeURIComponent(txt)}`;
    msg.hidden = false; msg.className = "form-msg ok";
    msg.innerHTML = `Pronto! Se o WhatsApp não abrir, <a href="${url}" target="_blank" rel="noopener">clique aqui</a>.`;
    window.open(url, "_blank", "noopener");
  });
})();
