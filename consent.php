<?php
// CookieFer proof of consent (GDPR Art. 7): stores one JSON line per choice in
// ~/cookie-fer-consents/YYYY-MM.jsonl, outside the web root. No IP address or other personal data is stored.
// Written for old PHP versions as well (5.6+), since the web PHP version of the server is not fixed.
//
// Command line:
//   php consent.php stats [YYYY-MM]    choices per site for a month (default: this month)
//   php consent.php find <consent id>  every record of one consent ID
//   php consent.php prune <months>     delete files older than <months> months

ini_set('display_errors', '0');
// The web PHP runs as a different user (ferplus2-www) than the account (ferplus2): files must stay group-writable,
// and nobody else may read them.
umask(0007);

// Created once on the server with `mkdir ~/cookie-fer-consents && chmod 2770 ~/cookie-fer-consents`:
// the web PHP may not create folders in the home directory itself.
$dataDir = dirname(dirname(__DIR__)) . '/cookie-fer-consents';
$keys = array('adStorage', 'adUserData', 'adPersonalization', 'analyticsStorage',
    'functionalityStorage', 'personalizationStorage', 'securityStorage');

if (PHP_SAPI === 'cli') {
    runCommand($argv, $dataDir);
    exit;
}

header('Access-Control-Allow-Origin: *');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Methods: POST');
    header('Access-Control-Allow-Headers: Content-Type');
    http_response_code(204);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

$input = json_decode((string) file_get_contents('php://input', false, null, 0, 4096), true);
$id = is_array($input) && isset($input['id']) && is_string($input['id']) ? strtolower($input['id']) : '';
if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/', $id)) {
    http_response_code(400);
    exit;
}

// The browser's Origin header is more trustworthy than the host the script reports.
$host = requestHost();
if ($host === '' && isset($input['host']) && is_string($input['host'])) {
    $host = strtolower($input['host']);
}
if (!preg_match('/^[a-z0-9.-]{1,253}$/', $host)) {
    http_response_code(400);
    exit;
}

$given = isset($input['settings']) && is_array($input['settings']) ? $input['settings'] : array();
$settings = array();
foreach ($keys as $key) {
    $settings[$key] = !empty($given[$key]);
}
$action = isset($input['action']) && in_array($input['action'], array('accept', 'refuse', 'save'), true) ? $input['action'] : 'save';
$version = isset($input['version']) && is_scalar($input['version']) ? substr((string) $input['version'], 0, 64) : null;
$language = isset($input['language']) && is_string($input['language']) && preg_match('/^[a-z]{2}$/', $input['language']) ? $input['language'] : null;

$record = array(
    'time' => gmdate('c'),
    'id' => $id,
    'host' => $host,
    'action' => $action,
    'settings' => $settings,
    'version' => $version,
    'language' => $language,
);

if (!is_dir($dataDir) && !@mkdir($dataDir, 0700, true)) {
    http_response_code(500);
    exit;
}
$written = file_put_contents($dataDir . '/' . gmdate('Y-m') . '.jsonl', json_encode($record) . "\n", FILE_APPEND | LOCK_EX);
http_response_code($written === false ? 500 : 204);

function requestHost()
{
    foreach (array('HTTP_ORIGIN', 'HTTP_REFERER') as $header) {
        if (!empty($_SERVER[$header])) {
            $host = parse_url($_SERVER[$header], PHP_URL_HOST);
            if ($host) {
                return strtolower($host);
            }
        }
    }
    return '';
}

function readRecords($file)
{
    $records = array();
    foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $record = json_decode($line, true);
        if (is_array($record)) {
            $records[] = $record;
        }
    }
    return $records;
}

function runCommand($argv, $dataDir)
{
    $command = isset($argv[1]) ? $argv[1] : '';

    if ($command === 'stats') {
        $month = isset($argv[2]) ? $argv[2] : gmdate('Y-m');
        $file = $dataDir . '/' . $month . '.jsonl';
        if (!preg_match('/^\d{4}-\d{2}$/', $month) || !is_file($file)) {
            echo "No records for $month\n";
            return;
        }
        $sites = array();
        foreach (readRecords($file) as $record) {
            $host = $record['host'];
            if (!isset($sites[$host])) {
                $sites[$host] = array('total' => 0, 'accept' => 0, 'refuse' => 0, 'save' => 0, 'analytics' => 0, 'ads' => 0);
            }
            $sites[$host]['total']++;
            $sites[$host][$record['action']]++;
            if (!empty($record['settings']['analyticsStorage'])) {
                $sites[$host]['analytics']++;
            }
            if (!empty($record['settings']['adStorage'])) {
                $sites[$host]['ads']++;
            }
        }
        ksort($sites);
        echo "Choices in $month (one visitor can choose more than once)\n";
        printf("%-40s %8s %8s %8s %8s %10s %8s\n", 'site', 'choices', 'accept', 'refuse', 'custom', 'analytics', 'ads');
        foreach ($sites as $host => $s) {
            $percent = function ($count) use ($s) {
                return round(100 * $count / $s['total']) . '%';
            };
            printf("%-40s %8d %8s %8s %8s %10s %8s\n", $host, $s['total'], $percent($s['accept']), $percent($s['refuse']),
                $percent($s['save']), $percent($s['analytics']), $percent($s['ads']));
        }
        return;
    }

    if ($command === 'find' && isset($argv[2])) {
        $id = strtolower($argv[2]);
        $files = glob($dataDir . '/*.jsonl');
        sort($files);
        $found = 0;
        foreach ($files as $file) {
            foreach (readRecords($file) as $record) {
                if ($record['id'] === $id) {
                    echo json_encode($record), "\n";
                    $found++;
                }
            }
        }
        if (!$found) {
            echo "No records for $id\n";
        }
        return;
    }

    if ($command === 'prune' && isset($argv[2]) && ctype_digit($argv[2])) {
        $cutoff = gmdate('Y-m', strtotime('-' . (int) $argv[2] . ' months'));
        foreach (glob($dataDir . '/*.jsonl') as $file) {
            if (basename($file, '.jsonl') < $cutoff) {
                unlink($file);
                echo 'Deleted ', basename($file), "\n";
            }
        }
        return;
    }

    echo "Usage: php consent.php stats [YYYY-MM] | find <consent id> | prune <months>\n";
}
