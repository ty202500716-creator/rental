ALTER TABLE landlord
  MODIFY complete_address VARCHAR(600) NOT NULL,
  ADD COLUMN region_code VARCHAR(9) NULL AFTER complete_address,
  ADD COLUMN province_code VARCHAR(9) NULL AFTER region_code,
  ADD COLUMN city_municipality_code VARCHAR(9) NULL AFTER province_code,
  ADD COLUMN barangay_code VARCHAR(9) NULL AFTER city_municipality_code,
  ADD COLUMN street_address VARCHAR(180) NULL AFTER barangay_code,
  ADD KEY idx_landlord_address_region (region_code),
  ADD KEY idx_landlord_address_province (province_code),
  ADD KEY idx_landlord_address_city (city_municipality_code),
  ADD KEY idx_landlord_address_barangay (barangay_code);

ALTER TABLE apartment_building
  ADD COLUMN complete_address VARCHAR(600) NULL AFTER building_name,
  ADD COLUMN region_code VARCHAR(9) NULL AFTER complete_address,
  ADD COLUMN province_code VARCHAR(9) NULL AFTER region_code,
  ADD COLUMN city_municipality_code VARCHAR(9) NULL AFTER province_code,
  ADD COLUMN barangay_code VARCHAR(9) NULL AFTER city_municipality_code,
  MODIFY street_address VARCHAR(180) NULL,
  MODIFY province VARCHAR(80) NULL,
  ADD KEY idx_building_address_region (region_code),
  ADD KEY idx_building_address_province (province_code),
  ADD KEY idx_building_address_city (city_municipality_code),
  ADD KEY idx_building_address_barangay (barangay_code);

UPDATE apartment_building
SET complete_address = CONCAT_WS(', ',
  NULLIF(street_address, ''),
  NULLIF(barangay, ''),
  NULLIF(city, ''),
  NULLIF(province, '')
)
WHERE complete_address IS NULL;
