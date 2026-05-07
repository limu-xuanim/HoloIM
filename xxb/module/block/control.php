<?php
/**
 * The control file of block module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     block
 * @link        https://xuanim.com
 */
class block extends control
{
    /**
     * Print block.
     *
     * @param  int    $index
     * @access public
     * @return void
     */
    public function printBlock($index)
    {
        $block = $this->block->getBlock($index);
        $this->loadModel('index');

        if(empty($block)) return false;

        $html = '';
        if($block->block == 'html')
        {
            $html = "<div class='article-content'>" . htmlspecialchars_decode($block->params->html) .'</div>';
        }
        elseif($block->block == 'status')
        {
            $html = $this->index->blockStatus($block);
        }
        elseif($block->block == 'statistics')
        {
            $html = $this->index->blockStatistics('block');
        }

        die($html);
    }
}
