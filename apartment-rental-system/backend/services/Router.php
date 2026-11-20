<?php
// Loads every file in routes/ and runs the matching controller action.
// Route format: [METHOD, 'path', 'Controller@action', roles]   roles: null = public, [] = any logged-in user
class Router {
  static function dispatch() {
    $path = trim($_GET['r'] ?? '', '/'); $m = $_SERVER['REQUEST_METHOD'];
    foreach (glob(BASE.'/routes/*.php') as $file) foreach (require $file as $r) {
      if ($r[0] === $m && $r[1] === $path) { $u = AuthMiddleware::handle($r[3] ?? null); [$c, $a] = explode('@', $r[2]); return $c::$a($u, body()); }
    }
    fail('Not found.', 404);
  }
}
