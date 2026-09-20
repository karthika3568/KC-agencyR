<?php

declare(strict_types=1);

namespace App\Helpers;

class CodeGenerator
{
    /**
     * Builds a code like "BRD00001" from a row's own auto-increment id, once
     * it's known post-insert. Zero-pads to 5 digits.
     */
    public static function fromId(string $prefix, int $id): string
    {
        return $prefix . str_pad((string) $id, 5, '0', STR_PAD_LEFT);
    }
}
