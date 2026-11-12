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

  $('#campo-usuario').hidden = true;   /* o login é o e-mail */
  if (FB) {
    $('#c-ajuda').textContent = 'Se trocar o e-mail, mandamos um link para o e-mail novo. O login muda quando você clicar nele.';
    $('#c-2fa').textContent = 'Seu login usa senha + código do app autenticador.';
  }
  /* v202: troca de senha só para o administrador (botão rápido). O suporte usa “Esqueci a senha” no login (código no e-mail). */
  const ADM = S.papel === 'admin';
  $('#c-senha').hidden = !ADM;
  if (!ADM) $('#c-2fa').textContent = ($('#c-2fa').textContent ? $('#c-2fa').textContent + ' ' : '') + 'Para trocar a senha, use “Esqueci a senha” na tela de login: o código chega no seu e-mail.';

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
      $('#c-papel').value = Auth.nomePapel(S);
      /* nome e e-mail: só o administrador principal muda os próprios; os outros só a senha */
      const trava = !c.principal;
      ['#c-nome', '#c-email'].forEach(id => { $(id).readOnly = trava; $(id).closest('.campo').classList.toggle('so-leitura', trava); });
      $('#c-salvar').hidden = trava;
      if (trava) $('#c-ajuda').innerHTML = S.papel === 'suporte'
        ? 'Nome, e-mail e papel quem muda é um <b>administrador</b> (em Usuários).'
        : 'Nome, e-mail e papel quem muda é o <b>administrador principal</b> (em Usuários).';
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

  $('#c-senha').addEventListener('click', () => {
    if (!ADM) return;
    Auth.formulario({
      titulo: 'Trocar senha', icone: 'editar', ok: 'Salvar nova senha', mostrarSenhas: true,
      campos: [
        { nome: 'atual', rotulo: 'Senha atual', tipo: 'password', auto: 'current-password' },
        { nome: 'nova', rotulo: 'Nova senha', tipo: 'password', auto: 'new-password', ajuda: 'Pelo menos 8 caracteres. Misture letras e números.' },
        { nome: 'conf', rotulo: 'Repita a nova senha', tipo: 'password', auto: 'new-password' }
      ],
      aoEnviar: async v => {
        if (!v.atual || !v.nova) throw new Error('Preencha a senha atual e a nova senha.');
        if (v.nova.length < 8) throw new Error('A nova senha precisa ter pelo menos 8 caracteres.');
        if (v.nova !== v.conf) throw new Error('As duas senhas novas não estão iguais.');
        await DB.alterarSenha(S.id, v.atual, v.nova);
      }
    }).then(r => { if (r) U.toast('Senha alterada.'); });
  });

  render();
})();
