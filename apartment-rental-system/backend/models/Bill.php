<?php
// Rental bills and utility bills (electricity & water share utility_bill via bill_type)
class Bill extends Model {
  static function rental($u) {
    $where = []; $params = [];
    if ($u['role'] === 'Landlord') {
      $lid = Landlord::idFor($u['user_id']);
      if (!$lid) fail('Landlord profile not found.', 404);
      $where[] = 'ab.landlord_id=?'; $params[] = $lid;
    } elseif ($u['role'] === 'Tenant') {
      $tid = Tenant::idFor($u['user_id']);
      if (!$tid) fail('Tenant profile not found.', 404);
      $where[] = 'r.tenant_id=?'; $params[] = $tid;
    }
    $sql = "SELECT rb.rental_bill_id id,rb.rental_id,'Rental' type,CONCAT(x.first_name,' ',x.last_name) tenant,x.email tenant_email,
        CONCAT(ab.building_name,' · Unit ',n.unit_number) unit,ab.building_name,n.unit_number,
        l.landlord_id,CONCAT(lu.first_name,' ',lu.last_name) landlord,
        rb.billing_month,rb.due_date,rb.amount_due,rb.amount_paid,rb.balance,rb.status,rb.remarks,rb.created_at,
        (SELECT COUNT(*) FROM payment p WHERE p.rental_bill_id=rb.rental_bill_id AND p.payment_status='Pending') pending,
        (SELECT COUNT(*) FROM payment p WHERE p.rental_bill_id=rb.rental_bill_id) payment_count
      FROM rental_bill rb JOIN rental r USING(rental_id) JOIN tenant t ON t.tenant_id=r.tenant_id
      JOIN users x ON x.user_id=t.user_id JOIN unit n ON n.unit_id=rb.unit_id
      JOIN apartment_building ab ON ab.building_id=n.building_id
      JOIN landlord l ON l.landlord_id=ab.landlord_id JOIN users lu ON lu.user_id=l.user_id";
    if (!empty($_GET['landlord_id']) && $u['role'] === 'Admin') { $where[] = 'l.landlord_id=?'; $params[] = (int)$_GET['landlord_id']; }
    foreach (['tenant' => 'x.first_name', 'building' => 'ab.building_name', 'unit' => 'n.unit_number'] as $key => $column) {
      if (!empty($_GET[$key])) {
        $search = '%'.$_GET[$key].'%';
        if ($key === 'tenant') { $where[] = "(x.first_name LIKE ? OR x.last_name LIKE ? OR CONCAT(x.first_name,' ',x.last_name) LIKE ?)"; array_push($params,$search,$search,$search); }
        else { $where[] = "$column LIKE ?"; $params[] = $search; }
      }
    }
    if (!empty($_GET['billing_month'])) { $where[] = 'DATE_FORMAT(rb.billing_month,"%Y-%m")=?'; $params[] = substr($_GET['billing_month'],0,7); }
    if (!empty($_GET['status'])) { $where[] = 'rb.status=?'; $params[] = $_GET['status']; }
    if ($where) $sql .= ' WHERE '.implode(' AND ',$where);
    return self::rows($sql.' ORDER BY rb.due_date DESC,rb.rental_bill_id DESC', $params);
  }
  static function utility($u) { return self::scoped($u, "SELECT ub.utility_bill_id id,ub.bill_type type,CONCAT(x.first_name,' ',x.last_name) tenant,CONCAT(ab.building_name,' ',n.unit_number) unit,ub.billing_period_start,ub.billing_period_end,ub.previous_reading,ub.current_reading,ub.consumption,ub.rate_per_unit rate,ub.amount_due,ub.amount_due amt,ub.amount_paid,ub.balance,ub.balance bal,ub.due_date,ub.due_date due,ub.status,(SELECT COUNT(*) FROM payment p WHERE p.utility_bill_id=ub.utility_bill_id AND p.payment_status='Pending') pending FROM utility_bill ub JOIN rental r USING(rental_id) JOIN tenant t ON t.tenant_id=r.tenant_id JOIN users x ON x.user_id=t.user_id JOIN unit n ON n.unit_id=ub.unit_id JOIN apartment_building ab ON ab.building_id=n.building_id", 'ab.landlord_id', 'r.tenant_id', 'ORDER BY ub.due_date DESC,ub.bill_type'); }
  static function createRental($rid, $unit, $b) { self::q('INSERT INTO rental_bill(rental_id,unit_id,billing_month,due_date,amount_due) VALUES(?,?,?,?,?)', [$rid, $unit, substr($b['billing_month'], 0, 7).'-01', $b['due_date'], $b['amount_due']]); }
  static function updateRental($id, $b, $lid) {
    $where = $lid === null ? '' : ' AND ab.landlord_id=?';
    $params = $lid === null ? [(int)$id] : [(int)$id,$lid];
    $bill = self::one("SELECT rb.rental_bill_id FROM rental_bill rb JOIN rental r USING(rental_id)
      JOIN unit n ON n.unit_id=rb.unit_id JOIN apartment_building ab ON ab.building_id=n.building_id
      WHERE rb.rental_bill_id=? AND rb.amount_paid=0 AND rb.status='Unpaid'
      AND NOT EXISTS(SELECT 1 FROM payment p WHERE p.rental_bill_id=rb.rental_bill_id AND p.payment_status='Pending')$where", $params);
    if (!$bill) fail('Only unpaid rental bills with no pending payments can be edited.', 409);
    self::q("UPDATE rental_bill SET billing_month=?,due_date=?,amount_due=?,remarks=?
      WHERE rental_bill_id=?", [substr($b['billing_month'],0,7).'-01',$b['due_date'],$b['amount_due'],$b['remarks'] ?? null,(int)$id]);
  }
  static function createUtility($rid, $unit, $b) { self::q('INSERT INTO utility_bill(rental_id,unit_id,bill_type,billing_period_start,billing_period_end,previous_reading,current_reading,rate_per_unit,due_date) VALUES(?,?,?,?,?,?,?,?,?)', [$rid,$unit,$b['bill_type'],$b['period_start'],$b['period_end'],$b['previous_reading'],$b['current_reading'],$b['rate_per_unit'],$b['due_date']]); }
  // Find ONE bill (rental or utility) the caller may pay/record. $where uses aliases r (rental) and ab (building).
  static function lookup($kind, $bid, $where, $p) {
    if ($kind === 'Rental') $b = self::one("SELECT rb.unit_id,rb.balance,r.tenant_id FROM rental_bill rb JOIN rental r USING(rental_id) JOIN unit un ON un.unit_id=rb.unit_id JOIN apartment_building ab ON ab.building_id=un.building_id WHERE rb.rental_bill_id=? AND $where", array_merge([$bid], $p));
    else $b = self::one("SELECT ub.unit_id,ub.balance,r.tenant_id,ub.bill_type FROM utility_bill ub JOIN rental r USING(rental_id) JOIN unit un ON un.unit_id=ub.unit_id JOIN apartment_building ab ON ab.building_id=un.building_id WHERE ub.utility_bill_id=? AND $where", array_merge([$bid], $p));
    if (!$b) fail('Bill not found.', 404); $b['cat'] = $kind === 'Rental' ? 'Rental' : $b['bill_type']; return $b;
  }
}
