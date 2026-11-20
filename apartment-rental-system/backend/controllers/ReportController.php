<?php
class ReportController { static function index($u, $b) { return ['rows' => $u['role'] === 'Admin' ? Report::admin() : Report::landlord(Landlord::idFor($u['user_id']))]; } }
