/* =====================================================================
   SESSÃO E PERMISSÕES DO PAINEL — Psicólogos Brasil
   ---------------------------------------------------------------------
   Um login só para todo o painel (psicologosbrasil.com.br/painel).
   Sempre com código de dois fatores. Cada papel vê só as suas áreas:

     admin      → Perfis, Psicólogos, Artigos, Agenda, Usuários e Configurações
     suporte    → Perfis, Psicólogos e Agenda
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
    /* "Perfis": a página de cada psicólogo no site (criar, editar, publicar, remover) */
    psicologos: {
      nome: 'Perfis', url: 'conteudo.html#psicologos',
      desc: 'Criar, editar, publicar e remover a página de cada psicólogo no site.',
      ico: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4.5" width="18" height="15" rx="3"/><circle cx="9" cy="11" r="2.6"/><path d="M5.2 17c.6-2 2-3 3.8-3s3.2 1 3.8 3M15 9.5h3.5M15 13h3.5"/></svg>'
    },
    /* "Psicólogos": entrar na agenda de cada um (atendimentos, disponibilidade, resumo, conta) */
    acompanhar: {
      nome: 'Psicólogos', url: 'psicologos.html',
      desc: 'Entrar na agenda de cada psicólogo: atendimentos, disponibilidade, resumo do mês e conta.',
      ico: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><circle cx="17.5" cy="9" r="2.6"/><path d="M16.5 14.6c2.7.1 4.5 1.8 5 4.9"/></svg>'
    },
    usuarios: {
      nome: 'Usuários', url: 'conteudo.html#usuarios',
      desc: 'Adicionar, desativar e mandar nova senha para a equipe e os psicólogos.',
      ico: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="8" r="3.5"/><path d="M3.5 20c.6-3.6 3.2-5.5 6.5-5.5 1.4 0 2.6.3 3.6 1M18 13v6M15 16h6"/></svg>'
    },
    artigos: {
      nome: 'Artigos', url: 'conteudo.html#artigos',
      desc: 'Escrever e publicar artigos do blog, com SEO pronto.',
      ico: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 11h7M9 15h7M9 19h4"/></svg>'
    },
    agenda: {
      nome: 'Agenda', url: 'agenda.html',
      desc: 'Pré-reservas, pagamentos, agenda de todos e repasses.',
      ico: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>'
    },
    config: {
      nome: 'Configurações', url: 'conteudo.html#config',
      desc: 'Endereço do site, WhatsApp, autor dos artigos, categorias, abordagens e backup.',
      ico: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>'
    },
    minhaAgenda: {
      nome: 'Minha agenda', url: 'minha-agenda.html',
      desc: 'Seus horários, folgas e atendimentos.',
      ico: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>'
    }
  };

  const PERMISSOES = {
    admin: ['psicologos', 'acompanhar', 'artigos', 'agenda', 'usuarios', 'config'],
    suporte: ['psicologos', 'acompanhar', 'agenda'],
    psicologo: ['minhaAgenda']
  };

  const NOMES_PAPEL = { admin: 'Administrador', suporte: 'Suporte', psicologo: 'Psicólogo(a)' };

  const Auth = {
    AREAS, PERMISSOES, NOMES_PAPEL,

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
    areas(s) { return (PERMISSOES[(s || {}).papel] || []); },
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
      const a = Auth.areas(s);
      if (a.length < 2) { el.hidden = true; return; }
      el.innerHTML = a.map(k => `<a href="${AREAS[k].url}" class="area-link${k === atual ? ' atual' : ''}"${k === atual ? ' aria-current="page"' : ''}>${AREAS[k].ico}<span>${AREAS[k].nome}</span></a>`).join('');
    }
  };

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
          ${o.campo ? `<label class="pb-janela-campo"><span class="sr" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">${esc(o.campo.rotulo || o.titulo)}</span><input type="text" value="${esc(o.campo.valor || '')}" placeholder="${esc(o.campo.placeholder || '')}"></label>` : ''}
          <div class="pb-sair-acoes">
            ${o.semCancelar ? '' : `<button type="button" class="pb-sair-nao">${esc(o.cancelar || 'Cancelar')}</button>`}
            <button type="button" class="pb-sair-sim${o.perigo ? ' perigo' : ''}">${esc(o.ok || 'Confirmar')}</button>
          </div>
        </div>`;
      document.body.appendChild(fundo);
      const nao = fundo.querySelector('.pb-sair-nao'), sim = fundo.querySelector('.pb-sair-sim'), inp = fundo.querySelector('input');
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
          const f = [inp, nao, sim].filter(Boolean), i = f.indexOf(document.activeElement);
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
        if (!d || d.ativo === false || d.papel !== s.papel) Auth.sairAgora();
      } catch (e) { /* sem internet: segue; as regras do banco continuam protegendo */ }
    }).catch(() => Auth.sairAgora());
  }

  window.Auth = Auth;
})();
