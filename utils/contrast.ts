import type { Locator } from '@playwright/test';

/**
 * WCAG contrast ratio of an element's text against the first opaque background above it.
 * Colours go through a canvas so oklch() and color-mix() values are converted to rgb for us.
 */
export function contrastRatio(el: Locator, fallbackBg = 'oklch(0.145 0 0)'): Promise<number> {
  return el.evaluate((node, fallback) => {
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;

    const toRgba = (css: string) => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = css;
      ctx.fillRect(0, 0, 1, 1);
      return [...ctx.getImageData(0, 0, 1, 1).data];
    };

    const luminance = ([r = 0, g = 0, b = 0]: number[]) => {
      const lin = (v: number) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    };

    let background = fallback;
    for (let p: Element | null = node; p; p = p.parentElement) {
      const bg = getComputedStyle(p).backgroundColor;
      if (toRgba(bg)[3]! > 200) {
        background = bg;
        break;
      }
    }

    const text = luminance(toRgba(getComputedStyle(node).color));
    const back = luminance(toRgba(background));
    return (Math.max(text, back) + 0.05) / (Math.min(text, back) + 0.05);
  }, fallbackBg);
}
