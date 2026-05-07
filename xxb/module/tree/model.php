<?php
/**
 * The model file of tree module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     tree
 * @link        https://xuanim.com
 */
?>
<?php
class treeModel extends model
{
    /**
     * Get category info by id.
     *
     * @param  int|string  $categoryID
     * @param  string      $type
     * @access public
     * @return bool|object
     */
    public function getByID($categoryID, $type = 'dept')
    {
        $category = $this->dao->select('*')->from(TABLE_CATEGORY)->where('id')->eq($categoryID)->fetch();
        if(!$category)
        {
            $category = $this->dao->select('*')->from(TABLE_CATEGORY)
                ->where('alias')->eq($categoryID)
                ->beginIF($type)->andWhere('type')->eq($type)->fi()
                ->fetch();
        }
        if(!$category) return false;

        if($category->type == 'forum')
        {
            $speakers = array();
            $category->moderators = explode(',', trim($category->moderators, ','));
            foreach($category->moderators as $moderators) $speakers[] = $moderators;
            $speakers = $this->loadModel('user')->getRealNamePairs($speakers);
            foreach($category->moderators as $key => $moderators)
            {
                unset($category->moderators[$key]);
                $category->moderators[$moderators] = isset($speakers[$moderators]) ? $speakers[$moderators] : '';
            }
        }

        $category->pathNames = $this->dao->select('id, name')->from(TABLE_CATEGORY)
            ->where('deleted')->eq('0')
            ->andWhere('id')->in($category->path)
            ->orderBy('grade')
            ->fetchPairs();
        $category = $this->loadModel('file')->replaceImgURL($category, 'desc');
        return $category;
    }

    /**
     * Get list of one type.
     *
     * @param  string $type
     * @param  string $orderBy
     * @access public
     * @return array
     */
    public function getListByType($type = 'dept', $orderBy = 'id_asc')
    {
        return $this->dao->select('`id`,`name`,`order`,`parent`')->from(TABLE_CATEGORY)
            ->where('deleted')->eq('0')
            ->andWhere('type')->eq($type)
            ->orderBy($orderBy)
            ->fetchAll('id');
    }

    /**
     * Get origin of a category.
     *
     * @param  int     $categoryID
     * @access public
     * @return array
     */
    public function getOrigin($categoryID)
    {
        if($categoryID == 0) return array();

        $path = $this->dao->select('path')->from(TABLE_CATEGORY)->where('id')->eq((int)$categoryID)->fetch('path');
        $path = trim($path, ',');
        if(!$path) return array();

        return $this->dao->select('*')->from(TABLE_CATEGORY)
            ->where('deleted')->eq('0')
            ->andWhere('id')->in($path)
            ->orderBy('grade')
            ->fetchAll('id');
    }

    /**
     * Get id list of a family.
     *
     * @param  int      $categoryID
     * @param  string   $type
     * @param  int      $root
     * @access public
     * @return array
     */
    public function getFamily($categoryID, $type = '', $root = 0)
    {
        if($categoryID == 0 and empty($type)) return array();
        $category = $this->getById($categoryID);

        if($category)
        {
            return $this->dao->select('id')->from(TABLE_CATEGORY)
                ->where('deleted')->eq('0')
                ->andWhere('path')->like($category->path . '%')
                ->fetchPairs();
        }
        if(!$category)
        {
            return $this->dao->select('id')->from(TABLE_CATEGORY)
                ->where('deleted')->eq('0')
                ->andWhere('type')->eq($type)
                ->beginIF($root)->andWhere('root')->eq((int)$root)->fi()
                ->fetchPairs();
        }
    }

    /**
     * Get children categories of one category.
     *
     * @param  int      $categoryID
     * @param  string   $type
     * @param  int      $root
     * @access public
     * @return array
     */
    public function getChildren($categoryID, $type = 'dept', $root = 0)
    {
        $categories = $this->dao->select('*')->from(TABLE_CATEGORY)
            ->where('deleted')->eq('0')
            ->andWhere('parent')->eq((int)$categoryID)
            ->andWhere('type')->eq($type)
            ->beginIF($root)->andWhere('root')->eq((int)$root)->fi()
            ->orderBy('`order`')
            ->fetchAll('id');

        return $this->process($categories, $type);
    }

