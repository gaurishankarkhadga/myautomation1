import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Edit3, Trash2, ExternalLink, Loader, Link2,
  Instagram, Youtube, Twitter, Facebook, Linkedin, Twitch,
  Music2, Globe, Github, MessageCircle, ChevronRight,
  User, PackageOpen, ShoppingBag, Sparkles, Send, Pin, Play
} from 'lucide-react';
import BioLinkElement from '../biolinks/BioLinkElement';
import './BioLinkChatPreview.css';


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const formatPrice = (price) => {
  if (!price) return '';
  const str = String(price).trim();
  if (/^[\d.]+$/.test(str)) {
    return `$${str}`;
  }
  return str;
};


// ─── Platform brand colours ───────────────────────────────
const PLATFORM_COLORS = {
  instagram:  '#e1306c',
  youtube:    '#ff0000',
  twitter:    '#1d9bf0',
  facebook:   '#1877f2',
  linkedin:   '#0a66c2',
  twitch:     '#9146ff',
  github:     '#c9d1d9',
  discord:    '#5865f2',
  spotify:    '#1db954',
  tiktok:     '#69c9d0',
  snapchat:   '#fffc00',
  pinterest:  '#e60023',
  telegram:   '#26a5e4',
  website:    '#8b5cf6',
  link:       '#8b5cf6',
};

// ─── Platform icons ───────────────────────────────────────
const TikTokSvg = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.15 8.15 0 0 0 4.77 1.52V6.76a4.85 4.85 0 0 1-1-.07z"/>
  </svg>
);
const SpotifySvg = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);
const DiscordSvg = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
  </svg>
);

const PLATFORM_ICON_MAP = {
  instagram:  <Instagram size={13} />,
  youtube:    <Youtube   size={13} />,
  twitter:    <Twitter   size={13} />,
  facebook:   <Facebook  size={13} />,
  linkedin:   <Linkedin  size={13} />,
  twitch:     <Twitch    size={13} />,
  github:     <Github    size={13} />,
  discord:    <DiscordSvg size={13} />,
  spotify:    <SpotifySvg size={13} />,
  tiktok:     <TikTokSvg  size={13} />,
  snapchat:   <MessageCircle size={13} />,
  pinterest:  <Pin        size={13} />,
  telegram:   <Send       size={13} />,
  website:    <Globe      size={13} />,
  link:       <Link2      size={13} />,
};

function detectPlatform(url = '') {
  const u = url.toLowerCase();
  if (u.includes('instagram.com'))              return 'instagram';
  if (u.includes('youtube.com')||u.includes('youtu.be')) return 'youtube';
  if (u.includes('twitter.com')||u.includes('x.com'))    return 'twitter';
  if (u.includes('facebook.com')||u.includes('fb.com'))  return 'facebook';
  if (u.includes('linkedin.com'))               return 'linkedin';
  if (u.includes('tiktok.com'))                 return 'tiktok';
  if (u.includes('twitch.tv'))                  return 'twitch';
  if (u.includes('github.com'))                 return 'github';
  if (u.includes('discord.gg')||u.includes('discord.com')) return 'discord';
  if (u.includes('spotify.com'))                return 'spotify';
  if (u.includes('snapchat.com'))               return 'snapchat';
  if (u.includes('pinterest.com'))              return 'pinterest';
  if (u.includes('t.me')||u.includes('telegram.me')) return 'telegram';
  return null;
}

function resolveLinkMeta(link) {
  let platformId = null;
  if (link.icon === 'platform' && link.platform) platformId = link.platform.toLowerCase();
  else if (link.platform && link.platform !== 'website' && PLATFORM_ICON_MAP[link.platform.toLowerCase()]) {
    platformId = link.platform.toLowerCase();
  }
  else platformId = detectPlatform(link.url);

  const icon   = platformId ? (PLATFORM_ICON_MAP[platformId] || <Globe size={13} />) : <Globe size={13} />;
  const color  = platformId ? (PLATFORM_COLORS[platformId] || '#8b5cf6') : '#8b5cf6';
  const colorBg = `${color}22`;

  return { icon, color, colorBg, platformId };
}

