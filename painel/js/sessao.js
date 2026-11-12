/* =====================================================================
   SESSÃO E PERMISSÕES DO PAINEL — Psicólogos Brasil
   ---------------------------------------------------------------------
   Um login só para todo o painel (psicologosbrasil.com.br/painel).
   Sempre com código de dois fatores. Cada papel vê só as suas áreas:

     admin      → Psicólogos, Pacientes, Artigos, Agenda, Usuários, Financeiro e Configurações
     suporte    → Agenda (tudo) e Psicólogos, mas só as abas Atendimentos e
                  Disponibilidade de cada um. Não vê Pacientes, Página no site,
                  Resumo (valores), Conta, Financeiro, Usuários nem Configurações.
     psicologo  → Minha agenda

   Para mudar quem vê o quê, mude só PERMISSOES aqui embaixo.

   Modo de teste: a sessão fica no sessionStorage (fechar a aba = sair).
   Com o Firebase (js/firebase-config.js preenchido): quem entra é o login
   oficial do Firebase (e-mail + senha + app autenticador) e o papel vem da
   coleção "usuarios" do banco. Cada tela confere com o Firebase se a pessoa
   continua logada e ativa. Quem protege os dados de verdade são as regras
   (firestore.rules): esconder um botão aqui não protege nada sozinho.
   ===================================================================== */
