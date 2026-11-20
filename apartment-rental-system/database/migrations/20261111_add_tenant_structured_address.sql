ALTER TABLE tenant
  MODIFY complete_address VARCHAR(600) NOT NULL,
  ADD COLUMN region_code VARCHAR(9) NULL AFTER complete_address,
  ADD COLUMN province_code VARCHAR(9) NULL AFTER region_code,
  ADD COLUMN city_municipality_code VARCHAR(9) NULL AFTER province_code,
  ADD COLUMN barangay_code VARCHAR(9) NULL AFTER city_municipality_code,
  ADD COLUMN street_address VARCHAR(180) NULL AFTER barangay_code,
  ADD KEY idx_tenant_address_region (region_code),
  ADD KEY idx_tenant_address_province (province_code),
  ADD KEY idx_tenant_address_city (city_municipality_code),
  ADD KEY idx_tenant_address_barangay (barangay_code);
