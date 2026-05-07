<?php
/**
 * The manage privilege by group view of group module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     group
 * @link        https://xuanim.com
 */
?>
<form class='form' id='ajaxForm' method='post'>
  <div class='panel' style="padding-bottom: 80px;">
    <table class='table table-hover table-bordered table-priv'>
      <thead>
        <tr class="thead-tr">
          <th><?php echo $lang->group->moduleTitle ?></th>
          <th><?php echo $lang->group->managePriv ?></th>
        </tr>
        <!--  -->
      </thead>

      <tbody>
        <tr class="divider-row">
          <td colspan="2"></td>
        </tr>
        <?php
        $moduleCount = 0;
        $totalModules = 0;
        // First pass: count actual modules
        foreach($lang->resource as $moduleName => $moduleActions)
        {
            if(!in_array($moduleName, $lang->moduleOrder)) continue;
            if(!$this->group->checkMenuModule($menu, $moduleName)) continue;
            if($version)
            {
                $hasMethod = false;
                foreach($moduleActions as $action => $actionLabel)
                {
                    if(strpos($changelogs, ",$moduleName-$actionLabel,") !== false)
                    {
                        $hasMethod = true;
                        break;
                    }
                }
                if(!$hasMethod) continue;
            }
            $totalModules++;
        }

        $i = 1;
        foreach($lang->resource as $moduleName => $moduleActions):?>
        <?php if(!in_array($moduleName, $lang->moduleOrder)) continue;?>
        <?php if(!$this->group->checkMenuModule($menu, $moduleName)) continue;?>
        <?php
        $this->app->loadLang($moduleName);
        /* Check method in select version. */
        if($version)
        {
            $hasMethod = false;
            foreach($moduleActions as $action => $actionLabel)
            {
                if(strpos($changelogs, ",$moduleName-$actionLabel,") !== false)
                {
                    $hasMethod = true;
                    break;
                }
            }
            if(!$hasMethod) continue;
        }
        $selectedCount = 0;
        $totalCount = 0;
        if(isset($groupPrivs[$moduleName]))
        {
            $selectedPrivs = is_array($groupPrivs[$moduleName]) ? $groupPrivs[$moduleName] : explode(',', $groupPrivs[$moduleName]);
            $selectedCount = count($selectedPrivs);
        }
        foreach($moduleActions as $action => $actionLabel)
        {
            if(!empty($version) and strpos($changelogs, ",$moduleName-$actionLabel,") === false) continue;
            $totalCount++;
        }
        $isAllSelected = ($selectedCount > 0 && $selectedCount == $totalCount);
        $isIndeterminate = ($selectedCount > 0 && $selectedCount < $totalCount);
        $moduleLabelText = isset($this->lang->$moduleName->common) ? $this->lang->$moduleName->common : $moduleName;
        ?>
        <tr>
          <th>
            <?php
            echo html::checkbox(
                '',
                array("checkModule_{$moduleName}" => $moduleLabelText),
                $isAllSelected ? "checkModule_{$moduleName}" : '',
                "class='checkModule' data-module='$moduleName' data-indeterminate='" . ($isIndeterminate ? '1' : '0') . "'"
            );
            ?>
          </th>
          <td id='<?php echo $moduleName;?>'>
            <?php
            $options = array();
            foreach($moduleActions as $action => $actionLabel)
            {
                if(!empty($version) and strpos($changelogs, ",$moduleName-$actionLabel,") === false) continue;
                $options[$action] = is_object($lang->$moduleName->$actionLabel) ? $lang->$moduleName->$actionLabel->common : $lang->$moduleName->$actionLabel;
            }
            echo html::checkbox("actions[$moduleName]", $options, isset($groupPrivs[$moduleName]) ? $groupPrivs[$moduleName] : '', "class='module-action-checkbox' data-module='$moduleName'");
            ?>
          </td>
        </tr>
        <tr class="divider-row">
          <td colspan="2"></td>
        </tr>
        <?php $i++;?>
        <?php endforeach;?>
      </tbody>
    </table>
  </div>
  <div class='fixed-footer'>
    <?php
    echo html::submitButton($lang->save, "btn btn-primary");
    echo html::linkButton($lang->goback, $this->createLink('group', 'browse'), 'btn');
    echo html::hidden('foo'); // Just a hidden var, to make sure $_POST is not empty.
    echo html::hidden('noChecked'); // Save the value of no checked.
    ?>
  </div>
</form>
<script>
var groupID = <?= $groupID?>;
var menu    = "<?= $menu?>";
</script>
