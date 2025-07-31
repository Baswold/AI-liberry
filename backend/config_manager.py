"""
Configuration Manager for AI Library
Handles saving and loading user configuration
"""

import json
import os
from pathlib import Path

class ConfigManager:
    def __init__(self):
        self.config_dir = Path.home() / '.ai_library'
        self.config_file = self.config_dir / 'config.json'
        self.config_dir.mkdir(exist_ok=True)
    
    def save_config(self, config_data):
        """Save configuration to file"""
        try:
            with open(self.config_file, 'w') as f:
                json.dump(config_data, f, indent=2)
            return True
        except Exception as e:
            print(f"Error saving config: {e}")
            return False
    
    def load_config(self):
        """Load configuration from file"""
        try:
            if self.config_file.exists():
                with open(self.config_file, 'r') as f:
                    return json.load(f)
            return {}
        except Exception as e:
            print(f"Error loading config: {e}")
            return {}
    
    def get_data_directory(self):
        """Get the configured data directory"""
        config = self.load_config()
        return config.get('dataDirectory', '')
    
    def get_ai_config(self):
        """Get AI configuration"""
        config = self.load_config()
        return {
            'aiType': config.get('aiType', ''),
            'apiKey': config.get('apiKey', ''),
            'localEndpoint': config.get('localEndpoint', 'http://localhost:11434')
        }

