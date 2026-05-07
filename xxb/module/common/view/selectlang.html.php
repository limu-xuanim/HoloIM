<?php
/**
 * The selectLang view of common module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     common
 * @link        https://xuanim.com
 */
?>
<?php $clientLang = $this->app->getClientLang();?>
<a href='###' data-toggle='dropdown' class='dropdown-toggle'><i class='icon icon-globe'></i> <?php echo $config->langs[$clientLang]?> <span class='caret'></span></a>
<ul class='dropdown-menu'>
  <?php
  $langs = $config->langs;
  unset($langs[$clientLang]);
  foreach($langs as $langKey => $currentLang) echo "<li><a href='javascript:selectLang(\"$langKey\")'>$currentLang</a></li>";
  ?>
</ul>
