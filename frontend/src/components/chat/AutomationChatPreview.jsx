import {
    Activity, MessageSquare, Mail, Image, Zap,
    Clock, Target, Hash, Layers, CheckCircle, XCircle,
    Film, Camera, Layout
} from 'lucide-react';
import './AutomationChatPreview.css';

// ── Automation type metadata ────────────────────────────────
const AUTOMATION_TYPES = {
    comment_reply: {
        label: 'Comment Auto-Reply',
        icon: MessageSquare,
        iconClass: 'comment',
        modeLabels: {
            'reply_only': 'Reply Only',
            'reply_and_hide': 'Smart Hide',
            'ai_smart': 'AI Smart (Persona-based)'
        }
    },
    dm_reply: {
        label: 'DM Auto-Reply',
        icon: Mail,
        iconClass: 'dm',
        modeLabels: {
            'static': 'Static Message',
            'ai_smart': 'AI Smart',
            'ai_with_assets': 'AI + Assets (Shares products & links)'
        }
    },
    story_mention: {
        label: 'Story Mention Reply',
        icon: Image,
        iconClass: 'story',
        modeLabels: {}
    },
    all_automation: {
        label: 'All Automations',
        icon: Zap,
        iconClass: 'all',
        modeLabels: {}
    }
};

// ── Media type icons ────────────────────────────────────────
const MEDIA_ICONS = {
    VIDEO: Film,
    CAROUSEL_ALBUM: Layout,
    IMAGE: Camera,
};

function AutomationChatPreview({ actionData }) {
    if (!actionData) return null;

    const {
        enabled,
        mode,
        delay,
        automationType,
        media,
        targetType,
        preferences,
    } = extractPreviewData(actionData);

    const typeConfig = AUTOMATION_TYPES[automationType] || AUTOMATION_TYPES.all_automation;
    const TypeIcon = typeConfig.icon;
    const modeLabel = typeConfig.modeLabels[mode] || mode || '';
    const isActive = enabled !== false;

    return (
        <div className={`automation-chat-preview ${!isActive ? 'acp-disabled' : ''}`} id="acp-card">
            {/* Header */}
            <div className="acp-header">
                <span className="acp-label">
                    <Activity size={11} /> Automation Preview
                </span>
                <span className={`acp-status-badge ${isActive ? 'active' : 'inactive'}`}>
                    <span className="acp-status-dot" />
                    {isActive ? 'Active' : 'Disabled'}
                </span>
            </div>

            {/* Type card */}
            <div className="acp-type-card">
                <div className={`acp-type-icon ${typeConfig.iconClass}`}>
                    <TypeIcon size={18} />
                </div>
                <div className="acp-type-info">
                    <div className="acp-type-name">{typeConfig.label}</div>
                    {modeLabel && (
                        <div className="acp-type-detail">Mode: {modeLabel}</div>
                    )}
                </div>
                {isActive ? (
                    <CheckCircle size={16} style={{ color: '#4ade80', flexShrink: 0 }} />
                ) : (
                    <XCircle size={16} style={{ color: 'rgba(200,200,200,0.4)', flexShrink: 0 }} />
                )}
            </div>

            {/* Config tags */}
            {isActive && (
                <div className="acp-config">
                    {delay && (
                        <span className="acp-config-tag">
                            <Clock size={10} /> {delay}s delay
                        </span>
                    )}
                    {targetType && targetType !== 'all' && (
                        <span className="acp-config-tag">
                            <Target size={10} /> {formatTarget(targetType)}
                        </span>
                    )}
                    {targetType === 'all' && (
                        <span className="acp-config-tag">
                            <Layers size={10} /> All posts
                        </span>
                    )}
                    {preferences?.commentLimit?.enabled && (
                        <span className="acp-config-tag">
                            <Hash size={10} /> Max {preferences.commentLimit.maxReplies} replies
                        </span>
                    )}
                    {preferences?.timeLimit?.enabled && preferences.timeLimit.expiresAt && (
                        <span className="acp-config-tag">
                            <Clock size={10} /> {formatTimeRemaining(preferences.timeLimit.expiresAt)}
                        </span>
                    )}
                </div>
            )}

            {/* Media preview — targeted posts */}
            {isActive && media && media.length > 0 && (
                <div className="acp-media-section">
                    <div className="acp-media-title">
                        Automation Active On ({media.length} post{media.length > 1 ? 's' : ''})
                    </div>
                    <div className="acp-media-grid">
                        {media.slice(0, 5).map((item, i) => {
                            const MediaIcon = MEDIA_ICONS[item.media_type] || Camera;
                            return (
                                <div key={item.id || i} className="acp-media-item">
                                    <a
                                        href={item.permalink || '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {item.thumbnail_url ? (
                                            <img
                                                src={item.thumbnail_url}
                                                alt={item.caption?.substring(0, 30) || 'Post'}
                                                className="acp-media-thumb"
                                            />
                                        ) : (
                                            <div className="acp-media-thumb-placeholder">
                                                <MediaIcon size={20} />
                                            </div>
                                        )}
                                        <div className="acp-media-caption">
                                            {item.caption?.substring(0, 20) || 'Post'}
                                        </div>
                                    </a>
                                    <span className="acp-media-badge">✓ Active</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* No specific media — show "all posts" note */}
            {isActive && (!media || media.length === 0) && (
                <div className="acp-media-section">
                    <div className="acp-media-all-note">
                        <Layers size={14} />
                        <span>
                            Automation is monitoring <strong>{targetType === 'recent' ? 'your most recent post' : targetType === 'first' ? 'your first post' : 'all incoming posts'}</strong> for new {automationType === 'dm_reply' ? 'messages' : 'comments'}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Helpers ─────────────────────────────────────────────────

function extractPreviewData(actionData) {
    // Handle both single action data and array of actions
    if (Array.isArray(actionData)) {
        // Multiple actions — extract the most relevant
        const enableAction = actionData.find(a =>
            a.success && (a.data?.enabled === true || a.intent?.includes('enable'))
        );
        const data = enableAction?.data || actionData[0]?.data || {};
        return {
            enabled: data.enabled,
            mode: data.mode,
            delay: data.delay,
            automationType: data.automationType || detectType(enableAction?.intent),
            media: data.media,
            targetType: data.targetType || 'all',
            preferences: data.preferences,
        };
    }

    // Single action data object
    return {
        enabled: actionData.enabled,
        mode: actionData.mode,
        delay: actionData.delay,
        automationType: actionData.automationType || 'all_automation',
        media: actionData.media,
        targetType: actionData.targetType || 'all',
        preferences: actionData.preferences,
    };
}

function detectType(intent) {
    if (!intent) return 'all_automation';
    if (intent.includes('comment')) return 'comment_reply';
    if (intent.includes('dm')) return 'dm_reply';
    if (intent.includes('story')) return 'story_mention';
    return 'all_automation';
}

function formatTarget(type) {
    const labels = {
        'recent': 'Most recent post',
        'first': 'First post',
        'previous': 'Previous post',
        'specific': 'Specific post',
    };
    return labels[type] || type;
}

function formatTimeRemaining(expiresAt) {
    const remaining = Math.max(0, Math.round((new Date(expiresAt) - Date.now()) / (1000 * 60)));
    if (remaining <= 0) return 'Expired';
    const hours = Math.floor(remaining / 60);
    const mins = remaining % 60;
    return hours > 0 ? `${hours}h ${mins}m left` : `${mins}m left`;
}

export default AutomationChatPreview;
