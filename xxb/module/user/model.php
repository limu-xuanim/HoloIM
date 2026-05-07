<?php
/**
 * The model file of user module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     user
 * @link        https://xuanim.com
 */
?>
<?php
class userModel extends model
{
    /**
     * Get users List.
     *
     * @param  int|array $dept
     * @param  string    $mode
     * @param  mixed     $accountList   string | array
     * @param  string    $search
     * @param  string    $orderBy
     * @param  object    $pager
     * @access public
     * @return array
     */
    public function getList($dept = 0, $mode = 'normal', $accountList = '', $search = '', $orderBy = 'id', $pager = null)
    {
        $deptList = array();
        if($dept)
        {
            $this->loadModel('tree');
            if(!is_array($dept)) $dept = explode(',', $dept);
            foreach($dept as $d)
            {
                $depts    = $this->tree->getFamily($d);
                $deptList = array_merge($deptList, $depts);
            }
        }

        return $this->dao->select('*')->from(TABLE_USER)
            ->where(1)
            ->beginIF($deptList)->andWhere('dept')->in($deptList)->fi()
            ->beginIF($accountList)->andWhere('account')->in($accountList)->fi()
            ->beginIF($mode != 'all' && $mode != 'deleted')->andWhere('deleted')->eq('0')->fi()
            ->beginIF($mode == 'forbid')->andWhere('locked')->ge(helper::now())->fi()
            ->beginIF($mode == 'deleted')->andWhere('deleted')->eq('1')->fi()
            ->beginIF($mode == 'normal')
            ->andWhere('locked IS NULL', true)
            ->orWhere('locked')->lt(helper::now())
            ->markRight(1)
            ->fi()

            ->beginIF($search)
            ->andWhere('account', true)->like("%$search%")
            ->orWhere('realname')->like("%$search%")
            ->markRight(1)
            ->fi()

            ->orderBy($orderBy)
            ->page($pager)
            ->fetchAll();
    }

    /**
     * Get the account=>relaname pairs.
     *
     * @param  string    $params  admin|noempty
     * @param  int|array $dept
     * @param  object    $pager
     * @access public
     * @return array
     */
    public function getPairs($params = '', $dept = 0, $pager = null)
    {
        $users = $this->dao->select('account, realname')->from(TABLE_USER)
            ->where(1)
            ->beginIF(strpos($params, 'nodeleted') !== false)->andWhere('deleted')->eq('0')->fi()
            ->beginIF(strpos($params, 'noforbidden') !== false)
            ->andWhere('locked IS NULL', true)
            ->orWhere('locked')->lt(helper::now())
            ->markRight(1)
            ->fi()
            ->beginIF(strpos($params, 'admin') !== false)->andWhere('admin')->ne('no')->fi()
            ->beginIF($dept)->andWhere('dept')->in($dept)->fi()
            ->orderBy('id_asc')
            ->beginIF($pager)->page($pager)->fi()
            ->fetchPairs();

        foreach($users as $account => $realname) if($realname == '') $users[$account] = $account;

        /* Append empty users. */
        if(strpos($params, 'noempty') === false) $users = array('' => '') + $users;
        if(strpos($params, 'noclosed') === false) $users = $users + array('closed' => 'Closed');

        return $users;
    }

    /**
     * Get user by his account.
     *
     * @param mixed $account
     * @access public
     * @return object           the user.
     */
    public function getByAccount($account)
    {
        return $this->dao->select('*')->from(TABLE_USER)
            ->beginIF(validater::checkEmail($account))->where('email')->eq($account)->fi()
            ->beginIF(!validater::checkEmail($account))->where('account')->eq($account)->fi()
            ->andWhere('deleted')->eq('0')
            ->fetch();
    }

    /**
     * Get user list with real name.
     *
     * @param  string|array $users
     * @access public
     * @return array
     */
    public function getRealNamePairs($users = '')
    {
        $userPairs = $this->dao->select('account, realname')->from(TABLE_USER)
        ->where('1=1')
        ->beginIF(!empty($users))->andWhere('account')->in($users)->fi()
        ->fetchPairs('account');

        if(!empty($users))
        {
            foreach($users as $account) if(!isset($userPairs[$account])) $userPairs[$account] = $account;
        }

        if(!$userPairs) return array();

        foreach($userPairs as $account => $realname) if($realname == '') $userPairs[$account] = $account;

        return $userPairs;
    }

