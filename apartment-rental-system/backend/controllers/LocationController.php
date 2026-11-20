<?php
class LocationController {
  static function index($u, $b) {
    $level = $_GET['level'] ?? '';
    $parent = $_GET['parent_code'] ?? '';
    return ['rows' => PhilippineLocations::options($level, $parent)];
  }
}
