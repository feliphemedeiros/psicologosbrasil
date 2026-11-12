/* =====================================================================
   UTILIDADES — datas, formatação, avisos (toasts) e janelas (modais)
   ===================================================================== */
(function () {
  const pad = n => String(n).padStart(2, '0');
  const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const DIAS_LONGOS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const DIAS_PLURAL = ['domingos', 'segundas', 'terças', 'quartas', 'quintas', 'sextas', 'sábados'];
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  const STATUS = {
    pendente:   { rotulo: 'Aguardando pagamento', classe: 'pend' },
    confirmado: { rotulo: 'Confirmado',           classe: 'ok' },
    realizado:  { rotulo: 'Realizado',            classe: 'info' },
    falta:      { rotulo: 'Faltou',               classe: 'erro' },
    cancelado:  { rotulo: 'Cancelado',            classe: 'neutro' },
    expirado:   { rotulo: 'Expirado',             classe: 'neutro' }
  };

  /* ---------- FUSO HORÁRIO ----------
     Cada psicólogo tem um fuso (padrão: Brasília). Os horários dele (disponibilidade e
     agendamentos: data + hora) ficam SEMPRE no fuso dele. Para comparar com "agora" ou
     mostrar para outra pessoa, convertemos pelo momento exato (U.instante).
     O horário da equipe (8h às 20h, prazo, antecedência) é sempre de Brasília. */
  const FUSO_BR = 'America/Sao_Paulo';
  /* regiao: grupos na lista "Ver os horários no fuso de…" (site) e no campo do painel */
  const FUSOS = [
    { id: 'America/Sao_Paulo', nome: 'Brasília', pais: 'Brasil', regiao: 'Brasil', busca: 'são paulo rio de janeiro belo horizonte salvador fortaleza recife curitiba porto alegre goiânia' },
    { id: 'America/Manaus', nome: 'Manaus e Cuiabá', pais: 'Brasil', regiao: 'Brasil', busca: 'amazonas mato grosso rondônia roraima porto velho boa vista campo grande' },
    { id: 'America/Rio_Branco', nome: 'Acre', pais: 'Brasil', regiao: 'Brasil', busca: 'rio branco' },
    { id: 'America/Noronha', nome: 'Fernando de Noronha', pais: 'Brasil', regiao: 'Brasil' },
    { id: 'Europe/Lisbon', nome: 'Lisboa', pais: 'Portugal', regiao: 'Portugal', busca: 'porto coimbra braga faro madeira funchal' },
    { id: 'Atlantic/Azores', nome: 'Açores', pais: 'Portugal', regiao: 'Portugal', busca: 'ponta delgada' },
    { id: 'Europe/London', nome: 'Londres e Dublin', pais: 'Reino Unido e Irlanda', regiao: 'Europa', busca: 'inglaterra escócia manchester edimburgo irlanda' },
    { id: 'Europe/Madrid', nome: 'Madri e Barcelona', pais: 'Espanha', regiao: 'Europa' },
    { id: 'Europe/Paris', nome: 'Paris', pais: 'França', regiao: 'Europa' },
    { id: 'Europe/Rome', nome: 'Roma e Milão', pais: 'Itália', regiao: 'Europa' },
    { id: 'Europe/Berlin', nome: 'Berlim e Munique', pais: 'Alemanha', regiao: 'Europa' },
    { id: 'Europe/Zurich', nome: 'Zurique e Genebra', pais: 'Suíça', regiao: 'Europa' },
    { id: 'Europe/Amsterdam', nome: 'Amsterdã e Bruxelas', pais: 'Holanda e Bélgica', regiao: 'Europa', busca: 'países baixos' },
    { id: 'Europe/Athens', nome: 'Atenas', pais: 'Grécia', regiao: 'Europa' },
    { id: 'America/New_York', nome: 'Nova York, Miami, Boston', pais: 'EUA, leste', regiao: 'América do Norte', busca: 'estados unidos orlando flórida washington nova jersey atlanta' },
    { id: 'America/Chicago', nome: 'Chicago, Houston, Dallas', pais: 'EUA, centro', regiao: 'América do Norte', busca: 'estados unidos texas' },
    { id: 'America/Denver', nome: 'Denver e Salt Lake City', pais: 'EUA, montanhas', regiao: 'América do Norte', busca: 'estados unidos utah colorado' },
    { id: 'America/Phoenix', nome: 'Phoenix', pais: 'EUA, Arizona', regiao: 'América do Norte', busca: 'estados unidos' },
    { id: 'America/Los_Angeles', nome: 'Los Angeles, San Francisco', pais: 'EUA, oeste', regiao: 'América do Norte', busca: 'estados unidos califórnia seattle las vegas' },
    { id: 'America/Anchorage', nome: 'Alasca', pais: 'EUA', regiao: 'América do Norte', busca: 'estados unidos anchorage' },
    { id: 'Pacific/Honolulu', nome: 'Havaí', pais: 'EUA', regiao: 'América do Norte', busca: 'estados unidos honolulu' },
    { id: 'America/Toronto', nome: 'Toronto e Montreal', pais: 'Canadá, leste', regiao: 'América do Norte', busca: 'ottawa quebec' },
    { id: 'America/Vancouver', nome: 'Vancouver', pais: 'Canadá, oeste', regiao: 'América do Norte' },
    { id: 'America/Mexico_City', nome: 'Cidade do México', pais: 'México', regiao: 'América do Norte', busca: 'cancún guadalajara' },
    { id: 'America/Argentina/Buenos_Aires', nome: 'Buenos Aires', pais: 'Argentina', regiao: 'América do Sul e Central' },
    { id: 'America/Santiago', nome: 'Santiago', pais: 'Chile', regiao: 'América do Sul e Central' },
    { id: 'America/Montevideo', nome: 'Montevidéu', pais: 'Uruguai', regiao: 'América do Sul e Central' },
    { id: 'America/Asuncion', nome: 'Assunção', pais: 'Paraguai', regiao: 'América do Sul e Central' },
    { id: 'America/La_Paz', nome: 'La Paz', pais: 'Bolívia', regiao: 'América do Sul e Central', busca: 'santa cruz' },
    { id: 'America/Lima', nome: 'Lima', pais: 'Peru', regiao: 'América do Sul e Central' },
    { id: 'America/Bogota', nome: 'Bogotá', pais: 'Colômbia', regiao: 'América do Sul e Central' },
    { id: 'America/Caracas', nome: 'Caracas', pais: 'Venezuela', regiao: 'América do Sul e Central' },
    { id: 'America/Panama', nome: 'Cidade do Panamá', pais: 'Panamá', regiao: 'América do Sul e Central' },
    { id: 'Atlantic/Cape_Verde', nome: 'Praia', pais: 'Cabo Verde', regiao: 'África' },
    { id: 'Africa/Luanda', nome: 'Luanda', pais: 'Angola', regiao: 'África' },
    { id: 'Africa/Maputo', nome: 'Maputo', pais: 'Moçambique', regiao: 'África' },
    { id: 'Africa/Johannesburg', nome: 'Joanesburgo e Cidade do Cabo', pais: 'África do Sul', regiao: 'África' },
    { id: 'Asia/Jerusalem', nome: 'Jerusalém e Tel Aviv', pais: 'Israel', regiao: 'Ásia e Oriente Médio' },
    { id: 'Asia/Dubai', nome: 'Dubai e Abu Dhabi', pais: 'Emirados Árabes', regiao: 'Ásia e Oriente Médio' },
    { id: 'Asia/Kolkata', nome: 'Nova Délhi e Mumbai', pais: 'Índia', regiao: 'Ásia e Oriente Médio' },
    { id: 'Asia/Shanghai', nome: 'Pequim e Xangai', pais: 'China', regiao: 'Ásia e Oriente Médio', busca: 'hong kong' },
    { id: 'Asia/Singapore', nome: 'Singapura', pais: 'Singapura', regiao: 'Ásia e Oriente Médio' },
    { id: 'Asia/Seoul', nome: 'Seul', pais: 'Coreia do Sul', regiao: 'Ásia e Oriente Médio' },
    { id: 'Asia/Tokyo', nome: 'Tóquio, Nagoia, Osaka', pais: 'Japão', regiao: 'Ásia e Oriente Médio', busca: 'hamamatsu' },
    { id: 'Australia/Perth', nome: 'Perth', pais: 'Austrália, oeste', regiao: 'Oceania' },
    { id: 'Australia/Sydney', nome: 'Sydney e Melbourne', pais: 'Austrália, leste', regiao: 'Oceania', busca: 'brisbane' },
    { id: 'Pacific/Auckland', nome: 'Auckland', pais: 'Nova Zelândia', regiao: 'Oceania' }
  ];
  const _fmts = {};
  function _fmt(fuso) {
    if (!_fmts[fuso]) {
      try { _fmts[fuso] = new Intl.DateTimeFormat('en-US', { timeZone: fuso, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short' }); }
      catch (e) { _fmts[fuso] = _fmt(FUSO_BR); }
    }
    return _fmts[fuso];
  }
  const _SEM = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  /* o relógio de um fuso num momento: { data:'AAAA-MM-DD', hora:'HH:MM', dow, y, m, d, h, mi } */
  function _partes(ms, fuso) {
    const o = {}; _fmt(fuso).formatToParts(new Date(ms)).forEach(p => { o[p.type] = p.value; });
    const y = +o.year, m = +o.month, d = +o.day, h = +o.hour % 24, mi = +o.minute;
    return { y, m, d, h, mi, dow: _SEM[o.weekday], data: `${y}-${pad(m)}-${pad(d)}`, hora: `${pad(h)}:${pad(mi)}` };
  }
  function _desvio(fuso, ms) { const p = _partes(ms, fuso); return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi) - Math.floor(ms / 60000) * 60000; }

  const U = {
    DIAS, DIAS_LONGOS, DIAS_PLURAL, MESES, STATUS, pad, FUSO_BR, FUSOS,

    /* ---------- fuso horário ---------- */
    fusoNavegador() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || FUSO_BR; } catch (e) { return FUSO_BR; } },
    /* fuso em que o VISITANTE do site quer ver os horários (escolhido em "trocar" ou o do aparelho) */
    fusoVer() { let f = null; try { f = localStorage.getItem('pb_fuso_ver'); } catch (e) { /* sem armazenamento */ } return f || U.fusoNavegador(); },
    definirFusoVer(f) { try { if (!f || f === U.fusoNavegador()) localStorage.removeItem('pb_fuso_ver'); else localStorage.setItem('pb_fuso_ver', f); } catch (e) { /* vale só agora */ } },
    fusoValido(f) { if (typeof f !== 'string' || !/^[A-Za-z_]+(\/[A-Za-z0-9_+-]+){1,2}$/.test(f)) return false; try { new Intl.DateTimeFormat('en-US', { timeZone: f }); return true; } catch (e) { return false; } },
    /* "Lisboa (Portugal)" · fusos fora da lista: o nome da cidade */
    nomeFuso(f) { f = f || FUSO_BR; const x = FUSOS.find(z => z.id === f); return x ? `${x.nome} (${x.pais})` : f.split('/').pop().replace(/_/g, ' '); },
    cidadeFuso(f) { f = f || FUSO_BR; const x = FUSOS.find(z => z.id === f); return x ? x.nome.split(',')[0] : f.split('/').pop().replace(/_/g, ' '); },
    /* dois fusos com o mesmo relógio agora? (ex.: São Paulo e Brasília) */
    mesmoRelogio(a, b, ms = Date.now()) { return (a || FUSO_BR) === (b || FUSO_BR) || _desvio(a || FUSO_BR, ms) === _desvio(b || FUSO_BR, ms); },
    partesNoFuso(ms, fuso) { return _partes(ms, fuso || FUSO_BR); },
    /* data + hora num fuso → momento exato (ms) */
    instante(data, hora, fuso) {
      fuso = fuso || FUSO_BR;
      const [y, m, d] = data.split('-').map(Number), [hh, mm] = String(hora || '00:00').split(':').map(Number);
      const chute = Date.UTC(y, m - 1, d, hh, mm);
      let t = chute - _desvio(fuso, chute);
      t = chute - _desvio(fuso, t);   /* acerta a troca de horário de verão */
      return t;
    },
    /* a mesma sessão no relógio de outro fuso: { data, hora } */
    paraFuso(data, hora, de, para) { const p = _partes(U.instante(data, hora, de), para || FUSO_BR); return { data: p.data, hora: p.hora }; },
    /* momento exato de um agendamento (data e hora estão no fuso do psicólogo) */
    msAg(a) { return U.instante(a.data, a.hora, a.fuso); },

    /* ---------- chave Pix (repasse do psicólogo) ----------
       Guardamos a chave do jeito que o banco aceita: CPF/CNPJ só números, celular +55DDDnúmero,
       e-mail em minúsculas, aleatória com os hífens. Na tela mostramos formatada. */
    PIX_TIPOS: [
      { id: 'cpf', nome: 'CPF', dica: '000.000.000-00' },
      { id: 'cnpj', nome: 'CNPJ', dica: '00.000.000/0000-00' },
      { id: 'celular', nome: 'Celular', dica: '(85) 99999-9999' },
      { id: 'email', nome: 'E-mail', dica: 'nome@email.com' },
      { id: 'aleatoria', nome: 'Chave aleatória', dica: '0000aaaa-00aa-00aa-00aa-000000aaaaaa' }
    ],
    pixNomeTipo(t) { const x = U.PIX_TIPOS.find(z => z.id === t); return x ? x.nome : 'Chave Pix'; },
    /* chave antiga, sem tipo: tenta descobrir pelo formato */
    pixAdivinhar(v) {
      v = String(v || '').trim();
      if (!v) return '';
      if (/@/.test(v)) return 'email';
      if (/^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(v)) return 'aleatoria';
      const d = v.replace(/\D/g, '');
      if (/^\+/.test(v) || d.length === 13 || (d.length === 11 && /^\d{2}9/.test(d) && !U.cpfValido(d))) return 'celular';
      if (d.length === 11) return 'cpf';
      if (d.length === 14) return 'cnpj';
      return '';
    },
    cpfValido(c) {
      c = String(c || '').replace(/\D/g, '');
      if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
      const dv = n => { let s = 0; for (let i = 0; i < n; i++) s += +c[i] * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
      return dv(9) === +c[9] && dv(10) === +c[10];
    },
    cnpjValido(c) {
      c = String(c || '').replace(/\D/g, '');
      if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
      const dv = n => { const p = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]; let s = 0; for (let i = 0; i < n; i++) s += +c[i] * p[i]; const r = s % 11; return r < 2 ? 0 : 11 - r; };
      return dv(12) === +c[12] && dv(13) === +c[13];
    },
    /* confere e deixa no formato do banco → { ok, valor, erro } */
    pixNormalizar(tipo, v) {
      v = String(v || '').trim();
      if (!v) return { ok: true, valor: '' };
      const d = v.replace(/\D/g, '');
      if (tipo === 'cpf') return U.cpfValido(d) ? { ok: true, valor: d } : { ok: false, erro: 'CPF inválido: confira os 11 números.' };
      if (tipo === 'cnpj') return U.cnpjValido(d) ? { ok: true, valor: d } : { ok: false, erro: 'CNPJ inválido: confira os 14 números.' };
      if (tipo === 'celular') {
        const n = d.replace(/^55(?=\d{10,11}$)/, '');
        return /^\d{2}9\d{8}$/.test(n) ? { ok: true, valor: '+55' + n } : { ok: false, erro: 'Celular com DDD: 11 números (ex.: 85 99999-9999).' };
      }
      if (tipo === 'email') return U.emailValido(v) ? { ok: true, valor: v.toLowerCase() } : { ok: false, erro: 'E-mail inválido.' };
      if (tipo === 'aleatoria') {
        const h = v.replace(/[^0-9a-f]/gi, '').toLowerCase();
        return h.length === 32 ? { ok: true, valor: `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}` } : { ok: false, erro: 'Chave aleatória: são 32 letras e números (com ou sem hífens).' };
      }
      return { ok: false, erro: 'Escolha o tipo da chave Pix.' };
    },
    /* para mostrar: 123.456.789-09 · (85) 99999-9999 */
    pixFormatar(tipo, v) {
      v = String(v || ''); const d = v.replace(/\D/g, '');
      if (tipo === 'cpf' && d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      if (tipo === 'cnpj' && d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
      if (tipo === 'celular') { const n = d.replace(/^55(?=\d{10,11}$)/, ''); if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`; }
      return v;
    },

    /* ---------- datas (sempre texto 'AAAA-MM-DD' e 'HH:MM') ---------- */

    /* ---------- datas (sempre texto 'AAAA-MM-DD' e 'HH:MM') ---------- */
    dataISO(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; },
    hojeISO(fuso) { return fuso ? _partes(Date.now(), fuso).data : U.dataISO(new Date()); },
    mesAtual() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; },
    parseISO(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); },
    addDias(s, n) { const d = U.parseISO(s); d.setDate(d.getDate() + n); return U.dataISO(d); },
    diaSemana(s) { return U.parseISO(s).getDay(); },
    /* data + hora no fuso indicado (padrão: Brasília) → Date. Antes usava o relógio de quem estava olhando. */
    dataHora(s, h, fuso) { return new Date(U.instante(s, h, fuso)); },
    fmtDDMM(s) { const d = U.parseISO(s); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; },
    fmtCurta(s) { const d = U.parseISO(s); return `${DIAS[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; },
    fmtLonga(s) { const d = U.parseISO(s); return `${DIAS_LONGOS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`; },
    todoDia(data) { const d = U.diaSemana(data); return `${d === 0 || d === 6 ? 'todo' : 'toda'} ${DIAS_LONGOS[d]}`; },
    precoSessao(psi) { return Number(psi?.valor) || window.AGENDA_CONFIG.valorPadrao; },
    precoMensal(psi) {
      const C = window.AGENDA_CONFIG;
      if (Number(psi?.valorMensal)) return Number(psi.valorMensal);
      return Math.round(U.precoSessao(psi) * C.sessoesMensal * (1 - C.descontoMensalPct / 100) / 10) * 10;
    },
    addMes(m, n) { const [y, mm] = m.split('-').map(Number); const d = new Date(y, mm - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; },
    fmtMes(m) { const [y, mm] = m.split('-').map(Number); return `${MESES[mm - 1]} de ${y}`; },
    fmtHora(h) { const [hh, mm] = h.split(':'); return `${Number(hh)}h${mm === '00' ? '' : mm}`; },
    horaFim(h, min) { const [hh, mm] = h.split(':').map(Number); const t = hh * 60 + mm + min; return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`; },
    intervalo(h, min) { return `${U.fmtHora(h)} às ${U.fmtHora(U.horaFim(h, min))}`; },
    fmtDataHoraCompleta(ms, fuso) { const p = _partes(ms, fuso || U.fusoNavegador()); return `${pad(p.d)}/${pad(p.m)} ${p.hora}`; },
    /* ---------- horário da equipe ----------
       O prazo da pré-reserva e a antecedência mínima contam só dentro do horário
       de atendimento da equipe (padrão em js/agenda/config.js, ajustável no painel). */
    equipe() {
      const C = window.AGENDA_CONFIG, pad0 = { dias: [1, 2, 3, 4, 5], inicio: 8, fim: 20, prazoHoras: 2, antecedenciaHoras: 4 };
      let extra = U._ajustesAgenda;
      if (!extra) { try { extra = JSON.parse(localStorage.getItem('pb-ajustes-agenda-v1')); } catch (e) { extra = null; } }
      const e = { ...pad0, ...(C.equipe || {}), ...(extra || {}) };
      e.dias = (Array.isArray(e.dias) ? e.dias : pad0.dias).map(Number).filter(d => d >= 0 && d <= 6);
      e.inicio = Math.max(0, Math.min(23, Number(e.inicio))); e.fim = Math.max(e.inicio + 1, Math.min(24, Number(e.fim)));
      return e;
    },
    /* (Firebase) busca os ajustes salvos pelo painel; no modo teste eles já estão neste navegador */
    async carregarAjustesAgenda() {
      try { if (typeof NUVEM !== 'undefined' && NUVEM.modo === 'firebase' && NUVEM.ajustesAgenda) { const a = await NUVEM.ajustesAgenda(); if (a) U._ajustesAgenda = a; } } catch (e) { /* fica o padrão */ }
    },
    /* o expediente da equipe é sempre no horário de Brasília, de onde quer que se olhe */
    _limitesDia(ms) {
      const e = U.equipe(), p = _partes(ms, FUSO_BR);
      const ab = U.instante(p.data, `${pad(e.inicio)}:00`, FUSO_BR);
      const fe = e.fim >= 24 ? U.instante(U.addDias(p.data, 1), '00:00', FUSO_BR) : U.instante(p.data, `${pad(e.fim)}:00`, FUSO_BR);
      return { e, aberto: e.dias.includes(p.dow), ab, fe };
    },
    dentroHorarioEquipe(ms = Date.now()) { const l = U._limitesDia(ms); return l.aberto && ms >= l.ab && ms < l.fe; },
    /* quando a equipe abre de novo (ou agora, se já estiver aberta) */
    proximaAberturaEquipe(ms = Date.now()) {
      let t = ms;
      for (let i = 0; i < 15; i++) {
        const l = U._limitesDia(t);
        if (l.aberto && t < l.fe) return Math.max(t, l.ab);
        t = U.instante(U.addDias(_partes(t, FUSO_BR).data, 1), '00:00', FUSO_BR);
      }
      return ms;
    },
    /* soma X horas contando só o horário da equipe */
    somarHorasEquipe(ms, horas) {
      const e = U.equipe();
      if (!e.dias.length) return ms + horas * 3600e3;
      let resta = horas * 3600e3, t = ms;
      for (let i = 0; i < 40 && resta > 0; i++) {
        t = U.proximaAberturaEquipe(t);
        const { fe } = U._limitesDia(t), cabe = fe - t;
        if (cabe >= resta) return t + resta;
        resta -= cabe; t = fe;
      }
      return t;
    },
    /* "seg a sex, 8h às 20h" (com fuso diferente de Brasília: "…, horário de Brasília") */
    textoHorarioEquipe(fuso) {
      const e = U.equipe(), N = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
      const ds = [...new Set(e.dias)].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));   /* segunda primeiro */
      const seg = ds.map(d => (d + 6) % 7), seguidos = seg.every((v, i) => !i || v === seg[i - 1] + 1);
      const dias = !ds.length ? '' : ds.length === 1 ? N[ds[0]] : seguidos && ds.length > 2 ? `${N[ds[0]]} a ${N[ds[ds.length - 1]]}` : ds.map(d => N[d]).join(', ').replace(/, ([^,]+)$/, ' e $1');
      return `${dias}, ${e.inicio}h às ${e.fim}h${fuso && !U.mesmoRelogio(fuso, FUSO_BR) ? ' (horário de Brasília)' : ''}`;
    },
    /* "hoje, 12h" · "amanhã, 10h" · "segunda, 10h" · "seg, 10/11, 10h" */
    /* fuso: de quem vai ler (padrão: o do aparelho) */
    fmtQuando(ms, fuso) {
      fuso = fuso || U.fusoNavegador();
      const p = _partes(ms, fuso), hoje = _partes(Date.now(), fuso).data;
      const dif = Math.round((U.parseISO(p.data) - U.parseISO(hoje)) / 864e5), hora = `${p.h}h${p.mi ? pad(p.mi) : ''}`;
      if (dif === 0) return `hoje, ${hora}`;
      if (dif === 1) return `amanhã, ${hora}`;
      if (dif > 1 && dif < 7) return `${DIAS_LONGOS[p.dow].replace('-feira', '')}, ${hora}`;
      return `${DIAS[p.dow].toLowerCase()}, ${pad(p.d)}/${pad(p.m)}, ${hora}`;
    },
    /* data completa, para o e-mail (que pode ser lido outro dia): "terça-feira, 04/11, às 10h" */
    fmtDataCompleta(ms, fuso) {
      const p = _partes(ms, fuso || U.fusoNavegador());
      return `${DIAS_LONGOS[p.dow]}, ${pad(p.d)}/${pad(p.m)}, às ${p.h}h${p.mi ? pad(p.mi) : ''}`;
    },
    /* Texto de uma sessão para quem vai ler, no fuso dessa pessoa:
       "terça-feira, 10 de novembro, 13h às 13h50 (horário de Lisboa) · em Brasília: 9h"
       a: agendamento (data/hora no fuso do psicólogo, a.fuso) · fuso: de quem lê · outro: fuso para comparar */
    textoSessao(a, fuso, outro) {
      const de = a.fuso || FUSO_BR; fuso = fuso || de;
      const v = U.paraFuso(a.data, a.hora, de, fuso);
      let t = `${U.fmtLonga(v.data)}, ${U.intervalo(v.hora, a.duracao || 50)}`;
      const ms = U.msAg(a);
      if (!U.mesmoRelogio(fuso, FUSO_BR, ms) || (outro && !U.mesmoRelogio(fuso, outro, ms))) t += ` (horário de ${U.cidadeFuso(fuso)})`;
      if (outro && !U.mesmoRelogio(fuso, outro, ms)) { const o = U.paraFuso(a.data, a.hora, de, outro); t += ` · em ${U.cidadeFuso(outro)}: ${U.fmtHora(o.hora)}${o.data !== v.data ? ` (${U.fmtCurta(o.data)})` : ''}`; }
      return t;
    },
    /* Aviso curto no painel quando há fuso diferente (texto puro):
       equipe → "horário de Lisboa · em Brasília: 9h" e/ou "paciente em Lisboa: 13h lá" */
    notaFuso(a, equipe) {
      const ms = U.msAg(a), fp = a.fuso || FUSO_BR, fc = a.fusoPaciente || fp, partes = [];
      const outro = f => { const x = U.paraFuso(a.data, a.hora, fp, f); return `${U.fmtHora(x.hora)}${x.data !== a.data ? ` (${U.fmtCurta(x.data)})` : ''}`; };
      if (equipe && !U.mesmoRelogio(fp, FUSO_BR, ms)) partes.push(`horário de ${U.cidadeFuso(fp)} · em Brasília: ${outro(FUSO_BR)}`);
      if (!U.mesmoRelogio(fc, fp, ms) && !(equipe && U.mesmoRelogio(fc, FUSO_BR, ms))) partes.push(`paciente em ${U.cidadeFuso(fc)}: ${outro(fc)} lá`);
      return partes.join(' · ');
    },
    /* Para a tela e o e-mail depois de "Enviar agendamento" */
    infoPedido(expiraEm, ms = Date.now(), fuso) {
      const l = U._limitesDia(ms);
      const agora = U.dentroHorarioEquipe(ms) && l.fe - ms >= 30 * 60e3;   /* faltando menos de 30 min para fechar: conta como fora */
      const abre = agora ? ms : U.proximaAberturaEquipe(U.dentroHorarioEquipe(ms) ? l.fe : ms);
      return {
        dentro: agora, horario: U.textoHorarioEquipe(fuso),
        prazo: U.fmtQuando(expiraEm, fuso), prazoCompleto: U.fmtDataCompleta(expiraEm, fuso),
        abertura: U.fmtQuando(abre, fuso).replace(/, (\d+h\d*)$/, ' a partir das $1'),
        aberturaCompleta: U.fmtDataCompleta(abre, fuso).replace(/, às (\d+h\d*)$/, ', a partir das $1')
      };
    },
    /* Lembretes da equipe (Agenda → Lembretes):
       - sessões confirmadas nas próximas 24 horas → lembrar paciente e psicólogo;
       - última sessão de um plano mensal nas próximas 48 horas → oferecer renovação. */
    lembretes(ags, t = Date.now()) {
      const ms = a => U.dataHora(a.data, a.hora, a.fuso).getTime();
      const conf = ags.filter(a => a.status === 'confirmado' && ms(a) > t);
      const proximas = conf.filter(a => ms(a) - t <= 24 * 3600e3).sort((a, b) => ms(a) - ms(b));
      const fins = conf.filter(a => a.tipo === 'mensal' && a.totalSessoes > 1 && a.sessao === a.totalSessoes && ms(a) - t <= 48 * 3600e3).sort((a, b) => ms(a) - ms(b));
      const L = a => a.lembretes || {};
      const pendentes = proximas.filter(a => !L(a).paciente || !L(a).psicologo).length + fins.filter(a => !L(a).renovacao).length;
      return { proximas, fins, pendentes };
    },
    /* E-mail digitado com erro comum ("gmial.com", "hotmail.con"): devolve a sugestão certa, ou null */
    sugestaoEmail(email) {
      const e = String(email || '').trim().toLowerCase(), m = e.match(/^([^\s@]+)@([^\s@]+)$/);
      if (!m) return null;
      const dom = m[2], CERTOS = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'yahoo.com.br', 'icloud.com', 'live.com', 'msn.com', 'uol.com.br', 'bol.com.br', 'terra.com.br', 'hotmail.com.br', 'outlook.com.br', 'me.com', 'protonmail.com'];
      if (CERTOS.includes(dom)) return null;
      const dist = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
        for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        return d[a.length][b.length]; };
      let melhor = null, menor = 9;
      CERTOS.forEach(c => { const x = dist(dom, c); if (x < menor) { menor = x; melhor = c; } });
      /* também pega "gmail" sem ".com" e terminações erradas (.con, .cmo, .co) */
      if (/^(gmail|hotmail|outlook|yahoo|icloud|live)$/.test(dom)) return `${m[1]}@${dom}.com`;
      return melhor && menor <= 2 && menor < dom.length / 3 ? `${m[1]}@${melhor}` : null;
    },
    /* a mesma pessoa em vários agendamentos: pelo WhatsApp (ou pelo e-mail, se não tiver) */
    chavePaciente(p) { const w = U.digitos(p && p.whatsapp); return w ? 'w' + U.whatsNumero(p.whatsapp) : 'e' + String((p && p.email) || '').trim().toLowerCase(); },
    tempoRestante(ms) {
      if (ms <= 0) return 'expirada';
      const m = Math.round(ms / 60000);
      if (m < 60) return `${m} min`;
      return `${Math.floor(m / 60)}h${pad(m % 60)}`;
    },

    /* ---------- textos e números ---------- */
    moeda(v) { return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); },
    id(p) { return `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`; },
    codigo() { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 4; i++) s += c[Math.floor(Math.random() * c.length)]; return s; },
    esc(s) { return String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); },
    digitos(s) { return String(s || '').replace(/\D/g, ''); },
    primeiroNome(s) { return String(s || '').trim().split(/\s+/)[0] || ''; },
    emailValido(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || '').trim()); },
    /* ---------- WhatsApp (Brasil e outros países) ----------
       Número novo é guardado com "+" e o código do país: "+5585999998888", "+351912345678".
       Número antigo, sem "+" e com até 11 números, é do Brasil (DDD + número). */
    PAISES_TEL: [
      { iso: 'BR', nome: 'Brasil', ddi: '55', band: '🇧🇷', min: 10, max: 11, ex: '(85) 99999-9999' },
      { iso: 'PT', nome: 'Portugal', ddi: '351', band: '🇵🇹', min: 9, max: 9, ex: '912 345 678' },
      { iso: 'US', nome: 'Estados Unidos', ddi: '1', band: '🇺🇸', min: 10, max: 10, ex: '(305) 555-1234' },
      { iso: 'CA', nome: 'Canadá', ddi: '1', band: '🇨🇦', min: 10, max: 10, ex: '(416) 555-1234' },
      { iso: 'GB', nome: 'Reino Unido', ddi: '44', band: '🇬🇧', min: 10, max: 10, ex: '7400 123456' },
      { iso: 'IE', nome: 'Irlanda', ddi: '353', band: '🇮🇪', min: 9, max: 9, ex: '85 123 4567' },
      { iso: 'ES', nome: 'Espanha', ddi: '34', band: '🇪🇸', min: 9, max: 9, ex: '612 345 678' },
      { iso: 'FR', nome: 'França', ddi: '33', band: '🇫🇷', min: 9, max: 9, ex: '6 12 34 56 78' },
      { iso: 'IT', nome: 'Itália', ddi: '39', band: '🇮🇹', min: 9, max: 10, ex: '312 345 6789' },
      { iso: 'DE', nome: 'Alemanha', ddi: '49', band: '🇩🇪', min: 10, max: 11, ex: '1512 3456789' },
      { iso: 'CH', nome: 'Suíça', ddi: '41', band: '🇨🇭', min: 9, max: 9, ex: '78 123 45 67' },
      { iso: 'NL', nome: 'Holanda', ddi: '31', band: '🇳🇱', min: 9, max: 9, ex: '6 12345678' },
      { iso: 'BE', nome: 'Bélgica', ddi: '32', band: '🇧🇪', min: 9, max: 9, ex: '470 12 34 56' },
      { iso: 'AR', nome: 'Argentina', ddi: '54', band: '🇦🇷', min: 10, max: 11, ex: '9 11 2345 6789' },
      { iso: 'CL', nome: 'Chile', ddi: '56', band: '🇨🇱', min: 9, max: 9, ex: '9 1234 5678' },
      { iso: 'UY', nome: 'Uruguai', ddi: '598', band: '🇺🇾', min: 8, max: 8, ex: '94 123 456' },
      { iso: 'PY', nome: 'Paraguai', ddi: '595', band: '🇵🇾', min: 9, max: 9, ex: '961 456789' },
      { iso: 'MX', nome: 'México', ddi: '52', band: '🇲🇽', min: 10, max: 10, ex: '55 1234 5678' },
      { iso: 'AO', nome: 'Angola', ddi: '244', band: '🇦🇴', min: 9, max: 9, ex: '923 123 456' },
      { iso: 'MZ', nome: 'Moçambique', ddi: '258', band: '🇲🇿', min: 9, max: 9, ex: '82 123 4567' },
      { iso: 'JP', nome: 'Japão', ddi: '81', band: '🇯🇵', min: 10, max: 10, ex: '90 1234 5678' },
      { iso: 'AU', nome: 'Austrália', ddi: '61', band: '🇦🇺', min: 9, max: 9, ex: '412 345 678' },
      { iso: 'AE', nome: 'Emirados Árabes', ddi: '971', band: '🇦🇪', min: 9, max: 9, ex: '50 123 4567' },
      { iso: 'XX', nome: 'Outro país', ddi: '', band: '🌍', min: 6, max: 15, ex: 'código do país + número' }
    ],
    /* país mais provável pelo fuso de quem está vendo (Lisboa → Portugal) */
    paisPeloFuso(f) {
      f = f || U.fusoVer();
      const M = { 'Europe/Lisbon': 'PT', 'Atlantic/Azores': 'PT', 'Atlantic/Madeira': 'PT', 'Europe/London': 'GB', 'Europe/Dublin': 'IE', 'Europe/Madrid': 'ES', 'Europe/Paris': 'FR', 'Europe/Rome': 'IT', 'Europe/Berlin': 'DE', 'Europe/Zurich': 'CH', 'Europe/Amsterdam': 'NL', 'Europe/Brussels': 'BE',
        'America/Toronto': 'CA', 'America/Vancouver': 'CA', 'America/Montreal': 'CA', 'America/Mexico_City': 'MX', 'America/Argentina/Buenos_Aires': 'AR', 'America/Buenos_Aires': 'AR', 'America/Santiago': 'CL', 'America/Montevideo': 'UY', 'America/Asuncion': 'PY',
        'Africa/Luanda': 'AO', 'Africa/Maputo': 'MZ', 'Asia/Tokyo': 'JP', 'Asia/Dubai': 'AE' };
      if (M[f]) return M[f];
      if (/^America\/(Sao_Paulo|Manaus|Rio_Branco|Noronha|Bahia|Fortaleza|Recife|Belem|Cuiaba|Campo_Grande|Porto_Velho|Boa_Vista|Maceio|Araguaina|Santarem)$/.test(f)) return 'BR';
      if (/^(America\/(New_York|Chicago|Denver|Phoenix|Los_Angeles|Anchorage|Detroit|Indiana)|Pacific\/Honolulu)/.test(f)) return 'US';
      if (/^Australia\//.test(f)) return 'AU';
      return 'BR';
    },
    paisTel(iso) { return U.PAISES_TEL.find(p => p.iso === iso) || U.PAISES_TEL[0]; },
    /* país de um número guardado (+351… → Portugal); números antigos sem "+" são do Brasil */
    paisDoNumero(s) {
      const t = String(s || '').trim(), d = U.digitos(t);
      if (!t.startsWith('+')) return U.paisTel('BR');
      const c = U.PAISES_TEL.filter(p => p.ddi && d.startsWith(p.ddi)).sort((a, b) => b.ddi.length - a.ddi.length);
      return c[0] || U.paisTel('XX');
    },
    /* número digitado no formato do banco: "+55…", "+351…" (ddi: código do país escolhido) */
    whatsNormalizar(s, ddi) {
      const t = String(s || '').trim(); let d = U.digitos(t);
      if (!d) return '';
      if (ddi) { d = d.replace(/^0+/, ''); if (d.startsWith(ddi) && d.length > ddi.length + 7) return '+' + d; return '+' + ddi + d; }
      if (t.startsWith('+') || t.startsWith('00')) return '+' + d.replace(/^00/, '');
      if (d.length <= 11) return '+55' + d;
      return '+' + d;
    },
    whatsValido(s) {
      const t = String(s || '').trim(), d = U.digitos(t);
      if (t.startsWith('+')) {
        const p = U.paisDoNumero(t);
        if (p.iso === 'XX') return d.length >= 8 && d.length <= 15;
        const n = d.length - p.ddi.length;
        return n >= p.min && n <= p.max;
      }
      const n = d.replace(/^55(?=\d{10,11}$)/, ''); return n.length === 10 || n.length === 11;
    },
    /* só números, com o código do país (para o link do WhatsApp) */
    whatsNumero(s) { const t = String(s || '').trim(); let n = U.digitos(t); if (!n) return ''; if (t.startsWith('+')) return n; if (n.length <= 11) n = '55' + n; return n; },
    /* Brasil: "(85) 99999-9999" · outro país: "+351 912 345 678 (Portugal)"
       (nome do país em texto: bandeira em emoji vira só letras no Windows) */
    fmtTelefone(s) {
      const t = String(s || '').trim();
      let n = U.digitos(t);
      if (!n) return '';
      if (t.startsWith('+')) {
        const p = U.paisDoNumero(t);
        if (p.iso !== 'BR') { const resto = n.slice(p.ddi.length); return `+${p.ddi} ${resto.replace(/(\d{3})(?=\d{3,})/g, '$1 ')}`.trim() + (p.iso === 'XX' ? '' : ` (${p.ddi === '1' ? 'EUA ou Canadá' : p.nome})`); }
        n = n.slice(2);
      } else if (n.startsWith('55') && n.length > 11) n = n.slice(2);
      if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
      if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
      return t;
    },
    /* para dentro de um campo editável: Brasil "(85) 99999-9999"; outro país "+351 912 345 678" (sem bandeira) */
    fmtTelefoneCampo(s) { return U.fmtTelefone(s).replace(/\s\([^)]*\)$/, ''); },
    linkWhats(numero, texto) {
      const n = U.whatsNumero(numero);   /* sem número: abre o WhatsApp para escolher o contato */
      return `https://api.whatsapp.com/send?${n ? `phone=${n}&` : ''}text=${encodeURIComponent(texto)}`;
    },
    badge(status) { const s = STATUS[status] || { rotulo: status, classe: 'neutro' }; return `<span class="badge badge-${s.classe}">${s.rotulo}</span>`; },

    /* ---------- DOM ---------- */
    $(sel, el = document) { return el.querySelector(sel); },
    $$(sel, el = document) { return [...el.querySelectorAll(sel)]; },

    /* Põe o aviso na frente de tudo, inclusive de uma janela aberta (que escurece o fundo).
       Usa a "camada do topo" do navegador (popover); em navegador antigo, fica como antes. */
    paraFrente(box) {
      if (!box || typeof box.showPopover !== 'function') return;
      if (!box.hasAttribute('popover')) box.setAttribute('popover', 'manual');
      try { if (box.matches(':popover-open')) box.hidePopover(); box.showPopover(); } catch (e) { /* segue como antes */ }
    },
    toast(msg, tipo = 'ok') {
      let box = document.getElementById('toasts');
      if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
      const t = document.createElement('div');
      t.className = `toast toast-${tipo}`;
      t.setAttribute('role', 'status');
      t.textContent = msg;
      box.appendChild(t);
      U.paraFrente(box);
      setTimeout(() => t.classList.add('saindo'), 3600);
      setTimeout(() => t.remove(), 4000);
    },

    /* Janela (modal). acoes: [{ texto, classe, onClick(ctx) }]
       Se onClick devolver false, a janela continua aberta. */
    modal({ titulo, corpo = '', acoes = [], largo = false }) {
      const dlg = document.createElement('dialog');
      dlg.className = 'modal' + (largo ? ' modal-largo' : '');
      dlg.innerHTML = `
        <div class="modal-topo">
          <h2>${titulo}</h2>
          <button type="button" class="modal-fechar" aria-label="Fechar">×</button>
        </div>
        <div class="modal-corpo">${corpo}</div>
        ${acoes.length ? '<div class="modal-acoes"></div>' : ''}`;
      document.body.appendChild(dlg);
      const fechar = () => { dlg.close(); dlg.remove(); };
      const ctx = { el: dlg, corpo: U.$('.modal-corpo', dlg), fechar };
      U.$('.modal-fechar', dlg).onclick = fechar;
      dlg.addEventListener('cancel', e => { e.preventDefault(); fechar(); });
      const caixa = U.$('.modal-acoes', dlg);
      acoes.forEach(a => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn ' + (a.classe || 'btn-secundario');
        b.textContent = a.texto;
        b.onclick = async () => {
          if (!a.onClick) return fechar();
          const botoes = U.$$('button', caixa);
          botoes.forEach(x => (x.disabled = true));
          try {
            const r = await a.onClick(ctx);
            if (r !== false) fechar();
          } catch (err) {
            U.toast(err.message || 'Algo deu errado.', 'erro');
          } finally {
            botoes.forEach(x => (x.disabled = false));
          }
        };
        caixa.appendChild(b);
      });
      dlg.showModal();
      return ctx;
    },

    confirmar(titulo, texto, textoBotao = 'Confirmar', perigo = false) {
      return new Promise(resolve => {
        let resp = false;
        const m = U.modal({
          titulo,
          corpo: `<p>${texto}</p>`,
          acoes: [
            { texto: 'Voltar', classe: 'btn-secundario' },
            { texto: textoBotao, classe: perigo ? 'btn-perigo' : 'btn-primario', onClick: () => { resp = true; } }
          ]
        });
        m.el.addEventListener('close', () => resolve(resp));
      });
    }
  };

  window.U = U;
})();