    /**
     * Batch update of user role.
     *
     * @param  string|array $roles
     * @return bool
     */
    public function batchUpdateUserRole($roles)
    {
        $this->dao->update(TABLE_USER)->set('role')->eq('')->where('role')->notin($roles)->andWhere('deleted')->eq('0')->exec();

        return !dao::isError();
    }

    /**
     * Get role list.
     *
     * @access public
     * @return array
     */
    public function getRoleList()
    {
        return $this->lang->user->roleList;
    }

    /**
     * Create a user.
     *
     * @access public
     * @return bool
     */
    public function create()
    {
        $this->checkPassword();

        $user = fixer::input('post')
            ->setDefault('gender', 'u')
            ->setForce('join', helper::now())
            ->setIF($this->post->password1 == false, 'password', '')
            ->remove('admin, ip')
            ->get();
        $user->password = $this->createPassword($this->post->password1, $user->account);

        $this->dao->insert(TABLE_USER)
            ->data($user, $skip = 'password1,password2')
            ->autoCheck()
            ->batchCheck($this->config->user->require->create, 'notempty')
            ->check('account', 'unique')
            ->check('account', 'account')
            ->checkIF($user->email, 'email', 'email')
            ->checkIF($user->email, 'email', 'unique')
            ->checkIF($user->mobile, 'mobile', 'mobile')
            ->exec();

        return !dao::isError();
    }

    /**
     * Create a user with data from api.
     *
     * @param  object $user
     * @return bool
     */
    public function apiCreate($user, $hashOnce = true)
    {
        $user->password = $this->createPassword($user->password, $user->account, $hashOnce);

        $this->dao->insert(TABLE_USER)
            ->data($user)
            ->autoCheck()
            ->check('account', 'unique')
            ->check('account', 'account')
            ->exec();

        return !dao::isError();
    }

    /**
     * Update an account.
     *
     * @param  string $account
     * @access public
     * @return object | bool
     */
    public function update($account, $from)
    {
        /* If the user want to change his password. */
        if($this->post->password1 != false)
        {
            $this->checkPassword();
            if(dao::isError()) return false;

            $password = $this->createPassword($this->post->password1, $account);
            $this->post->set('password', $password);
            $passwordChanged = true;
        }

        $user = fixer::input('post')
            ->setDefault('gender', 'u')
            ->remove('ip, account, join, visits, passwordStrength, files')
            ->setIF($from == 'admin' and !$this->post->admin, 'admin', 'no');

        if($this->app->user->admin != 'super')
        {
            if($this->app->user->account != $account && !commonModel::hasPriv('user', 'edit')) return false;
            $user = $user->remove('admin');

            /* Remove check for role in front. */
            if($account == $this->app->user->account) $this->config->user->require->edit = str_replace(',role', '', $this->config->user->require->edit);
        }

        $user = $user->get();
        $this->dao->update(TABLE_USER)
            ->data($user, $skip = 'password1,password2')
            ->autoCheck()
            ->batchCheck($this->config->user->require->edit, 'notempty')
            ->checkIF($user->email, 'email', 'email')
            ->checkIF($user->email, 'email', 'unique', "account!='$account'")
            ->checkIF($user->mobile, 'mobile', 'mobile')
            ->checkIF($user->phone, 'phone', 'tel')
            ->checkIF($this->post->gtalk != false, 'gtalk', 'email')
            ->where('account')->eq($account)
            ->exec();

        if(dao::isError()) return false;
        return true;
    }

    /**
     * Update a user with user data from api.
     *
     * @param  object  $user
     * @return bool
     */
    public function apiUpdate($user)
    {
        if(isset($user->password)) $user->password = $this->createPassword($user->password, $user->account, $hashOnce = true);

        $this->dao->update(TABLE_USER)
            ->data($user)
            ->autoCheck()
            ->where('account')->eq($user->account)
            ->exec();

        return !dao::isError();
    }

