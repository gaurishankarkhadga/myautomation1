import { useState, useEffect } from 'react';
import {
    Activity, MessageSquare, Mail, Image as ImageIcon, Zap,
    Clock, Layers, Film, Camera, Grid, CheckCircle, AlertTriangle,
    Hash, Timer, Shield
} from 'lucide-react';
import './AutomationChatPreview.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Type metadata
const TYPES = {
    comment_reply: { label: 'Comment Auto-Reply', icon: MessageSquare, cls: 'comment', modes: { reply_only: 'Reply Only', reply_and_hide: 'Smart Hide', ai_smart: 'AI Smart' } },
    dm_reply: { label: 'DM Auto-Reply', icon: Mail, cls: 'dm', modes: { static: 'Static', ai_smart: 'AI Smart', ai_with_assets: 'AI + Assets' } },
    comment_to_dm: { label: 'Comment to DM', icon: MessageSquare, cls: 'comment', modes: { default: 'Active' } },
    brand_deals: { label: 'AI Deal Generator', icon: Zap, cls: 'all', modes: { default: 'Active' } },
    gamify_funnel: { label: 'Gamified Funnel', icon: Activity, cls: 'all', modes: { default: 'Active' } },
    story_mention: { label: 'Story Mention', icon: ImageIcon, cls: 'story', modes: {} },
    all_automation: { label: 'All Automations', icon: Zap, cls: 'all', modes: {} }
};

const MEDIA_ICONS = { VIDEO: Film, CAROUSEL_ALBUM: Grid, IMAGE: Camera };

