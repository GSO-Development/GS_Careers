<?php
require_once __DIR__ . '/config.php';
$db = getDB();
$count = $db->exec("UPDATE applications SET status = 'pending' WHERE status IS NULL OR status = ''");
echo "Fixed $count application rows with empty/null status.\n";