    /**
     * Check the password is valid or not.
     *
     * @access public
     * @return bool
     */
    public function checkPassword()
    {
        if($this->post->password1 != false)
        {
            if($this->post->passwordStrength !== false && isset($this->config->passwordStrength) && $this->post->passwordStrength < $this->config->passwordStrength) dao::$errors['password1'][] = $this->lang->error->passwordweak;
            if($this->post->password1 != $this->post->password2) dao::$errors['password1'][] = $this->lang->error->passwordsame;
            if(!validater::checkReg($this->post->password1, '|(.){6,}|')) dao::$errors['password1'][] = $this->lang->error->passwordrule;
        }
        else
        {
            dao::$errors['password1'][] = sprintf($this->lang->error->notempty, $this->lang->user->password);
        }
        if($this->post->password2 == false)
        {
            dao::$errors['password2'][] = sprintf($this->lang->error->notempty, $this->lang->user->password2);
        }
        return !dao::isError();
    }

    /**
     * Try to login with an account and password.
     *
     * @param  string    $account
     * @param  string    $password
     * @access public
     * @return object
     */
    public function login($account, $password)
    {
        $user = $this->identify($account, $password);
        if(!$user) return false;
        if($user == 'locked' || $user == 'banned') return $user;

        /* Set keep login cookie info if keep login. */
        if($this->post->keepLogin == 'true') $this->keepLogin($user);

        $user->password = $this->post->rawPassword;

        $groups = $this->loadModel('group')->getByAccount($account);
        $user->groups = array_keys($groups);
        $user->rights = $this->authorize($user);
        $this->session->set('user', $user);
        $this->app->user = $this->session->user;

        return $user;
    }

    /**
     * Identify a user.
     *
     * @param   string $account     the account
     * @param   string $password    the password    the plain password or the md5 hash
     * @access  public
     * @return  object|bool|string  if is valid user, return the user object.
     *                              if no valid user, return false.
     *                              if user is locked, return locked status as string.
     */
    public function identify($account, $password)
    {
        if(!$account or !$password) return false;

        /* First get the user from database by account or email. */
        $this->dao->delete()->from(TABLE_USER)->where('id')->eq('-1')->exec();
        $user = $this->dao->select('*')->from(TABLE_USER)
            ->where('deleted')->eq('0')
            ->beginIF(validater::checkEmail($account))->andWhere('email')->eq($account)->fi()
            ->beginIF(!validater::checkEmail($account))->andWhere('account')->eq($account)->fi()
            ->fetch();

        /* Then check the password hash. */
        if(!$user) return false;

        /* Can not login before ten minutes when user is locked. */
        if($user->locked != null)
        {
            $dateDiff = (strtotime($user->locked) - time()) / 60;

            /* Check the type of lock and show it. */
            if($dateDiff > 0 && $dateDiff <= 10)
            {
                $this->lang->user->loginFailed = sprintf($this->lang->user->locked, '10' . $this->lang->date->minute);
                return 'locked';
            }
            elseif($dateDiff > 10)
            {
                $dateDiff = ceil($dateDiff / 60 / 24);
                $this->lang->user->loginFailed = $dateDiff <= 30 ? sprintf($this->lang->user->locked, $dateDiff . $this->lang->date->day) : $this->lang->user->lockedForEver;
                return 'banned';
            }
            else
            {
                $user->fails  = 0;
                $user->locked = null;
            }
        }

        /* The password can be the plain or the password after md5. */
        if(!$this->compareHashPassword($password, $user))
        {
            $user->fails ++;
            if($user->fails >= 10) $user->locked = date('Y-m-d H:i:s', time() + 10 * 60);
            $this->dao->update(TABLE_USER)->data($user)->where('id')->eq($user->id)->exec();
            return false;
        }

        /* Update user data. */
        $updateUser=new stdclass();
        $updateUser->ip      = $user->ip     = helper::getRemoteIp();
        $updateUser->last    = $user->last   = helper::now();
        $updateUser->ping    = $user->ping   = helper::now();
        $updateUser->fails   = $user->fails  = 0;
        $updateUser->visits  = ++ $user->visits;

        /* Update password when create password by oldCreatePassword function. */
        $this->dao->update(TABLE_USER)->data($updateUser)->where('account')->eq($account)->exec();

        $user->realname  = empty($user->realname) ? $account : $user->realname;
        $user->shortLast = substr($user->last, 5, -3);
        $user->shortJoin = substr($user->join, 5, -3);
        unset($_SESSION['random']);

        /* Return him.*/
        return $user;
    }

