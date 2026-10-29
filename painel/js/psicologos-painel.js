/* =====================================================================
   PSICÓLOGOS (admin e suporte) — painel/psicologos.html
   Cartões com a foto de cada psicólogo que tem acesso à agenda.
   Clicou → abre a agenda dele (minha-agenda.html?psi=ID): atendimentos,
   disponibilidade, resumo do mês e conta.
   A foto e o nome vêm de "Perfis"; a agenda vem do banco da agenda.
   ===================================================================== */
(async function () {
  const S = Auth.exigir(['acompanhar']);
  if (!S) return;
  const { $, esc } = U;
  $('[data-nome]').textContent = S.nome;
  $('[data-papel]').textContent = Auth.NOMES_PAPEL[S.papel] || '';
  $('[data-sair]').onclick = () => Auth.sair();
  Auth.menuAreas($('[data-areas]'), 'acompanhar');

  /* fotos e perfis (o cadastro feito em "Perfis") */
  async function perfis() {
    try {
      if (DB.modo === 'firebase') {
        const { fs, db } = await NUVEM.authPronta();
        const s = await fs.getDocs(fs.collection(db, 'painel_psicologos'));
        return Promise.all(s.docs.map(async d => {
          const p = d.data();
          const foto = p.foto && p.foto.data ? await NUVEM.resolverTexto(p.foto.data) : '';
          return { ...p, fotoUrl: foto };
        }));
      }
      const c = JSON.parse(localStorage.getItem('pb-painel-v1')) || {};
      return (c.psicologos || []).map(p => ({ ...p, fotoUrl: p.foto && p.foto.data ? p.foto.data : '' }));
    } catch (e) { return []; }
  }
  const iniciais = n => String(n || '').split(/\s+/).filter(w => w.length > 2).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

  const [agendas, cadastros, ags] = await Promise.all([
    DB.listarPsicologos({ todos: true }),
    perfis(),
    DB.listarAgendamentos({ de: U.hojeISO() }).catch(() => [])
  ]);
  const porAgenda = Object.fromEntries(cadastros.filter(p => p.agendaId).map(p => [p.agendaId, p]));
  const hoje = U.hojeISO(), semana = U.addDias(hoje, 7);
  const cont = id => {
    const meus = ags.filter(a => a.psiId === id);
    return {
      hoje: meus.filter(a => a.data === hoje && ['confirmado', 'realizado', 'falta'].includes(a.status)).length,
      semana: meus.filter(a => a.data <= semana && a.status === 'confirmado').length,
      pre: new Set(meus.filter(a => a.status === 'pendente').map(a => a.grupo)).size
    };
  };
  const lista = agendas.map(a => ({ ...a, perfil: porAgenda[a.id] || null, n: cont(a.id) }))
    .sort((x, y) => (x.nome || '').localeCompare(y.nome || '', 'pt-BR'));

  const POR_PAGINA = 12;   /* 12 psicólogos por página */
  let pagina = 1;
  $('#psi-qtd').textContent = lista.length || '';
  function render() {
    const q = U.norm ? U.norm($('#psi-q').value) : $('#psi-q').value.toLowerCase();
    const f = $('#psi-filtro').value;
    const norm = s => (U.norm ? U.norm(s) : String(s || '').toLowerCase());
    const vis = lista.filter(p => (!q || norm(`${p.nome} ${p.crp}`).includes(q))
      && (!f || (f === 'ligada' && p.ativo && !p.pausada) || (f === 'desligada' && (!p.ativo || p.pausada)) || (f === 'pre' && p.n.pre)));
    const r = Paginacao.fatiar(vis, pagina, POR_PAGINA); pagina = r.pag;
    $('#psi-pag').innerHTML = Paginacao.html(r, ['psicólogo', 'psicólogos']);
    $('#psi-grade').innerHTML = vis.length ? r.itens.map(p => {
      const foto = p.perfil && p.perfil.fotoUrl;
      const trat = (p.perfil && p.perfil.tratamento) || 'Psicologia';
      return `<a class="psi-card${p.ativo ? '' : ' off'}" href="minha-agenda.html?psi=${encodeURIComponent(p.id)}#atendimentos">
        <span class="psi-foto">${foto ? `<img src="${esc(foto)}" alt="" loading="lazy">` : `<span>${esc(iniciais(p.nome))}</span>`}</span>
        <span class="psi-txt">
          <strong>${esc(p.nome || '—')}</strong>
          <small>${esc(trat)}${p.crp ? ' · CRP ' + esc(p.crp) : ''}</small>
          <span class="psi-tags">
            ${!p.ativo ? '<span class="psi-tag off">Acesso desativado</span>' : p.pausada ? '<span class="psi-tag pend">Agenda pausada</span>' : '<span class="psi-tag ok">Agenda ligada</span>'}
            ${p.n.pre ? `<span class="psi-tag pend">${p.n.pre} pré-reserva${p.n.pre > 1 ? 's' : ''}</span>` : ''}
          </span>
          <span class="psi-num"><b>${p.n.hoje}</b> hoje · <b>${p.n.semana}</b> nos próximos 7 dias</span>
        </span>
        <span class="psi-seta" aria-hidden="true">→</span>
      </a>`;
    }).join('') : `<div class="vazio"><strong>${lista.length ? 'Ninguém com esses filtros.' : 'Nenhum psicólogo com acesso à agenda ainda.'}</strong>${lista.length ? '' : 'Crie o acesso em Usuários (ou na ficha do psicólogo, em Perfis).'}</div>`;
  }
  $('#psi-q').addEventListener('input', () => { pagina = 1; render(); });
  $('#psi-filtro').addEventListener('change', () => { pagina = 1; render(); });
  Paginacao.ligar($('#psi-pag'), n => { pagina = n; render(); }, $('#psi-grade'));
  render();

  /* perfis que ainda não têm acesso à agenda */
  const sem = cadastros.filter(p => !p.agendaId || !agendas.some(a => a.id === p.agendaId));
  if (sem.length) {
    $('#psi-sem-acesso').innerHTML = `<details class="psi-sem"><summary>${sem.length} perfi${sem.length > 1 ? 's' : 'l'} sem acesso à agenda</summary>
      <p class="muted">Eles aparecem no site, mas ainda não marcam horários. Crie o acesso em <a href="conteudo.html#usuarios">Usuários</a>.</p>
      <ul>${sem.map(p => `<li>${esc(p.nome || 'Sem nome')}${p.crp ? ' · CRP ' + esc(p.crp) : ''}</li>`).join('')}</ul></details>`;
  }
})();
