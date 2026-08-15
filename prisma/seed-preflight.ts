import "dotenv/config";

import { assertDemoSeedAllowed } from "../src/lib/demo-seed-guard";

const preflight = assertDemoSeedAllowed();
console.log(`[DEMO SEED] Explicit opt-in accepted for target ${preflight.targetDatabase}`);
console.log("[DEMO SEED] This operation replaces the synthetic tenant slug 'doce-arte'.");