    /**
     * Identify user by cookie.
     *
     * @access public
     * @return bool | mixed
     */
    public function identifyByCookie()
    {
        $account  = $this->cookie->ra;
        $authHash = $this->cookie->rp;
        $user     = $this->identify($account, $authHash);
        if(!$user) return false;

        /* Update keep login cookie info. */
        $this->keepLogin($user);

        $groups = $this->loadModel('group')->getByAccount($account);
        $user->groups = array_keys($groups);
        $user->rights = $this->authorize($user);
        $this->session->set('user', $user);
        $this->app->user = $this->session->user;
    }

    /**
     * Authorize a user.
     *
     * @param   object    $user   the user object.
     * @access  public
     * @return  array
     */
    public function authorize($user)
    {
        $rights = isset($this->config->rights->guest) ? $this->config->rights->guest : array();
        if($user->account == 'guest') return $rights;

        foreach($this->config->rights->member as $moduleName => $moduleMethods)
        {
            foreach($moduleMethods as $method)
            {
                $method = strtolower($method);
                $rights[$moduleName][$method] = $method;
            }
        }

        /* pull from ranzhi. */
        $sql = $this->dao->select('module, method')->from(TABLE_USERGROUP)->alias('t1')
            ->leftJoin(TABLE_GROUPPRIV)->alias('t2')
            ->on('t1.group = t2.group')
            ->where('t1.account')->eq($user->account);
        $stmt = $sql->query();
        if(!$stmt) return $rights;
        while($row = $stmt->fetch(PDO::FETCH_ASSOC))
        {
            $rights[strtolower($row['module'])][strtolower($row['method'])] = true;
        }

        return $rights;
    }

    /**
     * Keep the user in login state.
     *
     * @param  object $user
     * @access public
     * @return void
     */
    public function keepLogin($user)
    {
        setcookie('keepLogin', 'on', $this->config->cookieLife, $this->config->webRoot);
        setcookie('ra', $user->account, $this->config->cookieLife, $this->config->webRoot);
        setcookie('rp', sha1($user->account . $user->password . $this->server->request_time), $this->config->cookieLife, $this->config->webRoot);
    }

    /**
     * Judge a user is logon or not.
     *
     * @access public
     * @return bool
     */
    public function isLogon()
    {
        return (isset($_SESSION['user']) and !empty($_SESSION['user']) and $_SESSION['user']->account != 'guest');
    }

    /**
     * Judge a user is Online or not.
     *
     * @param  string $account
     * @access public
     * @return bool
     */
    public function isOnline($account)
    {
        $ping = $this->dao->select('ping')->from(TABLE_USER)->where('account')->eq($account)->fetch('ping');
        return (time() - strtotime($ping)) < 60;
    }

    /**
     * Record online status.
     *
     * @access public
     * @return bool
     */
    public function online()
    {
        $this->dao->update(TABLE_USER)->set('ping')->eq(helper::now())->where('account')->eq($this->app->user->account)->exec();
        return true;
    }

     /**
     * Reset the user config
     *
     * @param  string $account
     * @access public
     * @return bool
     */
    public function resetClientConfig($account)
    {
        $this->loadModel('setting')->setItem("$account.user.clientSettings.reset", true);
        return !dao::isError();
    }

    /**
     * Forbid the user
     *
     * @param  string $account
     * @access public
     * @return bool
     */
    public function forbid($account)
    {
        $this->dao->update(TABLE_USER)->set('locked')->eq('2199-12-31 00:00:00')->where('account')->eq($account)->exec();
        return !dao::isError();
    }

    /**
     * Active user
     *
     * @param  string $account
     * @access public
     * @return bool
     */
    public function active($account)
    {
        $this->dao->update(TABLE_USER)->set('fails')->eq(0)->set('locked')->eq(null)->where('account')->eq($account)->exec();
        return !dao::isError();
    }

