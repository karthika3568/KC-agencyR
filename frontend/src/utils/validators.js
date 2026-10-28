// Shared validation helpers for phone/pincode/GSTIN fields — reused by
// every form (staff, customer, supplier, branch) instead of each one
// re-implementing its own regex. Mirrors the backend checks in
// backend/src/Helpers/Validator.php so client and server agree.

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** 10-digit Indian mobile number, optionally blank (caller decides if required). */
export function isValidPhone(value) {
  const v = (value || '').trim();
  if (v === '') return true;
  return /^[6-9]\d{9}$/.test(v);
}

/** Exactly 6 digits. */
export function isValidPincode(value) {
  const v = (value || '').trim();
  if (v === '') return true;
  return /^\d{6}$/.test(v);
}

/** 15-char structure (2 state digits + 10 PAN chars + 1 entity num + Z + 1 check char). Blank is treated as valid (optional field). */
export function isValidGstin(value) {
  const v = (value || '').trim().toUpperCase();
  if (v === '') return true;
  return GSTIN_PATTERN.test(v);
}

export function isValidEmail(value) {
  const v = (value || '').trim();
  if (v === '') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
