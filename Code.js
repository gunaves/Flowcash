// Code.js — versão otimizada e funcional

/* ---------------- utilitários ---------------- */
const $ = id => document.getElementById(id);
const q = (root, sel) => [...(root || document).querySelectorAll(sel)];
const parseValor = s => parseFloat(String(s).replace('R$ ', '').replace('.', '').replace(',', '.')) || 0;
const formatValor = v => `R$ ${Number(v).toFixed(2).replace('.', ',')}`;
const isoToBr = iso => iso ? iso.split('-').reverse().join('/') : '';
const brToIso = br => br ? br.split('/').reverse().join('-') : '';

/* ---------------- relógio e SW ---------------- */
function atualizarDataHora() {
  const agora = new Date();
  $('dataHora').textContent = `${agora.toLocaleDateString('pt-BR')} ${agora.toLocaleTimeString('pt-BR')}`;
}
setInterval(atualizarDataHora, 1000);
atualizarDataHora();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(r => console.log('Service Worker registrado: ', r))
      .catch(e => console.log('Falha ao registrar SW: ', e));
  });
}

/* ---------------- estado global ---------------- */
let totalRenda = 0, totalSaldo = 0, totalDespesas = 0;
let editarItemAtual = null;
const cores = { renda: '#4caf50', despesas: '#f44336', lucro: '#2196f3' };

/* ---------------- resumo / persistência ---------------- */
function atualizarResumo() {
  $('receita-value').textContent = totalRenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  $('saldo-value').textContent = totalSaldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  $('despesas-value').textContent = totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  $('lucro-value').textContent = (totalRenda - totalDespesas).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  desenharGraficoPizza();
  salvarLocalmente();
  desenharGraficosDetalhados();
  verificarNotificacoes();
}

function salvarLocalmente() {
  localStorage.setItem('flowcash-dados', JSON.stringify({
    renda: getDadosDaLista('renda-list'),
    saldo: getDadosDaLista('saldo-list'),
    despesas: getDadosDaLista('despesas-list'),
    historicoLucro: obterHistoricoLucro()
  }));
}

function carregarLocal() {
  const dados = localStorage.getItem('flowcash-dados');
  if (!dados) return;
  try {
    const obj = JSON.parse(dados);
    ['renda', 'saldo', 'despesas'].forEach(t => {
      if (obj[t]) importarLista(t, obj[t]);
    });
    if (obj.historicoLucro) salvarHistoricoLucro(obj.historicoLucro);
  } catch (e) { console.error('Erro parse localStorage', e); }
}

/* ---------------- CRUD entradas ---------------- */
function criarBotoesAcoes(li, tipo) {
  const wrap = document.createElement('div');
  wrap.className = 'item-actions';
  const makeBtn = (text, fn, title) => {
    const b = document.createElement('button');
    b.textContent = text;
    if (title) b.title = title;
    b.onclick = fn;
    return b;
  };
  wrap.appendChild(makeBtn('Editar', () => editarItem(li, tipo), 'Editar item'));
  wrap.appendChild(makeBtn('Duplicar', () => duplicarItem(li, tipo), 'Duplicar item'));
  wrap.appendChild(makeBtn('Excluir', () => removerEntrada(li, tipo), 'Excluir item'));
  li.appendChild(wrap);
}

function adicionarEntrada(nome, valor, dataISO, tipo) {
  const lista = $(tipo + '-list');
  const li = document.createElement('li');
  li.innerHTML = `<span class="nome">${nome}</span>
                  <span class="valor">${formatValor(valor)}</span>
                  <span class="data">${isoToBr(dataISO)}</span>`;
  criarBotoesAcoes(li, tipo);
  lista.appendChild(li);

  if (tipo === 'renda') totalRenda += +valor;
  else if (tipo === 'saldo') totalSaldo += +valor;
  else totalDespesas += +valor;

  atualizarResumo();
}

