import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Instagram, Youtube, Twitter, Facebook, Linkedin, Twitch,
  Music2, Globe, Github, MessageCircle, ExternalLink,
  ShoppingBag, Link2, Sparkles, ChevronRight, User, PackageOpen,
  Send, Pin, Play
} from 'lucide-react';
import BioLinkElement from './BioLinkElement';
import styles from './PublicBioLink.module.css';

// ─────────────────────────────────────────────────────────────────────────────
// Platform icon resolver
// Supports both lucide-react icons AND inline SVG (for platforms lucide lacks)
// ─────────────────────────────────────────────────────────────────────────────
const TikTokIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.17.63 2.33 1.52 3.11.77.66 1.81 1.02 2.84 1.04v4.14c-.91-.02-1.83-.28-2.67-.79-.34-.22-.65-.49-.94-.8v6.79c0 2.3-1.86 4.17-4.15 4.17s-4.15-1.87-4.15-4.17 1.86-4.17 4.15-4.17c.18 0 .35.01.53.02V11.5c-.18-.01-.35-.02-.53-.02-3.68 0-6.67 2.99-6.67 6.67s2.99 6.67 6.67 6.67 6.67-2.99 6.67-6.67V.02h-.18z"/>
  </svg>
);

const SpotifyIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);

const DiscordIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
  </svg>
);

// Map platform id → JSX icon component
const PLATFORM_ICON_MAP = {
  instagram:  <Instagram  size={17} />,
  youtube:    <Youtube    size={17} />,
  twitter:    <Twitter    size={17} />,
  facebook:   <Facebook   size={17} />,
  linkedin:   <Linkedin   size={17} />,
  twitch:     <Twitch     size={17} />,
  github:     <Github     size={17} />,
  discord:    <DiscordIcon size={17} />,
  spotify:    <SpotifyIcon size={17} />,
  tiktok:     <TikTokIcon  size={17} />,
  snapchat:   <MessageCircle size={17} />,
  pinterest:  <Pin         size={17} />,
  telegram:   <Send        size={17} />,
  website:    <Globe       size={17} />,
  link:       <Link2       size={17} />,
};

// Detect platform from URL if platform field is missing/generic
function detectPlatformFromUrl(url) {
  if (!url) return null;
  const u = url.toLowerCase();
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('twitter.com') || u.includes('x.com')) return 'twitter';
  if (u.includes('facebook.com') || u.includes('fb.com')) return 'facebook';
  if (u.includes('linkedin.com')) return 'linkedin';
  if (u.includes('tiktok.com')) return 'tiktok';
  if (u.includes('twitch.tv')) return 'twitch';
  if (u.includes('github.com')) return 'github';
  if (u.includes('discord.gg') || u.includes('discord.com')) return 'discord';
  if (u.includes('spotify.com')) return 'spotify';
  if (u.includes('snapchat.com')) return 'snapchat';
  if (u.includes('pinterest.com')) return 'pinterest';
  if (u.includes('t.me') || u.includes('telegram.me')) return 'telegram';
  return null;
}

// Resolve the best icon for a link
function getLinkIcon(link) {
  // 1. If icon is 'platform', use the platform field
  if (link.icon === 'platform' && link.platform) {
    return PLATFORM_ICON_MAP[link.platform.toLowerCase()] || <Globe size={17} />;
  }
  // 2. If platform is set and known
  if (link.platform && link.platform !== 'website' && PLATFORM_ICON_MAP[link.platform.toLowerCase()]) {
    return PLATFORM_ICON_MAP[link.platform.toLowerCase()];
  }
  // 3. Try to detect from URL
  const detected = detectPlatformFromUrl(link.url);
  if (detected) return PLATFORM_ICON_MAP[detected];
  // 4. Emoji icon fallback
  if (link.icon && link.icon !== 'platform' && link.icon.length <= 3) {
    return <span style={{ fontSize: 15, lineHeight: 1 }}>{link.icon}</span>;
  }
  // 5. Default
  return <Globe size={17} />;
}

