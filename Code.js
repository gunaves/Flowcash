
// Code.js — versão corrigida e mínima (focada em formulário, listas e persistência)

(function () {
  'use strict';

  // utilitários mínimos
  const $ = id => document.getElementById(id);
  const q = (root, sel) => [...(root || document).querySelectorAll(sel)];
  const parseValor = s => {
    if (!s && s !== 0) return 0;
    const raw = String(s).replace(/\s/g, '').replace('R$', '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : 0;
  };
  const formatValor = v => (Number.isFinite(Number(v)) ? Number(v).toFixed(2).replace('.', ',') : '0,00');

  // estado
  let totalRenda = 0, totalSaldo = 0, totalDespesas = 0;
  let editarItemAtual = null;
  const SAVE_KEY = 'flowcash-dados';

  // salvar / carregar localStorage
  function salvarLocal() {
    try {
      const payload = {
        renda: getDadosDaLista('renda-list'),
        saldo: getDadosDaLista('saldo-list'),
        despesas: getDadosDaLista('despesas-list')
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error('Erro salvar local:', e);
    }
  }

  function carregarLocal() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const obj = JSON.parse(raw);
      if (obj.renda) importarLista('renda', obj.renda);
      if (obj.saldo) importarLista('saldo', obj.saldo);
      if (obj.despesas) importarLista('despesas', obj.despesas);
      atualizarResumo();
    } catch (e) {
      console.error('Erro ao carregar localStorage:', e);
    }
  }

  // resumir e renderizar totais
  function atualizarResumo() {
    const receitaEl = $('receita-value'), saldoEl = $('saldo-value'), despesasEl = $('despesas-value'), lucroEl = $('lucro-value');
    if (receitaEl) receitaEl.textContent = totalRenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    if (saldoEl) saldoEl.textContent = totalSaldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    if (despesasEl) despesasEl.textContent = totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    if (lucroEl) lucroEl.textContent = (totalRenda - totalDespesas).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    // salvar estado
    salvarLocal();
  }

  // CRUD itens
  function criarBotoesAcoes(li, tipo) {
    const wrap = document.createElement('div');
    wrap.className = 'item-actions';
    const btn = (txt, fn) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = txt;
      b.addEventListener('click', fn);
      return b;
    };
    wrap.appendChild(btn('Editar', () => editarItem(li, tipo)));
    wrap.appendChild(btn('Duplicar', () => duplicarItem(li, tipo)));
    wrap.appendChild(btn('Excluir', () => removerEntrada(li, tipo)));
    li.appendChild(wrap);
  }

  function adicionarEntrada(nome, valor, dataISO, tipo, descricao = '', repeticao = '') {
    const lista = $(tipo + '-list');
    if (!lista) return;
    const nomeSafe = String(nome || '').trim();
    const valorNum = Number(valor) || 0;
    const dataIsoSafe = dataISO || '';

    const li = document.createElement('li');
    li.innerHTML = `
      <span class="nome">${escapeHtml(nomeSafe)}</span>
      <span class="valor">R$ ${formatValor(valorNum)}</span>
      <span class="data">${dataIsoSafe ? dataIsoSafe.split('-').reverse().join('/') : ''}</span>
      ${descricao ? `<span class="descricao">${escapeHtml(descricao)}</span>` : ''}
      ${repeticao ? `<span class="repeticao">${escapeHtml(repeticao)}</span>` : ''}
    `;
    criarBotoesAcoes(li, tipo);
    lista.appendChild(li);

    if (tipo === 'renda') totalRenda += valorNum;
    else if (tipo === 'saldo') totalSaldo += valorNum;
    else totalDespesas += valorNum;

    atualizarResumo();
  }

  function removerEntrada(li, tipo) {
    if (!li) return;
    const vEl = li.querySelector('.valor');
    const valor = vEl ? parseValor(vEl.textContent) : 0;
    if (tipo === 'renda') totalRenda -= valor;
    else if (tipo === 'saldo') totalSaldo -= valor;
    else totalDespesas -= valor;

    if (editarItemAtual === li) {
      editarItemAtual = null;
      const form = $('entry-form');
      if (form) form.reset();
      const submitBtn = $('submit-button');
      if (submitBtn) submitBtn.textContent = 'Adicionar';
    }
    li.remove();
    atualizarResumo();
  }

  function editarItem(li, tipo) {
    if (!li) return;
    const nome = li.querySelector('.nome')?.textContent || '';
    const valor = parseValor(li.querySelector('.valor')?.textContent || '');
    const data = li.querySelector('.data')?.textContent || '';
    const descricao = li.querySelector('.descricao')?.textContent || '';
    const repeticao = li.querySelector('.repeticao')?.textContent || '';

    const nomeEl = $('nome'), valorEl = $('valor'), dataEl = $('data'), tipoEl = $('tipo'), submitBtn = $('submit-button'), textarea = document.querySelector('textarea');
    if (nomeEl) nomeEl.value = nome;
    if (valorEl) valorEl.value = valor || '';
    if (dataEl) dataEl.value = data ? data.split('/').reverse().join('-') : '';
    if (tipoEl) tipoEl.value = tipo;
    if (textarea) textarea.value = descricao || '';
    editarItemAtual = li;
    if (submitBtn) submitBtn.textContent = 'Salvar';
  }

  function duplicarItem(li, tipo) {
    if (!li) return;
    const nome = li.querySelector('.nome')?.textContent || '';
    const valor = parseValor(li.querySelector('.valor')?.textContent || '');
    const data = li.querySelector('.data')?.textContent || '';
    const descricao = li.querySelector('.descricao')?.textContent || '';
    adicionarEntrada(nome, valor, data ? data.split('/').reverse().join('-') : '', tipo, descricao, '');
  }

  function getDadosDaLista(id) {
    const cont = $(id);
    if (!cont) return [];
    return q(cont, 'li').map(li => ({
      nome: li.querySelector('.nome')?.textContent || '',
      valor: parseValor(li.querySelector('.valor')?.textContent || ''),
      data: li.querySelector('.data')?.textContent || '',
      descricao: li.querySelector('.descricao')?.textContent || '',
      repeticao: li.querySelector('.repeticao')?.textContent || ''
    }));
  }

  function importarLista(tipo, lista) {
    const cont = $(tipo + '-list');
    if (!cont) return;
    cont.innerHTML = '';
    if (tipo === 'renda') totalRenda = 0;
    else if (tipo === 'saldo') totalSaldo = 0;
    else totalDespesas = 0;

    (lista || []).forEach(item => {
      // item.data pode estar em dd/mm/aaaa ou iso
      const dataISO = item.data && item.data.includes('/') ? item.data.split('/').reverse().join('-') : (item.data || '');
      adicionarEntrada(item.nome, item.valor, dataISO, tipo, item.descricao || '', item.repeticao || '');
    });
    atualizarResumo();
  }

  // proteção para inserir texto seguro em HTML
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // bind form
  function bindForm() {
    const form = $('entry-form');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const nome = ($('nome')?.value || '').trim();
      const valorRaw = $('valor')?.value;
      const valor = Number(parseFloat(valorRaw));
      const data = $('data')?.value || '';
      const tipo = $('tipo')?.value || '';
      const descricao = document.querySelector('textarea')?.value || '';
      const repeticao = $('Rep')?.value || '';

      if (!nome || !Number.isFinite(valor) || !data || !tipo) {
        alert('Por favor, preencha todos os campos corretamente (nome, valor, data e tipo).');
        return;
      }

      if (editarItemAtual) {
        // ao editar, removemos a entrada antiga (que ajusta totais) e adicionamos nova
        const liAntiga = editarItemAtual;
        // inferimos o tipo atual do form (pode mudar)
        removerEntrada(liAntiga, tipo);
        adicionarEntrada(nome, valor, data, tipo, descricao, repeticao);
        editarItemAtual = null;
      } else {
        adicionarEntrada(nome, valor, data, tipo, descricao, repeticao);
      }

      form.reset();
      const submitBtn = $('submit-button');
      if (submitBtn) submitBtn.textContent = 'Adicionar';
      $('nome')?.focus();
    }, { passive: false });
  }

  // inicialização ao carregar DOM
  window.addEventListener('DOMContentLoaded', () => {
    bindForm();
    carregarLocal();
    atualizarResumo();
  });

  // expor algumas funções para console se necessário
  window._flowcash = { adicionarEntrada, getDadosDaLista, salvarLocal, carregarLocal };
})();

