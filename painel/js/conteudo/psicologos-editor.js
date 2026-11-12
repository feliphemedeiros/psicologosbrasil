/* Psicólogos: formulário do perfil, Google Meet, listas/sitemap, abas e prévia do perfil.
   Usado pelas páginas psicologos.html, artigos.html, usuarios.html e config.html. Os arquivos rodam em ordem e dividem as mesmas variáveis. */
/* =============== PSICÓLOGOS =============== */
function novoPsicologo() {
  const p = { id: 'p' + Date.now(), nome: '', tratamento: 'Psicóloga', crp: '', slug: '', slugManual: false, foto: null, abordagens: [], especialidades: '', valor: '', duracao: 50, bio: '', whats: '', ativo: true, verificado: false, verificadoEm: '', temas: [], publico: ['Adultos'], idiomas: ['Português'], acessibilidade: [], titulo: '', citacao: '', passos: [], esperar: '', ambiente: null, criado: Date.now(), atualizado: Date.now(), geradoEm: null, alterado: false };
  state.psicologos.unshift(p); salvarAgora(); abrirPsicologo(p.id); renderListaPsicologos();
  setTimeout(() => $('#p-nome').focus(), 30);
}
function psiAtual() { return state.psicologos.find(x => x.id === atualP); }
const especialidadesDe = p => [...new Set([...(p.temas || []), ...String(p.especialidades || '').split(',').map(s => s.trim()).filter(Boolean)])];
const bioHtml = t => String(t || '').split(/\n\s*\n/).map(s => s.trim()).filter(Boolean).map(s => `<p>${esc(s).replace(/\n/g, '<br>')}</p>`).join('\n');
const primeiroNome = n => String(n || '').trim().split(/\s+/)[0] || '';

