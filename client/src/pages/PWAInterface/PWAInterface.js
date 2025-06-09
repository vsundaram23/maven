import React, { useState, useEffect, useRef } from 'react';
import { useClerk, useUser } from "@clerk/clerk-react";
import './PWAInterface.css';

const API_URL = 'https://api.seanag-recommendations.org:8080';
// const API_URL = "http://localhost:3000";

export default function PwaInterface() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { openSignIn } = useClerk();

  const [initialLoad, setInitialLoad] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState(null); // 'find' or 'share'
  const [form, setForm] = useState({ businessName: '', experience: '', photo: null });
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null); // Ref for scrolling to the bottom

  // Scroll to the latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Simulate an intro screen duration
    const timer = setTimeout(() => {
      setInitialLoad(false);
    }, 2000); // Show intro screen for 2 seconds
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Initialize chat messages once intro screen is done and user is signed in
    if (!initialLoad && isSignedIn && !showChat) {
      setMessages([
        { type: 'bot', text: `Hi ${user?.firstName || 'there'}! I'm your T&T Assistant. How can I help you today?` },
        { type: 'options', options: [{ text: 'Find a Rec', value: 'find' }, { text: 'Share a Rec', value: 'share' }] }
      ]);
      setShowChat(true);
    }
  }, [initialLoad, isSignedIn, user, showChat]);

  // Scroll to bottom whenever messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getAuthHeaders = async () => {
    if (!window.Clerk || !window.Clerk.session) {
      console.error("Clerk session not available.");
      throw new Error("Authentication session expired or not found.");
    }
    const token = await window.Clerk.session.getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const handleUserOptionClick = (optionValue) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      { type: 'user', text: optionValue === 'find' ? 'Find a Rec' : 'Share a Rec' }
    ]);
    setMode(optionValue);
    setMessages((prevMessages) => [...prevMessages, { type: 'bot', text: optionValue === 'find' ? 'What are you looking for?' : 'Please provide details for your recommendation.' }]);
  };

  const handleSendMessage = async () => {
    if ((mode === 'find' && !input.trim()) || (mode === 'share' && (!form.businessName.trim() || !form.experience.trim()))) {
      return;
    }

    setLoading(true);
    const userMessageText = mode === 'find' ? input : `Business: ${form.businessName}, Experience: ${form.experience}`;
    setMessages((prevMessages) => [...prevMessages, { type: 'user', text: userMessageText }]);
    setInput(''); // Clear input after sending
    setForm({ businessName: '', experience: '', photo: null }); // Clear form after sending

    try {
      const headers = await getAuthHeaders();
      let responseMessage = "Sorry, an error occurred.";

      if (mode === 'find') {
        const res = await fetch(`${API_URL}/api/shortcut/find-rec`, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            query: userMessageText, // Use the input as the query
            userId: user.id,
            userEmail: user.primaryEmailAddress.emailAddress,
          }),
        });
        const data = await res.json();
        responseMessage = data.message;
      } else if (mode === 'share') {
        const photoBase64 = null; // Placeholder for photo upload
        const res = await fetch(`${API_URL}/api/shortcut/share-rec`, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            businessName: form.businessName,
            experience: form.experience,
            photoBase64: photoBase64,
            userId: user.id,
            userEmail: user.primaryEmailAddress.emailAddress,
          }),
        });
        const data = await res.json();
        responseMessage = data.message;
      }

      setMessages((prevMessages) => [...prevMessages, { type: 'bot', text: responseMessage }]);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prevMessages) => [...prevMessages, { type: 'bot', text: "Sorry, an error occurred while processing your request." }]);
    } finally {
      setLoading(false);
      // After handling the request, reset mode and offer options again
      setMode(null);
      setMessages((prevMessages) => [
        ...prevMessages,
        { type: 'options', options: [{ text: 'Find a Rec', value: 'find' }, { text: 'Share a Rec', value: 'share' }] }
      ]);
    }
  };

  // Render loading screen while Clerk is loading
  if (!isLoaded) {
    return (
      <div className="pwa-loading-screen">
        Loading T&T PWA...
      </div>
    );
  }

  // Render sign-in screen if user is not signed in
  if (!isSignedIn) {
    return (
      <div className="pwa-signin-screen">
        <h1 className="pwa-signin-title">Welcome to T&T 👋</h1>
        <p className="pwa-signin-message">Please sign in to access recommendations and share your own!</p>
        <button
          onClick={() => openSignIn()}
          className="pwa-signin-button"
        >
          Sign In
        </button>
      </div>
    );
  }

  // Render intro screen on initial load
  if (initialLoad) {
    return (
      <div className="pwa-intro-screen">
        <div className="pwa-intro-logo">Tried & Trusted</div>
        <div className="pwa-intro-hand">👋</div>
      </div>
    );
  }

  // Main PWA Chat Interface
  return (
    <div className="pwa-chat-container">
      <div className="pwa-chat-header">
        <span className="pwa-chat-header-title">Tried & Trusted</span>
        <button className="pwa-chat-header-menu">
          <div className="pwa-chat-header-menu-line"></div>
          <div className="pwa-chat-header-menu-line"></div>
          <div className="pwa-chat-header-menu-line"></div>
        </button>
      </div>
      <div className="pwa-chat-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`pwa-message-bubble pwa-message-${msg.type}`}>
            {msg.type === 'options' ? (
              <div className="pwa-chat-options">
                {msg.options.map((option) => (
                  <button key={option.value} onClick={() => handleUserOptionClick(option.value)} className="pwa-chat-option-button">
                    {option.text}
                  </button>
                ))}
              </div>
            ) : (
              <p>{msg.text}</p>
            )}
          </div>
        ))}

        {/* Scroll to bottom element */}
        <div ref={messagesEndRef} />
      </div>

      <div className="pwa-input-area">
        {mode === 'find' && (
          <>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="pwa-chat-input-field"
              placeholder="e.g., plumber in Queens"
              disabled={loading}
              onKeyPress={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
            />
            <button
              onClick={handleSendMessage}
              className="pwa-chat-send-button"
              disabled={loading || !input.trim()}
            >
              Send
            </button>
          </>
        )}

        {mode === 'share' && (
          <>
            <div className="pwa-share-form-inputs">
                <input
                    type="text"
                    value={form.businessName}
                    onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                    className="pwa-chat-input-field"
                    placeholder="Business Name"
                    disabled={loading}
                />
                <textarea
                    value={form.experience}
                    onChange={(e) => setForm({ ...form, experience: e.target.value })}
                    className="pwa-chat-textarea-field"
                    placeholder="Your experience"
                    disabled={loading}
                />
            </div>
            <button
              onClick={handleSendMessage}
              className="pwa-chat-send-button"
              disabled={loading || !form.businessName.trim() || !form.experience.trim()}
            >
              Submit
            </button>
          </>
        )}
      </div>
    </div>
  );
}