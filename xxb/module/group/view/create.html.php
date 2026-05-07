<?php
/**
 * The create view of group module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     group
 * @link        https://xuanim.com
 */
?>
<?php include '../../common/view/header.modal.html.php';?>
<style>
.required-wrapper {
  display: none !important;
}
.group-form-row {
  display: flex;
  flex-direction: column;
  margin-bottom: 12px;
}
.group-form-label {
  font-size: 14px;
  color: #313C52;
  margin-bottom: 8px;
  font-weight: normal;
}
.group-form-label .required {
  color: #F56C6C;
  margin-right: 4px;
}
.group-form-input {
  width: 100%;
  height: 32px;
  line-height: 32px;
  padding: 0 15px;
  box-sizing: border-box;
  border: 1px solid #D8DBDE;
  border-radius: 2px;
  color: #313C52;
  font-size: 14px;
}
.group-form-input textarea {
  height: auto;
  padding: 8px 15px;
  line-height: 1.5;
  resize: vertical;
}
.group-form-actions {
  text-align: center;
  margin-top: 20px;
}
.group-form-actions button {
  width: 100px;
  height: 32px;
  border-radius: 2px;
}
.required:after {
  display: none;
}
</style>
<form method='post' id='ajaxForm' action='<?php echo inlink('create');?>'>
  <div style="padding: 8px 32px;">
    <div class='group-form-row'>
      <label class='group-form-label'>
        <span class="required">*</span><?php echo $lang->group->name;?>
      </label>
      <?php echo html::input('name', '', "class='form-control group-form-input'");?>
    </div>
    <div class='group-form-row'>
      <label class='group-form-label'><?php echo $lang->group->desc;?></label>
      <?php echo html::textarea('desc', '', "rows=5 class='form-control group-form-input'");?>
    </div>
    <div class='group-form-actions'><?php echo html::submitButton();?></div>
  </div>
</form>
<?php include '../../common/view/footer.modal.html.php';?>
