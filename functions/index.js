/* =====================================================================
   FUNÇÃO DE E-MAIL — Psicólogos Brasil (Firebase Cloud Functions)

   Envia os e-mails do sistema usando o SMTP salvo no painel em
   Configurações → Configurações de SMTP. Substitui a extensão
   "Trigger Email from Firestore" (não use as duas juntas: sairia em dobro).

   enviarEmail .. cada documento novo na coleção "mail" vira um e-mail.
                  O resultado fica no próprio documento, em "delivery"
                  (a aba "E-mails enviados" da Agenda mostra "✓ Enviado").
   testarSmtp ... botão "Testar conexão SMTP": conecta no servidor,
                  manda um e-mail de teste e responde em smtp_testes/{id}.

   Como instalar: veja o passo 12 de COMO-ATIVAR-O-FIREBASE.txt.
   ===================================================================== */
const { onDocumentCreated, onDocumentDeleted, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

/* A região precisa ser a mesma do banco de dados (passo 2 do guia). */
const REGIAO = 'southamerica-east1';
const NOME_REMETENTE = 'Psicólogos Brasil';
setGlobalOptions({ region: REGIAO, maxInstances: 5, timeoutSeconds: 60 });

let banco = null;
function db() {
  if (!banco) { if (!admin.apps.length) admin.initializeApp(); banco = admin.firestore(); }
  return banco;
}
const agora = () => admin.firestore && admin.firestore.Timestamp ? admin.firestore.Timestamp.now() : new Date();

/* lê servidor/porta/usuário + senha (a senha nunca vai para o navegador) */
async function lerSmtp() {
  const [c, s] = await Promise.all([db().doc('painel_smtp/config').get(), db().doc('painel_smtp_senha/atual').get()]);
  const cfg = c.exists ? c.data() : null;
  const senha = s.exists ? (s.data() || {}).senha : '';
  if (!cfg || !cfg.host || !cfg.porta || !cfg.usuario) throw new Error('SMTP não configurado. Preencha em Configurações → Configurações de SMTP.');
  if (!senha) throw new Error('Falta a senha do e-mail em Configurações → Configurações de SMTP.');
  return { host: cfg.host, porta: Number(cfg.porta), usuario: cfg.usuario, senha };
}

function transporte(c) {
  return nodemailer.createTransport({
    host: c.host,
    port: c.porta,
    secure: c.porta === 465,          /* 465 = SSL direto; 587/25 = STARTTLS */
    requireTLS: c.porta === 587,
    auth: { user: c.usuario, pass: c.senha },
    connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 30000,
    tls: c.tls || undefined
  });
}

function remetente(c) { return { name: NOME_REMETENTE, address: c.usuario }; }

/* monta e envia um e-mail a partir de um documento da coleção "mail" */
async function enviarDoc(m, c) {
  const msg = m.message || {};
  const para = m.to || m.para;
  if (!para) throw new Error('E-mail sem destinatário.');
  const t = transporte(c);
  const info = await t.sendMail({
    from: remetente(c),
    to: para, cc: m.cc, bcc: m.bcc,
    replyTo: m.replyTo || undefined,
    subject: msg.subject || m.assunto || '(sem assunto)',
    text: msg.text || m.corpo || undefined,
    html: msg.html || undefined
  });
  return { messageId: info.messageId || '', accepted: info.accepted || [], rejected: info.rejected || [], response: info.response || '' };
}

function textoErro(e) {
  const partes = [e && e.code, e && e.responseCode, e && (e.response || e.message)].filter(Boolean);
  return String(partes.join(' · ') || e).slice(0, 500);
}

async function processarMail(snap, c = null) {
  const m = snap.data() || {};
  if (m.delivery && m.delivery.state) return;               /* já tratado */
  await snap.ref.update({ delivery: { state: 'PROCESSING', startTime: agora(), attempts: 1 } });
  try {
    const info = await enviarDoc(m, c || await lerSmtp());
    await snap.ref.update({ delivery: { state: 'SUCCESS', startTime: agora(), endTime: agora(), attempts: 1, error: null, info } });
  } catch (e) {
    console.error('Falha ao enviar e-mail', snap.ref.id, textoErro(e));
    await snap.ref.update({ delivery: { state: 'ERROR', endTime: agora(), attempts: 1, error: textoErro(e) } });
  }
}

async function processarTeste(snap, c = null) {
  const p = snap.data() || {};
  if (p.status !== 'pendente') return;
  try {
    const cfg = c || await lerSmtp();
    const t = transporte(cfg);
    await t.verify();
    await t.sendMail({
      from: remetente(cfg), to: p.para || cfg.usuario,
      subject: 'Teste de e-mail — Psicólogos Brasil',
      text: 'Tudo certo! Este é um e-mail de teste do painel da Psicólogos Brasil.\n\nOs avisos de agendamento e de pendências vão sair deste endereço: ' + cfg.usuario
    });
    await snap.ref.update({ status: 'ok', fim: Date.now(), erro: null });
  } catch (e) {
    await snap.ref.update({ status: 'erro', fim: Date.now(), erro: textoErro(e) });
  }
}

exports.enviarEmail = onDocumentCreated('mail/{id}', ev => ev.data ? processarMail(ev.data) : null);
exports.testarSmtp = onDocumentCreated('smtp_testes/{id}', ev => ev.data ? processarTeste(ev.data) : null);

/* Usuário excluído no painel (Usuários → Excluir): apaga também a conta de login */
async function apagarLogin(uid) {
  try { if (!admin.apps.length) admin.initializeApp(); await admin.auth().deleteUser(uid); }
  catch (e) { if (!e || e.code !== 'auth/user-not-found') console.error('Não consegui apagar o login', uid, e && e.message); }
}
exports.apagarLoginExcluido = onDocumentDeleted('usuarios/{uid}', ev => apagarLogin(ev.params.uid));

/* A equipe trocou a senha de um psicólogo (Perfis → Acesso ao painel → Nova senha).
   Troca a senha do login, marca como provisória e apaga a senha do pedido. */
async function processarTrocaSenha(snap) {
  const p = snap.data() || {};
  if (p.status !== 'pendente') return;
  const { FieldValue } = require('firebase-admin/firestore');
  try {
    const u = await db().doc('usuarios/' + p.uid).get();
    const alvo = u.exists ? (u.data() || {}) : null;
    if (!alvo) throw new Error('Usuário não encontrado.');
    /* quem pediu: equipe pode trocar a senha de psicólogo; só administrador mexe em suporte/administrador (nunca no principal nem em si mesmo) */
    const quem = p.por ? await db().doc('usuarios/' + p.por).get() : null;
    const papelQuem = quem && quem.exists ? (quem.data() || {}).papel : '';
    if (alvo.papel === 'psicologo') {
      if (!['admin', 'suporte'].includes(papelQuem)) throw new Error('Sem permissão.');
      /* e-mail do psicólogo: a equipe troca (Minha conta do psicólogo, vista pela equipe) */
    } else {
      if (papelQuem !== 'admin' || p.por === p.uid || alvo.principal === true) throw new Error('Sem permissão.');
    }
    if (!p.senha && !p.email) throw new Error('Nada para trocar.');
    const minimo = alvo.papel === 'psicologo' ? 6 : 8;
    if (p.senha && String(p.senha).length < minimo) throw new Error(`A senha precisa ter pelo menos ${minimo} caracteres.`);
    if (!admin.apps.length) admin.initializeApp();
    const mud = {};
    if (p.senha) mud.password = String(p.senha);
    if (p.email) mud.email = String(p.email).trim().toLowerCase();
    await admin.auth().updateUser(p.uid, mud);
    await db().doc('usuarios/' + p.uid).update({ ...(p.senha ? { senhaPadrao: true } : {}), ...(p.email ? { email: mud.email } : {}) });
    await snap.ref.update({ status: 'ok', senha: FieldValue.delete(), fim: Date.now() });
  } catch (e) {
    await snap.ref.update({ status: 'erro', erro: textoErro(e), senha: FieldValue.delete(), fim: Date.now() });
  }
}
exports.trocarSenhaPsicologo = onDocumentCreated('trocas_senha/{id}', ev => ev.data ? processarTrocaSenha(ev.data) : null);

/* só para os testes automáticos */
/* Candidatura nova (página /para-psicologos/) → aviso por e-mail para a equipe.
   Vai para o e-mail do SMTP (o mesmo remetente) e o "Responder" já cai no e-mail do psicólogo. */
async function avisarCandidatura(snap, c = null) {
  const d = snap.data() || {};
  try {
    const cfg = c || await lerSmtp();
    const linhas = [
      ['Nome', d.nome], ['CRP', d.crp], ['e-Psi', d.epsi], ['E-mail', d.email], ['WhatsApp', d.whatsapp],
      ['Abordagem', d.abordagem], ['Atuação clínica', d.experiencia], ['Temas', (d.temas || []).join(', ')],
      ['Link', d.link], ['Mensagem', d.mensagem]
    ].filter(([, v]) => v);
    await transporte(cfg).sendMail({
      from: remetente(cfg), to: cfg.usuario, replyTo: d.email || undefined,
      subject: `Novo cadastro de psicólogo: ${d.nome || ''} (CRP ${d.crp || '-'})`,
      text: 'Chegou um cadastro novo pela página Para psicólogos.\n\n' + linhas.map(([k, v]) => `${k}: ${v}`).join('\n') +
        '\n\nVeja e responda no painel: Candidaturas.'
    });
    await snap.ref.update({ avisado: true });
  } catch (e) {
    console.error('Aviso de candidatura não enviado', snap.ref.id, textoErro(e));
  }
}
/* ---------- Troca da chave Pix pelo psicólogo (código de 6 números no e-mail) ----------
   trocas_pix/{id}: o ADMINISTRADOR (ou o suporte com "Psicólogos (completo)") cria o pedido com a chave nova
   do psicólogo; aqui geramos o código, guardamos em trocas_pix_segredo (ninguém lê pelo navegador) e mandamos
   para o e-mail de QUEM PEDIU (não do psicólogo). Ele digita o código
   no painel (campo "codigo" do pedido): conferimos e só então trocamos a chave. */
const mascarar = e => { const [n, d] = String(e || '').split('@'); return d ? n.slice(0, 2) + '•••@' + d : ''; };
async function pedirPix(snap) {
  const p = snap.data() || {}, ref = snap.ref;
  try {
    const u = await db().doc('usuarios/' + p.por).get(), ud = u.exists ? u.data() : {};
    const extras = (Array.isArray(ud.extras) ? ud.extras : []).map(k => (k === 'psiResumo' ? 'psicologos' : k));
    const pode = ud.ativo !== false && (ud.papel === 'admin' || (ud.papel === 'suporte' && extras.includes('psicologos')));
    if (!pode) throw new Error('Sem permissão para trocar a chave Pix.');
    const email = ud.email;
    if (!email) throw new Error('Seu usuário não tem e-mail cadastrado.');
    const codigo = String(require('crypto').randomInt(100000, 1000000));
    await db().doc('trocas_pix_segredo/' + ref.id).set({ codigo, expira: Date.now() + 10 * 60e3, tentativas: 0 });
    await db().collection('mail').add({ para: email, assunto: 'Código para trocar a chave Pix de um psicólogo',
      corpo: `Seu código para confirmar a nova chave Pix na Psicólogos Brasil é ${codigo}. Ele vale por 10 minutos.\n\nSe não foi você, não digite o código e fale com o suporte: sua chave continua a mesma.`, em: Date.now() });
    await ref.update({ status: 'codigo_enviado', emailMasc: mascarar(email) });
  } catch (e) { await ref.update({ status: 'erro', erro: e.message || String(e) }); }
}
async function conferirPix(ev) {
  const antes = ev.data.before.data() || {}, depois = ev.data.after.data() || {}, ref = ev.data.after.ref;
  if (depois.status !== 'conferindo' || antes.status === 'conferindo') return null;
  const sref = db().doc('trocas_pix_segredo/' + ref.id), s = await sref.get(), seg = s.exists ? s.data() : null;
  if (!seg || seg.expira < Date.now()) { await sref.delete().catch(() => {}); return ref.update({ status: 'erro', erro: 'O código venceu. Peça outro.' }); }
  if (String(depois.codigo || '') !== seg.codigo) {
    const t = (seg.tentativas || 0) + 1;
    if (t >= 5) { await sref.delete(); return ref.update({ status: 'erro', erro: 'Código errado muitas vezes. Peça outro código.' }); }
    await sref.update({ tentativas: t });
    return ref.update({ status: 'codigo_errado', erro: 'Código incorreto. Confira no e-mail.' });
  }
  await db().doc('psicologos_agenda/' + depois.psiId).update({ pix: depois.pix, pixTipo: depois.pixTipo, pixAlteradoEm: Date.now(), atualizado: Date.now() });
  await sref.delete();
  const ag = await db().doc('psicologos_agenda/' + depois.psiId).get(), email = (ag.data() || {}).email;
  if (email) await db().collection('mail').add({ para: email, assunto: 'Sua chave Pix foi alterada', corpo: 'A chave Pix para receber os repasses da Psicólogos Brasil foi alterada agora. Se não foi você, fale com o suporte imediatamente.', em: Date.now() });
  return ref.update({ status: 'ok', codigo: '' });
}
exports.pedirCodigoPix = onDocumentCreated('trocas_pix/{id}', ev => ev.data ? pedirPix(ev.data) : null);
exports.conferirCodigoPix = onDocumentUpdated('trocas_pix/{id}', ev => conferirPix(ev));

exports.avisarCandidatura = onDocumentCreated('candidaturas/{id}', ev => ev.data ? avisarCandidatura(ev.data) : null);

exports._interno = { pedirPix, conferirPix, avisarCandidatura, processarMail, processarTeste, processarTrocaSenha, transporte, apagarLogin, usarBanco: b => { banco = b; } };
