<?php
/**
 * The edit view file of user module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     user
 * @link        https://xuanim.com
 */
?>
<?php include $app->getModuleRoot() . '/common/view/header.modal.html.php'; ?>
<?php include $app->getModuleRoot() . '/common/view/chosen.html.php';?>
<form method='post' id='editForm' action="<?php echo inlink('editself', "account={$user->account}");?>">
  <div class='profile-panel'>
    <div class='avatar-content'>
      <div class='profile-avatar'>
        <a href='javascript:;' class='btn-upload-avatar' title='<?php echo $lang->user->uploadAvatar;?>'>
          <div class='avatar avatar-xxl'>
            <?php echo !empty($user->avatar) ? html::image($user->avatar . '?v=' . rand(), "class='avatar-img'") : commonModel::getAvatarHtml($user, 64, array('useImageTag' => true, 'addRandom' => true));?>
          </div>
          <div class='avatar-upload-overlay'>
            <i class='icon icon-upload'></i>
          </div>
        </a>
        <form method='post' action="<?php echo inlink('uploadAvatar', "account={$user->account}");?>" class='form-condensed text-center' id='avatarForm' enctype='multipart/form-data' class='hide'>
          <?php echo html::file('files', "class='form-control file-control'");?>
          <?php echo html::a('javascript:;', $lang->user->uploadAvatar, "class='btn btn-avatar submit'");?>
        </form>
      </div>
    </div>

    <div class='profile-content form-horizontal-2col'>
      <!-- 基本信息 -->
      <div class='form-section'>
        <h4 class='form-section-title'><?php echo $lang->user->basicInfo;?></h4>
        
        <div class='form-row'>
          <div class='form-group'>
            <label><?php echo $lang->user->account;?></label>
            <div><?php echo html::input('account', $user->account, "class='form-control' disabled='disabled'");?></div>
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
            <div><?php echo html::select('role', $this->lang->user->roleList, $user->role, "class='form-control'");?></div>
          </div>
        </div>
        
        <div class='form-row'>
          <div class='form-group'>
            <label><?php echo $lang->user->gender;?></label>
            <div><?php unset($lang->user->genderList->u); echo html::radio('gender', $lang->user->genderList, $user->gender);?></div>
          </div>
          <div class='form-group'></div>
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
      </div>

      <!-- 联系信息 -->
      <div class='form-section'>
        <h4 class='form-section-title'><?php echo $lang->user->contactInfo;?></h4>
        
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
      
      <!-- 底部按钮 -->
      <div class='form-row'>
        <div class='form-group form-actions'>
          <?php echo html::submitButton();?>
          <?php echo html::a(inlink('profile'), $lang->goback, "class='btn btn-secondary btn-back loadInModal'");?>
        </div>
      </div>
    </div>
  </div>
</form>

<script>
$(function() {
  $('.btn-upload-avatar').on('click', function() {
    $('#avatarForm .file-control').click();
  });
  
  $('#avatarForm .file-control').on('change', function() {
    if($(this).val()) {
      $('#avatarForm').submit();
    }
  });
});
</script>
<?php include $app->getModuleRoot() . '/common/view/footer.modal.html.php'; ?>
