<?php
return [
  ['GET','rentals','RentalController@index',['Landlord','Tenant']],
  ['GET','rentals/active','RentalController@active',['Landlord']],
  ['GET','rentals/mine','RentalController@mine',['Tenant']],
  ['POST','rentals/create','RentalController@store',['Landlord']],
  ['POST','rentals/update','RentalController@update',['Landlord']],
  ['POST','rentals/status','RentalController@status',['Landlord']],
  ['GET','renewals','RentalController@renewals',['Landlord','Tenant']],
  ['POST','renewals/create','RentalController@requestRenewal',['Tenant']],
  ['POST','renewals/decide','RentalController@decideRenewal',['Landlord']],
];
