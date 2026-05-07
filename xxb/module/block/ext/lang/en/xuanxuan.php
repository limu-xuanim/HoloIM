<?php
$lang->block->default['xxb']['1']['title'] = 'Status';
$lang->block->default['xxb']['1']['block'] = 'status';
$lang->block->default['xxb']['1']['grid']  = '6';

$lang->block->default['xxb']['2']['title'] = 'Statistics';
$lang->block->default['xxb']['2']['block'] = 'statistics';
$lang->block->default['xxb']['2']['grid']  = '6';

$lang->block->list = array();
$lang->block->list['profile']['title']    = 'Profile';
$lang->block->list['profile']['right']    = 'member';
$lang->block->list['status']['title']     = 'Status Monitoring';
$lang->block->list['status']['right']     = 'super';
$lang->block->list['statistics']['title'] = 'System Statistics';
$lang->block->list['statistics']['right'] = 'super';
$lang->block->list['statistics']['grid']  = '12';

/* Add block title for group privleges management */
foreach($lang->block->list as $name => $block)
{
    $name = $name . 'BlockTitle';
    $lang->block->$name = $block['title'];
}
