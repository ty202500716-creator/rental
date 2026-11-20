<?php
// Creates the first admin account using the settings in backend/config/database.php.
// Usage:  php database/seeders/create_admin.php [email] [password]
define('BASE', dirname(__DIR__, 2).'/backend');
require BASE.'/services/ApiException.php'; require BASE.'/services/Database.php';
$email = strtolower($argv[1] ?? 'admin@gmail.com'); $pw = $argv[2] ?? 'Admin@12345';
if (!preg_match('/^[a-z0-9._%+-]+@gmail\.com$/', $email)) exit("Email must be a @gmail.com address.\n");
if (Database::q('SELECT 1 FROM users WHERE email=?', [$email])->fetch()) exit("That admin already exists.\n");
Database::q("INSERT INTO users(username,password_hash,role,account_status,first_name,last_name,email,contact_number) VALUES(?,?,'Admin','Active','System','Admin',?,?)", [explode('@', $email)[0], password_hash($pw, PASSWORD_DEFAULT), $email, '+639000000000']);
echo "Admin created: $email / $pw  (change the password after first login)\n";