    /**
     * Delete user.
     *
     * @param  string    $account
     * @param  null      $id          add this param to avoid the warning of php.
     * @access public
     * @return bool
     */
    public function delete($account, $id = null)
    {
        $user = $this->getByAccount($account);
        if(!$user) return false;

        parent::delete(TABLE_USER, $user->id);

        return !dao::isError();
    }

    /**
     * Recover user.
     *
     * @param  string    $account
     * @access public
     * @return bool
     */
    public function recover($account)
    {
        $this->dao->update(TABLE_USER)->set('deleted')->eq('0')->where('account')->eq($account)->exec();
        return !dao::isError();
    }

    /**
     * Create a strong password hash with md5.
     *
     * @param  string    $password
     * @param  string    $account
     * @param  bool      $hashOnce   if the password is already hashed, set to true.
     * @access public
     * @return string
     */
    public function createPassword($password, $account, $hashOnce = false)
    {
        return $hashOnce ? md5($password . $account) : md5(md5($password) . $account);
    }

    /**
     * Compare hash password use random
     *
     * @param  string    $password
     * @param  object    $user
     * @access public
     * @return bool
     */
    public function compareHashPassword($password, $user, $useRandomSalt = true)
    {
        if(!empty($this->config->notEncryptedPwd))
        {
            $password = md5(md5(md5($password) . $user->account) . ($useRandomSalt ? $this->session->random : ''));
        }
        /* Check Hash if password leng is 40. */
        $passwordLength = strlen($password);
        if($passwordLength == 40)
        {
            $hash = sha1($user->account . $user->password . strtotime($user->last));
            if($password == $hash) return true;
        }
        else if($passwordLength == 32)
        {
            $hash = $this->session->random ? md5($user->password . ($useRandomSalt ? $this->session->random : '')) : $user->password;
            if($password == $hash) return true;
        }

        return $password == md5($user->password . ($useRandomSalt ? $this->session->random : ''));
    }

    /**
     * Upload avatar.
     *
     * @param  boolean $lite
     * @access public
     * @return array
     */
    public function uploadAvatar($lite)
    {
        $fileModel = $this->loadModel('file');
        $uploadResult = $fileModel->saveUpload('avatar');
        if(!$uploadResult) return array('result' => 'fail', 'message' => $this->lang->fail);

        $fileIdList = array_keys($uploadResult);
        $file = $this->file->getByID($fileIdList[0]);
        $this->dao->update(TABLE_USER)->set('avatar')->eq($file->fullURL)->where('account')->eq($this->app->user->account)->exec();
        return array('result' => 'success', 'locate' => inlink('cropavatar', "image={$file->id}&lite=$lite"));
    }

    /**
     * Get data in JSON.
     *
     * @param  object    $user
     * @access public
     * @return array
     */
    public function getDataInJSON($user)
    {
        $data                   = array();
        $data['user']           = new stdclass();
        $data['user']->id       = $user->id;
        $data['user']->account  = $user->account;
        $data['user']->email    = $user->email;
        $data['user']->realname = $user->realname;
        $data['user']->gender   = $user->gender;
        $data['user']->dept     = $user->dept;
        $data['user']->role     = $user->role;
        $data['user']->company  = $this->app->company->name;
        $data['user']->avatar   = $user->avatar;

        return $data;
    }