// Code.js — versão otimizada e funcional (refatorado para performance e estabilidade)

/* ---------------- utilitários ---------------- */
const $ = id => document.getElementById(id);
const q = (root, sel) => [...(root || document).querySelectorAll(sel)];
const clamp = (v, a = 0, b = Infinity) => Math.max(a, Math.min(b, v));

const parseValor = s => {
  if (s == null) return 0;
  const raw = String(s).replace(/\s/g, '').replace('R$', '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
};
const formatValor = v => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;
const isoToBr = iso => iso ? iso.slice(0, 10).split('-').reverse().join('/') : '';
const brToIso = br => br ? br.split('/').reverse().join('-') : '';

/* ---------------- relógio e SW ---------------- */
(function initClockAndSW() {
  function atualizarDataHora() {
    const agora = new Date();
    const el = $('dataHora');
    if (el) el.textContent = `${agora.toLocaleDateString('pt-BR')} ${agora.toLocaleTimeString('pt-BR')}`;
  }
  atualizarDataHora();
  setInterval(atualizarDataHora, 1000);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker?.register?.('/service-worker.js')
        .then(r => console.log('Service Worker registrado: ', r))
        .catch(() => {/* SW opcional - falha silenciosa */});
    });
  }
})();

/* ---------------- estado global ---------------- */
let totalRenda = 0, totalSaldo = 0, totalDespesas = 0;
let editarItemAtual = null;
const cores = { renda: '#4caf50', despesas: '#f44336', lucro: '#2196f3' };

/* ---------------- debounce / throttle util ---------------- */
const debounce = (fn, wait = 150) => {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), wait); };
};

/* ---------------- persistência e resumo ---------------- */
const SAVE_KEY = 'flowcash-dados';
const HISTORY_KEY = 'historico-lucro-mensal';
const THEME_KEY = 'flowcash-tema';

function salvarLocalmente() {
  try {
    const payload = {
      renda: getDadosDaLista('renda-list'),
      saldo: getDadosDaLista('saldo-list'),
      despesas: getDadosDaLista('despesas-list'),
      historicoLucro: obterHistoricoLucro(),
      listas: allLists
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.error('Erro ao salvar localmente', e);
  }
}
const debouncedSalvarLocalmente = debounce(salvarLocalmente, 250);

function carregarLocal() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw);
    ['renda', 'saldo', 'despesas'].forEach(t => {
      if (obj[t]) importarLista(t, obj[t]);
    });
    if (obj.historicoLucro) {
      salvarHistoricoLucro(obj.historicoLucro);
    }
    if (obj.listas) {
      allLists = obj.listas;
      saveAllLists();
      renderListsManager();
      renderCurrentList();
    }
  } catch (e) {
    console.error('Erro parse localStorage', e);
  }
}

