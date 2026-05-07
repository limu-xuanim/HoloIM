<?php
/**
 * The view file of groupsetting module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     groupsetting
 * @link        https://xuanim.com
 */
?>
<?php include '../../common/view/header.html.php';?>
<?php $this->app->loadLang('client')?>
<div class='groupsetting-container'>
  <div class='panel <?php echo $type == 'edit' ? 'edit-mode' : '';?>'>
    <div class='panel-heading'>
      <?php echo $lang->setting->param;?>
    </div>
    <?php $disableSystemGroupChat = zget($config->xuanxuan, 'disableSystemGroupChat', 'off');?>
    <?php if($type == 'edit'):?>
    <form method='post' id='ajaxForm' class='form-ajax'>
      <div class='panel-body'>
        <div class='form-horizontal-2col'>
          <div class='form-row'>
            <div class='form-group form-group-full'>
              <label><?php echo $lang->enableSystemChatGroup; ?></label>
              <div class='groupsetting-field'>
                <?php echo html::radio('disableSystemGroupChat', $lang->systemGroupChatOptions, $disableSystemGroupChat, "class='checkbox'"); ?>
              </div>
            </div>
          </div>
          <div class='form-row'>
            <div class='form-group form-group-full'>
              <label></label>
              <div class='text-muted' style='font-size: 14px; color: #838A9D;'><i class="icon icon-exclamation-sign" style='color: #ffa500;'></i> <?php echo $lang->disableSystemGroupChatTip; ?></div>
            </div>
          </div>
          <div class='form-row'>
            <div class='form-group form-actions'>
              <?php echo html::submitButton();?>
              <button type="button" class='btn btn-secondary btn-back' onclick="window.location.href='<?php echo $this->createLink('groupsetting', 'admin');?>'"><?php echo $lang->goback;?></button>
            </div>
          </div>
        </div>
      </div>
    </form>
    <?php else:?>
    <div class='read-view'>
      <div class='read-row'>
        <div class='read-label'><?php echo $lang->enableSystemChatGroup; ?></div>
        <div class='read-value'><?php echo zget($lang->systemGroupChatOptions, $disableSystemGroupChat); ?></div>
      </div>
      <div class='read-actions'>
        <?php echo html::linkButton('<i class="icon-edit"></i>  ' . $lang->editConfig, helper::createLink('groupsetting', 'admin', 'type=edit'), 'btn btn-primary'); ?>
      </div>
    </div>
    <?php endif; ?>
  </div>
</div>
<?php include '../../common/view/footer.html.php';?>
