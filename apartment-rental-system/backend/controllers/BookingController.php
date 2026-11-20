<?php
class BookingController {
  static function index($u, $b) { return ['rows' => Booking::listFor($u)]; }
  static function approved($u, $b) { return ['rows' => Booking::approvedOptions(Landlord::idFor($u['user_id']))]; }
  static function store($u, $b) {
    Validator::required($b, 'unit_id', 'move_in');
    $moveIn = Validator::date($b['move_in'],'move-in date');
    if ($moveIn < new DateTimeImmutable('today')) fail('Move-in date cannot be in the past.');
    $moveOut = trim($b['move_out'] ?? '');
    if ($moveOut !== '') {
      $moveOutDate = Validator::date($moveOut,'move-out date');
      if ($moveOutDate <= $moveIn) fail('Preferred move-out date must be after the move-in date.');
    } else $moveOut = null;
    $t = Tenant::idFor($u['user_id']);
    $remarks=trim((string)($b['remarks']??''));
    if(strlen($remarks)>255)fail('The booking message cannot exceed 255 characters.');
    $result=Booking::create((int)$b['unit_id'],$t,$b['move_in'],$moveOut,$remarks===''?null:$remarks);
    if($result['duplicate']){
      return ['ok'=>true,'duplicate'=>true,'message'=>$result['booking']?'You already have a booking request for this unit. Please check your existing booking for updates.':'You already have an active rental for this unit.','booking_reference'=>$result['booking']['booking_id']??null,'existing_booking'=>$result['booking'],'active_rental'=>$result['rental']];
    }
    $id=$result['booking_id'];
    if ($ll = Unit::landlordUser((int)$b['unit_id'])) Notifier::send($ll, 'Booking', 'New booking application', $u['name'].' applied for a unit. Preferred move-in: '.$b['move_in'].'. Preferred move-out: '.($moveOut ?? 'not specified').'.', 'booking', $id);
    return ['ok' => true,'booking_reference'=>$id];
  }
  static function decide($u, $b) {
    Validator::required($b, 'booking_id', 'decision'); $id = (int)$b['booking_id'];
    $k = Booking::forLandlord($id, Landlord::idFor($u['user_id'])); if (!$k) fail('Booking not found.', 404); if ($k['booking_status'] !== 'Pending') fail('This booking was already decided.');
    if ($b['decision'] === 'Approved') Booking::approve($id);
    elseif ($b['decision'] === 'Rejected') { Validator::required($b, 'reason'); Booking::reject($id, $b['reason']); }
    else fail('Invalid decision.');
    Notifier::send($k['tuser'], 'Booking', 'Booking '.$b['decision'], $b['decision'] === 'Rejected' ? $b['reason'] : 'Your booking was approved. The landlord will prepare your rental agreement.', 'booking', $id); return ['ok' => true];
  }
  static function cancel($u, $b) { Validator::required($b, 'booking_id'); if (!Booking::cancel((int)$b['booking_id'], Tenant::idFor($u['user_id']))) fail('Only pending bookings can be cancelled.'); return ['ok' => true]; }
}
