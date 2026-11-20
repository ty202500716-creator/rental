<?php
define('BASE', __DIR__);
require BASE.'/services/helpers.php';
require BASE.'/services/Database.php';
$pdo=Database::pdo();
$groups=$pdo->query("SELECT tenant_id,unit_id,COUNT(*) record_count,SUM(booking_status IN ('Pending','Approved')) active_request_count FROM booking GROUP BY tenant_id,unit_id HAVING COUNT(*)>1 ORDER BY tenant_id,unit_id")->fetchAll(PDO::FETCH_ASSOC);
foreach($groups as &$group){
  $query=$pdo->prepare('SELECT b.booking_id,b.booking_status,b.preferred_move_in_date,b.preferred_move_out_date,b.created_at,b.reviewed_at,b.rejection_reason,r.rental_id,r.rental_status,r.start_date,r.end_date FROM booking b LEFT JOIN rental r ON r.booking_id=b.booking_id WHERE b.tenant_id=? AND b.unit_id=? ORDER BY b.created_at,b.booking_id');
  $query->execute([$group['tenant_id'],$group['unit_id']]);
  $group['records']=$query->fetchAll(PDO::FETCH_ASSOC);
  $query=$pdo->prepare('SELECT rental_id,booking_id,rental_status,start_date,end_date,created_at FROM rental WHERE tenant_id=? AND unit_id=? ORDER BY created_at,rental_id');
  $query->execute([$group['tenant_id'],$group['unit_id']]);
  $group['rentals']=$query->fetchAll(PDO::FETCH_ASSOC);
  $group['review_note']='Review the full history manually. No records are changed or deleted.';
}
unset($group);
echo json_encode($groups,JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES).PHP_EOL;
