"""
Search Engine for AI Library
Handles natural language queries and returns relevant files
"""

import sqlite3
import json
from pathlib import Path
from typing import Dict, List, Any

class SearchEngine:
    def __init__(self, db_path: Path, ai_client):
        self.db_path = db_path
        self.ai_client = ai_client
    
    def search(self, query: str) -> Dict[str, Any]:
        """Search for files based on natural language query"""
        try:
            # Get all files with descriptions for AI processing
            file_descriptions = self._get_file_descriptions()
            
            if not file_descriptions:
                return {
                    'message': "No files have been cataloged yet. Please wait for the catalog to complete.",
                    'files': []
                }
            
            # Use AI to process the query
            ai_response = self.ai_client.search_query(query, file_descriptions)
            
            # Get the actual file details for matched files
            matched_files = []
            if 'file_numbers' in ai_response and ai_response['file_numbers']:
                matched_files = self._get_files_by_numbers(ai_response['file_numbers'], file_descriptions)
            
            # If no AI matches, try FTS search as fallback
            if not matched_files:
                matched_files = self._fts_search(query)
                if matched_files:
                    ai_response['message'] = f"I found {len(matched_files)} files that might match your search for '{query}':"
            
            return {
                'message': ai_response.get('message', f"I searched for '{query}' but didn't find any matching files."),
                'files': matched_files
            }
            
        except Exception as e:
            print(f"Search error: {e}")
            return {
                'message': "I encountered an error while searching. Please try again.",
                'files': []
            }
    
    def _get_file_descriptions(self) -> List[Dict[str, Any]]:
        """Get all files with their descriptions for AI processing"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT id, name, path, description, file_type, size
                    FROM files 
                    ORDER BY name
                ''')
                
                files = []
                for row in cursor.fetchall():
                    files.append({
                        'id': row[0],
                        'name': row[1],
                        'path': row[2],
                        'description': row[3] or f"File: {row[1]}",
                        'file_type': row[4],
                        'size': row[5]
                    })
                
                return files
                
        except Exception as e:
            print(f"Error getting file descriptions: {e}")
            return []
    
    def _get_files_by_numbers(self, file_numbers: List[int], file_descriptions: List[Dict]) -> List[Dict[str, Any]]:
        """Get file details by their numbers in the description list"""
        matched_files = []
        
        for num in file_numbers:
            if 1 <= num <= len(file_descriptions):
                file_info = file_descriptions[num - 1]  # Convert to 0-based index
                matched_files.append({
                    'name': file_info['name'],
                    'path': file_info['path'],
                    'description': file_info['description'],
                    'file_type': file_info['file_type'],
                    'size': self._format_file_size(file_info['size'])
                })
        
        return matched_files
    
    def _fts_search(self, query: str) -> List[Dict[str, Any]]:
        """Fallback full-text search using SQLite FTS"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Prepare query for FTS
                fts_query = ' OR '.join(query.split())
                
                cursor.execute('''
                    SELECT f.name, f.path, f.description, f.file_type, f.size
                    FROM files_fts fts
                    JOIN files f ON f.id = fts.rowid
                    WHERE files_fts MATCH ?
                    ORDER BY rank
                    LIMIT 10
                ''', (fts_query,))
                
                files = []
                for row in cursor.fetchall():
                    files.append({
                        'name': row[0],
                        'path': row[1],
                        'description': row[2] or f"File: {row[0]}",
                        'file_type': row[3],
                        'size': self._format_file_size(row[4])
                    })
                
                return files
                
        except Exception as e:
            print(f"FTS search error: {e}")
            return []
    
    def _format_file_size(self, size_bytes: int) -> str:
        """Format file size in human-readable format"""
        if size_bytes is None:
            return "Unknown"
        
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f} TB"
    
    def get_stats(self) -> Dict[str, Any]:
        """Get catalog statistics"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Total files
                cursor.execute('SELECT COUNT(*) FROM files')
                total_files = cursor.fetchone()[0]
                
                # Files by type
                cursor.execute('''
                    SELECT file_type, COUNT(*) 
                    FROM files 
                    GROUP BY file_type 
                    ORDER BY COUNT(*) DESC
                ''')
                file_types = dict(cursor.fetchall())
                
                # Total size
                cursor.execute('SELECT SUM(size) FROM files')
                total_size = cursor.fetchone()[0] or 0
                
                return {
                    'total_files': total_files,
                    'file_types': file_types,
                    'total_size': self._format_file_size(total_size)
                }
                
        except Exception as e:
            print(f"Error getting stats: {e}")
            return {
                'total_files': 0,
                'file_types': {},
                'total_size': '0 B'
            }

