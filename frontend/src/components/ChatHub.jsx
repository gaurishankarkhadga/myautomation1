import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Zap, Send, Menu, X, Settings, LogOut, BarChart2,
    Package, User, MessageSquare, Mail, Handshake,
    Instagram, Youtube, CheckCircle, Circle, Loader,
    Bot, Activity, ChevronRight, RotateCcw, Link2, Trash2,
    Sunrise, Sparkles, DollarSign, AlertTriangle, Scale,
    TrendingUp, Eye, BarChart, Plus
} from 'lucide-react';
import ToastNotification, { useToasts } from './ToastNotification';
import BioLinkChatPreview from './chat/BioLinkChatPreview';
import AutomationChatPreview from './chat/AutomationChatPreview';
import DealNegotiatorSettings from './DealNegotiatorSettings';
import '../styles/ChatHub.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const SUGGESTED_PROMPTS = [
    { icon: Sunrise, text: 'Good morning! Catch me up', label: 'Morning Briefing' },
    { icon: MessageSquare, text: 'Turn on auto-reply for comments', label: 'Enable Replies' },
    { icon: Mail, text: 'Enable smart DM auto-reply', label: 'Smart DMs' },
    { icon: Sparkles, text: 'Never mention prices in DMs', label: 'Custom Rule' },
    { icon: Handshake, text: 'Find brand deals for me', label: 'Brand Deals' },
    { icon: Link2, text: 'Create a biolink with modern look with my social media and courses', label: 'Create BioLink' },
];

