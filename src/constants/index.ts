// =============================================================================
// App-wide Constants
// =============================================================================
// Centralized values used across multiple screens.
// Brand and problem-type lists drive the icon-grid selectors in the
// "Submit New Request" flow (customer side).
// =============================================================================

/**
 * Device brands shown as an icon grid when submitting a repair request.
 * "Other" is always last and reveals a free-text input field.
 */
export const DEVICE_BRANDS = [
  'Apple',
  'Samsung',
  'OnePlus',
  'Xiaomi',
  'Vivo',
  'Oppo',
  'Realme',
  'Google',
  'Other',
] as const;

/**
 * Problem types shown as an icon grid when submitting a repair request.
 * "Other" is always last and reveals a free-text input field.
 */
export const PROBLEM_TYPES = [
  'Cracked Screen',
  'Battery Issue',
  'Water Damage',
  'Speaker Problem',
  'Charging Port',
  'Camera Issue',
  'Software Issue',
  'Other',
] as const;

/**
 * Human-readable labels for repair request statuses.
 * Used in status badges and timeline displays.
 */
export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  completed: 'Completed',
};
