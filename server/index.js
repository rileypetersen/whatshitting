import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Serve favicon
app.use('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/public/favicon.ico'));
});

// Serve images with proper error handling
app.use('/images', (req, res, next) => {
  // In development mode, always serve a placeholder image
  if (process.env.NODE_ENV === 'development') {
    res.redirect(302, 'https://placehold.co/142x190/e0e0e0/666666?text=x&exact=1');
    return;
  }
  
  // In production, serve actual images with caching
  express.static(path.join(__dirname, '../images'), {
    fallthrough: false,
    maxAge: '1d',
    etag: true,
    lastModified: true
  })(req, res, next);
});

// Serve static files from the React app with proper error handling
app.use(express.static(path.join(__dirname, '../client/build'), {
  maxAge: '1d',
  index: false // Let React router handle the root route
}));

// Handle React routing, return all requests to React app
app.get('*', (req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, '../client/build/index.html'), err => {
      if (err) {
        next(err);
      }
    });
  } else {
    next();
  }
});

// Add a route handler for the root path
app.get('/', (req, res) => {
  res.send('Server is running. API endpoints available at /api/games and /api/providers');
});

// API route to get games data with pagination and filtering
app.get('/api/games', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 60;
  const providers = req.query.provider || 'All';
  const sort = req.query.sort || 'random';
  const ids = req.query.ids; // New parameter for favorite IDs
  const search = req.query.search || ''; // New parameter for search
  const collectionId = req.query.collection || null; // New parameter for collection filtering

  console.log('API Request - /api/games');
  console.log('Search param:', search, 'Type:', typeof search);
  console.log('Provider param:', providers);
  console.log('Sort param:', sort);
  console.log('Collection param:', collectionId);

  // Parse providers if it's an array format in query string
  let providersArray = providers;
  if (providers && providers !== 'All' && typeof providers === 'string' && providers.includes(',')) {
    providersArray = providers.split(',');
    console.log('Parsed providers into array:', providersArray);
  }

  // If IDs are provided (for favorites), prioritize fetching by IDs
  if (ids) {
    db.getGamesByIds(ids.split(','), (err, result) => {
      if (err) {
        console.error('Error getting games by IDs:', err);
        return res.status(500).json({ error: 'Failed to fetch games by IDs' });
      }
      res.json({ games: result, metadata: { total: result.length } });
    });
  } else {
    // Normal flow - get games with pagination and filtering
    db.getGames(page, limit, providersArray, sort, search, collectionId, (err, result) => {
      if (err) {
        console.error('Error getting games:', err);
        return res.status(500).json({ error: 'Failed to fetch games from database' });
      }
      res.json(result);
    });
  }
});

// API route to get unique providers
app.get('/api/providers', (req, res) => {
  try {
    db.getProviders((err, result) => {
      if (err) {
        console.error('Database error fetching providers:', err);
        return res.status(500).json({ error: 'Failed to fetch providers' });
      }
      
      res.json(result);
    });
  } catch (error) {
    console.error('Error fetching providers:', error);
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
});

// API routes for collections

// Get all collections
app.get('/api/collections', (req, res) => {
  db.getCollections((err, result) => {
    if (err) {
      console.error('Error getting collections:', err);
      return res.status(500).json({ error: 'Failed to fetch collections' });
    }
    res.json(result);
  });
});

// Create a new collection
app.post('/api/collections', (req, res) => {
  const { name, description } = req.body;
  
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Collection name is required' });
  }
  
  db.createCollection(name, description || '', (err, result) => {
    if (err) {
      console.error('Error creating collection:', err);
      return res.status(500).json({ error: 'Failed to create collection' });
    }
    res.status(201).json(result);
  });
});

// Update a collection
app.put('/api/collections/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { name, description } = req.body;
  
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Collection name is required' });
  }
  
  db.updateCollection(id, name, description || '', (err, result) => {
    if (err) {
      console.error('Error updating collection:', err);
      return res.status(500).json({ error: 'Failed to update collection' });
    }
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    
    res.json(result);
  });
});

// Delete a collection
app.delete('/api/collections/:id', (req, res) => {
  const id = parseInt(req.params.id);
  
  db.deleteCollection(id, (err, result) => {
    if (err) {
      console.error('Error deleting collection:', err);
      return res.status(500).json({ error: 'Failed to delete collection' });
    }
    
    if (!result.deleted) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    
    res.json(result);
  });
});

// Get games in a collection
app.get('/api/collections/:id/games', (req, res) => {
  const id = parseInt(req.params.id);
  
  db.getCollectionGames(id, (err, result) => {
    if (err) {
      console.error('Error getting collection games:', err);
      return res.status(500).json({ error: 'Failed to fetch games in collection' });
    }
    res.json({ games: result });
  });
});

// Add a game to a collection
app.post('/api/collections/:id/games', (req, res) => {
  const collectionId = parseInt(req.params.id);
  const { gameId } = req.body;
  
  if (!gameId) {
    return res.status(400).json({ error: 'Game ID is required' });
  }
  
  db.addGameToCollection(collectionId, gameId, (err, result) => {
    if (err) {
      console.error('Error adding game to collection:', err);
      return res.status(500).json({ error: 'Failed to add game to collection' });
    }
    res.status(201).json(result);
  });
});

// Remove a game from a collection
app.delete('/api/collections/:collectionId/games/:gameId', (req, res) => {
  const collectionId = parseInt(req.params.collectionId);
  const gameId = parseInt(req.params.gameId);
  
  db.removeGameFromCollection(collectionId, gameId, (err, result) => {
    if (err) {
      console.error('Error removing game from collection:', err);
      return res.status(500).json({ error: 'Failed to remove game from collection' });
    }
    res.json(result);
  });
});

// Check if a game is in a collection
app.get('/api/collections/:collectionId/games/:gameId', (req, res) => {
  const collectionId = parseInt(req.params.collectionId);
  const gameId = parseInt(req.params.gameId);
  
  db.isGameInCollection(collectionId, gameId, (err, result) => {
    if (err) {
      console.error('Error checking game in collection:', err);
      return res.status(500).json({ error: 'Failed to check if game is in collection' });
    }
    res.json({ inCollection: result });
  });
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Closing database connection...');
  db.close(() => {
    console.log('Server shutting down');
    process.exit(0);
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 