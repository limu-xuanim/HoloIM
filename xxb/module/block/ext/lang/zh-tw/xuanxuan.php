<?php
$lang->block->default['xxb']['1']['title'] = '狀態監控';
$lang->block->default['xxb']['1']['block'] = 'status';
$lang->block->default['xxb']['1']['grid']  = '6';

$lang->block->default['xxb']['2']['title'] = '系統統計';
$lang->block->default['xxb']['2']['block'] = 'statistics';
$lang->block->default['xxb']['2']['grid']  = '6';

$lang->block->list = array();
$lang->block->list['profile']['title']    = '個人資料';
$lang->block->list['profile']['right']    = 'member';
$lang->block->list['status']['title']     = '狀態監控';
$lang->block->list['status']['right']     = 'super';
$lang->block->list['statistics']['title'] = '系統統計';
$lang->block->list['statistics']['right'] = 'super';
$lang->block->list['statistics']['grid']  = '12';

foreach($lang->block->list as $name => $block)
{
    $name = $name . 'BlockTitle';
    $lang->block->$name = $block['title'];
}