    /**
     * Batch create users.
     *
     * @access public
     * @return array
     */
    public function batchCreate()
    {
        $now        = helper::now();
        $users      = array();
        $errors     = array();
        $accounts   = array();
        $realnames  = array();
        $emails     = array();
        $mobiles    = array();
        $phones     = array();
        $duplicates = array();

        /* Get exist accounts, realnames and emails. */
        $userList = $this->dao->select('account, realname, email, mobile, phone')->from(TABLE_USER)->fetchAll();
        foreach($userList as $user)
        {
            $accounts[$user->account]     = $user->account;
            $realnames[$user->realname]   = $user->realname;
            $emails[$user->email]         = $user->email;
            $mobiles[$user->mobile]       = $user->mobile;
            $phones[$user->phone]         = $user->phone;
        }

        /* Check post data. */
        foreach($this->post->account as $key => $account)
        {
            $realname = $this->post->realname[$key];
            $password = $this->post->password[$key];
            $email    = $this->post->email[$key];
            $mobile   = $this->post->mobile[$key];
            $phone    = $this->post->phone[$key];

            if(!$account && !$realname && !$password) continue;

            /* Check realname. */
            if($realname)
            {
                if(isset($realnames[$realname]))
                {
                    $duplicates[] = 'realname' . $key;

                    $result = isset($this->post->duplicateResult[$key]) ? $this->post->duplicateResult[$key] : '';
                    if($result == 'ignore') continue;

                    if($result == '') $errors['realname' . $key][] = sprintf($this->lang->error->unique, $this->lang->user->realname, $realname);
                }
                $realnames[$realname] = $realname;
            }
            else
            {
                $errors['realname' . $key][] = sprintf($this->lang->error->notempty, $this->lang->user->realname);
            }

            /* Check account. */
            if($account)
            {
                if(!validater::checkAccount($account)) $errors['account' . $key][] = sprintf($this->lang->error->account, $this->lang->user->account);
                if(isset($accounts[$account]))         $errors['account' . $key][] = sprintf($this->lang->error->unique, $this->lang->user->account, $account);
                $accounts[$account] = $account;
            }
            else
            {
                $errors['account' . $key][] = sprintf($this->lang->error->notempty, $this->lang->user->account);
            }

            /* Check password. */
            if($password)
            {
                if(!validater::checkReg($password, '|(.){6,}|')) $errors['password' . $key][] = $this->lang->error->passwordrule;
            }
            else
            {
                $errors['password' . $key][] = sprintf($this->lang->error->notempty, $this->lang->user->password);
            }

            /* Check email. */
            if($email)
            {
                if(!validater::checkEmail($email)) $errors['email' . $key][] = sprintf($this->lang->error->email, $this->lang->user->email);
                if(isset($emails[$email]))         $errors['email' . $key][] = $this->lang->user->errorUnique;

                $emails[$email] = $email;
            }

            /* Check mobile. */
            if($mobile)
            {
                if(!validater::checkMobile($mobile))  $errors['mobile' . $key][] = sprintf($this->lang->error->mobile, $this->lang->user->mobile);
            }

            /* Check phone. */
            if($phone)
            {
                if(!validater::checkTel($phone))      $errors['phone' . $key][] = sprintf($this->lang->error->tel, $this->lang->user->phone);
            }

            if($errors) continue;

            $user = new stdclass();
            $user->account  = $account;
            $user->realname = $realname;
            $user->password = $this->createPassword($password, $account);
            $user->gender   = isset($this->post->gender[$key]) ? $this->post->gender[$key] : 'u';
            $user->dept     = $this->post->dept[$key];
            $user->role     = $this->post->role[$key];
            $user->email    = $email;
            $user->mobile   = $mobile;
            $user->phone    = $phone;
            $user->admin    = 'no';
            $user->join     = $now;

            $users[$key] = $user;
        }

        if($errors) return array('result' => 'fail', 'message' => $errors, 'duplicate' => $duplicates);

        if($this->post->createDept)
        {
            /* Get max order of dept. */
            $maxOrder = $this->dao->select('MAX(`order`) AS maxOrder')->from(TABLE_CATEGORY)
                ->where('grade')->eq(1)
                ->andWhere('type')->eq('dept')
                ->andWhere('deleted')->eq('0')
                ->fetch('maxOrder');
        }

        $userList = array();
        $deptList = array();
        $newUser  = 0;

        /* Create users. */
        foreach($users as $key => $user)
        {
            if(isset($this->post->createDept[$key]))
            {
                $deptName = strip_tags(trim($this->post->deptName[$key]));
                if($deptName)
                {
                    if(isset($deptList[$deptName]))
                    {
                        $user->dept = $deptList[$deptName];
                    }
                    else
                    {
                        /* Create dept by path, supporting hierarchical dept creation. */
                        $user->dept = $this->createDeptByPath($deptName, $now, $maxOrder);
                        $deptList[$deptName] = $user->dept;
                    }

                    $maxOrder++;
                }
            }

            $this->dao->insert(TABLE_USER)->data($user)->exec();
            if(!dao::isError()) $newUser ++;

            $userID = $this->dao->lastInsertID();

            $userList[] = $userID;
        }

        if(dao::isError())
        {
            $daoErrors = dao::getError();

            /* If occurs error, rollback. */
            if($userList)
            {
                $this->dao->delete()->from(TABLE_USER)->where('id')->in($userList)->exec();
            }

            if($deptList) $this->dao->delete()->from(TABLE_CATEGORY)->where('id')->in(array_keys($deptList))->exec();

            return array('result' => 'fail', 'message' => $daoErrors);
        }

        $locate = $this->session->userList ? $this->session->userList : inlink('admin');
        return array('result' => 'success', 'message' => $this->lang->saveSuccess, 'locate' => $locate);
    }

