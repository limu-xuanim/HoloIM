<?php
/**
 * The all avaliabe actions in XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     group
 * @link        https://xuanim.com
 */

/* Module order. */
$lang->moduleOrder[20] = 'group';
$lang->moduleOrder[25] = 'file';
$lang->moduleOrder[30] = 'setting';
$lang->moduleOrder[35] = 'tree';
$lang->moduleOrder[40] = 'user';

$lang->resource = new stdclass();

/* Group. */
$lang->resource->group = new stdclass();
$lang->resource->group->browse       = 'browse';
$lang->resource->group->create       = 'create';
$lang->resource->group->edit         = 'edit';
$lang->resource->group->delete       = 'delete';
$lang->resource->group->managemember = 'manageMember';
$lang->resource->group->managepriv   = 'managePriv';

if(!isset($lang->group))              $lang->group = new stdClass();
if(!isset($lang->group->methodOrder)) $lang->group->methodOrder = array();
$lang->group->methodOrder[5]  = 'browse';
$lang->group->methodOrder[10] = 'create';
$lang->group->methodOrder[15] = 'edit';
$lang->group->methodOrder[20] = 'delete';
$lang->group->methodOrder[25] = 'managemember';
$lang->group->methodOrder[30] = 'managepriv';

/* Setting. */
$lang->resource->setting = new stdclass();
$lang->resource->setting->lang     = 'lang';
$lang->resource->setting->xuanxuan = 'xuanxuan';

if(!isset($lang->setting))              $lang->setting = new stdClass();
if(!isset($lang->setting->methodOrder)) $lang->setting->methodOrder = array();
$lang->setting->methodOrder[5]  = 'lang';
$lang->setting->methodOrder[10] = 'xuanxuan';

/* File. */
$lang->resource->file = new stdclass();
$lang->resource->file->upload   = 'upload';
$lang->resource->file->download = 'download';
$lang->resource->file->edit     = 'edit';
$lang->resource->file->delete   = 'delete';

if(!isset($lang->file))              $lang->file = new stdClass();
if(!isset($lang->file->methodOrder)) $lang->file->methodOrder = array();
$lang->file->methodOrder[5]  = 'upload';
$lang->file->methodOrder[10] = 'download';
$lang->file->methodOrder[15] = 'edit';
$lang->file->methodOrder[20] = 'delete';

/* Tree. */
$lang->resource->tree = new stdclass();
$lang->resource->tree->browse   = 'browse';
$lang->resource->tree->edit     = 'edit';
$lang->resource->tree->children = 'children';
$lang->resource->tree->delete   = 'delete';

if(!isset($lang->tree))              $lang->tree = new stdClass();
if(!isset($lang->tree->methodOrder)) $lang->tree->methodOrder = array();
$lang->tree->methodOrder[5]  = 'browse';
$lang->tree->methodOrder[10] = 'edit';
$lang->tree->methodOrder[15] = 'children';
$lang->tree->methodOrder[20] = 'delete';

/* User. */
$lang->resource->user = new stdclass();
$lang->resource->user->admin       = 'admin';
$lang->resource->user->create      = 'create';
$lang->resource->user->edit        = 'edit';
$lang->resource->user->delete      = 'delete';
$lang->resource->user->forbid      = 'forbid';
$lang->resource->user->active      = 'active';
$lang->resource->user->recover     = 'recover';
$lang->resource->user->batchcreate = 'batchCreate';

if(!isset($lang->user))              $lang->user = new stdClass();
if(!isset($lang->user->methodOrder)) $lang->user->methodOrder = array();
$lang->user->methodOrder[5]  = 'admin';
$lang->user->methodOrder[10] = 'create';
$lang->user->methodOrder[15] = 'batchcreate';
$lang->user->methodOrder[20] = 'import';
$lang->user->methodOrder[25] = 'edit';
$lang->user->methodOrder[30] = 'delete';
$lang->user->methodOrder[35] = 'forbid';
$lang->user->methodOrder[40] = 'active';
