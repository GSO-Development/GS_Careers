<?php
// ============================================
// Notifications API (Candidate Interview RSVPs)
// ============================================
require_once __DIR__ . '/../config.php';

$auth = verifyToken();
$action = $_GET['action'] ?? 'list';

switch ($action) {
    case 'list':
        listNotifications($auth);
        break;
    case 'unread_count':
        getUnreadCount($auth);
        break;
    case 'mark_read':
        markAsRead($auth);
        break;
    case 'mark_unread':
        markAsUnread($auth);
        break;
    case 'mark_all_read':
        markAllAsRead($auth);
        break;
    case 'delete':
        deleteNotification($auth);
        break;
    default:
        jsonResponse(400, 'Invalid action');
}

/**
 * List candidate notifications with role-based scoping and stats
 */
function listNotifications($auth)
{
    $db = getDB();
    $adminId = $auth['admin_id'];
    $role = $auth['role'];
    $userCompanyId = $auth['company_id'] ?? null;

    $status = sanitize($_GET['status'] ?? 'all');
    $search = sanitize($_GET['search'] ?? '');
    $filterCompanyId = sanitize($_GET['company_id'] ?? '');
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = max(1, min(100, (int)($_GET['limit'] ?? 25)));
    $offset = ($page - 1) * $limit;

    // Base conditions for scoping
    $whereConditions = [];
    $params = [$adminId]; // For nr.admin_id join

    // Role-based subsidiary filtering:
    // Sub Admin 1 & Sub Admin 2 can ONLY see notifications for their own subsidiary!
    // HR (admin) & Super Admin can see ALL notifications across all subsidiaries.
    if ($role === 'super_admin' || $role === 'admin') {
        if (!empty($filterCompanyId)) {
            $whereConditions[] = "n.company_id = ?";
            $params[] = $filterCompanyId;
        }
    } else {
        // Sub Admins (sub_admin1, sub_admin2, sub_admin)
        $whereConditions[] = "n.company_id = ?";
        $params[] = $userCompanyId;
    }

    // Filter by response status / tab
    if ($status === 'confirmed') {
        $whereConditions[] = "n.response_status = 'confirmed'";
    } else if ($status === 'declined') {
        $whereConditions[] = "n.response_status = 'declined'";
    } else if ($status === 'invited') {
        $whereConditions[] = "n.response_status = 'invited'";
    } else if ($status === 'unread') {
        $whereConditions[] = "nr.id IS NULL";
    }

    // Search query
    if (!empty($search)) {
        $searchTerm = "%$search%";
        $whereConditions[] = "(n.candidate_name LIKE ? OR n.candidate_email LIKE ? OR n.candidate_phone LIKE ? OR n.vacancy_title LIKE ? OR n.vacancy_ref LIKE ? OR n.company_name LIKE ?)";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }

    $whereSql = !empty($whereConditions) ? "WHERE " . implode(" AND ", $whereConditions) : "";

    // 1. Calculate overall stats for the scoped role
    $statsConditions = [];
    $statsParams = [];
    if ($role !== 'super_admin' && $role !== 'admin') {
        $statsConditions[] = "n.company_id = ?";
        $statsParams[] = $userCompanyId;
    } else if (!empty($filterCompanyId)) {
        $statsConditions[] = "n.company_id = ?";
        $statsParams[] = $filterCompanyId;
    }
    $statsWhere = !empty($statsConditions) ? "WHERE " . implode(" AND ", $statsConditions) : "";

    $statsQuery = "
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN n.response_status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_count,
            SUM(CASE WHEN n.response_status = 'declined' THEN 1 ELSE 0 END) as declined_count,
            SUM(CASE WHEN n.response_status = 'invited' THEN 1 ELSE 0 END) as invited_count,
            SUM(CASE WHEN nr.id IS NULL THEN 1 ELSE 0 END) as unread_count
        FROM notifications n
        LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.admin_id = ?
        $statsWhere
    ";
    $statsStmt = $db->prepare($statsQuery);
    $statsStmt->execute(array_merge([$adminId], $statsParams));
    $statsData = $statsStmt->fetch(PDO::FETCH_ASSOC);

    $totalCount = (int)($statsData['total'] ?? 0);
    $confirmedCount = (int)($statsData['confirmed_count'] ?? 0);
    $declinedCount = (int)($statsData['declined_count'] ?? 0);
    $invitedCount = (int)($statsData['invited_count'] ?? 0);
    $unreadCount = (int)($statsData['unread_count'] ?? 0);

    $respondedTotal = $confirmedCount + $declinedCount;
    $responseRate = ($respondedTotal + $invitedCount) > 0 
        ? round(($confirmedCount / max(1, $respondedTotal)) * 100, 1) 
        : 0;

    // 2. Count total rows matching current filtered query
    $countSql = "
        SELECT COUNT(*)
        FROM notifications n
        LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.admin_id = ?
        $whereSql
    ";
    $countStmt = $db->prepare($countSql);
    $countStmt->execute($params);
    $filteredTotal = (int)$countStmt->fetchColumn();

    // 3. Fetch notifications with company details
    $listSql = "
        SELECT 
            n.*,
            c.name as current_company_name,
            c.logo as company_logo,
            v.title as current_vacancy_title,
            v.reference_number as current_vacancy_ref,
            a.status as application_status,
            a.interview_confirmed as current_interview_confirmed,
            CASE WHEN nr.id IS NOT NULL THEN 1 ELSE 0 END as is_read,
            nr.read_at
        FROM notifications n
        LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.admin_id = ?
        LEFT JOIN companies c ON n.company_id = c.id
        LEFT JOIN vacancies v ON n.vacancy_id = v.id
        LEFT JOIN applications a ON n.application_id = a.id
        $whereSql
        ORDER BY n.created_at DESC, n.id DESC
        LIMIT $limit OFFSET $offset
    ";
    $listStmt = $db->prepare($listSql);
    $listStmt->execute($params);
    $notifications = $listStmt->fetchAll(PDO::FETCH_ASSOC);

    // Format fields for frontend
    $formatted = array_map(function ($item) {
        $item['is_read'] = (bool)$item['is_read'];
        $item['company_name'] = $item['current_company_name'] ?: $item['company_name'];
        $item['vacancy_title'] = $item['current_vacancy_title'] ?: $item['vacancy_title'];
        $item['vacancy_ref'] = $item['current_vacancy_ref'] ?: $item['vacancy_ref'];
        return $item;
    }, $notifications);

    jsonResponse(200, 'Notifications retrieved', [
        'notifications' => $formatted,
        'stats' => [
            'total' => $totalCount,
            'confirmed' => $confirmedCount,
            'declined' => $declinedCount,
            'invited' => $invitedCount,
            'unread' => $unreadCount,
            'response_rate' => $responseRate
        ],
        'unread_count' => $unreadCount,
        'pagination' => [
            'total' => $filteredTotal,
            'page' => $page,
            'limit' => $limit,
            'totalPages' => ceil($filteredTotal / $limit)
        ]
    ]);
}

