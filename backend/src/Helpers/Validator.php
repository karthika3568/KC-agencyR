<?php

declare(strict_types=1);

namespace App\Helpers;

/**
 * Shared field-format checks for phone/pincode/GSTIN — reused by every
 * controller that accepts these fields (staff, customers, suppliers,
 * branches) instead of each one re-implementing its own regex. Mirrors
 * the frontend checks in frontend/src/utils/validators.js so client and
 * server agree. Every check treats a blank string as valid — callers that
 * require the field non-empty must check that separately.
 */
class Validator
{
    private const GSTIN_PATTERN = '/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/';

    public static function isValidPhone(?string $value): bool
    {
        $v = trim((string) $value);
        if ($v === '') {
            return true;
        }
        return (bool) preg_match('/^[6-9]\d{9}$/', $v);
    }

    public static function isValidPincode(?string $value): bool
    {
        $v = trim((string) $value);
        if ($v === '') {
            return true;
        }
        return (bool) preg_match('/^\d{6}$/', $v);
    }

    public static function isValidGstin(?string $value): bool
    {
        $v = strtoupper(trim((string) $value));
        if ($v === '') {
            return true;
        }
        return (bool) preg_match(self::GSTIN_PATTERN, $v);
    }
}
