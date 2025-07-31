import React, { useState } from 'react';
import './SetupWizard.css';

const SetupWizard = ({ onSetupComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [aiType, setAiType] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [localEndpoint, setLocalEndpoint] = useState('http://localhost:11434');
  const [selectedDirectory, setSelectedDirectory] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAiTypeSelect = (type) => {
    setAiType(type);
    setCurrentStep(2);
  };

  const handleDirectorySelect = async () => {
    try {
      const result = await window.electronAPI.selectDirectory();
      if (!result.canceled && result.filePaths.length > 0) {
        setSelectedDirectory(result.filePaths[0]);
      }
    } catch (error) {
      console.error('Error selecting directory:', error);
    }
  };

  const handleFinishSetup = async () => {
    setIsLoading(true);
    
    const config = {
      aiType,
      apiKey: aiType === 'api' ? apiKey : '',
      localEndpoint: aiType === 'local' ? localEndpoint : '',
      dataDirectory: selectedDirectory,
      isSetupComplete: true,
      setupDate: new Date().toISOString()
    };

    try {
      // Save configuration
      await window.electronAPI.saveConfig(config);
      
      // Start the catalog building process
      await window.electronAPI.startCatalogBuild(selectedDirectory, {
        aiType,
        apiKey: aiType === 'api' ? apiKey : '',
        localEndpoint: aiType === 'local' ? localEndpoint : ''
      });
      
      onSetupComplete(config);
    } catch (error) {
      console.error('Error completing setup:', error);
      alert('There was an error completing the setup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const canProceedToStep3 = () => {
    if (aiType === 'api') {
      return apiKey.trim().length > 0;
    } else if (aiType === 'local') {
      return localEndpoint.trim().length > 0;
    }
    return false;
  };

  const canFinishSetup = () => {
    return selectedDirectory.length > 0 && canProceedToStep3();
  };

  return (
    <div className="setup-wizard">
      <div className="setup-container">
        <div className="setup-header">
          <h1>Welcome to AI Library</h1>
          <p>Let's set up your personal database assistant in just a few steps</p>
          <div className="step-indicator">
            <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>1</div>
            <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>2</div>
            <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>3</div>
          </div>
        </div>

        {currentStep === 1 && (
          <div className="setup-step">
            <h2>Choose Your AI Assistant</h2>
            <p>Select how you want to power your AI assistant:</p>
            
            <div className="ai-options">
              <div 
                className={`ai-option ${aiType === 'local' ? 'selected' : ''}`}
                onClick={() => handleAiTypeSelect('local')}
              >
                <h3>🖥️ Local AI Model</h3>
                <p>Use your own AI model running locally</p>
                <small>You'll need to have a model like Ollama already running</small>
              </div>
              
              <div 
                className={`ai-option ${aiType === 'api' ? 'selected' : ''}`}
                onClick={() => handleAiTypeSelect('api')}
              >
                <h3>🌐 Cloud AI Service</h3>
                <p>Use a cloud-based AI service</p>
                <small>Requires an API key from OpenAI, Anthropic, or similar</small>
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="setup-step">
            <h2>Configure Your AI</h2>
            
            {aiType === 'local' && (
              <div>
                <p>Enter the endpoint for your local AI model:</p>
                <div className="form-group">
                  <label className="form-label">Local AI Endpoint</label>
                  <input
                    type="text"
                    className="form-input"
                    value={localEndpoint}
                    onChange={(e) => setLocalEndpoint(e.target.value)}
                    placeholder="http://localhost:11434"
                  />
                  <small>Default Ollama endpoint is http://localhost:11434</small>
                </div>
              </div>
            )}
            
            {aiType === 'api' && (
              <div>
                <p>Enter your API key:</p>
                <div className="form-group">
                  <label className="form-label">API Key</label>
                  <input
                    type="password"
                    className="form-input"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API key"
                  />
                  <small>Your API key will be stored securely on your device</small>
                </div>
              </div>
            )}
            
            <div className="step-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setCurrentStep(1)}
              >
                Back
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => setCurrentStep(3)}
                disabled={!canProceedToStep3()}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="setup-step">
            <h2>Select Your Files</h2>
            <p>Choose the folder containing the files you want to search:</p>
            
            <div className="directory-selection">
              <button 
                className="btn btn-primary directory-btn"
                onClick={handleDirectorySelect}
              >
                📁 Choose Folder
              </button>
              
              {selectedDirectory && (
                <div className="selected-directory">
                  <p><strong>Selected:</strong> {selectedDirectory}</p>
                </div>
              )}
            </div>
            
            <div className="setup-info">
              <h3>What happens next?</h3>
              <ul>
                <li>✅ The app will scan all your files automatically</li>
                <li>✅ It will build a searchable catalog (20-30 minutes)</li>
                <li>✅ You can walk away - no interaction needed!</li>
                <li>✅ When done, you'll have an AI-powered file assistant</li>
              </ul>
            </div>
            
            <div className="step-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setCurrentStep(2)}
              >
                Back
              </button>
              <button 
                className="btn btn-success"
                onClick={handleFinishSetup}
                disabled={!canFinishSetup() || isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="spinner"></div>
                    Starting...
                  </>
                ) : (
                  'Start Building My Library'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SetupWizard;

