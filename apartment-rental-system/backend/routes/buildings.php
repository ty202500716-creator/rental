<?php
return [
  ['GET','buildings','BuildingController@index',['Admin','Landlord']],
  ['POST','buildings/create','BuildingController@store',['Landlord']],
  ['POST','buildings/update','BuildingController@update',['Landlord']],
  ['POST','buildings/archive','BuildingController@archive',['Landlord']],
  ['POST','buildings/delete','BuildingController@delete',['Admin','Landlord']],
  ['POST','buildings/status','BuildingController@status',['Admin','Landlord']],
];
