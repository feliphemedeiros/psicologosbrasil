/* =====================================================================
   SERVIÇOS EXTERNOS — e-mails e WhatsApp
   ---------------------------------------------------------------------
   Link do Google Meet: é a SALA FIXA de cada psicólogo, cadastrada na ficha
   (Informações pessoais → Sala do Google Meet). Nada é gerado aqui.
   Modo local:
     - Os e-mails não saem: ficam na "Caixa de saída" do painel admin.
     - O WhatsApp abre de verdade (wa.me), com a mensagem pronta.
   Com banco de verdade: enviarEmail passa a chamar uma
   função no servidor (ver comentários e LEIA-ME.md).
   ===================================================================== */
(function () {
  const C = window.AGENDA_CONFIG;

  /* FUSO HORÁRIO: data/hora do agendamento estão no fuso do psicólogo (a.fuso).
     Cada mensagem mostra no fuso de quem lê e, se for diferente, o horário do outro lado. */
  const fPac = a => a.fusoPaciente || a.fuso || U.FUSO_BR;
  const fPsi = a => a.fuso || U.FUSO_BR;
  /* links públicos dos Termos e da Política (endereço completo, para funcionar no e-mail e no WhatsApp) */
  const site = () => String(C.siteUrl || 'https://www.psicologosbrasil.com.br').replace(/\/+$/, '');
  const linkTermos = () => `${site()}/termos-de-uso/`;
  const linkPrivacidade = () => `${site()}/politica-de-privacidade/`;
  /* rodapé dos e-mails ao paciente */
  const rodapeLegal = () => `\n\n—\nAo agendar, você concordou com os nossos Termos de uso e a Política de privacidade.\n`
    + `Remarcação ou cancelamento: com pelo menos 24 horas de antecedência.\n`
    + `Termos de uso: ${linkTermos()}\nPolítica de privacidade: ${linkPrivacidade()}`;
  function listaSessoes(ags, fuso, outro) {
    return ags.map(a => `• ${U.textoSessao(a, fuso || fPsi(a), outro)}`).join('\n');
  }
  /* "10/11 às 13h" no fuso de quem lê */
  function curta(a, fuso) { const v = U.paraFuso(a.data, a.hora, fPsi(a), fuso); return `${U.fmtDDMM(v.data)} às ${U.fmtHora(v.hora)}${U.mesmoRelogio(fuso, U.FUSO_BR, U.msAg(a)) ? '' : ` (horário de ${U.cidadeFuso(fuso)})`}`; }
  function plano(ags) {
    const a = ags[0];
    return a.tipo === 'mensal'
      ? `Plano mensal (${ags.length} sessões) — ${U.moeda(a.valor * ags.length)}`
      : `Sessão avulsa — ${U.moeda(a.valor)}`;
  }

  const Servicos = {
    /* ---------- Google Meet ----------
       Sala fixa por psicólogo (campo salaMeet). FUTURO (opcional): link exclusivo por sessão
       com Google Workspace + Google Calendar API, criado no servidor. */

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
          + `${ags.length > 1 ? 'Sessões:\n' : 'Sessão:\n'}${listaSessoes(ags, fPac(a), U.FUSO_BR)}\n\n`
          + `Nome: ${a.paciente.nome}\n`
          + `Gostaria de confirmar e receber os dados para pagamento.`;
      },

      /* Sai na hora em que o paciente aperta "Enviar agendamento" */
      emailPedido(ags, psi, info) {
        const a = ags[0], wa = `https://wa.me/${U.whatsNumero(C.whatsappPlataforma)}`;
        return {
          assunto: `Recebemos seu pedido #${a.codigo}: horário reservado até ${info.prazoCompleto}`,
          corpo: `Olá, ${U.primeiroNome(a.paciente.nome)}!\n\n`
            + `Recebemos seu pedido de agendamento.\n\n`
            + `Código: #${a.codigo}\n`
            + `Psicólogo(a): ${psi.nome}\n`
            + `${plano(ags)}\n`
            + `${listaSessoes(ags, fPac(a))}\n\n`
            + `Seu horário está reservado até ${info.prazoCompleto}.\n\n`
            + `Próximo passo:\n`
            + (info.dentro
              ? `Em instantes nossa equipe chama você no WhatsApp para confirmar e enviar os dados do Pix.\n\n`
              : `Agora estamos fora do horário de atendimento. ${/^(sábado|domingo)/.test(info.aberturaCompleta) ? 'No' : 'Na'} ${info.aberturaCompleta}, nossa equipe chama você no WhatsApp para confirmar e enviar os dados do Pix. Pode ficar tranquilo(a): seu horário está guardado.\n\n`)
            + `Depois que o pagamento for confirmado, você recebe o link da videochamada por e-mail.\n\n`
            + `Quer adiantar? Fale com a gente no WhatsApp:\n${wa}\n\n`
            + `Horário de atendimento da equipe: ${info.horario}.\n\n`
            + `${C.nomePlataforma}`
            + rodapeLegal()
        };
      },

      emailPaciente(ags, psi) {
        const a = ags[0];
        return {
          assunto: ags.length > 1
            ? `Plano confirmado: ${ags.length} sessões com ${psi.nome}`
            : `Sessão confirmada: ${curta(a, fPac(a))} com ${psi.nome}`,
          corpo: `Olá, ${U.primeiroNome(a.paciente.nome)}!\n\n`
            + `Seu pagamento foi confirmado e seu atendimento está marcado.\n\n`
            + `Psicólogo(a): ${psi.nome} (CRP ${psi.crp})\n`
            + `${plano(ags)}\n`
            + `${listaSessoes(ags, fPac(a))}\n\n`
            + `Link da sala (o mesmo para ${ags.length > 1 ? 'todas as sessões' : 'a sessão'}):\n${a.linkMeet}\n\n`
            + `Como entrar: abra o link no horário marcado e clique em "Pedir para participar". ${psi.nome.split(' ')[0]} vai liberar a sua entrada (pode levar alguns instantes).\n\n`
            + `Dicas para a sessão:\n`
            + `• Entre no link no horário marcado da sessão.\n`
            + `• Escolha um lugar reservado, onde você possa falar à vontade.\n`
            + `• Use fone de ouvido e confira sua internet.\n\n`
            + `Precisa remarcar? Avise com pelo menos 24 horas de antecedência pelo WhatsApp.\n\n`
            + `Código do agendamento: #${a.codigo}\n`
            + `${C.nomePlataforma}`
            + rodapeLegal()
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
            + `${ags.length > 1 ? 'Sessões:' : 'Sessão:'}\n${listaSessoes(ags, fPsi(a), fPac(a))}\n\n`
            + `Link da sala:\n${a.linkMeet}\n\n`
            + `Entre no painel e clique em "Estou ciente" para a equipe saber que você viu.\n\n`
            + `${C.nomePlataforma}`
        };
      },

      emailRemarcacao(a, psi, paraPsicologo) {
        return {
          assunto: `Atendimento remarcado: ${curta(a, paraPsicologo ? fPsi(a) : fPac(a))}`,
          corpo: `Olá, ${U.primeiroNome(paraPsicologo ? psi.nome : a.paciente.nome)}!\n\n`
            + `O atendimento ${paraPsicologo ? `com ${a.paciente.nome}` : `com ${psi.nome}`} foi remarcado para:\n`
            + `• ${paraPsicologo ? U.textoSessao(a, fPsi(a), fPac(a)) : U.textoSessao(a, fPac(a))}\n\n`
            + `O link da sala continua o mesmo:\n${a.linkMeet}\n\n${C.nomePlataforma}`
        };
      },

      whatsPaciente(ags, psi) {
        const a = ags[0];
        return `Olá, ${U.primeiroNome(a.paciente.nome)}! Seu atendimento está confirmado ✅\n\n`
          + `Psicólogo(a): ${psi.nome}\n${listaSessoes(ags, fPac(a))}\n\n`
          + `Link da sala:\n${a.linkMeet}\n\n`
          + `Abra o link no horário marcado e clique em "Pedir para participar": ${psi.nome.split(' ')[0]} vai liberar a sua entrada. Escolha um lugar reservado. Também enviamos tudo para o seu e-mail.\n\n`
          + `Remarcação só com 24h de aviso. Termos de uso: ${linkTermos()}`;
      },

      /* Lembretes (Agenda → Lembretes) */
      whatsLembretePaciente(a, psi) {
        const quando = U.fmtQuando(U.msAg(a), fPac(a)).replace(', ', ' às ');
        return `Olá, ${U.primeiroNome(a.paciente.nome)}! Passando para lembrar da sua sessão com ${psi.nome} ${quando}: ${U.textoSessao(a, fPac(a))}.`
          + (a.tipo === 'mensal' ? ` É a sessão ${a.sessao} de ${a.totalSessoes} do seu plano mensal.` : '')
          + `\n\nLink da sala:\n${a.linkMeet}\n\n`
          + `No horário, abra o link e clique em "Pedir para participar". Qualquer dúvida, é só responder aqui.`;
      },
      whatsLembretePsicologo(a, psi) {
        const quando = U.fmtQuando(U.msAg(a), fPsi(a)).replace(', ', ' às ');
        return `Olá, ${U.primeiroNome(psi.nome)}! Lembrete: você tem sessão ${quando} com ${a.paciente.nome}: ${U.textoSessao(a, fPsi(a), fPac(a))}`
          + (a.tipo === 'mensal' ? `. Plano mensal, sessão ${a.sessao} de ${a.totalSessoes}.` : '. Sessão avulsa.')
          + `\n\nLink da sala:\n${a.linkMeet}`;
      },
      whatsRenovacao(a, psi) {
        const quando = U.fmtQuando(U.msAg(a), fPac(a)).replace(', ', ' às ');
        const v = U.paraFuso(a.data, a.hora, fPsi(a), fPac(a));
        return `Olá, ${U.primeiroNome(a.paciente.nome)}! Sua sessão com ${psi.nome} ${quando} é a última do seu plano mensal.\n\n`
          + `Quer continuar com ${U.primeiroNome(psi.nome)} nas ${U.DIAS_PLURAL[U.diaSemana(v.data)]} às ${U.fmtHora(v.hora)}? `
          + `Se quiser, já garantimos o mesmo horário para as próximas ${a.totalSessoes} semanas.`;
      },

      /* Resgate: pré-reserva venceu e a pessoa nunca fez sessão (Pacientes → ficha) */
      whatsResgate(a, psi) {
        return `Olá, ${U.primeiroNome(a.paciente.nome)}! Aqui é da equipe Psicólogos Brasil. Vi que você tentou agendar uma sessão com ${psi.nome} para ${U.textoSessao(a, fPac(a)).replace(/, (\d+h\d*) às \d+h\d*/, ', às $1')}.\n\n`
          + `Ficou alguma dúvida? Posso te ajudar a escolher um novo horário, com ${U.primeiroNome(psi.nome)} ou com outro profissional, se preferir.`;
      },

      /* Pré-reserva: primeira mensagem da equipe ao paciente, já com o horário no fuso dele */
      whatsRecebemos(ags, psi) {
        const a = ags[0];
        return `Olá, ${U.primeiroNome(a.paciente.nome)}! Aqui é da equipe Psicólogos Brasil. Recebemos sua pré-reserva #${a.codigo} com ${psi.nome}:\n`
          + `${listaSessoes(ags, fPac(a))}\n${plano(ags)}\n\n`
          + `Para confirmar, é só fazer o Pix. Já te passo os dados.`;
      },

      /* Remarcação: aviso pelo WhatsApp (paciente no fuso dele; psicólogo no dele, com o do paciente) */
      whatsRemarcacao(a, psi, paraPsicologo) {
        return paraPsicologo
          ? `Olá, ${U.primeiroNome(psi.nome)}! O atendimento com ${a.paciente.nome} foi remarcado para:\n• ${U.textoSessao(a, fPsi(a), fPac(a))}\n\nO link da sala continua o mesmo:\n${a.linkMeet}`
          : `Olá, ${U.primeiroNome(a.paciente.nome)}! Sua sessão com ${psi.nome} foi remarcada para:\n• ${U.textoSessao(a, fPac(a))}\n\nO link da sala continua o mesmo:\n${a.linkMeet}\n\nTambém enviamos para o seu e-mail.`;
      },

      whatsPsicologo(ags, psi) {
        const a = ags[0];
        return `Olá, ${U.primeiroNome(psi.nome)}! Novo atendimento confirmado:\n\n`
          + `Paciente: ${a.paciente.nome}\n${listaSessoes(ags, fPsi(a), fPac(a))}\n\n`
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
