import React from 'react';
import { CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import '../../styles/ActionStatusWidget.css';

const ActionStatusWidget = ({ actions }) => {
    // Filter out actions that already have their own dedicated preview widgets 
    // to prevent double-rendering data (like Clarification, BioLink preview, Viral Carousel).
    const excludedIntents = [
        'request_clarification', 
        'create_biolink', 
        'generate_viral_script',
        'enable_comment_autoreply', 
        'enable_dm_autoreply', 
        'enable_all_automation', 
        'disable_comment_autoreply', 
        'disable_dm_autoreply', 
        'disable_all_automation', 
        'set_content_target', 
        'set_time_limit', 
        'set_comment_limit', 
        'find_brand_deals', 
        'list_brand_deals', 
        'enable_comment_to_dm', 
        'enable_gamify_funnel'
    ];

    const filteredActions = actions.filter(action => !excludedIntents.includes(action.intent));

    if (filteredActions.length === 0) return null;

    // Helper to format raw intent names into friendly titles
    const formatIntentTitle = (intent) => {
        return intent.split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    return (
        <div className="action-status-container">
            {filteredActions.map((action, idx) => {
                const isSuccess = action.success;
                const statusClass = isSuccess ? 'status-success' : 'status-error';
                const Icon = isSuccess ? CheckCircle2 : XCircle;

                return (
                    <div 
                        key={idx} 
                        className={`action-status-card ${statusClass} anim-slide-in`}
                        style={{ animationDelay: `${idx * 0.1}s` }}
                    >
                        <div className="action-status-icon-wrapper">
                            <Icon size={18} className="action-status-icon" />
                        </div>
                        <div className="action-status-content">
                            <h4 className="action-status-title">
                                {formatIntentTitle(action.intent)}
                            </h4>
                            <p className="action-status-message">
                                {action.message || (isSuccess ? "Action completed successfully." : "Action failed.")}
                            </p>
                        </div>
                        <div className="action-status-arrow">
                            <ChevronRight size={16} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ActionStatusWidget;
