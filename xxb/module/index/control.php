<?php
/**
 * The control file of index module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     index
 * @link        https://xuanim.com
 */
class index extends control
{
    /**
     * The construct method.
     *
     * @access public
     * @return void
     */
    public function __construct($moduleName = '', $methodName = '', $appName = '')
    {
        parent::__construct($moduleName, $methodName, $appName);
    }

    /**
     * Index page.
     *
     * @access public
     * @return void
     */
    public function index()
    {
        $blocks = $this->loadModel('block')->getBlockList();

        /* Init block when vist index first. */
        if(empty($blocks) && method_exists($this->block, 'initBlock') && $this->block->initBlock('xxb')) die(js::reload());

        foreach($blocks as $key => $block)
        {
            $block->params = json_decode($block->params);
            if(empty($block->params)) $block->params = new stdclass();

            $sign = $this->config->requestType == 'PATH_INFO' ? '?' : '&';
            $block->blockLink = $this->createLink('block', 'print' . $block->block . 'block', "index={$block->id}");
        }

        $this->view->title          = $this->lang->index->common;
        $this->view->blocks         = $blocks;
        $this->view->currentVersion = $this->loadModel('client')->getCurrentVersion();
        $this->view->versionApiUrl  = sprintf($this->config->client->upgradeApi, '');
        $this->display();
    }
}
