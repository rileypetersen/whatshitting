# What's Hitting - Testing Strategy

This document outlines the testing strategy for the What's Hitting application to ensure reliability, performance, and correctness.

## Testing Categories

The application tests are organized into the following categories:

### 1. Project Structure Tests

Tests that verify the correct project structure and configuration files are in place:
- Server directory exists with index.js
- Client directory exists with package.json
- Client .env contains API URL configuration
- Root package.json contains correct scripts

### 2. API Tests

Tests that verify the backend API endpoints function correctly:
- GET /api/games returns games data with correct structure
- GET /api/providers returns providers list
- GET /api/collections returns collections list
- Image endpoints return images with correct content type

### 3. Client API Utility Tests

Tests that verify client-side API utilities work correctly:
- API URL is correctly constructed from environment variables
- Image URLs are correctly built
- Fallback URL is used when environment variable is not set
- API request URLs are correctly formatted

### 4. React Hooks Tests

Tests that verify React hooks in the GameGallery component work correctly:
- fetchGames function is called with correct parameters
- fetchAllFavorites function is called with correct favorites
- loadMoreGames function updates the page correctly
- Dependencies are correctly set in useEffect and useCallback hooks

### 5. Component Tests

Tests that verify React components render and behave correctly:
- Components render in loading, error, and success states
- Game images and titles are displayed correctly
- User interactions work as expected (filtering, sorting, etc.)

### 6. End-to-End Tests

Manual or automated tests that verify the entire application flow:
- Application startup
- Game gallery displays games
- Filtering and sorting work
- Favorites functionality works
- Collections functionality works
- Infinite scrolling works
- Error handling works
- API URL configuration works
- Mobile responsiveness works
- Performance is acceptable

## Running Tests

To run all tests, use the provided script:

```bash
./run-tests.sh
```

This script will:
1. Test project structure
2. Start the server
3. Run API tests
4. Run client tests
5. Clean up

For individual test categories:

```bash
# Project structure tests
npm test -- tests/project-structure.test.js

# Server API tests
cd server && npm test

# Client tests
cd client && npm test
```

## Common Issues Fixed by Tests

The tests address several common issues in the application:

1. **API URL Configuration**: Tests verify that the API URL is correctly set in .env and used throughout the application.

2. **Path Resolution**: Tests verify that paths to server and client directories are correct.

3. **Image Loading**: Tests verify that image paths are correctly constructed and that placeholder images are shown when needed.

4. **React Hook Dependencies**: Tests verify that useEffect and useCallback hooks have the correct dependencies.

5. **Error Handling**: Tests verify that errors are properly caught and displayed.

## Continuous Integration

For continuous integration, add these tests to your CI pipeline:

```yaml
# Example GitHub Actions workflow
name: Test What's Hitting

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Set up Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    - name: Install dependencies
      run: npm install
    - name: Run tests
      run: ./run-tests.sh
```

## Adding New Tests

When adding new features, follow these guidelines for adding tests:

1. **Unit Tests**: Add tests for new utility functions.
2. **Component Tests**: Add tests for new React components.
3. **API Tests**: Add tests for new API endpoints.
4. **E2E Tests**: Update E2E test documentation for new features.

## Troubleshooting

If tests fail, check these common issues:

1. **Server not running**: Make sure the server is running on port 5000.
2. **Environment variables**: Make sure .env has REACT_APP_API_URL set.
3. **Path issues**: Make sure paths in tests point to the correct files.
4. **Mock data**: Make sure mock data matches the expected API response format. 