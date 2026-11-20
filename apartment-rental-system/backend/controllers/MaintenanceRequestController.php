<?php
class MaintenanceRequestController {
  static function index($u,$b) {
    $rental=$u['role']==='Tenant'?Rental::activeOf(Tenant::idFor($u['user_id'])):null;
    return ['rows'=>MaintenanceRequest::listFor($u),'can_create'=>(bool)$rental];
  }
  static function store($u,$b) {
    Validator::required($b,'subject','description');
    $subject=trim($b['subject']);
    $description=trim($b['description']);
    if (mb_strlen($subject)>100) fail('Subject must be 100 characters or fewer.');
    if (mb_strlen($description)<10 || mb_strlen($description)>2000) fail('Description must be between 10 and 2000 characters.');
    $r=Rental::activeOf(Tenant::idFor($u['user_id']));
    if (!$r) fail('An active rental is required to submit a maintenance request.');
    $id=MaintenanceRequest::create((int)$r['rental_id'],$subject,$description);
    if ($landlord=Rental::landlordUserOf($r['rental_id'])) {
      Notifier::send($landlord,'Maintenance Request','New maintenance request',$u['name'].' submitted: '.$subject.'.','maintenance_request',$id);
    }
    return ['ok'=>true];
  }
  static function respond($u,$b) {
    Validator::required($b,'maintenance_request_id','status');
    Validator::in($b['status'],['In Progress','Resolved'],'Choose In Progress or Resolved.');
    $id=(int)$b['maintenance_request_id'];
    $request=MaintenanceRequest::forLandlord($id,Landlord::idFor($u['user_id']));
    if (!$request) fail('Maintenance request not found.',404);
    if (in_array($request['status'],['Resolved','Cancelled'],true)) fail('This request is already closed.');
    $response=trim($b['landlord_response']??'');
    if (mb_strlen($response)>1000) fail('Response must be 1000 characters or fewer.');
    MaintenanceRequest::respond($id,$b['status'],$response?:null);
    Notifier::send($request['tenant_user_id'],'Maintenance Request','Request '.$b['status'],($response?:'Your landlord updated your maintenance request.'). ' Status: '.$b['status'].'.','maintenance_request',$id);
    return ['ok'=>true];
  }
  static function cancel($u,$b) {
    Validator::required($b,'maintenance_request_id');
    $id=(int)$b['maintenance_request_id'];
    $tenantId=Tenant::idFor($u['user_id']);
    $request=MaintenanceRequest::forTenant($id,$tenantId);
    if (!$request) fail('Maintenance request not found.',404);
    if ($request['status']!=='Pending' || !MaintenanceRequest::cancel($id,$tenantId)) {
      fail('Only pending maintenance requests can be cancelled.');
    }
    Notifier::send($request['landlord_user_id'],'Maintenance Request','Request cancelled',$u['name'].' cancelled the maintenance request: '.$request['subject'].'.','maintenance_request',$id);
    return ['ok'=>true];
  }
}
