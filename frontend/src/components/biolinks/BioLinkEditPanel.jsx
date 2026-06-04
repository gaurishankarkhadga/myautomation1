import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { debounce } from 'lodash';
import {
  Plus, Eye, Share2, User, FileText, Link, MousePointer,
  GripHorizontal, X, Palette, Upload, Camera, Video, Minus,
  Smartphone, ChevronLeft, ChevronRight, ArrowLeft,
  ChevronUp, ChevronDown, Edit2, Trash2
} from 'lucide-react';
import BioLinkElement from './BioLinkElement';
import './BioLinkEditPanel.css';

// Helper: build auth headers from platform credentials
const getBioLinkAuthHeaders = () => {
  const headers = {};
  const instaUserId = localStorage.getItem('insta_user_id');
  const ytChannelId = localStorage.getItem('yt_channel_id');
  if (instaUserId) headers['X-Insta-UserId'] = instaUserId;
  if (ytChannelId) headers['X-YT-ChannelId'] = ytChannelId;
  return headers;
};

const hasPlatformAuth = () => {
  return !!(localStorage.getItem('insta_token') || localStorage.getItem('yt_channel_id'));
};

const getMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
  return `${import.meta.env.VITE_API_BASE_URL || ''}${url}`;
};

const BioLinkEditPanel = ({ user: userProp = null, biolink: biolinkProp = null, onUpdate }) => {
  const navigate = useNavigate();
  const safeColor = (color) => {
    if (!color || typeof color !== 'string') return '#000000';
    if (color.startsWith('#')) return color.substring(0, 7);
    return '#000000'; // Fallback for gradients or complex values
  };
  const [currentStep, setCurrentStep] = useState(0);
  const [previewActiveView, setPreviewActiveView] = useState('links');
  const [showPreview, setShowPreview] = useState(false);
  const stepIds = ['profile', 'links', 'shop', 'themes', 'others'];
  const activeSection = stepIds[currentStep] || 'profile';

  const goNext = () => {
    const nextStep = Math.min(currentStep + 1, stepIds.length - 1);
    setCurrentStep(nextStep);
    scrollToStep(nextStep);
  };

  const goBack = () => {
    const prevStep = Math.max(currentStep - 1, 0);
    setCurrentStep(prevStep);
    scrollToStep(prevStep);
  };

  const sliderRef = useRef(null);

  const scrollToStep = (index) => {
    if (sliderRef.current) {
      const containerWidth = sliderRef.current.clientWidth;
      sliderRef.current.scrollTo({
        left: index * containerWidth,
        behavior: 'smooth'
      });
    }
  };

  const handleScroll = () => {
    if (!sliderRef.current) return;
    const scrollLeft = sliderRef.current.scrollLeft;
    const containerWidth = sliderRef.current.clientWidth;
    // Calculate which step represents the majority of the view
    const newStep = Math.round(scrollLeft / containerWidth);
    if (newStep !== currentStep && newStep >= 0 && newStep < stepIds.length) {
      setCurrentStep(newStep);
    }
  };


  // Touch Swipe Handlers for mobile navigation removed in favor of native scroll-snap using sliderRef


  const normalizeBiolink = (raw) => {
    if (!raw) return {
      _id: undefined,
      profile: { avatar: '', displayName: '', tagline: '', bio: '' },
      links: [],
      products: [],
      theme: 'minimal',
      elements: [],
      settings: { backgroundColor: 'var(--bg)', textColor: 'var(--text-primary)', accentColor: 'var(--accent)' },
      username: ''
    };
    return {
      _id: raw._id,
      profile: { avatar: '', displayName: '', tagline: '', bio: '', ...(raw.profile || {}) },
      links: Array.isArray(raw.links) ? raw.links : [],
      products: Array.isArray(raw.products) ? raw.products : [],
      theme: raw.theme || 'minimal',
      elements: Array.isArray(raw.elements) ? raw.elements : [],
      settings: {
        backgroundColor: 'var(--bg)',
        textColor: 'var(--text-primary)',
        accentColor: 'var(--accent)',
        layoutStyle: 'default',
        ...(raw.settings || {})
      },
      username: raw.username || userProp?.username || ''
    };
  };

  const [biolinkData, setBiolinkData] = useState(normalizeBiolink(biolinkProp));
  const [isNew, setIsNew] = useState(false);
  const [isLoading, setIsLoading] = useState(!biolinkProp);
  const [autoSaveStatus, setAutoSaveStatus] = useState('saved');
  const [isSaving, setIsSaving] = useState(false);
  const debouncedAutoSave = useRef(
    debounce(() => {
      autoSave();
    }, 1000)
  ).current;
  const [user, setUser] = useState(userProp);
  const [showElementPopup, setShowElementPopup] = useState(false);
  const [showAddProductForm, setShowAddProductForm] = useState(false);
  const [editingProductIndex, setEditingProductIndex] = useState(null);
  const [productFormData, setProductFormData] = useState({
    name: '',
    description: '',
    price: '',
    image: '',
    url: ''
  });
  const [productImageUploading, setProductImageUploading] = useState(false);
  const fileInputRef = useRef(null);
  const isHydratingRef = useRef(false);
  const appliedTemplateRef = useRef(false);
  const location = useLocation();
  const editIdRef = useRef(null);
  const savingRef = useRef(false);
  const biolinkDataRef = useRef(biolinkData);

  // Keep ref in sync with state for accurate auto-saves
  useEffect(() => {
    biolinkDataRef.current = biolinkData;
  }, [biolinkData]);

  const sections = [
    { id: 'profile', label: 'Profile Settings', icon: <User size={20} />, color: 'var(--primary-color)' },
    { id: 'links', label: 'Social Links', icon: <Link size={20} />, color: 'var(--accent-color)' },
    { id: 'shop', label: 'Shop Products', icon: <MousePointer size={20} />, color: 'var(--success-color)' },
    { id: 'themes', label: 'Choose Theme', icon: <Palette size={20} />, color: 'var(--secondary-color)' },
    { id: 'others', label: 'Media Content', icon: <FileText size={20} />, color: 'var(--info-color)' }
  ];

  const themes = [
    { id: 'hydra', name: 'Hydra', description: 'Soft brand poster', styles: { backgroundColor: 'var(--surface)', textColor: 'var(--text-primary)', accentColor: 'var(--primary)', styleType: 'default' } },
    { id: 'glass', name: 'Glass Morphism', description: 'Modern transparency with depth', styles: { backgroundColor: 'var(--glass-bg)', textColor: 'var(--text-primary)', accentColor: 'var(--glass-border)', styleType: 'glass' } },
    { id: 'cinematic', name: 'Cinematic Poster', description: 'Gradient poster', styles: { backgroundColor: 'var(--bg-gradient)', textColor: 'var(--text-primary)', accentColor: 'var(--secondary)', styleType: 'default' } },
    {
      id: 'minimal',
      name: 'Minimal',
      description: 'Clean and simple design',
      styles: { backgroundColor: 'var(--bg)', textColor: 'var(--text-primary)', accentColor: 'var(--primary)', styleType: 'default' }
    },
    {
      id: 'modern',
      name: 'Timeline Story',
      description: 'Tell your story chronologically',
      styles: { backgroundColor: 'var(--bg)', textColor: 'var(--text-primary)', accentColor: 'var(--border)', styleType: 'timeline' }
    },
    {
      id: 'creative',
      name: '3D Perspective',
      description: 'Stand out with depth & dimension',
      styles: { backgroundColor: 'var(--surface-2)', textColor: 'var(--text-primary)', accentColor: 'var(--accent)', styleType: 'perspective' }
    }
  ];

  const socialPlatforms = [
    {
      id: 'instagram',
      name: 'Instagram',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      ),
      urlPrefix: 'https://instagram.com/'
    },
    {
      id: 'youtube',
      name: 'YouTube',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
        </svg>
      ),
      urlPrefix: 'https://youtube.com/'
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.17.63 2.33 1.52 3.11.77.66 1.81 1.02 2.84 1.04v4.14c-.91-.02-1.83-.28-2.67-.79-.34-.22-.65-.49-.94-.8-.03-.03-.06-.06-.09-.09-.06-.05-.12-.09-.18-.13-.03-.02-.05-.04-.08-.05-.1-.06-.2-.11-.31-.16-.13-.06-.26-.1-.4-.15-.13-.04-.26-.09-.39-.12-.14-.04-.28-.06-.43-.08-.1-.01-.19-.03-.29-.03h-.03c-.1 0-.19.01-.29.03-.14.02-.29.04-.43.08-.13.03-.26.07-.39.12-.13.05-.27.09-.4.15-.1.05-.2.1-.31.16-.03.01-.05.03-.08.05-.06.04-.12.08-.18.13-.03.03-.06.06-.09.09-.29.31-.6.58-.94.8-.84.51-1.76.77-2.67.79v4.14c0 2.3-1.86 4.17-4.15 4.17s-4.15-1.87-4.15-4.17 1.86-4.17 4.15-4.17c.18 0 .35.01.53.02v-2.5c-.18-.01-.35-.02-.53-.02-3.68 0-6.67 2.99-6.67 6.67s2.99 6.67 6.67 6.67 6.67-2.99 6.67-6.67v-11.5c.02-.17.05-.34.1-.51.03-.1.07-.2.12-.3.05-.1.1-.2.16-.29.03-.05.07-.1.11-.15.04-.05.08-.1.13-.14.04-.05.09-.09.14-.13.05-.04.1-.08.15-.12.05-.03.1-.07.15-.1.06-.04.11-.07.17-.1.05-.03.1-.06.16-.09.06-.03.12-.05.18-.08.06-.02.12-.05.18-.07" />
        </svg>
      ),
      urlPrefix: 'https://tiktok.com/'
    },
    {
      id: 'twitter',
      name: 'Twitter',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.954 4.569c-.885.389-1.83.654-2.825.775 1.014-.611 1.794-1.574 2.163-2.723-.951.555-2.005.959-3.127 1.184-.896-.959-2.173-1.559-3.591-1.559-2.717 0-4.92 2.203-4.92 4.917 0 .39.045.765.127 1.124C7.691 8.094 4.066 6.13 1.64 3.161c-.427.722-.666 1.561-.666 2.475 0 1.71.87 3.213 2.188 4.096-.807-.026-1.566-.248-2.228-.616v.061c0 2.385 1.693 4.374 3.946 4.827-.413.111-.849.171-1.296.171-.314 0-.615-.03-.916-.086.631 1.953 2.445 3.377 4.604 3.417-1.68 1.319-3.809 2.105-6.102 2.105-.39 0-.779-.023-1.17-.067 2.189 1.394 4.768 2.209 7.557 2.209 9.054 0 13.999-7.503 13.999-13.986 0-.209 0-.42-.015-.63.961-.689 1.8-1.56 2.46-2.548l-.047-.02z" />
        </svg>
      ),
      urlPrefix: 'https://twitter.com/'
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" />
        </svg>
      ),
      urlPrefix: 'https://facebook.com/'
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      ),
      urlPrefix: 'https://linkedin.com/in/'
    },
    {
      id: 'spotify',
      name: 'Spotify',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
        </svg>
      ),
      urlPrefix: 'https://open.spotify.com/'
    },
    {
      id: 'website',
      name: 'Website',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.99 6.58c.28.1.51.26.69.47l-5.52 3.2c-.16.09-.34.15-.54.15-.2 0-.38-.06-.54-.15l-5.51-3.2c.18-.21.41-.37.69-.47.9-.36 1.89-.56 2.9-.56 1.01 0 2 .2 2.9.56.3.12.57.28.82.46.25-.18.52-.34.82-.46zM12 4.4c.72 0 1.42.12 2.08.36l-2.08 1.2-2.08-1.2c.66-.24 1.36-.36 2.08-.36zm-6.6 9.6c0-.2.02-.4.05-.6l3.35 1.94c.16.09.34.15.54.15.2 0 .38-.06.54-.15l3.35-1.94c.03.2.05.4.05.6v4.8c0 .22-.18.4-.4.4H6.4c-.22 0-.4-.18-.4-.4v-4.8zm7.2 0c0-.2.02-.4.05-.6l3.35 1.94c.16.09.34.15.54.15.2 0 .38-.06.54-.15l3.35-1.94c.03.2.05.4.05.6v4.8c0 .22-.18.4-.4.4h-7.2c-.22 0-.4-.18-.4-.4v-4.8z" />
        </svg>
      ),
      urlPrefix: 'https://'
    },
    {
      id: 'discord',
      name: 'Discord',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
      ),
      urlPrefix: 'https://discord.gg/'
    },
    {
      id: 'twitch',
      name: 'Twitch',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
        </svg>
      ),
      urlPrefix: 'https://twitch.tv/'
    },
    {
      id: 'github',
      name: 'GitHub',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
      ),
      urlPrefix: 'https://github.com/'
    },
    {
      id: 'snapchat',
      name: 'Snapchat',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.347-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.750-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24c6.624 0 11.99-5.367 11.99-12.013C24.007 5.367 18.641.001.017 0z" />
        </svg>
      ),
      urlPrefix: 'https://snapchat.com/add/'
    },
    {
      id: 'pinterest',
      name: 'Pinterest',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.347-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.750-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24c6.624 0 11.99-5.367 11.99-12.013C24.007 5.367 18.641.001 12.017.001z" />
        </svg>
      ),
      urlPrefix: 'https://pinterest.com/'
    }
  ];

  // Initialize data when props change
  useEffect(() => {
    if (userProp) {
      setUser(userProp);
      setBiolinkData(prev => ({
        ...prev,
        username: userProp.username || prev.username
      }));
    }
  }, [userProp]);

  useEffect(() => {
    const editId = location?.state?.id;
    if (editId) {
      // Always load the specific biolink when an id is provided
      editIdRef.current = editId;
      setIsLoading(true);
      loadBiolinkById(editId);
      return;
    }
    // Creating a new biolink — clear all old state
    if (location?.state?.new || location?.state?.reset) {
      editIdRef.current = null;
      setIsNew(true);
      setBiolinkData(normalizeBiolink(null));
      setIsLoading(false);
      return;
    }
    if (biolinkProp) {
      const normalized = normalizeBiolink(biolinkProp);
      isHydratingRef.current = true;
      editIdRef.current = biolinkProp._id;
      setBiolinkData({ ...normalized, _id: biolinkProp._id });
      setIsNew(false);
      setIsLoading(false);
    } else if (!userProp) {
      // Only fetch if no props provided
      fetchUserProfile();
      loadBiolinkData();
    } else {
      setIsLoading(false);
    }
  }, [biolinkProp, userProp, location?.state?.id]);

  // Apply template from localStorage (from template picker)
  useEffect(() => {
    // Wait until initial load/hydration completes
    if (isLoading || appliedTemplateRef.current) return;
    // Do not auto-apply templates if an existing biolink with content is present
    const hasExistingContent =
      !!biolinkProp?._id ||
      !!biolinkData?._id ||
      (Array.isArray(biolinkData?.links) && biolinkData.links.length > 0) ||
      (Array.isArray(biolinkData?.elements) && biolinkData.elements.length > 0);
    if (hasExistingContent && !isNew) return;
    const selectedTemplate = localStorage.getItem('selectedTemplate');
    if (!selectedTemplate) return;

    const templateMap = {
      '3d-perspective': 'creative',
      'timeline-story': 'modern',
      'glass-morphism': 'glass'
    };

    const themeId = templateMap[selectedTemplate] || selectedTemplate;
    const selectedTheme = themes.find(t => t.id === themeId);

    setBiolinkData(prev => ({
      ...prev,
      theme: themeId,
      settings: { ...prev.settings, ...selectedTheme?.styles }
    }));

    const starterLinks = themeId === 'creative'
      ? [
        { id: 'l1', title: 'My Work', url: 'https://', platform: 'website', isActive: true },
        { id: 'l2', title: 'My Story', url: 'https://', platform: 'website', isActive: true },
        { id: 'l3', title: 'Get in Touch', url: 'https://', platform: 'website', isActive: true }
      ]
      : themeId === 'modern'
        ? [
          { id: 'l1', title: 'Full Story', url: 'https://', platform: 'website', isActive: true },
          { id: 'l2', title: 'Connect', url: 'https://', platform: 'website', isActive: true }
        ]
        : [
          { id: 'l1', title: 'About', url: 'https://', platform: 'website', isActive: true },
          { id: 'l2', title: 'Projects', url: 'https://', platform: 'website', isActive: true },
          { id: 'l3', title: 'Blog', url: 'https://', platform: 'website', isActive: true },
          { id: 'l4', title: 'Contact', url: 'https://', platform: 'website', isActive: true }
        ];

    // Only seed starter content when creating new biolinks
    setBiolinkData(prev => ({
      ...prev,
      links: (isNew || !hasExistingContent) ? starterLinks : prev.links,
      elements: (isNew || !hasExistingContent) ? [] : prev.elements
    }));

    localStorage.removeItem('selectedTemplate');
    appliedTemplateRef.current = true;
    setAutoSaveStatus('saving');
    setTimeout(autoSave, 2000);
  }, [isLoading]);

  // Apply template passed via navigation state (from template picker)
  useEffect(() => {
    if (!location || !location.state) return;
    const { template, selectedColors, reset, new: newFlag } = location.state;
    if (template) {
      const selectedTheme = themes.find(t => t.id === template);
      // Only apply theme styles if we're creating new or there is no existing content
      const hasExistingContent =
        !!biolinkProp?._id ||
        !!biolinkData?._id ||
        (Array.isArray(biolinkData?.links) && biolinkData.links.length > 0) ||
        (Array.isArray(biolinkData?.elements) && biolinkData.elements.length > 0);
      setBiolinkData(prev => ({
        ...prev,
        theme: template,
        settings: { ...prev.settings, ...selectedTheme?.styles }
      }));
      appliedTemplateRef.current = true;
    }
    if (selectedColors) {
      setBiolinkData(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          backgroundColor: selectedColors.background || prev.settings.backgroundColor,
          accentColor: selectedColors.primary || prev.settings.accentColor,
          textColor: selectedColors.secondary || prev.settings.textColor
        }
      }));
    }
    if (reset) {
      // Only reset when explicitly creating a new biolink and no saved one exists yet
      const hasSaved = !!biolinkProp?._id || !!biolinkData?._id;
      if (!hasSaved) {
        setBiolinkData(prev => ({
          ...prev,
          links: [],
          elements: []
        }));
      }
    }
    if (newFlag) {
      setIsNew(true);
      // Only initialize fresh state if there is no saved biolink
      const hasSaved = !!biolinkProp?._id || !!biolinkData?._id;
      if (!hasSaved) {
        setBiolinkData(prev => ({ ...normalizeBiolink(null), theme: prev.theme, settings: prev.settings }));
      }
    }
    setAutoSaveStatus('saving');
    setTimeout(autoSave, 2000);
  }, [location]);

  // Auto-save interval
  useEffect(() => {
    const autoSaveInterval = setInterval(autoSave, 60000); // Changed from 30000 to 60000 (60 seconds)
    return () => clearInterval(autoSaveInterval);
  }, [biolinkData]);

  // Notify parent after state commits to avoid setState during render warnings
  useEffect(() => {
    if (onUpdate) {
      if (isHydratingRef.current) {
        isHydratingRef.current = false;
        return;
      }
      onUpdate(biolinkData);
    }
  }, [biolinkData]);

  const fetchUserProfile = async () => {
    try {
      if (!hasPlatformAuth()) {
        console.log('No platform auth found, skipping profile fetch');
        setIsLoading(false);
        return;
      }

      // Profile fetch is optional — BioLink works without it
      const backendUrl = import.meta.env.VITE_API_BASE_URL;
      const authHeaders = getBioLinkAuthHeaders();
      const response = await fetch(`${backendUrl}/api/biolinks/data`, {
        headers: { ...authHeaders }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setUser(data.user);
          setBiolinkData(prev => ({
            ...prev,
            profile: {
              ...prev.profile,
              displayName: prev.profile?.displayName || data.user.displayName || data.user.username,
              tagline: prev.profile?.tagline || 'Your tagline here'
            },
            username: prev.username || data.user.username
          }));
        }
      } else {
        console.log('Profile fetch failed:', response.status);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBiolinkData = async () => {
    try {
      if (!hasPlatformAuth()) {
        console.log('No platform auth, skipping biolink data load');
        setIsLoading(false);
        return;
      }

      const authHeaders = getBioLinkAuthHeaders();
      const backendUrl = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(`${backendUrl}/api/biolinks/data`, {
        headers: { ...authHeaders }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user) setUser(data.user);
        if (data.biolink) {
          const normalized = normalizeBiolink(data.biolink);
          editIdRef.current = data.biolink._id;
          setBiolinkData(normalized);
        }
      } else {
        console.log('Biolink data load failed:', response.status);
      }
    } catch (error) {
      console.error('Error loading biolink data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBiolinkById = async (id) => {
    try {
      if (!hasPlatformAuth()) return;
      const authHeaders = getBioLinkAuthHeaders();
      const backendUrl = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(`${backendUrl}/api/biolinks/data?id=${encodeURIComponent(id)}`, {
        headers: { ...authHeaders }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.user) setUser(data.user);
        if (data.biolink) {
          const normalized = normalizeBiolink(data.biolink);
          editIdRef.current = data.biolink._id;
          setBiolinkData({ ...normalized, _id: data.biolink._id });
          setIsNew(false);
        }
      }
    } catch (error) {
      console.error('Error loading biolink by id:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);
    if (biolinkData._id) {
      formData.append('id', biolinkData._id);
    }

    try {
      const authHeaders = getBioLinkAuthHeaders();
      const backendUrl = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(`${backendUrl}/api/biolinks/avatar`, {
        method: 'POST',
        headers: { ...authHeaders },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        updateSection('profile', { avatar: data.avatarUrl });
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
    }
  };

  const publishBiolink = async () => {
    try {
      if (!hasPlatformAuth()) {
        alert('Please connect Instagram or YouTube to publish your BioLink');
        return;
      }

      // Ensure the very latest edits are saved before publishing
      setAutoSaveStatus('saving');
      await autoSave();

      // Validate required data — must have a saved _id
      const currentId = biolinkData._id || editIdRef.current;
      if (!currentId) {
        alert('Please save your BioLink before publishing');
        return;
      }

      // Always prompt the user for the URL slug they want
      let username = prompt(
        'Choose a unique URL for this BioLink (e.g., "myname" → /p/myname):',
        biolinkData.username || ''
      );
      if (!username) return; // User cancelled
      username = username.trim();

      // Validate username format
      if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        alert('Username can only contain letters, numbers, underscores, and hyphens');
        return;
      }

      const authHeaders = getBioLinkAuthHeaders();
      const backendUrl = import.meta.env.VITE_API_BASE_URL;

      // Attempt to publish - retry with a new username if taken
      let attempts = 0;
      while (attempts < 3) {
        const publishData = { id: currentId, username: username };
        console.log('Publishing with data:', publishData);
        const response = await fetch(`${backendUrl}/api/biolinks/publish`, {
          method: 'POST',
          headers: {
            ...authHeaders,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(publishData)
        });

        if (response.ok) {
          const data = await response.json();
          const publishedUsername = data?.biolink?.username || username;
          const publishedUrl = (data?.url || `${window.location.origin}/p/${publishedUsername}`);
          // Update local state with the published username
          setBiolinkData(prev => ({ ...prev, username: publishedUsername }));
          alert(`BioLink published successfully! Your BioLink: ${publishedUrl}`);
          window.open(publishedUrl, '_blank');
          return;
        } else {
          const errorText = await response.text();
          let parsed;
          try { parsed = JSON.parse(errorText); } catch { }

          if (parsed?.error === 'Username already taken') {
            // Prompt user for a different username
            const newUsername = prompt(
              `The username "${username}" is already taken by another BioLink.\n\nEnter a different unique username (e.g., "${username}-2" or "${username}-portfolio"):`
            );
            if (!newUsername) return; // User cancelled
            if (!/^[a-zA-Z0-9_-]+$/.test(newUsername.trim())) {
              alert('Username can only contain letters, numbers, underscores, and hyphens');
              return;
            }
            username = newUsername.trim();
            attempts++;
          } else {
            console.error('Publish failed:', response.status, errorText);
            console.error('Publish error details:', parsed);
            alert(`Failed to publish: ${parsed?.error || errorText || 'Unknown error'}`);
            return;
          }
        }
      }
      alert('Could not publish after multiple attempts. Please try a completely different username.');
    } catch (error) {
      console.error('Error publishing biolink:', error);
      alert('Error publishing BioLink. Please check your connection.');
    }
  };

  const updateSection = (sectionId, data) => {
    setBiolinkData(prev => {
      const next = {
        ...prev,
        [sectionId]: { ...prev[sectionId], ...data },
        username: prev.username || user?.username
      };
      return next;
    });
    setAutoSaveStatus('saving');
    setTimeout(autoSave, 2000); // Changed from 1000 to 2000ms
  };

  const handleGalleryUpload = async (elementId, files) => {
    try {
      const fileList = Array.from(files);

      // Upload images to backend
      const formData = new FormData();
      fileList.forEach(file => {
        formData.append('images', file);
      });

      const authHeaders = getBioLinkAuthHeaders();
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/biolinks/gallery/upload`, {
        method: 'POST',
        headers: { ...authHeaders },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        const imageUrls = data.images.map(url => `${import.meta.env.VITE_API_BASE_URL}${url}`);

        const element = biolinkData.elements.find(el => el.id === elementId);
        if (element) {
          const updatedContent = {
            ...element.content,
            images: [...(element.content.images || []), ...imageUrls]
          };
          updateElement(elementId, { content: updatedContent });
        }
      } else {
        const errorData = await response.text();
        console.error('Gallery upload failed:', response.status, errorData);
        alert('Failed to upload gallery images. Please try again.');
      }
    } catch (error) {
      console.error('Error uploading gallery images:', error);
      alert('Error uploading gallery images. Please try again.');
    }
  };

  const handleVideoUpload = async (elementId, file) => {
    try {
      if (!file) return;

      const formData = new FormData();
      formData.append('video', file);

      const authHeaders = getBioLinkAuthHeaders();
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/biolinks/video`, {
        method: 'POST',
        headers: { ...authHeaders },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        const videoUrl = data.videoUrl.startsWith('http') ? data.videoUrl : `${import.meta.env.VITE_API_BASE_URL}${data.videoUrl}`;

        updateElement(elementId, {
          content: {
            ...biolinkData.elements.find(el => el.id === elementId)?.content,
            url: videoUrl,
            source: 'upload'
          }
        });
        setAutoSaveStatus('saving');
        setTimeout(autoSave, 2000);
      } else {
        const errorData = await response.text();
        console.error('Video upload failed:', response.status, errorData);
        alert('Failed to upload video. Please try again.');
      }
    } catch (error) {
      console.error('Error uploading video:', error);
      alert('Error uploading video. Please try again.');
    }
  };

  const autoSave = async () => {
    // Prevent concurrent saves which create duplicate biolinks
    if (savingRef.current) {
      console.log('Save already in progress, skipping');
      return;
    }
    savingRef.current = true;
    try {
      if (!hasPlatformAuth()) {
        console.log('No platform auth, skipping auto-save');
        return;
      }

      const authHeaders = getBioLinkAuthHeaders();
      const backendUrl = import.meta.env.VITE_API_BASE_URL;
      
      // ALWAYS use the ref to get the freshest data, solving the "vanishes after a few seconds" bug
      const currentData = biolinkDataRef.current;
      
      // Use editIdRef as the source of truth for _id (it updates synchronously)
      const currentId = currentData._id || editIdRef.current;
      
      const payload = {
        ...currentData,
        _id: currentId || undefined,
        _new: (isNew && !currentId) ? true : undefined,
        username: currentData.username || undefined
      };

      console.log('Auto-saving with payload:', { _id: currentId, isNew });

      const response = await fetch(`${backendUrl}/api/biolinks/save`, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.biolink?._id) {
          // Store _id in ref immediately (synchronous) so next save uses it
          editIdRef.current = data.biolink._id;
          setBiolinkData(prev => ({ ...prev, _id: data.biolink._id, username: data.biolink.username || prev.username }));
          setIsNew(false);
        }
        setAutoSaveStatus('saved');
        console.log('Auto-save successful, _id:', data?.biolink?._id);
      } else {
        const errorText = await response.text();
        console.error('Auto-save failed:', response.status, errorText);
        setAutoSaveStatus('error');
      }
    } catch (error) {
      console.error('Error auto-saving:', error);
      setAutoSaveStatus('error');
    } finally {
      savingRef.current = false;
    }
  };

  const addLink = () => {
    const newLink = {
      id: `link_${Date.now()}`,
      title: 'New Link',
      url: 'https://',
      platform: 'website',
      icon: '🌐',
      isActive: true
    };
    setBiolinkData(prev => {
      const next = { ...prev, links: [...prev.links, newLink] };
      return next;
    });
    setAutoSaveStatus('saving');
    setTimeout(autoSave, 2000);
  };

  const handlePlatformChange = useCallback((linkId, platformId) => {
    const platform = socialPlatforms.find(p => p.id === platformId);
    if (platform) {
      setBiolinkData(prev => {
        const next = {
          ...prev,
          links: (prev.links || []).map(link => {
            if (link.id === linkId) {
              return {
                ...link,
                platform: platformId,
                title: platform.name,
                url: platform.urlPrefix,
                icon: platform.icon ? 'platform' : '🌐'
              };
            }
            return link;
          })
        };
        return next;
      });
      setAutoSaveStatus('saving');
      debouncedAutoSave();
    }
  }, [socialPlatforms, debouncedAutoSave]);

  const updateLink = (linkId, updates) => {
    setBiolinkData(prev => {
      const next = {
        ...prev,
        links: (prev.links || []).map(link =>
          link.id === linkId ? { ...link, ...updates } : link
        )
      };
      return next;
    });
    setAutoSaveStatus('saving');
    debouncedAutoSave();
  };

  const removeLink = (index) => {
    setBiolinkData(prev => ({
      ...prev,
      links: prev.links.filter((_, i) => i !== index)
    }));
  };

  const addProduct = () => {
    setBiolinkData(prev => ({
      ...prev,
      products: [...prev.products, {
        id: Date.now(),
        name: '',
        description: '',
        price: '',
        image: '',
        url: '',
        category: ''
      }]
    }));
    setAutoSaveStatus('saving');
    debouncedAutoSave();
  };

  const updateProduct = (index, field, value) => {
    setBiolinkData(prev => ({
      ...prev,
      products: prev.products.map((product, i) =>
        i === index ? { ...product, [field]: value } : product
      )
    }));
    setAutoSaveStatus('saving');
    debouncedAutoSave();
  };

  const removeProduct = (index) => {
    setBiolinkData(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index)
    }));
    setAutoSaveStatus('saving');
    debouncedAutoSave();
  };

  const handleProductImageUpload = async (index, file) => {
    if (!file) return;

    const formData = new FormData();
    formData.append('productImage', file);

    try {
      const authHeaders = getBioLinkAuthHeaders();
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/biolinks/product-image`, {
        method: 'POST',
        headers: { ...authHeaders },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        const imageUrl = `${import.meta.env.VITE_API_BASE_URL}${data.imageUrl}`;

        updateProduct(index, 'image', imageUrl);
      } else {
        console.error('Product image upload failed:', response.status);
        alert('Failed to upload product image. Please try again.');
      }
    } catch (error) {
      console.error('Error uploading product image:', error);
      alert('Error uploading product image. Please try again.');
    }
  };

  const handleNewProductImageUpload = async (file) => {
    if (!file) return;
    setProductImageUploading(true);
    const formData = new FormData();
    formData.append('productImage', file);

    try {
      const authHeaders = getBioLinkAuthHeaders();
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/biolinks/product-image`, {
        method: 'POST',
        headers: { ...authHeaders },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        const imageUrl = `${import.meta.env.VITE_API_BASE_URL}${data.imageUrl}`;
        setProductFormData(prev => ({ ...prev, image: imageUrl }));
      } else {
        console.error('Product image upload failed:', response.status);
        alert('Failed to upload product image. Please try again.');
      }
    } catch (error) {
      console.error('Error uploading product image:', error);
      alert('Error uploading product image. Please try again.');
    } finally {
      setProductImageUploading(false);
    }
  };



  const changeTheme = (themeId) => {
    const selectedTheme = themes.find(t => t.id === themeId);
    if (selectedTheme) {
      setBiolinkData(prev => {
        const next = {
          ...prev,
          theme: themeId,
          settings: { ...prev.settings, ...selectedTheme.styles }
        };
        return next;
      });
      setAutoSaveStatus('saving');
      setTimeout(autoSave, 2000);
    }
  };

  const addElement = (elementType) => {
    const newElement = {
      id: `element_${Date.now()}`,
      type: elementType,
      content: getDefaultElementContent(elementType),
      position: biolinkData.elements.length,
      isActive: true
    };
    setBiolinkData(prev => {
      const next = { ...prev, elements: [...prev.elements, newElement] };
      return next;
    });
    setShowElementPopup(false);
    setAutoSaveStatus('saving');
    setTimeout(autoSave, 2000);
  };

  const getDefaultElementContent = (type) => {
    switch (type) {
      case 'gallery': return { images: [], captions: [] };
      case 'video': return { url: '', caption: '', source: 'upload', displayMode: 'single' };
      case 'separator': return { style: 'line', color: '#8b5cf6', height: '2px' };
      case 'cta': return { text: 'Click Here', url: 'https://', style: 'button' };
      case 'text': return { content: 'Add your text here', alignment: 'left' };

      default: return {};
    }
  };

  const updateElement = (elementId, updates) => {
    setBiolinkData(prev => {
      const next = {
        ...prev,
        elements: prev.elements.map(element => element.id === elementId ? { ...element, ...updates } : element)
      };
      return next;
    });
    setAutoSaveStatus('saving');
    setTimeout(autoSave, 2000);
  };

  const removeElement = (elementId) => {
    setBiolinkData(prev => {
      const next = { ...prev, elements: prev.elements.filter(element => element.id !== elementId) };
      return next;
    });
    setAutoSaveStatus('saving');
    setTimeout(autoSave, 2000);
  };

  const handleDragStart = (e, elementId, index) => {
    e.dataTransfer.setData('elementId', elementId);
    e.dataTransfer.setData('elementIndex', index);
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    const draggedElementId = e.dataTransfer.getData('elementId');
    const draggedIndex = parseInt(e.dataTransfer.getData('elementIndex'));

    if (draggedIndex !== dropIndex) {
      setBiolinkData(prev => {
        const newElements = [...prev.elements];
        const [draggedElement] = newElements.splice(draggedIndex, 1);
        newElements.splice(dropIndex, 0, draggedElement);

        newElements.forEach((el, pos) => {
          el.position = pos;
        });

        const next = { ...prev, elements: newElements };
        return next;
      });
      setAutoSaveStatus('saving');
      setTimeout(autoSave, 2000);
    }
  };

  const handleLinkDragStart = (e, linkId, index) => {
    e.dataTransfer.setData('linkId', linkId);
    e.dataTransfer.setData('linkIndex', index);
  };

  const handleLinkDrop = (e, dropIndex) => {
    e.preventDefault();
    const draggedLinkId = e.dataTransfer.getData('linkId');
    if (!draggedLinkId) return;
    const draggedIndex = parseInt(e.dataTransfer.getData('linkIndex'));

    if (draggedIndex !== dropIndex && !isNaN(draggedIndex)) {
      setBiolinkData(prev => {
        const newLinks = [...prev.links];
        const [draggedLink] = newLinks.splice(draggedIndex, 1);
        newLinks.splice(dropIndex, 0, draggedLink);

        newLinks.forEach((l, pos) => {
          l.position = pos;
        });

        const next = { ...prev, links: newLinks };
        return next;
      });
      setAutoSaveStatus('saving');
      setTimeout(autoSave, 2000);
    }
  };



  const renderSectionContent = () => {
    return (
      <div
        className="slider-container"
        ref={sliderRef}
        onScroll={handleScroll}
      >
        <div className="slider-slide">
          {renderProfileSection()}
        </div>
        <div className="slider-slide">
          {renderLinksSection()}
        </div>
        <div className="slider-slide">
          {renderShopSection()}
        </div>
        <div className="slider-slide">
          {renderThemesSection()}
        </div>
        <div className="slider-slide">
          {renderOthersSection()}
        </div>
      </div>
    );
  };

  // Others step: Media + Content Elements
  const renderOthersSection = () => (
    <div className="section-content">
      <div className="content-subsection">
        {renderMediaSection()}
      </div>
      <div className="content-divider"></div>
      <div className="content-subsection">
        {renderContentElementsSection()}
      </div>
    </div>
  );

  // Merged Content tab: Links + Shop + Content Elements
  const renderContentSection = () => (
    <div className="section-content">
      {/* Links Sub-section */}
      <div className="content-subsection">
        <div className="section-header">
          <h3>Social Links</h3>
          <button className="add-btn" onClick={addLink}>
            <Plus size={16} />
            Add Link
          </button>
        </div>
        {renderLinksSection.__links ? renderLinksSection.__links() : (
          <div className="links-list">
            {(biolinkData.links || []).map((link) => (
              <div key={link.id} className="simple-link-row swipeable-row">
                <div className="creative-platform-selector" ref={el => {
                  if (el && !el.hasClickOutsideListener) {
                    el.hasClickOutsideListener = true;
                    const handleClickOutside = (event) => {
                      if (!el.contains(event.target)) {
                        const dropdown = el.querySelector('.creative-dropdown');
                        if (dropdown) dropdown.classList.remove('show');
                      }
                    };
                    document.addEventListener('click', handleClickOutside);
                    el.cleanupClickOutside = () => document.removeEventListener('click', handleClickOutside);
                  }
                }}>
                  <button
                    type="button"
                    className="creative-platform-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      const dropdown = document.getElementById(`dropdown-${link.id}`);
                      dropdown.classList.toggle('show');
                    }}
                  >
                    <div className="platform-display">
                      <div className="platform-icon-circle">
                        {link.platform ? (
                          socialPlatforms.find(p => p.id === link.platform)?.icon
                        ) : (
                          <span className="default-icon">+</span>
                        )}
                      </div>
                      <span className="platform-name">
                        {link.platform ?
                          socialPlatforms.find(p => p.id === link.platform)?.name :
                          'Add Platform'
                        }
                      </span>
                    </div>
                    <div className="creative-arrow">
                      <svg width="14" height="8" viewBox="0 0 14 8" fill="none">
                        <path d="M1 1L7 7L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </button>

                  <div className="creative-dropdown" id={`dropdown-${link.id}`}>
                    {socialPlatforms.map(platform => (
                      <button
                        key={platform.id}
                        type="button"
                        className="platform-option"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlatformChange(link.id, platform.id);
                          document.getElementById(`dropdown-${link.id}`).classList.remove('show');
                        }}
                      >
                        <span className="option-icon">{platform.icon}</span>
                        <span className="option-name">{platform.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <input
                  type="text"
                  value={link.title}
                  onChange={(e) => updateLink(link.id, { title: e.target.value })}
                  placeholder="Url Name"
                  className="simple-input title-field"
                />

                <input
                  type="url"
                  value={link.url}
                  onChange={(e) => updateLink(link.id, { url: e.target.value })}
                  placeholder="https://"
                  className="simple-input url-field"
                />

                <button
                  className="remove-btn-simple"
                  onClick={() => removeLink(link.id)}
                  title="Remove link"
                >
                  <X size={14} />
                </button>
              </div>
            ))}

            {(biolinkData.links || []).length === 0 && (
              <div className="empty-state">
                <button className="first-link-btn" onClick={addLink}>
                  <Plus size={20} />
                  <span>Add Your First Link</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="content-divider"></div>

      {/* Shop Sub-section */}
      <div className="content-subsection">
        {renderShopSection()}
      </div>

      {/* Divider */}
      <div className="content-divider"></div>

      {/* Content Elements Sub-section */}
      <div className="content-subsection">
        {renderContentElementsSection()}
      </div>
    </div>
  );

  // Merged Design tab: Themes + Media
  const renderDesignSection = () => (
    <div className="section-content">
      {/* Themes Sub-section */}
      <div className="content-subsection">
        {renderThemesSection()}
      </div>

      {/* Divider */}
      <div className="content-divider"></div>

      {/* Media Sub-section */}
      <div className="content-subsection">
        {renderMediaSection()}
      </div>
    </div>
  );

  const renderProfileSection = () => (
    <div className="section-content">
      <h3>Profile Settings</h3>
      <div className="profile-edit-container">
        <div className="profile-form-grid">
          <div className="form-column">
            <div className="form-group">
              <label>Display Name</label>
              <input
                type="text"
                value={biolinkData.profile.displayName}
                onChange={(e) => updateSection('profile', { displayName: e.target.value })}
                placeholder="Enter your name"
                className="profile-input"
              />
            </div>

            <div className="form-group">
              <label>Tagline</label>
              <input
                type="text"
                value={biolinkData.profile.tagline}
                onChange={(e) => updateSection('profile', { tagline: e.target.value })}
                placeholder="Enter your tagline"
                className="profile-input"
              />
            </div>
          </div>

          <div className="avatar-upload-column">
            <div className="avatar-upload">
              <div className="avatar-preview">
                {biolinkData.profile.avatar ? (
                  <img
                    src={getMediaUrl(biolinkData.profile.avatar)}
                    alt="Profile"
                    className="avatar-image"
                    onError={(e) => {
                      console.error('Avatar edit preview failed to load:', e.target.src);
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="avatar-placeholder">
                    <User size={32} color="var(--text-muted)" />
                  </div>
                )}
                <button
                  className="change-avatar-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera size={16} />
                  Change
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarUpload}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLinksSection = () => (
    <div className="section-content">
      <div className="section-header">
        <h3>Social Links</h3>
        <button className="add-btn first-link-btn" onClick={addLink}>
          <Plus size={18} />
          Add New Link
        </button>
      </div>

      <div className="links-list">
        {(biolinkData.links || []).map((link) => (
          <div key={link.id} className="simple-link-row">
            <div className="creative-platform-selector" ref={el => {
              if (el && !el.hasClickOutsideListener) {
                el.hasClickOutsideListener = true;
                const handleClickOutside = (event) => {
                  if (!el.contains(event.target)) {
                    const dropdown = el.querySelector('.creative-dropdown');
                    if (dropdown) {
                      dropdown.classList.remove('show');
                    }
                  }
                };
                document.addEventListener('click', handleClickOutside);
                // Store cleanup function
                el.cleanupClickOutside = () => {
                  document.removeEventListener('click', handleClickOutside);
                };
              }
            }}>
              <button
                type="button"
                className="creative-platform-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  // Toggle dropdown visibility
                  const dropdown = document.getElementById(`dropdown-${link.id}`);
                  dropdown.classList.toggle('show');
                }}
              >
                <div className="platform-display">
                  <div className="platform-icon-circle">
                    {link.platform ? (
                      socialPlatforms.find(p => p.id === link.platform)?.icon
                    ) : (
                      <span className="default-icon">+</span>
                    )}
                  </div>
                  <span className="platform-name">
                    {link.platform ?
                      socialPlatforms.find(p => p.id === link.platform)?.name :
                      'Add Platform'
                    }
                  </span>
                </div>
                <div className="creative-arrow">
                  <svg width="14" height="8" viewBox="0 0 14 8" fill="none">
                    <path d="M1 1L7 7L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </button>

              <div className="creative-dropdown" id={`dropdown-${link.id}`}>
                {socialPlatforms.map(platform => (
                  <button
                    key={platform.id}
                    type="button"
                    className="platform-option"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlatformChange(link.id, platform.id);
                      document.getElementById(`dropdown-${link.id}`).classList.remove('show');
                    }}
                  >
                    <span className="option-icon">{platform.icon}</span>
                    <span className="option-name">{platform.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <input
              type="text"
              value={link.title}
              onChange={(e) => updateLink(link.id, { title: e.target.value })}
              placeholder="Url Name"
              className="simple-input title-field"
            />

            <input
              type="url"
              value={link.url}
              onChange={(e) => updateLink(link.id, { url: e.target.value })}
              placeholder="https://"
              className="simple-input url-field"
            />

            <button
              className="remove-btn-simple"
              onClick={() => removeLink(link.id)}
              title="Remove link"
            >
              <X size={14} />
            </button>
          </div>
        ))}

        {/* Redundant 'First Link' button removed as the header button is now always visible and sticky */}
      </div>
    </div>
  );

  const renderShopSection = () => {
    const products = biolinkData.products || [];

    return (
      <div className="section-content">
        <div className="links-container">
          <div className="section-header">
            <h3>Shop Products</h3>
            <button
              className="add-btn first-link-btn"
              onClick={() => {
                if (showAddProductForm) {
                  setShowAddProductForm(false);
                  setEditingProductIndex(null);
                  setProductFormData({ name: '', description: '', price: '', image: '', url: '' });
                } else {
                  setShowAddProductForm(true);
                  setEditingProductIndex(null);
                  setProductFormData({ name: '', description: '', price: '', image: '', url: '' });
                }
              }}
            >
              {showAddProductForm ? <X size={16} /> : <Plus size={18} />}
              {showAddProductForm ? 'Cancel' : 'Add New Product'}
            </button>
          </div>

          {showAddProductForm && (
            <div className="asset-add-form">
              <input
                type="text"
                placeholder="Product Name *"
                value={productFormData.name}
                onChange={e => setProductFormData(p => ({ ...p, name: e.target.value }))}
                className="asset-input"
              />
              <input
                type="text"
                placeholder="Description"
                value={productFormData.description}
                onChange={e => setProductFormData(p => ({ ...p, description: e.target.value }))}
                className="asset-input"
              />
              <input
                type="url"
                placeholder="Product URL"
                value={productFormData.url}
                onChange={e => setProductFormData(p => ({ ...p, url: e.target.value }))}
                className="asset-input"
              />

              <div className="asset-image-upload">
                <input
                  type="file"
                  accept="image/*"
                  id="product-image-upload-field"
                  onChange={e => handleNewProductImageUpload(e.target.files[0])}
                  style={{ display: 'none' }}
                />
                <label htmlFor="product-image-upload-field" className="asset-upload-label">
                  {productImageUploading ? 'Uploading...' : productFormData.image ? 'Change Image' : 'Upload Cover Image'}
                </label>
                {productFormData.image && (
                  <div className="asset-image-preview">
                    <img src={getMediaUrl(productFormData.image)} alt="Preview" />
                    <button
                      type="button"
                      className="remove-image-btn"
                      onClick={() => setProductFormData(p => ({ ...p, image: '' }))}
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>

              <input
                type="text"
                placeholder="Price"
                value={productFormData.price}
                onChange={e => setProductFormData(p => ({ ...p, price: e.target.value }))}
                className="asset-input"
              />

              <button
                className="asset-save-btn"
                onClick={() => {
                  if (editingProductIndex !== null) {
                    setBiolinkData(prev => {
                      const nextProducts = [...prev.products];
                      nextProducts[editingProductIndex] = {
                        ...nextProducts[editingProductIndex],
                        ...productFormData
                      };
                      return { ...prev, products: nextProducts };
                    });
                  } else {
                    setBiolinkData(prev => ({
                      ...prev,
                      products: [...prev.products, {
                        id: Date.now(),
                        ...productFormData
                      }]
                    }));
                  }
                  setShowAddProductForm(false);
                  setEditingProductIndex(null);
                  setProductFormData({ name: '', description: '', price: '', image: '', url: '' });
                  setAutoSaveStatus('saving');
                  debouncedAutoSave();
                }}
                disabled={!productFormData.name.trim()}
              >
                <Plus size={14} /> {editingProductIndex !== null ? 'Update Changes' : 'Add'}
              </button>
            </div>
          )}

          {products.length === 0 && !showAddProductForm ? (
            <div className="empty-state">
              <button
                className="first-link-btn"
                onClick={() => {
                  setShowAddProductForm(true);
                  setEditingProductIndex(null);
                  setProductFormData({ name: '', description: '', price: '', image: '', url: '' });
                }}
              >
                <Plus size={20} />
                <span>Add Your First Product</span>
              </button>
            </div>
          ) : (
            <div className="assets-list grid-layout">
              {products.map((product, idx) => (
                <div key={product.id || idx} className="asset-item asset-card">
                  {product.image && (
                    <div className="asset-card-image">
                      <img src={getMediaUrl(product.image)} alt={product.name} />
                    </div>
                  )}
                  <div className="asset-item-info">
                    <span className="asset-item-title">{product.name || 'Product'}</span>
                    {product.description && (
                      <span className="asset-item-desc">{product.description}</span>
                    )}
                    {product.price && <span className="asset-item-price">${product.price}</span>}
                  </div>
                  <div className="asset-item-actions-bar">
                    {product.url ? (
                      <a href={product.url} target="_blank" rel="noopener noreferrer" className="asset-checkout-btn">
                        Checkout
                      </a>
                    ) : (
                      <span />
                    )}
                    <div className="asset-item-actions">
                      <button
                        onClick={() => {
                          setEditingProductIndex(idx);
                          setProductFormData({
                            name: product.name || '',
                            description: product.description || '',
                            price: product.price || '',
                            image: product.image || '',
                            url: product.url || ''
                          });
                          setShowAddProductForm(true);
                        }}
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setBiolinkData(prev => ({
                            ...prev,
                            products: prev.products.filter((_, i) => i !== idx)
                          }));
                          setAutoSaveStatus('saving');
                          debouncedAutoSave();
                        }}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderThemesSection = () => (
    <div className="section-content">
      <h3>Choose Theme</h3>
      
      <div className="layout-selection-card" style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '16px', marginBottom: '24px', border: '1px solid var(--border-color)' }}>
        <h4 className="custom-theme-title" style={{ marginTop: 0, marginBottom: '16px', fontSize: '1rem' }}>Layout Style</h4>
        <div className="layout-options" style={{ display: 'flex', gap: '12px' }}>
          <div 
            className={`layout-option ${biolinkData.settings.layoutStyle === 'default' || !biolinkData.settings.layoutStyle ? 'active' : ''}`}
            onClick={() => {
              setBiolinkData(prev => ({ ...prev, settings: { ...prev.settings, layoutStyle: 'default' } }));
              setAutoSaveStatus('saving');
              setTimeout(autoSave, 2000);
            }}
            style={{ 
              flex: 1, padding: '16px', borderRadius: '12px', border: `2px solid ${biolinkData.settings.layoutStyle === 'default' || !biolinkData.settings.layoutStyle ? 'var(--primary-color)' : 'transparent'}`, 
              background: 'var(--bg)', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s ease',
              display: 'flex', flexDirection: 'column', alignItems: 'center'
            }}
          >
            <div style={{width: '60px', height: '80px', background: 'var(--bg-secondary)', borderRadius: '8px', margin: '0 auto 12px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', border: '1px solid var(--border-color)'}}>
              <div style={{width: '24px', height: '24px', borderRadius: '50%', background: 'var(--text-secondary)', opacity: 0.5}}></div>
              <div style={{width: '100%', height: '6px', borderRadius: '4px', background: 'var(--primary-color)', opacity: 0.6}}></div>
              <div style={{width: '100%', height: '6px', borderRadius: '4px', background: 'var(--text-secondary)', opacity: 0.3}}></div>
              <div style={{width: '100%', height: '6px', borderRadius: '4px', background: 'var(--text-secondary)', opacity: 0.3}}></div>
            </div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Standard</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Classic list view</div>
          </div>
          <div 
            className={`layout-option ${biolinkData.settings.layoutStyle === 'socialsTopBottom' ? 'active' : ''}`}
            onClick={() => {
              setBiolinkData(prev => ({ ...prev, settings: { ...prev.settings, layoutStyle: 'socialsTopBottom' } }));
              setAutoSaveStatus('saving');
              setTimeout(autoSave, 2000);
            }}
            style={{ 
              flex: 1, padding: '16px', borderRadius: '12px', border: `2px solid ${biolinkData.settings.layoutStyle === 'socialsTopBottom' ? 'var(--primary-color)' : 'transparent'}`, 
              background: 'var(--bg)', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s ease',
              display: 'flex', flexDirection: 'column', alignItems: 'center'
            }}
          >
            <div style={{width: '60px', height: '80px', background: 'var(--bg-secondary)', borderRadius: '8px', margin: '0 auto 12px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', border: '1px solid var(--border-color)'}}>
              <div style={{width: '24px', height: '24px', borderRadius: '50%', background: 'var(--text-secondary)', opacity: 0.5}}></div>
              <div style={{display: 'flex', gap: '3px', marginBottom: '2px'}}>
                <div style={{width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary-color)', opacity: 0.8}}></div>
                <div style={{width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary-color)', opacity: 0.8}}></div>
                <div style={{width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary-color)', opacity: 0.8}}></div>
              </div>
              <div style={{width: '100%', height: '6px', borderRadius: '4px', background: 'var(--text-secondary)', opacity: 0.3}}></div>
              <div style={{width: '100%', height: '6px', borderRadius: '4px', background: 'var(--text-secondary)', opacity: 0.3}}></div>
              <div style={{display: 'flex', gap: '3px', marginTop: 'auto'}}>
                <div style={{width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary-color)', opacity: 0.8}}></div>
                <div style={{width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary-color)', opacity: 0.8}}></div>
                <div style={{width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary-color)', opacity: 0.8}}></div>
              </div>
            </div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Modern</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Social icons Top & Bottom</div>
          </div>
        </div>
      </div>
      <div className="custom-theme-card">
        <h4 className="custom-theme-title">Custom Theme Settings</h4>
        <div className="custom-theme-fields">
          <div className="form-group">
            <label className="form-label-custom">Background Image</label>
            <div className="background-image-upload">
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files && e.target.files[0];
                  if (!file) return;
                  try {
                    const formData = new FormData();
                    formData.append('backgroundImage', file);
                    const token = localStorage.getItem('token');
                    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/biolinks/background-image`, {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${token}` },
                      body: formData
                    });
                    if (response.ok) {
                      const data = await response.json();
                      const imageUrl = data.imageUrl;
                      setBiolinkData(prev => ({ ...prev, settings: { ...prev.settings, backgroundImage: imageUrl } }));
                      setAutoSaveStatus('saving');
                      setTimeout(autoSave, 2000);
                    } else {
                      alert('Failed to upload background image');
                    }
                  } catch (error) {
                    console.error('Upload error', error);
                  }
                }}
                style={{ display: 'none' }}
                id="background-image-upload"
              />
              <label htmlFor="background-image-upload" className="upload-image-btn">
                <Camera size={16} />
                {biolinkData.settings.backgroundImage ? 'Change Background' : 'Upload Background'}
              </label>
              {biolinkData.settings.backgroundImage && (
                <button
                  type="button"
                  className="remove-bg-btn"
                  onClick={() => {
                     setBiolinkData(prev => ({ ...prev, settings: { ...prev.settings, backgroundImage: '' } }));
                     setAutoSaveStatus('saving');
                     setTimeout(autoSave, 2000);
                  }}
                >
                  <X size={16} /> Remove
                </button>
              )}
            </div>
            {biolinkData.settings.backgroundImage && (
              <div className="bg-preview-card">
                <img 
                  src={getMediaUrl(biolinkData.settings.backgroundImage)} 
                  alt="Background Preview" 
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentNode.classList.add('broken');
                  }}
                />
                <div className="bg-preview-overlay">
                  <span>Background Preview</span>
                </div>
              </div>
            )}
          </div>

          <div className="custom-colors-grid">
            <div className="color-picker-item">
              <label className="form-label-custom">Accent Color</label>
              <div className="color-input-wrapper">
                <div className="color-swatch" style={{ backgroundColor: safeColor(biolinkData.settings.accentColor) }}>
                  <input
                    type="color"
                    value={safeColor(biolinkData.settings.accentColor)}
                    onChange={(e) => {
                      const value = e.target.value;
                      setBiolinkData(prev => ({ ...prev, settings: { ...prev.settings, accentColor: value } }));
                      setAutoSaveStatus('saving');
                      setTimeout(autoSave, 2000);
                    }}
                  />
                </div>
                <span className="color-hex-value">{safeColor(biolinkData.settings.accentColor)}</span>
              </div>
            </div>

            <div className="color-picker-item">
              <label className="form-label-custom">Text Color</label>
              <div className="color-input-wrapper">
                <div className="color-swatch" style={{ backgroundColor: safeColor(biolinkData.settings.textColor) }}>
                  <input
                    type="color"
                    value={safeColor(biolinkData.settings.textColor)}
                    onChange={(e) => {
                      const value = e.target.value;
                      setBiolinkData(prev => ({ ...prev, settings: { ...prev.settings, textColor: value } }));
                      setAutoSaveStatus('saving');
                      setTimeout(autoSave, 2000);
                    }}
                  />
                </div>
                <span className="color-hex-value">{safeColor(biolinkData.settings.textColor)}</span>
              </div>
            </div>

            <div className="color-picker-item">
              <label className="form-label-custom">Background Color</label>
              <div className="color-input-wrapper">
                <div className="color-swatch" style={{ backgroundColor: safeColor(biolinkData.settings.backgroundColor) }}>
                  <input
                    type="color"
                    value={safeColor(biolinkData.settings.backgroundColor)}
                    onChange={(e) => {
                      const value = e.target.value;
                      setBiolinkData(prev => ({ ...prev, settings: { ...prev.settings, backgroundColor: value } }));
                      setAutoSaveStatus('saving');
                      setTimeout(autoSave, 2000);
                    }}
                  />
                </div>
                <span className="color-hex-value">{safeColor(biolinkData.settings.backgroundColor)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="themes-grid">
        {themes.map((theme) => (
          <div
            key={theme.id}
            className={`theme-card ${biolinkData.theme === theme.id ? 'selected' : ''}`}
            onClick={() => changeTheme(theme.id)}
          >
            <div className="theme-preview" style={{ backgroundColor: theme.styles.backgroundColor }}>
              <div className="preview-header" style={{ color: theme.styles.textColor }}>
                <div className="preview-avatar" style={{ backgroundColor: theme.styles.accentColor }}></div>
                <div className="preview-text">
                  <div className="preview-name"></div>
                  <div className="preview-tagline"></div>
                </div>
              </div>
              <div className="preview-links">
                <div className="preview-link" style={{ backgroundColor: theme.styles.accentColor }}></div>
                <div className="preview-link" style={{ backgroundColor: theme.styles.accentColor }}></div>
              </div>
            </div>
            <h4>{theme.name}</h4>
            <p>{theme.description}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const handleDirectImageUpload = async (files) => {
    if (!files || files.length === 0) return;

    try {
      const fileList = Array.from(files);

      // Upload images to backend first
      const formData = new FormData();
      fileList.forEach(file => {
        formData.append('images', file);
      });

      const authHeaders = getBioLinkAuthHeaders();
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/biolinks/gallery/upload`, {
        method: 'POST',
        headers: { ...authHeaders },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        const imageUrls = data.images.map(url => `${import.meta.env.VITE_API_BASE_URL}${url}`);

        // Create a new gallery element with the uploaded images
        const newElement = {
          id: `element_${Date.now()}`,
          type: 'gallery',
          content: { images: imageUrls, captions: [] },
          position: biolinkData.elements.length,
          isActive: true
        };

        setBiolinkData(prev => ({
          ...prev,
          elements: [...prev.elements, newElement]
        }));

        setAutoSaveStatus('saving');
        setTimeout(autoSave, 2000);
      } else {
        const errorData = await response.text();
        console.error('Gallery upload failed:', response.status, errorData);
        alert('Failed to upload gallery images. Please try again.');
      }
    } catch (error) {
      console.error('Error uploading gallery images:', error);
      alert('Error uploading gallery images. Please try again.');
    }
  };

  const handleDirectVideoUpload = async (file) => {
    // Create a new video element first
    const newElement = {
      id: `element_${Date.now()}`,
      type: 'video',
      content: { url: '', caption: '', source: 'upload', displayMode: 'single' },
      position: biolinkData.elements.length,
      isActive: true
    };

    setBiolinkData(prev => ({
      ...prev,
      elements: [...prev.elements, newElement]
    }));

    // Then upload the video to this new element
    await handleVideoUpload(newElement.id, file);
  };

  const renderMediaSection = () => (
    <div className="section-content">
      <h3>Media Content</h3>

      <div className="media-container">
        {/* Left Side - Images */}
        <div className="media-left">
          <div className="media-section-header">
            <h4>Images</h4>
          </div>

          {/* Direct Upload Area for Images */}
          <div className="direct-upload-area">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleDirectImageUpload(e.target.files)}
              style={{ display: 'none' }}
              id="direct-image-upload"
            />
            <label htmlFor="direct-image-upload" className="direct-upload-label">
              <Camera size={24} />
              <p>Upload Images</p>
              <span>Click to select multiple images</span>
            </label>
          </div>

          <div className="media-elements-list">
            {biolinkData.elements.filter(el => el.type === 'gallery').map((element) => (
              <div key={element.id} className="media-element-item">
                <div className="element-header">
                  <span>Image Gallery</span>
                  <button
                    className="remove-btn"
                    onClick={() => removeElement(element.id)}
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="gallery-content">
                  {element.content?.images && element.content.images.length > 0 && (
                    <div className="gallery-preview">
                      {element.content.images.map((image, index) => (
                        <div key={index} className="gallery-preview-item">
                          <img src={getMediaUrl(image)} alt={`Gallery ${index + 1}`} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side - Videos */}
        <div className="media-right">
          <div className="media-section-header">
            <h4>Videos</h4>
          </div>

          {/* Direct Upload Area for Videos */}
          <div className="direct-upload-area">
            <input
              type="file"
              accept="video/*"
              onChange={(e) => {
                const file = e.target.files && e.target.files[0];
                if (file) {
                  handleDirectVideoUpload(file);
                }
              }}
              style={{ display: 'none' }}
              id="direct-video-upload"
            />
            <label htmlFor="direct-video-upload" className="direct-upload-label">
              <Video size={24} />
              <p>Upload Videos</p>
              <span>Click to select a video file</span>
            </label>
          </div>

          <div className="media-elements-list">
            {biolinkData.elements.filter(el => el.type === 'video').map((element) => (
              <div key={element.id} className="media-element-item">
                <div className="element-header">
                  <span>Video</span>
                  <button
                    className="remove-btn"
                    onClick={() => removeElement(element.id)}
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="video-content">
                  {element.content.url && (
                    <div className="video-preview">
                      {element.content.displayMode === 'grid' ? (
                        <div className="video-grid-2x2" style={{ maxHeight: '150px', height: '150px' }}>
                          <div className="video-item-2x2">
                            <video
                              src={getMediaUrl(element.content.url)}
                              controls
                              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                            />
                          </div>
                          <div className="video-item-2x2 video-empty"></div>
                          <div className="video-item-2x2 video-empty"></div>
                          <div className="video-item-2x2 video-empty"></div>
                        </div>
                      ) : (
                        <video
                          src={getMediaUrl(element.content.url)}
                          controls
                          style={{ width: '100%', maxHeight: '150px', borderRadius: '8px' }}
                        />
                      )}
                      <small>Uploaded: {element.content.url.split('/').pop()}</small>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Display Mode</label>
                    <select
                      value={element.content.displayMode || 'single'}
                      onChange={(e) => updateElement(element.id, { content: { ...element.content, displayMode: e.target.value } })}
                    >
                      <option value="single">Single Video (Full Width)</option>
                      <option value="grid">Grid Layout (2x2)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Caption (optional)</label>
                    <input
                      type="text"
                      value={element.content.caption || ''}
                      onChange={(e) => updateElement(element.id, { content: { ...element.content, caption: e.target.value } })}
                      placeholder="Add a caption"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );



  const renderContentElementsSection = () => (
    <div className="section-content">
      <div className="content-elements-header">
        <h3>Content Elements</h3>
        <div className="content-action-buttons">
          <button className="content-action-btn separator-btn" onClick={() => addElement('separator')}>
            <Minus size={20} />
            <span>Add Separator</span>
          </button>
          <button className="content-action-btn cta-btn" onClick={() => addElement('cta')}>
            <MousePointer size={20} />
            <span>Add CTA</span>
          </button>
          <button className="content-action-btn text-btn" onClick={() => addElement('text')}>
            <FileText size={20} />
            <span>Add Text</span>
          </button>
        </div>
      </div>

      <div className="elements-list">
        {/* Separator Elements */}
        {biolinkData.elements.filter(el => el.type === 'separator').map((element) => (
          <div key={element.id} className="element-item">
            <div className="element-header">
              <h4>Separator</h4>
              <button
                className="remove-btn"
                onClick={() => removeElement(element.id)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="separator-content">
              <select
                value={element.content.style}
                onChange={(e) => updateElement(element.id, { content: { ...element.content, style: e.target.value } })}
              >
                <option value="line">Line</option>
                <option value="dots">Dots</option>
                <option value="dashed">Dashed</option>
              </select>
            </div>
          </div>
        ))}

        {/* Call to Action Elements */}
        {biolinkData.elements.filter(el => el.type === 'cta').map((element) => (
          <div key={element.id} className="element-item">
            <div className="element-header">
              <h4>Call to Action</h4>
              <button
                className="remove-btn"
                onClick={() => removeElement(element.id)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="cta-content">
              <input
                type="text"
                value={element.content.text}
                onChange={(e) => updateElement(element.id, { content: { ...element.content, text: e.target.value } })}
                placeholder="Button text"
              />
              <input
                type="url"
                value={element.content.url}
                onChange={(e) => updateElement(element.id, { content: { ...element.content, url: e.target.value } })}
                placeholder="Action URL"
              />
            </div>
          </div>
        ))}

        {/* Text Block Elements */}
        {biolinkData.elements.filter(el => el.type === 'text').map((element) => (
          <div key={element.id} className="element-item">
            <div className="element-header">
              <h4>Text Block</h4>
              <button
                className="remove-btn"
                onClick={() => removeElement(element.id)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="text-content">
              <textarea
                value={element.content.content}
                onChange={(e) => updateElement(element.id, { content: { ...element.content, content: e.target.value } })}
                placeholder="Enter your text content"
                rows={4}
              />
            </div>
          </div>
        ))}

        {/* Ticket Elements */}
        {biolinkData.elements.filter(el => el.type === 'ticket').map((element) => (
          <div key={element.id} className="element-item">
            <div className="element-header">
              <h4>Event Ticket</h4>
              <button
                className="remove-btn"
                onClick={() => removeElement(element.id)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="ticket-content">
              <div className="ticket-summary">
                <h5>{element.content.title || 'Untitled Ticket'}</h5>
                <p>{element.content.description || 'No description'}</p>
                <div className="ticket-details">
                  <span>📅 {element.content.event_date}</span>
                  <span>🕐 {element.content.event_time}</span>
                  <span>📍 {element.content.location}</span>
                  <span>💰 ₹{element.content.price}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="biolink-loading">
        <div className="loading-spinner"></div>
        <p>Loading BioLink Editor...</p>
      </div>
    );
  }

  const livePreviewContent = (
    <div className="mobile-preview" style={{
      background: biolinkData.settings.backgroundImage 
        ? `url(${getMediaUrl(biolinkData.settings.backgroundImage)}) center / cover` 
        : biolinkData.settings.backgroundColor,
      color: biolinkData.settings.textColor,
      fontFamily: "'Inter', sans-serif",
      padding: '52px 20px 88px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      overflowY: 'auto'
    }}>
      <div className="mobile-header">
        <div className="mobile-avatar" style={{ border: '3px solid #06040f' }}>
          {biolinkData.profile.avatar ? (
            <img src={getMediaUrl(biolinkData.profile.avatar)}
              alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div className="avatar-placeholder" style={{ background: 'rgba(139, 92, 246, 0.12)' }}></div>
          )}
        </div>
        <h4 style={{ color: biolinkData.settings.textColor, fontSize: '20px', fontWeight: '800', margin: '12px 0 4px', letterSpacing: '-0.5px' }}>
          {biolinkData.profile.displayName || 'Your Name'}
        </h4>
        <p style={{ color: `${biolinkData.settings.textColor}99`, fontSize: '13px', margin: '0' }}>
          {biolinkData.profile.tagline || 'Your tagline here'}
        </p>
      </div>

      {(biolinkData.products || []).length > 0 && (
        <div style={{
          display: 'flex',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.09)',
          borderRadius: '100px',
          padding: '4px',
          marginBottom: '20px',
          width: '100%',
          backdropFilter: 'blur(16px)',
          boxSizing: 'border-box'
        }}>
          <button
            onClick={() => setPreviewActiveView('links')}
            style={{
              flex: 1, padding: '9px 0', border: 'none', borderRadius: '100px',
              fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s ease', textTransform: 'uppercase', letterSpacing: '1px',
              backgroundColor: previewActiveView === 'links' ? `${biolinkData.settings.accentColor}33` : 'transparent',
              color: previewActiveView === 'links' ? biolinkData.settings.textColor : 'rgba(255,255,255,0.35)'
            }}
          >LINKS</button>
          <button
            onClick={() => setPreviewActiveView('shop')}
            style={{
              flex: 1, padding: '9px 0', border: 'none', borderRadius: '100px',
              fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s ease', textTransform: 'uppercase', letterSpacing: '1px',
              backgroundColor: previewActiveView === 'shop' ? `${biolinkData.settings.accentColor}33` : 'transparent',
              color: previewActiveView === 'shop' ? biolinkData.settings.textColor : 'rgba(255,255,255,0.35)'
            }}
          >SHOP</button>
        </div>
      )}

      <div className="mobile-links" style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
        {previewActiveView === 'links' && (biolinkData.links || []).map((link, index) => {
          const styleType = biolinkData.settings.styleType || 'glass';
          let linkStyle = {};
          if (styleType === 'glass') {
            linkStyle = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)', backdropFilter: 'blur(24px) saturate(180%)', color: biolinkData.settings.textColor };
          } else if (styleType === 'timeline') {
            linkStyle = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(16px)', color: biolinkData.settings.textColor };
          } else if (styleType === 'perspective') {
            linkStyle = { background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', color: '#111111' };
          } else {
            linkStyle = { background: `${biolinkData.settings.accentColor}22`, border: `1px solid ${biolinkData.settings.accentColor}44`, color: biolinkData.settings.textColor };
          }

          const platform = socialPlatforms.find(p => p.id === link.platform);
          const platformIcon = platform?.icon;

          return (
            <div 
              key={link.id} 
              className="mobile-link" 
              style={{ ...linkStyle, display: 'flex', alignItems: 'center', gap: '12px', padding: '0 16px 0 12px', height: '58px', borderRadius: '18px', position: 'relative', overflow: 'hidden' }}
              draggable
              onDragStart={(e) => handleLinkDragStart(e, link.id, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleLinkDrop(e, index)}
            >
              <div style={{ position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, borderRadius: '0 3px 3px 0', background: biolinkData.settings.accentColor || '#8b5cf6' }}></div>
              <div className="link-icon" style={{ width: '36px', height: '36px', borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)' }}>
                {link.icon === 'platform' && platformIcon ? (
                  <div style={{ width: '17px', height: '17px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {platformIcon}
                  </div>
                ) : link.icon && link.icon !== 'platform' ? (
                  <span style={{ fontSize: '15px' }}>{link.icon}</span>
                ) : (
                  <span style={{ fontSize: '15px' }}>🌐</span>
                )}
              </div>
              <span className="link-text" style={{ flex: 1, fontSize: '14px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{link.title}</span>
              <div className="link-arrow" style={{ color: 'rgba(255, 255, 255, 0.22)' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            </div>
          );
        })}

        {previewActiveView === 'shop' && (
          <div className="preview-shop-rows">
            {Array.from({ length: Math.ceil((biolinkData.products || []).length / 2) }, (_, rowIndex) => (
              <div key={rowIndex} className="preview-shop-row">
                {(biolinkData.products || []).slice(rowIndex * 2, rowIndex * 2 + 2).map((product) => (
                  <div key={product.id} className="preview-shop-item">
                    <div className="preview-shop-image">
                      {product.image ? (
                        <img
                          src={getMediaUrl(product.image)}
                          alt={product.name}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="preview-shop-placeholder">📦</div>
                      )}
                    </div>
                    <div className="preview-shop-info">
                      <div className="preview-shop-name">{product.name}</div>
                      {product.price && <div className="preview-shop-price">{product.price}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {(biolinkData.elements || []).map((element, index) => (
          <div
            key={element.id}
            className="mobile-element"
            draggable
            onDragStart={(e) => handleDragStart(e, element.id, index)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
          >
            <BioLinkElement
              element={element}
              isPreview={true}
              settings={biolinkData.settings}
            />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="biolink-edit-panel mobile-first">
      <div className="desktop-edit-wrapper">
        {/* Top bar - clean: save status + preview + save + publish */}
        <div className="edit-toolbar-mobile">
          <button className="ep-back-btn" onClick={() => navigate(-1)} aria-label="Go Back">
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>
          <div className="header-center-title">
            <span>{sections[currentStep]?.label}</span>
          </div>
          <div className="header-combined-pill">
            <div className="header-status-item">
              <span className={`status-dot ${autoSaveStatus}`}></span>
              <span className="status-text">
                {autoSaveStatus === 'saving' ? 'Saving...' : 'Saved'}
              </span>
            </div>
            <button 
              className="header-pill-btn save-btn" 
              onClick={async () => { setAutoSaveStatus('saving'); await autoSave(); alert('Saved'); }}
            >
              Save
            </button>
            <button className="header-pill-btn publish-btn" onClick={publishBiolink}>
              Publish
            </button>
          </div>
        </div>

        {/* Main scrollable content area */}
        <div className="edit-content-mobile">
          <div className="section-content-wrapper">
            {renderSectionContent()}
          </div>
        </div>

        {/* Fixed Step Navigation at the bottom */}
        <div className="inline-step-nav">
          <button
            className="step-nav-btn back"
            onClick={goBack}
            disabled={currentStep === 0}
          >
            <ChevronLeft size={18} />
            Back
          </button>

          {currentStep < sections.length - 1 ? (
            <button className="step-nav-btn next" onClick={goNext}>
              Next
              <ChevronRight size={18} />
            </button>
          ) : (
            <button className="step-nav-btn finish" onClick={publishBiolink}>
              Publish 🚀
            </button>
          )}
        </div>
      </div>
      
      {/* Desktop permanent live preview */}
      <div className="desktop-preview-wrapper">
        {livePreviewContent}
        <button className="preview-open-external" onClick={() => window.open(`/p/${(biolinkData?.username || user?.username)}`, '_blank')} style={{ marginTop: '20px' }}>
          <Eye size={16} />
          Open in New Tab
        </button>
      </div>

      {/* Full-screen preview overlay (Mobile only) */}
      {showPreview && (
        <div className="preview-overlay" onClick={() => setShowPreview(false)}>
          <div className="preview-overlay-content" onClick={(e) => e.stopPropagation()}>
            <div className="preview-overlay-handle" onClick={() => setShowPreview(false)}>
              <div className="handle-bar"></div>
              <span>Pull down to close</span>
            </div>
            {livePreviewContent}
            <button className="preview-close-btn" onClick={() => setShowPreview(false)}>
              <X size={20} />
              Close Preview
            </button>
            <button className="preview-open-external" onClick={() => window.open(`/p/${(biolinkData?.username || user?.username)}`, '_blank')}>
              <Eye size={16} />
              Open in New Tab
            </button>
          </div>
        </div>
      )}

      {showElementPopup && (
        <div className="element-popup-overlay" onClick={() => setShowElementPopup(false)}>
          <div className="element-popup" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h3>Add Element</h3>
              <button className="popup-close" onClick={() => setShowElementPopup(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="element-grid">
              {[
                { id: 'separator', label: 'Separator', icon: <Minus size={20} />, color: 'var(--accent-cyan)' },
                { id: 'text', label: 'Text Block', icon: <FileText size={20} />, color: 'var(--primary-color)' },
                { id: 'cta', label: 'CTA Button', icon: <MousePointer size={20} />, color: 'var(--accent-blue)' }
              ].map((el) => (
                <button
                  key={el.id}
                  className="element-type-btn"
                  onClick={() => addElement(el.id)}
                >
                  <div className="element-type-icon" style={{ color: el.color }}>
                    {el.icon}
                  </div>
                  <span>{el.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



export default BioLinkEditPanel;