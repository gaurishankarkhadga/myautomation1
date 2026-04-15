import { Play, Flame, TrendingUp, User, Eye } from 'lucide-react';
import { useRef } from 'react';
import '../../styles/ChatHub.css'; // You can define specific CSS here or inline

function ViralCarouselPreview({ items }) {
    const scrollRef = useRef(null);

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
                            onClick={() => alert('Simulated API: In a live environment, this would open the video reel.')}
                        >
                            {/* Mock Thumbnail Area */}
                            <div style={{ 
                                height: '220px', 
                                width: '100%', 
                                background: getGradient(index),
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                padding: '10px'
                            }}>
                                {/* Top Badges */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ 
                                        background: 'rgba(0,0,0,0.5)', 
                                        backdropFilter: 'blur(4px)',
                                        borderRadius: '20px', 
                                        padding: '4px 8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        <Eye size={10} color="#fff" />
                                        <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 700 }}>{item.views}</span>
                                    </div>
                                    
                                    {isViral ? (
                                        <span style={{ background: '#f59e0b', color: '#fff', padding: '2px 6px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800 }}>TOP 1%</span>
                                    ) : (
                                        <span style={{ background: '#8b5cf6', color: '#fff', padding: '2px 6px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800 }}>RELATED</span>
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
            {/* Custom CSS injected just for hover effects & hide scrollbar globally */}
            <style jsx="true">{`
                .viral-card-hover:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 10px 20px rgba(0,0,0,0.2);
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>
    );
}

export default ViralCarouselPreview;
