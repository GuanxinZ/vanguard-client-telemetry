import { Page, Locator } from 'playwright';
import { ElementInfo } from './types.js';

/**
 * Find clickable elements on the page
 */
export async function findClickableElements(page: Page): Promise<ElementInfo[]> {
  const elements: ElementInfo[] = [];
  
  const selectors = [
    'a[href]',
    'button:not([disabled])',
    'input[type="button"]:not([disabled])',
    'input[type="submit"]:not([disabled])',
    '[role="button"]:not([disabled])',
    'select:not([disabled])',
    'input[type="checkbox"]:not([disabled])',
    'input[type="radio"]:not([disabled])',
    '[onclick]',
    '[tabindex]:not([tabindex="-1"])'
  ];

  for (const selector of selectors) {
    try {
      const locators = await page.locator(selector).all();
      for (const locator of locators) {
        if (await locator.isVisible()) {
          const tagName = await locator.evaluate(el => el.tagName.toLowerCase());
          const text = await locator.textContent().catch(() => undefined);
          const boundingBox = await locator.boundingBox().catch(() => undefined);
          
          if (boundingBox) {
            elements.push({
              selector: selector,
              tagName,
              text: text?.trim(),
              boundingBox
            });
          }
        }
      }
    } catch (e) {
      // Ignore errors for individual selectors
    }
  }

  // Remove duplicates based on position
  const uniqueElements: ElementInfo[] = [];
  const seen = new Set<string>();
  
  for (const el of elements) {
    if (el.boundingBox) {
      const key = `${el.boundingBox.x},${el.boundingBox.y},${el.boundingBox.width},${el.boundingBox.height}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueElements.push(el);
      }
    }
  }

  return uniqueElements;
}

/**
 * Get a random element from array
 */
export function randomChoice<T>(array: T[]): T | undefined {
  if (array.length === 0) return undefined;
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Random delay between min and max milliseconds
 */
export function randomDelay(min: number, max: number): Promise<void> {
  const delay = min + Math.random() * (max - min);
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Random integer between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Check if click causes visible change (simplified detection)
 */
export async function isDeadClick(
  page: Page,
  beforeUrl: string,
  beforeHtml: string
): Promise<boolean> {
  await randomDelay(100, 300);
  
  const afterUrl = page.url();
  const afterHtml = await page.content();
  
  // Dead click if: no URL change AND no significant DOM change
  const urlChanged = beforeUrl !== afterUrl;
  const htmlChanged = beforeHtml !== afterHtml;
  
  return !urlChanged && !htmlChanged;
}

/**
 * Simulate mouse shake / aggressive movement
 */
export async function simulateMouseShake(
  page: Page,
  iterations: number = 5
): Promise<void> {
  const viewport = page.viewportSize();
  if (!viewport) return;

  for (let i = 0; i < iterations; i++) {
    const x = Math.random() * viewport.width;
    const y = Math.random() * viewport.height;
    await page.mouse.move(x, y, { steps: 1 });
    await randomDelay(10, 30);
  }
}

/**
 * Simulate erratic scrolling
 */
export async function simulateErraticScroll(page: Page): Promise<void> {
  const viewport = page.viewportSize();
  if (!viewport) return;

  const scrollAmount = randomInt(100, 500);
  const direction = Math.random() > 0.5 ? 1 : -1;
  
  await page.evaluate(({ amount, dir }: { amount: number; dir: number }) => {
    window.scrollBy(0, amount * dir);
  }, { amount: scrollAmount, dir: direction });
  
  await randomDelay(50, 150);
  
  // Reverse direction
  await page.evaluate(({ amount, dir }: { amount: number; dir: number }) => {
    window.scrollBy(0, amount * -dir);
  }, { amount: scrollAmount, dir: direction });
}

/**
 * Get current page HTML snapshot (simplified)
 */
export async function getHtmlSnapshot(page: Page): Promise<string> {
  return await page.evaluate(() => {
    return document.body.innerHTML;
  });
}

