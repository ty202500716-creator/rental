<?php
return [
  ['GET','utility-bills','UtilityBillController@index',['Landlord','Tenant']],
  ['POST','utility-bills/create','UtilityBillController@store',['Landlord']],
];
