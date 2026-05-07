<?php
/**
 * The control file of tree module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     tree
 * @link        https://xuanim.com
 */
class tree extends control
{
    const NEW_CHILD_COUNT = 5;

    /**
     * Browse the categories and print manage links.
     *
     * @param  string $type
     * @param  int    $startModule
     * @param  int    $root
     * @param  string $from
     * @access public
     * @return void
     */
    public function browse($type = 'dept', $startModule = 0, $root = 0, $from = '')
    {
        $this->view->title      = $this->lang->tree->browse;
        $this->view->position[] = $this->lang->tree->browse;

        $this->view->type       = $type;
        $this->view->root       = $root;
        $this->view->moduleID   = $startModule;
        $this->view->treeMenu   = $this->tree->getTreeMenu($type, 0, array('treeModel', 'createManageLink'), $root);

        $this->display();
    }

    /**
     * Edit a category.
     *
     * @param  int      $categoryID
     * @access public
     * @return void
     */
    public function edit($categoryID)
    {
        /* Get current category. */
        $category = $this->tree->getById($categoryID);

        if($category->type == 'dept')
        {
            $this->app->loadLang('user');
            $this->lang->category = $this->lang->dept;
        }

        if(!empty($_POST))
        {
            $result = $this->tree->update($categoryID);
            if($result)
            {
                $this->send(array('result' => 'success', 'message' => $this->lang->saveSuccess));
            }
            $this->send(array('result' => 'fail', 'message' => dao::isError() ? dao::getError() : $result));
        }

        /* Get option menu and remove the families of current category from it. */
        $optionMenu = $this->tree->getOptionMenu($category->type, 0, false, $category->root);
        $families   = $this->tree->getFamily($categoryID, $category->type, $category->root);
        foreach($families as $member) unset($optionMenu[$member]);

        /* Assign. */
        $this->view->category   = $category;
        $this->view->optionMenu = $optionMenu;
        $this->view->aliasAddon = trim("http://" . $this->server->http_host . $this->config->webRoot, '/' ). '/';

        if(strpos('forum,blog', $category->type) !== false) $this->view->aliasAddon .=  $category->type . '/';

        if($category->type == 'dept')
        {
            $this->view->users = $this->loadModel('user')->getPairs('nodeleted,nodeleted,noclosed', $category->id);
        }

        $groups = $this->loadModel('group')->getPairs();
        $this->view->groups = $groups;

        /* remove left menu. */
        unset($this->lang->tree->menu);

        $this->display();
    }

    /**
     * Manage children.
     *
     * @param  string    $type
     * @param  int       $category    the current category id.
     * @param  int       $root
     * @access public
     * @return void
     */
    public function children($type, $category = 0, $root = 0)
    {
        if($type == 'dept')
        {
            $this->app->loadLang('user');
            $this->lang->category = $this->lang->dept;
        }

        if(!empty($_POST))
        {
            $result = $this->tree->manageChildren($type, $this->post->parent, $this->post->children, $root);
            $locate = $this->inLink('browse', "type=$type&category={$this->post->parent}&root=$root");
            if($result)
            {
                $this->send(array('result' => 'success', 'message' => $this->lang->saveSuccess, 'locate' => $locate));
            }
            $this->send(array('result' => 'fail', 'message' => dao::isError() ? dao::getError() : $result));
        }

        $this->view->title    = $this->lang->tree->manage;
        $this->view->type     = $type;
        $this->view->root     = $root;
        $this->view->children = $this->tree->getChildren($category, $type, $root);
        $this->view->origins  = $this->tree->getOrigin($category);
        $this->view->parent   = $category;

        $this->display();
    }

    /**
     * Delete a category.
     *
     * @param  int    $categoryID
     * @access public
     * @return void
     */
    public function delete($categoryID)
    {
        /* If type is 'forum' and has children, warning. */
        $category = $this->tree->getByID($categoryID);
        if($category->major) return false;

        $children = $this->tree->getChildren($categoryID, $category->type);
        if($children)
        {
            $this->send(array('result' => 'fail', 'message' => $this->lang->tree->hasChildren));
        }

        if($this->tree->delete($categoryID))
        {
            $this->send(array('result' => 'success'));
        }
        $this->send(array('result' => 'fail', 'message' => dao::getError()));
    }
}
