<?php
/**
 * The config file of user module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     user
 * @link        https://xuanim.com
 */
$config->user->require = new stdclass();
$config->user->require->create = 'account,realname';
$config->user->require->edit   = 'realname';

$config->user->retainAccount = array('guest', 'default');

$config->user->batchCreateCount = 10;

$config->user->userTabList      = array('normalList', 'forbidList', 'deletedList');
