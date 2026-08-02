import React, { useState, useEffect } from 'react';
import ScoreChart from './components/ScoreChart';
import CertificatesGrid from './components/CertificatesGrid';
import logoNorml from './imgs/lgo_norml.png';
import logoQuebrada from './imgs/lgo_quebrada.png';
import logoReluzindo from './imgs/lgo_reluzindo.png';

const logoImg = logoNorml;

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
  const [editFormRank, setEditFormRank] = useState('Recruta');
  const [editFormRankEmblem, setEditFormRankEmblem] = useState('');

  // Campos de patente ao criar usuário (Admin)
  const [createRankTitle, setCreateRankTitle] = useState('Recruta');
  const [createRankEmblem, setCreateRankEmblem] = useState('');

  // Detalhe de Usuário Individual (Admin)
  const [detailCitizenId, setDetailCitizenId] = useState(null);
  const [detailCitizenData, setDetailCitizenData] = useState(null);
  const [detailCertId, setDetailCertId] = useState('');

  // Listas Estáticas de Apoio (Admin)
  const [eventTypes, setEventTypes] = useState([]);
  const [certificatesList, setCertificatesList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Logs de auditoria do usuário comum
  const [citizenAuditLogs, setCitizenAuditLogs] = useState([]);

  // Eventos da Democracia
  const [democracyEvents, setDemocracyEvents] = useState([]);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventCategory, setNewEventCategory] = useState('cívico');
  const [newEventStatus, setNewEventStatus] = useState('planejado');
  const [newEventMaxParticipants, setNewEventMaxParticipants] = useState('');
  const [newEventUrl, setNewEventUrl] = useState('');
  const [democracyFormOpen, setDemocracyFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  // Modais de Eventos da Democracia (Inscritos & WhatsApp)
  const [participantsModalOpen, setParticipantsModalOpen] = useState(false);
  const [selectedEventParticipants, setSelectedEventParticipants] = useState([]);
  const [selectedEventTitle, setSelectedEventTitle] = useState('');

  const [wahaModalOpen, setWahaModalOpen] = useState(false);
  const [wahaEvent, setWahaEvent] = useState(null);
  const [wahaCustomMessage, setWahaCustomMessage] = useState('');
  const [wahaSending, setWahaSending] = useState(false);

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

  // Limpar sessão e forçar relogin
  const forceLogout = (reason = 'Sessão expirada. Faça login novamente.') => {
    setToken(null);
    setUserRole(null);
    setUsername(null);
    setUserHierarchyTitle(null);
    setUserAvatarUrl(null);
    setCitizenData(null);
    setAdminMetrics(null);
    setDetailCitizenId(null);
    localStorage.clear();
    showToast('🔒 Sessão Encerrada', reason, 'warning');
  };

  const parseApiResponse = async (res) => {
    // Token inválido ou expirado — deslogar automaticamente
    if (res.status === 401 || res.status === 403) {
      const text = await res.text();
      let msg = 'Sessão expirada ou token inválido. Faça login novamente.';
      try {
        const parsed = JSON.parse(text);
        if (parsed.error) msg = parsed.error;
      } catch (_) { }
      forceLogout(msg);
      return { error: msg };
    }

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

  // FORMATADORES COMPREENSÍVEIS DE AUDITORIA
  const formatAuditDate = (dateStr) => {
    if (!dateStr) return '—';
    const dt = new Date(dateStr);
    if (isNaN(dt.getTime())) return dateStr;
    return dt.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(',', ' às');
  };

  const formatAuditEntity = (entity) => {
    if (!entity) return '⚙️ Geral';
    const map = {
      'users': '👤 Perfil do Cidadão',
      'user': '👤 Perfil do Cidadão',
      'score_accounts': '📊 Pontuação ILC',
      'score_events': '📝 Registro Cívico',
      'democracy_events': '🗳️ Evento da Democracia',
      'democracy_event_participants': '🤝 Inscrição em Evento',
      'user_certificates': '📜 Certificado de Mérito',
      'merit_certificates': '📜 Certificado de Mérito',
      'system': '⚙️ Sistema Estatal'
    };
    return map[entity.toLowerCase()] || `📁 ${entity.replace(/_/g, ' ').toUpperCase()}`;
  };

  const formatAuditAction = (act) => {
    if (!act) return { label: 'Ação Registrada', color: 'rgba(78, 110, 142, 0.2)', border: '#4E6E8E', text: '#B9B19A' };
    const norm = act.toUpperCase();
    const map = {
      'CREATE_USER': { label: '🆕 Nova Conta Criada', color: 'rgba(115, 179, 58, 0.2)', border: '#73B33A', text: '#73B33A' },
      'UPDATE_USER': { label: '✏️ Conta Atualizada', color: 'rgba(78, 110, 142, 0.2)', border: '#4E6E8E', text: '#8EB4E3' },
      'UPDATE_STATUS': { label: '🔒 Status Alterado', color: 'rgba(138, 61, 47, 0.2)', border: '#8A3D2F', text: '#E26D5C' },
      'UPDATE_AVATAR': { label: '🖼️ Foto Atualizada', color: 'rgba(176, 138, 71, 0.2)', border: '#B08A47', text: '#D4C08A' },
      'UPDATE_NICKNAME': { label: '🏷️ Apelido Alterado', color: 'rgba(176, 138, 71, 0.2)', border: '#B08A47', text: '#D4C08A' },
      'UPDATE_SCORE': { label: '⚖️ Pontuação Reajustada', color: 'rgba(176, 138, 71, 0.2)', border: '#B08A47', text: '#D4C08A' },
      'QUICK_EVENT': { label: '⚡ Atividade Lançada', color: 'rgba(115, 179, 58, 0.2)', border: '#73B33A', text: '#73B33A' },
      'EVENT_APPROVED': { label: '✅ Evento Aprovado', color: 'rgba(115, 179, 58, 0.2)', border: '#73B33A', text: '#73B33A' },
      'EVENT_REJECTED': { label: '❌ Evento Rejeitado', color: 'rgba(138, 61, 47, 0.2)', border: '#8A3D2F', text: '#E26D5C' },
      'GRANT_CERTIFICATE': { label: '🎖️ Outorga de Certificado', color: 'rgba(176, 138, 71, 0.25)', border: '#B08A47', text: '#FFD700' },
      'CREATE_DEMOCRACY_EVENT': { label: '📅 Evento Agendado', color: 'rgba(115, 179, 58, 0.2)', border: '#73B33A', text: '#73B33A' },
      'UPDATE_DEMOCRACY_EVENT': { label: '📝 Evento Editado', color: 'rgba(78, 110, 142, 0.2)', border: '#4E6E8E', text: '#8EB4E3' },
      'DELETE_DEMOCRACY_EVENT': { label: '🗑️ Evento Excluído', color: 'rgba(138, 61, 47, 0.2)', border: '#8A3D2F', text: '#E26D5C' },
      'REGISTER_DEMOCRACY_EVENT': { label: '🙋 Inscrição Confirmada', color: 'rgba(115, 179, 58, 0.2)', border: '#73B33A', text: '#73B33A' },
      'CANCEL_DEMOCRACY_EVENT': { label: '🚫 Inscrição Cancelada', color: 'rgba(138, 61, 47, 0.2)', border: '#8A3D2F', text: '#E26D5C' },
    };
    return map[norm] || { label: act.replace(/_/g, ' ').toUpperCase(), color: 'rgba(78, 110, 142, 0.2)', border: '#4E6E8E', text: '#B9B19A' };
  };

  const renderAuditData = (data) => {
    if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
      return <span className="audit-data-empty">Sem dados adicionais</span>;
    }

    if (typeof data !== 'object') {
      return <span className="audit-chip">{String(data)}</span>;
    }

    const keyTranslations = {
      username: 'Nickname',
      email: 'E-mail',
      celular: 'Celular',
      hierarchy_title: 'Título',
      current_score: 'Score',
      started_score: 'Score Inicial',
      points_delta: 'Variação',
      delta: 'Pontos',
      status: 'Status',
      role: 'Permissão',
      role_name: 'Permissão Base',
      title: 'Título do Evento',
      description: 'Descrição',
      reason: 'Motivo',
      event_type: 'Tipo de Evento',
      event_type_id: 'Tipo',
      certificate_name: 'Certificado',
      location: 'Local',
      event_date: 'Data do Evento',
      category: 'Categoria',
      action: 'Ação',
      user_id: 'ID Usuário'
    };

    const valueTranslations = {
      active: 'Ativo',
      blocked: 'Bloqueado',
      inactive: 'Inativo',
      admin: 'Administrador',
      usuario: 'Usuário Padrão',
      pending: 'Pendente',
      approved: 'Aprovado',
      rejected: 'Rejeitado'
    };

    return (
      <div className="audit-data-container">
        {Object.entries(data).map(([key, val]) => {
          if (val === null || val === undefined || val === '') return null;
          const label = keyTranslations[key] || key.replace(/_/g, ' ');
          let displayVal = val;

          if (typeof val === 'boolean') {
            displayVal = val ? 'Sim' : 'Não';
          } else if (typeof val === 'string' && valueTranslations[val]) {
            displayVal = valueTranslations[val];
          } else if (typeof val === 'object') {
            displayVal = JSON.stringify(val);
          } else if (key === 'points_delta' || key === 'delta') {
            displayVal = Number(val) > 0 ? `+${val} pts` : `${val} pts`;
          } else if (key === 'current_score') {
            displayVal = `${val} pts`;
          }

          return (
            <span key={key} className="audit-chip">
              <span className="audit-chip-key">{label}:</span> {displayVal}
            </span>
          );
        })}
      </div>
    );
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
    const googleTitle = params.get('google_title');
    const googleAvatar = params.get('google_avatar');
    const googleNew = params.get('google_new');
    const googleTemp = params.get('google_temp');
    const googleError = params.get('google_error');

    if (googleToken && googleRole && googleUsername) {
      saveSession(
        googleToken,
        googleRole,
        decodeURIComponent(googleUsername),
        googleTitle ? decodeURIComponent(googleTitle) : null,
        googleAvatar ? decodeURIComponent(googleAvatar) : null
      );
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

    if (activeTab === 'cit-dashboard') {
      fetchCitizenData();
    } else if (activeTab === 'cit-audit') {
      fetchCitizenAuditLogs();
    } else if (activeTab === 'democracy-events') {
      fetchDemocracyEvents();
    } else if (activeTab === 'adm-dashboard') {
      fetchAdminMetrics();
      fetchAdminCitizens();
    } else if (activeTab === 'adm-citizens') {
      fetchAdminCitizens();
    } else if (activeTab === 'adm-approvals') {
      fetchAdminMetrics();
    } else if (activeTab === 'adm-audit') {
      fetchAdminAuditLogs();
    } else if (activeTab === 'adm-democracy-events') {
      fetchDemocracyEvents();
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

  const fetchCitizenAuditLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/citizen/audit-logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error);
      setCitizenAuditLogs(data);
    } catch (err) {
      showToast('Erro de Auditoria', err.message, 'warning');
    }
  };

  // REQUISIÇÕES: EVENTOS DA DEMOCRACIA
  const fetchDemocracyEvents = async () => {
    try {
      const res = await fetch(`${API_BASE}/democracy-events`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error);
      setDemocracyEvents(data);
    } catch (err) {
      showToast('Erro nos Eventos', err.message, 'warning');
    }
  };

  const openParticipantsModal = async (ev) => {
    setSelectedEventTitle(ev.title);
    setSelectedEventParticipants([]);
    setParticipantsModalOpen(true);
    try {
      const res = await fetch(`${API_BASE}/democracy-events/${ev.id}/participants`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error);
      setSelectedEventParticipants(data);
    } catch (err) {
      showToast('Erro ao listar inscritos', err.message, 'warning');
    }
  };

  const openWahaModal = (ev) => {
    setWahaEvent(ev);
    const eventDate = new Date(ev.event_date);
    const formattedDate = eventDate.toLocaleDateString('pt-BR', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
    }) + ' às ' + eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const defaultMsg = `*🏛️ EVENTO DA DEMOCRACIA: ${ev.title.toUpperCase()}*\n\n` +
      `📅 *Data/Hora:* ${formattedDate}\n` +
      (ev.location ? `📍 *Local:* ${ev.location}\n` : '') +
      `🏷️ *Categoria:* ${ev.category.toUpperCase()}\n` +
      (ev.description ? `📝 *Descrição:* ${ev.description}\n` : '') +
      (ev.registration_url ? `🔗 *Link:* ${ev.registration_url}\n` : '') +
      `\n_Mensagem Oficial — Índice de Lealdade Cívica (ILC)_`;

    setWahaCustomMessage(defaultMsg);
    setWahaModalOpen(true);
  };

  const handleSendWahaWebhook = async (e) => {
    e.preventDefault();
    setWahaSending(true);
    try {
      const res = await fetch(`${API_BASE}/democracy-events/${wahaEvent.id}/send-webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          custom_message: wahaCustomMessage
        })
      });

      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error);

      showToast('📲 WhatsApp Enviado', data.message, 'success');
      setWahaModalOpen(false);
    } catch (err) {
      showToast('Erro ao Enviar WhatsApp', err.message, 'warning');
    } finally {
      setWahaSending(false);
    }
  };

  const resetEventForm = () => {
    setNewEventTitle('');
    setNewEventDescription('');
    setNewEventLocation('');
    setNewEventDate('');
    setNewEventCategory('cívico');
    setNewEventStatus('planejado');
    setNewEventMaxParticipants('');
    setNewEventUrl('');
    setEditingEvent(null);
    setDemocracyFormOpen(false);
  };

  const openEditEventForm = (ev) => {
    setEditingEvent(ev);
    setNewEventTitle(ev.title);
    setNewEventDescription(ev.description || '');
    setNewEventLocation(ev.location || '');
    // Formatar para datetime-local input
    const dt = new Date(ev.event_date);
    const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setNewEventDate(local);
    setNewEventCategory(ev.category || 'cívico');
    setNewEventStatus(ev.status || 'planejado');
    setNewEventMaxParticipants(ev.max_participants || '');
    setNewEventUrl(ev.registration_url || '');
    setDemocracyFormOpen(true);
  };

  const handleSubmitDemocracyEvent = async (e) => {
    e.preventDefault();
    if (!newEventTitle || !newEventDate) {
      showToast('Validação', 'Título e data são obrigatórios.', 'warning');
      return;
    }

    try {
      const method = editingEvent ? 'PUT' : 'POST';
      const url = editingEvent
        ? `${API_BASE}/democracy-events/${editingEvent.id}`
        : `${API_BASE}/democracy-events`;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newEventTitle,
          description: newEventDescription,
          location: newEventLocation,
          event_date: newEventDate,
          category: newEventCategory,
          status: newEventStatus,
          max_participants: newEventMaxParticipants ? parseInt(newEventMaxParticipants) : null,
          registration_url: newEventUrl
        })
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error);

      showToast(editingEvent ? 'Evento Atualizado' : 'Evento Criado', data.message, 'success');
      resetEventForm();
      fetchDemocracyEvents();
    } catch (err) {
      showToast('Erro', err.message, 'warning');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Tem certeza que deseja excluir este evento?')) return;
    try {
      const res = await fetch(`${API_BASE}/democracy-events/${eventId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error);
      showToast('Evento Excluído', data.message, 'success');
      fetchDemocracyEvents();
    } catch (err) {
      showToast('Erro ao Excluir', err.message, 'warning');
    }
  };

  const handleRegisterEvent = async (eventId) => {
    try {
      const res = await fetch(`${API_BASE}/democracy-events/${eventId}/register`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error);
      showToast('Inscrição', data.message, 'success');
      fetchDemocracyEvents();
    } catch (err) {
      showToast('Erro de Inscrição', err.message, 'warning');
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

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Tipo Inválido', 'Apenas imagens JPEG, PNG, GIF, WebP ou SVG são permitidas.', 'warning');
      e.target.value = '';
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      showToast('Tamanho Excedido', 'Selecione uma foto de até 15MB.', 'warning');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      if (!dataUrl || !dataUrl.startsWith('data:image/')) {
        showToast('Arquivo Inválido', 'O arquivo selecionado não é uma imagem válida.', 'warning');
        e.target.value = '';
        return;
      }

      if (file.type === 'image/svg+xml') {
        setInputAvatarUrl(dataUrl);
        showToast('Imagem Carregada', 'Sua foto está pronta. Clique em "Salvar na Carteira" para confirmar.', 'info');
        return;
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 350;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round(height * (MAX_SIZE / width));
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round(width * (MAX_SIZE / height));
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.82;
        let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

        while (compressedDataUrl.length > 200 * 1024 && quality > 0.3) {
          quality -= 0.15;
          compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        const sizeInKB = Math.round((compressedDataUrl.length * 3 / 4) / 1024);
        setInputAvatarUrl(compressedDataUrl);
        showToast('Compressão Concluída', `Sua foto foi comprimida para ${sizeInKB} KB e está pronta para salvar.`, 'success');
      };
      img.onerror = () => {
        showToast('Erro de Imagem', 'Não foi possível processar a imagem.', 'warning');
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      showToast('Erro de Leitura', 'Não foi possível ler o arquivo.', 'warning');
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
    setEditFormRank(user.rank_title || 'Recruta');
    setEditFormRankEmblem(user.rank_emblem_url || '');
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
          rank_title: editFormRank,
          rank_emblem_url: editFormRankEmblem,
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

  const getRankingDetails = (score) => {
    const s = Number(score) || 0;
    if (s < 3501) {
      return {
        title: 'Cidadão Sob Vigilância / Baixa Lealdade',
        logo: logoQuebrada,
        badgeColor: '#8A3D2F',
        textColor: '#FF6B6B',
        desc: 'Pontuação abaixo de 3501 pts — Nível crítico de lealdade.'
      };
    } else if (s <= 8499) {
      return {
        title: 'Cidadão Regular / Padrão',
        logo: logoNorml,
        badgeColor: '#4E6E8E',
        textColor: '#B9B19A',
        desc: 'Pontuação entre 3501 e 8499 pts — Conduta cívica estabilizada.'
      };
    } else {
      return {
        title: 'Cidadão Ejemplar / Reluzente',
        logo: logoReluzindo,
        badgeColor: '#B08A47',
        textColor: '#FFD700',
        desc: 'Pontuação acima de 8499 pts — Alto grau de lealdade e honra.'
      };
    }
  };

  const getTierDetails = (score) => {
    const s = Number(score) || 0;
    if (s < 3501) return { name: 'Vigilância Máxima', color: '#8A3D2F' };
    if (s <= 8499) return { name: 'Cidadão Comum', color: '#4E6E8E' };
    return { name: 'Alto Comando / Reluzente', color: '#B08A47' };
  };

  const getCategoryIcon = (cat) => {
    const icons = {
      'cívico': '🏛️',
      'cultural': '🎭',
      'político': '⚖️',
      'comunitário': '🤝',
      'educacional': '📚',
      'ambiental': '🌿'
    };
    return icons[cat] || '📋';
  };

  const getStatusColor = (status) => {
    const colors = {
      'planejado': '#4E6E8E',
      'em andamento': '#73B33A',
      'concluído': '#B08A47',
      'cancelado': '#8A3D2F'
    };
    return colors[status] || '#B9B19A';
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
            <img src={logoImg} alt="Logo ILC" className="state-seal" />
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
                <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label>NÚMERO DE CELULAR (OPCIONAL)</label>
                <input type="text" value={regCelular} onChange={e => setRegCelular(e.target.value)} />
              </div>
              <div className="form-group">
                <label>SENHA DE ACESSO *</label>
                <input type="password" required value={regPass} onChange={e => setRegPass(e.target.value)} />
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
                <input type="text" required value={googleNickname} onChange={e => setGoogleNickname(e.target.value)} />
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

  // Determinar qual aba de Eventos é a ativa (usuário usa 'democracy-events', admin usa 'adm-democracy-events')
  const democracyTabKey = userRole === 'admin' ? 'adm-democracy-events' : 'democracy-events';
  const isDemocracyTab = activeTab === 'democracy-events' || activeTab === 'adm-democracy-events';

  return (
    <div id="app-container" className="app-container active">
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
          <img src={logoImg} alt="Logo ILC" className="header-logo" />
          <div className="header-titles">
            <h1>ESTADO SOBERANO DA DEMOCRACIA GERENCIADA</h1>
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
            <button className={`nav-tab ${activeTab === 'cit-dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('cit-dashboard')}>MINHA CARTEIRA</button>
            <button className={`nav-tab ${activeTab === 'cit-audit' ? 'active' : ''}`} onClick={() => setActiveTab('cit-audit')}>LOGS DE AUDITORIA</button>
            <button className={`nav-tab ${activeTab === 'democracy-events' ? 'active' : ''}`} onClick={() => setActiveTab('democracy-events')}>EVENTOS DA DEMOCRACIA</button>
          </div>
        ) : (
          <div className="nav-group active">
            <button className={`nav-tab ${activeTab === 'adm-dashboard' ? 'active' : ''}`} onClick={() => { setDetailCitizenId(null); setActiveTab('adm-dashboard'); }}>PAINEL ADMINISTRATIVO</button>
            <button className={`nav-tab ${activeTab === 'adm-citizens' || detailCitizenId !== null ? 'active' : ''}`} onClick={() => { setDetailCitizenId(null); setActiveTab('adm-citizens'); }}>GESTÃO DE USUÁRIOS</button>
            <button className={`nav-tab ${activeTab === 'adm-approvals' ? 'active' : ''}`} onClick={() => { setDetailCitizenId(null); setActiveTab('adm-approvals'); }}>APROVAÇÕES PENDENTES</button>
            <button className={`nav-tab ${activeTab === 'adm-audit' ? 'active' : ''}`} onClick={() => { setDetailCitizenId(null); setActiveTab('adm-audit'); }}>LOGS DE AUDITORIA</button>
            <button className={`nav-tab ${activeTab === 'cit-dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('cit-dashboard')}>MINHA CARTEIRA</button>
            <button className={`nav-tab ${activeTab === 'adm-democracy-events' ? 'active' : ''}`} onClick={() => { setDetailCitizenId(null); setActiveTab('adm-democracy-events'); fetchDemocracyEvents(); }}>EVENTOS DA DEMOCRACIA</button>
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
                              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
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

                  {/* RANKING CÍVICO COM BASE NO SCORE */}
                  {(() => {
                    const rank = getRankingDetails(citizenData.profile.current_score);
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 0', borderTop: '1px solid var(--border-light)', marginTop: '8px' }}>
                        <div className="rank-emblem-box">
                          <img src={rank.logo} alt="Insígnia de Ranking" className="rank-emblem-img" />
                          <span style={{ fontSize: '9px', color: 'var(--gold)', fontFamily: 'var(--font-ui)', fontWeight: 700, letterSpacing: '0.5px', marginTop: '4px', textAlign: 'center' }}>RANKING</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', letterSpacing: '1px' }}>CLASSIFICAÇÃO DO CIDADÃO</div>
                          <div className="rank-title-badge" style={{ marginTop: '4px', borderColor: rank.badgeColor, color: rank.textColor }}>
                            {rank.title}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="card-footer">
                    <div className="score-display">
                      <span className="score-label">PONTUAÇÃO ILC ATUAL</span>
                      <span className="score-number font-hero success-glow">{citizenData.profile.current_score}</span>
                    </div>
                    <div className="card-barcode">|||| | ||| | || |||| | ||| ||||</div>
                  </div>
                </div>
              </div>

              {/* EVOLUÇÃO DE FAIXA / RANKING */}
              <div className="bento-card col-4 flex-col justify-between">
                <div className="card-head">
                  <h3 className="card-title">EVOLUÇÃO DA CLASSIFICAÇÃO</h3>
                  <p className="card-subtitle">Sua progressão no Índice de Lealdade Cívica.</p>
                </div>

                {(() => {
                  const s = Number(citizenData.profile ? citizenData.profile.current_score : 0);
                  let minS = 0;
                  let maxS = 10000;
                  let currentRankLabel = 'Sob Vigilância';
                  let nextRankLabel = 'Cidadão Regular';
                  let helpText = '';
                  let pct = 0;

                  if (s < 3501) {
                    minS = 0;
                    maxS = 3500;
                    currentRankLabel = 'Sob Vigilância (<3501)';
                    nextRankLabel = 'Cidadão Regular (3501)';
                    pct = Math.min(100, Math.max(0, (s / 3500) * 100));
                    helpText = `Faltam ${3501 - s} pontos para sair do estado de vigilância crítica.`;
                  } else if (s <= 8499) {
                    minS = 3501;
                    maxS = 8499;
                    currentRankLabel = 'Cidadão Regular (3501)';
                    nextRankLabel = 'Cidadão Reluzente (8500)';
                    pct = Math.min(100, Math.max(0, ((s - 3501) / (8499 - 3501)) * 100));
                    helpText = `Faltam ${8500 - s} pontos para atingir o Nível Reluzente!`;
                  } else {
                    minS = 8500;
                    maxS = 10000;
                    currentRankLabel = 'Cidadão Reluzente (8500+)';
                    nextRankLabel = 'Nível Máximo (10000)';
                    pct = Math.min(100, Math.max(0, ((s - 8500) / (10000 - 8500)) * 100));
                    helpText = 'Você atingiu a graduação máxima de lealdade e honra estatal.';
                  }

                  return (
                    <div className="progress-section">
                      <div className="progress-labels">
                        <span>{currentRankLabel}</span>
                        <span>{nextRankLabel}</span>
                      </div>
                      <div className="progress-bar-track">
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                      <p className="progress-help">{helpText}</p>
                    </div>
                  );
                })()}

                <div className="tier-info-panel">
                  <h4 className="tier-info-title text-gold">RESTRIÇÕES / PRIVILÉGIOS ATUAIS:</h4>
                  <p className="tier-info-desc">
                    {citizenData.profile.current_score < 3501
                      ? '⚠️ Restrição cívica: Acesso limitado e monitoramento contínuo pelo Estado.'
                      : citizenData.profile.current_score <= 8499
                        ? '✅ Privilégios regulares: Acesso livre aos serviços cívicos e eventos.'
                        : '🌟 Condecoração Reluzente: Acesso prioritário, imunidades e honrarias de alto comando.'}
                  </p>
                </div>
              </div>

              {/* ÚLTIMAS ATIVIDADES DO BD */}
              <div className="bento-card col-3">
                <div className="card-head">
                  <h3 className="card-title">ÚLTIMAS ATIVIDADES</h3>
                  <p className="card-subtitle">Registros mais recentes do seu histórico.</p>
                </div>
                <div className="recommendations-list">
                  {citizenData.history && citizenData.history.length > 0 ? (
                    citizenData.history.slice(0, 4).map(ev => (
                      <div key={ev.id} className="rec-item">
                        <div className="rec-info">
                          <h4>{ev.type_name}</h4>
                          <p>{ev.description || 'Sem descrição'}</p>
                        </div>
                        <span className={`rec-delta ${ev.points_delta > 0 ? 'text-success' : 'text-warning'}`}>
                          {ev.points_delta > 0 ? `+${ev.points_delta}` : ev.points_delta}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '10px 0' }}>Nenhuma atividade registrada ainda.</p>
                  )}
                </div>
              </div>

              {/* HISTOGRAMA TEMPORAL */}
              <div className="bento-card col-12 chart-card">
                <div className="card-head">
                  <h3 className="card-title">HISTOGRAMA DE COMPORTAMENTO CÍVICO</h3>
                  <p className="card-subtitle">Evolução temporal nas últimas atividades homologadas.</p>
                </div>
                <div className="chart-container">
                  <ScoreChart history={citizenData.history} currentScore={citizenData.profile ? citizenData.profile.current_score : 5000} />
                </div>
              </div>

            </div>
          </section>
        )}

        {/* ========================================== */}
        {/* ========================================== */}
        {/* LOGS DE AUDITORIA DO USUÁRIO COMUM         */}
        {/* ========================================== */}
        {activeTab === 'cit-audit' && (
          <section className="tab-pane active">
            <div className="section-heading" style={{ marginBottom: '20px' }}>
              <h2 className="section-title">MEUS LOGS DE AUDITORIA</h2>
              <p className="section-subtitle">Registro transparente e imutável de todas as ações associadas à sua conta.</p>
            </div>
            <div className="table-container">
              <table className="state-table">
                <thead>
                  <tr>
                    <th>DATA E HORA</th>
                    <th>ENTIDADE AFETADA</th>
                    <th>AÇÃO REALIZADA</th>
                    <th>DETALHES / DADOS REGISTRADOS</th>
                  </tr>
                </thead>
                <tbody>
                  {citizenAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                        Nenhum registro de auditoria encontrado para sua conta.
                      </td>
                    </tr>
                  ) : (
                    citizenAuditLogs.map(log => {
                      const actObj = formatAuditAction(log.action);
                      return (
                        <tr key={log.id}>
                          <td className="audit-date">📅 {formatAuditDate(log.created_at)}</td>
                          <td><span className="audit-entity-badge">{formatAuditEntity(log.entity_name)}</span></td>
                          <td>
                            <span className="audit-action-badge" style={{ background: actObj.color, border: `1px solid ${actObj.border}`, color: actObj.text }}>
                              {actObj.label}
                            </span>
                          </td>
                          <td>{renderAuditData(log.new_data)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ========================================== */}
        {/* EVENTOS DA DEMOCRACIA (USUÁRIO / ADMIN)    */}
        {/* ========================================== */}
        {isDemocracyTab && (
          <section className="tab-pane active">
            <div className="section-heading" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 className="section-title">EVENTOS DA DEMOCRACIA</h2>
                <p className="section-subtitle">Agende e participe de eventos cívicos, culturais e comunitários oficiais.</p>
              </div>
              {!democracyFormOpen && (
                <button className="state-btn primary gold-glow" onClick={() => { resetEventForm(); setDemocracyFormOpen(true); }}>
                  + AGENDAR NOVO EVENTO
                </button>
              )}
            </div>

            {/* FORMULÁRIO DE CRIAÇÃO / EDIÇÃO DE EVENTO */}
            {democracyFormOpen && (
              <div className="bento-card col-12" style={{ marginBottom: '24px' }}>
                <h3 className="card-title">{editingEvent ? 'EDITAR EVENTO' : 'AGENDAR NOVO EVENTO DA DEMOCRACIA'}</h3>
                <form onSubmit={handleSubmitDemocracyEvent} className="form-dense" style={{ marginTop: '18px' }}>
                  <div className="bento-grid" style={{ gap: '16px' }}>
                    <div className="bento-card col-6" style={{ padding: '0', background: 'none', border: 'none', boxShadow: 'none' }}>
                      <div className="form-group">
                        <label>TÍTULO DO EVENTO *</label>
                        <input type="text" required value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>DATA E HORA *</label>
                        <input type="datetime-local" required value={newEventDate} onChange={e => setNewEventDate(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>LOCAL / LOCALIZAÇÃO</label>
                        <input type="text" value={newEventLocation} onChange={e => setNewEventLocation(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>LINK DE INSCRIÇÃO (OPCIONAL)</label>
                        <input type="url" value={newEventUrl} onChange={e => setNewEventUrl(e.target.value)} />
                      </div>
                    </div>
                    <div className="bento-card col-6" style={{ padding: '0', background: 'none', border: 'none', boxShadow: 'none' }}>
                      <div className="form-group">
                        <label>CATEGORIA</label>
                        <select value={newEventCategory} onChange={e => setNewEventCategory(e.target.value)}>
                          <option value="cívico">🏛️ Cívico</option>
                          <option value="cultural">🎭 Cultural</option>
                          <option value="político">⚖️ Político</option>
                          <option value="comunitário">🤝 Comunitário</option>
                          <option value="educacional">📚 Educacional</option>
                          <option value="ambiental">🌿 Ambiental</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>STATUS DO EVENTO</label>
                        <select value={newEventStatus} onChange={e => setNewEventStatus(e.target.value)}>
                          <option value="planejado">Planejado</option>
                          <option value="em andamento">Em Andamento</option>
                          <option value="concluído">Concluído</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>CAPACIDADE MÁXIMA (OPCIONAL)</label>
                        <input type="number" min="1" value={newEventMaxParticipants} onChange={e => setNewEventMaxParticipants(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>DESCRIÇÃO DETALHADA</label>
                        <textarea value={newEventDescription} onChange={e => setNewEventDescription(e.target.value)} rows="3" />
                      </div>
                    </div>
                  </div>
                  <div className="form-buttons" style={{ marginTop: '12px' }}>
                    <button type="button" className="state-btn secondary" onClick={resetEventForm}>CANCELAR</button>
                    <button type="submit" className="state-btn primary gold-glow">
                      {editingEvent ? 'SALVAR ALTERAÇÕES' : 'PUBLICAR EVENTO'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* LISTAGEM DE EVENTOS */}
            {democracyEvents.length === 0 ? (
              <div className="bento-card col-12" style={{ textAlign: 'center', padding: '48px' }}>
                <p style={{ fontSize: '48px', marginBottom: '16px' }}>🗳️</p>
                <h3 className="card-title">NENHUM EVENTO AGENDADO</h3>
                <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Seja o primeiro a agendar um evento da democracia.</p>
              </div>
            ) : (
              <div className="bento-grid">
                {democracyEvents.map(ev => {
                  const eventDate = new Date(ev.event_date);
                  const isPast = eventDate < new Date();
                  const statusColor = getStatusColor(ev.status);
                  const catIcon = getCategoryIcon(ev.category);
                  const canEdit = userRole === 'admin' || ev.created_by === (citizenData && citizenData.profile && citizenData.profile.id);

                  return (
                    <div key={ev.id} className="bento-card col-4" style={{ position: 'relative', opacity: ev.status === 'cancelado' ? 0.65 : 1 }}>
                      {/* Badge de categoria */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{
                          fontSize: '11px', fontWeight: '700', letterSpacing: '1px',
                          background: `${statusColor}22`, color: statusColor,
                          border: `1px solid ${statusColor}`, borderRadius: '4px',
                          padding: '3px 10px'
                        }}>
                          {ev.status.toUpperCase()}
                        </span>
                        <span style={{ fontSize: '22px' }}>{catIcon}</span>
                      </div>

                      <h3 className="card-title" style={{ fontSize: '16px', marginBottom: '8px', lineHeight: '1.3' }}>{ev.title}</h3>

                      {ev.description && (
                        <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '12px', lineHeight: '1.5' }}>
                          {ev.description.length > 100 ? ev.description.substring(0, 100) + '...' : ev.description}
                        </p>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                          <span>📅</span>
                          <span style={{ color: 'var(--gold)' }}>
                            {eventDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                            {' '}às {eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {ev.location && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                            <span>📍</span>
                            <span style={{ color: 'var(--text-muted)' }}>{ev.location}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                          <span>👥</span>
                          <span style={{ color: 'var(--text-muted)' }}>
                            {ev.participant_count} inscrito{ev.participant_count !== 1 ? 's' : ''}
                            {ev.max_participants ? ` / ${ev.max_participants} vagas` : ''}
                          </span>
                        </div>
                        {ev.creator_name && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                            <span>🏛️</span>
                            <span style={{ color: 'var(--text-muted)' }}>Por @{ev.creator_name}</span>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {ev.status !== 'cancelado' && ev.status !== 'concluído' && !isPast && (
                          <button
                            className={`state-btn ${ev.is_registered ? 'warning' : 'success'}`}
                            style={{ flex: 1, fontSize: '12px', padding: '8px 12px' }}
                            onClick={() => handleRegisterEvent(ev.id)}
                          >
                            {ev.is_registered ? 'CANCELAR INSCRIÇÃO' : 'INSCREVER-SE'}
                          </button>
                        )}
                        {ev.registration_url && (
                          <a href={ev.registration_url} target="_blank" rel="noreferrer"
                            className="state-btn outline"
                            style={{ flex: 1, fontSize: '12px', padding: '8px 12px', textDecoration: 'none', textAlign: 'center' }}>
                            🔗 LINK
                          </a>
                        )}
                        <button className="sim-btn operator" style={{ fontSize: '11px' }} onClick={() => openParticipantsModal(ev)}>
                          👥 INSCRITOS ({ev.participant_count})
                        </button>
                        <button className="sim-btn citizen-high" style={{ fontSize: '11px' }} onClick={() => openWahaModal(ev)}>
                          📲 WHATSAPP
                        </button>
                        {canEdit && (
                          <>
                            <button className="sim-btn admin" style={{ fontSize: '11px' }} onClick={() => openEditEventForm(ev)}>EDITAR</button>
                            <button className="sim-btn citizen-low" style={{ fontSize: '11px' }} onClick={() => handleDeleteEvent(ev.id)}>EXCLUIR</button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
                    <textarea required value={quickDescription} onChange={e => setQuickDescription(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>URL DO COMPROVANTE (OPCIONAL)</label>
                    <input type="text" value={quickEvidence} onChange={e => setQuickEvidence(e.target.value)} />
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
                    <input type="text" required value={createUsername} onChange={e => setCreateUsername(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>E-MAIL *</label>
                    <input type="email" required value={createEmail} onChange={e => setCreateEmail(e.target.value)} />
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
                    <input type="text" required value={createHierarchyTitle} onChange={e => setCreateHierarchyTitle(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>URL DA FOTO (OPCIONAL)</label>
                    <input type="text" value={createAvatarUrl} onChange={e => setCreateAvatarUrl(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>SENHA TEMPORÁRIA *</label>
                    <input type="password" required value={createPassword} onChange={e => setCreatePassword(e.target.value)} />
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
                  <ScoreChart history={detailCitizenData.history} currentScore={detailCitizenData.citizen ? detailCitizenData.citizen.current_score : 5000} />
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

        {/* LOGS DE AUDITORIA (ADMIN) */}
        {activeTab === 'adm-audit' && userRole === 'admin' && (
          <section className="tab-pane active">
            <div className="section-heading" style={{ marginBottom: '20px' }}>
              <h2 className="section-title">AUDITORIA DOS REGISTROS ESTATAIS</h2>
              <p className="section-subtitle">Logs imutáveis e legíveis de todas as ações administrativas e alterações de usuários.</p>
            </div>
            <div className="table-container">
              <table className="state-table">
                <thead>
                  <tr>
                    <th>DATA E HORA</th>
                    <th>AUTOR / OPERADOR</th>
                    <th>ENTIDADE AFETADA</th>
                    <th>AÇÃO EXECUTADA</th>
                    <th>DETALHES DA ALTERAÇÃO</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                        Nenhum registro de auditoria encontrado no sistema.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map(log => {
                      const actObj = formatAuditAction(log.action);
                      return (
                        <tr key={log.id}>
                          <td className="audit-date">📅 {formatAuditDate(log.created_at)}</td>
                          <td>
                            <span className="audit-author">
                              👤 {log.actor_name ? `@${log.actor_name}` : 'Sistema Automático'}
                            </span>
                          </td>
                          <td><span className="audit-entity-badge">{formatAuditEntity(log.entity_name)}</span></td>
                          <td>
                            <span className="audit-action-badge" style={{ background: actObj.color, border: `1px solid ${actObj.border}`, color: actObj.text }}>
                              {actObj.label}
                            </span>
                          </td>
                          <td>{renderAuditData(log.new_data)}</td>
                        </tr>
                      );
                    })
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
              <input type="text" value={customTitleInput} onChange={e => setCustomTitleInput(e.target.value)} />
            </div>

            <div className="form-group">
              <label>URL DA FOTO DE PERFIL</label>
              <input type="text" value={inputAvatarUrl} onChange={e => setInputAvatarUrl(e.target.value)} />
            </div>

            <div className="form-group">
              <label>📸 TIRAR FOTO COM A CÂMERA (CELULAR / WEBCAM)</label>
              <input
                type="file"
                accept="image/*"
                capture="user"
                id="camera-input-file"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="state-btn outline gold-glow"
                onClick={() => document.getElementById('camera-input-file').click()}
                style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
              >
                📷 ABRIR CÂMERA E TIRAR FOTO
              </button>
            </div>

            <div className="form-group">
              <label>📁 OU ENVIAR DA GALERIA / COMPUTADOR</label>
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
          <p className="modal-desc">Configure o Nível de Acesso Base (Admin / Usuário) e defina o Título Personalizado da Hierarquia.</p>
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
              <input type="text" required value={editFormTitle} onChange={e => setEditFormTitle(e.target.value)} />
              <span className="field-desc">Título exibido na carteira e nos distintivos do usuário.</span>
            </div>

            <div className="form-group">
              <label>🎖️ PATENTE CÍVICA</label>
              <select value={editFormRank} onChange={e => setEditFormRank(e.target.value)}>
                <optgroup label="— PRAÇAS —">
                  <option value="Recruta">Recruta</option>
                  <option value="Soldado">Soldado</option>
                  <option value="Cabo">Cabo</option>
                  <option value="3º Sargento">3º Sargento</option>
                  <option value="2º Sargento">2º Sargento</option>
                  <option value="1º Sargento">1º Sargento</option>
                  <option value="Subtenente">Subtenente</option>
                </optgroup>
                <optgroup label="— OFICIAIS —">
                  <option value="2º Tenente">2º Tenente</option>
                  <option value="1º Tenente">1º Tenente</option>
                  <option value="Capitão">Capitão</option>
                  <option value="Major">Major</option>
                  <option value="Tenente-Coronel">Tenente-Coronel</option>
                  <option value="Coronel">Coronel</option>
                </optgroup>
                <optgroup label="— ALTO COMANDO —">
                  <option value="General de Brigada">General de Brigada</option>
                  <option value="General de Divisão">General de Divisão</option>
                  <option value="Marechal da Democracia">Marechal da Democracia</option>
                </optgroup>
              </select>
              <span className="field-desc">Patente militar/cívica exibida na Carteira de Identidade.</span>
            </div>

            <div className="form-group">
              <label>URL DO EMBLEMA DA PATENTE (OPCIONAL)</label>
              <input type="text" placeholder="Ex: https://meusite.com/emblemas/coronel.png" value={editFormRankEmblem} onChange={e => setEditFormRankEmblem(e.target.value)} />
              <span className="field-desc">Imagem PNG/SVG do emblema. Deixe vazio para usar o ícone padrão 🎖️. Veja o guia abaixo para adicionar suas imagens.</span>
            </div>

            <div className="form-group">
              <label>URL DA FOTO DE PERFIL</label>
              <input type="text" value={editFormAvatar} onChange={e => setEditFormAvatar(e.target.value)} />
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

      {/* MODAL VER INSCRITOS NO EVENTO DA DEMOCRACIA */}
      <div className={`modal-overlay ${participantsModalOpen ? 'active' : ''}`}>
        <div className="modal-card">
          <h2 className="modal-title">👥 INSCRITOS NO EVENTO</h2>
          <p className="modal-desc">Cidadãos com inscrição confirmada em <strong>{selectedEventTitle}</strong>.</p>

          <div style={{ maxHeight: '350px', overflowY: 'auto', marginBottom: '20px' }}>
            {selectedEventParticipants.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>Nenhum cidadão inscrito até o momento.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedEventParticipants.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-2)', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="Avatar" style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--gold)' }} />
                    ) : (
                      <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--gold-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                        {p.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', color: 'var(--text)', fontSize: '14px' }}>@{p.username}</div>
                      <div style={{ fontSize: '11px', color: 'var(--gold-light)' }}>{p.hierarchy_title || 'Usuário Cívico'}</div>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(p.registered_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-buttons">
            <button type="button" className="state-btn secondary" onClick={() => setParticipantsModalOpen(false)}>FECHAR</button>
          </div>
        </div>
      </div>

      {/* MODAL NOTIFICAR WHATSAPP */}
      <div className={`modal-overlay ${wahaModalOpen ? 'active' : ''}`}>
        <div className="modal-card">
          <h2 className="modal-title">📲 ENVIAR PARA WHATSAPP</h2>
          <p className="modal-desc">
            Envie uma mensagem sobre o evento diretamente para o grupo oficial da Democracia Gerenciada no WhatsApp.
          </p>

          <form onSubmit={handleSendWahaWebhook}>
            <div className="form-group">
              <label>MENSAGEM DE NOTIFICAÇÃO</label>
              <textarea
                rows="7"
                value={wahaCustomMessage}
                onChange={e => setWahaCustomMessage(e.target.value)}
                style={{ fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.6' }}
              />
              <span className="field-desc">Texto pré-formatado do evento. Edite antes de enviar se preferir.</span>
            </div>

            <div className="form-buttons">
              <button type="button" className="state-btn secondary" onClick={() => setWahaModalOpen(false)}>CANCELAR</button>
              <button type="submit" className="state-btn primary gold-glow" disabled={wahaSending}>
                {wahaSending ? 'ENVIANDO...' : '📲 ENVIAR WHATSAPP'}
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  );
}

export default App;
