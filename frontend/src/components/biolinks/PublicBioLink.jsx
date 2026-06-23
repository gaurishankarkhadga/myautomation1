/**
 * PublicBioLink.jsx
 * Public-facing BioLink page — glassmorphism, framer-motion, lucide-react icons.
 *
 * Issues fixed in this version:
 *  #3  Modern premium liquid-glass UI design
 *  #5  Full-page vertical scrolling
 *  #6  System-generated usernames (@creator_xxx) hidden from profile
 */

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  Instagram, Youtube, Twitter, Facebook, Linkedin, Twitch,
  Music2, Globe, Github, MessageCircle, Link2, ChevronRight,
  User, PackageOpen, ShoppingBag, Sparkles, Send, Pin, Play,
  GripVertical
} from 'lucide-react';
import BioLinkElement from './BioLinkElement';
import styles from './PublicBioLink.module.css';

const getMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
  return `${import.meta.env.VITE_API_BASE_URL || ''}${url}`;
};

const formatPrice = (price) => {
  if (!price) return '';
  const str = String(price).trim();
  if (/^[\d.]+$/.test(str)) {
    return `Rs. ${str}`;
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

// ─── Platform icons (lucide + inline SVG for unsupported) ──
const TikTokSvg = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.15 8.15 0 0 0 4.77 1.52V6.76a4.85 4.85 0 0 1-1-.07z"/>
  </svg>
);
const SpotifySvg = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);
const DiscordSvg = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
  </svg>
);

const PLATFORM_ICON_MAP = {
  instagram:  <Instagram size={17} />,
  youtube:    <Youtube   size={17} />,
  twitter:    <Twitter   size={17} />,
  facebook:   <Facebook  size={17} />,
  linkedin:   <Linkedin  size={17} />,
  twitch:     <Twitch    size={17} />,
  github:     <Github    size={17} />,
  discord:    <DiscordSvg size={17} />,
  spotify:    <SpotifySvg size={17} />,
  tiktok:     <TikTokSvg  size={17} />,
  snapchat:   <MessageCircle size={17} />,
  pinterest:  <Pin        size={17} />,
  telegram:   <Send       size={17} />,
  website:    <Globe      size={17} />,
  link:       <Link2      size={17} />,
};

// Detect platform from URL string
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

// Resolve icon and colour for a link
function resolveLinkMeta(link) {
  let platformId = null;

  // 1. Explicit 'platform' icon flag
  if (link.icon === 'platform' && link.platform) platformId = link.platform.toLowerCase();
  // 2. Known platform set directly
  else if (link.platform && link.platform !== 'website' && PLATFORM_ICON_MAP[link.platform.toLowerCase()]) {
    platformId = link.platform.toLowerCase();
  }
  // 3. Auto-detect from URL
  else platformId = detectPlatform(link.url);

  const icon   = platformId ? (PLATFORM_ICON_MAP[platformId] || <Globe size={17} />) : <Globe size={17} />;
  const color  = platformId ? (PLATFORM_COLORS[platformId] || '#8b5cf6') : '#8b5cf6';
  const colorBg = `${color}22`; // 13% opacity

  return { icon, color, colorBg, platformId };
}

// ISSUE 6: detect auto-generated system usernames that should be hidden
function isSystemUsername(str = '') {
  // Format: creator_<26-char alphanum> or insta_<...> or yt_<...>
  return /^@?(creator_|insta_|yt_)[a-z0-9_]{6,}$/i.test(str.trim());
}

