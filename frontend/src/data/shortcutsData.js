/**
 * KC Agency Centralized Keyboard Shortcuts Inventory
 * 
 * Grouped strictly into two verified sections:
 * 1. General Navigation
 * 2. POS Billing
 * 
 * All shortcuts verified against active event listeners in the application.
 */

export const GENERAL_NAVIGATION_SHORTCUTS = [
  {
    id: 'gen-esc',
    keys: ['Esc'],
    actionTa: 'மூட / பின்செல்ல',
    actionEn: 'Close popup / Go back',
  },
  {
    id: 'gen-enter',
    keys: ['Enter'],
    actionTa: 'அடுத்த கட்டம் / உறுதிசெய்',
    actionEn: 'Next field / Submit',
  },
  {
    id: 'gen-arrows-v',
    keys: ['↑', '↓'],
    separator: '/',
    actionTa: 'மேலே / கீழே நகர',
    actionEn: 'Move up / down',
  },
  {
    id: 'gen-arrows-h',
    keys: ['←', '→'],
    separator: '/',
    actionTa: 'தாவல்கள் / பக்கவாட்டில்',
    actionEn: 'Switch tabs / Sideways',
  },
  {
    id: 'gen-shift-enter',
    keys: ['Shift + Enter'],
    actionTa: 'புதிய வரியைத் தொடங்க',
    actionEn: 'New line in text',
  },
  {
    id: 'gen-space',
    keys: ['Space'],
    actionTa: 'தேர்வு செய்ய / அழுத்த',
    actionEn: 'Toggle checkbox / Button',
  },
  {
    id: 'gen-home-end',
    keys: ['Home', 'End'],
    separator: '/',
    actionTa: 'தொடக்கம் / முடிவுக்குச் செல்ல',
    actionEn: 'Jump to start / end',
  },
];

export const POS_BILLING_SHORTCUTS = [
  {
    id: 'pos-save',
    keys: ['F6', 'Ctrl + S'],
    separator: '/',
    actionTa: 'பில் சேமிக்க / பணம் செலுத்த',
    actionEn: 'Save bill / Proceed to pay',
  },
  {
    id: 'pos-enter',
    keys: ['Enter'],
    actionTa: 'பொருளைச் சேர்க்க / தேர்வு',
    actionEn: 'Add product / Select',
  },
  {
    id: 'pos-tab',
    keys: ['Tab'],
    actionTa: 'பில் அட்டவணைக்குச் செல்ல',
    actionEn: 'Jump to cart table',
  },
  {
    id: 'pos-arrows-v',
    keys: ['↑', '↓'],
    separator: '/',
    actionTa: 'வரிசைகள் / பொருட்களுக்கு',
    actionEn: 'Move rows / items',
  },
  {
    id: 'pos-arrows-h',
    keys: ['←', '→'],
    separator: '/',
    actionTa: 'கட்டங்களுக்கு / கட்டண முறை',
    actionEn: 'Switch cell / Payment',
  },
  {
    id: 'pos-esc',
    keys: ['Esc'],
    actionTa: 'ரத்து / POS-க்குத் திரும்பு',
    actionEn: 'Cancel / Return to POS',
  },
];

// Compatibility exports
export const GENERAL_SHORTCUTS = GENERAL_NAVIGATION_SHORTCUTS;
export const MODULE_CATEGORIES = [
  {
    id: 'pos',
    nameTa: 'POS பில்லிங்',
    nameEn: 'POS Billing',
    items: POS_BILLING_SHORTCUTS,
  },
];

export const SHORTCUTS_DATA = [
  ...GENERAL_NAVIGATION_SHORTCUTS.map((s) => ({ ...s, category: 'general', moduleEn: 'General Navigation', moduleTa: 'பொதுவான வழிகாட்டுதல்' })),
  ...POS_BILLING_SHORTCUTS.map((s) => ({ ...s, category: 'pos', moduleEn: 'POS Billing', moduleTa: 'POS பில்லிங்' })),
];
