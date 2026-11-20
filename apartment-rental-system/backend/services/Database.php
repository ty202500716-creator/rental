<?php
// Single PDO connection to MySQL (settings in config/database.php)
class Database {
  static function pdo() { static $p; if (!$p) { $c = require BASE.'/config/database.php';
    $p = new PDO("mysql:host={$c['host']};port={$c['port']};dbname={$c['name']};charset={$c['charset']}", $c['user'], $c['pass'],
      [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]); } return $p; }
  static function q($sql, $a = []) { $s = self::pdo()->prepare($sql); $s->execute($a); return $s; }
}
