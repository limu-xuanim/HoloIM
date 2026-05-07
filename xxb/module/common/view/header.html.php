<?php

/**
 * The header view of common module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     common
 * @link        https://xuanim.com
 */
?>
<?php if ($extView = $this->getExtViewFile(__FILE__)) { include $extView; return helper::cd(); } ?>
<?php include 'header.lite.html.php'; ?>
<style>
body {padding-top: 52px;}

</style>
<nav class='navbar navbar-main navbar-inverse navbar-fixed-top' id='mainNavbar'>
  <div class='navbar-header'>
  <img src='<?php echo $webRoot ?>/theme/default/images/main/header_logo.png' alt='logo' class='logo'>
  </div>
  <?php
  global $lang;
  $moduleName = $this->moduleName;
  if($moduleName == 'setting' && $this->methodName == 'lang') $moduleName = 'user';
  if($moduleName == 'tree') $moduleName = 'user';
  if (!isset($subMenu)) $subMenu = commonModel::createSubMenu($moduleName);
  ?>
  <?php
  $moduleName = $subMenu ? $lang->subMenuMap->{$moduleName} : $moduleName;
  echo commonModel::createMainMenu($moduleName, $this->methodName);

  $currentUser = $this->loadModel('user')->getByAccount($this->app->user->account);
  $avatar = commonModel::getAvatarHtml($currentUser, 30, array('extraStyle' => 'border-radius:50%;background-color:#1e6aeb;color:#fff;'));

  ?>
  <!-- 头像 -->
  <div class='avatar-container'>
  <?php echo html::a($this->createLink('user', 'profile'), $avatar, "data-toggle='modal' data-id='profile'"); ?>
  </div>
  <!-- 退出按钮 -->
  <div class='logout-container'>
      <a href='<?php echo $this->createLink('user', 'logout'); ?>'>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <mask id="mask0_5597_27084" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="0" y="0" width="16" height="16">
        <path d="M16 0H0V15.7661H16V0Z" fill="white"/>
        </mask>
        <g mask="url(#mask0_5597_27084)">
        <path d="M11.8125 3.60253L15.6562 7.39008C15.8855 7.6159 16 7.89303 16 8.22149C16 8.54995 15.8855 8.82709 15.6562 9.05291L11.8125 12.8405C11.6042 13.0457 11.3542 13.1484 11.0625 13.1484C10.7708 13.1484 10.5208 13.0457 10.3125 12.8405C10.1042 12.6352 10 12.3888 10 12.1014V10.1922H6C5.70833 10.1922 5.46875 10.0999 5.28125 9.91511C5.09375 9.73035 5 9.49427 5 9.20687V7.23611C5 6.94871 5.09375 6.71263 5.28125 6.52787C5.46875 6.34312 5.70833 6.25074 6 6.25074H10V4.34157C10 4.05416 10.1042 3.80782 10.3125 3.60253C10.5208 3.39725 10.7708 3.2946 11.0625 3.2946C11.3542 3.2946 11.6042 3.39725 11.8125 3.60253ZM5 3.2946H3C2.70833 3.2946 2.46875 3.38696 2.28125 3.57169C2.09375 3.75648 2 3.99258 2 4.27998V12.163C2 12.4504 2.09375 12.6865 2.28125 12.8712C2.46875 13.056 2.70833 13.1484 3 13.1484H5C5.29167 13.1484 5.53125 13.2408 5.71875 13.4255C5.90625 13.6103 6 13.8464 6 14.1338C6 14.4212 5.90625 14.6572 5.71875 14.842C5.53125 15.0268 5.29167 15.1191 5 15.1191H3C2.14583 15.0986 1.4375 14.8112 0.875 14.2569C0.3125 13.7027 0.0208333 13.0047 0 12.163V4.27998C0.0208333 3.43834 0.3125 2.74036 0.875 2.18605C1.4375 1.63174 2.14583 1.34434 3 1.32384H5C5.29167 1.32384 5.53125 1.41621 5.71875 1.60093C5.90625 1.78572 6 2.02182 6 2.30922C6 2.59663 5.90625 2.83272 5.71875 3.01751C5.53125 3.20224 5.29167 3.2946 5 3.2946Z" fill="#3D4667"/>
        </g>
        </svg>
      </a>
  </div>
  <!-- <ul class='nav navbar-nav navbar-right'>
    <li></li>
  </ul>
  <ul class='nav navbar-nav navbar-right'>
    <li><?php echo html::a($this->createLink('user', 'logout'), "<i class='icon icon-signout'></i> {$lang->logout}", 'target="_parent"') ?></li>
  </ul> -->
</nav>
<?php
if (!isset($moduleMenu)) $moduleMenu = commonModel::createModuleMenu($subMenu ? $lang->subMenuMap->$moduleName : $moduleName);

$moduleNameHtml = $moduleMenu ? "$moduleMenu\n" : '';
$withMenuClass = $moduleMenu ? "with-menu" : '';
$containerHtml = "$moduleNameHtml<div class='container-fluid $withMenuClass'>\n";

?>

<?php if ($subMenu) :?>
<?php $subMenuType = $lang->subMenuType->$moduleName;?>
<?php if ($subMenuType == 'left') :?>
<div class='sub-menu-layout'>
  <?php echo $subMenu;?>
  <?php echo $moduleNameHtml;?>
<?php else :?>
  <?php echo $subMenu;?>
  <?php echo $containerHtml;?>
<?php endif;?>
<?php else :?>
<?php echo $containerHtml;?>
<?php endif;?>
