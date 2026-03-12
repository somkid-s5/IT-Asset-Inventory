const { execSync } = require('child_process');

try {
    const output = execSync('netstat -ano | findstr :3001').toString();
    const lines = output.split('\n').filter(l => l.includes('LISTENING'));
    for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        console.log(`Killing PID ${pid}`);
        try {
            execSync(`taskkill /F /PID ${pid}`);
        } catch(e) {}
    }
} catch (e) {
    console.log('No processes found on port 3001');
}

try {
    const output = execSync('netstat -ano | findstr :3000').toString();
    const lines = output.split('\n').filter(l => l.includes('LISTENING'));
    for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        console.log(`Killing PID ${pid}`);
        try {
            execSync(`taskkill /F /PID ${pid}`);
        } catch(e) {}
    }
} catch (e) {
    console.log('No processes found on port 3000');
}

console.log('Done killing processes.');

try {
    console.log('Running prisma db push...');
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
    console.log('Running prisma generate...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('Running grouped import script...');
    execSync('npx ts-node import-grouped.ts', { stdio: 'inherit' });
} catch (e) {
    console.error('Error in execution sequence:', e);
    process.exit(1);
}
