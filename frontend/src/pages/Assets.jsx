import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Link2, Package, BookOpen, Tag, FileText,
    Plus, Trash2, ToggleLeft, ToggleRight, X, ArrowLeft,
    ChevronDown, ChevronUp, Copy, ExternalLink, Loader, Edit2
} from 'lucide-react';
import '../styles/Assets.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// ── Asset type config ─────────────────────────────────────────────
const ASSET_TABS = [
    { id: 'link', label: 'Links', icon: Link2 },
    { id: 'product', label: 'Products', icon: Package },
    { id: 'course', label: 'Courses', icon: BookOpen },
    { id: 'affiliate_link', label: 'Affiliate', icon: Tag },
    { id: 'text_template', label: 'Templates', icon: FileText }
];

const TEMPLATE_CATEGORIES = [
    { id: 'bio', label: 'Bio' },
    { id: 'cta', label: 'CTA' },
    { id: 'dm_reply', label: 'DM Reply' },
    { id: 'social', label: 'Social' }
];

// ── Main Component ────────────────────────────────────────────────
function Assets() {
    const navigate = useNavigate();
    const storedUserId = localStorage.getItem('insta_user_id') || localStorage.getItem('yt_channel_id');
    const [userId] = useState(storedUserId);
    const [assets, setAssets] = useState([]);
    const [activeTab, setActiveTab] = useState('link');
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingAssetId, setEditingAssetId] = useState(null);
    const [defaultTemplates, setDefaultTemplates] = useState([]);
    const [formData, setFormData] = useState({
        title: '', description: '', url: '', price: '',
        affiliateCode: '', category: '', tags: '', imageUrl: ''
    });
    const [imageUploading, setImageUploading] = useState(false);

    // ── Handle Image Upload ───────────────────────────────────────────
    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setImageUploading(true);
        const data = new FormData();
        data.append('productImage', file);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/biolinks/product-image`, {
                method: 'POST',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                body: data
            });
            const result = await res.json();
            if (result.success) {
                setFormData(p => ({ ...p, imageUrl: result.imageUrl }));
            } else {
                console.error('[AssetsPanel] Upload failed:', result.error);
            }
        } catch (err) {
            console.error('[AssetsPanel] Upload error:', err);
        } finally {
            setImageUploading(false);
        }
    };

    // ── Fetch assets ──────────────────────────────────────────────
    const fetchAssets = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/assets/${userId}`);
            const data = await res.json();
            if (data.success) setAssets(data.assets || []);
        } catch (err) {
            console.error('[AssetsPanel] Fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const fetchDefaultTemplates = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/assets/templates/default`);
            const data = await res.json();
            if (data.success) setDefaultTemplates(data.templates || []);
        } catch (err) {
            console.error('[AssetsPanel] Template fetch error:', err);
        }
    }, []);

    useEffect(() => {
        if (userId) { // Load instantly in background!
            fetchAssets();
            fetchDefaultTemplates();
        }
    }, [userId, fetchAssets, fetchDefaultTemplates]);

    // ── Add asset ─────────────────────────────────────────────────
    const handleAdd = async () => {
        if (!formData.title.trim()) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/assets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    type: activeTab,
                    title: formData.title.trim(),
                    description: formData.description.trim(),
                    url: formData.url.trim(),
                    price: formData.price.trim(),
                    affiliateCode: formData.affiliateCode.trim(),
                    category: formData.category,
                    imageUrl: formData.imageUrl,
                    tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : []
                })
            });
            const data = await res.json();
            if (data.success) {
                setAssets(prev => [data.asset, ...prev]);
                setFormData({ title: '', description: '', url: '', price: '', affiliateCode: '', category: '', tags: '', imageUrl: '' });
                setShowAddForm(false);
            }
        } catch (err) {
            console.error('[AssetsPanel] Add error:', err);
        }
    };

    // ── Update asset ──────────────────────────────────────────────
    const handleUpdate = async () => {
        if (!formData.title.trim() || !editingAssetId) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/assets/${editingAssetId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: formData.title.trim(),
                    description: formData.description.trim(),
                    url: formData.url.trim(),
                    price: formData.price.trim(),
                    affiliateCode: formData.affiliateCode.trim(),
                    category: formData.category,
                    imageUrl: formData.imageUrl,
                    tags: formData.tags ? (typeof formData.tags === 'string' ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : formData.tags) : []
                })
            });
            const data = await res.json();
            if (data.success) {
                setAssets(prev => prev.map(a => a._id === editingAssetId ? data.asset : a));
                setFormData({ title: '', description: '', url: '', price: '', affiliateCode: '', category: '', tags: '', imageUrl: '' });
                setShowAddForm(false);
                setEditingAssetId(null);
            }
        } catch (err) {
            console.error('[AssetsPanel] Update error:', err);
        }
    };

    // ── Edit Click ────────────────────────────────────────────────
    const handleEditClick = (asset) => {
        setEditingAssetId(asset._id);
        setFormData({
            title: asset.title || '',
            description: asset.description || '',
            url: asset.url || '',
            price: asset.price || '',
            affiliateCode: asset.affiliateCode || '',
            category: asset.category || '',
            tags: asset.tags ? asset.tags.join(', ') : '',
            imageUrl: asset.imageUrl || ''
        });
        setShowAddForm(true);
        // Scroll to top where the form exists
        setTimeout(() => {
            document.querySelector('.assets-content').scrollTop = 0;
        }, 100);
    };

    // ── Toggle asset ──────────────────────────────────────────────
    const handleToggle = async (id) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/assets/${id}/toggle`, { method: 'PATCH' });
            const data = await res.json();
            if (data.success) {
                setAssets(prev => prev.map(a => a._id === id ? { ...a, isActive: data.isActive } : a));
            }
        } catch (err) {
            console.error('[AssetsPanel] Toggle error:', err);
        }
    };

    // ── Delete asset ──────────────────────────────────────────────
    const handleDelete = async (id) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/assets/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                setAssets(prev => prev.filter(a => a._id !== id));
            }
        } catch (err) {
            console.error('[AssetsPanel] Delete error:', err);
        }
    };

    // ── Copy template to clipboard ────────────────────────────────
    const handleCopyTemplate = (text) => {
        navigator.clipboard.writeText(text).catch(() => { });
    };

    // ── Save default template as user asset ───────────────────────
    const handleSaveTemplate = async (template) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/assets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    type: 'text_template',
                    title: template.title,
                    description: template.description,
                    category: template.category
                })
            });
            const data = await res.json();
            if (data.success) {
                setAssets(prev => [data.asset, ...prev]);
            }
        } catch (err) {
            console.error('[AssetsPanel] Save template error:', err);
        }
    };

    // ── Filter assets for current tab ─────────────────────────────
    const filteredAssets = assets.filter(a => a.type === activeTab);

    return (
        <div className="assets-page-container">
            <div className="assets-panel">
                {/* Header */}
                <div className="assets-panel-header">
                    <div className="assets-header-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button 
                             className="assets-back-btn" 
                             onClick={() => navigate(-1)} 
                             aria-label="Back to ChatHub"
                             style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                                <line x1="19" y1="12" x2="5" y2="12"></line>
                                <polyline points="12 19 5 12 12 5"></polyline>
                            </svg>
                        </button>
                        <h3 style={{ margin: 0, color: '#fff', fontSize: '16px', display: 'flex', alignItems: 'center' }}>📦 My Assets</h3>
                    </div>
                </div>

                {/* Tabs */}
                <div className="assets-tabs">
                    {ASSET_TABS.map(tab => {
                        const TabIcon = tab.icon;
                        const count = assets.filter(a => a.type === tab.id).length;
                        return (
                            <button
                                key={tab.id}
                                className={`asset-tab ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => { setActiveTab(tab.id); setShowAddForm(false); setEditingAssetId(null); setFormData({ title: '', description: '', url: '', price: '', affiliateCode: '', category: '', tags: '', imageUrl: '' }); }}
                            >
                                <TabIcon size={14} />
                                <span>{tab.label}</span>
                                {count > 0 && <span className="tab-count">{count}</span>}
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                <div className="assets-content">
                    {loading ? (
                        <div className="assets-loading"><Loader size={20} className="spin" /> Loading...</div>
                    ) : (
                        <>
                            {/* Add button */}
                            <button
                                className="assets-add-btn"
                                onClick={() => {
                                    if (showAddForm) {
                                        setShowAddForm(false);
                                        setEditingAssetId(null);
                                        setFormData({ title: '', description: '', url: '', price: '', affiliateCode: '', category: '', tags: '', imageUrl: '' });
                                    } else {
                                        setShowAddForm(true);
                                    }
                                }}
                            >
                                {showAddForm ? <ChevronUp size={14} /> : <Plus size={14} />}
                                <span>{showAddForm ? 'Cancel' : `Add ${ASSET_TABS.find(t => t.id === activeTab)?.label?.slice(0, -1) || 'Item'}`}</span>
                            </button>

                            {/* Add Form */}
                            {showAddForm && (
                                <div className="asset-add-form">
                                    <input
                                        type="text"
                                        placeholder="Title *"
                                        value={formData.title}
                                        onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                                        className="asset-input"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Description"
                                        value={formData.description}
                                        onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                                        className="asset-input"
                                    />

                                    {activeTab !== 'text_template' && (
                                        <input
                                            type="text"
                                            placeholder="URL"
                                            value={formData.url}
                                            onChange={e => setFormData(p => ({ ...p, url: e.target.value }))}
                                            className="asset-input"
                                        />
                                    )}

                                    {['product', 'course', 'affiliate_link'].includes(activeTab) && (
                                        <div className="asset-image-upload">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                id="asset-image"
                                                onChange={handleImageUpload}
                                                style={{ display: 'none' }}
                                            />
                                            <label htmlFor="asset-image" className="asset-upload-label">
                                                {imageUploading ? 'Uploading...' : formData.imageUrl ? 'Change Image' : 'Upload Cover Image'}
                                            </label>
                                            {formData.imageUrl && (
                                                <div className="asset-image-preview">
                                                    <img src={formData.imageUrl.startsWith('http') ? formData.imageUrl : `${API_BASE_URL}${formData.imageUrl}`} alt="Preview" />
                                                    <button type="button" className="remove-image-btn" onClick={() => setFormData(p => ({ ...p, imageUrl: '' }))}><X size={12} /></button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {['product', 'course', 'affiliate_link'].includes(activeTab) && (
                                        <input
                                            type="text"
                                            placeholder={activeTab === 'affiliate_link' ? 'Commission / Price' : 'Price'}
                                            value={formData.price}
                                            onChange={e => setFormData(p => ({ ...p, price: e.target.value }))}
                                            className="asset-input"
                                        />
                                    )}

                                    {activeTab === 'affiliate_link' && (
                                        <input
                                            type="text"
                                            placeholder="Affiliate Code / Tracking ID"
                                            value={formData.affiliateCode}
                                            onChange={e => setFormData(p => ({ ...p, affiliateCode: e.target.value }))}
                                            className="asset-input"
                                        />
                                    )}

                                    {activeTab === 'text_template' && (
                                        <select
                                            value={formData.category}
                                            onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
                                            className="asset-input"
                                        >
                                            <option value="">Select Category</option>
                                            {TEMPLATE_CATEGORIES.map(c => (
                                                <option key={c.id} value={c.id}>{c.label}</option>
                                            ))}
                                        </select>
                                    )}

                                    <input
                                        type="text"
                                        placeholder="Tags (comma separated)"
                                        value={formData.tags}
                                        onChange={e => setFormData(p => ({ ...p, tags: e.target.value }))}
                                        className="asset-input"
                                    />

                                    <button className="asset-save-btn" onClick={editingAssetId ? handleUpdate : handleAdd} disabled={!formData.title.trim()}>
                                        <Plus size={14} /> {editingAssetId ? 'Update Changes' : 'Add'}
                                    </button>
                                </div>
                            )}

                            {/* Asset List */}
                            {filteredAssets.length === 0 && !showAddForm ? (
                                <div className="assets-empty">
                                    No {ASSET_TABS.find(t => t.id === activeTab)?.label?.toLowerCase() || 'items'} yet.
                                    Click + to add one.
                                </div>
                            ) : (
                                <div className={`assets-list ${['product', 'course', 'affiliate_link'].includes(activeTab) ? 'grid-layout' : ''}`}>
                                    {filteredAssets.map(asset => (
                                        <div key={asset._id} className={`asset-item ${['product', 'course', 'affiliate_link'].includes(activeTab) ? 'asset-card' : ''} ${!asset.isActive ? 'inactive' : ''}`}>
                                            {['product', 'course', 'affiliate_link'].includes(activeTab) && asset.imageUrl && (
                                                <div className="asset-card-image">
                                                    <img src={asset.imageUrl.startsWith('http') ? asset.imageUrl : `${API_BASE_URL}${asset.imageUrl}`} alt={asset.title} />
                                                </div>
                                            )}
                                            <div className="asset-item-info">
                                                <span className="asset-item-title">{asset.title}</span>
                                                {asset.description && (
                                                    <span className="asset-item-desc">{asset.description}</span>
                                                )}
                                                {asset.price && <span className="asset-item-price">${asset.price}</span>}
                                            </div>
                                            <div className="asset-item-actions-bar">
                                                {asset.url && ['product', 'course', 'affiliate_link'].includes(activeTab) ? (
                                                    <a href={asset.url} target="_blank" rel="noopener noreferrer" className="asset-checkout-btn">
                                                        Checkout
                                                    </a>
                                                ) : (
                                                    asset.url && (
                                                        <span className="asset-item-url">
                                                            <ExternalLink size={10} />
                                                            {asset.url.replace(/^https?:\/\//, '').substring(0, 30)}
                                                        </span>
                                                    )
                                                )}
                                                <div className="asset-item-actions">
                                                    <button onClick={() => handleEditClick(asset)} title="Edit">
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button onClick={() => handleToggle(asset._id)} title={asset.isActive ? 'Deactivate' : 'Activate'}>
                                                        {asset.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                                    </button>
                                                    <button onClick={() => handleDelete(asset._id)} title="Delete">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Default Templates Section (only for text_template tab) */}
                            {activeTab === 'text_template' && defaultTemplates.length > 0 && (
                                <div className="default-templates-section">
                                    <h4 className="templates-heading">📄 Premade Templates</h4>
                                    {TEMPLATE_CATEGORIES.map(cat => {
                                        const catTemplates = defaultTemplates.filter(t => t.category === cat.id);
                                        if (catTemplates.length === 0) return null;
                                        return (
                                            <div key={cat.id} className="template-category">
                                                <span className="template-cat-label">{cat.label}</span>
                                                {catTemplates.map((tmpl, i) => (
                                                    <div key={i} className="template-item">
                                                        <div className="template-item-content">
                                                            <span className="template-title">{tmpl.title}</span>
                                                            <span className="template-text">{tmpl.description}</span>
                                                        </div>
                                                        <div className="template-item-actions">
                                                            <button onClick={() => handleCopyTemplate(tmpl.description)} title="Copy">
                                                                <Copy size={13} />
                                                            </button>
                                                            <button onClick={() => handleSaveTemplate(tmpl)} title="Save to my assets">
                                                                <Plus size={13} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Assets;
