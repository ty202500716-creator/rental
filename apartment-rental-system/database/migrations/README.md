# Migrations
`../schema.sql` is the full database (tables, triggers, views, event scheduler job). Put later changes here as numbered files
(e.g. `002_add_payment_settings.sql`) and run them in order after importing the schema.

For existing installations, apply `20261109_add_tenant_verifier_user.sql` before deploying the tenant identity review changes.
It adds the user reference used to record which admin or landlord performed a tenant verification and backfills prior landlord verifier references; existing tenant rows are preserved.

For existing installations, apply `20261109_add_booking_move_out_date.sql` before deploying preferred lease-end dates on booking applications.

For existing installations, apply `20261109_add_maintenance_requests.sql` before deploying the maintenance request workflow.

For existing installations, apply `20261109_add_building_management_fields.sql` before deploying the property-management interface. It adds building floor-count and amenities fields without changing existing building records.

For existing installations, apply `20261111_add_tenant_structured_address.sql` and then `20261112_add_structured_addresses.sql` before deploying structured addresses across registration, landlord profiles, and buildings. Existing formatted profile and building addresses are preserved; location codes are nullable until each address is edited and selected from the PSGC hierarchy.

For existing installations, apply `20261113_add_tenant_favorite_buildings.sql` before deploying tenant building favorites. It stores each tenant/building favorite once and removes favorites automatically when their tenant or building is deleted.

For existing installations, apply `20261114_add_booking_completed_status.sql` before deploying the unified booking and rental history screens. It adds a `Completed` booking status used when an approved booking is activated as a rental; it preserves all existing booking rows.

For existing installations, apply `20261115_add_admin_status_reasons_and_property_moderation.sql` before deploying Step 2. It adds account-status reasons and admin-only deactivation metadata for buildings and units; existing user, building, and unit records are preserved.

## Booking duplicate review and prevention
No cleanup migration is included: existing booking rows and their history must be reviewed before any manual resolution. Run `php backend/booking-duplicate-diagnostic.php` from the project root for a read-only report of tenants and units with multiple booking records, including every status and decision history. The report never edits or deletes rows; do not combine records with different outcomes or linked rental history.

New booking submissions are serialized by locking the unit row within the booking transaction, then checking that tenant/unit for Pending or Approved requests and Active rentals before inserting. Rejected and Cancelled records remain in history and do not prevent a new request.
