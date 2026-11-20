CREATE TABLE tenant_favorite_building (
  tenant_id INT UNSIGNED NOT NULL,
  building_id INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, building_id),
  KEY idx_tenant_favorite_building (building_id),
  CONSTRAINT fk_favorite_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  CONSTRAINT fk_favorite_building FOREIGN KEY (building_id) REFERENCES apartment_building(building_id) ON DELETE CASCADE
) ENGINE=InnoDB;
