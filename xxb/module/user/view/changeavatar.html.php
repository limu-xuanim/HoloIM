<?php
/**
 * The avatar change view file of user module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     user
 * @link        https://xuanim.com
 */
?>
<?php include '../../common/view/header.lite.html.php';?>
<div class='panel-body'>
<div class='avatar avatar-lg mgb-10'><?php if(!empty($user->avatar)) echo html::image($user->avatar . '?v=' . rand(), "class='avatar-img'");?></div>
    <form method='post' action="<?php echo inlink('uploadAvatar', "lite=true");?>" class='form-condensed text-center' id='avatarForm' enctype='multipart/form-data' class='hide'>
        <?php echo html::file('files', "class='form-control file-control'");?>
        <?php echo html::a('javascript:;', $lang->user->uploadAvatar, "class='btn btn-avatar submit'");?>
    </form>
</div>
<?php include '../../common/view/footer.html.php';?>
