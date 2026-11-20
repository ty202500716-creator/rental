<?php
return [
  ['GET','listings','UnitController@listings',null],
  ['GET','units','UnitController@index',['Admin','Landlord']],
  ['GET','units/details','UnitController@details',['Admin','Landlord']],
  ['POST','units/create','UnitController@store',['Landlord']],
  ['POST','units/update','UnitController@update',['Landlord']],
  ['POST','units/status','UnitController@status',['Admin','Landlord']],
  ['POST','units/delete','UnitController@delete',['Admin','Landlord']],
];
