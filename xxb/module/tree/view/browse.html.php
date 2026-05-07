<?php
/**
 * The browse view file of tree module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     tree
 * @link        https://xuanim.com
 */
?>
<?php
include $app->getModuleRoot() . '/common/view/header.html.php';
include $app->getModuleRoot() . '/common/view/kindeditor.html.php';
include $app->getModuleRoot() . '/common/view/chosen.html.php';
include $app->getModuleRoot() . '/common/view/sortable.html.php';

// Check if treeMenu has action links or is empty.
$showCategoryBox = strpos($treeMenu, '</a>') !== false || strpos($treeMenu, '<ul class=\'tree\'></ul>') !== false;

js::set('root', $root);
js::set('type', $type);
js::set('moduleID', $moduleID);
js::set('hasChildrenPriv', commonModel::hasPriv('tree', 'children'));
?>
<div class='row'>
  <div class='col-md-<?php echo $showCategoryBox ? '5' : '12'; ?>'>
    <div class='panel'>
      <div class='panel-heading'>
        <strong><i class="icon-sitemap"></i> <?php echo $lang->category->common;?></strong>
      </div>
      <div class='panel-body'><div id='treeMenuBox'><?php echo $treeMenu;?></div></div>
    </div>
  </div>
  <?php if($showCategoryBox): ?>
  <div class='col-md-7' id='categoryBox'></div>
  <?php endif; ?>
</div>
<?php
include $app->getModuleRoot() . '/common/view/treeview.html.php';
include $app->getModuleRoot() . '/common/view/footer.html.php';
?>
