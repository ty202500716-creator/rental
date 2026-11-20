<?php
class Notification extends Model {
  static function forUser($uid) { return self::rows('SELECT notification_id,notification_type type,title,message,is_read,created_at FROM notification WHERE user_id=? ORDER BY created_at DESC LIMIT 60', [$uid]); }
  static function markRead($uid) { self::q('UPDATE notification SET is_read=1 WHERE user_id=?', [$uid]); }
  static function announcementsFor($u) {
    if ($u['role'] === 'Admin') return self::rows('SELECT announcement_id,title,content,audience,created_at FROM announcement WHERE target_landlord_id IS NULL ORDER BY created_at DESC');
    if ($u['role'] === 'Landlord') return self::rows("SELECT announcement_id,title,content,audience,created_at FROM announcement WHERE target_landlord_id=? OR (target_landlord_id IS NULL AND audience IN ('All','Landlords')) ORDER BY created_at DESC", [Landlord::idFor($u['user_id'])]);
    return self::rows("SELECT a.announcement_id,a.title,a.content,a.audience,a.created_at FROM announcement a WHERE a.is_published=1 AND ((a.target_landlord_id IS NULL AND a.audience IN ('All','Tenants')) OR a.target_landlord_id IN (SELECT ab.landlord_id FROM rental r JOIN unit n USING(unit_id) JOIN apartment_building ab USING(building_id) WHERE r.tenant_id=?)) ORDER BY a.created_at DESC", [Tenant::idFor($u['user_id'])]);
  }
  static function post($by, $landlordId, $audience, $title, $content) { self::q('INSERT INTO announcement(posted_by,target_landlord_id,audience,title,content) VALUES(?,?,?,?,?)', [$by, $landlordId, $audience, $title, $content]); }
  static function tenantUsersOf($lid) { return array_column(self::rows("SELECT DISTINCT t.user_id FROM rental r JOIN tenant t USING(tenant_id) JOIN unit n ON n.unit_id=r.unit_id JOIN apartment_building ab ON ab.building_id=n.building_id WHERE ab.landlord_id=? AND r.rental_status='Active'", [$lid]), 'user_id'); }
}
