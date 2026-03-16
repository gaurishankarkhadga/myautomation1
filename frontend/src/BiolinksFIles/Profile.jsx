import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, AtSign, Camera, Plus, Link, Pencil, Trash2, ExternalLink } from 'lucide-react';
import axios from 'axios';
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
      // Get token from local storage
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Configure axios request with authorization header
      const config = {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      // Fetch profile data from backend
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/profile/me`, 
        config
      );

      // Retrieve email from local storage as fallback
      const storedUserData = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Get linktree links from response or initialize empty array
      const linktreeLinks = response.data.linktreeLinks || [];
      // Update profile data state
      setProfileData({
        name: response.data.name || storedUserData.name || 'User',
        email: response.data.email || storedUserData.email || 'No email',
        username: response.data.username || storedUserData.username || 'username',
        profileImage: response.data.profileImage 
          ? (response.data.profileImage.startsWith('http') ? response.data.profileImage : `${import.meta.env.VITE_BACKEND_URL}${response.data.profileImage}`)
          : '/default-avatar.png',
        linktreeLinks: linktreeLinks
      });

      setIsLoading(false);
    } catch (err) {
      console.error('Profile fetch error:', err);
      
      // Try to use stored user data if available
      const storedUserData = JSON.parse(localStorage.getItem('user') || '{}');
      
      if (storedUserData.email) {
        setProfileData({
          name: storedUserData.name || 'User',
          email: storedUserData.email,
          username: storedUserData.username || 'username',
          profileImage: '/default-avatar.png',
          linktreeLinks: []
        });
      }

      setError(
        err.response?.data?.error || 
        err.message || 
        'Failed to load profile. Please log in again.'
      );
      setIsLoading(false);
    }
  };

  const fetchUserBiolinks = async () => {
    try {
      setIsBiolinksLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/biolinks/data`, {
        headers: { 'Authorization': `Bearer ${token}` }
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
      const token = localStorage.getItem('token');
      if (!token) return;
      await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/biolinks/remove`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
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
      // Get token from local storage
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Configure axios request with authorization header
      const config = {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      // Create new linktree link
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/profile/linktree`, 
        { linkName: newLinktree },
        config
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
          <h2>My BioLinks</h2>
          <p>Manage all your biolinks</p>

          {isBiolinksLoading ? (
            <div className="custom-profile-loading"><div className="custom-loading-spinner"></div></div>
          ) : (
            <div className="biolinks-grid">
              {biolinks && biolinks.length > 0 ? (
                biolinks.map((b) => (
                  <div key={b._id} className="biolink-card">
                    <div className="biolink-card-header">
                      <div className="biolink-avatar">
                        {b?.profile?.avatar ? (
                          <img 
                            src={b.profile.avatar.startsWith('http') ? b.profile.avatar : `${import.meta.env.VITE_BACKEND_URL}${b.profile.avatar}`} 
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