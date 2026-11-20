<?php
return [
  ['GET','landlords','LandlordController@index',['Admin']],
  ['POST','landlords/review','LandlordController@review',['Admin']],
  ['GET','landlords/dashboard','LandlordController@dashboard',['Landlord']],
];
