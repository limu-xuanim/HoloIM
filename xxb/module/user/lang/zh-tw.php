<?php
/**
 * The user module zh-tw file of XXB.
 *
 * @copyright   Copyright 2009-now 禪道軟件（青島）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     user
 * @link        https://xuanim.com
 */
$lang->user->common    = '成員';
$lang->user->id        = '編號';
$lang->user->account   = '用戶名';
$lang->user->super     = '管理員';
$lang->user->password  = '密碼';
$lang->user->password2 = '重複密碼';
$lang->user->realname  = '真實姓名';
$lang->user->nickname  = '暱稱';
$lang->user->dept      = '所屬部門';
$lang->user->role      = '角色';
$lang->user->avatar    = '頭像';
$lang->user->birthyear = '出生年';
$lang->user->birthday  = '出生日期';
$lang->user->gender    = '性別';
$lang->user->email     = '郵箱';
$lang->user->msn       = 'MSN';
$lang->user->qq        = 'QQ';
$lang->user->yahoo     = '雅虎通';
$lang->user->weixin    = '微信號';
$lang->user->gtalk     = 'Gtalk';
$lang->user->wangwang  = '旺旺';
$lang->user->mobile    = '手機';
$lang->user->phone     = '電話';
$lang->user->dept      = '部門';
$lang->user->address   = '通訊地址';
$lang->user->zipcode   = '郵編';
$lang->user->join      = '加入日期';
$lang->user->visits    = '訪問次數';
$lang->user->ip        = '最後IP';
$lang->user->last      = '最後登錄';
$lang->user->allowTime = '開放時間';
$lang->user->status    = '狀態';
$lang->user->alert     = '您的帳號已被禁用';
$lang->user->keepLogin = '保持登錄';
$lang->user->ignore    = '忽略';
$lang->user->notset    = '未設置';
$lang->user->userType  = '用戶類型';

$lang->user->userTypeList = array('super' => '系統管理員', 'no' => '普通用戶');


$lang->user->lastLoginTime = '上次登錄';
$lang->user->lastLoginIP   = '登錄IP';
$lang->user->editRole      = '維護職位';

$lang->user->unlimited = '無限';

$lang->user->actionWidth = 120;
$lang->user->genderWidth = 100;

$lang->user->pageTitle       = '成員管理';
$lang->user->admin           = '瀏覽成員';
$lang->user->list            = '成員列表';
$lang->user->colleague       = '同事列表';
$lang->user->view            = "成員詳情";
$lang->user->create          = "添加成員";
$lang->user->batchCreate     = "批量添加";
$lang->user->edit            = "編輯成員";
$lang->user->update          = "編輯成員";
$lang->user->delete          = "刪除成員";
$lang->user->browse          = "瀏覽成員";
$lang->user->deny            = "訪問受限";
$lang->user->confirmDelete   = "您確認刪除該成員嗎？";
$lang->user->confirmActivate = "您確認激活該成員嗎？";
$lang->user->relogin         = "重新登錄";
$lang->user->asGuest         = "遊客訪問";
$lang->user->goback          = "返回前一頁";
$lang->user->allUsers        = '全部成員';
$lang->user->submit          = "提交";
$lang->user->confirm         = "確定";
$lang->user->forbid          = '禁用';
$lang->user->forbidList      = '禁用成員列表';
$lang->user->normalList      = '普通成員列表';
$lang->user->deletedList     = '刪除成員列表';
$lang->user->active          = '激活';
$lang->user->recover         = '還原';
$lang->user->setReferer      = '設置referer';
$lang->user->vcard           = '獲取二維碼名片';
$lang->user->uploadAvatar    = '上傳頭像';
$lang->user->cropAvatar      = '裁剪頭像';
$lang->user->cropAvatarTip   = '拖拽選框來選擇頭像裁剪範圍';
$lang->user->goUploadAvatar  = '前往上傳頭像';
$lang->user->lang            = '角色';
$lang->user->adminUser       = '組織';
$lang->user->resetClientConfig    = '重置配置';
$lang->user->resetClientConfigMsg = '操作成功，用戶客戶端配置將在用戶下次登錄進行重置';

