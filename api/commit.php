<?php
/**
 * Hostinger PHP API Endpoint for Micro-TIL
 * Enables committing to GitHub using server-side credentials and a quick PIN.
 */

header('Content-Type: application/json');

// Helper to load .env file if present
function loadEnv($path) {
    if (!file_exists($path)) return [];
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $env = [];
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || strpos($line, '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($key, $val) = explode('=', $line, 2);
            $env[trim($key)] = trim(trim($val), "\"'");
        }
    }
    return $env;
}

$env = loadEnv(__DIR__ . '/../.env');

// Check request method
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Return backend availability status (without leaking secrets)
    echo json_encode([
        'server_mode' => !empty($env['GITHUB_TOKEN']),
        'has_pin' => !empty($env['APP_PIN']),
        'repo' => !empty($env['GITHUB_REPO']) ? ($env['GITHUB_USERNAME'] . '/' . $env['GITHUB_REPO']) : null,
        'strategy' => $env['COMMIT_STRATEGY'] ?? 'single'
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Use POST.']);
    exit;
}

// Read JSON body
$rawInput = file_get_contents('php://input');
$body = json_decode($rawInput, true);

if (!$body) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON payload.']);
    exit;
}

// 1. PIN Verification (if configured on Hostinger)
if (!empty($env['APP_PIN'])) {
    $providedPin = trim($body['pin'] ?? $_SERVER['HTTP_X_APP_PIN'] ?? '');
    if ($providedPin !== $env['APP_PIN']) {
        http_response_code(401);
        echo json_encode(['error' => 'Incorrect PIN code.']);
        exit;
    }
}

// 2. Resolve credentials (prefer server .env, fallback to body payload)
$token = $env['GITHUB_TOKEN'] ?? ($body['token'] ?? '');
$username = $env['GITHUB_USERNAME'] ?? ($body['username'] ?? '');
$repo = $env['GITHUB_REPO'] ?? ($body['repo'] ?? '');
$branch = $env['GITHUB_BRANCH'] ?? ($body['branch'] ?? 'main');
$strategy = $env['COMMIT_STRATEGY'] ?? ($body['strategy'] ?? 'single');
$filePath = $env['GITHUB_FILE_PATH'] ?? ($body['filePath'] ?? 'TIL.md');

if (empty($token) || empty($username) || empty($repo)) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing GitHub credentials (token, username, or repo).']);
    exit;
}

// 3. Resolve Target File Path
if ($strategy === 'daily') {
    $today = date('Y-m-d');
    $filePath = "til/{$today}.md";
}

// 4. Validate TIL Entry
$category = trim($body['category'] ?? '💡 Insight');
$title = trim($body['title'] ?? '');
$notes = trim($body['body'] ?? '');
$url = trim($body['url'] ?? '');

if (empty($title) || empty($notes)) {
    http_response_code(400);
    echo json_encode(['error' => 'Title and notes are required.']);
    exit;
}

// GitHub API Helper function using cURL
function callGitHub($url, $method = 'GET', $token, $data = null) {
    $ch = curl_init($url);
    $headers = [
        'User-Agent: Micro-TIL-Hostinger-App',
        'Accept: application/vnd.github.v3+json',
        'Authorization: Bearer ' . $token,
        'Content-Type: application/json'
    ];
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

    if ($data !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }

    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);

    if ($err) {
        throw new Exception('cURL error: ' . $err);
    }

    return ['status' => $status, 'data' => json_decode($response, true)];
}

try {
    // 5. Fetch existing file content & SHA
    $getFileUrl = "https://api.github.com/repos/{$username}/{$repo}/contents/{$filePath}?ref={$branch}";
    $existing = callGitHub($getFileUrl, 'GET', $token);

    $oldContent = '';
    $existingSha = null;

    if ($existing['status'] === 200 && isset($existing['data']['content'])) {
        $oldContent = base64_decode(str_replace("\n", '', $existing['data']['content']));
        $existingSha = $existing['data']['sha'];
    }

    // 6. Build Markdown entry
    $dateFormatted = date('M d, Y');
    $timeFormatted = date('h:i A');

    $entryMarkdown = "### {$category} {$title}\n";
    $entryMarkdown .= "> _Logged on {$dateFormatted} at {$timeFormatted}_\n\n";
    $entryMarkdown .= "{$notes}\n";
    if (!empty($url)) {
        $entryMarkdown .= "\n🔗 **Reference:** [{$url}]({$url})\n";
    }
    $entryMarkdown .= "\n---\n\n";

    if (!empty($oldContent)) {
        if (strpos($oldContent, '---') !== false) {
            $parts = preg_split('/---\s*\n/', $oldContent, 2);
            $header = $parts[0] . "---\n\n";
            $rest = $parts[1] ?? '';
            $finalContent = $header . $entryMarkdown . $rest;
        } else {
            $finalContent = $oldContent . "\n\n" . $entryMarkdown;
        }
    } else {
        $finalContent = "# 📚 Today I Learned (TIL)\n\nPersonal log of micro-learnings and development insights.\n\n---\n\n" . $entryMarkdown;
    }

    // 7. Commit to GitHub
    $commitMessage = "docs(til): {$category} - {$title}";
    $putUrl = "https://api.github.com/repos/{$username}/{$repo}/contents/{$filePath}";
    $payload = [
        'message' => $commitMessage,
        'content' => base64_encode($finalContent),
        'branch' => $branch
    ];
    if ($existingSha) {
        $payload['sha'] = $existingSha;
    }

    $putResult = callGitHub($putUrl, 'PUT', $token, $payload);

    if ($putResult['status'] !== 200 && $putResult['status'] !== 201) {
        $msg = $putResult['data']['message'] ?? 'Failed to commit to GitHub';
        http_response_code($putResult['status']);
        echo json_encode(['error' => $msg]);
        exit;
    }

    echo json_encode([
        'success' => true,
        'commitSha' => $putResult['data']['commit']['sha'] ?? '',
        'htmlUrl' => $putResult['data']['commit']['html_url'] ?? '',
        'filePath' => $filePath,
        'commitMessage' => $commitMessage
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
