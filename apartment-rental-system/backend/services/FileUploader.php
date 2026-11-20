<?php
class FileUploader {
  static function saveImages($key, $limit = 8, $aliases = []) {
    $files=null;
    foreach(array_merge([$key,$key.'[]'],$aliases) as $candidate){
      if(isset($_FILES[$candidate])){$files=$_FILES[$candidate];break;}
    }
    if($files===null||!isset($files['name']))return [];
    $names=is_array($files['name'])?$files['name']:[$files['name']];
    $temps=is_array($files['tmp_name'])?$files['tmp_name']:[$files['tmp_name']];
    $errors=is_array($files['error'])?$files['error']:[$files['error']];
    $sizes=is_array($files['size'])?$files['size']:[$files['size']];
    $selected=array_values(array_filter(array_keys($names),static fn($index)=>$names[$index]!==''&&($errors[$index]??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_NO_FILE));
    if(!$selected)return [];
    if(count($selected)>$limit)fail('You can upload up to '.$limit.' photos.');
    $cfg=require BASE.'/config/app.php';
    $extensions=['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'];
    if(!is_dir($cfg['upload_dir'])&&!mkdir($cfg['upload_dir'],0775,true)&&!is_dir($cfg['upload_dir']))fail('Unable to prepare photo storage.');
    $saved=[];
    foreach($selected as $index){
      if(($errors[$index]??UPLOAD_ERR_OK)!==UPLOAD_ERR_OK)fail('One of the photo uploads failed.');
      if(($sizes[$index]??0)>$cfg['max_upload_mb']*1048576)fail('Each photo must be '.$cfg['max_upload_mb'].'MB or smaller.');
      $info=@getimagesize($temps[$index]);
      if(!$info||!isset($extensions[$info['mime']]))fail('Photos must be JPG, PNG or WEBP images.');
      $name=bin2hex(random_bytes(10)).'.'.$extensions[$info['mime']];
      if(!move_uploaded_file($temps[$index],$cfg['upload_dir'].'/'.$name))fail('Unable to save an uploaded photo.');
      $saved[]=$name;
    }
    return $saved;
  }
  static function saveProfilePhoto($key) {
    if (empty($_FILES[$key]) || $_FILES[$key]['error'] === UPLOAD_ERR_NO_FILE) return null;
    $f = $_FILES[$key];
    if ($f['error'] !== UPLOAD_ERR_OK) fail('Profile photo upload failed.');
    $cfg = require BASE.'/config/app.php';
    if ($f['size'] > $cfg['max_upload_mb'] * 1048576) fail('Photo must be '.$cfg['max_upload_mb'].'MB or smaller.');
    $info = @getimagesize($f['tmp_name']);
    $extensions = ['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'];
    if (!$info || !isset($extensions[$info['mime']])) fail('Profile photo must be a JPG, PNG or WEBP image.');
    $ext = $extensions[$info['mime']];
    if (!is_dir($cfg['upload_dir']) && !mkdir($cfg['upload_dir'], 0775, true) && !is_dir($cfg['upload_dir'])) fail('Unable to prepare photo storage.');
    $name = bin2hex(random_bytes(10)).'.'.$ext;
    if (!move_uploaded_file($f['tmp_name'], $cfg['upload_dir'].'/'.$name)) fail('Unable to save profile photo.');
    return $name;
  }
  static function save($key) {
    if (empty($_FILES[$key]) || $_FILES[$key]['error'] !== UPLOAD_ERR_OK) return null;
    $cfg = require BASE.'/config/app.php'; $f = $_FILES[$key];
    $ext = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, ['jpg','jpeg','png','pdf'])) fail('Only JPG, PNG or PDF files are allowed.');
    if ($f['size'] > $cfg['max_upload_mb'] * 1048576) fail('File must be '.$cfg['max_upload_mb'].'MB or smaller.');
    if (!is_dir($cfg['upload_dir'])) mkdir($cfg['upload_dir'], 0775, true);
    $n = bin2hex(random_bytes(10)).".$ext"; move_uploaded_file($f['tmp_name'], $cfg['upload_dir']."/$n"); return $n;
  }
}
