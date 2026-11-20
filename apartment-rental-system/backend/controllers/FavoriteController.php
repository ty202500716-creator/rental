<?php
class FavoriteController {
  static function index($u,$b) {
    $ids=Favorite::buildingIds(Tenant::idFor($u['user_id']));
    $buildings=Unit::browseBuildings($ids);
    foreach($buildings as &$building){
      $building['photos']=json_decode($building['photos']??'[]',true)?:[];
      $building['amenities']=array_values(array_filter(array_map('trim',preg_split('/[,;|]/',(string)($building['amenities']??'')))));
    }
    unset($building);
    return ['buildings'=>$buildings];
  }
  static function add($u,$b) {
    Validator::required($b,'building_id');
    $id=filter_var($b['building_id'],FILTER_VALIDATE_INT);
    if(!$id||!Building::isActive((int)$id))fail('Active building not found.',404);
    Favorite::add(Tenant::idFor($u['user_id']),(int)$id);
    return ['ok'=>true];
  }
  static function remove($u,$b) {
    Validator::required($b,'building_id');
    $id=filter_var($b['building_id'],FILTER_VALIDATE_INT);
    if(!$id)fail('Invalid building.',400);
    Favorite::remove(Tenant::idFor($u['user_id']),(int)$id);
    return ['ok'=>true];
  }
}
