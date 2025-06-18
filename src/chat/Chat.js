import React, { useState, useRef, useEffect } from 'react';
import './Chat.css';

// Only Mistral AI is used
const bot = {
  name: "Mistral AI",
  key: "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",
  apiUrl: "https://openrouter.ai/api/v1/chat/completions",
  model: "mistralai/mistral-7b-instruct"
};

export default function Newchat() {
  const [messages, setMessages] = useState([
    { role: 'system', content: `Hello! I am Bot. How can I help you?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  // Voice input handler
  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Sorry, your browser does not support speech recognition.');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.interimResults = false;
      recognitionRef.current.maxAlternatives = 1;
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev ? prev + ' ' + transcript : transcript);
        setListening(false);
      };
      recognitionRef.current.onerror = (event) => {
        setListening(false);
        alert('Voice input error: ' + event.error);
      };
      recognitionRef.current.onend = () => setListening(false);
    }
    setListening(true);
    recognitionRef.current.start();
  };

  const sendMessage = async (customInput) => {
    const messageToSend = typeof customInput === "string" ? customInput : input;
    if (!messageToSend.trim()) return;

    const newMessages = [...messages, { role: 'user', content: messageToSend }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const apiMessages = newMessages.filter(msg => msg.role !== 'system');
      const body = JSON.stringify({
        model: bot.model,
        messages: apiMessages
      });
      const headers = {
        "Authorization": `Bearer ${bot.key}`,
        "Content-Type": "application/json"
      };
      const url = bot.apiUrl;

      const response = await fetch(url, {
        method: "POST",
        headers,
        body
      });

      const data = await response.json();
      const botReply =
        data?.choices?.[0]?.message?.content ||
        data?.choices?.[0]?.text ||
        'No response.';

      setMessages([...newMessages, { role: 'assistant', content: botReply }]);
    } catch (error) {
      console.error("Error fetching chat:", error);
      setMessages([...newMessages, { role: 'assistant', content: 'Error fetching response.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  // Export chat as .txt
  const exportChat = () => {
    const text = messages
      .filter(msg => msg.role !== 'system')
      .map(msg =>
        `${msg.role === 'user' ? 'You' : 'Bot'}: ${msg.content}`
      )
      .join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'chat.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Get unique user messages for history
  const userHistory = Array.from(
    new Set(
      messages
        .filter(msg => msg.role === 'user')
        .map(msg => msg.content)
        .reverse()
    )
  );

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h1>Chat with Bot</h1>
        <div className="chat-header-buttons">
          <button className="chat-export-button" onClick={exportChat}>
            Export Chat
          </button>
          <button
            className="chat-export-button"
            style={{ backgroundColor: '#f59e42' }}
            onClick={() => setShowHistory((v) => !v)}
            type="button"
          >
            History
          </button>
        </div>
      </div>
      <div className="chat-messages">
        {messages
          .filter(msg => msg.role !== 'system')
          .map((msg, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: '0.75rem'
              }}
            >
              <div
                style={{
                  background: msg.role === 'user' ? '#dbeafe' : '#dcfce7',
                  color: msg.role === 'user' ? '#1e293b' : '#14532d',
                  padding: '0.75rem 1rem',
                  borderRadius: '1rem',
                  maxWidth: '80%',
                  wordBreak: 'break-word',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
                }}
              >
                <div style={{
                  fontSize: '0.85em',
                  color: '#64748b',
                  marginBottom: '2px',
                  fontWeight: 500
                }}>
                  {msg.role === 'user' ? 'You' : 'Bot'}
                </div>
                <div style={{ fontSize: '1em', lineHeight: 1.4 }}>{msg.content}</div>
              </div>
            </div>
          ))}
        {loading && <div className="chat-loading">Typing...</div>}
        <div ref={messagesEndRef} />
      </div>

      {/* Dropdown History */}
      {showHistory && userHistory.length > 0 && (
        <div className="chat-history-dropdown">
          {userHistory.map((msg, idx) => (
            <div
              className="chat-history-item"
              key={idx}
              onClick={() => {
                setShowHistory(false);
                setInput(msg);
              }}
            >
              {msg}
            </div>
          ))}
        </div>
      )}

      <form className="chat-form" onSubmit={e => { e.preventDefault(); sendMessage(); }}>
        <div className='chatinput'>
          <div>
            <input
              type="text"
              className="chat-input"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={loading}
            />
          </div>
          <div>
            <button
              type="submit"
              className="chat-export-button"
              style={{ backgroundColor: '#3b82f6', marginRight: '0.5rem',marginLeft: '0.5rem' }}
              disabled={loading}
            >
              Send
            </button>
          </div>
          <div>
            <button
              type="button"
              className={`chat-voice-button${listening ? ' chat-voice-button-active' : ''}`}
              onClick={handleVoiceInput}
              disabled={loading || listening}
              title="Voice Input"
            >
              {/* 🎙️ */}
              <i class="fa-solid fa-microphone"></i>
            </button>
          </div>
        </div>
      </form>
      {listening && (
        <div className="chat-loading" style={{ color: '#a21caf', fontWeight: 600 }}>Listening...</div>
      )}
    </div>
  );
}
