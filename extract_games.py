#!/usr/bin/env python3
import re
import csv
import os
import urllib.request
import urllib.parse
import time
import json
import sys
from typing import Set, Dict, List

def read_existing_games(csv_file: str) -> Set[str]:
    """Read existing games from CSV file and return their URLs"""
    existing_games = set()
    if os.path.exists(csv_file):
        with open(csv_file, 'r', newline='', encoding='utf-8') as csvfile:
            csv_reader = csv.DictReader(csvfile)
            for row in csv_reader:
                existing_games.add(row['URL'])
    return existing_games

def extract_game_info(html_file: str, csv_file: str, limit: int = 0, incremental: bool = True):
    # Create images directory if it doesn't exist
    images_dir = "images"
    if not os.path.exists(images_dir):
        os.makedirs(images_dir)
    
    # Read existing games if doing incremental update
    existing_games = read_existing_games(csv_file) if incremental else set()
    
    # Read the HTML file
    with open(html_file, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # Find all game links
    link_pattern = r'<a class="link svelte-1tn6kqn"[^>]*href="([^"]+)"[^>]*>'
    game_links = re.findall(link_pattern, html_content)
    
    # Filter out existing games if doing incremental update
    if incremental:
        new_game_links = []
        for link in game_links:
            url = link if not link.startswith('/') else 'https://stake.us' + link
            if url not in existing_games:
                new_game_links.append(link)
        game_links = new_game_links
        print(f"Found {len(game_links)} new games to process")
    
    # Limit the number of games if specified
    if limit > 0:
        game_links = game_links[:limit]
    
    # Track progress
    total_games = len(game_links)
    if total_games == 0:
        print("No new games to process")
        return
    
    print(f"Processing {total_games} games. Starting extraction and download...")
    
    # Open CSV file in append mode if incremental, write mode if not
    mode = 'a' if incremental else 'w'
    with open(csv_file, mode, newline='', encoding='utf-8') as csvfile:
        csv_writer = csv.writer(csvfile)
        # Write header only if not incremental
        if not incremental:
            csv_writer.writerow(['URL', 'Title', 'Provider', 'Image_Path'])
        
        for index, link in enumerate(game_links):
            # Make URL absolute
            url = link if not link.startswith('/') else 'https://stake.us' + link
            
            # Skip if game already exists (double-check)
            if incremental and url in existing_games:
                continue
            
            # Extract game info from the link itself
            game_id = link.split('/')[-1]
            title = game_id.split('-')[-1].title()
            provider = 'Stake Originals'
            
            # Create image path
            image_filename = f"{game_id}.jpg"
            local_image_path = os.path.join(images_dir, image_filename)
            
            # Write to CSV
            csv_writer.writerow([url, title, provider, local_image_path])
            print(f"Added game {index+1}/{total_games}: {title}")
    
    print(f"Extraction complete. Data saved to {csv_file}")

def csv_to_json(csv_file: str, json_file: str):
    """Convert CSV file to JSON for easier web application development"""
    data = []
    with open(csv_file, 'r', encoding='utf-8') as f:
        csv_reader = csv.DictReader(f)
        for row in csv_reader:
            data.append(row)
    
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4)
    
    print(f"Converted CSV to JSON: {json_file}")

if __name__ == "__main__":
    # Get input and output files from command line arguments
    html_file = sys.argv[1] if len(sys.argv) > 1 else 'games.html'
    csv_file = sys.argv[2] if len(sys.argv) > 2 else 'games.csv'
    
    # Process all games by setting limit=0, use incremental mode by default
    extract_game_info(html_file, csv_file, limit=0, incremental=True)
    
    # Convert CSV to JSON for web application
    csv_to_json(csv_file, 'games.json') 