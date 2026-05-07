<?php
/**
 * The config file of block module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     block
 * @link        https://xuanim.com
 */
$config->block->editor = new stdclass();
$config->block->editor->set = array('id' => 'html', 'tools' => 'simple');

$config->block->gridOptions[6]  = '1/2';
$config->block->gridOptions[4]  = '1/3';
$config->block->gridOptions[8]  = '2/3';
$config->block->gridOptions[3]  = '1/4';
$config->block->gridOptions[9]  = '3/4';
$config->block->gridOptions[12] = '100%';
