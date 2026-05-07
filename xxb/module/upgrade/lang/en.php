<?php
/**
 * The upgrade module English file of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     upgrade
 * @link        https://www.xuanim.com
 */
$lang->upgrade = new stdclass();
$lang->upgrade->common  = 'Upgrade';

$lang->upgrade->result  = 'Result';
$lang->upgrade->fail    = 'Failed';
$lang->upgrade->success = 'Success';
$lang->upgrade->tohome  = 'Back';

$lang->upgrade->index         = 'Check if the upgrade procedure can be performed.';
$lang->upgrade->backup        = 'Back Up';
$lang->upgrade->selectVersion = 'Select version to upgrade';
$lang->upgrade->confirm       = 'Confirm the SQL to be excuted.';
$lang->upgrade->execute       = 'Execute';
$lang->upgrade->next          = 'Next';
$lang->upgrade->redeploy      = 'Please redeploy the App directory before upgrade.';
$lang->upgrade->redeployDesc  = "<h5>For code changes, the App directory has to be deployed.</h5><div class='text-important'>operating steps : delete app directory before copy new package.</div>";
$lang->upgrade->removeTodo    = 'Please remove %s directory before upgrading.';
$lang->upgrade->removeTodoTip = "<h5>For code changes, %s directory has to be removed.</h5><div class='text-important'>operating steps : delete directory of %s.</div>";

$lang->upgrade->backupData = <<<EOT
<pre>
<strong>Using phpMyAdmin or mysqldump to back up the database.</strong>
<code class='red'>$ mysqldump -u %s</span> -p%s %s > xxb.sql</code>
</pre>
EOT;

$lang->upgrade->versionNote = "Please choose the version to upgrade.";

$lang->upgrade->deleteTips    = 'You have to delete some files. The commands in Linux are:<br />';
$lang->upgrade->deleteDir     = '<code>rm -fr %s</code>';
$lang->upgrade->deleteFile    = '<code>rm %s</code>';
$lang->upgrade->deleteWinTips = 'You have to delete some files.<br />';
$lang->upgrade->deleteWinFile = '<code>%s</code>';
$lang->upgrade->afterDeleted  = '<br />Refresh after delete.';

include 'version.php';
