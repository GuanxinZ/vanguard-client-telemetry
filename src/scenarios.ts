import { Page, BrowserContext } from 'playwright';
import { SessionLogger } from './logger.js';
import { ScenarioType } from './types.js';
import {
  findClickableElements,
  randomChoice,
  randomDelay,
  randomInt,
  simulateMouseShake,
  simulateErraticScroll
} from './helpers.js';
import {
  performClick,
  rageClick,
  performDeadClick,
  refocusClick
} from './behaviors.js';

/**
 * Normal user scenario: typical browsing behavior
 */
export async function normalUserScenario(
  page: Page,
  logger: SessionLogger,
  baseUrl: string
): Promise<void> {
  logger.log({
    event_type: 'session_start',
    scenario: 'normal_user',
    url: page.url(),
    metadata: {}
  });

  // Navigate to trade page
  await page.goto(`${baseUrl}/trade.html`, { waitUntil: 'domcontentloaded' });
  logger.log({
    event_type: 'page_navigation',
    scenario: 'normal_user',
    url: page.url(),
    metadata: { target_url: `${baseUrl}/trade.html` }
  });

  // Initial hesitancy: wait before first interaction
  const hesitancy = randomInt(2000, 5000);
  await randomDelay(hesitancy, hesitancy);
  logger.log({
    event_type: 'idle',
    scenario: 'normal_user',
    url: page.url(),
    metadata: { duration_ms: hesitancy, reason: 'initial_hesitancy' }
  });

  // Find clickable elements
  const elements = await findClickableElements(page);
  
  // Perform 3-5 normal interactions
  const numActions = randomInt(3, 5);
  for (let i = 0; i < numActions; i++) {
    const element = randomChoice(elements);
    if (!element) break;

    // Variable pacing between actions
    const pacing = randomInt(1000, 3000);
    await randomDelay(pacing, pacing);
    
    if (i === 0) {
      // First interaction - check for dead click
      await performDeadClick(page, logger, element);
    } else {
      await performClick(page, logger, element, 'normal_user');
    }

    // Sometimes scroll
    if (Math.random() > 0.6) {
      const scrollAmount = randomInt(200, 500);
      await page.evaluate((amount: number) => {
        window.scrollBy(0, amount);
      }, scrollAmount);
      logger.log({
        event_type: 'scroll',
        scenario: 'normal_user',
        url: page.url(),
        metadata: { direction: 'down', amount: scrollAmount }
      });
    }
  }

  // Idle time at the end
  const idleTime = randomInt(2000, 4000);
  await randomDelay(idleTime, idleTime);
  logger.log({
    event_type: 'idle',
    scenario: 'normal_user',
    url: page.url(),
    metadata: { duration_ms: idleTime, reason: 'end_of_session' }
  });

  logger.log({
    event_type: 'session_end',
    scenario: 'normal_user',
    url: page.url(),
    metadata: { total_actions: numActions }
  });
}

/**
 * Frustrated user: rage clicks, erratic scrolling, mouse shake
 */
