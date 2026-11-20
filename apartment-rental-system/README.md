# Apartment Rental System (ARS)
React (Vite) frontend · PHP backend · MySQL database. Roles: **Admin**, **Landlord**, **Tenant**. Navy-and-white responsive UI, all forms are modals, emails must be `@gmail.com`, mobile numbers are `+63` + 10 digits.

```
apartment-rental-system/
├─ frontend/                React + Vite
│  └─ src/  components/ context/ hooks/ services/ utils/ assets/
│           pages/{auth,admin,landlord,tenant}/
│           features/{buildings,units,bookings,rentals,rental-payments,utility-bills,identity-verification,notifications,reports}/
├─ backend/                 PHP
│  ├─ public/index.php      front controller
│  ├─ config/               database.php (MySQL connection), app.php
│  ├─ routes/ controllers/ models/ middleware/ services/ validators/
│  └─ storage/uploads/
├─ database/                schema.sql · migrations/ · seeders/create_admin.php
└─ docs/                    API.md · ARCHITECTURE.md
```

## Setup (XAMPP/WAMP or any PHP 8+ and MySQL 8.0.16+)
1. **Database** – import `database/schema.sql` (phpMyAdmin → Import, or `mysql -u root -p < database/schema.sql`). It creates `apartment_rental_system`. Optional: `SET GLOBAL event_scheduler = ON;` for overdue-bill marking.
2. **Connect backend to the database** – edit `backend/config/database.php` (host, name, user, password; env vars `DB_HOST DB_NAME DB_USER DB_PASS` also work).
3. **Backend** – copy the project to `htdocs/apartment-rental-system/` (or run `php -S localhost:8000 -t backend/public`). Test: `.../backend/public/index.php?r=listings` should return `{"units":[]}`.
4. **First admin** – `php database/seeders/create_admin.php admin@gmail.com Admin@12345`
5. **Frontend** – `cd frontend && cp .env.example .env` (set `VITE_API_URL` to your backend URL, e.g. `http://localhost:8000/index.php` if using `php -S`), then `npm install && npm run dev` → http://localhost:5173. Local Vite origins on ports 5173–5175 are allowed by default; set the `ALLOWED_ORIGIN` environment variable to your frontend's exact origin when deploying or using another origin.

## Flow
Tenant registers (active) → books a unit with a preferred move-in and optional move-out date → landlord verifies ID and approves booking → landlord creates a rental agreement (the requested dates prefill the agreement) and finalizes it (unit Occupied) → tenant submits maintenance requests or pays rent and utility bills separately → landlord updates maintenance requests and verifies payments → receipt issued. Admins oversee users, properties, bookings, maintenance, payments, and reports. Landlords register as Pending and need Admin approval. Only an Admin can create Admin accounts.
