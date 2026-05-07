<?php
/**
 * The control file of user module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     user
 * @link        https://xuanim.com
 */
class user extends control
{
    /**
     * The referer
     *
     * @var string
     * @access private
     */
    private $referer;

    /**
     * Login.
     *
     * @param string $referer
     * @access public
     * @return void
     */
    public function login($referer = '')
    {
        $this->setReferer($referer);

        /* Load mail config for reset password. */
        $this->app->loadModuleConfig('mail');

        $loginLink = $this->createLink('user', 'login');
        $denyLink  = $this->createLink('user', 'deny');

        /* Reload lang by lang of get when viewType is json. */
        if($this->app->getViewType() == 'json' and $this->get->lang and $this->get->lang != $this->app->getClientLang())
        {
            $this->app->setClientLang($this->get->lang);
            $this->app->loadLang('user');
        }

        /* If the user logon already, goto the pre page. */
        if($this->user->isLogon())
        {
            if($this->app->getViewType() == 'json')
            {
                $data = $this->user->getDataInJSON($this->app->user);
                die(helper::removeUTF8Bom(json_encode(array('status' => 'success') + $data)));
            }

            if($this->referer and strpos($loginLink . $denyLink, $this->referer) !== false) $this->locate($this->referer);
            $this->locate($this->createLink($this->config->default->module));
            exit;
        }

        /* If the user sumbit post, check the user and then authorize him. */
        if(!empty($_POST))
        {
            $user = $this->user->login($this->post->account, $this->post->password);
            if($this->app->getViewType() == 'json')
            {
                if($user)
                {
                    $data = $this->user->getDataInJSON($user);
                    die(helper::removeUTF8Bom(json_encode(array('status' => 'success') + $data)));
                }
                else
                {
                    $user = $this->user->getByAccount($this->post->account);
                    die(helper::removeUTF8Bom(json_encode(array('status' => 'failed', 'reason' => $this->lang->user->loginFailed))));
                }
            }
            else
            {
                if(!$user || $user == 'locked' || $user == 'banned')
                {
                    $user = $this->user->getByAccount($this->post->account);
                    $this->send(array('result'=>'fail', 'message' => $this->lang->user->loginFailed));
                }
            }

            /* Goto the referer or to the default module */
            if($this->post->referer != false and strpos($loginLink . $denyLink, $this->post->referer) === false)
            {
                if($this->config->requestType == 'PATH_INFO')
                {
                    $path = substr($this->post->referer, strrpos($this->post->referer, '/') + 1);
                    $path = rtrim($path, '.html');
                    if(empty($path) or strpos($path, $this->config->requestFix) === false) $path = $this->config->requestFix;
                    list($module, $method) = explode($this->config->requestFix, $path);
                }
                else
                {
                    $url   = html_entity_decode($this->post->referer);
                    $param = substr($url, strrpos($url, '?') + 1);

                    $module = $this->config->default->module;
                    $method = $this->config->default->method;
                    if(strpos($param, '&') !== false) list($module, $method) = explode('&', $param);
                    $module = str_replace('m=', '', $module);
                    $method = str_replace('f=', '', $method);
                }

                if(commonModel::hasPriv($module, $method))
                {
                    $this->send(array('result'=>'success', 'locate' => $this->post->referer));
                }
                else
                {
                    $this->send(array('result'=>'success', 'locate' => $this->createLink('index', 'index')));
                }
            }
            else
            {
                $this->send(array('result'=>'success', 'locate' => $this->createLink('index', 'index')));
            }
        }
        else if($this->app->getViewType() == 'json')
        {
            die(helper::removeUTF8Bom(json_encode(array('status' => 'failed', 'reason' => $this->lang->user->loginFailed))));
        }

        if(!$this->session->random) $this->session->set('random', md5(time() . mt_rand()));

        $ignoreNotice = isset($this->config->global->ignoreNotice) ? json_decode($this->config->global->ignoreNotice) : array();
        $this->view->ignoreNotice = $ignoreNotice;

        $this->view->title   = $this->lang->user->login->common;
        $this->view->referer = $this->referer;

        $this->display();
    }

