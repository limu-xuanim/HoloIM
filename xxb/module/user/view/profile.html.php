<?php
/**
 * The profile view file of user module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     user
 * @link        https://xuanim.com
 */
?>
<?php include '../../common/view/header.modal.html.php';?>
<div class='profile-panel'>
  <div class='avatar-content'>
    <div class='profile-avatar'>
      <a href='javascript:;' class='btn-upload-avatar' title='<?php echo $lang->user->uploadAvatar;?>'>
        <div class='avatar avatar-xxl'>
          <?php echo commonModel::getAvatarHtml($user, 64, array('useImageTag' => true, 'addRandom' => true)); ?>
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

  <div class='profile-content'>
    <!-- 基本信息 -->
    <div class='profile-section'>
      <div class='profile-section-header'>
        <h4><?php echo $lang->user->basicInfo;?></h4>
      </div>
      <div class='profile-section-body'>
        <div class='profile-row'>
          <div class='profile-item'>
            <label><?php echo $lang->user->realname;?></label>
            <div class='profile-value'><?php echo $user->realname;?></div>
          </div>
          <div class='profile-item'>
            <label><?php echo $lang->user->account;?></label>
            <div class='profile-value'><?php echo $user->account;?></div>
          </div>
        </div>
        <div class='profile-row'>
          <div class='profile-item'>
            <label><?php echo $lang->user->dept;?></label>
            <div class='profile-value'><?php echo isset($user->deptName) ? $user->deptName : '';?></div>
          </div>
          <div class='profile-item'>
            <label><?php echo $lang->user->role;?></label>
            <div class='profile-value'><?php echo isset($lang->user->roleList[$user->role]) ? $lang->user->roleList[$user->role] : $user->role;?></div>
          </div>
        </div>
        <div class='profile-row'>
          <div class='profile-item'>
            <label><?php echo $lang->user->gender;?></label>
            <div class='profile-value'><?php echo isset($lang->user->genderList->{$user->gender}) ? $lang->user->genderList->{$user->gender} : '';?></div>
          </div>
          <div class='profile-item'></div>
        </div>
      </div>
    </div>

    <!-- 联系信息 -->
    <div class='profile-section'>
      <div class='profile-section-header'>
        <h4><?php echo $lang->user->contactInfo;?></h4>
      </div>
      <div class='profile-section-body'>
        <div class='profile-row'>
          <div class='profile-item'>
            <label><?php echo $lang->user->mobile;?></label>
            <div class='profile-value'><?php echo $user->mobile;?></div>
          </div>
          <div class='profile-item'>
            <label><?php echo $lang->user->phone;?></label>
            <div class='profile-value'><?php echo $user->phone;?></div>
          </div>
        </div>
        <div class='profile-row'>
          <div class='profile-item'>
            <label><?php echo $lang->user->qq;?></label>
            <div class='profile-value'><?php echo $user->qq;?></div>
          </div>
          <div class='profile-item'>
            <label><?php echo $lang->user->weixin;?></label>
            <div class='profile-value'><?php echo $user->weixin;?></div>
          </div>
        </div>
        <div class='profile-row'>
          <div class='profile-item'>
            <label><?php echo $lang->user->email;?></label>
            <div class='profile-value'><?php echo $user->email;?></div>
          </div>
          <div class='profile-item'>
            <label><?php echo $lang->user->zipcode;?></label>
            <div class='profile-value'><?php echo $user->zipcode;?></div>
          </div>
        </div>
        <div class='profile-row'>
          <div class='profile-item profile-item-full'>
            <label><?php echo $lang->user->address;?></label>
            <div class='profile-value'><?php echo $user->address;?></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 底部工具栏 -->
  <div class='profile-toolbar'>
    <?php echo html::a(inlink('editself'), '<i class="icon icon-edit"></i> ' . $lang->user->editProfile, "class='btn  loadInModal'");?>
    <?php echo html::a('javascript:;', '<i class="icon icon-user"></i> ' . $lang->user->uploadAvatar, "class='btn  btn-upload-avatar'");?>
  </div>
</div>

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
<?php include '../../common/view/footer.modal.html.php';?>
