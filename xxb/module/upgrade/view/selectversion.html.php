<?php
/**
 * The html template file of select version method of upgrade module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     upgrade
 */
?>
<?php include '../../common/view/header.lite.html.php';?>
<form method='post' action='<?php echo inlink('confirm');?>'>
<div class='container'>
  <div class='modal-dialog'>
    <div class='modal-header'>
      <h3><?php echo $lang->upgrade->selectVersion;?></h3>
    </div>
    <div class='modal-body'>
      <div class='form-group'>
        <?php
          echo html::select('fromVersion', $lang->upgrade->fromVersions, $version, "class='form-control single-input'");
          echo "&nbsp;&nbsp;<span class='text-danger help-inline'>{$lang->upgrade->versionNote}</span>";
        ?>
      </div>
    </div>
    <div class='modal-footer'>
      <?php echo html::submitButton($lang->upgrade->common);?>
    </div>
  </div>
</div>
</form>
<?php include '../../install/view/footer.html.php';?>
