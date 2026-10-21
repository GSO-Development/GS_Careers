<?php

$token = '(BIT\050Hons\051 in Networking and Mobile Computing)';
$rawStr = trim($token, '()');

// Unescape octal
$rawStr = preg_replace_callback('/\\\\([0-7]{1,3})/', function($m) {
    return chr(octdec($m[1]));
}, $rawStr);

$rawStr = str_replace(['\\\\', '\(', '\)', '\n', '\r', '\t'], ['\\', '(', ')', "\n", "\r", "\t"], $rawStr);

echo "Decoded token: " . var_export($rawStr, true) . "\n";
