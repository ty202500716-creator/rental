<?php // Admin-only: system dashboard and user (admin account) management
return [
  ['GET','admin/dashboard','AdminController@dashboard',['Admin']],
  ['GET','admin/users','AdminController@users',['Admin']],
  ['POST','admin/users/create','AdminController@createUser',['Admin']],
  ['POST','admin/users/status','AdminController@setStatus',['Admin']],
  ['GET','admin/audit-log','AdminController@auditLog',['Admin']],
];
