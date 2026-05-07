<?php
/**
 * The lang view file of setting module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     setting
 * @link        https://xuanim.com
 */
?>
<?php include $app->getModuleRoot() . '/common/view/header.html.php';?>
<form method='post' id='ajaxForm'>
  <div class='panel'>
    <div class="panel-heading">
      <div class="panel-heading-title"><?php echo ($module == 'common' and $field == 'currencyList') ? $lang->setting->system->fields['currencyList'] : $lang->setting->{$module}->fields[$field];?></div>
    </div>
    <?php
    $tipsK = isset($lang->setting->{$module}->{$field}->key)   ? $lang->setting->{$module}->{$field}->key   : $lang->setting->key;
    $tipsV = isset($lang->setting->{$module}->{$field}->value) ? $lang->setting->{$module}->{$field}->value : $lang->setting->value;
    ?>
    <table class='table table-form'>
      <tbody>
        <?php foreach($fieldList as $key => $value):?>
        <tr class='text-center'>
          <?php $system = isset($systemField[$key]) ? $systemField[$key] : 1;?>
          <?php $readonly = (($module == 'customer' and $field == 'statusList' and $key == 'payed') or (empty($key))) ? "readonly='readonly'" : '';?>
          <td class='w-150px text-left text-middle roleKey'><?php echo $key === '' ? 'NULL' : $key; echo html::hidden('keys[]', $key, "$readonly") . html::hidden('systems[]', $system, "$readonly");?></td>
          <td class='w-400px'>
            <div class='input-group'>
              <?php echo html::input("values[]", $value, "class='form-control' $readonly");?>
              <?php if($module == 'customer' and $field == 'sizeNameList'):?>
              <span class="input-group-addon fix-border fix-padding"></span>
              <?php echo html::input("sizeNoteList[]", $lang->customer->sizeNoteList[$key], "class='form-control' size='75' $readonly");?>
              <?php elseif($module == 'customer' and $field == 'levelNameList'):?>
              <span class="input-group-addon fix-border fix-padding"></span>
              <?php echo html::input("levelNoteList[]", $lang->customer->levelNoteList[$key], "class='form-control' size='75' $readonly");?>
              <?php endif;?>
            </div>
          </td>
          <td class='text-left text-middle'>
            <?php if(!($module == 'product' and $field == 'statusList' and $system == 1)):?>
            <a href='javascript:;' class='add' style="margin-right: 12px;"><?php echo html::svgIcon('add');?></a>
            <?php endif;?>
            <?php if($key !== ''): ?>
            <a href='javascript:;' class='remove'><?php echo html::svgIcon('delete');?></a>
            <?php endif;?>
          </td>
        </tr>
        <?php endforeach;?>
        <tr>
          <td></td>
          <td colspan='2'>
          <?php
          $scope = array('all' => $lang->setting->allLang, $clientLang => $lang->setting->currentLang);
          echo html::radio('lang', $scope, 'all');
          ?>
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td></td>
          <td>
            <?php
            echo html::submitButton() . ' &nbsp; ';
            echo html::a(inlink('reset', "module=$module&field=$field"), $lang->setting->reset, "class='btn deleter'");
            ?>
          </td>
          <td></td>
        </tr>
      </tfoot>
    </table>
  </div>
</form>
<?php
$placeholderK = (isset($lang->setting->placeholder->$field) and isset($lang->setting->placeholder->{$field}->key))   ? $lang->setting->placeholder->{$field}->key   : $lang->setting->placeholder->key;
$placeholderV = (isset($lang->setting->placeholder->$field) and isset($lang->setting->placeholder->{$field}->value)) ? $lang->setting->placeholder->{$field}->value : $lang->setting->placeholder->value;
$placeholderI = (isset($lang->setting->placeholder->$field) and isset($lang->setting->placeholder->{$field}->info))  ? $lang->setting->placeholder->{$field}->info  : $lang->setting->placeholder->info;
$itemRow = <<<EOT
  <tr class='text-center'>
    <td>
      <input type='text' value="" name="keys[]" class='form-control' placeholder='{$placeholderK}'>
      <input type='hidden' value="0" name="systems[]">
    </td>
    <td>
      <div class='input-group'>
        <input type='text' value="" name="values[]" class='form-control' placeholder='{$lang->setting->placeholder->value}'>
      </div>
    </td>
    <td class='text-left text-middle'>
      <a href='javascript:;' class='btn btn-mini add'><i class='icon-plus'></i></a>
      <a href='javascript:;' class='btn btn-mini remove'><i class='icon-remove'></i></a>
    </td>
  </tr>
EOT;
?>
<?php js::set('itemRow', $itemRow)?>
<?php js::set('module', $module)?>
<?php js::set('field', $field)?>
<?php js::set('valueplaceholder', $placeholderV)?>
<?php js::set('infoplaceholder', $placeholderI)?>
<?php include '../../common/view/footer.html.php';?>
