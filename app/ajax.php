<?php

$success = true;
$error = 0;
$message = 'Ok';
$result = array();
$local = (isset($_REQUEST['local'])) ? $_REQUEST['local'] : 'ua';
$positions = ['developer' => 'DEV','project manager' => 'PM','supervisor' => 'SUP','system administrator' => 'SA','tester' => 'QA'];
$person_state = [0 => 'Працює', 1 => 'Звільнено']; // $person_state = [0 => 'Worked', 1 => 'Fired'];

try {
    if (isset($_GET['ping'])) {
        header('Content-Type: application/json');
        echo json_encode(['status' => 'ok']);
        exit;
    }

    include('autoload.php');

    if (!isset($_SESSION['auth_verify']) || session_id() == "") {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 1, 'message' => 'unauthorized', 'result' => $result]);
        exit;
    }

    if (isset($_REQUEST['getPeople'])) {
        $where = '';
        $all = (isset($_REQUEST['all'])) ? 1 : 0;
        $search = (isset($_REQUEST['search'])) ? trim((string)$_REQUEST['search']) : false;
        $params = [];

        if (!$all) {
            $where .= ' AND `deleted` = 0';
        }

        if ($search) {
            $params['search'] = $search;
            $where .= " AND (`name` LIKE CONCAT('%', :search, '%') OR `surname` LIKE CONCAT('%', :search, '%') OR `patronymic` LIKE CONCAT('%', :search, '%') OR `position` LIKE CONCAT('%', :search, '%'))";
        }

        $query = "SELECT `id`, `name`, `surname`, `patronymic`, `position`, `sex`, `deleted`, `phone`, `email`
			FROM `users`
			WHERE 1=1 $where
			ORDER BY `deleted` ASC,
				CASE 
					WHEN `position` = 'developer' THEN 1
					WHEN `position` = 'system administrator' THEN 2
					WHEN `position` = 'project manager' THEN 3
					ELSE 100
				END,
				IF(`surname` IS NULL, `name`, `surname`), `name` ASC;";

        $result = $db_pdo->query($query, $params);

        $result = array_map(function ($item) use ($positions, $person_state) {
            if (((int)$item['sex'] == 1)) {
                $icon = ($item['position'] == 'developer') ? 'man' : 'technicalsupport_man';
                if ($item['position'] == 'supervisor') {
                    $icon = 'man_2';
                }
                if ($item['position'] == 'system administrator') {
                    $icon = 'man_3';
                }
            } else {
                $icon = ($item['position'] == 'developer') ? 'woman' : 'technicalsupport_woman';
                if ($item['position'] == 'tester') {
                    $icon = 'woman_2';
                }
            }


            $fio = ($item['surname'] ?? '') .
                (!empty($item['name']) ? ' ' . mb_strtoupper(mb_substr(trim($item['name']), 0, 1)) . '.' : '') .
                (!empty($item['patronymic']) ? mb_strtoupper(mb_substr(trim($item['patronymic']), 0, 1)) . '.' : '');


            return [
                'id' => (int)$item['id'],
                'fio' => $fio,
                'name' => mb_ucfirst_str($item['name']),
                'surname' => mb_ucfirst_str($item['surname']),
                'patronymic' => mb_ucfirst_str($item['patronymic']),
                'position' => mb_ucfirst_str($item['position']),
                'position_short' => $positions[$item['position']],
                'sex' => (int)$item['sex'],
                'deleted' => (int)$item['deleted'],
                'state' => $person_state[(int)$item['deleted']],
                'icon' => $icon . '.png',
                'phone' => (string)$item['phone'],
                'email' => (string)$item['email']
            ];
        }, $result);
    }

    if (isset($_REQUEST['getTasks'])) {
        $page = (isset($_REQUEST['page'])) ? (int)$_REQUEST['page'] - 1 : 0;
        $limit = (isset($_REQUEST['limit'])) ? (int)$_REQUEST['limit'] : 25;
        $user_id = (isset($_REQUEST['user_id'])) ? (int)$_REQUEST['user_id'] : 0;
        $search = (isset($_REQUEST['search'])) ? trim((string)$_REQUEST['search']) : false;
        $filter = (isset($_REQUEST['filter'])) ? (int)$_REQUEST['filter'] : 0;
        $position = (isset($_REQUEST['position'])) ? strtolower($_REQUEST['position']) : false;
        $limit =  " LIMIT " . ($page * $limit) . "," . $limit;
        $where = "";
        $where_state = "";
        $params = ['user_id' => $user_id];

        if ($position) {
            if ($position == 'developer' || $position == 'system administrator') {
                $where .= " AND u2.`id` = :user_id";
            } else {
                $where .= " AND u.`id` = :user_id";
            }
        } else {
            $where .= " AND u2.`id` = :user_id";
        }

        if ($search) {
            $params['search'] = $search;
            $where .= " AND (t.`name` LIKE CONCAT('%', :search, '%') OR t.`project` LIKE CONCAT('%', :search, '%'))";
        }

        $where_state = $where;
        $params_state = $params;

        if ($filter) {
            $params['status'] = (int)$filter;
            $where .= " AND t.`status` = :status";
        } else {
            // $where .= " AND t.`status` IN (1,2,3)";
        }

        $query = "SELECT COUNT(*) AS `all`
                ,SUM(CASE WHEN t.`status` IN (1, 2, 3) THEN 1 ELSE 0 END) AS `active`
                ,SUM(CASE WHEN t.`status` IN (1) THEN 1 ELSE 0 END) AS `line`
                ,SUM(CASE WHEN t.`status` IN (2) THEN 1 ELSE 0 END) AS `work`
                ,SUM(CASE WHEN t.`status` IN (3) THEN 1 ELSE 0 END) AS `review`
                ,SUM(CASE WHEN t.`status` IN (4) THEN 1 ELSE 0 END) AS `ready`
                ,SUM(CASE WHEN t.`status` IN (5) THEN 1 ELSE 0 END) AS `rejected`
                ,SUM(CASE WHEN t.`status` IN (6) THEN 1 ELSE 0 END) AS `suspended`
                ,SUM(CASE WHEN t.`status` IN (7) THEN 1 ELSE 0 END) AS `review_client`
            FROM `tasks` t
            INNER JOIN `status` st ON t.`status` = st.`id`
            INNER JOIN `users` u ON t.`responsible_pm` = u.`id`
            INNER JOIN `users` u2 ON t.`assigned_to` = u2.`id`
            WHERE t.`deleted` = 0 $where_state;";

        $status_data = $db_pdo->query($query, $params_state)[0];

        switch ($filter) {
            case 1:
                $total = $status_data['line'];
                break;
            case 2:
                $total = $status_data['work'];
                break;
            case 3:
                $total = $status_data['review'];
                break;
            case 4:
                $total = $status_data['ready'];
                break;
            case 5:
                $total = $status_data['rejected'];
                break;
            case 6:
                $total = $status_data['suspended'];
                break;
            case 7:
                $total = $status_data['review_client'];
                break;
            default:
                $total = $status_data['all'];
                break;
        }

        $query = "SELECT t.`id`, t.`name`, t.`project`, t.`description`, t.`priority`, t.`source`, t.`type`, t.`estimate`, 
                DATE(t.`date_creating`) AS `date_creating`, DATE(t.`date_editing`) AS `date_editing`, t.`planned_execution_date`, 
                t.`status` AS `status_id`, st.`name` AS `status_name`, st.`name_lat` AS `status_name_lat`,
                t.`responsible_pm` AS `responsible_pm_id`, u.`name` AS `responsible_pm_name`, u.`surname` AS `responsible_pm_surname`,
                t.`assigned_to` AS `assigned_to_id`, u2.`name` AS `assigned_to_name`, u2.`surname` AS `assigned_to_surname`,
                IF(t.`status` = 2, 0, t.`status`) AS `sort_status`
            FROM `tasks` t
            INNER JOIN `status` st ON t.`status` = st.`id`
            INNER JOIN `users` u ON t.`responsible_pm` = u.`id`
            INNER JOIN `users` u2 ON t.`assigned_to` = u2.`id`
            WHERE t.`deleted` = 0 $where
            ORDER BY t.`priority`, t.`date_creating` ASC, `sort_status`, t.`name` ASC
            $limit;";

        $tasks = $db_pdo->query($query, $params);

        $tasks = array_map(function ($item) {
            $planned_execution_date = ($item['planned_execution_date']) ? $item['planned_execution_date'] : '';
            $source = trim((string)$item['source']);

            return [
                'id' => (int)$item['id'],
                'title' => mb_ucfirst_str($item['name']),
                'project' => mb_ucfirst_str($item['project']),
                'description' => mb_ucfirst_str($item['description']),
                'source' => $source,
                'short_source' => (strlen($source) > 80) ? substr($source, 0, 80) . '...' : $source,
                'priority' => (int)$item['priority'],
                'type' => (int)$item['type'],
                'status_id' => (int)$item['status_id'],
                'status_name' => (string)$item['status_name'],
                'status_name_lat' => (string)$item['status_name_lat'],
                'responsiblePM' => (int)$item['responsible_pm_id'],
                'responsiblePMName' => (string) $item['responsible_pm_surname'] . ' ' . $item['responsible_pm_name'],
                'assignedTo' => (int)$item['assigned_to_id'],
                'assignedToName' => (string) $item['assigned_to_surname'] . ' ' . $item['assigned_to_name'],
                'createdAt' => (string)$item['date_creating'],
                'updatedAt' => (string)$item['date_editing'],
                'planned_execution_date' => $planned_execution_date,
                'estimate' => minutesToHoursAndMinutes($item['estimate'])
            ];
        }, $tasks);

        $result = ['tasks' => $tasks, 'statuses' => $status_data, 'total' => $total];
    }

    if (isset($_REQUEST['getTask'])) {
        $taskId = (isset($_REQUEST['taskId'])) ? (int)$_REQUEST['taskId'] : 0;
        $params = ['taskId' => $taskId];

        $query = "SELECT t.`id`, t.`name`, t.`project`, t.`description`, t.`priority`, t.`source`, t.`type`,
			t.`status`, t.`responsible_pm`, t.`assigned_to`, t.`estimate`, t.`planned_execution_date`
		FROM `tasks` t
		WHERE t.`id` = :taskId;";

        $data = $db_pdo->query($query, $params);

        if (!empty($data)) {
            $data = $data[0];
            $planned_execution_date = ($data['planned_execution_date']) ? $data['planned_execution_date'] : '';

            $result = [
                'id' => (int)$data['id'],
                'title' => mb_ucfirst_str($data['name']),
                'project' => mb_ucfirst_str($data['project']),
                'description' => mb_ucfirst_str($data['description']),
                'source' => trim((string)$data['source']),
                'priority' => (int)$data['priority'],
                'type' => (int)$data['type'],
                'status_id' => (int)$data['status'],
                'responsiblePM' => (int)$data['responsible_pm'],
                'assignedTo' => (int)$data['assigned_to'],
                'planned_execution_date' => $planned_execution_date,
                'estimate' => minutesToHoursAndMinutes($data['estimate'])
            ];
        }
    }

    if (isset($_REQUEST['getTaskHistory'])) {
        $taskId = (isset($_REQUEST['taskId'])) ? (int)$_REQUEST['taskId'] : 0;

        $query = "SELECT t.`id`, t.`task_id`, t.`name`, t.`project`, t.`description`, t.`priority`, t.`source`,
			DATE(t.`date_creating`) AS `date_creating`, t.`datetime`, t.`action`,
			t.`status` AS `status_id`, st.`name` AS `status_name`, st.`name_lat` AS `status_name_lat`,
			t.`responsible_pm` AS `responsible_pm_id`, u.`name` AS `responsible_pm`,
			t.`assigned_to` AS `assigned_to_id`, u2.`name` AS `assigned_to`
		FROM `tasks_history` t
		INNER JOIN `status` st ON t.`status` = st.`id`
		INNER JOIN `users` u ON t.`responsible_pm` = u.`id`
		INNER JOIN `users` u2 ON t.`assigned_to` = u2.`id`
		WHERE t.`task_id` = :taskId ORDER BY t.`id` ASC;";

        $result = $db_pdo->query($query, ['taskId' => $taskId]);

        $result = array_map(function ($item) {
            return [
                'id' => (int)$item['id'],
                'task_id' => (int)$item['task_id'],
                'title' => mb_ucfirst_str($item['name']),
                'datetime' => trim((string)$item['datetime']),
                'action' => trim((string)$item['action']),
                'project' => mb_ucfirst_str($item['project']),
                'description' => mb_ucfirst_str($item['description']),
                'source' => trim((string)$item['source']),
                'priority' => (int)$item['priority'],
                'status_name' => (string)$item['status_name'],
                'responsiblePMName' => (string)$item['responsible_pm'],
                'assignedToName' => (string)$item['assigned_to'],
            ];
        }, $result);
    }

    if (isset($_REQUEST['setTaskStatus'])) {
        $taskId = (isset($_REQUEST['taskId'])) ? (int)$_REQUEST['taskId'] : 0;
        $newStatus = (isset($_REQUEST['newStatus'])) ? (int)$_REQUEST['newStatus'] : 0;

        if (!$taskId || !$newStatus) {
            $success = false;
            $error = 1;
            $message = 'Error, bad request parameters!';
        } else {
            $query = "UPDATE `tasks` SET `status` = :newStatus, `date_editing` = NOW() WHERE `id` = :taskId;";

            $params = [
                'taskId' => $taskId,
                'newStatus' => $newStatus
            ];

            $db_pdo->query($query, $params);
        }
    }

    if (isset($_REQUEST['setTaskPriority'])) {
        $taskId = (isset($_REQUEST['taskId'])) ? (int)$_REQUEST['taskId'] : 0;
        $newPriority = (isset($_REQUEST['newPriority'])) ? (int)$_REQUEST['newPriority'] : 0;

        if (!$taskId || !$newPriority) {
            $success = false;
            $error = 1;
            $message = 'Error, bad request parameters!';
        } else {
            $query = "UPDATE `tasks` SET `priority` = :newPriority, `date_editing` = NOW() WHERE `id` = :taskId;";

            $params = [
                'taskId' => $taskId,
                'newPriority' => $newPriority
            ];

            $db_pdo->query($query, $params);
        }
    }

    if (isset($_REQUEST['submitTask'])) {
        $taskId         = isset($_REQUEST['taskId']) ? (int)$_REQUEST['taskId'] : null;
        $title          = trim($_REQUEST['taskTitle'] ?? '');
        $projectName    = trim($_REQUEST['projectName'] ?? '');
        $responsiblePM  = (int)($_REQUEST['responsiblePM'] ?? 0);
        $assignedTo     = (int)($_REQUEST['assignedTo'] ?? 0);
        $description    = trim($_REQUEST['taskDescription'] ?? '');
        $status         = (int)($_REQUEST['taskStatus'] ?? 1);
        $priority       = (int)($_REQUEST['taskPriority'] ?? 4);
        $type       	= (int)($_REQUEST['taskType'] ?? 3);
        $source         = trim($_REQUEST['taskSource'] ?? '');
        $estimate_h     = (int)($_REQUEST['taskEstimateHour'] ?? 1);
        $estimate_min   = (int)($_REQUEST['taskEstimateMinute'] ?? 1);
        $PED         	= trim($_REQUEST['taskPlannedExecutionDate'] ?? null);

        $estimate = $estimate_h * 60 + $estimate_min;

        if ($title === '' || !$responsiblePM || !$assignedTo || !isset($_REQUEST['taskPriority'])) {
            $success = false;
            $error = 1;
            $message = 'Будь ласка, заповніть усі поля';
        } else {
            $params = [
                'title' => $title,
                'project_name' => $projectName,
                'responsible_pm' => $responsiblePM,
                'assigned_to' => $assignedTo,
                'description' => $description,
                'status_id' => $status,
                'priority' => $priority,
                'source' => $source,
                'type' => $type,
                'estimate' => $estimate,
                'PED' => $PED
            ];

            if ($taskId) {
                $params['taskId'] = $taskId;

                $query = "UPDATE `tasks` SET `name` = :title, `project` = :project_name, `description` = :description, `responsible_pm` = :responsible_pm, `assigned_to` = :assigned_to, `status` = :status_id, `priority` = :priority, `source` = :source, `date_editing` = NOW(), `type` = :type, `estimate` = :estimate, `planned_execution_date` = :PED WHERE `id` = :taskId;";
            } else {
                $query = "INSERT INTO `tasks` (`name`, `project`, `description`, `responsible_pm`, `assigned_to`, `status`, `priority`, `source`, `type`, `estimate`, `planned_execution_date`) VALUE (:title, :project_name, :description, :responsible_pm, :assigned_to, :status_id, :priority, :source, :type, :estimate, :PED)";
            }

            $db_pdo->query($query, $params);
        }
    }

    if (isset($_REQUEST['submitPerson'])) {
        $personId         	= isset($_REQUEST['personId']) ? (int)$_REQUEST['personId'] : null;
        $personSurname  	= trim($_REQUEST['personSurname'] ?? '');
        $personName       	= trim($_REQUEST['personName'] ?? '');
        $personPatronymic  	= trim($_REQUEST['personPatronymic'] ?? '');
        $personPosition   	= lcfirst(trim($_REQUEST['personPosition'] ?? ''));
        $personSex          = (int)($_REQUEST['personSex'] ?? 1);
        $personState       	= (int)($_REQUEST['personState'] ?? 0);
        $personPhone  		= trim($_REQUEST['personPhone'] ?? '');
        $personEmail  		= trim($_REQUEST['personEmail'] ?? '');

        if ($personName === '' || $personSurname === '' || $personPosition === '') {
            $success = false;
            $error = 1;
            $message = 'Будь ласка, заповніть усі поля';
        } else {
            $params = [
                'name' => $personName,
                'surname' => $personSurname,
                'patronymic' => $personPatronymic,
                'position' => $personPosition,
                'sex' => $personSex,
                'state' => $personState,
                'phone' => $personPhone,
                'email' => $personEmail
            ];

            if ($personId) {
                $params['personId'] = $personId;

                $query = "UPDATE `users` SET `name` = :name, `surname` = :surname, `patronymic` = :patronymic, `position` = :position, `sex` = :sex, `date_editing` = NOW(), `deleted` = :state, `phone` = :phone, `email` = :email WHERE `id` = :personId;";
            } else {
                $query = "INSERT INTO `users` (`name`, `surname`, `patronymic`, `position`, `sex`, `date_creating`, `deleted`, `phone`, `email`) VALUE (:name, :surname, :patronymic, :position, :sex, NOW(), :state, :phone, :email)";
            }

            $db_pdo->query($query, $params);
        }
    }
} catch (Exception $e) {
    $message = 'Exception: ' . $e->getMessage();
    $error = 6;
    $success = false;
    $result = array();
}

echo json_encode(array('success' => $success, 'error' => $error, 'message' => $message, 'result' => $result));