    /**
     * Get id list of a module's childs.
     *
     * @param  int     $moduleID
     * @access public
     * @return array
     */
    public function getAllChildId($moduleID)
    {
        if($moduleID == 0) return array();

        $module = $this->getById((int)$moduleID);
        if(empty($module)) return array();

        return $this->dao->select('id')->from(TABLE_CATEGORY)
            ->where('deleted')->eq('0')
            ->andWhere('path')->like($module->path . '%')
            ->fetchPairs();
    }

    /**
     * Build the sql to execute.
     *
     * @param string $type              the tree type, for example, dept|forum
     * @param int    $startCategory     the start category id
     * @param int    $root
     * @access public
     * @return string
     */
    public function buildQuery($type, $startCategory = 0, $root = 0)
    {
        /* Get the start category path according the $startCategory. */
        $startPath = '';
        if($startCategory > 0)
        {
            $startCategory = $this->getById($startCategory);
            if($startCategory) $startPath = $startCategory->path . '%';
        }

        return $this->dao->select('*')->from(TABLE_CATEGORY)
            ->where('deleted')->eq('0')
            ->andWhere('type')->eq($type)
            ->beginIF($root)->andWhere('root')->eq((int)$root)->fi()
            ->beginIF($startPath)->andWhere('path')->like($startPath)->fi()
            ->orderBy('grade desc, `order`')
            ->get();
    }

    /**
     * Create a tree menu in <select> tag.
     *
     * @param  string $type
     * @param  int    $startCategory
     * @param  bool   $removeRoot
     * @param  int    $root
     * @access public
     * @return array
     */
    public function getOptionMenu($type = 'dept', $startCategory = 0, $removeRoot = false, $root = 0)
    {
        /* First, get all categories. */
        $treeMenu   = array();
        $lastMenu   = array();
        $stmt       = $this->dbh->query($this->buildQuery($type, $startCategory, $root));
        $categories = array();
        while($category = $stmt->fetch())
        {
            $categories[$category->id] = $category;
        }
        $categories = $this->process($categories, $type);

        /* Cycle them, build the select control.  */
        foreach($categories as $category)
        {
            $origins = explode(',', $category->path);
            $categoryName = '/';
            foreach($origins as $origin)
            {
                if(empty($origin)) continue;
                if(empty($categories[$origin]->name)) continue;
                $categoryName .= $categories[$origin]->name . '/';
            }
            $categoryName = rtrim($categoryName, '/');
            $categoryName .= "|$category->id\n";

            if(isset($treeMenu[$category->id]) and !empty($treeMenu[$category->id]))
            {
                if(isset($treeMenu[$category->parent]))
                {
                    $treeMenu[$category->parent] .= $categoryName;
                }
                else
                {
                    $treeMenu[$category->parent] = $categoryName;
                }
                $treeMenu[$category->parent] .= $treeMenu[$category->id];
            }
            else
            {
                if(isset($treeMenu[$category->parent]) and !empty($treeMenu[$category->parent]))
                {
                    $treeMenu[$category->parent] .= $categoryName;
                }
                else
                {
                    $treeMenu[$category->parent] = $categoryName;
                }
            }
        }

        $topMenu = @array_pop($treeMenu);
        $topMenu = explode("\n", trim($topMenu));
        if(!$removeRoot) $lastMenu[] = '/';

        foreach($topMenu as $menu)
        {
            if(!strpos($menu, '|')) continue;

            $menu       = explode('|', $menu);
            $label      = array_shift($menu);
            $categoryID = array_pop($menu);

            $lastMenu[$categoryID] = $label;
        }

        return $lastMenu;
    }

