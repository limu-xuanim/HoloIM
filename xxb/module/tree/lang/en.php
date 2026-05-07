<?php
/**
 * The tree category zh-cn file of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     tree
 * @link        https://www.xuanim.com
 */
$lang->tree->common      = "Dept";
$lang->tree->add         = "Add";
$lang->tree->edit        = "Edit";
$lang->tree->children    = "Add Child";
$lang->tree->delete      = "Delete";
$lang->tree->browse      = "Manage Department";
$lang->tree->manage      = "Manage";

$lang->tree->noCategories  = 'No category yet. Add one first.';
$lang->tree->timeCountDown = "Jump to %s to manage the page in <strong id='countDown'>3</strong> seconds.";
$lang->tree->redirect      = 'Create now';
$lang->tree->hasChildren   = "This category has children, so it can't be deleted.";
$lang->tree->confirmDelete = "Do you want to delete it?";
$lang->tree->successFixed  = "Fixed.";

/* Lang items for article, products. */
$lang->category = new stdclass();
$lang->category->common   = 'Category';
$lang->category->name     = 'Name';
$lang->category->alias    = 'Alias';
$lang->category->parent   = 'Parent';
$lang->category->desc     = 'Description';
$lang->category->children = "Child";
$lang->category->rights   = 'Privilege';
$lang->category->users    = 'Users';
$lang->category->groups   = 'Groups';
$lang->category->origin   = 'Origin Category';
$lang->category->target   = 'Target Category';

$lang->category->visibleOptions['self']         = 'Can view self department address book';
$lang->category->visibleOptions['subordinates'] = 'Can view subordinates department address book';
$lang->category->visibleOptions['siblings']     = 'Can view siblings department address book';
$lang->category->visibleOptions['superiors']    = 'Can view superiors department address book, can view up to';

$lang->category->visibleTips['subordinates'] = 'Yellow is the current department, white is the subordinate department';
$lang->category->visibleTips['siblings']     = 'Same color is the sibling department';
$lang->category->visibleTips['superiors']    = 'Yellow is the current department, blue is the superior department';

$lang->category->chatOptions['self']               = 'Department members can initiate chats with each other';
$lang->category->chatOptions['subordinates']       = 'Can initiate a chat with subordinate departments';
$lang->category->chatOptions['siblings']           = 'Sibling departments can initiate chats with each other';
$lang->category->chatOptions['superiorsOfManager'] = 'Department managers can initiate chats with upper-level departments, up to';
$lang->category->chatOptions['superiorsOfMember']  = 'Department members (including department managers) can initiate chats with upper-level departments, up to';
