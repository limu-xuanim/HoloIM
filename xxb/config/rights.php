<?php
/**
 * The config items for rights.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     config
 * @link        https://xuanim.com
 */
/* Init the rights. */
$config->rights = new stdclass();

$config->rights->guest = array();

$config->rights->member['index']['index'] = 'index';

$config->rights->member['user']['profile']        = 'profile';
$config->rights->member['user']['setreferer']     = 'setreferer';
$config->rights->member['user']['uploadavatar']   = 'uploadavatar';

$config->rights->member['user']['cropavatar']     = 'cropavatar';
$config->rights->member['user']['changeavatar']   = 'changeavatar';
$config->rights->member['user']['editself']       = 'editself';

$config->rights->member['file']['buildform']      = 'buildform';
$config->rights->member['file']['ajaxupload']     = 'ajaxupload';
$config->rights->member['file']['browse']         = 'browse';
$config->rights->member['file']['senddownheader'] = 'senddownheader';
$config->rights->member['file']['ajaxpasteimage'] = 'ajaxpasteimage';
$config->rights->member['file']['filemanager']    = 'filemanager';
$config->rights->member['file']['sort']           = 'sort';
