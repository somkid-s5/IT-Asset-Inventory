const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        await prisma.user.updateMany({
            where: { email: 'admin@infrapilot.local' },
            data: { passwordHash: '$2b$10$8P.mIvz.pAnrl5w1ekwz8eY983MH3vkmYA336qgT0Fbf1dz8SP1Si' }
        });
        console.log("Admin password updated to SecureAdmin123!");
    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}
run();
