<?php
class Building extends Model {
  static function listFor($u) { return self::scoped($u, "SELECT b.building_id,b.landlord_id,b.building_name,b.complete_address,b.region_code,b.province_code,b.city_municipality_code,b.barangay_code,b.street_address,b.barangay,b.city,b.province,b.postal_code,b.description,b.floor_count,b.amenities,b.photos,b.created_at,b.updated_at,CONCAT(x.first_name,' ',x.last_name) landlord,x.account_status landlord_account_status,x.account_status_reason landlord_account_reason,b.status,b.deactivated_by_admin,b.deactivation_reason,b.deactivated_at,(SELECT COUNT(*) FROM unit n WHERE n.building_id=b.building_id) units,(SELECT COALESCE(SUM(n.availability_status='Occupied'),0) FROM unit n WHERE n.building_id=b.building_id) occupied_units,(SELECT COALESCE(SUM(n.availability_status='Available' AND n.deactivated_by_admin=0),0) FROM unit n WHERE n.building_id=b.building_id) vacant_units,(SELECT COALESCE(SUM(n.availability_status='Unavailable'),0) FROM unit n WHERE n.building_id=b.building_id) maintenance_units,(SELECT COALESCE(SUM(r.monthly_rent),0) FROM rental r JOIN unit n ON n.unit_id=r.unit_id WHERE n.building_id=b.building_id AND r.rental_status='Active') monthly_revenue FROM apartment_building b JOIN landlord l ON l.landlord_id=b.landlord_id JOIN users x ON x.user_id=l.user_id", 'b.landlord_id', null, 'ORDER BY b.building_name'); }
  static function create($lid, $b) { $a=$b['validated_address']; self::q('INSERT INTO apartment_building(landlord_id,building_name,complete_address,region_code,province_code,city_municipality_code,barangay_code,street_address,barangay,city,province,postal_code,description,floor_count,amenities,photos) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [$lid,$b['building_name'],$a['complete_address'],$a['region_code'],$a['province_code'],$a['city_municipality_code'],$a['barangay_code'],$a['street_address'],$a['barangay_name'],$a['city_municipality_name'],$a['province_name'],$b['postal_code']??null,$b['description']??null,max(1,(int)($b['floor_count']??1)),$b['amenities']??null,$b['photos']??null]); return (int)self::lastId(); }
  static function ownedBy($bid, $lid) { return self::one('SELECT 1 FROM apartment_building WHERE building_id=? AND landlord_id=?', [$bid, $lid]) !== null; }
  static function manageableBy($bid, $lid) { return self::one('SELECT 1 FROM apartment_building WHERE building_id=? AND landlord_id=? AND deactivated_by_admin=0', [(int)$bid,(int)$lid]) !== null; }
  static function exists($bid) { return self::one('SELECT 1 FROM apartment_building WHERE building_id=?', [(int)$bid]) !== null; }
  static function isActive($bid) { return self::one("SELECT 1 FROM apartment_building b JOIN landlord l USING(landlord_id) JOIN users u USING(user_id) WHERE b.building_id=? AND b.status='Active' AND b.deactivated_by_admin=0 AND u.account_status='Active'",[(int)$bid])!==null; }
  static function update($bid, $b) { $a=$b['validated_address']; self::q('UPDATE apartment_building SET landlord_id=?,building_name=?,complete_address=?,region_code=?,province_code=?,city_municipality_code=?,barangay_code=?,street_address=?,barangay=?,city=?,province=?,postal_code=?,description=?,floor_count=?,amenities=?,photos=COALESCE(?,photos),status=? WHERE building_id=?', [$b['landlord_id'],$b['building_name'],$a['complete_address'],$a['region_code'],$a['province_code'],$a['city_municipality_code'],$a['barangay_code'],$a['street_address'],$a['barangay_name'],$a['city_municipality_name'],$a['province_name'],$b['postal_code']??null,$b['description']??null,max(1,(int)($b['floor_count']??1)),$b['amenities']??null,$b['photos']??null,$b['status']??'Active',$bid]); }
  static function setStatus($bid, $lid, $status, $reason = null) {
    if ($lid===null) {
      if ($status==='Inactive') return self::q("UPDATE apartment_building SET status='Inactive',deactivated_by_admin=1,deactivation_reason=?,deactivated_at=NOW() WHERE building_id=?",[$reason,(int)$bid])->rowCount();
      return self::q("UPDATE apartment_building SET status='Active',deactivated_by_admin=0,deactivation_reason=NULL,deactivated_at=NULL WHERE building_id=?",[(int)$bid])->rowCount();
    }
    return self::q('UPDATE apartment_building SET status=? WHERE building_id=? AND landlord_id=? AND deactivated_by_admin=0',[$status,(int)$bid,(int)$lid])->rowCount();
  }
  static function affectedTenantUsers($bid) {
    return array_map('intval',array_column(self::rows("SELECT DISTINCT t.user_id FROM tenant t
      WHERE EXISTS(SELECT 1 FROM booking k JOIN unit n USING(unit_id) WHERE k.tenant_id=t.tenant_id AND n.building_id=? AND k.booking_status='Pending')
         OR EXISTS(SELECT 1 FROM rental r JOIN unit n USING(unit_id) WHERE r.tenant_id=t.tenant_id AND n.building_id=? AND r.rental_status='Active')",[(int)$bid,(int)$bid]),'user_id'));
  }
  static function deleteFor($bid,$u) {
    $scope=self::ownershipScope($u);
    $building=self::one('SELECT b.building_id,b.deactivated_by_admin,b.deactivation_reason FROM apartment_building b WHERE b.building_id=?'.($scope[0]?' AND b.landlord_id=?':''),array_merge([(int)$bid],$scope[1]));
    if (!$building) fail('Building not found.',404);
    if($u['role']==='Landlord'&&(int)$building['deactivated_by_admin']===1)fail('This building was deactivated by Admin. Reason: '.($building['deactivation_reason']?:'No reason provided.'),403);
    if (self::one('SELECT 1 FROM unit WHERE building_id=? LIMIT 1',[$bid])) fail('Buildings with units cannot be deleted. Archive this building instead.');
    return self::q('DELETE FROM apartment_building WHERE building_id=?',[(int)$bid])->rowCount();
  }
}
