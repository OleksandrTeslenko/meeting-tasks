<?php
header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Origin: dtek-local-2.com");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Max-Age: 1000");
header("Access-Control-Allow-Headers: X-Requested-With, Content-Type, Origin, Cache-Control, Pragma, Authorization, Accept, Accept-Encoding");
header("Access-Control-Allow-Methods: PUT, POST, GET, OPTIONS, DELETE");
header("Content-type: application/json; charset=utf-8");
header("Strict-Transport-Security: max-age=31536000; includeSubDomains");
header("Pragma:no-cache");
header("Cache-Control:no-store, no-cache, must-revalidate");
header("Expires:0");

// --------------------  use for securyti https only -----------------------
$option = ($_SERVER['REQUEST_SCHEME'] == 'https') ? 1 : 0;
ini_set('session.cookie_httponly', $option);
ini_set('session.cookie_secure', $option);
// --------------------  use for securyti https only -----------------------

session_start();
set_time_limit(120);
ini_set('memory_limit', '64M');
ini_set('file_uploads', 0);
ini_set('post_max_size', '256M');

if (1) {
    ini_set('display_errors', 'stderr');
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);
} else {
    ini_set('display_startup_errors', 0);
    ini_set('display_errors', 'stdout');
    error_reporting(0);
}

if (!defined('__ROOT__')) define('__ROOT__', (dirname(__FILE__)));

require_once(__ROOT__ . "/vendor/autoload.php");

use Dotenv\Dotenv;

$baseDir = __ROOT__ . "/../";

if (file_exists($baseDir . '.env')) {
    if (method_exists(Dotenv::class, 'createImmutable')) {
        $dotenv = Dotenv::createImmutable($baseDir);
    } else {
        $dotenv = new Dotenv($baseDir);
    }
    $dotenv->load();
}

require_once(__ROOT__ . "/define.php");
require_once(__ROOT__ . "/function.php");

# class DB_PDO
if (!class_exists('DB_PDO')) require_once(__ROOT__ . "/classes/DB_PDO.php");

$settings = [
    "driver" => "mysql",
    "host" => DB_HOST,
    "database" => DB_NAME,
    "username" => DB_USER,
    "password" => DB_PASS,
    "charset" => "utf8",
    "collation" => "utf_general_ci",
    "prefix" => DB_PREFIX
];

$db_pdo = new DB_PDO($settings);

/* Prevent XSS input */
$_GET = filter_input_array(INPUT_GET, FILTER_SANITIZE_URL);
$_POST = filter_input_array(INPUT_POST, FILTER_UNSAFE_RAW);
$_COOKIE = filter_input_array(INPUT_COOKIE, FILTER_SANITIZE_URL);
$_REQUEST = (array)$_POST + (array)$_GET + (array)$_REQUEST;
$_REQUEST = injectionData($_REQUEST);
