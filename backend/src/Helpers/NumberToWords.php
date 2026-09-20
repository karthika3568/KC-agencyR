<?php

declare(strict_types=1);

namespace App\Helpers;

/**
 * INR amount-in-words for print (section 6.1): Indian grouping
 * (lakhs/crores), e.g. 123456.75 -> "One Lakh Twenty Three Thousand Four
 * Hundred Fifty Six Rupees and Seventy Five Paise Only".
 */
class NumberToWords
{
    private const ONES = [
        '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
        'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
    ];
    private const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    public static function convert(float $amount): string
    {
        $rupees = (int) floor($amount);
        $paise = (int) round(($amount - $rupees) * 100);

        $words = self::convertInt($rupees) . ' Rupees';
        if ($paise > 0) {
            $words .= ' and ' . self::convertInt($paise) . ' Paise';
        }

        return $words . ' Only';
    }

    private static function convertInt(int $n): string
    {
        if ($n === 0) {
            return 'Zero';
        }

        $parts = [];
        $crore = intdiv($n, 10000000);
        $n %= 10000000;
        $lakh = intdiv($n, 100000);
        $n %= 100000;
        $thousand = intdiv($n, 1000);
        $n %= 1000;
        $hundred = intdiv($n, 100);
        $rest = $n % 100;

        if ($crore > 0) {
            $parts[] = self::twoDigits($crore) . ' Crore';
        }
        if ($lakh > 0) {
            $parts[] = self::twoDigits($lakh) . ' Lakh';
        }
        if ($thousand > 0) {
            $parts[] = self::twoDigits($thousand) . ' Thousand';
        }
        if ($hundred > 0) {
            $parts[] = self::ONES[$hundred] . ' Hundred';
        }
        if ($rest > 0) {
            $parts[] = self::twoDigits($rest);
        }

        return implode(' ', $parts);
    }

    private static function twoDigits(int $n): string
    {
        if ($n < 20) {
            return self::ONES[$n];
        }
        $tens = intdiv($n, 10);
        $ones = $n % 10;
        return trim(self::TENS[$tens] . ' ' . ($ones > 0 ? self::ONES[$ones] : ''));
    }
}