function ChatHub() {
    const navigate = useNavigate();

    const [token, setToken] = useState('');
    const [userId, setUserId] = useState('');
    const [profile, setProfile] = useState(null);

    const [messages, setMessages] = useState([]);
    const [historyMessages, setHistoryMessages] = useState([]);
    const [activeTab, setActiveTab] = useState('current');
    const [crmData, setCrmData] = useState(null);
    const [loadingCrm, setLoadingCrm] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [showNegotiatorRules, setShowNegotiatorRules] = useState(false);

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [connections, setConnections] = useState({ instagram: false, youtube: false });
    const [connectingPlatform, setConnectingPlatform] = useState(null);
    const [activeAutomations, setActiveAutomations] = useState({ count: 0, list: [] });
    const [quota, setQuota] = useState(null);
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const { toasts, addToasts, removeToast } = useToasts();

    // ── Auth & connection check ──────────────────────────────────────
    useEffect(() => {
        const storedToken = localStorage.getItem('insta_token');
        const storedUserId = localStorage.getItem('insta_user_id');
        const ytChannelId = localStorage.getItem('yt_channel_id');

        setConnections({
            instagram: !!(storedToken && storedUserId),
            youtube: !!ytChannelId
        });

        if (storedToken && storedUserId) {
            setToken(storedToken);
            setUserId(storedUserId);
        } else if (ytChannelId) {
            setUserId(ytChannelId);
        } else {
            navigate('/');
        }
    }, [navigate]);

    useEffect(() => {
        if (token && userId) { fetchProfile(); loadChatHistory(); }
        if (userId) { fetchActiveCount(); fetchQuota(); triggerMorningBriefing(); }
    }, [token, userId]);

    useEffect(() => {
        if (!userId) return;
        const id = setInterval(() => { fetchActiveCount(); fetchQuota(); }, 30000);
        return () => clearInterval(id);
    }, [userId]);

    useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

    // ── Live Socket Connection (Real-Time Brain Monitoring) ─────────
    const socketRef = useRef(null);
    useEffect(() => {
        if (!userId) return;
        import('socket.io-client').then(({ io }) => {
            if (!socketRef.current) {
                socketRef.current = io(API_BASE_URL);
                socketRef.current.on('connect', () => socketRef.current.emit('register', userId));
                
                // Live listener for autonomous AI updates
                socketRef.current.on('deal_updated', (payload) => {
                    addToasts([{
                        type: payload.status === 'rejected' ? 'warning' : 'success', 
                        title: 'Live Deal Update', 
                        message: `The AI backend just updated a deal state to ${payload.status.toUpperCase()}.`
                    }]);
                    // Hot reload the CRM board silently
                    loadDealsData();
                });
            }
        });
        
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [userId]);

    // ── Morning Briefing (auto-trigger on first load of the day) ────
    const triggerMorningBriefing = async () => {
        try {
            const lastBriefing = localStorage.getItem('last_briefing_date');
            const today = new Date().toDateString();
            if (lastBriefing === today) return; // Already shown today

            // Auto-send a morning briefing request
            localStorage.setItem('last_briefing_date', today);
            const res = await fetch(`${API_BASE_URL}/api/chat/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, message: 'morning briefing', token })
            });
            const data = await res.json();
            if (data.success) {
                setMessages(prev => [{
                    role: 'assistant',
                    content: data.response || 'Good morning! Ready to work 🚀',
                    actions: data.actions || [],
                    toasts: [],
                    timestamp: new Date().toISOString()
                }, ...prev]);
            }
        } catch { }
    };

    // ── API helpers ──────────────────────────────────────────────────
    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    const fetchProfile = async () => {
        try {
            if (token) {
                const res = await fetch(`${API_BASE_URL}/api/instagram/profile?token=${token}`);
                const data = await res.json();
                if (data.success) setProfile(data.data);
            } else if (userId) { // fallback to YouTube
                const res = await fetch(`${API_BASE_URL}/api/youtube/profile?channelId=${userId}`);
                const data = await res.json();
                if (data.success && data.data) {
                    setProfile({
                        username: data.data.title || 'YouTube Creator',
                        profile_picture_url: data.data.thumbnailUrl || '',
                        followers_count: data.data.subscriberCount || 0
                    });
                }
            }
        } catch { }
    };

    const fetchActiveCount = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/chat/active-count/${userId}`);
            const data = await res.json();
            if (data.success) setActiveAutomations({ count: data.activeCount, list: data.activeList });
        } catch { }
    };

    const fetchQuota = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/chat/quota`);
            const data = await res.json();
            if (data.success) setQuota(data);
        } catch { }
    };

    const loadChatHistory = async () => {
        try {
            setLoadingHistory(true);
            const res = await fetch(`${API_BASE_URL}/api/chat/history/${userId}`);
            const data = await res.json();
            if (data.success && data.messages.length > 0) setHistoryMessages(data.messages);
        } catch { }
        finally { setLoadingHistory(false); }
    };

    const loadDealsData = async () => {
        if (!userId) return;
        try {
            setLoadingCrm(true);
            const res = await fetch(`${API_BASE_URL}/api/chat/deals/${userId}`);
            const data = await res.json();
            if (data.success) {
                setCrmData(data.groupedDeals);
            }
        } catch { }
        finally { setLoadingCrm(false); }
    };

    const handleDeleteMessage = async (msgId) => {
        if (!window.confirm("Delete this message?")) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/chat/message/${msgId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            const data = await res.json();
            if (data.success) {
                setHistoryMessages(prev => prev.filter(m => m._id !== msgId));
                setMessages(prev => prev.filter(m => m._id !== msgId));
                addToasts([{ type: 'success', title: 'Deleted', message: 'Message deleted successfully.' }]);
            } else {
                addToasts([{ type: 'error', title: 'Error', message: data.error || 'Failed to delete message.' }]);
            }
        } catch {
            addToasts([{ type: 'error', title: 'Error', message: 'Network error deleting message.' }]);
        }
    };

    const handleDeleteDeal = async (dealId) => {
        if (!window.confirm("Are you sure you want to delete this deal? This action cannot be undone.")) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/chat/deals/${dealId}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                addToasts([{ type: 'success', title: 'Deleted', message: 'Deal deleted successfully.' }]);
                loadDealsData();
            } else {
                addToasts([{ type: 'error', title: 'Error', message: data.error || 'Failed to delete deal.' }]);
            }
        } catch {
            addToasts([{ type: 'error', title: 'Error', message: 'Network error deleting deal.' }]);
        }
    };

    const handleClearHistory = async () => {
        if (!window.confirm("Are you sure you want to delete your entire chat history?")) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/chat/history/${userId}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                setHistoryMessages([]);
                setMessages([]);
                setActiveTab('current');
                addToasts([{ type: 'success', title: 'Cleared', message: 'Chat history cleared successfully.' }]);
            } else {
                addToasts([{ type: 'error', title: 'Error', message: data.error || 'Failed to clear history.' }]);
            }
        } catch {
            addToasts([{ type: 'error', title: 'Error', message: 'Network error clearing history.' }]);
        }
    };

    const sendMessage = async (messageText) => {
        const text = (messageText || inputValue).trim();
        if (!text || isTyping) return;

        setActiveTab('current');
        setMessages(prev => [...prev, { role: 'user', content: text, timestamp: new Date().toISOString() }]);
        setInputValue('');
        setIsTyping(true);

        try {
            const res = await fetch(`${API_BASE_URL}/api/chat/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, message: text, token })
            });
            const data = await res.json();

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.response || 'Something went wrong.',
                actions: data.actions || [],
                toasts: data.toasts || [],
                timestamp: new Date().toISOString()
            }]);

            if (data.toasts?.length) addToasts(data.toasts);
            // Refresh active count after any action
            fetchActiveCount();
        } catch {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Connection error. Is the server running? 🔌',
                timestamp: new Date().toISOString()
            }]);
        } finally {
            setIsTyping(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };
    
    const handleNewChat = () => {
        setMessages([]);
        setActiveTab('current');
        setInputValue('');
        inputRef.current?.focus();
        setSidebarOpen(false);
    };

    const handleDisconnect = async () => {
        // FIRST: Tell the backend to stop ALL automation before clearing local state
        // Without this, webhooks continue to fire indefinitely after disconnect
        try {
            if (userId) {
                await fetch(`${API_BASE_URL}/api/chat/message`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, message: 'stop all automation', token })
                });
            }
        } catch (e) {
            console.error('[Disconnect] Failed to stop automation on backend:', e.message);
        }
        ['insta_token', 'insta_user_id', 'yt_channel_id', 'yt_channel_title'].forEach(k => localStorage.removeItem(k));
        navigate('/');
    };

    const handleConnectPlatform = async (platform) => {
        setConnectingPlatform(platform);
        try {
            const endpoint = platform === 'instagram' ? '/api/instagram/auth' : '/api/youtube/auth';
            const res = await fetch(`${API_BASE_URL}${endpoint}`);
            const data = await res.json();
            if (data.url || data.authUrl) window.location.href = data.url || data.authUrl;
        } catch { }
        finally { setConnectingPlatform(null); }
    };

    const formatContent = (content) => {
        if (!content) return '';
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: #60a5fa; text-decoration: underline;">$1</a>')
            .replace(/\n/g, '<br/>');
    };

    // ── Render ───────────────────────────────────────────────────────
    return (
        <div className="chathub" id="chathub">
            <ToastNotification toasts={toasts} onRemove={removeToast} />

            {/* Mobile header bar */}
            <header className="mobile-header">
                <div className="mob-header-slot left">
                    <button className="mob-icon-btn" onClick={() => setSidebarOpen(true)} id="mob-menu-open" aria-label="Open menu">
                        <Menu size={20} />
                    </button>
                </div>
                
                <div className="mob-header-slot center">
                    <span className="mob-brand">Sotix AI</span>
                </div>
                
                <div className="mob-header-slot right">
                    {profile && (
                        <button 
                            className="nav-profile-btn" 
                            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                            id="mob-profile-trigger"
                        >
                            <div className="nav-avatar-wrapper">
                                {profile.profile_picture_url 
                                    ? <img src={profile.profile_picture_url} alt={profile.username} className="nav-avatar" />
                                    : <div className="nav-avatar-placeholder"><User size={16} /></div>
                                }
                                {activeAutomations.count > 0 && <span className="nav-status-dot-glow" />}
                            </div>
                        </button>
                    )}
                </div>
            </header>

            {/* Sidebar overlay (mobile) */}
            {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

            {/* ─── Sidebar ─── */}
            <aside className={`chathub-sidebar ${sidebarOpen ? 'open' : ''}`} id="chathub-sidebar">
                {/* Sidebar top */}
                <div className="sidebar-top">
                    <div className="sidebar-brand">
                        <Zap size={18} strokeWidth={2.5} />
                        <span>Sotix AI</span>
                    </div>
                    <button className="mob-icon-btn close-btn" onClick={() => setSidebarOpen(false)} id="mob-sidebar-close" aria-label="Close sidebar">
                        <X size={18} />
                    </button>
                </div>

                {/* New Chat Primary Action */}
                <div className="sidebar-new-chat-section">
                    <button className="sidebar-new-chat-btn" onClick={handleNewChat} id="sidebar-new-chat">
                        <Plus size={16} strokeWidth={2.5} />
                        <span>New Chat</span>
                    </button>
                </div>

                {/* Chat Modes */}
                <div className="sidebar-section">
                    <p className="sidebar-section-label">Chat Modes</p>
                    <button className={`sidebar-action-btn ${activeTab === 'current' ? 'active-tab' : ''}`}
                        onClick={() => { setActiveTab('current'); setSidebarOpen(false); }}>
                        <MessageSquare size={14} />
                        <span style={activeTab === 'current' ? { color: 'var(--text-primary)', fontWeight: 600 } : {}}>Current Chat</span>
                    </button>
                    <button className={`sidebar-action-btn ${activeTab === 'deals' ? 'active-tab' : ''}`}
                        onClick={() => { loadDealsData(); setActiveTab('deals'); setSidebarOpen(false); }}>
                        <Handshake size={14} />
                        <span style={activeTab === 'deals' ? { color: 'var(--text-primary)', fontWeight: 600 } : {}}>Deals CRM</span>
                    </button>
                    <button className={`sidebar-action-btn ${activeTab === 'history' ? 'active-tab' : ''}`}
                        onClick={() => { setActiveTab('history'); setSidebarOpen(false); }}>
                        <RotateCcw size={14} />
                        <span style={activeTab === 'history' ? { color: 'var(--text-primary)', fontWeight: 600 } : {}}>Chat History</span>
                    </button>
                    {activeTab === 'history' && historyMessages.length > 0 && (
                        <button className="sidebar-action-btn" onClick={handleClearHistory} style={{ color: 'var(--red)', marginTop: '4px' }}>
                            <Trash2 size={14} />
                            <span>Clear All History</span>
                        </button>
                    )}
                </div>

                {/* Quick actions */}
                <div className="sidebar-section">
                    <p className="sidebar-section-label">Quick Actions</p>
                    {[
                        { icon: Link2, label: 'BioLinks', action: 'navigate', path: '/profile' },
                        { icon: BarChart2, label: 'View Status', msg: "What's my current setup?" },
                        { icon: Package, label: 'My Assets', action: 'assets' },
                        { icon: User, label: 'Profile', action: 'navigate', path: '/profile' },
                        { icon: RotateCcw, label: 'Preferences', msg: 'Show my preferences' },
                    ].map(({ icon: Icon, label, msg, action, path }) => (
                        <button key={label} className="sidebar-action-btn"
                            onClick={() => {
                                if (action === 'navigate') { navigate(path); }
                                else if (action === 'assets') { navigate('/assets'); }
                                else { sendMessage(msg); }
                                setSidebarOpen(false);
                            }}
                            id={`qa-${label.replace(/\s/g, '-').toLowerCase()}`}
                        >
                            <Icon size={14} />
                            <span>{label}</span>
                        </button>
                    ))}
                </div>

                {/* Connections */}
                <div className="sidebar-section">
                    <p className="sidebar-section-label">Connections</p>

                    {connections.instagram ? (
                        <div className="conn-row connected" id="conn-instagram">
                            <Instagram size={15} />
                            <span>Instagram</span>
                            <CheckCircle size={13} className="conn-check" />
                        </div>
                    ) : (
                        <button className="conn-btn" onClick={() => handleConnectPlatform('instagram')}
                            disabled={connectingPlatform === 'instagram'} id="connect-instagram">
                            <Instagram size={15} />
                            <span>{connectingPlatform === 'instagram' ? 'Connecting…' : 'Connect Instagram'}</span>
                        </button>
                    )}

                    {connections.youtube ? (
                        <div className="conn-row connected" id="conn-youtube">
                            <Youtube size={15} />
                            <span>YouTube</span>
                            <CheckCircle size={13} className="conn-check" />
                        </div>
                    ) : (
                        <button className="conn-btn" onClick={() => handleConnectPlatform('youtube')}
                            disabled={connectingPlatform === 'youtube'} id="connect-youtube">
                            <Youtube size={15} />
                            <span>{connectingPlatform === 'youtube' ? 'Connecting…' : 'Connect YouTube'}</span>
                        </button>
                    )}
                </div>

                {/* AI Quota */}
                {quota && (
                    <div className="sidebar-section">
                        <p className="sidebar-section-label">AI Quota</p>
                        <div className="quota-display" id="quota-display">
                            <div className="quota-text">
                                <span>Gemini API ✨</span>
                                <span className={quota.remaining < 20 ? 'text-danger' : 'text-ok'}>
                                    {quota.remaining} / {quota.limit}
                                </span>
                            </div>
                            <div className="quota-bar-bg">
                                <div
                                    className={`quota-bar-fill ${quota.remaining < 20 ? 'danger' : ''}`}
                                    style={{ width: `${Math.min(100, Math.max(0, (quota.used / quota.limit) * 100))}%` }}
                                ></div>
                            </div>
                            {quota.remaining < 20 && <p className="quota-warning">Free tier daily limit low!</p>}
                        </div>
                    </div>
                )}

                {/* Bottom */}
                <div className="sidebar-footer">
                    <button className="footer-btn" onClick={() => navigate('/settings')} id="btn-advanced-settings">
                        <Settings size={14} />
                        <span>Advanced Settings</span>
                    </button>
                    <button className="footer-btn danger" onClick={handleDisconnect} id="btn-disconnect">
                        <LogOut size={14} />
                        <span>Disconnect</span>
                    </button>
                </div>
            </aside>

            {/* ─── Main chat ─── */}
            <main className="chathub-main" id="chathub-main">
                {/* Desktop header */}
                <header className="chat-header" id="chat-header">
                    <div className="chat-header-left">
                        <button className="desk-menu-btn" onClick={() => setSidebarOpen(v => !v)} aria-label="Toggle sidebar">
                            <Menu size={18} />
                        </button>
                        <Bot size={20} strokeWidth={1.8} className="bot-icon" />
                        <div>
                            <h1 className="chat-title">Sotix AI</h1>
                            <p className="chat-subtitle">Your social media command center</p>
                        </div>
                    </div>
                    <div className="chat-header-right">
                        {profile && (
                            <div className="nav-profile-wrapper">
                                <button 
                                    className="nav-profile-btn" 
                                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                                    id="desk-profile-trigger"
                                >
                                    <div className="nav-profile-status">
                                        <span className="nav-username">@{profile.username}</span>
                                        {activeAutomations.count > 0 && <span className="nav-live-indicator">Live</span>}
                                    </div>
                                    <div className="nav-avatar-wrapper">
                                        {profile.profile_picture_url 
                                            ? <img src={profile.profile_picture_url} alt={profile.username} className="nav-avatar" />
                                            : <div className="nav-avatar-placeholder"><User size={18} /></div>
                                        }
                                        {activeAutomations.count > 0 && <span className="nav-status-dot-glow" />}
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                {/* Profile Dropdown Overlay */}
                {showProfileDropdown && profile && (
                    <>
                        <div className="dropdown-overlay" onClick={() => setShowProfileDropdown(false)} />
                        <div className="profile-dropdown-popover anim-scale-in">
                            <div className="pd-header">
                                <div className="pd-user-info">
                                    <span className="pd-username">@{profile.username}</span>
                                    <span className="pd-account-type">Professional Account</span>
                                </div>
                                <CheckCircle size={16} className="pd-verified" />
                            </div>

                            <div className="pd-stats-grid">
                                <div className="pd-stat-item">
                                    <div className="pd-stat-label"><User size={12} /> Followers</div>
                                    <div className="pd-stat-value">{profile.followers_count?.toLocaleString() || '0'}</div>
                                </div>
                                <div className="pd-stat-item">
                                    <div className="pd-stat-label"><Eye size={12} /> Est. Reach</div>
                                    <div className="pd-stat-value">{Math.round((profile.followers_count || 0) * 0.15).toLocaleString()}</div>
                                </div>
                                <div className="pd-stat-item">
                                    <div className="pd-stat-label"><TrendingUp size={12} /> Engagement</div>
                                    <div className="pd-stat-value">3.2%</div>
                                </div>
                            </div>

                            <div className="pd-divider" />

                            <div className="pd-section">
                                <p className="pd-section-label">Automation Status</p>
                                <div className={`pd-status-card ${activeAutomations.count > 0 ? 'active' : ''}`}>
                                    <Activity size={16} />
                                    <div className="pd-status-info">
                                        <span className="pd-status-title">
                                            {activeAutomations.count > 0 ? 'System Active' : 'System Standby'}
                                        </span>
                                        <span className="pd-status-desc">
                                            {activeAutomations.count > 0 
                                                ? `${activeAutomations.list.join(' · ')}` 
                                                : 'No active automation tasks'}
                                        </span>
                                    </div>
                                    {activeAutomations.count > 0 && <div className="pd-pulse" />}
                                </div>
                            </div>

                            <div className="pd-footer">
                                <button className="pd-footer-btn" onClick={() => { navigate('/settings'); setShowProfileDropdown(false); }}>
                                    <Settings size={14} /> Settings
                                </button>
                                <button className="pd-footer-btn danger" onClick={() => { handleDisconnect(); setShowProfileDropdown(false); }}>
                                    <LogOut size={14} /> Disconnect
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* ═══════════════ DEALS CRM BOARD ═══════════════ */}
                {activeTab === 'deals' && (
                    <div className="chat-messages" id="deals-crm-board" style={{ padding: '24px', overflowY: 'auto' }}>
                        {/* CRM Header */}
                        <div className="crm-header-row" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '16px' }}>
                            <div style={{ minWidth: '200px' }}>
                                <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                                    <Handshake size={22} style={{ verticalAlign: 'middle', marginRight: '8px', color: 'var(--primary-color)' }} />
                                    Brand Deals CRM
                                </h2>
                                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                                    All collaboration conversations · AI-powered negotiation
                                </p>
                            </div>
                             <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={() => setShowNegotiatorRules(true)}
                                    style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.3)', background: 'rgba(139, 92, 246, 0.1)', color: '#a78bfa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}
                                >
                                    <Scale size={14} /> Negotiation Laws
                                </button>
                                <button
                                    onClick={() => loadDealsData()}
                                    style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}
                                >
                                    <RotateCcw size={14} /> Refresh
                                </button>
                            </div>
                        </div>

                        {loadingCrm && (
                            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)' }}>
                                <Loader size={24} className="spin" />
                                <p style={{ marginTop: '12px' }}>Loading your deals pipeline...</p>
                            </div>
                        )}

                        {!loadingCrm && !crmData && !showNegotiatorRules && (
                            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-tertiary)' }}>
                                <Handshake size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                                <h3 style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>No deals yet</h3>
                                <p style={{ fontSize: '0.9rem' }}>When brands DM your Instagram, their collaboration offers will appear here automatically.</p>
                            </div>
                        )}

                        {showNegotiatorRules && (
                            <div style={{ animation: 'fadeIn 0.3s ease' }}>
                                <DealNegotiatorSettings userId={userId} onBack={() => setShowNegotiatorRules(false)} />
                            </div>
                        )}

                        {!loadingCrm && crmData && !showNegotiatorRules && (
                            <div>
                                {/* ── PIPELINE SECTIONS ── */}
                                {[
                                    { key: 'drafted', label: '📋 Pending Approval', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.25)' },
                                    { key: 'negotiating', label: '💬 Negotiating', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.25)' },
                                    { key: 'contract_prep', label: '📝 Contract Prep', color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', borderColor: 'rgba(139,92,246,0.25)' },
                                    { key: 'won', label: '🏆 Won', color: '#10b981', bg: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.25)' },
                                    { key: 'rejected', label: '⛔ Rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.25)' },
                                    { key: 'lost', label: '💀 Lost / Ghosted', color: '#6b7280', bg: 'rgba(107,114,128,0.08)', borderColor: 'rgba(107,114,128,0.25)' },
                                ].map(section => {
                                    const deals = crmData[section.key] || [];
                                    if (deals.length === 0) return null;
                                    return (
                                        <div key={section.key} style={{ marginBottom: '28px' }}>
                                            {/* Section Header */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', padding: '8px 14px', background: section.bg, border: `1px solid ${section.borderColor}`, borderRadius: '10px' }}>
                                                <span style={{ fontSize: '1.05rem', fontWeight: 700, color: section.color }}>{section.label}</span>
                                                <span style={{ marginLeft: 'auto', background: section.color, color: '#fff', padding: '2px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>{deals.length}</span>
                                            </div>

                                            {/* Deal Cards */}
                                            {deals.map((deal, di) => {
                                                const brand = deal.negotiationData?.brandName || 'Unknown Brand';
                                                const rate = deal.negotiationData?.suggestedRate || 'N/A';
                                                const draft = deal.negotiationData?.draftReply || '';
                                                const history = deal.negotiationData?.history || [];
                                                const taId = `crm-ta-${section.key}-${di}`;
                                                const isPending = section.key === 'drafted';
                                                const isNegotiating = section.key === 'negotiating';

                                                return (
                                                    <div key={di} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '18px', marginBottom: '14px', transition: 'box-shadow 0.2s' }}>
                                                        {/* Brand Header Row */}
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `linear-gradient(135deg, ${section.color}22, ${section.color}44)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <Handshake size={18} style={{ color: section.color }} />
                                                                </div>
                                                                <div>
                                                                    <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>{brand}</strong>
                                                                    <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', margin: '2px 0 0 0' }}>
                                                                        {deal.lastMessage?.text?.substring(0, 80) || 'Collaboration inquiry'}...
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <span style={{ background: `${section.color}18`, color: section.color, padding: '5px 14px', borderRadius: '20px', fontWeight: 700, fontSize: '0.9rem' }}>
                                                                    {rate}
                                                                </span>
                                                                <button
                                                                    onClick={() => handleDeleteDeal(deal._id)}
                                                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                    title="Delete Deal"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Conversation History (AI thread) */}
                                                        {history.length > 0 && (
                                                            <div style={{ marginBottom: '12px', padding: '10px 12px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)', maxHeight: '120px', overflowY: 'auto' }}>
                                                                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Negotiation Thread</p>
                                                                {history.slice(-3).map((h, hi) => (
                                                                    <div key={hi} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px', paddingLeft: '8px', borderLeft: `2px solid ${section.color}40` }}>
                                                                        <span style={{ fontWeight: 600, color: section.color, marginRight: '6px' }}>{h.action}:</span>
                                                                        {h.text?.substring(0, 100)}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Editable Draft (only for pending/negotiating) */}
                                                        {(isPending || isNegotiating) && (
                                                            <div style={{ marginBottom: '14px' }}>
                                                                <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '6px', display: 'block', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                                    {isPending ? 'AI Draft — Edit Before Sending' : 'Follow-up Message'}
                                                                </label>
                                                                <textarea
                                                                    id={taId}
                                                                    defaultValue={draft}
                                                                    style={{ width: '100%', minHeight: '70px', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.88rem', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
                                                                />
                                                            </div>
                                                        )}

                                                        {/* Action Buttons (only for pending/negotiating) */}
                                                        {(isPending || isNegotiating) && (
                                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                                <button
                                                                    onClick={() => {
                                                                        const txt = document.getElementById(taId)?.value || draft;
                                                                        sendMessage(`[SYSTEM: deal_action] Action: approve | DealId: ${deal._id} | Brand: ${brand} | Override: "${txt}"`);
                                                                        addToasts([{ type: 'info', title: 'Dispatching...', message: `Sending deal to ${brand} via Instagram DM` }]);
                                                                        setTimeout(() => loadDealsData(), 3000);
                                                                    }}
                                                                    style={{ flex: 1, padding: '10px', background: 'var(--primary-color)', color: 'white', borderRadius: '8px', fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', border: 'none', cursor: 'pointer', fontSize: '0.88rem' }}
                                                                >
                                                                    <Send size={15} /> Approve & Send
                                                                </button>

                                                                <button
                                                                    onClick={() => {
                                                                        const instr = prompt(`How should the AI rewrite this draft for ${brand}?\n\nExamples:\n• "Ask for $2000"\n• "Offer a Reel instead of Story"\n• "Add a media kit link"`);
                                                                        if (instr) {
                                                                            sendMessage(`[SYSTEM: deal_rewrite] DealId: ${deal._id} | Brand: ${brand} | Instructions: "${instr}"`);
                                                                            addToasts([{ type: 'info', title: 'Regenerating...', message: `AI is rewriting the draft for ${brand}` }]);
                                                                            setTimeout(() => loadDealsData(), 4000);
                                                                        }
                                                                    }}
                                                                    style={{ flex: 1, padding: '10px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', borderRadius: '8px', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', border: '1px solid var(--border-color)', cursor: 'pointer', fontSize: '0.88rem' }}
                                                                >
                                                                    <RotateCcw size={15} /> AI Rewrite
                                                                </button>

                                                                <button
                                                                    onClick={() => {
                                                                        if (window.confirm(`Reject the deal from ${brand}? This will remove it from your pipeline.`)) {
                                                                            sendMessage(`[SYSTEM: deal_action] Action: reject | DealId: ${deal._id} | Brand: ${brand}`);
                                                                            addToasts([{ type: 'warning', title: 'Rejected', message: `${brand} removed from pipeline` }]);
                                                                            setTimeout(() => loadDealsData(), 2000);
                                                                        }
                                                                    }}
                                                                    style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', color: '#ef4444', borderRadius: '8px', fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.88rem' }}
                                                                >
                                                                    <X size={15} /> Reject
                                                                </button>
                                                            </div>
                                                        )}

                                                        {/* Contract Button (for contract_prep) */}
                                                        {section.key === 'contract_prep' && (
                                                            <button
                                                                onClick={() => {
                                                                    sendMessage(`Generate a contract summary for ${brand}`);
                                                                    addToasts([{ type: 'info', title: 'Generating...', message: `Building contract summary for ${brand}` }]);
                                                                }}
                                                                style={{ width: '100%', padding: '10px', background: 'rgba(139,92,246,0.12)', color: '#8b5cf6', borderRadius: '8px', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.88rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                                                            >
                                                                <DollarSign size={15} /> Generate Contract
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ═══════════════ CHAT MESSAGES (normal chat view) ═══════════════ */}
                {activeTab !== 'deals' && (
                <div className="chat-messages" id="chat-messages">
                    {/* Welcome screen */}
                    {!loadingHistory && messages.length === 0 && activeTab === 'current' && (
                        <div className="chat-welcome" id="chat-welcome">
                            <div className="welcome-icon-wrap"><Zap size={28} strokeWidth={2} /></div>
                            <h2 className="welcome-title">Welcome to Sotix AI</h2>
                            <p className="welcome-sub">Tell me what you need — I'll handle everything behind the scenes.</p>
                            <div className="suggested-grid" id="suggested-prompts">
                                {SUGGESTED_PROMPTS.map(({ icon: Icon, text, label }, i) => (
                                    <button key={i} className="suggest-btn" onClick={() => sendMessage(text)}
                                        id={`sp-${i}`}>
                                        <Icon size={16} strokeWidth={1.8} />
                                        <span>{label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Loading history */}
                    {loadingHistory && activeTab === 'history' && (
                        <div className="chat-loading">
                            <Loader size={20} className="spin" />
                            <p>Loading history…</p>
                        </div>
                    )}

                    {!loadingHistory && activeTab === 'history' && historyMessages.length === 0 && (
                        <div className="chat-loading" style={{ opacity: 0.6 }}>
                            <p>No chat history available.</p>
                        </div>
                    )}

                    {/* Message bubbles */}
                    {(activeTab === 'current' ? messages : historyMessages).map((msg, i) => (
                        <div key={i} className={`msg-row ${msg.role}`} id={`msg-${i}`}>
                            {msg.role === 'assistant' && (
                                <div className="msg-avatar"><Bot size={14} strokeWidth={2} /></div>
                            )}
                            <div className="msg-bubble">
                                <div className="msg-text"
                                    dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }} />

                                {msg.actions?.length > 0 && (
                                    <div className="msg-badges">
                                        {msg.actions.map((a, j) => (
                                            <span key={j} className={`action-badge ${a.success ? 'ok' : 'err'}`}>
                                                {a.success
                                                    ? <CheckCircle size={11} />
                                                    : <Circle size={11} />
                                                }
                                                {a.intent?.replace(/_/g, ' ')}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {msg.actions?.some(a => a.intent === 'get_status' && a.data?.inboxTriage) && (
                                    <div className="triage-badges-container">
                                        {Object.entries(msg.actions.find(a => a.intent === 'get_status').data.inboxTriage).map(([tag, count], k) => (
                                            <span key={k} className={`triage-badge ${tag.toLowerCase().replace(/\s/g, '-')}`}>
                                                {tag}: {count}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* BioLink Preview Card */}
                                {msg.actions?.some(a => ['create_biolink', 'update_biolink', 'list_biolinks'].includes(a.intent) && a.data?.biolinkId) && (
                                    <BioLinkChatPreview
                                        biolinkId={msg.actions.find(a => ['create_biolink', 'update_biolink', 'list_biolinks'].includes(a.intent) && a.data?.biolinkId).data.biolinkId}
                                        url={msg.actions.find(a => ['create_biolink', 'update_biolink', 'list_biolinks'].includes(a.intent) && a.data?.biolinkId).data.url}
                                    />
                                )}

                                {/* Automation Preview Card */}
                                {msg.actions?.some(a =>
                                    ['enable_comment_autoreply', 'enable_dm_autoreply', 'enable_all_automation',
                                     'disable_comment_autoreply', 'disable_dm_autoreply', 'disable_all_automation',
                                     'get_active_automations', 'set_content_target', 
                                     'find_brand_deals', 'list_brand_deals', 'enable_comment_to_dm', 'enable_gamify_funnel'].includes(a.intent) && a.data
                                ) && (
                                    <AutomationChatPreview
                                        actionData={msg.actions.find(a =>
                                            ['enable_comment_autoreply', 'enable_dm_autoreply', 'enable_all_automation',
                                             'disable_comment_autoreply', 'disable_dm_autoreply', 'disable_all_automation',
                                             'get_active_automations', 'set_content_target',
                                             'find_brand_deals', 'list_brand_deals', 'enable_comment_to_dm', 'enable_gamify_funnel'].includes(a.intent) && a.data
                                        ).data}
                                    />
                                )}

                                {/* ====== DEAL NOTIFICATION (points to CRM tab) ====== */}
                                {msg.actions?.some(a => a.intent === 'get_morning_briefing' && a.data?.hasPendingDeals) && (
                                    <button
                                        className="deal-alert-card"
                                        onClick={() => { loadDealsData(); setActiveTab('deals'); }}
                                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '10px', background: 'rgba(59,130,246,0.08)', width: '100%', textAlign: 'left' }}
                                    >
                                        <Handshake size={18} style={{ color: 'var(--primary-color)', flexShrink: 0 }} />
                                        <div style={{ flex: 1 }}>
                                            <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                                                {msg.actions.find(a => a.intent === 'get_morning_briefing').data.pendingCount || 0} Brand Deal{(msg.actions.find(a => a.intent === 'get_morning_briefing').data.pendingCount || 0) !== 1 ? 's' : ''} Waiting
                                            </strong>
                                            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', margin: '2px 0 0 0' }}>Tap to open the Deals CRM →</p>
                                        </div>
                                        <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} />
                                    </button>
                                )}

                                <span className="msg-time">
                                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                                {msg._id && (
                                    <button className="msg-delete-btn" onClick={() => handleDeleteMessage(msg._id)} title="Delete message">
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Typing indicator */}
                    {isTyping && (
                        <div className="msg-row assistant" id="typing-indicator">
                            <div className="msg-avatar"><Bot size={14} strokeWidth={2} /></div>
                            <div className="msg-bubble typing-bubble">
                                <span /><span /><span />
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
                )}

                {/* Floating New Chat Button (Conditional) */}
                {messages.length > 2 && activeTab === 'current' && (
                    <div className="floating-new-chat-container">
                        <button className="floating-new-chat-btn" onClick={handleNewChat}>
                            <Plus size={13} strokeWidth={2.5} />
                            <span>New Chat</span>
                        </button>
                    </div>
                )}

                {/* Input bar */}
                <div className="chat-input-bar" id="chat-input-container">
                    <div className="input-wrap">
                        <textarea
                            ref={inputRef}
                            value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder="Tell me what you need…"
                            className="chat-input"
                            id="chat-input"
                            rows={1}
                            disabled={isTyping}
                        />
                        <button
                            onClick={() => sendMessage()}
                            disabled={isTyping || !inputValue.trim()}
                            className="send-btn"
                            id="chat-send-btn"
                            aria-label="Send message"
                        >
                            {isTyping ? <Loader size={16} className="spin" /> : <Send size={16} strokeWidth={2} />}
                        </button>
                    </div>
                    <p className="input-hint">Enter to send · Shift+Enter for new line</p>
                </div>
            </main>
        </div>
    );
}

export default ChatHub;
