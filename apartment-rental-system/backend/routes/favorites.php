<?php
return [
  ['GET','favorites','FavoriteController@index',['Tenant']],
  ['POST','favorites/add','FavoriteController@add',['Tenant']],
  ['POST','favorites/remove','FavoriteController@remove',['Tenant']],
];
