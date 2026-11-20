<?php
class AuthController {
  static function login($u, $b) {
    $x = User::byEmail($b['email'] ?? '');
    if (!$x || !password_verify($b['password'] ?? '', $x['password_hash'])) fail('Incorrect email or password.', 401);
    $reason=$x['account_status_reason']??null;
    if ($x['account_status'] === 'Rejected' && $x['role'] === 'Landlord') $reason=Landlord::byUser($x['user_id'])['rejection_reason']??$reason;
    if ($x['account_status'] === 'Pending') fail('Your account is still awaiting admin approval.'.($reason?' Reason: '.$reason:''), 403);
    if ($x['account_status'] === 'Rejected') fail('Your registration was rejected.'.($reason?' Reason: '.$reason:''), 403);
    if ($x['account_status'] !== 'Active') fail('Your account is suspended/deactivated.'.($reason?' Reason: '.$reason:''), 403);
    User::touchLogin($x['user_id']); session_regenerate_id(true);
    $_SESSION['u'] = ['user_id' => $x['user_id'], 'role' => $x['role'], 'name' => $x['first_name'].' '.$x['last_name'], 'email' => $x['email']];
    return ['user' => $_SESSION['u']];
  }
  static function me($u, $b) { return ['user' => $u]; }
  static function logout($u, $b) { session_destroy(); return ['ok' => true]; }
  // Public registration: Tenant and Landlord only. Admin accounts are created by an admin (AdminController::createUser).
  static function register($u, $b) {
    $b['validated_address'] = AuthValidator::register($b);
    $b['address'] = $b['validated_address']['complete_address'];
    if (User::exists($b['email'])) fail('This email is already registered.', 409);
    $file = FileUploader::save('id_file'); $role = $b['role']; $pdo = Database::pdo(); $pdo->beginTransaction();
    $uid = User::create(['username' => User::uniqueUsername(strtolower($b['email'])), 'pw' => $b['pw'], 'role' => $role, 'status' => $role === 'Landlord' ? 'Pending' : 'Active'] + $b);
    if ($role === 'Landlord') Landlord::create($uid, $b); else Tenant::create($uid, $b, (bool)$file);
    if ($file) Tenant::saveDocument($uid, $file, $_FILES['id_file']['name']);
    if ($role === 'Landlord') foreach (User::activeAdminIds() as $a) Notifier::send($a, 'Registration', 'New landlord registration', trim($b['first_name']).' '.trim($b['last_name']).' is waiting for approval.', 'landlord', $uid);
    $pdo->commit(); return ['ok' => true, 'status' => $role === 'Landlord' ? 'Pending' : 'Active'];
  }
}
