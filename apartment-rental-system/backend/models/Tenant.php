<?php
class Tenant extends Model {
  static function idFor($uid) { static $c = []; return $c[$uid] ??= (self::one('SELECT tenant_id FROM tenant WHERE user_id=?', [$uid])['tenant_id'] ?? null); }
  static function userId($tid) { return (int)(self::one('SELECT user_id FROM tenant WHERE tenant_id=?',[(int)$tid])['user_id']??0); }
  static function relatedLandlordUsers($tid) {
    return array_map('intval',array_column(self::rows("SELECT DISTINCT lu.user_id FROM landlord l JOIN users lu ON lu.user_id=l.user_id
      JOIN apartment_building ab ON ab.landlord_id=l.landlord_id JOIN unit n ON n.building_id=ab.building_id
      WHERE EXISTS(SELECT 1 FROM booking k WHERE k.unit_id=n.unit_id AND k.tenant_id=? AND k.booking_status='Pending')
         OR EXISTS(SELECT 1 FROM rental r WHERE r.unit_id=n.unit_id AND r.tenant_id=? AND r.rental_status='Active')",[(int)$tid,(int)$tid]),'user_id'));
  }
  static function create($uid, $b, $hasFile) { $address=$b['validated_address']; self::q('INSERT INTO tenant(user_id,date_of_birth,gender,complete_address,region_code,province_code,city_municipality_code,barangay_code,street_address,occupation,emergency_contact_name,emergency_contact_number,emergency_contact_relation,id_type,id_number,verification_status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [$uid,$b['dob'],$b['gender'] ?? null,$address['complete_address'],$address['region_code'],$address['province_code'],$address['city_municipality_code'],$address['barangay_code'],$address['street_address'],$b['occupation'],$b['ec_name'],'+63'.$b['ec_phone'],$b['ec_relation'] ?? null,$b['id_type'],$b['id_number'],$hasFile ? 'Pending' : 'Unverified']); }
  static function listFor($u) {
    $scope = self::scope($u, 't');
    $landlordUnits = $u['role'] === 'Landlord' ? ' AND ab.landlord_id='.(int)Landlord::idFor($u['user_id']) : '';
    $sql = "SELECT t.tenant_id,t.user_id,CONCAT(x.first_name,' ',x.last_name) name,x.email,x.contact_number,
        t.id_type,t.id_number,t.verification_status,x.account_status,x.account_status_reason,
        EXISTS(SELECT 1 FROM user_documents d WHERE d.user_id=t.user_id) document_available,
        CONCAT_WS(', ',
          (SELECT GROUP_CONCAT(DISTINCT ab.building_name ORDER BY ab.building_name SEPARATOR ', ')
            FROM booking k JOIN unit n USING(unit_id) JOIN apartment_building ab USING(building_id)
            WHERE k.tenant_id=t.tenant_id$landlordUnits),
          (SELECT GROUP_CONCAT(DISTINCT ab.building_name ORDER BY ab.building_name SEPARATOR ', ')
            FROM rental r JOIN unit n USING(unit_id) JOIN apartment_building ab USING(building_id)
            WHERE r.tenant_id=t.tenant_id$landlordUnits)
        ) associated_building,
        CONCAT_WS(', ',
          (SELECT GROUP_CONCAT(DISTINCT n.unit_number ORDER BY n.unit_number SEPARATOR ', ')
            FROM booking k JOIN unit n USING(unit_id) JOIN apartment_building ab USING(building_id)
            WHERE k.tenant_id=t.tenant_id$landlordUnits),
          (SELECT GROUP_CONCAT(DISTINCT n.unit_number ORDER BY n.unit_number SEPARATOR ', ')
            FROM rental r JOIN unit n USING(unit_id) JOIN apartment_building ab USING(building_id)
            WHERE r.tenant_id=t.tenant_id$landlordUnits)
        ) unit_numbers,
        CONCAT_WS(', ',
          (SELECT GROUP_CONCAT(DISTINCT CONCAT(ab.building_name,' · Unit ',n.unit_number) ORDER BY ab.building_name,n.unit_number SEPARATOR ', ')
            FROM booking k JOIN unit n USING(unit_id) JOIN apartment_building ab USING(building_id)
            WHERE k.tenant_id=t.tenant_id$landlordUnits),
          (SELECT GROUP_CONCAT(DISTINCT CONCAT(ab.building_name,' · Unit ',n.unit_number) ORDER BY ab.building_name,n.unit_number SEPARATOR ', ')
            FROM rental r JOIN unit n USING(unit_id) JOIN apartment_building ab USING(building_id)
            WHERE r.tenant_id=t.tenant_id$landlordUnits)
        ) associated_unit
      FROM tenant t JOIN users x USING(user_id)".$scope[0]." ORDER BY x.last_name,x.first_name";
    return self::rows($sql, $scope[1]);
  }
  static function scope($u, $alias = 't') {
    if ($u['role'] !== 'Landlord') return ['', []];
    $landlordId = Landlord::idFor($u['user_id']);
    if (!$landlordId) fail('Landlord profile not found.', 404);
    return [" WHERE (
      EXISTS (SELECT 1 FROM booking k JOIN unit n USING(unit_id) JOIN apartment_building ab USING(building_id)
        WHERE k.tenant_id=$alias.tenant_id AND ab.landlord_id=?)
      OR EXISTS (SELECT 1 FROM rental r JOIN unit n USING(unit_id) JOIN apartment_building ab USING(building_id)
        WHERE r.tenant_id=$alias.tenant_id AND ab.landlord_id=?)
    )", [$landlordId, $landlordId]];
  }
  static function dealsWith($tid, $lid) {
    return self::one("SELECT 1 WHERE EXISTS (
      SELECT 1 FROM booking k JOIN unit n USING(unit_id) JOIN apartment_building ab USING(building_id)
      WHERE k.tenant_id=? AND ab.landlord_id=?
    ) OR EXISTS (
      SELECT 1 FROM rental r JOIN unit n USING(unit_id) JOIN apartment_building ab USING(building_id)
      WHERE r.tenant_id=? AND ab.landlord_id=?
    )", [$tid, $lid, $tid, $lid]) !== null;
  }
  static function details($tid, $u) {
    $scope = self::scope($u, 't');
    $scopeSql = preg_replace('/^\s*WHERE\b/', ' AND', $scope[0], 1);
    $sql = "SELECT t.tenant_id,CONCAT_WS(' ',x.first_name,x.middle_name,x.last_name) name,x.email,x.contact_number,
        x.account_status,x.account_status_reason,t.date_of_birth,t.gender,t.complete_address,t.occupation,
        t.emergency_contact_name,t.emergency_contact_number,t.emergency_contact_relation,
        t.id_type,t.id_number,t.verification_status,t.rejection_reason,t.verified_at,
        CONCAT_WS(' ',v.first_name,v.last_name) verified_by,
        EXISTS(SELECT 1 FROM user_documents d WHERE d.user_id=t.user_id) document_available,
        CONCAT_WS(', ',
          (SELECT GROUP_CONCAT(DISTINCT CONCAT(a.building_name,' · Unit ',n.unit_number) ORDER BY a.building_name,n.unit_number SEPARATOR ', ')
            FROM booking k JOIN unit n USING(unit_id) JOIN apartment_building a USING(building_id)
            WHERE k.tenant_id=t.tenant_id".($u['role'] === 'Landlord' ? " AND a.landlord_id=". (int)Landlord::idFor($u['user_id']) : "")."),
          (SELECT GROUP_CONCAT(DISTINCT CONCAT(a.building_name,' · Unit ',n.unit_number) ORDER BY a.building_name,n.unit_number SEPARATOR ', ')
            FROM rental r JOIN unit n USING(unit_id) JOIN apartment_building a USING(building_id)
            WHERE r.tenant_id=t.tenant_id".($u['role'] === 'Landlord' ? " AND a.landlord_id=".(int)Landlord::idFor($u['user_id']) : "").")
        ) associated_unit
      FROM tenant t JOIN users x USING(user_id)
      LEFT JOIN users v ON v.user_id=t.verified_by_user_id
      WHERE t.tenant_id=?$scopeSql";
    $row = self::one($sql, array_merge([(int)$tid], $scope[1]));
    if (!$row) fail('Tenant not found.', 404);
    $landlordId=$u['role']==='Landlord'?(int)Landlord::idFor($u['user_id']):null;
    $landlordFilter=$landlordId===null?'':' AND ab.landlord_id=?';
    $landlordParams=$landlordId===null?[]:[$landlordId];
    $row['current_rental']=self::one("SELECT r.rental_id,r.rental_status,CONCAT(ab.building_name,' · Unit ',n.unit_number) unit,ab.building_name,n.unit_number,r.start_date,r.end_date,r.monthly_rent,CONCAT(lu.first_name,' ',lu.last_name) landlord,lu.account_status landlord_account_status FROM rental r JOIN unit n USING(unit_id) JOIN apartment_building ab USING(building_id) JOIN landlord l ON l.landlord_id=ab.landlord_id JOIN users lu ON lu.user_id=l.user_id WHERE r.tenant_id=? AND r.rental_status IN ('Active','Draft')$landlordFilter ORDER BY r.rental_status='Active' DESC,r.created_at DESC LIMIT 1",array_merge([(int)$tid],$landlordParams));
    $row['booking_history']=self::rows("SELECT k.booking_id,k.booking_status,k.created_at,k.preferred_move_in_date,k.preferred_move_out_date,k.rejection_reason,ab.building_name,n.unit_number,CONCAT(lu.first_name,' ',lu.last_name) landlord FROM booking k JOIN unit n USING(unit_id) JOIN apartment_building ab USING(building_id) JOIN landlord l ON l.landlord_id=ab.landlord_id JOIN users lu ON lu.user_id=l.user_id WHERE k.tenant_id=?$landlordFilter ORDER BY k.created_at DESC,k.booking_id DESC",array_merge([(int)$tid],$landlordParams));
    $row['rental_history']=self::rows("SELECT r.rental_id,r.rental_status,r.start_date,r.end_date,r.monthly_rent,ab.building_name,n.unit_number,CONCAT(lu.first_name,' ',lu.last_name) landlord FROM rental r JOIN unit n USING(unit_id) JOIN apartment_building ab USING(building_id) JOIN landlord l ON l.landlord_id=ab.landlord_id JOIN users lu ON lu.user_id=l.user_id WHERE r.tenant_id=?$landlordFilter ORDER BY r.created_at DESC,r.rental_id DESC",array_merge([(int)$tid],$landlordParams));
    return $row;
  }
  static function counts($u) {
    $scope = self::scope($u, 't');
    return self::one("SELECT COUNT(*) total,
        COALESCE(SUM(t.verification_status='Verified'),0) verified,
        COALESCE(SUM(t.verification_status='Pending'),0) pending,
        COALESCE(SUM(t.verification_status='Rejected'),0) rejected
      FROM tenant t".$scope[0], $scope[1]);
  }
  static function document($tid) {
    return self::one("SELECT d.file_path FROM user_documents d
      JOIN tenant t ON t.user_id=d.user_id
      WHERE t.tenant_id=? ORDER BY d.uploaded_at DESC,d.document_id DESC LIMIT 1", [(int)$tid]);
  }
  static function identityDocuments($uid) {
    return self::rows("SELECT document_id,document_type,original_filename,file_path,review_status,review_remarks,reviewed_at,uploaded_at
      FROM user_documents WHERE user_id=? ORDER BY uploaded_at DESC,document_id DESC", [(int)$uid]);
  }
  static function review($tid, $userId, $decision, $reason = null) {
    $tenant = self::one("SELECT t.verification_status,
        EXISTS(SELECT 1 FROM user_documents d WHERE d.user_id=t.user_id) has_document
      FROM tenant t WHERE t.tenant_id=?", [(int)$tid]);
    if (!$tenant) fail('Tenant not found.', 404);
    if (!$tenant['has_document']) fail('This tenant has not submitted an identity document.');
    if ($tenant['verification_status'] !== 'Pending') fail('Only pending identity verifications can be reviewed.');
    $status = $decision === 'Verified' ? 'Verified' : 'Rejected';
    self::q("UPDATE tenant SET verification_status=?,rejection_reason=?,verified_by_user_id=?,
      verified_by_landlord_id=NULL,verified_at=NOW() WHERE tenant_id=?",
      [$status, $status === 'Rejected' ? $reason : null, $userId, (int)$tid]);
    self::q("UPDATE user_documents SET review_status=?,review_remarks=?,reviewed_by=?,reviewed_at=NOW()
      WHERE document_id=(SELECT document_id FROM (SELECT document_id FROM user_documents
        WHERE user_id=(SELECT user_id FROM tenant WHERE tenant_id=?) ORDER BY uploaded_at DESC,document_id DESC LIMIT 1) latest)",
      [$status === 'Verified' ? 'Approved' : 'Rejected',$status === 'Rejected' ? $reason : null,$userId,(int)$tid]);
  }
  static function submitIdentity($uid, $type, $no, $file, $orig) {
    self::q("UPDATE tenant SET id_type=?,id_number=?,verification_status='Pending',rejection_reason=NULL,verified_by_user_id=NULL,verified_by_landlord_id=NULL,verified_at=NULL WHERE user_id=?", [$type, $no, $uid]);
    self::q('INSERT INTO user_documents(user_id,file_path,original_filename) VALUES(?,?,?)', [$uid, $file, $orig]);
  }
  static function saveDocument($uid, $file, $orig) { self::q('INSERT INTO user_documents(user_id,file_path,original_filename) VALUES(?,?,?)', [$uid, $file, $orig]); }
  static function dashboard($t, $uid) { return [
    'booking' => self::one('SELECT booking_status FROM booking WHERE tenant_id=? ORDER BY created_at DESC LIMIT 1', [$t])['booking_status'] ?? 'None',
    'apartment' => self::one("SELECT CONCAT(ab.building_name,' ',n.unit_number) a,r.monthly_rent,u.account_status landlord_account_status,u.account_status_reason landlord_account_reason,ab.deactivated_by_admin building_deactivated_by_admin,ab.deactivation_reason building_deactivation_reason,n.deactivated_by_admin unit_deactivated_by_admin,n.deactivation_reason unit_deactivation_reason FROM rental r JOIN unit n USING(unit_id) JOIN apartment_building ab USING(building_id) JOIN landlord l ON l.landlord_id=ab.landlord_id JOIN users u ON u.user_id=l.user_id WHERE r.tenant_id=? AND r.rental_status='Active'", [$t]),
    'next_rent' => self::one('SELECT rb.due_date,rb.balance FROM rental_bill rb JOIN rental r USING(rental_id) WHERE r.tenant_id=? AND rb.balance>0 ORDER BY rb.due_date LIMIT 1', [$t]),
    'unpaid_utilities' => self::one('SELECT COUNT(*) c,COALESCE(SUM(ub.balance),0) total FROM utility_bill ub JOIN rental r USING(rental_id) WHERE r.tenant_id=? AND ub.balance>0', [$t]),
    'unread' => self::one('SELECT COUNT(*) c FROM notification WHERE user_id=? AND is_read=0', [$uid])['c']]; }
}
