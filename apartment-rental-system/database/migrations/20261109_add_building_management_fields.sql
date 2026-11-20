ALTER TABLE apartment_building
  ADD COLUMN floor_count SMALLINT UNSIGNED NOT NULL DEFAULT 1 AFTER description,
  ADD COLUMN amenities TEXT NULL AFTER floor_count;
