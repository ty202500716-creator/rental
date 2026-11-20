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
