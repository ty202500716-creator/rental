<?php
class AdminController {
  static function dashboard($u, $b) { return ['stats' => Report::adminDashboard()]; }
  static function users($u,$b) { return ['rows'=>User::adminAccounts()]; }
  static function createUser($u, $b) {
    AuthValidator::adminUser($b);
    if (User::exists($b['email'], $b['username'])) fail('Email or username already exists.', 409);
    $id = User::create($b + ['role' => 'Admin', 'status' => 'Active']); Notifier::audit('ADMIN_CREATED', 'users', $id); return ['ok' => true];
  }
  static function setStatus($u, $b) {
    Validator::required($b, 'user_id', 'status'); Validator::in($b['status'], ['Active','Suspended','Deactivated'], 'Invalid status.');
    if ((int)$b['user_id'] === (int)$u['user_id']) fail('You cannot change your own status.');
    $target=User::accountState((int)$b['user_id']);
    if(!$target||!in_array($target['role'],['Tenant','Landlord'],true))fail('Only tenant or landlord accounts can be managed here.',404);
    $reason=null;
    if(in_array($b['status'],['Suspended','Deactivated'],true)){
      Validator::required($b,'reason');
      $reason=trim($b['reason']);
      if($reason===''||mb_strlen($reason)>255)fail('A status-change reason of 1–255 characters is required.');
    }
    if($target['role']==='Landlord')LandlordController::setAccountStatus((int)$target['user_id'],$b['status'],$reason,(int)$u['user_id']);
    else TenantController::setAccountStatus((int)$target['user_id'],$b['status'],$reason,(int)$u['user_id']);
    return ['ok' => true];
  }
  static function auditLog($u,$b) {
    $page=max(1,(int)($_GET['page']??1));
    $perPage=(int)($_GET['per_page']??25);
    if(!in_array($perPage,[10,25,50,100],true))$perPage=25;
    $where=[];$params=[];
    $action=trim((string)($_GET['action']??''));
    if($action!==''){if(mb_strlen($action)>60)fail('Action filter is too long.');$where[]='a.action=?';$params[]=$action;}
    foreach(['from'=>'>=','to'=>'<='] as $key=>$operator){
      $date=trim((string)($_GET[$key]??''));
      if($date==='')continue;
      $parsed=DateTimeImmutable::createFromFormat('!Y-m-d',$date);
      if(!$parsed||$parsed->format('Y-m-d')!==$date)fail('Invalid '.$key.' date.');
      $where[]='DATE(a.created_at)'.$operator.'?';$params[]=$date;
    }
    if(isset($_GET['from'],$_GET['to'])&&$_GET['from']!==''&&$_GET['to']!==''&&$_GET['from']>$_GET['to'])fail('The start date cannot be after the end date.');
    $clause=$where?' WHERE '.implode(' AND ',$where):'';
    $total=(int)Model::one('SELECT COUNT(*) total FROM audit_log a'.$clause,$params)['total'];
    $page=min($page,max(1,(int)ceil($total/$perPage)));
    $offset=($page-1)*$perPage;
    $rows=Model::rows("SELECT a.audit_id,a.action,a.table_name,a.record_id,a.old_value,a.new_value,a.ip_address,a.created_at,a.user_id,CONCAT_WS(' ',actor.first_name,actor.last_name) actor FROM audit_log a LEFT JOIN users actor ON actor.user_id=a.user_id$clause ORDER BY a.created_at DESC,a.audit_id DESC LIMIT $perPage OFFSET $offset",$params);
    $actions=array_column(Model::rows('SELECT DISTINCT action FROM audit_log ORDER BY action'),'action');
    return ['rows'=>$rows,'actions'=>$actions,'page'=>$page,'per_page'=>$perPage,'total'=>$total];
  }
}
