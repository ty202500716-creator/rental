<?php
return [
  ['GET','rental-payments/dashboard','PaymentController@rentalDashboard',['Landlord']],
  ['GET','rental-payments/history','PaymentController@rentalHistory',['Landlord']],
  ['GET','rental-bills','PaymentController@rentalBills',['Landlord','Tenant']],
  ['POST','rental-bills/create','PaymentController@storeRentalBill',['Landlord']],
  ['POST','rental-bills/update','PaymentController@updateRentalBill',['Landlord']],
  ['GET','payments','PaymentController@index',['Landlord','Tenant']],
  ['POST','payments/create','PaymentController@store',['Tenant']],
  ['POST','payments/decide','PaymentController@decide',['Landlord']],
  ['POST','payments/cash','PaymentController@cash',['Landlord']],
  ['GET','receipts','PaymentController@receipts',['Tenant']],
];
