<?php
/**
 * The message module zh-tw file of XXB.
 *
 * @copyright   Copyright 2009-now 禪道軟件（青島）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     message
 * @link        https://xuanim.com
 */

if(!isset($lang->misc)) $lang->misc = new stdclass();

$lang->misc->checkTable  = "檢查修復數據表";
$lang->misc->needRepair  = "修復表";
$lang->misc->repairTable = "數據庫表可能因為斷電原因損壞，需要檢查修復！！";
$lang->misc->repairFail  = "修復失敗，請到該數據庫的數據目錄下，嘗試執行<code>myisamchk -r -f %s.MYI</code>進行修復。";
$lang->misc->connectFail = "連接數據庫失敗，錯誤：%s，<br/> 請檢查mysql錯誤日誌，排查錯誤。";
$lang->misc->tableName   = "表名";
$lang->misc->tableStatus = "狀態";

$lang->misc->noticeRepair = "<h5>普通用戶請聯繫管理員進行修復</h5>
    <h5>管理員請登錄XXB所在的服務器，創建<code>%s</code>文件。</h5>
    <p>注意：</p>
    <ol>
    <li>文件內容為空。</li>
    <li>如果之前文件存在，刪除之後重新創建。</li>
    </ol>";
