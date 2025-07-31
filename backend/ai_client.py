"""
AI Client for AI Library
Handles communication with different AI providers (local models, APIs)
"""

import requests
import json
from typing import Dict, Any, Optional

class AIClient:
    def __init__(self, config: Dict[str, Any]):
        self.ai_type = config.get('aiType', '')
        self.api_key = config.get('apiKey', '')
        self.local_endpoint = config.get('localEndpoint', 'http://localhost:11434')
        
        # Validate configuration
        if self.ai_type == 'api' and not self.api_key:
            raise ValueError("API key is required for API-based AI")
        elif self.ai_type == 'local' and not self.local_endpoint:
            raise ValueError("Local endpoint is required for local AI")
    
    def generate_description(self, file_path: str, file_content: str = None, metadata: Dict = None) -> str:
        """Generate a description for a file"""
        try:
            # Create prompt based on available information
            prompt = self._create_description_prompt(file_path, file_content, metadata)
            
            # Get response from AI
            response = self._call_ai(prompt)
            
            return response.strip()
            
        except Exception as e:
            print(f"Error generating description for {file_path}: {e}")
            return f"File: {file_path.split('/')[-1]}"
    
    def search_query(self, query: str, file_descriptions: list) -> Dict[str, Any]:
        """Process a search query and return relevant files"""
        try:
            prompt = self._create_search_prompt(query, file_descriptions)
            response = self._call_ai(prompt)
            
            # Parse the AI response
            return self._parse_search_response(response, query)
            
        except Exception as e:
            print(f"Error processing search query: {e}")
            return {
                'message': "I encountered an error while searching. Please try again.",
                'files': []
            }
    
    def _create_description_prompt(self, file_path: str, file_content: str = None, metadata: Dict = None) -> str:
        """Create a prompt for file description generation"""
        filename = file_path.split('/')[-1]
        
        prompt = f"Describe this file in 1-2 sentences for search purposes:\n"
        prompt += f"Filename: {filename}\n"
        
        if metadata:
            if 'size' in metadata:
                prompt += f"Size: {metadata['size']} bytes\n"
            if 'modified' in metadata:
                prompt += f"Modified: {metadata['modified']}\n"
            if 'file_type' in metadata:
                prompt += f"Type: {metadata['file_type']}\n"
        
        if file_content:
            # Limit content to avoid token limits
            content_preview = file_content[:2000] + "..." if len(file_content) > 2000 else file_content
            prompt += f"Content preview: {content_preview}\n"
        
        prompt += "\nProvide a concise description focusing on what this file contains and what someone might search for to find it:"
        
        return prompt
    
    def _create_search_prompt(self, query: str, file_descriptions: list) -> str:
        """Create a prompt for search query processing"""
        prompt = f"User is searching for: '{query}'\n\n"
        prompt += "Here are the available files with their descriptions:\n\n"
        
        for i, file_info in enumerate(file_descriptions[:50]):  # Limit to avoid token limits
            prompt += f"{i+1}. {file_info['name']} - {file_info['description']}\n"
        
        prompt += f"\nBased on the user's query '{query}', which files are most relevant? "
        prompt += "Respond with a helpful message and list the relevant file numbers (if any). "
        prompt += "Format your response as: MESSAGE: [your helpful message] FILES: [comma-separated list of file numbers, or 'none' if no matches]"
        
        return prompt
    
    def _call_ai(self, prompt: str) -> str:
        """Call the appropriate AI service"""
        if self.ai_type == 'api':
            return self._call_api(prompt)
        elif self.ai_type == 'local':
            return self._call_local(prompt)
        else:
            raise ValueError(f"Unknown AI type: {self.ai_type}")
    
    def _call_api(self, prompt: str) -> str:
        """Call external API (OpenAI, Anthropic, etc.)"""
        # This is a simplified implementation - you might want to detect the API provider
        # based on the API key format or add provider selection
        
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }
        
        data = {
            'model': 'gpt-3.5-turbo',  # Default model
            'messages': [
                {'role': 'user', 'content': prompt}
            ],
            'max_tokens': 500,
            'temperature': 0.3
        }
        
        try:
            response = requests.post(
                'https://api.openai.com/v1/chat/completions',
                headers=headers,
                json=data,
                timeout=30
            )
            response.raise_for_status()
            
            result = response.json()
            return result['choices'][0]['message']['content']
            
        except Exception as e:
            print(f"API call error: {e}")
            raise
    
    def _call_local(self, prompt: str) -> str:
        """Call local AI model (Ollama, etc.)"""
        try:
            # Ollama API format
            data = {
                'model': 'llama2',  # Default model - user should configure this
                'prompt': prompt,
                'stream': False
            }
            
            response = requests.post(
                f'{self.local_endpoint}/api/generate',
                json=data,
                timeout=60
            )
            response.raise_for_status()
            
            result = response.json()
            return result.get('response', '')
            
        except Exception as e:
            print(f"Local AI call error: {e}")
            raise
    
    def _parse_search_response(self, response: str, query: str) -> Dict[str, Any]:
        """Parse AI search response"""
        try:
            # Look for MESSAGE: and FILES: patterns
            message_start = response.find('MESSAGE:')
            files_start = response.find('FILES:')
            
            if message_start != -1 and files_start != -1:
                message = response[message_start + 8:files_start].strip()
                files_text = response[files_start + 6:].strip()
                
                # Parse file numbers
                file_numbers = []
                if files_text.lower() != 'none':
                    try:
                        file_numbers = [int(x.strip()) for x in files_text.split(',') if x.strip().isdigit()]
                    except:
                        pass
                
                return {
                    'message': message,
                    'file_numbers': file_numbers
                }
            else:
                # Fallback parsing
                return {
                    'message': response,
                    'file_numbers': []
                }
                
        except Exception as e:
            print(f"Error parsing search response: {e}")
            return {
                'message': f"I found some information related to '{query}', but had trouble formatting the response.",
                'file_numbers': []
            }