const SELO_PAINEL = '<svg class="selo-ok" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12.00 0.55 L12.74 0.74 L13.41 1.27 L13.99 2.00 L14.48 2.75 L14.93 3.37 L15.43 3.73 L16.03 3.82 L16.79 3.71 L17.67 3.52 L18.59 3.41 L19.44 3.52 L20.10 3.90 L20.48 4.56 L20.59 5.41 L20.48 6.33 L20.29 7.21 L20.18 7.97 L20.27 8.57 L20.63 9.07 L21.25 9.52 L22.00 10.01 L22.73 10.59 L23.26 11.26 L23.45 12.00 L23.26 12.74 L22.73 13.41 L22.00 13.99 L21.25 14.48 L20.63 14.93 L20.27 15.43 L20.18 16.03 L20.29 16.79 L20.48 17.67 L20.59 18.59 L20.48 19.44 L20.10 20.10 L19.44 20.48 L18.59 20.59 L17.67 20.48 L16.79 20.29 L16.03 20.18 L15.43 20.27 L14.93 20.63 L14.48 21.25 L13.99 22.00 L13.41 22.73 L12.74 23.26 L12.00 23.45 L11.26 23.26 L10.59 22.73 L10.01 22.00 L9.52 21.25 L9.07 20.63 L8.57 20.27 L7.97 20.18 L7.21 20.29 L6.33 20.48 L5.41 20.59 L4.56 20.48 L3.90 20.10 L3.52 19.44 L3.41 18.59 L3.52 17.67 L3.71 16.79 L3.82 16.03 L3.73 15.43 L3.37 14.93 L2.75 14.48 L2.00 13.99 L1.27 13.41 L0.74 12.74 L0.55 12.00 L0.74 11.26 L1.27 10.59 L2.00 10.01 L2.75 9.52 L3.37 9.07 L3.73 8.57 L3.82 7.97 L3.71 7.21 L3.52 6.33 L3.41 5.41 L3.52 4.56 L3.90 3.90 L4.56 3.52 L5.41 3.41 L6.33 3.52 L7.21 3.71 L7.97 3.82 L8.57 3.73 L9.07 3.37 L9.52 2.75 L10.01 2.00 L10.59 1.27 L11.26 0.74Z"/><path d="M7.6 12.4l3 3 5.8-6.2" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const TEMAS = [
  'Abuso físico ou emocional', 'Abuso sexual', 'Adolescência', 'Adoção de filho', 'Agressividade', 'Alcoolismo',
  'Ansiedade', 'Aposentadoria', 'Assédio moral', 'Assédio sexual', 'Autismo (TEA)', 'Autoconhecimento', 'Autoestima',
  'Bullying', 'Burnout', 'Carreira', 'Ciúmes', 'Compulsão alimentar', 'Conflitos familiares', 'Crise existencial',
  'Dependência química', 'Depressão', 'Dificuldades de aprendizagem', 'Divórcio e separação', 'Dor crônica', 'Estresse',
  'Fobias', 'Gestação e pós-parto', 'Identidade de gênero', 'Insônia', 'LGBTQIA+', 'Luto', 'Maternidade e paternidade',
  'Medos', 'Morar fora do Brasil', 'Orientação profissional', 'Pânico', 'Perfeccionismo', 'Procrastinação', 'Racismo',
  'Relacionamentos', 'Saúde da mulher', 'Sexualidade', 'Síndrome do impostor', 'Solidão', 'TDAH', 'Terapia de casal',
  'TOC', 'Transtorno alimentar', 'Transtorno bipolar', 'Trauma e estresse pós-traumático', 'Violência doméstica'
];
const PUBLICO = ['Crianças', 'Adolescentes', 'Adultos', 'Idosos', 'Casais', 'Famílias', 'LGBTQIA+'];
const IDIOMAS = ['Português', 'Inglês', 'Espanhol', 'Francês', 'Italiano', 'Alemão'];
const ACESS = ['Atendimento em Libras', 'Sessão por texto (chat)', 'Experiência com pessoas com deficiência'];
function renderChecks(el, itens, sel) {
  const todos = [...itens, ...(sel || []).filter(x => !itens.includes(x))];
  el.innerHTML = todos.map(x => `<label><input type="checkbox" value="${esc(x)}" ${(sel || []).includes(x) ? 'checked' : ''}> ${esc(x)}</label>`).join('');
}
const PASSOS_PADRAO = [
  { t: 'Fale comigo', x: 'Clique em agendar e mande uma mensagem pelo WhatsApp. A equipe confirma o melhor dia e horário para você.' },
  { t: 'Comece no seu ritmo', x: 'A primeira sessão é para nos conhecermos. Você conta o que está vivendo, sem pressa e sem julgamentos.' },
  { t: 'Cuide de você', x: 'Com encontros regulares por vídeo, construímos juntos caminhos para você se sentir melhor no dia a dia.' }
];
const ESPERAR_PADRAO = 'Sessões de 50 minutos por videochamada, de onde você estiver\nSigilo total, seguindo o Código de Ética do Conselho Federal de Psicologia\nUm espaço acolhedor e sem julgamentos para falar do que sente';
const SVG_SELO = '<svg class="pf-selo" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.00 0.55 L12.74 0.74 L13.41 1.27 L13.99 2.00 L14.48 2.75 L14.93 3.37 L15.43 3.73 L16.03 3.82 L16.79 3.71 L17.67 3.52 L18.59 3.41 L19.44 3.52 L20.10 3.90 L20.48 4.56 L20.59 5.41 L20.48 6.33 L20.29 7.21 L20.18 7.97 L20.27 8.57 L20.63 9.07 L21.25 9.52 L22.00 10.01 L22.73 10.59 L23.26 11.26 L23.45 12.00 L23.26 12.74 L22.73 13.41 L22.00 13.99 L21.25 14.48 L20.63 14.93 L20.27 15.43 L20.18 16.03 L20.29 16.79 L20.48 17.67 L20.59 18.59 L20.48 19.44 L20.10 20.10 L19.44 20.48 L18.59 20.59 L17.67 20.48 L16.79 20.29 L16.03 20.18 L15.43 20.27 L14.93 20.63 L14.48 21.25 L13.99 22.00 L13.41 22.73 L12.74 23.26 L12.00 23.45 L11.26 23.26 L10.59 22.73 L10.01 22.00 L9.52 21.25 L9.07 20.63 L8.57 20.27 L7.97 20.18 L7.21 20.29 L6.33 20.48 L5.41 20.59 L4.56 20.48 L3.90 20.10 L3.52 19.44 L3.41 18.59 L3.52 17.67 L3.71 16.79 L3.82 16.03 L3.73 15.43 L3.37 14.93 L2.75 14.48 L2.00 13.99 L1.27 13.41 L0.74 12.74 L0.55 12.00 L0.74 11.26 L1.27 10.59 L2.00 10.01 L2.75 9.52 L3.37 9.07 L3.73 8.57 L3.82 7.97 L3.71 7.21 L3.52 6.33 L3.41 5.41 L3.52 4.56 L3.90 3.90 L4.56 3.52 L5.41 3.41 L6.33 3.52 L7.21 3.71 L7.97 3.82 L8.57 3.73 L9.07 3.37 L9.52 2.75 L10.01 2.00 L10.59 1.27 L11.26 0.74Z"/><path d="M7.6 12.4l3 3 5.8-6.2" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const passosDe = p => PASSOS_PADRAO.map((d, i) => { const x = (p.passos || [])[i] || {}; return { t: (x.t || '').trim() || d.t, x: (x.x || '').trim() || d.x }; });
const esperarDe = p => linhas(p.esperar || ESPERAR_PADRAO);

