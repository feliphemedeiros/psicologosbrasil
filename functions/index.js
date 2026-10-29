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
const { onDocumentCreated, onDocumentDeleted } = require('firebase-functions/v2/firestore');
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
    if (!u.exists || (u.data() || {}).papel !== 'psicologo') throw new Error('Só dá para trocar a senha de psicólogos por aqui.');
    if (!p.senha || String(p.senha).length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
    if (!admin.apps.length) admin.initializeApp();
    await admin.auth().updateUser(p.uid, { password: String(p.senha) });
    await db().doc('usuarios/' + p.uid).update({ senhaPadrao: true });
    await snap.ref.update({ status: 'ok', senha: FieldValue.delete(), fim: Date.now() });
  } catch (e) {
    await snap.ref.update({ status: 'erro', erro: textoErro(e), senha: FieldValue.delete(), fim: Date.now() });
  }
}
exports.trocarSenhaPsicologo = onDocumentCreated('trocas_senha/{id}', ev => ev.data ? processarTrocaSenha(ev.data) : null);

/* só para os testes automáticos */
exports._interno = { processarMail, processarTeste, processarTrocaSenha, transporte, apagarLogin, usarBanco: b => { banco = b; } };
