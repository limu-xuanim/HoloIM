<?php
/**
 * The tree module zh-tw file of XXB.
 *
 * @copyright   Copyright 2009-now 禪道軟件（青島）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     tree
 * @link        https://xuanim.com
 */
$lang->tree->common        = "部門";
$lang->tree->edit          = "編輯部門";
$lang->tree->children      = "添加部門";
$lang->tree->delete        = "刪除部門";
$lang->tree->browse        = "維護部門";
$lang->tree->manage        = "維護類目";

$lang->tree->noCategories  = '您還沒有添加類目，請添加類目。';
$lang->tree->timeCountDown = "<strong id='countDown'>3</strong> 秒後轉向%s管理頁面。";
$lang->tree->redirect      = '立即轉向';
$lang->tree->hasChildren   = '該分類存在子分類，不能刪除。';
$lang->tree->confirmDelete = "您確定刪除該類目嗎？";
$lang->tree->successFixed  = "成功修復";

/* Lang items for article, products. */
$lang->category = new stdclass();
$lang->category->common   = '類目';
$lang->category->name     = '類目名稱';
$lang->category->alias    = '別名';
$lang->category->parent   = '上級類目';
$lang->category->desc     = '描述';
$lang->category->children = '子類目';
$lang->category->rights   = '權限';
$lang->category->users    = '授權用戶';
$lang->category->groups   = '授權分組';
$lang->category->origin   = '源科目';
$lang->category->target   = '目標科目';

$lang->category->visibleOptions['self']         = '可以查看本部門通訊錄';
$lang->category->visibleOptions['subordinates'] = '可以查看下級部門通訊錄';
$lang->category->visibleOptions['siblings']     = '可以查看兄弟部門通訊錄';
$lang->category->visibleOptions['superiors']    = '可以查看上級部門通訊錄，可向上查看的部門層級為';

$lang->category->visibleTips['subordinates'] = '黃色為當前部門，白色為下級部門';
$lang->category->visibleTips['siblings']     = '同色為兄弟部門';
$lang->category->visibleTips['superiors']    = '黃色為當前部門，藍色為上級部門';

$lang->category->chatOptions['self']               = '部門內可以互相發起聊天';
$lang->category->chatOptions['subordinates']       = '可向下級部門發起聊天';
$lang->category->chatOptions['siblings']           = '兄弟部門可以互相發起聊天';
$lang->category->chatOptions['superiorsOfManager'] = '部門經理可以向上發起聊天，可向上';
$lang->category->chatOptions['superiorsOfMember']  = '部門成員(含部門經理)可以向上發起聊天，可向上';
