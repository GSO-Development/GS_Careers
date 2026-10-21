<?php
require_once __DIR__ . '/config.php';

// Mock some data if needed, but we can just test the logic with existing data.
// Let's assume there's a candidate who applied for "Manager"
// and we are creating a new vacancy "Senior Manager".

function testMatching($title, $designation) {
    echo "Testing match for Title: '$title', Designation: '$designation'\n";
    
    // Preparation logic similar to handleGetSuggestions
    $titleKeywords = array_filter(explode(' ', strtolower($title)), function($word) {
        return strlen($word) > 2 && !in_array($word, ['and', 'the', 'for', 'with', 'job', 'vacancy']);
    });

    echo "Keywords: " . implode(', ', $titleKeywords) . "\n";

    $titleMatchSql = "";
    $params = [$designation];
    if (!empty($titleKeywords)) {
        $titleConditions = [];
        foreach ($titleKeywords as $keyword) {
            $titleConditions[] = "v.title LIKE ?";
            $params[] = "%$keyword%";
        }
        $titleMatchSql = " OR (" . implode(" AND ", $titleConditions) . ")";
    }

    $db = getDB();
    $sql = "SELECT DISTINCT a.email, v.title as prev_title, v.designation as prev_desig
            FROM applications a
            JOIN vacancies v ON a.vacancy_id = v.id
            WHERE a.future_consent = 1
              AND (v.designation = ? $titleMatchSql)
            LIMIT 5";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $results = $stmt->fetchAll();

    if (empty($results)) {
        echo "No matches found.\n";
    } else {
        echo "Matches found: " . count($results) . "\n";
        foreach ($results as $r) {
            echo " - {$r['email']} (Prev: {$r['prev_title']} / {$r['prev_desig']})\n";
        }
    }
    echo "-----------------------------------\n";
}

testMatching("Senior Manager", "Management");
testMatching("Software Engineer", "Engineering");
testMatching("Finance Assistant", "Finance");
?>