/**
 * Fast unread count for sidebar / navbar badge polling
 */
function getUnreadCount($auth)
{
    $db = getDB();
    $adminId = $auth['admin_id'];
    $role = $auth['role'];
    $userCompanyId = $auth['company_id'] ?? null;

    $where = ["nr.id IS NULL"];
    $params = [$adminId];

    if ($role !== 'super_admin' && $role !== 'admin') {
        $where[] = "n.company_id = ?";
        $params[] = $userCompanyId;
    }

    $whereSql = "WHERE " . implode(" AND ", $where);

    $sql = "
        SELECT COUNT(*)
        FROM notifications n
        LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.admin_id = ?
        $whereSql
    ";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $unreadCount = (int)$stmt->fetchColumn();

    jsonResponse(200, 'Unread count retrieved', [
        'unread_count' => $unreadCount
    ]);
}

/**
 * Mark a single notification as read
 */
function markAsRead($auth)
{
    $db = getDB();
    $input = json_decode(file_get_contents('php://input'), true);
    $notificationId = (int)($input['id'] ?? ($_GET['id'] ?? 0));
    $adminId = $auth['admin_id'];

    if ($notificationId <= 0) {
        jsonResponse(400, 'Invalid notification ID');
    }

    $stmt = $db->prepare("
        INSERT INTO notification_reads (notification_id, admin_id, read_at)
        VALUES (?, ?, NOW())
        ON DUPLICATE KEY UPDATE read_at = NOW()
    ");
    $stmt->execute([$notificationId, $adminId]);

    jsonResponse(200, 'Notification marked as read');
}

/**
 * Mark a single notification as unread
 */
function markAsUnread($auth)
{
    $db = getDB();
    $input = json_decode(file_get_contents('php://input'), true);
    $notificationId = (int)($input['id'] ?? ($_GET['id'] ?? 0));
    $adminId = $auth['admin_id'];

    if ($notificationId <= 0) {
        jsonResponse(400, 'Invalid notification ID');
    }

    $stmt = $db->prepare("DELETE FROM notification_reads WHERE notification_id = ? AND admin_id = ?");
    $stmt->execute([$notificationId, $adminId]);

    jsonResponse(200, 'Notification marked as unread');
}

/**
 * Mark all visible notifications as read for current admin
 */
function markAllAsRead($auth)
{
    $db = getDB();
    $adminId = $auth['admin_id'];
    $role = $auth['role'];
    $userCompanyId = $auth['company_id'] ?? null;

    $where = ["nr.id IS NULL"];
    $params = [$adminId, $adminId];

    if ($role !== 'super_admin' && $role !== 'admin') {
        $where[] = "n.company_id = ?";
        $params[] = $userCompanyId;
    }

    $whereSql = "WHERE " . implode(" AND ", $where);

    // Insert read records for all unread visible notifications
    $sql = "
        INSERT IGNORE INTO notification_reads (notification_id, admin_id, read_at)
        SELECT n.id, ?, NOW()
        FROM notifications n
        LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.admin_id = ?
        $whereSql
    ";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    jsonResponse(200, 'All notifications marked as read');
}

/**
 * Delete a notification
 */
function deleteNotification($auth)
{
    $db = getDB();
    $input = json_decode(file_get_contents('php://input'), true);
    $notificationId = (int)($input['id'] ?? ($_GET['id'] ?? 0));
    $role = $auth['role'];
    $userCompanyId = $auth['company_id'] ?? null;

    if ($notificationId <= 0) {
        jsonResponse(400, 'Invalid notification ID');
    }

    // Sub admins can only delete their own subsidiary's notifications
    if ($role !== 'super_admin' && $role !== 'admin') {
        $check = $db->prepare("SELECT id FROM notifications WHERE id = ? AND company_id = ?");
        $check->execute([$notificationId, $userCompanyId]);
        if (!$check->fetch()) {
            jsonResponse(403, 'Permission denied');
        }
    }

    // Clean up reads first
    $db->prepare("DELETE FROM notification_reads WHERE notification_id = ?")->execute([$notificationId]);
    $db->prepare("DELETE FROM notifications WHERE id = ?")->execute([$notificationId]);

    jsonResponse(200, 'Notification deleted successfully');
}