    /**
     * Create department by path string.
     *
     * When dept path contains '/', it will be treated as a hierarchical separator.
     * For example: "/研发/喧喧开发/产品设计组/设计一组" will:
     * 1. Find existing dept "研发/喧喧开发/产品设计组"
     * 2. Create "设计一组" under it if not exists
     *
     * @param  string $deptPath  The department path, e.g. "/研发/喧喧开发/产品设计组/设计一组"
     * @param  string $now       Current datetime
     * @param  int    &$maxOrder Reference to max order value
     * @access private
     * @return int    The created or found department ID
     */
    private function createDeptByPath($deptPath, $now, &$maxOrder)
    {
        $this->loadModel('tree');

        /* Split the path by '/' and filter empty parts. */
        $deptPath = trim($deptPath);
        $parts = array_filter(array_map('trim', explode('/', $deptPath)), function($v) { return $v !== ''; });

        if(empty($parts)) return 0;

        /* Get all existing departments for matching. */
        $existingDepts = $this->dao->select('id, name, parent, grade, path')->from(TABLE_CATEGORY)
            ->where('type')->eq('dept')
            ->andWhere('deleted')->eq('0')
            ->fetchAll('id');

        /* Build a lookup by name under each parent. */
        $deptsByParent = array();
        foreach($existingDepts as $dept)
        {
            if(!isset($deptsByParent[$dept->parent])) $deptsByParent[$dept->parent] = array();
            $deptsByParent[$dept->parent][$dept->name] = $dept;
        }

        $parentId = 0;
        $grade    = 0;
        $path     = ',';

        /* Traverse each part of the path, find existing dept or create new one. */
        foreach($parts as $partName)
        {
            $grade++;
            $partName = strip_tags(trim($partName));

            /* Check if dept with this name exists under current parent. */
            $found = false;
            if(isset($deptsByParent[$parentId]) && isset($deptsByParent[$parentId][$partName]))
            {
                $existingDept = $deptsByParent[$parentId][$partName];
                $parentId = $existingDept->id;
                $grade    = $existingDept->grade;
                $path     = $existingDept->path;
                $found    = true;
            }

            if(!$found)
            {
                /* Create new department under current parent. */
                $dept = new stdclass();
                $dept->name       = $partName;
                $dept->root       = 0;
                $dept->parent     = $parentId;
                $dept->grade      = $grade;
                $dept->order      = $maxOrder;
                $dept->type       = 'dept';
                $dept->postedBy   = $this->app->user->account;
                $dept->postedDate = $now;

                $this->dao->insert(TABLE_CATEGORY)->data($dept)->autoCheck()->exec();
                $newDeptId = $this->dao->lastInsertID();

                /* Update path for the new department. */
                $newPath = $path . $newDeptId . ',';
                $this->dao->update(TABLE_CATEGORY)->set('path')->eq($newPath)->where('id')->eq($newDeptId)->exec();

                /* Update tracking variables. */
                $parentId = $newDeptId;
                $path     = $newPath;

                /* Add to lookup for potential sibling creation in same batch. */
                if(!isset($deptsByParent[$parentId])) $deptsByParent[$parentId] = array();
                $newDept = new stdclass();
                $newDept->id     = $newDeptId;
                $newDept->name   = $partName;
                $newDept->parent = $dept->parent;
                $newDept->grade  = $grade;
                $newDept->path   = $newPath;
                $deptsByParent[$dept->parent][$partName] = $newDept;

                $maxOrder++;
            }
        }

        return $parentId;
    }
}
