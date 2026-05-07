<?php
/**
 * The control file of client module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     client
 * @link        https://xuanim.com
 */
class client extends control
{
    /**
     * Check upgrade.
     *
     * @access public
     * @return void
     */
    public function checkUpgrade()
    {
        $currentVersion = $this->client->getCurrentVersion();
        $apiUrl         = sprintf($this->config->client->upgradeApi, "-$currentVersion->version");
        $jsonData       = file_get_contents($apiUrl);
        $serverVersions = json_decode($jsonData, false);

        $this->view->title          = $this->lang->client->checkUpgrade;
        $this->view->serverVersions = $serverVersions;
        $this->view->versions       = $serverVersions;
        $this->view->currentVersion = $currentVersion;
        $this->view->path           = $this->app->dataRoot;
        $this->display();
    }
}
