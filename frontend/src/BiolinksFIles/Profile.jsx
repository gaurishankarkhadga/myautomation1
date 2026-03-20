import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Mail, AtSign, Camera, Plus, Link, Pencil, Trash2, ExternalLink, 
  Globe, ShieldCheck, TrendingUp, Zap, Gift, DollarSign, Layout, ChevronRight, ArrowLeft 
} from 'lucide-react';
import axios from 'axios';
import { getBioLinkAuthHeaders } from './config';
import './Profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    username: '',
    profileImage: '',
    linktreeLinks: []
  });

  const [newLinktree, setNewLinktree] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [biolinks, setBiolinks] = useState([]);
  const [isBiolinksLoading, setIsBiolinksLoading] = useState(false);

  useEffect(() => {
    fetchUserProfile();
    fetchUserBiolinks();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const instaToken = localStorage.getItem('insta_token');
      const instaUserId = localStorage.getItem('insta_user_id');
      const ytChannelId = localStorage.getItem('yt_channel_id');

      if (!instaToken && !ytChannelId) {
        throw new Error('No social account connected. Please connect Instagram or YouTube first.');
      }

      let name = 'Creator';
      let email = 'No email provided';
      let username = 'creator';
      let profileImage = '/default-avatar.png';

      if (instaToken) {
        try {
          const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/instagram/profile?token=${instaToken}`);
          if (res.data.success) {
            const data = res.data.data;
            name = data.username || 'Instagram User';
            username = data.username || 'user';
            profileImage = data.profile_picture_url || '/default-avatar.png';
          }
        } catch (e) { console.error('IG profile fetch error', e); }
      } else if (ytChannelId) {
        try {
          const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/youtube/profile?channelId=${ytChannelId}`);
          if (res.data.success && res.data.data) {
            const data = res.data.data;
            name = data.title || 'YouTube Creator';
            username = data.title?.toLowerCase().replace(/\s+/g, '_') || 'user';
            profileImage = data.thumbnailUrl || '/default-avatar.png';
          }
        } catch (e) { console.error('YT profile fetch error', e); }
      }

      // Fallback to local storage if available
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');

      setProfileData({
        name: name || storedUser.name || 'User',
        email: email || storedUser.email || 'No email',
        username: username || storedUser.username || 'username',
        profileImage: profileImage,
        linktreeLinks: []
      });

      setIsLoading(false);
    } catch (err) {
      console.error('Profile fetch error:', err);
      setError(err.message || 'Failed to load profile. Please connect an account.');
      setIsLoading(false);
    }
  };

  const fetchUserBiolinks = async () => {
    try {
      setIsBiolinksLoading(true);
      const instaUserId = localStorage.getItem('insta_user_id');
      const ytChannelId = localStorage.getItem('yt_channel_id');
      if (!instaUserId && !ytChannelId) return;

      const headers = getBioLinkAuthHeaders();

      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/biolinks/data`, {
        headers
      });
      const list = Array.isArray(response.data?.biolinks)
        ? response.data.biolinks
        : (response.data?.biolink ? [response.data.biolink] : []);
      setBiolinks(list);
    } catch (err) {
      console.error('Error fetching biolinks:', err);
    } finally {
      setIsBiolinksLoading(false);
    }
  };

  const handleEditBiolink = (id) => {
    navigate('/biolink/editor', { state: { id } });
  };

  const handleDeleteBiolink = async (id) => {
    if (!id) return;
    const confirmDelete = window.confirm('Are you sure you want to delete this BioLink?');
    if (!confirmDelete) return;
    try {
      const headers = { ...getBioLinkAuthHeaders(), 'Content-Type': 'application/json' };

      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/api/biolinks/remove`, {
        headers,
        data: { id }
      });
      setMessage('BioLink deleted');
      fetchUserBiolinks();
      setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      console.error('Error deleting biolink:', err);
      setMessage(err.response?.data?.error || 'Failed to delete BioLink');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleLinktreeChange = (e) => {
    setNewLinktree(e.target.value);
  };

  const createLinktreeLink = async () => {
    if (!newLinktree.trim()) {
      setMessage('Please enter a valid link name');
      return;
    }

    try {
      const headers = { ...getBioLinkAuthHeaders(), 'Content-Type': 'application/json' };

      // Create new linktree link
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/profile/linktree`,
        { linkName: newLinktree },
        { headers }
      );

      // Update profile data with new linktree links
      setProfileData({
        ...profileData,
        linktreeLinks: response.data.linktreeLinks
      });

      setNewLinktree('');
      setMessage('Linktree link created successfully!');

      // Clear message after 3 seconds
      setTimeout(() => {
        setMessage('');
      }, 3000);
    } catch (err) {
      console.error('Error creating linktree link:', err);
      setMessage(err.response?.data?.error || 'Failed to create linktree link');
    }
  };

  const copyLinkToClipboard = (linkName) => {
    const hostname = window.location.origin;
    const link = `${hostname}/${profileData.username}/${linkName}`;

    navigator.clipboard.writeText(link)
      .then(() => {
        setMessage('Link copied to clipboard!');
        setTimeout(() => {
          setMessage('');
        }, 3000);
      })
      .catch(() => {
        setMessage('Failed to copy link');
      });
  };

  // --- Sub-render Functions ---

  const renderProfileSidebar = () => (
    <div className="custom-profile-card">
      <div className="custom-profile-avatar-container">
        <img
          src={profileData.profileImage || '/default-avatar.png'}
          alt="Profile Avatar"
          className="custom-profile-avatar"
          onError={(e) => { e.target.src = '/default-avatar.png'; }}
        />
        <div className="custom-avatar-overlay">
          <Camera size={20} />
        </div>
      </div>

      <div className="custom-profile-details-list">
        <div className="custom-profile-detail-item">
          <div className="custom-detail-icon"><User size={18} /></div>
          <div className="custom-detail-content">
            <label>Display Name</label>
            <div className="custom-detail-value">{profileData.name}</div>
          </div>
        </div>

        <div className="custom-profile-detail-item">
          <div className="custom-detail-icon"><AtSign size={18} /></div>
          <div className="custom-detail-content">
            <label>Username</label>
            <div className="custom-detail-value">@{profileData.username}</div>
          </div>
        </div>

        <div className="custom-profile-detail-item">
          <div className="custom-detail-icon"><Mail size={18} /></div>
          <div className="custom-detail-content">
            <label>Email Address</label>
            <div className="custom-detail-value">{profileData.email}</div>
          </div>
        </div>
      </div>

      <div style={{ width: '100%', marginTop: 'auto', paddingTop: '2rem' }}>
        <button className="btn-link" style={{ width: '100%', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          <ShieldCheck size={18} /> Verify Account
        </button>
      </div>
    </div>
  );

  const renderBioLinkHub = () => (
    <div className="custom-biolinks-section">
      <div className="section-headline">
        <h2><Layout size={24} /> BioLink Hub</h2>
        <button
          className="custom-create-button"
          onClick={() => navigate('/biolink/editor', { state: { new: true, reset: true } })}
        >
          <Plus size={16} /> New BioLink
        </button>
      </div>

      {isBiolinksLoading ? (
        <div className="custom-profile-loading"><div className="custom-loading-spinner"></div></div>
      ) : (
        <div className="biolinks-grid">
          <div className="biolink-card create-new-card" onClick={() => navigate('/biolink/editor', { state: { new: true, reset: true } })}>
            <div className="plus-icon-wrap"><Plus size={32} /></div>
            <span style={{ fontWeight: 600 }}>Create New</span>
          </div>
          
          {biolinks?.map((b) => (
            <div key={b._id} className="biolink-card">
              <div className="biolink-card-header">
                <div className="biolink-avatar">
                  {b?.profile?.avatar ? (
                    <img
                      src={b.profile.avatar.startsWith('http') ? b.profile.avatar : `${import.meta.env.VITE_API_BASE_URL}${b.profile.avatar}`}
                      alt="Avatar"
                    />
                  ) : (
                    <div className="avatar-fallback">{(b?.profile?.displayName || b?.username || 'B').substring(0, 1)}</div>
                  )}
                </div>
                <div className="biolink-meta">
                  <div className="biolink-title">{b?.profile?.displayName || b?.username || 'Untitled'}</div>
                  <div className="biolink-subtitle">p/{b?.username || 'draft'}</div>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                   <div className="module-status" style={{ fontSize: '10px' }}>Active</div>
                </div>
              </div>
              <div className="biolink-card-actions">
                <button className="btn-edit" onClick={() => handleEditBiolink(b._id)}>
                  <Pencil size={14} /> Edit
                </button>
                <button className="btn-link" onClick={() => b.username && window.open(`/p/${b.username}`, '_blank')}>
                  <ExternalLink size={14} /> View
                </button>
                <button className="btn-delete" onClick={() => handleDeleteBiolink(b._id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderAutomationModules = () => (
    <div className="automation-section">
      <div className="section-headline">
        <h2><Zap size={24} /> Automation Center</h2>
      </div>
      <div className="automation-modules-grid">
        <div className="module-card">
          <Gift size={32} style={{ marginBottom: '1rem', color: 'var(--accent-purple)' }} />
          <h3>Brand Collabs</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Manage exclusive deals and partnership requests in one place.
          </p>
          <div className="module-status">
            <TrendingUp size={14} /> 12 New Deals
          </div>
          <ChevronRight size={20} style={{ position: 'absolute', right: '1.5rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
        </div>

        <div className="module-card">
          <DollarSign size={32} style={{ marginBottom: '1rem', color: 'var(--accent-blue)' }} />
          <h3>Affiliate Hub</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Track earnings and manage all your affiliate product links globally.
          </p>
          <div className="module-status">
             Coming Soon
          </div>
          <ChevronRight size={20} style={{ position: 'absolute', right: '1.5rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
        </div>
      </div>
    </div>
  );

  const renderDigitalAssets = () => (
    <div className="custom-linktree-section">
      <div className="section-headline">
        <h2><Globe size={24} /> Digital Assets</h2>
      </div>
      
      <div className="custom-create-linktree">
        <div className="custom-input-group">
          <input
            type="text"
            value={newLinktree}
            onChange={handleLinktreeChange}
            placeholder="Link Name (e.g. MyStore)"
            className="custom-linktree-input"
          />
          <button className="custom-create-button" onClick={createLinktreeLink}>
            <Plus size={16} /> Add Link
          </button>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.75rem', paddingLeft: '0.5rem' }}>
          Universal URL: {window.location.origin}/{profileData.username || 'user'}/[link-name]
        </p>
      </div>

      <div className="custom-linktree-list">
        {profileData.linktreeLinks?.map((link, index) => (
          <div key={index} className="custom-linktree-item">
            <div className="custom-link-details">
              <div className="custom-link-name">{link.linkName}</div>
              <div className="custom-link-url">/{profileData.username}/{link.linkName}</div>
            </div>
            <button className="btn-link" style={{ padding: '0.5rem 1rem' }} onClick={() => copyLinkToClipboard(link.linkName)}>
              Copy Link
            </button>
          </div>
        ))}
        {(!profileData.linktreeLinks || profileData.linktreeLinks.length === 0) && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)', border: '1px dashed var(--glass-border)', borderRadius: '1rem' }}>
            No secondary digital assets found.
          </div>
        )}
      </div>
    </div>
  );

  // --- Main Render Lifecycle ---

  if (isLoading) {
    return (
      <div className="custom-profile-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="custom-loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="custom-profile-page">
        <div className="custom-profile-error">
          <ShieldCheck size={48} style={{ marginBottom: '1rem' }} />
          <h3>Session Required</h3>
          <p>{error}</p>
          <button onClick={() => navigate('/')} className="custom-create-button" style={{ marginTop: '1rem' }}>Connect Account</button>
        </div>
      </div>
    );
  }

  return (
    <div className="custom-profile-page">
      {message && <div className="custom-message-alert">{message}</div>}

      <div className="custom-profile-header">
        <div className="header-title-wrap">
          <button 
            className="assets-back-btn" 
            onClick={() => navigate('/')} 
            aria-label="Back to ChatHub"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
               <line x1="19" y1="12" x2="5" y2="12"></line>
               <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <div className="header-text-container">
            <h1>Creator Universe</h1>
            <p>Global Command Center & Automation Hub</p>
          </div>
        </div>
        <div className="quick-stats-pills" style={{ display: 'flex', gap: '1rem' }}>
          <div className="module-status"><Zap size={14} /> Total Presence: {biolinks.length}</div>
          <div className="module-status"><Globe size={14} /> Public</div>
        </div>
      </div>

      <div className="custom-profile-content">
        {renderProfileSidebar()}
        
        <div className="dashboard-sections">
          {renderBioLinkHub()}
          {renderAutomationModules()}
          {renderDigitalAssets()}
        </div>
      </div>
    </div>
  );
};

export default Profile;