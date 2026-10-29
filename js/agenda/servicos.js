/* =====================================================================
   SERVIÇOS EXTERNOS — link do Google Meet, e-mails e WhatsApp
   ---------------------------------------------------------------------
   Modo local: tudo é SIMULADO.
     - O link do Meet é inventado (formato real, mas a sala não existe).
     - Os e-mails não saem: ficam na "Caixa de saída" do painel admin.
     - O WhatsApp abre de verdade (wa.me), com a mensagem pronta.
   Com banco de verdade: gerarLinkMeet e enviarEmail passam a chamar uma
   função no servidor (ver comentários e LEIA-ME.md).
   ===================================================================== */
(function () {
  const C = window.AGENDA_CONFIG;

  const letras = n => Array.from({ length: n }, () => 'abcdefghijkmnopqrstuvwxyz'[Math.floor(Math.random() * 25)]).join('');

  function listaSessoes(ags) {
    return ags.map(a => `• ${U.fmtLonga(a.data)}, ${U.intervalo(a.hora, a.duracao)}`).join('\n');
  }
  function plano(ags) {
    const a = ags[0];
    return a.tipo === 'mensal'
      ? `Plano mensal (${ags.length} sessões) — ${U.moeda(a.valor * ags.length)}`
      : `Sessão avulsa — ${U.moeda(a.valor)}`;
  }

  const Servicos = {
    /* ---------- Google Meet ----------
       FUTURO: chamar uma função no servidor (Supabase Edge Function ou
       Firebase Cloud Function) que usa a Google Calendar API com a CONTA
       DA PLATAFORMA: events.insert com conferenceData.createRequest
       (conferenceSolutionKey.type = 'hangoutsMeet') e conferenceDataVersion=1,
       convidando o paciente e o psicólogo. Para o plano mensal, criar um
       evento com recorrência (RRULE:FREQ=WEEKLY;COUNT=4) → mesmo link nas 4. */
    async gerarLinkMeet(/* agendamentos */) {
      /* Firebase (sem servidor): a equipe cria a sala em meet.google.com
         ("Nova reunião" → "Criar uma reunião para depois") e cola o link. */
      if (DB.modo !== 'local') return '';
      return `https://meet.google.com/${letras(3)}-${letras(4)}-${letras(3)}`;
    },

    /* ---------- E-mail ----------
       FUTURO: função no servidor com um serviço de e-mail (ex.: Resend,
       SendGrid, Amazon SES). Nunca colocar chave de e-mail no navegador. */
    async enviarEmail({ para, assunto, corpo, agId }) {
      /* Firebase: grava na coleção "mail". Com a extensão "Trigger Email from
         Firestore" instalada, o Firebase envia sozinho (veja o guia). */
      await DB.registrarEmail({ para, assunto, corpo, agId });
    },

    /* ---------- Textos ---------- */
    textos: {
      whatsPreReserva(ags, psi) {
        const a = ags[0];
        return `Olá! Fiz uma pré-reserva pelo site.\n\n`
          + `Código: #${a.codigo}\n`
          + `Psicólogo(a): ${psi.nome}\n`
          + `${plano(ags)}\n`
          + `${ags.length > 1 ? 'Sessões:\n' : 'Sessão:\n'}${listaSessoes(ags)}\n\n`
          + `Nome: ${a.paciente.nome}\n`
          + `Gostaria de confirmar e receber os dados para pagamento.`;
      },

      emailPaciente(ags, psi) {
        const a = ags[0];
        return {
          assunto: ags.length > 1
            ? `Plano confirmado: ${ags.length} sessões com ${psi.nome}`
            : `Sessão confirmada: ${U.fmtDDMM(a.data)} às ${U.fmtHora(a.hora)} com ${psi.nome}`,
          corpo: `Olá, ${U.primeiroNome(a.paciente.nome)}!\n\n`
            + `Seu pagamento foi confirmado e seu atendimento está marcado.\n\n`
            + `Psicólogo(a): ${psi.nome} (CRP ${psi.crp})\n`
            + `${plano(ags)}\n`
            + `${listaSessoes(ags)}\n\n`
            + `Link da sala (o mesmo para ${ags.length > 1 ? 'todas as sessões' : 'a sessão'}):\n${a.linkMeet}\n\n`
            + `Dicas para a sessão:\n`
            + `• Entre na sala 5 minutos antes.\n`
            + `• Escolha um lugar reservado, onde você possa falar à vontade.\n`
            + `• Use fone de ouvido e confira sua internet.\n\n`
            + `Precisa remarcar? Avise com pelo menos 24 horas de antecedência pelo WhatsApp.\n\n`
            + `Código do agendamento: #${a.codigo}\n`
            + `${C.nomePlataforma}`
        };
      },

      emailPsicologo(ags, psi) {
        const a = ags[0];
        return {
          assunto: ags.length > 1
            ? `Novo plano mensal confirmado: ${U.primeiroNome(a.paciente.nome)}, ${U.todoDia(a.data)} às ${U.fmtHora(a.hora)}`
            : `Novo atendimento confirmado: ${U.fmtDDMM(a.data)} às ${U.fmtHora(a.hora)}`,
          corpo: `Olá, ${U.primeiroNome(psi.nome)}!\n\n`
            + `Um atendimento foi confirmado para você.\n\n`
            + `Paciente: ${a.paciente.nome}\n`
            + `${ags.length > 1 ? 'Sessões:' : 'Sessão:'}\n${listaSessoes(ags)}\n\n`
            + `Link da sala:\n${a.linkMeet}\n\n`
            + `Entre no painel e clique em "Estou ciente" para a equipe saber que você viu.\n\n`
            + `${C.nomePlataforma}`
        };
      },

      emailRemarcacao(a, psi, paraPsicologo) {
        return {
          assunto: `Atendimento remarcado: ${U.fmtDDMM(a.data)} às ${U.fmtHora(a.hora)}`,
          corpo: `Olá, ${U.primeiroNome(paraPsicologo ? psi.nome : a.paciente.nome)}!\n\n`
            + `O atendimento ${paraPsicologo ? `com ${a.paciente.nome}` : `com ${psi.nome}`} foi remarcado para:\n`
            + `• ${U.fmtLonga(a.data)}, ${U.intervalo(a.hora, a.duracao)}\n\n`
            + `O link da sala continua o mesmo:\n${a.linkMeet}\n\n${C.nomePlataforma}`
        };
      },

      whatsPaciente(ags, psi) {
        const a = ags[0];
        return `Olá, ${U.primeiroNome(a.paciente.nome)}! Seu atendimento está confirmado ✅\n\n`
          + `Psicólogo(a): ${psi.nome}\n${listaSessoes(ags)}\n\n`
          + `Link da sala:\n${a.linkMeet}\n\n`
          + `Entre 5 minutos antes, num lugar reservado. Também enviamos tudo para o seu e-mail.`;
      },

      whatsPsicologo(ags, psi) {
        const a = ags[0];
        return `Olá, ${U.primeiroNome(psi.nome)}! Novo atendimento confirmado:\n\n`
          + `Paciente: ${a.paciente.nome}\n${listaSessoes(ags)}\n\n`
          + `Link da sala:\n${a.linkMeet}\n\n`
          + `Confirme no painel que está ciente, por favor.`;
      }
    },

    /* Envia os e-mails de confirmação (paciente e/ou psicólogo) */
    async notificarConfirmacao(ags, psi, { paciente = true, psicologo = true } = {}) {
      const t = Servicos.textos;
      if (paciente) { const e = t.emailPaciente(ags, psi); await Servicos.enviarEmail({ para: ags[0].paciente.email, ...e, agId: ags[0].id }); }
      if (psicologo) { const e = t.emailPsicologo(ags, psi); await Servicos.enviarEmail({ para: psi.email, ...e, agId: ags[0].id }); }
    },

    async notificarRemarcacao(a, psi) {
      const t = Servicos.textos;
      const ep = t.emailRemarcacao(a, psi, false);
      const es = t.emailRemarcacao(a, psi, true);
      await Servicos.enviarEmail({ para: a.paciente.email, ...ep, agId: a.id });
      await Servicos.enviarEmail({ para: psi.email, ...es, agId: a.id });
    }
  };

  window.Servicos = Servicos;
})();
