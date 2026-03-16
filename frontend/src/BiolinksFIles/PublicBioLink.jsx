import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import BioLinkElement from '../subpages/BioLinkElement';

const PublicBioLink = () => {
  const { username } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('links');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Loading biolink for username:', username);
        
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        const url = `${backendUrl}/api/biolinks/public/${encodeURIComponent(username)}`;
        console.log('Fetching from:', url);
        
        const res = await fetch(url);
        console.log('Response status:', res.status);
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error('Error response:', errorText);
          throw new Error(`Failed to load biolink (${res.status}): ${errorText}`);
        }
        
        const json = await res.json();
        console.log('Received data:', json);
        
        // Debug avatar URL construction
        if (json.biolink?.profile?.avatar) {
          const avatarUrl = json.biolink.profile.avatar.startsWith('http') 
            ? json.biolink.profile.avatar 
            : `${import.meta.env.VITE_BACKEND_URL}${json.biolink.profile.avatar}`;
          console.log('Avatar URL will be:', avatarUrl);
        }
        
        if (!json.biolink) {
          throw new Error('No biolink data received');
        }
        
        setData(json.biolink);
      } catch (e) {
        console.error('Error loading biolink:', e);
        setError(e.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    
    if (username) {
      load();
    }
  }, [username]);

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#0b1220',
        color: '#e5e7eb'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>Loading...</div>
          <div style={{ fontSize: '14px', color: '#a5b4fc' }}>Loading BioLink for @{username}</div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#0b1220',
        color: '#e5e7eb'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>Error</div>
          <div style={{ fontSize: '14px', color: '#ef4444' }}>{error}</div>
          <div style={{ fontSize: '12px', color: '#a5b4fc', marginTop: '8px' }}>
            Username: {username}
          </div>
        </div>
      </div>
    );
  }
  
  if (!data) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#0b1220',
        color: '#e5e7eb'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>Not Found</div>
          <div style={{ fontSize: '14px', color: '#a5b4fc' }}>
            BioLink for @{username} not found or not published
          </div>
        </div>
      </div>
    );
  }

  const settings = data.settings || {};
  const profile = data.profile || {};
  const links = Array.isArray(data.links) ? data.links : [];
  const products = Array.isArray(data.products) ? data.products : [];
  const elements = Array.isArray(data.elements) ? data.elements : [];
  const theme = data.theme || data.templateId || 'minimal';
  const styleType = settings.styleType || (theme === 'glass' ? 'glass' : theme === 'modern' ? 'timeline' : theme === 'creative' ? 'perspective' : 'default');

  const pageBg = settings.backgroundImage
    ? `url(${settings.backgroundImage.startsWith('http') ? settings.backgroundImage : (import.meta.env.VITE_BACKEND_URL || '') + settings.backgroundImage}) center / cover`
    : '#0b1220';

  const phoneBg = (settings.backgroundColor || '#000').includes('gradient')
    ? settings.backgroundColor
    : settings.backgroundColor || '#000';

  const getPlatformIcon = (platformId) => {
    const socialPlatforms = [
      { 
        id: 'instagram', 
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
        )
      },
      { 
        id: 'youtube', 
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
          </svg>
        )
      },
      { 
        id: 'tiktok', 
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.17.63 2.33 1.52 3.11.77.66 1.81 1.02 2.84 1.04v4.14c-.91-.02-1.83-.28-2.67-.79-.34-.22-.65-.49-.94-.8-.03-.03-.06-.06-.09-.09-.06-.05-.12-.09-.18-.13-.03-.02-.05-.04-.08-.05-.1-.06-.2-.11-.31-.16-.13-.06-.26-.1-.4-.15-.13-.04-.26-.09-.39-.12-.14-.04-.28-.06-.43-.08-.1-.01-.19-.03-.29-.03h-.03c-.1 0-.19.01-.29.03-.14.02-.29.04-.43.08-.13.03-.26.07-.39.12-.13.05-.27.09-.4.15-.1.05-.2.1-.31.16-.03.01-.05.03-.08.05-.06.04-.12.08-.18.13-.03.03-.06.06-.09.09-.29.31-.6.58-.94.8-.84.51-1.76.77-2.67.79v4.14c0 2.3-1.86 4.17-4.15 4.17s-4.15-1.87-4.15-4.17 1.86-4.17 4.15-4.17c.18 0 .35.01.53.02v-2.5c-.18-.01-.35-.02-.53-.02-3.68 0-6.67 2.99-6.67 6.67s2.99 6.67 6.67 6.67 6.67-2.99 6.67-6.67v-11.5c.02-.17.05-.34.1-.51.03-.1.07-.2.12-.3.05-.1.1-.2.16-.29.03-.05.07-.1.11-.15.04-.05.08-.1.13-.14.04-.05.09-.09.14-.13.05-.04.1-.08.15-.12.05-.03.1-.07.15-.1.06-.04.11-.07.17-.1.05-.03.1-.06.16-.09.06-.03.12-.05.18-.08.06-.02.12-.05.18-.07"/>
          </svg>
        )
      },
      { 
        id: 'twitter', 
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.954 4.569c-.885.389-1.83.654-2.825.775 1.014-.611 1.794-1.574 2.163-2.723-.951.555-2.005.959-3.127 1.184-.896-.959-2.173-1.559-3.591-1.559-2.717 0-4.92 2.203-4.92 4.917 0 .39.045.765.127 1.124C7.691 8.094 4.066 6.13 1.64 3.161c-.427.722-.666 1.561-.666 2.475 0 1.71.87 3.213 2.188 4.096-.807-.026-1.566-.248-2.228-.616v.061c0 2.385 1.693 4.374 3.946 4.827-.413.111-.849.171-1.296.171-.314 0-.615-.03-.916-.086.631 1.953 2.445 3.377 4.604 3.417-1.68 1.319-3.809 2.105-6.102 2.105-.39 0-.779-.023-1.17-.067 2.189 1.394 4.768 2.209 7.557 2.209 9.054 0 13.999-7.503 13.999-13.986 0-.209 0-.42-.015-.63.961-.689 1.8-1.56 2.46-2.548l-.047-.02z"/>
          </svg>
        )
      },
      { 
        id: 'facebook', 
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z"/>
          </svg>
        )
      },
      { 
        id: 'linkedin', 
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
        )
      },
      { 
        id: 'spotify', 
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
        )
      },
      { 
        id: 'website', 
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.99 6.58c.28.1.51.26.69.47l-5.52 3.2c-.16.09-.34.15-.54.15-.2 0-.38-.06-.54-.15l-5.51-3.2c.18-.21.41-.37.69-.47.9-.36 1.89-.56 2.9-.56 1.01 0 2 .2 2.9.56.3.12.57.28.82.46.25-.18.52-.34.82-.46zM12 4.4c.72 0 1.42.12 2.08.36l-2.08 1.2-2.08-1.2c.66-.24 1.36-.36 2.08-.36zm-6.6 9.6c0-.2.02-.4.05-.6l3.35 1.94c.16.09.34.15.54.15.2 0 .38-.06.54-.15l3.35-1.94c.03.2.05.4.05.6v4.8c0 .22-.18.4-.4.4H6.4c-.22 0-.4-.18-.4-.4v-4.8zm7.2 0c0-.2.02-.4.05-.6l3.35 1.94c.16.09.34.15.54.15.2 0 .38-.06.54-.15l3.35-1.94c.03.2.05.4.05.6v4.8c0 .22-.18.4-.4.4h-7.2c-.22 0-.4-.18-.4-.4v-4.8z"/>
          </svg>
        )
      },
      { 
        id: 'discord', 
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
        )
      },
      { 
        id: 'twitch', 
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
          </svg>
        )
      },
      { 
        id: 'github', 
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        )
      },
      { 
        id: 'snapchat', 
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.347-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.750-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24c6.624 0 11.99-5.367 11.99-12.013C24.007 5.367 18.641.001 12.017.001z"/>
          </svg>
        )
      },
      { 
        id: 'pinterest', 
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.347-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.750-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24c6.624 0 11.99-5.367 11.99-12.013C24.007 5.367 18.641.001 12.017.001z"/>
          </svg>
        )
      }
    ];
    
    const platform = socialPlatforms.find(p => p.id === platformId);
    return platform ? platform.icon : null;
  };

  const linkStyleFor = () => {
    if (styleType === 'glass') {
      return {
        background: 'rgba(51, 51, 51, 0.8)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: '#ffffff',
        boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(10px)'
      };
    }
    if (styleType === 'timeline') {
      return {
        background: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        color: '#ffffff',
        backdropFilter: 'blur(10px)'
      };
    }
    if (styleType === 'perspective') {
      return {
        background: '#ffffff',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        color: '#000000',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
      };
    }
    return {
      background: settings.accentColor || '#3b82f6',
      color: settings.textColor || '#ffffff'
    };
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: pageBg,
      padding: 24
    }}>
      <div style={{
        width: 280,
        height: 500,
        borderRadius: 25,
        padding: '32px 24px',
        boxShadow: '0 30px 60px rgba(0,0,0,0.4)',
        background: phoneBg,
        color: settings.textColor || '#ffffff',
        border: styleType === 'glass' || styleType === 'timeline' ? '3px solid rgba(255,255,255,0.3)' : '3px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        overflowY: 'auto',
        overflowX: 'hidden',
        msOverflowStyle: 'none',
        scrollbarWidth: 'none'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ width: 80, height: 80, margin: '0 auto 16px', borderRadius: '9999px', overflow: 'hidden', border: '3px solid rgba(255,255,255,0.3)' }}>
            {profile.avatar ? (
              <img
                src={profile.avatar.startsWith('http') ? profile.avatar : `${import.meta.env.VITE_BACKEND_URL}${profile.avatar}`}
                alt="avatar"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: 'inherit' }}
                onError={(e) => {
                  console.error('Avatar image failed to load:', e.target.src);
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.1)',
                color: 'currentColor',
                fontSize: '24px'
              }}>
                👤
              </div>
            )}
          </div>
          <h2 style={{ margin: 0, color: settings.textColor || '#ffffff', fontSize: 22, fontWeight: 800 }}>{profile.displayName || username}</h2>
          {profile.tagline && <p style={{ margin: '8px 0 0', color: settings.textColor || '#ffffff' }}>{profile.tagline}</p>}
        </div>

        {products.length > 0 && (
          <div style={{ 
            display: 'flex', 
            backgroundColor: settings.accentColor || '#8b5cf6', 
            borderRadius: '25px', 
            padding: '4px', 
            marginBottom: '16px',
            width: '100%',
            maxWidth: '200px'
          }}>
            <button
              onClick={() => setActiveView('links')}
              style={{
                flex: 1,
                padding: '8px 16px',
                border: 'none',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                backgroundColor: activeView === 'links' ? '#ffffff' : 'transparent',
                color: activeView === 'links' ? (settings.accentColor || '#8b5cf6') : '#ffffff'
              }}
            >
              LINK
            </button>
            <button
              onClick={() => setActiveView('shop')}
              style={{
                flex: 1,
                padding: '8px 16px',
                border: 'none',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                backgroundColor: activeView === 'shop' ? '#ffffff' : 'transparent',
                color: activeView === 'shop' ? (settings.accentColor || '#8b5cf6') : '#ffffff'
              }}
            >
              SHOP
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', flex: '1 1 auto' }}>
          {activeView === 'links' && links.filter(l => l.isActive !== false).map((link) => (
            <a
              key={link.id || link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                height: 50,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 16px',
                textDecoration: 'none',
                ...linkStyleFor()
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {link.icon === 'platform' ? (
                    getPlatformIcon(link.platform) || <span style={{ fontSize: '16px' }}>🔗</span>
                  ) : link.icon ? (
                    <span style={{ fontSize: '16px' }}>{link.icon}</span>
                  ) : (
                    <span style={{ fontSize: '16px' }}>🌐</span>
                  )}
                </div>
                <span>{link.title || link.platform || link.url}</span>
              </div>
              <div style={{ width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </div>
            </a>
          ))}

          {activeView === 'shop' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              width: '100%'
            }}>
              {products.map((product) => (
                <a
                  key={product.id}
                  href={product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    textDecoration: 'none',
                    color: 'inherit',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{
                    position: 'relative',
                    width: '100%',
                    height: '140px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    backgroundColor: 'rgba(255,255,255,0.1)'
                  }}>
                    {product.image ? (
                      <img
                        src={product.image.startsWith('http') ? product.image : `${import.meta.env.VITE_BACKEND_URL}${product.image}`}
                        alt={product.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block'
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = `
                            <div style="
                              width: 100%; 
                              height: 100%; 
                              display: flex; 
                              align-items: center; 
                              justify-content: center; 
                              background: rgba(255,255,255,0.1);
                              color: currentColor;
                              font-size: 18px;
                            ">
                              📦
                            </div>
                          `;
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(255,255,255,0.1)',
                        color: 'currentColor',
                        fontSize: '18px'
                      }}>
                        📦
                      </div>
                    )}
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      width: '32px',
                      height: '32px',
                      background: 'rgba(255, 255, 255, 0.9)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backdropFilter: 'blur(10px)'
                    }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#ff4757" stroke="#ff4757" strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      lineHeight: '1.2',
                      color: settings.textColor || '#ffffff',
                      margin: 0
                    }}>
                      {product.name}
                    </div>
                    {product.price && (
                      <div style={{
                        fontSize: '12px',
                        fontWeight: '700',
                        color: settings.textColor || '#ffffff',
                        opacity: 0.8,
                        margin: 0
                      }}>
                        {product.price}
                      </div>
                    )}
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {elements.length > 0 && (
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16, width: '100%', flex: '1 1 auto' }}>
            {elements.map((el) => (
              <BioLinkElement key={el.id} element={el} isPreview={true} settings={settings} />
            ))}
          </div>
        )}
      </div>
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default PublicBioLink;


