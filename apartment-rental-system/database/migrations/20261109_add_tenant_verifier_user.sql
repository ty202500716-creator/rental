ALTER TABLE tenant
  ADD COLUMN verified_by_user_id INT UNSIGNED NULL AFTER verified_by_landlord_id,
  ADD CONSTRAINT fk_tenant_verifier_user
    FOREIGN KEY (verified_by_user_id) REFERENCES users(user_id);

UPDATE tenant t
JOIN landlord l ON l.landlord_id=t.verified_by_landlord_id
SET t.verified_by_user_id=l.user_id
WHERE t.verified_by_user_id IS NULL;
