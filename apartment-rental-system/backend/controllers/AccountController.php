<?php
// Things every logged-in role has: profile, password, notifications, announcements, file viewing
class AccountController {
  static function profile($u, $b) { return ['profile' => User::profile($u)]; }
  static function updateProfile($u, $b) {
    Validator::required($b, 'first_name','last_name','phone'); Validator::phone($b['phone']); if (!empty($b['ec_phone'])) Validator::phone($b['ec_phone'], 'Emergency contact');
    if (($u['role'] === 'Tenant' || $u['role'] === 'Landlord') && array_key_exists('address', $b)) {
      $b['validated_address'] = PhilippineLocations::validateAddress($b['address'] ?? null);
    }
    User::updateProfile($u, $b);
    return ['ok' => true];
  }
  static function updateProfilePhoto($u, $b) {
    $photo = FileUploader::saveProfilePhoto('profile_photo');
    if (!$photo) fail('Please choose a profile photo.');
    User::setProfilePhoto($u['user_id'], $photo);
    Notifier::audit('PROFILE_PHOTO_UPDATED', 'users', $u['user_id']);
    return ['ok' => true, 'profile_photo' => $photo];
  }
  static function removeProfilePhoto($u, $b) {
    User::setProfilePhoto($u['user_id'], null);
    Notifier::audit('PROFILE_PHOTO_REMOVED', 'users', $u['user_id']);
    return ['ok' => true];
  }
  static function credentials($u, $b) {
    Validator::required($b, 'current_password');
    if (!password_verify($b['current_password'], User::passwordHash($u['user_id']))) fail('Current password is incorrect.');
    $b['email'] = trim($b['email'] ?? '');
    $b['username'] = trim($b['username'] ?? '');
    if ($b['email'] !== '') Validator::gmail($b['email']);
    if ($b['username'] !== '' && !preg_match('/^[A-Za-z0-9._-]{3,50}$/', $b['username'])) fail('Username must be 3–50 characters and use letters, numbers, dots, underscores or hyphens.');
    if ($b['email'] === '' && $b['username'] === '') fail('Enter a new email address or username.');
    User::updateCredentials($u['user_id'], $b);
    Notifier::audit('ACCOUNT_CREDENTIALS_UPDATED', 'users', $u['user_id']);
    return ['ok' => true];
  }
  static function password($u, $b) {
    Validator::required($b, 'current','new'); Validator::password($b['new']);
    if (!password_verify($b['current'], User::passwordHash($u['user_id']))) fail('Current password is incorrect.');
    User::setPassword($u['user_id'], $b['new']); Notifier::audit('PASSWORD_CHANGED', 'users', $u['user_id']); return ['ok' => true];
  }
  static function notifications($u, $b) { return ['rows' => Notification::forUser($u['user_id'])]; }
  static function markRead($u, $b) { Notification::markRead($u['user_id']); return ['ok' => true]; }
  static function announcements($u, $b) { return ['rows' => Notification::announcementsFor($u)]; }
  static function postAnnouncement($u, $b) {
    Validator::required($b, 'title','content');
    if ($u['role'] === 'Admin') { Validator::in($b['audience'] ?? '', ['All','Landlords','Tenants'], 'Invalid audience.'); Notification::post($u['user_id'], null, $b['audience'], $b['title'], $b['content']); }
    else { $l = Landlord::idFor($u['user_id']); Notification::post($u['user_id'], $l, 'Tenants', $b['title'], $b['content']); foreach (Notification::tenantUsersOf($l) as $t) Notifier::send($t, 'Announcement', $b['title'], mb_substr($b['content'], 0, 200)); }
    return ['ok' => true];
  }
  static function file($u, $b) {
    $path = basename($_GET['path'] ?? '');
    $document = Model::one('SELECT d.user_id,owner.role FROM user_documents d JOIN users owner USING(user_id) WHERE d.file_path=?', [$path]);
    if (!$document) {
      $photo = Model::one('SELECT user_id,role FROM users WHERE profile_photo=?', [$path]);
      if ($photo) {
        $allowed=(int)$photo['user_id']===(int)$u['user_id']||$u['role']==='Admin';
        if (!$allowed && $u['role']==='Landlord' && $photo['role']==='Tenant') {
          $tenantId=Tenant::idFor($photo['user_id']);
          $landlordId=Landlord::idFor($u['user_id']);
          $allowed=$tenantId&&$landlordId&&Tenant::dealsWith($tenantId,$landlordId);
        }
        if (!$allowed) fail('File not found.', 404);
        TenantController::streamDocument($path);
      }
      $listingPhoto=Model::one("SELECT unit_id FROM unit WHERE JSON_CONTAINS(photos,JSON_QUOTE(?)) LIMIT 1",[$path])
        ?:Model::one("SELECT building_id FROM apartment_building WHERE JSON_CONTAINS(photos,JSON_QUOTE(?)) LIMIT 1",[$path]);
      if (!$listingPhoto || !preg_match('/\.(jpe?g|png|webp)$/i',$path)) fail('File not found.',404);
      TenantController::streamDocument($path);
    }
    if ((int)$document['user_id'] !== (int)$u['user_id'] && $u['role'] !== 'Admin') {
      $allowed = false;
      if ($u['role'] === 'Landlord' && $document['role'] === 'Tenant') {
        $tenantId = Tenant::idFor($document['user_id']);
        $landlordId = Landlord::idFor($u['user_id']);
        $allowed = $tenantId && $landlordId && Tenant::dealsWith($tenantId, $landlordId);
      }
      if (!$allowed) fail('File not found.', 404);
    }
    TenantController::streamDocument($path);
  }
}
