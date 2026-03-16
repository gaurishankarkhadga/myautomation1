import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, Share2, Copy, Check, ExternalLink, ArrowLeft } from 'lucide-react';
import './BioLinkTemplate.css';
import BioLinkElement from './BioLinkElement';

const BioLinkTemplate = ({ isPreview = false, biolink = null, user = null }) => {
  const [selectedTheme, setSelectedTheme] = useState('minimal');
  const [selectedColors, setSelectedColors] = useState({
    primary: '#3b82f6',
    secondary: '#64748b',
    background: '#0b1220'
  });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [activeColor, setActiveColor] = useState(null);
  const [urlCopied, setUrlCopied] = useState(false);
  const [currentUser, setCurrentUser] = useState(user);
  const location = useLocation();
  const navigate = useNavigate();

  const themes = [
    {
      id: 'minimal',
      name: 'Minimal',
      description: 'Clean and simple design',
      preview: '/minimal-preview.png'
    },
    {
      id: 'modern',
      name: 'Modern',
      description: 'Bold and contemporary style',
      preview: '/modern-preview.png'
    }
  ];

  const colorPalettes = [
    { primary: '#3b82f6', secondary: '#64748b', background: '#0b1220' },
    { primary: '#10b981', secondary: '#6b7280', background: '#0f172a' },
    { primary: '#f59e0b', secondary: '#7c3aed', background: '#1e1b4b' },
    { primary: '#ef4444', secondary: '#8b5cf6', background: '#1e293b' },
    { primary: '#06b6d4', secondary: '#0891b2', background: '#0e1626' }
  ];

  useEffect(() => {
    if (user) {
      setCurrentUser(user);
    } else if (!biolink && !isPreview) {
      fetchUserProfile();
    }
  }, [user, biolink, isPreview]);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/profile/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const handleThemeSelect = (themeId) => {
    setSelectedTheme(themeId);
  };

  const handleColorSelect = (colorType, color) => {
    setSelectedColors(prev => ({
      ...prev,
      [colorType]: color
    }));
  };

  const copyUrl = async () => {
    const url = `bio.link/${currentUser?.username || 'username'}`;
    try {
      await navigator.clipboard.writeText(url);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  const shareBiolink = () => {
    const url = `bio.link/${currentUser?.username || 'username'}`;
    if (navigator.share) {
      navigator.share({
        title: 'Check out my BioLink!',
        url: url
      });
    } else {
      copyUrl();
    }
  };

  const goToEditor = () => {
    navigate('/biolink/editor', { state: { template: selectedTheme, selectedColors } });
  };

  // Render preview mode with actual biolink data
  if (isPreview && biolink) {
    const settings = biolink.settings || {};
    const profile = biolink.profile || {};
    const links = Array.isArray(biolink.links) ? biolink.links : [];
    const elements = Array.isArray(biolink.elements) ? biolink.elements : [];
    const accent = settings.accentColor || '#3b82f6';
    
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#0b1220', 
        padding: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: 420, 
          maxWidth: '100%',
          background: '#0e1626', 
          borderRadius: 20,
          padding: 24, 
          border: '1px solid rgba(255,255,255,0.05)',
          boxShadow: '0 30px 60px rgba(0,0,0,0.4)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ 
              width: 96, 
              height: 96, 
              margin: '0 auto 16px', 
              borderRadius: '50%', 
              overflow: 'hidden', 
              background: '#1b2540', 
              border: `3px solid ${accent}` 
            }}>
              {profile.avatar && (
                <img 
                  src={profile.avatar.startsWith('http') ? profile.avatar : `${import.meta.env.VITE_BACKEND_URL}${profile.avatar}`} 
                  alt="avatar" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              )}
            </div>
            <h2 style={{ margin: 0, color: '#e5e7eb', fontSize: 28, fontWeight: 800 }}>
              {profile.displayName || currentUser?.displayName || currentUser?.username || 'Your Name'}
            </h2>
            {profile.tagline && <p style={{ margin: '8px 0 0', color: '#a5b4fc' }}>{profile.tagline}</p>}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginTop: 16 }} />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {links.filter(l => l.isActive !== false).map((link) => (
              <div key={link.id} style={{ 
                background: accent, 
                color: '#fff', 
                padding: '14px 18px', 
                borderRadius: 14, 
                textAlign: 'center', 
                fontWeight: 700,
                letterSpacing: 0.3
              }}>
                {link.title || link.platform || link.url}
              </div>
            ))}
          </div>

          {elements.length > 0 && (
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {elements.map((el) => (
                <BioLinkElement key={el.id} element={el} isPreview={true} settings={settings} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="biolink-template-container">
      <div className="biolink-template-header">
        <h2>Choose Your Theme</h2>
        <p>Select a theme and customize colors for your BioLink</p>
      </div>

      <div className="biolink-template-content">
        <div className="biolink-template-themes-section">
          <h3>Themes</h3>
          <div className="biolink-template-themes-grid">
            {themes.map((theme) => (
              <div
                key={theme.id}
                className={`biolink-template-theme-card ${selectedTheme === theme.id ? 'biolink-template-selected' : ''}`}
                onClick={() => handleThemeSelect(theme.id)}
              >
                <div className={`biolink-template-theme-preview-small ${theme.id}`}>
                  <div className="biolink-template-preview-avatar"></div>
                  <div className="biolink-template-preview-links">
                    <div className="biolink-template-preview-link"></div>
                    <div className="biolink-template-preview-link"></div>
                  </div>
                </div>
                <h4>{theme.name}</h4>
                <p>{theme.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="biolink-template-colors-section">
          <h3>Color Scheme</h3>
          <div className="biolink-template-color-palettes">
            {colorPalettes.map((palette, index) => (
              <div
                key={index}
                className={`biolink-template-color-palette ${JSON.stringify(selectedColors) === JSON.stringify(palette) ? 'biolink-template-selected' : ''}`}
                onClick={() => setSelectedColors(palette)}
              >
                <div className="biolink-template-color-swatch biolink-template-primary" style={{ backgroundColor: palette.primary }}></div>
                <div className="biolink-template-color-swatch biolink-template-secondary" style={{ backgroundColor: palette.secondary }}></div>
                <div className="biolink-template-color-swatch biolink-template-background" style={{ backgroundColor: palette.background }}></div>
              </div>
            ))}
          </div>
        </div>

        <div className="biolink-template-customization-section">
          <h3>Customize Colors</h3>
          <div className="biolink-template-color-inputs">
            <div className="biolink-template-color-input">
              <label>Primary Color</label>
              <div className="biolink-template-color-picker-wrapper">
                <div 
                  className="biolink-template-color-preview" 
                  style={{ backgroundColor: selectedColors.primary }}
                  onClick={() => {
                    setActiveColor('primary');
                    setShowColorPicker(true);
                  }}
                ></div>
                <input
                  type="color"
                  value={selectedColors.primary}
                  onChange={(e) => handleColorSelect('primary', e.target.value)}
                  className="biolink-template-color-input-field"
                />
              </div>
            </div>

            <div className="biolink-template-color-input">
              <label>Secondary Color</label>
              <div className="biolink-template-color-picker-wrapper">
                <div 
                  className="biolink-template-color-preview" 
                  style={{ backgroundColor: selectedColors.secondary }}
                  onClick={() => {
                    setActiveColor('secondary');
                    setShowColorPicker(true);
                  }}
                ></div>
                <input
                  type="color"
                  value={selectedColors.secondary}
                  onChange={(e) => handleColorSelect('secondary', e.target.value)}
                  className="biolink-template-color-input-field"
                />
              </div>
            </div>

            <div className="biolink-template-color-input">
              <label>Background Color</label>
              <div className="biolink-template-color-picker-wrapper">
                <div 
                  className="biolink-template-color-preview" 
                  style={{ backgroundColor: selectedColors.background }}
                  onClick={() => {
                    setActiveColor('background');
                    setShowColorPicker(true);
                  }}
                ></div> 
                <input 
                  type="color"
                  value={selectedColors.background} 
                  onChange={(e) => handleColorSelect('background', e.target.value)}
                  className="biolink-template-color-input-field"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="biolink-template-actions">
          <button className="biolink-template-btn biolink-template-btn-secondary" onClick={() => navigate('/biolink/home')}>
            Back
          </button>
          <button className="biolink-template-btn biolink-template-btn-primary" onClick={goToEditor}>
            Continue to Editor
          </button>
        </div>
      </div>
    </div>
  );
};

export default BioLinkTemplate;
