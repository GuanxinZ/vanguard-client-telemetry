import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { SessionLogger } from './logger.js';
import { RunConfig, ScenarioType, ScenarioMix } from './types.js';
import { runScenario } from './scenarios.js';
import { randomChoice } from './helpers.js';

/**
 * Select a scenario based on the mix probabilities
 */
function selectScenario(mix: ScenarioMix): ScenarioType {
  const rand = Math.random();
  let cumulative = 0;

  if (rand < (cumulative += mix.normal)) {
    return 'normal_user';
  }
  if (rand < (cumulative += mix.frustrated)) {
    return 'frustrated_user';
  }
  if (rand < (cumulative += mix.lost)) {
    return 'lost_user';
  }
  return 'error_user';
}

/**
 * Generate a unique session ID
 */
function generateSessionId(index: number): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `session_${index}_${timestamp}_${random}`;
}

/**
 * Run a single session
 */
async function runSingleSession(
  browser: Browser,
  config: RunConfig,
  scenario: ScenarioType,
  sessionIndex: number,
  outputFile: string
): Promise<void> {
  // Create a new browser context for each session (new visitor)
  const context: BrowserContext = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Session${sessionIndex}`
  });

  const page: Page = await context.newPage();

  const sessionId = generateSessionId(sessionIndex);
  const logger = new SessionLogger(sessionId, outputFile);

  try {
    console.log(`[Session ${sessionIndex}] Running scenario: ${scenario}`);
    await runScenario(scenario, page, logger, config.baseUrl);
    console.log(`[Session ${sessionIndex}] Completed`);
  } catch (error) {
    console.error(`[Session ${sessionIndex}] Error:`, error);
    logger.log({
      event_type: 'session_end',
      scenario,
      url: page.url(),
      metadata: {
        error: (error as Error).message,
        stack: (error as Error).stack
      }
    });
  } finally {
    logger.close();
    await context.close();
  }
}

/**
 * Run all sessions
 */
export async function runSessions(config: RunConfig): Promise<void> {
  console.log(`Starting ${config.sessions} sessions...`);
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`Scenario Mix:`, config.scenarioMix);

  // Determine output file name once for all sessions
  const outputFile = config.outputFile || `sessions_${Date.now()}.jsonl`;
  if (!config.outputFile) {
    console.log(`Output file: ${outputFile}`);
  }

  // Launch browser
  const browser: Browser = await chromium.launch({
    headless: true // Set to false to watch the browser
  });

  try {
    // Run sessions sequentially (or you could parallelize)
    for (let i = 0; i < config.sessions; i++) {
      const scenario = selectScenario(config.scenarioMix);
      await runSingleSession(browser, config, scenario, i + 1, outputFile);
      
      // Small delay between sessions
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } finally {
    await browser.close();
  }

  console.log(`All ${config.sessions} sessions completed!`);
  console.log(`Log file saved to: ${outputFile}`);
}

