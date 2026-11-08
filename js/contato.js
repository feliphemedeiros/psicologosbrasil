/* Psicólogos Brasil — página de Contato.
   O formulário não depende de servidor: monta a mensagem e abre o WhatsApp do suporte
   (ou o e-mail da pessoa) com tudo já escrito. É só a pessoa enviar.
   Na versão com banco de dados (MariaDB), este formulário pode passar a enviar pelo servidor. */
(function () {
  const form = document.getElementById("ct-form");
  if (!form) return;
  const EMAIL = "contato@psicologosbrasil.com.br";
  const fone = typeof WHATS !== "undefined" ? WHATS : "5588996997631";
  const $ = (id) => document.getElementById(id);
  const assunto = $("ca"), dicaPsi = $("ct-dica-psi"), campoCodigo = $("ct-codigo-campo");

  /* o código do agendamento só aparece nos assuntos em que ele ajuda */
  const COM_CODIGO = /agendamento|pagamento|técnico/i;
  function ajustar() {
    const a = assunto.value;
    dicaPsi.hidden = !/atender/i.test(a);
    campoCodigo.hidden = !COM_CODIGO.test(a);
  }
  /* ?assunto=pagamento (ou tecnico, agendamento, dados, atender) já deixa o assunto escolhido */
  const pedido = new URLSearchParams(location.search).get("assunto");
  if (pedido) {
    const op = Array.from(assunto.options).find((o) => o.text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(pedido.toLowerCase()));
    if (op) assunto.value = op.value;
  }
  assunto.addEventListener("change", ajustar);
  ajustar();

  function texto() {
    const linhas = [
      `Olá! Meu nome é ${$("cn").value.trim()}.`,
      `Assunto: ${assunto.value}`,
    ];
    if (!campoCodigo.hidden && $("cc").value.trim()) linhas.push(`Código do agendamento: ${$("cc").value.trim()}`);
    if ($("ce").value.trim()) linhas.push(`E-mail: ${$("ce").value.trim()}`);
    linhas.push("", $("cm").value.trim());
    return linhas.join("\n");
  }
  function valido() {
    const ok = ["cn", "cm"].every((id) => $(id).value.trim()) && $("ce").checkValidity();
    if (!ok) form.reportValidity();
    return ok;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!valido()) return;
    window.open(`https://api.whatsapp.com/send?phone=${fone}&text=${encodeURIComponent(texto())}`, "_blank", "noopener");
  });
  $("ct-email").addEventListener("click", () => {
    if (!valido()) return;
    location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(assunto.value)}&body=${encodeURIComponent(texto())}`;
  });
})();
