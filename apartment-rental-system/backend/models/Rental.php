<?php
class Rental extends Model {
  static function listFor($u) {
    $records=self::scoped($u, "SELECT r.rental_id,r.booking_id,r.tenant_id,r.unit_id,CONCAT(x.first_name,' ',x.last_name) tenant,CONCAT(ab.building_name,' · Unit ',n.unit_number) unit,ab.building_name,n.unit_number,r.start_date,r.end_date,r.monthly_rent,r.security_deposit,r.due_day,r.terms,r.rental_status status,r.created_at rental_date FROM rental r JOIN tenant t USING(tenant_id) JOIN users x ON x.user_id=t.user_id JOIN unit n ON n.unit_id=r.unit_id JOIN apartment_building ab ON ab.building_id=n.building_id", 'ab.landlord_id', 'r.tenant_id', 'ORDER BY r.created_at,r.rental_id');
    if($u['role']==='Tenant')return $records;
    $groups=[];
    foreach($records as $record){
      $key=$record['tenant_id'].':'.$record['unit_id'];
      if(!isset($groups[$key]))$groups[$key]=['rental_count'=>0,'history'=>[]];
      $groups[$key]=array_merge($groups[$key],$record);
      $groups[$key]['rental_count']++;
      $groups[$key]['history'][]=$record;
    }
    return array_values($groups);
  }
  static function bookingForAgreement($bid, $lid) { return self::one("SELECT k.unit_id,k.tenant_id FROM booking k JOIN unit n USING(unit_id) JOIN apartment_building ab USING(building_id) LEFT JOIN rental r ON r.booking_id=k.booking_id WHERE k.booking_id=? AND ab.landlord_id=? AND k.booking_status='Approved' AND r.rental_id IS NULL", [$bid, $lid]); }
  static function create($bid, $k, $b) { self::q("INSERT INTO rental(booking_id,unit_id,tenant_id,start_date,end_date,monthly_rent,security_deposit,due_day,terms,rental_status) VALUES(?,?,?,?,?,?,?,?,?,'Draft')", [$bid,$k['unit_id'],$k['tenant_id'],$b['start_date'],$b['end_date'],$b['monthly_rent'],$b['security_deposit'] ?: 0,$b['due_day'] ?: 5,$b['terms'] ?? null]); }
  static function ownedBy($rid, $lid) { return self::one('SELECT 1 FROM rental r JOIN unit n USING(unit_id) JOIN apartment_building ab USING(building_id) WHERE r.rental_id=? AND ab.landlord_id=?', [$rid, $lid]) !== null; }
  static function statusOf($rid) { return self::one('SELECT rental_status FROM rental WHERE rental_id=?', [$rid])['rental_status'] ?? null; }
  static function setStatus($rid, $s) {
    $pdo=Database::pdo();
    $pdo->beginTransaction();
    try {
      self::q('UPDATE rental SET rental_status=? WHERE rental_id=?', [$s, $rid]);
      if($s==='Active')self::q("UPDATE booking k JOIN rental r ON r.booking_id=k.booking_id SET k.booking_status='Completed',k.reviewed_at=COALESCE(k.reviewed_at,NOW()) WHERE r.rental_id=?",[$rid]);
      if (in_array($s, ['Expired','Terminated'], true)) {
        self::q("UPDATE unit n JOIN rental r USING(unit_id) SET n.availability_status='Unavailable' WHERE r.rental_id=? AND n.availability_status='Available'", [$rid]);
      }
      $pdo->commit();
    } catch(Throwable $error) {
      if($pdo->inTransaction())$pdo->rollBack();
      throw $error;
    }
  }
  static function updateDraft($rid, $b) {
    self::q("UPDATE rental SET start_date=?,end_date=?,monthly_rent=?,security_deposit=?,due_day=?,terms=? WHERE rental_id=? AND rental_status='Draft'",
      [$b['start_date'],$b['end_date'],$b['monthly_rent'],$b['security_deposit'] ?: 0,$b['due_day'] ?: 5,$b['terms'] ?? null,$rid]);
  }
  static function activeOptions($lid) { return self::rows("SELECT r.rental_id value,CONCAT(x.first_name,' ',x.last_name,' – ',ab.building_name,' ',n.unit_number) label,r.monthly_rent FROM rental r JOIN tenant t USING(tenant_id) JOIN users x ON x.user_id=t.user_id JOIN unit n ON n.unit_id=r.unit_id JOIN apartment_building ab ON ab.building_id=n.building_id WHERE ab.landlord_id=? AND r.rental_status='Active'", [$lid]); }
  static function activeFor($rid, $lid) { return self::one("SELECT r.unit_id,t.user_id tuser FROM rental r JOIN tenant t USING(tenant_id) JOIN unit n ON n.unit_id=r.unit_id JOIN apartment_building ab ON ab.building_id=n.building_id WHERE r.rental_id=? AND ab.landlord_id=? AND r.rental_status='Active'", [$rid, $lid]); }
  static function mine($t) { return self::one("SELECT r.rental_id,r.start_date,r.end_date,r.monthly_rent,r.security_deposit,r.due_day,r.terms,r.rental_status,ab.building_name,ab.deactivated_by_admin building_deactivated_by_admin,ab.deactivation_reason building_deactivation_reason,COALESCE(NULLIF(ab.complete_address,''),CONCAT_WS(', ',NULLIF(ab.street_address,''),NULLIF(ab.barangay,''),NULLIF(ab.city,''),NULLIF(ab.province,''))) complete_address,ab.city,n.unit_number,n.bedrooms,n.amenities,n.deactivated_by_admin unit_deactivated_by_admin,n.deactivation_reason unit_deactivation_reason,CONCAT(x.first_name,' ',x.last_name) landlord,x.contact_number landlord_contact,x.account_status landlord_account_status,x.account_status_reason landlord_account_reason,l.accepts_gcash,l.gcash_number,l.accepts_bank,l.bank_name,l.bank_account_number,l.accepts_cash FROM rental r JOIN unit n USING(unit_id) JOIN apartment_building ab USING(building_id) JOIN landlord l ON l.landlord_id=ab.landlord_id JOIN users x ON x.user_id=l.user_id WHERE r.tenant_id=? AND r.rental_status IN ('Active','Draft') ORDER BY r.rental_status='Active' DESC,r.created_at DESC LIMIT 1", [$t]); }
  static function renewals($u) { return self::scoped($u, "SELECT lr.renewal_id,CONCAT(x.first_name,' ',x.last_name) tenant,CONCAT(ab.building_name,' ',n.unit_number) unit,r.end_date current_end,lr.requested_months,lr.tenant_remarks,lr.renewal_status status,lr.landlord_remarks,lr.created_at FROM lease_renewal lr JOIN rental r USING(rental_id) JOIN tenant t ON t.tenant_id=lr.tenant_id JOIN users x ON x.user_id=t.user_id JOIN unit n ON n.unit_id=r.unit_id JOIN apartment_building ab ON ab.building_id=n.building_id", 'ab.landlord_id', 'lr.tenant_id', 'ORDER BY lr.created_at DESC'); }
  static function activeOf($t) { return self::one("SELECT rental_id FROM rental WHERE tenant_id=? AND rental_status='Active'", [$t]); }
  static function renewalPending($rid) { return self::one("SELECT 1 FROM lease_renewal WHERE rental_id=? AND renewal_status='Pending'", [$rid]) !== null; }
  static function requestRenewal($rid, $t, $months, $remarks) { self::q('INSERT INTO lease_renewal(rental_id,tenant_id,requested_months,tenant_remarks) VALUES(?,?,?,?)', [$rid, $t, $months, $remarks]); }
  static function landlordUserOf($rid) { return self::one('SELECT l.user_id FROM rental r JOIN unit n USING(unit_id) JOIN apartment_building ab USING(building_id) JOIN landlord l ON l.landlord_id=ab.landlord_id WHERE r.rental_id=?', [$rid])['user_id'] ?? null; }
  static function renewalFor($id, $lid) { return self::one('SELECT lr.rental_id,lr.requested_months,lr.renewal_status,t.user_id tuser FROM lease_renewal lr JOIN rental r USING(rental_id) JOIN tenant t ON t.tenant_id=lr.tenant_id JOIN unit n ON n.unit_id=r.unit_id JOIN apartment_building ab ON ab.building_id=n.building_id WHERE lr.renewal_id=? AND ab.landlord_id=?', [$id, $lid]); }
  static function approveRenewal($id, $rid, $months, $remarks) { self::q('UPDATE rental SET end_date=DATE_ADD(end_date,INTERVAL ? MONTH) WHERE rental_id=?', [$months, $rid]); self::q("UPDATE lease_renewal SET renewal_status='Approved',landlord_remarks=?,decided_at=NOW() WHERE renewal_id=?", [$remarks, $id]); }
  static function rejectRenewal($id, $remarks) { self::q("UPDATE lease_renewal SET renewal_status='Rejected',landlord_remarks=?,decided_at=NOW() WHERE renewal_id=?", [$remarks, $id]); }
}