function atualizarResumo() {
  const receitaEl = $('receita-value'), saldoEl = $('saldo-value'), despesasEl = $('despesas-value'), lucroEl = $('lucro-value');
  if (receitaEl) receitaEl.textContent = totalRenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  if (saldoEl) saldoEl.textContent = totalSaldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  if (despesasEl) despesasEl.textContent = totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  if (lucroEl) lucroEl.textContent = (totalRenda - totalDespesas).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  // Atualizações visuais e persistência
  requestAnimationFrame(() => {
    desenharGraficoPizza();
    desenharGraficosDetalhados();
    desenharGraficoLucroMensal();
    verificarNotificacoes();
    debouncedSalvarLocalmente();
  });
}

/* ---------------- CRUD entradas (otimizado) ---------------- */
function criarBotoesAcoes(li, tipo) {
  const wrap = document.createElement('div');
  wrap.className = 'item-actions';
  const makeBtn = (text, fn, title) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    if (title) b.title = title;
    b.addEventListener('click', fn);
    return b;
  };
  wrap.appendChild(makeBtn('Editar', () => editarItem(li, tipo), 'Editar item'));
  wrap.appendChild(makeBtn('Duplicar', () => duplicarItem(li, tipo), 'Duplicar item'));
  wrap.appendChild(makeBtn('Excluir', () => removerEntrada(li, tipo), 'Excluir item'));
  li.appendChild(wrap);
}

function adicionarEntrada(nome, valor, dataISO, tipo) {
  const lista = $(tipo + '-list');
  if (!lista) return;

  // normalize
  const nomeSafe = String(nome || '').trim();
  const valorNum = Number(valor) || 0;
  const dataIsoSafe = dataISO || '';

  const li = document.createElement('li');
  li.innerHTML = `
    <span class="nome">${escapeHtml(nomeSafe)}</span>
    <span class="valor">${formatValor(valorNum)}</span>
    <span class="data">${isoToBr(dataIsoSafe)}</span>
  `;
  criarBotoesAcoes(li, tipo);
  lista.appendChild(li);

  if (tipo === 'renda') totalRenda = +(totalRenda + valorNum);
  else if (tipo === 'saldo') totalSaldo = +(totalSaldo + valorNum);
  else totalDespesas = +(totalDespesas + valorNum);

  atualizarResumo();
}

function gerarRepeticoes(nome, valor, dataISO, tipo, repeticao) {
    if (!repeticao) return;

    const dataBase = new Date(dataISO);
    const listaGerada = [];

    for (let i = 1; i <= 12; i++) {
        const d = new Date(dataBase);

        if (repeticao === "renda") { 
            d.setDate(d.getDate() + 7 * i);  // semanal
        }
        else if (repeticao === "saldo") {
            d.setMonth(d.getMonth() + i);    // mensal
        }
        else if (repeticao === "despesas") {
            d.setDate(d.getDate() + 30 * i); // intervalo simples
        }

        const novaDataISO = d.toISOString().slice(0, 10);
        adicionarEntrada(nome, valor, novaDataISO, tipo);
    }
}


function removerEntrada(li, tipo) {
  if (!li) return;
  const vEl = li.querySelector('.valor');
  const valor = vEl ? parseValor(vEl.textContent) : 0;
  if (tipo === 'renda') totalRenda = +(totalRenda - valor);
  else if (tipo === 'saldo') totalSaldo = +(totalSaldo - valor);
  else totalDespesas = +(totalDespesas - valor);

  if (editarItemAtual === li) {
    editarItemAtual = null;
    const form = $('entry-form');
    if (form) form.reset();
    const submitBtn = $('submit-button');
    if (submitBtn) submitBtn.textContent = 'Adicionar';
  }
  li.remove();
  atualizarResumo();
}

function editarItem(li, tipo) {
  if (!li) return;
  const nome = li.querySelector('.nome')?.textContent || '';
  const valor = parseValor(li.querySelector('.valor')?.textContent || '');
  const data = li.querySelector('.data')?.textContent || '';

  const nomeEl = $('nome'), valorEl = $('valor'), dataEl = $('data'), tipoEl = $('tipo'), submitBtn = $('submit-button');
  if (nomeEl) nomeEl.value = nome;
  if (valorEl) valorEl.value = valor.toFixed(2);
  if (dataEl) dataEl.value = brToIso(data);
  if (tipoEl) tipoEl.value = tipo;
  editarItemAtual = li;
  if (submitBtn) submitBtn.textContent = 'Salvar';
}

function duplicarItem(li, tipo) {
  if (!li) return;
  const nome = li.querySelector('.nome')?.textContent || '';
  const valor = parseValor(li.querySelector('.valor')?.textContent || '');
  const data = brToIso(li.querySelector('.data')?.textContent || '');
  adicionarEntrada(nome, valor, data, tipo);
}

/* ---------------- formulário (com validação leve) ---------------- */


