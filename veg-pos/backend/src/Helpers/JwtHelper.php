<?php

declare(strict_types=1);

namespace App\Helpers;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class JwtHelper
{
    /**
     * @param array<string, mixed> $claims
     */
    public static function issue(array $claims): string
    {
        $config = require __DIR__ . '/../../config/config.php';
        $now = time();

        $payload = array_merge([
            'iss' => $config['jwt']['issuer'],
            'iat' => $now,
            'exp' => $now + $config['jwt']['access_ttl'],
        ], $claims);

        return JWT::encode($payload, $config['jwt']['secret'], 'HS256');
    }

    /**
     * @return array<string, mixed>
     * @throws \Exception when the token is invalid or expired
     */
    public static function verify(string $token): array
    {
        $config = require __DIR__ . '/../../config/config.php';
        $decoded = JWT::decode($token, new Key($config['jwt']['secret'], 'HS256'));

        return (array) $decoded;
    }
}
