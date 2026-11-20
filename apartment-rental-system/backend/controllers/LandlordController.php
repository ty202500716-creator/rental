<?php
class LandlordController {
  static function index($u, $b) { return ['rows' => Landlord::all()]; }                      // Admin
  static function dashboard($u, $b) { return Landlord::dashboard(Landlord::idFor($u['user_id'])); }
  static function review($u, $b) {                                                            // Admin approves / rejects / suspends
    Validator::required($b, 'landlord_id', 'decision'); $lid = (int)$b['landlord_id']; $d = $b['decision'];
    $landlord=Landlord::one('SELECT landlord_id,user_id,verification_status FROM landlord WHERE landlord_id=?',[$lid]);
    if (!$landlord) fail('Landlord not found.', 404);
    $uid=(int)$landlord['user_id'];
    if ($d === 'Approved') {
      if($landlord['verification_status']!=='Pending')fail('Only pending landlord registrations can be approved.');
      Landlord::approve($lid, $u['user_id']);
      User::setStatus($uid, 'Active');
      Notifier::send($uid, 'Registration', 'Registration approved', 'Your landlord registration was approved. You can now log in.','landlord',$lid);
      Notifier::audit('LANDLORD_APPROVED','landlord',$lid,['decision'=>'Approved']);
      return ['ok' => true];
    }
    elseif ($d === 'Rejected') {
      Validator::required($b, 'reason');
      $reason=trim($b['reason']);
      if($reason===''||mb_strlen($reason)>255)fail('A rejection reason of 1–255 characters is required.');
      if($landlord['verification_status']!=='Pending')fail('Only pending landlord registrations can be rejected.');
      Landlord::reject($lid, $u['user_id'], $reason);
      User::setStatus($uid, 'Rejected', $reason);
      Notifier::send($uid, 'Registration', 'Registration rejected', $reason,'landlord',$lid);
      Notifier::audit('LANDLORD_REJECTED','landlord',$lid,['decision'=>'Rejected','reason'=>$reason]);
      return ['ok' => true];
    }
    elseif (in_array($d, ['Suspended','Active','Deactivated'], true)) {
      $reason=null;
      if(in_array($d,['Suspended','Deactivated'],true)){
        Validator::required($b,'reason');
        $reason=trim($b['reason']);
        if($reason===''||mb_strlen($reason)>255)fail('A status-change reason of 1–255 characters is required.');
      }
      self::setAccountStatus($uid,$d,$reason,$u['user_id']);
    }
    else fail('Invalid decision.');
    return ['ok' => true];
  }
  static function setAccountStatus($userId,$status,$reason,$actorId) {
    $account=User::accountState($userId);
    if(!$account||$account['role']!=='Landlord')fail('Landlord not found.',404);
    $landlord=Landlord::byUser($userId);
    if(!$landlord)fail('Landlord profile not found.',404);
    if($status==='Active'&&$landlord['verification_status']!=='Approved')fail('A landlord must be approved before reactivation.');
    $old=$account['account_status'];
    User::setStatus($userId,$status,$reason);
    $lid=(int)$landlord['landlord_id'];
    if($status==='Active')Notifier::send((int)$userId,'System','Account reactivated','Your landlord account has been reactivated.','landlord',$lid);
    else {
      Notifier::send((int)$userId,'System','Account '.$status,str_replace('Deactivated','deactivated',str_replace('Suspended','suspended','Your landlord account is '.$status.'. Reason: '.$reason)),'landlord',$lid);
      foreach(Landlord::affectedTenantUsers($lid) as $tenantUserId)Notifier::send($tenantUserId,'System','Landlord '.$status,'The landlord for one of your active rentals or pending bookings has been '.$status.'. Existing rental arrangements remain in place. Reason: '.$reason,'landlord',$lid);
    }
    Notifier::audit('LANDLORD_ACCOUNT_STATUS','landlord',$lid,['old_status'=>$old,'status'=>$status,'reason'=>$reason]);
  }
}
