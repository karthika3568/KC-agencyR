<?php

declare(strict_types=1);

namespace App\Helpers;

/**
 * Thrown for request-input problems that should surface as 422 to the
 * client (e.g. deductions exceeding the sellable total), as opposed to an
 * unexpected server/database failure which stays a 500.
 */
class ValidationException extends \RuntimeException
{
}
