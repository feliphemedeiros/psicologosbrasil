/* =====================================================================
   v291: BARRA DE BAIXO DA EQUIPE (celular/tablet, até 900px) — em TODAS as telas
   ---------------------------------------------------------------------
   Pré-reservas · 15 min · Lembretes · Agenda · Mais
   "Mais" abre uma folha com Calendário, E-mails, Buscar paciente e as
   OUTRAS ÁREAS que a pessoa pode abrir (Psicólogos, Pacientes, ...).
   O que for liberado para o suporte aparece em "Outras áreas" sozinho.

   - Na Agenda da equipe (agenda.html) os botões trocam de aba na mesma tela
     (agenda-equipe.js chama NavEquipe.montar com o "ir" dele).
   - Nas outras telas os botões levam para agenda.html#aba.
   - Não aparece para o psicólogo (ele tem a barra dele) nem na agenda de um
     psicólogo vista pela equipe (minha-agenda.html, que tem a barra própria).
   - Com a barra, some o botão "Trocar de área" do topo no celular.
   ===================================================================== */
(function () {
  const IC = {
    pre: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    conhecer: '<path d="M20 11.5a8 8 0 0 1-11.9 7L4 20l1.5-4A8 8 0 1 1 20 11.5z"/><path d="M8.5 11.5h7M8.5 8.5h4"/>',
    lembretes: '<path d="M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    agenda: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.2"/><circle cx="4.5" cy="12" r="1.2"/><circle cx="4.5" cy="18" r="1.2"/>',
    mais: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    calendario: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    caixa: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="m4 7.5 8 6 8-6"/>',
    busca: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'
  };
  const svg = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${IC[k]}</svg>`;
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ITENS = [['pre', 'Pré-reservas', 'pre'], ['conhecer', '15 min', 'cn'], ['lembretes', 'Lembretes', 'lem'], ['agenda', 'Agenda', ''], ['mais', 'Mais', '']];
  const NO_MAIS = ['calendario', 'caixa'];

  let opts = null, nav = null;

  function podeTer() {
    if (typeof Auth === 'undefined') return false;
    const s = Auth.sessao();
    return !!(s && s.papel !== 'psicologo' && Auth.pode('agenda', s));
  }

  /* opcoes: { ir(aba) → troca de aba na mesma tela, aba: aba atual, area: área atual } */
  function montar(opcoes = {}) {
    if (nav || !podeTer()) return;
    opts = opcoes;
    nav = document.createElement('nav');
    nav.className = 'nav-flutuante nav-equipe'; nav.setAttribute('aria-label', 'Agenda da equipe');
    nav.innerHTML = ITENS.map(([k, t, c]) => `<button type="button" data-nf="${k}"${k === 'mais' ? ' aria-haspopup="dialog"' : ''}><span class="nf-ico">${svg(k)}${c ? `<span class="nf-cont${c === 'lem' ? ' nf-verde' : ''}" data-nf-cont="${c}"></span>` : ''}</span><span class="nf-txt">${t}</span></button>`).join('');
    document.body.appendChild(nav);
    document.body.classList.add('com-nav-equipe');
    if (opts.ir) document.body.classList.add('com-nav-flutuante');   /* só na Agenda: esconde as abas de cima (a barra faz o papel delas) */
    nav.addEventListener('click', e => {
      const b = e.target.closest('[data-nf]'); if (!b) return;
      if (b.dataset.nf === 'mais') abrirMais(); else ir(b.dataset.nf);
    });
    marcar(opts.aba || null);
    document.addEventListener('pb:aba', e => marcar(e.detail));
    numeros();
  }

  function ir(aba) {
    if (opts && opts.ir) { opts.ir(aba); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    else location.href = 'agenda.html#' + aba;
  }

  /* fora da Agenda, o botão aceso é o "Mais" (a área atual está dentro dele) */
  function marcar(aba) {
    if (!nav) return;
    nav.querySelectorAll('[data-nf]').forEach(b => {
      const k = b.dataset.nf;
      const on = opts.ir ? (k === aba || (k === 'mais' && NO_MAIS.includes(aba))) : k === 'mais';
      b.classList.toggle('on', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
  }

  /* números dos botões: na Agenda copia das abas de cima; nas outras telas conta pelo banco */
  function numeros() {
    if (opts.ir) {
      const copiar = () => nav.querySelectorAll('[data-nf-cont]').forEach(x => { const o = document.querySelector(`.abas [data-cont="${x.dataset.nfCont}"]`); x.textContent = o ? o.textContent : ''; });
      document.querySelectorAll('.abas [data-cont]').forEach(o => new MutationObserver(copiar).observe(o, { childList: true, characterData: true, subtree: true }));
      copiar();
      return;
    }
    contar();
    if (window.DB && DB.aoMudar) { try { DB.aoMudar(contar); } catch (e) { /* sem tempo real */ } }
  }
  async function contar() {
    if (!window.DB || !window.U) return;
    const por = (k, n) => { const x = nav.querySelector(`[data-nf-cont="${k}"]`); if (x) x.textContent = n || ''; };
    try {   /* pré-reservas: uma por grupo (o plano mensal conta como uma) */
      const pend = await DB.listarAgendamentos({ status: ['pendente'] });
      por('pre', new Set(pend.map(a => a.grupo || a.id)).size);
    } catch (e) { /* deixa vazio */ }
    try {   /* 15 min: pedidos novos + conversas confirmadas pelo psicólogo que falta avisar o paciente */
      const cn = DB.listarConhecer ? await DB.listarConhecer() : [];
      const cv = DB.listarConversas ? await DB.listarConversas() : [];
      const novos = cn.filter(p => p.status === 'novo').length;
      const avisar = cv.filter(a => a.status === 'confirmado' && a.psiCiente && !(a.lembretes || {}).horario && U.dataHora(a.data, a.hora, a.fuso).getTime() + (a.duracao || 15) * 60e3 > Date.now()).length;
      por('cn', novos + avisar);
    } catch (e) { /* deixa vazio */ }
    try {
      const hoje = U.hojeISO();
      const ags = await DB.listarAgendamentos({ status: ['confirmado'], de: hoje, ate: U.addDias(hoje, 3) });
      por('lem', U.lembretes(ags).pendentes);
    } catch (e) { /* deixa vazio */ }
  }

  function abrirMais() {
    let dlg = document.getElementById('folha-mais');
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.id = 'folha-mais'; dlg.className = 'folha-mais'; dlg.setAttribute('aria-labelledby', 'folha-mais-tit');
      const op = (k, t, d) => `<button type="button" class="fm-op" data-fm="${k}"><span class="fm-ico">${svg(k)}</span><span><b>${t}</b><small>${d}</small></span></button>`;
      const ses = Auth.sessao();
      const atual = opts.area || (opts.ir ? 'agenda' : '');
      const outras = Auth.areasMenu(ses).filter(k => k !== 'agenda').map(k => [k, Auth.infoArea(k)]).filter(([, a]) => a);
      dlg.innerHTML = `<div class="fm-in"><span class="fm-alca" aria-hidden="true"></span>
        <div class="fm-cab"><h3 id="folha-mais-tit">Mais</h3><button type="button" class="fm-x" data-fm-fechar aria-label="Fechar">×</button></div>
        ${op('calendario', 'Calendário', 'O mês inteiro, dia por dia')}
        ${op('caixa', 'E-mails enviados', 'O que saiu para pacientes e psicólogos')}
        ${op('busca', 'Buscar paciente', 'Nome, WhatsApp, e-mail ou código')}
        ${outras.length ? `<p class="fm-sec">Outras áreas</p>` + outras.map(([k, a]) => `<a class="fm-op fm-area${k === atual ? ' atual' : ''}" data-area="${k}" href="${a.url}"${k === atual ? ' aria-current="page"' : ''}><span class="fm-ico">${a.ico}</span><span><b>${esc(a.nome)}</b><small>${esc(Auth.descDe(k, ses))}</small></span>${k === atual ? '<span class="fm-aqui">Você está aqui</span>' : ''}</a>`).join('') : ''}</div>`;
      document.body.appendChild(dlg);
      dlg.addEventListener('click', e => {
        if (e.target === dlg || e.target.closest('[data-fm-fechar]')) { dlg.close(); return; }
        const area = e.target.closest('a.fm-area.atual');
        if (area) { e.preventDefault(); dlg.close(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
        const b = e.target.closest('[data-fm]'); if (!b) return;
        dlg.close();
        if (b.dataset.fm === 'busca') {
          if (opts.ir) { ir('calendario'); setTimeout(() => { const q = document.getElementById('bp-q'); if (q) q.focus(); }, 350); }
          else location.href = 'agenda.html?buscar=1#calendario';
        } else ir(b.dataset.fm);
      });
      dlg.addEventListener('close', () => document.documentElement.classList.remove('fm-aberta'));
    }
    document.documentElement.classList.add('fm-aberta');
    dlg.showModal();
  }

  window.NavEquipe = { montar };

  /* telas fora da Agenda: monta sozinho (a Agenda da equipe e a agenda do psicólogo montam/ têm a sua) */
  function auto() {
    const pag = location.pathname.split('/').pop() || 'index.html';
    if (pag === 'agenda.html' || pag === 'minha-agenda.html' || pag === 'index.html' || pag === '') return;
    const area = (document.querySelector('[data-areas] .area-link.atual') || {}).dataset?.area || pag.replace('.html', '');
    montar({ area });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(auto, 0));
  else setTimeout(auto, 0);
})();
