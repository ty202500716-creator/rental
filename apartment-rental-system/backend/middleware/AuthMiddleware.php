<?php
class AuthMiddleware {
  // $roles: null = public route, [] = any logged-in user, ['Admin',...] = only these roles
  static function handle($roles) {
    $u = $_SESSION['u'] ?? null; if ($roles === null) return $u;
    if (!$u) fail('Please log in.', 401);
    $account = User::accountState($u['user_id']);
    if (!$account) {
      $_SESSION = [];
      session_destroy();
      fail('Your session is no longer valid. Please log in.', 401);
    }
    if ($account['account_status'] !== 'Active') {
      $reason = trim((string)($account['account_status_reason'] ?? ''));
      $_SESSION = [];
      session_destroy();
      fail('Your account is suspended/deactivated.'.($reason !== '' ? ' Reason: '.$reason : ''), 401);
    }
    $u['role'] = $account['role'];
    $u['name'] = trim($account['first_name'].' '.$account['last_name']);
    $u['email'] = $account['email'];
    if ($roles && !in_array($u['role'], $roles, true)) fail('Access denied.', 403);
    return $u;
  }
}
