<?php
class Model {
  static function q($s, $a = []) { return Database::q($s, $a); }
  static function rows($s, $a = []) { return Database::q($s, $a)->fetchAll(); }
  static function one($s, $a = []) { return Database::q($s, $a)->fetch() ?: null; }
  static function lastId() { return Database::pdo()->lastInsertId(); }
  // Role scoping: Admin sees all, Landlord only own rows, Tenant only own rows.
  static function scoped($u, $sql, $lcol, $tcol, $tail = '') {
    $w = ''; $p = [];
    if ($u['role'] === 'Landlord') { $w = " WHERE $lcol=?"; $p[] = Landlord::idFor($u['user_id']); }
    elseif ($u['role'] === 'Tenant') { if (!$tcol) fail('Access denied.', 403); $w = " WHERE $tcol=?"; $p[] = Tenant::idFor($u['user_id']); }
    return self::rows("$sql$w $tail", $p);
  }
}
