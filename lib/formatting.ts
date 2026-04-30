import { TIMEZONE } from './constants';

/**
 * Format a price with optional per-unit display.
 * formatPrice(3.99, 'lb') => "$3.99/lb"
 * formatPrice(3.99, null)  => "$3.99"
 */
export function formatPrice(price: number, unit: string | null): string {
  const priceStr = `$${price.toFixed(2)}`;
  return unit ? `${priceStr}/${unit}` : priceStr;
}

/**
 * Format a YYYY-MM-DD date string for display.
 * Appends 'T00:00:00' to avoid timezone-shift issues with Date parsing.
 *
 * preset = 'short'  => "Apr 17"
 * preset = 'medium' => "Apr 17, 2026"
 * preset = 'long'   => "April 17, 2026"
 */
export function formatReceiptDate(
  isoDate: string,
  preset: 'short' | 'medium' | 'long' = 'medium'
): string {
  const date = new Date(isoDate + 'T00:00:00');

  const options: Intl.DateTimeFormatOptions = { timeZone: TIMEZONE };

  switch (preset) {
    case 'short':
      options.month = 'short';
      options.day = 'numeric';
      break;
    case 'medium':
      options.month = 'short';
      options.day = 'numeric';
      options.year = 'numeric';
      break;
    case 'long':
      options.month = 'long';
      options.day = 'numeric';
      options.year = 'numeric';
      break;
  }

  return date.toLocaleDateString('en-US', options);
}

/**
 * Format a currency value.
 * formatCurrency(12.5) => "$12.50"
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
