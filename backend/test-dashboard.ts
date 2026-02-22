import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
    const now = new Date();
    try {
        const eolAssets = await prisma.asset.count({
            where: {
                patchInfo: {
                    eolDate: {
                        lt: now,
                    },
                },
            },
        });
        console.log("Success", eolAssets);
    } catch(e) {
        console.error("Prisma Error:", e.message);
    }
    prisma.$disconnect();
}
run();
