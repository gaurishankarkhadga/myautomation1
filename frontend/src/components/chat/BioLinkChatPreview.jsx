import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Link2, User, Palette, ExternalLink, Copy, Check,
    Edit3, Eye, Loader, AlertCircle, Globe, ShoppingBag,
    Instagram, Youtube, BookOpen, Tag, Briefcase
} from 'lucide-react';
import './BioLinkChatPreview.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Icon map for link types
const LINK_ICONS = {
    instagram: Instagram,
    youtube: Youtube,
    book: BookOpen,
    tag: Tag,
    briefcase: Briefcase,
    link: Link2,
    website: Globe,
};

function BioLinkChatPreview({ biolinkId, url, biolinks }) {
    const navigate = useNavigate();
    const [biolink, setBiolink] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [urlCopied, setUrlCopied] = useState(false);

    // Fetch biolink data when we have an ID
    useEffect(() => {
        if (!biolinkId) return;
        fetchBiolinkData();
    }, [biolinkId]);

    const fetchBiolinkData = async () => {
        setLoading(true);
        setError(null);
        try {
            const instaUserId = localStorage.getItem('insta_user_id');
            const ytChannelId = localStorage.getItem('yt_channel_id');
            const headers = {};
            if (instaUserId) headers['x-insta-userid'] = instaUserId;
            else if (ytChannelId) headers['x-yt-channelid'] = ytChannelId;

            const res = await fetch(`${API_BASE_URL}/api/biolinks/data?id=${biolinkId}`, { headers });
            const data = await res.json();

            if (data.biolink) {
                setBiolink(data.biolink);
            } else {
                setError('Could not load BioLink preview');
            }
        } catch {
            setError('Failed to fetch BioLink data');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyUrl = async () => {
        const copyUrl = url || (biolink ? `${window.location.origin}/p/${biolink.username}` : '');
        if (!copyUrl) return;
        try {
            await navigator.clipboard.writeText(copyUrl);
            setUrlCopied(true);
            setTimeout(() => setUrlCopied(false), 2000);
        } catch { /* clipboard may fail silently */ }
    };

    const handleEdit = () => {
        if (biolink?._id) {
            navigate(`/profile`, { state: { openBiolinkId: biolink._id } });
        } else {
            navigate('/profile');
        }
    };

    const handleView = () => {
        const viewUrl = url || (biolink ? `/p/${biolink.username}` : '');
        if (viewUrl) {
            window.open(viewUrl, '_blank', 'noopener,noreferrer');
        }
    };

    // Resolve icon component for a link
    const getLinkIcon = (link) => {
        const iconKey = link.icon || link.platform || 'link';
        return LINK_ICONS[iconKey] || Link2;
    };

    const displayUrl = url || (biolink ? `${window.location.origin}/p/${biolink.username}` : '');

    // ── Loading state ──────────────────────────────────────────
    if (loading) {
        return (
            <div className="biolink-chat-preview" id="bcp-loading">
                <div className="bcp-loading">
                    <Loader size={14} />
                    <span>Loading BioLink preview…</span>
                </div>
            </div>
        );
    }

    // ── Error state ────────────────────────────────────────────
    if (error && !biolink) {
        return (
            <div className="biolink-chat-preview" id="bcp-error">
                <div className="bcp-error">
                    <AlertCircle size={13} />
                    <span>{error}</span>
                </div>
                {displayUrl && (
                    <div className="bcp-actions" style={{ marginTop: 8 }}>
                        <button className="bcp-view-btn" onClick={handleView}>
                            <ExternalLink size={13} /> Open BioLink
                        </button>
                        <button className="bcp-edit-btn" onClick={handleEdit}>
                            <Edit3 size={13} /> Edit
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // ── No data — show minimal card ────────────────────────────
    if (!biolink) {
        return null;
    }

    const profile = biolink.profile || {};
    const links = Array.isArray(biolink.links) ? biolink.links.filter(l => l.isActive !== false) : [];
    const products = Array.isArray(biolink.products) ? biolink.products : [];
    const theme = biolink.theme || 'modern';
    const isPublished = biolink.isPublished;

    return (
        <div className="biolink-chat-preview" id="bcp-card">
            {/* Header */}
            <div className="bcp-header">
                <span className="bcp-label">
                    <Link2 size={11} /> BioLink Preview
                </span>
                {isPublished ? (
                    <span className="bcp-status">
                        <span className="bcp-status-dot" /> Published
                    </span>
                ) : (
                    <span className="bcp-theme-badge">
                        <Palette size={10} /> Draft
                    </span>
                )}
            </div>

            {/* Profile */}
            <div className="bcp-profile">
                <div className="bcp-avatar-wrap">
                    {profile.avatar ? (
                        <img
                            src={profile.avatar.startsWith('http') ? profile.avatar : `${API_BASE_URL}${profile.avatar}`}
                            alt={profile.displayName || 'Avatar'}
                        />
                    ) : (
                        <User size={20} />
                    )}
                </div>
                <div className="bcp-profile-info">
                    <div className="bcp-name">{profile.displayName || biolink.username || 'Untitled'}</div>
                    {profile.tagline && <div className="bcp-tagline">{profile.tagline}</div>}
                </div>
                <span className="bcp-theme-badge">
                    <Palette size={10} /> {theme}
                </span>
            </div>

            {/* Links preview (show max 3) */}
            {links.length > 0 && (
                <div className="bcp-links-section">
                    <div className="bcp-links-title">Links ({links.length})</div>
                    {links.slice(0, 3).map((link) => {
                        const IconComp = getLinkIcon(link);
                        return (
                            <div key={link.id} className="bcp-link-item">
                                <div className="bcp-link-icon">
                                    <IconComp size={13} />
                                </div>
                                <span className="bcp-link-title">
                                    {link.title || link.platform || link.url}
                                </span>
                            </div>
                        );
                    })}
                    {links.length > 3 && (
                        <div className="bcp-more-links">+{links.length - 3} more link{links.length - 3 > 1 ? 's' : ''}</div>
                    )}
                </div>
            )}

            {/* Stats row */}
            <div className="bcp-stats">
                <div className="bcp-stat">
                    <Link2 size={12} />
                    <span className="bcp-stat-value">{links.length}</span> links
                </div>
                {products.length > 0 && (
                    <div className="bcp-stat">
                        <ShoppingBag size={12} />
                        <span className="bcp-stat-value">{products.length}</span> products
                    </div>
                )}
                <div className="bcp-stat">
                    <Eye size={12} />
                    <span className="bcp-stat-value">{biolink.analytics?.views || 0}</span> views
                </div>
            </div>

            {/* URL bar */}
            {displayUrl && (
                <div className="bcp-url-bar">
                    <Globe size={13} style={{ color: 'rgba(200,200,200,0.4)', flexShrink: 0 }} />
                    <span className="bcp-url-text">{displayUrl}</span>
                    <button
                        className={`bcp-url-copy-btn ${urlCopied ? 'copied' : ''}`}
                        onClick={handleCopyUrl}
                    >
                        {urlCopied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                    </button>
                </div>
            )}

            {/* Action buttons */}
            <div className="bcp-actions">
                <button className="bcp-edit-btn" onClick={handleEdit} id="bcp-edit-btn">
                    <Edit3 size={14} /> Edit BioLink
                </button>
                <button className="bcp-view-btn" onClick={handleView} id="bcp-view-btn">
                    <ExternalLink size={14} /> View Live
                </button>
            </div>
        </div>
    );
}

export default BioLinkChatPreview;