    /**
     * Get the tree menu in <ul><ol> type.
     *
     * @param  string   $type             the tree type
     * @param  int      $startCategoryID  the start category
     * @param  string   $userFunc         which function to be called to create the link
     * @param  int      $root
     * @param  array    $rootItems        extra <li> items to prepend to the root <ul>
     * @access public
     * @return string   the html code of the tree menu.
     */
    public function getTreeMenu($type = 'dept', $startCategoryID = 0, $userFunc = '', $root = 0, $rootItems = array())
    {
        $treeMenu   = array();
        $categories = array();
        $stmt = $this->dbh->query($this->buildQuery($type, $startCategoryID, $root));
        while($category = $stmt->fetch())
        {
            $categories[$category->id] = $category;
        }
        $categories = $this->process($categories, $type);
        foreach($categories as $category)
        {
            $linkHtml = call_user_func($userFunc, $category);

            if(isset($treeMenu[$category->id]) and !empty($treeMenu[$category->id]))
            {
                if(!isset($treeMenu[$category->parent])) $treeMenu[$category->parent] = '';
                $treeMenu[$category->parent] .= "<li>$linkHtml";
                $treeMenu[$category->parent] .= "<ul>".$treeMenu[$category->id]."</ul>\n";
            }
            else
            {
                if(isset($treeMenu[$category->parent]) and !empty($treeMenu[$category->parent]))
                {
                    $treeMenu[$category->parent] .= "<li>$linkHtml\n";
                }
                else
                {
                    $treeMenu[$category->parent] = "<li>$linkHtml\n";
                }
            }
            $treeMenu[$category->parent] .= "</li>\n";
        }

        /* Build root menu content. */
        $lastMenuContent = @array_pop($treeMenu);
        if(!empty($rootItems) && is_array($rootItems)) $lastMenuContent = join('', $rootItems) . $lastMenuContent;

        $lastMenu = "<ul class='tree'>" . $lastMenuContent . "</ul>\n";
        return $lastMenu;
    }

    /**
     * Create dept admin link
     *
     * @param  object    $category
     * @static
     * @access public
     * @return string
     */
    public static function createDeptAdminLink($category)
    {
        return html::a(helper::createLink('user', 'admin', "deptID={$category->id}"), $category->name, "id='category{$category->id}'");
    }

    /**
     * Create dept filter link for member management
     *
     * @param  object    $category
     * @static
     * @access public
     * @return string
     */
    public static function createDeptFilterLink($category)
    {
        return html::a('#', $category->name, "id='category{$category->id}' class='dept-filter-link' data-dept-id='{$category->id}'");
    }

    /**
     * Create the manage link.
     *
     * @param  object         $category
     * @access public
     * @return string
     */
    public static function createManageLink($category)
    {
        global $lang;

        /* Set the class of children link. */
        $childrenLinkClass = '';
        if($category->type == 'forum' and $category->grade == 2) $childrenLinkClass = 'hidden';

        $linkHtml  = $category->name;
        if(commonModel::hasPriv('tree', 'edit'))     $linkHtml .= ' ' . html::a(helper::createLink('tree', 'edit', "category={$category->id}"), $lang->tree->edit, "class='ajax'");
        if(commonModel::hasPriv('tree', 'children')) $linkHtml .= ' ' . html::a(helper::createLink('tree', 'children', "type={$category->type}&category={$category->id}&root=$category->root"), $lang->category->children, "class='$childrenLinkClass ajax'");
        if(commonModel::hasPriv('tree', 'delete'))   $linkHtml .= ' ' . (!empty($category->major) ? html::a('#', $lang->delete, "disabled='disabled'") : html::a(helper::createLink('tree', 'delete',   "category={$category->id}"), $lang->delete, "class='deleter'"));

        return $linkHtml;
    }

