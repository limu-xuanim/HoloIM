<?php
class myBlock extends control
{
    /**
     * Get content when block is status
     *
     * @param  object    $block
     * @access public
     * @return string
     */
    public function printStatusBlock($blockID)
    {
        $block = $this->block->getByID($blockID);
        if(empty($block)) return false;

        $this->app->loadLang('client');

        $now             = helper::now();
        $polling         = empty($this->config->xuanxuan->pollingInterval) ? $this->lang->client->noData : $this->config->xuanxuan->pollingInterval . 's';
        $lastPoll        = $this->loadModel('setting')->getItem("owner=system&module=common&section=xxd&key=lastPoll");
        $xxdStatus       = $this->loadModel('im')->getXxdStatus();
        $onlineUserCount = $xxdStatus == 'offline' ? 0 : count($this->loadModel('im')->userGetList('online'));
        $xxdStartDate    = zget($this->config->xxd, 'start', $this->lang->client->noData);

        if(!empty($lastPoll) && $xxdStatus == 'online' && !empty($this->config->xxd) && $polling < 600)
        {
            $xxdRunTime   = $xxdStartDate === $this->lang->client->noData ? $this->lang->client->noData : $this->im->getXxdRunTime(strtotime($now) - strtotime($xxdStartDate));
            $runLabel     = $this->lang->client->xxdRunTime;
            $runValue     = $xxdRunTime;
        }
        else
        {
            $runLabel = $this->lang->client->xxdStartDate;
            $runValue = $xxdStartDate;
        }

        $this->view->langClient       = $this->lang->client;
        $this->view->xxdStatus        = $xxdStatus;
        $this->view->polling          = $polling;
        $this->view->onlineUserCount  = $onlineUserCount;
        $this->view->runLabel         = $runLabel;
        $this->view->runValue         = $runValue;

        die($this->fetch('block', 'printstatusblock'));
    }
}
