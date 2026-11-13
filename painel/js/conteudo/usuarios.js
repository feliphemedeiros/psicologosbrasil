/* Usuários: equipe, editar papel e acessos extras, senha provisória e registro de Atividades.
   Usado pelas páginas psicologos.html, artigos.html, usuarios.html e config.html. Os arquivos rodam em ordem e dividem as mesmas variáveis. */
/* =============== Equipe e acessos (Firebase, só administrador) =============== */
const PAPEL_NOME = { admin: 'Administrador', suporte: 'Suporte', psicologo: 'Psicólogo(a)' };
async function equipeRender() {
  const box = $('#equipe-lista'); if (!box || !DB.equipe) return;
  try {
    const eu = (Auth.sessao() || {}).uid;
    if (!equipeRender.ligado) {
      equipeRender.ligado = true;
      $('#eq-q').addEventListener('input', () => { EQ_F.pag = 1; equipeDesenhar(); });
      $('#eq-fpapel').addEventListener('change', () => { EQ_F.pag = 1; equipeDesenhar(); });
      $('#pagUsuarios').addEventListener('click', e => { const b = e.target.closest('button[data-pag]'); if (!b || b.disabled) return; EQ_F.pag = Number(b.dataset.pag); equipeDesenhar(); const y = box.getBoundingClientRect().top + scrollY - 150; if (y < scrollY) scrollTo({ top: y, behavior: 'smooth' }); });
    }
    EQ_LISTA = (await DB.equipe.listar()).sort((a, b) => (a.uid === eu ? -1 : b.uid === eu ? 1 : 0) || ({ admin: 0, suporte: 1, psicologo: 2 }[a.papel] ?? 3) - ({ admin: 0, suporte: 1, psicologo: 2 }[b.papel] ?? 3) || (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
    $('#qtdUsuariosT').textContent = EQ_LISTA.length;
    equipeDesenhar();
  } catch (e) { box.innerHTML = `<p class="eq-vazio">Não consegui carregar a equipe: ${esc(e.message || '')}</p>`; }
}
let EQ_LISTA = [];
const EQ_F = { pag: 1 };
const EQ_POR_PAG = 9;   /* usuários: 9 caixinhas por página */
function equipeDesenhar() {
  const box = $('#equipe-lista'), eu = (Auth.sessao() || {}).uid;
  const n = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const q = n($('#eq-q').value.trim()), fp = $('#eq-fpapel').value;
  const l = EQ_LISTA.filter(u => (!q || n(`${u.nome} ${u.email}`).includes(q)) && (!fp || (fp === 'off' ? u.ativo === false : u.papel === fp)));
  const tot = Math.max(1, Math.ceil(l.length / EQ_POR_PAG)); if (EQ_F.pag > tot) EQ_F.pag = tot;
  const ini = (EQ_F.pag - 1) * EQ_POR_PAG, r = { itens: l.slice(ini, ini + EQ_POR_PAG), total: l.length, paginas: tot, ini, por: EQ_POR_PAG };
  $('#pagUsuarios').innerHTML = htmlPaginacao(r, EQ_F, ['usuário', 'usuários']);
  const ini2 = nome => String(nome || '?').split(/\s+/).filter(w => w.length > 2).slice(0, 2).map(w => w[0]).join('').toUpperCase() || String(nome || '?')[0].toUpperCase();
  const souPrincipal = !!EQ_LISTA.find(x => x.principal && x.uid === eu);
  const mexeEm = u => u.uid !== eu && !u.principal && (u.papel !== 'admin' || souPrincipal);   /* administradores: só o principal mexe */
  box.innerHTML = !EQ_LISTA.length ? '<p class="eq-vazio">Ninguém cadastrado ainda.</p>' : !l.length ? '<p class="eq-vazio">Ninguém com essa busca.</p>' : r.itens.map(u => `<div class="eq-card${u.ativo === false ? ' off' : ''}${u.uid === eu ? ' eu' : ''}">${u.ativo === false ? `<div class="eq-off-faixa">Desativado · ${u.papel === 'psicologo' ? 'fora do site e ' : ''}sem login</div>` : ''}
      <div class="eq-card-topo"><span class="eq-ava p-${esc(u.papel || '')}" aria-hidden="true">${esc(ini2(u.nome))}</span>
      <div class="eq-quem"><b>${esc(u.nome || '—')}${u.uid === eu ? ' (você)' : ''}</b><small title="${esc(u.email || '')}">${esc(u.email || '')}</small>
        <div class="eq-tags"><span class="eq-tag${u.papel === 'suporte' ? ' eq-nivel n1' : ''}" ${u.papel === 'suporte' ? `title="${esc(Auth.DESC_SUPORTE)}"` : ''}>${PAPEL_NOME[u.papel] || esc(u.papel || '?')}</span>${u.papel === 'suporte' ? Auth.extrasDe(u).map(k => `<span class="eq-tag eq-extra" title="${esc(Auth.EXTRAS[k].desc)}">+ ${esc(Auth.EXTRAS[k].nome)}</span>`).join('') : ''}${u.ativo === false ? '<span class="eq-tag off">Desativado</span>' : ''}</div></div></div>
      <div class="eq-acoes">
        ${mexeEm(u) && ['admin', 'suporte'].includes(u.papel) && DB.equipe.editar ? `<button type="button" class="btn pequeno" data-eq-editar="${esc(u.uid)}">Editar</button>` : ''}
        ${['admin', 'suporte'].includes(u.papel) && DB.atividades ? `<button type="button" class="btn pequeno" data-eq-ativ="${esc(u.uid)}">Atividades</button>` : ''}
        ${mexeEm(u) && u.papel === 'suporte' && SESSAO.papel === 'admin' && DB.equipe.senhaProvisoria ? `<button type="button" class="btn pequeno" data-eq-provisoria="${esc(u.uid)}" title="Define uma senha provisória: no próximo login a pessoa cria a dela">Trocar senha</button>` : ''}
        ${u.email && DB.modo === 'firebase' ? `<button type="button" class="btn pequeno" data-eq-senha="${esc(u.email)}">Enviar link de nova senha</button>` : ''}
        ${!mexeEm(u) ? '' : `<button type="button" class="btn pequeno ${u.ativo === false ? '' : 'perigo'}" data-eq-ativo="${esc(u.uid)}" data-v="${u.ativo === false ? '1' : '0'}">${u.ativo === false ? 'Reativar' : 'Desativar'}</button>`}
        ${u.uid === eu ? '<a class="btn pequeno" href="conta.html">Minha conta</a>' : ''}
        ${mexeEm(u) && ['admin', 'suporte'].includes(u.papel) ? `<button type="button" class="btn pequeno perigo" data-eq-excluir="${esc(u.uid)}">Excluir</button>` : ''}
        ${u.papel === 'psicologo' && psiDoUsuario(u) ? `<button type="button" class="btn pequeno" data-eq-ficha="${esc(u.psiId || u.uid)}">Abrir ficha</button>` : ''}
        ${u.principal ? '<span class="eq-tag eq-principal" title="Não pode ser excluído nem desativado">Principal</span>' : ''}
      </div></div>`).join('');
}
/* janela com os dados para passar à pessoa (contratação ou senha esquecida) */
function eqPassarAcesso(primeiro, email, senha, novo, whatsapp) {
  const FB = DB.modo === 'firebase';
  /* botão verde: manda login e senha provisória pelo WhatsApp da pessoa, com a mensagem pronta */
  const endereco = new URL('index.html', location.href).href.replace(/index\.html$/, '');
  const msg = `Olá, ${primeiro}! Aqui é ${U.primeiroNome(SESSAO.nome || '')}, da Psicólogos Brasil 😊\n\n`
    + `${novo ? 'Seu acesso ao painel foi criado' : 'Criei uma senha provisória para você entrar no painel'}:\n\n`
    + `Endereço: ${endereco}\nLogin: ${email}\nSenha provisória: ${senha}\n\n`
    + `No primeiro acesso, o painel pede para você criar uma senha só sua.`
    + (FB && novo ? ' Também vai pedir para ativar o app autenticador pelo código QR.' : '');
  Auth.janela({
    titulo: novo ? `Acesso de ${primeiro} criado` : `Senha provisória de ${primeiro} definida`,
    texto: `Passe para ${primeiro}:`,
    dados: [{ rotulo: 'Login', valor: email }, { rotulo: 'Senha provisória', valor: senha, destaque: true }],
    textoDepois: 'Como fica:\n1. ' + primeiro + ' entra no painel com esses dados.\n2. O painel pede para criar uma senha própria antes de qualquer coisa.\n3. Depois disso, nem a equipe sabe a senha.' +
      (FB && novo ? '\n\nNo primeiro login também é preciso ativar o app autenticador pelo código QR.' : ''),
    whats: whatsapp === undefined ? null : U.digitos(whatsapp) ? { link: U.linkWhats(whatsapp, msg), rotulo: `Enviar para ${primeiro} pelo WhatsApp` } : { semNumero: `${primeiro} não tem WhatsApp cadastrado: copie os dados acima e envie por outro meio.` },
    ok: 'Entendi', semCancelar: true, icone: 'ok'
  });
}
/* Editar nome e e-mail de um administrador ou suporte */
const souPrincipalEq = () => { const eu = (Auth.sessao() || {}).uid; return !!EQ_LISTA.find(x => x.principal && x.uid === eu); };
async function eqEditar(u) {
  if (!u) return;
  const r = await Auth.formulario({
    titulo: `Editar ${String(u.nome || 'usuário').split(' ')[0]}`,
    texto: DB.modo === 'firebase' ? 'Se mudar o e-mail, a pessoa passa a entrar com o e-mail novo.' : 'Se mudar o e-mail, a pessoa passa a entrar com o e-mail novo.',
    campos: [
      { nome: 'nome', rotulo: 'Nome', valor: u.nome || '' },
      { nome: 'email', rotulo: 'E-mail (é com ele que a pessoa entra)', tipo: 'email', valor: u.email || '' },
      ...(souPrincipalEq() ? [{ nome: 'papel', rotulo: 'Papel', tipo: 'select', valor: u.papel, opcoes: [{ valor: 'suporte', texto: 'Suporte' }, { valor: 'admin', texto: 'Administrador (vê e muda tudo)' }],
        ajuda: 'Só você, o administrador principal, muda o papel de alguém.' }] : []),
      { nome: 'extras', rotulo: 'Acessos extras do suporte', tipo: 'checks', valor: Auth.extrasDe(u), mostrarSe: souPrincipalEq() ? { campo: 'papel', valor: 'suporte' } : null,
        ajuda: 'O suporte sempre vê a Agenda e os atendimentos e a disponibilidade dos psicólogos. Marque o que mais esta pessoa pode ver.',
        opcoes: Object.entries(Auth.EXTRAS).map(([valor, x]) => ({ valor, texto: x.nome, ajuda: x.desc })) }
    ].filter(c => c.nome !== 'extras' || u.papel === 'suporte' || souPrincipalEq()).map(c => (c.mostrarSe === null ? { ...c, mostrarSe: undefined } : c)),
    ok: 'Salvar',
    aoEnviar: v => DB.equipe.editar(u.uid, { ...v, papel: v.papel || u.papel, extras: (v.papel || u.papel) === 'suporte' ? (v.extras || []) : [] })
  });
  if (!r) return;
  const virou = r.papel && r.papel !== u.papel;
  toast(virou ? `${r.nome.split(' ')[0]} agora é ${r.papel === 'admin' ? 'administrador' : 'suporte'}. Vale a partir do próximo login.` : `${r.nome.split(' ')[0]} atualizado. Os acessos valem a partir da próxima tela que a pessoa abrir.`, 'ok');
  await equipeRender();
}
/* ---------- Registro de atividades (aba "Atividades" em Usuários) ----------
   Prévia: no modo teste, DB.atividades.listar() junta o histórico das sessões com o que foi feito
   neste navegador. Na versão com servidor, a mesma tela lê a tabela pb_atividades. */
const AT_TIPOS = { pagamento: 'Pagamentos confirmados', remarcacao: 'Remarcações', cancelamento: 'Cancelamentos', status: 'Situação das sessões', lembrete: 'Lembretes',
  repasse: 'Repasses', paciente: 'Pacientes', psicologo: 'Psicólogos', usuarios: 'Usuários e acessos', acesso: 'Entradas no painel' };
const AT_F = { pag: 1 };
const AT_POR_PAG = 25;
let AT_LISTA = [];
function eqAba(aba) {
  $$('[data-eq-aba]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.eqAba === aba)));
  $('#eq-painel-pessoas').hidden = aba !== 'pessoas';
  $('#eq-painel-ativ').hidden = aba !== 'atividades';
  $('#eq-ir-novo').style.display = aba === 'pessoas' ? '' : 'none';
  if (aba === 'atividades') atCarregar();
}
async function atCarregar() {
  const box = $('#at-lista');
  if (!DB.atividades) { box.innerHTML = '<p class="eq-vazio">O registro de atividades chega com a versão do servidor (MariaDB).</p>'; return; }
  try { AT_LISTA = await DB.atividades.listar(); } catch (e) { box.innerHTML = `<p class="eq-vazio">Não consegui carregar: ${esc(e.message || '')}</p>`; return; }
  /* pessoas: a equipe cadastrada + quem aparece no registro */
  const sel = $('#at-quem'), atual = sel.value;
  const pessoas = new Map();
  EQ_LISTA.filter(u => ['admin', 'suporte'].includes(u.papel)).forEach(u => pessoas.set(u.uid, u.nome));
  AT_LISTA.forEach(a => { const k = a.quemId || 'n:' + a.quemNome; if (!pessoas.has(k) && !(a.quemId && pessoas.has(a.quemId))) pessoas.set(k, a.quemNome); });
  sel.innerHTML = '<option value="">Todas as pessoas</option>' + [...pessoas].sort((x, y) => String(x[1]).localeCompare(String(y[1]), 'pt-BR')).map(([k, n]) => `<option value="${esc(k)}">${esc(n)}</option>`).join('');
  if ([...sel.options].some(o => o.value === atual)) sel.value = atual;
  const st = $('#at-tipo'), tAtual = st.value;
  st.innerHTML = '<option value="">Todas as ações</option>' + Object.entries(AT_TIPOS).map(([k, t]) => `<option value="${k}">${t}</option>`).join('');
  st.value = tAtual;
  [sel, st].forEach(x => x.dispatchEvent(new Event('pc-sync')));
  atDesenhar();
}
function atDesenhar() {
  const box = $('#at-lista');
  const n = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const q = n($('#at-q').value.trim()), quem = $('#at-quem').value, tipo = $('#at-tipo').value, dias = Number($('#at-periodo').value || 0);
  const hoje0 = new Date(); hoje0.setHours(0, 0, 0, 0);
  const desde = dias ? hoje0.getTime() - (dias - 1) * 864e5 : 0;
  const l = AT_LISTA.filter(a => a.em >= desde && (!tipo || a.tipo === tipo)
    && (!quem || (quem.startsWith('n:') ? a.quemNome === quem.slice(2) : a.quemId === quem || (!a.quemId && a.quemNome === (EQ_LISTA.find(u => u.uid === quem) || {}).nome)))
    && (!q || n(`${a.quemNome} ${a.acao} ${a.alvo}`).includes(q)));
  const tot = Math.max(1, Math.ceil(l.length / AT_POR_PAG)); if (AT_F.pag > tot) AT_F.pag = tot;
  const ini = (AT_F.pag - 1) * AT_POR_PAG, r = { itens: l.slice(ini, ini + AT_POR_PAG), total: l.length, paginas: tot, ini, por: AT_POR_PAG };
  $('#pagAtiv').innerHTML = htmlPaginacao(r, AT_F, ['atividade', 'atividades']);
  if (!l.length) { box.innerHTML = `<p class="eq-vazio">Nada${quem || tipo || q ? ' com esses filtros' : ''} ${dias === 1 ? 'hoje' : dias ? `nos últimos ${dias} dias` : 'registrado ainda'}.</p>`; return; }
  const ini2 = t => String(t || '?').split(/\s+/).filter(w => w.length > 2).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
  const dia = ms => { const d = new Date(ms), x = new Date(ms); x.setHours(0, 0, 0, 0); const dif = Math.round((hoje0 - x) / 864e5); return dif === 0 ? 'Hoje' : dif === 1 ? 'Ontem' : d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }); };
  const hora = ms => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const PAP = { admin: 'Administrador', suporte: 'Suporte', psicologo: 'Psicólogo(a)' };
  let ult = '';
  box.innerHTML = r.itens.map(a => {
    const d = dia(a.em), cab = d !== ult ? `<p class="at-dia">${esc(d)}</p>` : ''; ult = d;
    const mud = a.antes && a.depois ? `<dl class="at-mud">${Object.keys(a.depois).map(k => `<dt>${esc(k)}</dt><dd><del>${esc(a.antes[k] ?? '—')}</del> → <ins>${esc(a.depois[k] ?? '—')}</ins></dd>`).join('')}</dl>` : '';
    return `${cab}<details class="at-lin"><summary>
      <span class="at-hora">${hora(a.em)}</span>
      <span class="at-ava p-${esc(a.quemPapel || '')}" aria-hidden="true">${esc(ini2(a.quemNome))}</span>
      <span class="at-txt"><b>${esc(a.quemNome || 'Sistema')}</b>${a.quemPapel ? `<span class="at-papel">${esc(PAP[a.quemPapel] || a.quemPapel)}</span>` : ''}
        <span class="at-acao">${esc(a.acao)}</span>${a.alvo ? `<small>${esc(a.alvo)}</small>` : ''}</span>
      <span class="at-seta" aria-hidden="true">›</span></summary>
      <div class="at-det">${mud}
        <span>${esc(AT_TIPOS[a.tipo] || 'Outros')} · ${new Date(a.em).toLocaleString('pt-BR')}${a.origem === 'sessao' ? ' · tirado do histórico da sessão' : ''}</span>
        <span>IP e aparelho: ${a.aparelho ? esc(a.aparelho) + ' · ' : ''}o IP é gravado pelo servidor na versão final.</span></div></details>`;
  }).join('');
}
/* "Atividades" no cartão de uma pessoa: abre a aba já filtrada por ela, nos últimos 30 dias */
async function atAbrir(uid) {
  eqAba('atividades');
  await atCarregar();
  $('#at-quem').value = uid; $('#at-periodo').value = '30'; $('#at-q').value = ''; $('#at-tipo').value = '';
  ['#at-quem', '#at-periodo', '#at-tipo'].forEach(x => $(x).dispatchEvent(new Event('pc-sync')));
  AT_F.pag = 1; atDesenhar();
  $('.eq-abas').scrollIntoView({ block: 'start', behavior: 'smooth' });
}
function atIniciar() {
  $$('[data-eq-aba]').forEach(b => b.addEventListener('click', () => eqAba(b.dataset.eqAba)));
  let t = null;
  $('#at-q').addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { AT_F.pag = 1; atDesenhar(); }, 150); });
  ['#at-quem', '#at-periodo', '#at-tipo'].forEach(x => $(x).addEventListener('change', () => { AT_F.pag = 1; atDesenhar(); }));
  $('#pagAtiv').addEventListener('click', e => { const b = e.target.closest('button[data-pag]'); if (!b || b.disabled) return; AT_F.pag = Number(b.dataset.pag); atDesenhar(); $('.eq-abas').scrollIntoView({ block: 'start' }); });
}
/* Senha provisória: o administrador define, a pessoa troca no próximo login */
async function eqProvisoria(u) {
  if (!u) return;
  const primeiro = String(u.nome || 'a pessoa').split(' ')[0];
  const psi = u.papel === 'psicologo';
  const r = await Auth.formulario({
    titulo: `Senha provisória para ${primeiro}`,
    texto: `Use quando ${primeiro} esquecer a senha ou não conseguir entrar. No próximo login, o painel pede para ${primeiro} criar uma senha própria. A senha atual deixa de funcionar na hora.`,
    icone: 'editar',
    campos: [{ nome: 'senha', rotulo: 'Senha provisória', valor: Auth.gerarSenha(), gerar: true, ajuda: `Pelo menos ${psi ? 6 : 8} caracteres. Já vem uma gerada; pode trocar.` }],
    ok: 'Definir senha',
    aoEnviar: v => psi ? DB.definirSenhaPsicologo(u.psiId || u.uid, v.senha) : DB.equipe.senhaProvisoria(u.uid, v.senha)
  });
  if (!r) return;
  let zap = u.whatsapp || '';
  if (psi && !zap) { try { zap = ((await DB.obterPsicologo(u.psiId || u.uid)) || {}).whatsapp || ''; } catch (e) { zap = ''; } }
  eqPassarAcesso(primeiro, u.email || '', r.senha, false, psi ? zap : (u.whatsapp || undefined));
}
/* perfis que ainda não têm acesso (para criar o acesso de psicólogo em Usuários) */
function equipePerfis() {
  const sel = $('#eq-perfil'); if (!sel) return;
  const livres = state.psicologos.filter(p => !agendaDe(p)).sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
  sel.innerHTML = livres.length
    ? livres.map(p => `<option value="${esc(p.id)}">${esc(p.nome || 'Sem nome')}${p.crp ? ' · CRP ' + esc(p.crp) : ''}</option>`).join('')
    : '<option value="">Todos os perfis já têm acesso — crie um perfil novo em Perfis</option>';
}
function equipePapel() {
  const psi = $('#eq-papel').value === 'psicologo';
  $('#eq-perfil-campo').hidden = !psi;
  $('#eq-nome').closest('.campo').hidden = psi;   /* o nome vem do perfil */
  if (psi) equipePerfis();
}
function equipeIniciar() {
  const eqModal = $('#eq-modal');
  let eqVoltar = null;
  const eqFechar = () => { eqModal.hidden = true; document.removeEventListener('keydown', eqTecla, true); if (eqVoltar) eqVoltar.focus(); };
  function eqTecla(e) { if (e.key === 'Escape' && !document.getElementById('pb-sair')) { e.preventDefault(); eqFechar(); } }
  $('#eq-ir-novo').addEventListener('click', () => {
    eqVoltar = document.activeElement;
    { const op = $('#eq-papel option[value="admin"]'); if (op) { op.disabled = op.hidden = !souPrincipalEq(); if (op.disabled && $('#eq-papel').value === 'admin') $('#eq-papel').value = 'suporte'; } }
    equipePapel(); eqModal.hidden = false;
    document.addEventListener('keydown', eqTecla, true);
    const c = ['#eq-papel', '#eq-nome'].map(x => $(x)).find(el => el && el.offsetParent); if (c) c.focus();
  });
  $('#eq-modal-x').addEventListener('click', eqFechar);
  $('#eq-cancelar').addEventListener('click', eqFechar);
  eqModal.addEventListener('click', e => { if (e.target === eqModal) eqFechar(); });
  equipeIniciar.fechar = eqFechar;
  const g = $('#cfg-equipe'); if (!g || !DB.equipe) return;
  if (DB.modo !== 'firebase') {
    $('#eq-intro').innerHTML = '<b>Modo teste:</b> as contas ficam só neste navegador e entram com o e-mail e a senha. Com o Firebase, todos entram com e-mail, senha e o código do app autenticador.';
    $('#eq-nota').textContent = 'No modo teste não há envio de e-mail: a pessoa já pode entrar com a senha provisória. No primeiro acesso, o painel pede para ela criar a dela.';
  }
  $('#eq-papel').addEventListener('change', equipePapel);
  equipePapel();
  equipeRender();
  $('#equipe-lista').addEventListener('click', async e => {
    const bs = e.target.closest('[data-eq-senha]'), ba = e.target.closest('[data-eq-ativo]'), bx = e.target.closest('[data-eq-excluir]'), bf = e.target.closest('[data-eq-ficha]');
    if (bf) { location.href = 'psicologos.html#a:' + encodeURIComponent(bf.dataset.eqFicha); return; }
    const be = e.target.closest('[data-eq-editar]'), bp = e.target.closest('[data-eq-provisoria]');
    if (be) { eqEditar(EQ_LISTA.find(x => x.uid === be.dataset.eqEditar)); return; }
    const bat = e.target.closest('[data-eq-ativ]');
    if (bat) { atAbrir(bat.dataset.eqAtiv); return; }
    if (bp) { eqProvisoria(EQ_LISTA.find(x => x.uid === bp.dataset.eqProvisoria)); return; }
    try {
      if (bx) {
        const card = bx.closest('.eq-card'), quem = card ? card.querySelector('.eq-quem b').textContent : 'este usuário';
        if (!(await Auth.confirmar(`Excluir ${quem}?`, 'O acesso é apagado de vez: a pessoa não entra mais no painel. Para só pausar, use “Desativar”.', { ok: 'Excluir', perigo: true, icone: 'lixo' }))) return;
        bx.disabled = true; await DB.equipe.excluir(bx.dataset.eqExcluir);
        toast(`${quem} foi excluído.`, 'ok');
        await equipeRender(); return;
      }
      if (bs) { bs.disabled = true; await DB.equipe.novaSenha(bs.dataset.eqSenha); toast(`Link para criar nova senha enviado para ${bs.dataset.eqSenha}.`, 'ok'); bs.disabled = false; }
      if (ba) {
        const ligar = ba.dataset.v === '1';
        const quem = (ba.closest('.eq-card') && ba.closest('.eq-card').querySelector('.eq-quem b')) ? ba.closest('.eq-card').querySelector('.eq-quem b').textContent : 'este acesso';
        /* psicólogo com perfil: desativa/reativa o perfil no site e o login juntos (igual à ficha) */
        const uEq = EQ_LISTA.find(x => x.uid === ba.dataset.eqAtivo), pPsi = uEq && uEq.papel === 'psicologo' ? psiDoUsuario(uEq) : null;
        if (pPsi) {
          if (!(await Auth.confirmar(ligar ? `Reativar ${quem}?` : `Desativar ${quem}?`, textoDesativar(pPsi, !ligar), { ok: ligar ? 'Reativar' : 'Desativar', perigo: !ligar }))) return;
          ba.disabled = true; await aplicarDesativado(pPsi, !ligar);
          toast(ligar ? `${quem} reativado: voltou para o site e o login funciona de novo.` : `${quem} desativado: saiu do site e o login não funciona mais.`, 'ok');
          await equipeRender(); return;
        }
        if (!ligar && !(await Auth.confirmar(`Desativar ${quem}?`, 'A pessoa não consegue mais entrar nem ver dados. Você pode reativar depois.', { ok: 'Desativar', perigo: true }))) return;
        if (ligar && !(await Auth.confirmar(`Reativar ${quem}?`, 'A pessoa volta a entrar no painel com o mesmo e-mail e senha.', { ok: 'Reativar' }))) return;
        ba.disabled = true; await DB.equipe.ativar(ba.dataset.eqAtivo, ligar); toast(ligar ? 'Acesso reativado.' : 'Acesso desativado.', 'ok');
        await equipeRender(); await atualizarAgendaMap(); renderListaPsicologos();
      }
    } catch (err) { toast(err.message || 'Não consegui fazer isso.', 'erro'); if (bs) bs.disabled = false; if (ba) ba.disabled = false; }
  });
  $('#eq-criar').addEventListener('click', async () => {
    const b = $('#eq-criar'); b.disabled = true;
    try {
      const papel = $('#eq-papel').value;
      const email = $('#eq-email').value.trim(), senha = $('#eq-senha').value;
      let primeiro;
      if (papel === 'psicologo') {
        /* mesmo caminho da ficha do perfil ("Acesso ao painel e agenda online") */
        const p = state.psicologos.find(x => x.id === $('#eq-perfil').value);
        if (!p) throw new Error('Escolha o perfil do psicólogo (crie antes em Perfis).');
        const minSenha = 6, usaPadrao = !senha;
        if (!U.emailValido(email)) throw new Error('Coloque um e-mail válido.');
        if (!usaPadrao && senha.length < minSenha) throw new Error(`A senha precisa ter pelo menos ${minSenha} caracteres.`);
        const id = p.agendaId || slugify(p.slug || p.nome) || p.id;
        await DB.salvarPsicologo({
          id, nome: p.nome.trim(), crp: (p.crp || '').trim(), abordagem: (p.abordagens || []).join(', '),
          email, whatsapp: U.whatsNormalizar(p.whats || ''), usuario: email.split('@')[0].toLowerCase(), senha: usaPadrao ? senhaPadrao(p.nome) : senha, senhaPadrao: true,
          valor: Number(p.valor) || AGC.valorPadrao, valorMensal: p.valorMensal || null, comissao: p.comissao ?? AGC.comissaoPadrao, ativo: !p.desativado, pausada: !!p.agendaPausada, doisFatores: true, salaMeet: normalizarSala(p.salaMeet), opp: (p.opp || '').trim()
        });
        p.agendaId = id; delete p.acessoRasc; marcarAlterado(p); salvarAgora();
        await atualizarAgendaMap(); renderListaPsicologos();
        primeiro = (p.nome || '').split(' ')[0];
      } else {
        const prov = senha || Auth.gerarSenha();
        if (prov.length < 8) throw new Error('A senha provisória precisa ter pelo menos 8 caracteres (ou deixe vazio para o painel gerar uma).');
        await DB.equipe.criar({ nome: $('#eq-nome').value, email, senha: prov, papel });
        primeiro = $('#eq-nome').value.trim().split(' ')[0];
        ['#eq-nome', '#eq-email', '#eq-senha'].forEach(id => { $(id).value = ''; });
        if (equipeIniciar.fechar) equipeIniciar.fechar();
        await equipeRender();
        eqPassarAcesso(primeiro, email, prov, true);
        return;
      }
      toast(DB.modo === 'firebase' ? `Acesso criado. ${primeiro} vai receber um e-mail para confirmar o endereço.` : `Acesso criado. ${primeiro} já pode entrar com o e-mail ${email} e a senha.`, 'ok');
      ['#eq-nome', '#eq-email', '#eq-senha'].forEach(id => { $(id).value = ''; });
      equipePapel();
      if (equipeIniciar.fechar) equipeIniciar.fechar();
      await equipeRender();
    } catch (err) { toast(err.message || 'Não consegui criar o acesso.', 'erro'); }
    finally { b.disabled = false; }
  });
}
