ALTER TABLE booking
  MODIFY COLUMN booking_status ENUM('Pending','Approved','Rejected','Cancelled','Completed')
    NOT NULL DEFAULT 'Pending';
