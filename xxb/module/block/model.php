<?php
/**
 * The model file of block module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     block
 * @link        https://xuanim.com
 */
class blockModel extends model
{
    /**
     * Get block by ID.
     *
     * @param  int    $blockID
     * @access public
     * @return object
     */
    public function getByID($blockID = 0)
    {
        return $this->getBlock($blockID);
    }

    /**
     * Get saved block config.
     *
     * @param  int    $index
     * @param  string $appName
     * @access public
     * @return object
     */
    public function getBlock($index = 0)
    {
        $blockList = $this->getBlockList();
        return $blockList[$index];
    }

    /**
     * Get block list for account.
     *
     * @access public
     * @return void
     */
    public function getBlockList()
    {
        $this->app->loadLang('block');

        $blockTypes = $this->lang->block->list;
        $blocks     = array();
        $account    = $this->app->user->account;
        $order      = 0;

        foreach($blockTypes as $name => $blk)
        {
            /* Check user priv */
            if(!in_array($name, array('profile', 'download')) && !commonModel::hasPriv('block', 'print' . $name . 'block')) continue;

            /* Skip profile block for non-super users, only show download block */
            if($name == 'profile' && $this->app->user->admin != 'super') continue;

            /* Skip blocks which require super admin rights for nonadmin users. */
            if($blk['right'] == 'super' && $this->app->user->admin != 'super' ) continue;

            $block = new stdclass();
            $block->id      = $name;
            $block->account = $account;
            $block->title   = $blk['title'];
            $block->block   = $name;
            $block->block   = $name;
            $block->order   = $order++;
            $block->grid    = isset($blk['grid']) ? $blk['grid'] : 6;
            $block->params  = '';
            
            $blocks[$name] = $block;
        }
        return $blocks;
    }
}
