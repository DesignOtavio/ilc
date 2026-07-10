// ==========================================
// PORTAL DO CIDADÃO — LÓGICA FRONTEND
// ==========================================

const API_BASE = '/api';

// Estado global do Cliente
let token = localStorage.getItem('ilc_token') || null;
let userRole = localStorage.getItem('ilc_role') || null;
let currentUsername = localStorage.getItem('ilc_username') || null;

// Armazenamento temporário de cidadãos e eventos para visualização
let activeCitizenDetails = null; // Cidadão atualmente aberto pelo admin

// Inicializar aplicação
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  
  // Escutar redimensionamento para ajustar o gráfico do Canvas
  window.addEventListener('resize', () => {
    if (userRole === 'citizen') {
      loadCitizenDashboard();
    } else if (activeCitizenDetails) {
      renderCitizenDetailChart();
    }
  });
});

function initApp() {
  if (token && userRole) {
    showAppContainer();
    updateHeaderInfo();
    setupTabs();
  } else {
    showAuthScreen();
  }
}

// ==========================================
// TOAST NOTIFICATIONS (Alertas do Estado)
// ==========================================
function showToast(title, desc, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  toast.innerHTML = `
    <span class="toast-title">${title}</span>
    <span class="toast-desc">${desc}</span>
  `;
  
  container.appendChild(toast);
  
  // Remover após 5 segundos
  setTimeout(() => {
    toast.style.animation = 'slide-in 0.3s ease reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// ==========================================
// AUTHENTICATION FLOW
// ==========================================
function showAuthScreen() {
  document.getElementById('auth-screen').classList.add('active');
  document.getElementById('app-container').classList.remove('active');
}

function showAppContainer() {
  document.getElementById('auth-screen').classList.remove('active');
  document.getElementById('app-container').classList.add('active');
}

function updateHeaderInfo() {
  document.getElementById('session-username').innerText = currentUsername || 'Cidadão';
  document.getElementById('session-role').innerText = getRoleLabel(userRole);
  
  // Ocultar/Exibir abas corretas baseadas no Role
  if (userRole === 'citizen') {
    document.getElementById('citizen-tabs').classList.add('active');
    document.getElementById('admin-tabs').classList.remove('active');
  } else {
    document.getElementById('citizen-tabs').classList.remove('active');
    document.getElementById('admin-tabs').classList.add('active');
  }
}

function getRoleLabel(role) {
  switch(role) {
    case 'admin': return 'Comissário Central';
    case 'operator': return 'Operador Estatal';
    case 'auditor': return 'Auditor de Lealdade';
    default: return 'Cidadão';
  }
}

// Trocar abas de Autenticação (Login vs Registrar)
function switchAuthTab(tab) {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const loginTabBtn = document.getElementById('tab-login-btn');
  const registerTabBtn = document.getElementById('tab-register-btn');
  
  if (tab === 'login') {
    loginForm.classList.add('active');
    registerForm.classList.remove('active');
    loginTabBtn.classList.add('active');
    registerTabBtn.classList.remove('active');
  } else {
    loginForm.classList.remove('active');
    registerForm.classList.add('active');
    loginTabBtn.classList.remove('active');
    registerTabBtn.classList.add('active');
  }
}

// Chamadas de Autenticação
async function handleLogin(e) {
  e.preventDefault();
  const identifier = document.getElementById('login-id').value;
  const password = document.getElementById('login-pass').value;
  
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    
    saveSession(data.token, data.role, data.username);
    showToast('Identidade Confirmada', 'Acesso concedido aos arquivos centrais cívicos.', 'success');
  } catch (err) {
    showToast('Erro de Validação', err.message, 'warning');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('reg-username').value;
  const email = document.getElementById('reg-email').value;
  const celular = document.getElementById('reg-celular').value;
  const password = document.getElementById('reg-pass').value;
  
  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, celular, password })
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    
    saveSession(data.token, data.role, data.username);
    showToast('Registro Concluído', 'Sua conta foi vinculada com 5.000 pontos padrão de ILC.', 'success');
  } catch (err) {
    showToast('Falha no Cadastro', err.message, 'warning');
  }
}

// Cadastro/Login via Google
let tempGoogleData = null;

