<?php
/**
 * The tree module zh-cn file of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     tree
 * @link        https://xuanim.com
 */
$lang->tree->common        = "部门";
$lang->tree->edit          = "编辑部门";
$lang->tree->children      = "添加部门";
$lang->tree->delete        = "删除部门";
$lang->tree->browse        = "维护部门";
$lang->tree->manage        = "维护类目";

$lang->tree->noCategories  = '您还没有添加类目，请添加类目。';
$lang->tree->timeCountDown = "<strong id='countDown'>3</strong> 秒后转向%s管理页面。";
$lang->tree->redirect      = '立即转向';
$lang->tree->hasChildren   = '该分类存在子分类，不能删除。';
$lang->tree->confirmDelete = "您确定删除该类目吗？";
$lang->tree->successFixed  = "成功修复";

/* Lang items for article, products. */
$lang->category = new stdclass();
$lang->category->common   = '部门结构';
$lang->category->name     = '类目名称';
$lang->category->alias    = '别名';
$lang->category->parent   = '上级类目';
$lang->category->desc     = '描述';
$lang->category->children = '子部门';
$lang->category->rights   = '权限';
$lang->category->users    = '授权用户';
$lang->category->groups   = '授权分组';
$lang->category->origin   = '源科目';
$lang->category->target   = '目标科目';

$lang->category->visibleOptions['self']         = '可以查看本部门通讯录';
$lang->category->visibleOptions['subordinates'] = '可以查看下级部门通讯录';
$lang->category->visibleOptions['siblings']     = '可以查看兄弟部门通讯录';
$lang->category->visibleOptions['superiors']    = '可以查看上级部门通讯录，可向上查看的部门层级为';

$lang->category->visibleTips['subordinates'] = '黄色为当前部门，白色为下级部门';
$lang->category->visibleTips['siblings']     = '同色为兄弟部门';
$lang->category->visibleTips['superiors']    = '黄色为当前部门，蓝色为上级部门';

$lang->category->chatOptions['self']               = '部门内可以互相发起聊天';
$lang->category->chatOptions['subordinates']       = '可向下级部门发起聊天';
$lang->category->chatOptions['siblings']           = '兄弟部门可以互相发起聊天';
$lang->category->chatOptions['superiorsOfManager'] = '部门经理可以向上发起聊天，可向上';
$lang->category->chatOptions['superiorsOfMember']  = '部门成员(含部门经理)可以向上发起聊天，可向上';
