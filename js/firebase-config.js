/* =====================================================================
   FIREBASE — chaves do banco de dados do painel online.
   ---------------------------------------------------------------------
   ENQUANTO ESTIVER "null": o site e o painel funcionam em MODO TESTE.
     - Login do painel: usuário "admin" e senha "psicologos2026".
     - O que for publicado aparece no site SÓ no navegador de quem publicou.

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
