<?php
class imChat extends model
{
    /**
     * Get group pairs of all chat.
     *
     * @access public
     * @return array
     */
    public function getGroupPairs()
    {
        return $this->dao->select('gid, name')->from(TABLE_IM_CHAT)
            ->where('type')->eq('group')
            ->andWhere('dismissDate IS NULL')
            ->fetchPairs();
    }

    /**
     * Init the system chat.
     *
     * @access public
     * @return bool
     */
    public function initSystemChat()
    {
        if(!isset($this->config->disableSystemGroupChat) || !$this->config->disableSystemGroupChat)
        {
            $chat = $this->dao->select('*')->from(TABLE_IM_CHAT)->where('type')->eq('system')->fetch();
            if(!$chat)
            {
                $chat = new stdclass();
                $chat->gid         = imModel::createGID();
                $chat->name        = $this->lang->im->systemGroup;
                $chat->type        = 'system';
                $chat->createdBy   = 'system';
                $chat->createdDate = helper::now();

                $this->dao->insert(TABLE_IM_CHAT)->data($chat)->exec();
            }
            return !dao::isError();
        }
        return true;
    }

    /**
     * Get chats owned by given user.
     *
     * @param  int    $userID
     * @param  bool   $format
     * @access public
     * @return array
     */
    public function getOwnedListForUser($userID, $format = true)
    {
        $account = $this->dao->select('account')->from(TABLE_USER)->where('id')->eq($userID)->fetch('account');
        $chats = $this->dao->select('*')->from(TABLE_IM_CHAT)
            ->where('type')->eq('group')
            ->andWhere('dismissDate IS NULL')
            ->andWhere('mergedDate IS NULL')
            ->andWhere('ownedBy', true)->eq($account)
            ->orWhere('ownedBy')->eq('')
            ->andWhere('createdBy')->eq($account)
            ->markRight(1)
            ->fetchAll();
        return $format ? $this->format($chats) : $chats;
    }

    /**
     * Format chats.
     *
     * @param  mixed  $chats  object | array
     * @access public
     * @return object | array
     */
    public function format($chats, $getLastMessage = false)
    {
        $isObject = false;
        if(is_object($chats))
        {
            $isObject = true;
            $chats    = array($chats);
        }

        $userID = $this->app->session->userID;

        foreach($chats as $chat)
        {
            if(!$chat) continue;
            $chat->id              = (int)$chat->id;
            $chat->subject         = (int)$chat->subject;
            $chat->createdDate     = $chat->createdDate == null ? 0 : strtotime($chat->createdDate);
            $chat->editedDate      = $chat->editedDate == null ? 0 : strtotime($chat->editedDate);
            $chat->lastActiveTime  = $chat->lastActiveTime == null ? 0 : strtotime($chat->lastActiveTime);
            $chat->dismissDate     = $chat->dismissDate == null ? 0 : strtotime($chat->dismissDate);
            $chat->mergedDate      = $chat->mergedDate == null ? 0 : strtotime($chat->mergedDate);
            $chat->archiveDate     = $chat->archiveDate == null ? 0 : strtotime($chat->archiveDate);
            $chat->lastMessage     = (int)$chat->lastMessage;
            $chat->admins          = array_values(array_map('intval', array_filter(explode(',', $chat->admins))));
            $chat->pinnedMessages  = array_values(array_map('intval', array_filter(explode(',', $chat->pinnedMessages))));
            $chat->mergedChats     = array_values(array_filter(explode(',', $chat->mergedChats)));
            $chat->avatar          = json_decode($chat->avatar);

            if(isset($chat->avatar) && $chat->avatar->type === 'image')
            {
                $chat->avatar->data->imgUrl = $this->loadModel('im')->getServer() . $chat->avatar->data->imgUrl;
            }

            if($getLastMessage && isset($chat->lastMessage)) $chat->lastMessageInfo = current($this->loadModel('im')->messageGetList($chat->gid, array($chat->lastMessage)));
            if(empty($chat->lastMessageInfo))  $chat->lastMessageInfo = null;
            if(!empty($chat->lastMessageInfo)) $chat->lastMessageInfo->senderId = intval($chat->lastMessageInfo->user);
            if(isset($chat->lastReadMessageIndex)) $chat->lastReadMessageIndex = (int)$chat->lastReadMessageIndex;

            if($chat->type == 'one2one' && $chat->gid != "$userID&$userID") $chat->name = '';

            if(isset($chat->star))            $chat->star   = (bool)$chat->star;
            if(isset($chat->hide))            $chat->hide   = (bool)$chat->hide;
            if(isset($chat->mute))            $chat->mute   = (bool)$chat->mute;
            if(isset($chat->public))          $chat->public = (bool)$chat->public;
            if(isset($chat->freeze))          $chat->freeze = (bool)$chat->freeze;
            if(isset($chat->lastReadMessage)) $chat->lastReadMessage = (int)$chat->lastReadMessage;
            if(isset($chat->adminInvite))     $chat->adminInvite = (bool)$chat->adminInvite;

            if($chat->archiveDate) {
                $chat->star = false;
                $chat->hide = false;
                $chat->mute = false;
                $chat->freeze = false;
            }
        }

        if($isObject) return reset($chats);

        return $chats;
    }

