<?php
/**
 * The model file of mail module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     setting
 * @link        https://xuanim.com
 */
?>
<?php
class settingModel extends model
{
    //-------------------------------- methods for get, set and delete setting items. ----------------------------//

    /**
     * Get value of an item.
     *
     * @param  string   $paramString    see parseItemParam();
     * @param  string   $type
     * @access public
     * @return string
     */
    public function getItem($paramString, $type = 'config')
    {
        return $this->createDAO($this->parseItemParam($paramString, $type), 'select', $type)->fetch('value');
    }

    /**
     * Get some items.
     *
     * @param  string   $paramString    see parseItemParam();
     * @param  string   $type
     * @access public
     * @return array
     */
    public function getItems($paramString, $type = 'config')
    {
        return $this->createDAO($this->parseItemParam($paramString, $type), 'select', $type)->fetchAll('id');
    }

    /**
     * Set value of an item.
     *
     * @param  string      $path     system.sys.common.global.sn or system.sys.common.sn
     * @param  string      $value
     * @param  string      $type
     * @access public
     * @return void
     */
    public function setItem($path, $value = '', $type = 'config')
    {
        $level   = substr_count($path, '.');
        $section = '';
        if($level < 2) return false;
        if($type == 'config')
        {
            if($level == 2) list($owner, $module, $key) = explode('.', $path);
            if($level == 3) list($owner, $module, $section, $key) = explode('.', $path);
        }
        elseif($type == 'lang')
        {
            if($level == 2) return false;
            if($level == 3) list($lang, $module, $key, $system) = explode('.', $path);
            if($level == 4) list($lang, $module, $section, $key, $system) = explode('.', $path);
        }

        $item = new stdclass();

        if($type == 'config')
        {
            $item->owner = $owner;
        }
        elseif($type == 'lang')
        {
            $item->lang   = $lang;
            $item->system = $system;
        }
        $item->module  = $module;
        $item->section = $section;
        $item->key     = $key;
        $item->value   = $value;

        $table = $type == 'config' ? TABLE_CONFIG : TABLE_LANG;
        $this->dao->replace($table)->data($item)->exec();
        return $this->dao->lastInsertID();
    }

    /**
     * Batch set items, the example:
     *
     * $path = 'system.mail';
     * $items->turnon = true;
     * $items->smtp->host = 'localhost';
     *
     * @param  string         $path   like system.sys.mail
     * @param  array|object   $items  the items array or object, can be mixed by one level or two levels.
     * @param  string         $type
     * @access public
     * @return bool
     */
    public function setItems($path, $items, $type = 'config')
    {
        foreach($items as $key => $item)
        {
            if(is_array($item) or is_object($item))
            {
                $section = $key;
                foreach($item as $subKey => $subItem)
                {
                    $this->setItem($path . '.' . $section . '.' . $subKey, $subItem, $type);
                }
            }
            else
            {
                $this->setItem($path . '.' . $key, $item, $type);
            }
        }

        if(!dao::isError()) return true;
        return false;
    }

    /**
     * Delete items.
     *
     * @param  string   $paramString    see parseItemParam();
     * @param  string   $type
     * @access public
     * @return void
     */
    public function deleteItems($paramString, $type = 'config')
    {
        $this->createDAO($this->parseItemParam($paramString, $type), 'delete', $type)->exec();
    }

    /**
     * Parse the param string for select or delete items.
     *
     * @param  string    $paramString     owner=xxx&module=common&key=sn and so on.
     * @param  string    $type
     * @access public
     * @return array
     */
    public function parseItemParam($paramString, $type = 'config')
    {
        /* Parse the param string into array. */
        parse_str($paramString, $params);

        /* Init fields not set in the param string. */
        $fields = 'owner,lang,module,section,key,system';
        $fields = explode(',', $fields);
        foreach($fields as $field) if(!isset($params[$field])) $params[$field] = '';

        return $params;
    }

    /**
     * Create a DAO object to select or delete one or more records.
     *
     * @param  array  $params     the params parsed by parseItemParam() method.
     * @param  string $method     select|delete.
     * @param  string $type
     * @access public
     * @return object
     */
    public function createDAO($params, $method = 'select', $type = 'config')
    {
        $table = $type == 'config' ? TABLE_CONFIG : TABLE_LANG;
        return $this->dao->$method('*')->from($table)->where('1 = 1')
            ->beginIF($type == 'config' and $params['owner'])->andWhere('owner')->in($params['owner'])->fi()
            ->beginIF($type == 'lang' and $params['lang'])->andWhere('lang')->in($params['lang'])->fi()
            ->beginIF($params['module'])->andWhere('module')->in($params['module'])->fi()
            ->beginIF($params['section'])->andWhere('section')->in($params['section'])->fi()
            ->beginIF($params['key'])->andWhere('`key`')->in($params['key'])->fi()
            ->beginIF($type == 'lang' and $params['system'])->andWhere('`system`')->in($params['system'])->fi();
    }

