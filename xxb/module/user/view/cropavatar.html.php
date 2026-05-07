<?php
/**
 * The crop avatar view file of user module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     user
 * @link        https://xuanim.com
 */
?>
<?php include '../../common/view/header.modal.html.php';?>
<?php include '../../common/view/imgcutter.html.php';?>
<table class='table table-form'>
  <tr>
    <td>
      <div class="img-cutter fixed-ratio" id="imgCutter" style="min-width: 300px;max-width: 100%">
        <div class="canvas">
        <?php
        if(empty($user->avatar))
        {
            echo html::image($image->fullURL);
        }
        else
        {
            echo html::image($user->avatar);
        }
        ?>
        </div>
        <div class="actions">
          <h5><?php echo $lang->user->cropAvatarTip;?></h5>
          <div class="img-cutter-preview"></div>
          <button type="button" class="btn btn-primary img-cutter-submit"><?php echo $lang->save;?></button> <?php echo html::a(inlink('profile'), $lang->goback, "class='btn loadInModal'");?>
        </div>
      </div>
    </td>
  </tr>
</table>
<script>
var $imgCutter = $("#imgCutter");
$imgCutter.imgCutter(
{
    fixedRatio: true,
    post: '<?php echo inlink('cropavatar', "image={$image->id}")?>',
    ready: function() {$.zui.ajustModalPosition(); $imgCutter.css('width', $imgCutter.closest('.modal-dialog').width() - 50);},
    done: function(response)
    {
        $('#start .avatar, #startMenu .avatar').html('<img src="<?php echo $user->avatar?>?v=' + $.zui.uuid() + '" />');
        $('#ajaxModal').load(createLink('user', 'profile'), function(){$.zui.ajustModalPosition()});
        window.location.reload();
    },
});
</script>
<?php include '../../common/view/footer.modal.html.php';?>
