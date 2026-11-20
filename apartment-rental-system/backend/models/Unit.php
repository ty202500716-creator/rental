<?php
class Unit extends Model {
  static function ownershipScope($u) {
    if ($u['role'] !== 'Landlord') return ['', []];
    $lid = Landlord::idFor($u['user_id']);
    if (!$lid) fail('Landlord profile not found.', 404);
    return [' WHERE b.landlord_id=?', [$lid]];
  }
  static function listFor($u) {
    $scope = self::ownershipScope($u);
    $sql = "SELECT n.unit_id,n.building_id,b.landlord_id,b.building_name,b.status building_status,b.deactivated_by_admin building_deactivated_by_admin,b.deactivation_reason building_deactivation_reason,CONCAT(owner.first_name,' ',owner.last_name) landlord,n.unit_number,n.bedrooms,n.bathrooms,n.floor_area_sqm,n.monthly_rent,n.description,n.amenities,n.photos,n.availability_status,n.deactivated_by_admin,n.deactivation_reason,n.deactivated_at,CONCAT(tu.first_name,' ',tu.last_name) current_tenant,tu.profile_photo tenant_photo,tu.account_status tenant_account_status,tu.account_status_reason tenant_account_reason,r.end_date lease_end_date,(SELECT COUNT(*) FROM booking k WHERE k.unit_id=n.unit_id AND k.booking_status='Pending') pending_bookings FROM unit n JOIN apartment_building b USING(building_id) JOIN landlord l ON l.landlord_id=b.landlord_id JOIN users owner ON owner.user_id=l.user_id LEFT JOIN rental r ON r.unit_id=n.unit_id AND r.rental_status='Active' LEFT JOIN tenant t ON t.tenant_id=r.tenant_id LEFT JOIN users tu ON tu.user_id=t.user_id".$scope[0];
    if (!empty($_GET['building_id'])) { $sql .= ($scope[0] ? ' AND' : ' WHERE').' n.building_id=?'; $scope[1][] = (int)$_GET['building_id']; }
    return self::rows($sql.' ORDER BY b.building_name,n.unit_number', $scope[1]);
  }
  static function browse($f) {
    $w = ["b.status='Active'","b.deactivated_by_admin=0","u.deactivated_by_admin=0","landlord_user.account_status='Active'"];
    $p = [];
    if(!empty($f['building_id'])){$w[]='b.building_id=?';$p[]=(int)$f['building_id'];}
    if (($f['available_only'] ?? '1') === '1') {
      $w[] = "u.availability_status='Available'";
      $w[] = "NOT EXISTS (SELECT 1 FROM rental active_rental WHERE active_rental.unit_id=u.unit_id AND active_rental.rental_status='Active')";
    }
    if (!empty($f['q'])) {
      $w[] = '(b.building_name LIKE ? OR b.complete_address LIKE ? OR b.street_address LIKE ? OR b.barangay LIKE ? OR b.city LIKE ? OR b.province LIKE ?)';
      array_push($p, ...array_fill(0, 6, '%'.trim($f['q']).'%'));
    }
    foreach (['min'=>'u.monthly_rent>=?','max'=>'u.monthly_rent<=?','min_sqm'=>'u.floor_area_sqm>=?','max_sqm'=>'u.floor_area_sqm<=?'] as $key=>$condition) {
      if (isset($f[$key]) && $f[$key] !== '' && is_numeric($f[$key]) && (float)$f[$key] >= 0) { $w[]=$condition; $p[]=(float)$f[$key]; }
    }
    if (isset($f['bedrooms']) && $f['bedrooms']!=='') {
      $bedrooms=(int)$f['bedrooms'];
      if ($bedrooms===3) $w[]='u.bedrooms>=3';
      elseif ($bedrooms>=0 && $bedrooms<=2) { $w[]='u.bedrooms=?'; $p[]=$bedrooms; }
    }
    if (isset($f['bathrooms']) && $f['bathrooms']!=='') { $w[]='u.bathrooms>=?'; $p[]=(int)$f['bathrooms']; }
    if (!empty($f['city'])) { $w[]='b.city=?'; $p[]=$f['city']; }
    $orders=['price_low'=>'u.monthly_rent ASC','price_high'=>'u.monthly_rent DESC','newest'=>'u.created_at DESC','largest'=>'u.floor_area_sqm DESC,u.monthly_rent ASC'];
    $order=$orders[$f['sort']??'']??'u.monthly_rent ASC';
    return self::rows("SELECT u.unit_id id,b.building_id,b.building_name b,u.unit_number u,u.floor_number,b.city,b.province,COALESCE(NULLIF(b.complete_address,''),CONCAT_WS(', ',NULLIF(b.street_address,''),NULLIF(b.barangay,''),NULLIF(b.city,''),NULLIF(b.province,''))) address,b.description building_description,b.amenities building_amenities,b.photos building_photos,u.photos,u.monthly_rent rent,u.bedrooms bed,u.bathrooms bath,u.floor_area_sqm sqm,u.amenities am,u.description,CASE WHEN EXISTS(SELECT 1 FROM rental active_rental WHERE active_rental.unit_id=u.unit_id AND active_rental.rental_status='Active') THEN 'Occupied' WHEN u.availability_status='Unavailable' THEN 'Maintenance' ELSE u.availability_status END st,u.created_at FROM unit u JOIN apartment_building b USING(building_id) JOIN landlord l ON l.landlord_id=b.landlord_id JOIN users landlord_user ON landlord_user.user_id=l.user_id WHERE ".implode(' AND ', $w)." ORDER BY $order", $p);
  }
  static function browseBuildings($ids) {
    if (!$ids) return [];
    $placeholders=implode(',',array_fill(0,count($ids),'?'));
    return self::rows("SELECT b.building_id,b.building_name,COALESCE(NULLIF(b.complete_address,''),CONCAT_WS(', ',NULLIF(b.street_address,''),NULLIF(b.barangay,''),NULLIF(b.city,''),NULLIF(b.province,''))) complete_address,b.city,b.province,b.description,b.amenities,b.photos,b.created_at,b.status,(SELECT MAX(t.created_at) FROM unit t WHERE t.building_id=b.building_id) latest_unit_at,(SELECT COUNT(*) FROM unit t WHERE t.building_id=b.building_id AND t.deactivated_by_admin=0) total_units,(SELECT COUNT(*) FROM unit t WHERE t.building_id=b.building_id AND t.deactivated_by_admin=0 AND t.availability_status='Available' AND NOT EXISTS(SELECT 1 FROM rental r WHERE r.unit_id=t.unit_id AND r.rental_status='Active')) available_units,(SELECT COUNT(*) FROM unit t WHERE t.building_id=b.building_id AND t.deactivated_by_admin=0 AND (t.availability_status='Occupied' OR EXISTS(SELECT 1 FROM rental r WHERE r.unit_id=t.unit_id AND r.rental_status='Active'))) occupied_units,(SELECT COUNT(*) FROM unit t WHERE t.building_id=b.building_id AND t.deactivated_by_admin=0 AND t.availability_status='Unavailable' AND NOT EXISTS(SELECT 1 FROM rental r WHERE r.unit_id=t.unit_id AND r.rental_status='Active')) maintenance_units,(SELECT MIN(t.monthly_rent) FROM unit t WHERE t.building_id=b.building_id AND t.deactivated_by_admin=0 AND t.availability_status='Available' AND NOT EXISTS(SELECT 1 FROM rental r WHERE r.unit_id=t.unit_id AND r.rental_status='Active')) starting_rent,(SELECT MAX(t.monthly_rent) FROM unit t WHERE t.building_id=b.building_id AND t.deactivated_by_admin=0 AND t.availability_status='Available' AND NOT EXISTS(SELECT 1 FROM rental r WHERE r.unit_id=t.unit_id AND r.rental_status='Active')) highest_rent FROM apartment_building b JOIN landlord l ON l.landlord_id=b.landlord_id JOIN users landlord_user ON landlord_user.user_id=l.user_id WHERE b.building_id IN ($placeholders) AND b.status='Active' AND b.deactivated_by_admin=0 AND landlord_user.account_status='Active' ORDER BY b.building_name", $ids);
  }
  static function availableCities() { return self::rows("SELECT DISTINCT b.city FROM unit u JOIN apartment_building b USING(building_id) JOIN landlord l ON l.landlord_id=b.landlord_id JOIN users landlord_user ON landlord_user.user_id=l.user_id WHERE b.status='Active' AND b.deactivated_by_admin=0 AND u.deactivated_by_admin=0 AND landlord_user.account_status='Active' AND u.availability_status='Available' AND NOT EXISTS(SELECT 1 FROM rental r WHERE r.unit_id=u.unit_id AND r.rental_status='Active') ORDER BY b.city"); }
  static function create($b) { self::q('INSERT INTO unit(building_id,unit_number,bedrooms,bathrooms,floor_area_sqm,monthly_rent,description,amenities,photos) VALUES(?,?,?,?,?,?,?,?,?)', [(int)$b['building_id'],$b['unit_number'],$b['bedrooms'] ?: 1,$b['bathrooms'] ?: 1,$b['floor_area_sqm'] ?: null,$b['monthly_rent'],$b['description'] ?? null,$b['amenities'] ?? null,json_encode($b['photos']??[])]); return (int)self::lastId(); }
  static function update($uid, $b) { self::q('UPDATE unit SET unit_number=?,bedrooms=?,bathrooms=?,floor_area_sqm=?,monthly_rent=?,description=?,amenities=?,photos=? WHERE unit_id=?', [$b['unit_number'],$b['bedrooms'] ?: 1,$b['bathrooms'] ?: 1,$b['floor_area_sqm'] ?: null,$b['monthly_rent'],$b['description'] ?? null,$b['amenities'] ?? null,json_encode($b['photos']??[]),$uid]); }
  static function setStatus($uid, $lid, $s, $reason = null) {
    if ($lid === null) {
      if ($s === 'Deactivated') return self::q("UPDATE unit SET deactivated_by_admin=1,deactivation_reason=?,deactivated_at=NOW() WHERE unit_id=? AND deactivated_by_admin=0", [$reason, (int)$uid])->rowCount();
      return self::q("UPDATE unit SET deactivated_by_admin=0,deactivation_reason=NULL,deactivated_at=NULL WHERE unit_id=? AND deactivated_by_admin=1", [(int)$uid])->rowCount();
    }
    return self::q("UPDATE unit n JOIN apartment_building b USING(building_id) SET n.availability_status=? WHERE n.unit_id=? AND b.landlord_id=? AND n.deactivated_by_admin=0 AND b.deactivated_by_admin=0 AND n.availability_status<>'Occupied' AND NOT EXISTS (SELECT 1 FROM rental r WHERE r.unit_id=n.unit_id AND r.rental_status='Active')", [$s, $uid, $lid])->rowCount();
  }
  static function deleteFor($uid,$u) {
    $scope=self::ownershipScope($u);
    $unit=self::one('SELECT n.unit_id,n.availability_status,n.deactivated_by_admin,n.deactivation_reason,b.deactivated_by_admin building_deactivated_by_admin,b.deactivation_reason building_deactivation_reason FROM unit n JOIN apartment_building b USING(building_id) WHERE n.unit_id=?'.($scope[0]?' AND b.landlord_id=?':''),array_merge([(int)$uid],$scope[1]));
    if (!$unit) fail('Unit not found.',404);
    if($u['role']==='Landlord'&&((int)$unit['deactivated_by_admin']===1||(int)$unit['building_deactivated_by_admin']===1))fail('This unit or its building was deactivated by Admin. Reason: '.($unit['deactivation_reason']?:$unit['building_deactivation_reason']?:'No reason provided.'),403);
    if (self::one('SELECT 1 FROM rental WHERE unit_id=? LIMIT 1',[$uid])||self::one('SELECT 1 FROM booking WHERE unit_id=? LIMIT 1',[$uid])||self::one('SELECT 1 FROM rental_bill WHERE unit_id=? LIMIT 1',[$uid])||self::one('SELECT 1 FROM utility_bill WHERE unit_id=? LIMIT 1',[$uid])||self::one('SELECT 1 FROM payment WHERE unit_id=? LIMIT 1',[$uid])) fail('This unit is linked to booking, rental, or payment history and cannot be deleted. Mark it unavailable instead.');
    return self::q('DELETE FROM unit WHERE unit_id=?',[(int)$uid])->rowCount();
  }
  static function findFor($uid, $u) {
    $scope = self::ownershipScope($u);
    $row = self::one('SELECT n.unit_id,n.building_id,n.unit_number,n.bedrooms,n.bathrooms,n.floor_area_sqm,n.monthly_rent,n.description,n.amenities,n.photos,n.deactivated_by_admin,n.deactivation_reason,b.deactivated_by_admin building_deactivated_by_admin,b.deactivation_reason building_deactivation_reason,b.photos building_photos,n.availability_status,b.building_name FROM unit n JOIN apartment_building b USING(building_id) WHERE n.unit_id=?'.($scope[0] ? str_replace(' WHERE ', ' AND ', $scope[0]) : ''), array_merge([(int)$uid], $scope[1]));
    return $row;
  }
  static function rentalInfoFor($uid) {
    return self::one("SELECT rental_id,rental_status,start_date,end_date,monthly_rent,security_deposit,due_day FROM rental WHERE unit_id=? ORDER BY (rental_status='Active') DESC,created_at DESC LIMIT 1", [(int)$uid]);
  }
  static function bookingsFor($uid) {
    return self::rows('SELECT booking_id,booking_status,preferred_move_in_date,preferred_move_out_date,created_at FROM booking WHERE unit_id=? ORDER BY created_at DESC LIMIT 5', [(int)$uid]);
  }
  static function landlordUser($unitId) { return self::one('SELECT l.user_id FROM unit n JOIN apartment_building ab USING(building_id) JOIN landlord l ON l.landlord_id=ab.landlord_id WHERE n.unit_id=?', [$unitId])['user_id'] ?? null; }
  static function moderationDetails($uid) { return self::one("SELECT n.unit_id,n.building_id,n.deactivated_by_admin,n.deactivation_reason,b.status building_status,b.deactivated_by_admin building_deactivated_by_admin,b.deactivation_reason building_deactivation_reason,l.landlord_id,l.user_id landlord_user_id FROM unit n JOIN apartment_building b USING(building_id) JOIN landlord l ON l.landlord_id=b.landlord_id WHERE n.unit_id=?",[(int)$uid]); }
  static function affectedTenantUsers($uid) { return array_map('intval',array_column(self::rows("SELECT DISTINCT t.user_id FROM tenant t WHERE EXISTS(SELECT 1 FROM booking k WHERE k.tenant_id=t.tenant_id AND k.unit_id=? AND k.booking_status='Pending') OR EXISTS(SELECT 1 FROM rental r WHERE r.tenant_id=t.tenant_id AND r.unit_id=? AND r.rental_status='Active')",[(int)$uid,(int)$uid]),'user_id')); }
}
