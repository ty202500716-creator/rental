<?php
class RentalController {
  private static function validateAgreement($b) {
    $start=Validator::date($b['start_date'],'move-in date');
    $end=Validator::date($b['end_date'],'lease end date');
    if ($end <= $start) fail('Lease end date must be after the move-in date.');
    if (!is_numeric($b['monthly_rent']) || (float)$b['monthly_rent'] <= 0) fail('Monthly rent must be greater than zero.');
    if (!empty($b['security_deposit']) && (!is_numeric($b['security_deposit']) || (float)$b['security_deposit'] < 0)) fail('Security deposit cannot be negative.');
    if (!empty($b['due_day']) && (!is_numeric($b['due_day']) || (int)$b['due_day'] < 1 || (int)$b['due_day'] > 31)) fail('Rent due day must be between 1 and 31.');
  }
  static function index($u, $b) { return ['rows' => Rental::listFor($u)]; }
  static function active($u, $b) { return ['rows' => Rental::activeOptions(Landlord::idFor($u['user_id']))]; }
  static function mine($u, $b) { return ['rental' => Rental::mine(Tenant::idFor($u['user_id']))]; }
  static function store($u, $b) {
    Validator::required($b, 'booking_id','start_date','end_date','monthly_rent'); self::validateAgreement($b);
    $k = Rental::bookingForAgreement((int)$b['booking_id'], Landlord::idFor($u['user_id'])); if (!$k) fail('Booking must be approved and have no agreement yet.');
    Rental::create((int)$b['booking_id'], $k, $b); return ['ok' => true];
  }
  static function update($u, $b) {
    Validator::required($b, 'rental_id','start_date','end_date','monthly_rent');
    $id = (int)$b['rental_id'];
    if (!Rental::ownedBy($id, Landlord::idFor($u['user_id']))) fail('Rental not found.', 404);
    if (Rental::statusOf($id) !== 'Draft') fail('Only draft rental agreements can be edited.');
    self::validateAgreement($b);
    Rental::updateDraft($id, $b);
    return ['ok' => true];
  }
  static function status($u, $b) {
    Validator::required($b, 'rental_id','status'); Validator::in($b['status'], ['Active','Expired','Terminated'], 'Invalid status.');
    if (!Rental::ownedBy((int)$b['rental_id'], Landlord::idFor($u['user_id']))) fail('Rental not found.', 404);
    try { Rental::setStatus((int)$b['rental_id'], $b['status']); } catch (PDOException $e) { fail('This unit already has an active tenant.', 409); }
    Notifier::audit('RENTAL_'.strtoupper($b['status']), 'rental', (int)$b['rental_id']); return ['ok' => true];
  }
  static function renewals($u, $b) { return ['rows' => Rental::renewals($u)]; }
  static function requestRenewal($u, $b) {
    Validator::required($b, 'months'); $t = Tenant::idFor($u['user_id']); $r = Rental::activeOf($t); if (!$r) fail('You have no active rental to renew.');
    if (Rental::renewalPending($r['rental_id'])) fail('You already have a pending renewal request.', 409);
    Rental::requestRenewal($r['rental_id'], $t, (int)$b['months'], $b['remarks'] ?? null);
    if ($ll = Rental::landlordUserOf($r['rental_id'])) Notifier::send($ll, 'Lease Renewal', 'Lease renewal request', $u['name'].' requested a renewal.'); return ['ok' => true];
  }
  static function decideRenewal($u, $b) {
    Validator::required($b, 'renewal_id','decision'); $id = (int)$b['renewal_id']; $r = Rental::renewalFor($id, Landlord::idFor($u['user_id']));
    if (!$r) fail('Request not found.', 404); if ($r['renewal_status'] !== 'Pending') fail('Already decided.');
    if ($b['decision'] === 'Approved') Rental::approveRenewal($id, $r['rental_id'], $r['requested_months'], $b['remarks'] ?? null);
    elseif ($b['decision'] === 'Rejected') { Validator::required($b, 'remarks'); Rental::rejectRenewal($id, $b['remarks']); }
    else fail('Invalid decision.');
    Notifier::send($r['tuser'], 'Lease Renewal', 'Lease renewal '.$b['decision'], 'Your renewal request was '.strtolower($b['decision']).'.', 'lease_renewal', $id); return ['ok' => true];
  }
}