    /**
     * Update a category.
     *
     * @param  int     $categoryID
     * @access public
     * @return void
     */
    public function update($categoryID)
    {
        $category = fixer::input('post')
            ->stripTags('desc', $this->config->allowedTags)
            ->join('moderators', ',')
            ->join('rights', ',')
            ->join('users', ',')
            ->setDefault('readonly', 0)
            ->get();

        $category->name   = strip_tags(trim($category->name));
        $category->rights = !empty($category->rights) ? ',' . trim($category->rights, ',') . ',' : '';
        $category->users  = !empty($category->users) ? ',' . trim($category->users, ',') . ',' : '';

        /* Set moderators. */
        if(!isset($category->moderators))
        {
            $category->moderators = '';
        }
        else
        {
            $category->moderators = trim($category->moderators, ',');
            $category->moderators = empty($category->moderators) ? '' : ',' . $category->moderators . ',';
        }

        $parent = $this->getById($this->post->parent);
        $category->grade = $parent ? $parent->grade + 1 : 1;

        $this->dao->update(TABLE_CATEGORY)
            ->data($category, $skip = 'uid')
            ->autoCheck()
            ->check('name', 'notempty')
            ->where('id')->eq($categoryID)
            ->exec();

        $this->fixPath($category->type);

        return !dao::isError();
    }

    /**
     * Delete a category.
     *
     * @param  int     $categoryID
     * @access public
     * @return void
     */
    public function delete($categoryID, $null = null)
    {
        $category = $this->getById($categoryID);
        $family   = $this->getFamily($categoryID);

        $this->dao->update(TABLE_CATEGORY)->set('grade = grade - 1')->where('deleted')->eq('0')->andWhere('id')->ne($categoryID)->andWhere('id')->in($family)->exec();                      // Update family's grade.
        $this->dao->update(TABLE_CATEGORY)->set('parent')->eq($category->parent)->where('deleted')->eq('0')->andWhere('parent')->eq($categoryID)->exec();  // Update children's parent to their grandpa.
        $this->dao->update(TABLE_CATEGORY)->set('deleted')->eq(1)->where('id')->eq($categoryID)->exec();

        $this->fixPath($category->type);

        return !dao::isError();
    }

    /**
     * Create or update dept from api data.
     *
     * @param  object    $dept
     * @param  int       $mappedID  mapped dept id.
     * @return bool|int  record id
     */
    public function apiUpsertDept($dept, $mappedID)
    {
        /* mappedID is only provided when the dept already exists. */
        if(isset($mappedID))
        {
            $recordID = $mappedID;
            $this->dao->update(TABLE_CATEGORY)
                ->data($dept, $skip = 'id')
                ->where('id')->eq($mappedID)
                ->exec();
        }
        else
        {
            $this->dao->insert(TABLE_CATEGORY)->data($dept, $skip = 'id')->exec();
            $recordID = $this->dao->lastInsertID();
        }

        $this->fixPath('dept');

        return $recordID ?: false;
    }

    /**
     * Manage children of one category.
     *
     * @param  string $type
     * @param  int    $parent
     * @param  object $children
     * @param  int    $root
     * @access public
     * @return bool
     */
    public function manageChildren($type, $parent, $children, $root = 0)
    {
        /* Get parent. */
        $parent = $this->getByID($parent);

        /* Init the category object. */
        $category = new stdclass();
        $category->parent     = $parent ? $parent->id : 0;
        $category->grade      = $parent ? $parent->grade + 1 : 1;
        $category->type       = $type;
        $category->root       = (int)$root;
        $category->postedBy   = $this->app->user->account;
        $category->postedDate = helper::now();

        $i = 1;
        foreach($children as $key => $categoryName)
        {
            if(empty($categoryName)) continue;
            $order = $i * 10;

            /* First, save the child without path field. */
            $category->name  = strip_tags(trim($categoryName));
            $category->order = $order;
            $mode = $this->post->mode[$key];

            if($mode == 'new')
            {
                unset($category->id);
                $this->dao->insert(TABLE_CATEGORY)->data($category)->exec();

                /* After saving, update it's path. */
                $categoryID   = $this->dao->lastInsertID();
                $categoryPath = $parent ? $parent->path . $categoryID . ',' : ",$categoryID,";
                $this->dao->update(TABLE_CATEGORY)
                    ->set('path')->eq($categoryPath)
                    ->where('id')->eq($categoryID)
                    ->exec();
            }
            else
            {
                $categoryID = $key;
                $this->dao->update(TABLE_CATEGORY)
                    ->set('name')->eq(strip_tags(trim($categoryName)))
                    ->set('order')->eq($order)
                    ->where('id')->eq($categoryID)
                    ->exec();
            }
            $i ++;
        }

        return !dao::isError();
    }

