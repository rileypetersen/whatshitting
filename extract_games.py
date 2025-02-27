#!/usr/bin/env python3
import re
import csv
import os
import urllib.request
import urllib.parse
import time
import json

def extract_game_info(html_file, csv_file, limit=0):
    # Create images directory if it doesn't exist
    images_dir = "images"
    if not os.path.exists(images_dir):
        os.makedirs(images_dir)
    
    # Read the HTML file
    with open(html_file, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # Prepare CSV file
    with open(csv_file, 'w', newline='', encoding='utf-8') as csvfile:
        csv_writer = csv.writer(csvfile)
        # Write header with image path column
        csv_writer.writerow(['URL', 'Title', 'Provider', 'Image_Path'])
        
        # Find all game links
        link_pattern = r'<a class="link svelte-1tn6kqn"[^>]*href="([^"]+)"[^>]*>'
        game_links = re.findall(link_pattern, html_content)
        
        # Limit the number of games if specified
        if limit > 0:
            game_links = game_links[:limit]
        
        # Track progress
        total_games = len(game_links)
        print(f"Processing {total_games} games. Starting extraction and download...")
        
        for index, link in enumerate(game_links):
            # Extract the section containing this game
            link_escaped = re.escape(link)
            game_section_pattern = f'<a class="link svelte-1tn6kqn"[^>]*href="{link_escaped}"[^>]*>(.*?)</a>'
            game_sections = re.findall(game_section_pattern, html_content, re.DOTALL)
            
            if game_sections:
                game_section = game_sections[0]
                
                # Extract game title
                title_pattern = r'<strong class="gameName svelte-1gmhd6w">([^<]+)</strong>'
                title_match = re.search(title_pattern, game_section)
                title = title_match.group(1) if title_match else 'Unknown'
                
                # Extract provider name
                provider_pattern = r'<div class="game-info-wrap game-group svelte-1xxazmb"><strong>([^<]+)</strong>'
                provider_match = re.search(provider_pattern, game_section)
                provider = provider_match.group(1) if provider_match else 'Unknown'
                
                # Make URL absolute with stake.us domain
                url = link
                if url.startswith('/'):
                    url = 'https://stake.us' + url
                
                # Extract image URL
                img_pattern = r'<img[^>]*src="([^"]+)"[^>]*alt="' + re.escape(title) + r'"'
                img_match = re.search(img_pattern, game_section)
                image_path = "No_Image"
                
                if img_match:
                    img_url = img_match.group(1)
                    
                    # Create a safe filename from the game URL
                    game_id = link.split('/')[-1]
                    image_filename = f"{game_id}.jpg"
                    local_image_path = os.path.join(images_dir, image_filename)
                    
                    # Download the image
                    try:
                        # Show progress
                        if index % 10 == 0:
                            print(f"Downloading image {index+1}/{total_games}: {title}")
                        
                        # Add a small delay to avoid overwhelming the server
                        if index > 0 and index % 5 == 0:
                            time.sleep(0.5)
                            
                        # Download the image
                        urllib.request.urlretrieve(img_url, local_image_path)
                        image_path = local_image_path
                    except Exception as e:
                        print(f"Error downloading image for {title}: {e}")
                
                # Write to CSV
                csv_writer.writerow([url, title, provider, image_path])
    
    print(f"Extraction complete. Data saved to {csv_file} and images downloaded to {images_dir}/")

def csv_to_json(csv_file, json_file):
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
    # Set limit=0 to process all games, or a positive number to limit the count
    extract_game_info('games.html', 'games.csv', limit=0)  # Process all games
    
    # Convert CSV to JSON for web application
    csv_to_json('games.csv', 'games.json') 