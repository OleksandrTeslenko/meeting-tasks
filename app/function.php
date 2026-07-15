<?php

function sanitizeJSON($json)
{
	// $regex = '/^\{.*\:.*\}$/';
	if (empty($json) || !$json) throw new \Exception("Empty body", 400);
	if ($json == '' || $json == 'null' || strlen($json) < 3) throw new \Exception("Empty body", 400);
	// if (!preg_match($regex, $json)) throw new \Exception("Empty body3", 400);
	if (gettype($json) != 'string') throw new \Exception("Empty body", 400);
	// if (json_last_error() !== JSON_ERROR_NONE) throw new \Exception("Invalid JSON", 400);
}

function injection($value)
{
	if ((preg_match("(select|update|insert|delete|sleep|alert|script|replace|from|into|mysql_escape_string|mysql_real_escape_string|addslashes)", $value)) > 0) {
		$value = str_replace(array("select", "update", "insert", "delete", "sleep", "alert", "script", "replace", "from", "into", "mysql_escape_string", "mysql_real_escape_string", "addslashes"), "", $value);
	}
	$value = trim($value);
	$value = strip_tags($value);
	// if (!get_magic_quotes_gpc()) $value = addslashes($value);
	//$value = htmlspecialchars($value,ENT_QUOTES);
	$value = htmlspecialchars($value, ENT_NOQUOTES);
	// $value = str_replace(array("\n", "\r\n", "\r"), "", $value); // Remove line breaks
	// $value = str_replace("\n","<br>",$value);
	return $value;
}

function injectionData(array $data)
{
	foreach ($data as $key => $value) {
		if (gettype($value) == 'array') {
			$data[$key] = injectionData($value);
		} else {
			$data[$key] = injection($value);
		}
	}
	return $data;
}

function mb_ucfirst_str($string, string $encoding = 'UTF-8'): string
{
	$string = trim((string)$string);
	$firstChar = mb_substr($string, 0, 1, $encoding);
	$rest = mb_substr($string, 1, null, $encoding);
	return mb_strtoupper($firstChar, $encoding) . $rest;
}

function minutesToHoursAndMinutes(int $totalMinutes): array
{
	return [
		'hours'   => intdiv($totalMinutes, 60),
		'minutes' => $totalMinutes % 60
	];
}

function getAuthorizationHeader()
{
    $headers = null;
    if (isset($_SERVER['Authorization'])) {
        $headers = trim($_SERVER["Authorization"]);
    } elseif (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $headers = trim($_SERVER["HTTP_AUTHORIZATION"]);
    } elseif (function_exists('apache_request_headers')) {
        $requestHeaders = apache_request_headers();
        $requestHeaders = array_combine(array_map('ucwords', array_keys($requestHeaders)), array_values($requestHeaders));

        if (isset($requestHeaders['Authorization'])) {
            $headers = trim($requestHeaders['Authorization']);
        }
    }
    return $headers;
}
