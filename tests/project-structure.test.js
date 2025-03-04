const fs = require('fs');
const path = require('path');

describe('Project Structure Tests', () => {
  test('Server directory should exist with index.js', () => {
    const serverIndexPath = path.join(__dirname, '../server/index.js');
    expect(fs.existsSync(serverIndexPath)).toBe(true);
  });

  test('Client directory should exist with package.json', () => {
    const clientPackagePath = path.join(__dirname, '../client/package.json');
    expect(fs.existsSync(clientPackagePath)).toBe(true);
  });

  test('Client .env should contain API URL configuration', () => {
    const envPath = path.join(__dirname, '../client/.env');
    expect(fs.existsSync(envPath)).toBe(true);
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    expect(envContent).toContain('REACT_APP_API_URL');
  });

  test('Root package.json should contain start and dev scripts', () => {
    const rootPackagePath = path.join(__dirname, '../package.json');
    expect(fs.existsSync(rootPackagePath)).toBe(true);
    
    const packageJson = JSON.parse(fs.readFileSync(rootPackagePath, 'utf8'));
    expect(packageJson.scripts).toHaveProperty('start');
    expect(packageJson.scripts).toHaveProperty('dev');
  });
}); 