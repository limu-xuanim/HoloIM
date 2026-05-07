<?php
$lang = $langClient;
$fileSize = $fileSizeRaw;
if($fileSize == 0)
{
    $fileSize .= '<small>0 KB</small>';
}
else if($fileSize > $lang->sizeType['G'])
{
    $fileSize = round($fileSize / $lang->sizeType['G'], 2) . '<small> GB</small>';
}
else if($fileSize > $lang->sizeType['M'])
{
    $fileSize = round($fileSize / $lang->sizeType['M'], 2) . '<small> MB</small>';
}
else if($fileSize > $lang->sizeType['K'])
{
    $fileSize = round($fileSize / $lang->sizeType['K'], 2) . '<small> KB</small>';
}
?>
<div class="table-row statisticsBlock">
  <div class="col"><p class="sys-label"><?php echo $lang->totalUsers; ?></p><span class="status-value"><?php echo $users; ?></span></div>
  <div class="col"><p class="sys-label"><?php echo $lang->message['total']; ?></p><span class="status-value"><?php echo $messages->total; ?></span></div>
  <div class="col"><p class="sys-label"><?php echo $lang->totalGroups; ?></p><span class="status-value"><?php echo $groups; ?></span></div>
  <div class="col"><p class="sys-label"><?php echo $lang->fileSize; ?></p><span class="status-value"><?php echo $fileSize; ?></span></div>
  <div class="col"><p class="sys-label"><?php echo $lang->message['day']; ?></p><span class="status-value"><?php echo $messages->day; ?></span></div>
  <div class="col"><p class="sys-label"><?php echo $lang->message['hour']; ?></p><span class="status-value"><?php echo $messages->hour; ?></span></div>
</div>