(function () {
  const CHAVE = 'pb_painel_sessao';
  const FIREBASE = typeof NUVEM !== 'undefined' && NUVEM.modo === 'firebase';
  const DURACAO_HORAS = 8;          // depois disso, pede login de novo

  const AREAS = {
    /* "Psicólogos": tudo de cada psicólogo num lugar só — página no site, agenda,
       disponibilidade, resumo do mês e conta (a ficha tem abas) */
    psicologos: {
      nome: 'Psicólogos', url: 'psicologos.html',
      desc: 'Página no site, agenda, disponibilidade, resumo e conta de cada psicólogo.',
      descSuporte: 'Atendimentos e disponibilidade de cada psicólogo.',
      ico: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4.5" width="18" height="15" rx="3"/><circle cx="9" cy="11" r="2.6"/><path d="M5.2 17c.6-2 2-3 3.8-3s3.2 1 3.8 3M15 9.5h3.5M15 13h3.5"/></svg>'
    },
    /* "Psicólogos": entrar na agenda de cada um (atendimentos, disponibilidade, resumo, conta) */
    /* a agenda de cada psicólogo (vista pela equipe): abre pelas abas da ficha em "Psicólogos", não tem botão próprio no menu */
    acompanhar: {
      menu: false,
      nome: 'Agenda do psicólogo', url: 'psicologos.html',
      desc: 'Entrar na agenda de cada psicólogo: atendimentos, disponibilidade, resumo e conta.',
      ico: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><circle cx="17.5" cy="9" r="2.6"/><path d="M16.5 14.6c2.7.1 4.5 1.8 5 4.9"/></svg>'
    },
    pacientes: {
      nome: 'Pacientes', url: 'pacientes.html',
      desc: 'Ficha de cada paciente: contato, psicólogo, sessões, plano e observações.',
      descSuporte: 'Buscar o paciente por nome, WhatsApp ou e-mail e chamar no WhatsApp.',
      ico: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20.5c.7-3.9 3.7-6 7.5-6s6.8 2.1 7.5 6"/></svg>'
    },
    usuarios: {
      nome: 'Usuários', url: 'usuarios.html',
      desc: 'Adicionar, desativar e mandar nova senha para a equipe e os psicólogos.',
      ico: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="8" r="3.5"/><path d="M3.5 20c.6-3.6 3.2-5.5 6.5-5.5 1.4 0 2.6.3 3.6 1M18 13v6M15 16h6"/></svg>'
    },
    artigos: {
      nome: 'Artigos', url: 'artigos.html',
      desc: 'Escrever e publicar artigos do blog, com SEO pronto.',
      ico: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 11h7M9 15h7M9 19h4"/></svg>'
    },
    agenda: {
      nome: 'Agenda', url: 'agenda.html',
      desc: 'Pré-reservas, pagamentos, lembretes, calendário e agenda de todos.',
      ico: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>'
    },
    financeiro: {
      nome: 'Financeiro', url: 'financeiro.html',
      desc: 'Repasses aos psicólogos por sessão: a pagar com Pix para copiar, pagos e resumo.',
      ico: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18M16 15h2"/><path d="M7 6V4.5A1.5 1.5 0 0 1 8.5 3h7A1.5 1.5 0 0 1 17 4.5V6"/></svg>'
    },
    config: {
      nome: 'Configurações', url: 'config.html',
      desc: 'E-mail automático (SMTP), ordem da lista de psicólogos, endereço do site, WhatsApp, artigos e backup.',
      ico: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>'
    },
    minhaAgenda: {
      nome: 'Minha agenda', url: 'minha-agenda.html',
      desc: 'Seus horários, folgas e atendimentos.',
      ico: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>'
    }
  };

  /* Partes da ficha do psicólogo que não são áreas do menu (só o administrador):
     psiPagina = "Página no site" · psiResumo = "Resumo" (valores) · psiConta = "Conta" (dados e Pix) */
  const PERMISSOES = {
    admin: ['psicologos', 'pacientes', 'acompanhar', 'artigos', 'agenda', 'usuarios', 'financeiro', 'config', 'psiPagina', 'psiResumo', 'psiConta', 'financeiroPagar', 'atividades', 'pacientesFicha'],
    suporte: ['psicologos', 'pacientes', 'acompanhar', 'agenda'],   /* pacientes: só busca + WhatsApp (a ficha completa é o extra "pacientes" → pacientesFicha) */
    psicologo: ['minhaAgenda']
  };
  /* Acessos extras que o administrador pode dar a cada pessoa do suporte (Usuários → Editar).
     Ficam no campo "extras" do usuário: ['pacientes', 'artigos', ...]. */
  const EXTRAS = {
    psicologos: { nome: 'Psicólogos (completo)', desc: 'Tudo de cada psicólogo: página no site, novo psicólogo, acesso ao painel, Resumo (valores) e Conta (dados). Chave Pix e comissão continuam só com administrador.', areas: ['psiPagina', 'psiResumo', 'psiConta'] },
    pacientes:  { nome: 'Pacientes (completo)', desc: 'Ficha de cada paciente: histórico, observações da equipe e resgate. Sem isso, o suporte só busca o paciente e chama no WhatsApp.', areas: ['pacientes', 'pacientesFicha'] },
    artigos:    { nome: 'Artigos', desc: 'Ver, escrever, editar e publicar artigos do blog.', areas: ['artigos'] },
    financeiro: { nome: 'Financeiro', desc: 'Repasses a pagar, pagos e resumo: copiar o Pix e marcar como pago.', areas: ['financeiro', 'financeiroPagar'] }
  };
  /* nomes antigos (v135): resumo dos psicólogos → psicólogos; financeiro ver/pagar → financeiro */
  const EXTRAS_ANTIGOS = { psiResumo: 'psicologos', financeiroPagar: 'financeiro' };
  const extrasDe = u => [...new Set((Array.isArray((u || {}).extras) ? u.extras : []).map(k => EXTRAS_ANTIGOS[k] || k).filter(k => EXTRAS[k]))];
  const DESC_SUPORTE = 'Agenda completa, busca de pacientes e, em Psicólogos, os atendimentos e a disponibilidade de cada um';

  const NOMES_PAPEL = { admin: 'Administrador', suporte: 'Suporte', psicologo: 'Psicólogo(a)' };

  const Auth = {
    AREAS, PERMISSOES, NOMES_PAPEL, DESC_SUPORTE, EXTRAS, extrasDe,
    /* "Administrador", "Suporte", "Psicólogo(a)" */
    nomePapel(u) {
      u = u || Auth.sessao() || {};
      return NOMES_PAPEL[u.papel] || '';
    },

    sessao() {
      let s = null;
      try { s = JSON.parse(sessionStorage.getItem(CHAVE)); } catch (e) { s = null; }
      if (s && s.expira && s.expira < Date.now()) { sessionStorage.removeItem(CHAVE); return null; }
      return s;
    },
    /* Chamado só DEPOIS do código de dois fatores conferido */
    entrar(u) {
      sessionStorage.setItem(CHAVE, JSON.stringify({
        id: u.id, uid: u.uid || u.id, papel: u.papel, nome: u.nome, email: u.email,
        ...(u.papel === 'suporte' ? { extras: extrasDe(u) } : {}),
        expira: Date.now() + DURACAO_HORAS * 3600e3
      }));
      Auth.irParaInicio(Auth.sessao());
    },
    /* Botão "Sair": primeiro pergunta se a pessoa quer mesmo sair.
       opcoes.antes (opcional): roda antes de sair, ex.: salvar na nuvem. */
    sair(opcoes = {}) {
      confirmarSaida(async () => {
        if (opcoes.antes) { try { await opcoes.antes(); } catch (e) { /* sai mesmo assim */ } }
        Auth.sairAgora();
      });
    },
    /* Sai sem perguntar (usado depois da confirmação) */
    async sairAgora(destino = 'index.html') {
      sessionStorage.removeItem(CHAVE);
      if (FIREBASE) { try { const x = await NUVEM.auth(); await x.authMod.signOut(x.auth); } catch (e) { /* sai mesmo assim */ } }
      location.href = destino;
    },
    firebase: FIREBASE,
    areas(s) {
      s = s || {};
      if (s.papel !== 'suporte') return PERMISSOES[s.papel] || [];
      const tem = new Set(PERMISSOES.suporte);
      extrasDe(s).forEach(k => EXTRAS[k].areas.forEach(a => tem.add(a)));
      return PERMISSOES.admin.filter(a => tem.has(a));   /* mesma ordem do menu do administrador */
    },
    /* texto de cada área (o suporte vê menos coisas em algumas) */
    descDe(k, s) { const A = AREAS[k] || {}; s = s || Auth.sessao() || {}; return (s.papel === 'suporte' && A.descSuporte && !extrasDe(s).includes(k) && A.descSuporte) || A.desc || ''; },
    /* áreas que aparecem no menu e na tela inicial (algumas só abrem por dentro de outra) */
    areasMenu(s) {
      s = s || Auth.sessao();
      const l = Auth.areas(s).filter(k => AREAS[k] && AREAS[k].menu !== false);
      /* suporte: Agenda primeiro (é o dia a dia dele), depois Psicólogos, Pacientes e o resto */
      return s && s.papel === 'suporte' && l.includes('agenda') ? ['agenda', ...l.filter(k => k !== 'agenda')] : l;
    },
    pode(area, s) { return Auth.areas(s || Auth.sessao()).includes(area); },
    /* Quem tem uma área só vai direto para ela; os outros escolhem na tela inicial */
    irParaInicio(s) {
      const a = Auth.areas(s);
      if (a.length === 1) location.replace(AREAS[a[0]].url);
      else location.replace('index.html');
    },
    /* Protege a página. Aceita áreas ('agenda') ou papéis ('admin') */
    exigir(lista) {
      const s = Auth.sessao();
      const ok = s && lista.some(x => x === s.papel || Auth.areas(s).includes(x));
      if (!ok) { location.replace('index.html'); return null; }
      return s;
    },
    /* Links para as outras áreas que a pessoa pode abrir (topo de cada tela) */
    menuAreas(el, atual) {
      const s = Auth.sessao();
      if (!el || !s) return;
      const a = Auth.areasMenu(s);
      if (a.length < 2) { el.hidden = true; return; }
      el.innerHTML = a.map(k => `<a href="${AREAS[k].url}" data-area="${k}" class="area-link${k === atual ? ' atual' : ''}"${k === atual ? ' aria-current="page"' : ''}>${AREAS[k].ico}<span>${AREAS[k].nome}</span></a>`).join('');
      requestAnimationFrame(marcarFades);
      menuAreasCelular(el, a, atual);
    }
  };

  /* ---------- Celular: botão com a área atual + caixa com todas as áreas ----------
     No celular a faixa de áreas (que precisava arrastar) some e entra um botão
     "Agenda ▾". Ao tocar, sobe uma caixa de baixo com todas as áreas que a pessoa
     pode abrir, com a cor de cada uma e os avisos do sininho (pré-reservas, repasses...).
     No computador nada muda. */
  const SETA_BAIXO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>';
  const GRADE = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/></svg>';
  const escH = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  /* avisos do sininho por área (página do link → área) */
  function avisosPorArea() {
    const itens = (window.Notificacoes && window.Notificacoes.itens) ? window.Notificacoes.itens() : [];
    const r = {};
    itens.forEach(i => {
      const l = String(i.link || '');
      const k = l.startsWith('agenda.html') ? 'agenda' : l.startsWith('financeiro.html') ? 'financeiro' : l.startsWith('minha-agenda.html') ? 'psicologos' : l.startsWith('pacientes.html') ? 'pacientes' : '';
      if (!k) return;
      (r[k] = r[k] || []).push(i);
    });
    return r;
  }
  function menuAreasCelular(el, lista, atual) {
    let btn = el.parentNode.querySelector('.areas-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'areas-btn';
      btn.setAttribute('aria-haspopup', 'dialog');
      el.after(btn);
      btn.addEventListener('click', () => abrirAreas(btn));
    }
    btn._lista = lista; btn._atual = atual;
    const a = AREAS[atual];
    btn.dataset.area = a ? atual : '';
    btn.innerHTML = `<span class="areas-btn-ico">${a ? a.ico : GRADE}</span><span class="areas-btn-nome">${a ? escH(a.nome) : 'Áreas do painel'}</span><span class="areas-btn-outras">Trocar de área</span>${SETA_BAIXO}`;
    btn.setAttribute('aria-label', `${a ? 'Você está em ' + a.nome + '. ' : ''}Trocar de área do painel`);
  }
  function abrirAreas(btn) {
    const lista = btn._lista || [], atual = btn._atual;
    const av = avisosPorArea();
    const fundo = document.createElement('div');
    fundo.className = 'am-fundo';
    fundo.innerHTML = `<div class="am-caixa" role="dialog" aria-modal="true" aria-labelledby="am-tit">
      <span class="am-alca" aria-hidden="true"></span>
      <div class="am-cab"><h2 id="am-tit">Ir para</h2><button type="button" class="am-x" aria-label="Fechar">×</button></div>
      <nav class="am-lista">${lista.map(k => {
        const A = AREAS[k], l = av[k] || [], n = l.reduce((s, i) => s + (Number(i.n) || 0), 0);
        const aviso = l.length ? (n ? `<span class="am-qtd">${n}</span>` : `<span class="am-qtd am-qtd-azul">a pagar</span>`) : '';
        const sub = l.length ? escH(l.map(i => i.titulo).slice(0, 2).join(' · ')) : escH(Auth.descDe(k));
        return `<a href="${A.url}" class="am-item${k === atual ? ' atual' : ''}" data-area="${k}"${k === atual ? ' aria-current="page"' : ''}>
          <span class="am-ico">${A.ico}</span><span class="am-txt"><b>${escH(A.nome)}</b><small>${sub}</small></span>${aviso}</a>`;
      }).join('')}</nav></div>`;
    document.body.appendChild(fundo);
    document.documentElement.classList.add('am-aberto');
    const fechar = () => { fundo.remove(); document.documentElement.classList.remove('am-aberto'); document.removeEventListener('keydown', tecla); btn.focus({ preventScroll: true }); };
    const tecla = e => { if (e.key === 'Escape') fechar(); };
    document.addEventListener('keydown', tecla);
    fundo.addEventListener('click', e => {
      if (e.target === fundo || e.target.closest('.am-x')) { fechar(); return; }
      const it = e.target.closest('.am-item');
      if (it && it.classList.contains('atual')) { e.preventDefault(); fechar(); }
      else if (it) { fundo.remove(); document.documentElement.classList.remove('am-aberto'); }
    });
    const f = fundo.querySelector('.am-item.atual') || fundo.querySelector('.am-item');
    if (f) f.focus({ preventScroll: true });
  }

  /* ---------- janela "Deseja mesmo sair?" ----------
     Feita aqui mesmo (não usa o confirm() do navegador), com estilo próprio,
     para ficar igual em todas as telas do painel. */
  function confirmarSaida(aoConfirmar) {
    janela({
      titulo: 'Deseja mesmo sair?',
      texto: 'Para entrar de novo, você vai precisar da senha e do código do app autenticador.',
      ok: 'Sair', cancelar: 'Continuar no painel', icone: 'sair', carregando: 'Saindo…'
    }).then(sim => { if (sim) aoConfirmar(); });
  }

  /* ---------- Janela do painel (no lugar do confirm()/prompt() do navegador) ----------
     janela({ titulo, texto, ok, cancelar, perigo, icone, campo: { valor, placeholder, rotulo } })
       → Promise: true/false (confirmação) ou o texto digitado / null (quando tem campo). */
  const ICONES = {
    sair: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 16l-4-4 4-4M6 12h10"/>',
    alerta: '<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.4v.1"/>',
    pergunta: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 1 1 3.4 2.4c-.6.3-1 .8-1 1.5v.6M12 17v.1"/>',
    lixo: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    editar: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    ok: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.6 2.6L16.5 9"/>'
  };
  function cssJanela() {
    if (document.getElementById('pb-sair-css')) return;
    const css = document.createElement('style');
    css.id = 'pb-sair-css';
    css.textContent = `
      .pb-sair-fundo{position:fixed;inset:0;z-index:2000;background:rgba(16,22,52,.45);display:grid;place-items:center;padding:16px;animation:pbSairFundo .15s ease-out}
      .pb-sair-caixa{width:min(440px,100%);background:#fff;border-radius:16px;box-shadow:0 24px 60px -12px rgba(16,22,52,.35);padding:24px;font-family:"Figtree",system-ui,-apple-system,"Segoe UI",sans-serif;color:#1b1f3b;animation:pbSairCaixa .18s ease-out}
      .pb-sair-ico{width:44px;height:44px;border-radius:12px;background:#eef0fc;color:#1f35b5;display:grid;place-items:center;margin-bottom:14px}
      .pb-sair-ico.perigo{background:#fdecea;color:#b42318}
      .pb-sair-ico svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
      .pb-sair-caixa h2{margin:0 0 6px;font-size:19px;line-height:1.3}
      .pb-sair-caixa p{margin:0 0 20px;color:#646a8a;font-size:15px;line-height:1.5;white-space:pre-line}
      .pb-janela-campo{display:block;margin:-6px 0 20px}
      .pb-janela-campo input{width:100%;box-sizing:border-box;min-height:44px;padding:10px 12px;border:1.5px solid #e2e5f0;border-radius:10px;font:inherit;font-size:15px;color:inherit;background:#fff}
      .pb-janela-campo input:focus{outline:none;border-color:#1f35b5;box-shadow:0 0 0 3px #eef0fc}
      .pb-sair-acoes{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap}
      .pb-sair-acoes button{min-height:42px;padding:8px 18px;border-radius:10px;font:inherit;font-weight:600;font-size:14px;cursor:pointer;border:1.5px solid transparent}
      .pb-sair-nao{background:#fff;color:#1f35b5;border-color:#e2e5f0!important}
      .pb-sair-nao:hover{border-color:#1f35b5!important}
      .pb-sair-sim{background:#1f35b5;color:#fff}
      .pb-sair-sim:hover{background:#16278a}
      .pb-sair-sim.perigo{background:#b42318}
      .pb-sair-sim.perigo:hover{background:#912018}
      .pb-sair-acoes button:focus-visible{outline:3px solid rgba(31,53,181,.3);outline-offset:2px}
      .pb-sair-acoes button:disabled{opacity:.7;cursor:wait}
      @media (max-width:420px){.pb-sair-acoes button{flex:1}}
      .pb-dados{margin:4px 0 14px;padding:4px 14px;border:1.5px solid #e2e5f0;border-radius:14px;background:#f7f8fd;text-align:left}
      .pb-dado{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #e2e5f0}
      .pb-dado:last-child{border-bottom:0}
      .pb-dado-txt{flex:1;min-width:0}
      .pb-dado-txt span{display:block;font-size:12.5px;font-weight:600;color:#646a8a;margin-bottom:2px}
      .pb-dado-txt code{display:block;font:600 15px/1.35 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:inherit;word-break:break-all}
      .pb-dado.forte .pb-dado-txt code{font-size:22px;font-weight:800;letter-spacing:.06em;color:#1f35b5}
      .pb-dado button{flex:none;min-height:36px;padding:0 12px;border-radius:10px;border:1.5px solid #e2e5f0;background:#fff;color:#1f35b5;font:inherit;font-weight:600;font-size:13px;cursor:pointer}
      .pb-dado button:hover{border-color:#1f35b5}
      .pb-dado button.ok{border-color:#17864d;color:#17864d}
      .pb-depois{white-space:pre-line}
      .pb-whats{display:flex;align-items:center;justify-content:center;gap:8px;margin:14px 0 4px;min-height:44px;border-radius:12px;background:#1faa59;color:#fff!important;font-weight:700;font-size:15px;text-decoration:none}
      .pb-whats:hover{filter:brightness(.93)}
      .pb-whats-sem{margin:12px 0 0;font-size:13px;opacity:.75;text-align:center}
      html[data-tema="escuro"] .pb-dados{background:rgba(255,255,255,.03);border-color:rgba(255,255,255,.12)}
      html[data-tema="escuro"] .pb-dado{border-color:rgba(255,255,255,.1)}
      html[data-tema="escuro"] .pb-dado-txt span{color:#a3a8c3}
      html[data-tema="escuro"] .pb-dado.forte .pb-dado-txt code{color:#aab6ff}
      html[data-tema="escuro"] .pb-dado button{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.14);color:#9db0ff}
      html[data-tema="escuro"] .pb-dado button.ok{border-color:#4cc38a;color:#4cc38a}
      @keyframes pbSairFundo{from{opacity:0}}
      @keyframes pbSairCaixa{from{opacity:0;transform:translateY(8px) scale(.98)}}
      @media (prefers-reduced-motion:reduce){.pb-sair-fundo,.pb-sair-caixa{animation:none}}`;
    document.head.appendChild(css);
  }
  function janela(o = {}) {
    cssJanela();
    const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    return new Promise(resolve => {
      const antiga = document.getElementById('pb-sair'); if (antiga) antiga.remove();
      const voltarFoco = document.activeElement;
      const ico = o.icone || (o.campo ? 'editar' : o.perigo ? 'alerta' : 'pergunta');
      const fundo = document.createElement('div');
      fundo.className = 'pb-sair-fundo'; fundo.id = 'pb-sair';
      fundo.innerHTML = `
        <div class="pb-sair-caixa" role="alertdialog" aria-modal="true" aria-labelledby="pb-sair-tit" ${o.texto ? 'aria-describedby="pb-sair-txt"' : ''}>
          <div class="pb-sair-ico${o.perigo ? ' perigo' : ''}" aria-hidden="true"><svg viewBox="0 0 24 24">${ICONES[ico] || ICONES.pergunta}</svg></div>
          <h2 id="pb-sair-tit">${esc(o.titulo || 'Confirmar')}</h2>
          ${o.texto ? `<p id="pb-sair-txt">${esc(o.texto)}</p>` : ''}
          ${o.dados ? `<div class="pb-dados">${o.dados.map((d, i) => `<div class="pb-dado${d.destaque ? ' forte' : ''}"><div class="pb-dado-txt"><span>${esc(d.rotulo)}</span><code>${esc(d.valor)}</code></div><button type="button" data-copiar="${i}" aria-label="Copiar ${esc(d.rotulo)}">Copiar</button></div>`).join('')}</div>` : ''}
          ${o.textoDepois ? `<p class="pb-depois">${esc(o.textoDepois)}</p>` : ''}
          ${o.whats && o.whats.link ? `<a class="pb-whats" href="${esc(o.whats.link)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Z"/></svg>${esc(o.whats.rotulo || 'Enviar pelo WhatsApp')}</a>` : ''}
          ${o.whats && !o.whats.link && o.whats.semNumero ? `<p class="pb-whats-sem">${esc(o.whats.semNumero)}</p>` : ''}
          ${o.campo ? `<label class="pb-janela-campo"><span class="sr" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">${esc(o.campo.rotulo || o.titulo)}</span><input type="text" value="${esc(o.campo.valor || '')}" placeholder="${esc(o.campo.placeholder || '')}"></label>` : ''}
          <div class="pb-sair-acoes">
            ${o.semCancelar ? '' : `<button type="button" class="pb-sair-nao">${esc(o.cancelar || 'Cancelar')}</button>`}
            <button type="button" class="pb-sair-sim${o.perigo ? ' perigo' : ''}">${esc(o.ok || 'Confirmar')}</button>
          </div>
        </div>`;
      document.body.appendChild(fundo);
      const nao = fundo.querySelector('.pb-sair-nao'), sim = fundo.querySelector('.pb-sair-sim'), inp = fundo.querySelector('input');
      /* dados para passar adiante (login, senha provisória): botão "Copiar" em cada um */
      const copiar = [...fundo.querySelectorAll('[data-copiar]')];
      copiar.forEach(b => b.addEventListener('click', async () => {
        const v = String(o.dados[Number(b.dataset.copiar)].valor || '');
        let ok = false;
        try { await navigator.clipboard.writeText(v); ok = true; } catch (e) {
          const t = document.createElement('textarea'); t.value = v; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select();
          try { ok = document.execCommand('copy'); } catch (e2) { ok = false; } t.remove();
        }
        b.textContent = ok ? 'Copiado ✓' : 'Selecione e copie'; b.classList.toggle('ok', ok);
        setTimeout(() => { b.textContent = 'Copiar'; b.classList.remove('ok'); }, 1800);
      }));
      const fechar = v => { fundo.remove(); document.removeEventListener('keydown', tecla, true); if (voltarFoco && voltarFoco.focus) try { voltarFoco.focus({ preventScroll: true }); } catch (e) {} resolve(v); };
      const cancelar = () => fechar(o.campo ? null : o.semCancelar ? true : false);
      const confirmar = () => {
        if (o.carregando) { sim.disabled = true; if (nao) nao.disabled = true; sim.textContent = o.carregando; resolve(true); return; }
        fechar(o.campo ? inp.value : true);
      };
      function tecla(e) {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancelar(); }
        if (e.key === 'Enter' && inp && document.activeElement === inp) { e.preventDefault(); confirmar(); }
        if (e.key === 'Tab') {
          const f = [inp, ...copiar, nao, sim].filter(Boolean), i = f.indexOf(document.activeElement);
          if (f.length === 1) { e.preventDefault(); f[0].focus(); return; }
          e.preventDefault(); f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
        }
      }
      document.addEventListener('keydown', tecla, true);
      if (nao) nao.addEventListener('click', cancelar);
      fundo.addEventListener('click', e => { if (e.target === fundo) cancelar(); });
      sim.addEventListener('click', confirmar);
      if (inp) { inp.focus(); inp.select(); } else ((o.perigo && nao) ? nao : sim).focus();
    });
  }
  Auth.janela = janela;

  /* ---------- Janela com campos (editar usuário, senha provisória, criar senha) ----------
     formulario({ titulo, texto, campos: [{ nome, rotulo, tipo, valor, ajuda, auto, opcoes, mostrarSe }], ok, cancelar,
       tipo 'select' → opcoes [{ valor, texto }] · tipo 'checks' → opcoes [{ valor, texto, ajuda }] e valor = lista marcada
       mostrarSe { campo, valor }: o campo só aparece quando outro campo tem esse valor
                  icone, bloqueada, mostrarSenhas, gerar, aoEnviar: async valores => { ... } })
     aoEnviar pode lançar um erro: a mensagem aparece na própria janela, que continua aberta.
     bloqueada: não fecha com Esc nem clicando fora (o botão de cancelar vira o que for passado em cancelar).
     → Promise: valores enviados, ou null se cancelou. */
  function formulario(o = {}) {
    cssJanela();
    if (!document.getElementById('pb-form-css')) {
      const c = document.createElement('style'); c.id = 'pb-form-css';
      c.textContent = `
        .pb-form .pb-sair-caixa{width:min(460px,100%)}
        .pb-form-campo{display:block;margin:0 0 14px}
        .pb-form-campo>span{display:block;font-size:14px;font-weight:600;margin-bottom:6px}
        .pb-form-campo>.pb-form-linha{display:flex;gap:8px;margin:0;font-weight:400}
        .pb-form-campo input{flex:1;min-width:0;width:100%;box-sizing:border-box;min-height:44px;padding:10px 12px;border:1.5px solid #e2e5f0;border-radius:10px;font:inherit;font-size:15px;color:inherit;background:#fff}
        .pb-form-campo input:focus{outline:none;border-color:#1f35b5;box-shadow:0 0 0 3px #eef0fc}
        .pb-form-campo input[autocomplete="one-time-code"]{text-align:center;font:800 26px/1.1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.32em;padding-left:calc(12px + .32em);color:#1f35b5;background:#eef0fc;border-color:#d7dcf7;min-height:54px}
        .pb-form-campo input[autocomplete="one-time-code"]::placeholder{letter-spacing:.32em;color:#9aa3d6;font-weight:600}
        .pb-form-campo input[autocomplete="one-time-code"].pb-colado{animation:pbColado .9s ease-out;border-color:#2fa866;box-shadow:0 0 0 4px rgba(47,168,102,.22)}
        @keyframes pbColado{0%{transform:scale(1.04)}100%{transform:scale(1)}}
        html[data-tema="escuro"] .pb-form-campo input[autocomplete="one-time-code"]{background:rgba(141,156,255,.12)!important;color:#c3cbff!important;border-color:rgba(141,156,255,.35)}
        .pb-form-campo small{display:block;margin-top:5px;font-size:12.5px;color:#646a8a;line-height:1.4}
        .pb-form-gerar{flex:none;min-height:44px;padding:0 14px;border-radius:10px;border:1.5px solid #e2e5f0;background:#fff;color:#1f35b5;font:inherit;font-weight:600;font-size:13.5px;cursor:pointer}
        .pb-form-gerar:hover{border-color:#1f35b5}
        .pb-form-mostrar{display:flex;align-items:center;gap:8px;margin:-4px 0 14px;font-size:14px;color:#646a8a;cursor:pointer}
        .pb-form-erro{margin:-4px 0 14px!important;padding:10px 12px;border-radius:10px;background:#fdecea;color:#b42318!important;font-size:14px!important}
        .pb-form-erro[hidden]{display:none}
        html[data-tema="escuro"] .pb-form-campo input,html[data-tema="escuro"] .pb-form-gerar{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.14);color:inherit}
        html[data-tema="escuro"] .pb-form-gerar{color:#9db0ff}
        html[data-tema="escuro"] .pb-form-campo small,html[data-tema="escuro"] .pb-form-mostrar{color:#a3a8c3}
        html[data-tema="escuro"] .pb-form-erro{background:rgba(255,120,110,.12);color:#ff9d94!important}
        .pb-form-campo select{flex:1;min-width:0;width:100%;min-height:44px;padding:10px 12px;border:1.5px solid #e2e5f0;border-radius:10px;font:inherit;font-size:15px;color:inherit;background:#fff}
        .pb-form-checks{border:0;margin:0 0 14px;padding:0;min-width:0}
        .pb-form-checks legend{font-size:14px;font-weight:600;margin-bottom:6px;padding:0}
        .pb-form-checks>small{display:block;margin:-2px 0 8px;font-size:12.5px;color:#646a8a;line-height:1.4}
        .pb-form-check{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border:1.5px solid #e2e5f0;border-radius:12px;margin-bottom:6px;cursor:pointer;text-align:left}
        .pb-form-check:has(input:checked){border-color:#1f35b5;background:#eef0fc}
        .pb-form-check input{width:18px;height:18px;margin:2px 0 0;flex:none;accent-color:#1f35b5}
        .pb-form-check b{display:block;font-size:14px;font-weight:600}
        .pb-form-check em{display:block;font-style:normal;font-size:12.5px;color:#646a8a;line-height:1.35;margin-top:2px}
        .pb-form .pb-sair-caixa{max-height:calc(100vh - 32px);overflow-y:auto}
        .pb-form [hidden]{display:none!important}
        html[data-tema="escuro"] .pb-form-campo select{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.14);color:inherit}
        html[data-tema="escuro"] .pb-form-campo select option{background:#1d2238}
        html[data-tema="escuro"] .pb-form-check{border-color:rgba(255,255,255,.14)}
        html[data-tema="escuro"] .pb-form-check:has(input:checked){border-color:#8d9cff;background:rgba(141,156,255,.12)}
        html[data-tema="escuro"] .pb-form-check em,html[data-tema="escuro"] .pb-form-checks>small{color:#a3a8c3}`;
      document.head.appendChild(c);
    }
    const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    return new Promise(resolve => {
      const antiga = document.getElementById('pb-form'); if (antiga) antiga.remove();
      const voltarFoco = document.activeElement;
      const fundo = document.createElement('div');
      fundo.className = 'pb-sair-fundo pb-form'; fundo.id = 'pb-form';
      const campos = o.campos || [];
      fundo.innerHTML = `
        <form class="pb-sair-caixa" role="dialog" aria-modal="true" aria-labelledby="pb-form-tit" novalidate>
          <div class="pb-sair-ico" aria-hidden="true"><svg viewBox="0 0 24 24">${ICONES[o.icone] || ICONES.editar}</svg></div>
          <h2 id="pb-form-tit">${esc(o.titulo || '')}</h2>
          ${o.texto ? `<p>${esc(o.texto)}</p>` : ''}
          ${campos.map(c => c.tipo === 'checks'
            ? `<fieldset class="pb-form-checks" data-campo="${esc(c.nome)}"><legend>${esc(c.rotulo)}</legend>${c.ajuda ? `<small>${esc(c.ajuda)}</small>` : ''}${(c.opcoes || []).map(op => `<label class="pb-form-check"><input type="checkbox" name="${esc(c.nome)}" value="${esc(op.valor)}" ${(c.valor || []).includes(op.valor) ? 'checked' : ''}><span><b>${esc(op.texto)}</b>${op.ajuda ? `<em>${esc(op.ajuda)}</em>` : ''}</span></label>`).join('')}</fieldset>`
            : c.tipo === 'select'
            ? `<label class="pb-form-campo" data-campo="${esc(c.nome)}"><span>${esc(c.rotulo)}</span><span class="pb-form-linha"><select name="${esc(c.nome)}">${(c.opcoes || []).map(op => `<option value="${esc(op.valor)}" ${op.valor === c.valor ? 'selected' : ''}>${esc(op.texto)}</option>`).join('')}</select></span>${c.ajuda ? `<small>${esc(c.ajuda)}</small>` : ''}</label>`
            : `<label class="pb-form-campo" data-campo="${esc(c.nome)}"><span>${esc(c.rotulo)}</span><span class="pb-form-linha"><input name="${esc(c.nome)}" type="${c.tipo || 'text'}" value="${esc(c.valor || '')}" autocomplete="${esc(c.auto || 'off')}" ${c.tipo === 'email' ? 'inputmode="email"' : ''}>${c.gerar ? '<button type="button" class="pb-form-gerar" data-gerar>Gerar</button>' : ''}</span>${c.ajuda ? `<small>${esc(c.ajuda)}</small>` : ''}</label>`).join('')}
          ${o.mostrarSenhas ? '<label class="pb-form-mostrar"><input type="checkbox" data-mostrar> Mostrar as senhas</label>' : ''}
          <p class="pb-form-erro" role="alert" hidden></p>
          <div class="pb-sair-acoes">
            <button type="button" class="pb-sair-nao">${esc(o.cancelar || 'Cancelar')}</button>
            <button type="submit" class="pb-sair-sim">${esc(o.ok || 'Salvar')}</button>
          </div>
        </form>`;
      document.body.appendChild(fundo);
      /* campo de código (6 números): só números, centralizado e com destaque quando o código é colado ou completado */
      fundo.querySelectorAll('input[autocomplete="one-time-code"]').forEach(inp => {
        inp.inputMode = 'numeric'; inp.maxLength = 6; inp.placeholder = inp.placeholder || '••••••';
        const destacar = () => { inp.classList.remove('pb-colado'); void inp.offsetWidth; inp.classList.add('pb-colado'); };
        inp.addEventListener('input', () => {
          const d = inp.value.replace(/\D/g, '').slice(0, 6);
          if (d !== inp.value) inp.value = d;
          if (d.length === 6) destacar(); else inp.classList.remove('pb-colado');
        });
      });
      const form = fundo.querySelector('form'), nao = fundo.querySelector('.pb-sair-nao'), sim = fundo.querySelector('.pb-sair-sim'), erro = fundo.querySelector('.pb-form-erro');
      const fechar = v => { fundo.remove(); document.removeEventListener('keydown', tecla, true); if (voltarFoco && voltarFoco.focus) try { voltarFoco.focus({ preventScroll: true }); } catch (e) {} resolve(v); };
      const cancelar = () => { if (o.aoCancelar) o.aoCancelar(); else fechar(null); };
      function tecla(e) { if (e.key === 'Escape' && !o.bloqueada) { e.preventDefault(); e.stopPropagation(); cancelar(); } }
      document.addEventListener('keydown', tecla, true);
      nao.addEventListener('click', cancelar);
      fundo.addEventListener('click', e => { if (e.target === fundo && !o.bloqueada) cancelar(); });
      const gb = fundo.querySelector('[data-gerar]');
      if (gb) gb.addEventListener('click', () => { const inp = gb.previousElementSibling; inp.value = Auth.gerarSenha(); inp.type = 'text'; inp.focus(); });
      const mo = fundo.querySelector('[data-mostrar]');
      if (mo) mo.addEventListener('change', () => fundo.querySelectorAll('input[type=password], input[data-era-senha]').forEach(i => { i.dataset.eraSenha = '1'; i.type = mo.checked ? 'text' : 'password'; }));
      /* campos que só aparecem quando outro campo tem um valor (ex.: acessos extras só para Suporte) */
      const condicionais = campos.filter(c => c.mostrarSe);
      const atualizarVisiveis = () => condicionais.forEach(c => {
        const el = form.querySelector(`[data-campo="${c.nome}"]`), ref = form.elements[c.mostrarSe.campo];
        if (el && ref) el.hidden = ref.value !== c.mostrarSe.valor;
      });
      if (condicionais.length) { form.addEventListener('change', atualizarVisiveis); atualizarVisiveis(); }
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const v = {}; campos.forEach(c => {
          if (c.tipo === 'checks') v[c.nome] = [...form.querySelectorAll(`input[name="${c.nome}"]:checked`)].map(i => i.value);
          else v[c.nome] = String(form.elements[c.nome].value).trim();
        });
        erro.hidden = true; sim.disabled = true; const txt = sim.textContent; sim.textContent = 'Salvando…';
        try { if (o.aoEnviar) await o.aoEnviar(v); fechar(v); }
        catch (err) { erro.textContent = err.message || 'Não deu certo. Tente de novo.'; erro.hidden = false; sim.disabled = false; sim.textContent = txt; }
      });
      const p1 = form.querySelector('input:not([type=checkbox])'); if (p1) { p1.focus({ preventScroll: true }); if (p1.value) p1.select(); }
    });
  }
  Auth.formulario = formulario;
  /* senha provisória fácil de ditar: sem letras parecidas (l, I, O, 0), 10 caracteres */
  Auth.gerarSenha = () => {
    const L = 'abcdefghjkmnpqrstuvwxyz', M = 'ABCDEFGHJKLMNPQRSTUVWXYZ', N = '23456789', T = L + M + N;
    const r = n => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; };
    const base = [L[r(L.length)], M[r(M.length)], N[r(N.length)], N[r(N.length)]];
    while (base.length < 10) base.push(T[r(T.length)]);
    for (let i = base.length - 1; i > 0; i--) { const j = r(i + 1); [base[i], base[j]] = [base[j], base[i]]; }
    return base.join('');
  };
  Auth.confirmar = (titulo, texto, opcoes = {}) => janela({ titulo, texto, ...opcoes });
  Auth.perguntar = (titulo, valor = '', opcoes = {}) => janela({ titulo, ...opcoes, campo: { valor, placeholder: opcoes.placeholder || '' } });

  /* ---------- Botão da conta (nome + iniciais, lá em cima, à direita) ----------
     Vale para todo mundo: administrador, suporte e psicólogo.
     Equipe → conta.html · Psicólogo → Minha agenda, parte "Minha conta". */
  function botaoConta() {
    const s = Auth.sessao();
    document.querySelectorAll('.topo-user .nome-txt').forEach(box => {
      if (!s || document.getElementById('btn-conta')) return;
      const nome = s.nome || '';
      const ini = nome.split(/\s+/).filter(w => w.length > 2).slice(0, 2).map(w => w[0]).join('').toUpperCase() || (nome[0] || '•').toUpperCase();
      const destino = s.papel === 'psicologo' ? 'minha-agenda.html#conta' : 'conta.html';
      const aqui = /\/conta\.html$/.test(location.pathname);
      const a = document.createElement('a');
      a.className = 'conta-btn' + (aqui ? ' atual' : '');
      a.id = 'btn-conta'; a.href = destino; a.title = 'Minha conta';
      a.innerHTML = '<span class="conta-ava" aria-hidden="true"></span><span class="conta-txt"><span data-nome></span><small>Minha conta</small></span><span class="papel" data-papel hidden></span>';
      a.querySelector('.conta-ava').textContent = ini;
      a.querySelector('[data-nome]').textContent = nome;
      a.setAttribute('aria-label', 'Minha conta: ' + nome);
      box.replaceWith(a);
    });
  }
  Auth.botaoConta = botaoConta;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', botaoConta); else botaoConta();

  /* ---------- Firebase: confere de verdade quem está logado ----------
     Em todas as telas, menos a de login: se o Firebase disser que ninguém
     está logado, que é outra pessoa, ou que o acesso foi desligado/mudou de
     papel, a sessão é encerrada e volta para o login. */
  function telaDeLogin() { return /\/painel\/?(index\.html)?$/.test(location.pathname); }
  if (FIREBASE && !telaDeLogin()) {
    NUVEM.authPronta().then(async x => {
      const s = Auth.sessao();
      const u = x.usuario;
      if (!u || !s || s.uid !== u.uid) { Auth.sairAgora(); return; }
      try {
        const doc = await x.fs.getDoc(x.fs.doc(x.db, 'usuarios', u.uid));
        const d = doc.exists() ? doc.data() : null;
        if (!d || d.ativo === false || d.papel !== s.papel) { Auth.sairAgora(); return; }
        /* acessos extras mudaram: vale a partir da próxima tela */
        if (s.papel === 'suporte' && JSON.stringify(extrasDe(d)) !== JSON.stringify(extrasDe(s))) { s.extras = extrasDe(d); sessionStorage.setItem(CHAVE, JSON.stringify(s)); }
      } catch (e) { /* sem internet: segue; as regras do banco continuam protegendo */ }
    }).catch(() => Auth.sairAgora());
  }

  /* Modo de teste: se o administrador mudou o papel ou os acessos desta pessoa, aplica já
     (papel diferente = sai; acessos extras = atualiza a sessão antes de a tela montar) */
  if (!FIREBASE) {
    try {
      const s = Auth.sessao();
      if (s && s.papel !== 'psicologo') {
        const d = JSON.parse(localStorage.getItem('pb_agenda_dados_v1') || 'null');
        const u = d && (d.usuarios || []).find(x => x.id === s.id);
        if (u && (u.papel !== s.papel || u.ativo === false)) { sessionStorage.removeItem(CHAVE); }
        else if (u && s.papel === 'suporte' && JSON.stringify(extrasDe(u)) !== JSON.stringify(extrasDe(s))) { s.extras = extrasDe(u); sessionStorage.setItem(CHAVE, JSON.stringify(s)); }
      }
    } catch (e) { /* segue com a sessão como está */ }
  }

  /* ---------- Cores e ícones do painel ----------
     Cada aba e cada caixinha de número ganha um ícone colorido, para quem entra
     bater o olho e saber onde está. As cores vêm do topo.css (claro e escuro). */
  const IC = {
    relogio: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    sino: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    calendario: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    lista: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" stroke-width="3"/>',
    email: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7 8.5 6 8.5-6"/>',
    carteira: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><rect x="4" y="8" width="16.5" height="11" rx="2.5"/><path d="M16 13.5h.01" stroke-width="3"/>',
    ok: '<circle cx="12" cy="12" r="8.5"/><path d="m8.3 12.2 2.6 2.6 4.9-5.2"/>',
    grafico: '<path d="M4 20h16"/><path d="M7 16v-4M12 16V7M17 16v-7"/>',
    atendimento: '<circle cx="10" cy="8" r="3.5"/><path d="M3.5 19.5c.8-3.3 3.3-5 6.5-5 1.5 0 2.8.4 3.8 1.1"/><path d="m15 18 2 2 4-4.5"/>',
    pessoa: '<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20c1-3.6 4-5.5 7.5-5.5s6.5 1.9 7.5 5.5"/>',
    mundo: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.6 5.2 3.6 8.5s-1.2 6.1-3.6 8.5c-2.4-2.4-3.6-5.2-3.6-8.5S9.6 5.9 12 3.5"/>',
    pessoas: '<circle cx="9" cy="8.5" r="3.3"/><path d="M3 19.5c.7-3 3-4.8 6-4.8s5.3 1.8 6 4.8"/><path d="M15.5 5.6a3.2 3.2 0 0 1 0 6M17.5 14.9c1.8.6 3 2.2 3.5 4.6"/>',
    atividade: '<path d="M3 12h4l2.5-6 5 12 2.5-6h4"/>',
    dinheiro: '<rect x="3" y="6" width="18" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.6"/><path d="M6.5 9.5v5M17.5 9.5v5"/>',
    falta: '<circle cx="12" cy="12" r="8.5"/><path d="m9.2 9.2 5.6 5.6M14.8 9.2l-5.6 5.6"/>',
    empresa: '<path d="M4 20.5h16M6 20.5v-15l7-2v17M13 8.5h5v12"/><path d="M9 8h1M9 11.5h1M9 15h1"/>'
  };
  const ico = (n, cls) => `<span class="${cls}" aria-hidden="true"><svg viewBox="0 0 24 24">${IC[n] || ''}</svg></span>`;
  /* aba → [ícone, cor] (cores: amarelo, verde, roxo, azul, ciano, índigo, cinza, laranja, rosa) */
  /* v206: abas são navegação → todas na cor da marca (as cores ficam só para o que tem significado) */
  const ABAS = {
    pre: ['relogio', 'marca'], lembretes: ['sino', 'marca'], calendario: ['calendario', 'marca'], agenda: ['lista', 'marca'], caixa: ['email', 'marca'],
    apagar: ['carteira', 'marca'], pagos: ['ok', 'marca'], resumo: ['grafico', 'marca'],
    atendimentos: ['atendimento', 'marca'], disponibilidade: ['relogio', 'marca'], conta: ['pessoa', 'marca'], pagina: ['mundo', 'marca'],
    pessoas: ['pessoas', 'marca'], atividades: ['atividade', 'marca']
  };
  /* caixinhas de número: palavra no rótulo → [ícone, cor] */
  const NUMEROS = [
    /* v206: dicionário de cores — vermelho = faltou · amarelo = a pagar/aguardando · verde = pago · marca = o resto */
    [/falta/i, 'falta', 'vermelho'], [/a pagar|aguard|pendente/i, 'dinheiro', 'amarelo'], [/por vir|pr[oó]xim/i, 'relogio', 'marca'], [/plataforma/i, 'empresa', 'marca'], [/psic[oó]logo/i, 'pessoas', 'marca'],
    [/sess|atendimento|realizad/i, 'calendario', 'marca'], [/pago|receber|faturado|repasse|total|valor/i, 'dinheiro', 'verde']
  ];
  function colorir(raiz) {
    (raiz || document).querySelectorAll('.aba:not([data-cor]), .eq-abas button:not([data-cor])').forEach(a => {
      const k = a.dataset.aba || a.dataset.eqAba || (a.classList.contains('aba-pagina') ? 'pagina' : '');
      const d = ABAS[k]; if (!d) return;
      a.dataset.cor = d[1];
      a.insertAdjacentHTML('afterbegin', ico(d[0], 'aba-ico'));
    });
    (raiz || document).querySelectorAll('.numero:not([data-cor])').forEach(n => {
      const r = (n.querySelector('span') || {}).textContent || '';
      const d = NUMEROS.find(x => x[0].test(r)); if (!d) { n.dataset.cor = ''; return; }
      n.dataset.cor = d[2];
      n.insertAdjacentHTML('afterbegin', ico(d[1], 'num-ico'));
    });
  }
  Auth.colorir = colorir;
  /* ---------- Pré-carregar a próxima tela (Chrome e Edge) ----------
     Ao passar o mouse (ou encostar o dedo) numa aba ou área do painel, o navegador já prepara
     aquela tela por trás. No clique ela aparece na hora, sem branco. Não bloqueia o clique:
     se não deu tempo, abre do jeito normal. Nos outros navegadores nada muda. */
  try {
    if (HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules') && !document.querySelector('script[data-pb-pre]')) {
      const r = document.createElement('script');
      r.type = 'speculationrules'; r.dataset.pbPre = '1';
      r.textContent = JSON.stringify({ prerender: [{
        where: { selector_matches: 'a.aba, a.area-link, a.am-item, a.hub-cartao, a.visao-voltar, #psiFichaTopo a, .ficha-abas a' },   /* só links do próprio painel */
        eagerness: 'moderate'
      }] });
      document.head.appendChild(r);
    }
  } catch (e) { /* navegador sem suporte: segue normal */ }

  /* colore na hora (antes de a tela ser desenhada), para não "piscar" a versão sem ícones */
  colorir();
  new MutationObserver(() => colorir()).observe(document.documentElement, { childList: true, subtree: true });

  window.Auth = Auth;

  /* Menus e abas que passam da largura da tela (celular): esmaece a ponta direita
     enquanto ainda tem item escondido, para a pessoa saber que dá para arrastar. */
  const SEL_FADE = '.areas-nav, .abas, #psiFichaTopo';
  function marcarFade(el) {
    const resta = el.scrollWidth - el.clientWidth - el.scrollLeft;
    el.classList.toggle('tem-mais', el.scrollWidth > el.clientWidth + 4 && resta > 4);
  }
  function marcarFades() {
    document.querySelectorAll(SEL_FADE).forEach(el => {
      if (!el.dataset.fade) { el.dataset.fade = '1'; el.addEventListener('scroll', () => marcarFade(el), { passive: true }); }
      marcarFade(el);
    });
  }
  window.marcarFades = marcarFades;
  document.addEventListener('DOMContentLoaded', marcarFades);
  window.addEventListener('load', () => { marcarFades(); setTimeout(marcarFades, 600); });
  window.addEventListener('resize', marcarFades);
})();
