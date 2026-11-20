<?php
class UnitController {
  static function index($u, $b) {
    $rows=Unit::listFor($u);
    foreach($rows as &$row)$row['photos']=json_decode($row['photos']??'[]',true)?:[];
    unset($row);
    return ['rows'=>$rows];
  }
  static function listings($u, $b) {
    foreach(['min','max','min_sqm','max_sqm'] as $key){
      if(isset($_GET[$key])&&$_GET[$key]!==''&&(!is_numeric($_GET[$key])||(float)$_GET[$key]<0))fail('Filter '.$key.' must be a non-negative number.');
    }
    if(isset($_GET['min'],$_GET['max'])&&$_GET['min']!==''&&$_GET['max']!==''&&(float)$_GET['min']>(float)$_GET['max'])fail('Minimum rent cannot exceed maximum rent.');
    if(isset($_GET['min_sqm'],$_GET['max_sqm'])&&$_GET['min_sqm']!==''&&$_GET['max_sqm']!==''&&(float)$_GET['min_sqm']>(float)$_GET['max_sqm'])fail('Minimum area cannot exceed maximum area.');
    if(isset($_GET['bedrooms'])&&$_GET['bedrooms']!==''&&!in_array((string)$_GET['bedrooms'],['0','1','2','3'],true))fail('Invalid bedroom filter.');
    if(isset($_GET['sort'])&&!in_array($_GET['sort'],['price_low','price_high','newest','largest'],true))fail('Invalid listing sort.');
    if(isset($_GET['bathrooms'])&&$_GET['bathrooms']!==''&&!in_array((string)$_GET['bathrooms'],['1','2','3'],true))fail('Invalid bathroom filter.');
    if(isset($_GET['available_only'])&&!in_array((string)$_GET['available_only'],['0','1'],true))fail('Invalid availability filter.');
    if(isset($_GET['building_id'])&&(!filter_var($_GET['building_id'],FILTER_VALIDATE_INT)|| (int)$_GET['building_id']<1))fail('Invalid building.');
    $_GET['q']=substr(trim((string)($_GET['q']??'')),0,100);
    $units=Unit::browse($_GET);
    $buildingIds=array_values(array_unique(array_map(static fn($unit)=>(int)$unit['building_id'],$units)));
    $buildings=Unit::browseBuildings($buildingIds);
    foreach($units as &$unit){
      $unit['photos']=json_decode($unit['photos']??'[]',true)?:[];
      $unit['building_photos']=json_decode($unit['building_photos']??'[]',true)?:[];
    }
    unset($unit);
    foreach($buildings as &$building){
      $building['photos']=json_decode($building['photos']??'[]',true)?:[];
      $building['amenities']=array_values(array_filter(array_map('trim',preg_split('/[,;|]/',(string)($building['amenities']??'')))));
    }
    unset($building);
    return ['units'=>$units,'buildings'=>$buildings,'cities'=>array_column(Unit::availableCities(),'city')];
  }
  static function store($u, $b) {
    if ($u['role'] !== 'Landlord') fail('Access denied.',403);
    Validator::required($b, 'building_id','unit_number','monthly_rent'); if ((float)$b['monthly_rent'] < 0) fail('Invalid rent.');
    if (!Building::manageableBy((int)$b['building_id'], Landlord::idFor($u['user_id']))) fail('Building not found or deactivated by Admin.', 404);
    $b['photos']=FileUploader::saveImages('unit_photos',8,['unit_photo']);
    if(array_key_exists('unit_photo_count',$b)&&max(0,(int)$b['unit_photo_count'])!==count($b['photos']))fail('One or more unit photos were not received. Please retry with JPG, PNG, or WEBP images under the upload size limit.');
    try { $id=Unit::create($b); } catch (PDOException $e) { fail('That unit number already exists in this building.', 409); }
    $saved=json_decode(Model::one('SELECT photos FROM unit WHERE unit_id=?',[$id])['photos']??'[]',true)?:[];
    if(count($saved)!==count($b['photos']))fail('Unit photos could not be linked to the saved unit. Please retry.');
    Notifier::audit('UNIT_CREATED','unit',$id,['building_id'=>(int)$b['building_id'],'unit_number'=>$b['unit_number']]);
    return ['ok' => true,'photos'=>$saved];
  }
  static function update($u, $b) {
    if ($u['role'] !== 'Landlord') fail('Access denied.',403);
    Validator::required($b, 'unit_id','unit_number','monthly_rent');
    $id = (int)$b['unit_id'];
    $unit = Unit::findFor($id, $u);
    if (!$unit) fail('Unit not found.', 404);
    if ((int)$unit['deactivated_by_admin']===1||(int)$unit['building_deactivated_by_admin']===1) fail('This unit or its building was deactivated by Admin. Editing is not allowed.',403);
    if ($unit['availability_status'] === 'Occupied') fail('Occupied units cannot be edited.');
    if ((float)$b['monthly_rent'] < 0) fail('Invalid rent.');
    $existingPhotos=json_decode($unit['photos']??'[]',true)?:[];
    $requestedPhotos=array_key_exists('existing_photos',$b)?json_decode($b['existing_photos'],true):$existingPhotos;
    if(!is_array($requestedPhotos))fail('Invalid existing unit photos.');
    $b['photos']=array_values(array_intersect($existingPhotos,$requestedPhotos));
    $uploaded=FileUploader::saveImages('unit_photos',max(0,8-count($b['photos'])),['unit_photo']);
    if(array_key_exists('unit_photo_count',$b)&&max(0,(int)$b['unit_photo_count'])!==count($uploaded))fail('One or more unit photos were not received. Please retry with JPG, PNG, or WEBP images under the upload size limit.');
    $b['photos']=array_values(array_unique(array_merge($b['photos'],$uploaded)));
    try { Unit::update($id, $b); } catch (PDOException $e) { fail('That unit number already exists in this building.', 409); }
    $saved=json_decode(Model::one('SELECT photos FROM unit WHERE unit_id=?',[$id])['photos']??'[]',true)?:[];
    if(count($saved)!==count($b['photos']))fail('Unit photos could not be linked to the saved unit. Please retry.');
    Notifier::audit('UNIT_UPDATED','unit',$id,['unit_number'=>$b['unit_number'],'monthly_rent'=>(float)$b['monthly_rent']]);
    return ['ok' => true,'photos'=>$saved];
  }
  static function details($u, $b) {
    $id = filter_var($_GET['unit_id'] ?? null, FILTER_VALIDATE_INT);
    if (!$id) fail('Invalid unit.', 400);
    $unit = Unit::findFor($id, $u);
    if (!$unit) fail('Unit not found.', 404);
    $unit['photos']=json_decode($unit['photos']??'[]',true)?:[];
    $unit['building_photos']=json_decode($unit['building_photos']??'[]',true)?:[];
    $unit['rental']=Unit::rentalInfoFor($id);
    $unit['bookings']=Unit::bookingsFor($id);
    return ['unit' => $unit];
  }
  static function status($u, $b) {
    Validator::required($b, 'unit_id','status');
    $id=(int)$b['unit_id'];
    if($u['role']==='Admin'){
      Validator::in($b['status'],['Active','Deactivated'],'Invalid moderation status.');
      $unit=Unit::moderationDetails($id);
      if(!$unit)fail('Unit not found.',404);
      $reason=null;
      if($b['status']==='Deactivated'){
        Validator::required($b,'reason');
        $reason=trim($b['reason']);
        if($reason==='')fail('Deactivation reason is required.');
        if(mb_strlen($reason)>255)fail('Deactivation reason must be 255 characters or fewer.');
      }
      if(!Unit::setStatus($id,null,$b['status']==='Deactivated'?'Deactivated':'Active',$reason))fail($b['status']==='Active'?'Unit is not deactivated by Admin.':'Unit is already deactivated by Admin.',409);
      $verb=$b['status']==='Deactivated'?'deactivated':'reactivated';
      Notifier::send((int)$unit['landlord_user_id'],'System','Unit '.ucfirst($verb),$b['status']==='Deactivated'?'Unit '.$id.' was deactivated by Admin. Reason: '.$reason:'Unit '.$id.' was reactivated by Admin.','unit',$id);
      foreach(Unit::affectedTenantUsers($id) as $tenantUserId)Notifier::send($tenantUserId,'System','Unit '.$verb,$b['status']==='Deactivated'?'A unit associated with your booking or current rental was deactivated by Admin. Existing rental information remains available. Reason: '.$reason:'A unit associated with your booking or current rental was reactivated by Admin.','unit',$id);
      Notifier::audit('UNIT_'.strtoupper($verb),'unit',$id,['status'=>$b['status'],'reason'=>$reason]);
      return ['ok'=>true];
    }
    Validator::in($b['status'], ['Available','Unavailable','Maintenance'], 'Invalid status.');
    $landlordId=Landlord::idFor($u['user_id']);
    if(!$landlordId)fail('Landlord profile not found.',404);
    $unit=Unit::findFor($id,$u);
    if(!$unit)fail('Unit not found.',404);
    if((int)$unit['deactivated_by_admin']===1||(int)$unit['building_deactivated_by_admin']===1)fail('This unit or its building was deactivated by Admin. Reason: '.($unit['deactivation_reason']?:$unit['building_deactivation_reason']?:'No reason provided.'),403);
    $status = $b['status'] === 'Maintenance' ? 'Unavailable' : $b['status'];
    if (!Unit::setStatus($id,$landlordId,$status)) fail('Unit not found or currently occupied.');
    Notifier::audit('UNIT_STATUS_UPDATED','unit',$id,['status'=>$status]);
    return ['ok' => true];
  }
  static function delete($u,$b) {
    Validator::required($b,'unit_id');
    $id=(int)$b['unit_id'];
    Unit::deleteFor($id,$u);
    Notifier::audit('UNIT_DELETED','unit',$id);
    return ['ok'=>true];
  }
}
