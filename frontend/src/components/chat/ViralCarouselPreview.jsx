import { Play, Flame, TrendingUp, User, Eye, X } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import '../../styles/ChatHub.css'; // You can define specific CSS here or inline

function ViralCarouselPreview({ items }) {
    const scrollRef = useRef(null);
    const [activeVideo, setActiveVideo] = useState(null);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (activeVideo) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [activeVideo]);

    if (!items || items.length === 0) return null;

    // Helper to generate a dynamic gradient background for mock thumbnails
    const getGradient = (index) => {
        const gradients = [
            'linear-gradient(135deg, #FF6B6B, #556270)',
            'linear-gradient(135deg, #10b981, #047857)',
            'linear-gradient(135deg, #8b5cf6, #4c1d95)',
            'linear-gradient(135deg, #f59e0b, #b45309)',
            'linear-gradient(135deg, #3b82f6, #1d4ed8)'
        ];
        return gradients[index % gradients.length];
    };

    const handleCardClick = (item) => {
        setActiveVideo(item);
    };

    const renderModal = () => {
        if (!activeVideo) return null;

        let embedContent;
        if (activeVideo.url && activeVideo.url.includes('youtube.com/watch?v=')) {
            // Convert standard youtube URL to embed URL
            const videoId = activeVideo.url.split('v=')[1];
            const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
            embedContent = (
                <iframe 
                    src={embedUrl} 
                    width="100%" 
                    height="100%" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ borderRadius: '12px', background: '#000' }}
                ></iframe>
            );
        } else {
            // Fallback for AI generated simulation where no real URL exists
            const cleanCreator = activeVideo.creator ? activeVideo.creator.replace('@', '') : '';
            const query = encodeURIComponent(`${cleanCreator} ${activeVideo.title || ''}`);
            const searchUrl = `https://www.youtube.com/results?search_query=${query}`;
            
            embedContent = (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
                    <Flame size={48} color="#f59e0b" style={{ marginBottom: '16px' }} />
                    <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>Simulation Preview</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
                        This is an AI-simulated competitor video. To view real competitor videos inside this player, ensure your Youtube_Api_Key is active.
                    </p>
                    <button 
                        onClick={() => window.open(searchUrl, '_blank')}
                        style={{ background: '#f59e0b', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    >
                        Search YouTube Manually
                    </button>
                </div>
            );
        }

        return (
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0, 0, 0, 0.85)',
                backdropFilter: 'blur(8px)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px'
            }} onClick={() => setActiveVideo(null)}>
                
                <div 
                    style={{
                        width: '100%',
                        maxWidth: '400px', // Standard mobile vertical video width
                        height: '80vh',
                        maxHeight: '700px',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
                >
                    <button 
                        onClick={() => setActiveVideo(null)}
                        style={{
                            position: 'absolute', top: '-40px', right: '0px',
                            background: 'rgba(255,255,255,0.2)', border: 'none',
                            borderRadius: '50%', padding: '8px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'background 0.2s'
                        }}
                        className="modal-close-btn"
                    >
                        <X size={20} color="#fff" />
                    </button>
                    
                    {embedContent}
                </div>
            </div>
        );
    };

    return (
        <div className="viral-carousel-wrapper" style={{ margin: '16px 0', width: '100%', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Flame size={16} color="#f59e0b" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Market Intelligence: Trending Reference Videos
                </span>
            </div>
            
            <div 
                ref={scrollRef}
                style={{ 
                    display: 'flex', 
                    gap: '12px', 
                    overflowX: 'auto', 
                    paddingBottom: '12px',
                    scrollbarWidth: 'none', // hide standard scrollbar
                    msOverflowStyle: 'none'
                }}
                className="no-scrollbar"
            >
                {items.map((item, index) => {
                    const isViral = item.type === 'viral';
                    
                    return (
                        <div 
                            key={item.id || index} 
                            style={{ 
                                minWidth: '140px',
                                maxWidth: '140px',
                                background: 'var(--bg-secondary)',
                                borderRadius: '12px',
                                border: `1px solid ${isViral ? 'rgba(245, 158, 11, 0.3)' : 'var(--border-color)'}`,
                                overflow: 'hidden',
                                flexShrink: 0,
                                position: 'relative',
                                cursor: 'pointer',
                                transition: 'transform 0.2s, box-shadow 0.2s'
                            }}
                            className="viral-card-hover"
                            onClick={() => handleCardClick(item)}
                        >
                            {/* Mock Thumbnail Area */}
                            <div style={{ 
                                height: '220px', 
                                width: '100%', 
                                background: item.thumbnail ? `url(${item.thumbnail}) center/cover no-repeat` : getGradient(index),
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                padding: '10px'
                            }}>
                                {/* Top Badges */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                                    <div style={{ 
                                        background: 'rgba(0,0,0,0.5)', 
                                        backdropFilter: 'blur(4px)',
                                        borderRadius: '20px', 
                                        padding: '4px 8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        minWidth: 0
                                    }}>
                                        <Eye size={10} color="#fff" style={{ flexShrink: 0 }} />
                                        <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.views}</span>
                                    </div>
                                    
                                    {isViral ? (
                                        <span style={{ background: '#f59e0b', color: '#fff', padding: '2px 6px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800, whiteSpace: 'nowrap', flexShrink: 0 }}>TOP 1%</span>
                                    ) : (
                                        <span style={{ background: '#8b5cf6', color: '#fff', padding: '2px 6px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800, whiteSpace: 'nowrap', flexShrink: 0 }}>RELATED</span>
                                    )}
                                </div>
                                
                                {/* Center Play Button */}
                                <div style={{ alignSelf: 'center', background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '50%', backdropFilter: 'blur(5px)' }}>
                                    <Play size={20} color="#fff" fill="#fff" />
                                </div>

                                {/* Bottom Hook Text */}
                                <div style={{ 
                                    background: 'rgba(0,0,0,0.6)', 
                                    backdropFilter: 'blur(4px)',
                                    borderRadius: '8px', 
                                    padding: '6px',
                                    marginTop: 'auto'
                                }}>
                                    <p style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 600, margin: 0, lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {item.title}
                                    </p>
                                </div>
                            </div>
                            
                            {/* Creator Info Footer */}
                            <div style={{ padding: '8px', display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-primary)' }}>
                                <div style={{ background: 'var(--bg-tertiary)', borderRadius: '50%', padding: '4px' }}>
                                    <User size={10} color="var(--text-tertiary)" />
                                </div>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {item.creator}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {renderModal()}

            {/* Custom CSS injected just for hover effects & hide scrollbar globally */}
            <style jsx="true">{`
                .viral-card-hover:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 10px 20px rgba(0,0,0,0.2);
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .modal-close-btn:hover {
                    background: rgba(255,255,255,0.4) !important;
                }
            `}</style>
        </div>
    );
}

export default ViralCarouselPreview;
