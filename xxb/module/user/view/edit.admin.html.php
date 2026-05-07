<?php
/**
 * The edit admin view file of user module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     user
 * @link        https://xuanim.com
 */
?>
<?php include '../../common/view/header.html.php';?>
<?php include '../../common/view/treeview.html.php';?>
<?php include '../../common/view/chosen.html.php';?>
<div class='page-content'>
  <?php include './deptside.html.php';?>
  <div class='user-content'>
    <div class="panel">
      <div class="panel-heading"><strong><?php echo $lang->user->editProfile;?></strong></div>
      <form method='post' id='ajaxForm' class='panel-body form-horizontal-2col'>
        <div class='form-section'>
          <h4 class='form-section-title'><?php echo $lang->user->basicInfo; ?></h4>
          
          <div class='form-row'>
            <div class='form-group'>
              <label><?php echo $lang->user->account;?></label>
              <div><?php echo html::input('account', $user->account, "class='form-control disabled' disabled='disabled'");?></div>
            </div>
            <div class='form-group'>
              <label><span class='field-required-mark'></span><?php echo $lang->user->realname;?></label>
              <div><?php echo html::input('realname', $user->realname, "class='form-control'");?></div>
            </div>
          </div>

          <div class='form-row'>
            <div class='form-group'>
              <label><?php echo $lang->user->dept;?></label>
              <div><?php echo html::select('dept', $depts, $user->dept, "class='chosen form-control'");?></div>
            </div>
            <div class='form-group'>
              <label><?php echo $lang->user->role;?></label>
              <div><?php echo html::select('role', $roleList, $user->role, "class='form-control'");?></div>
            </div>
          </div>

          <div class='form-row'>
            <div class='form-group'>
              <label><span class='field-required-mark'></span><?php echo $lang->user->password;?></label>
              <div><?php echo html::password('password1', '', "class='form-control' autocomplete='off'")?></div>
            </div>
            <div class='form-group'>
              <label><span class='field-required-mark'></span><?php echo $lang->user->password2;?></label>
              <div><?php echo html::password('password2', '', "class='form-control'");?></div>
            </div>
          </div>
          
          <div class='form-row'>
            <div class='form-group'>
              <label><?php echo $lang->user->gender;?></label>
              <div><?php unset($lang->user->genderList->u); echo html::radio('gender', $lang->user->genderList, $user->gender);?></div>
            </div>
            <div class='form-group'>
              <label><?php echo $lang->user->userType;?></label>
              <div><?php echo html::radio('admin', $lang->user->userTypeList, $user->admin);?></div>
            </div>
          </div>
        </div>
        
        <div class='form-section'>
          <h4 class='form-section-title'><?php echo $lang->user->contactInfo; ?></h4>

          <div class='form-row'>
            <div class='form-group'>
              <label><?php echo $lang->user->mobile;?></label>
              <div><?php echo html::input('mobile', $user->mobile, "class='form-control'");?></div>
            </div>
            <div class='form-group'>
              <label><?php echo $lang->user->phone;?></label>
              <div><?php echo html::input('phone', $user->phone, "class='form-control'");?></div>
            </div>
          </div>

          <div class='form-row'>
            <div class='form-group'>
              <label><?php echo $lang->user->qq;?></label>
              <div><?php echo html::input('qq', $user->qq, "class='form-control'");?></div>
            </div>
            <div class='form-group'>
              <label><?php echo $lang->user->weixin;?></label>
              <div><?php echo html::input('weixin', $user->weixin, "class='form-control'");?></div>
            </div>
          </div>
          
          <div class='form-row'>
            <div class='form-group'>
              <label><?php echo $lang->user->email;?></label>
              <div><?php echo html::input('email', $user->email, "class='form-control'");?></div>
            </div>
            <div class='form-group'>
              <label><?php echo $lang->user->zipcode;?></label>
              <div><?php echo html::input('zipcode', $user->zipcode, "class='form-control'");?></div>
            </div>
          </div>
          
          <div class='form-row'>
            <div class='form-group form-group-full'>
              <label><?php echo $lang->user->address;?></label>
              <div><?php echo html::input('address', $user->address, "class='form-control'");?></div>
            </div>
          </div>
        </div>
        
        <div class='form-row'>
          <div class='form-group form-actions'>
            <?php echo html::submitButton();?>
            <button type="button" class='btn btn-secondary btn-back' onclick="window.location.href='<?php echo $this->createLink('user', 'admin');?>'"><?php echo $lang->goback;?></button>
          </div>
        </div>
      </form>
    </div>
  </div>
</div>
<?php include '../../common/view/footer.html.php';?>
