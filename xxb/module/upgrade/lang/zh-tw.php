<?php
/**
 * The upgrade module zh-tw file of XXB.
 *
 * @copyright   Copyright 2009-now 禪道軟件（青島）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     upgrade
 * @link        https://xuanim.com
 */
$lang->upgrade = new stdclass();
$lang->upgrade->common  = '升級';

$lang->upgrade->result  = '升級結果';
$lang->upgrade->fail    = '升級失敗';
$lang->upgrade->success = '升級成功';
$lang->upgrade->tohome  = '返迴首頁';

$lang->upgrade->index         = '檢查是否可以執行升級程序';
$lang->upgrade->backup        = '備份數據';
$lang->upgrade->selectVersion = '確認升級之前的版本';
$lang->upgrade->confirm       = '確認要執行的SQL語句';
$lang->upgrade->execute       = '確認執行';
$lang->upgrade->next          = '下一步';
$lang->upgrade->redeploy      = '請重新部署app檔案夾後繼續';
$lang->upgrade->redeployDesc  = "<h5>因為代碼結構調整,需要重新部署app目錄。</h5><div class='text-important'>操作方法:刪除舊的app目錄，再從新的安裝包裡面複製app檔案夾。</div>";
$lang->upgrade->removeTodo    = '請刪除 %s 檔案夾後繼續';
$lang->upgrade->removeTodoTip = "<h5>因為代碼結構調整,需要刪除%s目錄。</h5><div class='text-important'>操作方法:刪除舊的%s檔案夾。</div>";

$lang->upgrade->backupData = <<<EOT
<pre>
<strong>使用phpMyAdmin或者mysqldump命令備份資料庫。</strong>
<code class='red'>$ mysqldump -u %s</span> -p%s %s > xxb.sql</code>
</pre>
EOT;

$lang->upgrade->versionNote = "務必選擇正確的版本，否則會造成數據丟失。";

$lang->upgrade->deleteTips    = '需要刪除部分檔案。linux下面命令為：<br />';
$lang->upgrade->deleteDir     = '<code>rm -fr %s</code>';
$lang->upgrade->deleteFile    = '<code>rm %s</code>';
$lang->upgrade->deleteWinTips = '需要刪除部分檔案。<br />';
$lang->upgrade->deleteWinFile = '<code>%s</code>';
$lang->upgrade->afterDeleted  = '<br />刪除以上檔案後刷新！';

include 'version.php';
