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
  /* bandeiras em imagem (assets/imagens/bandeiras/xx.webp): o Windows não desenha bandeira em emoji, mostra só as letras "BR" */
  const PASTA_BAND = (() => { try { return new URL('../assets/imagens/bandeiras/', document.currentScript.src).href; } catch (e) { return (typeof BASE !== 'undefined' ? BASE : '/') + 'assets/imagens/bandeiras/'; } })();
  const bandeira = (p, cls) => p.iso === 'XX'
    ? `<span class="${cls} agc-band-mundo" aria-hidden="true">🌍</span>`
    : `<img class="${cls}" src="${PASTA_BAND}${p.iso.toLowerCase()}.webp" alt="" width="32" height="24" loading="lazy" decoding="async">`;

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
    /* FUSO HORÁRIO: est.dias, est.data e est.hora ficam no fuso do PSICÓLOGO (é o que o banco usa).
       A tela mostra tudo no fuso de quem está vendo (est.fuso), pela lista est.diasV. */
    const est = {
      psi: null, tipo: 'avulsa', mes: U.mesAtual(), dias: [], diasV: [], vdata: null, fuso: U.fusoVer(), data: null, hora: null,
      passo: 1, dados: { nome: '', email: '', whatsapp: '', pais: '', aceite: false }, erro: '', enviando: false, resultado: null
    };
    const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
    const semanas = () => (est.tipo === 'mensal' ? C.sessoesMensal : 1);
    const valorTotal = () => (est.tipo === 'mensal' ? U.precoMensal(est.psi) : U.precoSessao(est.psi));

    const fusoPsi = () => (est.psi && est.psi.fuso) || U.FUSO_BR;
    /* horário do psicólogo → horário de quem vê */
    const ver = (data, hora) => U.paraFuso(data, hora, fusoPsi(), est.fuso);
    function montarVisao() {
      const mapa = {};
      est.dias.forEach(d => d.horas.forEach(h => {
        const v = ver(d.data, h);
        (mapa[v.data] = mapa[v.data] || []).push({ v: v.hora, p: { data: d.data, hora: h } });
      }));
      est.diasV = Object.keys(mapa).sort().map(data => ({ data, horas: mapa[data].sort((a, b) => a.v.localeCompare(b.v)) }));
      const sel = est.data && est.hora && est.diasV.find(d => d.horas.some(x => x.p.data === est.data && x.p.hora === est.hora));
      if (sel) est.vdata = sel.data;
      else { est.data = null; est.hora = null; if (!est.diasV.some(d => d.data === est.vdata)) est.vdata = null; }
      if (!est.vdata && est.diasV.length) { est.vdata = est.diasV[0].data; est.mes = est.vdata.slice(0, 7); }
    }
    async function carregar() {
      est.dias = await DB.diasComHorario(est.psi.id, { semanas: semanas() });
      montarVisao();
      if (est.tipo === 'avulsa') mostrarProximo();
    }
    /* "Próximo horário" no lado do psicólogo (lista de psicólogos) */
    function mostrarProximo() {
      const linha = raiz.closest('.pc-linha');
      const el = linha && linha.querySelector('[data-prox]');
      if (!el) return;
      const d = est.diasV[0];
      const alvo = el.querySelector('span') || el;
      el.classList.add('pronto');
      el.classList.toggle('vazio', !d || !!est.psi.pausada);
      if (!d || est.psi.pausada) { alvo.textContent = 'Sem horários livres no momento'; return; }
      const hoje = U.hojeISO(est.fuso);
      const quando = d.data === hoje ? 'hoje' : d.data === U.addDias(hoje, 1) ? 'amanhã' : `${DIAS_CURTOS[U.diaSemana(d.data)]}, ${U.fmtDDMM(d.data)}`;
      alvo.innerHTML = `Próximo horário: <b>${quando}, ${U.fmtHora(d.horas[0].v)}</b>`;
    }

    async function iniciar() {
      await U.carregarAjustesAgenda();   /* horário da equipe (prazo e antecedência) */
      est.psi = await DB.obterPsicologo(raiz.dataset.agendaPsi);
      if (!est.psi || !est.psi.ativo) {
        { const l = raiz.closest('.pc-linha'), el = l && l.querySelector('[data-prox]'); if (el) el.hidden = true; }
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
    function renderEscolha() {
      const p = est.psi;
      const dia = est.diasV.find(d => d.data === est.vdata);
      const livres = new Set(est.diasV.map(d => d.data));
      const ultimo = est.diasV.length ? est.diasV[est.diasV.length - 1].data.slice(0, 7) : U.mesAtual();
      const mensal = est.tipo === 'mensal';
      let textoBtn = 'Escolha um horário';
      if (est.hora) { const v = ver(est.data, est.hora); textoBtn = mensal
        ? `Continuar · ${C.sessoesMensal}x, ${DIAS_CURTOS[U.diaSemana(v.data)]} às ${U.fmtHora(v.hora)}`
        : `Continuar · ${U.fmtCurta(v.data)} às ${U.fmtHora(v.hora)}`; }

      const semDias = !est.dias.length, primeiro = esc(U.primeiroNome(p.nome || ''));
      raiz.innerHTML = `
        <div class="agc-caixa${semDias ? ' agc-sem' : ''}">
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
            <p class="agc-linha-plano"${semDias ? ' hidden' : ''}>${mensal
              ? `1x por semana · ${U.moeda(U.precoMensal(p) / C.sessoesMensal)} por sessão`
              : `1 sessão de ${C.duracaoSessao} minutos por videochamada`}</p>

            ${semDias ? `
              <div class="agc-vazio2" role="status">
                <span class="agc-vazio-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="13" height="13" rx="2.5"/><path d="M3.5 9.5h13M7.5 3v4M12.5 3v4"/><circle cx="17.5" cy="17" r="4" fill="var(--agc-fundo-ico, #fff)"/><path d="M17.5 15.3V17l1.2.9"/></svg></span>
                <strong>Sem horários livres no momento</strong>
                <p>${mensal && !p.pausada
                  ? `Não há ${C.sessoesMensal} semanas seguidas livres com ${primeiro}. Tente a sessão avulsa ou peça um horário para a nossa equipe.`
                  : `A agenda de ${primeiro} está sem horários agora. Nossa equipe pode verificar uma vaga ou indicar outro psicólogo com o mesmo perfil.`}</p>
              </div>` : `
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
                  ${dia.horas.map(x => `<button type="button" role="radio" aria-checked="${x.p.data === est.data && x.p.hora === est.hora}" data-p="${x.p.data}|${x.p.hora}">${U.fmtHora(x.v)}</button>`).join('')}
                </div>` : `<p class="agc-nota">Escolha um dia em azul no calendário.</p>`}
            </div>
            ${barraFuso()}`}
          </div>

          <div class="agc-rodape">
            ${est.dias.length ? `
              <button type="button" class="agc-btn" data-continuar ${est.hora ? '' : 'disabled'}>${textoBtn}</button>
              <p class="agc-nota agc-centro">Você não paga agora.</p>` : `
              <a class="agc-btn agc-btn-whats" href="${U.linkWhats(C.whatsappPlataforma, `Olá! Quero agendar com ${p.nome}, mas não encontrei horário no site.`)}" target="_blank" rel="noopener">Pedir um horário com ${primeiro}</a>
              <a class="agc-btn agc-btn-sec agc-outros" href="${(typeof BASE !== 'undefined' ? BASE : '/')}psicologos/?ordem=horario">Ver psicólogos com horário livre</a>`}
          </div>
        </div>`;
    }

    /* Fuso horário: faixa redonda embaixo dos horários ("Horários no fuso de Brasília · Trocar").
       "Trocar" abre uma janela no meio da tela com a lista (a caixa não muda de tamanho). */
    const ICO_GLOBO = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3z"/></svg>';
    const rotuloFuso = f => { const x = U.FUSOS.find(z => z.id === f); return x ? { cidade: x.nome, pais: x.pais } : { cidade: U.cidadeFuso(f), pais: '' }; };
    function barraFuso() {
      const r = rotuloFuso(est.fuso);
      return `<div class="agc-fuso">
        <span class="agc-fuso-txt">${ICO_GLOBO}<span>Horários no fuso de <b>${esc(r.cidade.split(',')[0])}</b>${r.pais ? ` <span class="agc-fuso-pais">(${esc(r.pais)})</span>` : ''}</span></span>
        <button type="button" class="agc-fuso-btn" data-fuso-trocar aria-label="Trocar o fuso horário dos horários">Trocar</button>
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
        html += `<button type="button" class="agc-dia ${data === U.hojeISO(est.fuso) ? 'hoje' : ''}" data-data="${data}"
          ${livre ? '' : 'disabled'} aria-pressed="${data === est.vdata}"
          aria-label="${U.fmtLonga(data)}${livre ? '' : ', sem horários'}">${i}</button>`;
      }
      html += '<span class="agc-vago"></span>'.repeat((7 - (antes + total) % 7) % 7);
      return html;
    }

    function datasDoPedido() {
      return Array.from({ length: est.tipo === 'mensal' ? C.sessoesMensal : 1 }, (_, k) => U.addDias(est.data, 7 * k));
    }
    /* as datas do pedido no relógio de quem vê */
    function datasVer() { return datasDoPedido().map(d => ver(d, est.hora).data); }
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
                <span>${(() => { const v = ver(est.data, est.hora); return mensal
                  ? `Plano mensal · ${DIAS_CURTOS[U.diaSemana(v.data)]} às ${U.fmtHora(v.hora)}<br>${listaDatas(datasVer())}`
                  : `${U.fmtCurta(v.data)} · ${U.intervalo(v.hora, C.duracaoSessao)}`; })()}${U.mesmoRelogio(est.fuso, U.FUSO_BR) ? '' : `<br><small class="agc-fuso-mini">Horário de ${esc(U.cidadeFuso(est.fuso))}</small>`}</span></div>
              <strong class="agc-valor">${U.moeda(valorTotal())}</strong>
            </div>
            <label class="agc-campo"><span>Nome completo</span><input type="text" name="nome" autocomplete="name" value="${esc(d.nome)}" required></label>
            ${(() => { const pt = U.paisTel(d.pais || U.paisPeloFuso(est.fuso)); return `<div class="agc-campo"><label for="${raiz.id}-whats">WhatsApp${pt.iso === 'BR' ? ' com DDD' : ''}</label>
              <div class="agc-tel">
                <button type="button" class="agc-tel-pais" data-pais-trocar aria-haspopup="dialog" aria-label="País do seu WhatsApp: ${esc(pt.nome)}${pt.ddi ? ' +' + pt.ddi : ''}. Trocar">${bandeira(pt, 'agc-tel-band')}<span class="agc-tel-ddi">${pt.ddi ? '+' + pt.ddi : '+'}</span><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></button>
                <input type="hidden" name="pais" value="${pt.iso}">
                <input type="tel" id="${raiz.id}-whats" name="whatsapp" autocomplete="tel-national" inputmode="tel" placeholder="${esc(pt.ex)}" value="${esc(d.whatsapp)}" required>
              </div></div>`; })()}
            <label class="agc-campo"><span>E-mail</span><input type="email" name="email" autocomplete="email" inputmode="email" value="${esc(d.email)}" required></label>
            <p class="agc-dica-email" aria-live="polite"${U.sugestaoEmail(d.email) ? '' : ' hidden'}>${U.sugestaoEmail(d.email) ? `Você quis dizer <button type="button" data-usar-email="${esc(U.sugestaoEmail(d.email))}">${esc(U.sugestaoEmail(d.email))}</button>?` : ''}</p>
            <label class="agc-aceite"><input type="checkbox" name="aceite" ${d.aceite ? 'checked' : ''}>
              <span>Li e aceito os <a href="${(typeof BASE !== 'undefined' ? BASE : '/')}termos-de-uso/" target="_blank" rel="noopener">Termos de uso</a> (remarcação só com 24h de aviso) e a <a href="${(typeof BASE !== 'undefined' ? BASE : '/')}politica-de-privacidade/" target="_blank" rel="noopener">Política de privacidade</a>.</span></label>
            <div class="agc-fim">
              <ol class="agc-etapas" aria-label="Próximos passos">
                <li class="feito"><i>1</i><span>Enviar pedido</span></li>
                <li><i>2</i><span>Pagar por Pix</span></li>
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
      /* até quando o horário fica guardado e quando a equipe chama (conta o horário de atendimento da equipe) */
      const info = est.resultado.info || U.infoPedido(a.expiraEm, Date.now(), est.fuso);
      const abertura = info.abertura.charAt(0).toUpperCase() + info.abertura.slice(1);
      const link = U.linkWhats(C.whatsappPlataforma, Servicos.textos.whatsPreReserva(ags, est.psi));
      const icoWhats = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.2c0-.1-.2-.2-.5-.3Z"/></svg>';
      const va = ver(a.data, a.hora);
      const quando = (a.tipo === 'mensal'
        ? `Plano mensal · ${listaDatas(ags.map(x => ver(x.data, x.hora).data))} · ${U.fmtHora(va.hora)}`
        : `${U.fmtCurta(va.data)} · ${U.intervalo(va.hora, a.duracao)}`) + (U.mesmoRelogio(est.fuso, U.FUSO_BR) ? '' : ` (horário de ${esc(U.cidadeFuso(est.fuso))})`);

      const icoRelogio = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

      raiz.innerHTML = `
        <div class="agc-caixa agc-sucesso">
          <div class="agc-corpo">
            <p class="agc-reservado"><span aria-hidden="true">✓</span> Agendamento enviado · <strong class="agc-codigo">#${esc(a.codigo)}</strong></p>
            <p class="agc-quando"><strong>${esc(est.psi.nome)}</strong> · ${quando}</p>

            <section class="agc-proximo" aria-labelledby="${raiz.id}-prox-tit">
              <p class="agc-selo-prox">Próximo passo</p>
              <h3 class="agc-prox-tit" id="${raiz.id}-prox-tit" tabindex="-1">${info.dentro ? 'Nossa equipe vai falar com você' : 'Seu horário está guardado'}</h3>
              ${info.dentro
                ? `<p class="agc-prox-txt"><strong>Em instantes</strong> uma pessoa da nossa equipe chama você no WhatsApp para confirmar e enviar os dados do Pix.</p>`
                : `<p class="agc-prox-txt">Agora estamos fora do horário de atendimento. <strong>${esc(abertura)}</strong> nossa equipe chama você no WhatsApp para confirmar e enviar os dados do Pix.</p>`}
              <a class="agc-btn agc-btn-whats agc-btn-grande" href="${link}" target="_blank" rel="noopener" data-whats>
                ${icoWhats}<span>Falar no WhatsApp</span>
              </a>
              <p class="agc-sob-btn ${abriuWhats ? 'aberto' : ''}">${abriuWhats
                ? '<strong>Abriu?</strong> É só enviar a mensagem que já vai pronta.'
                : info.dentro ? 'Você não precisa fazer nada. Mas, se quiser adiantar, estamos aqui.' : 'Se quiser, já deixe sua mensagem: respondemos assim que abrirmos.'}</p>
            </section>

            <div class="agc-fim-info">
            <ol class="agc-como">
              <li class="feito"><b>✓</b><span>Horário reservado até <strong>${esc(info.prazo)}</strong>.</span></li>
              <li><b>2</b><span>${info.dentro ? '<strong>Em instantes</strong>, a' : `<strong>${esc(abertura)}</strong>, a`} equipe chama você no WhatsApp e envia os dados do Pix.</span></li>
              <li><b>3</b><span>Pagamento confirmado: o link da videochamada chega no seu e-mail.</span></li>
            </ol>
            <p class="agc-email-ok"><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M4 6h16v12H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg><span>Enviamos estas informações para<strong>${esc(a.paciente.email)}</strong></span></p>
            <p class="agc-atendimento">${icoRelogio}<span>Horário de atendimento da equipe<strong>${esc(info.horario)}</strong></span></p>
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
      est.dados = { nome: f.nome.value, email: f.email.value, whatsapp: f.whatsapp.value, pais: f.pais ? f.pais.value : est.dados.pais, aceite: f.aceite.checked };
    }

    raiz.addEventListener('click', async e => {
      const b = e.target.closest('button');
      if (!b || b.type === 'submit' || b.disabled) return;
      if (b.dataset.tipo && b.dataset.tipo !== est.tipo) { est.tipo = b.dataset.tipo; await carregar(); }
      else if (b.dataset.mes) { est.mes = U.addMes(est.mes, Number(b.dataset.mes)); }
      else if (b.dataset.data) { est.vdata = b.dataset.data; est.data = null; est.hora = null; }
      else if (b.dataset.p) { const [pd, ph] = b.dataset.p.split('|'); est.data = pd; est.hora = ph; }
      else if ('fusoTrocar' in b.dataset) {
        abrirFusos(est.fuso, f => {
          U.definirFusoVer(f);
          window.dispatchEvent(new CustomEvent('pb:fuso', { detail: f }));   /* vale para todas as caixas da página */
        }, () => { const t = raiz.querySelector('[data-fuso-trocar]'); if (t) t.focus({ preventScroll: true }); });
        return;
      }
      else if ('paisTrocar' in b.dataset) {
        lerDados();
        abrirPaises(est.dados.pais || U.paisPeloFuso(est.fuso), iso => {
          lerDados(); est.dados.pais = iso; est.dados.whatsapp = ''; render();
        }, () => { const i = raiz.querySelector('input[name=whatsapp]'); if (i) i.focus({ preventScroll: true }); });
        return;
      }
      else if ('continuar' in b.dataset) { if (!est.dados.pais) est.dados.pais = U.paisPeloFuso(est.fuso); est.passo = 2; est.erro = ''; render(); raiz.querySelector('input[name=nome]')?.focus({ preventScroll: true }); return; }
      else if ('voltar' in b.dataset) { lerDados(); est.passo = 1; }
      else if ('novo' in b.dataset) { est.resultado = null; est.passo = 1; est.hora = null; await carregar(); }
      else return;
      render();
    });

    /* trocou o fuso: vale para todas as caixas da página (e fica guardado neste aparelho) */
    window.addEventListener('pb:fuso', e => {
      est.fuso = e.detail;
      if (!est.psi) return;
      montarVisao(); if (est.tipo === 'avulsa') mostrarProximo();
      if (!est.resultado) render();
    });

    /* e-mail: avisa erro de digitação comum ("gmial.com" → "gmail.com") */
    const dicaEmail = () => {
      const inp = raiz.querySelector('input[name=email]'), dica = raiz.querySelector('.agc-dica-email');
      if (!inp || !dica) return;
      const s = U.sugestaoEmail(inp.value);
      dica.hidden = !s;
      dica.innerHTML = s ? `Você quis dizer <button type="button" data-usar-email="${esc(s)}">${esc(s)}</button>?` : '';
    };
    raiz.addEventListener('focusout', e => { if (e.target.name === 'email') dicaEmail(); });
    raiz.addEventListener('click', e => {
      const b = e.target.closest('[data-usar-email]'); if (!b) return;
      const inp = raiz.querySelector('input[name=email]'); inp.value = b.dataset.usarEmail; est.dados.email = inp.value;
      if (est.erro && /e-mail/i.test(est.erro)) { est.erro = ''; lerDados(); render(); } else dicaEmail();
    });
    raiz.addEventListener('input', e => {
      if (e.target.name === 'email') { const dica = raiz.querySelector('.agc-dica-email'); if (dica && !dica.hidden && !U.sugestaoEmail(e.target.value)) dica.hidden = true; return; }
      if (e.target.name !== 'whatsapp') return;
      const sp = raiz.querySelector('input[name=pais]'), pt = U.paisTel(sp ? sp.value : 'BR');
      if (pt.iso !== 'BR') {
        /* outro país: só números, em grupos de 3, até o tamanho do país */
        const max = pt.iso === 'XX' ? 15 : pt.max, dg = U.digitos(e.target.value).slice(0, max);
        e.target.value = (pt.iso === 'US' || pt.iso === 'CA') && dg.length > 3 ? `(${dg.slice(0, 3)}) ${dg.slice(3, 6)}${dg.length > 6 ? '-' + dg.slice(6) : ''}` : dg.replace(/(\d{3})(?=\d)/g, '$1 ');
        return;
      }
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
      const pt = U.paisTel(d.pais || U.paisPeloFuso(est.fuso));
      const zap = pt.iso === 'XX' ? '+' + U.digitos(d.whatsapp).replace(/^00/, '') : U.whatsNormalizar(d.whatsapp, pt.ddi);
      if (!U.digitos(d.whatsapp) || !U.whatsValido(zap) || (pt.iso === 'BR' && !/^\+55\d{10,11}$/.test(zap))) return erro(pt.iso === 'BR' ? 'Informe o WhatsApp com DDD.' : pt.iso === 'XX' ? 'Digite o código do país e o número (ex.: 4475001234567).' : `Confira o WhatsApp: em ${pt.nome}, o número tem ${pt.min === pt.max ? pt.min : `${pt.min} a ${pt.max}`} dígitos (ex.: ${pt.ex}).`);
      if (!U.emailValido(d.email)) { const s0 = U.sugestaoEmail(d.email); return erro(s0 ? `Confira o seu e-mail: você quis dizer ${s0}? Toque na sugestão para corrigir.` : 'Confira o seu e-mail: falta algo, como o @ ou o final (ex.: @gmail.com).'); }
      /* e-mail com cara de erro de digitação: avisa uma vez; se a pessoa enviar de novo igual, segue */
      const sug = U.sugestaoEmail(d.email);
      if (sug && est.emailAvisado !== d.email.trim().toLowerCase()) { est.emailAvisado = d.email.trim().toLowerCase(); return erro(`Confira o seu e-mail: você quis dizer ${sug}? Toque na sugestão para corrigir ou envie de novo se estiver certo.`); }
      if (!d.aceite) return erro('Para continuar, marque que concorda com as regras.');
      est.enviando = true; est.erro = ''; render();
      try {
        const ags = await DB.criarPreReserva({ psiId: est.psi.id, data: est.data, hora: est.hora, tipo: est.tipo, paciente: { nome: d.nome, email: d.email, whatsapp: zap, fuso: est.fuso } });
        const info = U.infoPedido(ags[0].expiraEm, Date.now(), est.fuso);
        est.resultado = { ags, abriuWhats: false, info };
        /* e-mail "Recebemos seu pedido" (se falhar, a reserva continua feita) */
        try { const e = Servicos.textos.emailPedido(ags, est.psi, info); Servicos.enviarEmail({ para: d.email, ...e, agId: ags[0].id }).catch(() => {}); } catch (e) { /* segue */ }
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

  /* Janela "Ver os horários no fuso de…" (uma só para a página toda).
     Abre no meio da tela, no computador e no celular; escolheu, fecha e já troca. */
  function abrirFusos(atual, aoEscolher, aoFechar) {
    let dlg = document.getElementById('agc-fuso-dlg');
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.id = 'agc-fuso-dlg'; dlg.className = 'agc-fuso-dlg';
      dlg.setAttribute('aria-labelledby', 'agc-fuso-dlg-tit');
      document.body.appendChild(dlg);
      dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });   /* clique fora fecha */
    }
    const aparelho = U.fusoNavegador();
    const norm = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const extra = id => ({ id, nome: U.cidadeFuso(id), pais: '', regiao: 'Outros' });
    const lista = [...U.FUSOS, ...[atual, aparelho].filter((id, k, a) => a.indexOf(id) === k && !U.FUSOS.some(f => f.id === id)).map(extra)];
    const opcao = f => { const on = f.id === atual; return `<button type="button" class="agc-fuso-op" role="option" aria-selected="${on}" data-fuso="${esc(f.id)}">
      <span><b>${esc(f.nome)}</b><small>${esc(f.pais)}${f.id === aparelho ? `${f.pais ? ' · ' : ''}<em>fuso deste aparelho</em>` : ''}</small></span>${on ? '<i aria-hidden="true">✓</i>' : ''}</button>`; };
    dlg.innerHTML = `<div class="agc-fuso-dlg-in">
      <span class="agc-fuso-alca" aria-hidden="true"></span>
      <div class="agc-fuso-dlg-cab"><h3 id="agc-fuso-dlg-tit">Ver os horários no fuso de</h3><button type="button" class="agc-fuso-x" data-fechar aria-label="Fechar">×</button></div>
      <label class="agc-fuso-busca"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input type="search" placeholder="Digite sua cidade ou país" aria-label="Buscar cidade ou país" autocomplete="off" enterkeyhint="search"></label>
      ${atual !== aparelho ? `<button type="button" class="agc-fuso-usar" data-fuso="${esc(aparelho)}">📍 Usar o fuso deste aparelho: <b>${esc(U.cidadeFuso(aparelho))}</b></button>` : ''}
      <div class="agc-fuso-ops" role="listbox" aria-labelledby="agc-fuso-dlg-tit"></div></div>`;
    const caixa = dlg.querySelector('.agc-fuso-ops'), busca = dlg.querySelector('input');
    const desenhar = () => {
      const q = norm(busca.value.trim());
      const achados = lista.filter(f => !q || norm(`${f.nome} ${f.pais} ${f.regiao} ${f.busca || ''} ${f.id}`).includes(q));
      if (!achados.length) { caixa.innerHTML = `<p class="agc-fuso-vazio">Não achamos "${esc(busca.value.trim())}". Tente o nome do país ou de uma cidade grande perto de você.</p>`; return; }
      const grupos = [];
      achados.forEach(f => { let g = grupos.find(x => x.nome === f.regiao); if (!g) grupos.push(g = { nome: f.regiao, itens: [] }); g.itens.push(f); });
      caixa.innerHTML = grupos.map(g => `<p class="agc-fuso-grupo">${esc(g.nome)}</p>${g.itens.map(opcao).join('')}`).join('');
    };
    desenhar();
    busca.addEventListener('input', desenhar);
    busca.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const b = caixa.querySelector('[data-fuso]'); if (b) b.click(); } });
    dlg.querySelector('[data-fechar]').onclick = () => dlg.close();
    dlg.onclick = e => {
      if (e.target === dlg) return;
      const b = e.target.closest('[data-fuso]'); if (!b) return;
      const f = b.dataset.fuso; dlg.close(); if (f !== atual) aoEscolher(f);
    };
    dlg.onclose = () => { document.documentElement.classList.remove('agc-sem-rolagem'); if (aoFechar) aoFechar(); };
    document.documentElement.classList.add('agc-sem-rolagem');
    dlg.showModal();
    const sel = caixa.querySelector('.agc-fuso-op[aria-selected="true"]');
    if (sel) sel.scrollIntoView({ block: 'center' });
    /* no computador já deixa digitar; no celular não abre o teclado sozinho */
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) busca.focus({ preventScroll: true });
    else if (sel) sel.focus({ preventScroll: true });
  }

  /* Janela "País do seu WhatsApp" (mesmo jeito da janela do fuso):
     grande no meio da tela no computador, de baixo para cima no celular. */
  const REGIAO_PAIS = { BR: 'América do Sul', AR: 'América do Sul', CL: 'América do Sul', UY: 'América do Sul', PY: 'América do Sul',
    US: 'América do Norte e Central', CA: 'América do Norte e Central', MX: 'América do Norte e Central',
    PT: 'Europa', GB: 'Europa', IE: 'Europa', ES: 'Europa', FR: 'Europa', IT: 'Europa', DE: 'Europa', CH: 'Europa', NL: 'Europa', BE: 'Europa',
    AO: 'África', MZ: 'África', JP: 'Ásia e Oceania', AU: 'Ásia e Oceania', AE: 'Ásia e Oceania', XX: 'Outros' };
  function abrirPaises(atual, aoEscolher, aoFechar) {
    let dlg = document.getElementById('agc-pais-dlg');
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.id = 'agc-pais-dlg'; dlg.className = 'agc-fuso-dlg agc-pais-dlg';
      dlg.setAttribute('aria-labelledby', 'agc-pais-dlg-tit');
      document.body.appendChild(dlg);
    }
    const sugerido = U.paisPeloFuso();
    const norm = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const ordem = ['América do Sul', 'Europa', 'América do Norte e Central', 'África', 'Ásia e Oceania', 'Outros'];
    const lista = U.PAISES_TEL.map(p => ({ ...p, regiao: REGIAO_PAIS[p.iso] || 'Outros' }));
    const opcao = p => { const on = p.iso === atual; return `<button type="button" class="agc-fuso-op agc-pais-op" role="option" aria-selected="${on}" data-pais="${p.iso}">
      <span class="agc-pais-band">${bandeira(p, 'agc-pais-img')}</span>
      <span class="agc-pais-nome"><b>${esc(p.nome)}${p.iso === sugerido && p.iso !== 'XX' ? ' <em>pelo seu fuso</em>' : ''}</b><small>${p.iso === 'XX' ? 'Digite o código do país e o número' : `Ex.: ${esc(p.ex)}`}</small></span>
      <span class="agc-pais-ddi">${p.ddi ? '+' + p.ddi : ''}</span>${on ? '<i aria-hidden="true">✓</i>' : ''}</button>`; };
    dlg.innerHTML = `<div class="agc-fuso-dlg-in">
      <span class="agc-fuso-alca" aria-hidden="true"></span>
      <div class="agc-fuso-dlg-cab"><h3 id="agc-pais-dlg-tit">País do seu WhatsApp</h3><button type="button" class="agc-fuso-x" data-fechar aria-label="Fechar">×</button></div>
      <label class="agc-fuso-busca"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input type="search" placeholder="Digite o país ou o código (ex.: 351)" aria-label="Buscar país ou código" autocomplete="off" enterkeyhint="search"></label>
      <div class="agc-fuso-ops" role="listbox" aria-labelledby="agc-pais-dlg-tit"></div></div>`;
    const caixa = dlg.querySelector('.agc-fuso-ops'), busca = dlg.querySelector('input');
    const desenhar = () => {
      const q = norm(busca.value.trim()), qd = q.replace(/[^0-9]/g, '');
      const achados = lista.filter(p => !q || (qd && qd === q.replace(/[+\s]/g, '') ? p.ddi.startsWith(qd) : norm(`${p.nome} ${p.iso} ${p.regiao}`).includes(q)));
      if (!achados.length) { caixa.innerHTML = `<p class="agc-fuso-vazio">Não achamos "${esc(busca.value.trim())}". Escolha <b>Outro país</b> no fim da lista e digite o código do país junto com o número.</p>`; return; }
      const grupos = ordem.map(nome => ({ nome, itens: achados.filter(p => p.regiao === nome) })).filter(g => g.itens.length);
      caixa.innerHTML = grupos.map(g => `<p class="agc-fuso-grupo">${esc(g.nome)}</p>${g.itens.map(opcao).join('')}`).join('');
    };
    desenhar();
    busca.addEventListener('input', desenhar);
    busca.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const b = caixa.querySelector('[data-pais]'); if (b) b.click(); } });
    dlg.querySelector('[data-fechar]').onclick = () => dlg.close();
    dlg.onclick = e => {
      if (e.target === dlg) { dlg.close(); return; }   /* clique fora fecha */
      const b = e.target.closest('[data-pais]'); if (!b) return;
      const iso = b.dataset.pais; dlg.close(); if (iso !== atual) aoEscolher(iso);
    };
    dlg.onclose = () => { document.documentElement.classList.remove('agc-sem-rolagem'); if (aoFechar) aoFechar(); };
    document.documentElement.classList.add('agc-sem-rolagem');
    dlg.showModal();
    const sel = caixa.querySelector('.agc-fuso-op[aria-selected="true"]');
    if (sel) sel.scrollIntoView({ block: 'center' });
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) busca.focus({ preventScroll: true });
    else if (sel) sel.focus({ preventScroll: true });
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
