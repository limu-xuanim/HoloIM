<?php
/**
 * The control file of setting module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     setting
 * @link        https://xuanim.com
 */
class setting extends control
{
    /**
     * Set lang.
     *
     * @param  string    $module
     * @param  string    $field
     * @access public
     * @return void
     */
    public function lang($module, $field)
    {
        $clientLang = $this->app->getClientLang();

        $this->app->loadLang($module);

        $this->lang->js->confirmDelete = $this->lang->setting->notices->reset;
        $this->lang->js->deleteing     = $this->lang->setting->notices->reseting;

        if($module == 'user' and $field == 'roleList')
        {
            $this->lang->menuGroups->setting = 'user';
            unset($this->lang->setting->menu);
        }

        if(!empty($_POST))
        {
            $lang = $_POST['lang'];
            $appendField = isset($this->config->setting->appendLang[$module][$field]) ? $this->config->setting->appendLang[$module][$field] : '';

            $this->setting->deleteItems("lang=$lang&module=$module&section=$field", $type = 'lang');
            if($appendField) $this->setting->deleteItems("lang=$lang&module=$module&section=$appendField", $type = 'lang');

            $roles = array();
            if(isset($_POST['keys']) && is_array($_POST['keys']))
            {
                foreach($_POST['keys'] as $index => $key)
                {
                    $value = $_POST['values'][$index];
                    if(!$value or !$key) continue;
                    $system  = $_POST['systems'][$index];
                    $roles[] = $key;
                    $this->setting->setItem("{$lang}.{$module}.{$field}.{$key}.{$system}", $value, $type = 'lang');

                    /* Save additional item. */
                    if($appendField)
                    {
                        $this->setting->setItem("{$lang}.{$module}.{$appendField}.{$key}.{$system}", $_POST[$appendField][$index], $type = 'lang');
                    }
                }

                $this->loadModel('user')->batchUpdateUserRole($roles);
            }

            $this->setting->setItem("{$lang}.{$module}.updateRoleList.1", 1, 'lang');

            if(dao::isError())
            {
                $this->send(array('result' => 'fail', 'message' => dao::getError()));
            }
            $this->send(array('result' => 'success', 'message' => $this->lang->saveSuccess, 'locate' => inlink('lang', "module=$module&field=$field")));
        }

        $fieldList        = $module == 'common' ? $this->lang->$field : $this->lang->$module->$field;
        $dbFields         = $this->setting->getItems("lang=$clientLang,all&module=$module&section=$field", 'lang');
        $isUpdateRoleList = $this->setting->getItem("lang=$clientLang,all&module=$module&key=updateRoleList", 'lang');

        $systemField = array();
        foreach($dbFields as $dbField) $systemField[$dbField->key] = $dbField->system;

        $dbFieldsData = array();
        foreach($dbFields as $dbField) $dbFieldsData[$dbField->key] = $dbField->value;

        if($module == 'user' and $field == 'roleList')
        {
            if(!empty($dbFieldsData))
            {
                foreach($fieldList as $fieldItem => $value)
                {
                    if(empty($fieldItem)) continue;
                    if(!isset($dbFieldsData[$fieldItem])) unset($fieldList[$fieldItem]);
                }
            }
            if(empty($dbFieldsData) and $isUpdateRoleList) $fieldList = array('' => '');
        }

        $this->view->title      = $this->lang->setting->lang;
        $this->view->position[] = $this->lang->setting->lang;

        $this->view->fieldList   = $fieldList;
        $this->view->module      = $module;
        $this->view->field       = $field;
        $this->view->clientLang  = $clientLang;
        $this->view->systemField = $systemField;
        $this->display();
    }

    /**
     * Restore the default lang. Delete the related items.
     *
     * @param  string $module
     * @param  string $field
     * @access public
     * @return void
     */
    public function reset($module, $field)
    {
        $this->setting->deleteItems("module=$module&section=$field", $type = 'lang');
        if($module == 'user' and $field == 'roleList') $this->setting->deleteItems("module=user&key=updateRoleList", $type = 'lang');
        if(isset($this->config->setting->appendLang[$module][$field]))
        {
            $appendField = $this->config->setting->appendLang[$module][$field];
            $this->setting->deleteItems("module=$module&section=$appendField", $type = 'lang');
        }

        $this->send(array('result' => 'success'));
    }
}
