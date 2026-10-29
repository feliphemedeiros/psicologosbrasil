/* =====================================================================
   CONFIGURAÇÃO DA AGENDA — Psicólogos Brasil
   Tudo o que você pode querer mudar sem mexer no resto do código.
   ===================================================================== */
window.AGENDA_CONFIG = {
  /* Onde os dados ficam guardados:
     'local'    → no próprio navegador (só para testes em localhost)
     'supabase' → banco Supabase (preencher "supabase" abaixo)
     'firebase' → banco Firebase (preencher "firebase" abaixo)
     Veja LEIA-ME.md para saber o que muda em cada caso. */
  /* automático: com as chaves em js/firebase-config.js usa o Firebase; sem elas, modo teste */
  banco: (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey) ? 'firebase' : 'local',

  supabase: { url: '', anonKey: '' },
  firebase: { apiKey: '', authDomain: '', projectId: '' },

  nomePlataforma: 'Psicólogos Brasil',
  emailPlataforma: 'contato@psicologosbrasil.com.br',
  /* WhatsApp da equipe (com 55 + DDD). É para onde o paciente manda a pré-reserva. */
  whatsappPlataforma: (typeof CONFIG !== 'undefined' && CONFIG.whatsapp) || '5588996997631',

  /* aparece no fim do agendamento, embaixo dos 3 passos (vazio = não mostra) */
  horarioAtendimento: 'seg a sex, 8h às 20h',

  duracaoSessao: 50,          // minutos
  horaInicio: 7,              // primeira hora que aparece na grade do psicólogo
  horaFim: 21,                // última hora de início de sessão na grade
  diasVisiveis: 45,           // quantos dias à frente o paciente pode escolher
  antecedenciaMinHoras: 2,    // não deixa marcar para daqui a menos de X horas
  expiracaoPreReservaHoras: 2,// pré-reserva sem pagamento volta a ficar livre depois disso

  valorPadrao: 120,           // valor da sessão quando o psicólogo não tem valor próprio
  sessoesMensal: 4,
  descontoMensalPct: 8.33,    // desconto do plano mensal (120 x 4 = 480 → R$ 440)
  diasAgendaPsicologo: 60,    // até quantos dias à frente o psicólogo pode abrir horários
  comissaoPadrao: 30          // % que fica com a plataforma (pode mudar por psicólogo)
};
