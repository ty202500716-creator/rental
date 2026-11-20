<?php
function fail($m, $c = 400) { throw new ApiException($m, $c); }
function body() { static $b; return $b ??= ($_POST ?: (json_decode(file_get_contents('php://input'), true) ?: [])); }
