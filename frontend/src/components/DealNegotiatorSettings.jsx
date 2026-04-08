import { useState, useEffect } from 'react';
import '../styles/BrandDeals.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function DealNegotiatorSettings({ userId, onBack }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');
    
    // 15-Point Matrix State
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
                setPrefs({
                    ...prefs,
                    ...data.data,
                    // Handle array fields for controlled inputs if needed
                });
            }
        } catch (e) {
            console.error('Fetch settings error:', e);
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
                showToast('✅ 15-Point Rules Saved! AI is now bound by these laws.');
            } else {
                showToast(`❌ Error: ${data.error}`);
            }
        } catch (e) {
            showToast(`❌ Saving failed: ${e.message}`);
        }
        setSaving(false);
    };

    const handleChange = (field, value) => {
        setPrefs(prev => ({ ...prev, [field]: value }));
    };

    if (loading) {
        return <div className="mp-loading"><div className="mp-loading-pulse"></div><p>Loading your AI rules...</p></div>;
    }

    return (
        <div className="mp-applications">
            <div className="mp-header-top" style={{ marginBottom: '20px' }}>
                <div>
                    <h2 className="mp-title">🤖 AI Negotiator Matrix</h2>
                    <p className="mp-subtitle">Set your 15 non-negotiable laws. The AI will strictly enforce them globally.</p>
                </div>
                <button onClick={handleSave} disabled={saving} className="mp-sync-btn" style={{ background: '#69f0ae', color: '#1a1a2e' }}>
                    {saving ? 'Saving...' : '💾 Save Global Rules'}
                </button>
            </div>

            <div className="deal-settings-grid" style={{ display: 'grid', gap: '20px', paddingBottom: '30px' }}>
                
                {/* FINANCIALS */}
                <div className="settings-card" style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px' }}>
                    <h3 style={{ marginTop: 0, color: '#64b5f6' }}>💰 Financial Boundaries</h3>
                    
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px' }}>1. Minimum Cash Target ($ Floor)</label>
                        <input type="number" value={prefs.minimumCashTarget} onChange={(e) => handleChange('minimumCashTarget', e.target.value)} placeholder="e.g. 500" style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px' }} />
                        <span style={{ fontSize: '0.8rem', color: '#888' }}>AI will instantly counter anything below this.</span>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px' }}>2. Maximum Ask Target ($ Ceiling)</label>
                        <input type="number" value={prefs.maximumAskTarget} onChange={(e) => handleChange('maximumAskTarget', e.target.value)} placeholder="e.g. 2000" style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px' }} />
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px' }}>3. Payment Terms</label>
                        <input type="text" value={prefs.paymentTerms} onChange={(e) => handleChange('paymentTerms', e.target.value)} placeholder="e.g. 50% upfront, 50% before posting" style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px' }} />
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={prefs.barterAcceptance} onChange={(e) => handleChange('barterAcceptance', e.target.checked)} />
                            4. Do you accept Barter (Free Products with NO cash)?
                        </label>
                    </div>

                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={prefs.affiliateLinks} onChange={(e) => handleChange('affiliateLinks', e.target.checked)} />
                            5. Do you accept Affiliate/Commission ONLY deals?
                        </label>
                    </div>
                </div>

                {/* CREATIVE & SCOPE */}
                <div className="settings-card" style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px' }}>
                    <h3 style={{ marginTop: 0, color: '#ffab40' }}>🎨 Creative Scope & Deliverables</h3>
                    
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px' }}>6. Accepted Deliverables</label>
                        <input type="text" value={prefs.acceptedDeliverables?.join(', ')} onChange={(e) => handleChange('acceptedDeliverables', e.target.value.split(', '))} placeholder="e.g. Reels, Story, YouTube Integration" style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px' }} />
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px' }}>7. Content Format / Tone</label>
                        <input type="text" value={prefs.contentFormat} onChange={(e) => handleChange('contentFormat', e.target.value)} placeholder="e.g. UGC style, Dedicated Review, Sketch" style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px' }} />
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px' }}>8. Creative Brief Requirement</label>
                        <input type="text" value={prefs.creativeBriefRequirement} onChange={(e) => handleChange('creativeBriefRequirement', e.target.value)} placeholder="e.g. AI must acquire full written brief before accepting" style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px' }} />
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px' }}>9. Revisions Included</label>
                        <input type="text" value={prefs.revisionsIncluded} onChange={(e) => handleChange('revisionsIncluded', e.target.value)} placeholder="e.g. 1 free round, $100 per extra round" style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px' }} />
                    </div>

                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={prefs.requiredFreeProduct} onChange={(e) => handleChange('requiredFreeProduct', e.target.checked)} />
                            10. Even on paid deals, must they send the physical product?
                        </label>
                    </div>
                </div>

                {/* RIGHTS & LEGAL */}
                <div className="settings-card" style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px' }}>
                    <h3 style={{ marginTop: 0, color: '#ce93d8' }}>⚖️ Rights & Legal</h3>
                    
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px' }}>11. Usage Rights Limits</label>
                        <input type="text" value={prefs.usageRightsLimits} onChange={(e) => handleChange('usageRightsLimits', e.target.value)} placeholder="e.g. 30 days paid ads allowed, nothing more" style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px' }} />
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px' }}>12. Exclusivity Limits</label>
                        <input type="text" value={prefs.exclusivityLimits} onChange={(e) => handleChange('exclusivityLimits', e.target.value)} placeholder="e.g. 30-day competitor block max" style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px' }} />
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px' }}>13. Minimum Delivery Timeline</label>
                        <input type="text" value={prefs.deliveryTimeline} onChange={(e) => handleChange('deliveryTimeline', e.target.value)} placeholder="e.g. 7 days minimum from product receipt" style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px' }} />
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px' }}>14. Blocked Industries</label>
                        <input type="text" value={prefs.blockedIndustries?.join(', ')} onChange={(e) => handleChange('blockedIndustries', e.target.value.split(', '))} placeholder="e.g. Gambling, Crypto, Fast Fashion" style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px' }} />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px' }}>15. Contract Preference</label>
                        <input type="text" value={prefs.contractSignOff} onChange={(e) => handleChange('contractSignOff', e.target.value)} placeholder="e.g. We require brands to sign our standard agreement" style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px' }} />
                    </div>
                </div>

            </div>
            
            {toast && <div className="mp-toast" style={{ bottom: '20px' }}>{toast}</div>}
        </div>
    );
}

export default DealNegotiatorSettings;
