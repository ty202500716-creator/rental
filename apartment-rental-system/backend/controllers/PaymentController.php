<?php
// Rental bills + payments (electricity/water bills are in UtilityBillController but share these payment actions)
class PaymentController {
  static function rentalDashboard($u, $b) { return Payment::rentalDashboard($u); }
  static function rentalHistory($u, $b) { return ['rows' => Payment::rentalListFor($u)]; }
  static function rentalBills($u, $b) { return ['rows' => Bill::rental($u)]; }
  static function storeRentalBill($u, $b) {
    Validator::required($b, 'rental_id','billing_month','due_date','amount_due');
    Validator::date($b['billing_month'],'billing month'); Validator::date($b['due_date'],'due date');
    $r = Rental::activeFor((int)$b['rental_id'], Landlord::idFor($u['user_id'])); if (!$r) fail('Active rental not found.', 404);
    if (!is_numeric($b['amount_due']) || (float)$b['amount_due'] <= 0) fail('Bill amount must be greater than zero.');
    try { Bill::createRental((int)$b['rental_id'], $r['unit_id'], $b); }
    catch (PDOException $e) {
      if (($e->errorInfo[1] ?? null) === 1062) fail('A rent bill for that month already exists.', 409);
      throw $e;
    }
    $id=(int)Database::pdo()->lastInsertId();
    Notifier::send($r['tuser'], 'Reminder', 'New rent bill', 'A rent bill is due on '.$b['due_date'].'.');
    Notifier::audit('RENTAL_BILL_CREATED','rental_bill',$id,['rental_id'=>(int)$b['rental_id'],'billing_month'=>$b['billing_month'],'amount_due'=>(float)$b['amount_due']]);
    return ['ok' => true];
  }
  static function updateRentalBill($u, $b) {
    Validator::required($b,'rental_bill_id','billing_month','due_date','amount_due');
    Validator::date($b['billing_month'],'billing month'); Validator::date($b['due_date'],'due date');
    if (!is_numeric($b['amount_due']) || (float)$b['amount_due'] <= 0) fail('Bill amount must be greater than zero.');
    $id=(int)$b['rental_bill_id'];
    Bill::updateRental($id,$b,Landlord::idFor($u['user_id']));
    Notifier::audit('RENTAL_BILL_UPDATED','rental_bill',$id,['billing_month'=>$b['billing_month'],'amount_due'=>(float)$b['amount_due']]);
    return ['ok'=>true];
  }
  static function index($u, $b) { return ['rows' => Payment::listFor($u)]; }
  static function receipts($u, $b) { return ['rows' => Payment::receipts(Tenant::idFor($u['user_id']))]; }
  // Tenant pays ONE bill per submission (electricity and water are separate payments)
  static function store($u, $b) {
    Validator::required($b, 'kind','bill_id','amount','method'); $t = Tenant::idFor($u['user_id']);
    Validator::in($b['method'], ['GCash','Bank Transfer','Cash'], 'Invalid payment method.'); if ((float)$b['amount'] <= 0) fail('Invalid amount.');
    if ($b['method'] !== 'Cash') Validator::required($b, 'reference');
    $bill = Bill::lookup($b['kind'], (int)$b['bill_id'], 'r.tenant_id=?', [$t]); if ((float)$b['amount'] > (float)$bill['balance']) fail('Payment exceeds the bill balance.');
    $acc = Payment::accepted($bill['unit_id']); $flag = ['GCash' => 'accepts_gcash','Bank Transfer' => 'accepts_bank','Cash' => 'accepts_cash'][$b['method']]; if (!$acc[$flag]) fail('Your landlord does not accept '.$b['method'].'.');
    $id = Payment::submit($b['kind'], (int)$b['bill_id'], $bill, $t, $b, FileUploader::save('proof'), $u['user_id']);
    if ($ll = Unit::landlordUser($bill['unit_id'])) Notifier::send($ll, 'Payment', 'Payment submitted', $u['name'].' submitted a '.$bill['cat'].' payment.', 'payment', $id); return ['ok' => true];
  }
  static function decide($u, $b) {
    Validator::required($b, 'payment_id','decision'); $id = (int)$b['payment_id']; $p = Payment::forLandlord($id, Landlord::idFor($u['user_id']));
    if (!$p) fail('Payment not found.', 404); if ($p['payment_status'] !== 'Pending') fail('This payment was already decided.');
    if ($b['decision'] === 'Verified') Payment::verify($id, $u['user_id']);   // triggers update the bill balance and issue the receipt
    elseif ($b['decision'] === 'Rejected') { Validator::required($b, 'reason'); $reason=trim($b['reason']); if (mb_strlen($reason)>255) fail('Rejection reason must be 255 characters or fewer.'); Payment::reject($id, $u['user_id'], $reason); $b['reason']=$reason; }
    else fail('Invalid decision.');
    Notifier::send($p['tuser'], 'Payment', 'Payment '.$b['decision'], $b['decision'] === 'Rejected' ? $b['reason'] : 'Your payment was confirmed. Receipt available.', 'payment', $id);
    Notifier::audit('PAYMENT_'.strtoupper($b['decision']), 'payment', $id); return ['ok' => true];
  }
  static function cash($u, $b) {
    Validator::required($b, 'kind','bill_id','amount'); $bill = Bill::lookup($b['kind'], (int)$b['bill_id'], 'ab.landlord_id=?', [Landlord::idFor($u['user_id'])]);
    try { $id = Payment::recordCash($b['kind'], (int)$b['bill_id'], $bill, $b['amount'], $u['user_id']); } catch (PDOException $e) { fail('Payment exceeds the bill balance.'); }
    Notifier::audit('CASH_RECORDED', 'payment', $id); return ['ok' => true];
  }
}
