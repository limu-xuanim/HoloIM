<?php
$user = $this->getByAccount($account);
if(!$user) return false;

model::delete(TABLE_USER, $user->id);

$chatGroupList = $this->dao->select('cgid')->from(TABLE_IM_CHATUSER)->where('user')->eq($user->id)->fetchPairs();
$chatGroupList = array_keys($chatGroupList);
$chatGroupList = array_filter($chatGroupList, function($chat) {return strpos($chat, '&') === false;});
$chatGroupList = array_values($chatGroupList);
if(!empty($chatGroupList))
{
    $this->dao->update(TABLE_IM_CHAT)
        ->set('editedDate')->eq(helper::now())
        ->where('gid')->in($chatGroupList)
        ->exec();
}
// transfer chat group when user deleted
$this->loadModel('im')->chatTransferAllFromUser($user->id);

if(!empty($chatGroupList))
{
    $this->dao->update(TABLE_IM_CHATUSER)
        ->set('quit')->eq(helper::now())
        ->where('user')->eq($user->id)
        ->andWhere('cgid')->in($chatGroupList)
        ->exec();
}

// set one-to-one chat freeze to 1, do not show in recent contacts
$this->dao->update(TABLE_IM_CHATUSER)
    ->set('freeze')->eq('1')
    ->where('user')->eq($user->id)
    ->andWhere('quit IS NULL')
    ->exec();
return !dao::isError();