    /**
     * Fix the path, grade fields according to the id and parent fields.
     *
     * @param  string    $type
     * @access public
     * @return void
     */
    public function fixPath($type)
    {
        /* Get all categories grouped by parent. */
        $groupCategories = $this->dao->select('id, parent')->from(TABLE_CATEGORY)
            ->where('deleted')->eq('0')
            ->andWhere('type')->eq($type)
            ->andWhere('deleted')->eq('0')
            ->fetchGroup('parent', 'id');
        $categories = array();

        /* Cycle the groupCategories until it has no item any more. */
        while(count($groupCategories) > 0)
        {
            /* Record the counts before processing. */
            $oldCounts = count($groupCategories);

            foreach($groupCategories as $parentCategoryID => $childCategories)
            {
                /**
                 * If the parentCategory doesn't exsit in the categories, skip it.
                 * If exists, compute it's child categories.
                 */
                if(!isset($categories[$parentCategoryID]) and $parentCategoryID != 0) continue;

                if($parentCategoryID == 0)
                {
                    $parentCategory = new stdclass();
                    $parentCategory->grade = 0;
                    $parentCategory->path  = ',';
                }
                else
                {
                    $parentCategory = $categories[$parentCategoryID];
                }

                /* Compute it's child categories. */
                foreach($childCategories as $childCategoryID => $childCategory)
                {
                    $childCategory->grade = $parentCategory->grade + 1;
                    $childCategory->path  = $parentCategory->path . $childCategory->id . ',';

                    /**
                     * Save child category to categories,
                     * thus the child of child can compute it's grade and path.
                     */
                    $categories[$childCategoryID] = $childCategory;
                }

                /* Remove it from the groupCategories.*/
                unset($groupCategories[$parentCategoryID]);
            }

            /* If after processing, no category processed, break the cycle. */
            if(count($groupCategories) == $oldCounts) break;
        }

        /* Save categories to database. */
        foreach($categories as $category)
        {
            $this->dao->update(TABLE_CATEGORY)->data($category)
                ->where('id')->eq($category->id)
                ->exec();
        }
    }

    /**
     * Process categories.
     *
     * @param  array  $categories
     * @param  string $type
     * @access public
     * @return array
     */
    public function process($categories = array(), $type = '')
    {
        foreach($categories as $key => $category)
        {
            if(!$this->hasRight($category, $type, $categories))
            {
                unset($categories[$key]);
                continue;
            }
        }

        return $categories;
    }

    /**
     * Check current user has Privilege for this category.
     *
     * @param  mixed  $category
     * @param  string $type
     * @param  array  $categories
     * @access public
     * @return bool
     */
    public function hasRight($category = null, $type = '', $categories = array())
    {
        if($this->app->user->admin == 'super') return true;

        if(!is_object($category)) $category = $this->getByID($category, $type);
        if(!$category) return true;

        if(empty($category->users) && empty($category->rights))
        {
            $hasRight = true;
        }
        else
        {
            $hasRight = false;
            if(!empty($category->users))
            {
                $hasRight = strpos($category->users, ',' . $this->app->user->account . ',') !== false;
            }

            if(!$hasRight && !empty($category->rights))
            {
                $groups   = array_intersect($this->app->user->groups, explode(',', $category->rights));
                $hasRight = !empty($groups);
            }
        }

        if($hasRight && !empty($category->parent))
        {
            $category = zget($categories, $category->parent);
            $hasRight = $this->hasRight($category, $type, $categories);
        }

        return $hasRight;
    }
}
