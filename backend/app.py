#!/usr/bin/env python3
"""
AI Library Backend - Personal Database Assistant
Main Flask application for handling file cataloging and AI-powered search
"""

import os
import json
import sqlite3
import threading
import time
from datetime import datetime
from pathlib import Path

from flask import Flask, request, jsonify
from flask_cors import CORS

from catalog_builder import CatalogBuilder
from search_engine import SearchEngine
from ai_client import AIClient
from config_manager import ConfigManager

app = Flask(__name__)
CORS(app)

# Global instances
catalog_builder = None
search_engine = None
ai_client = None
config_manager = ConfigManager()

# Global state for catalog building
catalog_progress = {
    'isComplete': False,
    'progress': 0,
    'filesProcessed': 0,
    'totalFiles': 0,
    'currentFile': '',
    'startTime': None,
    'endTime': None
}

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})

@app.route('/config', methods=['GET'])
def get_config():
    """Get current configuration"""
    try:
        config = config_manager.load_config()
        return jsonify(config)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/config', methods=['POST'])
def save_config():
    """Save configuration"""
    try:
        config_data = request.json
        config_manager.save_config(config_data)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/catalog/start', methods=['POST'])
def start_catalog_build():
    """Start the catalog building process"""
    global catalog_builder, ai_client, catalog_progress
    
    try:
        data = request.json
        directory_path = data.get('directoryPath')
        ai_config = data.get('aiConfig', {})
        
        if not directory_path or not os.path.exists(directory_path):
            return jsonify({'error': 'Invalid directory path'}), 400
        
        # Initialize AI client
        ai_client = AIClient(ai_config)
        
        # Initialize catalog builder
        catalog_builder = CatalogBuilder(directory_path, ai_client)
        
        # Reset progress
        catalog_progress = {
            'isComplete': False,
            'progress': 0,
            'filesProcessed': 0,
            'totalFiles': 0,
            'currentFile': '',
            'startTime': datetime.now().isoformat(),
            'endTime': None
        }
        
        # Start catalog building in background thread
        def build_catalog():
            try:
                catalog_builder.build_catalog(progress_callback=update_progress)
                catalog_progress['isComplete'] = True
                catalog_progress['endTime'] = datetime.now().isoformat()
                catalog_progress['progress'] = 100
                
                # Initialize search engine after catalog is complete
                global search_engine
                search_engine = SearchEngine(catalog_builder.db_path, ai_client)
                
            except Exception as e:
                print(f"Error building catalog: {e}")
                catalog_progress['error'] = str(e)
        
        thread = threading.Thread(target=build_catalog)
        thread.daemon = True
        thread.start()
        
        return jsonify({'success': True, 'message': 'Catalog building started'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def update_progress(current_file, files_processed, total_files):
    """Update catalog building progress"""
    global catalog_progress
    
    catalog_progress.update({
        'currentFile': current_file,
        'filesProcessed': files_processed,
        'totalFiles': total_files,
        'progress': int((files_processed / total_files) * 100) if total_files > 0 else 0
    })

@app.route('/catalog/progress', methods=['GET'])
def get_catalog_progress():
    """Get current catalog building progress"""
    return jsonify(catalog_progress)

@app.route('/search', methods=['POST'])
def search_files():
    """Search files using natural language query"""
    global search_engine
    
    try:
        if not search_engine:
            return jsonify({'error': 'Search engine not initialized. Please wait for catalog to complete.'}), 400
        
        data = request.json
        query = data.get('query', '').strip()
        
        if not query:
            return jsonify({'error': 'Query cannot be empty'}), 400
        
        # Perform search
        results = search_engine.search(query)
        
        return jsonify({
            'message': results['message'],
            'files': results['files'],
            'query': query,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/file/open', methods=['POST'])
def open_file():
    """Open a file using system default application"""
    try:
        data = request.json
        file_path = data.get('filePath')
        
        if not file_path or not os.path.exists(file_path):
            return jsonify({'error': 'File not found'}), 404
        
        # Open file with system default application
        import subprocess
        import platform
        
        system = platform.system()
        if system == 'Darwin':  # macOS
            subprocess.run(['open', file_path])
        elif system == 'Windows':
            os.startfile(file_path)
        else:  # Linux
            subprocess.run(['xdg-open', file_path])
        
        return jsonify({'success': True})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Ensure data directory exists
    data_dir = Path.home() / '.ai_library'
    data_dir.mkdir(exist_ok=True)
    
    print("🚀 AI Library Backend starting...")
    print(f"📁 Data directory: {data_dir}")
    print("🌐 Server running on http://localhost:5000")
    
    app.run(host='0.0.0.0', port=5000, debug=False)

