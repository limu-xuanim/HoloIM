<?php
/**
 * The message module zh-cn file of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     message
 * @link        https://xuanim.com
 */

if(!isset($lang->misc)) $lang->misc = new stdclass();

$lang->misc->checkTable  = "检查修复数据表";
$lang->misc->needRepair  = "修复表";
$lang->misc->repairTable = "数据库表可能因为断电原因损坏，需要检查修复！！";
$lang->misc->repairFail  = "修复失败，请到该数据库的数据目录下，尝试执行<code>myisamchk -r -f %s.MYI</code>进行修复。";
$lang->misc->connectFail = "连接数据库失败，错误：%s，<br/> 请检查mysql错误日志，排查错误。";
$lang->misc->tableName   = "表名";
$lang->misc->tableStatus = "状态";

$lang->misc->noticeRepair = "<h5>普通用户请联系管理员进行修复</h5>
    <h5>管理员请登录XXB所在的服务器，创建<code>%s</code>文件。</h5>
    <p>注意：</p>
    <ol>
    <li>文件内容为空。</li>
    <li>如果之前文件存在，删除之后重新创建。</li>
    </ol>";
