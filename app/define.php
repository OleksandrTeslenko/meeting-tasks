<?php

const ENV_REQUIRED = [
    'DB_HOST',
    'DB_USER',
    'DB_PASS',
    'DB_NAME',
	'TOKEN'
];

const ENV_LOCAL = [
    'DB_HOST'   => 'localhost',
    'DB_USER'   => '',
    'DB_PASS'   => '',
    'DB_NAME'   => '',
    'DB_PREFIX' => '',
    'DB_PORT'   => 3306,
    'TOKEN'     => ''
];

function env(string $key, $default = false)
{
    return $_ENV[$key] ?? getenv($key) ?: $default;
}

foreach (ENV_LOCAL as $key => $value) {
    if (!isset($_ENV[$key]) && getenv($key) === false) {
        $_ENV[$key] = $value;
        putenv("$key=$value");
    }
}

# MariaDB
define('DB_HOST', env('DB_HOST'));
define('DB_USER', env('DB_USER'));
define('DB_PASS', env('DB_PASS', ''));
define('DB_NAME', env('DB_NAME'));
define('DB_PREFIX', env('DB_PREFIX', ''));
define('DB_PORT', env('DB_PORT', 3306));

# Token for auth
define('TOKEN', env('TOKEN', ''));

foreach (ENV_REQUIRED as $key) {
    if (!hasEnv($key)) {
        throw new \RuntimeException("Missing required env: {$key}");
    }
}

function envNotEmpty(string $key): bool
{
    $value = $_ENV[$key] ?? getenv($key);
    return $value !== null && $value !== false && $value !== '';
}

function hasEnv(string $key): bool
{
    return array_key_exists($key, $_ENV) || getenv($key) !== false;
}
