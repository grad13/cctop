#!/usr/bin/env python3
"""
CCTOP Dummy Data Generator
Creates realistic dummy data for testing CCTOP CLI functionality

FUNC-000 準拠のSQLite Database Schema:
- events, event_types, files, measurements, aggregates
"""

import sqlite3
import random
import time
import json
import os
import argparse
import signal
import sys
import threading
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional
from pathlib import Path


class CCTOPDummyDataGenerator:
    """Generates realistic dummy data for CCTOP database"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.conn: Optional[sqlite3.Connection] = None
        self.live_mode_running = False
        self.file_pool: List[Dict] = []  # Pool of existing files for live mode
        
        # Event type configurations
        self.event_types = [
            ('find', 'Find', 'Initial file discovery'),
            ('create', 'Create', 'File creation'),
            ('modify', 'Modify', 'File modification'),
            ('delete', 'Delete', 'File deletion'),
            ('move', 'Move', 'File move/rename'),
            ('restore', 'Restore', 'File restoration after deletion')
        ]
        
        # Realistic file patterns
        self.file_patterns = {
            'source_code': {
                'extensions': ['.js', '.ts', '.py', '.java', '.cpp', '.c', '.h'],
                'dirs': ['src', 'lib', 'utils', 'components', 'models', 'controllers'],
                'weight': 0.4
            },
            'documentation': {
                'extensions': ['.md', '.txt', '.rst', '.adoc'],
                'dirs': ['docs', 'README', 'notes', 'wiki'],
                'weight': 0.2
            },
            'config': {
                'extensions': ['.json', '.yaml', '.yml', '.toml', '.ini', '.cfg'],
                'dirs': ['config', 'settings', '.vscode', '.github'],
                'weight': 0.15
            },
            'web_assets': {
                'extensions': ['.html', '.css', '.scss', '.less'],
                'dirs': ['public', 'static', 'assets', 'styles'],
                'weight': 0.15
            },
            'data': {
                'extensions': ['.csv', '.json', '.xml', '.log'],
                'dirs': ['data', 'logs', 'temp', 'cache'],
                'weight': 0.1
            }
        }
        
        # Realistic file names
        self.base_names = [
            'index', 'main', 'app', 'config', 'utils', 'helper', 'component',
            'service', 'model', 'controller', 'router', 'middleware', 'auth',
            'database', 'schema', 'migration', 'test', 'spec', 'fixture',
            'readme', 'changelog', 'license', 'gitignore', 'package'
        ]
        
        # Activity patterns (time-based)
        self.activity_patterns = {
            'morning_rush': {'start_hour': 9, 'end_hour': 11, 'intensity': 0.8},
            'afternoon_work': {'start_hour': 13, 'end_hour': 17, 'intensity': 0.6},
            'evening_coding': {'start_hour': 19, 'end_hour': 22, 'intensity': 0.4},
            'weekend_light': {'intensity': 0.2}
        }
    
    def connect(self) -> None:
        """Connect to SQLite database"""
        try:
            self.conn = sqlite3.connect(self.db_path)
            self.conn.execute("PRAGMA foreign_keys = ON")
            print(f"✓ Connected to database: {self.db_path}")
        except sqlite3.Error as e:
            raise Exception(f"Failed to connect to database: {e}")
    
    def close(self) -> None:
        """Close database connection"""
        if self.conn:
            self.conn.close()
            print("✓ Database connection closed")
    
    def initialize_schema(self) -> None:
        """Initialize database schema according to FUNC-000"""
        if not self.conn:
            raise Exception("Database not connected")
        
        print("📊 Initializing database schema...")
        
        # Create tables in order (respecting foreign key constraints)
        tables_sql = [
            # 1. event_types table
            """
            CREATE TABLE IF NOT EXISTS event_types (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                description TEXT
            )
            """,
            
            # 2. files table
            """
            CREATE TABLE IF NOT EXISTS files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                inode INTEGER,
                is_active BOOLEAN DEFAULT TRUE
            )
            """,
            
            # 3. events table
            """
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER NOT NULL,
                event_type_id INTEGER NOT NULL,
                file_id INTEGER NOT NULL,
                file_path TEXT NOT NULL,
                file_name TEXT NOT NULL,
                directory TEXT NOT NULL,
                FOREIGN KEY (event_type_id) REFERENCES event_types(id),
                FOREIGN KEY (file_id) REFERENCES files(id)
            )
            """,
            
            # 4. measurements table
            """
            CREATE TABLE IF NOT EXISTS measurements (
                event_id INTEGER PRIMARY KEY,
                inode INTEGER,
                file_size INTEGER,
                line_count INTEGER,
                block_count INTEGER,
                FOREIGN KEY (event_id) REFERENCES events(id)
            )
            """,
            
            # 5. aggregates table
            """
            CREATE TABLE IF NOT EXISTS aggregates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_id INTEGER,
                period_start INTEGER,
                total_size INTEGER DEFAULT 0,
                total_lines INTEGER DEFAULT 0,
                total_blocks INTEGER DEFAULT 0,
                total_events INTEGER DEFAULT 0,
                total_creates INTEGER DEFAULT 0,
                total_modifies INTEGER DEFAULT 0,
                total_deletes INTEGER DEFAULT 0,
                total_moves INTEGER DEFAULT 0,
                total_restores INTEGER DEFAULT 0,
                first_event_timestamp INTEGER,
                last_event_timestamp INTEGER,
                first_size INTEGER,
                max_size INTEGER,
                last_size INTEGER,
                first_lines INTEGER,
                max_lines INTEGER,
                last_lines INTEGER,
                first_blocks INTEGER,
                max_blocks INTEGER,
                last_blocks INTEGER,
                last_updated INTEGER DEFAULT CURRENT_TIMESTAMP,
                calculation_method TEXT DEFAULT 'trigger',
                FOREIGN KEY (file_id) REFERENCES files(id)
            )
            """
        ]
        
        # Create tables
        for i, sql in enumerate(tables_sql, 1):
            self.conn.execute(sql)
            print(f"  {i}. Created table")
        
        # Create indexes
        indexes_sql = [
            "CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp)",
            "CREATE INDEX IF NOT EXISTS idx_events_file_path ON events(file_path)",
            "CREATE INDEX IF NOT EXISTS idx_events_file_id ON events(file_id)",
            "CREATE INDEX IF NOT EXISTS idx_events_file_timestamp ON events(file_id, timestamp)"
        ]
        
        for sql in indexes_sql:
            self.conn.execute(sql)
        
        print("  ✓ Created indexes")
        
        # Insert event types
        self.conn.executemany(
            "INSERT OR IGNORE INTO event_types (code, name, description) VALUES (?, ?, ?)",
            self.event_types
        )
        
        self.conn.commit()
        print("  ✓ Inserted event types")
        print("✓ Schema initialization completed")
    
    def generate_file_path(self, file_type: str) -> Tuple[str, str, str]:
        """Generate realistic file path, name, and directory"""
        pattern = self.file_patterns[file_type]
        
        # Choose directory and extension
        directory = random.choice(pattern['dirs'])
        extension = random.choice(pattern['extensions'])
        
        # Generate base name
        base_name = random.choice(self.base_names)
        
        # Add some variation
        if random.random() < 0.3:
            suffix = random.choice(['_test', '_spec', '_utils', '_helper', '_backup'])
            base_name += suffix
        
        if random.random() < 0.2:
            base_name += f"_{random.randint(1, 99)}"
        
        file_name = f"{base_name}{extension}"
        
        # Build full path
        if random.random() < 0.4:  # Add subdirectory
            subdirs = random.randint(1, 3)
            subdir_parts = [f"sub{i}" for i in range(subdirs)]
            directory = os.path.join(directory, *subdir_parts)
        
        file_path = os.path.join(directory, file_name)
        
        return file_path, file_name, directory
    
    def calculate_file_metrics(self, file_path: str, base_size: int = None) -> Dict[str, int]:
        """Calculate realistic file metrics based on file type"""
        ext = Path(file_path).suffix.lower()
        
        if base_size is None:
            if ext in ['.js', '.ts', '.py', '.java']:
                base_size = random.randint(500, 5000)
            elif ext in ['.md', '.txt']:
                base_size = random.randint(100, 2000)
            elif ext in ['.json', '.yaml']:
                base_size = random.randint(50, 1000)
            elif ext in ['.css', '.scss']:
                base_size = random.randint(200, 3000)
            else:
                base_size = random.randint(100, 1500)
        
        # Add some variation
        size_variation = int(base_size * random.uniform(0.8, 1.2))
        file_size = max(1, size_variation)
        
        # Calculate lines (rough estimate)
        if ext in ['.js', '.ts', '.py', '.java', '.cpp', '.c', '.h']:
            line_count = max(1, file_size // random.randint(30, 50))
        elif ext in ['.md', '.txt']:
            line_count = max(1, file_size // random.randint(40, 60))
        elif ext in ['.json', '.yaml']:
            line_count = max(1, file_size // random.randint(25, 35))
        elif ext in ['.css', '.scss']:
            line_count = max(1, file_size // random.randint(35, 45))
        else:
            line_count = max(1, file_size // random.randint(20, 80))
        
        # Calculate blocks (simplified)
        block_count = max(1, (file_size + 511) // 512)  # 512 bytes per block
        
        return {
            'file_size': file_size,
            'line_count': line_count,
            'block_count': block_count
        }
    
    def get_activity_intensity(self, timestamp: datetime) -> float:
        """Get activity intensity based on time patterns"""
        hour = timestamp.hour
        is_weekend = timestamp.weekday() >= 5
        
        if is_weekend:
            return self.activity_patterns['weekend_light']['intensity']
        
        for pattern_name, pattern in self.activity_patterns.items():
            if pattern_name != 'weekend_light':
                if pattern['start_hour'] <= hour <= pattern['end_hour']:
                    return pattern['intensity']
        
        return 0.1  # Low activity during other hours
    
    def generate_events(self, num_files: int = 100, days_back: int = 30, events_per_file: int = 10) -> None:
        """Generate realistic event data"""
        if not self.conn:
            raise Exception("Database not connected")
        
        print(f"🎲 Generating events for {num_files} files over {days_back} days...")
        
        # Get event type IDs
        event_type_ids = {}
        for row in self.conn.execute("SELECT id, code FROM event_types"):
            event_type_ids[row[1]] = row[0]
        
        # Generate time range
        end_time = datetime.now()
        start_time = end_time - timedelta(days=days_back)
        
        file_id_counter = 1
        event_id_counter = 1
        
        for file_num in range(num_files):
            # Choose file type based on weights
            file_type = random.choices(
                list(self.file_patterns.keys()),
                weights=[p['weight'] for p in self.file_patterns.values()]
            )[0]
            
            # Generate file path
            file_path, file_name, directory = self.generate_file_path(file_type)
            
            # Create file record
            inode = random.randint(100000, 999999)
            self.conn.execute(
                "INSERT INTO files (id, inode, is_active) VALUES (?, ?, ?)",
                (file_id_counter, inode, True)
            )
            
            # Generate events for this file
            file_events = []
            current_metrics = None
            
            # Always start with 'find' or 'create'
            first_event_type = random.choice(['find', 'create'])
            
            for event_num in range(events_per_file):
                # Generate timestamp
                if event_num == 0:
                    # First event - anywhere in the time range
                    event_time = start_time + timedelta(
                        seconds=random.randint(0, int((end_time - start_time).total_seconds()))
                    )
                else:
                    # Subsequent events - after previous event
                    time_gap = random.randint(60, 86400 * 3)  # 1 minute to 3 days
                    prev_event_time = file_events[-1]['timestamp_dt']
                    event_time = prev_event_time + timedelta(seconds=time_gap)
                    if event_time > end_time:
                        break
                
                # Choose event type
                if event_num == 0:
                    event_type = first_event_type
                else:
                    # Weight the probabilities based on activity
                    intensity = self.get_activity_intensity(event_time)
                    if intensity > 0.6:
                        # High activity - more modifications
                        event_type = random.choices(
                            ['modify', 'create', 'move', 'delete'],
                            weights=[0.7, 0.1, 0.1, 0.1]
                        )[0]
                    elif intensity > 0.3:
                        # Medium activity
                        event_type = random.choices(
                            ['modify', 'create', 'move', 'delete'],
                            weights=[0.5, 0.2, 0.2, 0.1]
                        )[0]
                    else:
                        # Low activity
                        event_type = random.choices(
                            ['modify', 'find', 'create'],
                            weights=[0.4, 0.4, 0.2]
                        )[0]
                
                # Calculate metrics
                if event_type in ['create', 'find']:
                    current_metrics = self.calculate_file_metrics(file_path)
                elif event_type == 'modify':
                    if current_metrics:
                        # Modify existing metrics
                        size_change = random.randint(-100, 500)
                        current_metrics['file_size'] = max(1, current_metrics['file_size'] + size_change)
                        current_metrics = self.calculate_file_metrics(file_path, current_metrics['file_size'])
                    else:
                        current_metrics = self.calculate_file_metrics(file_path)
                elif event_type == 'delete':
                    # Keep last known metrics
                    pass
                elif event_type == 'move':
                    # Generate new path but keep metrics
                    new_path, new_name, new_dir = self.generate_file_path(file_type)
                    file_path, file_name, directory = new_path, new_name, new_dir
                elif event_type == 'restore':
                    if not current_metrics:
                        current_metrics = self.calculate_file_metrics(file_path)
                
                # Store event
                timestamp_unix = int(event_time.timestamp())
                event_data = {
                    'id': event_id_counter,
                    'timestamp': timestamp_unix,
                    'timestamp_dt': event_time,  # Keep datetime for next iteration
                    'event_type_id': event_type_ids[event_type],
                    'file_id': file_id_counter,
                    'file_path': file_path,
                    'file_name': file_name,
                    'directory': directory,
                    'metrics': current_metrics.copy() if current_metrics else None
                }
                
                file_events.append(event_data)
                event_id_counter += 1
            
            # Insert events into database
            for event in file_events:
                self.conn.execute("""
                    INSERT INTO events (id, timestamp, event_type_id, file_id, file_path, file_name, directory)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    event['id'], event['timestamp'], event['event_type_id'], 
                    event['file_id'], event['file_path'], event['file_name'], event['directory']
                ))
                
                # Insert measurements if available
                if event['metrics']:
                    self.conn.execute("""
                        INSERT INTO measurements (event_id, inode, file_size, line_count, block_count)
                        VALUES (?, ?, ?, ?, ?)
                    """, (
                        event['id'], inode, event['metrics']['file_size'],
                        event['metrics']['line_count'], event['metrics']['block_count']
                    ))
            
            file_id_counter += 1
            
            # Progress indicator
            if (file_num + 1) % 10 == 0:
                print(f"  Generated data for {file_num + 1}/{num_files} files")
        
        self.conn.commit()
        print(f"✓ Generated {event_id_counter - 1} events for {num_files} files")
    
    def generate_statistics(self) -> Dict[str, any]:
        """Generate summary statistics"""
        if not self.conn:
            raise Exception("Database not connected")
        
        stats = {}
        
        # Count records
        for table in ['events', 'files', 'measurements', 'event_types']:
            count = self.conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            stats[f'{table}_count'] = count
        
        # Event type distribution
        event_dist = self.conn.execute("""
            SELECT et.code, COUNT(*) as count
            FROM events e
            JOIN event_types et ON e.event_type_id = et.id
            GROUP BY et.code
            ORDER BY count DESC
        """).fetchall()
        stats['event_distribution'] = dict(event_dist)
        
        # Time range
        time_range = self.conn.execute("""
            SELECT MIN(timestamp) as min_time, MAX(timestamp) as max_time
            FROM events
        """).fetchone()
        
        if time_range[0]:
            stats['time_range'] = {
                'start': datetime.fromtimestamp(time_range[0]).isoformat(),
                'end': datetime.fromtimestamp(time_range[1]).isoformat()
            }
        
        # File metrics
        file_metrics = self.conn.execute("""
            SELECT 
                COUNT(DISTINCT file_path) as unique_files,
                AVG(file_size) as avg_size,
                MAX(file_size) as max_size,
                AVG(line_count) as avg_lines,
                MAX(line_count) as max_lines
            FROM measurements m
            JOIN events e ON m.event_id = e.id
        """).fetchone()
        
        if file_metrics[0]:
            stats['file_metrics'] = {
                'unique_files': file_metrics[0],
                'avg_size': round(file_metrics[1], 2) if file_metrics[1] else 0,
                'max_size': file_metrics[2] or 0,
                'avg_lines': round(file_metrics[3], 2) if file_metrics[3] else 0,
                'max_lines': file_metrics[4] or 0
            }
        
        return stats
    
    def start_live_mode(self, interval: float = 2.0) -> None:
        """Start live mode - continuously generate events until stopped"""
        if not self.conn:
            raise Exception("Database not connected")
        
        print(f"\n🔴 LIVE MODE STARTED")
        print(f"Generating events every ~{interval:.1f} seconds")
        print("Press 'q' + Enter or Ctrl+C to stop\n")
        
        # Setup signal handlers
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        
        # Load existing files for live mode
        self._load_file_pool()
        
        self.live_mode_running = True
        
        # Start keyboard input thread
        keyboard_thread = threading.Thread(target=self._keyboard_monitor, daemon=True)
        keyboard_thread.start()
        
        event_counter = 1
        
        try:
            while self.live_mode_running:
                # Generate random interval (exponential distribution for realism)
                sleep_time = random.expovariate(1.0 / interval)
                sleep_time = max(0.5, min(sleep_time, interval * 3))  # Clamp between 0.5s and 3x interval
                
                time.sleep(sleep_time)
                
                if not self.live_mode_running:
                    break
                
                # Generate and insert live event
                try:
                    event_data = self._generate_live_event(event_counter)
                    self._insert_live_event(event_data)
                    
                    # Display event
                    timestamp = datetime.now().strftime("%H:%M:%S")
                    file_path = event_data['file_path']
                    event_type = event_data['event_type']
                    size = f"{event_data['metrics']['file_size']}B" if event_data['metrics'] else "N/A"
                    
                    print(f"[{timestamp}] #{event_counter:03d} {event_type:6} {file_path:30} ({size})")
                    
                    event_counter += 1
                    
                except Exception as e:
                    print(f"❌ Error generating live event: {e}")
                    continue
                    
        except KeyboardInterrupt:
            pass
        finally:
            self._stop_live_mode()
    
    def _signal_handler(self, signum, frame):
        """Handle interrupt signals"""
        self.live_mode_running = False
    
    def _keyboard_monitor(self):
        """Monitor for 'q' key press"""
        try:
            while self.live_mode_running:
                try:
                    user_input = input().strip().lower()
                    if user_input in ['q', 'quit', 'exit']:
                        self.live_mode_running = False
                        break
                except (EOFError, KeyboardInterrupt):
                    break
        except:
            pass
    
    def _load_file_pool(self):
        """Load existing files from database for live mode"""
        try:
            rows = self.conn.execute("""
                SELECT DISTINCT e.file_path, e.file_name, e.directory, f.id as file_id
                FROM events e
                JOIN files f ON e.file_id = f.id
                WHERE f.is_active = 1
                ORDER BY e.timestamp DESC
                LIMIT 100
            """).fetchall()
            
            self.file_pool = []
            for row in rows:
                self.file_pool.append({
                    'file_path': row[0],
                    'file_name': row[1], 
                    'directory': row[2],
                    'file_id': row[3]
                })
            
            if not self.file_pool:
                # Create some initial files if none exist
                print("No existing files found, creating initial file pool...")
                for i in range(10):
                    file_type = random.choice(list(self.file_patterns.keys()))
                    file_path, file_name, directory = self.generate_file_path(file_type)
                    
                    # Create file record
                    file_id = self._get_next_file_id()
                    inode = random.randint(100000, 999999)
                    self.conn.execute(
                        "INSERT INTO files (id, inode, is_active) VALUES (?, ?, ?)",
                        (file_id, inode, True)
                    )
                    
                    self.file_pool.append({
                        'file_path': file_path,
                        'file_name': file_name,
                        'directory': directory,
                        'file_id': file_id
                    })
                
                self.conn.commit()
                
        except Exception as e:
            print(f"Warning: Could not load file pool: {e}")
            self.file_pool = []
    
    def _generate_live_event(self, event_number: int) -> Dict:
        """Generate a single live event"""
        # Get event type IDs
        event_type_ids = {}
        for row in self.conn.execute("SELECT id, code FROM event_types"):
            event_type_ids[row[1]] = row[0]
        
        # Choose event type with realistic probabilities
        current_hour = datetime.now().hour
        intensity = self.get_activity_intensity(datetime.now())
        
        if intensity > 0.6:
            # High activity - more modifications
            event_type = random.choices(
                ['modify', 'create', 'find', 'move'],
                weights=[0.5, 0.2, 0.2, 0.1]
            )[0]
        elif intensity > 0.3:
            # Medium activity
            event_type = random.choices(
                ['modify', 'find', 'create', 'delete'],
                weights=[0.4, 0.3, 0.2, 0.1]
            )[0]
        else:
            # Low activity
            event_type = random.choices(
                ['find', 'modify', 'create'],
                weights=[0.5, 0.3, 0.2]
            )[0]
        
        # Choose file (existing or new)
        if event_type == 'create' or (not self.file_pool and random.random() < 0.3):
            # Create new file
            file_type = random.choice(list(self.file_patterns.keys()))
            file_path, file_name, directory = self.generate_file_path(file_type)
            file_id = self._get_next_file_id()
            
            # Add to database
            inode = random.randint(100000, 999999)
            self.conn.execute(
                "INSERT INTO files (id, inode, is_active) VALUES (?, ?, ?)",
                (file_id, inode, True)
            )
            
            # Add to pool
            file_info = {
                'file_path': file_path,
                'file_name': file_name,
                'directory': directory,
                'file_id': file_id
            }
            self.file_pool.append(file_info)
            
        else:
            # Use existing file
            if self.file_pool:
                file_info = random.choice(self.file_pool)
                file_path = file_info['file_path']
                file_name = file_info['file_name']
                directory = file_info['directory']
                file_id = file_info['file_id']
            else:
                # Fallback: create new file
                file_type = random.choice(list(self.file_patterns.keys()))
                file_path, file_name, directory = self.generate_file_path(file_type)
                file_id = self._get_next_file_id()
        
        # Handle special event types
        if event_type == 'move' and self.file_pool:
            # Generate new path for move
            file_type = random.choice(list(self.file_patterns.keys()))
            new_path, new_name, new_dir = self.generate_file_path(file_type)
            file_path = f"{file_path} → {new_path}"
            file_name = new_name
            directory = new_dir
        
        # Calculate metrics
        current_metrics = self.calculate_file_metrics(file_path.split(' → ')[0] if ' → ' in file_path else file_path)
        
        return {
            'timestamp': int(datetime.now().timestamp()),
            'event_type': event_type,
            'event_type_id': event_type_ids[event_type],
            'file_id': file_id,
            'file_path': file_path,
            'file_name': file_name,
            'directory': directory,
            'metrics': current_metrics
        }
    
    def _insert_live_event(self, event_data: Dict):
        """Insert a live event into the database"""
        event_id = self._get_next_event_id()
        
        # Insert event
        self.conn.execute("""
            INSERT INTO events (id, timestamp, event_type_id, file_id, file_path, file_name, directory)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            event_id, event_data['timestamp'], event_data['event_type_id'],
            event_data['file_id'], event_data['file_path'], 
            event_data['file_name'], event_data['directory']
        ))
        
        # Insert measurements
        if event_data['metrics']:
            # Get inode for this file
            inode_row = self.conn.execute(
                "SELECT inode FROM files WHERE id = ?", 
                (event_data['file_id'],)
            ).fetchone()
            inode = inode_row[0] if inode_row else random.randint(100000, 999999)
            
            self.conn.execute("""
                INSERT INTO measurements (event_id, inode, file_size, line_count, block_count)
                VALUES (?, ?, ?, ?, ?)
            """, (
                event_id, inode, event_data['metrics']['file_size'],
                event_data['metrics']['line_count'], event_data['metrics']['block_count']
            ))
        
        self.conn.commit()
    
    def _get_next_event_id(self) -> int:
        """Get next available event ID"""
        row = self.conn.execute("SELECT MAX(id) FROM events").fetchone()
        return (row[0] or 0) + 1
    
    def _get_next_file_id(self) -> int:
        """Get next available file ID"""
        row = self.conn.execute("SELECT MAX(id) FROM files").fetchone()
        return (row[0] or 0) + 1
    
    def _stop_live_mode(self):
        """Stop live mode gracefully"""
        self.live_mode_running = False
        print(f"\n🔴 LIVE MODE STOPPED")
        print("✓ All events have been saved to the database")
    
    def export_sample_data(self, output_file: str, limit: int = 50) -> None:
        """Export sample data for inspection"""
        if not self.conn:
            raise Exception("Database not connected")
        
        print(f"📤 Exporting sample data to {output_file}...")
        
        sample_data = {}
        
        # Sample events with details
        events = self.conn.execute("""
            SELECT 
                e.id, 
                datetime(e.timestamp, 'unixepoch') as timestamp,
                et.code as event_type,
                e.file_path,
                m.file_size,
                m.line_count
            FROM events e
            JOIN event_types et ON e.event_type_id = et.id
            LEFT JOIN measurements m ON e.id = m.event_id
            ORDER BY e.timestamp DESC
            LIMIT ?
        """, (limit,)).fetchall()
        
        sample_data['recent_events'] = [
            {
                'id': row[0],
                'timestamp': row[1],
                'event_type': row[2],
                'file_path': row[3],
                'file_size': row[4],
                'line_count': row[5]
            }
            for row in events
        ]
        
        # Statistics
        sample_data['statistics'] = self.generate_statistics()
        
        # Write to file
        with open(output_file, 'w') as f:
            json.dump(sample_data, f, indent=2, default=str)
        
        print(f"✓ Sample data exported to {output_file}")


def main():
    parser = argparse.ArgumentParser(description='Generate dummy data for CCTOP database')
    parser.add_argument('--db-path', default='./.cctop/data/activity.db',
                        help='Path to SQLite database file')
    parser.add_argument('--files', type=int, default=100,
                        help='Number of files to simulate')
    parser.add_argument('--days', type=int, default=30,
                        help='Number of days of history to generate')
    parser.add_argument('--events-per-file', type=int, default=10,
                        help='Average events per file')
    parser.add_argument('--export-sample', 
                        help='Export sample data to JSON file')
    parser.add_argument('--stats-only', action='store_true',
                        help='Only generate and display statistics')
    parser.add_argument('--live-mode', action='store_true',
                        help='Continue generating events in real-time (press q/Ctrl+C to stop)')
    parser.add_argument('--live-interval', type=float, default=2.0,
                        help='Average seconds between live events (default: 2.0)')
    
    args = parser.parse_args()
    
    # Ensure FUNC-105 directory structure exists
    db_dir = os.path.dirname(os.path.abspath(args.db_path))
    
    # Create FUNC-105 compliant .cctop structure
    cctop_root = os.path.dirname(db_dir)  # .cctop
    cctop_dirs = ['config', 'themes', 'themes/custom', 'data', 'logs', 'runtime', 'temp']
    
    for dir_name in cctop_dirs:
        dir_path = os.path.join(cctop_root, dir_name)
        os.makedirs(dir_path, exist_ok=True)
    
    print(f"✓ Created FUNC-105 directory structure: {cctop_root}")
    os.makedirs(db_dir, exist_ok=True)
    
    print("🚀 CCTOP Dummy Data Generator")
    print(f"Database: {args.db_path}")
    print(f"Files: {args.files}, Days: {args.days}, Events/file: {args.events_per_file}")
    print()
    
    generator = CCTOPDummyDataGenerator(args.db_path)
    
    try:
        generator.connect()
        
        if not args.stats_only:
            generator.initialize_schema()
            if not args.live_mode:
                generator.generate_events(
                    num_files=args.files,
                    days_back=args.days,
                    events_per_file=args.events_per_file
                )
        
        # Generate and display statistics
        print("\n📊 Database Statistics:")
        stats = generator.generate_statistics()
        for key, value in stats.items():
            if isinstance(value, dict):
                print(f"  {key}:")
                for sub_key, sub_value in value.items():
                    print(f"    {sub_key}: {sub_value}")
            else:
                print(f"  {key}: {value}")
        
        # Export sample if requested
        if args.export_sample:
            generator.export_sample_data(args.export_sample)
        
        # Start live mode if requested
        if args.live_mode:
            generator.start_live_mode(args.live_interval)
        else:
            print("\n✅ Dummy data generation completed!")
            print(f"💡 To start live mode: python3 {sys.argv[0]} --live-mode")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return 1
    
    finally:
        generator.close()
    
    return 0


if __name__ == "__main__":
    exit(main())