    /**
     * Get config of system and one user.
     *
     * @param  string $account
     * @access public
     * @return array
     */
    public function getSysAndPersonalConfig($account = '')
    {
        $owner   = 'system,' . ($account ? $account : '');
        $records = $this->dao->select('*')->from(TABLE_CONFIG)
            ->where('owner')->in($owner)
            ->orderBy('id')
            ->fetchAll('id');

        if(!$records) return array();

        /* Group records by owner and module. */
        $config = array();
        foreach($records as $record)
        {
            if(!isset($record->module)) return array();    // If no module field, return directly.
            if(empty($record->module)) continue;

            if(!isset($config[$record->owner])) $config[$record->owner] = new stdclass();
            if(!isset($config[$record->owner]->{$record->module})) $config[$record->owner]->{$record->module} = new stdclass();
            if($record->section)
            {
                if(!isset($config[$record->owner]->{$record->module}->{$record->section})) $config[$record->owner]->{$record->module}->{$record->section} = new stdclass();
                $config[$record->owner]->{$record->module}->{$record->section}->{$record->key} = $record;
            }
            else
            {
                $config[$record->owner]->{$record->module}->{$record->key} = $record;
            }
        }
        return $config;
    }

    //-------------------------------- methods for version and sn. ----------------------------//

    /**
     * Get the version of current xxb.
     *
     * Since the version field not saved in db. So if empty, return 1.1.
     *
     * @access public
     * @return void
     */
    public function getVersion()
    {
        $version = isset($this->config->global->version) ? $this->config->global->version : '1.0';    // No version, set as 1.0.
        return $version;
    }

    /**
     * Update version
     *
     * @param  string    $version
     * @access public
     * @return void
     */
    public function updateVersion($version)
    {
        return $this->setItem('system.common.global.version', $version);
    }

    /**
     * Get all lang.
     *
     * @access public
     * @return array
     */
    public function getAllLang()
    {
        $allCustomLang = $this->dao->select('*')->from(TABLE_LANG)->orderBy('lang,id')->fetchAll();

        $currentLang   = $this->app->getClientLang();
        $processedLang = array();
        foreach($allCustomLang as $lang)
        {
            if($lang->lang != $currentLang and $lang->lang != 'all') continue;
            $processedLang[$lang->module][$lang->section][$lang->key] = $lang->value;
        }

        return $processedLang;
    }

    /**
     * Invalidate config cache in xxd server.
     * Used by setting/xuanxuan and groupsetting when system.common.xuanxuan config is saved.
     *
     * @param  array $cacheKeys  array of cache key strings, e.g. ['owner=system&module=common&section=xuanxuan&key=disableSystemGroupChat']
     * @access public
     * @return bool|string  success return true, failure return error message
     */
    public function invalidateXxdConfigCache($cacheKeys)
    {
        if(empty($cacheKeys)) return true;

        $ip         = '127.0.0.1';
        $commonPort = isset($this->config->xuanxuan->commonPort) ? $this->config->xuanxuan->commonPort : '11443';
        $https      = isset($this->config->xuanxuan->https) ? $this->config->xuanxuan->https : 'off';
        $scheme     = ($https == 'on' || $https == '1') ? 'https' : 'http';
        $xxdUrl     = $scheme . '://' . $ip . ':' . $commonPort . '/Invalid';

        $postData = json_encode($cacheKeys);
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $xxdUrl);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
        curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 2);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error    = curl_error($ch);
        curl_close($ch);

        if($error)
        {
            $errorMsg = "CURL error: {$error}, URL: {$xxdUrl}";
            error_log('Failed to invalidate xxd config cache: ' . $errorMsg);
            return $errorMsg;
        }
        if($httpCode != 200)
        {
            $errorMsg = "HTTP status code: {$httpCode}, response: " . substr($response, 0, 200) . ", URL: {$xxdUrl}";
            error_log('Failed to invalidate xxd config cache: ' . $errorMsg);
            return $errorMsg;
        }
        return true;
    }
}
