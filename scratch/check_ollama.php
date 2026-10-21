<?php

$ch = curl_init('http://localhost:11434/api/tags');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 3);
$res = curl_exec($ch);
curl_close($ch);
echo "Ollama localhost: " . ($res ? $res : "Offline") . "\n";

$ch2 = curl_init('http://172.16.7.21:11434/api/tags');
curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch2, CURLOPT_TIMEOUT, 3);
$res2 = curl_exec($ch2);
curl_close($ch2);
echo "Ollama 172.16.7.21: " . ($res2 ? $res2 : "Offline") . "\n";
