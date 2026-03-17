import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, AtSign, Camera, Plus, Link, Pencil, Trash2, ExternalLink } from 'lucide-react';
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

      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/biolinks/data?latest=true`, {
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

  // Render loading state
  if (isLoading) {
    return (
      <div className="custom-profile-loading">
        <div className="custom-loading-spinner"></div>
        <p>Loading profile information...</p>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="custom-profile-error">
        <p>{error}</p>
        <p>Please log in again or contact support.</p>
      </div>
    );
  }

  return (
    <div className="custom-profile-page">
      <div className="custom-profile-header">
        <h1>My Profile</h1>
        <p>View and manage your profile information</p>
      </div>

      <div className="custom-profile-content">
        <div className="custom-profile-card">
          <div className="custom-profile-avatar-container">
            <img
              src={profileData.profileImage || '/default-avatar.png'}
              alt="Profile Avatar"
              className="custom-profile-avatar"
              onError={(e) => {
                console.error('Profile avatar failed to load:', e.target.src);
                e.target.src = '/default-avatar.png';
              }}
            />
            <div className="custom-avatar-overlay">
              <Camera size={24} />
            </div>
          </div>

          <div className="custom-profile-details-list">
            <div className="custom-profile-detail-item">
              <div className="custom-detail-icon">
                <User size={18} />
              </div>
              <div className="custom-detail-content">
                <label>Full Name</label>
                <div className="custom-detail-value">{profileData.name}</div>
              </div>
            </div>

            <div className="custom-profile-detail-item">
              <div className="custom-detail-icon">
                <AtSign size={18} />
              </div>
              <div className="custom-detail-content">
                <label>Username</label>
                <div className="custom-detail-value">{profileData.username}</div>
              </div>
            </div>

            <div className="custom-profile-detail-item">
              <div className="custom-detail-icon">
                <Mail size={18} />
              </div>
              <div className="custom-detail-content">
                <label>Email Address</label>
                <div className="custom-detail-value">{profileData.email}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Biolinks Section */}
        <div className="custom-biolinks-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h2>My BioLinks</h2>
              <p>Manage all your biolinks</p>
            </div>
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
                <div className="create-new-content">
                  <div className="plus-icon-wrap"><Plus size={32} /></div>
                  <span>Create New</span>
                </div>
              </div>
              {biolinks && biolinks.length > 0 ? (
                biolinks.map((b) => (
                  <div key={b._id} className="biolink-card">
                    <div className="biolink-card-header">
                      <div className="biolink-avatar">
                        {b?.profile?.avatar ? (
                          <img 
                            src={b.profile.avatar.startsWith('http') ? b.profile.avatar : `${import.meta.env.VITE_API_BASE_URL}${b.profile.avatar}`} 
                            alt="Avatar"
                            onError={(e) => {
                              console.error('BioLink avatar failed to load:', e.target.src);
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="avatar-fallback">{(b?.profile?.displayName || b?.username || 'B').substring(0,1)}</div>
                        )}
                      </div>
                      <div className="biolink-meta">
                        <div className="biolink-title">{b?.profile?.displayName || b?.username || 'Untitled'}</div>
                        <div className="biolink-subtitle">{b?.username ? `${window.location.origin}/p/${b.username}` : 'Draft'}</div>
                      </div>
                    </div>
                    <div className="biolink-card-actions">
                      {b?.username && (
                        <a className="btn-link" href={`/p/${b.username}`} target="_blank" rel="noreferrer">
                          <ExternalLink size={14} /> View
                        </a>
                      )}
                      <button className="btn-edit" onClick={() => handleEditBiolink(b._id)}>
                        <Pencil size={14} /> Edit
                      </button>
                      <button className="btn-delete" onClick={() => handleDeleteBiolink(b._id)}>
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="custom-no-links">
                  <p>You haven't created any BioLinks yet.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Linktree Links Section */}
        <div className="custom-linktree-section">
          <h2>My Linktree Links</h2>
          <p>Create and manage your custom linktree URLs</p>
          
          {message && (
            <div className="custom-message-alert">
              {message}
            </div>
          )}
          
          <div className="custom-create-linktree">
            <div className="custom-input-group">
              <input
                type="text"
                value={newLinktree}
                onChange={handleLinktreeChange}
                placeholder="Enter a new link name"
                className="custom-linktree-input"
              />
              <button 
                className="custom-create-button"
                onClick={createLinktreeLink}
              >
                <Plus size={16} /> Create Link
              </button>
            </div>
            <p className="custom-help-text">
              This will create a URL like: {window.location.origin}/{profileData.username}/[link-name]
            </p>
          </div>
          
          <div className="custom-linktree-list">
            {profileData.linktreeLinks && profileData.linktreeLinks.length > 0 ? (
              profileData.linktreeLinks.map((link, index) => (
                <div key={index} className="custom-linktree-item">
                  <div className="custom-linktree-info">
                    <div className="custom-link-icon">
                      <Link size={18} />
                    </div>
                    <div className="custom-link-details">
                      <div className="custom-link-name">{link.linkName}</div>
                      <div className="custom-link-url">
                        {window.location.origin}/{profileData.username}/{link.linkName}
                      </div>
                    </div>
                  </div>
                  <button 
                    className="custom-copy-button"
                    onClick={() => copyLinkToClipboard(link.linkName)}
                  >
                    Copy
                  </button>
                </div>
              ))
            ) : (
              <div className="custom-no-links">
                <p>You haven't created any linktree links yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;