function corpoPerfil(p, fotoSrc, ambSrc) {
  const esp = especialidadesDe(p), pn = esc(primeiroNome(p.nome)), nome = esc(p.nome || 'Nome do profissional');
  const prof = esc(p.tratamento) + (p.crp ? ` · CRP ${esc(p.crp)}` : '');
  const agendar = waLink(p.whats, `Olá! Quero agendar uma consulta com ${p.nome}.`);
  const valor = `Sessão de ${esc(p.duracao || 50)} min${p.valor ? ` · R$ ${Number(p.valor).toLocaleString('pt-BR')}` : ''}`;
  const selo = p.verificado ? `<span class="pf-verif" title="Perfil verificado: CRP conferido pela equipe Psicólogos Brasil">${SVG_SELO}<span class="pf-sr">Perfil verificado</span></span>` : '';
  const titulo = esc((p.titulo || '').trim() || `${p.tratamento} online para cuidar de você`);
  const citacao = esc((p.citacao || '').trim() || 'Estou aqui para ouvir, acolher e caminhar com você, para que a sua jornada fique mais leve e mais clara.');
  return `<div class="pf">
  <section class="pf-hero">
    <div class="wrap pf-hero-grid">
      <figure class="pf-foto">${fotoSrc ? `<img src="${fotoSrc}" alt="Foto de ${nome}" width="${p.foto.w}" height="${p.foto.h}" fetchpriority="high">` : `<span class="pf-foto-vazia">${esc((p.nome || '?')[0].toUpperCase())}</span>`}</figure>
      <div class="pf-hero-txt">
        <nav class="pf-trilha" aria-label="Você está em"><a href="/">Início</a> › <a href="/psicologos/">Psicólogos</a> › <span>${nome}</span></nav>
        <h1 class="pf-h1">${nome}${selo}</h1>
        <p class="pf-frase">${titulo}</p>
        <p class="pf-sub">${prof} · Atendimento online</p>
        ${p.abordagens.length ? `<ul class="pf-tags">${p.abordagens.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        <div class="pf-cta"><a class="btn lg" href="${agendar}">Agendar com ${pn}</a><span>${valor}</span></div>
      </div>
    </div>
  </section>

  <section class="pf-quote">
    <div class="wrap"><blockquote><p>“${citacao}”</p><footer>— ${nome}</footer></blockquote></div>
  </section>

  <section class="pf-passos">
    <div class="wrap">
      <ol class="pf-cards">
${passosDe(p).map((x, i) => `        <li class="pf-card pf-card-${i + 1}"><h2><span>${i + 1}.</span> ${esc(x.t)}</h2><p>${esc(x.x)}</p></li>`).join('\n')}
      </ol>
    </div>
  </section>
${p.bio || p.crp || esp.length || (p.publico || []).length ? `
  <section class="pf-sobre">
    <div class="wrap pf-sobre-grid">
      ${p.bio ? `<div class="pf-bio"><h2>Sobre ${pn}</h2>\n${bioHtml(p.bio)}</div>` : '<div></div>'}
      <aside class="pf-esp">
        ${p.crp ? `<p class="pf-reg">${p.verificado ? SVG_SELO : ''}<span>${p.verificado ? `<b>CRP ${esc(p.crp)} conferido</b> pela equipe Psicólogos Brasil.` : `<b>CRP ${esc(p.crp)}</b>.`} <a href="https://cadastro.cfp.org.br/" target="_blank" rel="noopener">Consultar no CFP</a></span></p>` : ''}
        ${esp.length ? `<h3>Com experiência em</h3><ul>${esp.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        ${(p.publico || []).length ? `<h3>Atende</h3><p>${esc(p.publico.join(', '))}</p>` : ''}
        ${(p.idiomas || []).length ? `<h3>Idiomas</h3><p>${esc(p.idiomas.join(', '))}</p>` : ''}
        ${(p.acessibilidade || []).length ? `<h3>Acessibilidade</h3><p>${esc(p.acessibilidade.join(' · '))}</p>` : ''}
      </aside>
    </div>
  </section>
` : ''}
  <section class="pf-esperar">
    <div class="wrap">
      <div class="pf-esperar-box${ambSrc ? '' : ' sem-img'}">
        ${ambSrc ? `<figure class="pf-amb"><img src="${ambSrc}" alt="Ambiente de atendimento de ${nome}" width="${p.ambiente.w}" height="${p.ambiente.h}" loading="lazy"></figure>` : ''}
        <div class="pf-esperar-card">
          <h2>O que esperar?</h2>
          <ul>${esperarDe(p).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
          <a class="btn" href="${agendar}">Agendar minha sessão</a>
        </div>
      </div>
    </div>
  </section>
</div>`;
}
function montarPerfil(p) {
  const arquivos = []; let fotoUrl = '';
  if (p.foto && p.foto.data) {
    const nome = `${p.slug}.${extDe(p.foto.data)}`;
    arquivos.push({ caminho: `assets/imagens/psicologos/${nome}`, blob: dataParaBlob(p.foto.data) });
    fotoUrl = `/assets/imagens/psicologos/${nome}`;
  }
  let ambUrl = '';
  if (p.ambiente && p.ambiente.data) {
    const nome = `${p.slug}-ambiente.${extDe(p.ambiente.data)}`;
    arquivos.push({ caminho: `assets/imagens/psicologos/${nome}`, blob: dataParaBlob(p.ambiente.data) });
    ambUrl = `/assets/imagens/psicologos/${nome}`;
  }
  const url = `${base()}/especialista/${p.slug}/`;
  const titulo = `${p.nome}, ${p.tratamento} Online${p.crp ? ` (CRP ${p.crp})` : ''} | Psicólogos Brasil`;
  const resumo = textoPuro(bioHtml(p.bio)).slice(0, 155);
  const descricao = resumo || `${p.tratamento} online${p.abordagens.length ? ' em ' + p.abordagens.join(', ') : ''}. Agende sua sessão pela Psicólogos Brasil.`;
  const jsonld = { '@context': 'https://schema.org', '@type': 'Person', name: p.nome, jobTitle: p.tratamento, url, worksFor: { '@type': 'Organization', name: 'Psicólogos Brasil', url: base() + '/' } };
  if (fotoUrl) jsonld.image = base() + fotoUrl;
  if (especialidadesDe(p).length) jsonld.knowsAbout = especialidadesDe(p);
  if (p.crp) jsonld.hasCredential = { '@type': 'EducationalOccupationalCredential', credentialCategory: 'Registro profissional', name: `CRP ${p.crp}`, recognizedBy: { '@type': 'Organization', name: 'Conselho Federal de Psicologia' } };
  const html = pagina({ titulo, descricao, url, imagem: fotoUrl ? base() + fotoUrl : '', tipo: 'profile', css: 'perfil-gerado.css', corpo: corpoPerfil(p, fotoUrl, ambUrl), jsonld });
  arquivos.unshift({ caminho: `especialista/${p.slug}/index.html`, texto: html });
  return { html, arquivos, fotoUrl };
}
function preencherAbordagens(sel) {
  const ab = linhas(state.config.abordagens); sel.forEach(s => { if (!ab.includes(s)) ab.push(s); });
  $('#p-abordagens').innerHTML = ab.map(x => `<label><input type="checkbox" value="${esc(x)}" ${sel.includes(x) ? 'checked' : ''}> ${esc(x)}</label>`).join('');
}
function mostrarFoto(p) {
  const el = $('#p-foto-prev');
  if (p.foto && p.foto.data) { el.style.backgroundImage = `url("${p.foto.data}")`; el.textContent = ''; }
  else { el.style.backgroundImage = ''; el.textContent = 'Sem foto'; }
  const pill = $('#p-foto-pill'), tem = !!(p.foto && p.foto.data);
  if (pill) { pill.className = 'acesso-pill' + (tem ? ' on' : ''); pill.textContent = tem ? '● Com foto' : 'Sem foto'; }
}
function mostrarAmb(p) {
  const el = $('#p-amb-prev');
  if (p.ambiente && p.ambiente.data) { el.style.backgroundImage = `url("${p.ambiente.data}")`; el.textContent = ''; }
  else { el.style.backgroundImage = ''; el.textContent = 'Sem imagem'; }
}
/* Sala do Google Meet: só links do tipo https://meet.google.com/abc-defg-hij */
const RE_SALA = /^(https?:\/\/)?meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})(\?.*)?$/i;
const salaMeetValida = v => RE_SALA.test(String(v || '').trim());
const normalizarSala = v => { const m = String(v || '').trim().match(RE_SALA); return m ? 'https://meet.google.com/' + m[2].toLowerCase() : ''; };
function msgSalaMeet() {
  const el = $('#p-salaMeet'), msg = $('#p-salaMeet-msg'); if (!el || !msg) return;
  const v = el.value.trim(), ok = salaMeetValida(v), ag = agendaDe(psiAtual());
  el.classList.toggle('invalido', !!v && !ok);
  msg.className = 'aj sala-msg' + (v ? (ok ? ' ok' : ' erro') : '');
  msg.textContent = !v ? 'Sem sala: a equipe cola o link na hora de confirmar o pagamento.'
    : !ok ? 'Link inválido. Use o link da sala, no formato https://meet.google.com/abc-defg-hij'
    : ag ? '✓ Sala salva. O link entra sozinho nos atendimentos confirmados.' : '✓ Sala salva. Passa a valer quando o acesso do psicólogo for criado.';
}
function preencherPsi(p) {
  $('#p-nome').value = p.nome; $('#p-tratamento').value = p.tratamento; $('#p-crp').value = p.crp; $('#p-opp').value = p.opp || ''; $('#p-slug').value = p.slug;
  $('#p-salaMeet').value = p.salaMeet || ''; msgSalaMeet();
  if (!['Psicóloga', 'Psicólogo'].includes(p.tratamento)) { p.tratamento = 'Psicóloga'; $('#p-tratamento').value = p.tratamento; }
  $('#p-especialidades').value = p.especialidades; $('#p-valor').value = p.valor; $('#p-duracao').value = p.duracao;
  renderChecks($('#p-temas'), TEMAS, p.temas || []); $('#p-temas-busca').value = ''; $('#p-temas-n').textContent = (p.temas || []).length;
  renderChecks($('#p-publico'), PUBLICO, p.publico || []); renderChecks($('#p-idiomas'), IDIOMAS, p.idiomas || ['Português']); renderChecks($('#p-acess'), ACESS, p.acessibilidade || []);
  $('#p-bio').value = p.bio; $('#p-video').value = p.video || ''; pillVideo(); $('#p-video-formato').value = p.videoFormato || 'auto'; if (p.ativo === false && !p.desativado) p.desativado = true;   /* perfis ocultos pela caixa antiga passam a aparecer como "Desativado" (botão Reativar) */
  $('#p-verificado').checked = !!p.verificado; $('#p-verif-data').value = p.verificadoEm || '';
  $('#p-verif-data-l').hidden = !p.verificado; $('#p-verif-box').classList.toggle('on', !!p.verificado);
  $('#p-titulo').value = p.titulo || ''; $('#p-citacao').value = p.citacao || ''; $('#p-esperar').value = p.esperar || '';
  $('#p-esperar').placeholder = ESPERAR_PADRAO;
  $('#p-passos').innerHTML = PASSOS_PADRAO.map((d, i) => { const x = (p.passos || [])[i] || {}; return `<div data-i="${i}"><span>Passo ${i + 1}</span><input type="text" data-c="t" value="${esc(x.t || '')}" placeholder="${esc(d.t)}"><textarea data-c="x" placeholder="${esc(d.x)}">${esc(x.x || '')}</textarea></div>`; }).join('');
  mostrarAmb(p);
  $('#p-schema').value = p.schemaExtra || ''; renderFaqPsi(p); renderSchemaPsi(p);
  preencherAbordagens(p.abordagens); mostrarFoto(p); infoPsi();
}
function abrirPsicologo(id) {
  atualP = id; const p = psiAtual();
  $('#psiVazio').hidden = !!p; $('#psiEd').hidden = !p;
  if (p) { trocarAba('psi', 'editar'); preencherPsi(p); }
  renderListaPsicologos();
}
function infoPsi() {
  const p = psiAtual(); if (!p) return;
  $('#p-info').innerHTML = `${statusSelo(p)}${p.geradoEm ? ` <span>em ${quando(p.geradoEm)}</span>` : ''}`;
}
function renderListaPsicologos() {
  const el = $('#listaPsicologos');
  $('#qtdPsicologos').textContent = state.psicologos.length; $('#qtdPsicologosT').textContent = state.psicologos.length;
  if (!state.psicologos.length) { el.innerHTML = '<div class="vazio-lista">Nenhum psicólogo ainda.<br>Comece pelo botão “+ Novo psicólogo”.</div>'; return; }
  el.innerHTML = [...state.psicologos].sort((x, y) => (x.nome || '').localeCompare(y.nome || '', 'pt-BR')).map(p => `
    <button class="item ${p.id === atualP ? 'sel' : ''}" data-id="${p.id}">
      ${p.foto && p.foto.data ? `<img src="${p.foto.data}" alt="" style="border-radius:50%">` : `<span class="ph" style="border-radius:50%">${esc((p.nome || '?')[0].toUpperCase())}</span>`}
      <span style="min-width:0"><span class="t">${esc(p.nome || 'Sem nome')} ${p.verificado ? SELO_PAINEL : ''}</span>
      <span class="m">${p.crp ? 'CRP ' + esc(p.crp) : ''} ${statusSelo(p)} ${p.ativo ? '' : '<span class="selo rasc">Oculto</span>'}</span></span>
    </button>`).join('');
}
async function validarPsi(p) {
  if (!p.nome.trim()) { toast('Coloque o nome do psicólogo.', 'erro'); return false; }
  if (!p.slug) { toast('O link do perfil está vazio.', 'erro'); return false; }
  if (state.psicologos.some(x => x.id !== p.id && x.slug === p.slug)) { toast('Já existe outro psicólogo com esse link. Mude o final, ex.: maria-silva-2.', 'erro'); return false; }
  if ((p.crp || '').trim() && !/^\d{2}\/\d{5}$/.test(p.crp.trim())) { toast('CRP no formato 2 números / 5 números (ex.: 11/12345).', 'erro'); $('#p-crp').focus(); return false; }
  if ((p.opp || '').trim() && !/^\d{1,6}$/.test(p.opp.trim())) { toast('OPP: só números.', 'erro'); $('#p-opp').focus(); return false; }
  if (p.verificado && !(p.crp || '').trim() && !(p.opp || '').trim()) { toast('Um perfil verificado precisa do CRP ou da OPP preenchido.', 'erro'); return false; }
  const ex = lerSchemaExtra(p.schemaExtra);
  if (!ex.ok) { toast('Corrija o schema personalizado antes de salvar: ' + ex.erro, 'erro'); return false; }
  if ((p.faq || []).some(f => (f.p || '').trim() && !(f.r || '').trim())) { toast('Tem pergunta do FAQ sem resposta.', 'erro'); return false; }
  if (!(p.crp || '').trim() && !(p.opp || '').trim() && !(await Auth.confirmar('Sem CRP e sem OPP', 'Este perfil está sem registro profissional. Publicar mesmo assim?', { ok: 'Publicar mesmo assim', cancelar: 'Voltar e preencher', icone: 'alerta' }))) return false;
  return true;
}

/* =============== arquivos gerais: listas e sitemap =============== */
function arquivosGerais() {
  const artigos = state.artigos.filter(a => a.geradoEm).sort((x, y) => (y.data || '').localeCompare(x.data || '')).map(a => ({
    titulo: a.titulo, url: `/${a.slug}/`, categoria: a.categoria, data: a.data, autor: a.autor, resumo: a.descricao, capa: a.capaUrl || '', minutos: minutos(a.html)
  }));
  const psis = state.psicologos.filter(p => p.geradoEm).map(p => ({
    nome: p.nome, tratamento: p.tratamento, crp: p.crp, url: `/especialista/${p.slug}/`, foto: p.fotoUrl || '', abordagens: p.abordagens,
    especialidades: especialidadesDe(p), temas: especialidadesDe(p), publico: p.publico || [], idiomas: (p.idiomas && p.idiomas.length) ? p.idiomas : ['Português'], acessibilidade: p.acessibilidade || [],
    genero: p.tratamento === 'Psicólogo' ? 'Homem' : p.tratamento === 'Psicóloga' ? 'Mulher' : 'Não binário', valor: p.valor ? Number(p.valor) : null, duracao: Number(p.duracao) || 50,
    verificado: !!p.verificado, resumo: textoPuro(bioHtml(p.bio)).slice(0, 160), whatsapp: (p.whats || state.config.whatsapp).replace(/\D/g, ''), ativo: p.ativo, desde: p.criado || null
  }));
  const hoje = hojeISO();
  const urls = [
    ...linhas(state.config.paginasFixas).map(u => ({ loc: base() + u, mod: hoje })),
    ...state.artigos.filter(a => a.geradoEm).map(a => ({ loc: `${base()}/${a.slug}/`, mod: new Date(a.geradoEm).toISOString().slice(0, 10) })),
    ...state.psicologos.filter(p => p.geradoEm && p.ativo).map(p => ({ loc: `${base()}/especialista/${p.slug}/`, mod: new Date(p.geradoEm).toISOString().slice(0, 10) }))
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${esc(u.loc)}</loc><lastmod>${u.mod}</lastmod></url>`).join('\n')}
</urlset>
`;
  return [
    { caminho: 'data/artigos.json', texto: JSON.stringify(artigos, null, 2) },
    { caminho: 'data/psicologos.json', texto: JSON.stringify(psis, null, 2) },
    { caminho: 'sitemap.xml', texto: sitemap }
  ];
}
async function gravarNaPasta(arquivos, cssCaminho, cssTexto) {
  for (const f of arquivos) await escrever(pasta, f.caminho, f.blob || f.texto);
  if (cssCaminho && !(await existe(pasta, cssCaminho))) await escrever(pasta, cssCaminho, cssTexto);
  for (const f of arquivosGerais()) await escrever(pasta, f.caminho, f.texto);
}
async function baixarZip(arquivos, nomeZip) {
  if (!window.JSZip) { toast('Para baixar o .zip o computador precisa estar com internet. Outra opção: conectar a pasta do site, ou copiar o código na aba “Código HTML”.', 'erro'); return false; }
  const z = new JSZip(); arquivos.forEach(f => z.file(f.caminho, f.blob || f.texto));
  baixar(await z.generateAsync({ type: 'blob' }), nomeZip); return true;
}

async function gerarArtigo(forcarZip) {
  const a = artigoAtual(); if (!a) return;
  a.slug = slugify(a.slug); $('#a-slug').value = a.slug;
  if (!(await validarArtigo(a))) return;
  if (!ehPrincipal(a) && !(await Auth.confirmar('Publicar com outro autor?', `Este artigo vai sair no site com o autor ${a.autor.trim()}, e não com ${state.config.autor}. Está certo?`, { ok: 'Sim, publicar', cancelar: 'Voltar e conferir', icone: 'alerta' }))) return;
  const antes = { g: a.geradoEm, al: a.alterado };
  a.geradoEm = Date.now(); a.alterado = false;
  const r = montarArtigo(a); a.capaUrl = r.capaUrl;
  try {
    if (pasta && !forcarZip) {
      await gravarNaPasta(r.arquivos, 'css/artigo-gerado.css', CSS_ARTIGO);
      toast(`Pronto! O artigo foi salvo em ${pasta.name}/blog/${a.slug}/. Agora é só enviar os arquivos para o site.`, 'ok');
    } else {
      const ok = await baixarZip([...r.arquivos, { caminho: 'css/artigo-gerado.css', texto: CSS_ARTIGO }, ...arquivosGerais()], `artigo-${a.slug}.zip`);
      if (!ok) { a.geradoEm = antes.g; a.alterado = antes.al; return; }
      toast('Arquivo .zip baixado. Extraia dentro da pasta do site, mantendo as pastas.', 'ok');
    }
  } catch (e) {
    a.geradoEm = antes.g; a.alterado = antes.al;
    toast('Não consegui salvar: ' + (e.message || e), 'erro');
  }
  salvarAgora(); renderListaArtigos(); infoArtigo();
}
async function gerarPsi(forcarZip) {
  const p = psiAtual(); if (!p) return;
  p.slug = slugify(p.slug); $('#p-slug').value = p.slug;
  if (!(await validarPsi(p))) return;
  const antes = { g: p.geradoEm, al: p.alterado };
  p.geradoEm = Date.now(); p.alterado = false;
  const r = montarPerfil(p); p.fotoUrl = r.fotoUrl;
  try {
    if (pasta && !forcarZip) {
      await gravarNaPasta(r.arquivos, 'css/perfil-gerado.css', CSS_PERFIL);
      toast(`Pronto! Perfil salvo em ${pasta.name}/especialista/${p.slug}/ e a lista data/psicologos.json foi atualizada.`, 'ok');
    } else {
      const ok = await baixarZip([...r.arquivos, { caminho: 'css/perfil-gerado.css', texto: CSS_PERFIL }, ...arquivosGerais()], `psicologo-${p.slug}.zip`);
      if (!ok) { p.geradoEm = antes.g; p.alterado = antes.al; return; }
      toast('Arquivo .zip baixado. Extraia dentro da pasta do site, mantendo as pastas.', 'ok');
    }
  } catch (e) {
    p.geradoEm = antes.g; p.alterado = antes.al;
    toast('Não consegui salvar: ' + (e.message || e), 'erro');
  }
  salvarAgora(); renderListaPsicologos(); infoPsi();
}
async function atualizarGerais() {
  try {
    if (pasta) { for (const f of arquivosGerais()) await escrever(pasta, f.caminho, f.texto); toast('sitemap.xml e listas atualizados na pasta.', 'ok'); }
    else if (await baixarZip(arquivosGerais(), 'sitemap-e-listas.zip')) toast('Baixado. Extraia na pasta do site.', 'ok');
  } catch (e) { toast('Não consegui salvar: ' + (e.message || e), 'erro'); }
}
async function excluir(tipo) {
  const lista = tipo === 'artigo' ? state.artigos : state.psicologos;
  const id = tipo === 'artigo' ? atualA : atualP;
  const o = lista.find(x => x.id === id); if (!o) return;
  const nome = tipo === 'artigo' ? (o.titulo || 'Sem título') : (o.nome || 'Sem nome');
  const pastaItem = tipo === 'artigo' ? `blog/${o.slug}/` : `especialista/${o.slug}/`;
  if (!(await Auth.confirmar(`Excluir “${nome}”?`, `Ele sai do painel.${o.geradoEm ? `\n\nA página já foi gerada. Depois apague a pasta ${pastaItem} do site e da Hostinger.` : ''}`, { ok: 'Excluir', perigo: true, icone: 'lixo' }))) return;
  lista.splice(lista.indexOf(o), 1);
  salvarAgora();
  if (tipo === 'artigo') { atualA = null; abrirArtigo(null); } else { atualP = null; abrirPsicologo(null); }
  if (o.geradoEm && pasta) { try { for (const f of arquivosGerais()) await escrever(pasta, f.caminho, f.texto); } catch (e) {} }
  toast(o.geradoEm ? `Removido do painel. Lembre de apagar a pasta ${pastaItem}.` : 'Removido.', o.geradoEm ? 'aviso' : 'ok');
}

/* =============== abas e prévia =============== */
function trocarAba(tipo, aba) {
  const raiz = tipo === 'artigo' ? $('#artigoEd') : $('#psiEd');
  raiz.querySelectorAll('.abas button').forEach(b => b.classList.toggle('ativo', b.dataset.aba === aba));
  raiz.querySelectorAll('.aba-painel').forEach(p => p.classList.toggle('ativo', p.dataset.aba === aba));
  if (tipo === 'artigo') {
    const a = artigoAtual(); if (!a) return;
    if (aba === 'previa') $('#a-previa').srcdoc = docPrevia(corpoArtigo(a, limpar(a.html), a.capa && a.capa.data));
    if (aba === 'html') { const s = slugify(a.slug) || 'link-do-artigo'; $('#a-html-caminho').textContent = `blog/${s}/index.html`; $('#a-html').value = montarArtigo({ ...a, slug: s }).html; }
  } else {
    const p = psiAtual(); if (!p) return;
    if (aba === 'previa') mostrarPreviaPerfil(p);
    if (aba === 'html') { const s = slugify(p.slug) || 'nome'; $('#p-html-caminho').textContent = `especialista/${s}/index.html`; $('#p-html').value = montarPerfil({ ...p, slug: s }).html; }
  }
}


/* =============== prévia do perfil =============== */
/* Abre a PRÓPRIA página do site (psicologos/perfil/?previa=1) dentro da prévia e manda
   o rascunho por mensagem: o que aparece aqui é exatamente o que vai para o site. */
let previaPerfilPronta = false;
function dadosPrevia(p) { return { ...psiPublico(p), slug: slugify(p.slug || p.nome) || 'previa' }; }
function mostrarPreviaPerfil(p) {
  const f = $('#p-previa');
  const enviar = () => { try { f.contentWindow.postMessage({ tipo: 'pb-previa-perfil', dados: dadosPrevia(p) }, location.origin); } catch (e) { console.warn(e); } };
  if (previaPerfilPronta) { enviar(); return; }
  if (!f.dataset.aberta) {
    f.dataset.aberta = '1';
    window.addEventListener('message', e => {
      if (e.origin !== location.origin || !e.data || e.data.tipo !== 'pb-previa-pronta' || e.source !== f.contentWindow) return;
      previaPerfilPronta = true;
      const atual = psiAtual(); if (atual) mostrarPreviaPerfil(atual);
    });
    f.removeAttribute('srcdoc');
    f.src = '../psicologos/perfil/?previa=1';
  }
}
