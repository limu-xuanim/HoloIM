<?php
/**
 * The deptside view file of user module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     user
 * @link        https://xuanim.com
 */
?>
<?php $cogSVG = html::svgIcon('cog');?>
<div class='dept-side'>
  <div class='dept-container'>
    <div class='dept-heading'><strong><i class="icon-sitemap"></i> <?php echo $lang->dept->common;?></strong></div>
    <div class='dept-body'>
      <div id='treeMenuBox'><?php echo $treeMenu;?></div>
      <div class='dept-actions'>
        <?php if(commonModel::hasPriv('tree', 'browse')) echo html::a($this->createLink('tree', 'browse', "type=dept"), $cogSVG, "title='{$lang->tree->browse}' class='btn btn-ghost' style='height: 30px; line-height: 25px;'");?>
      </div>
    </div>
  </div>
</div>
