import React, { useState, useEffect } from 'react';
import { Instagram, Youtube, ChevronRight, ShieldCheck, Zap, BarChart2, Lock, Cpu, Globe } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import '../styles/Connect.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function Connect() {
    const [loadingInsta, setLoadingInsta] = useState(false);
    const [loadingYT, setLoadingYT] = useState(false);
    const [error, setError] = useState('');
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
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
                    <span className="nav-brand">Sotix OS</span>
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
                    <div className="info-badge">
                        <Zap size={16} className="badge-icon" />
                        <span>Next-Gen Automation</span>
                    </div>
                    <h1 className="info-title">
                        Command Your<br />Digital Empire.
                    </h1>
                    <p className="info-description">
                        Connect your platforms to Sotix OS and unlock enterprise-grade AI analytics, automated workflows, and unified audience intelligence in one seamless interface.
                    </p>

                    <div className="feature-list">
                        <div className="feature-item">
                            <div className="feature-icon-wrapper"><BarChart2 size={20} /></div>
                            <div className="feature-text">
                                <h3>Real-time Analytics</h3>
                                <p>Instantly aggregate data across all channels.</p>
                            </div>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon-wrapper"><Cpu size={20} /></div>
                            <div className="feature-text">
                                <h3>AI-Powered Insights</h3>
                                <p>Predict trends and automate engagement.</p>
                            </div>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon-wrapper"><Lock size={20} /></div>
                            <div className="feature-text">
                                <h3>Bank-grade Security</h3>
                                <p>Your data is encrypted and completely isolated.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Connection Card */}
                <div className="connect-card-side">
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
                                    <div className="btn-hover-effect"></div>
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
                                    <div className="btn-hover-effect"></div>
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
