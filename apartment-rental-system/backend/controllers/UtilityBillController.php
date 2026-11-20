<?php
class UtilityBillController {
  static function index($u, $b) { return ['rows' => Bill::utility($u)]; }
  static function store($u, $b) {
    Validator::required($b, 'rental_id','bill_type','period_start','period_end','previous_reading','current_reading','rate_per_unit','due_date');
    Validator::in($b['bill_type'], ['Electricity','Water'], 'Invalid bill type.');
    $periodStart=Validator::date($b['period_start'],'period start');
    $periodEnd=Validator::date($b['period_end'],'period end');
    Validator::date($b['due_date'],'due date');
    if ($periodEnd < $periodStart) fail('Period end must be on or after period start.');
    if (!is_numeric($b['previous_reading']) || (float)$b['previous_reading'] < 0) fail('Previous reading cannot be negative.');
    if (!is_numeric($b['current_reading']) || (float)$b['current_reading'] < (float)$b['previous_reading']) fail('Current reading cannot be lower than the previous reading.');
    if (!is_numeric($b['rate_per_unit']) || (float)$b['rate_per_unit'] < 0) fail('Rate cannot be negative.');
    $r = Rental::activeFor((int)$b['rental_id'], Landlord::idFor($u['user_id'])); if (!$r) fail('Active rental not found.', 404);
    try { Bill::createUtility((int)$b['rental_id'], $r['unit_id'], $b); } catch (PDOException $e) { fail('A '.$b['bill_type'].' bill for that period already exists.', 409); }
    Notifier::send($r['tuser'], 'Reminder', 'New '.$b['bill_type'].' bill', 'Due on '.$b['due_date'].'.'); return ['ok' => true];
  }
}