// ─── Framer Motion variants ────────────────────────────────
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.065, delayChildren: 0.04 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 340, damping: 28 } },
};
const cardPop = {
  hidden: { opacity: 0, scale: 0.94, y: 12 },
  show:   { opacity: 1, scale: 1,   y: 0,  transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

// ─── Link Row ─────────────────────────────────────────────
const LinkRow = React.memo(function LinkRow({ link, onTrackClick, themeStyle }) {
  const { icon, color, colorBg } = resolveLinkMeta(link);

  return (
    <motion.a
      variants={cardPop}
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className={styles['pbl-link-card']}
      style={{
        ...themeStyle,
        '--pbl-platform-color':    color,
        '--pbl-platform-color-bg': colorBg,
      }}
      onClick={onTrackClick}
      whileTap={{ scale: 0.965 }}
    >
      {/* Left colour accent bar */}
      <div
        className={styles['pbl-link-card-accent']}
        style={{ background: color }}
      />
      {/* Icon circle */}
      <div className={styles['pbl-link-icon-wrap']}>
        {icon}
      </div>
      <span className={styles['pbl-link-title']}>
        {link.title || link.platform || link.url}
      </span>
      <span className={styles['pbl-link-arrow']}>
        <ChevronRight size={15} />
      </span>
    </motion.a>
  );
});

// ─── Product Card ─────────────────────────────────────────
const ProductCard = React.memo(function ProductCard({ product, apiBase, themeStyle }) {
  const imgSrc = product.image ? getMediaUrl(product.image) : null;

  return (
    <motion.a
      variants={cardPop}
      href={product.url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className={styles['pbl-product-card']}
      style={themeStyle}
      whileTap={{ scale: 0.95 }}
    >
      <div className={styles['pbl-product-img-wrap']}>
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={product.name}
            className={styles['pbl-product-img']}
            onError={e => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className={styles['pbl-product-img-placeholder']}>
            <PackageOpen size={28} />
          </div>
        )}
        <div className={styles['pbl-product-badge']}>
          <ShoppingBag size={12} />
        </div>
      </div>
      <div className={styles['pbl-product-info']}>
        <p className={styles['pbl-product-name']}>{product.name || 'Product'}</p>
        {product.price && <p className={styles['pbl-product-price']}>{formatPrice(product.price)}</p>}
      </div>
    </motion.a>
  );
});

// ─── Loading ──────────────────────────────────────────────
function LoadingScreen({ username }) {
  return (
    <div className={styles['pbl-loading']}>
      <div className={styles['pbl-spinner']} />
      <p className={styles['pbl-loading-text']}>Loading @{username}</p>
    </div>
  );
}

// ─── Error ────────────────────────────────────────────────
function ErrorScreen({ username }) {
  return (
    <div className={styles['pbl-error']}>
      <Globe size={40} style={{ color: 'rgba(255,255,255,0.14)', marginBottom: 8 }} />
      <p className={styles['pbl-error-title']}>Not Found</p>
      <p className={styles['pbl-error-msg']}>
        @{username} hasn't published their BioLink yet.
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────
const PublicBioLink = () => {
  const { username } = useParams();
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [activeView, setActiveView] = useState('links');

  const apiBase = import.meta.env.VITE_API_BASE_URL || '';

  useEffect(() => {
    if (!username) return;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const isPreview = window.location.search.includes('preview=true');
        const url = `${apiBase}/api/biolinks/public/${encodeURIComponent(username)}${isPreview ? '?preview=true' : ''}`;
        const res  = await fetch(url);
        if (!res.ok) throw new Error(`${res.status}`);
        const json = await res.json();
        if (!json.biolink) throw new Error('No data');
        setData(json.biolink);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [username]);

  // Listen for real-time preview updates from parent editor window via postMessage
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'BIOLINK_PREVIEW_UPDATE') {
        setData(event.data.data);
        setError(null);
        setLoading(false);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (loading) return <LoadingScreen username={username} />;
  if (error || !data) return <ErrorScreen username={username} />;

  const isPreviewMode = window.location.search.includes('preview=true');

  // ── Derived values ──────────────────────────────────────
  const profile  = data.profile || {};
  const settings = data.settings || {};
  const allLinks = (data.links || [])
    .filter(l => l.isActive !== false)
    .filter(l => l.title && l.title.trim() && l.title !== 'New Link' && l.url && l.url.trim() && l.url !== 'https://');
  const products = (data.products || [])
    .filter(p => p.name && p.name.trim() && p.description && p.description.trim() && p.image && p.image.trim() && p.price && p.price.trim());
  const elements = (data.elements || [])
    .filter(el => el.isActive !== false)
    .filter(el => {
      const content = el.content || {};
      if (el.type === 'cta' || el.type === 'button') {
        return !!(content.text && content.text.trim() && content.text !== 'Click Here') && 
               !!(content.url && content.url.trim() && content.url !== 'https://');
      }
      if (el.type === 'text') {
        return !!(content.content && content.content.trim() && content.content !== 'Add your text here');
      }
      if (el.type === 'separator') {
        return ['line', 'dots', 'dashed'].includes(content.style);
      }
      if (el.type === 'ticket') {
        return !!(content.title && content.title.trim()) &&
               !!(content.description && content.description.trim()) &&
               !!(content.event_date && content.event_date.trim()) &&
               !!(content.event_time && content.event_time.trim()) &&
               !!(content.location && content.location.trim()) &&
               !!(content.price && content.price.trim());
      }
      if (el.type === 'form') {
        return !!(content.title && content.title.trim()) &&
               !!(content.buttonText && content.buttonText.trim());
      }
      if (el.type === 'gallery' || el.type === 'image') {
        return Array.isArray(content.images) && content.images.length > 0;
      }
      if (el.type === 'video') {
        return !!(content.url && content.url.trim());
      }
      return true;
    });
  const hasShop  = products.length > 0;

  // ── THEME: read stored settings from DB ─────────────────
  // These are saved by BioLinkEditPanel when creator picks a theme.
  // Must be applied as INLINE STYLES — CSS module has no access to DB values.
  const bgColor     = settings.backgroundColor || '#06040f';
  const textColor   = settings.textColor       || '#ffffff';
  const accentColor = settings.accentColor     || '#8b5cf6';
  const styleType   = settings.styleType       || 'glass';
  const layoutStyle = settings.layoutStyle     || 'default';
  const backgroundImage = settings.backgroundImage ? `url(${getMediaUrl(settings.backgroundImage)}) center / cover no-repeat` : null;

  // Link card style varies by theme styleType
  const getLinkCardThemeStyle = () => {
    if (styleType === 'glass')    return {
      background: 'rgba(255,255,255,0.07)',
      border: '1px solid rgba(255,255,255,0.13)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      color: textColor,
    };
    if (styleType === 'timeline') return {
      background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.15)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      color: textColor,
    };
    if (styleType === 'perspective') return {
      background: '#ffffff',
      border: '1px solid rgba(0,0,0,0.08)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      color: '#111111',
    };
    // default — use accent color
    return {
      background: `${accentColor}22`,
      border: `1px solid ${accentColor}44`,
      color: textColor,
    };
  };

  const linkCardTheme = getLinkCardThemeStyle();

  // Tab button active style (uses accentColor)
  const tabActiveStyle = {
    background: `${accentColor}33`,
    color: textColor,
  };



  // Avatar URL
  const avatarSrc = profile.avatar ? getMediaUrl(profile.avatar) : null;

  // Hide tagline if it looks like a system username
  const safeTagline = profile.tagline && !isSystemUsername(profile.tagline) ? profile.tagline : '';

  // Social pills
  const SOCIAL_IDS = ['instagram','youtube','twitter','tiktok','facebook','linkedin','twitch','spotify','discord','github','snapchat','pinterest','telegram'];
  const socialPills = allLinks.filter(l => 
    (l.icon === 'platform' || SOCIAL_IDS.includes(l.icon?.toLowerCase?.())) && 
    SOCIAL_IDS.includes(l.platform?.toLowerCase?.())
  );

  // Filter out social links from the main list if they are displayed as icons top and bottom
  const displayLinks = ['socialsTop', 'socialsBottom', 'socialsTopBottom'].includes(layoutStyle) 
    ? allLinks.filter(l => !socialPills.includes(l)) 
    : allLinks;

  // Track analytics
  const trackClick = () => {
    fetch(`${apiBase}/api/biolinks/click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    }).catch(() => {});
  };

  // Render helper for compact social icons
  const renderIconOnlySocials = () => (
    <motion.div
      className={styles['pbl-social-icons-compact']}
      initial="hidden"
      animate="show"
      variants={stagger}
    >
      {socialPills.map(link => {
        const { icon, color } = resolveLinkMeta(link);
        return (
          <motion.a
            key={link.id || link.url}
            variants={cardPop}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles['pbl-compact-icon']}
            style={{ background: `${color}1A`, color: color, borderColor: `${color}40` }}
            whileTap={{ scale: 0.9 }}
            onClick={trackClick}
            title={link.title || link.platform}
          >
            {icon}
          </motion.a>
        );
      })}
    </motion.div>
  );

  // Page-level CSS custom properties injected inline — every child inherits theme
  const pageThemeVars = {
    '--pbl-bg':      bgColor,
    '--pbl-text':    textColor,
    '--pbl-accent':  accentColor,
    background:      backgroundImage || bgColor,
    backgroundAttachment: backgroundImage ? 'fixed' : 'scroll',
    color:           textColor,
  };

  return (
    <div className={styles['pbl-page']} style={pageThemeVars}>
      <div className={styles['pbl-card']}>

        {/* ── Profile ─────────────────────────────────────── */}
        <motion.div
          className={styles['pbl-profile-section']}
          initial="hidden"
          animate="show"
          variants={stagger}
        >
          {/* Avatar */}
          <motion.div variants={fadeUp} className={styles['pbl-avatar-ring']}>
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={profile.displayName || username}
                className={styles['pbl-avatar-img']}
                onError={e => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div className={styles['pbl-avatar-placeholder']}>
                <User size={34} />
              </div>
            )}
          </motion.div>

          {/* Display name */}
          <motion.h1 variants={fadeUp} className={styles['pbl-display-name']} style={{ color: textColor }}>
            {profile.displayName || username}
          </motion.h1>



          {/* Tagline — hidden if system username */}
          {safeTagline && (
            <motion.p variants={fadeUp} className={styles['pbl-tagline']} style={{ color: `${textColor}99` }}>
              {safeTagline}
            </motion.p>
          )}
        </motion.div>

        {/* ── Top Social Icons (if layout is socialsTop or socialsTopBottom) ── */}
        {['socialsTop', 'socialsTopBottom'].includes(layoutStyle) && socialPills.length > 0 && renderIconOnlySocials()}


        {/* ── Tab switcher ─────────────────────────────────── */}
        {hasShop && (
          <motion.div
            className={styles['pbl-tab-row']}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, type: 'spring', stiffness: 300 }}
          >
            <button
              id="pbl-tab-links"
              className={`${styles['pbl-tab-btn']} ${activeView === 'links' ? styles['pbl-tab-btn--active'] : ''}`}
              style={activeView === 'links' ? tabActiveStyle : {}}
              onClick={() => setActiveView('links')}
            >
              Links
            </button>
            <button
              id="pbl-tab-shop"
              className={`${styles['pbl-tab-btn']} ${activeView === 'shop' ? styles['pbl-tab-btn--active'] : ''}`}
              style={activeView === 'shop' ? tabActiveStyle : {}}
              onClick={() => setActiveView('shop')}
            >
              Shop
            </button>
          </motion.div>
        )}

        {/* ── Content ──────────────────────────────────────── */}
        <AnimatePresence mode="wait">

          {activeView === 'links' && (
            <motion.div
              key="links"
              className={styles['pbl-content-area']}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: -8, transition: { duration: 0.14 } }}
              variants={stagger}
            >
              {displayLinks.length === 0 ? (
                <motion.p
                  variants={fadeUp}
                  style={{ textAlign: 'center', color: 'rgba(255,255,255,0.22)', fontSize: 13, padding: '28px 0' }}
                >
                  No links added yet.
                </motion.p>
              ) : isPreviewMode ? (
                <Reorder.Group
                  axis="y"
                  values={displayLinks}
                  onReorder={(newDisplayLinks) => {
                    const SOCIAL_IDS = ['instagram','youtube','twitter','tiktok','facebook','linkedin','twitch','spotify','discord','github','snapchat','pinterest','telegram'];
                    const hasSocialLayout = ['socialsTop', 'socialsBottom', 'socialsTopBottom'].includes(layoutStyle);
                    
                    let finalLinks;
                    if (hasSocialLayout) {
                      // Social links are displayed separately as pills, so merge back
                      const socialPills = allLinks.filter(l => 
                        (l.icon === 'platform' || SOCIAL_IDS.includes(l.icon?.toLowerCase?.())) && 
                        SOCIAL_IDS.includes(l.platform?.toLowerCase?.())
                      );
                      const mergedLinks = [];
                      let displayIndex = 0;
                      (data.links || []).forEach(link => {
                        const isSocial = socialPills.some(sp => sp.id === link.id);
                        if (isSocial) {
                          mergedLinks.push(link);
                        } else {
                          if (newDisplayLinks[displayIndex]) {
                            mergedLinks.push(newDisplayLinks[displayIndex]);
                            displayIndex++;
                          }
                        }
                      });
                      while (displayIndex < newDisplayLinks.length) {
                        mergedLinks.push(newDisplayLinks[displayIndex]);
                        displayIndex++;
                      }
                      finalLinks = mergedLinks;
                    } else {
                      // No social separation — displayLinks IS allLinks, just use the new order directly
                      finalLinks = newDisplayLinks;
                    }
                    
                    finalLinks.forEach((l, pos) => {
                      l.position = pos;
                    });
                    setData(prev => ({ ...prev, links: finalLinks }));
                    window.parent.postMessage({ type: 'BIOLINK_REORDER', category: 'links', data: finalLinks }, '*');
                  }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: 0, margin: 0, listStyle: 'none' }}
                >
                  {displayLinks.map(link => (
                    <Reorder.Item
                      key={link.id || link.url}
                      value={link}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', listStyle: 'none', position: 'relative' }}
                    >
                      <div className="pbl-preview-drag-handle">
                        <GripVertical size={18} />
                      </div>
                      <div style={{ flex: 1 }} onClick={(e) => e.preventDefault()}>
                        <LinkRow link={link} onTrackClick={trackClick} themeStyle={linkCardTheme} />
                      </div>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              ) : (
                displayLinks.map(link => (
                  <LinkRow key={link.id || link.url} link={link} onTrackClick={trackClick} themeStyle={linkCardTheme} />
                ))
              )}
            </motion.div>
          )}

          {activeView === 'shop' && (
            <motion.div
              key="shop"
              className={styles['pbl-shop-grid']}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: -8, transition: { duration: 0.14 } }}
              variants={stagger}
            >
              {products.length === 0 ? (
                <motion.p
                  variants={fadeUp}
                  style={{ textAlign: 'center', color: 'rgba(255,255,255,0.22)', fontSize: 13, padding: '28px 0' }}
                >
                  No products added yet.
                </motion.p>
              ) : isPreviewMode ? (
                <Reorder.Group
                  axis="y"
                  values={products}
                  onReorder={(newProducts) => {
                    newProducts.forEach((p, pos) => {
                      p.position = pos;
                    });
                    setData(prev => ({ ...prev, products: newProducts }));
                    window.parent.postMessage({ type: 'BIOLINK_REORDER', category: 'products', data: newProducts }, '*');
                  }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: 0, margin: 0, width: '100%', listStyle: 'none' }}
                >
                  {products.map(product => (
                    <Reorder.Item
                      key={product.id || product._id}
                      value={product}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', listStyle: 'none', position: 'relative' }}
                    >
                      <div className="pbl-preview-drag-handle">
                        <GripVertical size={18} />
                      </div>
                      <div style={{ flex: 1 }} onClick={(e) => e.preventDefault()}>
                        <ProductCard
                          product={product}
                          apiBase={apiBase}
                          themeStyle={linkCardTheme}
                        />
                      </div>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              ) : (
                products.map(product => (
                  <ProductCard
                    key={product.id || product._id}
                    product={product}
                    apiBase={apiBase}
                    themeStyle={linkCardTheme}
                  />
                ))
              )}
            </motion.div>
          )}

        </AnimatePresence>

        {/* ── Custom elements (text, gallery, CTA, video etc.) ─ */}
        {elements.length > 0 && (
          <motion.div
            className={styles['pbl-elements-section']}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.38 }}
          >
            {isPreviewMode ? (
              <Reorder.Group
                axis="y"
                values={elements.sort((a, b) => (a.position || 0) - (b.position || 0))}
                onReorder={(newElements) => {
                  const updatedElements = newElements.map((el, pos) => ({
                    ...el,
                    position: pos
                  }));
                  setData(prev => ({ ...prev, elements: updatedElements }));
                  window.parent.postMessage({ type: 'BIOLINK_REORDER', category: 'elements', data: updatedElements }, '*');
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: 0, margin: 0, listStyle: 'none' }}
              >
                {elements
                  .sort((a, b) => (a.position || 0) - (b.position || 0))
                  .map(el => (
                    <Reorder.Item
                      key={el.id}
                      value={el}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', listStyle: 'none', position: 'relative' }}
                    >
                      <div className="pbl-preview-drag-handle">
                        <GripVertical size={18} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <BioLinkElement
                          element={el}
                          isPreview={true}
                          settings={settings}
                        />
                      </div>
                    </Reorder.Item>
                  ))}
              </Reorder.Group>
            ) : (
              elements
                .sort((a, b) => (a.position || 0) - (b.position || 0))
                .map(el => (
                  <BioLinkElement
                    key={el.id}
                    element={el}
                    isPreview={true}
                    settings={settings}
                  />
                ))
            )}
          </motion.div>
        )}

        {/* ── Bottom Social Icons (if layout is socialsBottom or socialsTopBottom) ── */}
        {['socialsBottom', 'socialsTopBottom'].includes(layoutStyle) && socialPills.length > 0 && (
          <div style={{ marginTop: '32px', marginBottom: '8px' }}>
            {renderIconOnlySocials()}
          </div>
        )}

        {/* ── Watermark ────────────────────────────────────── */}
        <div className={styles['pbl-watermark']}>
          <Sparkles size={10} />
          <span>Powered by <a href="https://sotix.ai" target="_blank" rel="noopener noreferrer">Sotix AI</a></span>
        </div>

      </div>
    </div>
  );
};

export default PublicBioLink;