    /**
     * Get next owner candidate for chat. (Seniormost user other than current owner)
     *
     * @param  object     $chat
     * @param  int        $userID     current owner user id
     * @param  bool       $asAccount  will return id if set to false
     * @access public
     * @return int|string
     */
    public function getNextOwnerCandidate($chat, $userID, $asAccount = true)
    {
        if(!empty($chat->admins))
        {
            $seniormostAdmin = $this->dao->select($asAccount ? 'account' : 'user')->from(TABLE_IM_CHATUSER)->alias('tcu')
                ->leftJoin(TABLE_USER)->alias('tu')->on('tcu.user=tu.id')
                ->where('tcu.cgid')->eq($chat->gid)
                ->andWhere('tcu.quit IS NULL')
                ->andWhere('tcu.user')->in($chat->admins)
                ->andWhere('tcu.user')->ne($userID)
                ->andWhere('tu.deleted')->eq('0')
                ->orderBy('tcu.join_asc')
                ->limit(1)
                ->fetch($asAccount ? 'account' : 'user');
            if(!empty($seniormostAdmin)) return $seniormostAdmin;
        }
        return $this->dao->select($asAccount ? 'account' : 'user')->from(TABLE_IM_CHATUSER)->alias('tcu')
            ->leftJoin(TABLE_USER)->alias('tu')->on('tcu.user=tu.id')
            ->where('tcu.cgid')->eq($chat->gid)
            ->andWhere('tcu.quit IS NULL')
            ->andWhere('tcu.user')->ne($userID)
            ->andWhere('tu.deleted')->eq('0')
            ->orderBy('tcu.join_asc')
            ->limit(1)
            ->fetch($asAccount ? 'account' : 'user');
    }

    /**
     * Transfer all chats from user to next candidate if possible.
     *
     * @param  int    $userID
     * @access public
     * @return bool
     */
    public function transferAllFromUser($userID)
    {
        $userChats = $this->getOwnedListForUser($userID);

        $chatOwnerPairs = array();
        foreach($userChats as $chat) $chatOwnerPairs[$chat->gid] = $this->getNextOwnerCandidate($chat, $userID);
        $chatOwnerPairs = array_filter($chatOwnerPairs);
        if(empty($chatOwnerPairs)) return true;

        $queryData = array();
        foreach($chatOwnerPairs as $cgid => $owner) $queryData[] = "WHEN '$cgid' THEN '$owner'";
        $cgids = array_keys($chatOwnerPairs);

        $query = "UPDATE " . TABLE_IM_CHAT . " SET `ownedBy` = (CASE `gid` " . join(' ', $queryData) . " END) WHERE `gid` IN('" . join('\',\'', $cgids) . "');";
        $this->dao->query($query);

        return !!dao::isError();
    }
}