export async function frustratedUserScenario(
  page: Page,
  logger: SessionLogger,
  baseUrl: string
): Promise<void> {
  logger.log({
    event_type: 'session_start',
    scenario: 'frustrated_user',
    url: page.url(),
    metadata: {}
  });

  await page.goto(`${baseUrl}/trade.html`, { waitUntil: 'domcontentloaded' });
  logger.log({
    event_type: 'page_navigation',
    scenario: 'frustrated_user',
    url: page.url(),
    metadata: { target_url: `${baseUrl}/trade.html` }
  });

  // Short hesitancy (frustrated users act quickly)
  await randomDelay(500, 1500);

  // Mouse shake
  await simulateMouseShake(page, randomInt(3, 7));
  logger.log({
    event_type: 'mouse_move',
    scenario: 'frustrated_user',
    url: page.url(),
    metadata: { behavior: 'shake', iterations: randomInt(3, 7) }
  });

  const elements = await findClickableElements(page);
  
  // Rage click on a random element
  const targetElement = randomChoice(elements);
  if (targetElement) {
    await rageClick(page, logger, targetElement, randomInt(4, 8));
  }

  // Erratic scrolling
  for (let i = 0; i < randomInt(3, 6); i++) {
    await simulateErraticScroll(page);
    logger.log({
      event_type: 'scroll',
      scenario: 'frustrated_user',
      url: page.url(),
      metadata: { behavior: 'erratic', iteration: i + 1 }
    });
    await randomDelay(200, 500);
  }

  // Try clicking multiple elements rapidly
  for (let i = 0; i < randomInt(3, 5); i++) {
    const element = randomChoice(elements);
    if (element) {
      await performClick(page, logger, element, 'frustrated_user');
      await randomDelay(100, 300);
    }
  }

  logger.log({
    event_type: 'session_end',
    scenario: 'frustrated_user',
    url: page.url(),
    metadata: {}
  });
}

/**
 * Lost user: hesitancy, u-turns, refocus
 */
export async function lostUserScenario(
  page: Page,
  logger: SessionLogger,
  baseUrl: string
): Promise<void> {
  logger.log({
    event_type: 'session_start',
    scenario: 'lost_user',
    url: page.url(),
    metadata: {}
  });

  await page.goto(`${baseUrl}/trade.html`, { waitUntil: 'domcontentloaded' });
  logger.log({
    event_type: 'page_navigation',
    scenario: 'lost_user',
    url: page.url(),
    metadata: { target_url: `${baseUrl}/trade.html` }
  });

  // Long hesitancy (lost users hesitate)
  const longHesitancy = randomInt(5000, 10000);
  await randomDelay(longHesitancy, longHesitancy);
  logger.log({
    event_type: 'idle',
    scenario: 'lost_user',
    url: page.url(),
    metadata: { duration_ms: longHesitancy, reason: 'hesitation' }
  });

  const elements = await findClickableElements(page);
  if (elements.length < 2) return;

  // U-turn: A -> B -> A
  const elementA = randomChoice(elements);
  const elementB = randomChoice(elements.filter(e => e !== elementA));
  
  if (elementA && elementB) {
    const urlBefore = page.url();
    
    // Click A
    await performClick(page, logger, elementA, 'lost_user');
    await randomDelay(1000, 2000);
    
    // Click B (within 7 seconds for U-turn)
    const urlAtB = page.url();
    await performClick(page, logger, elementB, 'lost_user');
    await randomDelay(500, 1500);
    
    // Go back to A (U-turn)
    if (urlBefore === page.url() || Math.random() > 0.5) {
      // Either same page or random chance to go back
      const backElement = elements.find(e => 
        e.text?.toLowerCase().includes('back') || 
        e.selector.includes('back') ||
        e === elementA
      );
      
      if (backElement) {
        await performClick(page, logger, backElement, 'lost_user');
        logger.log({
          event_type: 'u_turn',
          scenario: 'lost_user',
          url: page.url(),
          metadata: {
            path: [elementA.selector, elementB.selector, backElement.selector],
            duration_seconds: 7
          }
        });
      }
    }
  }

  // Refocus: click same element multiple times
  const refocusElement = randomChoice(elements);
  if (refocusElement) {
    await refocusClick(page, logger, refocusElement, 'lost_user');
    await randomDelay(1000, 2000);
    await refocusClick(page, logger, refocusElement, 'lost_user');
  }

  // Long pauses between actions
  const pause = randomInt(3000, 7000);
  await randomDelay(pause, pause);
  logger.log({
    event_type: 'idle',
    scenario: 'lost_user',
    url: page.url(),
    metadata: { duration_ms: pause, reason: 'confusion' }
  });

  logger.log({
    event_type: 'session_end',
    scenario: 'lost_user',
    url: page.url(),
    metadata: {}
  });
}

/**
 * Error user: trigger errors, retries, network failures
 */
