<?php
class AuthValidator {
  static function register($b) {
    Validator::in($b['role'] ?? '', ['Tenant','Landlord'], 'Invalid role.');
    Validator::required($b, 'first_name','last_name','dob','email','phone','pw','id_type','id_number');
    $address = PhilippineLocations::validateAddress($b['address']);
    Validator::gmail($b['email']); Validator::phone($b['phone']); Validator::password($b['pw']);
    if ($b['role'] === 'Tenant') { Validator::required($b, 'occupation','ec_name','ec_phone'); Validator::phone($b['ec_phone'], 'Emergency contact'); }
    return $address;
  }
  static function adminUser($b) { Validator::required($b, 'first_name','last_name','username','email','phone','pw'); Validator::gmail($b['email']); Validator::phone($b['phone']); Validator::password($b['pw']); }
}
