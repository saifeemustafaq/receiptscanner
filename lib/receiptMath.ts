/**
 * Deterministic receipt-math validation.
 *
 * Pure functions that check a receipt's printed numbers against each other and
 * return non-blocking findings for the review screen (DEVELOPER_GUIDE §15 —
 * inline messaging; §19 — derived, never stored). Nothing here corrects data or
 * prevents a save; it only surfaces "this doesn't add up" so the user can look.
 *
 * Critically, the per-line check runs ONLY against the AS-PRINTED unit price.
 * If the receipt didn't print one, there is nothing independent to cross-check,
 * so the check is skipped rather than validating a computed value against itself.
 */

import type { ReceiptItem, ExtractedData } from './types';

export type ValidationKind =
  | 'line-mismatch'
  | 'subtotal-mismatch'
  | 'unaccounted-adjustments';

export interface ValidationResult {
  ok: boolean;
  kind: ValidationKind;
  expected: number;
  actual: number;
  message: string;
}

/** Per-line rounding tolerance: printed line total may differ by a cent. */
export const LINE_TOL = 0.01;
/** Floor for the total/subtotal reconciliation tolerance. */
export const FOOTER_TOL_FLOOR = 0.05;
/** Fraction of the grand total absorbed as accumulated rounding / fees. */
export const FOOTER_TOL_PCT = 0.005;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function isNum(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Sum of the receipt's named non-item charges (service/delivery/bag/deposit/tip). */
export function sumAdditionalCharges(data: ExtractedData): number {
  const charges = Array.isArray(data.additionalCharges) ? data.additionalCharges : [];
  return round2(charges.reduce((sum, c) => (isNum(c?.amount) ? sum + c.amount : sum), 0));
}

/** A single labeled line for the review/detail totals breakdown. */
export interface TotalsRow {
  label: string;
  amount: number;
}

/**
 * The non-total lines of a receipt's totals breakdown, in display order:
 * Subtotal, Tax, then each additional charge. The grand total is rendered
 * separately by the caller. Lines that weren't printed are omitted.
 */
export function totalsBreakdown(data: ExtractedData): TotalsRow[] {
  const rows: TotalsRow[] = [];
  if (isNum(data.subtotal)) rows.push({ label: 'Subtotal', amount: data.subtotal });
  if (isNum(data.tax)) rows.push({ label: 'Tax', amount: data.tax });
  const charges = Array.isArray(data.additionalCharges) ? data.additionalCharges : [];
  charges.forEach(c => {
    if (isNum(c?.amount)) rows.push({ label: c.label?.trim() || 'Additional charge', amount: c.amount });
  });
  return rows;
}

/**
 * Check a single line: round(quantity × unitPrice) should equal the printed
 * total. Returns null (not applicable) when the unit price was not printed, or
 * quantity/total are missing — those lines have nothing to cross-check.
 */
export function validateLineItem(item: ReceiptItem, tol: number = LINE_TOL): ValidationResult | null {
  if (!isNum(item.unitPrice) || !isNum(item.quantity) || !isNum(item.totalPrice)) {
    return null;
  }

  const expected = round2(item.quantity * item.unitPrice);
  const actual = round2(item.totalPrice);
  const ok = Math.abs(expected - actual) <= tol;

  return {
    ok,
    kind: 'line-mismatch',
    expected,
    actual,
    message: ok
      ? 'Line total matches quantity × unit price.'
      : `Quantity × unit price is $${expected.toFixed(2)}, but the line total reads $${actual.toFixed(2)}.`,
  };
}

/**
 * Reconcile the receipt totals in two tiers:
 *   (A) sum(line totals) vs printed subtotal        — a real warning if off
 *   (B) subtotal + tax    vs printed grand total     — residual reported as
 *                                                      informational adjustments
 * When no subtotal was extracted, falls back to sum(lines) + tax vs total at
 * the looser footer tolerance. Only noteworthy findings are returned; an empty
 * array means everything reconciles.
 */
export function validateReceiptTotals(data: ExtractedData): ValidationResult[] {
  const results: ValidationResult[] = [];
  const items = Array.isArray(data.items) ? data.items : [];

  const lineSum = round2(
    items.reduce((sum, item) => (isNum(item.totalPrice) ? sum + item.totalPrice : sum), 0)
  );

  const hasSubtotal = isNum(data.subtotal);
  const tax = isNum(data.tax) ? data.tax : 0;
  const total = isNum(data.total) ? data.total : NaN;

  const lineTol = Math.max(FOOTER_TOL_FLOOR, LINE_TOL * items.length);
  const footerTol = Math.max(FOOTER_TOL_FLOOR, Math.abs(total) * FOOTER_TOL_PCT);

  // Tier A — line items should sum to the printed subtotal.
  if (hasSubtotal) {
    const subtotal = data.subtotal as number;
    const ok = Math.abs(lineSum - subtotal) <= lineTol;
    if (!ok) {
      results.push({
        ok: false,
        kind: 'subtotal-mismatch',
        expected: round2(subtotal),
        actual: lineSum,
        message: `Items add up to $${lineSum.toFixed(2)}, but the printed subtotal is $${subtotal.toFixed(2)} — a line may be missing or duplicated.`,
      });
    }
  }

  // Tier B — subtotal (or line sum) + tax + known additional charges should
  // reach the grand total. Because named fees (service/delivery/deposit/…) are
  // now captured, the residual is only what remains truly UNexplained; report
  // that as an informational note, never a hard error.
  if (isNum(total)) {
    const base = hasSubtotal ? (data.subtotal as number) : lineSum;
    const reconciled = round2(base + tax + sumAdditionalCharges(data));
    const residual = round2(total - reconciled);
    if (Math.abs(residual) > footerTol) {
      const moreLess = residual > 0 ? 'more than' : 'less than';
      results.push({
        ok: true, // informational — real receipts carry fees/deposits/coupons
        kind: 'unaccounted-adjustments',
        expected: reconciled,
        actual: round2(total),
        message: `Grand total is $${Math.abs(residual).toFixed(2)} ${moreLess} items + tax + charges — there may be a fee, deposit, or discount not captured above.`,
      });
    }
  }

  return results;
}