    /**
     * logout
     *
     * @param int $referer
     * @access public
     * @return void
     */
    public function logout($referer = 0)
    {
        session_destroy();
        setcookie('keepLogin', 'false', $this->config->cookieLife, $this->config->webRoot);
        $vars = !empty($referer) ? "referer=$referer" : '';
        $this->locate($this->createLink('user', 'login', $vars));
    }

    /**
     * The deny page.
     *
     * @param mixed $module             the denied module
     * @param mixed $method             the deinied method
     * @param string $refererBeforeDeny the referer of the denied page.
     * @access public
     * @return void
     */
    public function deny($module, $method, $refererBeforeDeny = '')
    {
        $this->app->loadLang($module);
        $this->app->loadLang('index');

        $this->setReferer();

        $this->view->title      = $this->lang->user->deny;
        $this->view->position[] = $this->lang->user->deny;

        $this->view->module            = $module;
        $this->view->method            = $method;
        $this->view->denyPage          = $this->referer;
        $this->view->refererBeforeDeny = $refererBeforeDeny;

        die($this->display());
    }

    /**
     * The user control panel of the front
     *
     * @access public
     * @return void
     */
    public function control()
    {
        if($this->app->user->account == 'guest') $this->locate(inlink('login'));
        $this->display();
    }

    /**
     * View current user's profile.
     *
     * @access public
     * @return void
     */
    public function profile()
    {
        if($this->app->user->account == 'guest') $this->locate(inlink('login'));
        $this->view->title = $this->lang->user->profile;
        $this->view->user  = $this->user->getByAccount($this->app->user->account);
        $this->display();
    }

    /**
     * Create user
     *
     * @access public
     * @return void
     */
    public function create()
    {
        if(!empty($_POST))
        {
            if(in_array(strtolower(trim($this->post->account)), $this->config->user->retainAccount)) $this->send(array('result' => 'fail', 'message' => array('account' => sprintf($this->lang->user->retainAccount, trim($this->post->account)))));

            $result = $this->user->create();

            if(dao::isError())
            {
                $this->send(array('result' => 'fail', 'message' => dao::getError()));
            }

            if($result)
            {
                $this->send(array('result' => 'success', 'message' => $this->lang->saveSuccess, 'locate' => inlink('admin')));
            }
        }
        $this->view->title      = $this->lang->user->create;
        $this->view->position[] = $this->lang->user->create;

        $this->view->treeMenu = $this->loadModel('tree')->getTreeMenu('dept', 0, array('treeModel', 'createDeptAdminLink'));
        $this->view->depts    = $this->tree->getOptionMenu('dept');


        $this->display();
    }

    /**
     * Edit a user.
     *
     * @param  string    $account
     * @access public
     * @return void
     */
    public function edit($account = '', $from = '')
    {
        if(!commonModel::hasPriv('user', 'edit')) die(js::locate($this->createLink('user', 'deny', "module=user&method=edit")));

        die($this->fetch('user', 'editself', "account={$account}&from={$from}"));
    }

    /**
     * Edit login user.
     *
     * @access public
     * @return void
     */
    public function editself($account = '', $from = '')
    {
        if($this->app->user->account == 'guest') $this->locate(inlink('login'));
        if(!$account) $account = $this->app->user->account;

        if(!empty($_POST))
        {
            $user = $this->user->getByAccount($account);
            $this->user->update($account, $from);
            if($_POST['password1'] !== '') unset($_POST['password1']);
            if($_POST['password2'] !== '') unset($_POST['password2']);
            if(dao::isError())
            {
                $this->send(array('result' => 'fail', 'message' => dao::getError()));
            }
            $locate = $from == 'admin' ? inlink('admin') : inlink('profile');
            $this->send(array('result' => 'success', 'locate' => $locate));
        }

        $this->view->title      = $this->lang->user->edit;
        $this->view->position[] = $this->lang->user->edit;

        $this->view->treeMenu = $this->loadModel('tree')->getTreeMenu('dept', 0, array('treeModel', 'createDeptAdminLink'));
        $this->view->depts    = $this->tree->getOptionMenu('dept');
        $this->view->user     = $this->user->getByAccount($account);
        if($from == 'admin')
        {
            $clientLang = $this->app->getClientLang();
            $dbFields   = $this->loadModel('setting')->getItems("lang=$clientLang,all&module=user&section=roleList", 'lang');

            $dbFieldsData = array();
            foreach($dbFields as $value) $dbFieldsData[$value->key] = $value->value;

            $this->view->roleList = !empty($dbFields) ? array('' => '') + $dbFieldsData : $this->lang->user->roleList;
            $this->display('user', 'edit.admin');
        }
        else
        {
            $this->display('user', 'edit');
        }
    }

