<?php
class User extends Model {
  static function byEmail($e) { return self::one('SELECT * FROM users WHERE email=?', [strtolower(trim($e))]); }
  static function accountState($id) { return self::one('SELECT user_id,role,account_status,account_status_reason,first_name,last_name,email FROM users WHERE user_id=?', [(int)$id]); }
  static function exists($email, $username = null) { return self::one('SELECT 1 FROM users WHERE email=? OR username=?', [strtolower($email), $username ?? '']) !== null; }
  static function uniqueUsername($email) { $un = explode('@', $email)[0]; if (self::one('SELECT 1 FROM users WHERE username=?', [$un])) $un .= random_int(100, 999); return $un; }
  static function create($d) { self::q('INSERT INTO users(username,password_hash,role,account_status,first_name,middle_name,last_name,email,contact_number) VALUES(?,?,?,?,?,?,?,?,?)', [$d['username'],password_hash($d['pw'],PASSWORD_DEFAULT),$d['role'],$d['status'],trim($d['first_name']),$d['middle_name'] ?? null,trim($d['last_name']),strtolower(trim($d['email'])),'+63'.$d['phone']]); return self::lastId(); }
  static function touchLogin($id) { self::q('UPDATE users SET last_login_at=NOW() WHERE user_id=?', [$id]); }
  static function setStatus($id, $s, $reason = null) {
    self::q('UPDATE users SET account_status=?,account_status_reason=? WHERE user_id=?', [$s, $s === 'Active' ? null : $reason, (int)$id]);
  }
  static function all() { return self::rows("SELECT user_id,username,CONCAT(first_name,' ',last_name) name,email,role,account_status,last_login_at FROM users ORDER BY created_at DESC"); }
  static function adminAccounts() { return self::rows("SELECT user_id,username,CONCAT(first_name,' ',last_name) name,email,role,account_status,last_login_at FROM users WHERE role='Admin' ORDER BY created_at DESC"); }
  static function activeAdminIds() { return array_column(self::rows("SELECT user_id FROM users WHERE role='Admin' AND account_status='Active'"), 'user_id'); }
  static function profile($u) {
    $p = self::one('SELECT user_id,username,role,account_status,account_status_reason,first_name,middle_name,last_name,email,contact_number,profile_photo,created_at FROM users WHERE user_id=?', [$u['user_id']]);
    if ($u['role'] === 'Landlord') $p += self::one('SELECT date_of_birth,gender,complete_address,region_code,province_code,city_municipality_code,barangay_code,street_address,occupation,id_type,id_number,verification_status FROM landlord WHERE user_id=?', [$u['user_id']]) ?: [];
    if ($u['role'] === 'Tenant') {
      $p += self::one('SELECT date_of_birth,gender,complete_address,region_code,province_code,city_municipality_code,barangay_code,street_address,occupation,emergency_contact_name,emergency_contact_number,emergency_contact_relation,id_type,id_number,verification_status,rejection_reason,verified_at FROM tenant WHERE user_id=?', [$u['user_id']]) ?: [];
      $p['identity_documents'] = Tenant::identityDocuments($u['user_id']);
    }
    return $p;
  }
  static function updateProfile($u, $b) {
    self::q('UPDATE users SET first_name=?,middle_name=?,last_name=?,contact_number=? WHERE user_id=?', [$b['first_name'],$b['middle_name'] ?? null,$b['last_name'],'+63'.$b['phone'],$u['user_id']]);
    if ($u['role'] === 'Tenant') {
      if (isset($b['validated_address'])) {
        $address = $b['validated_address'];
        self::q('UPDATE tenant SET complete_address=?,region_code=?,province_code=?,city_municipality_code=?,barangay_code=?,street_address=? WHERE user_id=?', [$address['complete_address'],$address['region_code'],$address['province_code'],$address['city_municipality_code'],$address['barangay_code'],$address['street_address'],$u['user_id']]);
      }
      self::q('UPDATE tenant SET occupation=COALESCE(?,occupation),emergency_contact_name=COALESCE(?,emergency_contact_name),emergency_contact_number=COALESCE(?,emergency_contact_number) WHERE user_id=?', [$b['occupation'] ?? null,$b['ec_name'] ?? null,empty($b['ec_phone']) ? null : '+63'.$b['ec_phone'],$u['user_id']]);
    }
    if ($u['role'] === 'Landlord') {
      if (isset($b['validated_address'])) {
        $address = $b['validated_address'];
        self::q('UPDATE landlord SET complete_address=?,region_code=?,province_code=?,city_municipality_code=?,barangay_code=?,street_address=? WHERE user_id=?', [$address['complete_address'],$address['region_code'],$address['province_code'],$address['city_municipality_code'],$address['barangay_code'],$address['street_address'],$u['user_id']]);
      }
      self::q('UPDATE landlord SET occupation=COALESCE(?,occupation) WHERE user_id=?', [$b['occupation'] ?? null,$u['user_id']]);
    }
  }
  static function setProfilePhoto($id, $path) { self::q('UPDATE users SET profile_photo=? WHERE user_id=?', [$path,$id]); }
  static function updateCredentials($id, $b) {
    $sets=[]; $params=[];
    if (!empty($b['email'])) { $sets[]='email=?'; $params[]=strtolower(trim($b['email'])); }
    if (!empty($b['username'])) { $sets[]='username=?'; $params[]=trim($b['username']); }
    if (!$sets) fail('Enter a new email address or username.');
    $params[]=(int)$id;
    try { self::q('UPDATE users SET '.implode(',',$sets).' WHERE user_id=?',$params); }
    catch (PDOException $e) {
      if (($e->errorInfo[1] ?? null)===1062) fail('That email address or username is already in use.',409);
      throw $e;
    }
  }
  static function passwordHash($id) { return self::one('SELECT password_hash FROM users WHERE user_id=?', [$id])['password_hash']; }
  static function setPassword($id, $pw) { self::q('UPDATE users SET password_hash=? WHERE user_id=?', [password_hash($pw, PASSWORD_DEFAULT), $id]); }
}
