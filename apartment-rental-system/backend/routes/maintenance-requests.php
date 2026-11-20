<?php
return [
  ['GET','maintenance-requests','MaintenanceRequestController@index',['Landlord','Tenant']],
  ['POST','maintenance-requests/create','MaintenanceRequestController@store',['Tenant']],
  ['POST','maintenance-requests/respond','MaintenanceRequestController@respond',['Landlord']],
  ['POST','maintenance-requests/cancel','MaintenanceRequestController@cancel',['Tenant']],
];