function isSystemUsername(str = '') {
  return /^@?(creator_|insta_|yt_)[a-z0-9_]{6,}$/i.test(str.trim());
}

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
    const styleType = settings.styleType || 'glass';
    const layoutStyle = settings.layoutStyle || 'default';

    const phoneBg = (settings.backgroundColor || '#0b1220').includes('gradient')
        ? settings.backgroundColor
        : settings.backgroundColor || '#0b1220';

    const textColor = settings.textColor || '#ffffff';
    const accent = settings.accentColor || '#8b5cf6';

    const linkStyle = (link) => {
        const { color } = resolveLinkMeta(link);
        if (styleType === 'glass') return {
            background: 'rgba(255, 255, 255, 0.07)',
            border: '1px solid rgba(255, 255, 255, 0.13)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            color: textColor,
            '--platform-color': color
        };
        if (styleType === 'timeline') return {
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            color: textColor,
            '--platform-color': color
        };
        if (styleType === 'perspective') return {
            background: '#ffffff',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            color: '#111111',
            '--platform-color': color
        };
        return {
            background: `${accent}22`,
            border: `1px solid ${accent}44`,
            color: textColor,
            '--platform-color': color
        };
    };

    const tabActiveStyle = {
        background: `${accent}33`,
        color: textColor,
    };

    const showUsernameHandle = !isSystemUsername(biolink.username);
    const safeTagline = profile.tagline && !isSystemUsername(profile.tagline) ? profile.tagline : '';

    const SOCIAL_IDS = ['instagram','youtube','twitter','tiktok','facebook','linkedin','twitch','spotify','discord','github','snapchat','pinterest','telegram'];
    const socialPills = links.filter(l => 
      (l.icon === 'platform' || SOCIAL_IDS.includes(l.icon?.toLowerCase?.())) && 
      SOCIAL_IDS.includes(l.platform?.toLowerCase?.())
    );
    const regularLinks = ['socialsTop', 'socialsBottom', 'socialsTopBottom'].includes(layoutStyle)
      ? links.filter(l => !socialPills.includes(l))
      : links;

    return (
        <div className="biolink-chat-preview" id="bcp-card">
            {/* Toolbar: Edit / Delete / View */}
            <div className="bcp-toolbar">
                <span className="bcp-toolbar-left">
                    <Link2 size={11} /> BioLink Preview
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
                    <div className="bcp-avatar-ring">
                        {profile.avatar ? (
                            <img
                                src={profile.avatar.startsWith('http') ? profile.avatar : `${API_BASE_URL}${profile.avatar}`}
                                alt={profile.displayName || biolink.username || 'Avatar'}
                                className="bcp-avatar-img"
                                onError={e => { e.target.style.display = 'none'; }}
                            />
                        ) : (
                            <div className="bcp-avatar-placeholder">
                                <User size={20} />
                            </div>
                        )}
                    </div>

                    {/* Name & Tagline */}
                    <h3 className="bcp-display-name" style={{ color: textColor }}>
                        {profile.displayName || biolink.username || 'Untitled'}
                    </h3>
                    {showUsernameHandle && (
                        <p className="bcp-username" style={{ color: `${textColor}60` }}>
                            @{biolink.username}
                        </p>
                    )}
                    {safeTagline && (
                        <p className="bcp-tagline" style={{ color: `${textColor}99` }}>
                            {safeTagline}
                        </p>
                    )}

                    {/* Social pills (Top) */}
                    {['socialsTop', 'socialsTopBottom'].includes(layoutStyle) && socialPills.length > 0 && (
                        <div className="bcp-social-icons-compact">
                            {socialPills.map(link => {
                                const { icon, color } = resolveLinkMeta(link);
                                return (
                                    <a
                                        key={link.id || link.url}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bcp-compact-icon"
                                        style={{ background: `${color}1A`, color: color, borderColor: `${color}40` }}
                                    >
                                        {icon}
                                    </a>
                                );
                            })}
                        </div>
                    )}

                    {/* Tab switcher (only if products exist) */}
                    {products.length > 0 && (
                        <div className="bcp-tab-row">
                            <button
                                className={`bcp-tab-btn ${activeView === 'links' ? 'bcp-tab-btn--active' : ''}`}
                                style={activeView === 'links' ? tabActiveStyle : {}}
                                onClick={() => setActiveView('links')}
                            >
                                Links
                            </button>
                            <button
                                className={`bcp-tab-btn ${activeView === 'shop' ? 'bcp-tab-btn--active' : ''}`}
                                style={activeView === 'shop' ? tabActiveStyle : {}}
                                onClick={() => setActiveView('shop')}
                            >
                                Shop
                            </button>
                        </div>
                    )}

                    {/* Links */}
                    {activeView === 'links' && regularLinks.length > 0 && (
                        <div className="bcp-links-list">
                            {regularLinks.map((link) => {
                                const { icon, color } = resolveLinkMeta(link);
                                return (
                                    <a
                                        key={link.id || link.url}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bcp-link-card"
                                        style={linkStyle(link)}
                                    >
                                        <div
                                            className="bcp-link-card-accent"
                                            style={{ background: color }}
                                        />
                                        <div className="bcp-link-icon-wrap">
                                            {icon}
                                        </div>
                                        <span className="bcp-link-title">
                                            {link.title || link.platform || link.url}
                                        </span>
                                        <span className="bcp-link-arrow">
                                            <ChevronRight size={13} />
                                        </span>
                                    </a>
                                );
                            })}
                        </div>
                    )}

                    {/* Products */}
                    {activeView === 'shop' && products.length > 0 && (
                        <div className="bcp-products-grid">
                            {products.map((product) => {
                                const imgSrc = product.image
                                    ? product.image.startsWith('http') ? product.image : `${API_BASE_URL}${product.image}`
                                    : null;
                                return (
                                    <a key={product.id} href={product.url || '#'} target="_blank" rel="noopener noreferrer" className="bcp-product-card" style={styleType === 'glass' || styleType === 'timeline' ? { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' } : {}}>
                                        <div className="bcp-product-img-wrap">
                                            {imgSrc ? (
                                                <img
                                                    src={imgSrc}
                                                    alt={product.name}
                                                    className="bcp-product-img"
                                                    onError={e => { e.target.style.display = 'none'; }}
                                                />
                                            ) : (
                                                <div className="bcp-product-img-placeholder">
                                                    <PackageOpen size={20} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="bcp-product-name">{product.name}</div>
                                        {product.price && <div className="bcp-product-price">{formatPrice(product.price)}</div>}
                                    </a>
                                );
                            })}
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

                    {/* Social pills (Bottom) */}
                    {['socialsBottom', 'socialsTopBottom'].includes(layoutStyle) && socialPills.length > 0 && (
                        <div className="bcp-social-icons-compact" style={{ marginTop: 16, marginBottom: 8 }}>
                            {socialPills.map(link => {
                                const { icon, color } = resolveLinkMeta(link);
                                return (
                                    <a
                                        key={link.id || link.url}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bcp-compact-icon"
                                        style={{ background: `${color}1A`, color: color, borderColor: `${color}40` }}
                                    >
                                        {icon}
                                    </a>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default BioLinkChatPreview;
