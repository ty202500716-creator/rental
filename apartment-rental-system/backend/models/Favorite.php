<?php
class Favorite extends Model {
  static function buildingIds($tenantId) {
    return array_map('intval',array_column(self::rows('SELECT building_id FROM tenant_favorite_building WHERE tenant_id=? ORDER BY created_at DESC',[(int)$tenantId]),'building_id'));
  }
  static function add($tenantId,$buildingId) {
    self::q('INSERT IGNORE INTO tenant_favorite_building(tenant_id,building_id) VALUES(?,?)',[(int)$tenantId,(int)$buildingId]);
  }
  static function remove($tenantId,$buildingId) {
    self::q('DELETE FROM tenant_favorite_building WHERE tenant_id=? AND building_id=?',[(int)$tenantId,(int)$buildingId]);
  }
}