export async function errorUserScenario(
  page: Page,
  logger: SessionLogger,
  baseUrl: string
): Promise<void> {
  logger.log({
    event_type: 'session_start',
    scenario: 'error_user',
    url: page.url(),
    metadata: {}
  });

  // Set up error listeners
  page.on('console', msg => {
    if (msg.type() === 'error') {
      logger.log({
        event_type: 'console_error',
        scenario: 'error_user',
        url: page.url(),
        metadata: {
          message: msg.text(),
          type: msg.type()
        }
      });
    }
  });

  page.on('pageerror', error => {
    logger.log({
      event_type: 'page_error',
      scenario: 'error_user',
      url: page.url(),
      metadata: {
        message: error.message,
        stack: error.stack
      }
    });
  });

  page.on('response', response => {
    if (response.status() >= 400) {
      logger.log({
        event_type: 'network_error',
        scenario: 'error_user',
        url: page.url(),
        metadata: {
          status: response.status(),
          url: response.url(),
          statusText: response.statusText()
        }
      });
    }
  });

  // Try to navigate to a non-existent page (404)
  try {
    await page.goto(`${baseUrl}/nonexistent-page-404.html`, { 
      waitUntil: 'domcontentloaded',
      timeout: 5000 
    });
  } catch (e) {
    logger.log({
      event_type: 'network_error',
      scenario: 'error_user',
      url: page.url(),
      metadata: {
        status: 404,
        error: 'Page not found',
        attempted_url: `${baseUrl}/nonexistent-page-404.html`
      }
    });
  }

  // Navigate to trade page
  await page.goto(`${baseUrl}/trade.html`, { waitUntil: 'domcontentloaded' });
  logger.log({
    event_type: 'page_navigation',
    scenario: 'error_user',
    url: page.url(),
    metadata: { target_url: `${baseUrl}/trade.html` }
  });

  const elements = await findClickableElements(page);
  
  // Try to submit invalid form data to trigger errors
  const symbolInput = page.locator('#symbol').first();
  if (await symbolInput.isVisible()) {
    // Leave empty and try to proceed (should trigger validation error)
    const nextBtn = page.locator('#nextBtn').first();
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await randomDelay(500, 1000);
    }
  }

  // Try clicking disabled elements or out of bounds
  for (let i = 0; i < randomInt(2, 4); i++) {
    const element = randomChoice(elements);
    if (element) {
      try {
        // Sometimes click with wrong selector to cause error
        if (Math.random() > 0.7) {
          await page.click('non-existent-selector-12345').catch(() => {});
        } else {
          await performClick(page, logger, element, 'error_user');
        }
        await randomDelay(500, 1500);
      } catch (e) {
        logger.log({
          event_type: 'click',
          scenario: 'error_user',
          url: page.url(),
          selector: element.selector,
          metadata: {
            error: (e as Error).message,
            bounding_box: element.boundingBox
          }
        });
      }
    }
  }

  // Retry failed actions
  const retryElement = randomChoice(elements);
  if (retryElement) {
    for (let i = 0; i < 3; i++) {
      await performClick(page, logger, retryElement, 'error_user');
      await randomDelay(1000, 2000);
    }
  }

  logger.log({
    event_type: 'session_end',
    scenario: 'error_user',
    url: page.url(),
    metadata: {}
  });
}

/**
 * Run a scenario based on type
 */
export async function runScenario(
  scenario: ScenarioType,
  page: Page,
  logger: SessionLogger,
  baseUrl: string
): Promise<void> {
  switch (scenario) {
    case 'normal_user':
      await normalUserScenario(page, logger, baseUrl);
      break;
    case 'frustrated_user':
      await frustratedUserScenario(page, logger, baseUrl);
      break;
    case 'lost_user':
      await lostUserScenario(page, logger, baseUrl);
      break;
    case 'error_user':
      await errorUserScenario(page, logger, baseUrl);
      break;
    default:
      throw new Error(`Unknown scenario: ${scenario}`);
  }
}

