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
  /* Endereço do site (links dos Termos e da Política nos e-mails e no WhatsApp) */
  siteUrl: 'https://www.psicologosbrasil.com.br',
  /* Versão dos Termos de uso: a data da última atualização (AAAA-MM-DD).
     Mudou os Termos? Troque aqui também: cada agendamento guarda a versão que o paciente aceitou. */
  termosVersao: '2026-11-06',
  /* WhatsApp da equipe (com 55 + DDD). É para onde o paciente manda a pré-reserva. */
  whatsappPlataforma: (typeof CONFIG !== 'undefined' && CONFIG.whatsapp) || '5588996997631',

  /* Horário de atendimento da EQUIPE (quem confirma o pagamento).
     O prazo da pré-reserva e a antecedência mínima contam só dentro dele:
     ex.: pré-reserva feita à meia-noite vence às 10h (2 horas a partir das 8h).
     dias: 0 = domingo, 1 = segunda … 6 = sábado. Ajustável no painel (Configurações). */
  equipe: { dias: [1, 2, 3, 4, 5], inicio: 8, fim: 20, prazoHoras: 2, antecedenciaHoras: 4 },

  duracaoSessao: 50,          // minutos
  limiteConversas: 10,        // quantas conversas de 15 min (com psicólogos diferentes) cada paciente pode fazer
  duracaoConhecer: 15,        // minutos da conversa "Conheça o psicólogo" (ocupa o horário inteiro do psicólogo)
  horaInicio: 7,              // primeira hora que aparece na grade do psicólogo
  horaFim: 21,                // última hora de início de sessão na grade
  diasVisiveis: 45,           // quantos dias à frente o paciente pode escolher
  /* antecedência mínima e prazo da pré-reserva: ver "equipe" acima (contam no horário da equipe) */

  valorPadrao: 120,           // valor da sessão quando o psicólogo não tem valor próprio
  sessoesMensal: 4,
  descontoMensalPct: 8.33,    // desconto do plano mensal (120 x 4 = 480 → R$ 440)
  diasAgendaPsicologo: 60,    // até quantos dias à frente o psicólogo pode abrir horários
  comissaoPadrao: 30          // % que fica com a plataforma (pode mudar por psicólogo)
};
