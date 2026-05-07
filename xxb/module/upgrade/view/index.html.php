<?php
/**
 * The html template file of index method of upgrade module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     upgrade
 */
?>
<?php include '../../common/view/header.lite.html.php';?>
<div class='container'>
  <?php if($type == 'todoFolder'):?>
  <div class='modal-dialog'>
    <div class='modal-header'>
      <h3><?php echo sprintf($lang->upgrade->removeTodo, $todoPath);?></h3>
    </div>
    <div class='panel-body'><?php echo sprintf($lang->upgrade->removeTodoTip, $todoPath, $todoPath)?></div>
    <div class='modal-footer'>
      <?php echo html::a(inlink('index'), $lang->upgrade->next, "class='btn btn-primary'");?>
    </div>
  </div>
  <?php else:?>
  <div class='modal-dialog'>
    <div class='modal-header'>
      <h3><?php echo $lang->upgrade->redeploy;?></h3>
    </div>
    <div class='panel-body'><?php echo $lang->upgrade->redeployDesc?></div>
    <div class='modal-footer'>
      <?php echo html::a(inlink('backup'), $lang->upgrade->next, "class='btn btn-primary'");?>
    </div>
  </div>
  <?php endif;?>
</div>
<?php include '../../install/view/footer.html.php';?>
