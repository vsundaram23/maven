// src/components/QuoteModal.js
import React, { useState, useEffect, useRef } from 'react';
import './QuoteModal.css';

const API_URL = 'https://api.seanag-recommendations.org:8080';
// const API_URL = 'http://localhost:3000';

const QuoteModal = ({
  providerName,
  providerEmail,           // ← new!
  providerPhotoUrl = null,
  onClose
}) => {
  const preferredName = localStorage.getItem('preferred_name') || 'there';
  const userEmail     = localStorage.getItem('userEmail');    // ← grab it
  const initialText   = `Thanks for your interest, ${preferredName}. Let me know what you need and I can give you a quote on what that might cost.`;
  const responseText  = `Got it. That's helpful context. I'll text you directly with a quote!`;

  const [displayedText, setDisplayedText]     = useState('');
  const [chat, setChat]                       = useState([]);
  const [showInput, setShowInput]             = useState(false);
  const [showCloseButton, setShowCloseButton] = useState(false);
  const [userInput, setUserInput]             = useState('');
  const indexRef                               = useRef(0);
  const textareaRef                            = useRef(null);

  // Typewriter intro…
  useEffect(() => {
    indexRef.current = 0;
    setChat([]); setShowInput(false); setShowCloseButton(false); setDisplayedText('');
    const iv = setInterval(() => {
      const next = indexRef.current + 1;
      setDisplayedText(initialText.slice(0, next));
      indexRef.current = next;
      if (next === initialText.length) {
        clearInterval(iv);
        setChat([{ from: 'provider', text: initialText }]);
        setShowInput(true);
      }
    }, 30);
    return () => clearInterval(iv);
  }, [initialText]);

  const handleSend = async () => {
    if (!userInput.trim()) return;

    // 1) show the user bubble immediately
    setChat(c => [...c, { from: 'user', text: userInput }]);
    setShowInput(false);

    // 2) POST to your backend
    try {
      await fetch(`${API_URL}/api/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_email: providerEmail,
          email:          userEmail,
          message:        userInput.trim()
        })
      });
    } catch (err) {
      console.error('Quote request failed', err);
      // optional: show an error bubble or toast
    }

    // 3) clear input & auto‐resize reset
    if (textareaRef.current) {
      textareaRef.current.value = '';
      textareaRef.current.style.height = 'auto';
    }

    // 4) provider auto‐reply
    setTimeout(() => {
      setChat(c => [...c, { from: 'provider', text: responseText }]);
      setShowCloseButton(true);
    }, 500);

    setUserInput('');
  };

  const initial = providerName.charAt(0).toUpperCase();

  return (
    <div className="modal-overlay">
      <div className="chat-modal">
        <button className="modal-close-x" onClick={onClose}>×</button>

        {/* HEADER */}
        <div className="chat-header">
          {providerPhotoUrl
            ? <img src={providerPhotoUrl} alt={providerName} className="chat-avatar" />
            : <div className="chat-avatar fallback">{initial}</div>
          }
          <div className="chat-header-info">
            <h3 className="chat-provider-name">{providerName}</h3>
            <span className="chat-status">AI Assistant</span>
          </div>
        </div>

        {/* CHAT WINDOW */}
        <div className="chat-window">
          {chat.map((msg,i) => (
            <div key={i} className={`chat-bubble ${msg.from}`}>
              {msg.text}
            </div>
          ))}

          {!showInput && chat.length === 0 && (
            <div className="chat-bubble provider typing">
              {displayedText}<span className="cursor">|</span>
            </div>
          )}
        </div>

        {/* INPUT */}
        {showInput && !showCloseButton && (
          <div className="chat-input-area">
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder="Type your request… (Shift+Enter for new line)"
              onChange={e => {
                setUserInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button className="send-button" onClick={handleSend}>Send</button>
          </div>
        )}

        {/* CLOSE CHAT */}
        {showCloseButton && (
          <div className="close-chat-area">
            <button className="close-chat-button" onClick={onClose}>
              Close Chat
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuoteModal;