<?php
/**
 * The message module zh-cn file of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     message
 * @link        https://www.xuanim.com
 */

if(!isset($lang->misc)) $lang->misc = new stdclass();

$lang->misc->checkTable  = "Check Repair Data Table";
$lang->misc->needRepair  = "Repair Table";
$lang->misc->repairTable = "The database table may be damaged due to power failure and needs to be checked and repaired! !";
$lang->misc->repairFail  = "The repair fails, please go to the data directory of the database and try to execute <code>myisamchk -r -f %s.MYI</code> to repair.";
$lang->misc->connectFail = "Failed to connect to the database, error: %s, <br/> Please check the mysql error log to troubleshoot the error.";
$lang->misc->tableName   = "TAble Name";
$lang->misc->tableStatus = "Status";

$lang->misc->noticeRepair = "<h5>Ordinary users, please contact the administrator to repair</h5>
    <h5>Administrator, please log in to the server where XXB is located and create the <code>%s</code> file.</h5>
    <p>Notice:</p>
    <ol>
    <li>The file content is empty.</li>
    <li>If the previous file exists, delete it and recreate it.</li>
    </ol>";
