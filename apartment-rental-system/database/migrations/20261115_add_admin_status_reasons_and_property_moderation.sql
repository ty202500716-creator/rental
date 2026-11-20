ALTER TABLE users
  ADD COLUMN account_status_reason VARCHAR(255) NULL AFTER account_status;

ALTER TABLE apartment_building
  ADD COLUMN deactivated_by_admin TINYINT(1) NOT NULL DEFAULT 0 AFTER status,
  ADD COLUMN deactivation_reason VARCHAR(255) NULL AFTER deactivated_by_admin,
  ADD COLUMN deactivated_at DATETIME NULL AFTER deactivation_reason;

ALTER TABLE unit
  ADD COLUMN deactivated_by_admin TINYINT(1) NOT NULL DEFAULT 0 AFTER availability_status,
  ADD COLUMN deactivation_reason VARCHAR(255) NULL AFTER deactivated_by_admin,
  ADD COLUMN deactivated_at DATETIME NULL AFTER deactivation_reason;
