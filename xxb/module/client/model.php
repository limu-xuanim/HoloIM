<?php
/**
 * The model file of client module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     client
 * @link        https://xuanim.com
 */
class clientModel extends model
{
    /**
     * Get current version
     * @access public
     * @return object | bool
     */
    public function getCurrentVersion()
    {
        $currentVersion = $this->dao->select('*')->from(TABLE_IM_CLIENT)->where('status')->eq('released')->orderBy('id_desc')->limit(1)->fetch();

        if(dao::isError()) return false;
        return $currentVersion ?: json_decode('{"version": "'.$this->config->xuanxuan->version.'"}');
    }
}
