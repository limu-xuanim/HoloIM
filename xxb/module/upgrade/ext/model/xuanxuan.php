<?php
/**
 * Get version of xuanxuan.
 *
 * @access public
 * @return string
 */
public function getXuanxuanVersion()
{
    if(!empty($this->config->xuanxuan->global->version)) return $this->config->xuanxuan->global->version;
    $version = $this->loadModel('setting')->getVersion();
    if(!empty($version)) return $version;
    return '1.0';
}

/**
 * Upgrade xuanxuan.
 *
 * @param  string $fromVersion
 * @access public
 * @return void
 */
public function upgradeXuanxuan($fromVersion)
{
    switch($fromVersion)
    {
        default : $this->loadModel('setting')->setItem('system.xuanxuan.global.version', isset($this->config->product) && $this->config->product == 'xxb' ? $this->config->version : $this->config->xuanxuan->version);
    }
}
