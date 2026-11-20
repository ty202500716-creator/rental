<?php
return [
  ['GET','tenants','TenantController@index',['Admin','Landlord']],
  ['GET','tenants/details','TenantController@details',['Admin','Landlord']],
  ['GET','tenants/document','TenantController@document',['Admin','Landlord']],
  ['POST','tenants/verify','TenantController@verify',['Admin','Landlord']],
  ['POST','tenants/identity','TenantController@identity',['Tenant']],
  ['GET','tenants/dashboard','TenantController@dashboard',['Tenant']],
];
