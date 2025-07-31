import React, { useState, useEffect, useRef } from 'react';
import './MainInterface.css';

const MainInterface = ({ config }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [catalogProgress, setCatalogProgress] = useState(null);
  const [isCatalogComplete, setIsCatalogComplete] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Check catalog progress on mount
    checkCatalogProgress();
    
    // Set up interval to check progress
    const interval = setInterval(checkCatalogProgress, 2000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const checkCatalogProgress = async () => {
    try {
      const progress = await window.electronAPI.getCatalogProgress();
      setCatalogProgress(progress);
      
      if (progress && progress.isComplete) {
        setIsCatalogComplete(true);
        if (messages.length === 0) {
          // Add welcome message when catalog is complete
          setMessages([{
            type: 'system',
            content: "🎉 Your AI Library is ready! I've cataloged all your files and I'm ready to help you find anything. Just ask me in plain English - like 'Do I have that chocolate cake recipe?' or 'Show me my vacation photos from 2023'.",
            timestamp: new Date()
          }]);
        }
      }
    } catch (error) {
      console.error('Error checking catalog progress:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !isCatalogComplete) return;

    const userMessage = {
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await window.electronAPI.searchFiles(inputValue);
      
      const aiMessage = {
        type: 'ai',
        content: response.message,
        files: response.files || [],
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error searching files:', error);
      const errorMessage = {
        type: 'ai',
        content: "I'm sorry, I encountered an error while searching your files. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleOpenFile = async (filePath) => {
    try {
      await window.electronAPI.openFile(filePath);
    } catch (error) {
      console.error('Error opening file:', error);
    }
  };

  const formatTimestamp = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="main-interface">
      <div className="header">
        <h1>🤖 AI Library</h1>
        <div className="header-info">
          <span>📁 {config.dataDirectory}</span>
          {catalogProgress && !catalogProgress.isComplete && (
            <span className="catalog-status">
              📊 Building catalog... {catalogProgress.progress}%
            </span>
          )}
          {isCatalogComplete && (
            <span className="catalog-status complete">
              ✅ Ready
            </span>
          )}
        </div>
      </div>

      <div className="chat-container">
        {!isCatalogComplete && catalogProgress ? (
          <div className="catalog-building">
            <div className="catalog-card">
              <h2>🔄 Building Your AI Library</h2>
              <p>I'm scanning and cataloging your files. This usually takes 20-30 minutes depending on your collection size.</p>
              
              <div className="progress-section">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${catalogProgress.progress || 0}%` }}
                  ></div>
                </div>
                <div className="progress-text">
                  {catalogProgress.progress || 0}% complete
                </div>
              </div>
              
              {catalogProgress.currentFile && (
                <div className="current-file">
                  <small>Processing: {catalogProgress.currentFile}</small>
                </div>
              )}
              
              <div className="catalog-stats">
                <div className="stat">
                  <span className="stat-number">{catalogProgress.filesProcessed || 0}</span>
                  <span className="stat-label">Files Processed</span>
                </div>
                <div className="stat">
                  <span className="stat-number">{catalogProgress.totalFiles || 0}</span>
                  <span className="stat-label">Total Files</span>
                </div>
              </div>
              
              <p className="catalog-note">
                💡 You can close this app and come back later - the process will continue in the background!
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="messages">
              {messages.map((message, index) => (
                <div key={index} className={`message ${message.type}`}>
                  <div className="message-content">
                    <p>{message.content}</p>
                    
                    {message.files && message.files.length > 0 && (
                      <div className="file-results">
                        <h4>📄 Found Files:</h4>
                        {message.files.map((file, fileIndex) => (
                          <div key={fileIndex} className="file-item">
                            <div className="file-info">
                              <span className="file-name">{file.name}</span>
                              <span className="file-path">{file.path}</span>
                              {file.description && (
                                <span className="file-description">{file.description}</span>
                              )}
                            </div>
                            <button 
                              className="btn btn-primary file-open-btn"
                              onClick={() => handleOpenFile(file.path)}
                            >
                              Open
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="message-time">
                    {formatTimestamp(message.timestamp)}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="message ai">
                  <div className="message-content">
                    <div className="typing-indicator">
                      <div className="spinner"></div>
                      <span>Searching your files...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            <div className="input-area">
              <div className="input-container">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={isCatalogComplete ? "Ask me about your files... (e.g., 'Do I have that chocolate cake recipe?')" : "Please wait while I build your catalog..."}
                  disabled={!isCatalogComplete || isLoading}
                  rows="1"
                />
                <button 
                  className="btn btn-primary send-btn"
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading || !isCatalogComplete}
                >
                  Send
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MainInterface;

