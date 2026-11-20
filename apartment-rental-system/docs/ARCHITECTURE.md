# Architecture

**Request flow:** React feature → `services/api.js` → `backend/public/index.php?r=route` → `Router` (reads `routes/*.php`) → `AuthMiddleware` (login + role check) → Controller (validates with `validators/`) → Model (SQL via PDO in `Database`) → JSON.

**Database connection:** `backend/config/database.php` (host, port, name `apartment_rental_system`, user, password) → `services/Database.php` (one PDO connection, exceptions on error, prepared statements everywhere).

**Role scoping:** `Model::scoped()` adds the WHERE clause automatically: Admin sees everything, a Landlord only rows tied to their buildings, a Tenant only their own rows.

**Business rules kept in the database (schema.sql triggers):** unit becomes Occupied when a rental turns Active · bill balance/status and receipts update when a payment is Verified · only available units can be booked · overdue bills via the scheduled event.

**Payments:** every payment row points to exactly one bill (rent, electricity or water), so each gets its own verification and receipt.

**Security notes:** passwords use `password_hash`; sessions are HttpOnly; uploads limited to JPG/PNG/PDF ≤5 MB with random file names stored in `backend/storage/uploads` (not web-served; streamed through `files` after login). Use only fictional sample IDs.

**PHP upload configuration:** set these values in the `php.ini` used by the web server and restart PHP after changes:

```ini
upload_max_filesize=6M
post_max_size=48M
max_file_uploads=20
display_errors=Off
log_errors=On
```

The application still limits each image to 5 MB and accepts at most 8 photos per building or unit. Requests rejected by PHP's `post_max_size` are returned with a clear upload-size error.
