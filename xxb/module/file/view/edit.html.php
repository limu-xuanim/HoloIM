<?php
/**
 * The edit view file of file module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     file
 * @link        https://xuanim.com
 */
?>
<?php include '../../common/view/header.modal.html.php';?>
<form method='post' enctype='multipart/form-data' id='ajaxForm' action='<?php echo $this->createLink('file', 'edit', "fileID=$file->id")?>'>
  <table class='table table-form table-data'>
    <tr>
      <th class='w-80px'><?php echo $lang->file->title;?></th>
      <td><?php echo html::input('title', $file->title, "class='form-control'");?></td>
    </tr>
    <tr>
      <th><?php echo $lang->file->editFile;?></th>
      <td><?php echo html::file('upFile', "class='form-control'");?></td>
    </tr>
    <tr>
      <th></th>
      <td><?php echo html::submitButton()?></td>
    </tr>
  </table>
</form>
<?php include '../../common/view/footer.modal.html.php';?>
