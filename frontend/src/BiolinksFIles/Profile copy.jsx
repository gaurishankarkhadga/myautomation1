import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Profile.css'

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [biolink, setBiolink] = useState(null);
  const [biolinks, setBiolinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }
        const backendUrl = import.meta.env.VITE_BACKEND_URL;

        const [userRes, biolinkRes] = await Promise.all([
          fetch(`${backendUrl}/api/profile/me`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${backendUrl}/api/biolinks/data`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (userRes.ok) {
          const u = await userRes.json();
          setUser(u);
        }
        if (biolinkRes.ok) {
          const b = await biolinkRes.json();
          setBiolink(b.biolink);
          if (Array.isArray(b.biolinks)) setBiolinks(b.biolinks);
          if (!user && b.user) setUser(b.user);
        }
      } catch (e) {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="up-loading">Loading...</div>;
  if (error) return <div className="up-error">{error}</div>;

  const avatarUrl = (user?.avatar)
    ? (user.avatar.startsWith('http') ? user.avatar : `${import.meta.env.VITE_BACKEND_URL}${user.avatar}`)
    : null;

  return (
    <div className="up-page">
      {message && (
        <div className="up-message">{message}</div>
      )}

      <div className="up-header">
        <div className="up-avatar">
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt="avatar"
              onError={(e) => {
                console.error('Profile avatar failed to load:', e.target.src);
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <div className="up-avatar-fallback">{(user?.displayName || user?.username || 'U').substring(0,1)}</div>
          )}
        </div>
        <div className="up-identity">
          <h2>{user?.displayName || user?.name || user?.username}</h2>
          <div className="up-email">{user?.email}</div>
        </div>
      </div>

      <section className="up-section">
        <div className="up-section-header">
          <h3>My BioLinks</h3>
        </div>
        {biolinks && biolinks.length > 0 ? (
          <div className="up-biolinks-grid">
            {biolinks.map((b) => (
              <div key={b._id} className="up-biolink-card">
                <div className="up-biolink-head">
                  <div className="up-biolink-thumb">
                    {b?.profile?.avatar ? (
                      <img 
                        src={b.profile.avatar.startsWith('http') ? b.profile.avatar : `${import.meta.env.VITE_BACKEND_URL}${b.profile.avatar}`} 
                        alt="avatar"
                        onError={(e) => {
                          console.error('BioLink avatar failed to load:', e.target.src);
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="up-avatar-fallback">{(b?.profile?.displayName || b?.username || 'B').substring(0,1)}</div>
                    )}
                  </div>
                  <div className="up-biolink-meta">
                    <div className="up-biolink-title">{b?.profile?.displayName || b?.username || 'Untitled'}</div>
                    <div className="up-biolink-sub">{b?.username ? `${window.location.origin}/p/${b.username}` : 'Draft'}</div>
                  </div>
                </div>
                <div className="up-biolink-actions">
                  {b?.username && (
                    <a className="up-btn up-btn-outline" href={`/p/${b.username}`} target="_blank" rel="noreferrer">View</a>
                  )}
                  <button className="up-btn" onClick={() => navigate('/biolink/editor', { state: { id: b._id } })}>Edit</button>
                  <button className="up-btn up-btn-danger" onClick={async () => {
                    if (!window.confirm('Delete this BioLink?')) return;
                    try {
                      const token = localStorage.getItem('token');
                      const backendUrl = import.meta.env.VITE_BACKEND_URL;
                      await fetch(`${backendUrl}/api/biolinks/remove`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: b._id })
                      });
                      setMessage('BioLink deleted');
                      setBiolinks(prev => prev.filter(x => x._id !== b._id));
                      setTimeout(() => setMessage(''), 2000);
                    } catch (e) {
                      setMessage('Failed to delete');
                      setTimeout(() => setMessage(''), 2000);
                    }
                  }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="up-empty">No BioLinks yet.</div>
        )}
      </section>

      <div className="up-grid">
        <div className="up-card">
          <h3>Account</h3>
          <div className="up-kv"><span>Username:</span><b>{user?.username || '-'}</b></div>
          <div className="up-kv"><span>Name:</span><b>{user?.displayName || user?.name || '-'}</b></div>
          <div className="up-kv"><span>Email:</span><b>{user?.email || '-'}</b></div>
          <div className="up-kv"><span>Created:</span><b>{user?.createdAt ? new Date(user.createdAt).toLocaleString() : '-'}</b></div>
        </div>

        <div className="up-card">
          <h3>About</h3>
          <div className="up-about">{user?.bio || 'No bio yet.'}</div>
        </div>
      </div>
    </div>
  )
}

export default Profile