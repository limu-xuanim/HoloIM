<?php if(!empty($pageCSS)): ?><style><?php echo $pageCSS; ?></style><?php endif; ?>
<?php
$lang = $langClient;
$xxdStatusColor = $xxdStatus == 'online' ? 'color:#22C55E;' : 'color:#353535;';
$xxdStatusText = $lang->xxdStatusList[$xxdStatus];
?>
<div class="table-row statusBlock">
  <div class="status-block-row">
    <div class="date status-cell"><p class="sys-label"><?php echo $lang->xxdStatus; ?></p><span class="status-value" style="<?php echo $xxdStatusColor; ?>"><?php echo $xxdStatusText; ?></span></div>
    <div class="date status-cell"><p class="sys-label"><?php echo $runLabel; ?></p><span class="status-value"><?php echo $runValue; ?></span></div>
    <div class="status-cell"><p class="sys-label"><?php echo $lang->polling; ?></p><span class="status-value"><?php echo $polling; ?></span></div>
    <div class="status-cell"><p class="sys-label"><?php echo $lang->countUsers; ?></p><span class="status-value"><?php echo $onlineUserCount; ?></span></div>
  </div>
</div>
