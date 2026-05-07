<?php
/**
 * The edit view of tree module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     tree
 * @link        https://xuanim.com
 */
?>
<?php
$webRoot   = $config->webRoot;
$jsRoot    = $webRoot . "js/";
$themeRoot = $webRoot . "theme/";
?>
<?php include '../../common/view/chosen.html.php';?>
<?php include '../../common/view/kindeditor.html.php';?>
<?php js::set('type', $category->type);?>
<?php js::set('root', $category->type == 'projectdoc' ? 'project' : ($category->type == 'productdoc' ? 'product' : $category->root));?>
<?php $parentDisabled = ($category->major and $category->major < 5) ? "disabled='disabled'" : '';?>
<?php $nameDisabled   = $category->major ? "disabled='disabled'" : '';?>
<form method='post' class='form-horizontal' id='editForm' action="<?php echo inlink('edit', 'categoryID='.$category->id);?>">
  <div class='panel'>
    <div class='panel-heading'><strong><?php echo $lang->tree->edit;?></strong></div>
    <div class='panel-body'>
      <style>
      /* Vertical field layout */
      #editForm .form-group { display: block; margin-bottom: 12px; }
      #editForm .form-group > label { display: block; float: none; text-align: left; padding: 0; margin-bottom: 6px; font-size: 14px; color: #313C52; font-weight: normal; }
      #editForm .form-group > .col-md-4,
      #editForm .form-group > .col-md-9 { padding: 0; }
      #editForm .form-group .form-control { height: 32px; line-height: 32px; border: 1px solid #D2D6E5; border-radius: 2px; font-size: 14px; color: #313C52; box-shadow: none; }
      #editForm .form-group textarea.form-control { height: auto; line-height: 1.5; padding: 8px 12px; width: 100%; }
      #editForm .form-actions { text-align: center; margin-top: 12px; }
      #editForm .form-actions .btn { width: 100px; height: 32px; border-radius: 2px; }
      #editForm .required-flag { color: #F56C6C; margin-right: 4px; }
      #editForm .panel-body { padding: 24px 32px; }
      .form-group .col-md-12 { padding: 0 !important; }
      .form-horizontal .form-group { margin-right: 0 !important; margin-left: 0 !important; }
      /* custom select arrow for native select */
      #editForm select.form-control {
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 4L6 8L11 4' stroke='%236D6D6D'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 8px center;
        background-size: 12px 12px;
        padding-right: 28px;
      }
      /* custom select arrow for chosen */
      #editForm .chosen-container-single .chosen-single div b {
        background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 4L6 8L11 4' stroke='%236D6D6D'/%3E%3C/svg%3E") !important;
        background-repeat: no-repeat !important;
        background-position: center center !important;
        background-size: 12px 12px !important;
        width: 12px; height: 12px;
        border: none !important;
      }
      </style>
      <div class='form-group'>
        <label class='col-md-2 control-label'><?php echo $lang->category->parent;?></label>
        <div class='col-md-4'><?php echo html::select('parent', $optionMenu, $category->parent, "class='chosen form-control' $parentDisabled");?></div>
      </div>
      <div class='form-group'>
        <label class='col-md-2 control-label'><span class='required-flag'>*</span><?php echo $lang->category->name;?></label>
        <div class='col-md-4'><?php echo html::input('name', $category->name, "class='form-control' $nameDisabled");?></div>
      </div>
      <?php if($category->type == 'dept'):?>
      <div class='form-group'>
        <label class='col-md-2 control-label'><?php echo $lang->category->moderators;?></label>
        <div class='col-md-4'><?php echo html::select('moderators[]', $users, $category->moderators, "class='chosen form-control'");?></div>
      </div>
      <?php endif;?>
      <?php if($category->type == 'out'):?>
      <div class='form-group'>
        <label class='col-md-2 control-label'><?php echo $lang->category->rights;?></label>
        <div class='col-md-9'>
          <div class='group-item'><?php echo html::checkbox('rights', $groups, $category->rights);?></div>
        </div>
      </div>
      <div class='form-group'>
        <label class='col-md-2 control-label'><?php echo $lang->category->refund;?></label>
        <div class='col-md-9'>
          <div class='group-item'><?php echo html::radio('refund', $lang->category->refundList, $category->refund);?></div>
        </div>
      </div>
      <?php endif;?>
      <div class='form-group'>
        <label class='col-md-2 control-label'><?php echo $lang->category->desc;?></label>
        <div class='col-md-12'><?php echo html::textarea('desc', $category->desc, "class='form-control' rows='3'");?></div>
      </div>
      <?php if($category->type == 'forum'):?>
      <div class='form-group'>
        <label class='col-md-2 control-label'><?php echo $lang->category->moderators;?></label>
        <div class='col-md-9'><?php echo html::select('moderators[]', $users, array_keys($category->moderators), "class='form-control chosen' multiple='multiple'");?></div>
      </div>
      <div class='form-group'>
        <label class='col-md-2 control-label'><?php echo $lang->category->readonly;?></label>
        <div class='col-md-4'><?php echo html::radio('readonly', $lang->category->readonlyList, $category->readonly);?></div>
      </div>
      <?php endif;?>
      <?php if($category->type == 'forum' || $category->type == 'blog'):?>
      <div class='form-group'>
        <label class='col-md-2 control-label'><?php echo $lang->category->users;?></label>
        <div class='col-md-9'><?php echo html::select('users[]', $users, $category->users, "class='form-control chosen' multiple");?></div>
      </div>
      <div class='form-group'>
        <label class='col-md-2 control-label'><?php echo $lang->category->groups;?></label>
        <div class='col-md-9'>
          <div class='group-item'><?php echo html::checkbox('rights', $groups, $category->rights);?></div>
        </div>
      </div>
      <?php endif;?>
      <div class='form-actions'>
        <?php echo html::submitButton('' , "btn btn-primary");?>
        <button type="button" class='btn btn-secondary btn-back' onclick="window.location.href='<?php echo $this->createLink('tree', 'browse', 'type=dept');?>'"><?php echo $lang->goback;?></button>
      </div>
    </div>
  </div>
</form>
<?php if(isset($pageJS)) js::execute($pageJS);?>
