<?php
/**
 * The control file of misc module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     misc
 * @link        https://xuanim.com
 */
class misc extends control
{
    /**
     * keep logon function.
     *
     * @param  string $notice
     * @access public
     * @return void
     */
    public function ping($notice = '')
    {
        /* Save online status. */
        $this->loadModel('user')->online();

        /* Get notices. */
        if($this->app->user->account != 'guest')
        {
            $res = new stdclass();
            $res->time    = helper::now();
            $res->notices = array();
            die(json_encode($res));
        }
    }

    /**
     * ignoreNotice
     *
     * @param  string $version
     * @access public
     * @return void
     */
    public function ignoreNotice($version)
    {
        $ignore = isset($config->ignoreNotice) ? json_decode($config->ignoreNotice) : array();
        $ignore[] = strip_tags(trim($version));
        $this->loadModel('setting')->setItem('system.sys.common.global.ignoreNotice', json_encode($ignore));
        die('success');
    }
}
