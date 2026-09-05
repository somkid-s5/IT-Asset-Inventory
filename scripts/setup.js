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

    const generateHex = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');
    const generatePassword = () => `Dev-${generateHex(16)}-Aa1!`;
    const postgresPassword = generateHex(24);

    const replacements = {
        POSTGRES_PASSWORD: postgresPassword,
        DATABASE_URL: `postgresql://infrapilot:${postgresPassword}@localhost:5435/infrapilot_db?schema=public`,
        JWT_SECRET: generateHex(32),
        CREDENTIAL_ENCRYPTION_KEY: generateHex(32),
        DEFAULT_ADMIN_PASSWORD: generatePassword(),
        DEFAULT_EDITOR_PASSWORD: generatePassword(),
        DEFAULT_VIEWER_PASSWORD: generatePassword(),
        BOOTSTRAP_SECRET: generateHex(32),
        REGISTRATION_SECRET: generateHex(32),
        VCENTER_ALLOWED_HOSTS: '',
        PGADMIN_DEFAULT_PASSWORD: generatePassword(),
        ALLOW_DEVELOPMENT_SEED: 'true',
        APP_HOST: 'localhost',
        COOKIE_SECURE: 'true',
        NEXT_PUBLIC_API_URL: '/api',
    };

    for (const [key, value] of Object.entries(replacements)) {
        content = content.replace(new RegExp(`^${key}=.*$`, 'm'), `${key}=${value}`);
    }

    fs.writeFileSync(envPath, content);
    console.log('Local .env created with generated development-only secrets.');
    console.log('Credential values are stored only in the root .env file and are not printed.');
} else {
    console.log('.env file already exists. Skipping creation.');
}

console.log('\nSetup complete. Start only the development database with:');
console.log('docker compose -f docker-compose.db.yml up -d');
