import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';
import '../../styles/ClarificationWidget.css';

const ClarificationWidget = ({ question, contextIntent, assetType, onReply }) => {
    const [replyText, setReplyText] = useState('');
    const [title, setTitle] = useState('');
    const [link, setLink] = useState('');
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const inputRef = useRef(null);

    // Auto-focus input when the widget appears
    useEffect(() => {
        if (inputRef.current && !isSubmitted) {
            inputRef.current.focus();
        }
    }, [isSubmitted]);

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (isSubmitted) return;

        if (contextIntent === 'add_asset') {
            if (title.trim()) {
                setIsSubmitted(true);
                let reply = `title is "${title.trim()}"`;
                if (link.trim()) reply += `, link is "${link.trim()}"`;
                if (price.trim()) reply += `, price is "${price.trim()}"`;
                if (description.trim()) reply += `, description is "${description.trim()}"`;
                if (assetType) reply += `, type is "${assetType}"`;
                
                onReply(reply);
            }
        } else {
            if (replyText.trim()) {
                setIsSubmitted(true);
                onReply(replyText.trim());
            }
        }
    };

    if (isSubmitted) {
        return (
            <div className="clarification-widget submitted">
                <div className="clarification-header">
                    <Sparkles size={14} className="clarification-icon" />
                    <span>Details submitted successfully</span>
                </div>
                {contextIntent === 'add_asset' ? (
                    <div className="clarification-submitted-details">
                        <div><strong>Title:</strong> {title}</div>
                        {link && <div><strong>Link:</strong> {link}</div>}
                        {price && <div><strong>Price:</strong> ${price}</div>}
                        {description && <div><strong>Desc:</strong> {description}</div>}
                    </div>
                ) : (
                    <div className="clarification-value">"{replyText}"</div>
                )}
            </div>
        );
    }

    if (contextIntent === 'add_asset') {
        const typeLabel = assetType ? assetType.charAt(0).toUpperCase() + assetType.slice(1) : 'Asset';
        return (
            <div className="clarification-widget anim-slide-up asset-form">
                <div className="clarification-header">
                    <Sparkles size={16} className="clarification-icon pulse-glow" />
                    <span>Add {typeLabel} Details</span>
                </div>
                
                <p className="clarification-question">{question || `Please provide details for the new ${assetType || 'asset'}.`}</p>
                
                <form onSubmit={handleSubmit} className="clarification-asset-form">
                    <div className="form-group">
                        <label>Title *</label>
                        <input
                            ref={inputRef}
                            type="text"
                            className="clarification-input"
                            placeholder={`e.g. My Premium ${typeLabel}`}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-row">
                        <div className="form-group flex-2">
                            <label>Link / URL {assetType === 'link' ? '*' : '(Optional)'}</label>
                            <input
                                type="text"
                                className="clarification-input"
                                placeholder="e.g. https://yoursite.com"
                                value={link}
                                onChange={(e) => setLink(e.target.value)}
                                required={assetType === 'link'}
                            />
                        </div>
                        <div className="form-group flex-1">
                            <label>Price ($)</label>
                            <input
                                type="text"
                                className="clarification-input"
                                placeholder="e.g. 19"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Description (Optional)</label>
                        <input
                            type="text"
                            className="clarification-input"
                            placeholder="Briefly describe what this is..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                    <button 
                        type="submit" 
                        className={`clarification-btn full-width ${title.trim() && (assetType !== 'link' || link.trim()) ? 'active' : ''}`}
                        disabled={!title.trim() || (assetType === 'link' && !link.trim())}
                    >
                        <Send size={15} />
                        <span>Add {typeLabel}</span>
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="clarification-widget anim-slide-up">
            <div className="clarification-header">
                <Sparkles size={16} className="clarification-icon pulse-glow" />
                <span>Action Required</span>
            </div>
            
            <p className="clarification-question">{question || "I need a bit more detail to proceed."}</p>
            
            <form onSubmit={handleSubmit} className="clarification-form">
                <input
                    ref={inputRef}
                    type="text"
                    className="clarification-input"
                    placeholder="Type your answer here..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                />
                <button 
                    type="submit" 
                    className={`clarification-btn ${replyText.trim() ? 'active' : ''}`}
                    disabled={!replyText.trim()}
                >
                    <Send size={15} />
                    <span>Send</span>
                </button>
            </form>
        </div>
    );
};

export default ClarificationWidget;
