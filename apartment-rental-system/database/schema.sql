-- =====================================================================
--  APARTMENT RENTAL SYSTEM (ARS) - DATABASE
--  Target: MySQL 8.0.16+ (InnoDB, utf8mb4). CHECK constraints need 8.0.16+.
--  Based on: "Apartment Rental System - Final System Features"
--  Import:   mysql -u root -p < apartment_rental_system.sql
--            (or phpMyAdmin > Import)
-- =====================================================================

DROP DATABASE IF EXISTS apartment_rental_system;
CREATE DATABASE apartment_rental_system
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE apartment_rental_system;

-- ---------------------------------------------------------------------
-- 1. users  (login credentials, role, account status, shared profile)
-- ---------------------------------------------------------------------
CREATE TABLE users (
  user_id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username        VARCHAR(50)  NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,            -- store password_hash() output, never plain text
  role            ENUM('Admin','Landlord','Tenant') NOT NULL,
  account_status  ENUM('Pending','Active','Suspended','Deactivated','Rejected')
                  NOT NULL DEFAULT 'Pending',
  account_status_reason VARCHAR(255) NULL,
  first_name      VARCHAR(50)  NOT NULL,
  middle_name     VARCHAR(50)  NULL,
  last_name       VARCHAR(50)  NOT NULL,
  email           VARCHAR(120) NOT NULL,
  contact_number  VARCHAR(20)  NOT NULL,
  profile_photo   VARCHAR(255) NULL,
  last_login_at   DATETIME     NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role_status (role, account_status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 2. landlord  (personal + verification info; accepted payment methods)
-- ---------------------------------------------------------------------
CREATE TABLE landlord (
  landlord_id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id              INT UNSIGNED NOT NULL,
  date_of_birth        DATE         NOT NULL,
  gender               VARCHAR(20)  NULL,
  complete_address     VARCHAR(600) NOT NULL,
  region_code          VARCHAR(9)   NULL,
  province_code        VARCHAR(9)   NULL,
  city_municipality_code VARCHAR(9) NULL,
  barangay_code        VARCHAR(9)   NULL,
  street_address       VARCHAR(180) NULL,
  occupation           VARCHAR(100) NULL,
  id_type              VARCHAR(50)  NOT NULL,
  id_number            VARCHAR(50)  NOT NULL,        -- fictional sample ID for the prototype
  verification_status  ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  rejection_reason     VARCHAR(255) NULL,
  reviewed_by          INT UNSIGNED NULL,            -- admin user who approved/rejected
  reviewed_at          DATETIME     NULL,
  -- accepted payment methods (landlord decides which ones tenants can use)
  accepts_gcash        TINYINT(1)   NOT NULL DEFAULT 1,
  accepts_bank         TINYINT(1)   NOT NULL DEFAULT 1,
  accepts_cash         TINYINT(1)   NOT NULL DEFAULT 1,
  gcash_number         VARCHAR(20)  NULL,
  bank_name            VARCHAR(80)  NULL,
  bank_account_name    VARCHAR(100) NULL,
  bank_account_number  VARCHAR(40)  NULL,
  created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (landlord_id),
  UNIQUE KEY uq_landlord_user (user_id),
  KEY idx_landlord_address_region (region_code),
  KEY idx_landlord_address_province (province_code),
  KEY idx_landlord_address_city (city_municipality_code),
  KEY idx_landlord_address_barangay (barangay_code),
  CONSTRAINT fk_landlord_user     FOREIGN KEY (user_id)     REFERENCES users(user_id),
  CONSTRAINT fk_landlord_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(user_id),
  CONSTRAINT chk_landlord_reject_reason
    CHECK (verification_status <> 'Rejected' OR rejection_reason IS NOT NULL)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 3. tenant  (personal + verification info)
--    verification_status is separate from booking approval (rule XIII)
-- ---------------------------------------------------------------------
CREATE TABLE tenant (
  tenant_id                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id                      INT UNSIGNED NOT NULL,
  date_of_birth                DATE         NOT NULL,
  gender                       VARCHAR(20)  NULL,
  complete_address             VARCHAR(600) NOT NULL,
  region_code                  VARCHAR(9)   NULL,
  province_code                VARCHAR(9)   NULL,
  city_municipality_code       VARCHAR(9)   NULL,
  barangay_code                VARCHAR(9)   NULL,
  street_address               VARCHAR(180) NULL,
  occupation                   VARCHAR(100) NOT NULL,
  emergency_contact_name       VARCHAR(100) NOT NULL,
  emergency_contact_number     VARCHAR(20)  NOT NULL,
  emergency_contact_relation   VARCHAR(50)  NULL,
  id_type                      VARCHAR(50)  NULL,
  id_number                    VARCHAR(50)  NULL,    -- fictional sample ID for the prototype
  verification_status          ENUM('Unverified','Pending','Verified','Rejected')
                               NOT NULL DEFAULT 'Unverified',
  rejection_reason             VARCHAR(255) NULL,
  verified_by_landlord_id      INT UNSIGNED NULL,
  verified_by_user_id          INT UNSIGNED NULL,
  verified_at                  DATETIME     NULL,
  created_at                   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id),
  UNIQUE KEY uq_tenant_user (user_id),
  KEY idx_tenant_address_region (region_code),
  KEY idx_tenant_address_province (province_code),
  KEY idx_tenant_address_city (city_municipality_code),
  KEY idx_tenant_address_barangay (barangay_code),
  CONSTRAINT fk_tenant_user     FOREIGN KEY (user_id) REFERENCES users(user_id),
  CONSTRAINT fk_tenant_verifier FOREIGN KEY (verified_by_landlord_id) REFERENCES landlord(landlord_id),
  CONSTRAINT fk_tenant_verifier_user FOREIGN KEY (verified_by_user_id) REFERENCES users(user_id),
  CONSTRAINT chk_tenant_reject_reason
    CHECK (verification_status <> 'Rejected' OR rejection_reason IS NOT NULL)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4. apartment_building
-- ---------------------------------------------------------------------
CREATE TABLE apartment_building (
  building_id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  landlord_id    INT UNSIGNED NOT NULL,
  building_name  VARCHAR(120) NOT NULL,
  complete_address VARCHAR(600) NULL,
  region_code VARCHAR(9) NULL,
  province_code VARCHAR(9) NULL,
  city_municipality_code VARCHAR(9) NULL,
  barangay_code VARCHAR(9) NULL,
  street_address VARCHAR(180) NULL,
  barangay       VARCHAR(80)  NULL,
  city           VARCHAR(80)  NOT NULL,
  province       VARCHAR(80)  NULL,
  postal_code    VARCHAR(10)  NULL,
  description    TEXT         NULL,
  floor_count    SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  amenities      TEXT         NULL,
  photos         JSON         NULL,                  -- array of uploaded photo paths
  status         ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  deactivated_by_admin TINYINT(1) NOT NULL DEFAULT 0,
  deactivation_reason VARCHAR(255) NULL,
  deactivated_at DATETIME NULL,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (building_id),
  UNIQUE KEY uq_building_landlord_name (landlord_id, building_name),
  KEY idx_building_city (city),
  KEY idx_building_address_region (region_code),
  KEY idx_building_address_province (province_code),
  KEY idx_building_address_city (city_municipality_code),
  KEY idx_building_address_barangay (barangay_code),
  CONSTRAINT fk_building_landlord FOREIGN KEY (landlord_id) REFERENCES landlord(landlord_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 5. unit
-- ---------------------------------------------------------------------
CREATE TABLE unit (
  unit_id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  building_id         INT UNSIGNED NOT NULL,
  unit_number         VARCHAR(20)  NOT NULL,
  floor_number        SMALLINT     NULL,
  bedrooms            TINYINT UNSIGNED NOT NULL DEFAULT 1,
  bathrooms           TINYINT UNSIGNED NOT NULL DEFAULT 1,
  floor_area_sqm      DECIMAL(7,2) NULL,
  monthly_rent        DECIMAL(10,2) NOT NULL,
  description         TEXT         NULL,
  amenities           TEXT         NULL,
  photos              JSON         NULL,             -- array of uploaded photo paths
  availability_status ENUM('Available','Occupied','Unavailable') NOT NULL DEFAULT 'Available',
  deactivated_by_admin TINYINT(1) NOT NULL DEFAULT 0,
  deactivation_reason VARCHAR(255) NULL,
  deactivated_at DATETIME NULL,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (unit_id),
  UNIQUE KEY uq_unit_building_number (building_id, unit_number),
  KEY idx_unit_status_rent (availability_status, monthly_rent),
  CONSTRAINT fk_unit_building FOREIGN KEY (building_id) REFERENCES apartment_building(building_id),
  CONSTRAINT chk_unit_rent CHECK (monthly_rent >= 0)
) ENGINE=InnoDB;

CREATE TABLE tenant_favorite_building (
  tenant_id INT UNSIGNED NOT NULL,
  building_id INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, building_id),
  KEY idx_tenant_favorite_building (building_id),
  CONSTRAINT fk_favorite_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  CONSTRAINT fk_favorite_building FOREIGN KEY (building_id) REFERENCES apartment_building(building_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 6. booking  (booking approval is separate from tenant verification)
-- ---------------------------------------------------------------------
CREATE TABLE booking (
  booking_id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  unit_id                INT UNSIGNED NOT NULL,
  tenant_id              INT UNSIGNED NOT NULL,
  preferred_move_in_date DATE         NOT NULL,
  preferred_move_out_date DATE        NULL,
  remarks                VARCHAR(255) NULL,
  booking_status         ENUM('Pending','Approved','Rejected','Cancelled','Completed') NOT NULL DEFAULT 'Pending',
  rejection_reason       VARCHAR(255) NULL,
  reviewed_at            DATETIME     NULL,
  created_at             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (booking_id),
  KEY idx_booking_unit_status (unit_id, booking_status),
  KEY idx_booking_tenant (tenant_id),
  CONSTRAINT fk_booking_unit   FOREIGN KEY (unit_id)   REFERENCES unit(unit_id),
  CONSTRAINT fk_booking_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id),
  CONSTRAINT chk_booking_reject_reason
    CHECK (booking_status <> 'Rejected' OR rejection_reason IS NOT NULL)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 7. rental  (finalized agreement)
--    Rule: a unit can have only one ACTIVE tenant at a time.
--    MySQL has no partial unique index, so a generated column is NULL
--    unless the rental is Active, and that column is UNIQUE.
-- ---------------------------------------------------------------------
CREATE TABLE rental (
  rental_id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id       INT UNSIGNED NULL,
  unit_id          INT UNSIGNED NOT NULL,
  tenant_id        INT UNSIGNED NOT NULL,
  start_date       DATE         NOT NULL,
  end_date         DATE         NOT NULL,
  monthly_rent     DECIMAL(10,2) NOT NULL,           -- agreed rent (may differ from unit's current price)
  security_deposit DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  due_day          TINYINT UNSIGNED NOT NULL DEFAULT 5,   -- day of month rent is due
  terms            TEXT         NULL,
  agreement_file   VARCHAR(255) NULL,
  rental_status    ENUM('Draft','Active','Expired','Terminated') NOT NULL DEFAULT 'Draft',
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  active_unit_id   INT UNSIGNED GENERATED ALWAYS AS (IF(rental_status = 'Active', unit_id, NULL)) STORED,
  PRIMARY KEY (rental_id),
  UNIQUE KEY uq_rental_booking (booking_id),
  UNIQUE KEY uq_rental_one_active_per_unit (active_unit_id),
  KEY idx_rental_unit (unit_id),
  KEY idx_rental_tenant_status (tenant_id, rental_status),
  CONSTRAINT fk_rental_booking FOREIGN KEY (booking_id) REFERENCES booking(booking_id),
  CONSTRAINT fk_rental_unit    FOREIGN KEY (unit_id)    REFERENCES unit(unit_id),
  CONSTRAINT fk_rental_tenant  FOREIGN KEY (tenant_id)  REFERENCES tenant(tenant_id),
  CONSTRAINT chk_rental_dates  CHECK (end_date > start_date),
  CONSTRAINT chk_rental_due_day CHECK (due_day BETWEEN 1 AND 31)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 8. maintenance_request (tenant requests, property landlord responds)
-- ---------------------------------------------------------------------
CREATE TABLE maintenance_request (
  maintenance_request_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  rental_id INT UNSIGNED NOT NULL,
  subject VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  status ENUM('Pending','In Progress','Resolved','Cancelled') NOT NULL DEFAULT 'Pending',
  landlord_response VARCHAR(1000) NULL,
  responded_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (maintenance_request_id),
  KEY idx_maintenance_rental_status (rental_id,status),
  KEY idx_maintenance_created (created_at),
  CONSTRAINT fk_maintenance_rental FOREIGN KEY (rental_id) REFERENCES rental(rental_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 8. rental_bill  (monthly rent charges and balances)
-- ---------------------------------------------------------------------
CREATE TABLE rental_bill (
  rental_bill_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  rental_id      INT UNSIGNED NOT NULL,
  unit_id        INT UNSIGNED NOT NULL,
  billing_month  DATE         NOT NULL,              -- first day of the month billed
  due_date       DATE         NOT NULL,
  amount_due     DECIMAL(10,2) NOT NULL,
  amount_paid    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  balance        DECIMAL(10,2) GENERATED ALWAYS AS (amount_due - amount_paid) STORED,
  status         ENUM('Unpaid','Partially Paid','Paid','Overdue') NOT NULL DEFAULT 'Unpaid',
  remarks        VARCHAR(255) NULL,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (rental_bill_id),
  UNIQUE KEY uq_rental_bill_month (rental_id, billing_month),
  KEY idx_rental_bill_status_due (status, due_date),
  CONSTRAINT fk_rbill_rental FOREIGN KEY (rental_id) REFERENCES rental(rental_id),
  CONSTRAINT fk_rbill_unit   FOREIGN KEY (unit_id)   REFERENCES unit(unit_id),
  CONSTRAINT chk_rbill_amounts CHECK (amount_due >= 0 AND amount_paid >= 0 AND amount_paid <= amount_due)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 9. utility_bill  (electricity and water share one table via bill_type)
--    consumption and amount are computed from readings x rate.
-- ---------------------------------------------------------------------
CREATE TABLE utility_bill (
  utility_bill_id      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  rental_id            INT UNSIGNED NOT NULL,
  unit_id              INT UNSIGNED NOT NULL,
  bill_type            ENUM('Electricity','Water') NOT NULL,
  billing_period_start DATE         NOT NULL,
  billing_period_end   DATE         NOT NULL,
  previous_reading     DECIMAL(10,2) NOT NULL,       -- kWh or m3
  current_reading      DECIMAL(10,2) NOT NULL,
  consumption          DECIMAL(10,2) GENERATED ALWAYS AS (current_reading - previous_reading) STORED,
  rate_per_unit        DECIMAL(10,2) NOT NULL,       -- e.g. 12.00 per kWh, 40.00 per m3
  amount_due           DECIMAL(10,2) GENERATED ALWAYS AS (ROUND((current_reading - previous_reading) * rate_per_unit, 2)) STORED,
  amount_paid          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  balance              DECIMAL(10,2) GENERATED ALWAYS AS (ROUND((current_reading - previous_reading) * rate_per_unit, 2) - amount_paid) STORED,
  due_date             DATE         NOT NULL,
  status               ENUM('Unpaid','Partially Paid','Paid','Overdue') NOT NULL DEFAULT 'Unpaid',
  remarks              VARCHAR(255) NULL,
  created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (utility_bill_id),
  UNIQUE KEY uq_utility_bill_period (rental_id, bill_type, billing_period_start),
  KEY idx_utility_bill_status_due (status, due_date),
  KEY idx_utility_bill_type (bill_type),
  CONSTRAINT fk_ubill_rental FOREIGN KEY (rental_id) REFERENCES rental(rental_id),
  CONSTRAINT fk_ubill_unit   FOREIGN KEY (unit_id)   REFERENCES unit(unit_id),
  CONSTRAINT chk_ubill_readings CHECK (current_reading >= previous_reading AND previous_reading >= 0),
  CONSTRAINT chk_ubill_rate     CHECK (rate_per_unit >= 0),
  CONSTRAINT chk_ubill_paid     CHECK (amount_paid >= 0),
  CONSTRAINT chk_ubill_period   CHECK (billing_period_end >= billing_period_start)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 10. payment  (shared transactions; each links to exactly ONE bill)
--     bill_category supports "filter by bill category" and makes it
--     explicit whether a row pays rent, electricity, or water.
-- ---------------------------------------------------------------------
CREATE TABLE payment (
  payment_id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  rental_bill_id       INT UNSIGNED NULL,
  utility_bill_id      INT UNSIGNED NULL,
  bill_category        ENUM('Rental','Electricity','Water') NOT NULL,
  unit_id              INT UNSIGNED NOT NULL,
  tenant_id            INT UNSIGNED NOT NULL,
  amount_paid          DECIMAL(10,2) NOT NULL,
  payment_method       ENUM('GCash','Bank Transfer','Cash') NOT NULL,
  reference_number     VARCHAR(60)  NULL,            -- required for online payments
  proof_file           VARCHAR(255) NULL,            -- uploaded proof for online payments
  payment_date         DATE         NOT NULL,
  payment_status       ENUM('Pending','Verified','Rejected') NOT NULL DEFAULT 'Pending',
  rejection_reason     VARCHAR(255) NULL,
  recorded_by          INT UNSIGNED NULL,            -- user who submitted/recorded (tenant or landlord for cash)
  verified_by          INT UNSIGNED NULL,            -- landlord user who verified/rejected
  verified_at          DATETIME     NULL,
  created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (payment_id),
  KEY idx_payment_rbill (rental_bill_id),
  KEY idx_payment_ubill (utility_bill_id),
  KEY idx_payment_tenant (tenant_id, payment_status),
  KEY idx_payment_filters (bill_category, payment_method, payment_status, payment_date),
  CONSTRAINT fk_payment_rbill    FOREIGN KEY (rental_bill_id)  REFERENCES rental_bill(rental_bill_id),
  CONSTRAINT fk_payment_ubill    FOREIGN KEY (utility_bill_id) REFERENCES utility_bill(utility_bill_id),
  CONSTRAINT fk_payment_unit     FOREIGN KEY (unit_id)         REFERENCES unit(unit_id),
  CONSTRAINT fk_payment_tenant   FOREIGN KEY (tenant_id)       REFERENCES tenant(tenant_id),
  CONSTRAINT fk_payment_recorder FOREIGN KEY (recorded_by)     REFERENCES users(user_id),
  CONSTRAINT fk_payment_verifier FOREIGN KEY (verified_by)     REFERENCES users(user_id),
  CONSTRAINT chk_payment_amount  CHECK (amount_paid > 0),
  -- exactly one bill, and the category must match it
  CONSTRAINT chk_payment_one_bill CHECK (
       (rental_bill_id IS NOT NULL AND utility_bill_id IS NULL     AND bill_category = 'Rental')
    OR (rental_bill_id IS NULL     AND utility_bill_id IS NOT NULL AND bill_category IN ('Electricity','Water'))
  ),
  CONSTRAINT chk_payment_reject_reason CHECK (payment_status <> 'Rejected' OR rejection_reason IS NOT NULL),
  CONSTRAINT chk_payment_reference     CHECK (payment_method = 'Cash' OR reference_number IS NOT NULL)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 11. payment_receipt  (generated only after a payment is Verified)
-- ---------------------------------------------------------------------
CREATE TABLE payment_receipt (
  receipt_id      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  payment_id      INT UNSIGNED NOT NULL,
  receipt_number  VARCHAR(30)  NOT NULL,
  amount_received DECIMAL(10,2) NOT NULL,
  issued_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (receipt_id),
  UNIQUE KEY uq_receipt_payment (payment_id),        -- one receipt per payment
  UNIQUE KEY uq_receipt_number (receipt_number),
  CONSTRAINT fk_receipt_payment FOREIGN KEY (payment_id) REFERENCES payment(payment_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 12. lease_renewal
-- ---------------------------------------------------------------------
CREATE TABLE lease_renewal (
  renewal_id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  rental_id            INT UNSIGNED NOT NULL,
  tenant_id            INT UNSIGNED NOT NULL,
  requested_months     SMALLINT UNSIGNED NOT NULL,
  proposed_end_date    DATE         NULL,
  tenant_remarks       VARCHAR(255) NULL,
  renewal_status       ENUM('Pending','Approved','Rejected','Cancelled') NOT NULL DEFAULT 'Pending',
  landlord_remarks     VARCHAR(255) NULL,
  decided_at           DATETIME     NULL,
  created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (renewal_id),
  KEY idx_renewal_rental_status (rental_id, renewal_status),
  CONSTRAINT fk_renewal_rental FOREIGN KEY (rental_id) REFERENCES rental(rental_id),
  CONSTRAINT fk_renewal_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id),
  CONSTRAINT chk_renewal_months CHECK (requested_months > 0)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 13. notification
-- ---------------------------------------------------------------------
CREATE TABLE notification (
  notification_id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id           INT UNSIGNED NOT NULL,           -- recipient
  notification_type ENUM('Registration','Booking','Payment','Reminder','Overdue',
                         'Lease Renewal','Lease Expiration','Announcement','System') NOT NULL,
  title             VARCHAR(120) NOT NULL,
  message           VARCHAR(500) NOT NULL,
  related_table     VARCHAR(40)  NULL,               -- e.g. 'booking', 'payment'
  related_id        INT UNSIGNED NULL,
  is_read           TINYINT(1)   NOT NULL DEFAULT 0,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (notification_id),
  KEY idx_notification_user (user_id, is_read, created_at),
  CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users(user_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 14. announcement
--     Admin: audience All / Landlords / Tenants
--     Landlord: audience 'Tenants' scoped to that landlord's tenants
--               (target_landlord_id = their landlord_id)
-- ---------------------------------------------------------------------
CREATE TABLE announcement (
  announcement_id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  posted_by          INT UNSIGNED NOT NULL,
  target_landlord_id INT UNSIGNED NULL,
  audience           ENUM('All','Landlords','Tenants') NOT NULL DEFAULT 'All',
  title              VARCHAR(150) NOT NULL,
  content            TEXT         NOT NULL,
  is_published       TINYINT(1)   NOT NULL DEFAULT 1,
  expires_at         DATETIME     NULL,
  created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (announcement_id),
  KEY idx_announcement_audience (audience, is_published, created_at),
  CONSTRAINT fk_announcement_poster   FOREIGN KEY (posted_by)          REFERENCES users(user_id),
  CONSTRAINT fk_announcement_landlord FOREIGN KEY (target_landlord_id) REFERENCES landlord(landlord_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 15. user_documents  (uploaded landlord / tenant verification documents)
-- ---------------------------------------------------------------------
CREATE TABLE user_documents (
  document_id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id            INT UNSIGNED NOT NULL,
  document_type      VARCHAR(50)  NOT NULL DEFAULT 'Identification',
  file_path          VARCHAR(255) NOT NULL,
  original_filename  VARCHAR(255) NULL,
  is_sample          TINYINT(1)   NOT NULL DEFAULT 1, -- "SAMPLE - NOT A VALID ID" for demos
  review_status      ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  review_remarks     VARCHAR(255) NULL,
  reviewed_by        INT UNSIGNED NULL,
  reviewed_at        DATETIME     NULL,
  uploaded_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (document_id),
  KEY idx_documents_user (user_id, review_status),
  CONSTRAINT fk_documents_user     FOREIGN KEY (user_id)     REFERENCES users(user_id),
  CONSTRAINT fk_documents_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(user_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 16. audit_log  (important admin and payment-related actions)
-- ---------------------------------------------------------------------
CREATE TABLE audit_log (
  audit_id    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NULL,
  action      VARCHAR(60)  NOT NULL,                 -- e.g. 'LANDLORD_APPROVED', 'PAYMENT_VERIFIED'
  table_name  VARCHAR(40)  NULL,
  record_id   INT UNSIGNED NULL,
  old_value   JSON         NULL,
  new_value   JSON         NULL,
  ip_address  VARCHAR(45)  NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (audit_id),
  KEY idx_audit_user (user_id, created_at),
  KEY idx_audit_record (table_name, record_id),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB;


-- =====================================================================
--  BUSINESS-RULE AUTOMATION (procedure, triggers, event, view)
-- =====================================================================
DELIMITER $$

-- Applies a verified payment to its ONE bill and issues the receipt.
-- Status is set before amount_paid so it is computed from the old value + this payment.
CREATE PROCEDURE sp_apply_verified_payment(
  IN p_payment_id      INT UNSIGNED,
  IN p_rental_bill_id  INT UNSIGNED,
  IN p_utility_bill_id INT UNSIGNED,
  IN p_amount          DECIMAL(10,2)
)
BEGIN
  IF p_rental_bill_id IS NOT NULL THEN
    UPDATE rental_bill
       SET status      = IF(amount_paid + p_amount >= amount_due, 'Paid', 'Partially Paid'),
           amount_paid = amount_paid + p_amount
     WHERE rental_bill_id = p_rental_bill_id;
  ELSE
    UPDATE utility_bill
       SET status      = IF(amount_paid + p_amount >= amount_due, 'Paid', 'Partially Paid'),
           amount_paid = amount_paid + p_amount
     WHERE utility_bill_id = p_utility_bill_id;
  END IF;

  INSERT INTO payment_receipt (payment_id, receipt_number, amount_received)
  VALUES (p_payment_id, CONCAT('RCT-', LPAD(p_payment_id, 8, '0')), p_amount);
END$$

-- Reject payments larger than the bill's remaining balance.
CREATE TRIGGER trg_payment_before_insert
BEFORE INSERT ON payment
FOR EACH ROW
BEGIN
  DECLARE v_balance DECIMAL(10,2);

  IF NEW.rental_bill_id IS NOT NULL THEN
    SELECT balance INTO v_balance FROM rental_bill WHERE rental_bill_id = NEW.rental_bill_id;
  ELSE
    SELECT balance INTO v_balance FROM utility_bill WHERE utility_bill_id = NEW.utility_bill_id;
  END IF;

  IF NEW.amount_paid > v_balance THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Payment exceeds the bill balance';
  END IF;
END$$

-- Cash recorded by the landlord can be inserted already Verified.
CREATE TRIGGER trg_payment_after_insert
AFTER INSERT ON payment
FOR EACH ROW
BEGIN
  IF NEW.payment_status = 'Verified' THEN
    CALL sp_apply_verified_payment(NEW.payment_id, NEW.rental_bill_id, NEW.utility_bill_id, NEW.amount_paid);
  END IF;
END$$

-- Pending -> Verified: update that one bill and issue the receipt.
CREATE TRIGGER trg_payment_after_update
AFTER UPDATE ON payment
FOR EACH ROW
BEGIN
  IF NEW.payment_status = 'Verified' AND OLD.payment_status <> 'Verified' THEN
    CALL sp_apply_verified_payment(NEW.payment_id, NEW.rental_bill_id, NEW.utility_bill_id, NEW.amount_paid);
  END IF;
END$$

-- Only Available units can receive booking applications.
CREATE TRIGGER trg_booking_before_insert
BEFORE INSERT ON booking
FOR EACH ROW
BEGIN
  DECLARE v_status VARCHAR(20);
  SELECT availability_status INTO v_status FROM unit WHERE unit_id = NEW.unit_id;
  IF v_status <> 'Available' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only available units can receive booking applications';
  END IF;
END$$

-- Unit becomes Occupied when a rental becomes Active; freed when it ends.
CREATE TRIGGER trg_rental_after_insert
AFTER INSERT ON rental
FOR EACH ROW
BEGIN
  IF NEW.rental_status = 'Active' THEN
    UPDATE unit SET availability_status = 'Occupied' WHERE unit_id = NEW.unit_id;
  END IF;
END$$

CREATE TRIGGER trg_rental_after_update
AFTER UPDATE ON rental
FOR EACH ROW
BEGIN
  IF NEW.rental_status = 'Active' AND OLD.rental_status <> 'Active' THEN
    UPDATE unit SET availability_status = 'Occupied' WHERE unit_id = NEW.unit_id;
  ELSEIF OLD.rental_status = 'Active' AND NEW.rental_status IN ('Expired','Terminated') THEN
    UPDATE unit SET availability_status = 'Available' WHERE unit_id = NEW.unit_id;
  END IF;
END$$

-- Daily job: mark unpaid / partially paid bills past their due date as Overdue.
-- Requires the event scheduler:  SET GLOBAL event_scheduler = ON;
CREATE EVENT ev_mark_overdue_bills
ON SCHEDULE EVERY 1 DAY STARTS (CURRENT_DATE + INTERVAL 1 DAY)
DO
BEGIN
  UPDATE rental_bill  SET status = 'Overdue'
   WHERE due_date < CURRENT_DATE AND status IN ('Unpaid','Partially Paid');
  UPDATE utility_bill SET status = 'Overdue'
   WHERE due_date < CURRENT_DATE AND status IN ('Unpaid','Partially Paid');
END$$

DELIMITER ;

-- Combined utility dashboard: shown together, still separate bills underneath.
CREATE VIEW v_utility_outstanding AS
SELECT rental_id,
       SUM(CASE WHEN bill_type = 'Electricity' THEN balance ELSE 0 END) AS electricity_balance,
       SUM(CASE WHEN bill_type = 'Water'       THEN balance ELSE 0 END) AS water_balance,
       SUM(balance)                                                     AS combined_balance
FROM utility_bill
GROUP BY rental_id;

-- ---------------------------------------------------------------------
-- First admin account: generate the hash in PHP, then insert, e.g.
--   php -r "echo password_hash('YourPassword', PASSWORD_DEFAULT);"
--   INSERT INTO users (username,password_hash,role,account_status,first_name,last_name,email,contact_number)
--   VALUES ('admin','<paste hash>','Admin','Active','System','Admin','admin@ars.local','09000000000');
-- ---------------------------------------------------------------------