/* ---------------- export / import (robusto) ---------------- */
(function bindExportImport() {
  const btnExport = $('export');
  const btnImport = $('import');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const data = {
        renda: getDadosDaLista('renda-list'),
        saldo: getDadosDaLista('saldo-list'),
        despesas: getDadosDaLista('despesas-list'),
        historicoLucro: obterHistoricoLucro(),
        listas: allLists
      };
      const agora = new Date();
      const nomeArquivo = `Dados_${String(agora.getDate()).padStart(2, '0')}_${String(agora.getMonth() + 1).padStart(2, '0')}_${agora.getFullYear()}_${String(agora.getHours()).padStart(2, '0')}-${String(agora.getMinutes()).padStart(2, '0')}.json`;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = nomeArquivo; a.click();
      URL.revokeObjectURL(url);
    }, { passive: true });
  }

  if (btnImport) {
    btnImport.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';
      input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const dados = JSON.parse(ev.target.result);
            if (dados.renda) importarLista('renda', dados.renda);
            if (dados.saldo) importarLista('saldo', dados.saldo);
            if (dados.despesas) importarLista('despesas', dados.despesas);
            if (dados.historicoLucro) {
              salvarHistoricoLucro(dados.historicoLucro);
            }
            if (dados.listas) {
              allLists = dados.listas;
              saveAllLists();
              renderListsManager();
              renderCurrentList();
            }
            alert('Importação concluída!');
          } catch (err) {
            console.error(err);
            alert('Erro ao importar o arquivo JSON.');
          }
        };
        reader.readAsText(file);
      }, { passive: true });
      input.click();
    }, { passive: true });
  }
})();

function getDadosDaLista(id) {
  const cont = $(id);
  if (!cont) return [];
  return q(cont, 'li').map(li => ({
    nome: li.querySelector('.nome')?.textContent || '',
    valor: parseValor(li.querySelector('.valor')?.textContent || ''),
    data: li.querySelector('.data')?.textContent || ''
  }));
}

function importarLista(tipo, lista) {
  const cont = $(tipo + '-list');
  if (!cont) return;
  cont.innerHTML = '';
  if (tipo === 'renda') totalRenda = 0;
  else if (tipo === 'saldo') totalSaldo = 0;
  else totalDespesas = 0;

  (lista || []).forEach(item => {
    const dataISO = item.data && item.data.includes('/') ? brToIso(item.data) : (item.data || '');
    adicionarEntrada(item.nome, item.valor, dataISO, tipo);
  });
  atualizarResumo();
}

