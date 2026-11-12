/* Acesso do psicólogo à agenda: senha padrão, criar acesso, excluir, desativar/reativar.
   Usado pelas páginas psicologos.html, artigos.html, usuarios.html e config.html. Os arquivos rodam em ordem e dividem as mesmas variáveis. */
/* ---------- acesso à agenda ---------- */
function preencherAcesso(p) {
  const ag = agendaDe(p);
  $('#p-email').value = ag ? ag.email || '' : (p.acessoRasc && p.acessoRasc.email) || '';
  $('#p-usuario').value = ag ? ag.usuario || '' : (p.acessoRasc && p.acessoRasc.usuario) || '';
  $('#p-senha').value = '';
  $('#p-mensal').value = ag && ag.valorMensal ? ag.valorMensal : (p.valorMensal || '');
  $('#p-mensal').placeholder = 'Automático: R$ ' + U.precoMensal({ valor: Number(p.valor) || AGC.valorPadrao });
  if ($('#p-comissao')) $('#p-comissao').value = ag ? ag.comissao : (p.comissao ?? AGC.comissaoPadrao);
  $('#p-agenda-ativa').checked = ag ? !ag.pausada : !p.agendaPausada;
  visualAgendaSwitch();
  const FB = DB.modo === 'firebase';
  /* Firebase: o login é o e-mail (sem "usuário"); o e-mail de login só a própria pessoa troca */
  $('#p-usuario').closest('.campo').hidden = true;   /* o psicólogo entra só com e-mail e senha */
  $('#p-email').readOnly = FB && !!ag;
  $('#p-email-l').innerHTML = 'E-mail <span class="aj">— é o login</span>';
  $('#p-senha-l').innerHTML = ag ? 'Nova senha <span class="aj">— vazio = manter</span>' : 'Senha inicial';
  $('#p-senha').placeholder = ag ? 'Só se esqueceu a senha' : `Vazio = ${senhaPadrao(p.nome)}`;
  /* "Gerar senha": põe a senha padrão (primeiro nome + 123). Ela é provisória: no 1º login o painel pede para ele criar a dele */
  $('#p-senha-padrao').textContent = `Gerar senha (${senhaPadrao(p.nome)})`;
  $('#p-senha-padrao').hidden = false;
  $('#p-senha-link').hidden = !(FB && ag && ag.email);
  $('#p-acesso-salvar').textContent = ag ? 'Salvar acesso' : 'Criar acesso';
  const pill = $('#p-acesso-pill');
  pill.className = 'acesso-pill' + (ag ? (ag.ativo ? ' on' : ' off') : '');
  pill.textContent = ag ? (ag.ativo ? '● Acesso ativo' : '● Acesso desativado') : 'Sem acesso';
  const st = $('#p-acesso-status');
  if (ag) {
    st.innerHTML = (FB ? `Entra em /painel com o e-mail <b>${esc(ag.email || '')}</b>, a senha e o código do app autenticador.`
      : `Entra em /painel com o e-mail <b>${esc(ag.email || '')}</b> e a senha.`) +
      ' Esqueceu a senha? Coloque uma nova acima e clique em “Salvar acesso”: no próximo login o painel pede para ele criar a dele.';
  } else {
    st.innerHTML = `Ao clicar em “Publicar no site”, o acesso é criado sozinho com o e-mail da ficha e a senha <b>${esc($('#p-senha').value || senhaPadrao(p.nome))}</b>. Também dá para criar agora pelo botão “Criar acesso”.`;
  }
}
/* Senha padrão do psicólogo: primeiro nome (sem acento, minúsculo) + 123. Ex.: Helena Prado → helena123 */
function senhaPadrao(nome) {
  const partes = String(nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
  let base = partes[0] || 'psicologo';
  if (base.length < 3 && partes[1]) base += partes[1];   /* ex.: "Bo Lima" → bolima123 (o Firebase pede 6+) */
  return base + '123';
}
function usuarioSugerido(nome) {
  const partes = slugify(nome).split('-').filter(Boolean);
  return partes.length > 1 ? partes[0] + '.' + partes[partes.length - 1] : (partes[0] || '');
}
/* Cria o acesso sozinho na primeira publicação do perfil (com o e-mail da ficha e a senha padrão) */
async function criarAcessoAutomatico(p) {
  if (!p || agendaDe(p)) return null;
  const email = String($('#p-email').value || (p.acessoRasc && p.acessoRasc.email) || '').trim().toLowerCase();
  if (!U.emailValido(email)) {
    toast('Perfil publicado, mas sem e-mail: o acesso dele ainda não foi criado. Preencha o e-mail em “Acesso ao painel e agenda online”.', 'aviso');
    return null;
  }
  const FB = DB.modo === 'firebase';
  let usuario = email.split('@')[0].toLowerCase();   /* interno: o login é o e-mail */
  const senha = senhaPadrao(p.nome);
  const id = p.agendaId || slugify(p.slug || p.nome) || p.id;
  const dados = {
    id, nome: p.nome.trim(), crp: (p.crp || '').trim(), abordagem: (p.abordagens || []).join(', '),
    email, whatsapp: U.whatsNormalizar(p.whats || ''), usuario, senha, senhaPadrao: true,
    valor: Number(p.valor) || AGC.valorPadrao, valorMensal: Number($('#p-mensal').value) || null,
    comissao: ADMIN && $('#p-comissao') ? Number($('#p-comissao').value || AGC.comissaoPadrao) : (p.comissao ?? AGC.comissaoPadrao),
    ativo: !p.desativado, pausada: !$('#p-agenda-ativa').checked, doisFatores: true, salaMeet: normalizarSala(p.salaMeet), opp: (p.opp || '').trim()
  };
  try { await DB.salvarPsicologo(dados); }
  catch (e) {
    /* modo teste: usuário repetido → tenta com número no fim */
    if (!FB && /já existe/i.test(e.message || '')) { dados.usuario = usuario = usuario + '2'; await DB.salvarPsicologo(dados); }
    else throw e;
  }
  p.agendaId = id; delete p.acessoRasc;
  salvarAgora(); await atualizarAgendaMap(); preencherAcesso(p); infoPsi(); renderListaPsicologos();
  return { email, usuario, senha };
}
function mostrarAcessoCriado(p, r) {
  const FB = DB.modo === 'firebase';
  Auth.janela({
    titulo: `Acesso de ${p.nome.split(' ')[0]} criado`,
    texto: `Login: ${r.email}` + `\nSenha padrão: ${r.senha}\n\n` +
      (FB ? 'Chega um e-mail para confirmar o endereço e, no primeiro login, é preciso ativar o app autenticador. ' : '') +
      'Já aparece em Psicólogos. No primeiro acesso, o painel pede para trocar a senha.',
    ok: 'Entendi', semCancelar: true, icone: 'ok'
  });
}
async function salvarAcesso() {
  const p = psiAtual(); if (!p) return;
  const ag = agendaDe(p);
  const FB = DB.modo === 'firebase';
  const email = $('#p-email').value.trim();
  const usuario = (email.split('@')[0] || '').toLowerCase();   /* interno: o login é o e-mail */
  const digitada = $('#p-senha').value.trim();
  const usaPadrao = !ag && !digitada;
  const senha = usaPadrao ? senhaPadrao(p.nome) : digitada;
  const minSenha = 6;
  if (!p.nome.trim()) { toast('Coloque o nome do psicólogo primeiro.', 'erro'); return; }
  if (!U.emailValido(email)) { toast(FB ? 'Coloque um e-mail válido: é com ele que o psicólogo entra no painel.' : 'Coloque um e-mail válido: é para onde vai o código de login.', 'erro'); $('#p-email').focus(); return; }
  if ((!ag && senha.length < minSenha) || (ag && senha && senha.length < minSenha)) { toast(`A senha precisa ter pelo menos ${minSenha} caracteres.`, 'erro'); $('#p-senha').focus(); return; }
  const id = p.agendaId || slugify(p.slug || p.nome) || p.id;
  const btn = $('#p-acesso-salvar'); btn.disabled = true;
  try {
    /* troca de senha de quem já tem acesso (ex.: esqueceu a senha) */
    if (ag && digitada) {
      await DB.definirSenhaPsicologo(ag.id, digitada);
      $('#p-senha').value = '';
    }
    await DB.salvarPsicologo({
      ...(ag || {}), id, nome: p.nome.trim(), crp: (p.crp || '').trim(), abordagem: (p.abordagens || []).join(', '),
      email, whatsapp: p.whats ? U.whatsNormalizar(p.whats) : ((ag && ag.whatsapp) || ''), usuario, senha: ag ? '' : senha, ...(ag ? {} : { senhaPadrao: true }),   /* senha criada pela equipe = provisória */
      valor: Number(p.valor) || AGC.valorPadrao, valorMensal: Number($('#p-mensal').value) || null,
      comissao: ADMIN && $('#p-comissao') ? Number($('#p-comissao').value || 0) : (ag ? ag.comissao : (p.comissao ?? AGC.comissaoPadrao)),
      ativo: ag ? ag.ativo !== false : !p.desativado, pausada: !$('#p-agenda-ativa').checked, doisFatores: true, salaMeet: normalizarSala(p.salaMeet), opp: (p.opp || '').trim()
    });
    const novo = !p.agendaId;
    p.agendaId = id; delete p.acessoRasc;
    if (novo) marcarAlterado(p);
    salvarAgora(); await atualizarAgendaMap(); preencherAcesso(p); infoPsi(); renderListaPsicologos();
    if (novo) mostrarAcessoCriado(p, { email: email.toLowerCase(), usuario, senha });
    else if (digitada) Auth.janela({ titulo: 'Senha trocada', texto: `${'Login: ' + email}\nNova senha: ${digitada}\n\nPasse para o psicólogo. No próximo login, o painel pede para ele criar uma senha só dele.`, ok: 'Entendi', semCancelar: true, icone: 'ok' });
    else toast('Acesso salvo.', 'ok');
  } catch (e) { toast(e.message || 'Não consegui salvar o acesso.', 'erro'); }
  finally { btn.disabled = false; }
}
/* nome, CRP e valor do cadastro também valem na agenda */
async function sincronizarAgenda(p) {
  const ag = agendaDe(p); if (!ag) return;
  try {
    await DB.salvarPsicologo({ ...ag, nome: p.nome.trim(), crp: (p.crp || '').trim(), opp: (p.opp || '').trim(), abordagem: (p.abordagens || []).join(', '), valor: Number(p.valor) || ag.valor, senha: '' });
    await atualizarAgendaMap();
  } catch (e) { console.warn(e); }
}
const psiPublicoBase = psiPublico;
psiPublico = function (p) { const o = psiPublicoBase(p); const ag = agendaDe(p); if (ag && ag.ativo) o.agenda = ag.id; return o; };
const gerarPsiBase = gerarPsi;
gerarPsi = async function () {
  const p = psiAtual(); await gerarPsiBase();
  if (p && p.geradoEm && !p.alterado) {
    if (!agendaDe(p)) {
      try { const r = await criarAcessoAutomatico(p); if (r) mostrarAcessoCriado(p, r); }
      catch (e) { console.error(e); toast('Perfil publicado, mas não consegui criar o acesso: ' + (e.message || e) + ' Confira o e-mail e clique em “Criar acesso”.', 'erro'); }
    } else await sincronizarAgenda(p);
  }
  renderListaPsicologos();
};
const excluirBase = excluir;
/* Excluir um perfil = tirar de tudo: página no site, cartão em Psicólogos e o usuário (login e senha).
   Os atendimentos antigos continuam no histórico da Agenda. */
excluir = async function (tipo) {
  if (tipo !== 'psi') return excluirBase(tipo);
  const p = psiAtual(); if (!p) return;
  const ag = agendaDe(p), nome = p.nome || 'este perfil';
  /* quem já atendeu não pode ser excluído: apagaria o histórico, os repasses e o resumo do mês */
  if (ag) {
    let atendeu = false;
    try { atendeu = (await DB.listarAgendamentos({ psiId: ag.id, status: ['confirmado', 'realizado', 'falta'] })).length > 0; } catch (e) { atendeu = false; }
    if (atendeu) {
      const desativar = await Auth.confirmar(`Não dá para excluir ${nome}`,
        `Este psicólogo já tem atendimentos. Excluir apagaria o histórico, os repasses e o resumo dele.\n\nUse “Desativar”: ele sai do site e não entra mais no painel, mas o histórico fica guardado.`,
        p.desativado ? { ok: 'Entendi', semCancelar: true, icone: 'alerta' } : { ok: 'Desativar agora', cancelar: 'Fechar', icone: 'alerta' });
      if (desativar && !p.desativado) {
        try { await aplicarDesativado(p, true); toast(`Perfil de ${nome} desativado: saiu do site e o login não funciona mais.`, 'ok'); }
        catch (e) { console.error(e); toast(erroAmigavel(e), 'erro'); }
      }
      return;
    }
  }
  const ok = await Auth.confirmar(`Excluir ${nome} de vez?`,
    `Sai de tudo: a página no site${ag ? ', o cartão em Psicólogos e o usuário (o login e a senha deixam de existir)' : ''}. Isso não pode ser desfeito.\n\nSe a pessoa pode voltar no futuro, use “Desativar”.`,
    { ok: 'Excluir de vez', perigo: true, icone: 'lixo' });
  if (!ok) return;
  const b = $('#p-excluir'); b.disabled = true;
  try {
    if (p.pubSlug) await despublicar('psicologos', p.pubSlug);
    if (ag) await DB.excluirPsicologo(ag.id);
  } catch (e) { console.error(e); toast(erroAmigavel(e), 'erro'); b.disabled = false; return; }
  b.disabled = false;
  state.psicologos.splice(state.psicologos.indexOf(p), 1); salvarAgora();
  try { await atualizarAgendaMap(); } catch (e) {}
  atualP = null; abrirPsicologo(null); renderListaPsicologos();
  toast(`Perfil de ${nome} excluído${ag ? ' do site, de Psicólogos e de Usuários' : p.pubSlug ? ' do painel e do site' : ''}.`, 'ok');
};

function pillVideo() {
  const v = ($('#p-video') && $('#p-video').value || '').trim(), pill = $('#p-video-pill'); if (!pill) return;
  const ok = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be|vimeo\.com)\//i.test(v);
  pill.className = 'acesso-pill' + (v ? (ok ? ' on' : ' off') : '');
  pill.textContent = v ? (ok ? '● Vídeo no perfil' : 'Link não reconhecido') : 'Sem vídeo';
}
function visualAgendaSwitch() {
  const c = $('#p-agenda-ativa'); if (!c) return;
  const on = c.checked;
  c.closest('.agenda-switch').classList.toggle('off', !on);
  $('#p-agenda-tit').textContent = on ? 'Agenda online' : 'Agenda offline';
  $('#p-agenda-sub').textContent = on
    ? 'Os pacientes veem os horários livres e agendam pelo site. Desligue se o psicólogo ficar um tempo ausente.'
    : 'O perfil continua no site, mas mostra “Sem horários livres no momento”. O psicólogo continua entrando no painel.';
}
/* Desativar / reativar (botão no rodapé da ficha): nada é apagado.
   Desativar: o perfil sai do site e o login do psicólogo para de funcionar. */