// ─── Animation variants ───────────────────────────────────────────────────────
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const fadeSlide = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 340, damping: 28 } },
};
const scaleIn = {
  hidden: { opacity: 0, scale: 0.93, y: 10 },
  show:   { opacity: 1, scale: 1,    y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

// ─── Loading Screen ───────────────────────────────────────────────────────────
function LoadingScreen({ username }) {
  return (
    <div className={styles['pbl-loading']}>
      <div className={styles['pbl-spinner']} />
      <p className={styles['pbl-loading-text']}>Loading @{username}</p>
    </div>
  );
}

// ─── Error Screen ─────────────────────────────────────────────────────────────
function ErrorScreen({ username }) {
  return (
    <div className={styles['pbl-error']}>
      <Globe size={40} style={{ color: 'rgba(255,255,255,0.15)', marginBottom: 8 }} />
      <p className={styles['pbl-error-title']}>Not Found</p>
      <p className={styles['pbl-error-msg']}>
        @{username} hasn't published their BioLink yet.
      </p>
    </div>
  );
}

// ─── Individual Link Row ──────────────────────────────────────────────────────
function LinkRow({ link, onTrackClick }) {
  return (
    <motion.a
      variants={scaleIn}
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className={styles['pbl-link-card']}
      onClick={onTrackClick}
      whileTap={{ scale: 0.965 }}
    >
      <div className={styles['pbl-link-icon-wrap']}>
        {getLinkIcon(link)}
      </div>
      <span className={styles['pbl-link-title']}>
        {link.title || link.platform || link.url}
      </span>
      <span className={styles['pbl-link-arrow']}>
        <ChevronRight size={15} />
      </span>
    </motion.a>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ product, apiBase }) {
  const imgSrc = product.image
    ? product.image.startsWith('http') ? product.image : `${apiBase}${product.image}`
    : null;

  return (
    <motion.a
      variants={scaleIn}
      href={product.url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className={styles['pbl-product-card']}
      whileTap={{ scale: 0.95 }}
    >
      <div className={styles['pbl-product-img-wrap']}>
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={product.name}
            className={styles['pbl-product-img']}
            onError={e => { e.target.style.display = 'none'; e.target.parentElement.classList.add(styles['pbl-product-img-wrap--empty']); }}
          />
        ) : (
          <div className={styles['pbl-product-img-placeholder']}>
            <PackageOpen size={26} />
          </div>
        )}
        <div className={styles['pbl-product-badge']}>
          <ShoppingBag size={12} />
        </div>
      </div>
      <div className={styles['pbl-product-info']}>
        <p className={styles['pbl-product-name']}>{product.name || 'Product'}</p>
        {product.price && (
          <p className={styles['pbl-product-price']}>{product.price}</p>
        )}
      </div>
    </motion.a>
  );
}

// ─── Main Public BioLink Component ───────────────────────────────────────────
const PublicBioLink = () => {
  const { username } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('links');

  const apiBase = import.meta.env.VITE_API_BASE_URL || '';

  useEffect(() => {
    if (!username) return;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${apiBase}/api/biolinks/public/${encodeURIComponent(username)}`);
        if (!res.ok) throw new Error(`${res.status}`);
        const json = await res.json();
        if (!json.biolink) throw new Error('No biolink data');
        setData(json.biolink);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [username]);

  if (loading) return <LoadingScreen username={username} />;
  if (error || !data) return <ErrorScreen username={username} />;

  // ── Derived data ──────────────────────────────────────────────────────────
  const profile = data.profile || {};
  const settings = data.settings || {};
  const allLinks = (data.links || []).filter(l => l.isActive !== false);
  const products = (data.products || []);
  const elements = (data.elements || []).filter(el => el.isActive !== false);
  const hasShop = products.length > 0;

  // Separate social quick-links from regular links
  const SOCIAL_IDS = ['instagram','youtube','twitter','tiktok','facebook','linkedin','twitch','spotify','discord','github','snapchat','pinterest','telegram'];
  const socialLinks  = allLinks.filter(l => SOCIAL_IDS.includes(l.platform?.toLowerCase?.()) || SOCIAL_IDS.includes(detectPlatformFromUrl(l.url)));
  const regularLinks = allLinks.filter(l => !SOCIAL_IDS.includes(l.platform?.toLowerCase?.()) || l.icon !== 'platform');
  // Ensure no duplicate between social pills and link rows — show everything in link rows,
  // show social pills as an additional quick-access row (only show pills if links exist that are truly social platform links)
  const trulySocial = allLinks.filter(l => (l.icon === 'platform' && SOCIAL_IDS.includes(l.platform?.toLowerCase?.())));
  const nonSocialLinks = allLinks.filter(l => !(l.icon === 'platform' && SOCIAL_IDS.includes(l.platform?.toLowerCase?.())));

  // Avatar URL
  const avatarSrc = profile.avatar
    ? profile.avatar.startsWith('http') ? profile.avatar : `${apiBase}${profile.avatar}`
    : null;

  const trackClick = () => {
    fetch(`${apiBase}/api/biolinks/click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    }).catch(() => {});
  };

  return (
    <div className={styles['pbl-page']}>
      <div className={styles['pbl-card']}>

        {/* ── Profile Header ───────────────────────────────────── */}
        <motion.div
          className={styles['pbl-profile-section']}
          initial="hidden"
          animate="show"
          variants={stagger}
        >
          {/* Avatar with spinning ring */}
          <motion.div variants={fadeSlide} className={styles['pbl-avatar-ring']}>
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
          <motion.h1 variants={fadeSlide} className={styles['pbl-display-name']}>
            {profile.displayName || username}
          </motion.h1>

          {/* Username handle */}
          <motion.p variants={fadeSlide} className={styles['pbl-username']}>
            @{username}
          </motion.p>

          {/* Tagline */}
          {profile.tagline && (
            <motion.p variants={fadeSlide} className={styles['pbl-tagline']}>
              {profile.tagline}
            </motion.p>
          )}
        </motion.div>

        {/* ── Social platform quick-pills ────────────────────────── */}
        {trulySocial.length > 0 && (
          <motion.div
            className={styles['pbl-social-row']}
            initial="hidden"
            animate="show"
            variants={stagger}
          >
            {trulySocial.map(link => (
              <motion.a
                key={link.id || link.url}
                variants={scaleIn}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles['pbl-social-pill']}
                whileTap={{ scale: 0.92 }}
                onClick={trackClick}
              >
                {getLinkIcon(link)}
                <span>{link.title || link.platform}</span>
              </motion.a>
            ))}
          </motion.div>
        )}

        {/* ── Tab switcher ──────────────────────────────────────── */}
        {hasShop && (
          <motion.div
            className={styles['pbl-tab-row']}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
          >
            <button
              id="pbl-tab-links"
              className={`${styles['pbl-tab-btn']} ${activeView === 'links' ? styles['pbl-tab-btn--active'] : ''}`}
              onClick={() => setActiveView('links')}
            >
              Links
            </button>
            <button
              id="pbl-tab-shop"
              className={`${styles['pbl-tab-btn']} ${activeView === 'shop' ? styles['pbl-tab-btn--active'] : ''}`}
              onClick={() => setActiveView('shop')}
            >
              Shop
            </button>
          </motion.div>
        )}

        {/* ── Main Content ─────────────────────────────────────── */}
        <AnimatePresence mode="wait">

          {/* Links view */}
          {activeView === 'links' && (
            <motion.div
              key="view-links"
              className={styles['pbl-content-area']}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}
              variants={stagger}
            >
              {allLinks.length === 0 ? (
                <motion.p
                  variants={fadeSlide}
                  style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 13, padding: '24px 0' }}
                >
                  No links yet.
                </motion.p>
              ) : (
                allLinks.map(link => (
                  <LinkRow key={link.id || link.url} link={link} onTrackClick={trackClick} />
                ))
              )}
            </motion.div>
          )}

          {/* Shop view */}
          {activeView === 'shop' && (
            <motion.div
              key="view-shop"
              className={styles['pbl-shop-grid']}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}
              variants={stagger}
            >
              {products.map(product => (
                <ProductCard key={product.id || product._id} product={product} apiBase={apiBase} />
              ))}
            </motion.div>
          )}

        </AnimatePresence>

        {/* ── Custom elements (text, video, gallery, CTA etc.) ── */}
        {elements.length > 0 && (
          <motion.div
            className={styles['pbl-elements-section']}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            {elements
              .sort((a, b) => (a.position || 0) - (b.position || 0))
              .map(el => (
                <BioLinkElement
                  key={el.id}
                  element={el}
                  isPreview={true}
                  settings={settings}
                />
              ))}
          </motion.div>
        )}

        {/* ── Sotix watermark ──────────────────────────────────── */}
        <div className={styles['pbl-watermark']}>
          <Sparkles size={10} />
          <span>Powered by <a href="https://sotix.ai" target="_blank" rel="noopener noreferrer">Sotix AI</a></span>
        </div>

      </div>
    </div>
  );
};

export default PublicBioLink;
