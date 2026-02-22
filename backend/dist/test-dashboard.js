"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
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
    }
    catch (e) {
        console.error("Prisma Error:", e.message);
    }
    prisma.$disconnect();
}
run();
//# sourceMappingURL=test-dashboard.js.map