function botaoDesativar() {
  const p = psiAtual(), b = $('#p-desativar'); if (!b || !p) return;
  b.textContent = p.desativado ? 'Reativar' : 'Desativar';
  b.title = p.desativado ? 'Volta para o site e libera o login de novo' : 'Tira do site e bloqueia o login, sem apagar nada';
}
/* Desativar/reativar um psicólogo: perfil no site E login, sempre juntos
   (vale tanto pela ficha quanto pela tela Usuários) */
async function aplicarDesativado(p, desligar) {
  const ag = agendaDe(p);
  if (ag) { await DB.salvarPsicologo({ ...ag, ativo: !desligar, senha: '' }); await atualizarAgendaMap(); }
  p.desativado = desligar; p.ativo = !desligar; p.atualizado = Date.now();
  if (p.pubSlug && p.geradoEm) { await publicarDoc('psicologos', p.pubSlug, p.pubSlug, psiPublico(p)); p.geradoEm = Date.now(); p.alterado = false; }
  salvarAgora(); renderListaPsicologos();
  if (psiAtual() === p) { infoPsi(); if (ag) preencherAcesso(p); botaoDesativar(); }
}
const textoDesativar = (p, desligar) => {
  const ag = agendaDe(p);
  return desligar
    ? `O perfil sai do site${ag ? ' e o login no painel para de funcionar' : ''}. Nada é apagado: dá para reativar quando a pessoa voltar.`
    : `O perfil volta para o site${ag ? ' e o login no painel volta a funcionar, com o mesmo e-mail e senha' : ''}.`;
};
async function alternarDesativado() {
  const p = psiAtual(); if (!p) return;
  const desligar = !p.desativado, nome = p.nome || 'este perfil';
  const ok = await Auth.confirmar(desligar ? `Desativar ${nome}?` : `Reativar ${nome}?`, textoDesativar(p, desligar), { ok: desligar ? 'Desativar' : 'Reativar', perigo: desligar });
  if (!ok) return;
  const b = $('#p-desativar'); b.disabled = true;
  try {
    await aplicarDesativado(p, desligar);
    toast(desligar ? `Perfil de ${nome} desativado: saiu do site e o login não funciona mais.` : `Perfil de ${nome} reativado: voltou para o site e o login funciona de novo.`, 'ok');
  } catch (e) { console.error(e); toast(erroAmigavel(e), 'erro'); }
  finally { b.disabled = false; botaoDesativar(); }
}
