<?php
/**
 * The print files view file of file module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     file
 * @link        https://xuanim.com
 */
$sessionString  = $config->requestType == 'PATH_INFO' ? '?' : '&';
$sessionString .= session_name() . '=' . session_id();
?>
<style>
  ul.files-list {margin-bottom: 0; margin-top: 10px;}
  .files-list > li {margin-top: -1px; border: 1px solid #ddd; background: #fafafa; padding: 5px 10px; width: 350px; height: 30px;}
  .files-list > li > i {display: inline-block; margin-right: 5px; float: left;}
  .files-list > li > .file-name {display: inline-block; max-width: 260px;}
  .files-list > li > .link-btn {float: right; margin-left: 10px;}
  .files-list > li > a:hover {text-decoration: none}

</style>
<script language='Javascript'>
/* Delete a file. */
function deleteFile(fileID)
{
    if(!fileID) return;
    hiddenwin.location.href =createLink('file', 'delete', 'fileID=' + fileID);
}
/* Download a file, append the mouse to the link. Thus we call decide to open the file in browser no download it. */
function downloadFile(fileID)
{
    if(!fileID) return;
    var sessionString = '<?php echo $sessionString;?>';
    var url = createLink('file', 'download', 'fileID=' + fileID + '&mouse=left') + sessionString;
    window.open(url, '_blank');
    return false;
}
</script>
<?php if(commonModel::hasPriv('file', 'download')):?>
<?php if($fieldset == 'true'):?>
<fieldset>
  <legend><?php echo $lang->file->common;?></legend>
<?php endif;?>
  <ul class="files-list list-unstyled">
    <?php
    foreach($files as $file)
    {
        echo "<li><i class='icon-file-text-alt text-muted'></i> ";
        echo html::a('javascript:;', $file->title .'.' . $file->extension, "onclick='return downloadFile($file->id)' class='file-name text-nowrap' title='{$file->title}'");
        commonModel::printLink('file', 'delete', "fileID=$file->id", "<i class='icon-remove'></i>", "class='deleter link-btn'");
        commonModel::printLink('file', 'edit', "fileID=$file->id", "<i class='icon-pencil'></i>", "data-toggle='modal' class='link-edit link-btn'");
        echo '</li>';
    }
    ?>
  </ul>
<?php if($fieldset == 'true') echo '</fieldset>';?>
<?php endif;?>