function removerEntrada(li, tipo) {
  const valor = parseValor(li.querySelector('.valor').textContent);
  if (tipo === 'renda') totalRenda -= valor;
  else if (tipo === 'saldo') totalSaldo -= valor;
  else totalDespesas -= valor;
  if (editarItemAtual === li) {
    editarItemAtual = null;
    $('entry-form').reset();
    $('submit-button').textContent = 'Adicionar';
  }
  li.remove();
  atualizarResumo();
}

function editarItem(li, tipo) {
  const nome = li.querySelector('.nome').textContent;
  const valor = parseValor(li.querySelector('.valor').textContent);
  const data = li.querySelector('.data').textContent;
  $('nome').value = nome;
  $('valor').value = valor.toFixed(2);
  $('data').value = brToIso(data);
  $('tipo').value = tipo;
  editarItemAtual = li;
  $('submit-button').textContent = 'Salvar';
}

function duplicarItem(li, tipo) {
  const nome = li.querySelector('.nome').textContent;
  const valor = parseValor(li.querySelector('.valor').textContent);
  const data = brToIso(li.querySelector('.data').textContent);
  adicionarEntrada(nome, valor, data, tipo);
}

/* ---------------- formulário ---------------- */
$('entry-form').addEventListener('submit', function (e) {
  e.preventDefault();
  const nome = $('nome').value.trim();
  const valor = parseFloat($('valor').value);
  const data = $('data').value;
  const tipo = $('tipo').value;
  if (!nome || isNaN(valor) || !data || !tipo) {
    alert('Por favor, preencha todos os campos corretamente.');
    return;
  }

  if (editarItemAtual) {
    // ao editar, subtrai o valor antigo (feito em removerEntrada) e cria novo
    const liAntiga = editarItemAtual;
    const tipoAntigo = tipo; // mantém tipo selecionado
    removerEntrada(liAntiga, tipoAntigo);
    adicionarEntrada(nome, valor, data, tipo);
    editarItemAtual = null;
  } else {
    adicionarEntrada(nome, valor, data, tipo);
  }
  this.reset();
  $('submit-button').textContent = 'Adicionar';
  $('nome').focus();
});

/* ---------------- export / import ---------------- */
$('export').addEventListener('click', () => {
  const data = {
    renda: getDadosDaLista('renda-list'),
    saldo: getDadosDaLista('saldo-list'),
    despesas: getDadosDaLista('despesas-list'),
    historicoLucro: obterHistoricoLucro(),
    listas: allLists
  };

  const agora = new Date();
  const nomeArquivo = `Dados_${agora.getDate().toString().padStart(2, '0')}_${(agora.getMonth() + 1).toString().padStart(2, '0')}_${agora.getFullYear()}_${agora.getHours().toString().padStart(2, '0')}-${agora.getMinutes().toString().padStart(2, '0')}.json`;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nomeArquivo; a.click();
  URL.revokeObjectURL(url);
});

$('import').addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const dados = JSON.parse(ev.target.result);

        // Carregar listas padrão (renda, saldo, despesas)
        if (dados.renda) importarLista('renda', dados.renda);
        if (dados.saldo) importarLista('saldo', dados.saldo);
        if (dados.despesas) importarLista('despesas', dados.despesas);

        // Carregar histórico de lucro
        if (dados.historicoLucro) {
          salvarHistoricoLucro(dados.historicoLucro);
          desenharGraficoLucroMensal();
        }

        // Carregar listas personalizadas
        if (dados.listas) {
          allLists = dados.listas;
          saveAllLists();
          renderListsManager();
          renderCurrentList();
        }

        alert('Importação concluída!');
      } catch (err) {
        alert('Erro ao importar o arquivo JSON.');
        console.error(err);
      }
    };
    reader.readAsText(file);
  };
  input.click();
});



function getDadosDaLista(id) {
  return q($(id), 'li').map(li => ({
    nome: li.querySelector('.nome').textContent,
    valor: parseValor(li.querySelector('.valor').textContent),
    data: li.querySelector('.data').textContent
  }));
}

