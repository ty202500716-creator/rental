<?php
// MySQL connection settings. Override with environment variables if you prefer.
return [
  'host'    => getenv('DB_HOST') ?: '127.0.0.1',
  'port'    => getenv('DB_PORT') ?: '3306',
  'name'    => getenv('DB_NAME') ?: 'apartment_rental_system',
  'user'    => getenv('DB_USER') ?: 'root',
  'pass'    => getenv('DB_PASS') ?: '123456',
  'charset' => 'utf8mb4',
];
