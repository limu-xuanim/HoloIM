<?php
/**
 * The batch create view file of user module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     user
 * @link        https://xuanim.com
 */
?>
<?php include '../../common/view/header.html.php';?>
<?php include '../../common/view/chosen.html.php';?>
<?php $lang->genderList = (array)$lang->genderList;?>

<form id='batchCreateForm' method='post'>
  <div class='panel'>
    <div class='panel-heading'>
      <div class="panel-title"><?php echo str_replace('-', '', $title);?></div>
    </div>
    <div class='panel-body'>
      <table class='table table-form'>
        <thead>
          <tr class='text-center'>
            <th class='account w-p10 required'><?php echo $lang->user->account;?></th>
            <th class='realname w-p10 required'><?php echo $lang->user->realname;?></th>
            <th class='password w-p10 required'><?php echo $lang->user->password;?></th>
            <th class='gender w-<?php echo $lang->user->genderWidth;?>px'><?php echo $lang->user->gender;?></th>
            <th class='dept w-p20'><?php echo $lang->user->dept;?></th>
            <th class='role w-p10'><?php echo $lang->user->role;?></th>
            <th class='email w-p10'><?php echo $lang->user->email;?></th>
            <th class='mobile w-p10'><?php echo $lang->user->mobile;?></th>
            <th class='phone w-p10'><?php echo $lang->user->phone;?></th>
            <th class='ops w-p6'>操作</th>
          </tr>
        </thead>
        <tbody>
          <?php unset($lang->genderList['u']);?>
          <?php if(!empty($userList)):?>
          <?php foreach($userList as $key => $user):?>
          <tr>
            <td><?php echo html::input("account[$key]", $user->account, "id='account{$key}' class='form-control' autocomplete='off'");?></td>
            <td class='realname'>
              <div class='input-group'>
                <?php echo html::input("realname[$key]", $user->realname, "id='realname{$key}' class='form-control' autocomplete='off'");?>
                <span class='input-group-addon' style='display: none'>
                  <label class='radio-inline' data-toggle='tooltip' title="<?php echo $lang->user->tips->saveDuplicate;?>">
                    <input type='radio' name='duplicateResult[<?php echo $key;?>]' value='save'>
                    <?php echo $lang->user->duplicateResult['save'];?>
                  </label>
                  <label class='radio-inline' data-toggle='tooltip' title="<?php echo $lang->user->tips->ignoreDuplicate;?>">
                    <input type='radio' name='duplicateResult[<?php echo $key;?>]' value='ignore'>
                    <?php echo $lang->user->duplicateResult['ignore'];?>
                  </label>
                </span>
              </div>
            </td>
            <td><?php echo html::input("password[$key]", $user->password, "id='password{$key}' class='form-control' autocomplete='off'");?></td>
            <td class='text-center'><?php echo html::radio("gender[$key]", $lang->genderList, $user->gender);?></td>
            <td>
              <div class='input-group'>
                <?php echo html::select("dept[$key]", $deptList, isset($deptList[$user->dept]) ? $user->dept : 0, "id='dept{$key}' class='form-control chosen'");?>
                <?php echo html::input("deptName[$key]", isset($deptList[$user->dept]) ? '' : $user->dept, "id='deptName{$key}' class='form-control' style='display:none;' autocomplete='off' placeholder=\"{$lang->user->placeholder->emptyDept}\"");?>
                <?php $checked = isset($deptList[$user->dept]) ? '' : "checked='checked'";?>
                <span class='input-group-addon'>
                  <label class="checkbox-inline">
                    <input type="checkbox" name="createDept[<?php echo $key;?>]" value="1" <?php echo $checked;?>>
                    <?php echo $lang->create;?>
                  </label>
                </span>
              </div>
            </td>
            <td><?php echo html::select("role[$key]", $lang->user->roleList, $user->role, "id='role{$key}' class='form-control chosen'");?></td>
            <td><?php echo html::input("email[$key]", $user->email, "id='email{$key}' class='form-control' autocomplete='off'");?></td>
            <td><?php echo html::input("mobile[$key]", $user->mobile, "id='mobile{$key}' class='form-control' autocomplete='off'");?></td>
            <td><?php echo html::input("phone[$key]", $user->phone, "id='phone{$key}' class='form-control' autocomplete='off'");?></td>
            <td class='ops-btn'>
              <button type='button' class='btn btn-link btn-add' title='添加'>
              <?php echo html::svgIcon('add-row');?>

              </button>
              <button type='button' class='btn btn-link btn-del' title='删除'>
                <?php echo html::svgIcon('delete-row');?>
              </button>
            </td>
          </tr>
          <?php endforeach;?>
          <?php else:?>
          <?php for($i = 0; $i < $this->config->user->batchCreateCount; $i++):?>
          <tr>
            <td class='w-p40'><?php echo html::input("account[$i]", '', "id='account{$i}' class='form-control' autocomplete='off'");?></td>
            <td>
              <div class='input-group'>
                <?php echo html::input("realname[$i]", '', "id='realname{$i}' class='form-control' autocomplete='off'");?>
                <span class='input-group-addon' style='display: none'>
                  <label class='radio-inline' data-toggle='tooltip' title="<?php echo $lang->user->tips->saveDuplicate;?>">
                    <input type='radio' name='duplicateResult[<?php echo $i;?>]' value='save'>
                    <?php echo $lang->user->duplicateResult['save'];?>
                  </label>
                  <label class='radio-inline' data-toggle='tooltip' title="<?php echo $lang->user->tips->ignoreDuplicate;?>">
                    <input type='radio' name='duplicateResult[<?php echo $i;?>]' value='ignore'>
                    <?php echo $lang->user->duplicateResult['ignore'];?>
                  </label>
                </span>
              </div>
            </td>
            <td><?php echo html::input("password[$i]", '', "id='password{$i}' class='form-control' autocomplete='off'")?></td>
            <td class='text-center'><?php echo html::radio("gender[$i]", $lang->genderList, 'm');?></td>
            <td>
              <div class='input-group'>
                <?php echo html::input("deptName[$i]", '', "id='deptName{$i}' class='form-control' style='display:none;' autocomplete='off' placeholder=\"{$lang->user->placeholder->emptyDept}\"");?>
                <?php echo html::select("dept[$i]", $deptList, '', "id='dept{$i}' class='form-control chosen'");?>
                <span class='input-group-addon'>
                  <label class="checkbox-inline">
                    <input type="checkbox" name="createDept[<?php echo $i;?>]" value="1">
                    <?php echo $lang->create;?>
                  </label>
                </span>
              </div>
            </td>
            <td><?php echo html::select("role[$i]", $lang->user->roleList, '', "id='role{$i}' class='form-control'");?></td>
            <td><?php echo html::input("email[$i]", '', "id='email{$i}' class='form-control' autocomplete='off'");?></td>
            <td><?php echo html::input("mobile[$i]", '', "id='mobile{$i}' class='form-control' autocomplete='off'");?></td>
            <td><?php echo html::input("phone[$i]", '', "id='phone{$i}' class='form-control' autocomplete='off'");?></td>
            <td class='ops-btn'>
              <button type='button' class='btn btn-link btn-add' title='添加'>
              <?php echo html::svgIcon('add-row');?>

              </button>
              <button type='button' class='btn btn-link btn-del' title='删除'>
                <?php echo html::svgIcon('delete-row');?>
              </button>
            </td>
          </tr>
          <?php endfor;?>
          <?php endif;?>
        </tbody>
        <tr>
          <td colspan='9' class='text-center form-actions'>
            <?php echo html::submitButton('', 'btn btn-primary', "style='margin-right: 10px;'") . html::backButton();?>
          </td>
        </tr>
      </table>
    </div>
  </div>
