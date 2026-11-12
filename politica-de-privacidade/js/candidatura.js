/* Psicólogos Brasil — candidatura.js
   Formulário "Cadastro de psicólogo" da página /para-psicologos/.
   - Com o Firebase: grava em "candidaturas" (aparece no Painel → Candidaturas
     e a função do Firebase manda um aviso por e-mail para a equipe).
   - Modo teste (sem Firebase): guarda neste navegador, para o painel de teste.
   - Se não der para gravar: oferece mandar os mesmos dados pelo WhatsApp. */
(function () {
  "use strict";
  const form = document.getElementById("pcForm");
  if (!form) return;
  const $ = (s) => document.querySelector(s);
  const LOCAL = "pb_candidaturas_v1";
  const TEMAS = ["Ansiedade", "Depressão", "Autoestima", "Relacionamentos", "Terapia de casal", "Burnout e estresse",
    "Luto", "Pânico", "TDAH", "Autismo (TEA)", "Transtorno bipolar", "TOC", "Autoconhecimento", "Carreira",
    "Conflitos familiares", "Adolescência", "Gestação e pós-parto", "Morar fora do Brasil", "LGBTQIA+", "Dependência química"];

  $("#pcTemas").innerHTML = TEMAS.map((t, i) =>
    `<label class="pc-tema"><input type="checkbox" name="temas" value="${t}" id="pcT${i}"><span>${t}</span></label>`).join("");

  /* máscaras: WhatsApp (00) 00000-0000 e CRP 00/00000 (igual ao painel) */
  const soNum = (v) => String(v || "").replace(/\D/g, "");
  $("#pcZap").addEventListener("input", (e) => {
    let d = soNum(e.target.value);
    if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
    d = d.slice(0, 11);
    e.target.value = d.length > 6 ? `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`
      : d.length > 2 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d;
  });
  $("#pcCrp").addEventListener("input", (e) => {
    const d = soNum(e.target.value).slice(0, 7);
    e.target.value = d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d;
  });

  function ler() {
    return {
      nome: $("#pcNome").value.trim().replace(/\s+/g, " "),
      email: $("#pcEmail").value.trim().toLowerCase(),
      whatsapp: soNum($("#pcZap").value),
      crp: $("#pcCrp").value.trim(),
      epsi: $("#pcEpsi").value,
      abordagem: $("#pcAbord").value.trim(),
      experiencia: $("#pcExp").value,
      temas: [...form.querySelectorAll('input[name="temas"]:checked')].map((i) => i.value),
      link: $("#pcLink").value.trim(),
      mensagem: $("#pcMsg").value.trim()
    };
  }

  function validar(d) {
    const erros = [];
    const marcar = (id, ok) => { const f = $(id).closest(".field"); f.classList.toggle("erro", !ok); if (!ok) erros.push(id); };
    marcar("#pcNome", d.nome.split(" ").length >= 2 && d.nome.length >= 5);
    marcar("#pcEmail", /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email));
    marcar("#pcZap", d.whatsapp.length >= 10 && d.whatsapp.length <= 11);
    marcar("#pcCrp", /^\d{2}\/\d{4,5}$/.test(d.crp));
    marcar("#pcEpsi", !!d.epsi);
    marcar("#pcAbord", d.abordagem.length >= 2);
    marcar("#pcExp", !!d.experiencia);
    const aceite = $("#pcAceite").checked;
    $(".pc-aceite").classList.toggle("erro", !aceite);
    if (!aceite) erros.push("#pcAceite");
    return erros;
  }
  form.addEventListener("input", (e) => {
    const f = e.target.closest(".field.erro"); if (f) f.classList.remove("erro");
    if (e.target.id === "pcAceite") $(".pc-aceite").classList.remove("erro");
  });

  const zapNumero = () => (typeof CONFIG !== "undefined" && CONFIG.whatsapp) || "5588996997631";
  function linkZap(d) {
    const txt = "Olá! Quero atender na Psicólogos Brasil.\n\n" +
      `Nome: ${d.nome}\nCRP: ${d.crp}\nE-mail: ${d.email}\nWhatsApp: ${d.whatsapp}\ne-Psi: ${d.epsi}\n` +
      `Abordagem: ${d.abordagem}\nAtuação: ${d.experiencia}` + (d.temas.length ? `\nTemas: ${d.temas.join(", ")}` : "") +
      (d.link ? `\nLink: ${d.link}` : "");
    return `https://api.whatsapp.com/send?phone=${zapNumero()}&text=${encodeURIComponent(txt)}`;
  }

  async function gravar(d) {
    const doc = { ...d, status: "nova", em: Date.now(), origem: "site" };
    if (typeof NUVEM !== "undefined" && NUVEM.modo === "firebase") {
      const { fs, db } = await NUVEM.comPrazo(NUVEM.firebase());
      await NUVEM.comPrazo(fs.addDoc(fs.collection(db, "candidaturas"), doc), 12000);
      return;
    }
    let l = [];
    try { l = JSON.parse(localStorage.getItem(LOCAL)) || []; } catch (e) { l = []; }
    l.unshift({ id: "c" + Date.now().toString(36), ...doc });
    localStorage.setItem(LOCAL, JSON.stringify(l.slice(0, 500)));
  }

  const msg = $("#pcMsgStatus");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = ""; msg.className = "form-msg";
    if ($("#pcSite").value) return;                    /* robô preencheu o campo escondido */
    const d = ler();
    const erros = validar(d);
    if (erros.length) {
      msg.textContent = "Confira os campos marcados em vermelho.";
      msg.classList.add("erro");
      const el = $(erros[0]); el.focus({ preventScroll: true });
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    const b = $("#pcEnviar"); b.disabled = true;
    const rot = b.firstChild.textContent; b.firstChild.textContent = "Enviando… ";
    try {
      await gravar(d);
      form.hidden = true;
      const ok = $("#pcOk");
      ok.hidden = false;
      $("#pcOkTxt").textContent = `Obrigado, ${d.nome.split(" ")[0]}! Nossa equipe vai analisar seus dados e falar com você pelo WhatsApp ou pelo e-mail ${d.email}.`;
      $("#pcOkZap").href = linkZap(d);
      ok.focus({ preventScroll: true });
      ok.scrollIntoView({ block: "center", behavior: "smooth" });
    } catch (err) {
      console.warn("candidatura", err);
      msg.classList.add("erro");
      msg.innerHTML = `Não conseguimos enviar agora. <a href="${linkZap(d)}" target="_blank" rel="noopener">Envie seus dados pelo WhatsApp</a>, já vai com tudo preenchido.`;
    } finally { b.disabled = false; b.firstChild.textContent = rot; }
  });
})();
