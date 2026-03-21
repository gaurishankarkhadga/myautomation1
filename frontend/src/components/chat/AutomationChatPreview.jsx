import { useState, useEffect } from 'react';
import {
    Activity, MessageSquare, Mail, Image as ImageIcon, Zap,
    Clock, Layers, Film, Camera, Grid
} from 'lucide-react';
import './AutomationChatPreview.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Type metadata
const TYPES = {
    comment_reply: { label: 'Comment Auto-Reply', icon: MessageSquare, cls: 'comment', modes: { reply_only: 'Reply Only', reply_and_hide: 'Smart Hide', ai_smart: 'AI Smart' } },
    dm_reply: { label: 'DM Auto-Reply', icon: Mail, cls: 'dm', modes: { static: 'Static', ai_smart: 'AI Smart', ai_with_assets: 'AI + Assets' } },
    story_mention: { label: 'Story Mention', icon: ImageIcon, cls: 'story', modes: {} },
    all_automation: { label: 'All Automations', icon: Zap, cls: 'all', modes: {} }
};

const MEDIA_ICONS = { VIDEO: Film, CAROUSEL_ALBUM: Grid, IMAGE: Camera };

function AutomationChatPreview({ actionData }) {
    const [media, setMedia] = useState(null);

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

                {/* Config tags — only show relevant ones */}
                {isActive && (delay || mode) && (
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
                {isActive && mediaItems.length === 0 && (
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
    if (data.results) return 'all_automation';
    return 'all_automation';
}

export default AutomationChatPreview;
