import React, { useState, useEffect } from 'react';
import ScoreChart from './components/ScoreChart';
import CertificatesGrid from './components/CertificatesGrid';

const API_BASE = '/api';

function App() {
  // Estado de Autenticação
  const [token, setToken] = useState(localStorage.getItem('ilc_token') || null);
  const [userRole, setUserRole] = useState(localStorage.getItem('ilc_role') || null);
  const [username, setUsername] = useState(localStorage.getItem('ilc_username') || null);
  const [userHierarchyTitle, setUserHierarchyTitle] = useState(localStorage.getItem('ilc_hierarchy_title') || null);
  const [userAvatarUrl, setUserAvatarUrl] = useState(localStorage.getItem('ilc_avatar_url') || null);

  // Controle de Abas
  const [activeTab, setActiveTab] = useState('');

  // Toasts de Notificação
  const [toasts, setToasts] = useState([]);

  // Modal Google Nickname
  const [googleModalActive, setGoogleModalActive] = useState(false);
  const [tempGoogleData, setTempGoogleData] = useState(null);
  const [googleNickname, setGoogleNickname] = useState('');

  // Dados do Usuário Autenticado
  const [citizenData, setCitizenData] = useState(null);
  const [newNickname, setNewNickname] = useState('');

  // Modal de Edição de Foto de Perfil / Carteira
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [inputAvatarUrl, setInputAvatarUrl] = useState('');
  const [customTitleInput, setCustomTitleInput] = useState('');

  // Dados do Admin
  const [adminMetrics, setAdminMetrics] = useState(null);
  const [adminCitizens, setAdminCitizens] = useState([]);
  const [adminTiers, setAdminTiers] = useState([]);
  const [adminTotalCitizens, setAdminTotalCitizens] = useState(0);
  const [adminPage, setAdminPage] = useState(1);
  const [adminLimit] = useState(10);
  const [adminSearch, setAdminSearch] = useState('');
  const [adminFilterStatus, setAdminFilterStatus] = useState('');
  const [adminFilterTier, setAdminFilterTier] = useState('');

  // Lançamento Rápido de Evento (Admin)
  const [quickCitizenId, setQuickCitizenId] = useState('');
  const [quickEventCode, setQuickEventCode] = useState('');
  const [quickDescription, setQuickDescription] = useState('');
  const [quickEvidence, setQuickEvidence] = useState('');
  const [quickApproveDirect, setQuickApproveDirect] = useState(true);

  // Indexar Novo Usuário (Admin)
  const [createUsername, setCreateUsername] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createCelular, setCreateCelular] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState('usuario');
  const [createHierarchyTitle, setCreateHierarchyTitle] = useState('Usuário Cívico');
  const [createAvatarUrl, setCreateAvatarUrl] = useState('');

  // Modal de Edição de Usuário pelo Admin
  const [editUserModalOpen, setEditUserModalOpen] = useState(false);
  const [editingUserData, setEditingUserData] = useState(null);
  const [editFormRole, setEditFormRole] = useState('usuario');
  const [editFormTitle, setEditFormTitle] = useState('');
  const [editFormAvatar, setEditFormAvatar] = useState('');
  const [editFormUsername, setEditFormUsername] = useState('');
  const [editFormEmail, setEditFormEmail] = useState('');
  const [editFormStatus, setEditFormStatus] = useState('active');

  // Detalhe de Usuário Individual (Admin)
  const [detailCitizenId, setDetailCitizenId] = useState(null);
  const [detailCitizenData, setDetailCitizenData] = useState(null);
  const [detailCertId, setDetailCertId] = useState('');

  // Listas Estáticas de Apoio (Admin)
  const [eventTypes, setEventTypes] = useState([]);
  const [certificatesList, setCertificatesList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Login Form
  const [authTab, setAuthTab] = useState('login');
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // Register Form
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCelular, setRegCelular] = useState('');
  const [regPass, setRegPass] = useState('');

  // Disparar Notificação (Toast)
  const showToast = (title, desc, type = 'info') => {
    const id = Math.random().toString();
    setToasts(prev => [...prev, { id, title, desc, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const parseApiResponse = async (res) => {
    const text = await res.text();
    if (!text) {
      return { error: res.ok ? 'Resposta vazia do servidor.' : `Servidor respondeu sem detalhes (${res.status}).` };
    }
    try {
      return JSON.parse(text);
    } catch (err) {
      return { error: res.ok ? 'Resposta inválida do servidor.' : `Resposta inválida (${res.status}).` };
    }
  };

  // Inicializar Aba padrão conforme Nível de Acesso Base
  useEffect(() => {
    if (token && userRole) {
      if (userRole === 'admin') {
        setActiveTab('adm-dashboard');
      } else {
        setActiveTab('cit-dashboard');
      }
    }
  }, [token, userRole]);

  // Capturar parâmetros do callback OAuth do Google
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleToken = params.get('google_token');
    const googleRole = params.get('google_role');
    const googleUsername = params.get('google_username');
    const googleNew = params.get('google_new');
    const googleTemp = params.get('google_temp');
    const googleError = params.get('google_error');

    if (googleToken && googleRole && googleUsername) {
      saveSession(googleToken, googleRole, decodeURIComponent(googleUsername));
      showToast('Identidade Google Confirmada', 'Foto do perfil e acesso cívico autenticados via Google.', 'success');
      window.history.replaceState({}, '', '/');
    } else if (googleNew === '1' && googleTemp) {
      setTempGoogleData({ temp_token: googleTemp });
      setGoogleNickname('');
      setGoogleModalActive(true);
      window.history.replaceState({}, '', '/');
    } else if (googleError) {
      const msgs = {
        'email_exists': 'Este e-mail do Google já está vinculado a outra conta. Faça login com e-mail e senha.',
        'server': 'Erro interno durante login com Google. Tente novamente.',
        '1': 'Falha ao autenticar com o Google. Tente novamente.'
      };
      showToast('Erro Google OAuth', msgs[googleError] || 'Erro desconhecido.', 'warning');
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // Carregar dados da aba ativa
  useEffect(() => {
    if (!token) return;

    if (activeTab === 'cit-dashboard' || activeTab === 'cit-certificates' || activeTab === 'cit-history' || activeTab === 'cit-settings') {
      fetchCitizenData();
    } else if (activeTab === 'adm-dashboard') {
      fetchAdminMetrics();
      fetchAdminCitizens();
    } else if (activeTab === 'adm-citizens') {
      fetchAdminCitizens();
    } else if (activeTab === 'adm-approvals') {
      fetchAdminMetrics();
    } else if (activeTab === 'adm-audit') {
      fetchAdminAuditLogs();
    }
  }, [activeTab, token, adminPage, adminSearch, adminFilterStatus, adminFilterTier]);

  // Carregar dados estáticos auxiliares para admin
  useEffect(() => {
    if (token && userRole === 'admin') {
      fetchEventTypes();
      fetchCertificates();
    }
  }, [token, userRole]);

  // Sincronizar detalhe do usuário
  useEffect(() => {
    if (detailCitizenId && token) {
      fetchCitizenDetail(detailCitizenId);
    }
  }, [detailCitizenId, token]);

  // REQUISIÇÕES DE API: USUÁRIO
  const fetchCitizenData = async () => {
    try {
      const res = await fetch(`${API_BASE}/citizen/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error);
      setCitizenData(data);
      setNewNickname(data.profile.username);
      setCustomTitleInput(data.profile.hierarchy_title || '');
      setInputAvatarUrl(data.profile.avatar_url || '');

      if (data.profile.hierarchy_title) {
        setUserHierarchyTitle(data.profile.hierarchy_title);
        localStorage.setItem('ilc_hierarchy_title', data.profile.hierarchy_title);
      }
      if (data.profile.avatar_url) {
        setUserAvatarUrl(data.profile.avatar_url);
        localStorage.setItem('ilc_avatar_url', data.profile.avatar_url);
      }
    } catch (err) {
      showToast('Falha de Dados', err.message, 'warning');
    }
  };

  const handleUpdateProfile = async (e) => {
    if (e) e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/citizen/update-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nickname: newNickname,
          avatar_url: inputAvatarUrl,
          hierarchy_title: customTitleInput
        })
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error);

      setUsername(data.nickname);
      setUserHierarchyTitle(data.hierarchy_title);
      setUserAvatarUrl(data.avatar_url);
      localStorage.setItem('ilc_username', data.nickname);
      if (data.hierarchy_title) localStorage.setItem('ilc_hierarchy_title', data.hierarchy_title);
      if (data.avatar_url) localStorage.setItem('ilc_avatar_url', data.avatar_url);
      else localStorage.removeItem('ilc_avatar_url');

      showToast('Carteira de Identidade Atualizada', data.message, 'success');
      setPhotoModalOpen(false);
      fetchCitizenData();
    } catch (err) {
      showToast('Erro ao Atualizar', err.message, 'warning');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      showToast('Tamanho Excedido', 'Selecione uma imagem de até 3MB.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setInputAvatarUrl(reader.result);
      showToast('Imagem Carregada', 'Sua foto local está pronta para salvar.', 'info');
    };
    reader.readAsDataURL(file);
  };

  // REQUISIÇÕES DE API: ADMIN
  const fetchAdminMetrics = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/metrics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error);
      setAdminMetrics(data);
    } catch (err) {
      showToast('Erro de Métricas', err.message, 'warning');
    }
  };

  const fetchAdminCitizens = async () => {
    try {
      const url = `${API_BASE}/admin/citizens?search=${adminSearch}&status=${adminFilterStatus}&tier=${adminFilterTier}&page=${adminPage}&limit=${adminLimit}`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error);
      setAdminCitizens(data.citizens);
      setAdminTiers(data.tiers);
      setAdminTotalCitizens(data.total);
    } catch (err) {
      showToast('Erro de Tabela', err.message, 'warning');
    }
  };

  const fetchCitizenDetail = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/admin/citizens/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error);
      setDetailCitizenData(data);
    } catch (err) {
      showToast('Erro de Detalhe', err.message, 'warning');
    }
  };

  const fetchEventTypes = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/event-types`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await parseApiResponse(res);
      if (res.ok) setEventTypes(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCertificates = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/certificates`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await parseApiResponse(res);
      if (res.ok) setCertificatesList(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdminAuditLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/audit-logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error);
      setAuditLogs(data);
    } catch (err) {
      showToast('Erro de Auditoria', err.message, 'warning');
    }
  };

  // ADMIN ACTIONS
  const handleQuickLaunchEvent = async (e) => {
    e.preventDefault();
    if (!quickCitizenId || !quickEventCode) {
      showToast('Validação', 'Usuário e Atividade são obrigatórios.', 'warning');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/admin/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: quickCitizenId,
          event_type_code: quickEventCode,
          description: quickDescription,
          evidence_url: quickEvidence,
          status: quickApproveDirect ? 'approved' : 'pending'
        })
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error);

      showToast('Lançamento Registrado', data.message, 'success');
      setQuickDescription('');
      setQuickEvidence('');
      fetchAdminMetrics();
    } catch (err) {
      showToast('Erro de Lançamento', err.message, 'warning');
    }
  };

  const handleAdminCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/admin/citizens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username: createUsername,
          email: createEmail,
          celular: createCelular,
          password: createPassword,
          role: createRole,
          hierarchy_title: createHierarchyTitle,
          avatar_url: createAvatarUrl
        })
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error);

      showToast('Usuário Registrado', data.message, 'success');
      setCreateUsername('');
      setCreateEmail('');
      setCreateCelular('');
      setCreatePassword('');
      setCreateHierarchyTitle(createRole === 'admin' ? 'Administrador' : 'Usuário Cívico');
      setCreateAvatarUrl('');
      fetchAdminMetrics();
      fetchAdminCitizens();
    } catch (err) {
      showToast('Falha ao Criar Usuário', err.message, 'warning');
    }
  };

  const openAdminEditUserModal = (user) => {
    setEditingUserData(user);
    setEditFormUsername(user.username);
    setEditFormEmail(user.email || '');
    setEditFormRole(user.role_name === 'admin' ? 'admin' : 'usuario');
    setEditFormTitle(user.hierarchy_title || (user.role_name === 'admin' ? 'Administrador' : 'Usuário Cívico'));
    setEditFormAvatar(user.avatar_url || '');
    setEditFormStatus(user.status || 'active');
    setEditUserModalOpen(true);
  };

  const handleAdminSaveUserEdit = async (e) => {
    e.preventDefault();
    if (!editingUserData) return;
    try {
      const res = await fetch(`${API_BASE}/admin/citizens/${editingUserData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username: editFormUsername,
          email: editFormEmail,
          role: editFormRole,
          hierarchy_title: editFormTitle,
          avatar_url: editFormAvatar,
          status: editFormStatus
        })
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error);

      showToast('Usuário Atualizado', data.message, 'success');
      setEditUserModalOpen(false);
      fetchAdminCitizens();
      if (detailCitizenId === editingUserData.id) fetchCitizenDetail(editingUserData.id);
    } catch (err) {
      showToast('Erro ao Editar Usuário', err.message, 'warning');
    }
  };

  const changeCitizenStatus = async (status) => {
    if (!detailCitizenData) return;
    try {
      const res = await fetch(`${API_BASE}/admin/citizens/${detailCitizenData.citizen.id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error);

      showToast('Status Alterado', data.message, 'success');
      fetchCitizenDetail(detailCitizenData.citizen.id);
    } catch (err) {
      showToast('Erro ao Mudar Status', err.message, 'warning');
    }
  };

  const handleGrantManualCertificate = async () => {
    if (!detailCitizenData || !detailCertId) return;
    try {
      const res = await fetch(`${API_BASE}/admin/certificates/grant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: detailCitizenData.citizen.id,
          certificate_id: detailCertId
        })
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error);

      showToast('Certificado Outorgado', data.message, 'success');
      setDetailCertId('');
      fetchCitizenDetail(detailCitizenData.citizen.id);
    } catch (err) {
      showToast('Erro de Outorga', err.message, 'warning');
    }
  };

  const resolvePendingEvent = async (eventId, action) => {
    try {
      const res = await fetch(`${API_BASE}/admin/events/${eventId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: action })
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error);

      showToast('Evento Homologado', data.message, 'success');
      fetchAdminMetrics();
    } catch (err) {
      showToast('Falha na Resolução', err.message, 'warning');
    }
  };

  // FLUXO DE LOGIN & CADASTRO (CLIENTE)
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: loginId, password: loginPass })
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error);

      saveSession(data.token, data.role, data.username, data.hierarchy_title, data.avatar_url);
      showToast('Identidade Confirmada', 'Acesso concedido aos arquivos estatais.', 'success');
    } catch (err) {
      showToast('Erro de Login', err.message, 'warning');
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: regUsername,
          email: regEmail,
          celular: regCelular,
          password: regPass
        })
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error);

      saveSession(data.token, data.role, data.username, data.hierarchy_title, data.avatar_url);
      showToast('Registro Concluído', 'Sua lealdade cívica começa com 5.000 pontos.', 'success');
    } catch (err) {
      showToast('Falha no Cadastro', err.message, 'warning');
    }
  };

  const triggerGoogleSignup = () => {
    window.location.href = '/api/auth/google';
  };

  const handleGoogleSignupSubmit = async (e) => {
    e.preventDefault();
    if (!googleNickname) return;
    try {
      const res = await fetch(`${API_BASE}/auth/google-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          temp_token: tempGoogleData.temp_token,
          username: googleNickname
        })
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error);

      setGoogleModalActive(false);
      saveSession(data.token, data.role, data.username, data.hierarchy_title, data.avatar_url);
      showToast('Registro Google Concluído', 'Sua foto e lealdade cívica foram integradas com sucesso.', 'success');
    } catch (err) {
      showToast('Erro de Cadastro Google', err.message, 'warning');
    }
  };

  const saveSession = (tok, role, user, title, avatar) => {
    setToken(tok);
    setUserRole(role);
    setUsername(user);
    const resolvedTitle = title || (role === 'admin' ? 'Administrador do Sistema' : 'Usuário Cívico');
    setUserHierarchyTitle(resolvedTitle);
    setUserAvatarUrl(avatar || null);

    localStorage.setItem('ilc_token', tok);
    localStorage.setItem('ilc_role', role);
    localStorage.setItem('ilc_username', user);
    localStorage.setItem('ilc_hierarchy_title', resolvedTitle);
    if (avatar) localStorage.setItem('ilc_avatar_url', avatar);
    else localStorage.removeItem('ilc_avatar_url');
  };

  const handleLogout = () => {
    setToken(null);
    setUserRole(null);
    setUsername(null);
    setUserHierarchyTitle(null);
    setUserAvatarUrl(null);
    setCitizenData(null);
    setAdminMetrics(null);
    setDetailCitizenId(null);
    localStorage.clear();
    showToast('Sessão Encerrada', 'Retirada segura dos canais cívicos.', 'info');
  };

  // Acesso rápido de simulação
  const runSimLogin = async (id, password) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: id, password })
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error);

      setDetailCitizenId(null);
      saveSession(data.token, data.role, data.username, data.hierarchy_title, data.avatar_url);
      showToast('Troca de Perfil', `Simulação ativa como ${id}.`, 'info');
    } catch (err) {
      showToast('Falha no Simulador', err.message, 'warning');
    }
  };

  const renderCitizenRecommendations = () => {
    if (!citizenData || !citizenData.tier) return null;
    const isLowTier = citizenData.tier.min_score < 4000;

    const recs = isLowTier ? [
      { name: 'Curso de Educação Cívica', desc: 'Realize o exame anual obrigatório de moralidade.', delta: '+250' },
      { name: 'Doação de Sangue', desc: 'Contribua com o banco hospitalar oficial do Estado.', delta: '+100' },
      { name: 'Trabalho Voluntário', desc: 'Engaje em tarefas de revitalização municipal.', delta: '+200' }
    ] : [
      { name: 'Serviço Militar Voluntário', desc: 'Conclua a adesão auxiliar nas forças estatais.', delta: '+500' },
      { name: 'Denunciar Atividade Ilícita', desc: 'Informe corrupção ou crimes com comprovantes.', delta: '+300' },
      { name: 'Campanha Nacional de Vacinação', desc: 'Ajude na organização local cívica.', delta: '+150' }
    ];

    return recs.map(rec => (
      <div key={rec.name} className="rec-item">
        <div className="rec-info">
          <h4>{rec.name}</h4>
          <p>{rec.desc}</p>
        </div>
        <span className="rec-delta">{rec.delta}</span>
      </div>
    ));
  };

  const getTierDetails = (score) => {
    if (score < 2000) return { name: 'Vigilância Máxima', color: '#8A3D2F' };
    if (score < 4000) return { name: 'Restrito', color: '#4E6E8E' };
    if (score < 6000) return { name: 'Cidadão Comum', color: '#B9B19A' };
    if (score < 8000) return { name: 'Cidadão Exemplar', color: '#556B2F' };
    if (score < 9500) return { name: 'Herói Cívico', color: '#73B33A' };
    return { name: 'Alto Comando Honorário', color: '#B08A47' };
  };

  // TELA DE AUTENTICAÇÃO
  if (!token) {
    return (
      <div id="auth-screen" className="screen active">
        <div className="toast-container">
          {toasts.map(t => (
            <div key={t.id} className={`toast ${t.type}`}>
              <span className="toast-title">{t.title}</span>
              <span className="toast-desc">{t.desc}</span>
            </div>
          ))}
        </div>

        <div className="auth-card">
          <div className="state-seal-wrapper">
            <svg className="state-seal" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" stroke="#B08A47" strokeWidth="2" fill="none" strokeDasharray="3,3" />
              <circle cx="50" cy="50" r="40" stroke="#5C4B2A" strokeWidth="1" fill="none" />
              <path d="M50,15 L53,28 L66,28 L56,36 L59,49 L50,41 L41,49 L44,36 L34,28 L47,28 Z" fill="#B08A47" />
              <path d="M25,65 Q20,50 25,35 Q30,50 25,65 Z" fill="#556B2F" opacity="0.6" />
              <path d="M75,65 Q80,50 75,35 Q70,50 75,65 Z" fill="#556B2F" opacity="0.6" />
              <text x="50" y="70" textAnchor="middle" fontFamily="Bebas Neue" fontSize="12" fill="#D4C08A" letterSpacing="1">ILC</text>
            </svg>
          </div>

          <h1 className="state-title">PORTAL DE ACESSO CÍVICO</h1>
          <p className="state-subtitle">PÁTRIA • ORDEM • LEALDADE</p>
          <p className="auth-helper">Insira suas credenciais para autenticação no Sistema de Lealdade Cívica.</p>

          <div className="auth-tabs">
            <button className={`auth-tab ${authTab === 'login' ? 'active' : ''}`} onClick={() => setAuthTab('login')}>ENTRAR</button>
            <button className={`auth-tab ${authTab === 'register' ? 'active' : ''}`} onClick={() => setAuthTab('register')}>REGISTRAR</button>
          </div>

          {authTab === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="auth-form active">
              <div className="form-group">
                <label>IDENTIFICADOR CÍVICO</label>
                <input type="text" placeholder="Nickname, e-mail ou celular" required value={loginId} onChange={e => setLoginId(e.target.value)} />
                <span className="field-desc">E-mail, celular ou nickname registrado.</span>
              </div>
              <div className="form-group">
                <label>SENHA DE ACESSO</label>
                <input type="password" placeholder="••••••••" required value={loginPass} onChange={e => setLoginPass(e.target.value)} />
              </div>
              <button type="submit" className="state-btn primary gold-glow">AUTENTICAR IDENTIDADE</button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="auth-form active">
              <div className="form-group">
                <label>NICKNAME ÚNICO *</label>
                <input type="text" placeholder="ex: cidadao_exemplar" required value={regUsername} onChange={e => setRegUsername(e.target.value)} />
                <span className="field-desc">Nickname único de identificação.</span>
              </div>
              <div className="form-group">
                <label>E-MAIL (OPCIONAL)</label>
                <input type="email" placeholder="cidadao@patria.gov.br" value={regEmail} onChange={e => setRegEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label>NÚMERO DE CELULAR (OPCIONAL)</label>
                <input type="text" placeholder="+5511999999999" value={regCelular} onChange={e => setRegCelular(e.target.value)} />
              </div>
              <div className="form-group">
                <label>SENHA DE ACESSO *</label>
                <input type="password" placeholder="Mínimo 6 caracteres" required value={regPass} onChange={e => setRegPass(e.target.value)} />
              </div>
              <button type="submit" className="state-btn success success-glow">SOLICITAR REGISTRO CÍVICO</button>
            </form>
          )}

          <div className="auth-divider">
            <span>OU ACESSE COM FOTO VIA GOOGLE</span>
          </div>

          <button className="state-btn google-btn" onClick={triggerGoogleSignup}>
            <svg className="google-icon" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.111 4.114a5.772 5.772 0 0 1-5.776-5.773 5.772 5.772 0 0 1 5.776-5.773c1.554 0 2.98.544 4.103 1.442l3.1-3.1C19.146 3.498 15.93 2.1 12.24 2.1 6.812 2.1 2.4 6.512 2.4 11.94s4.412 9.84 9.84 9.84c6.262 0 9.774-4.32 9.774-9.774 0-.616-.055-1.222-.164-1.72H12.24z" />
            </svg>
            CONECTAR COM A CONTA GOOGLE
          </button>
        </div>

        {/* Modal Nickname Google */}
        <div className={`modal-overlay ${googleModalActive ? 'active' : ''}`}>
          <div className="modal-card">
            <h2 className="modal-title">COMPLETAR CADASTRO CÍVICO GOOGLE</h2>
            <p className="modal-desc">Sua foto de perfil do Google será importada para sua Carteira de Identidade Cívica. Escolha um nickname único para finalizar.</p>
            <form onSubmit={handleGoogleSignupSubmit}>
              <div className="form-group">
                <label>NICKNAME CÍVICO *</label>
                <input type="text" required placeholder="ex: joao_google" value={googleNickname} onChange={e => setGoogleNickname(e.target.value)} />
              </div>
              <div className="form-buttons">
                <button type="button" className="state-btn secondary" onClick={() => setGoogleModalActive(false)}>CANCELAR</button>
                <button type="submit" className="state-btn primary gold-glow">FINALIZAR ADESÃO</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const activeAvatar = (citizenData && citizenData.profile && citizenData.profile.avatar_url) || userAvatarUrl;
  const activeHierarchyTitle = (citizenData && citizenData.profile && citizenData.profile.hierarchy_title) || userHierarchyTitle || (userRole === 'admin' ? 'Administrador' : 'Usuário Cívico');

  return (
    <div id="app-container" className="app-container active">
      {/* Simulador Toolbar */}
      <div id="sim-toolbar" className="sim-toolbar">
        <div className="sim-brand">
          <span className="sim-tag">AMBIENTE DE SIMULAÇÃO DE NÍVEIS</span>
        </div>
        <div className="sim-actions">
          <span className="sim-label">Simular Login:</span>
          <button className="sim-btn admin" onClick={() => runSimLogin('comissario_otavio', 'admin123')}>Admin (Comissário)</button>
          <button className="sim-btn operator" onClick={() => runSimLogin('operador_civil', 'usuario123')}>Usuário (Operador)</button>
          <button className="sim-btn auditor" onClick={() => runSimLogin('auditor_patria', 'usuario123')}>Usuário (Auditor)</button>
          <button className="sim-btn citizen-high" onClick={() => runSimLogin('elena_rostova', 'usuario123')}>Usuário (Inspetora)</button>
          <button className="sim-btn citizen-mid" onClick={() => runSimLogin('joao_silva', 'usuario123')}>Usuário (Comum)</button>
        </div>
      </div>

      {/* Toast Alert list */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span className="toast-title">{t.title}</span>
            <span className="toast-desc">{t.desc}</span>
          </div>
        ))}
      </div>

      {/* Cabeçalho oficial */}
      <header className="main-header">
        <div className="header-identity">
          <svg className="header-logo" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" stroke="#B08A47" strokeWidth="2" fill="none" />
            <path d="M50,20 L53,33 L66,33 L56,41 L59,54 L50,46 L41,54 L44,41 L34,33 L47,33 Z" fill="#B08A47" />
            <path d="M25,65 Q20,50 25,35" stroke="#556B2F" strokeWidth="2" fill="none" />
            <path d="M75,65 Q80,50 75,35" stroke="#556B2F" strokeWidth="2" fill="none" />
          </svg>
          <div className="header-titles">
            <h1>REPÚBLICA CÍVICA NACIONAL</h1>
            <h2>SISTEMA OFICIAL DE LEALDADE (ILC)</h2>
          </div>
        </div>

        <div className="header-user-info">
          {activeAvatar ? (
            <img src={activeAvatar} alt="Foto Perfil" className="header-user-avatar" />
          ) : (
            <div className="header-avatar-placeholder">{username ? username.charAt(0).toUpperCase() : 'U'}</div>
          )}
          <div className="user-meta">
            <span className="session-name">@{username}</span>
            <span className="hierarchy-pill">{activeHierarchyTitle}</span>
            <span className="session-badge">{userRole === 'admin' ? 'Nível Administrador' : 'Nível Usuário'}</span>
          </div>
          <button className="state-btn outline logout-btn" onClick={handleLogout}>LOGOUT</button>
        </div>
      </header>

      {/* Abas de Navegação */}
      <nav className="main-nav">
        {userRole !== 'admin' ? (
          <div className="nav-group active">
            <button className={`nav-tab ${activeTab === 'cit-dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('cit-dashboard')}>CARTEIRA DE IDENTIDADE</button>
            <button className={`nav-tab ${activeTab === 'cit-certificates' ? 'active' : ''}`} onClick={() => setActiveTab('cit-certificates')}>MEUS CERTIFICADOS</button>
            <button className={`nav-tab ${activeTab === 'cit-history' ? 'active' : ''}`} onClick={() => setActiveTab('cit-history')}>HISTÓRICO DE AÇÕES</button>
            <button className={`nav-tab ${activeTab === 'cit-settings' ? 'active' : ''}`} onClick={() => setActiveTab('cit-settings')}>CONFIGURAÇÕES DA CONTA</button>
          </div>
        ) : (
          <div className="nav-group active">
            <button className={`nav-tab ${activeTab === 'adm-dashboard' ? 'active' : ''}`} onClick={() => { setDetailCitizenId(null); setActiveTab('adm-dashboard'); }}>PAINEL ADMINISTRATIVO</button>
            <button className={`nav-tab ${activeTab === 'adm-citizens' || detailCitizenId !== null ? 'active' : ''}`} onClick={() => { setDetailCitizenId(null); setActiveTab('adm-citizens'); }}>GESTÃO DE USUÁRIOS</button>
            <button className={`nav-tab ${activeTab === 'adm-approvals' ? 'active' : ''}`} onClick={() => { setDetailCitizenId(null); setActiveTab('adm-approvals'); }}>APROVAÇÕES PENDENTES</button>
            <button className={`nav-tab ${activeTab === 'adm-audit' ? 'active' : ''}`} onClick={() => { setDetailCitizenId(null); setActiveTab('adm-audit'); }}>LOGS DE AUDITORIA</button>
            <button className={`nav-tab ${activeTab === 'cit-dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('cit-dashboard')}>MINHA CARTEIRA</button>
          </div>
        )}
      </nav>

      {/* Conteúdo Principal */}
      <main className="main-content">
        
        {/* ========================================== */}
        {/* CARTEIRA DE IDENTIDADE CÍVICA (USER/ADMIN) */}
        {/* ========================================== */}
        {activeTab === 'cit-dashboard' && citizenData && (
          <section className="tab-pane active">
            <div className="bento-grid">
              
              {/* CARTÃO DE IDENTIDADE CÍVICA OFICIAL */}
              <div className="bento-card col-5 credential-card-wrapper">
                <div className="credential-card gold-border">
                  <div className="card-bg-pattern"></div>
                  
                  <div className="card-header">
                    <span className="card-estatal-text">CARTEIRA DE IDENTIDADE CÍVICA</span>
                    <span className="card-serial">REG: {citizenData.profile.id.substring(0, 8).toUpperCase()}</span>
                  </div>

                  <div className="card-body">
                    {/* FOTO E BOTÃO DE EDITAR FOTO */}
                    <div className="card-photo-container">
                      <div className="card-photo-box">
                        {activeAvatar ? (
                          <img src={activeAvatar} alt="Foto da Carteira" className="cit-id-photo" />
                        ) : (
                          <div className="cit-avatar-placeholder">
                            <svg viewBox="0 0 24 24" width="48" height="48" fill="#B08A47">
                              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                            </svg>
                          </div>
                        )}
                      </div>
                      <button className="change-photo-btn" onClick={() => setPhotoModalOpen(true)}>
                        📷 Alterar Foto da Carteira
                      </button>
                    </div>

                    <div className="card-details">
                      <div className="detail-row">
                        <span className="label">COGNOME</span>
                        <span className="value">@{citizenData.profile.username}</span>
                      </div>
                      
                      {/* TÍTULO PERSONALIZADO DA HIERARQUIA */}
                      <div className="detail-row">
                        <span className="label">TÍTULO DE HIERARQUIA</span>
                        <span className="value hierarchy-title-badge">{activeHierarchyTitle}</span>
                      </div>

                      <div className="detail-row">
                        <span className="label">NÍVEL DE ACESSO BASE</span>
                        <span className="value">{citizenData.profile.role === 'admin' ? 'ADMINISTRADOR' : 'USUÁRIO'}</span>
                      </div>

                      <div className="detail-row">
                        <span className="label">STATUS CIVIL</span>
                        <span className={`value status-${citizenData.profile.status}`}>{citizenData.profile.status.toUpperCase()}</span>
                      </div>

                      <div className="detail-row">
                        <span className="label">FAIXA DE CONFIANÇA</span>
                        <span className="value tier-badge" style={{ backgroundColor: citizenData.tier ? citizenData.tier.color : '#B9B19A', color: '#000' }}>
                          {citizenData.tier ? citizenData.tier.name : 'Cidadão Comum'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="card-footer">
                    <div className="score-display">
                      <span className="score-label">PONTUAÇÃO ILC ATUAL</span>
                      <span className="score-number font-hero success-glow">{citizenData.profile.current_score}</span>
                    </div>
                    <div className="card-barcode">|||| | ||| | || |||| | ||| ||||</div>
                  </div>
                </div>
              </div>

              {/* EVOLUÇÃO DE FAIXA */}
              <div className="bento-card col-4 flex-col justify-between">
                <div className="card-head">
                  <h3 className="card-title">EVOLUÇÃO DA CLASSIFICAÇÃO</h3>
                  <p className="card-subtitle">Sua progressão linear no Índice de Lealdade.</p>
                </div>

                <div className="progress-section">
                  <div className="progress-labels">
                    <span>{citizenData.tier ? citizenData.tier.name : 'Atual'}</span>
                    <span>{citizenData.next_tier ? citizenData.next_tier.name : 'Nível Máximo'}</span>
                  </div>
                  <div className="progress-bar-track">
                    <div 
                      className="progress-bar-fill" 
                      style={{ 
                        width: citizenData.next_tier && citizenData.tier
                          ? `${((citizenData.profile.current_score - citizenData.tier.min_score) / (citizenData.next_tier.min_score - citizenData.tier.min_score)) * 100}%` 
                          : '100%' 
                      }}
                    ></div>
                  </div>
                  <p className="progress-help">
                    {citizenData.next_tier 
                      ? `Faltam ${(citizenData.next_tier.min_score - citizenData.profile.current_score)} pontos para a próxima faixa.` 
                      : 'Você atingiu o teto da confiança nacional.'}
                  </p>
                </div>

                <div className="tier-info-panel">
                  <h4 className="tier-info-title text-gold">RESTRICÕES / PRIVILÉGIOS ATUAIS:</h4>
                  <p className="tier-info-desc">{citizenData.tier ? citizenData.tier.privileges : 'Direitos padrão de cidadania.'}</p>
                </div>
              </div>

              {/* RECOMENDAÇÕES */}
              <div className="bento-card col-3">
                <div className="card-head">
                  <h3 className="card-title">FORTALECIMENTO DO SCORE</h3>
                  <p className="card-subtitle">Ações recomendadas para alavancar a pontuação.</p>
                </div>
                <div className="recommendations-list">
                  {renderCitizenRecommendations()}
                </div>
              </div>

              {/* HISTOGRAMA TEMPORAL */}
              <div className="bento-card col-12 chart-card">
                <div className="card-head">
                  <h3 className="card-title">HISTOGRAMA DE COMPORTAMENTO CÍVICO</h3>
                  <p className="card-subtitle">Evolução temporal nas últimas atividades homologadas.</p>
                </div>
                <div className="chart-container">
                  <ScoreChart history={citizenData.history} />
                </div>
              </div>

            </div>
          </section>
        )}

        {/* CERTIFICADOS */}
        {activeTab === 'cit-certificates' && citizenData && (
          <section className="tab-pane active">
            <div className="section-heading" style={{ marginBottom: '20px' }}>
              <h2 className="section-title">CÉDULAS DE MÉRITO NACIONAL</h2>
              <p className="section-subtitle">Conquistas oficiais outorgadas por acúmulo de méritos.</p>
            </div>
            <CertificatesGrid certificates={citizenData.certificates} />
          </section>
        )}

        {/* HISTÓRICO */}
        {activeTab === 'cit-history' && citizenData && (
          <section className="tab-pane active">
            <div className="section-heading" style={{ marginBottom: '20px' }}>
              <h2 className="section-title">CRONOLOGIA DE COMPORTAMENTO</h2>
              <p className="section-subtitle">Todos os registros de bônus, penalidades e homologações.</p>
            </div>
            <div className="table-container">
              <table className="state-table">
                <thead>
                  <tr>
                    <th>DATA</th>
                    <th>CATEGORIA</th>
                    <th>TIPO DE ATIVIDADE</th>
                    <th>VARIAÇÃO</th>
                    <th>DESCRIÇÃO/EVIDÊNCIA</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {citizenData.history.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Sem registros de histórico.</td>
                    </tr>
                  ) : (
                    citizenData.history.map(ev => {
                      const isReward = ev.category === 'reward';
                      return (
                        <tr key={ev.id}>
                          <td>{new Date(ev.occurred_at).toLocaleDateString('pt-BR')}</td>
                          <td>
                            <span className={`status-badge ${isReward ? 'badge-reward' : 'badge-penalty'}`}>
                              {isReward ? 'MÉRITO' : 'PENALIDADE'}
                            </span>
                          </td>
                          <td className="text-gold">{ev.type_name}</td>
                          <td className={`${isReward ? 'text-success' : 'text-warning'} font-hero`}>
                            {ev.points_delta > 0 ? `+${ev.points_delta}` : ev.points_delta}
                          </td>
                          <td>{ev.description}</td>
                          <td><span className={`badge-status badge-${ev.status}`}>{ev.status.toUpperCase()}</span></td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* CONFIGURAÇÕES DE PERFIL DA CONTA */}
        {activeTab === 'cit-settings' && (
          <section className="tab-pane active">
            <div className="section-heading" style={{ marginBottom: '20px' }}>
              <h2 className="section-title">CONFIGURAÇÕES DA CARTEIRA E PERFIL</h2>
              <p className="section-subtitle">Personalize sua foto de perfil, nickname e título de hierarquia exibido.</p>
            </div>

            <div className="bento-grid">
              <div className="bento-card col-6">
                <h3 className="card-title">DADOS VISÍVEIS DA CARTEIRA</h3>
                <form onSubmit={handleUpdateProfile} className="form-dense" style={{ marginTop: '15px' }}>
                  <div className="form-group">
                    <label>COGNOME (NICKNAME)</label>
                    <input type="text" required value={newNickname} onChange={e => setNewNickname(e.target.value)} />
                    <span className="field-desc">Identificador único no sistema.</span>
                  </div>

                  <div className="form-group">
                    <label>TÍTULO DE HIERARQUIA DESEJADO</label>
                    <input type="text" placeholder="ex: Operador Sênior, Inspetor, Cidadão Ativo" value={customTitleInput} onChange={e => setCustomTitleInput(e.target.value)} />
                    <span className="field-desc">Título personalizado exibido na sua Carteira de Identidade.</span>
                  </div>

                  <div className="form-group">
                    <label>FOTO DA CARTEIRA (URL OU BASE64)</label>
                    <input type="text" placeholder="https://... ou escolha um arquivo abaixo" value={inputAvatarUrl} onChange={e => setInputAvatarUrl(e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label>OU SELECIONE FOTO DO SEU COMPUTADOR</label>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="file-input" />
                  </div>

                  <button type="submit" className="state-btn primary gold-glow">SALVAR ALTERAÇÕES DA CARTEIRA</button>
                </form>
              </div>

              <div className="bento-card col-6 flex-col justify-center align-center">
                <h3 className="card-title" style={{ marginBottom: '15px' }}>PRÉ-VISUALIZAÇÃO DA FOTO</h3>
                <div className="card-photo-box large">
                  {inputAvatarUrl ? (
                    <img src={inputAvatarUrl} alt="Preview Foto" className="cit-id-photo" />
                  ) : (
                    <div className="cit-avatar-placeholder">
                      <svg viewBox="0 0 24 24" width="64" height="64" fill="#B08A47">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    </div>
                  )}
                </div>
                <span className="text-gold" style={{ marginTop: '15px', fontWeight: 'bold' }}>{customTitleInput || activeHierarchyTitle}</span>
              </div>
            </div>
          </section>
        )}

        {/* ========================================== */}
        {/* ADMIN DASHBOARD */}
        {/* ========================================== */}
        {activeTab === 'adm-dashboard' && adminMetrics && userRole === 'admin' && (
          <section className="tab-pane active">
            <div className="stats-row">
              <div className="stat-card">
                <span className="stat-label">POPULAÇÃO MONITORADA</span>
                <span className="stat-value font-hero text-gold">{adminMetrics.total_citizens}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">MÉDIA NACIONAL ILC</span>
                <span className="stat-value font-hero text-success">{adminMetrics.average_score}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">VIGILÂNCIA MÁXIMA</span>
                <span className="stat-value font-hero text-warning">{adminMetrics.alert_count}</span>
              </div>
            </div>

            <div className="bento-grid">
              {/* Gráfico Demográfico */}
              <div className="bento-card col-4">
                <h3 className="card-title">DISTRIBUIÇÃO DEMOGRÁFICA</h3>
                <p className="card-subtitle">Proporção de usuários por nível de confiança.</p>
                <div className="tiers-distribution-container" style={{ marginTop: '15px' }}>
                  {adminMetrics.distribution.map(item => {
                    const total = adminMetrics.total_citizens || 1;
                    const pct = (parseInt(item.count) / total) * 100;
                    return (
                      <div key={item.tier_name} className="dist-bar-row">
                        <div className="dist-bar-label">
                          <span>{item.tier_name}</span>
                          <span className="text-gold">{item.count} ({Math.round(pct)}%)</span>
                        </div>
                        <div className="dist-bar-track">
                          <div className="dist-bar-fill" style={{ width: `${pct}%`, backgroundColor: item.color }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Lançamento Rápido */}
              <div className="bento-card col-4">
                <h3 className="card-title">LANÇAMENTO RÁPIDO DE EVENTOS</h3>
                <p className="card-subtitle">Aplique deltas positivos ou negativos instantaneamente.</p>
                <form onSubmit={handleQuickLaunchEvent} className="form-dense" style={{ marginTop: '15px' }}>
                  <div className="form-group">
                    <label>SELECIONAR USUÁRIO *</label>
                    <select required value={quickCitizenId} onChange={e => setQuickCitizenId(e.target.value)}>
                      <option value="">Selecione o usuário...</option>
                      {adminCitizens.map(c => (
                        <option key={c.id} value={c.id}>{c.username} ({c.hierarchy_title || 'Usuário'}) - Score: {c.current_score}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>ATIVIDADE/TIPO *</label>
                    <select required value={quickEventCode} onChange={e => setQuickEventCode(e.target.value)}>
                      <option value="">Selecione o tipo de evento...</option>
                      {eventTypes.map(t => (
                        <option key={t.id} value={t.code}>{t.name} ({t.points_delta > 0 ? `+${t.points_delta}` : t.points_delta} pts)</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>DESCRIÇÃO/MOTIVO *</label>
                    <textarea required placeholder="Detalhes do ocorrido" value={quickDescription} onChange={e => setQuickDescription(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>URL DO COMPROVANTE (OPCIONAL)</label>
                    <input type="text" placeholder="https://..." value={quickEvidence} onChange={e => setQuickEvidence(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="checkbox-container">
                      <input type="checkbox" checked={quickApproveDirect} onChange={e => setQuickApproveDirect(e.target.checked)} />
                      Aprovar evento imediatamente (ignorar homologação)
                    </label>
                  </div>
                  <button type="submit" className="state-btn primary gold-glow">PUBLICAR EVENTO</button>
                </form>
              </div>

              {/* Cadastrar Usuário */}
              <div className="bento-card col-4">
                <h3 className="card-title">INDEXAR NOVO USUÁRIO</h3>
                <p className="card-subtitle">Cadastro de contas com Nível Base e Título Personalizado.</p>
                <form onSubmit={handleAdminCreateUser} className="form-dense" style={{ marginTop: '15px' }}>
                  <div className="form-group">
                    <label>NICKNAME *</label>
                    <input type="text" required placeholder="ex: novo_usuario" value={createUsername} onChange={e => setCreateUsername(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>E-MAIL *</label>
                    <input type="email" required placeholder="email@patria.gov.br" value={createEmail} onChange={e => setCreateEmail(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>NÍVEL DE ACESSO BASE *</label>
                    <select value={createRole} onChange={e => {
                      setCreateRole(e.target.value);
                      if (e.target.value === 'admin') setCreateHierarchyTitle('Administrador do Sistema');
                      else setCreateHierarchyTitle('Usuário Cívico');
                    }}>
                      <option value="usuario">Usuário (Padrão)</option>
                      <option value="admin">Administrador (Total)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>TÍTULO PERSONALIZADO DA HIERARQUIA *</label>
                    <input type="text" required placeholder="ex: Comissário, Operador, Auditor, Cidadão A" value={createHierarchyTitle} onChange={e => setCreateHierarchyTitle(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>URL DA FOTO (OPCIONAL)</label>
                    <input type="text" placeholder="https://..." value={createAvatarUrl} onChange={e => setCreateAvatarUrl(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>SENHA TEMPORÁRIA *</label>
                    <input type="password" required placeholder="Senha inicial" value={createPassword} onChange={e => setCreatePassword(e.target.value)} />
                  </div>
                  <button type="submit" className="state-btn success success-glow">INDEXAR USUÁRIO</button>
                </form>
              </div>
            </div>
          </section>
        )}

        {/* ========================================== */}
        {/* GESTÃO DE USUÁRIOS (ADMIN) */}
        {/* ========================================== */}
        {activeTab === 'adm-citizens' && detailCitizenId === null && userRole === 'admin' && (
          <section className="tab-pane active">
            <div className="section-heading" style={{ marginBottom: '20px' }}>
              <h2 className="section-title">GESTÃO CENTRAL DE USUÁRIOS E HIERARQUIAS</h2>
              <p className="section-subtitle">Gerencie os níveis de acesso (Admin/Usuário), atribua títulos personalizados e fotos.</p>
            </div>

            {/* Filtros */}
            <div className="filters-row">
              <div className="filter-group search">
                <input 
                  type="text" 
                  placeholder="Pesquisar por nome, e-mail, celular ou título..." 
                  value={adminSearch} 
                  onChange={e => { setAdminSearch(e.target.value); setAdminPage(1); }} 
                />
              </div>
              <div className="filter-group">
                <select value={adminFilterStatus} onChange={e => { setAdminFilterStatus(e.target.value); setAdminPage(1); }}>
                  <option value="">Todos os Status</option>
                  <option value="active">Ativo</option>
                  <option value="blocked">Bloqueado</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>
              <div className="filter-group">
                <select value={adminFilterTier} onChange={e => { setAdminFilterTier(e.target.value); setAdminPage(1); }}>
                  <option value="">Todas as Faixas ILC</option>
                  <option value="Vigilância Máxima">Vigilância Máxima</option>
                  <option value="Restrito">Restrito</option>
                  <option value="Cidadão Comum">Cidadão Comum</option>
                  <option value="Cidadão Exemplar">Cidadão Exemplar</option>
                  <option value="Herói Cívico">Herói Cívico</option>
                  <option value="Alto Comando Honorário">Alto Comando Honorário</option>
                </select>
              </div>
            </div>

            {/* Tabela de Usuários */}
            <div className="table-container">
              <table className="state-table">
                <thead>
                  <tr>
                    <th>FOTO</th>
                    <th>NICKNAME / CONTATO</th>
                    <th>NÍVEL BASE</th>
                    <th>TÍTULO DE HIERARQUIA</th>
                    <th>ILC SCORE</th>
                    <th>FAIXA</th>
                    <th>STATUS</th>
                    <th>AÇÕES</th>
                  </tr>
                </thead>
                <tbody>
                  {adminCitizens.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum usuário encontrado.</td>
                    </tr>
                  ) : (
                    adminCitizens.map(cit => {
                      const tier = getTierDetails(cit.current_score);
                      return (
                        <tr key={cit.id}>
                          <td>
                            {cit.avatar_url ? (
                              <img src={cit.avatar_url} alt="Avatar" className="table-user-avatar" />
                            ) : (
                              <div className="table-avatar-placeholder">{cit.username.charAt(0).toUpperCase()}</div>
                            )}
                          </td>
                          <td>
                            <span className="text-gold">@{cit.username}</span><br />
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{cit.email || 'Sem e-mail'}</span>
                          </td>
                          <td>
                            <span className={`role-badge role-${cit.role_name}`}>
                              {cit.role_name === 'admin' ? 'ADMINISTRADOR' : 'USUÁRIO'}
                            </span>
                          </td>
                          <td>
                            <span className="hierarchy-title-badge">
                              {cit.hierarchy_title || (cit.role_name === 'admin' ? 'Administrador' : 'Usuário')}
                            </span>
                          </td>
                          <td className="font-hero text-success">{cit.current_score}</td>
                          <td>
                            <span className="status-badge" style={{ background: `${tier.color}20`, color: tier.color, border: `1px solid ${tier.color}` }}>
                              {tier.name}
                            </span>
                          </td>
                          <td><span className={`status-badge status-${cit.status}`}>{cit.status.toUpperCase()}</span></td>
                          <td style={{ display: 'flex', gap: '6px' }}>
                            <button className="sim-btn admin" onClick={() => openAdminEditUserModal(cit)}>EDITAR</button>
                            <button className="sim-btn operator" onClick={() => setDetailCitizenId(cit.id)}>DETALHAR</button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {adminTotalCitizens > adminLimit && (
              <div className="pagination">
                {Array.from({ length: Math.ceil(adminTotalCitizens / adminLimit) }).map((_, idx) => (
                  <button 
                    key={idx} 
                    className={`page-btn ${adminPage === idx + 1 ? 'active' : ''}`}
                    onClick={() => setAdminPage(idx + 1)}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* DETALHE DO USUÁRIO INDIVIDUAL (ADMIN) */}
        {detailCitizenId !== null && detailCitizenData && userRole === 'admin' && (
          <section className="tab-pane active">
            <button className="state-btn outline back-btn" onClick={() => setDetailCitizenId(null)}>← VOLTAR PARA A LISTA</button>

            <div className="bento-grid" style={{ marginTop: '20px' }}>
              <div className="bento-card col-4">
                <h3 className="card-title">FICHA DO USUÁRIO</h3>
                <div style={{ marginTop: '15px' }}>
                  <div className="detail-row">
                    <span className="label">NICKNAME</span>
                    <span className="value text-gold" style={{ fontSize: '18px' }}>@{detailCitizenData.citizen.username}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">NÍVEL BASE</span>
                    <span className="value">{detailCitizenData.citizen.role_name === 'admin' ? 'ADMINISTRADOR' : 'USUÁRIO'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">TÍTULO DE HIERARQUIA</span>
                    <span className="value hierarchy-title-badge">{detailCitizenData.citizen.hierarchy_title || 'Usuário'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">E-MAIL DO REGISTRO</span>
                    <span className="value">{detailCitizenData.citizen.email || 'Nenhum'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">STATUS CIVIL</span>
                    <span className={`value status-${detailCitizenData.citizen.status}`}>{detailCitizenData.citizen.status.toUpperCase()}</span>
                  </div>
                  <div className="detail-row" style={{ marginTop: '15px' }}>
                    <span className="label">PONTUAÇÃO ATUAL ILC</span>
                    <span className="value font-hero text-success" style={{ fontSize: '38px' }}>{detailCitizenData.citizen.current_score}</span>
                  </div>
                </div>

                <div className="action-divider">MODIFICAR STATUS</div>
                <div className="status-actions">
                  <button className="state-btn success" onClick={() => changeCitizenStatus('active')}>ATIVAR CONTA</button>
                  <button className="state-btn warning" onClick={() => changeCitizenStatus('blocked')}>BLOQUEAR ACESSO</button>
                </div>
              </div>

              <div className="bento-card col-8">
                <h3 className="card-title">EVOLUÇÃO HISTÓRICA</h3>
                <div className="chart-container" style={{ height: '180px', marginBottom: '20px' }}>
                  <ScoreChart history={detailCitizenData.history} />
                </div>

                <div className="action-divider">OUTORGAR CERTIFICADO MANUALMENTE</div>
                <div className="manual-cert-row">
                  <select value={detailCertId} onChange={e => setDetailCertId(e.target.value)}>
                    <option value="">Selecione um certificado...</option>
                    {certificatesList.map(cert => (
                      <option key={cert.id} value={cert.id}>{cert.name} (Requer: {cert.points_required} pts)</option>
                    ))}
                  </select>
                  <button className="state-btn primary gold-glow" onClick={handleGrantManualCertificate}>CONCEDER TÍTULO</button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* FILA DE APROVAÇÕES PENDENTES */}
        {activeTab === 'adm-approvals' && adminMetrics && userRole === 'admin' && (
          <section className="tab-pane active">
            <div className="section-heading" style={{ marginBottom: '20px' }}>
              <h2 className="section-title">FILA CENTRAL DE APROVAÇÕES</h2>
              <p className="section-subtitle">Homologue ou invalide denúncias e solicitações de bônus.</p>
            </div>
            <div className="table-container">
              <table className="state-table">
                <thead>
                  <tr>
                    <th>DATA</th>
                    <th>USUÁRIO AFETADO</th>
                    <th>ATIVIDADE</th>
                    <th>IMPACTO</th>
                    <th>DESCRIÇÃO</th>
                    <th>COMPROVANTE</th>
                    <th>AÇÕES</th>
                  </tr>
                </thead>
                <tbody>
                  {adminMetrics.pending_events.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Fila de homologação vazia.</td>
                    </tr>
                  ) : (
                    adminMetrics.pending_events.map(ev => (
                      <tr key={ev.id}>
                        <td>{new Date(ev.created_at).toLocaleDateString('pt-BR')}</td>
                        <td className="text-gold">@{ev.citizen_name}</td>
                        <td>{ev.type_name}</td>
                        <td className={`${ev.points_delta > 0 ? 'text-success' : 'text-warning'} font-hero`}>
                          {ev.points_delta > 0 ? `+${ev.points_delta}` : ev.points_delta}
                        </td>
                        <td>{ev.description}</td>
                        <td>
                          {ev.evidence_url ? (
                            <a href={ev.evidence_url} target="_blank" rel="noreferrer" className="text-gold">Ver Anexo</a>
                          ) : (
                            'Sem anexo'
                          )}
                        </td>
                        <td style={{ display: 'flex', gap: '6px' }}>
                          <button className="sim-btn citizen-high" onClick={() => resolvePendingEvent(ev.id, 'approved')}>APROVAR</button>
                          <button className="sim-btn citizen-low" onClick={() => resolvePendingEvent(ev.id, 'rejected')}>REJEITAR</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* LOGS DE AUDITORIA */}
        {activeTab === 'adm-audit' && userRole === 'admin' && (
          <section className="tab-pane active">
            <div className="section-heading" style={{ marginBottom: '20px' }}>
              <h2 className="section-title">AUDITORIA DOS REGISTROS ESTATAIS</h2>
              <p className="section-subtitle">Logs imutáveis de ações administrativas e alterações de usuários.</p>
            </div>
            <div className="table-container">
              <table className="state-table font-mono">
                <thead>
                  <tr>
                    <th>DATA E HORA</th>
                    <th>AUTOR</th>
                    <th>ENTIDADE</th>
                    <th>AÇÃO</th>
                    <th>DADOS NOVOS</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Sem logs de auditoria.</td>
                    </tr>
                  ) : (
                    auditLogs.map(log => (
                      <tr key={log.id}>
                        <td style={{ fontSize: '11px' }}>{new Date(log.created_at).toLocaleString('pt-BR')}</td>
                        <td className="text-gold">{log.actor_name || 'Sistema'}</td>
                        <td style={{ color: 'var(--slate)' }}>{log.entity_name}</td>
                        <td style={{ fontWeight: '700' }}>{log.action}</td>
                        <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {log.new_data ? JSON.stringify(log.new_data) : 'Nulo'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

      </main>

      {/* MODAL ALTERAR FOTO E TÍTULO DA CARTEIRA (USUÁRIO) */}
      <div className={`modal-overlay ${photoModalOpen ? 'active' : ''}`}>
        <div className="modal-card">
          <h2 className="modal-title">ALTERAR FOTO E DADOS DA CARTEIRA</h2>
          <p className="modal-desc">Você pode carregar uma foto do seu computador, colar a URL direta da imagem ou utilizar sua foto do Google.</p>
          <form onSubmit={handleUpdateProfile}>
            <div className="form-group">
              <label>TÍTULO PERSONALIZADO DA HIERARQUIA</label>
              <input type="text" placeholder="ex: Operador de Campo, Auditor Cívico, Cidadão A" value={customTitleInput} onChange={e => setCustomTitleInput(e.target.value)} />
            </div>

            <div className="form-group">
              <label>URL DA FOTO DE PERFIL</label>
              <input type="text" placeholder="https://..." value={inputAvatarUrl} onChange={e => setInputAvatarUrl(e.target.value)} />
            </div>

            <div className="form-group">
              <label>OU ENVIAR FOTO DO COMPUTADOR</label>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="file-input" />
            </div>

            {inputAvatarUrl && (
              <div style={{ textAlign: 'center', margin: '15px 0' }}>
                <span className="field-desc" style={{ display: 'block', marginBottom: '8px' }}>Pré-visualização:</span>
                <img src={inputAvatarUrl} alt="Preview Modal" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #B08A47' }} />
              </div>
            )}

            <div className="form-buttons">
              <button type="button" className="state-btn secondary" onClick={() => setPhotoModalOpen(false)}>CANCELAR</button>
              <button type="submit" className="state-btn primary gold-glow">SALVAR NA CARTEIRA</button>
            </div>
          </form>
        </div>
      </div>

      {/* MODAL EDIÇÃO DE USUÁRIO PELO ADMIN */}
      <div className={`modal-overlay ${editUserModalOpen ? 'active' : ''}`}>
        <div className="modal-card">
          <h2 className="modal-title">EDITAR PERMISSÕES E TÍTULOS DO USUÁRIO</h2>
          <p className="modal-desc">Configure o Nível de Acesso Base (Admin / Usuário) e defina o Título Personalizado da Hierarquia sem alterar as permissões rígidas.</p>
          <form onSubmit={handleAdminSaveUserEdit}>
            <div className="form-group">
              <label>NICKNAME</label>
              <input type="text" required value={editFormUsername} onChange={e => setEditFormUsername(e.target.value)} />
            </div>

            <div className="form-group">
              <label>E-MAIL</label>
              <input type="email" value={editFormEmail} onChange={e => setEditFormEmail(e.target.value)} />
            </div>

            <div className="form-group">
              <label>NÍVEL DE ACESSO BASE *</label>
              <select value={editFormRole} onChange={e => setEditFormRole(e.target.value)}>
                <option value="usuario">Usuário (Permissão Padrão)</option>
                <option value="admin">Administrador (Permissão Total)</option>
              </select>
              <span className="field-desc">Define as permissões de acesso às rotas do sistema.</span>
            </div>

            <div className="form-group">
              <label>TÍTULO PERSONALIZADO DA HIERARQUIA *</label>
              <input type="text" required placeholder="ex: Comissário Chefe, Operador de Campo, Auditor, Cidadão A" value={editFormTitle} onChange={e => setEditFormTitle(e.target.value)} />
              <span className="field-desc">Título exibido na carteira e nos distintivos do usuário.</span>
            </div>

            <div className="form-group">
              <label>URL DA FOTO DE PERFIL</label>
              <input type="text" placeholder="https://..." value={editFormAvatar} onChange={e => setEditFormAvatar(e.target.value)} />
            </div>

            <div className="form-group">
              <label>STATUS CIVIL</label>
              <select value={editFormStatus} onChange={e => setEditFormStatus(e.target.value)}>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
                <option value="blocked">Bloqueado</option>
              </select>
            </div>

            <div className="form-buttons">
              <button type="button" className="state-btn secondary" onClick={() => setEditUserModalOpen(false)}>CANCELAR</button>
              <button type="submit" className="state-btn primary gold-glow">SALVAR ALTERAÇÕES</button>
            </div>
          </form>
        </div>
      </div>

    </div>
  );
}

export default App;
