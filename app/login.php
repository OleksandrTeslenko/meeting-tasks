<?php

$success = false;
$error = 1;
$message = 'Authorization error, access denied!';

try {
	include('autoload.php');

    ini_set('display_errors', 'stderr');
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);

    set_time_limit(300);

    $headers = getAuthorizationHeader();

    if (!empty($headers)) {
        preg_match('/Bearer\s(\S+)/', $headers, $matches);
        $lgnpwd = explode(':', urldecode(base64_decode($matches[1])));

        if (!empty($lgnpwd) && count($lgnpwd) == 2) {
            $login = ($lgnpwd[0] && trim($lgnpwd[0]) != '') ? trim($lgnpwd[0]) : false;
            $pswd = ($lgnpwd[1] && trim($lgnpwd[1]) != '') ? trim($lgnpwd[1]) : false;

            if ($login && $pswd) {
                $token_sha256 = hash('sha256', sprintf('%s###%s', $login, $pswd));

                if ($token_sha256 == TOKEN) {
                    $success = true;
                    $error = 0;
                    $message = 'Ok';
                    
                    $_SESSION['auth_verify'] = '1';
                }
            }
        }
    }
} catch (Exception $e) {
    $message = 'Exception: ' . $e->getMessage();
    $error = 6;
    $success = false;
    $result = array();
}

echo json_encode(array('success' => $success, 'error' => $error, 'message' => $message));
exit;