</form>
<script>
(function(){
  var table = document.querySelector('#batchCreateForm table.table-form');
  if(!table) return;

  function reindexRows() {
    var rows = table.querySelectorAll('tbody tr');
    rows.forEach(function(row, idx){
      var inputs = row.querySelectorAll('input, select');
      inputs.forEach(function(el){
        if(el.name){
          el.name = el.name.replace(/\[(\d+)\]/g, '[' + idx + ']');
        }
        if(el.id){
          el.id = el.id.replace(/\d+$/, idx);
        }
      });
      // 修正性别radio同组名
      var genderRadios = row.querySelectorAll('input[type="radio"]');
      genderRadios.forEach(function(r){
        if(/gender\[\d+\]/.test(r.name)) r.name = 'gender[' + idx + ']';
        if(/duplicateResult\[\d+\]/.test(r.name)) r.name = 'duplicateResult[' + idx + ']';
        if(/createDept\[\d+\]/.test(r.name)) r.name = 'createDept[' + idx + ']';
      });
    });
  }

  function initChosen(scopedRow){
    if(!(window.$ && $.fn && $.fn.chosen)) return;
    var $row = scopedRow ? $(scopedRow) : $(table).find('tbody tr');
    $row.find('select.chosen').each(function(){
      var $s = $(this);
      if($s.data('chosen')) $s.chosen('destroy');
      $s.chosen();
    });
  }

  function clearRow(row){
    row.querySelectorAll('input').forEach(function(el){
      if(el.type === 'radio' || el.type === 'checkbox') {
        el.checked = false;
      } else {
        el.value = '';
      }
    });
    row.querySelectorAll('select').forEach(function(sel){ sel.value = ''; });
  }

  function addRow(afterRow){
    var newRow = afterRow.cloneNode(true);
    clearRow(newRow);
    afterRow.parentNode.insertBefore(newRow, afterRow.nextSibling);
    initChosen(newRow);
    reindexRows();
  }

  function delRow(row){
    var rows = table.querySelectorAll('tbody tr');
    if(rows.length <= 1){
      clearRow(row);
    }else{
      row.parentNode.removeChild(row);
    }
    reindexRows();
  }

  table.addEventListener('click', function(e){
    var target = e.target;
    if(target.closest('.btn-add')){
      e.preventDefault();
      var row = target.closest('tr');
      addRow(row);
    }
    if(target.closest('.btn-del')){
      e.preventDefault();
      var row = target.closest('tr');
      delRow(row);
    }
  });

  initChosen();
})();
</script>
<?php include '../../common/view/footer.html.php';?>
