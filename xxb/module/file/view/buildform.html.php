<?php
/**
 * The buildform view file of file module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     file
 * @link        https://xuanim.com
 */
?>
<?php if(commonModel::hasPriv('file', 'upload')):?>
<?php if(!$writable):?>
<h5 class='text-danger text-left'> <?php echo $this->lang->file->errorUnwritable;?> </h5>
<?php else:?>
<style>
.fileBox {margin-bottom: 10px; width: 100%}
table.fileBox td {padding: 0!important}
.fileBox .input-control > input[type='file'] {width: 100%; height: 100%; height: 26px; line-height: 26px; border: none; position: relative;}
.fileBox td .btn {border-radius: 0; border-left: none}
.file-wrapper.form-control {border-radius: 0;}
.file-name .form-control {border-radius: 0;}

@media (max-width: 600px){
.file-name {display: none;}
.fileBox td .btn-add {border-left: 1px solid rgb(204, 204, 204);}
}
</style>

<div id='fileform'>
  <?php
  /* Define the html code of a file row. */
  $fileRow = <<<EOT
  <table class='fileBox' id='fileBox\$i'>
    <tr>
      <td class='file-file'><div class='form-control file-wrapper'><input id='selectFiles' type='file' name='files[]' class='fileControl'  tabindex='-1' onchange='checkSize(this)'/></div></td>
      <td class='w-30px'><a href='javascript:void(0);' onclick='addFile(this)' class='btn btn-add btn-block'><i class='icon-plus'></i></a></td>
      <td class='w-30px'><a href='javascript:void(0);' onclick='delFile(this)' class='btn btn-del btn-block'><i class='icon-remove'></i></a></td>
    </tr>
  </table>
EOT;
  for($i = 1; $i <= $fileCount; $i ++) echo str_replace('$i', $i, $fileRow);
  printf($lang->file->sizeLimit, $this->config->file->maxSize / 1024 / 1024);
?>
</div>

<script language='javascript'>
/**
 * Check file size.
 *
 * @param  obj $obj
 * @access public
 * @return void
 */
function checkSize(obj)
{
    if(typeof($(obj)[0].files) != 'undefined')
    {
        var maxUploadInfo = '<?php echo strtoupper(ini_get('upload_max_filesize'));?>';
        var sizeType = {'K': 1024, 'M': 1024 * 1024, 'G': 1024 * 1024 * 1024};
        var unit = maxUploadInfo.replace(/\d+/, '');
        var maxUploadSize = maxUploadInfo.replace(unit,'') * sizeType[unit];
        var fileSize = 0;
        $(obj).parents('#fileform').find(':file').each(function()
        {
            if($(this).val()) fileSize += $(this)[0].files[0].size;
        });
        if(fileSize > maxUploadSize)
        {
            alert('<?php echo $lang->file->errorFileSize?>');
            $(obj).parents('#fileform').find(':file').each(function()
            {
                if($(this).val()) $(this).val('');
            });
        }
    }
}

/**
 * Show the upload max filesize of config.
 */
function maxFilesize(){return "(<?php printf($lang->file->maxUploadSize, $this->config->file->maxSize / 1024 /1024 . 'M');?>)";}

/**
 * Add a file input control.
 *
 * @param  object $clickedButton
 * @access public
 * @return void
 */
function addFile(clickedButton)
{
    fileRow = <?php echo json_encode($fileRow);?>;
    fileRow = fileRow.replace('$i', $('.fileID').size() + 1);
    $(clickedButton).closest('.fileBox').after(fileRow);

    updateID();
}

/**
 * Delete a file input control.
 *
 * @param  object $clickedButton
 * @access public
 * @return void
 */
function delFile(clickedButton)
{
    if($('.fileBox').size() == 1) return;
    $(clickedButton).closest('.fileBox').remove();
    updateID();
}

/**
 * Update the file id labels.
 *
 * @access public
 * @return void
 */
function updateID()
{
    i = 1;
    $('.fileID').each(function(){$(this).html(i ++)});
}
</script>
<?php endif;?>
<?php endif;?>
