<?php
require_once __DIR__ . '/backend/config.php';

try {
    $db = getDB();
    
    echo "Starting migration...\n";
    
    $queries = [
        "ALTER TABLE applications ADD COLUMN IF NOT EXISTS interview_type VARCHAR(50) DEFAULT NULL AFTER rejection_reason",
        "ALTER TABLE applications ADD COLUMN IF NOT EXISTS interview_date DATE DEFAULT NULL AFTER interview_type",
        "ALTER TABLE applications ADD COLUMN IF NOT EXISTS interview_time VARCHAR(50) DEFAULT NULL AFTER interview_date",
        "ALTER TABLE applications ADD COLUMN IF NOT EXISTS interview_location TEXT DEFAULT NULL AFTER interview_time"
    ];
    
    foreach ($queries as $sql) {
        echo "Executing: $sql\n";
        $db->exec($sql);
    }
    
    echo "Migration completed successfully!\n";
} catch (Exception $e) {
    echo "MIGRATION ERROR: " . $e->getMessage() . "\n";
}
?>
