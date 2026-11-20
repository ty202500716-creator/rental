<?php
class MaintenanceRequest extends Model {
  static function listFor($u) {
    return self::scoped($u,
      "SELECT mr.maintenance_request_id,mr.rental_id,mr.subject,mr.description,mr.status,mr.landlord_response,mr.created_at,mr.updated_at,mr.responded_at,
        CONCAT(tu.first_name,' ',tu.last_name) tenant,CONCAT(ab.building_name,' · Unit ',n.unit_number) unit,
        CONCAT(lu.first_name,' ',lu.last_name) landlord
       FROM maintenance_request mr
       JOIN rental r USING(rental_id)
       JOIN tenant t USING(tenant_id)
       JOIN users tu ON tu.user_id=t.user_id
       JOIN unit n ON n.unit_id=r.unit_id
       JOIN apartment_building ab ON ab.building_id=n.building_id
       JOIN landlord l ON l.landlord_id=ab.landlord_id
       JOIN users lu ON lu.user_id=l.user_id",
      'ab.landlord_id','r.tenant_id','ORDER BY mr.created_at DESC');
  }
  static function create($rentalId,$subject,$description) {
    self::q("INSERT INTO maintenance_request(rental_id,subject,description) VALUES(?,?,?)",[$rentalId,$subject,$description]);
    return (int)self::lastId();
  }
  static function forLandlord($id,$landlordId) {
    return self::one("SELECT mr.status,t.user_id tenant_user_id
      FROM maintenance_request mr
      JOIN rental r USING(rental_id)
      JOIN tenant t USING(tenant_id)
      JOIN unit n ON n.unit_id=r.unit_id
      JOIN apartment_building ab ON ab.building_id=n.building_id
      WHERE mr.maintenance_request_id=? AND ab.landlord_id=?",[$id,$landlordId]);
  }
  static function respond($id,$status,$response) {
    self::q("UPDATE maintenance_request SET status=?,landlord_response=?,responded_at=NOW() WHERE maintenance_request_id=?",[$status,$response,$id]);
  }
  static function forTenant($id,$tenantId) {
    return self::one("SELECT mr.status,mr.subject,lu.user_id landlord_user_id
      FROM maintenance_request mr
      JOIN rental r USING(rental_id)
      JOIN unit n ON n.unit_id=r.unit_id
      JOIN apartment_building ab ON ab.building_id=n.building_id
      JOIN landlord l ON l.landlord_id=ab.landlord_id
      JOIN users lu ON lu.user_id=l.user_id
      WHERE mr.maintenance_request_id=? AND r.tenant_id=?",[$id,$tenantId]);
  }
  static function cancel($id,$tenantId) {
    return self::q("UPDATE maintenance_request mr JOIN rental r USING(rental_id)
      SET mr.status='Cancelled'
      WHERE mr.maintenance_request_id=? AND r.tenant_id=? AND mr.status='Pending'",[$id,$tenantId])->rowCount();
  }
}
