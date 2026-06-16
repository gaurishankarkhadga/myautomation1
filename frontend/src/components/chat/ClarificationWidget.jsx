import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';
import '../../styles/ClarificationWidget.css';

const ClarificationWidget = ({ question, onReply }) => {
    const [replyText, setReplyText] = useState('');
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
        if (replyText.trim() && !isSubmitted) {
            setIsSubmitted(true);
            onReply(replyText.trim());
        }
    };

    if (isSubmitted) {
        return (
            <div className="clarification-widget submitted">
                <div className="clarification-header">
                    <Sparkles size={14} className="clarification-icon" />
                    <span>Clarification provided</span>
                </div>
                <div className="clarification-value">"{replyText}"</div>
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