    /**
     * Delete a user.
     *
     * @param  string $account
     * @access public
     * @return void
     */
    public function delete($account = '')
    {
        $user = $this->user->getByAccount($account);
        if($this->user->delete($account))
        {
            $this->send(array('result' => 'success'));
        }
        $this->send(array('result' => 'fail', 'message' => dao::getError()));
    }

    /**
     * Recover a user.
     *
     * @param  string $account
     * @access public
     * @return void
     */
    public function recover($account = '')
    {
        if($this->user->recover($account))
        {
            $user = $this->user->getByAccount($account);
            $this->send(array('result' => 'success'));
        }
        $this->send(array('result' => 'fail', 'message' => dao::getError()));
    }

    /**
     *  Admin users list.
     *
     * @param  int    $deptID
     * @param  string $mode
     * @param  srting $search
     * @param  srting $orderBy
     * @param  int    $recTotal
     * @param  int    $recPerPage
     * @param  int    $pagerID
     * @access public
     * @return void
     */
    public function admin($deptID = 0, $mode = 'normal', $search = '', $orderBy = 'id_asc', $recTotal = 0, $recPerPage = 10, $pageID = 1)
    {
        if($this->post->search) die($this->locate(inlink('admin', "deptID=$deptID&mode=$mode&search=" . urlencode($this->post->search) . "&orderBy=$orderBy&recTotal=0&recPerPage=$recPerPage&pageID=1")));

        $this->app->loadClass('pager', $static = true);
        $pager = new pager($recTotal, $recPerPage, $pageID);

        /* Build dept tree menu with an extra "all departments" root item for list view. */
        $allDeptLink = html::a($this->createLink('user', 'admin', "deptID=0"), $this->lang->user->allUsers, "id='category0'");
        $rootItems   = array("<li>$allDeptLink</li>\n");
        $this->view->treeMenu = $this->loadModel('tree')->getTreeMenu('dept', 0, array('treeModel', 'createDeptAdminLink'), 0, $rootItems);
        $this->view->depts    = $this->tree->getOptionMenu('dept');
        $this->view->users    = $this->user->getList($deptID, $mode, $accountList = '', $search, $orderBy, $pager);
        $this->view->deptID   = $deptID;
        $this->view->mode     = $mode;
        $this->view->search   = $search;
        $this->view->orderBy  = $orderBy;
        $this->view->pager    = $pager;
        $this->view->type     = $mode . 'List';

        $this->view->title = $this->lang->user->pageTitle;
        $this->display();
    }

    /**
     * Reset the user client config
     *
     * @param  string $account
     * @return void
     */
    public function resetClientConfig($account = '')
    {
        if(!$account) $this->send(array('result'=>'fail', 'message' => $this->lang->user->actionFail));

        $result = $this->user->resetClientConfig($account);
        if($result)
        {
            die($this->send(array('result' => 'success', 'message'=> $this->lang->user->resetClientConfigMsg, 'locate' => $this->server->http_referer)));
        }

        $this->send(array('result' => 'fail', 'message' => dao::getError()));
    }

    /**
     * forbid a user.
     *
     * @param  string $account
     * @return void
     */
    public function forbid($account = '')
    {
        if(!$account) $this->send(array('result'=>'fail', 'message' => $this->lang->user->actionFail));

        $result = $this->user->forbid($account);
        if($result)
        {
            die($this->send(array('result'=>'success', 'locate' => $this->server->http_referer)));
        }

        $this->send(array('result' => 'fail', 'message' => dao::getError()));
    }

    /**
     * Active user
     *
     * @param  string $account
     * @access public
     * @return void
     */
    public function active($account = '')
    {
        if(!$account) $this->send(array('result'=>'fail', 'message' => $this->lang->user->actionFail));

        $result = $this->user->active($account);
        if($result)
        {
            die($this->send(array('result'=>'success', 'locate' => $this->server->http_referer)));
        }

        $this->send(array( 'result' => 'fail', 'message' => dao::getError()));
    }

