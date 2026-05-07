<?php
class imUser extends model
{
    /**
     * Auth with username and token. Token is valid for around 30 seconds.
     *
     * @param  string             $account
     * @param  string             $token
     * @param  string             $device
     * @access public
     * @return object|bool|string
     */
    public function identifyWithToken($account, $token, $device = '')
    {
        $tokenAuthWindow = (int)zget($this->config->xuanxuan, 'tokenAuthWindow', 20);
        $now = (int)round(time() / $tokenAuthWindow);
        $token = substr($token, 0, 32); // Use first 32 chars of token.
        $userTokens = $this->dao->select('t1.*, t2.device, t2.token, t2.validUntil')->from(TABLE_USER)->alias('t1')
                ->leftJoin(TABLE_IM_USERDEVICE)->alias('t2')->on('t1.id = t2.user')
                ->where('t1.account')->eq($account)
                ->andWhere('t1.deleted')->eq('0')
                ->beginIF(!empty($device))->andWhere('t2.device')->eq($device)->fi()
                ->andWhere('t2.validUntil', true)->gt(helper::now())
                ->orWhere('t2.validUntil IS NULL')->markRight(1)
                ->fetchAll();

        if(empty($userTokens)) return 'invalid_token';

        foreach($userTokens as $userToken)
        {
            $authTokens = array();
            $authTokens[] = md5($userToken->account . $userToken->token . $now);
            $authTokens[] = md5($userToken->account . $userToken->token . ($now - 1));
            $authTokens[] = md5($userToken->account . $userToken->token . ($now + 1));

            if(in_array($token, $authTokens))
            {
                if($userToken->locked != null)
                {
                    $dateDiff = (strtotime($userToken->locked) - time()) / 60;
                    if($dateDiff > 0) return 'locked';
                }

                $tokenLifetime = zget($this->config->xuanxuan, 'tokenLifetime', 30);
                $tokenLifetime *= 24 * 60 * 60;
                if(strtotime($userToken->validUntil) - time() < $tokenLifetime / 3) $userToken->tokenNeedRenew = true;

                /* Update user data. */
                $updateUser=new stdclass();
                $updateUser->ip     = helper::getRemoteIp();
                $updateUser->last   = helper::now();
                $updateUser->ping   = helper::now();
                $updateUser->fails  = 0;
                $updateUser->visits = ++ $userToken->visits;

                /* Update password when create password by oldCreatePassword function. */
                $this->dao->update(TABLE_USER)->data($updateUser)->where('account')->eq($account)->exec();

                unset($userToken->password);
                unset($userToken->device);
                unset($userToken->token);
                unset($userToken->validUntil);
                return $userToken;
            }
        }

        return 'invalid_token';
    }

    /**
     * Get user list by id or account.
     *
     * @param  string $status
     * @param  array  $characters    can be an array of uids or accounts, single type only.
     * @param  bool   $idAsKey
     * @access public
     * @return array
     */
    public function getList($status = '', $characters = array(), $idAsKey = true)
    {
        $dao = $this->dao->select('id, account, realname, avatar, role, dept, clientStatus, admin, gender, email, mobile, phone, site, qq, deleted, address, weixin')
            ->from(TABLE_USER)
            ->where(1)
            ->beginIF(empty($characters))
            ->andWhere('deleted')->eq('0')
            ->fi()
            ->beginIF($status && $status == 'online')->andWhere('clientStatus')->ne('offline')->fi()
            ->beginIF($status && $status != 'online')->andWhere('clientStatus')->eq($status)->fi()
            ->beginIF($characters &&  is_numeric(current($characters)))->andWhere('id')->in($characters)->fi()
            ->beginIF($characters && !is_numeric(current($characters)))->andWhere('account')->in($characters)->fi();

        $users = $idAsKey ? $dao->fetchAll('id') : $dao->fetchAll();

        return $this->format($users);
    }

    /**
     * Get user count.
     *
     * @access public
     * @return int
     */
    public function getCount()
    {
        return $this->dao->select('COUNT(*)')->from(TABLE_USER)->where('deleted')->eq('0')->fetch('COUNT(*)');
    }

    /**
     * Format users.
     *
     * @param  mixed  $users  object | array
     * @access public
     * @return object | array
     */
    public function format($users)
    {
        $isObject = false;
        if(is_object($users))
        {
            $isObject = true;
            $users    = array($users);
        }

        foreach($users as $user)
        {
            $user->id      = (int)$user->id;
            $user->dept    = (int)$user->dept;
            $user->deleted = isset($user->deleted) ? ((bool)$user->deleted ? 1 : 0) : 0;
            $user->status  = isset($user->clientStatus) ? $user->clientStatus : 0;

            if(isset($user->avatar))  $user->avatar  = (!empty($user->avatar) && substr($user->avatar, 0, 7) !== 'http://' && substr($user->avatar, 0, 8) !== 'https://') ? $this->loadModel('im')->getServer() . $user->avatar : $user->avatar;
            if(!isset($user->signed)) $user->signed  = 0;
        }

        if($isObject) return reset($users);

        return $users;
    }
}
