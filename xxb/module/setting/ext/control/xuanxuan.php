<?php
class setting extends control
{
    /**
     * Configuration of xuanxuan.
     *
     * @param  string $type
     * @access public
     * @return void
     */
    public function xuanxuan($type = '')
    {
        if($type != 'edit' && empty($this->config->xuanxuan->server)) $this->locate(inlink('xuanxuan', 'type=edit'));
        if($type != 'edit' && (!zget($this->config->xuanxuan, 'key', '') or zget($this->config->xuanxuan, 'key', '') == str_repeat(8, 32))) $this->locate(inlink('xuanxuan', 'type=edit'));

        $this->app->loadLang('im');
        if($_POST)
        {
            if(array_key_exists('uploadFileSize', $_POST))
            {
                $errors  = array();
                $setting = fixer::input('post')->get();

                // if(strpos($setting->server, '127.0.0.1') !== false) $errors['server'][] = $this->lang->im->xxdServerError;
                // if(strpos($setting->server, 'https://') !== 0 and strpos($setting->server, 'http://') !== 0) $errors['server'][] = $this->lang->im->xxdSchemeError;
                // if(empty($setting->server)) $errors['server'][] = $this->lang->im->xxdServerEmpty;

                /* Check if value is a valid positive number. (float or int) */
                if(!is_numeric($setting->uploadFileSize) || (int)$setting->uploadFileSize < 0) $errors['uploadFileSize'] = $this->lang->im->xxdFileSizeErr;

                /* Check if value is a valid positive int. */
                if(!(is_numeric($setting->pollingInterval) && is_int($setting->pollingInterval + 0)) || (int)$setting->pollingInterval < 5) $errors['pollingInterval'] = $this->lang->im->xxdPollIntErr;
                if(!(is_numeric($setting->tokenLifetime) && is_int($setting->tokenLifetime  + 0)) || (int)$setting->tokenLifetime < 1) $errors['tokenLifetime'] = $this->lang->im->tokenLifetimeErr;
                if(!(is_numeric($setting->tokenAuthWindow) && is_int($setting->tokenAuthWindow  + 0)) || (int)$setting->tokenAuthWindow < 20) $errors['tokenAuthWindow'] = $this->lang->im->tokenAuthWindowErr;

                if($errors)
                {
                    $this->send(array('result' => 'fail', 'message' => $errors));
                }

                $result = $this->loadModel('setting')->setItems('system.common.xuanxuan', $setting);
                if(!$result)
                {
                    $this->send(array('result' => 'fail', 'message' => dao::getError()));
                }

                $fieldMapping = array('pollingInterval', 'uploadFileSize', 'tokenLifeTime', 'tokenAuthWindow');
                $cacheKeys = array();
                foreach($fieldMapping as $dbKey)
                {
                    $cacheKeys[] = "owner=system&module=common&section=xuanxuan&key=" . $dbKey;
                }
                $invalidateResult = $this->loadModel('setting')->invalidateXxdConfigCache($cacheKeys);
                if($invalidateResult !== true)
                {
                    $this->send(array('result' => 'fail', 'message' => $invalidateResult));
                }

                $this->send(array('result' => 'success', 'message' => $this->lang->saveSuccess, 'locate' => inlink('xuanxuan')));
            }
        }

        if(isset($this->lang->client->menu))
        {
            $this->lang->setting->menu = $this->lang->client->menu;
            $this->lang->menuGroups->setting = 'client';
        }

        $this->view->title  = $this->lang->setting->xuanxuan;
        $this->view->type   = $type;
        $this->display();
    }
}