function triggerGoogleSignup() {
  // Simular login do Google abrindo modal de cadastro complementar
  tempGoogleData = {
    google_id: 'g_' + Math.random().toString(36).substr(2, 9),
    email: `google_${Math.floor(Math.random()*1000)}@gmail.com`,
    name: 'Cidadão Google Fictício'
  };
  
  // Abrir modal de nickname
  document.getElementById('google-nickname-modal').classList.add('active');
}

async function submitGoogleSignup(e) {
  e.preventDefault();
  const username = document.getElementById('google-username').value;
  
  try {
    const res = await fetch(`${API_BASE}/auth/google-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        google_id: tempGoogleData.google_id,
        email: tempGoogleData.email,
        username: username
      })
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    
    closeModal('google-nickname-modal');
    saveSession(data.token, data.role, data.username);
    showToast('Adesão Google Concluída', 'Seus pontos do Google foram vinculados.', 'success');
  } catch(err) {
    showToast('Erro no Nickname', err.message, 'warning');
  }
}

function saveSession(tok, role, user) {
  token = tok;
  userRole = role;
  currentUsername = user;
  
  localStorage.setItem('ilc_token', tok);
  localStorage.setItem('ilc_role', role);
  localStorage.setItem('ilc_username', user);
  
  showAppContainer();
  updateHeaderInfo();
  setupTabs();
}

function handleLogout() {
  token = null;
  userRole = null;
  currentUsername = null;
  localStorage.clear();
  showAuthScreen();
}

// Acesso Rápido para Desenvolvimento (Simulador)
window.simLogin = async (id, password) => {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: id, password })
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    
    saveSession(data.token, data.role, data.username);
    showToast('Troca de Perfil', `Entrou como ${id} (${data.role})`, 'info');
  } catch (err) {
    showToast('Erro no Simulador', err.message, 'warning');
  }
};


// ==========================================
// CONTROLADOR DE ABAS DO SISTEMA SPA
// ==========================================
function setupTabs() {
  // Desativar todas as seções e ativar a padrão baseada no perfil
  document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));
  
  if (userRole === 'citizen') {
    switchTab('cit-dashboard');
  } else {
    switchTab('adm-dashboard');
  }
}

function switchTab(tabId) {
  // Desmarcar todas as abas
  document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));
  
  // Localizar aba correspondente pelo onclick
  const tabBtn = Array.from(document.querySelectorAll('.nav-tab')).find(btn => btn.getAttribute('onclick').includes(tabId));
  if (tabBtn) tabBtn.classList.add('active');
  
  const activePane = document.getElementById(`tab-${tabId}`);
  if (activePane) activePane.classList.add('active');
  
  // Gatilho de cargas dinâmicas
  if (tabId === 'cit-dashboard') {
    loadCitizenDashboard();
  } else if (tabId === 'cit-certificates') {
    loadCitizenCertificates();
  } else if (tabId === 'cit-history') {
    loadCitizenHistory();
  } else if (tabId === 'cit-settings') {
    loadCitizenSettings();
  } else if (tabId === 'adm-dashboard') {
    loadAdminDashboard();
  } else if (tabId === 'adm-citizens') {
    loadAdminCitizens();
  } else if (tabId === 'adm-approvals') {
    loadAdminApprovals();
  } else if (tabId === 'adm-audit') {
    loadAdminAudit();
  }
}

// Helper de modal
function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}


// ==========================================
// CÓDIGO DA ÁREA DO CIDADÃO
// ==========================================

async function loadCitizenDashboard() {
  try {
    const res = await fetch(`${API_BASE}/citizen/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    // 1. Atualizar Cartão Cívico
    document.getElementById('cit-card-name').innerText = data.profile.username;
    document.getElementById('cit-card-nick').innerText = `@${data.profile.username}`;
    document.getElementById('cit-card-status').innerText = data.profile.status.toUpperCase();
    document.getElementById('cit-card-status').className = `value status-${data.profile.status}`;
    document.getElementById('cit-card-score').innerText = data.profile.current_score.toLocaleString('pt-BR');
    
    // Configurações da Faixa (Tiers)
    const tier = data.tier;
    const cardTier = document.getElementById('cit-card-tier');
    cardTier.innerText = tier.name;
    cardTier.style.backgroundColor = tier.color;
    cardTier.style.color = '#000'; // Destaque na cédula

    // Privilégios da Faixa
    document.getElementById('cit-tier-privileges').innerText = tier.privileges || 'Sem restrições documentadas.';

    // 2. Barra de Progresso Cívico
    const currentScore = data.profile.current_score;
    const nextTier = data.next_tier;
    
    const currLbl = document.getElementById('current-tier-lbl');
    const nextLbl = document.getElementById('next-tier-lbl');
    const fillBar = document.getElementById('cit-progress-bar');
    const helpBar = document.getElementById('cit-progress-help');

    currLbl.innerText = `${tier.name} (${currentScore})`;
    
    if (nextTier) {
      nextLbl.innerText = `${nextTier.name} (${nextTier.min_score})`;
      const minVal = tier.min_score;
      const maxVal = nextTier.min_score;
      const totalRange = maxVal - minVal;
      const progress = ((currentScore - minVal) / totalRange) * 100;
      
      fillBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
      helpBar.innerText = `Faltam ${(maxVal - currentScore).toLocaleString('pt-BR')} pontos para subir para ${nextTier.name}.`;
    } else {
      nextLbl.innerText = 'Nível Máximo Atingido';
      fillBar.style.width = '100%';
      helpBar.innerText = 'Você atingiu o topo do prestígio nacional.';
    }

    // 3. Recomendações
    renderRecommendations(tier);

    // 4. Desenhar Histograma de Evolução
    drawLineChart('cit-score-chart', data.history);

  } catch (err) {
    showToast('Erro ao Carregar Painel', err.message, 'warning');
  }
}

function renderRecommendations(tier) {
  const container = document.getElementById('cit-recommendations');
  container.innerHTML = '';
  
  // Recomendações fictícias dinâmicas baseadas na faixa do cidadão
  let recs = [];
  if (tier.min_score < 4000) {
    // Para cidadãos restritos/vigilância máxima
    recs = [
      { name: 'Curso de Educação Cívica', desc: 'Realize o exame anual obrigatório de moralidade.', delta: '+250', code: 'exame_civico' },
      { name: 'Doação de Sangue', desc: 'Contribua com o banco hospitalar oficial do Estado.', delta: '+100', code: 'doacao_sangue' },
      { name: 'Trabalho Voluntário', desc: 'Engaje em tarefas de revitalização municipal.', delta: '+200', code: 'trabalho_voluntario' }
    ];
  } else {
    // Cidadão comum ou exemplar
    recs = [
      { name: 'Serviço Militar Voluntário', desc: 'Conclua a adesão auxiliar nas forças estatais.', delta: '+500', code: 'servico_militar' },
      { name: 'Denunciar Atividade Ilícita', desc: 'Informe corrupção ou crimes com comprovantes.', delta: '+300', code: 'denuncia_crime' },
      { name: 'Campanha Nacional de Vacinação', desc: 'Ajude na organização local cívica.', delta: '+150', code: 'campanha_nacional' }
    ];
  }

  recs.forEach(rec => {
    const item = document.createElement('div');
    item.className = 'rec-item';
    item.innerHTML = `
      <div class="rec-info">
        <h4>${rec.name}</h4>
        <p>${rec.desc}</p>
      </div>
      <span class="rec-delta">${rec.delta}</span>
    `;
    container.appendChild(item);
  });
}

// Carregar Certificados
async function loadCitizenCertificates() {
  try {
    const res = await fetch(`${API_BASE}/citizen/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    const container = document.getElementById('cit-certificates-list');
    container.innerHTML = '';

    // Todos os certificados conhecidos e as conquistas do usuário
    const allCerts = [
      { key: 'Mérito Cívico', points: 100, desc: 'Concedido ao cidadão que atinge seus primeiros 100 pontos acumulados em atos de cooperação social.' },
      { key: 'Serviço Distinto', points: 500, desc: 'Reconhecimento oficial por 500 pontos acumulados em atividades de valor militar/cívico.' },
      { key: 'Excelência Nacional', points: 1000, desc: 'Diploma solene outorgado por expressiva contribuição cívica nacional, somando 1.000 pontos.' },
      { key: 'Honra Suprema', points: 5000, desc: 'Ordem máxima da lealdade nacional. Reservado para cidadãos que dedicaram 5.000 pontos em mérito cívico.' }
    ];

    allCerts.forEach(cert => {
      // Verificar se o cidadão possui
      const userCert = data.certificates.find(uc => uc.name === cert.key);
      const isUnlocked = !!userCert;
      
      const card = document.createElement('div');
      card.className = `certificate-banknote ${isUnlocked ? 'unlocked' : 'locked'}`;
      
      let dateString = isUnlocked ? new Date(userCert.granted_at).toLocaleDateString('pt-BR') : 'BLOQUEADO';
      let stampHTML = isUnlocked ? `<div class="banknote-stamp">OUTORGADO</div>` : `<div class="banknote-stamp" style="border-color:#555;color:#555">PENDENTE</div>`;
      
      card.innerHTML = `
        <div class="border-lines"></div>
        <div class="banknote-header">
          <span>REPÚBLICA CÍVICA NACIONAL</span>
          <span>VALOR SOCIAL: ${cert.points} PTS</span>
        </div>
        <div class="banknote-body ${isUnlocked ? 'unlocked' : ''}">
          <h3 class="banknote-title">${cert.key.toUpperCase()}</h3>
          <p class="banknote-desc">${cert.desc}</p>
        </div>
        <div class="banknote-footer">
          <div>
            <span>REGISTRO: ${isUnlocked ? userCert.id.substr(0,8).toUpperCase() : 'PENDENTE'}</span><br>
            <span>OUTORGA: ${dateString}</span>
          </div>
          ${stampHTML}
        </div>
      `;
      container.appendChild(card);
    });

  } catch(err) {
    showToast('Erro de Certificados', err.message, 'warning');
  }
}

// Carregar histórico pessoal do cidadão
async function loadCitizenHistory() {
  try {
    const res = await fetch(`${API_BASE}/citizen/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    const tbody = document.getElementById('cit-history-table-body');
    tbody.innerHTML = '';

    if (data.history.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">Nenhum evento registrado no arquivo nacional.</td></tr>`;
      return;
    }

    data.history.forEach(ev => {
      const tr = document.createElement('tr');
      const date = new Date(ev.occurred_at).toLocaleDateString('pt-BR');
      const isReward = ev.category === 'reward';
      const deltaClass = isReward ? 'text-success' : 'text-warning';
      const deltaSign = ev.points_delta > 0 ? `+${ev.points_delta}` : ev.points_delta;
      
      tr.innerHTML = `
        <td>${date}</td>
        <td><span class="status-badge ${isReward ? 'badge-reward' : 'badge-penalty'}">${isReward ? 'MÉRITO' : 'PENALIDADE'}</span></td>
        <td class="text-gold">${ev.type_name}</td>
        <td class="${deltaClass} font-hero">${deltaSign}</td>
        <td>${ev.description}</td>
        <td><span class="badge-status badge-${ev.status}">${ev.status.toUpperCase()}</span></td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    showToast('Erro de Histórico', err.message, 'warning');
  }
}

// Configurações do cidadão
async function loadCitizenSettings() {
  document.getElementById('settings-nick').value = currentUsername;
}

async function handleUpdateNickname(e) {
  e.preventDefault();
  const nickname = document.getElementById('settings-nick').value;
  
  try {
    const res = await fetch(`${API_BASE}/citizen/update-nickname`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ nickname })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    
    currentUsername = data.nickname;
    localStorage.setItem('ilc_username', data.nickname);
    updateHeaderInfo();
    showToast('Cognome Atualizado', data.message, 'success');
  } catch (err) {
    showToast('Erro ao Atualizar', err.message, 'warning');
  }
}


// ==========================================
// CÓDIGO DA ÁREA ADMINISTRATIVA
// ==========================================

async function loadAdminDashboard() {
  try {
    const res = await fetch(`${API_BASE}/admin/metrics`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    // Preencher Métricas Gerais
    document.getElementById('adm-metric-citizens').innerText = data.total_citizens.toLocaleString('pt-BR');
    document.getElementById('adm-metric-avg').innerText = data.average_score;
    document.getElementById('adm-metric-alerts').innerText = data.alert_count;

    // Desenhar Gráfico Demográfico por Faixa
    const distContainer = document.getElementById('adm-tiers-dist');
    distContainer.innerHTML = '';
    
    data.distribution.forEach(item => {
      const total = data.total_citizens || 1;
      const percent = (parseInt(item.count, 10) / total) * 100;
      
      const row = document.createElement('div');
      row.className = 'dist-bar-row';
      row.innerHTML = `
        <div class="dist-bar-label">
          <span>${item.tier_name}</span>
          <span class="text-gold">${item.count} (${Math.round(percent)}%)</span>
        </div>
        <div class="dist-bar-track">
          <div class="dist-bar-fill" style="width: ${percent}%; background-color: ${item.color}"></div>
        </div>
      `;
      distContainer.appendChild(row);
    });

    // Alimentar Dropdown de Cidadãos para Lançamento Rápido
    loadAdminCitizensDropdown();
    // Alimentar Dropdown de Eventos do Painel Rápido
    loadAdminEventTypesDropdown();

  } catch(err) {
    showToast('Erro Administrativo', err.message, 'warning');
  }
}

async function loadAdminCitizensDropdown() {
  const select = document.getElementById('quick-citizen-select');
  select.innerHTML = '<option value="">Selecione um Cidadão...</option>';
  
  try {
    const res = await fetch(`${API_BASE}/admin/citizens?limit=100`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      data.citizens.forEach(cit => {
        const opt = document.createElement('option');
        opt.value = cit.id;
        opt.innerText = `${cit.username} (Score: ${cit.current_score})`;
        select.appendChild(opt);
      });
    }
  } catch (err) {
    console.error('Falha ao carregar dropdown de cidadãos:', err);
  }
}

async function loadAdminEventTypesDropdown() {
  const select = document.getElementById('quick-event-select');
  select.innerHTML = '<option value="">Selecione a atividade...</option>';
  
  try {
    const res = await fetch(`${API_BASE}/admin/event-types`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      data.forEach(type => {
        const opt = document.createElement('option');
        opt.value = type.code;
        const sign = type.points_delta > 0 ? '+' : '';
        opt.innerText = `${type.name} (${sign}${type.points_delta} pts)`;
        select.appendChild(opt);
      });
    }
  } catch (err) {
    console.error('Falha ao carregar dropdown de eventos:', err);
  }
}

// Lançamento de Evento pelo Admin
async function handleQuickLaunchEvent(e) {
  e.preventDefault();
  const userId = document.getElementById('quick-citizen-select').value;
  const eventCode = document.getElementById('quick-event-select').value;
  const description = document.getElementById('quick-description').value;
  const evidenceUrl = document.getElementById('quick-evidence').value;
  const directApprove = document.getElementById('quick-approve-direct').checked;
  
  try {
    const res = await fetch(`${API_BASE}/admin/events`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        user_id: userId,
        event_type_code: eventCode,
        description,
        evidence_url: evidenceUrl,
        status: directApprove ? 'approved' : 'pending'
      })
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    
    showToast('Lançamento Registrado', data.message, 'success');
    
    // Limpar formulário e recarregar painel
    document.getElementById('quick-description').value = '';
    document.getElementById('quick-evidence').value = '';
    loadAdminDashboard();
  } catch (err) {
    showToast('Erro de Registro', err.message, 'warning');
  }
}

// Admin Cadastrar Cidadão
async function handleAdminCreateCitizen(e) {
  e.preventDefault();
  const username = document.getElementById('adm-create-username').value;
  const email = document.getElementById('adm-create-email').value;
  const celular = document.getElementById('adm-create-celular').value;
  const password = document.getElementById('adm-create-password').value;
  
  try {
    const res = await fetch(`${API_BASE}/admin/citizens`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ username, email, celular, password })
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    
    showToast('Indexado com Sucesso', data.message, 'success');
    
    // Limpar campos
    document.getElementById('adm-create-username').value = '';
    document.getElementById('adm-create-email').value = '';
    document.getElementById('adm-create-celular').value = '';
    document.getElementById('adm-create-password').value = '';
    
    loadAdminDashboard();
  } catch (err) {
    showToast('Falha no Cadastro Admin', err.message, 'warning');
  }
}

// Carregar Lista de Cidadãos
let listPage = 1;
async function loadAdminCitizens() {
  const search = document.getElementById('search-citizen-input').value;
  const status = document.getElementById('filter-status-select').value;
  const tier = document.getElementById('filter-tier-select').value;
  
  try {
    const url = `${API_BASE}/admin/citizens?search=${search}&status=${status}&tier=${tier}&page=${listPage}&limit=10`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    const tbody = document.getElementById('adm-citizens-table-body');
    tbody.innerHTML = '';

    if (data.citizens.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--text-muted)">Nenhum cidadão encontrado com os filtros aplicados.</td></tr>`;
      return;
    }

    data.citizens.forEach(cit => {
      // Achar faixa
      const tierObj = data.tiers.find(t => cit.current_score >= t.min_score && cit.current_score <= t.max_score);
      const tierName = tierObj ? tierObj.name : 'Desconhecida';
      const tierColor = tierObj ? tierObj.color : 'var(--border)';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="text-gold">${cit.username}</td>
        <td>
          <span style="font-size:11px">${cit.email || 'Sem e-mail'}</span><br>
          <span style="font-size:11px" class="text-muted">${cit.celular || 'Sem celular'}</span>
        </td>
        <td class="font-hero text-success">${cit.current_score}</td>
        <td><span class="status-badge" style="background:${tierColor}20;color:${tierColor};border:1px solid ${tierColor}">${tierName}</span></td>
        <td><span class="status-badge status-${cit.status}">${cit.status.toUpperCase()}</span></td>
        <td class="text-success font-hero">${cit.rewards_count}</td>
        <td class="text-warning font-hero">${cit.penalties_count}</td>
        <td style="font-size:11px">${cit.updated_at ? new Date(cit.updated_at).toLocaleDateString('pt-BR') : 'Sem registro'}</td>
        <td>
          <button class="sim-btn admin" onclick="viewCitizenDetails('${cit.id}')">DETALHAR</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    renderPagination(data.total, data.page, data.limit);

  } catch(err) {
    showToast('Erro de Tabela', err.message, 'warning');
  }
}

function filterCitizensList() {
  listPage = 1;
  loadAdminCitizens();
}

function renderPagination(total, page, limit) {
  const container = document.getElementById('adm-citizens-pagination');
  container.innerHTML = '';

  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return;

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.className = `page-btn ${i === page ? 'active' : ''}`;
    btn.innerText = i;
    btn.onclick = () => {
      listPage = i;
      loadAdminCitizens();
    };
    container.appendChild(btn);
  }
}

// Visualizar detalhes de cidadão individual (fluxo admin)
async function viewCitizenDetails(id) {
  try {
    const res = await fetch(`${API_BASE}/admin/citizens/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    activeCitizenDetails = data;
    
    // Ocultar lista e exibir aba detalhe
    document.getElementById('tab-adm-citizens').classList.remove('active');
    document.getElementById('tab-adm-citizen-detail').classList.add('active');

    // Preencher Ficha do Cidadão
    const info = document.getElementById('detail-citizen-info');
    info.innerHTML = `
      <div class="detail-row" style="margin-top:15px">
        <span class="label">NOME / COGNOME</span>
        <span class="value text-gold" style="font-size:20px">${data.citizen.username}</span>
      </div>
      <div class="detail-row">
        <span class="label">E-MAIL DO REGISTRO</span>
        <span class="value">${data.citizen.email || 'Nenhum'}</span>
      </div>
      <div class="detail-row">
        <span class="label">CONTATO TELEFÔNICO</span>
        <span class="value">${data.citizen.celular || 'Nenhum'}</span>
      </div>
      <div class="detail-row">
        <span class="label">STATUS DA CONTA</span>
        <span class="value status-${data.citizen.status}">${data.citizen.status.toUpperCase()}</span>
      </div>
      <div class="detail-row">
        <span class="label">FAIXA ILC ATUAL</span>
        <span class="value status-badge" style="background:${data.tier.color}20; color:${data.tier.color}; border:1px solid ${data.tier.color}; font-size:13px">${data.tier.name}</span>
      </div>
      <div class="detail-row" style="margin-top:15px">
        <span class="label">SCORE DE LEALDADE</span>
        <span class="value font-hero text-success" style="font-size:40px">${data.citizen.current_score}</span>
      </div>
    `;

    // Desenhar Gráfico de Evolução Cidadão Individual
    renderCitizenDetailChart();

    // Carregar Dropdown de Certificados Manuais
    loadDetailCertificatesDropdown();

    // Preencher histórico detalhado
    const tbody = document.getElementById('detail-history-table-body');
    tbody.innerHTML = '';

    if (data.history.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">Sem histórico cívico registrado.</td></tr>`;
      return;
    }

    data.history.forEach(ev => {
      const tr = document.createElement('tr');
      const date = new Date(ev.occurred_at).toLocaleDateString('pt-BR');
      const sign = ev.points_delta > 0 ? `+${ev.points_delta}` : ev.points_delta;
      const ptsClass = ev.points_delta > 0 ? 'text-success' : 'text-warning';
      
      tr.innerHTML = `
        <td>${date}</td>
        <td class="text-gold">${ev.type_name}</td>
        <td class="${ptsClass} font-hero">${sign}</td>
        <td>${ev.description}</td>
        <td><span class="badge-status badge-${ev.status}">${ev.status.toUpperCase()}</span></td>
        <td>${ev.approved_by_name || 'Automação'}</td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    showToast('Erro de Detalhe', err.message, 'warning');
  }
}

function renderCitizenDetailChart() {
  if (activeCitizenDetails) {
    drawLineChart('detail-score-chart', activeCitizenDetails.history);
  }
}

function backToCitizensList() {
  activeCitizenDetails = null;
  document.getElementById('tab-adm-citizen-detail').classList.remove('active');
  document.getElementById('tab-adm-citizens').classList.add('active');
  loadAdminCitizens();
}

// Alterar Status do Cidadão pelo Admin
async function changeCitizenStatus(status) {
  if (!activeCitizenDetails) return;
  const id = activeCitizenDetails.citizen.id;
  
  try {
    const res = await fetch(`${API_BASE}/admin/citizens/${id}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast('Status Alterado', data.message, 'success');
    viewCitizenDetails(id); // Recarregar ficha
  } catch(err) {
    showToast('Falha ao Alterar Status', err.message, 'warning');
  }
}

// Alimentar drop-down de certificados manuais
async function loadDetailCertificatesDropdown() {
  const select = document.getElementById('detail-cert-select');
  select.innerHTML = '<option value="">Selecione um certificado...</option>';
  
  try {
    const res = await fetch(`${API_BASE}/admin/certificates`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      data.forEach(cert => {
        const opt = document.createElement('option');
        opt.value = cert.id;
        opt.innerText = `${cert.name} (Acúmulo: ${cert.points_required} pts)`;
        select.appendChild(opt);
      });
    }
  } catch (err) {
    console.error('Falha ao carregar certificados:', err);
  }
}

// Outorgar Certificado Manualmente
async function handleGrantManualCertificate() {
  if (!activeCitizenDetails) return;
  const userId = activeCitizenDetails.citizen.id;
  const certificateId = document.getElementById('detail-cert-select').value;
  
  if (!certificateId) {
    showToast('Ação Inválida', 'Selecione um certificado para outorgar.', 'warning');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/admin/certificates/grant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ user_id: userId, certificate_id: certificateId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast('Certificado Outorgado', data.message, 'success');
    viewCitizenDetails(userId); // Recarregar ficha
  } catch (err) {
    showToast('Erro de Outorga', err.message, 'warning');
  }
}

// Fila de Aprovações de Eventos Pendentes
async function loadAdminApprovals() {
  try {
    const res = await fetch(`${API_BASE}/admin/metrics`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    const tbody = document.getElementById('adm-approvals-table-body');
    tbody.innerHTML = '';

    if (data.pending_events.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">Nenhum evento pendente de homologação estatal.</td></tr>`;
      return;
    }

    data.pending_events.forEach(ev => {
      const tr = document.createElement('tr');
      const date = new Date(ev.created_at).toLocaleDateString('pt-BR');
      const ptsClass = ev.points_delta > 0 ? 'text-success' : 'text-warning';
      const sign = ev.points_delta > 0 ? `+${ev.points_delta}` : ev.points_delta;
      
      tr.innerHTML = `
        <td>${date}</td>
        <td class="text-gold">${ev.citizen_name}</td>
        <td>${ev.type_name}</td>
        <td class="${ptsClass} font-hero">${sign}</td>
        <td>${ev.description}</td>
        <td>${ev.evidence_url ? `<a href="${ev.evidence_url}" target="_blank" class="text-gold">Ver Anexo</a>` : 'Sem comprovante'}</td>
        <td style="display:flex;gap:6px">
          <button class="sim-btn citizen-high" onclick="resolvePendingEvent('${ev.id}', 'approved')">APROVAR</button>
          <button class="sim-btn citizen-low" onclick="resolvePendingEvent('${ev.id}', 'rejected')">REJEITAR</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    showToast('Fila de Aprovações', err.message, 'warning');
  }
}

// Aprovar/Rejeitar na lista
async function resolvePendingEvent(id, action) {
  try {
    const res = await fetch(`${API_BASE}/admin/events/${id}/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: action })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast('Evento Homologado', data.message, 'success');
    loadAdminApprovals();
  } catch(err) {
    showToast('Falha na Resolução', err.message, 'warning');
  }
}

// Auditoria de logs
async function loadAdminAudit() {
  try {
    const res = await fetch(`${API_BASE}/admin/audit-logs`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    const tbody = document.getElementById('adm-audit-table-body');
    tbody.innerHTML = '';

    if (data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">Nenhum log registrado na trilha estatal.</td></tr>`;
      return;
    }

    data.forEach(log => {
      const tr = document.createElement('tr');
      const date = new Date(log.created_at).toLocaleString('pt-BR');
      
      tr.innerHTML = `
        <td style="font-size:11px">${date}</td>
        <td class="text-gold">${log.actor_name || 'Sistema/Auto'}</td>
        <td style="color:var(--slate)">${log.entity_name}</td>
        <td style="font-weight:700">${log.action}</td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis">${log.old_data ? JSON.stringify(log.old_data) : 'Nulo'}</td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis">${log.new_data ? JSON.stringify(log.new_data) : 'Nulo'}</td>
      `;
      tbody.appendChild(tr);
    });

  } catch(err) {
    showToast('Erro de Auditoria', err.message, 'warning');
  }
}


// ==========================================
// DESENHAR GRÁFICO MANUAL DO CANVAS
// ==========================================
function drawLineChart(canvasId, historyData) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  // Ajustar dimensões baseado no container pai
  const rect = canvas.parentNode.getBoundingClientRect();
  canvas.width = rect.width || 400;
  canvas.height = Math.max(160, rect.height || 180);
  
  const width = canvas.width;
  const height = canvas.height;
  
  ctx.clearRect(0, 0, width, height);
  
  // Calcular scores históricos cumulativos
  let points = [5000];
  if (historyData && historyData.length > 0) {
    // Reverter ordenação para cronológica (antigos primeiro)
    const sorted = [...historyData].reverse();
    let running = 5000;
    points = [running];
    
    sorted.forEach(ev => {
      if (ev.status === 'approved') {
        running = Math.max(0, Math.min(10000, running + ev.points_delta));
        points.push(running);
      }
    });
  } else {
    points = [5000, 5000];
  }

  // Se tivermos apenas 1 ponto histórico, duplicar para fazer a linha
  if (points.length === 1) {
    points.push(points[0]);
  }

  const padding = { top: 20, right: 30, bottom: 25, left: 45 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;
  
  // Desenhar Linhas de Grade Verticais
  ctx.strokeStyle = '#222d22';
  ctx.lineWidth = 1;
  ctx.font = '10px Barlow Condensed';
  ctx.fillStyle = '#B9B19A';
  
  const gridLines = 5;
  for (let i = 0; i < gridLines; i++) {
    const yVal = Math.round(10000 - (i * (10000 / (gridLines - 1))));
    const y = padding.top + (i * (graphHeight / (gridLines - 1)));
    
    // Linha horizontal
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    
    // Label no eixo Y
    ctx.fillText(yVal, 10, y + 3);
  }
  
  // Traçar caminho dos pontos
  ctx.beginPath();
  ctx.strokeStyle = '#73B33A'; // Verde de sucesso
  ctx.lineWidth = 3;
  
  const xStep = graphWidth / (points.length - 1);
  
  // Desenhar gradiente preenchido sob a linha
  const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
  gradient.addColorStop(0, 'rgba(115, 179, 58, 0.25)');
  gradient.addColorStop(1, 'rgba(115, 179, 58, 0)');
  
  const fillPath = new Path2D();
  fillPath.moveTo(padding.left, height - padding.bottom);
  
  for (let i = 0; i < points.length; i++) {
    const x = padding.left + (i * xStep);
    const y = padding.top + graphHeight - ((points[i] / 10000) * graphHeight);
    
    if (i === 0) {
      ctx.moveTo(x, y);
      fillPath.lineTo(x, y);
    } else {
      ctx.lineTo(x, y);
      fillPath.lineTo(x, y);
    }
  }
  ctx.stroke();
  
  fillPath.lineTo(padding.left + (points.length - 1) * xStep, height - padding.bottom);
  fillPath.closePath();
  ctx.fillStyle = gradient;
  ctx.fill(fillPath);
  
  // Desenhar círculos de pontos com acabamento dourado
  for (let i = 0; i < points.length; i++) {
    const x = padding.left + (i * xStep);
    const y = padding.top + graphHeight - ((points[i] / 10000) * graphHeight);
    
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#B08A47'; // Dourado
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, 2 * Math.PI);
    ctx.strokeStyle = '#D4C08A'; // Dourado claro
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
