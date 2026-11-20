
<?php

class TenantController {

  // Admin views all tenants.
  // Landlord views only tenants associated with their properties.
  static function index($u, $b) {
    return [
      'rows' => Tenant::listFor($u),
      'stats' => Tenant::counts($u)
    ];
  }

  static function details($u, $b) {
    $tenantId = filter_var($_GET['tenant_id'] ?? null, FILTER_VALIDATE_INT);
    if (!$tenantId) fail('Invalid tenant.', 400);
    return ['tenant' => Tenant::details($tenantId, $u)];
  }

  static function document($u, $b) {
    $tenantId = filter_var($_GET['tenant_id'] ?? null, FILTER_VALIDATE_INT);
    if (!$tenantId) fail('Invalid tenant.', 400);
    Tenant::details($tenantId, $u);
    $document = Tenant::document($tenantId);
    if (!$document) fail('Identity document not found.', 404);
    self::streamDocument($document['file_path']);
  }

  static function streamDocument($path) {
    $cfg = require BASE.'/config/app.php';
    $file = $cfg['upload_dir'].'/'.basename($path);
    if (!is_file($file)) fail('Identity document not found.', 404);
    $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'pdf'], true)) fail('Unsupported identity document.', 404);
    while (ob_get_level() > 0) ob_end_clean();
    header('Content-Type: '.($ext === 'pdf' ? 'application/pdf' : ($ext === 'webp' ? 'image/webp' : 'image/'.($ext === 'jpg' ? 'jpeg' : $ext))));
    header('Content-Disposition: inline');
    header('Cache-Control: private, no-store');
    header('X-Content-Type-Options: nosniff');
    header('Content-Length: '.filesize($file));
    readfile($file);
    exit;
  }

  // Tenant dashboard - keep existing functionality.
  static function dashboard($u, $b) {
    return [
      'stats' => Tenant::dashboard(
        Tenant::idFor($u['user_id']),
        $u['user_id']
      )
    ];
  }

  // Admin and authorized Landlords verify tenant identity.
  static function verify($u, $b) {

    Validator::required($b, 'tenant_id', 'decision');

    $t = filter_var($b['tenant_id'], FILTER_VALIDATE_INT);
    if (!$t) fail('Invalid tenant.', 400);
    if (!in_array($b['decision'], ['Verified', 'Rejected'], true)) fail('Invalid decision.');
    if ($b['decision'] === 'Rejected') {
      Validator::required($b, 'reason');
      $b['reason'] = trim($b['reason']);
      if ($b['reason'] === '') fail('A rejection reason is required.');
      if (mb_strlen($b['reason']) > 255) fail('Rejection reason must be 255 characters or fewer.');
    }

    if ($u['role'] === 'Landlord') {
      $l = Landlord::idFor($u['user_id']);
      if (!$l || !Tenant::dealsWith($t, $l)) fail('Tenant not found.', 404);
    } elseif ($u['role'] !== 'Admin') {
      fail('Unauthorized.', 403);
    }

    Tenant::review($t, $u['user_id'], $b['decision'], $b['reason'] ?? null);

    $tenantUserId=Tenant::userId($t);
    $message=$b['decision']==='Verified'?'Your identity document was verified.':'Your identity document was rejected. Reason: '.trim($b['reason']);
    Notifier::send($tenantUserId,'System','Identity '.$b['decision'],$message,'tenant',$t);
    Notifier::audit('TENANT_'.strtoupper($b['decision']),'tenant',$t,['decision'=>$b['decision'],'reason'=>$b['reason']??null]);

    return ['ok' => true];
  }

  // Tenant submits identity document.
  static function identity($u, $b) {

    Validator::required($b, 'id_type', 'id_number');

    $f = FileUploader::save('id_file');

    if (!$f) {
      fail('Please upload your identity document.');
    }

    Tenant::submitIdentity(
      $u['user_id'],
      $b['id_type'],
      $b['id_number'],
      $f,
      $_FILES['id_file']['name']
    );

    return ['ok' => true];
  }

  static function setAccountStatus($userId,$status,$reason,$actorId) {
    $account=User::accountState($userId);
    if(!$account||$account['role']!=='Tenant')fail('Tenant not found.',404);
    $tenantId=Tenant::idFor($userId);
    if(!$tenantId)fail('Tenant profile not found.',404);
    $old=$account['account_status'];
    User::setStatus($userId,$status,$reason);
    $message=$status==='Active'?'Your tenant account has been reactivated.':'Your tenant account has been '.$status.'. Reason: '.$reason;
    Notifier::send($userId,'System','Account '.$status,$message,'tenant',$tenantId);
    if($status!=='Active')foreach(Tenant::relatedLandlordUsers($tenantId) as $landlordUserId)Notifier::send($landlordUserId,'System','Tenant account '.$status,'A tenant connected to your rental or pending booking has an account status of '.$status.'. Reason: '.$reason,'tenant',$tenantId);
    Notifier::audit('TENANT_ACCOUNT_STATUS','tenant',$tenantId,['old_status'=>$old,'status'=>$status,'reason'=>$reason]);
  }
}
