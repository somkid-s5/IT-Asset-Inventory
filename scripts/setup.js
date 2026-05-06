const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const envExamplePath = path.join(rootDir, '.env.example');
const envPath = path.join(rootDir, '.env');

console.log('--- Starting IT Asset Inventory Setup ---');

if (!fs.existsSync(envExamplePath)) {
    console.error('Error: .env.example not found!');
    process.exit(1);
}

if (!fs.existsSync(envPath)) {
    console.log('Creating .env file from .env.example...');
    let content = fs.readFileSync(envExamplePath, 'utf-8');
    
    // Generate secure random hex keys
    const generateHex = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');
    
    // Replace placeholder keys with actual secure keys
    content = content.replace(/JWT_SECRET=.*/g, `JWT_SECRET=${generateHex(32)}`);
    content = content.replace(/CREDENTIAL_ENCRYPTION_KEY=.*/g, `CREDENTIAL_ENCRYPTION_KEY=${generateHex(32)}`);
    
    fs.writeFileSync(envPath, content);
    console.log('✅ .env file created successfully with secure keys.');
} else {
    console.log('✅ .env file already exists. Skipping creation.');
}

console.log('\nSetup Complete! You can now run: docker-compose up -d');
