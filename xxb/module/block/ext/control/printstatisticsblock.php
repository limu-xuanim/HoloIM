<?php
class block extends control
{
    /**
     * Get content when block is statistics
     *
     * @param  object    $block
     * @access public
     * @return string
     */
    public function printStatisticsBlock($blockID)
    {
        $block = $this->block->getByID($blockID);
        if(empty($block)) return false;

        $this->loadModel('im');
        $this->app->loadLang('client');

        $this->view->users        = $this->im->userGetCount();
        $this->view->groups       = count($this->im->chatGetGroupPairs());
        $this->view->messages     = $this->im->messageGetCountForBlock();
        $this->view->fileSizeRaw  = $this->loadModel('file')->getXxcAllFileSize();
        $this->view->langClient   = $this->lang->client;

        die($this->fetch('block', 'printstatisticsblock'));
    }
}
