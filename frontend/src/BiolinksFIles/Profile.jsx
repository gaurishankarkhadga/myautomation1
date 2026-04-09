import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Mail, AtSign, Camera, Plus, Link, Pencil, Trash2, ExternalLink, 
  Globe, ShieldCheck, TrendingUp, Zap, Gift, DollarSign, Layout, ChevronRight, ArrowLeft, RefreshCw, Copy, CheckCircle
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
      const ytChannelId = localStorage.getItem('yt_channel_id');

      if (!instaToken && !ytChannelId) {
        throw new Error('No social account connected.');
      }

      let name = 'Creator';
      let email = 'No email provided';
      let username = 'creator';
      let profileImage = '';

      if (instaToken) {
        try {
          const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/instagram/profile?token=${instaToken}`);
          if (res.data.success) {
            const data = res.data.data;
            name = data.username || 'Instagram User';
            username = data.username || 'user';
            profileImage = data.profile_picture_url || '';
          }
        } catch (e) { console.error('IG fetch error', e); }
      } else if (ytChannelId) {
        try {
          const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/youtube/profile?channelId=${ytChannelId}`);
          if (res.data.success && res.data.data) {
            const data = res.data.data;
            name = data.title || 'YouTube Creator';
            username = data.title?.toLowerCase().replace(/\s+/g, '_') || 'user';
            profileImage = data.thumbnailUrl || '';
          }
        } catch (e) { console.error('YT fetch error', e); }
      }

      setProfileData({
        name,
        email,
        username,
        profileImage,
        linktreeLinks: []
      });
      setIsLoading(false);
    } catch (err) {
      setError(err.message || 'Failed to load profile.');
      setIsLoading(false);
    }
  };

  const fetchUserBiolinks = async () => {
    try {
      setIsBiolinksLoading(true);
      const headers = getBioLinkAuthHeaders();
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/biolinks/data`, { headers });
      const list = Array.isArray(response.data?.biolinks) ? response.data.biolinks : (response.data?.biolink ? [response.data.biolink] : []);
      setBiolinks(list);
    } catch (err) { console.error('Biolinks error:', err); }
    finally { setIsBiolinksLoading(false); }
  };

  const handleEditBiolink = (id) => navigate('/biolink/editor', { state: { id } });

  const handleDeleteBiolink = async (id) => {
    if (!window.confirm('Delete this BioLink?')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/api/biolinks/remove`, {
        headers: getBioLinkAuthHeaders(),
        data: { id }
      });
      setMessage('BioLink Deleted');
      fetchUserBiolinks();
      setTimeout(() => setMessage(''), 2000);
    } catch (e) { setMessage('Failed to delete'); }
  };

  const createLinktreeLink = async () => {
    if (!newLinktree.trim()) return;
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/profile/linktree`, { linkName: newLinktree }, { headers: getBioLinkAuthHeaders() });
      setProfileData({ ...profileData, linktreeLinks: response.data.linktreeLinks });
      setNewLinktree('');
      setMessage('Asset Added');
      setTimeout(() => setMessage(''), 2000);
    } catch (e) { setMessage('Failed to add asset'); }
  };

  const copyToClipboard = (linkName) => {
    const link = `${window.location.origin}/${profileData.username}/${linkName}`;
    navigator.clipboard.writeText(link).then(() => {
      setMessage('Link Copied');
      setTimeout(() => setMessage(''), 2000);
    });
  };

  if (isLoading) return (
    <div className="ep-loader">
      <RefreshCw size={32} className="ep-spin" />
      <p>Building Universe...</p>
    </div>
  );

  return (
    <div className="ep-page">
      <div className="ep-container">
        
        <header className="ep-header">
          <button className="ep-back-btn" onClick={() => navigate('/chat')} aria-label="Go Back">
            <ArrowLeft size={24} strokeWidth={2.5} />
          </button>
          <div className="ep-pills">
            <div className="ep-pill"><Zap size={14} /> Active</div>
            <div className="ep-pill"><Globe size={14} /> Public</div>
          </div>
        </header>

        {/* PROFILE SECTION */}
        <section className="ep-profile-card">
          <div className="ep-avatar-wrap">
            <img 
               className="ep-avatar" 
               src={profileData.profileImage || `https://ui-avatars.com/api/?name=${profileData.username}&background=000&color=fff`} 
               alt="Avatar" 
            />
          </div>
          <div>
            <h1 className="ep-name">{profileData.name}</h1>
            <p className="ep-username">@{profileData.username}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
             <button className="ep-icon-btn" aria-label="Change Camera"><Camera size={20} /></button>
             <button className="ep-icon-btn" aria-label="Verify account"><ShieldCheck size={20} /></button>
          </div>
        </section>

        {/* BIOLINKS SECTION */}
        <section className="ep-section">
          <div className="ep-section-head">
            <h2 className="ep-section-title"><Layout size={20} /> BioLinks</h2>
            <button className="ep-pill" onClick={() => navigate('/biolink/editor', { state: { new: true, reset: true } })}>
              <Plus size={12} /> New Link
            </button>
          </div>
          
          <div className="ep-card">
            {isBiolinksLoading ? <RefreshCw size={20} className="ep-spin" /> : (
              <div className="ep-biolinks-list">
                {biolinks.map(b => (
                  <div key={b._id} className="ep-biolink-item">
                    <div className="ep-biolink-info">
                      <div className="ep-biolink-title">{b?.profile?.displayName || b?.username}</div>
                      <div className="ep-biolink-path">p/{b?.username}</div>
                    </div>
                    <div className="ep-actions">
                      <button className="ep-icon-btn" onClick={() => b.username && window.open(`/p/${b.username}`, '_blank')} aria-label="View Link">
                        <ExternalLink size={18} />
                      </button>
                      <button className="ep-edit-btn" onClick={() => handleEditBiolink(b._id)}>
                        <Pencil size={16} /> Edit
                      </button>
                      <button className="ep-icon-btn" style={{ color: '#f87171' }} onClick={() => handleDeleteBiolink(b._id)} aria-label="Delete Link">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
                {biolinks.length === 0 && <p style={{ opacity: 0.3, textAlign: 'center', fontSize: '0.85rem' }}>No BioLinks found.</p>}
              </div>
            )}
          </div>
        </section>

        {/* AUTOMATION BENTO */}
        <section className="ep-section">
            <h2 className="ep-section-title"><Zap size={20} /> Automation</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="ep-card" style={{ padding: '20px', textAlign: 'center' }} onClick={() => navigate('/chat')}>
                    <Gift size={24} style={{ color: '#a78bfa', margin: '0 auto 10px' }} />
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Campaigns</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.4 }}>Direct Collabs</div>
                </div>
                <div className="ep-card" style={{ padding: '20px', textAlign: 'center' }}>
                    <DollarSign size={24} style={{ color: '#3b82f6', margin: '0 auto 10px' }} />
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Affiliates</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.4 }}>Coming Soon</div>
                </div>
            </div>
        </section>

        {/* DIGITAL ASSETS */}
        <section className="ep-section">
          <h2 className="ep-section-title"><Globe size={20} /> My Store Assets</h2>
          <div className="ep-card">
            <div className="ep-asset-input-wrap">
               <input 
                  type="text" 
                  className="ep-input" 
                  placeholder="Asset Nickname (e.g. MyStore)" 
                  value={newLinktree} 
                  onChange={(e) => setNewLinktree(e.target.value)}
                />
               <button className="ep-add-btn" onClick={createLinktreeLink}><Plus size={20} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              {profileData.linktreeLinks?.map((link, i) => (
                <div key={i} className="ep-asset-item">
                   <div className="ep-asset-name">{link.linkName}</div>
                   <button className="ep-copy-btn" onClick={() => copyToClipboard(link.linkName)}>
                      <Copy size={12} /> Copy
                   </button>
                </div>
              ))}
              {(!profileData.linktreeLinks || profileData.linktreeLinks.length === 0) && (
                 <p style={{ opacity: 0.3, textAlign: 'center', fontSize: '0.85rem', margin: '10px 0' }}>No assets yet.</p>
              )}
            </div>
          </div>
        </section>

      </div>

      {message && <div className="ep-toast"><CheckCircle size={18} /> {message}</div>}
    </div>
  );
};

export default Profile;