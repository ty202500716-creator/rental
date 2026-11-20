<?php
class Notifier {
  static function send($uid, $type, $title, $msg, $tbl = null, $id = null) { Database::q('INSERT INTO notification(user_id,notification_type,title,message,related_table,related_id) VALUES(?,?,?,?,?,?)', [$uid,$type,$title,$msg,$tbl,$id]); }
  static function audit($action, $table, $id, $new = null) { Database::q('INSERT INTO audit_log(user_id,action,table_name,record_id,new_value,ip_address) VALUES(?,?,?,?,?,?)', [$_SESSION['u']['user_id'] ?? null,$action,$table,$id,$new ? json_encode($new) : null,$_SERVER['REMOTE_ADDR'] ?? null]); }
}
