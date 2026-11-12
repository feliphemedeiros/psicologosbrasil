/* =====================================================================
   FIREBASE — chaves do banco de dados do painel online.
   ---------------------------------------------------------------------
   ENQUANTO ESTIVER "null": o site e o painel funcionam em MODO TESTE.
     - Login do painel com as contas de teste (admin / admin123 …).
     - O que for publicado aparece no site SÓ no navegador de quem publicou.
   COM AS CHAVES PREENCHIDAS: tudo passa a ser o Firebase de verdade —
     login oficial (e-mail + senha + app autenticador), banco de dados,
     agenda e publicação. As contas de teste deixam de existir.

   PARA ATIVAR O FIREBASE (siga o guia COMO-ATIVAR-O-FIREBASE.txt):
     troque o "null" abaixo pelo bloco que o Firebase mostra, assim:

     window.FIREBASE_CONFIG = {
       apiKey: "AIza...",
       authDomain: "seu-projeto.firebaseapp.com",
       projectId: "seu-projeto",
       storageBucket: "seu-projeto.appspot.com",
       messagingSenderId: "123456789",
       appId: "1:123456789:web:abc123"
     };

   Essas chaves podem ficar públicas: quem protege os dados são as
   REGRAS do Firebase (arquivo firestore.rules), não as chaves.
   ===================================================================== */
window.FIREBASE_CONFIG = null;

/* Dois fatores no login do painel (app autenticador: Google Authenticator,
   Microsoft Authenticator, Authy…). Deixe "true".
   Só use "false" para um teste rápido ANTES de ativar o TOTP no Google Cloud
   (passo 6 do guia) — e aí mude também a linha "exige2fa" do firestore.rules. */
window.PAINEL_2FA = true;
