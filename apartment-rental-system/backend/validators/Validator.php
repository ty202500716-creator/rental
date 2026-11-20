<?php
class Validator {
  static function required($b, ...$ks) { foreach ($ks as $k) if (!isset($b[$k]) || trim((string)$b[$k]) === '') fail("Missing field: $k"); }
  static function gmail($e) { if (!preg_match('/^[a-z0-9._%+-]+@gmail\.com$/i', $e)) fail('Only @gmail.com email addresses are allowed.'); }
  static function phone($p, $label = 'Mobile number') { if (!preg_match('/^9\d{9}$/', $p)) fail("$label must be 10 digits starting with 9 (+63)."); }
  static function password($p) { if (strlen($p) < 8) fail('Password must be at least 8 characters.'); }
  static function in($v, $list, $msg = 'Invalid value.') { if (!in_array($v, $list, true)) fail($msg); }
  static function date($value, $label = 'Date') {
    if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}$/D', $value)) fail("Enter a valid $label.");
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
    $errors = DateTimeImmutable::getLastErrors();
    if (!$date || ($errors && ($errors['warning_count'] || $errors['error_count'])) || $date->format('Y-m-d') !== $value) fail("Enter a valid $label.");
    return $date;
  }
}
