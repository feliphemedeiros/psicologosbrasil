/* =====================================================================
   CAIXA DE AGENDAMENTO NO PERFIL DO PSICÓLOGO (paciente, sem login)
   ---------------------------------------------------------------------
   Hoje a caixa fica na LISTA de psicólogos (/psicologos/), à direita de cada
   cartão (js/psicologos.js monta). Em qualquer página, basta:
     <div data-agenda-psi="helena-prado"></div>
   (o valor de data-agenda-psi é o id do psicólogo no painel da agenda,
   igual ao final do endereço do perfil: psicologos/perfil/?p=helena-prado)

   Carregue, nesta ordem: js/agenda/config.js, js/agenda/util.js,
   js/agenda/db.js, js/agenda/servicos.js e este arquivo.
   No perfil do site, js/perfil.js chama AgendaPerfil.iniciar() depois de
   montar a página (o perfil é desenhado depois que os dados carregam).

   Coluna fixa ao rolar: coloque data-lado-fixo na coluna da direita.
   Este arquivo ajusta a coluna para ela nunca ficar cortada, mesmo
   quando for mais alta que a tela.
   ===================================================================== */
(function () {
  const C = window.AGENDA_CONFIG;
  const { esc } = U;

  /* Monta todas as caixas que ainda não foram montadas (pode chamar de novo). */
  /* Caixas com data-agenda-tarde (lista de psicólogos) só são montadas quando
     chegam perto da tela: a lista pode ter centenas de psicólogos. */
  const observador = window.IntersectionObserver ? new IntersectionObserver((itens) => {
    itens.forEach((it) => {
      if (!it.isIntersecting) return;
      observador.unobserve(it.target);
      if (!it.target.hasAttribute('data-agc-ok')) { it.target.setAttribute('data-agc-ok', ''); montar(it.target); }
    });
  }, { rootMargin: '600px 0px' }) : null;
  function iniciarTodas() {
    document.querySelectorAll('[data-agenda-psi]:not([data-agc-ok])').forEach((r) => {
      if (r.hasAttribute('data-agenda-tarde') && observador) { observador.observe(r); return; }
      r.setAttribute('data-agc-ok', '');
      montar(r);
    });
    colunaFixa();
  }
  window.AgendaPerfil = { iniciar: iniciarTodas };
  iniciarTodas();

  function montar(raiz) {
    raiz.classList.add('agc');
    raiz.id = raiz.id || 'agendar';
    const est = {
      psi: null, tipo: 'avulsa', mes: U.mesAtual(), dias: [], data: null, hora: null,
      passo: 1, dados: { nome: '', email: '', whatsapp: '', aceite: false }, erro: '', enviando: false, resultado: null
    };
    const semanas = () => (est.tipo === 'mensal' ? C.sessoesMensal : 1);
    const valorTotal = () => (est.tipo === 'mensal' ? U.precoMensal(est.psi) : U.precoSessao(est.psi));

    async function carregar() {
      est.dias = await DB.diasComHorario(est.psi.id, { semanas: semanas() });
      const dia = est.dias.find(d => d.data === est.data);
      if (!dia) { est.data = null; est.hora = null; }
      else if (!dia.horas.includes(est.hora)) est.hora = null;
      if (!est.data && est.dias.length) {
        est.data = est.dias[0].data;
        est.mes = est.data.slice(0, 7);
      }
    }

    async function iniciar() {
      est.psi = await DB.obterPsicologo(raiz.dataset.agendaPsi);
      if (!est.psi || !est.psi.ativo) {
        raiz.innerHTML = `<div class="agc-caixa"><h3 class="agc-tit">Agende sua sessão</h3>
          <p class="agc-nota">A agenda online ainda não está disponível para este profissional.</p>
          <a class="agc-btn agc-btn-whats" href="${U.linkWhats(C.whatsappPlataforma, 'Olá! Quero agendar uma sessão.')}" target="_blank" rel="noopener">Agendar pelo WhatsApp</a></div>`;
        return;
      }
      await carregar();
      render();
    }

    /* ---------------- telas ---------------- */
    function render() {
      if (est.resultado) renderSucesso();
      else if (est.passo === 2) renderDados();
      else renderEscolha();
      manterAltura();
    }
    /* A caixa nunca encolhe ao trocar de etapa (escolha → dados → fim) ou de mês:
       guarda a maior altura já usada e aplica como altura mínima. */
    function manterAltura() {
      const caixa = raiz.querySelector('.agc-caixa');
      if (!caixa) return;
      if (est.alturaMin) caixa.style.minHeight = est.alturaMin + 'px';
      const h = caixa.offsetHeight;          /* 0 quando a caixa está escondida (celular fechado) */
      if (h > (est.alturaMin || 0)) { est.alturaMin = h; caixa.style.minHeight = h + 'px'; }
    }

    /* As três etapas (escolha, dados e pagamento) usam a MESMA altura de caixa.
       Cada tela tem um corpo e um rodapé fixo embaixo; ver .agc-caixa no CSS. */
    const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

    function renderEscolha() {
      const p = est.psi;
      const dia = est.dias.find(d => d.data === est.data);
      const livres = new Set(est.dias.map(d => d.data));
      const ultimo = est.dias.length ? est.dias[est.dias.length - 1].data.slice(0, 7) : U.mesAtual();
      const mensal = est.tipo === 'mensal';
      let textoBtn = 'Escolha um horário';
      if (est.hora) textoBtn = mensal
        ? `Continuar · ${C.sessoesMensal}x, ${DIAS_CURTOS[U.diaSemana(est.data)]} às ${U.fmtHora(est.hora)}`
        : `Continuar · ${U.fmtCurta(est.data)} às ${U.fmtHora(est.hora)}`;

      raiz.innerHTML = `
        <div class="agc-caixa">
          <div class="agc-corpo">
            <div class="agc-topo">
              <h3 class="agc-tit">Agende sua sessão</h3>
              <span class="agc-sub">Online · ${C.duracaoSessao} min</span>
            </div>

            <div class="agc-planos" role="radiogroup" aria-label="Tipo de atendimento">
              <button type="button" role="radio" aria-checked="${!mensal}" data-tipo="avulsa">
                <span>Sessão avulsa</span><strong>${U.moeda(U.precoSessao(p))}</strong>
              </button>
              <button type="button" role="radio" aria-checked="${mensal}" data-tipo="mensal">
                <span>Plano mensal · ${C.sessoesMensal}x</span><strong>${U.moeda(U.precoMensal(p))}</strong>
              </button>
            </div>
            <p class="agc-linha-plano">${mensal
              ? `1x por semana · ${U.moeda(U.precoMensal(p) / C.sessoesMensal)} por sessão`
              : `1 sessão de ${C.duracaoSessao} minutos por videochamada`}</p>

            ${!est.dias.length ? (p.pausada ? `
              <div class="agc-vazio">
                <strong>Sem horários livres no momento</strong>
                Este profissional não está com a agenda aberta agora. Fale com a nossa equipe que indicamos outro horário ou profissional.
              </div>` : `
              <div class="agc-vazio">
                <strong>Sem horários livres no momento</strong>
                ${mensal ? `Não há ${C.sessoesMensal} semanas seguidas livres. Tente a sessão avulsa ou ` : ''}fale com a nossa equipe que encontramos um horário para você.
              </div>`) : `
            <div class="agc-passo"><span class="agc-num">1</span>Escolha o dia</div>
            <div class="agc-cal">
              <div class="agc-mes">
                <button type="button" class="agc-nav" data-mes="-1" ${est.mes <= U.mesAtual() ? 'disabled' : ''} aria-label="Mês anterior">‹</button>
                <strong>${U.fmtMes(est.mes).replace(/^./, c => c.toUpperCase())}</strong>
                <button type="button" class="agc-nav" data-mes="1" ${est.mes >= ultimo ? 'disabled' : ''} aria-label="Próximo mês">›</button>
              </div>
              <div class="agc-grade">
                ${['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map(l => `<span class="agc-sem">${l}</span>`).join('')}
                ${gradeMes(est.mes, livres)}
              </div>
            </div>

            <div class="agc-passo"><span class="agc-num">2</span>Escolha o horário${dia ? ` <span class="agc-dia-sel">· ${U.fmtCurta(dia.data)}</span>` : ''}</div>
            <div class="agc-horas-area">
              ${dia ? `
                <div class="agc-horas" role="radiogroup" aria-label="Horário">
                  ${dia.horas.map(h => `<button type="button" role="radio" aria-checked="${h === est.hora}" data-hora="${h}">${U.fmtHora(h)}</button>`).join('')}
                </div>` : `<p class="agc-nota">Escolha um dia em azul no calendário.</p>`}
            </div>`}
          </div>

          <div class="agc-rodape">
            ${est.dias.length ? `
              <button type="button" class="agc-btn" data-continuar ${est.hora ? '' : 'disabled'}>${textoBtn}</button>
              <p class="agc-nota agc-centro">Você não paga agora.</p>` : `
              <a class="agc-btn agc-btn-whats" href="${U.linkWhats(C.whatsappPlataforma, `Olá! Quero agendar com ${p.nome}, mas não encontrei horário no site.`)}" target="_blank" rel="noopener">Falar no WhatsApp</a>`}
          </div>
        </div>`;
    }

    /* só as semanas que o mês tem (4 a 6 linhas), para a caixa ficar mais baixa */
    function gradeMes(m, livres) {
      const [y, mm] = m.split('-').map(Number);
      const total = new Date(y, mm, 0).getDate();
      const antes = (U.diaSemana(`${m}-01`) + 6) % 7;
      let html = '<span class="agc-vago"></span>'.repeat(antes);
      for (let i = 1; i <= total; i++) {
        const data = `${m}-${U.pad(i)}`;
        const livre = livres.has(data);
        html += `<button type="button" class="agc-dia ${data === U.hojeISO() ? 'hoje' : ''}" data-data="${data}"
          ${livre ? '' : 'disabled'} aria-pressed="${data === est.data}"
          aria-label="${U.fmtLonga(data)}${livre ? '' : ', sem horários'}">${i}</button>`;
      }
      html += '<span class="agc-vago"></span>'.repeat((7 - (antes + total) % 7) % 7);
      return html;
    }

    function datasDoPedido() {
      return Array.from({ length: est.tipo === 'mensal' ? C.sessoesMensal : 1 }, (_, k) => U.addDias(est.data, 7 * k));
    }
    function listaDatas(datas) {
      const t = datas.map(U.fmtDDMM);
      return t.length > 1 ? `${t.slice(0, -1).join(', ')} e ${t[t.length - 1]}` : t[0];
    }

    function renderDados() {
      const d = est.dados;
      const mensal = est.tipo === 'mensal';
      raiz.innerHTML = `
        <form class="agc-caixa" novalidate data-form>
          <div class="agc-corpo">
            <div class="agc-topo agc-topo-dados">
              <h3 class="agc-tit">Seus dados</h3>
              <button type="button" class="agc-voltar" data-voltar>‹ Trocar horário</button>
            </div>
            <div class="agc-resumo">
              <div><strong>${esc(est.psi.nome)}</strong>
                <span>${mensal
                  ? `Plano mensal · ${DIAS_CURTOS[U.diaSemana(est.data)]} às ${U.fmtHora(est.hora)}<br>${listaDatas(datasDoPedido())}`
                  : `${U.fmtCurta(est.data)} · ${U.intervalo(est.hora, C.duracaoSessao)}`}</span></div>
              <strong class="agc-valor">${U.moeda(valorTotal())}</strong>
            </div>
            <label class="agc-campo"><span>Nome completo</span><input type="text" name="nome" autocomplete="name" value="${esc(d.nome)}" required></label>
            <label class="agc-campo"><span>WhatsApp com DDD</span><input type="tel" name="whatsapp" autocomplete="tel" inputmode="tel" placeholder="(85) 99999-9999" value="${esc(d.whatsapp)}" required></label>
            <label class="agc-campo"><span>E-mail</span><input type="email" name="email" autocomplete="email" inputmode="email" value="${esc(d.email)}" required></label>
            <label class="agc-aceite"><input type="checkbox" name="aceite" ${d.aceite ? 'checked' : ''}>
              <span>Concordo com a remarcação só com 24h de aviso e com o uso dos meus dados apenas para este agendamento.</span></label>
            <div class="agc-fim">
              <ol class="agc-etapas" aria-label="Próximos passos">
                <li class="feito"><i>1</i><span>Enviar pedido</span></li>
                <li><i>2</i><span>Pagar por Pix ou cartão</span></li>
                <li><i>3</i><span>Receber o link da sessão</span></li>
              </ol>
              ${est.erro
                ? `<p class="agc-erro" role="alert">${esc(est.erro)}</p>`
                : `<p class="agc-seguro" role="alert">
                <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Zm-1.2 14.2-3.5-3.5 1.4-1.4 2.1 2.1 4.6-4.6 1.4 1.4-6 6Z"/></svg>
                Seus dados ficam só com a nossa equipe e com ${esc(U.primeiroNome(est.psi.nome))}, com sigilo profissional.
              </p>`}
            </div>
          </div>
          <div class="agc-rodape">
            <button type="submit" class="agc-btn" ${est.enviando ? 'disabled' : ''}>${est.enviando ? 'Enviando…' : 'Enviar agendamento'}</button>
            <p class="agc-nota agc-centro">Você ainda não paga nada agora.</p>
          </div>
        </form>`;
    }

    function renderSucesso() {
      const { ags, abriuWhats } = est.resultado;
      const a = ags[0];
      const total = ags.reduce((t, x) => t + x.valor, 0);
      const ate = new Date(a.expiraEm);
      const ateTxt = `${ate.getHours()}h${U.pad(ate.getMinutes())}`;
      const link = U.linkWhats(C.whatsappPlataforma, Servicos.textos.whatsPreReserva(ags, est.psi));
      const icoWhats = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.2c0-.1-.2-.2-.5-.3Z"/></svg>';
      const quando = a.tipo === 'mensal'
        ? `Plano mensal · ${listaDatas(ags.map(x => x.data))} · ${U.fmtHora(a.hora)}`
        : `${U.fmtCurta(a.data)} · ${U.intervalo(a.hora, a.duracao)}`;

      const icoRelogio = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

      raiz.innerHTML = `
        <div class="agc-caixa agc-sucesso">
          <div class="agc-corpo">
            <p class="agc-reservado"><span aria-hidden="true">✓</span> Agendamento enviado · <strong class="agc-codigo">#${esc(a.codigo)}</strong></p>
            <p class="agc-quando"><strong>${esc(est.psi.nome)}</strong> · ${quando}</p>

            <section class="agc-proximo" aria-labelledby="${raiz.id}-prox-tit">
              <p class="agc-selo-prox">Próximo passo</p>
              <h3 class="agc-prox-tit" id="${raiz.id}-prox-tit" tabindex="-1">Nossa equipe vai falar com você</h3>
              <p class="agc-prox-txt">Uma <strong>pessoa da nossa equipe</strong> vai chamar você no WhatsApp.</p>
              <p class="agc-prox-txt agc-prox-menor">Seu horário já está reservado para você.</p>
              <a class="agc-btn agc-btn-whats agc-btn-grande" href="${link}" target="_blank" rel="noopener" data-whats>
                ${icoWhats}<span>Falar no WhatsApp</span>
              </a>
              <p class="agc-sob-btn ${abriuWhats ? 'aberto' : ''}">${abriuWhats
                ? '<strong>Abriu?</strong> É só enviar a mensagem que já vai pronta.'
                : 'Você não precisa fazer nada. Mas, se quiser adiantar, estamos aqui.'}</p>
            </section>

            <div class="agc-fim-info">
            <ol class="agc-como">
              <li><b>1</b><span>A equipe confirma com você o psicólogo, o dia e o horário.</span></li>
              <li><b>2</b><span>Você escolhe Pix ou cartão e recebe os dados para pagar.</span></li>
              <li><b>3</b><span>Pagamento confirmado: o link da videochamada chega no seu e-mail e WhatsApp.</span></li>
            </ol>

            ${C.horarioAtendimento ? `<p class="agc-atendimento">${icoRelogio}<span>Horário de atendimento<strong>${esc(C.horarioAtendimento)}</strong></span></p>` : ''}
            </div>
          </div>
          <div class="agc-rodape">
            <button type="button" class="agc-btn agc-btn-sec" data-novo>Fazer outro agendamento</button>
          </div>
        </div>`;

      raiz.querySelector('[data-whats]').addEventListener('click', () => {
        if (est.resultado.abriuWhats) return;
        est.resultado.abriuWhats = true;
        setTimeout(render, 300);
      });
    }

    /* ---------------- eventos ---------------- */
    function lerDados() {
      const f = raiz.querySelector('[data-form]');
      if (!f) return;
      est.dados = { nome: f.nome.value, email: f.email.value, whatsapp: f.whatsapp.value, aceite: f.aceite.checked };
    }

    raiz.addEventListener('click', async e => {
      const b = e.target.closest('button');
      if (!b || b.type === 'submit' || b.disabled) return;
      if (b.dataset.tipo && b.dataset.tipo !== est.tipo) { est.tipo = b.dataset.tipo; await carregar(); }
      else if (b.dataset.mes) { est.mes = U.addMes(est.mes, Number(b.dataset.mes)); }
      else if (b.dataset.data) { est.data = b.dataset.data; est.hora = null; }
      else if (b.dataset.hora) { est.hora = b.dataset.hora; }
      else if ('continuar' in b.dataset) { est.passo = 2; est.erro = ''; render(); raiz.querySelector('input[name=nome]')?.focus({ preventScroll: true }); return; }
      else if ('voltar' in b.dataset) { lerDados(); est.passo = 1; }
      else if ('novo' in b.dataset) { est.resultado = null; est.passo = 1; est.hora = null; await carregar(); }
      else return;
      render();
    });

    raiz.addEventListener('input', e => {
      if (e.target.name !== 'whatsapp') return;
      const n = U.digitos(e.target.value).replace(/^55(?=\d{11})/, '').slice(0, 11);
      let t = n;
      if (n.length > 2) t = `(${n.slice(0, 2)}) ${n.slice(2)}`;
      if (n.length > 7) t = `(${n.slice(0, 2)}) ${n.slice(2, n.length === 11 ? 7 : 6)}-${n.slice(n.length === 11 ? 7 : 6)}`;
      e.target.value = t;
    });

    raiz.addEventListener('submit', async e => {
      e.preventDefault();
      if (est.enviando) return;
      lerDados();
      const d = est.dados;
      const erro = msg => { est.erro = msg; render(); };
      if (d.nome.trim().length < 3) return erro('Informe seu nome completo.');
      if (!U.whatsValido(d.whatsapp)) return erro('Informe o WhatsApp com DDD.');
      if (!U.emailValido(d.email)) return erro('Confira o seu e-mail.');
      if (!d.aceite) return erro('Para continuar, marque que concorda com as regras.');
      est.enviando = true; est.erro = ''; render();
      try {
        const ags = await DB.criarPreReserva({ psiId: est.psi.id, data: est.data, hora: est.hora, tipo: est.tipo, paciente: d });
        est.resultado = { ags, abriuWhats: false };
        est.enviando = false;
        render();
        raiz.scrollIntoView({ behavior: 'smooth', block: 'start' });
        raiz.querySelector('.agc-prox-tit')?.focus({ preventScroll: true });
      } catch (err) {
        est.enviando = false;
        await carregar();
        if (!est.hora) est.passo = 1;
        erro(err.message);
      }
    });

    /* outra pessoa reservou enquanto a página estava aberta */
    DB.aoMudar(async () => { if (est.passo === 1 && !est.resultado) { await carregar(); render(); } });

    iniciar();
  }

  /* Coluna da direita fixa ao rolar, sem nunca ficar cortada:
     se ela for mais alta que a tela, gruda pela parte de baixo. */
  function colunaFixa() {
    const col = document.querySelector('[data-lado-fixo]:not([data-lado-ok])');
    if (!col || !window.ResizeObserver) return;
    col.setAttribute('data-lado-ok', '');
    const topo = Number(col.dataset.ladoFixo) || 96;
    const ajustar = () => {
      const sobra = window.innerHeight - col.offsetHeight - 16;
      col.style.top = `${Math.min(topo, sobra)}px`;
    };
    new ResizeObserver(ajustar).observe(col);
    window.addEventListener('resize', ajustar);
    ajustar();
  }
})();
