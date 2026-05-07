<?php
/**
 * The create view file of user module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     user
 * @link        https://xuanim.com
 */
?>
<?php
include '../../common/view/header.html.php';
include '../../common/view/treeview.html.php';
include '../../common/view/chosen.html.php';
?>
<div class="page-content">
  <?php include './deptside.html.php';?>
  <div class='user-content'>
    <div class="panel">
      <div class="panel-heading">
        <strong><?php echo $lang->user->create;?></strong>
      </div>
      <div class='panel-body'>
        <form method='post' id='ajaxForm' class='form-horizontal-2col'>
          <div class='form-row'>
            <div class='form-group'>
              <label><span class='field-required-mark'></span><?php echo $lang->user->dept;?></label>
              <div><?php echo html::select('dept', $depts, '', "class='chosen form-control'");?></div>
            </div>
            <div class='form-group'>
              <label><span class='field-required-mark'></span><?php echo $lang->user->role;?></label>
              <div><?php echo html::select('role', $lang->user->roleList, '', "class='form-control'");?></div>
            </div>
          </div>
          
          <div class='form-row'>
            <div class='form-group'>
              <label><span class='field-required-mark'></span><?php echo $lang->user->account;?></label>
              <div><?php echo html::input('account', '', "class='form-control' autocomplete='off'");?></div>
            </div>
            <div class='form-group'>
              <label><span class='field-required-mark'></span><?php echo $lang->user->realname;?></label>
              <div><?php echo html::input('realname', '', "class='form-control' autocomplete='off'");?></div>
            </div>
          </div>
          
          <div class='form-row'>
            <div class='form-group'>
              <label><span class='field-required-mark'></span><?php echo $lang->user->password;?></label>
              <div>
                <?php echo html::password('password1', '', "class='form-control' autocomplete='off'")?>
              </div>
            </div>
            <div class='form-group'>
              <label><span class='field-required-mark'></span><?php echo $lang->user->password2;?></label>
              <div>
                <?php echo html::password('password2', '', "class='form-control' autocomplete='off'");?>
              </div>
            </div>
          </div>

          <div class='form-row'>
            <div class='form-group'>
              <label><?php echo $lang->user->gender;?></label>
              <div><?php unset($lang->user->genderList->u); echo html::radio('gender', $lang->user->genderList, 'm');?></div>
            </div>
            <div class='form-group'>
              <label><?php echo $lang->user->userType;?></label>
              <div><?php echo html::radio('admin', $lang->user->userTypeList, 'no');?></div>
            </div>
          </div>

          <div class='form-row'>
            <div class='form-group'>
              <label><?php echo $lang->user->email;?></label>
              <div><?php echo html::input('email', '', "class='form-control' autocomplete='off'");?></div>
            </div>
            <div class='form-group'>
              <label><?php echo $lang->user->mobile;?></label>
              <div><?php echo html::input('mobile', '', "class='form-control' autocomplete='off'");?></div>
            </div>
          </div>
          
          <div class='form-row'>
            <div class='form-group form-actions'>
              <?php echo html::submitButton(); ?>
              <button type="button" class='btn btn-secondary btn-back' onclick="window.location.href='<?php echo $this->createLink('user', 'admin');?>'"><?php echo $lang->goback;?></button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</div>
<?php include '../../common/view/footer.html.php';?>
