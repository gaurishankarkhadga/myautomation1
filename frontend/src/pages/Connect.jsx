import React, { useState, useEffect } from 'react';
import { Instagram, Youtube, ChevronRight, ShieldCheck, Zap, BarChart2, Lock, Cpu, Globe, HelpCircle, CheckCircle2, ArrowRight, Shield, Activity, Sparkles, ChevronDown, Terminal } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import '../styles/Connect.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function Connect() {
    const [loadingInsta, setLoadingInsta] = useState(false);
    const [loadingYT, setLoadingYT] = useState(false);
    const [error, setError] = useState('');
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [faqOpenIndex, setFaqOpenIndex] = useState(null);
    const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' or 'yearly'
    const [visibleElements, setVisibleElements] = useState({});
    const navigate = useNavigate();

    // DEV ONLY: Admin bypass — sets fake tokens so all UI pages are accessible
    const handleAdminAccess = () => {
        localStorage.setItem('insta_token', 'dev_admin_bypass_token');
        localStorage.setItem('insta_user_id', 'dev_admin_user');
        navigate('/chat');
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);

        const observerOptions = {
            root: null,
            rootMargin: '0px 0px -20px 0px',
            threshold: 0.02,
        };

        const observer = new IntersectionObserver((entries) => {
            setVisibleElements((prev) => {
                const next = { ...prev };
                let changed = false;
                entries.forEach((entry) => {
                    const id = entry.target.id;
                    if (id && next[id] !== entry.isIntersecting) {
                        next[id] = entry.isIntersecting;
                        changed = true;
                    }
                });
                return changed ? next : prev;
            });
        }, observerOptions);

        const scrollElements = document.querySelectorAll('.scroll-reveal');
        scrollElements.forEach((el) => observer.observe(el));

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            scrollElements.forEach((el) => observer.unobserve(el));
            observer.disconnect();
        };
    }, []);

    const handleConnectInstagram = async () => {
        try {
            setLoadingInsta(true);
            setError('');
            const response = await fetch(`${API_BASE_URL}/api/instagram/auth`);
            const data = await response.json();
            if (data.success) {
                window.location.href = data.authUrl;
            } else {
                setError(data.error || 'Failed to get auth URL');
                setLoadingInsta(false);
            }
        } catch (err) {
            setError(`Connection error: ${err.message}`);
            setLoadingInsta(false);
        }
    };

    const handleConnectYouTube = async () => {
        try {
            setLoadingYT(true);
            setError('');
            const response = await fetch(`${API_BASE_URL}/api/youtube/auth`);
            const data = await response.json();
            if (data.success) {
                window.location.href = data.authUrl;
            } else {
                setError(data.error || 'Failed to get auth URL');
                setLoadingYT(false);
            }
        } catch (err) {
            setError(`Connection error: ${err.message}`);
            setLoadingYT(false);
        }
    };

    return (
        <div className="connect-layout-expansive">
            {/* Ambient Background */}
            <div 
                className="cursor-glow"
                style={{
                    transform: `translate(${mousePos.x - 400}px, ${mousePos.y - 400}px)`
                }}
            />
            
            <div className="bg-elements">
                <div className="bg-grid"></div>
                <div className="bg-orb orb-1"></div>
                <div className="bg-orb orb-2"></div>
                <div className="bg-orb orb-3"></div>
            </div>

            {/* Premium Navbar */}
            <nav className="premium-navbar">
                <div className="navbar-left">
                    <img src="/assets/logo-icon-transparent.png" alt="Sotix Logo" className="nav-logo" />
                    <span className="nav-brand">Sotix AI</span>
                </div>
                <div className="navbar-center hidden-mobile">
                    <a href="#features" className="nav-link">Platform</a>
                    <a href="#security" className="nav-link">Security</a>
                    <a href="#customers" className="nav-link">Enterprise</a>
                </div>
                <div className="navbar-right">
                    <button className="nav-btn-outline">Contact Sales</button>
                </div>
            </nav>

            {/* Main Split Content */}
            <main className="connect-main-split">
                
                {/* Left Side: Value Proposition */}
                <div className="connect-info-side">
                    {/* Header Text Group */}
                    <div className="connect-header-group">
                        <div className="info-badge reveal-fade-in reveal-stagger-1">
                            <Zap size={16} className="badge-icon" />
                            <span>Next-Gen Automation</span>
                        </div>
                        <h1 className="info-title reveal-fade-in reveal-stagger-2">
                            Scale Your Audience <span className="neon-text-gradient">on Autopilot.</span>
                        </h1>
                        <p className="info-description reveal-fade-in reveal-stagger-3">
                            The easiest way to automate your Instagram and YouTube. Connect your accounts to set up auto-replies, track analytics, and manage your messages automatically.
                        </p>
                    </div>

                    {/* Features List Group */}
                    <div className="connect-features-group">
                        <div className="feature-list">
                            <div className="feature-item reveal-fade-in reveal-stagger-4">
                                <div className="feature-icon-wrapper analytics-glow"><BarChart2 size={20} /></div>
                                <div className="feature-text">
                                    <h3>Comment Auto-Reply</h3>
                                    <p>Instantly reply to comments and send automated links to your viewers.</p>
                                </div>
                            </div>
                            <div className="feature-item reveal-fade-in reveal-stagger-5">
                                <div className="feature-icon-wrapper ai-glow"><Cpu size={20} /></div>
                                <div className="feature-text">
                                    <h3>DM Automation</h3>
                                    <p>Engage with your audience and handle leads directly in their direct messages.</p>
                                </div>
                            </div>
                            <div className="feature-item reveal-fade-in reveal-stagger-6">
                                <div className="feature-icon-wrapper security-glow"><Lock size={20} /></div>
                                <div className="feature-text">
                                    <h3>Growth Analytics</h3>
                                    <p>Track conversion rates, message counts, and overall channel growth.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Connection Card */}
                <div className="connect-card-side reveal-fade-in reveal-stagger-7">
                    <div className="connect-glass-panel-premium expansive-card">
                        <div className="panel-glow-border"></div>
                        <div className="panel-content">
                            <div className="connect-brand-premium">
                                <Globe size={40} className="global-icon" />
                                <h2 className="connect-title">Integrations</h2>
                                <p className="connect-subtitle-premium">
                                    Select a platform to authenticate securely.
                                </p>
                            </div>

                            {error && (
                                <div className="connect-error-premium">
                                    <ShieldCheck size={18} />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="connect-actions-premium">
                                <button
                                    className="btn-premium insta-premium"
                                    onClick={handleConnectInstagram}
                                    disabled={loadingInsta || loadingYT}
                                >
                                    <div className="btn-content">
                                        <Instagram size={24} className="btn-icon" />
                                        <span>{loadingInsta ? 'Connecting...' : 'Connect Instagram'}</span>
                                    </div>
                                    <ChevronRight size={20} className="btn-arrow" />
                                    <span className="premium-shine-sweep"></span>
                                </button>

                                <button
                                    className="btn-premium yt-premium"
                                    onClick={handleConnectYouTube}
                                    disabled={loadingInsta || loadingYT}
                                >
                                    <div className="btn-content">
                                        <Youtube size={24} className="btn-icon" />
                                        <span>{loadingYT ? 'Connecting...' : 'Connect YouTube'}</span>
                                    </div>
                                    <ChevronRight size={20} className="btn-arrow" />
                                    <span className="premium-shine-sweep"></span>
                                </button>

                                {/* DEV ONLY: Admin bypass button */}
                                <div className="admin-divider">
                                    <span className="admin-divider-line"></span>
                                    <span className="admin-divider-text">DEV MODE</span>
                                    <span className="admin-divider-line"></span>
                                </div>
                                <button
                                    className="btn-premium admin-premium"
                                    onClick={handleAdminAccess}
                                >
                                    <div className="btn-content">
                                        <Terminal size={24} className="btn-icon" />
                                        <span>Admin Access</span>
                                    </div>
                                    <ChevronRight size={20} className="btn-arrow" />
                                    <span className="premium-shine-sweep"></span>
                                </button>
                            </div>
                            
                            <div className="security-note expansive-note">
                                <ShieldCheck size={16} />
                                <span>SOC2 Type II Compliant • 256-bit AES Encryption</span>
                            </div>
                        </div>
                    </div>
                </div>

            </main>

            {/* About Section */}
            <section className="connect-about-section">
                <div id="about-header" className={`section-header-centered scroll-reveal ${visibleElements['about-header'] ? 'in-view' : ''}`}>
                    <div className="section-badge">
                        <Sparkles size={14} className="badge-sparkle" />
                        <span>Platform Overview</span>
                    </div>
                    <h2 className="section-title-premium">The Next Generation of Social Automation.</h2>
                    <p className="section-subtitle-premium">
                        Streamline your digital presence with tools engineered to grow your channel without the friction of manual message management.
                    </p>
                </div>

                <div className="about-grid">
                    <div id="about-card-1" className={`about-card scroll-reveal stagger-1 ${visibleElements['about-card-1'] ? 'in-view' : ''}`}>
                        <div className="about-icon-wrapper api-glow">
                            <Globe size={24} />
                        </div>
                        <h3>Official API Integrations</h3>
                        <p>Powered by the official Meta Graph API and YouTube v3 API. Fully authorized, compliant, and 100% safe for your accounts.</p>
                    </div>

                    <div id="about-card-2" className={`about-card scroll-reveal stagger-2 ${visibleElements['about-card-2'] ? 'in-view' : ''}`}>
                        <div className="about-icon-wrapper ai-glow">
                            <Cpu size={24} />
                        </div>
                        <h3>Intelligent Intent Engine</h3>
                        <p>Recognizes emojis, sentiments, and intent keywords inside comments and DMs to trigger highly personalized auto-responses.</p>
                    </div>

                    <div id="about-card-3" className={`about-card scroll-reveal stagger-3 ${visibleElements['about-card-3'] ? 'in-view' : ''}`}>
                        <div className="about-icon-wrapper speed-glow">
                            <Activity size={24} />
                        </div>
                        <h3>Real-time Delivery</h3>
                        <p>Replies and direct messages are processed in under 500ms, maintaining active engagement while algorithms push your content.</p>
                    </div>

                    <div id="about-card-4" className={`about-card scroll-reveal stagger-4 ${visibleElements['about-card-4'] ? 'in-view' : ''}`}>
                        <div className="about-icon-wrapper trust-glow">
                            <Shield size={24} />
                        </div>
                        <h3>Authorized & Secure</h3>
                        <p>Enterprise-grade infrastructure featuring SOC2 compliant protocols and fully encrypted token storage handshakes.</p>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="how-it-works-section">
                <div id="how-header" className={`section-header-centered scroll-reveal ${visibleElements['how-header'] ? 'in-view' : ''}`}>
                    <div className="section-badge">
                        <Zap size={14} />
                        <span>Simple Integration</span>
                    </div>
                    <h2 className="section-title-premium">Three Steps to Autopilot.</h2>
                </div>

                <div className="process-flow">
                    <div id="step-1" className={`process-step scroll-reveal stagger-1 ${visibleElements['step-1'] ? 'in-view' : ''}`}>
                        <div className="step-number">01</div>
                        <h3>Link Channels</h3>
                        <p>Connect your Instagram page or YouTube channel in seconds via our secure Meta & Google OAuth connections.</p>
                    </div>
                    
                    <div id="arrow-1" className={`process-arrow-divider scroll-reveal ${visibleElements['arrow-1'] ? 'in-view' : ''}`}>
                        <ArrowRight size={24} className="arrow-icon" />
                    </div>

                    <div id="step-2" className={`process-step scroll-reveal stagger-2 ${visibleElements['step-2'] ? 'in-view' : ''}`}>
                        <div className="step-number">02</div>
                        <h3>Set Triggers</h3>
                        <p>Define rules for comments, mentions, and DMs. Set static keyword triggers or enable our AI to compose responses.</p>
                    </div>

                    <div id="arrow-2" className={`process-arrow-divider scroll-reveal ${visibleElements['arrow-2'] ? 'in-view' : ''}`}>
                        <ArrowRight size={24} className="arrow-icon" />
                    </div>

                    <div id="step-3" className={`process-step scroll-reveal stagger-3 ${visibleElements['step-3'] ? 'in-view' : ''}`}>
                        <div className="step-number">03</div>
                        <h3>Watch It Scale</h3>
                        <p>Sit back as Sotix automatically responds to comments, follows up via direct message, and tracks growth.</p>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section className="pricing-section">
                <div id="pricing-header" className={`section-header-centered scroll-reveal ${visibleElements['pricing-header'] ? 'in-view' : ''}`}>
                    <div className="section-badge">
                        <Zap size={14} />
                        <span>Pricing Plans</span>
                    </div>
                    <h2 className="section-title-premium">Flexible Pricing for Creators.</h2>
                    <p className="section-subtitle-premium">Choose the plan that matches your current growth stage. Cancel or change plans anytime.</p>
                    
                    {/* Billing Toggle */}
                    <div className="billing-toggle-container">
                        <button 
                            className={`billing-toggle-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
                            onClick={() => setBillingCycle('monthly')}
                        >
                            Monthly
                        </button>
                        <button 
                            className={`billing-toggle-btn ${billingCycle === 'yearly' ? 'active' : ''}`}
                            onClick={() => setBillingCycle('yearly')}
                        >
                            Yearly
                            <span className="save-badge">Save 20%</span>
                        </button>
                    </div>
                </div>

                <div className="pricing-grid">
                    {/* Starter Tier */}
                    <div id="price-card-1" className={`pricing-card scroll-reveal stagger-1 ${visibleElements['price-card-1'] ? 'in-view' : ''}`}>
                        <div className="tier-header">
                            <h3>Starter</h3>
                            <p className="tier-desc">Perfect for hobbyists and creators starting out.</p>
                            <div className="tier-price">
                                <span className="currency">$</span>
                                <span className="price">0</span>
                                <span className="duration">/mo</span>
                            </div>
                        </div>
                        <div className="tier-features">
                            <ul>
                                <li><CheckCircle2 size={16} className="check-icon" /> <span>1 Active Channel</span></li>
                                <li><CheckCircle2 size={16} className="check-icon" /> <span>100 Auto-Replies / mo</span></li>
                                <li><CheckCircle2 size={16} className="check-icon" /> <span>Basic Comment Triggers</span></li>
                                <li><CheckCircle2 size={16} className="check-icon" /> <span>Community Support</span></li>
                            </ul>
                        </div>
                        <button className="pricing-btn starter-btn">Get Started</button>
                    </div>

                    {/* Pro Tier (Featured) */}
                    <div id="price-card-2" className={`pricing-card featured scroll-reveal stagger-2 ${visibleElements['price-card-2'] ? 'in-view' : ''}`}>
                        <div className="featured-badge">Most Popular</div>
                        <div className="tier-header">
                            <h3>Creator Pro</h3>
                            <p className="tier-desc">For active creators looking to maximize engagement.</p>
                            <div className="tier-price">
                                <span className="currency">$</span>
                                <span className="price">{billingCycle === 'monthly' ? '19' : '15'}</span>
                                <span className="duration">/mo</span>
                            </div>
                            {billingCycle === 'yearly' && <p className="billed-annually">Billed annually ($180/yr)</p>}
                        </div>
                        <div className="tier-features">
                            <ul>
                                <li><CheckCircle2 size={16} className="check-icon pro-check" /> <span>3 Active Channels</span></li>
                                <li><CheckCircle2 size={16} className="check-icon pro-check" /> <span>Unlimited Auto-Replies</span></li>
                                <li><CheckCircle2 size={16} className="check-icon pro-check" /> <span>AI Intent Recognition</span></li>
                                <li><CheckCircle2 size={16} className="check-icon pro-check" /> <span>Advanced DM Sequences</span></li>
                                <li><CheckCircle2 size={16} className="check-icon pro-check" /> <span>Priority Email Support</span></li>
                            </ul>
                        </div>
                        <button className="pricing-btn featured-btn">Upgrade to Pro</button>
                    </div>

                    {/* Scale Tier */}
                    <div id="price-card-3" className={`pricing-card scroll-reveal stagger-3 ${visibleElements['price-card-3'] ? 'in-view' : ''}`}>
                        <div className="tier-header">
                            <h3>Agency & Scale</h3>
                            <p className="tier-desc">For high-volume creators, agencies, and businesses.</p>
                            <div className="tier-price">
                                <span className="currency">$</span>
                                <span className="price">{billingCycle === 'monthly' ? '49' : '39'}</span>
                                <span className="duration">/mo</span>
                            </div>
                            {billingCycle === 'yearly' && <p className="billed-annually">Billed annually ($468/yr)</p>}
                        </div>
                        <div className="tier-features">
                            <ul>
                                <li><CheckCircle2 size={16} className="check-icon" /> <span>Unlimited Channels</span></li>
                                <li><CheckCircle2 size={16} className="check-icon" /> <span>Unlimited Auto-Replies</span></li>
                                <li><CheckCircle2 size={16} className="check-icon" /> <span>Dedicated Account Manager</span></li>
                                <li><CheckCircle2 size={16} className="check-icon" /> <span>Custom AI Response Tone</span></li>
                                <li><CheckCircle2 size={16} className="check-icon" /> <span>Advanced Webhook Integrations</span></li>
                                <li><CheckCircle2 size={16} className="check-icon" /> <span>24/7 Priority Support</span></li>
                            </ul>
                        </div>
                        <button className="pricing-btn scale-btn">Upgrade to Scale</button>
                    </div>
                </div>

                {/* Pricing Bottom Bar / Trust Banner */}
                <div id="pricing-trust-bar" className={`pricing-bottom-bar scroll-reveal ${visibleElements['pricing-trust-bar'] ? 'in-view' : ''}`}>
                    <div className="trust-content">
                        <ShieldCheck size={20} className="trust-icon" />
                        <span className="trust-main-text">Risk-Free • No Credit Card Required for Starter Plan • 14-day Money Back Guarantee on Paid Plans</span>
                    </div>
                    <div className="trust-separator"></div>
                    <div className="trust-features-inline">
                        <span>✓ Cancel Anytime</span>
                        <span>✓ Change Plans Instantly</span>
                        <span>✓ Secure 256-bit Checkout</span>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="faq-section">
                <div id="faq-header" className={`section-header-centered scroll-reveal ${visibleElements['faq-header'] ? 'in-view' : ''}`}>
                    <div className="section-badge">
                        <HelpCircle size={14} />
                        <span>Faq</span>
                    </div>
                    <h2 className="section-title-premium">Frequently Asked Questions.</h2>
                </div>

                <div className="faq-container">
                    {[
                        {
                            q: "How does the Instagram integration work?",
                            a: "It uses Meta's official Graph API. Once you authorize through Facebook OAuth, Sotix receives comment and DM webhooks in real-time, executing your automations instantly."
                        },
                        {
                            q: "Is my account safe from suspension?",
                            a: "Yes. Since we rely 100% on official APIs and do not use scraping or simulated browsers, your account is fully compliant with Instagram and Google Developer Policies."
                        },
                        {
                            q: "Can I cancel my subscription at any time?",
                            a: "Absolutely. You can cancel, upgrade, or downgrade your plan at any time directly from your account settings page."
                        },
                        {
                            q: "Does it support custom replies based on keywords?",
                            a: "Yes. You can trigger different automations based on exact keywords, partial matches, or let our AI analyze comment intent to reply dynamically."
                        }
                    ].map((item, index) => (
                        <div 
                            key={index} 
                            id={`faq-item-${index}`}
                            className={`faq-item scroll-reveal stagger-${(index % 3) + 1} ${visibleElements[`faq-item-${index}`] ? 'in-view' : ''} ${faqOpenIndex === index ? 'active' : ''}`}
                            onClick={() => setFaqOpenIndex(faqOpenIndex === index ? null : index)}
                        >
                            <div className="faq-question">
                                <h3>{item.q}</h3>
                                <div className="faq-icon-toggle">
                                    <ChevronDown size={18} className="chevron-toggle" />
                                </div>
                            </div>
                            <div className="faq-answer">
                                <p>{item.a}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <footer className="connect-footer-premium expansive-footer">
                <div className="footer-links">
                    <a href="/privacy-policy">Privacy Policy</a>
                    <span className="separator">•</span>
                    <a href="/terms-and-conditions">Terms & Conditions</a>
                    <span className="separator">•</span>
                    <a href="/data-deletion">Data Deletion</a>
                </div>
            </footer>
        </div>
    );
}

export default Connect;
