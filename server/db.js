const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Database file path
const DB_PATH = path.join(__dirname, '../database.sqlite');

// Initialize database connection
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database');
    createTables();
  }
});

// Create the database tables if they don't exist
function createTables() {
  db.serialize(() => {
    // Create games table
    db.run(`
      CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        provider TEXT NOT NULL,
        image_path TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating games table:', err.message);
      } else {
        console.log('Games table ready');
        
        // Check if data needs to be imported
        checkAndImportData();
      }
    });
    
    // Create providers table for efficient provider filtering
    db.run(`
      CREATE TABLE IF NOT EXISTS providers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      )
    `, (err) => {
      if (err) {
        console.error('Error creating providers table:', err.message);
      } else {
        console.log('Providers table ready');
      }
    });
    
    // Create collections table
    db.run(`
      CREATE TABLE IF NOT EXISTS collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating collections table:', err.message);
      } else {
        console.log('Collections table ready');
      }
    });
    
    // Create collection_games junction table for many-to-many relationship
    db.run(`
      CREATE TABLE IF NOT EXISTS collection_games (
        collection_id INTEGER NOT NULL,
        game_id INTEGER NOT NULL,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (collection_id, game_id),
        FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) {
        console.error('Error creating collection_games table:', err.message);
      } else {
        console.log('Collection_games table ready');
      }
    });
  });
}

// Check if data is already imported and import if needed
function checkAndImportData() {
  db.get('SELECT COUNT(*) as count FROM games', (err, row) => {
    if (err) {
      console.error('Error checking game count:', err.message);
      return;
    }
    
    // If no games in database, import from JSON
    if (row.count === 0) {
      importGamesFromJson();
    } else {
      console.log(`Database already contains ${row.count} games. Skipping import.`);
    }
  });
}

// Import game data from the existing JSON file
function importGamesFromJson() {
  try {
    const jsonPath = path.join(__dirname, '../games.json');
    const gamesData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    console.log(`Starting import of ${gamesData.length} games into SQLite database...`);
    
    // Begin transaction for faster bulk insert
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      const insertGame = db.prepare(`
        INSERT INTO games (url, title, provider, image_path)
        VALUES (?, ?, ?, ?)
      `);
      
      const providers = new Set();
      
      gamesData.forEach((game, index) => {
        insertGame.run(
          game.URL,
          game.Title,
          game.Provider,
          game.Image_Path
        );
        
        // Collect unique providers
        providers.add(game.Provider);
        
        // Log progress
        if (index % 100 === 0) {
          console.log(`Imported ${index} games...`);
        }
      });
      
      insertGame.finalize();
      
      // Insert unique providers
      const insertProvider = db.prepare('INSERT OR IGNORE INTO providers (name) VALUES (?)');
      providers.forEach(provider => {
        insertProvider.run(provider);
      });
      insertProvider.finalize();
      
      db.run('COMMIT', (err) => {
        if (err) {
          console.error('Error committing transaction:', err.message);
        } else {
          console.log(`Successfully imported ${gamesData.length} games and ${providers.size} providers into SQLite database`);
          
          // Create indexes after import for better performance
          createIndexes();
        }
      });
    });
  } catch (error) {
    console.error('Error importing games from JSON:', error);
    db.run('ROLLBACK');
  }
}

// Create indexes for better query performance
function createIndexes() {
  db.serialize(() => {
    db.run('CREATE INDEX IF NOT EXISTS idx_games_provider ON games(provider)', (err) => {
      if (err) {
        console.error('Error creating provider index:', err.message);
      } else {
        console.log('Created index on provider column for faster filtering');
      }
    });
    
    db.run('CREATE INDEX IF NOT EXISTS idx_games_title ON games(title)', (err) => {
      if (err) {
        console.error('Error creating title index:', err.message);
      } else {
        console.log('Created index on title column for faster sorting');
      }
    });
  });
}

// Database API methods
const dbApi = {
  // Get games with pagination and filtering
  getGames: (page = 1, limit = 60, providers = 'All', sortBy = 'random', searchTerm = '', collectionId = null, callback) => {
    const offset = (page - 1) * limit;
    
    console.log('DB getGames called with search term:', searchTerm);
    console.log('DB getGames called with collection ID:', collectionId);
    
    // Base query - modified to handle collection filtering
    let query = 'SELECT games.*';
    let fromClause = ' FROM games';
    const params = [];
    
    // Collection of where clauses
    const whereConditions = [];
    
    // If filtering by collection, join with collection_games
    if (collectionId) {
      fromClause = ' FROM games JOIN collection_games ON games.id = collection_games.game_id';
      whereConditions.push('collection_games.collection_id = ?');
      params.push(collectionId);
    }
    
    // Add provider filter if needed
    if (providers !== 'All') {
      // Check if providers is an array
      if (Array.isArray(providers) && providers.length > 0) {
        if (!providers.includes('All')) {
          // Use IN clause for multiple providers
          whereConditions.push('provider IN (' + providers.map(() => '?').join(',') + ')');
          providers.forEach(provider => params.push(provider));
        }
      } else if (typeof providers === 'string' && providers !== 'All') {
        // Backward compatibility for single provider
        whereConditions.push('provider = ?');
        params.push(providers);
      }
    }
    
    // Add search term if provided
    if (searchTerm && searchTerm.trim() !== '') {
      console.log('Adding search condition for:', searchTerm);
      whereConditions.push('title LIKE ?');
      params.push(`%${searchTerm}%`);
    }
    
    // Combine query parts
    query += fromClause;
    
    // Combine all where conditions
    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    console.log('Final SQL query:', query);
    console.log('Query parameters:', params);
    
    // Add sorting
    if (sortBy === 'asc') {
      query += ' ORDER BY title ASC';
    } else if (sortBy === 'desc') {
      query += ' ORDER BY title DESC';
    } else if (sortBy === 'random') {
      query += ' ORDER BY RANDOM()';
    }
    
    // Add pagination
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    // Get total count for metadata
    let countQuery = 'SELECT COUNT(*) as total';
    countQuery += fromClause;
    let countParams = [];
    
    // Apply the same where conditions to the count query
    if (whereConditions.length > 0) {
      countQuery += ' WHERE ' + whereConditions.join(' AND ');
      countParams = [...params.slice(0, params.length - 2)]; // Exclude limit and offset
    }
    
    db.get(countQuery, countParams, (err, countRow) => {
      if (err) {
        return callback(err);
      }
      
      db.all(query, params, (err, rows) => {
        if (err) {
          return callback(err);
        }
        
        const result = {
          games: rows,
          metadata: {
            totalGames: countRow.total,
            totalPages: Math.ceil(countRow.total / limit),
            currentPage: page,
            gamesPerPage: limit
          }
        };
        
        callback(null, result);
      });
    });
  },
  
  // Get games by their IDs (for favorites)
  getGamesByIds: (ids = [], callback) => {
    if (!ids.length) {
      return callback(null, []);
    }
    
    // Create placeholders for the SQL query
    const placeholders = ids.map(() => '?').join(',');
    
    // Get games by their IDs
    const query = `SELECT * FROM games WHERE id IN (${placeholders})`;
    
    db.all(query, ids, (err, rows) => {
      if (err) {
        return callback(err);
      }
      
      callback(null, rows);
    });
  },
  
  // Get all unique providers
  getProviders: (callback) => {
    db.all('SELECT name FROM providers ORDER BY name', (err, rows) => {
      if (err) {
        return callback(err);
      }
      
      const providers = rows.map(row => row.name);
      callback(null, { providers: ['All', ...providers], total: providers.length + 1 });
    });
  },
  
  // Collections API
  
  // Get all collections
  getCollections: (callback) => {
    db.all(`
      SELECT 
        collections.*, 
        COUNT(collection_games.game_id) as game_count 
      FROM 
        collections 
      LEFT JOIN 
        collection_games ON collections.id = collection_games.collection_id 
      GROUP BY 
        collections.id
      ORDER BY 
        collections.name
    `, (err, rows) => {
      if (err) {
        return callback(err);
      }
      callback(null, { collections: rows });
    });
  },
  
  // Create a new collection
  createCollection: (name, description = '', callback) => {
    db.run(
      'INSERT INTO collections (name, description) VALUES (?, ?)',
      [name, description],
      function(err) {
        if (err) {
          return callback(err);
        }
        callback(null, { id: this.lastID, name, description });
      }
    );
  },
  
  // Update a collection
  updateCollection: (id, name, description, callback) => {
    db.run(
      'UPDATE collections SET name = ?, description = ? WHERE id = ?',
      [name, description, id],
      function(err) {
        if (err) {
          return callback(err);
        }
        callback(null, { id, name, description, changes: this.changes });
      }
    );
  },
  
  // Delete a collection
  deleteCollection: (id, callback) => {
    db.run('DELETE FROM collections WHERE id = ?', [id], function(err) {
      if (err) {
        return callback(err);
      }
      callback(null, { id, deleted: this.changes > 0 });
    });
  },
  
  // Add a game to a collection
  addGameToCollection: (collectionId, gameId, callback) => {
    db.run(
      'INSERT OR IGNORE INTO collection_games (collection_id, game_id) VALUES (?, ?)',
      [collectionId, gameId],
      function(err) {
        if (err) {
          return callback(err);
        }
        callback(null, { 
          collection_id: collectionId, 
          game_id: gameId, 
          added: this.changes > 0 
        });
      }
    );
  },
  
  // Remove a game from a collection
  removeGameFromCollection: (collectionId, gameId, callback) => {
    db.run(
      'DELETE FROM collection_games WHERE collection_id = ? AND game_id = ?',
      [collectionId, gameId],
      function(err) {
        if (err) {
          return callback(err);
        }
        callback(null, { 
          collection_id: collectionId, 
          game_id: gameId, 
          removed: this.changes > 0 
        });
      }
    );
  },
  
  // Get all games in a collection
  getCollectionGames: (collectionId, callback) => {
    db.all(
      `SELECT games.* FROM games
       JOIN collection_games ON games.id = collection_games.game_id
       WHERE collection_games.collection_id = ?
       ORDER BY games.title`,
      [collectionId],
      (err, rows) => {
        if (err) {
          return callback(err);
        }
        callback(null, rows);
      }
    );
  },
  
  // Check if a game is in a collection
  isGameInCollection: (collectionId, gameId, callback) => {
    db.get(
      'SELECT 1 FROM collection_games WHERE collection_id = ? AND game_id = ?',
      [collectionId, gameId],
      (err, row) => {
        if (err) {
          return callback(err);
        }
        callback(null, !!row);
      }
    );
  },
  
  // Close database connection (for cleanup)
  close: (callback) => {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
        if (callback) callback(err);
        return;
      }
      
      console.log('Closed the database connection');
      if (callback) callback(null);
    });
  }
};

// Export the database API
module.exports = dbApi; 