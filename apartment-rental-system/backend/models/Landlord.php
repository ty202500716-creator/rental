<?php
class Landlord extends Model {
  static function idFor($uid) { static $c = []; return $c[$uid] ??= (self::one('SELECT landlord_id FROM landlord WHERE user_id=?', [$uid])['landlord_id'] ?? null); }
  static function create($uid, $b) { $address=$b['validated_address']; self::q('INSERT INTO landlord(user_id,date_of_birth,gender,complete_address,region_code,province_code,city_municipality_code,barangay_code,street_address,occupation,id_type,id_number) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)', [$uid,$b['dob'],$b['gender'] ?? null,$address['complete_address'],$address['region_code'],$address['province_code'],$address['city_municipality_code'],$address['barangay_code'],$address['street_address'],$b['occupation'] ?? null,$b['id_type'],$b['id_number']]); }
  static function all() { return self::rows("SELECT l.landlord_id,u.user_id,CONCAT(u.first_name,' ',u.last_name) name,u.email,u.contact_number,l.id_type,l.id_number,l.verification_status,u.account_status,u.account_status_reason,l.rejection_reason,l.created_at,(SELECT file_path FROM user_documents d WHERE d.user_id=u.user_id ORDER BY uploaded_at DESC,d.document_id DESC LIMIT 1) document,(SELECT COUNT(*) FROM apartment_building b WHERE b.landlord_id=l.landlord_id) building_count,(SELECT COUNT(*) FROM unit n JOIN apartment_building b USING(building_id) WHERE b.landlord_id=l.landlord_id) unit_count FROM landlord l JOIN users u USING(user_id) ORDER BY l.created_at DESC"); }
  static function userId($lid) { return self::one('SELECT user_id FROM landlord WHERE landlord_id=?', [$lid])['user_id'] ?? null; }
  static function byUser($uid) { return self::one('SELECT * FROM landlord WHERE user_id=?', [(int)$uid]); }
  static function affectedTenantUsers($lid) {
    return array_map('intval',array_column(self::rows("SELECT DISTINCT t.user_id FROM tenant t
      WHERE EXISTS(SELECT 1 FROM rental r JOIN unit n USING(unit_id) JOIN apartment_building b USING(building_id)
        WHERE r.tenant_id=t.tenant_id AND b.landlord_id=? AND r.rental_status='Active')
      OR EXISTS(SELECT 1 FROM booking k JOIN unit n USING(unit_id) JOIN apartment_building b USING(building_id)
        WHERE k.tenant_id=t.tenant_id AND b.landlord_id=? AND k.booking_status='Pending')",[(int)$lid,(int)$lid]),'user_id'));
  }
  static function approve($lid, $admin) { self::q("UPDATE landlord SET verification_status='Approved',rejection_reason=NULL,reviewed_by=?,reviewed_at=NOW() WHERE landlord_id=?", [$admin, $lid]); }
  static function reject($lid, $admin, $reason) { self::q("UPDATE landlord SET verification_status='Rejected',rejection_reason=?,reviewed_by=?,reviewed_at=NOW() WHERE landlord_id=?", [$reason, $admin, $lid]); }
  static function dashboard($l) {
    if (!$l) fail('Landlord profile not found.', 404);

    $buildings = self::one('SELECT COUNT(*) total FROM apartment_building WHERE landlord_id=?', [$l])['total'];
    $units = self::one("SELECT COUNT(*) total,
        COALESCE(SUM(availability_status='Available'),0) available,
        COALESCE(SUM(availability_status='Occupied'),0) occupied,
        COALESCE(SUM(availability_status='Unavailable'),0) maintenance
      FROM unit n JOIN apartment_building ab USING(building_id) WHERE ab.landlord_id=?", [$l]);

    $bookings = self::one("SELECT
        COALESCE(SUM(k.booking_status='Pending'),0) pending,
        COALESCE(SUM(k.booking_status='Approved'),0) approved,
        COALESCE(SUM(k.booking_status='Rejected'),0) rejected
      FROM booking k JOIN unit n USING(unit_id) JOIN apartment_building ab USING(building_id)
      WHERE ab.landlord_id=?", [$l]);

    $rentals = self::one("SELECT
        COALESCE(SUM(r.rental_status='Active' AND r.end_date>=CURDATE()),0) active,
        COALESCE(SUM(r.rental_status='Expired' OR (r.rental_status='Active' AND r.end_date<CURDATE())),0) expired,
        COALESCE(SUM(r.rental_status='Active' AND r.end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)),0) expiring
      FROM rental r JOIN unit n USING(unit_id) JOIN apartment_building ab USING(building_id)
      WHERE ab.landlord_id=?", [$l]);

    $payments = self::one("SELECT
        COALESCE(SUM(CASE WHEN p.payment_status='Verified' AND p.bill_category='Rental' THEN p.amount_paid ELSE 0 END),0) confirmed_rental,
        COALESCE(SUM(CASE WHEN p.payment_status='Pending' AND p.bill_category='Rental' THEN p.amount_paid ELSE 0 END),0) pending_rental,
        COALESCE(SUM(CASE WHEN p.payment_status='Verified' AND p.bill_category='Electricity' THEN p.amount_paid ELSE 0 END),0) confirmed_electricity,
        COALESCE(SUM(CASE WHEN p.payment_status='Verified' AND p.bill_category='Water' THEN p.amount_paid ELSE 0 END),0) confirmed_water
      FROM payment p JOIN unit n USING(unit_id) JOIN apartment_building ab USING(building_id)
      WHERE ab.landlord_id=?", [$l]);

    $balances = self::one("SELECT
        COALESCE((SELECT SUM(rb.balance) FROM rental_bill rb JOIN unit n ON n.unit_id=rb.unit_id
          JOIN apartment_building ab ON ab.building_id=n.building_id WHERE ab.landlord_id=? AND rb.balance>0),0) rental,
        COALESCE((SELECT SUM(ub.balance) FROM utility_bill ub JOIN unit n ON n.unit_id=ub.unit_id
          JOIN apartment_building ab ON ab.building_id=n.building_id WHERE ab.landlord_id=? AND ub.balance>0),0) utility", [$l,$l]);

    $recentBookings = self::rows("SELECT CONCAT(x.first_name,' ',x.last_name) tenant,
        CONCAT(ab.building_name,' · ',n.unit_number) unit,k.created_at booking_date,k.booking_status status
      FROM booking k JOIN tenant t USING(tenant_id) JOIN users x ON x.user_id=t.user_id
      JOIN unit n ON n.unit_id=k.unit_id JOIN apartment_building ab ON ab.building_id=n.building_id
      WHERE ab.landlord_id=? ORDER BY k.created_at DESC LIMIT 5", [$l]);

    $upcomingRentals = self::rows("SELECT CONCAT(x.first_name,' ',x.last_name) tenant,
        CONCAT(ab.building_name,' · ',n.unit_number) unit,r.start_date,r.end_date
      FROM rental r JOIN tenant t USING(tenant_id) JOIN users x ON x.user_id=t.user_id
      JOIN unit n ON n.unit_id=r.unit_id JOIN apartment_building ab ON ab.building_id=n.building_id
      WHERE ab.landlord_id=? AND r.rental_status='Active'
        AND r.end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
      ORDER BY r.end_date ASC LIMIT 5", [$l]);

    $recentPayments = self::rows("SELECT CONCAT(x.first_name,' ',x.last_name) tenant,
        p.bill_category type,p.amount_paid amount,p.payment_date,p.payment_status status
      FROM payment p JOIN tenant t USING(tenant_id) JOIN users x ON x.user_id=t.user_id
      JOIN unit n ON n.unit_id=p.unit_id JOIN apartment_building ab ON ab.building_id=n.building_id
      WHERE ab.landlord_id=? ORDER BY p.created_at DESC,p.payment_id DESC LIMIT 5", [$l]);

    $confirmedUtility = (float)$payments['confirmed_electricity'] + (float)$payments['confirmed_water'];
    return [
      'stats' => [
        'buildings' => (int)$buildings,
        'units' => (int)$units['total'],
        'available_units' => (int)$units['available'],
        'occupied_units' => (int)$units['occupied'],
        'maintenance_units' => (int)$units['maintenance'],
        'pending_bookings' => (int)$bookings['pending'],
        'approved_bookings' => (int)$bookings['approved'],
        'rejected_bookings' => (int)$bookings['rejected'],
        'active_rentals' => (int)$rentals['active'],
        'expired_rentals' => (int)$rentals['expired'],
        'expiring_rentals' => (int)$rentals['expiring'],
        'confirmed_rental_payments' => (float)$payments['confirmed_rental'],
        'pending_rental_payments' => (float)$payments['pending_rental'],
        'confirmed_electricity_payments' => (float)$payments['confirmed_electricity'],
        'confirmed_water_payments' => (float)$payments['confirmed_water'],
        'confirmed_utility_payments' => $confirmedUtility,
        'payments_collected' => (float)$payments['confirmed_rental'] + $confirmedUtility,
        'outstanding_rental' => (float)$balances['rental'],
        'outstanding_utility' => (float)$balances['utility'],
        'outstanding_payments' => (float)$balances['rental'] + (float)$balances['utility'],
      ],
      'recent_bookings' => $recentBookings,
      'upcoming_rentals' => $upcomingRentals,
      'recent_payments' => $recentPayments,
    ];
  }
}
