import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { RunConfig, ScenarioType, ScenarioMix } from './types.js';
import { runScenario } from './scenarios.js';

/**
 * Select a scenario based on the mix probabilities.
 */
function selectScenario(mix: ScenarioMix): ScenarioType {
  const rand = Math.random();
  let cumulative = 0;

  if (rand < (cumulative += mix.normal)) return 'normal_user';
  if (rand < (cumulative += mix.frustrated)) return 'frustrated_user';
  if (rand < (cumulative += mix.lost)) return 'lost_user';
  return 'error_user';
}

/**
 * Generate a Playwright-owned session ID in the same S<timestamp>-<rand> format
 * that telemetry.js would normally produce, so the IDs are visually consistent
 * in the database while remaining uniquely attributable to this simulation run.
 */
function generateSessionId(index: number): string {
  const random = Math.floor(Math.random() * 10000);
  return `S-pw${index}-${Date.now()}-${random}`;
}

/**
 * Run a single simulated session.
 *
 * Session-ID sync strategy
 * ────────────────────────
 * context.addInitScript() injects a tiny script that runs in the browser
 * sandbox *before* any page script (including telemetry.js).  It writes the
 * Playwright-assigned sessionId and userId into sessionStorage so that when
 * telemetry.js calls _initSession() it finds the pre-seeded values and never
 * generates its own S<timestamp>-... / U-guest identities.
 *
 * Result: every event emitted by the browser's telemetry.js carries the same
 * sessionId and userId that the simulation run assigned, giving a single
 * unified identity in the database.
 */
async function runSingleSession(
  browser: Browser,
  config: RunConfig,
  scenario: ScenarioType,
  sessionIndex: number
): Promise<void> {
  const context: BrowserContext = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent:
      `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ` +
      `(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Session${sessionIndex}`
  });

  const sessionId = generateSessionId(sessionIndex);
  const userId = `U-playwright-${sessionIndex}`;

  // Seed sessionStorage before telemetry.js initialises on every page load.
  await context.addInitScript(
    ({ sid, uid }: { sid: string; uid: string }) => {
      sessionStorage.setItem('sessionId', sid);
      sessionStorage.setItem('userId', uid);
    },
    { sid: sessionId, uid: userId }
  );

  const page: Page = await context.newPage();

  try {
    console.log(`[Session ${sessionIndex}] scenario=${scenario}  sessionId=${sessionId}`);
    await runScenario(scenario, page, config.baseUrl);
    console.log(`[Session ${sessionIndex}] completed`);
  } catch (error) {
    console.error(`[Session ${sessionIndex}] error:`, (error as Error).message);
  } finally {
    await context.close();
  }
}

/**
 * Run all simulated sessions sequentially.
 */
export async function runSessions(config: RunConfig): Promise<void> {
  console.log(`Starting ${config.sessions} sessions...`);
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`Scenario mix:`, config.scenarioMix);

  const browser: Browser = await chromium.launch({ headless: true });

  try {
    for (let i = 0; i < config.sessions; i++) {
      const scenario = selectScenario(config.scenarioMix);
      await runSingleSession(browser, config, scenario, i + 1);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } finally {
    await browser.close();
  }

  console.log(`All ${config.sessions} sessions completed.`);
}
