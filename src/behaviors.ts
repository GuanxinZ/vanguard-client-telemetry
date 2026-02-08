import { Page } from 'playwright';
import { SessionLogger } from './logger.js';
import { ElementInfo } from './types.js';
import {
  findClickableElements,
  randomChoice,
  randomDelay,
  randomInt,
  isDeadClick,
  simulateMouseShake,
  simulateErraticScroll,
  getHtmlSnapshot
} from './helpers.js';

/**
 * Rage click: rapid clicks on the same element
 */
export async function rageClick(
  page: Page,
  logger: SessionLogger,
  element: ElementInfo,
  clickCount: number = 5
): Promise<void> {
  const locator = page.locator(element.selector).first();
  
  for (let i = 0; i < clickCount; i++) {
    try {
      const beforeUrl = page.url();
      const beforeHtml = await getHtmlSnapshot(page);
      
      await locator.click({ timeout: 1000 }).catch(() => {});
      
      const afterUrl = page.url();
      const isDead = await isDeadClick(page, beforeUrl, beforeHtml);
      
      logger.log({
        event_type: 'rage_click',
        scenario: 'frustrated_user',
        url: afterUrl,
        selector: element.selector,
        metadata: {
          click_number: i + 1,
          total_clicks: clickCount,
          is_dead_click: isDead,
          bounding_box: element.boundingBox
        }
      });
      
      await randomDelay(50, 150);
    } catch (e) {
      // Element may become unavailable
      break;
    }
  }
}

/**
 * Dead click detection: click that causes no visible effect
 */
export async function performDeadClick(
  page: Page,
  logger: SessionLogger,
  element: ElementInfo
): Promise<void> {
  const beforeUrl = page.url();
  const beforeHtml = await getHtmlSnapshot(page);
  
  try {
    await page.locator(element.selector).first().click({ timeout: 2000 });
  } catch (e) {
    // Element might not be clickable
  }
  
  const isDead = await isDeadClick(page, beforeUrl, beforeHtml);
  
  logger.log({
    event_type: isDead ? 'dead_click' : 'click',
    scenario: 'normal_user',
    url: page.url(),
    selector: element.selector,
    metadata: {
      is_dead_click: isDead,
      bounding_box: element.boundingBox
    }
  });
}

/**
 * Normal click with logging
 */
export async function performClick(
  page: Page,
  logger: SessionLogger,
  element: ElementInfo,
  scenario: string
): Promise<void> {
  const beforeUrl = page.url();
  
  try {
    await page.locator(element.selector).first().click({ timeout: 3000 });
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  } catch (e) {
    // Click might fail
  }
  
  logger.log({
    event_type: 'click',
    scenario: scenario as any,
    url: page.url(),
    selector: element.selector,
    metadata: {
      url_changed: beforeUrl !== page.url(),
      bounding_box: element.boundingBox,
      text: element.text
    }
  });
}

/**
 * Refocus: click on an element that was already interacted with
 */
export async function refocusClick(
  page: Page,
  logger: SessionLogger,
  element: ElementInfo,
  scenario: string
): Promise<void> {
  await performClick(page, logger, element, scenario);
  
  await randomDelay(500, 1500);
  
  // Click again on the same element
  try {
    await page.locator(element.selector).first().click({ timeout: 2000 });
    logger.log({
      event_type: 'refocus',
      scenario: scenario as any,
      url: page.url(),
      selector: element.selector,
      metadata: {
        bounding_box: element.boundingBox
      }
    });
  } catch (e) {
    // Element might not be available anymore
  }
}

