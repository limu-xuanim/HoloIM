<?php
/**
 * The crop avatar lite view file of user module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     user
 * @link        https://xuanim.com
 */
?>
<?php include '../../common/view/header.lite.html.php';?>
<?php include '../../common/view/imgcutter.html.php';?>
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
            <button type="button" class="btn btn-primary img-cutter-submit"><?php echo $lang->save;?></button>
        </div>
    </div>

<script>
var $imgCutter = $("#imgCutter");
$imgCutter.imgCutter(
{
    fixedRatio: true,
    post: '<?php echo inlink('cropavatar', "image={$image->id}")?>',
    ready: function() {$imgCutter.css('width', $("img").first().width());},
    done: function(response) {
        new $.zui.Messager('<?php echo $lang->user->cropAvatarLiteSuccess;?>', {
            type: 'success',
            placement: 'center',
            close: 'false',
            time: 0
        }).show();
        if(window.navigator.userAgent.indexOf('xuanxuan') > 0) {
            setTimeout(() => {
                window.open('xxc://closeDisplay');
            },2000);
        }
    },
});
</script>
<?php include '../../common/view/footer.html.php';?>
