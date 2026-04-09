import { useState, useEffect } from 'react';
import { 
    DollarSign, Palette, Scale, Save, ArrowLeft, 
    ShieldCheck, RefreshCw, CheckCircle2, ChevronRight
} from 'lucide-react';
import './DealNegotiatorSettings.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function DealNegotiatorSettings({ userId, onBack }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');
    
    const [prefs, setPrefs] = useState({
        acceptedDeliverables: [],
        minimumCashTarget: '',
        maximumAskTarget: '',
        barterAcceptance: false,
        paymentTerms: '',
        usageRightsLimits: '',
        exclusivityLimits: '',
        revisionsIncluded: '',
        deliveryTimeline: '',
        requiredFreeProduct: false,
        affiliateLinks: false,
        blockedIndustries: [],
        contractSignOff: '',
        contentFormat: '',
        creativeBriefRequirement: ''
    });

    useEffect(() => {
        if (userId) fetchSettings();
    }, [userId]);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    const fetchSettings = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/instagram/deal-negotiator/settings?userId=${userId}`);
            const data = await res.json();
            if (data.success && data.data) {
                setPrefs({ ...prefs, ...data.data });
            }
        } catch (e) {
            console.error('Fetch error:', e);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/instagram/deal-negotiator/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, negotiationPreferences: prefs })
            });
            const data = await res.json();
            if (data.success) {
                showToast('Settings Saved Successfully');
            } else {
                showToast(`Error: ${data.error}`);
            }
        } catch (e) {
            showToast(`Saving failed: ${e.message}`);
        }
        setSaving(false);
    };

    const handleChange = (field, value) => {
        setPrefs(prev => ({ ...prev, [field]: value }));
    };

    if (loading) {
        return (
            <div className="dns-loader">
                <RefreshCw size={24} className="dns-spin" />
                <p>Loading AI Laws...</p>
            </div>
        );
    }

    return (
        <div className="dns-container">
            <header className="dns-header">
                <div className="dns-title-area">
                    <h2>Sponsorship Laws</h2>
                    <p>Global non-negotiable rules for AI negotiation.</p>
                </div>
                <div className="dns-actions">
                    <button className="dns-btn dns-btn-back" onClick={onBack}>
                        <ArrowLeft size={18} /> Back
                    </button>
                    <button className="dns-btn dns-btn-save" onClick={handleSave} disabled={saving}>
                        {saving ? <RefreshCw size={18} className="dns-spin" /> : <Save size={18} />}
                        Save Changes
                    </button>
                </div>
            </header>

            <div className="dns-grid">
                {/* ZONE 1: FINANCIALS */}
                <section className="dns-card">
                    <div className="dns-section-head">
                        <div className="dns-icon-box" style={{ background: 'rgba(74, 222, 128, 0.15)', color: 'var(--green)' }}>
                            <DollarSign size={20} />
                        </div>
                        <h3 className="dns-card-title">Financials</h3>
                    </div>

                    <div className="dns-form-group">
                        <label className="dns-label">Min Fee ($ Floor)</label>
                        <input type="number" className="dns-input" value={prefs.minimumCashTarget} onChange={(e) => handleChange('minimumCashTarget', e.target.value)} placeholder="0.00" />
                    </div>

                    <div className="dns-form-group">
                        <label className="dns-label">Max Fee ($ Goal)</label>
                        <input type="number" className="dns-input" value={prefs.maximumAskTarget} onChange={(e) => handleChange('maximumAskTarget', e.target.value)} placeholder="0.00" />
                    </div>

                    <div className="dns-form-group">
                        <label className="dns-label">Payment Terms</label>
                        <input type="text" className="dns-input" value={prefs.paymentTerms} onChange={(e) => handleChange('paymentTerms', e.target.value)} placeholder="e.g. 50% upfront" />
                    </div>

                    <label className="dns-checkbox-row">
                        <input type="checkbox" className="dns-checkbox" checked={prefs.barterAcceptance} onChange={(e) => handleChange('barterAcceptance', e.target.checked)} />
                        <div className="dns-cb-text">
                            <strong>Accept Barter</strong>
                            <span>Allow product-only exchange.</span>
                        </div>
                    </label>

                    <label className="dns-checkbox-row">
                        <input type="checkbox" className="dns-checkbox" checked={prefs.affiliateLinks} onChange={(e) => handleChange('affiliateLinks', e.target.checked)} />
                        <div className="dns-cb-text">
                            <strong>Accept Affiliate</strong>
                            <span>Allow commission-based deals.</span>
                        </div>
                    </label>
                </section>

                {/* ZONE 2: CREATIVE */}
                <section className="dns-card">
                    <div className="dns-section-head">
                        <div className="dns-icon-box" style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' }}>
                            <Palette size={20} />
                        </div>
                        <h3 className="dns-card-title">Creative</h3>
                    </div>

                    <div className="dns-form-group">
                        <label className="dns-label">Accepted Deliverables</label>
                        <input type="text" className="dns-input" value={prefs.acceptedDeliverables?.join(', ') || ''} onChange={(e) => handleChange('acceptedDeliverables', e.target.value ? e.target.value.split(',').map(s => s.trim()) : [])} placeholder="Reels, Stories, Posts" />
                    </div>

                    <div className="dns-form-group">
                        <label className="dns-label">Content Format</label>
                        <input type="text" className="dns-input" value={prefs.contentFormat} onChange={(e) => handleChange('contentFormat', e.target.value)} placeholder="e.g. UGC style" />
                    </div>

                    <div className="dns-form-group">
                        <label className="dns-label">Brief Requirement</label>
                        <input type="text" className="dns-input" value={prefs.creativeBriefRequirement} onChange={(e) => handleChange('creativeBriefRequirement', e.target.value)} placeholder="e.g. PDF Required" />
                    </div>

                    <div className="dns-form-group">
                        <label className="dns-label">Revisions</label>
                        <input type="text" className="dns-input" value={prefs.revisionsIncluded} onChange={(e) => handleChange('revisionsIncluded', e.target.value)} placeholder="e.g. 1 Free Round" />
                    </div>

                    <label className="dns-checkbox-row">
                        <input type="checkbox" className="dns-checkbox" checked={prefs.requiredFreeProduct} onChange={(e) => handleChange('requiredFreeProduct', e.target.checked)} />
                        <div className="dns-cb-text">
                            <strong>Ship Product First</strong>
                            <span>Physical item must arrive first.</span>
                        </div>
                    </label>
                </section>

                {/* ZONE 3: LEGAL */}
                <section className="dns-card">
                    <div className="dns-section-head">
                        <div className="dns-icon-box" style={{ background: 'rgba(167, 139, 250, 0.15)', color: '#a78bfa' }}>
                            <Scale size={20} />
                        </div>
                        <h3 className="dns-card-title">Legal</h3>
                    </div>

                    <div className="dns-form-group">
                        <label className="dns-label">Usage Rights</label>
                        <input type="text" className="dns-input" value={prefs.usageRightsLimits} onChange={(e) => handleChange('usageRightsLimits', e.target.value)} placeholder="e.g. 30 Days Ads" />
                    </div>

                    <div className="dns-form-group">
                        <label className="dns-label">Exclusivity</label>
                        <input type="text" className="dns-input" value={prefs.exclusivityLimits} onChange={(e) => handleChange('exclusivityLimits', e.target.value)} placeholder="e.g. 14 Days Competitive" />
                    </div>

                    <div className="dns-form-group">
                        <label className="dns-label">Delivery Timeline</label>
                        <input type="text" className="dns-input" value={prefs.deliveryTimeline} onChange={(e) => handleChange('deliveryTimeline', e.target.value)} placeholder="e.g. 10 Working Days" />
                    </div>

                    <div className="dns-form-group">
                        <label className="dns-label">Blocked Industries</label>
                        <input type="text" className="dns-input" value={prefs.blockedIndustries?.join(', ') || ''} onChange={(e) => handleChange('blockedIndustries', e.target.value ? e.target.value.split(',').map(s => s.trim()) : [])} placeholder="Gambling, Adult, Crypto" />
                    </div>

                    <div className="dns-form-group">
                        <label className="dns-label">Contract Pref</label>
                        <input type="text" className="dns-input" value={prefs.contractSignOff} onChange={(e) => handleChange('contractSignOff', e.target.value)} placeholder="Standard Release only" />
                    </div>
                </section>
            </div>

            {toast && (
                <div className="dns-toast">
                    <CheckCircle2 size={20} color="var(--green)" /> {toast}
                </div>
            )}
        </div>
    );
}

export default DealNegotiatorSettings;
