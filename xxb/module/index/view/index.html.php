<?php

/**
 * The index view file of index module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     index
 * @link        https://xuanim.com
 */
include '../../common/view/header.html.php';
include '../../common/view/version.html.php';
include '../../common/view/dashboard.html.php';
?>
<?php js::set('currentVersion', !empty($currentVersion) ? $currentVersion->version : '0.0.0'); ?>
<?php js::set('versionApiUrl', $versionApiUrl); ?>
<?php js::set('userAccount', $this->app->user->account); ?>
<div id='dashboardWrapper'>
  <div class='panels-container dashboard' id='dashboard' data-confirm-remove-block='<?php echo $lang->block->confirmRemoveBlock; ?>'>
    <div class='row'>
      <?php foreach ($blocks as $key => $block): ?>
      <div class='col-xs-<?php echo $block->grid; ?> pull-left'>
        <div class='panel' style="height: <?php echo $block->height; ?>;" id='block<?php echo $block->id; ?>' data-id='<?php echo $key; ?>' data-blockid='<?php echo $block->id ?>' data-name='<?php echo $block->title ?>' data-url='<?php echo $block->blockLink; ?>'>
          <div class='panel-heading'>
            <div class='panel-actions'>
              <a class="refresh-panel">
                <?php echo html::svgIcon('refresh'); ?>
              </a>
            </div>
            <?php echo $block->title ?>
          </div>
          <div class='panel-body no-padding'></div>
        </div>
      </div>
      <?php endforeach; ?>
    </div>
  </div>
</div>
<div id='noticeBox'>
  <div id="noticeGoUpgrade" class="alert alert-success with-icon alert-dismissable">
    <button type="button" class="close" data-dismiss="alert" aria-hidden="true">x</button>
    <i class="icon icon-flag"></i>
    <div class="content">
      <p>
        <?php echo $lang->client->xxcNotice; ?>&nbsp;<small class='text-danger version'></small>
        <?php echo html::a(helper::createLink('client', 'checkUpgrade'), $lang->client->goUpdate . '<i class="icon icon-double-angle-right"></i>', 'class="small"'); ?>
      </p>
    </div>
  </div>
</div>
<?php include '../../common/view/footer.html.php'; ?>