function importarLista(tipo, lista) {
  const cont = $(tipo + '-list');
  cont.innerHTML = '';
  if (tipo === 'renda') totalRenda = 0;
  else if (tipo === 'saldo') totalSaldo = 0;
  else totalDespesas = 0;
  lista.forEach(item => {
    // aceita tanto ISO quanto BR no objeto importado (compatibilidade)
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
  const ctx = canvas.getContext('2d');
  const ctxL = legenda.getContext('2d');

  let dados = [
    { label: 'Renda', valor: totalRenda, cor: cores.renda },
    { label: 'Despesas', valor: totalDespesas, cor: cores.despesas },
    { label: 'Lucro', valor: totalRenda - totalDespesas, cor: cores.lucro }
  ].filter(d => d.valor > 0);

  const total = dados.reduce((s, d) => s + d.valor, 0) || 1;
  const centro = { x: 100, y: 100, r: 90 };
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  setoresPizza = [];
  let angIni = 0;
  dados.forEach(dado => {
    const ang = (dado.valor / total) * 2 * Math.PI;
    const angFim = angIni + ang;
    ctx.beginPath();
    ctx.moveTo(centro.x, centro.y);
    ctx.arc(centro.x, centro.y, centro.r, angIni, angFim);
    ctx.closePath();
    ctx.fillStyle = dado.cor;
    ctx.fill();
    setoresPizza.push({ ...dado, anguloInicial: angIni, anguloFinal: angFim });
    angIni = angFim;
  });

  // legenda
  ctxL.clearRect(0, 0, legenda.width, legenda.height);
  ctxL.font = '12px Arial';
  dados.forEach((d, i) => {
    const y = i * 20;
    ctxL.fillStyle = d.cor;
    ctxL.fillRect(10, y + 3, 10, 10);
    ctxL.fillStyle = '#000';
    ctxL.fillText(`${d.label}: R$ ${d.valor.toFixed(2).replace('.', ',')}`, 25, y + 13);
  });
}

function destacarSetor(x, y) {
  const canvas = $('graficoPizza'); if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const cx = 100, cy = 100;
  const dx = x - cx, dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > 90) return;
  const ang = Math.atan2(dy, dx); const angCorr = ang < 0 ? ang + 2 * Math.PI : ang;
  const setor = setoresPizza.find(s => angCorr >= s.anguloInicial && angCorr <= s.anguloFinal);
  if (!setor) return;
  desenharGraficoPizza();
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, 95, setor.anguloInicial, setor.anguloFinal);
  ctx.closePath();
  ctx.fillStyle = setor.cor;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();
  $('valorSelecionado').textContent = `Valor: R$ ${setor.valor.toFixed(2).replace('.', ',')}`;
}

$('graficoPizza').addEventListener('click', e => {
  const rect = e.target.getBoundingClientRect();
  destacarSetor(e.clientX - rect.left, e.clientY - rect.top);
});

