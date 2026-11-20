<?php
return [
  ['GET','bookings','BookingController@index',['Landlord','Tenant']],
  ['GET','bookings/approved','BookingController@approved',['Landlord']],
  ['POST','bookings/create','BookingController@store',['Tenant']],
  ['POST','bookings/decide','BookingController@decide',['Landlord']],
  ['POST','bookings/cancel','BookingController@cancel',['Tenant']],
];
