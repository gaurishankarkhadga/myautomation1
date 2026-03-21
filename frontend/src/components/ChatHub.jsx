import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Zap, Send, Menu, X, Settings, LogOut, BarChart2,
    Package, User, MessageSquare, Mail, Handshake,
    Instagram, Youtube, CheckCircle, Circle, Loader,
    Bot, Activity, ChevronRight, RotateCcw, Link2, Trash2
} from 'lucide-react';
import ToastNotification, { useToasts } from './ToastNotification';
import BioLinkChatPreview from './chat/BioLinkChatPreview';
import AutomationChatPreview from './chat/AutomationChatPreview';
import '../styles/ChatHub.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const SUGGESTED_PROMPTS = [
    { icon: MessageSquare, text: 'Turn on auto-reply for comments', label: 'Enable Replies' },
    { icon: Mail, text: 'Enable smart DM auto-reply', label: 'Smart DMs' },
    { icon: BarChart2, text: "What's my current setup?", label: 'View Status' },
    { icon: Package, text: 'Show my assets', label: 'My Assets' },
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
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(true);

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [connections, setConnections] = useState({ instagram: false, youtube: false });
    const [connectingPlatform, setConnectingPlatform] = useState(null);
    const [activeAutomations, setActiveAutomations] = useState({ count: 0, list: [] });
    const [quota, setQuota] = useState(null);

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
        if (userId) { fetchActiveCount(); fetchQuota(); }
    }, [token, userId]);

    useEffect(() => {
        if (!userId) return;
        const id = setInterval(() => { fetchActiveCount(); fetchQuota(); }, 30000);
        return () => clearInterval(id);
    }, [userId]);

    useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

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

    const handleDisconnect = () => {
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
                <button className="mob-icon-btn" onClick={() => setSidebarOpen(true)} id="mob-menu-open" aria-label="Open menu">
                    <Menu size={20} />
                </button>
                <span className="mob-brand"><Zap size={16} strokeWidth={2.5} /> CreatorHub</span>
                {activeAutomations.count > 0 && (
                    <span className="mob-active-pill">{activeAutomations.count} Active</span>
                )}
            </header>

            {/* Sidebar overlay (mobile) */}
            {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

            {/* ─── Sidebar ─── */}
            <aside className={`chathub-sidebar ${sidebarOpen ? 'open' : ''}`} id="chathub-sidebar">
                {/* Sidebar top */}
                <div className="sidebar-top">
                    <div className="sidebar-brand">
                        <Zap size={18} strokeWidth={2.5} />
                        <span>CreatorHub</span>
                    </div>
                    <button className="mob-icon-btn close-btn" onClick={() => setSidebarOpen(false)} id="mob-sidebar-close" aria-label="Close sidebar">
                        <X size={18} />
                    </button>
                </div>

                {/* Profile card */}
                {profile && (
                    <div className="sidebar-profile-card" id="sidebar-profile">
                        {profile.profile_picture_url
                            ? <img src={profile.profile_picture_url} alt={profile.username} className="sidebar-avatar" />
                            : <div className="sidebar-avatar-placeholder"><User size={20} /></div>
                        }
                        <div className="sidebar-profile-info">
                            <span className="sidebar-username">@{profile.username}</span>
                            <span className="sidebar-followers">{profile.followers_count?.toLocaleString()} followers</span>
                        </div>
                        <CheckCircle size={14} className="connected-check" />
                    </div>
                )}

                {/* Active automations */}
                <div className="sidebar-section">
                    <p className="sidebar-section-label">Automations</p>
                    <button
                        className={`active-badge-btn ${activeAutomations.count > 0 ? 'is-active' : ''}`}
                        onClick={() => { sendMessage('Show my active automations with video details'); setSidebarOpen(false); }}
                        id="active-automations-badge"
                    >
                        <Activity size={15} />
                        <span className="ab-label">
                            {activeAutomations.count > 0 ? `${activeAutomations.count} Running` : 'None Active'}
                        </span>
                        {activeAutomations.count > 0 && (
                            <span className="ab-detail">{activeAutomations.list.join(' · ')}</span>
                        )}
                        <ChevronRight size={13} className="ab-arrow" />
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
                            <h1 className="chat-title">CreatorHub AI</h1>
                            <p className="chat-subtitle">Your social media command center</p>
                        </div>
                    </div>
                    <div className="chat-header-right">
                        {profile && <span className="header-username">@{profile.username}</span>}
                        {activeAutomations.count > 0 && (
                            <span className="header-active-pill">
                                <span className="live-dot" />
                                {activeAutomations.count} Active
                            </span>
                        )}
                    </div>
                </header>

                {/* Messages */}
                <div className="chat-messages" id="chat-messages">
                    {/* Welcome screen */}
                    {!loadingHistory && messages.length === 0 && activeTab === 'current' && (
                        <div className="chat-welcome" id="chat-welcome">
                            <div className="welcome-icon-wrap"><Zap size={28} strokeWidth={2} /></div>
                            <h2 className="welcome-title">Welcome to CreatorHub AI</h2>
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
                                     'get_active_automations', 'set_content_target'].includes(a.intent) && a.data
                                ) && (
                                    <AutomationChatPreview
                                        actionData={msg.actions.find(a =>
                                            ['enable_comment_autoreply', 'enable_dm_autoreply', 'enable_all_automation',
                                             'disable_comment_autoreply', 'disable_dm_autoreply', 'disable_all_automation',
                                             'get_active_automations', 'set_content_target'].includes(a.intent) && a.data
                                        ).data}
                                    />
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