/* ---------------- gráficos detalhados (despesas/rendas) ---------------- */
function desenharPizzaDetalhada(listaId, canvasId, tipo) {
  const canvas = $(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const lista = $(listaId);
  if (!lista) return;

  const dados = q(lista, 'li').map(li => {
    return {
      nome: li.querySelector('.nome').textContent,
      valor: parseValor(li.querySelector('.valor').textContent)
    };
  });
  const total = dados.reduce((s, d) => s + d.valor, 0) || 1;
  const centro = { x: canvas.width / 2, y: canvas.height / 2, r: 100 };
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  let angIni = 0;
  const setores = [];
  dados.forEach((item, i) => {
    const ang = (item.valor / total) * 2 * Math.PI;
    const angFim = angIni + ang;
    const cor = `hsl(${(i * 60) % 360},70%,60%)`;
    ctx.beginPath();
    ctx.moveTo(centro.x, centro.y);
    ctx.arc(centro.x, centro.y, centro.r, angIni, angFim);
    ctx.closePath();
    ctx.fillStyle = cor;
    ctx.fill();
    setores.push({ nome: item.nome, valor: item.valor, cor, anguloInicial: angIni, anguloFinal: angFim, centro });
    angIni = angFim;
  });

  canvas.onclick = function (e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const dx = x - centro.x, dy = y - centro.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > centro.r) return;
    const ang = Math.atan2(dy, dx); const angCorr = ang < 0 ? ang + 2 * Math.PI : ang;
    const clicado = setores.find(s => angCorr >= s.anguloInicial && angCorr <= s.anguloFinal);
    if (clicado) {
      // redesenha ambos os gráficos para limpar
      desenharGraficosDetalhados();
      // destaca
      ctx.beginPath();
      ctx.moveTo(centro.x, centro.y);
      ctx.arc(centro.x, centro.y, centro.r + 5, clicado.anguloInicial, clicado.anguloFinal);
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
  const listaId = tipo === 'renda' ? 'renda-list' : 'despesas-list';
  const dados = getDadosDaLista(listaId);
  const total = dados.reduce((s, i) => s + i.valor, 0) || 1;
  const porcent = ((valor / total) * 100).toFixed(1);
  painel.innerHTML = `
    <h1>${tipo === 'renda' ? 'Renda' : 'Despesa'}</h1>
    <div class="menu_box_out">
      <div class="menu_box">
        <p><strong>Nome:</strong> ${nome}</p>
        <p><strong>Valor:</strong> R$ ${valor.toFixed(2).replace('.', ',')}</p>
        <p><strong>Porcentagem:</strong> ${porcent}%</p>
      </div>
    </div>
  `;
}

/* ---------------- histórico de lucro mensal ---------------- */
function obterHistoricoLucro() {
  const v = localStorage.getItem('historico-lucro-mensal');
  return v ? JSON.parse(v) : [];
}
function salvarHistoricoLucro(lista) {
  localStorage.setItem('historico-lucro-mensal', JSON.stringify(lista));
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
window.salvarLucroManual = salvarLucroManual; // expõe para botão onclick no HTML

function desenharGraficoLucroMensal() {
  const canvas = $('graficoLucroMensal');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const historico = obterHistoricoLucro();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const padding = 40;
  const largura = canvas.width - padding * 2;
  const altura = canvas.height - padding * 2;
  const maxLucro = Math.max(...historico.map(d => d.lucro), 1);
  const barras = Math.min(12, historico.length);
  const larguraBarra = barras ? (largura / barras) - 6 : 0;

  historico.forEach((item, i) => {
    const x = padding + i * (larguraBarra + 6);
    const h = (item.lucro / maxLucro) * altura;
    const y = canvas.height - padding - h;
    ctx.fillStyle = '#3e8ed0';
    ctx.fillRect(x, y, larguraBarra, h);
    ctx.fillStyle = '#000';
    ctx.font = '15px Arial';
    const partes = item.mes.split('-');
    const nomeMes = new Date(partes[0], partes[1] - 1).toLocaleDateString('pt-BR', { month: 'short' });
    ctx.fillText(nomeMes, x + 2, canvas.height - 10);
    ctx.fillText(item.lucro.toFixed(0), x + 2, y - 5);
  });
}

/* ---------------- notificações ---------------- */
function verificarNotificacoes() {
  const painel = document.querySelector('.notifications');
  if (!painel) return;
  painel.innerHTML = '<h1>Notificações</h1>';
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const notificacoes = [];

  const processar = (item, tipo) => {
    const [d, m, y] = item.data.split('/');
    const dataItem = new Date(`${y}-${m}-${d}T00:00:00`);
    const diffDias = Math.floor((dataItem - hoje) / (1000 * 60 * 60 * 24));
    let mensagem = '', classe = '';
    if (diffDias < 0) { mensagem = `[${tipo.toUpperCase()}] "${item.nome}" está vencido há ${Math.abs(diffDias)} dias. ❗`; classe = 'vencido'; }
    else if (diffDias <= 5) { mensagem = `[${tipo.toUpperCase()}] "${item.nome}" vence em ${diffDias} dias! ⚠️`; classe = 'alerta'; }
    else if (diffDias <= 10) { mensagem = `[${tipo.toUpperCase()}] "${item.nome}" vence em ${diffDias} dias.`; classe = 'aviso'; }
    if (mensagem) notificacoes.push({ mensagem, classe });
  };

  getDadosDaLista('despesas-list').forEach(i => processar(i, 'despesa'));

  if (notificacoes.length === 0) painel.innerHTML += '<p>Nenhuma notificação no momento.</p>';
  else notificacoes.forEach(n => {
    const div = document.createElement('div');
    div.textContent = n.mensagem;
    div.style.padding = '6px';
    div.style.marginTop = '5px';
    div.style.borderRadius = '5px';
    div.style.fontSize = '0.85rem';
    div.style.background = n.classe === 'alerta' ? '#fff3cd' : (n.classe === 'vencido' ? '#f8d7da' : '#d1ecf1');
    div.style.border = n.classe === 'alerta' ? '1px solid #ffeeba' : (n.classe === 'vencido' ? '1px solid #f5c6cb' : '1px solid #bee5eb');
    painel.appendChild(div);
  });
}

function aplicarFiltros() {
  const nomeFiltro = $('filtro-nome').value.toLowerCase();

  const dataDe = $('filtro-data-de').value ? new Date($('filtro-data-de').value) : null;
  const dataAte = $('filtro-data-ate').value ? new Date($('filtro-data-ate').value) : null;

  const valorDe = parseFloat($('filtro-valor-de').value) || null;
  const valorAte = parseFloat($('filtro-valor-ate').value) || null;

  ['renda-list', 'saldo-list', 'despesas-list'].forEach(listaId => {
    q($(listaId), 'li').forEach(li => {
      const nome = li.querySelector('.nome').textContent.toLowerCase();
      const dataTexto = li.querySelector('.data').textContent;
      const valor = parseValor(li.querySelector('.valor').textContent);

      // Converte dd/mm/aaaa para Date
      const [dia, mes, ano] = dataTexto.split('/');
      const dataItem = new Date(`${ano}-${mes}-${dia}`);

      const matchNome = !nomeFiltro || nome.includes(nomeFiltro);
      const matchData = (!dataDe || dataItem >= dataDe) && (!dataAte || dataItem <= dataAte);
      const matchValor = (!valorDe || valor >= valorDe) && (!valorAte || valor <= valorAte);

      li.style.display = (matchNome && matchData && matchValor) ? '' : 'none';
    });
  });
}

// Eventos para todos os campos
['filtro-nome', 'filtro-data-de', 'filtro-data-ate', 'filtro-valor-de', 'filtro-valor-ate']
  .forEach(id => $(id).addEventListener('input', aplicarFiltros));


/* ---------------- inicialização ---------------- */
window.addEventListener('load', () => {
  carregarLocal();
  desenharGraficoPizza();
  desenharGraficosDetalhados();
  desenharGraficoLucroMensal();
  verificarNotificacoes();
});

/* ---------------- troca de seções ---------------- */
function showSection(sectionId, button) {
  // esconde todas as sections
  q(document, 'section').forEach(sec => sec.classList.remove('active'));
  // mostra a section desejada
  $(sectionId).classList.add('active');
  // atualiza estado visual dos botões
  q(document, '.Content-nav-menu').forEach(btn => btn.classList.remove('active'));
  if (button) button.classList.add('active');
}


// ---- Troca de tema ----
const temaSelect = $('tema-select');

// Carrega tema salvo
const temaSalvo = localStorage.getItem('flowcash-tema') || 'bege';
document.body.classList.add('tema-' + temaSalvo);
temaSelect.value = temaSalvo;

temaSelect.addEventListener('change', () => {
  document.body.classList.remove('tema-bege', 'tema-dark', 'tema-light');
  document.body.classList.add('tema-' + temaSelect.value);
  localStorage.setItem('flowcash-tema', temaSelect.value);
});



/* ===== Calculadora ===== */
function calcAdd(val) {
  $('calc-display').value += val;
}
function calcClear() {
  $('calc-display').value = '';
}
function calcResult() {
  try {
    $('calc-display').value = eval($('calc-display').value) || '';
  } catch {
    alert('Erro na expressão');
  }
}

/* ===== Lista com checklist ===== */
function loadCustomList() {
  const saved = JSON.parse(localStorage.getItem('flowcash-custom-list') || '[]');
  saved.forEach(item => createListItem(item.text, item.checked));
}
function saveCustomList() {
  const items = [];
  q($('custom-list'), 'li').forEach(li => {
    items.push({
      text: li.querySelector('span').textContent,
      checked: li.querySelector('input[type="checkbox"]').checked
    });
  });
  localStorage.setItem('flowcash-custom-list', JSON.stringify(items));
}

function createListItem(text, checked = false) {
  const li = document.createElement('li');

  const chk = document.createElement('input');
  chk.type = 'checkbox';
  chk.checked = checked;
  chk.onchange = saveCustomList;

  const span = document.createElement('span');
  span.textContent = text;

  const actions = document.createElement('div');
  actions.className = 'item-actions';

  const btnEdit = document.createElement('button');
  btnEdit.textContent = 'Editar';
  btnEdit.onclick = () => {
    const novo = prompt('Editar item:', span.textContent);
    if (novo) {
      span.textContent = novo;
      saveCustomList();
    }
  };

  const btnDup = document.createElement('button');
  btnDup.textContent = 'Duplicar';
  btnDup.onclick = () => {
    createListItem(span.textContent, chk.checked);
    saveCustomList();
  };

  const btnDel = document.createElement('button');
  btnDel.textContent = 'Excluir';
  btnDel.onclick = () => {
    li.remove();
    saveCustomList();
  };

  actions.appendChild(btnEdit);
  actions.appendChild(btnDup);
  actions.appendChild(btnDel);

  li.appendChild(chk);
  li.appendChild(span);
  li.appendChild(actions);
  $('custom-list').appendChild(li);
}

function addListItem() {
  const val = $('list-input').value.trim();
  if (!val) return;
  createListItem(val);
  $('list-input').value = '';
  saveCustomList();
}

/* carregar lista ao iniciar */
window.addEventListener('load', loadCustomList);


/* ===== Gerenciador de Listas ===== */
let allLists = {};
let currentList = null;

function loadAllLists() {
  allLists = JSON.parse(localStorage.getItem('flowcash-lists') || '{}');
  renderListsManager();
}

function saveAllLists() {
  localStorage.setItem('flowcash-lists', JSON.stringify(allLists));
}

function renderListsManager() {
  const container = $('lists-manager');
  container.innerHTML = '';
  Object.keys(allLists).forEach(listName => {
    const li = document.createElement('li');
    li.textContent = `${listName} ${allLists[listName].type === 'checklist' ? '✔' : '📄'}`;
    if (listName === currentList) li.classList.add('active');

    const actions = document.createElement('div');
    actions.className = 'list-actions';

    const btnSel = document.createElement('button');
    btnSel.textContent = 'Abrir';
    btnSel.onclick = () => { currentList = listName; renderCurrentList(); renderListsManager(); };

    const btnDel = document.createElement('button');
    btnDel.textContent = 'Excluir';
    btnDel.onclick = () => {
      if (confirm(`Excluir lista "${listName}"?`)) {
        delete allLists[listName];
        if (currentList === listName) currentList = null;
        saveAllLists();
        renderListsManager();
        renderCurrentList();
      }
    };

    actions.appendChild(btnSel);
    actions.appendChild(btnDel);
    li.appendChild(actions);
    container.appendChild(li);
  });
}

function filterListsAndItems() {
  const term = $('search-lists').value.trim().toLowerCase();

  // Filtrar listas
  q($('lists-manager'), 'li').forEach(li => {
    li.style.display = li.textContent.toLowerCase().includes(term) ? '' : 'none';
  });

  // Filtrar itens da lista atual
  q($('custom-list'), 'li').forEach(li => {
    const text = li.querySelector('span').textContent.toLowerCase();
    li.style.display = text.includes(term) ? '' : 'none';
  });
}

$('search-lists').addEventListener('input', filterListsAndItems);


function createNewList() {
  const name = $('new-list-name').value.trim();
  const type = $('new-list-type').value; // pega tipo escolhido
  if (!name || allLists[name]) return;
  allLists[name] = { type: type, items: [] };
  currentList = name;
  saveAllLists();
  renderListsManager();
  renderCurrentList();
  $('new-list-name').value = '';
}

function renderCurrentList() {
  const ul = $('custom-list');
  ul.innerHTML = '';
  if (!currentList) {
    $('current-list-title').textContent = 'Nenhuma lista selecionada';
    return;
  }
  $('current-list-title').textContent = `Itens da Lista: ${currentList}`;
  const listData = allLists[currentList];
  listData.items.forEach(item => createListItem(item.text, item.checked, false, listData.type));
}

function saveCurrentList() {
  if (!currentList) return;
  const listType = allLists[currentList].type;
  const items = [];
  q($('custom-list'), 'li').forEach(li => {
    const text = li.querySelector('span').textContent;
    const checked = listType === 'checklist' ? li.querySelector('input[type="checkbox"]').checked : false;
    items.push({ text, checked });
  });
  allLists[currentList].items = items;
  saveAllLists();
}

function createListItem(text, checked = false, save = true, type = 'normal') {
  const li = document.createElement('li');

  if (type === 'checklist') {
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = checked;
    chk.onchange = saveCurrentList;
    li.appendChild(chk);
  }

  const span = document.createElement('span');
  span.textContent = text;
  li.appendChild(span);

  const actions = document.createElement('div');
  actions.className = 'item-actions';

  const btnEdit = document.createElement('button');
  btnEdit.innerHTML = '✏️';
  btnEdit.title = 'Editar';
  btnEdit.onclick = () => {
    const novo = prompt('Editar item:', span.textContent);
    if (novo) {
      span.textContent = novo;
      saveCurrentList();
    }
  };

  const btnDup = document.createElement('button');
  btnDup.innerHTML = '📄';
  btnDup.title = 'Duplicar';
  btnDup.onclick = () => {
    createListItem(span.textContent, type === 'checklist' ? false : undefined, true, type);
    saveCurrentList();
  };

  const btnDel = document.createElement('button');
  btnDel.innerHTML = '🗑️';
  btnDel.title = 'Excluir';
  btnDel.onclick = () => {
    li.remove();
    saveCurrentList();
  };

  actions.appendChild(btnEdit);
  actions.appendChild(btnDup);
  actions.appendChild(btnDel);
  li.appendChild(actions);

  $('custom-list').appendChild(li);
  if (save) saveCurrentList();
}

function addListItem() {
  if (!currentList) {
    alert('Selecione ou crie uma lista primeiro.');
    return;
  }
  const val = $('list-input').value.trim();
  if (!val) return;
  const listType = allLists[currentList].type;
  createListItem(val, false, true, listType);
  $('list-input').value = '';
}


/* ===== Calculadora ===== */
function calcAdd(val) { $('calc-display').value += val; }
function calcClear() { $('calc-display').value = ''; }
function calcResult() {
  try { $('calc-display').value = eval($('calc-display').value) || ''; }
  catch { alert('Erro na expressão'); }
}

/* Inicialização */
window.addEventListener('load', () => {
  loadAllLists();
  renderCurrentList();
});



const btnEdit = document.createElement('button');
btnEdit.innerHTML = '✏️';
btnEdit.title = 'Editar';
// ...

const btnDup = document.createElement('button');
btnDup.innerHTML = '📄';
btnDup.title = 'Duplicar';
// ...

const btnDel = document.createElement('button');
btnDel.innerHTML = '🗑️';
btnDel.title = 'Excluir';
// ...


function createNewList() {
  const name = $('new-list-name').value.trim();
  const type = $('new-list-type').value; // pega o tipo escolhido
  if (!name || allLists[name]) return;
  allLists[name] = { type: type, items: [] }; // salva com tipo
  currentList = name;
  saveAllLists();
  renderListsManager();
  renderCurrentList();
  $('new-list-name').value = '';
}
