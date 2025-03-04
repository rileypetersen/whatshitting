# What's Hitting

A web application that displays a collection of games with images, allowing users to click on them to navigate to the respective game URLs.

## Project Structure

- `extract_games.py`: Python script for extracting game information from HTML and saving it to CSV and JSON
- `server/`: Node.js backend server
- `client/`: React frontend application
- `images/`: Directory containing game images

## Setup and Running

### Prerequisites

- Node.js and npm
- Python 3.x for running the extraction script

### Data Extraction

1. Run the extraction script to get game data and images:
```
python3 extract_games.py
```

This script:
- Extracts game URLs, titles, and provider names from `games.html`
- Downloads game images to the `images/` directory
- Saves game information to `games.csv` and `games.json`

### Starting the Application

1. Install dependencies:
```
npm install
cd client && npm install
cd ../server && npm install
```

2. Run the application (both backend and frontend):
```
npm run dev
```

This starts:
- Backend server on http://localhost:5000
- Frontend React app on http://localhost:3000

## Features

- Display games in a responsive grid layout
- Click on game cards to navigate to the respective game URLs
- Responsive design for various screen sizes

## Future Enhancements

- User authentication
- Favorites/bookmarks
- Filtering and sorting
- Search functionality 