function AutomationChatPreview({ actionData }) {
    const [timeLeft, setTimeLeft] = useState(null);

    if (!actionData) return null;

    const automationType = actionData.automationType || detectType(actionData);
    const isActive = actionData.enabled !== false;
    const mode = actionData.mode || '';
    const delay = actionData.delay;
    const typeConfig = TYPES[automationType] || TYPES.all_automation;
    const TypeIcon = typeConfig.icon;
    const modeLabel = typeConfig.modes[mode] || '';

    // Try to use media from actionData
    const mediaItems = actionData.media || [];

    // Calculate time remaining for Comment-to-DM
    useEffect(() => {
        if (!actionData.expiresAt) return;
        
        const updateTimer = () => {
            const remaining = new Date(actionData.expiresAt) - Date.now();
            if (remaining <= 0) {
                setTimeLeft('Expired');
                return;
            }
            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            setTimeLeft(hours > 0 ? `${hours}h ${mins}m` : `${mins}m`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [actionData.expiresAt]);

    const isC2D = automationType === 'comment_to_dm';

    return (
        <div className="automation-chat-preview" id="acp-card">
            {/* Toolbar */}
            <div className="acp-toolbar">
                <span className="acp-toolbar-left">
                    <Activity size={11} /> Automation
                </span>
                <span className={`acp-status-pill ${isActive ? 'active' : 'off'}`}>
                    <span className="acp-dot" />
                    {isActive ? 'Active' : 'Off'}
                </span>
            </div>

            <div className="acp-body">
                {/* Type row */}
                <div className="acp-type-row">
                    <div className={`acp-type-icon ${typeConfig.cls}`}>
                        <TypeIcon size={16} />
                    </div>
                    <div>
                        <div className="acp-type-label">{typeConfig.label}</div>
                        {modeLabel && <div className="acp-type-mode">{modeLabel}</div>}
                    </div>
                </div>

                {/* ====== COMMENT-TO-DM DETAILS ====== */}
                {isC2D && isActive && (
                    <div className="acp-c2d-details">
                        {/* Keyword */}
                        {actionData.keyword && (
                            <div className="acp-detail-row">
                                <Hash size={12} />
                                <span>Keyword: <strong>"{actionData.keyword}"</strong></span>
                            </div>
                        )}
                        {!actionData.keyword && (
                            <div className="acp-detail-row">
                                <Hash size={12} />
                                <span>Triggers on: <strong>all comments</strong></span>
                            </div>
                        )}

                        {/* Comment Reply */}
                        {actionData.commentReply && (
                            <div className="acp-detail-row">
                                <MessageSquare size={12} />
                                <span>Comment reply: "{actionData.commentReply}"</span>
                            </div>
                        )}

                        {/* DM Message */}
                        {actionData.dmMessage && (
                            <div className="acp-detail-row">
                                <Mail size={12} />
                                <span>DM: "{actionData.dmMessage.substring(0, 50)}{actionData.dmMessage.length > 50 ? '...' : ''}"</span>
                            </div>
                        )}
                        {!actionData.dmMessage && actionData.useAssets && (
                            <div className="acp-detail-row">
                                <Mail size={12} />
                                <span>DM: AI auto-shares your assets/links</span>
                            </div>
                        )}

                        {/* Time limit */}
                        {actionData.expiresAt && (
                            <div className="acp-detail-row acp-timer">
                                <Timer size={12} />
                                <span>
                                    {timeLeft === 'Expired' 
                                        ? '⚠️ Time expired' 
                                        : `Auto-stops in ${timeLeft}`
                                    }
                                    {actionData.timeLimitHours > 0 && ` (${actionData.timeLimitHours}h total)`}
                                </span>
                            </div>
                        )}

                        {/* Comment limit */}
                        {actionData.maxComments > 0 && (
                            <div className="acp-detail-row">
                                <Layers size={12} />
                                <span>Max: {actionData.maxComments} comments then auto-stop</span>
                            </div>
                        )}

                        {/* Target */}
                        {actionData.targetMedia && actionData.targetMedia !== 'all' && (
                            <div className="acp-detail-row">
                                <Camera size={12} />
                                <span>Target: {actionData.targetMedia} post</span>
                            </div>
                        )}
                    </div>
                )}

                {/* ====== VERIFICATION BADGES ====== */}
                {isC2D && actionData.verification && (
                    <div className="acp-verification">
                        <div className="acp-verify-title">
                            <Shield size={11} /> Verification
                        </div>
                        <div className="acp-verify-badges">
                            <span className={`acp-verify-badge ${actionData.verification.tokenValid ? 'ok' : 'warn'}`}>
                                {actionData.verification.tokenValid ? <CheckCircle size={10} /> : <AlertTriangle size={10} />}
                                Token
                            </span>
                            <span className={`acp-verify-badge ${actionData.verification.webhookActive ? 'ok' : 'warn'}`}>
                                {actionData.verification.webhookActive ? <CheckCircle size={10} /> : <AlertTriangle size={10} />}
                                API
                            </span>
                            <span className={`acp-verify-badge ${actionData.verification.assetsAvailable ? 'ok' : 'warn'}`}>
                                {actionData.verification.assetsAvailable ? <CheckCircle size={10} /> : <AlertTriangle size={10} />}
                                Assets
                            </span>
                        </div>
                    </div>
                )}

                {/* Config tags — only show relevant ones (non-C2D types) */}
                {!isC2D && isActive && (delay || mode) && (
                    <div className="acp-tags">
                        {delay && (
                            <span className="acp-tag"><Clock size={10} />{delay}s delay</span>
                        )}
                    </div>
                )}

                {/* Media grid — actual posts where automation is active */}
                {isActive && mediaItems.length > 0 && (
                    <div className="acp-media-grid">
                        {mediaItems.slice(0, 6).map((item, i) => {
                            const MIcon = MEDIA_ICONS[item.media_type] || Camera;
                            return (
                                <a
                                    key={item.id || i}
                                    className="acp-media-card"
                                    href={item.permalink || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {item.thumbnail_url ? (
                                        <img src={item.thumbnail_url} alt="" className="acp-media-thumb" />
                                    ) : (
                                        <div className="acp-media-thumb-empty">
                                            <MIcon size={22} />
                                        </div>
                                    )}
                                    <div className="acp-media-footer">
                                        <span className="acp-media-type">
                                            {(item.media_type || 'post').replace('_', ' ')}
                                        </span>
                                        <span className="acp-active-dot" />
                                    </div>
                                </a>
                            );
                        })}
                    </div>
                )}

                {/* All-posts note when no specific media */}
                {isActive && mediaItems.length === 0 && !isC2D && (
                    <div className="acp-all-note">
                        <Layers size={14} />
                        <span>Monitoring all incoming {automationType === 'dm_reply' ? 'messages' : 'comments'}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

function detectType(data) {
    if (data.automationType) return data.automationType;
    if (data.deals !== undefined || data.analyzing) return 'brand_deals';
    if (data.results) return 'all_automation';
    return 'all_automation';
}

export default AutomationChatPreview;
