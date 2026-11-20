<?php
return [
  ['POST','auth/login','AuthController@login',null],
  ['POST','auth/register','AuthController@register',null],
  ['GET','auth/me','AuthController@me',[]],
  ['POST','auth/logout','AuthController@logout',[]],
];
