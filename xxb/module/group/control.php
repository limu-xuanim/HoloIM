<?php
/**
 * The control file of group module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     group
 * @link        https://xuanim.com
 */
class group extends control
{
    /**
     * Construct function.
     *
     * @access public
     * @return void
     */
    public function __construct($moduleName = '', $methodName = '', $appName = '')
    {
        parent::__construct($moduleName, $methodName, $appName);
        $this->loadModel('user');
    }

    /**
     * Browse groups.
     *
     * @access public
     * @return void
     */
    public function browse()
    {
        $groups = $this->group->getList();
        $groupUsers = array();
        foreach($groups as $group) $groupUsers[$group->id] = $this->group->getUserPairs($group->id);

        $this->view->title      = $this->lang->group->priv;
        $this->view->groups     = $groups;
        $this->view->groupUsers = $groupUsers;

        $this->display();
    }

    /**
     * Create a group.
     *
     * @access public
     * @return void
     */
    public function create()
    {
        if(!empty($_POST))
        {
            $this->group->create();
            if(dao::isError())
            {
                $this->send(array('result' => 'fail', 'message' => dao::getError()));
            }
            $this->send(array('result' => 'success', 'message' => $this->lang->saveSuccess, 'locate' => inlink('browse')));
        }

        $this->view->title      = $this->lang->group->create;
        $this->view->position[] = $this->lang->group->create;
        $this->display();
    }

    /**
     * Edit a group.
     *
     * @param  int    $groupID
     * @access public
     * @return void
     */
    public function edit($groupID)
    {
       if(!empty($_POST))
        {
            $this->group->update($groupID);
            if(dao::isError())
            {
                $this->send(array('result' => 'fail', 'message' => dao::getError()));
            }
            $this->send(array('result' => 'success', 'message' => $this->lang->saveSuccess, 'locate' => inlink('browse')));
        }

        $this->view->title      = $this->lang->group->edit;
        $this->view->position[] = $this->lang->group->edit;
        $this->view->group      = $this->group->getById($groupID);

        $this->display();
    }

    /**
     * Manage privleges of a group.
     *
     * @param  string $type
     * @param  mix    $param
     * @param  string $menu
     * @param  string $version
     * @param  string $app
     * @access public
     * @return void
     */
    public function managePriv($type = 'byGroup', $param = 0, $menu = '', $version = '', $app = '')
    {
        if($type == 'byGroup') $groupID = $param;
        $this->view->type = $type;
        foreach($this->lang->resource as $moduleName => $action)
        {
            if($this->group->checkMenuModule($menu, $moduleName) or $type != 'byGroup') $this->app->loadLang($moduleName);
        }

        if(!empty($_POST))
        {
            if($type == 'byGroup')  $result = $this->group->updatePrivByGroup($groupID, $menu, $version);
            if($type == 'byModule') $result = $this->group->updatePrivByModule();
            if($result)
            {
                if($type == 'byGroup') $this->group->updateAccounts($groupID);
                $this->send(array('result' => 'success', 'message' => $this->lang->group->successSaved, 'locate'=>inlink('browse')));
            }
            $this->send(array('result' => 'fail', 'message' => $this->lang->group->errorNotSaved));
        }

        if($type == 'byGroup')
        {
            $this->group->sortResource();
            $group      = $this->group->getById($groupID);
            $groupPrivs = $this->group->getPrivs($groupID);

            $this->view->title      = $group->name . $this->lang->group->managePriv;
            $this->view->position[] = $group->name;
            $this->view->position[] = $this->lang->group->managePriv;

            $this->view->group      = $group;
            $this->view->groupPrivs = $groupPrivs;
            $this->view->groupID    = $groupID;
            $this->view->menu       = $menu;
            $this->view->version    = $version;
        }
        elseif($type == 'byModule')
        {
            $this->group->sortResource();
            $this->view->title      = $this->lang->group->managePriv;
            $this->view->position[] = $this->lang->group->managePriv;

            foreach($this->lang->resource as $module => $moduleActions)
            {
                $modules[$module] = $this->lang->$module->common;
                foreach($moduleActions as $action)
                {
                    $actions[$module][$action] = $this->lang->$module->$action;
                }
            }
            $this->view->groups  = $this->group->getPairs();
            $this->view->modules = $modules;
            $this->view->actions = $actions;
        }
        $this->display();
    }

    /**
     * Manage members of a group.
     *
     * @param  int    $groupID
     * @access public
     * @return void
     */
    public function manageMember($groupID)
    {
        if(!empty($_POST))
        {
            $this->group->updateUser($groupID);
            if(dao::isError())
            {
                $this->send(array('result' => 'fail', 'message' => dao::getError()));
            }
            $this->group->updateAccounts($groupID);
            $this->send(array('result' => 'success', 'message' => $this->lang->saveSuccess, 'locate' => inlink('browse')));
        }
        $group      = $this->group->getById($groupID);
        $groupUsers = $this->group->getUserPairs($groupID);
        $allUsers   = $this->user->getPairs('nodeleted,noforbidden,noclosed,noempty');
        $otherUsers = array_diff_assoc($allUsers, $groupUsers);

        // 获取用户的部门信息，用于筛选
        $userDepts = array();
        if(!empty($allUsers))
        {
            $accounts = array_keys($allUsers);
            $users = $this->dao->select('account, dept')->from(TABLE_USER)
                ->where('account')->in($accounts)
                ->fetchPairs('account', 'dept');
            foreach($users as $account => $dept)
            {
                $userDepts[$account] = $dept ? $dept : 0;
            }
        }

        $title      = $this->lang->group->manageMemberTitle . '  ' . $group->name;
        $position[] = $group->name;
        $position[] = $this->lang->group->manageMember;

        $this->view->title      = $title;
        $this->view->position   = $position;
        $this->view->group      = $group;
        $this->view->groupUsers = $groupUsers;
        $this->view->otherUsers = $otherUsers;
        $this->view->userDepts  = $userDepts;

        /* Build dept tree menu with an extra "all departments" root item. */
        $allDeptLink  = html::a('#', $this->lang->user->allUsers, "id='category0' class='dept-filter-link' data-dept-id='0'");
        $rootItems    = array("<li>$allDeptLink</li>\n");
        $this->view->treeMenu = $this->loadModel('tree')->getTreeMenu('dept', 0, array('treeModel', 'createDeptFilterLink'), 0, $rootItems);

        $this->display();
    }

    /**
     * Delete a group.
     *
     * @param  int    $groupID
     * @param  string $confirm  yes|no
     * @access public
     * @return void
     */
    public function delete($groupID)
    {
        $this->group->updateAccounts($groupID);
        $this->group->delete($groupID);

        if(dao::isError())
        {
            $this->send(array('result' => 'fail', 'message' => dao::getError()));
        }
        $this->send(array('result' => 'success'));
    }
}
