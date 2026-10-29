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

  const U = {
    DIAS, DIAS_LONGOS, DIAS_PLURAL, MESES, STATUS, pad,

    /* ---------- datas (sempre texto 'AAAA-MM-DD' e 'HH:MM') ---------- */
    dataISO(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; },
    hojeISO() { return U.dataISO(new Date()); },
    mesAtual() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; },
    parseISO(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); },
    addDias(s, n) { const d = U.parseISO(s); d.setDate(d.getDate() + n); return U.dataISO(d); },
    diaSemana(s) { return U.parseISO(s).getDay(); },
    dataHora(s, h) { const d = U.parseISO(s); const [hh, mm] = h.split(':').map(Number); d.setHours(hh, mm, 0, 0); return d; },
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
    fmtDataHoraCompleta(ms) { const d = new Date(ms); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; },
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
    whatsValido(s) { const n = U.digitos(s).replace(/^55(?=\d{10,11}$)/, ''); return n.length === 10 || n.length === 11; },
    whatsNumero(s) { let n = U.digitos(s); if (n.length <= 11) n = '55' + n; return n; },
    fmtTelefone(s) {
      let n = U.digitos(s);
      if (n.startsWith('55') && n.length > 11) n = n.slice(2);
      if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
      if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
      return s || '';
    },
    linkWhats(numero, texto) {
      return `https://api.whatsapp.com/send?phone=${U.whatsNumero(numero)}&text=${encodeURIComponent(texto)}`;
    },
    badge(status) { const s = STATUS[status] || { rotulo: status, classe: 'neutro' }; return `<span class="badge badge-${s.classe}">${s.rotulo}</span>`; },

    /* ---------- DOM ---------- */
    $(sel, el = document) { return el.querySelector(sel); },
    $$(sel, el = document) { return [...el.querySelectorAll(sel)]; },

    toast(msg, tipo = 'ok') {
      let box = document.getElementById('toasts');
      if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
      const t = document.createElement('div');
      t.className = `toast toast-${tipo}`;
      t.setAttribute('role', 'status');
      t.textContent = msg;
      box.appendChild(t);
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
