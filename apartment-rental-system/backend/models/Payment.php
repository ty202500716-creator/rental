<?php
// Shared payment functions. Each payment references exactly ONE bill. DB triggers update the bill and issue the receipt when a payment becomes Verified.
class Payment extends Model {
  static function listFor($u) { return self::scoped($u, "SELECT p.payment_id,p.bill_category category,CONCAT(x.first_name,' ',x.last_name) tenant,p.amount_paid amount,p.payment_method method,p.reference_number reference,p.proof_file,p.payment_date,p.payment_status status,p.rejection_reason,pr.receipt_number FROM payment p JOIN tenant t USING(tenant_id) JOIN users x ON x.user_id=t.user_id JOIN unit n ON n.unit_id=p.unit_id JOIN apartment_building ab ON ab.building_id=n.building_id LEFT JOIN payment_receipt pr ON pr.payment_id=p.payment_id", 'ab.landlord_id', 'p.tenant_id', 'ORDER BY p.created_at DESC'); }
  static function rentalListFor($u) {
    $where = ["p.bill_category='Rental'"]; $params = [];
    if ($u['role'] === 'Landlord') {
      $lid = Landlord::idFor($u['user_id']);
      if (!$lid) fail('Landlord profile not found.', 404);
      $where[] = 'ab.landlord_id=?'; $params[] = $lid;
    } elseif ($u['role'] === 'Tenant') {
      $tid = Tenant::idFor($u['user_id']);
      if (!$tid) fail('Tenant profile not found.', 404);
      $where[] = 'p.tenant_id=?'; $params[] = $tid;
    }
    if (!empty($_GET['landlord_id']) && $u['role'] === 'Admin') { $where[]='ab.landlord_id=?'; $params[]=(int)$_GET['landlord_id']; }
    if (!empty($_GET['tenant'])) { $s='%'.$_GET['tenant'].'%'; $where[]="(x.first_name LIKE ? OR x.last_name LIKE ? OR CONCAT(x.first_name,' ',x.last_name) LIKE ?)"; array_push($params,$s,$s,$s); }
    if (!empty($_GET['building'])) { $where[]='ab.building_name LIKE ?'; $params[]='%'.$_GET['building'].'%'; }
    if (!empty($_GET['unit'])) { $where[]='n.unit_number LIKE ?'; $params[]='%'.$_GET['unit'].'%'; }
    if (!empty($_GET['payment_date'])) { $where[]='p.payment_date=?'; $params[]=$_GET['payment_date']; }
    if (!empty($_GET['method'])) { $where[]='p.payment_method=?'; $params[]=$_GET['method']; }
    if (!empty($_GET['status'])) { $where[]='p.payment_status=?'; $params[]=$_GET['status']; }
    return self::rows("SELECT p.payment_id,p.rental_bill_id,CONCAT(x.first_name,' ',x.last_name) tenant,x.email tenant_email,
        ab.building_name,n.unit_number,CONCAT(ab.building_name,' · Unit ',n.unit_number) unit,l.landlord_id,
        CONCAT(lu.first_name,' ',lu.last_name) landlord,p.amount_paid amount,p.payment_method method,
        p.reference_number reference,p.proof_file,p.payment_date,p.payment_status status,p.rejection_reason,
        p.verified_by,p.verified_at,CONCAT(vu.first_name,' ',vu.last_name) verified_by_name,
        p.recorded_by,CONCAT(ru.first_name,' ',ru.last_name) recorded_by_name,
        pr.receipt_number,pr.issued_at receipt_issued_at,pr.amount_received receipt_amount,
        rb.billing_month,rb.due_date
      FROM payment p JOIN tenant t USING(tenant_id) JOIN users x ON x.user_id=t.user_id
      JOIN unit n ON n.unit_id=p.unit_id JOIN apartment_building ab ON ab.building_id=n.building_id
      JOIN landlord l ON l.landlord_id=ab.landlord_id JOIN users lu ON lu.user_id=l.user_id
      LEFT JOIN users vu ON vu.user_id=p.verified_by LEFT JOIN users ru ON ru.user_id=p.recorded_by
      LEFT JOIN payment_receipt pr ON pr.payment_id=p.payment_id LEFT JOIN rental_bill rb ON rb.rental_bill_id=p.rental_bill_id
      WHERE ".implode(' AND ',$where).' ORDER BY p.created_at DESC,p.payment_id DESC', $params);
  }
  static function rentalDashboard($u) {
    $where=''; $params=[];
    if ($u['role']==='Landlord') {
      $lid=Landlord::idFor($u['user_id']);
      if (!$lid) fail('Landlord profile not found.',404);
      $where=' WHERE ab.landlord_id=?'; $params[]=$lid;
    }
    $bills=self::one("SELECT COUNT(*) total_bills,
        COALESCE(SUM(rb.status='Paid'),0) paid_bills,
        COALESCE(SUM(rb.status='Unpaid'),0) unpaid_bills,
        COALESCE(SUM(rb.status='Partially Paid'),0) partial_bills,
        COALESCE(SUM(rb.status='Overdue'),0) overdue_bills,
        COALESCE(SUM(rb.balance),0) outstanding,
        COALESCE(SUM(rb.amount_paid),0) collected
      FROM rental_bill rb JOIN unit n ON n.unit_id=rb.unit_id
      JOIN apartment_building ab ON ab.building_id=n.building_id$where", $params);
    $pendingWhere=$where ? ' AND ab.landlord_id=?' : '';
    $pendingParams=$where ? [$params[0]] : [];
    $pending=self::one("SELECT COUNT(*) total FROM payment p JOIN unit n ON n.unit_id=p.unit_id
      JOIN apartment_building ab ON ab.building_id=n.building_id
      WHERE p.bill_category='Rental' AND p.payment_status='Pending'".$pendingWhere,$pendingParams)['total'];
    $months=self::rows("SELECT DATE_FORMAT(p.payment_date,'%Y-%m') month,
        COALESCE(SUM(p.amount_paid),0) collected,COUNT(*) payments
      FROM payment p JOIN unit n ON n.unit_id=p.unit_id JOIN apartment_building ab ON ab.building_id=n.building_id
      WHERE p.bill_category='Rental' AND p.payment_status='Verified'
        AND p.payment_date>=DATE_SUB(CURDATE(),INTERVAL 5 MONTH)".$pendingWhere."
      GROUP BY DATE_FORMAT(p.payment_date,'%Y-%m') ORDER BY month", $pendingParams);
    $recent=self::rows("SELECT p.payment_id,CONCAT(x.first_name,' ',x.last_name) tenant,
        CONCAT(ab.building_name,' · Unit ',n.unit_number) unit,p.amount_paid amount,
        p.payment_method method,p.payment_date,p.payment_status status,pr.receipt_number
      FROM payment p JOIN tenant t USING(tenant_id) JOIN users x ON x.user_id=t.user_id
      JOIN unit n ON n.unit_id=p.unit_id JOIN apartment_building ab ON ab.building_id=n.building_id
      LEFT JOIN payment_receipt pr ON pr.payment_id=p.payment_id
      WHERE p.bill_category='Rental'".($where ? ' AND ab.landlord_id=?' : '').
      ' ORDER BY p.created_at DESC,p.payment_id DESC LIMIT 10',$pendingParams);
    return ['stats'=>[
      'total_bills'=>(int)$bills['total_bills'],'paid_bills'=>(int)$bills['paid_bills'],
      'unpaid_bills'=>(int)$bills['unpaid_bills'],'partial_bills'=>(int)$bills['partial_bills'],
      'pending_payments'=>(int)$pending,'overdue_bills'=>(int)$bills['overdue_bills'],
      'outstanding'=>(float)$bills['outstanding'],'collected'=>(float)$bills['collected']
    ],'monthly'=>$months,'recent'=>$recent];
  }
  static function accepted($unitId) { return self::one('SELECT l.accepts_gcash,l.accepts_bank,l.accepts_cash FROM unit n JOIN apartment_building ab USING(building_id) JOIN landlord l ON l.landlord_id=ab.landlord_id WHERE n.unit_id=?', [$unitId]); }
  static function submit($kind, $bid, $bill, $t, $b, $proof, $uid) { self::q('INSERT INTO payment(rental_bill_id,utility_bill_id,bill_category,unit_id,tenant_id,amount_paid,payment_method,reference_number,proof_file,payment_date,recorded_by) VALUES(?,?,?,?,?,?,?,?,?,CURDATE(),?)', [$kind === 'Rental' ? $bid : null,$kind === 'Rental' ? null : $bid,$bill['cat'],$bill['unit_id'],$t,$b['amount'],$b['method'],$b['reference'] ?? null,$proof,$uid]); return self::lastId(); }
  static function forLandlord($id, $lid) { return self::one('SELECT p.payment_status,t.user_id tuser FROM payment p JOIN tenant t USING(tenant_id) JOIN unit n ON n.unit_id=p.unit_id JOIN apartment_building ab ON ab.building_id=n.building_id WHERE p.payment_id=? AND ab.landlord_id=?', [$id, $lid]); }
  static function verify($id, $by) {
    if (!self::q("UPDATE payment SET payment_status='Verified',verified_by=?,verified_at=NOW() WHERE payment_id=? AND payment_status='Pending'", [$by, $id])->rowCount()) fail('This payment was already decided.',409);
  }
  static function reject($id, $by, $reason) {
    if (!self::q("UPDATE payment SET payment_status='Rejected',rejection_reason=?,verified_by=?,verified_at=NOW() WHERE payment_id=? AND payment_status='Pending'", [$reason, $by, $id])->rowCount()) fail('This payment was already decided.',409);
  }
  static function recordCash($kind, $bid, $bill, $amount, $by) { self::q("INSERT INTO payment(rental_bill_id,utility_bill_id,bill_category,unit_id,tenant_id,amount_paid,payment_method,payment_date,payment_status,recorded_by,verified_by,verified_at) VALUES(?,?,?,?,?,?,'Cash',CURDATE(),'Verified',?,?,NOW())", [$kind === 'Rental' ? $bid : null,$kind === 'Rental' ? null : $bid,$bill['cat'],$bill['unit_id'],$bill['tenant_id'],$amount,$by,$by]); return self::lastId(); }
  static function receipts($t) { return self::rows("SELECT pr.receipt_number,p.bill_category category,pr.amount_received amount,p.payment_method method,pr.issued_at,CONCAT(ab.building_name,' ',n.unit_number) unit FROM payment_receipt pr JOIN payment p USING(payment_id) JOIN unit n ON n.unit_id=p.unit_id JOIN apartment_building ab ON ab.building_id=n.building_id WHERE p.tenant_id=? ORDER BY pr.issued_at DESC", [$t]); }
}
