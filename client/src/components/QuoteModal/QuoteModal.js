// src/components/QuoteModal.js
import React, { useState, useEffect, useRef } from 'react';
import './QuoteModal.css';

const QuoteModal = ({ providerName, onClose }) => {
  const preferredName = localStorage.getItem('preferred_name') || 'there';
  const initialText = `Thanks for your interest, ${preferredName}. Let me know what you need and I can give you a quote on what that might cost.`;
  const responseText = `Got it. That's helpful context. I'll text you soon with a quote!`;

  const [displayedText, setDisplayedText] = useState('');
  const [chat, setChat] = useState([]);
  const [showInput, setShowInput] = useState(false);
  const [userInput, setUserInput] = useState('');
  const indexRef = useRef(0);

  // Typewriter for initial message
  useEffect(() => {
    const interval = setInterval(() => {
      const next = indexRef.current + 1;
      setDisplayedText(initialText.slice(0, next));
      indexRef.current = next;
      if (next === initialText.length) {
        clearInterval(interval);
        setChat([{ from: 'provider', text: initialText }]);
        setShowInput(true);
      }
    }, 30);
    return () => clearInterval(interval);
  }, []);

  const handleSend = () => {
    if (!userInput.trim()) return;
    // add user bubble
    setChat(c => [...c, { from: 'user', text: userInput }]);
    setUserInput('');
    setShowInput(false);

    // provider follow-up after a brief pause
    setTimeout(() => {
      setChat(c => [...c, { from: 'provider', text: responseText }]);
    }, 500);
  };

  return (
    <div className="modal-overlay">
      <div className="chat-modal">
        <button className="modal-close-x" onClick={onClose}>×</button>
        <div className="chat-window">
          {chat.map((msg, i) => (
            <div key={i} className={`chat-bubble ${msg.from}`}>
              {msg.text}
            </div>
          ))}

          {/* still typing state */}
          {!showInput && (
            <div className="chat-bubble provider typing">
              {displayedText}
              <span className="cursor">|</span>
            </div>
          )}
        </div>

        {showInput && (
          <div className="chat-input-area">
            <input
              type="text"
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              placeholder="Type your request…"
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
            <button className="send-button" onClick={handleSend}>Send</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuoteModal;