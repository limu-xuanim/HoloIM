<?php
class myBlock extends control
{
    public function printProfileBlock($blockID)
    {
        $block = $this->block->getByID($blockID);
        if(empty($block)) return false;

        $this->app->loadLang('user');

        $this->view->user       = $this->loadModel('user')->getByAccount($this->app->user->account);
        $this->view->langUser   = $this->lang->user;
        $this->view->profileUrl = helper::createLink('user', 'profile');

        die($this->fetch('block', 'printprofileblock'));
    }
}
