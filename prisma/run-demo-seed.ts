import "dotenv/config";

import { assertDemoSeedAllowed } from "../src/lib/demo-seed-guard";

const preflight = assertDemoSeedAllowed();
console.log(`[DEMO SEED] Preflight accepted for target ${preflight.targetDatabase}`);

// Load the destructive seed only after the fail-closed guard has succeeded.
// This keeps even Prisma runtime initialization behind the explicit opt-in.
void import("./seed");
