<?php
class Booking extends Model {
  static function listFor($u) {
    $records=self::scoped($u, "SELECT k.booking_id,k.tenant_id,k.unit_id,CONCAT(x.first_name,' ',x.last_name) tenant,x.email,x.contact_number,t.verification_status tenant_verification,ab.building_name,n.unit_number,CONCAT(ab.building_name,' · Unit ',n.unit_number) unit,n.monthly_rent,CONCAT(lu.first_name,' ',lu.last_name) landlord,k.created_at booking_date,k.preferred_move_in_date move_in,k.preferred_move_out_date move_out,k.remarks,k.booking_status status,k.rejection_reason FROM booking k JOIN tenant t USING(tenant_id) JOIN users x ON x.user_id=t.user_id JOIN unit n ON n.unit_id=k.unit_id JOIN apartment_building ab ON ab.building_id=n.building_id JOIN landlord l ON l.landlord_id=ab.landlord_id JOIN users lu ON lu.user_id=l.user_id", 'ab.landlord_id', 'k.tenant_id', 'ORDER BY k.created_at,k.booking_id');
    if($u['role']==='Tenant')return $records;
    $groups=[];
    foreach($records as $record){
      $key=$record['tenant_id'].':'.$record['unit_id'];
      if(!isset($groups[$key]))$groups[$key]=['booking_count'=>0,'history'=>[]];
      $groups[$key]=array_merge($groups[$key],$record);
      $groups[$key]['booking_count']++;
      $groups[$key]['history'][]=$record;
    }
    return array_values($groups);
  }
  static function create($unit, $t, $move, $moveOut, $remarks) {
    $pdo=Database::pdo();
    $pdo->beginTransaction();
    try {
      $status=self::one("SELECT n.availability_status,n.deactivated_by_admin unit_deactivated_by_admin,b.status building_status,b.deactivated_by_admin building_deactivated_by_admin,owner.account_status landlord_account_status FROM unit n JOIN apartment_building b USING(building_id) JOIN landlord l ON l.landlord_id=b.landlord_id JOIN users owner ON owner.user_id=l.user_id WHERE n.unit_id=? FOR UPDATE",[$unit]);
      if(!$status){$pdo->rollBack();fail('Apartment unit not found.',404);}
      $existing=self::one("SELECT k.booking_id,k.booking_status status,k.created_at booking_date,k.preferred_move_in_date move_in,k.preferred_move_out_date move_out,k.remarks,k.rejection_reason FROM booking k LEFT JOIN rental r ON r.booking_id=k.booking_id WHERE k.tenant_id=? AND k.unit_id=? AND (k.booking_status='Pending' OR (k.booking_status='Approved' AND (r.rental_id IS NULL OR r.rental_status IN ('Draft','Active')))) ORDER BY k.booking_status='Approved' DESC,k.created_at,k.booking_id LIMIT 1",[$t,$unit]);
      $rental=self::one("SELECT rental_id,start_date,end_date,rental_status status FROM rental WHERE tenant_id=? AND unit_id=? AND rental_status='Active' ORDER BY rental_id LIMIT 1",[$t,$unit]);
      if($existing||$rental){
        $pdo->rollBack();
        return ['duplicate'=>true,'booking'=>$existing,'rental'=>$rental];
      }
      if($status['availability_status']!=='Available'||$status['building_status']!=='Active'||(int)$status['unit_deactivated_by_admin']===1||(int)$status['building_deactivated_by_admin']===1||$status['landlord_account_status']!=='Active'||self::one("SELECT 1 FROM rental WHERE unit_id=? AND rental_status='Active' LIMIT 1",[$unit])){$pdo->rollBack();fail('This unit is no longer available for booking.',409);}
      self::q('INSERT INTO booking(unit_id,tenant_id,preferred_move_in_date,preferred_move_out_date,remarks) VALUES(?,?,?,?,?)', [$unit, $t, $move, $moveOut, $remarks]);
      $id=(int)self::lastId();
      $pdo->commit();
      return ['duplicate'=>false,'booking_id'=>$id];
    } catch(Throwable $error) {
      if($pdo->inTransaction())$pdo->rollBack();
      throw $error;
    }
  }
  static function forLandlord($id, $lid) { return self::one('SELECT k.booking_status,t.user_id tuser FROM booking k JOIN tenant t USING(tenant_id) JOIN unit n ON n.unit_id=k.unit_id JOIN apartment_building ab ON ab.building_id=n.building_id WHERE k.booking_id=? AND ab.landlord_id=?', [$id, $lid]); }
  static function approve($id) { self::q("UPDATE booking SET booking_status='Approved',reviewed_at=NOW() WHERE booking_id=?", [$id]); }
  static function reject($id, $reason) { self::q("UPDATE booking SET booking_status='Rejected',rejection_reason=?,reviewed_at=NOW() WHERE booking_id=?", [$reason, $id]); }
  static function cancel($id, $t) { return self::q("UPDATE booking SET booking_status='Cancelled' WHERE booking_id=? AND tenant_id=? AND booking_status='Pending'", [$id, $t])->rowCount(); }
  static function approvedOptions($lid) { return self::rows("SELECT k.booking_id value,CONCAT(x.first_name,' ',x.last_name,' – ',bb.building_name,' ',n.unit_number) label,k.preferred_move_in_date move_in,k.preferred_move_out_date move_out,n.monthly_rent FROM booking k JOIN tenant t USING(tenant_id) JOIN users x ON x.user_id=t.user_id JOIN unit n ON n.unit_id=k.unit_id JOIN apartment_building bb ON bb.building_id=n.building_id LEFT JOIN rental r ON r.booking_id=k.booking_id WHERE bb.landlord_id=? AND k.booking_status='Approved' AND r.rental_id IS NULL", [$lid]); }
}