/* ---------------- gráficos (pizza principal) ---------------- */
let setoresPizza = [];
function desenharGraficoPizza() {
  const canvas = $('graficoPizza');
  const legenda = $('legendaPizza');
  if (!canvas || !legenda) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  const ctxL = legenda.getContext('2d', { alpha: true });

  const dados = [
    { label: 'Renda', valor: totalRenda, cor: cores.renda },
    { label: 'Despesas', valor: totalDespesas, cor: cores.despesas },
    { label: 'Lucro', valor: totalRenda - totalDespesas, cor: cores.lucro }
  ].filter(d => d.valor !== 0);

  const total = dados.reduce((s, d) => s + Math.max(0, d.valor), 0) || 1;
  const centro = { x: canvas.width / 2, y: canvas.height / 2, r: Math.min(canvas.width, canvas.height) / 2 - 10 };

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  setoresPizza = [];
  let angIni = -Math.PI / 2; // começa no topo para melhor leitura
  dados.forEach(dado => {
    const ang = (dado.valor / total) * Math.PI * 2;
    const angFim = angIni + ang;
    ctx.beginPath();
    ctx.moveTo(centro.x, centro.y);
    ctx.arc(centro.x, centro.y, centro.r, angIni, angFim);
    ctx.closePath();
    ctx.fillStyle = dado.cor;
    ctx.fill();
    setoresPizza.push({ ...dado, anguloInicial: angIni, anguloFinal: angFim, centro });
    angIni = angFim;
  });

  // legenda
  ctxL.clearRect(0, 0, legenda.width, legenda.height);
  ctxL.font = '12px Arial';
  dados.forEach((d, i) => {
    const y = 15 + i * 18;
    ctxL.fillStyle = d.cor;
    ctxL.fillRect(6, y - 10, 12, 12);
    ctxL.fillStyle = '#000';
    ctxL.fillText(`${d.label}: ${formatNumberBr(d.valor)}`, 24, y);
  });
}
function formatNumberBr(v) {
  return `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;
}

function destacarSetor(x, y) {
  const canvas = $('graficoPizza'); if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const centro = { x: canvas.width / 2, y: canvas.height / 2, r: Math.min(canvas.width, canvas.height) / 2 - 10 };
  const dx = x - centro.x, dy = y - centro.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > centro.r) return;
  const ang = Math.atan2(dy, dx);
  const angCorr = ang < -Math.PI / 2 ? ang + Math.PI * 2 : ang; // normalize near start
  const setor = setoresPizza.find(s => {
    // normaliza ângulos
    const start = s.anguloInicial, end = s.anguloFinal;
    return angCorr >= start && angCorr <= end;
  });
  if (!setor) return;

  desenharGraficoPizza();
  ctx.beginPath();
  ctx.moveTo(centro.x, centro.y);
  ctx.arc(centro.x, centro.y, centro.r + 6, setor.anguloInicial, setor.anguloFinal);
  ctx.closePath();
  ctx.fillStyle = setor.cor;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();
  const vs = $('valorSelecionado');
  if (vs) vs.textContent = `Valor: ${formatNumberBr(setor.valor)}`;
}

(function bindPizzaClick() {
  const canvas = $('graficoPizza');
  if (!canvas) return;
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    destacarSetor(x, y);
  }, { passive: true });
})();

/* ---------------- gráficos detalhados (despesas/rendas) ---------------- */
function desenharPizzaDetalhada(listaId, canvasId, tipo) {
  const canvas = $(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const lista = $(listaId);
  if (!lista) return;

  const dados = q(lista, 'li').map(li => ({
    nome: li.querySelector('.nome')?.textContent || '',
    valor: parseValor(li.querySelector('.valor')?.textContent || '')
  }));
  const total = dados.reduce((s, d) => s + d.valor, 0) || 1;
  const centro = { x: canvas.width / 2, y: canvas.height / 2, r: Math.min(canvas.width, canvas.height) / 2 - 8 };
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let angIni = -Math.PI / 2;
  const setores = [];
  dados.forEach((item, i) => {
    const ang = (item.valor / total) * Math.PI * 2;
    const angFim = angIni + ang;
    const cor = `hsl(${(i * 50) % 360} 70% 60%)`;
    ctx.beginPath();
    ctx.moveTo(centro.x, centro.y);
    ctx.arc(centro.x, centro.y, centro.r, angIni, angFim);
    ctx.closePath();
    ctx.fillStyle = cor;
    ctx.fill();
    setores.push({ nome: item.nome, valor: item.valor, cor, anguloInicial: angIni, anguloFinal: angFim, centro });
    angIni = angFim;
  });

  selecionarFatiasComRoda(canvasId, setores);

  canvas.onclick = function (e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const dx = x - centro.x, dy = y - centro.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > centro.r) return;
    const ang = Math.atan2(dy, dx);
    const angCorr = ang < -Math.PI / 2 ? ang + Math.PI * 2 : ang;
    const clicado = setores.find(s => angCorr >= s.anguloInicial && angCorr <= s.anguloFinal);
    if (clicado) {
      desenharGraficosDetalhados();
      ctx.beginPath();
      ctx.moveTo(centro.x, centro.y);
      ctx.arc(centro.x, centro.y, centro.r + 6, clicado.anguloInicial, clicado.anguloFinal);
      ctx.closePath();
      ctx.fillStyle = clicado.cor;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.fill(); ctx.stroke();
      mostrarDetalheFatias(clicado.nome, clicado.valor, tipo);
    }
  };
}

function desenharGraficosDetalhados() {
  desenharPizzaDetalhada('despesas-list', 'graficoDespesas', 'despesa');
  desenharPizzaDetalhada('renda-list', 'graficoRendas', 'renda');
}

/* ---------------- detalhe fatias ---------------- */
function mostrarDetalheFatias(nome, valor, tipo) {
  const painel = $('detalhe-fatias');
  if (!painel) return;
  const listaId = tipo === 'renda' ? 'renda-list' : 'despesas-list';
  const dados = getDadosDaLista(listaId);
  const total = Math.max(1, dados.reduce((s, i) => s + i.valor, 0));
  const porcent = ((valor / total) * 100).toFixed(1);
  painel.innerHTML = `
    
    <div class="menu_box_out">
      <div class="menu_box">
      <h2 style="margin:0 0 6px 0">${tipo === 'renda' ? 'Renda' : 'Despesa'}</h2>
        <p><strong>Nome:</strong> ${escapeHtml(nome)}</p>
        <p><strong>Valor:</strong> ${formatNumberBr(valor)}</p>
        <p><strong>Porcentagem:</strong> ${porcent}%</p>
      </div>
    </div>
  `;
}

/* ---------------- histórico de lucro mensal ---------------- */
function obterHistoricoLucro() {
  try {
    const v = localStorage.getItem(HISTORY_KEY);
    return v ? JSON.parse(v) : [];
  } catch { return []; }
}
function salvarHistoricoLucro(lista) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(lista || []));
  } catch (e) { console.error(e); }
}
function salvarLucroManual() {
  const historico = obterHistoricoLucro();
  const hoje = new Date();
  const mesAtual = hoje.toISOString().slice(0, 7);
  const lucroAtual = totalRenda - totalDespesas;
  const idx = historico.findIndex(i => i.mes === mesAtual);
  if (idx !== -1) {
    if (!confirm("Você já salvou o lucro deste mês. Deseja substituir?")) return;
    historico[idx].lucro = lucroAtual;
  } else {
    historico.push({ mes: mesAtual, lucro: lucroAtual });
    if (historico.length > 12) historico.shift();
  }
  salvarHistoricoLucro(historico);
  desenharGraficoLucroMensal();
}
window.salvarLucroManual = salvarLucroManual;

function desenharGraficoLucroMensal() {
  const canvas = $('graficoLucroMensal');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const historico = obterHistoricoLucro() || [];
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const padding = 40;
  const largura = canvas.width - padding * 2;
  const altura = canvas.height - padding * 2;
  const valores = historico.map(d => Number(d.lucro || 0));
  const maxLucro = Math.max(...valores, 1);
  const barras = Math.min(12, historico.length || 0);
  const larguraBarra = barras ? (largura / barras) - 6 : 0;

  historico.forEach((item, i) => {
    const x = padding + i * (larguraBarra + 6);
    const h = (Number(item.lucro || 0) / maxLucro) * altura;
    const y = canvas.height - padding - h;
    ctx.fillStyle = '#3e8ed0';
    ctx.fillRect(x, y, larguraBarra, h);
    ctx.fillStyle = '#000';
    ctx.font = '13px Arial';
    const partes = String(item.mes || '').split('-');
    const nomeMes = partes.length === 2 ? new Date(partes[0], partes[1] - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }) : '';
    ctx.fillText(nomeMes, x + 2, canvas.height - 12);
    ctx.fillText(Math.round(item.lucro || 0).toString(), x + 2, y - 6);
  });
}

/* ---------------- notificações ---------------- */
function verificarNotificacoes() {
  const painel = document.querySelector('.notifications');
  if (!painel) return;
  painel.innerHTML = '<h2 style="margin:0 0 8px 0">Notificações</h2>';
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const notificacoes = [];

  const processar = (item, tipo) => {
    if (!item || !item.data) return;
    const [d, m, y] = item.data.split('/');
    if (!d || !m || !y) return;
    const dataItem = new Date(`${y}-${m}-${d}T00:00:00`);
    const diffDias = Math.floor((dataItem - hoje) / (1000 * 60 * 60 * 24));
    let mensagem = '', classe = '';
    if (diffDias < 0) { mensagem = `[${tipo.toUpperCase()}] "${item.nome}" está vencido há ${Math.abs(diffDias)} dias.`; classe = 'vencido'; }
    else if (diffDias <= 5) { mensagem = `[${tipo.toUpperCase()}] "${item.nome}" vence em ${diffDias} dias!`; classe = 'alerta'; }
    else if (diffDias <= 10) { mensagem = `[${tipo.toUpperCase()}] "${item.nome}" vence em ${diffDias} dias.`; classe = 'aviso'; }
    if (mensagem) notificacoes.push({ mensagem, classe });
  };

  getDadosDaLista('despesas-list').forEach(i => processar(i, 'despesa'));

  if (notificacoes.length === 0) painel.innerHTML += '<p style="color: #666;">Nenhuma notificação no momento.</p>';
  else notificacoes.forEach(n => {
    const div = document.createElement('div');
    div.textContent = n.mensagem;
    div.style.padding = '8px';
    div.style.marginTop = '8px';
    div.style.borderRadius = '8px';
    div.style.fontSize = '0.9rem';
    div.style.background = n.classe === 'alerta' ? '#fff3cd' : (n.classe === 'vencido' ? '#f8d7da' : '#d1ecf1');
    div.style.border = n.classe === 'alerta' ? '1px solid #ffeeba' : (n.classe === 'vencido' ? '1px solid #f5c6cb' : '1px solid #bee5eb');
    painel.appendChild(div);
  });
}

/* ---------------- filtros (debounced) ---------------- */
function aplicarFiltros() {
  const nomeFiltro = ($('filtro-nome')?.value || '').toLowerCase();
  const dataDe = $('filtro-data-de')?.value ? new Date($('filtro-data-de').value) : null;
  const dataAte = $('filtro-data-ate')?.value ? new Date($('filtro-data-ate').value) : null;
  const valorDe = Number(parseFloat($('filtro-valor-de')?.value)) || null;
  const valorAte = Number(parseFloat($('filtro-valor-ate')?.value)) || null;

  ['renda-list', 'saldo-list', 'despesas-list'].forEach(listaId => {
    q($(listaId), 'li').forEach(li => {
      const nome = li.querySelector('.nome')?.textContent.toLowerCase() || '';
      const dataTexto = li.querySelector('.data')?.textContent || '';
      const valor = parseValor(li.querySelector('.valor')?.textContent || '');

      // Converte dd/mm/aaaa para Date
      let dataItem = null;
      if (dataTexto.includes('/')) {
        const [dia, mes, ano] = dataTexto.split('/');
        dataItem = new Date(`${ano}-${mes}-${dia}`);
      }

      const matchNome = !nomeFiltro || nome.includes(nomeFiltro);
      const matchData = (!dataDe || (dataItem && dataItem >= dataDe)) && (!dataAte || (dataItem && dataItem <= dataAte));
      const matchValor = (!valorDe || valor >= valorDe) && (!valorAte || valor <= valorAte);

      li.style.display = (matchNome && matchData && matchValor) ? '' : 'none';
    });
  });
}
const debouncedAplicarFiltros = debounce(aplicarFiltros, 160);
['filtro-nome', 'filtro-data-de', 'filtro-data-ate', 'filtro-valor-de', 'filtro-valor-ate']
  .forEach(id => { const el = $(id); if (el) el.addEventListener('input', debouncedAplicarFiltros); });

/* ---------------- inicialização ---------------- */
window.addEventListener('load', () => {
  carregarLocal();
  desenharGraficoPizza();
  desenharGraficosDetalhados();
  desenharGraficoLucroMensal();
  verificarNotificacoes();

  // Tema salvo (se existir): tenta aplicar sem quebrar se controle não existir
  const temaSalvo = localStorage.getItem(THEME_KEY) || 'bege';
  try {
    document.body.classList.add('tema-' + temaSalvo);
    const temaSelect = $('tema-select');
    if (temaSelect) {
      temaSelect.value = temaSalvo;
      temaSelect.addEventListener('change', () => {
        const val = temaSelect.value || 'bege';
        document.body.classList.remove('tema-bege', 'tema-dark', 'tema-light');
        document.body.classList.add('tema-' + val);
        localStorage.setItem(THEME_KEY, val);
      });
    }
  } catch (e) { /* ignore */ }
});

/* ---------------- troca de seções (simples, delegada) ---------------- */
function showSection(sectionId, button) {
  q(document, 'section').forEach(sec => sec.classList.remove('active'));
  const sec = $(sectionId);
  if (sec) sec.classList.add('active');
  q(document, '.Content-nav-menu').forEach(btn => btn.classList.remove('active'));
  if (button) button.classList.add('active');

  // garante que gráficos sejam redesenhados ao entrar na aba
  requestAnimationFrame(() => {
    desenharGraficoPizza();
    desenharGraficosDetalhados();
    desenharGraficoLucroMensal();
  });
}

/* ---------------- calculadora (pequenas proteções) ---------------- */
function calcAdd(val) {
  const d = $('calc-display');
  if (!d) return;
  d.value = (d.value || '') + String(val);
}
function calcClear() { const d = $('calc-display'); if (d) d.value = ''; }
function calcResult() {
  const d = $('calc-display'); if (!d) return;
  try { /* eslint-disable no-eval */ d.value = eval(d.value) || ''; /* eslint-enable no-eval */ }
  catch { alert('Erro na expressão'); }
}

/* ---------------- lista com checklist ---------------- */
function loadCustomList() {
  try {
    const saved = JSON.parse(localStorage.getItem('flowcash-custom-list') || '[]');
    saved.forEach(item => createListItem(item.text, item.checked));
  } catch { /* ignore */ }
}
function saveCustomList() {
  const items = q($('custom-list'), 'li').map(li => ({
    text: li.querySelector('span')?.textContent || '',
    checked: !!li.querySelector('input[type="checkbox"]')?.checked
  }));
  localStorage.setItem('flowcash-custom-list', JSON.stringify(items));
}

function createListItem(text, checked = false, save = true, type = 'normal') {
  const li = document.createElement('li');

  const chk = document.createElement('input');
  chk.type = 'checkbox';
  chk.checked = !!checked;
  chk.addEventListener('change', saveCustomList);

  const span = document.createElement('span');
  span.textContent = text;

  const actions = document.createElement('div');
  actions.className = 'item-actions';

  const btnEdit = document.createElement('button');
  btnEdit.type = 'button';
  btnEdit.textContent = 'Editar';
  btnEdit.addEventListener('click', () => {
    const novo = prompt('Editar item:', span.textContent);
    if (novo != null) {
      span.textContent = novo;
      saveCustomList();
      if (currentList) saveCurrentList();
    }
  });

  const btnDup = document.createElement('button');
  btnDup.type = 'button';
  btnDup.textContent = 'Duplicar';
  btnDup.addEventListener('click', () => {
    createListItem(span.textContent, chk.checked);
    saveCustomList();
  });

  const btnDel = document.createElement('button');
  btnDel.type = 'button';
  btnDel.textContent = 'Excluir';
  btnDel.addEventListener('click', () => { li.remove(); saveCustomList(); if (currentList) saveCurrentList(); });

  actions.appendChild(btnEdit);
  actions.appendChild(btnDup);
  actions.appendChild(btnDel);

  li.appendChild(chk);
  li.appendChild(span);
  li.appendChild(actions);
  $('custom-list')?.appendChild(li);

  if (save) saveCustomList();
  return li;
}


/* ---------------- Gerenciador de Listas ---------------- */
let allLists = {};
let currentList = null;

function loadAllLists() {
  try {
    allLists = JSON.parse(localStorage.getItem('flowcash-lists') || '{}');
  } catch { allLists = {}; }
  renderListsManager();
}

function saveAllLists() {
  try { localStorage.setItem('flowcash-lists', JSON.stringify(allLists)); } catch (e) { console.error(e); }
}

function renderListsManager() {
  const container = $('lists-manager');
  if (!container) return;
  container.innerHTML = '';
  Object.keys(allLists).forEach(listName => {
    const li = document.createElement('li');
    li.textContent = `${listName} ${allLists[listName].type === 'checklist' ? '✔' : '📄'}`;
    if (listName === currentList) li.classList.add('active');

    const actions = document.createElement('div');
    actions.className = 'list-actions';

    const btnSel = document.createElement('button');
    btnSel.type = 'button'; btnSel.textContent = 'Abrir';
    btnSel.addEventListener('click', () => { currentList = listName; renderCurrentList(); renderListsManager(); });

    const btnDel = document.createElement('button');
    btnDel.type = 'button'; btnDel.textContent = 'Excluir';
    btnDel.addEventListener('click', () => {
      if (confirm(`Excluir lista "${listName}"?`)) {
        delete allLists[listName];
        if (currentList === listName) currentList = null;
        saveAllLists(); renderListsManager(); renderCurrentList();
      }
    });

    actions.appendChild(btnSel);
    actions.appendChild(btnDel);
    li.appendChild(actions);
    container.appendChild(li);
  });
}

function filterListsAndItems() {
  const term = ($('search-lists')?.value || '').trim().toLowerCase();

  q($('lists-manager'), 'li').forEach(li => {
    li.style.display = li.textContent.toLowerCase().includes(term) ? '' : 'none';
  });

  q($('custom-list'), 'li').forEach(li => {
    const text = li.querySelector('span')?.textContent.toLowerCase() || '';
    li.style.display = text.includes(term) ? '' : 'none';
  });
}
$('search-lists')?.addEventListener('input', debounce(filterListsAndItems, 120));

function createNewList() {
  const name = ($('new-list-name')?.value || '').trim();
  const type = $('new-list-type')?.value || 'normal';
  if (!name || allLists[name]) return;
  allLists[name] = { type: type, items: [] };
  currentList = name;
  saveAllLists();
  renderListsManager();
  renderCurrentList();
  if ($('new-list-name')) $('new-list-name').value = '';
}

function renderCurrentList() {
  const ul = $('custom-list');
  if (!ul) return;
  ul.innerHTML = '';
  const title = $('current-list-title');
  if (!currentList) {
    if (title) title.textContent = 'Nenhuma lista selecionada';
    return;
  }
  if (title) title.textContent = `Itens da Lista: ${currentList}`;
  const listData = allLists[currentList];
  (listData.items || []).forEach(item => createListItem(item.text, item.checked, false, listData.type));
}

function saveCurrentList() {
  if (!currentList) return;
  const listType = allLists[currentList].type;
  const items = q($('custom-list'), 'li').map(li => ({
    text: li.querySelector('span')?.textContent || '',
    checked: !!li.querySelector('input[type="checkbox"]')?.checked
  }));
  allLists[currentList].items = items;
  saveAllLists();
}

/* ---------------- util: selecionar fatias com roda ---------------- */
function selecionarFatiasComRoda(canvasId, setores) {
  const canvas = $(canvasId);
  if (!canvas || !Array.isArray(setores) || setores.length === 0) return;

  let indiceAtual = 0;
  const onWheel = (e) => {
    e.preventDefault();
    const direcao = e.deltaY > 0 ? 1 : -1;
    indiceAtual = (indiceAtual + direcao + setores.length) % setores.length;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setores.forEach((setor, i) => {
      ctx.beginPath();
      ctx.moveTo(setor.centro.x, setor.centro.y);
      ctx.arc(setor.centro.x, setor.centro.y, setor.centro.r, setor.anguloInicial, setor.anguloFinal);
      ctx.closePath();
      ctx.fillStyle = setor.cor;
      ctx.fill();

      if (i === indiceAtual) {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    const setorSelecionado = setores[indiceAtual];
    const tipo = canvasId.toLowerCase().includes('despesas') ? 'despesa' : 'renda';
    mostrarDetalheFatias(setorSelecionado.nome, setorSelecionado.valor, tipo);
  };

  // remove listeners antigos para evitar duplicação
  canvas.onwheel = null;
  canvas.addEventListener('wheel', onWheel, { passive: false });
}

/* ---------------- util: escape HTML para inserir texto seguro ---------------- */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* ---------------- util pequeno: evitar erros com elementos inexistentes ---------------- */
function safeQ(id) { return $(id) || document.createElement('div'); }

/* ---------------- expose minimal globals for HTML onclick bindings (se necessário) ---------------- */
window.showSection = showSection;
window.salvarLucroManual = salvarLucroManual;
window.calcAdd = calcAdd;
window.calcClear = calcClear;
window.calcResult = calcResult;
window.createNewList = createNewList;
window.saveCurrentList = saveCurrentList;

/* ---------------- inicial: carregar gerenciador de listas se existir ---------------- */
try { loadAllLists(); } catch (e) { /* ignore */ }


function addListItem() {
  const val = ($('list-input')?.value || '').trim();
  if (!val) return;
  createListItem(val);
  if ($('list-input')) $('list-input').value = '';
  saveCustomList();
}
window.addListItem = addListItem;
window.addEventListener('load', loadCustomList);

function adicionarEntrada(nome, valor, dataISO, tipo, descricao = '', repeticao = '') {
  const lista = $(tipo + '-list');
  if (!lista) return;

  const nomeSafe = String(nome || '').trim();
  const valorNum = Number(valor) || 0;
  const dataIsoSafe = dataISO || '';

  const li = document.createElement('li');
  li.innerHTML = `
    <span class="nome">${escapeHtml(nomeSafe)}</span>
    <span class="valor">${formatValor(valorNum)}</span>
    <span class="data">${isoToBr(dataIsoSafe)}</span>
    ${descricao ? `<span class="descricao">${escapeHtml(descricao)}</span>` : ''}
    ${repeticao ? `<span class="repeticao">🔁 ${escapeHtml(repeticao)}</span>` : ''}
  `;
  criarBotoesAcoes(li, tipo);
  lista.appendChild(li);

  if (tipo === 'renda') totalRenda += valorNum;
  else if (tipo === 'saldo') totalSaldo += valorNum;
  else totalDespesas += valorNum;

  atualizarResumo();
}
form.addEventListener('submit', function (e) {
  e.preventDefault();
  const nome = ($('nome')?.value || '').trim();
  const valor = Number(parseFloat($('valor')?.value));
  const data = $('data')?.value || '';
  const tipo = $('tipo')?.value || '';
  const descricao = document.querySelector('textarea')?.value || '';
  const repeticao = $('Rep')?.value || '';

  if (!nome || !Number.isFinite(valor) || !data || !tipo) {
    alert('Por favor, preencha todos os campos corretamente.');
    return;
  }

  if (editarItemAtual) {
    removerEntrada(editarItemAtual, tipo);
    adicionarEntrada(nome, valor, data, tipo, descricao, repeticao);
    editarItemAtual = null;
  } else {
    adicionarEntrada(nome, valor, data, tipo, descricao, repeticao);
  }

  form.reset();
  $('submit-button').textContent = 'Adicionar';
  $('nome')?.focus();
});
function getDadosDaLista(id) {
  const cont = $(id);
  if (!cont) return [];
  return q(cont, 'li').map(li => ({
    nome: li.querySelector('.nome')?.textContent || '',
    valor: parseValor(li.querySelector('.valor')?.textContent || ''),
    data: li.querySelector('.data')?.textContent || '',
    descricao: li.querySelector('.descricao')?.textContent || '',
    repeticao: li.querySelector('.repeticao')?.textContent.replace('🔁 ', '') || ''
  }));
}
// ============= INICIALIZAÇÃO =============

// quando a página terminar de carregar, restaurar dados salvos
window.addEventListener("DOMContentLoaded", () => {
  carregarLocal();     // carrega dados do localStorage
  atualizarResumo();   // redesenha totais e gráficos
});


// Quando a página carregar, recupera os dados do localStorage
window.addEventListener('DOMContentLoaded', () => {
  carregarLocal();
  atualizarResumo();
});




(function bindForm() {
    const form = $('entry-form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const nome = ($('nome')?.value || '').trim();
        const valor = parseValor($('valor')?.value || '');
        const data = $('data')?.value || '';
        const tipo = $('tipo')?.value || '';

        if (!nome || !Number.isFinite(valor) || !data || !tipo) {
            alert('Preencha todos os campos');
            return;
        }

        if (editarItemAtual) {
            const antigo = editarItemAtual;
            removerEntrada(antigo, tipo);
            adicionarEntrada(nome, valor, data, tipo);
            editarItemAtual = null;
        } else {
            adicionarEntrada(nome, valor, data, tipo);
        }

        form.reset();
        $('submit-button').textContent = 'Adicionar';
    });
})();
