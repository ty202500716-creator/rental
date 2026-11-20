<?php
class BuildingController {
  static function index($u, $b) {
    $rows=Building::listFor($u);
    foreach($rows as &$row)$row['photos']=json_decode($row['photos']??'[]',true)?:[];
    unset($row);
    return ['rows'=>$rows];
  }
  static function store($u, $b) {
    if ($u['role'] !== 'Landlord') fail('Access denied.', 403);
    Validator::required($b, 'building_name');
    $b['validated_address'] = PhilippineLocations::validateAddress($b['address']);
    if (isset($b['floor_count']) && (!is_numeric($b['floor_count']) || (int)$b['floor_count'] < 1 || (int)$b['floor_count'] > 200)) fail('Number of floors must be between 1 and 200.');
    $lid = Landlord::idFor($u['user_id']);
    if (!$lid) fail('Landlord profile not found.', 404);
    $photos=FileUploader::saveImages('building_photos',8,['building_photo']);
    if(array_key_exists('building_photo_count',$b)&&max(0,(int)$b['building_photo_count'])!==count($photos))fail('One or more building photos were not received. Please retry with JPG, PNG, or WEBP images under the upload size limit.');
    $b['photos']=$photos?json_encode($photos):null;
    $id=Building::create($lid, $b);
    $saved=json_decode(Model::one('SELECT photos FROM apartment_building WHERE building_id=?',[$id])['photos']??'[]',true)?:[];
    if(count($saved)!==count($photos))fail('Building photos could not be linked to the saved building. Please retry.');
    Notifier::audit('BUILDING_CREATED','apartment_building',$id,['building_name'=>$b['building_name'],'landlord_id'=>$lid]);
    return ['ok' => true,'photos'=>$saved];
  }
  static function update($u, $b) {
    if ($u['role'] !== 'Landlord') fail('Access denied.', 403);
    Validator::required($b, 'building_id','building_name');
    $id = (int)$b['building_id'];
    $existing = Building::listFor($u);
    $current = null;
    foreach ($existing as $row) if ((int)$row['building_id'] === $id) { $current = $row; break; }
    if (!$current) fail('Building not found.', 404);
    if ((int)$current['deactivated_by_admin']===1) fail('This building was deactivated by Admin. Reason: '.($current['deactivation_reason']?:'No reason provided.'),403);
    if (array_key_exists('address', $b)) {
      $b['validated_address'] = PhilippineLocations::validateAddress($b['address']);
    } else {
      $street = trim((string)($current['street_address'] ?? ''));
      $b['validated_address'] = [
        'complete_address' => $current['complete_address'] ?: implode(', ', array_filter([$street,$current['barangay'] ?? null,$current['city'] ?? null,$current['province'] ?? null])),
        'region_code' => $current['region_code'],
        'province_code' => $current['province_code'],
        'city_municipality_code' => $current['city_municipality_code'],
        'barangay_code' => $current['barangay_code'],
        'street_address' => $street ?: null,
        'barangay_name' => $current['barangay'],
        'city_municipality_name' => $current['city'],
        'province_name' => $current['province'],
      ];
    }
    if (isset($b['floor_count']) && (!is_numeric($b['floor_count']) || (int)$b['floor_count'] < 1 || (int)$b['floor_count'] > 200)) fail('Number of floors must be between 1 and 200.');
    $lid = (int)$current['landlord_id'];
    $b['landlord_id'] = $lid;
    if (isset($b['status'])) Validator::in($b['status'], ['Active','Inactive'], 'Invalid building status.');
    $b['status']=$b['status']??$current['status'];
    $oldPhotos=json_decode($current['photos']??'[]',true)?:[];
    $removedPhotos=[];
    if(array_key_exists('removed_photos',$b)){
      if(!is_string($b['removed_photos']))fail('The selected photo removals could not be processed.');
      $removedPhotos=json_decode($b['removed_photos'],true);
      if(!is_array($removedPhotos))fail('The selected photo removals could not be processed.');
      foreach($removedPhotos as $photo)if(!is_string($photo)||!in_array($photo,$oldPhotos,true))fail('A selected building photo is no longer available. Refresh and try again.');
      $removedPhotos=array_values(array_unique($removedPhotos));
    }
    $remainingPhotos=array_values(array_diff($oldPhotos,$removedPhotos));
    $newPhotos=FileUploader::saveImages('building_photos',max(0,8-count($remainingPhotos)),['building_photo']);
    if(array_key_exists('building_photo_count',$b)&&max(0,(int)$b['building_photo_count'])!==count($newPhotos))fail('One or more building photos were not received. Please retry with JPG, PNG, or WEBP images under the upload size limit.');
    $b['photos']=json_encode(array_values(array_unique(array_merge($remainingPhotos,$newPhotos))));
    Building::update($id, $b);
    $saved=json_decode(Model::one('SELECT photos FROM apartment_building WHERE building_id=?',[$id])['photos']??'[]',true)?:[];
    if(count($saved)!==count(array_unique(array_merge($remainingPhotos,$newPhotos))))fail('Building photos could not be linked to the saved building. Please retry.');
    Notifier::audit('BUILDING_UPDATED','apartment_building',$id,['building_name'=>$b['building_name'],'landlord_id'=>$lid]);
    return ['ok' => true,'photos'=>$saved];
  }
  static function archive($u, $b) {
    Validator::required($b, 'building_id');
    return self::status($u,['building_id'=>$b['building_id'],'status'=>'Inactive']);
  }
  static function status($u,$b) {
    Validator::required($b,'building_id','status');
    Validator::in($b['status'],['Active','Inactive'],'Invalid building status.');
    $id=(int)$b['building_id'];
    $current=null;
    foreach(Building::listFor($u) as $row)if((int)$row['building_id']===$id){$current=$row;break;}
    if(!$current)fail('Building not found.',404);
    if($u['role']==='Landlord'&&(int)$current['deactivated_by_admin']===1)fail('This building was deactivated by Admin. Reason: '.($current['deactivation_reason']?:'No reason provided.'),403);
    $reason=null;
    if($u['role']==='Admin'&&$b['status']==='Inactive'){
      Validator::required($b,'reason');
      $reason=trim($b['reason']);
      if(mb_strlen($reason)>255)fail('Deactivation reason must be 255 characters or fewer.');
      if($reason==='')fail('Deactivation reason is required.');
    }
    Building::setStatus($id,$u['role']==='Landlord'?Landlord::idFor($u['user_id']):null,$b['status'],$reason);
    if($u['role']==='Admin'){
      $uid=Landlord::userId((int)$current['landlord_id']);
      $verb=$b['status']==='Inactive'?'deactivated':'reactivated';
      Notifier::send($uid,'System','Building '.ucfirst($verb),$b['status']==='Inactive'?'Your building '.$current['building_name'].' was deactivated by Admin. Reason: '.$reason:'Your building '.$current['building_name'].' was reactivated by Admin.','apartment_building',$id);
      foreach(Building::affectedTenantUsers($id) as $tenantUserId)Notifier::send($tenantUserId,'System','Building '.$verb,$b['status']==='Inactive'?'A building associated with your booking or current rental was deactivated by Admin. Existing rental information remains available. Reason: '.$reason:'A building associated with your booking or current rental was reactivated by Admin.','apartment_building',$id);
      Notifier::audit('BUILDING_'.strtoupper($verb),'apartment_building',$id,['status'=>$b['status'],'reason'=>$reason]);
    }else Notifier::audit('BUILDING_STATUS_UPDATED','apartment_building',$id,['status'=>$b['status']]);
    return ['ok'=>true];
  }
  static function delete($u,$b) {
    Validator::required($b,'building_id');
    $id=(int)$b['building_id'];
    Building::deleteFor($id,$u);
    Notifier::audit('BUILDING_DELETED','apartment_building',$id);
    return ['ok'=>true];
  }
}
