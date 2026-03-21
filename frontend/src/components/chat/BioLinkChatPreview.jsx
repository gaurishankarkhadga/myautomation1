import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit3, Trash2, ExternalLink, Loader, Link2 } from 'lucide-react';
import BioLinkElement from '../biolinks/BioLinkElement';
import './BioLinkChatPreview.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function BioLinkChatPreview({ biolinkId, url }) {
    const navigate = useNavigate();
    const [biolink, setBiolink] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeView, setActiveView] = useState('links');

    useEffect(() => {
        if (biolinkId) fetchBiolinkData();
    }, [biolinkId]);

    const fetchBiolinkData = async () => {
        setLoading(true);
        try {
            const instaUserId = localStorage.getItem('insta_user_id');
            const ytChannelId = localStorage.getItem('yt_channel_id');
            const headers = {};
            if (instaUserId) headers['x-insta-userid'] = instaUserId;
            else if (ytChannelId) headers['x-yt-channelid'] = ytChannelId;

            const res = await fetch(`${API_BASE_URL}/api/biolinks/data?id=${biolinkId}`, { headers });
            const data = await res.json();
            if (data.biolink) setBiolink(data.biolink);
        } catch { /* silent */ }
        finally { setLoading(false); }
    };

    // Same navigation as Profile tab Edit button
    const handleEdit = () => {
        if (biolink?._id) {
            navigate('/biolink/editor', { state: { id: biolink._id } });
        }
    };

    const handleView = () => {
        const viewUrl = url || (biolink ? `/p/${biolink.username}` : '');
        if (viewUrl) window.open(viewUrl, '_blank', 'noopener,noreferrer');
    };

    const handleDelete = async () => {
        if (!biolink?._id) return;
        if (!window.confirm('Delete this BioLink?')) return;
        try {
            const instaUserId = localStorage.getItem('insta_user_id');
            const ytChannelId = localStorage.getItem('yt_channel_id');
            const headers = { 'Content-Type': 'application/json' };
            if (instaUserId) headers['x-insta-userid'] = instaUserId;
            else if (ytChannelId) headers['x-yt-channelid'] = ytChannelId;

            await fetch(`${API_BASE_URL}/api/biolinks/remove`, {
                method: 'DELETE',
                headers,
                body: JSON.stringify({ id: biolink._id })
            });
            setBiolink(null);
        } catch { /* silent */ }
    };

    // Loading
    if (loading) {
        return (
            <div className="biolink-chat-preview">
                <div className="bcp-loading"><Loader size={14} /> Loading preview…</div>
            </div>
        );
    }

    if (!biolink) return null;

    const settings = biolink.settings || {};
    const profile = biolink.profile || {};
    const links = (biolink.links || []).filter(l => l.isActive !== false);
    const products = biolink.products || [];
    const elements = biolink.elements || [];
    const theme = biolink.theme || 'modern';
    const styleType = settings.styleType || (theme === 'glass' ? 'glass' : theme === 'modern' ? 'timeline' : theme === 'creative' ? 'perspective' : 'default');

    const phoneBg = (settings.backgroundColor || '#0b1220').includes('gradient')
        ? settings.backgroundColor
        : settings.backgroundColor || '#0b1220';

    const textColor = settings.textColor || '#ffffff';
    const accent = settings.accentColor || '#3b82f6';

    // Link styling matching PublicBioLink
    const linkStyle = () => {
        if (styleType === 'glass') return { background: 'rgba(51,51,51,0.8)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', backdropFilter: 'blur(10px)' };
        if (styleType === 'timeline') return { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', backdropFilter: 'blur(10px)' };
        if (styleType === 'perspective') return { background: '#fff', border: '1px solid rgba(255,255,255,0.3)', color: '#000' };
        return { background: accent, color: textColor };
    };

    return (
        <div className="biolink-chat-preview" id="bcp-card">
            {/* Toolbar: Edit / Delete / View */}
            <div className="bcp-toolbar">
                <span className="bcp-toolbar-left">
                    <Link2 size={11} /> BioLink
                </span>
                <div className="bcp-toolbar-actions">
                    <button className="bcp-toolbar-btn edit" onClick={handleEdit} title="Edit BioLink">
                        <Edit3 size={12} /> Edit
                    </button>
                    <button className="bcp-toolbar-btn delete" onClick={handleDelete} title="Delete BioLink">
                        <Trash2 size={12} />
                    </button>
                    <button className="bcp-toolbar-btn view" onClick={handleView} title="Open Live">
                        <ExternalLink size={12} />
                    </button>
                </div>
            </div>

            {/* Actual biolink render — phone frame */}
            <div className="bcp-phone-frame">
                <div
                    className="bcp-phone"
                    style={{
                        background: phoneBg,
                        color: textColor,
                        borderColor: styleType === 'glass' || styleType === 'timeline'
                            ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)'
                    }}
                >
                    {/* Avatar */}
                    <div className="bcp-avatar">
                        {profile.avatar ? (
                            <img
                                src={profile.avatar.startsWith('http') ? profile.avatar : `${API_BASE_URL}${profile.avatar}`}
                                alt={profile.displayName || 'Avatar'}
                            />
                        ) : (
                            <div className="bcp-avatar-empty">👤</div>
                        )}
                    </div>

                    {/* Name & Tagline */}
                    <h3 className="bcp-display-name" style={{ color: textColor }}>
                        {profile.displayName || biolink.username || 'Untitled'}
                    </h3>
                    {profile.tagline && (
                        <p className="bcp-tagline" style={{ color: textColor }}>
                            {profile.tagline}
                        </p>
                    )}

                    {/* Tab switcher (only if products exist) */}
                    {products.length > 0 && (
                        <div className="bcp-tab-switcher" style={{ background: accent }}>
                            <button
                                className="bcp-tab-btn"
                                onClick={() => setActiveView('links')}
                                style={{
                                    background: activeView === 'links' ? '#fff' : 'transparent',
                                    color: activeView === 'links' ? accent : '#fff'
                                }}
                            >LINK</button>
                            <button
                                className="bcp-tab-btn"
                                onClick={() => setActiveView('shop')}
                                style={{
                                    background: activeView === 'shop' ? '#fff' : 'transparent',
                                    color: activeView === 'shop' ? accent : '#fff'
                                }}
                            >SHOP</button>
                        </div>
                    )}

                    {/* Links */}
                    {activeView === 'links' && links.length > 0 && (
                        <div className="bcp-links-list">
                            {links.map((link) => (
                                <a
                                    key={link.id || link.url}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bcp-link-btn"
                                    style={linkStyle()}
                                >
                                    {link.title || link.platform || link.url}
                                </a>
                            ))}
                        </div>
                    )}

                    {/* Products */}
                    {activeView === 'shop' && products.length > 0 && (
                        <div className="bcp-products-grid">
                            {products.map((product) => (
                                <a key={product.id} href={product.url} target="_blank" rel="noopener noreferrer" className="bcp-product-card">
                                    <div className="bcp-product-img">
                                        {product.image ? (
                                            <img
                                                src={product.image.startsWith('http') ? product.image : `${API_BASE_URL}${product.image}`}
                                                alt={product.name}
                                            />
                                        ) : (
                                            <div className="bcp-product-img-empty">📦</div>
                                        )}
                                    </div>
                                    <div className="bcp-product-name">{product.name}</div>
                                    {product.price && <div className="bcp-product-price">{product.price}</div>}
                                </a>
                            ))}
                        </div>
                    )}

                    {/* Custom elements */}
                    {elements.length > 0 && (
                        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                            {elements.map((el) => (
                                <BioLinkElement key={el.id} element={el} isPreview={true} settings={settings} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default BioLinkChatPreview;
