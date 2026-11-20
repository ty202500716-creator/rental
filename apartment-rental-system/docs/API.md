# API Reference

Base URL: `backend/public/index.php?r=<route>` · JSON in/out · session cookie auth (`credentials: include`).

Roles: `public` = no login, `any` = every logged-in user.

| Method | Route | Handler | Allowed |
|---|---|---|---|
| GET | `profile` | AccountController@profile | any |
| POST | `profile` | AccountController@updateProfile | any |
| POST | `password` | AccountController@password | any |
| GET | `notifications` | AccountController@notifications | any |
| POST | `notifications/read` | AccountController@markRead | any |
| GET | `announcements` | AccountController@announcements | any |
| POST | `announcements/create` | AccountController@postAnnouncement | Admin, Landlord |
| GET | `files` | AccountController@file | any |
| GET | `locations&level=regions` | LocationController@index | public |
| GET | `locations&level=provinces&parent_code=<PSGC code>` | LocationController@index | public |
| GET | `locations&level=cities-municipalities&parent_code=<PSGC code>` | LocationController@index | public |
| GET | `locations&level=barangays&parent_code=<PSGC code>` | LocationController@index | public |
| GET | `admin/dashboard` | AdminController@dashboard | Admin |
| GET | `admin/users` | AdminController@users | Admin |
| POST | `admin/users/create` | AdminController@createUser | Admin |
| POST | `admin/users/status` | AdminController@setStatus | Admin |
| POST | `auth/login` | AuthController@login | public |
| POST | `auth/register` | AuthController@register | public |
| GET | `auth/me` | AuthController@me | any |
| POST | `auth/logout` | AuthController@logout | any |
| GET | `bookings` | BookingController@index | Admin, Landlord, Tenant |
| GET | `bookings/approved` | BookingController@approved | Landlord |
| POST | `bookings/create` | BookingController@store | Tenant |
| POST | `bookings/decide` | BookingController@decide | Landlord |
| POST | `bookings/cancel` | BookingController@cancel | Tenant |
| GET | `buildings` | BuildingController@index | Admin, Landlord |
| POST | `buildings/create` | BuildingController@store | Landlord |

Address-bearing registration, profile, and building requests accept an `address`
object with `region_code`, `province_code`, `city_municipality_code`,
`barangay_code`, and optional `street_address`. The backend validates every
PSGC parent-child relationship and also stores a formatted `complete_address`.
| GET | `landlords` | LandlordController@index | Admin |
| POST | `landlords/review` | LandlordController@review | Admin |
| GET | `landlords/dashboard` | LandlordController@dashboard | Landlord |
| GET | `rental-bills` | PaymentController@rentalBills | Landlord, Tenant |
| POST | `rental-bills/create` | PaymentController@storeRentalBill | Landlord |
| GET | `payments` | PaymentController@index | Admin, Landlord, Tenant |
| POST | `payments/create` | PaymentController@store | Tenant |
| POST | `payments/decide` | PaymentController@decide | Landlord |
| POST | `payments/cash` | PaymentController@cash | Landlord |
| GET | `receipts` | PaymentController@receipts | Tenant |
| GET | `rentals` | RentalController@index | Admin, Landlord, Tenant |
| GET | `rentals/active` | RentalController@active | Landlord |
| GET | `rentals/mine` | RentalController@mine | Tenant |
| POST | `rentals/create` | RentalController@store | Landlord |
| POST | `rentals/status` | RentalController@status | Landlord |
| GET | `renewals` | RentalController@renewals | Landlord, Tenant |
| POST | `renewals/create` | RentalController@requestRenewal | Tenant |
| POST | `renewals/decide` | RentalController@decideRenewal | Landlord |
| GET | `reports` | ReportController@index | Admin, Landlord |
| GET | `tenants` | TenantController@index | Admin, Landlord |
| POST | `tenants/verify` | TenantController@verify | Landlord |
| POST | `tenants/identity` | TenantController@identity | Tenant |
| GET | `tenants/dashboard` | TenantController@dashboard | Tenant |
| GET | `listings` | UnitController@listings | public |
| GET | `units` | UnitController@index | Admin, Landlord |
| POST | `units/create` | UnitController@store | Landlord |
| POST | `units/status` | UnitController@status | Landlord |
| GET | `utility-bills` | UtilityBillController@index | Admin, Landlord, Tenant |
| POST | `utility-bills/create` | UtilityBillController@store | Landlord |
