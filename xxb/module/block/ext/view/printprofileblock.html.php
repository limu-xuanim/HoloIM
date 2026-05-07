<?php if(!empty($pageCSS)): ?><style><?php echo $pageCSS; ?></style><?php endif; ?>
<?php
$lang = $langUser;
$realname      = empty($user->realname) ? $lang->notset : $user->realname;
$email         = empty($user->email) ? $lang->notset : $user->email;
$mobile        = empty($user->mobile) ? $lang->notset : $user->mobile;
$lastLoginTime = empty($user->last) ? $lang->notset : $user->last;
$lastLoginIP   = empty($user->ip) ? $lang->notset : $user->ip;
$avatarHtml    = commonModel::getAvatarHtml($user, 64);
$uploadAvatarBtn = html::a($profileUrl, $avatarHtml, "data-toggle='modal' data-id='profile' class='btn btn-primary center-block' style='width:64px;height:64px;font-size:27px;padding:0;min-width:64px;'");
?>
<div class="profile-block">
  <div class="profile-info">
    <div class="profile-avatar"><?php echo $uploadAvatarBtn; ?></div>
    <div class="profile-main">
      <div class="profile-name"><?php echo $realname; ?></div>
      <div class="profile-concat">
        <span class="profile-email"><?php echo html::svgIcon('email', 14, 14); ?><?php echo $email; ?></span>
        <span class="profile-mobile"><?php echo html::svgIcon('mobile', 14, 14); ?><?php echo $mobile; ?></span>
      </div>
    </div>
  </div>
  <div class="profile-login">
    <div class="profile-login-item"><span class="profile-label"><?php echo $lang->lastLoginTime; ?></span><span class="profile-value"><?php echo $lastLoginTime; ?></span></div>
    <div class="profile-login-item"><span class="profile-label"><?php echo $lang->lastLoginIP; ?></span><span class="profile-value"><?php echo $lastLoginIP; ?></span></div>
  </div>
</div>
