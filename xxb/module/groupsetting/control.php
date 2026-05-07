<?php
/**
 * The control file of groupsetting module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     groupsetting
 * @link        https://xuanim.com
 */
?>
<?php
class groupsetting extends control
{
    /**
     * View and set groupsetting.
     *
     * @access public
     * @param  string $type
     * @return void
     */
    public function admin($type = '')
    {
        if(!empty($_POST))
        {
            $setting = fixer::input('post')->get();
            $result  = $this->loadModel('setting')->setItems('system.common.xuanxuan', $setting);
            if(!$result)
            {
                $this->send(array('result' => 'fail', 'message' => dao::getError()));
            }
            $cacheKeys = array(
                'owner=system&module=common&section=xuanxuan&key=disableSystemGroupChat',
            );
            $invalidateResult = $this->loadModel('setting')->invalidateXxdConfigCache($cacheKeys);
            if($invalidateResult !== true)
            {
                $this->send(array('result' => 'fail', 'message' => $invalidateResult));
            }
            $this->send(array('result' => 'success', 'message' => $this->lang->saveSuccess, 'locate' => inlink('admin')));
        }

        $this->view->title            = $this->lang->setting->param;
        $this->view->server           = $this->loadModel('im')->getServer();
        $this->view->path             = $this->app->basePath;
        $this->view->type             = $type;

        $this->display();
    }
}
