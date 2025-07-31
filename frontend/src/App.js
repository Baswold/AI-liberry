import React, { useState, useEffect } from 'react';
import './App.css';
import SetupWizard from './components/SetupWizard';
import MainInterface from './components/MainInterface';

function App() {
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    // Check if setup is already complete
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    try {
      if (window.electronAPI) {
        const savedConfig = await window.electronAPI.loadConfig();
        if (savedConfig && savedConfig.isSetupComplete) {
          setConfig(savedConfig);
          setIsSetupComplete(true);
        }
      }
    } catch (error) {
      console.log('No existing configuration found');
    }
  };

  const handleSetupComplete = (newConfig) => {
    setConfig(newConfig);
    setIsSetupComplete(true);
  };

  return (
    <div className="App">
      {!isSetupComplete ? (
        <SetupWizard onSetupComplete={handleSetupComplete} />
      ) : (
        <MainInterface config={config} />
      )}
    </div>
  );
}

export default App;

