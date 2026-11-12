/* =====================================================================
   CANDIDATURAS (administrador e suporte) — painel/candidaturas.html
   Psicólogos que preencheram o cadastro da página /para-psicologos/.
     Com o Firebase: coleção "candidaturas" (o site só cria; a equipe lê,
                     muda a situação e exclui — veja firestore.rules).
     Modo teste:     localStorage "pb_candidaturas_v1" (mesmo navegador).
   ===================================================================== */
(async function () {
  const S = Auth.exigir(['candidaturas']);
  if (!S) return;
  const { $, esc } = U;
  const FB = DB.modo === 'firebase';
  const LOCAL = 'pb_candidaturas_v1';
  const POR_PAGINA = 9;
  const SITUACOES = { nova: 'Nova', analise: 'Em análise', aprovada: 'Aprovada', recusada: 'Recusada' };
  let lista = [], filtro = 'todas', pagina = 1;

  $('[data-sair]').onclick = () => Auth.sair();
  Auth.menuAreas($('[data-areas]'), 'candidaturas');

  /* ---------- dados ---------- */
  async function nuvem() { return NUVEM.authPronta(); }
  async function carregar() {
    if (FB) {
      const { fs, db } = await nuvem();
      const snap = await fs.getDocs(fs.collection(db, 'candidaturas'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((x, y) => (y.em || 0) - (x.em || 0));
    }
    try { return JSON.parse(localStorage.getItem(LOCAL)) || []; } catch (e) { return []; }
  }
  function gravarLocal() { localStorage.setItem(LOCAL, JSON.stringify(lista)); }
  async function mudarStatus(id, status) {
    const c = lista.find(x => x.id === id); if (!c) return;
    const extra = { status, atualizado: Date.now(), por: S.nome || '' };
    if (FB) { const { fs, db } = await nuvem(); await fs.updateDoc(fs.doc(db, 'candidaturas', id), extra); }
    Object.assign(c, extra);
    if (!FB) gravarLocal();
  }
  async function excluir(id) {
    if (FB) { const { fs, db } = await nuvem(); await fs.deleteDoc(fs.doc(db, 'candidaturas', id)); }
    lista = lista.filter(x => x.id !== id);
    if (!FB) gravarLocal();
  }

  /* ---------- tela ---------- */
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const iniciais = n => String(n || '').split(/\s+/).filter(w => w.length > 2).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '•';
  const quando = ms => {
    if (!ms) return '';
    const d = new Date(ms), dias = Math.floor((Date.now() - ms) / 864e5);
    const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (dias < 1 && new Date().getDate() === d.getDate()) return 'hoje, ' + hora;
    if (dias < 2) return 'ontem, ' + hora;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const zapFmt = n => { const d = String(n || '').replace(/\D/g, ''); return d.length >= 10 ? `(${d.slice(0, 2)}) ${d.slice(2, -4)}-${d.slice(-4)}` : d; };
  const zapLink = c => {
    const d = String(c.whatsapp || '').replace(/\D/g, '');
    const txt = `Olá, ${String(c.nome || '').split(' ')[0]}! Aqui é da equipe Psicólogos Brasil. Recebemos o seu cadastro para atender com a gente e queremos marcar uma conversa rápida.`;
    return `https://api.whatsapp.com/send?phone=${d.length <= 11 ? '55' + d : d}&text=${encodeURIComponent(txt)}`;
  };
  const linkSeguro = l => {
    l = String(l || '').trim(); if (!l) return '';
    if (/^@[\w.]+$/.test(l)) return `<a href="https://instagram.com/${esc(l.slice(1))}" target="_blank" rel="noopener">${esc(l)}</a>`;
    if (/^https?:\/\//i.test(l)) return `<a href="${esc(l)}" target="_blank" rel="noopener noreferrer">${esc(l.replace(/^https?:\/\/(www\.)?/i, ''))}</a>`;
    return esc(l);
  };

  function filtrada() {
    const q = norm($('#cd-q').value.trim());
    return lista.filter(c => (filtro === 'todas' || (c.status || 'nova') === filtro) &&
      (!q || norm([c.nome, c.crp, c.email, c.abordagem, (c.temas || []).join(' ')].join(' ')).includes(q)));
  }

  function card(c) {
    const st = c.status || 'nova';
    const semEpsi = /ainda n/i.test(c.epsi || '');
    return `<article class="cd-card ${st}" data-id="${esc(c.id)}">
      <div class="cd-topo"><span class="cd-ava" aria-hidden="true">${esc(iniciais(c.nome))}</span>
        <div class="cd-nome"><b>${esc(c.nome)}</b><small>CRP ${esc(c.crp || '-')} · ${esc(quando(c.em))}</small></div>
        <span class="cd-pill ${st}">${SITUACOES[st] || st}</span></div>
      <dl class="cd-dados">
        <dt>e-Psi</dt><dd class="${semEpsi ? 'alerta' : ''}">${esc(c.epsi || '-')}</dd>
        <dt>Abordagem</dt><dd>${esc(c.abordagem || '-')}</dd>
        <dt>Atuação</dt><dd>${esc(c.experiencia || '-')}</dd>
        <dt>E-mail</dt><dd><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></dd>
        <dt>WhatsApp</dt><dd>${esc(zapFmt(c.whatsapp))}</dd>
        ${c.link ? `<dt>Link</dt><dd>${linkSeguro(c.link)}</dd>` : ''}
      </dl>
      ${(c.temas || []).length ? `<div class="cd-temas">${c.temas.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
      ${c.mensagem ? `<p class="cd-msg">${esc(c.mensagem)}</p>` : ''}
      <div class="cd-acoes">
        <a class="btn btn-whats btn-peq" href="${zapLink(c)}" target="_blank" rel="noopener">WhatsApp</a>
        <select data-status aria-label="Situação de ${esc(c.nome)}">${Object.entries(SITUACOES).map(([k, v]) => `<option value="${k}"${k === st ? ' selected' : ''}>${v}</option>`).join('')}</select>
        <button class="btn btn-perigo btn-peq" type="button" data-excluir>Excluir</button>
      </div>
    </article>`;
  }

  function render() {
    const cont = { todas: lista.length };
    Object.keys(SITUACOES).forEach(k => { cont[k] = lista.filter(c => (c.status || 'nova') === k).length; });
    $('#cd-status').innerHTML = [['todas', 'Todas'], ...Object.entries(SITUACOES)].map(([k, v]) =>
      `<button type="button" role="tab" data-f="${k}" aria-selected="${k === filtro}">${v}<b>${cont[k]}</b></button>`).join('');
    $('#cd-qtd').textContent = cont.nova ? `${cont.nova} nova${cont.nova > 1 ? 's' : ''}` : '';
    const l = filtrada();
    const r = Paginacao.fatiar(l, pagina, POR_PAGINA); pagina = r.pag;
    $('#cd-lista').innerHTML = r.itens.length ? r.itens.map(card).join('')
      : `<p class="cd-vazio">${lista.length ? 'Nenhuma candidatura com esse filtro.' : 'Nenhuma candidatura ainda. Quando um psicólogo se cadastrar pela página Para psicólogos, ele aparece aqui.'}</p>`;
    $('#cd-pag').innerHTML = Paginacao.html(r, ['candidatura', 'candidaturas']);
  }

  $('#cd-status').addEventListener('click', e => {
    const b = e.target.closest('[data-f]'); if (!b) return;
    filtro = b.dataset.f; pagina = 1; render();
  });
  $('#cd-q').addEventListener('input', () => { pagina = 1; render(); });
  Paginacao.ligar($('#cd-pag'), n => { pagina = n; render(); }, $('#cd-lista'));

  $('#cd-lista').addEventListener('change', async e => {
    const sel = e.target.closest('[data-status]'); if (!sel) return;
    const id = sel.closest('[data-id]').dataset.id;
    sel.disabled = true;
    try { await mudarStatus(id, sel.value); U.toast('Situação atualizada: ' + SITUACOES[sel.value] + '.'); render(); }
    catch (err) { console.error(err); U.toast(FB && /permission/i.test(err.code || err.message) ? 'Sem permissão. Publique de novo o firestore.rules no Firebase.' : 'Não consegui salvar. Tente de novo.', 'erro'); sel.disabled = false; }
  });
  $('#cd-lista').addEventListener('click', async e => {
    const b = e.target.closest('[data-excluir]'); if (!b) return;
    const id = b.closest('[data-id]').dataset.id;
    const c = lista.find(x => x.id === id);
    if (!(await Auth.confirmar(`Excluir a candidatura de ${c ? c.nome : ''}?`, 'Os dados do cadastro são apagados de vez.', { ok: 'Excluir', perigo: true, icone: 'lixo' }))) return;
    try { await excluir(id); U.toast('Candidatura excluída.'); render(); }
    catch (err) { console.error(err); U.toast('Não consegui excluir. Tente de novo.', 'erro'); }
  });

  try { lista = await carregar(); }
  catch (e) {
    console.error(e);
    $('#cd-lista').innerHTML = `<p class="cd-vazio">Não consegui ler as candidaturas. ${FB ? 'Confira se o firestore.rules novo foi publicado no Firebase.' : ''}</p>`;
    return;
  }
  render();
})();
