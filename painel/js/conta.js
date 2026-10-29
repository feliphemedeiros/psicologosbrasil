/* =====================================================================
   MINHA CONTA (administrador e suporte) — painel/conta.html
   Abre clicando no próprio nome, lá em cima à direita.
   O psicólogo tem a conta dele dentro da Minha agenda.
   ===================================================================== */
(async function () {
  const S = Auth.exigir(['admin', 'suporte']);
  if (!S) return;
  const { $ } = U;
  const FB = DB.modo === 'firebase';
  $('[data-sair]').onclick = () => Auth.sair();
  Auth.menuAreas($('[data-areas]'), '');

  if (FB) {
    $('#campo-usuario').hidden = true;
    $('#c-ajuda').textContent = 'Se trocar o e-mail, mandamos um link para o e-mail novo. O login muda quando você clicar nele.';
    $('#c-2fa').textContent = 'Seu login usa senha + código do app autenticador.';
  }

  function guardarSessao(campos) {
    const s = Auth.sessao(); if (!s) return;
    sessionStorage.setItem('pb_painel_sessao', JSON.stringify({ ...s, ...campos }));
    document.querySelectorAll('#btn-conta [data-nome]').forEach(e => { e.textContent = campos.nome || s.nome; });
    const ava = document.querySelector('#btn-conta .conta-ava');
    const n = campos.nome || s.nome || '';
    if (ava) ava.textContent = n.split(/\s+/).filter(w => w.length > 2).slice(0, 2).map(w => w[0]).join('').toUpperCase() || (n[0] || '•').toUpperCase();
  }

  async function render() {
    try {
      const c = await DB.minhaConta.obter(S.id) || {};
      $('#c-nome').value = c.nome || S.nome || '';
      $('#c-email').value = c.email || S.email || '';
      $('#c-usuario').value = c.usuario || '';
      $('#c-papel').value = Auth.NOMES_PAPEL[S.papel] || '';
    } catch (e) { U.toast(e.message, 'erro'); }
  }

  $('#form-dados').addEventListener('submit', async e => {
    e.preventDefault();
    const dados = { nome: $('#c-nome').value.trim(), email: $('#c-email').value.trim().toLowerCase(), usuario: $('#c-usuario').value.trim().toLowerCase() };
    if (dados.nome.length < 3) return U.toast('Coloque o nome completo.', 'erro');
    if (!U.emailValido(dados.email)) return U.toast('Coloque um e-mail válido.', 'erro');
    const b = $('#c-salvar'); b.disabled = true;
    try {
      const r = await DB.minhaConta.salvar(S.id, dados);
      guardarSessao(FB ? { nome: dados.nome } : { nome: dados.nome, email: dados.email });
      U.toast(r && r.aviso ? r.aviso : 'Dados salvos.');
      await render();
    } catch (err) { U.toast(err.message, 'erro'); }
    finally { b.disabled = false; }
  });

  $('#form-senha').addEventListener('submit', async e => {
    e.preventDefault();
    try {
      await DB.alterarSenha(S.id, $('#s-atual').value, $('#s-nova').value);
      e.target.reset();
      U.toast('Senha alterada.');
    } catch (err) { U.toast(err.message, 'erro'); }
  });

  render();
})();
