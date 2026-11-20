<?php
return [
  'allowed_origin' => getenv('ALLOWED_ORIGIN') ?: 'http://localhost:5173',
  'upload_dir'     => __DIR__.'/../storage/uploads',
  'max_upload_mb'  => 5,
];
