<?php
$lang->block->default['xxb']['1']['title'] = '状态监控';
$lang->block->default['xxb']['1']['block'] = 'status';
$lang->block->default['xxb']['1']['grid']  = '6';

$lang->block->default['xxb']['2']['title'] = '系统统计';
$lang->block->default['xxb']['2']['block'] = 'statistics';
$lang->block->default['xxb']['2']['grid']  = '6';

$lang->block->list = array();
$lang->block->list['profile']['title']    = '个人资料';
$lang->block->list['profile']['right']    = 'member';
$lang->block->list['status']['title']     = '状态监控';
$lang->block->list['status']['right']     = 'super';
$lang->block->list['statistics']['title'] = '系统统计';
$lang->block->list['statistics']['right'] = 'super';
$lang->block->list['statistics']['grid']  = '12';
/* Add block title for group privleges management */
foreach($lang->block->list as $name => $block)
{
    $name = $name . 'BlockTitle';
    $lang->block->$name = $block['title'];
}