$lang->user->profile     = '個人信息';
$lang->user->editProfile = '編輯信息';
$lang->user->thread      = '我的主題';
$lang->user->reply       = '我的回貼';
$lang->user->message     = '我的消息';

$lang->user->avatar                = '個人頭像';
$lang->user->cropAvatarLiteSuccess = '頭像上傳成功';

$lang->user->inputAccount   = '請輸入用戶名';
$lang->user->inputPassword  = '請輸入密碼';
$lang->user->searchUser     = '搜索';

$lang->user->errorDeny     = "抱歉，您無權訪問『<b>%s</b>』模組的『<b>%s</b>』功能。請聯繫管理員獲取權限。點擊後退返回上頁。<br/> 5秒鐘後將自動返迴首頁...";
$lang->user->loginFailed   = "登錄失敗，請檢查您的成員名或密碼是否填寫正確。";
$lang->user->tokenInvalid  = "自動登錄過期，請重新輸入密碼。";
$lang->user->locked        = "成員已經被鎖定，請%s後再重新嘗試登錄";
$lang->user->lockedForEver = "成員已經被永久禁用。";
$lang->user->forbidSuccess = '禁用成功';
$lang->user->actionFail    = '操作失敗';
$lang->user->uploadSuccess = '上傳成功';
$lang->user->actionError   = '操作失敗，原因是 %s 存在該用戶未審批的數據。';
$lang->user->retainAccount = '不能使用 <strong>%s</strong> 作為用戶名。';
$lang->user->errorUnique   = '記錄已存在';

$lang->user->tips = new stdclass();
$lang->user->tips->saveDuplicate   = '不檢查姓名是否重複。';
$lang->user->tips->ignoreDuplicate = '不導入這條數據。';

$lang->user->placeholder= new stdclass();
$lang->user->placeholder->emptyDept = '部門為空不會新建部門';

$lang->user->duplicateResult['save']   = '不檢查';
$lang->user->duplicateResult['ignore'] = '不導入';

$lang->user->import        = '導入';
$lang->user->importResult  = '%s條數據導入成功，%s條數據導入失敗，失敗數據如下：';
$lang->user->failReason    = '原因';

$lang->user->forbidUser = '禁用管理';
$lang->user->operate    = '操作';

$lang->user->genderList = $lang->genderList;

$lang->user->basicInfo   = '基本信息';
$lang->user->contactInfo = '聯繫信息';

$lang->user->statusList = new stdclass();
$lang->user->statusList->locked    = "<label class='label label-danger'>鎖定</label>";
$lang->user->statusList->forbidden = "<label class='label label-danger'>禁用</label>";
$lang->user->statusList->normal    = "<label class='label label-success'>正常</label>";
$lang->user->statusList->deleted    = "<label class='label label-danger'>刪除</label>";

$lang->user->notice = new stdclass();
$lang->user->notice->password = '字母和數字組合，最少六位';

$lang->user->login  = new stdclass();
$lang->user->login->common  = "登錄";

$lang->dept = new stdclass();
$lang->dept->common     = '部門結構';
$lang->dept->name       = '部門名稱';
$lang->dept->alias      = '部門別名';
$lang->dept->edit       = '維護部門';
$lang->dept->parent     = '上級部門';
$lang->dept->children   = '子部門';
$lang->dept->desc       = '描述';
$lang->dept->keywords   = '關鍵詞';
$lang->dept->moderators = '部門經理';

$lang->user->roleList['']           = '';
$lang->user->roleList['dev']        = '研發';
$lang->user->roleList['pm']         = '項目經理';
$lang->user->roleList['market']     = '市場';
$lang->user->roleList['sale']       = '銷售';
$lang->user->roleList['hr']         = '人事';
$lang->user->roleList['office']     = '行政';
$lang->user->roleList['service']    = '客服';
$lang->user->roleList['support']    = '技術支持';
$lang->user->roleList['marketmgr']  = '市場主管';
$lang->user->roleList['salemgr']    = '銷售經理';
$lang->user->roleList['hrmgr']      = '人事主管';
$lang->user->roleList['adminmgr']   = '行政主管';
$lang->user->roleList['servicemgr'] = '客服主管';
$lang->user->roleList['supportmgr'] = '技術支持主管';
$lang->user->roleList['top']        = '高層管理';
$lang->user->roleList['others']     = '其他';
