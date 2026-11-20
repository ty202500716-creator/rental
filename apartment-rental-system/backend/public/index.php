<?php
// Front controller: every API call goes through here:  index.php?r=<route>
define('BASE', dirname(__DIR__));
$cfg = require BASE.'/config/app.php';
spl_autoload_register(function ($c) { foreach (['controllers','models','middleware','services','validators'] as $d) { $f = BASE."/$d/$c.php"; if (is_file($f)) { require $f; return; } } });
require BASE.'/services/helpers.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigin = $cfg['allowed_origin'];
if (getenv('ALLOWED_ORIGIN') === false && preg_match('~^http://(?:localhost|127\.0\.0\.1):517[3-5]$~D', $origin)) {
  $allowedOrigin = $origin;
}
header('Access-Control-Allow-Origin: '.$allowedOrigin);
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET,POST,OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;
session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax']);
session_start();
function postMaxBytes($value) {
  $value = trim((string)$value);
  if ($value === '' || $value === '0') return 0;
  $unit = strtolower(substr($value, -1));
  $bytes = (float)$value;
  if ($unit === 'g') $bytes *= 1024;
  if ($unit === 'g' || $unit === 'm') $bytes *= 1024;
  if ($unit === 'g' || $unit === 'm' || $unit === 'k') $bytes *= 1024;
  return (int)$bytes;
}
try {
  $contentLength = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
  $postMax = postMaxBytes(ini_get('post_max_size'));
  if ($_SERVER['REQUEST_METHOD'] === 'POST' && $postMax > 0 && $contentLength > $postMax && empty($_POST) && empty($_FILES)) {
    fail('Upload is too large. Max 5 MB per photo, up to 8 photos.', 413);
  }
  $res = Router::dispatch();
  if ($res !== null) { header('Content-Type: application/json'); echo json_encode($res); }
}
catch (ApiException $e) { header('Content-Type: application/json'); http_response_code($e->getCode() ?: 400); echo json_encode(['error' => $e->getMessage()]); }
catch (PDOException $e) { if (Database::pdo()->inTransaction()) Database::pdo()->rollBack(); header('Content-Type: application/json'); http_response_code(500); echo json_encode(['error' => 'Database error: '.$e->getMessage()]); }