    /**
     * set the referer
     *
     * @param  string $referer
     * @access public
     * @return void
     */
    public function setReferer($referer = '')
    {
        if(!empty($referer))
        {
            $this->referer = helper::safe64Decode($referer);
        }
        else
        {
            $this->referer = isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '';
        }

        if(strpos($this->referer, 'entry') !== false and strpos($this->referer, 'visit') !== false)
        {
            if($this->config->requestType == 'PATH_INFO')
            {
                if(substr($this->referer, strpos($this->referer, 'entry-visit-') + strlen('entry-visit-'), strpos($this->referer, '.html')) > 4) $this->referer = '';
            }
            else
            {
                $url = parse_url($this->referer);
                parse_str($url['query'], $params);
                if($params['m'] == 'entry' and $params['f'] == 'visit' and $params['entryID'] > 4) $this->referer = '';
            }
        }
    }

    /**
     * upload avatar
     *
     * @param  string $lite
     * @param  string $auth_account  account for token authentication (API mode)
     * @param  string $auth_token    token for authentication (API mode)
     * @param  string $auth_device   device for authentication (API mode)
     * @access public
     * @return void
     */
    public function uploadAvatar($lite = false, $auth_account = '', $auth_token = '', $auth_device = '')
    {
        if($this->app->user->account == 'guest')
        {
            if(empty($auth_account) || empty($auth_token))
            {
                $this->send(array('result' => 'fail', 'message' => 'Authentication required'));
            }

            $this->loadModel('im');
            $user = $this->im->user->identifyWithToken($auth_account, $auth_token, $auth_device);
            if(!$user || is_string($user))
            {
                $this->send(array('result' => 'fail', 'message' => 'Invalid authentication token'));
            }

            $this->session->set('user', $user);
            $this->app->user = $user;
        }

        if($_SERVER['REQUEST_METHOD'] == 'POST')
        {
            $result = $this->user->uploadAvatar($lite);
            $this->send($result);
        }

        $this->view->user  = $this->user->getByAccount($this->app->user->account);
        $this->view->title = $this->lang->user->uploadAvatar;
        $this->display();
    }

    /**
     * crop avatar
     *
     * @param  int            $image
     * @param  boolean|string $lite
     * @access public
     * @return void
     */
    public function cropAvatar($image, $lite = false)
    {
        $image = $this->loadModel('file')->getByID($image);

        if(!empty($_POST))
        {
            $size = fixer::input('post')->get();
            $this->loadModel('file')->cropImage(
                $image->realPath,
                $image->realPath,
                $size->left,
                $size->top,
                $size->right - $size->left,
                $size->bottom - $size->top,
                $size->scaled
                    ? $size->scaleWidth
                    : 0,
                $size->scaled
                    ? $size->scaleHeight
                    : 0
            );
            $user = $this->user->getByAccount($this->app->user->account);
            $this->app->user->avatar = $user->avatar;
            exit('success');
        }

        $this->view->user  = $this->user->getByAccount($this->app->user->account);
        $this->view->title = $this->lang->user->cropAvatar;
        $this->view->image = $image;

        /* Use lite interface when $lite is true in boolean. */
        $lite = filter_var($lite, FILTER_VALIDATE_BOOLEAN);
        if($lite)  $this->display('user', 'cropavatarlite');
        if(!$lite) $this->display();
    }

    /**
     * Change user's avatar.
     *
     * @access public
     * @return void
     */
    public function changeAvatar()
    {
        if($this->app->user->account == 'guest') $this->locate(inlink('login'));
        $this->view->title = $this->lang->user->avatar;
        $this->view->user  = $this->user->getByAccount($this->app->user->account);
        $this->display();
    }

    /**
     * Batch create users.
     *
     * @access public
     * @return void
     */
    public function batchCreate()
    {
        if(!empty($_POST))
        {
            $result = $this->user->batchCreate();
            $this->send($result);
        }

        $this->view->title      = $this->lang->user->batchCreate;
        $this->view->deptList   = $this->loadModel('tree')->getOptionMenu('dept');
        $this->view->moduleMenu = false;
        $this->display();
    }
}
