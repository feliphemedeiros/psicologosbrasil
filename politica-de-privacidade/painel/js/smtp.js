/* =====================================================================
   CONFIGURAÇÕES DE SMTP (só administrador) — painel/conteudo.html
   O e-mail que o sistema usa para enviar sozinho os avisos.

   Com o Firebase:
     painel_smtp/config ........ servidor, porta e usuário (o admin lê e salva)
     painel_smtp_senha/atual ... a senha. O painel só GRAVA: ninguém consegue
                                 ler de volta pelo navegador. Só a função de
                                 e-mail do Firebase (pasta functions/) lê.
     smtp_testes/{id} .......... pedido de teste; a função conecta, manda um
                                 e-mail de teste e responde no mesmo documento.
   No modo teste: guarda servidor, porta e usuário neste navegador (a senha
   nunca é guardada) e o teste só confere se está tudo preenchido.
   ===================================================================== */
(function () {
  const form = document.getElementById('smtp-form');
  if (!form) return;
  const $ = s => document.querySelector(s);
  const FB = () => typeof ONLINE !== 'undefined' && ONLINE.modo === 'firebase';
  const CHAVE_LOCAL = 'pb_smtp_teste';
  let temSenha = false, carregado = false, mudou = false;

  const avisar = (msg, tipo) => (typeof toast === 'function' ? toast(msg, tipo) : alert(msg));
  function status(msg, tipo = '') {
    const el = $('#smtp-status');
    el.hidden = !msg; el.textContent = msg || ''; el.className = 'smtp-status' + (tipo ? ' ' + tipo : '');
  }
  function placeholderSenha() {
    $('#smtp-senha').placeholder = !FB() ? 'Senha do e-mail (no modo teste não é guardada)'
      : temSenha ? '•••••••• (senha salva; deixe em branco para manter)' : 'Senha do e-mail';
  }
  function ler() {
    return {
      host: $('#smtp-host').value.trim().toLowerCase(),
      porta: Number(String($('#smtp-porta').value).replace(/\D/g, '')) || 0,
      usuario: $('#smtp-usuario').value.trim().toLowerCase(),
      senha: $('#smtp-senha').value
    };
  }
  function validar(d) {
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d.host)) return 'Coloque o servidor SMTP (ex.: smtp.gmail.com).';
    if (!(d.porta >= 1 && d.porta <= 65535)) return 'Coloque a porta (465 ou 587, na maioria dos casos).';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.usuario)) return 'Coloque o e-mail remetente.';
    if (!d.senha && !temSenha) return 'Coloque a senha do e-mail.';
    return '';
  }

  async function nuvem() { return NUVEM.authPronta(); }

  async function carregar() {
    try {
      let c = null;
      if (FB()) {
        const { fs, db } = await nuvem();
        const d = await fs.getDoc(fs.doc(db, 'painel_smtp', 'config'));
        c = d.exists() ? d.data() : null;
      } else {
        try { c = JSON.parse(localStorage.getItem(CHAVE_LOCAL)); } catch (e) { c = null; }
      }
      if (c) {
        $('#smtp-host').value = c.host || '';
        $('#smtp-porta').value = c.porta || '';
        $('#smtp-usuario').value = c.usuario || '';
        temSenha = !!c.temSenha;
      }
      $('#smtp-senha').value = '';
      placeholderSenha();
      carregado = true; mudou = false;
    } catch (e) {
      console.warn('smtp', e);
      status('Não consegui ler a configuração de e-mail. Confira se as regras do Firebase (firestore.rules) estão atualizadas.', 'erro');
    }
  }

  async function salvar() {
    const d = ler();
    const erro = validar(d);
    if (erro) { status(erro, 'erro'); return false; }
    const dados = { host: d.host, porta: d.porta, usuario: d.usuario, temSenha: temSenha || !!d.senha, atualizado: Date.now() };
    if (FB()) {
      const { fs, db, usuario } = await nuvem();
      if (d.senha) await fs.setDoc(fs.doc(db, 'painel_smtp_senha', 'atual'), { senha: d.senha, atualizado: Date.now() });
      await fs.setDoc(fs.doc(db, 'painel_smtp', 'config'), { ...dados, por: (usuario && usuario.email) || '' });
    } else {
      localStorage.setItem(CHAVE_LOCAL, JSON.stringify(dados));   /* a senha não fica no navegador */
    }
    temSenha = dados.temSenha; mudou = false;
    $('#smtp-senha').value = ''; placeholderSenha();
    return true;
  }

  async function esperarResposta(ref, fs) {
    const fim = Date.now() + 45000;
    while (Date.now() < fim) {
      await new Promise(r => setTimeout(r, 1500));
      const d = await fs.getDoc(ref);
      const x = d.exists() ? d.data() : {};
      if (x.status && x.status !== 'pendente') return x;
    }
    return null;
  }

  async function testar() {
    const b = $('#smtp-testar');
    const erro = validar(ler());
    if (erro) { status(erro, 'erro'); return; }
    b.disabled = true;
    try {
      if (!FB()) {
        if (mudou) await salvar();
        status('Modo teste: os dados estão completos, mas daqui o painel não consegue falar com o servidor de e-mail. O teste de verdade (com envio) funciona com o Firebase ligado e a função de e-mail instalada (passo 12 do guia).', '');
        return;
      }
      if (mudou || ler().senha) { status('Salvando antes de testar…'); await salvar(); }
      status('Conectando no servidor de e-mail e enviando um e-mail de teste…');
      const { fs, db, usuario } = await nuvem();
      const para = (usuario && usuario.email) || ler().usuario;
      const ref = await fs.addDoc(fs.collection(db, 'smtp_testes'), { para, em: Date.now(), por: (usuario && usuario.uid) || '', status: 'pendente' });
      const r = await esperarResposta(ref, fs);
      if (!r) status('O Firebase não respondeu ao teste. Confira se a função de e-mail foi instalada (passo 12 do arquivo COMO-ATIVAR-O-FIREBASE.txt).', 'erro');
      else if (r.status === 'ok') status(`Conexão funcionando. Mandamos um e-mail de teste para ${para}.`, 'ok');
      else status('Não conectou: ' + (r.erro || 'erro desconhecido') + dicaErro(r.erro || ''), 'erro');
    } catch (e) {
      console.error(e);
      status(/permission|permiss/i.test(String(e && (e.code || e.message))) ? 'Sem permissão. Publique de novo o firestore.rules no Firebase.' : 'Não consegui testar: ' + (e.message || e), 'erro');
    } finally { b.disabled = false; }
  }

  function dicaErro(m) {
    if (/535|auth|credentials|username and password/i.test(m)) return ' — usuário ou senha recusados. No Gmail, use uma senha de app.';
    if (/ENOTFOUND|EAI_AGAIN/i.test(m)) return ' — servidor não encontrado. Confira o endereço do servidor.';
    if (/ETIMEDOUT|ECONNREFUSED|timeout/i.test(m)) return ' — o servidor não respondeu nessa porta. Tente 465 ou 587.';
    if (/wrong version number|SSL|TLS/i.test(m)) return ' — porta e segurança não combinam. Use 465 (SSL) ou 587 (STARTTLS).';
    return '';
  }

  form.addEventListener('input', () => { mudou = true; });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const b = $('#smtp-salvar'); b.disabled = true;
    try {
      if (await salvar()) {
        status(FB() ? 'Configuração salva. Clique em "Testar conexão SMTP" para conferir.' : 'Configuração salva neste navegador (modo teste: a senha não é guardada).', 'ok');
        avisar('Configuração de e-mail salva.');
      }
    } catch (err) {
      console.error(err);
      status(/permission|permiss/i.test(String(err && (err.code || err.message))) ? 'Sem permissão para salvar. Publique de novo o firestore.rules no Firebase.' : 'Não consegui salvar: ' + (err.message || err), 'erro');
    } finally { b.disabled = false; }
  });
  $('#smtp-testar').addEventListener('click', testar);
  $('#smtp-olho').addEventListener('click', () => {
    const i = $('#smtp-senha'), ver = i.type === 'password';
    i.type = ver ? 'text' : 'password';
    $('#smtp-olho').setAttribute('aria-pressed', ver ? 'true' : 'false');
    $('#smtp-olho').setAttribute('aria-label', ver ? 'Esconder a senha' : 'Mostrar a senha');
  });

  /* carrega quando o administrador abre Configurações */
  function talvezCarregar() {
    const v = document.getElementById('view-config');
    if (v && v.classList.contains('ativa') && !carregado && (!FB() || (Auth.sessao() || {}).papel === 'admin')) carregar();
  }
  const obs = new MutationObserver(talvezCarregar);
  const v = document.getElementById('view-config');
  if (v) obs.observe(v, { attributes: true, attributeFilter: ['class'] });
  talvezCarregar();
})();
