<?php
/**
 * The sys app router file of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     XXB
 * @link        https://xuanim.com
 */
/* Set the error reporting. */
error_reporting(E_ALL);

/* Start output buffer. */
ob_start();

/* Define the run mode as front. */
define('RUN_MODE', 'front');

/* Load the framework. */
include '../framework/router.class.php';
include '../framework/control.class.php';
include '../framework/model.class.php';
include '../framework/helper.class.php';

/* Log the time and define the run mode. */
$startTime = getTime();

/* Run the app. */
$app = router::createApp('xxb', dirname(dirname(__FILE__)));

/* installed or not. */
// if(!isset($config->installed) or !$config->installed) die(header('location: install.php'));

$common = $app->loadCommon();

/* Check the reqeust is getconfig or not. */
if(isset($_GET['mode']) && $_GET['mode'] == 'getconfig') die(helper::removeUTF8Bom($app->exportConfig()));

/* Parse request first so we can know current module/method. */
$app->parseRequest();

/* Check for need upgrade. */
/* Requests for index-permissions (module=index, method=permissions) should be allowed even when upgrade is required. */
if(RUN_MODE != 'upgrade')
{
    $module = $app->getModuleName();
    $method = $app->getMethodName();
    if(!($module == 'index' && $method == 'permissions'))
    {
        $config->installedVersion = $common->loadModel('setting')->getVersion();
        if(version_compare($config->version, $config->installedVersion, '>'))
        {
            die(header('location: ' . commonModel::getSysURL() . $config->webRoot . 'ux.php'));
        }
    }
}

$common->checkPriv();
$app->loadModule();

/* Flush the buffer. */
echo helper::removeUTF8Bom(ob_get_clean());
