<?php
/**
 * The manage member view of group module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     group
 * @link        https://xuanim.com
 */
?>
<?php include '../../common/view/header.modal.html.php';?>
<style>
/* 部门树点击后的高亮样式 */
#treeMenuBox .tree a.dept-filter-link.active {
  font-weight: bold;
  color: #1e6aeb;
}

/* 成员过滤时通过 class 控制显示隐藏 */
.group-item.show { display: block; }
.group-item.hide { display: none; }
</style>
<div class='row'>

  <div class='col-md-5'>
    <div class='panel'>
      <div class='panel-heading'>
        <div class='panel-heading-title'><i class="icon-sitemap"></i> <?php echo $lang->category->common;?></div>
      </div>
      <div class='panel-body'>
        <div id='treeMenuBox'><?php echo $treeMenu;?></div>
      </div>
    </div>
  </div>
  
  <form class='pdb-20 col-md-7' method='post' id='ajaxForm'  action="<?php echo inlink('manageMember', "groupID={$group->id}");?>">
    <div class='panel'>
      <div class='panel-body no-border'>
        <table class='table table-form'>
          <?php if($groupUsers):?>
          <tr>
            <th class='w-120px'><?php echo html::checkbox('', array('checkAllInside' => $lang->group->inside), '', "id='checkAllInside'");?></th>
            <td id='group' class='f-14px'><?php $i = 1;?>
              <?php foreach($groupUsers as $account => $realname):?>
              <?php $deptID = isset($userDepts[$account]) ? $userDepts[$account] : 0;?>
              <div class='group-item show' data-dept-id='<?php echo $deptID;?>'><?php echo html::checkbox('members', array($account => $realname), $account, "class='inside-checkbox'");?></div>
              <?php endforeach;?>
            </td>
          </tr>
          <tr>
            <td colspan='2'><hr style="border: none; border-top: 1px solid #ddd; margin: 10px 0;" /></td>
          </tr>
          <?php endif;?>
          <tr>
            <th class='w-120px'><?php echo html::checkbox('', array('checkAllOutside' => $lang->group->outside), '', "id='checkAllOutside'");?></th>
            <td id='other'><?php $i = 1;?>
              <?php foreach($otherUsers as $account => $realname):?>
              <?php $deptID = isset($userDepts[$account]) ? $userDepts[$account] : 0;?>
              <div class='group-item show' data-dept-id='<?php echo $deptID;?>'><?php echo html::checkbox('members', array($account => $realname), '', "class='outside-checkbox'");?></div>
              <?php endforeach;?>
            </td>
          </tr>
        </table>
      </div>
      <div class='panel-actions button-center text-center'>
        <?php
        echo html::submitButton();
        echo html::linkButton($lang->goback, $this->createLink('group', 'browse'));
        echo html::hidden('foo'); // Just a var, to make sure $_POST is not empty.
        ?>
      </div>
    </div>
  </form>
</div>

<script>
$(function(){
    var selectedDeptID = null;
    var deptFamilyMap = {}; // 存储部门及其子部门的映射
    
    // 获取部门家族（包括子部门）
    function getDeptFamily(deptID) {
        if(!deptID || deptID == 0) return [];
        if(deptFamilyMap[deptID]) return deptFamilyMap[deptID];
        
        var family = [deptID];
        var processed = {};
        
        // 递归收集所有子部门
        function collectChildren(parentID) {
            if(processed[parentID]) return;
            processed[parentID] = true;
            
            // 查找所有直接子部门
            $('#treeMenuBox li').each(function(){
                var $li = $(this);
                var $link = $li.find('a.dept-filter-link').first();
                if(!$link.length) return;
                
                var currentDeptID = parseInt($link.data('dept-id'));
                if(!currentDeptID || currentDeptID == parentID) return;
                
                // 检查当前项的父级是否是目标部门
                var $parentLi = $li.closest('ul').parent('li');
                if($parentLi.length) {
                    var $parentLink = $parentLi.find('a.dept-filter-link').first();
                    if($parentLink.length) {
                        var parentDeptID = parseInt($parentLink.data('dept-id'));
                        if(parentDeptID == parentID) {
                            family.push(currentDeptID);
                            collectChildren(currentDeptID);
                        }
                    }
                }
            });
        }
        
        collectChildren(deptID);
        deptFamilyMap[deptID] = family;
        return family;
    }
    
    // 筛选成员
    function filterMembers(deptID) {
        selectedDeptID = deptID;
        
        if(!deptID || deptID == 0) {
            // 显示所有成员：统一使用 show/hide class 控制
            $('.group-item').removeClass('hide').addClass('show');
        } else {
            // 获取部门家族
            var deptFamily = getDeptFamily(deptID);
            
            // 筛选成员：通过 .show / .hide class 控制
            $('.group-item').each(function(){
                var $item = $(this);
                var itemDeptID = parseInt($item.data('dept-id')) || 0;
                
                if(deptFamily.indexOf(itemDeptID) >= 0) {
                    $item.removeClass('hide').addClass('show');
                } else {
                    $item.removeClass('show').addClass('hide');
                }
            });
        }
        
        updateCheckAllState();
        updateDeptLinkActive(deptID);
    }
    
    // 更新部门链接的选中状态
    function updateDeptLinkActive(deptID) {
        $('.dept-filter-link').removeClass('active');
        var deptIDValue = deptID ? deptID : 0;
        $('.dept-filter-link[data-dept-id="' + deptIDValue + '"]').addClass('active');
    }
    
    function updateCheckAllState() {
        // 组内：当前展示（.show）的 inside-checkbox 是否全部被勾选
        var totalInside   = $('.inside-checkbox').closest('.group-item.show').length;
        var checkedInside = $('.inside-checkbox:checked').closest('.group-item.show').length;
        $('#checkAllInside').prop('checked', totalInside > 0 && totalInside === checkedInside);

        // 组外：当前展示（.show）的 outside-checkbox 是否全部被勾选
        var totalOutside   = $('.outside-checkbox').closest('.group-item.show').length;
        var checkedOutside = $('.outside-checkbox:checked').closest('.group-item.show').length;
        $('#checkAllOutside').prop('checked', totalOutside > 0 && totalOutside === checkedOutside);
    }
    
    // 部门链接点击事件
    $(document).on('click', '.dept-filter-link', function(e){
        e.preventDefault();
        var deptID = parseInt($(this).data('dept-id')) || 0;
        filterMembers(deptID);
    });
    
    // 组内成员全选
    $('#checkAllInside').change(function(){
        var checked = $(this).prop('checked');
        $('.inside-checkbox').closest('.group-item.show').find('.inside-checkbox').prop('checked', checked);
        updateCheckAllState();
    });
    
    // 组外成员全选
    $('#checkAllOutside').change(function(){
        var checked = $(this).prop('checked');
        $('.outside-checkbox').closest('.group-item.show').find('.outside-checkbox').prop('checked', checked);
        updateCheckAllState();
    });
    
    // 组内成员单个checkbox变化时，更新全选状态
    $(document).on('change', '.inside-checkbox', function(){
        updateCheckAllState();
    });
    
    // 组外成员单个checkbox变化时，更新全选状态
    $(document).on('change', '.outside-checkbox', function(){
        updateCheckAllState();
    });
    
    // 初始化：默认勾选组内成员，并更新全选状态
    updateCheckAllState();
});
</script>

<?php
include $app->getModuleRoot() . '/common/view/treeview.html.php';
include '../../common/view/footer.modal.html.php';
?>
