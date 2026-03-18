import { useState, useEffect, useCallback } from 'react';
import {
    Link2, Package, BookOpen, Tag, FileText,
    Plus, Trash2, ToggleLeft, ToggleRight, X,
    ChevronDown, ChevronUp, Copy, ExternalLink, Loader
} from 'lucide-react';

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
function AssetsPanel({ userId, isOpen, onClose }) {
    const [assets, setAssets] = useState([]);
    const [activeTab, setActiveTab] = useState('link');
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [defaultTemplates, setDefaultTemplates] = useState([]);
    const [formData, setFormData] = useState({
        title: '', description: '', url: '', price: '',
        affiliateCode: '', category: '', tags: ''
    });

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
        if (isOpen && userId) {
            fetchAssets();
            fetchDefaultTemplates();
        }
    }, [isOpen, userId, fetchAssets, fetchDefaultTemplates]);

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
                    tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : []
                })
            });
            const data = await res.json();
            if (data.success) {
                setAssets(prev => [data.asset, ...prev]);
                setFormData({ title: '', description: '', url: '', price: '', affiliateCode: '', category: '', tags: '' });
                setShowAddForm(false);
            }
        } catch (err) {
            console.error('[AssetsPanel] Add error:', err);
        }
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
        navigator.clipboard.writeText(text).catch(() => {});
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

    if (!isOpen) return null;

    return (
        <div className="assets-panel-overlay" onClick={onClose}>
            <div className="assets-panel" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="assets-panel-header">
                    <h3>📦 My Assets</h3>
                    <button className="assets-close-btn" onClick={onClose} aria-label="Close assets panel">
                        <X size={18} />
                    </button>
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
                                onClick={() => { setActiveTab(tab.id); setShowAddForm(false); }}
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
                                onClick={() => setShowAddForm(!showAddForm)}
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

                                    <button className="asset-save-btn" onClick={handleAdd} disabled={!formData.title.trim()}>
                                        <Plus size={14} /> Add
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
                                <div className="assets-list">
                                    {filteredAssets.map(asset => (
                                        <div key={asset._id} className={`asset-item ${!asset.isActive ? 'inactive' : ''}`}>
                                            <div className="asset-item-info">
                                                <span className="asset-item-title">{asset.title}</span>
                                                {asset.description && (
                                                    <span className="asset-item-desc">{asset.description}</span>
                                                )}
                                                {asset.url && (
                                                    <span className="asset-item-url">
                                                        <ExternalLink size={10} />
                                                        {asset.url.replace(/^https?:\/\//, '').substring(0, 30)}
                                                    </span>
                                                )}
                                                {asset.price && <span className="asset-item-price">${asset.price}</span>}
                                            </div>
                                            <div className="asset-item-actions">
                                                <button onClick={() => handleToggle(asset._id)} title={asset.isActive ? 'Deactivate' : 'Activate'}>
                                                    {asset.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                                </button>
                                                <button onClick={() => handleDelete(asset._id)} title="Delete">
                                                    <Trash2 size={14} />
                                                </button>
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

export default AssetsPanel;
