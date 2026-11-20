<?php // shared by every logged-in role
return [
  ['GET','profile','AccountController@profile',[]],
  ['POST','profile','AccountController@updateProfile',[]],
  ['POST','profile/photo','AccountController@updateProfilePhoto',[]],
  ['POST','profile/photo/remove','AccountController@removeProfilePhoto',[]],
  ['POST','password','AccountController@password',[]],
  ['POST','account/credentials','AccountController@credentials',[]],
  ['GET','notifications','AccountController@notifications',[]],
  ['POST','notifications/read','AccountController@markRead',[]],
  ['GET','announcements','AccountController@announcements',[]],
  ['POST','announcements/create','AccountController@postAnnouncement',['Admin','Landlord']],
  ['GET','files','AccountController@file',[]],
];
