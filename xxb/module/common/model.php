<?php
/**
 * The model file of common module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     common
 * @link        https://xuanim.com
 */
class commonModel extends model
{
    /**
     * Do some init functions.
     *
     * @access public
     * @return void
     */
    public function __construct($appName = '')
    {
        parent::__construct($appName);
        $this->startSession();
        $this->setUser();
        $this->loadConfigFromDB();
        if(!$this->checkIP()) die($this->lang->ipLimited);
        $this->loadLangFromDB();
    }

    /**
     * Load configs from database and save it to config->system and config->personal.
     *
     * @access public
     * @return void
     */
    public function loadConfigFromDB()
    {
        /* Upgrade to 2.5.1 rename table. */
        $version      = $this->config->version;
        $prefix       = $this->config->db->prefix;

        /* Get configs of system and current user. */
        $account = isset($this->app->user->account) ? $this->app->user->account : '';
        if(!empty($this->config->db->name)) $config = $this->loadModel('setting')->getSysAndPersonalConfig($account);
        $this->config->system   = isset($config['system']) ? $config['system'] : new stdclass();
        $this->config->personal = isset($config[$account]) ? $config[$account] : new stdclass();

        foreach($this->config->system as $module => $records)
        {
            /* Overide the items defined in config/config.php and config/my.php. */
            if(!isset($this->config->$module)) $this->config->$module = new stdclass();
            if(isset($this->config->system->$module)) helper::mergeConfig($this->config->system->$module, $module);
        }

        foreach($this->config->personal as $module => $records)
        {
            /* Overide the items defined in config/config.php and config/my.php. */
            if(!isset($this->config->$module)) $this->config->$module = new stdclass();
            if(isset($this->config->personal->$module)) helper::mergeConfig($this->config->personal->$module, $module);
        }
        /* Overide the items defined in config/config.php and config/my.php. */
        if(isset($this->config->system->common)) helper::mergeConfig($this->config->system->common, 'common');
        if(isset($this->config->personal->common)) helper::mergeConfig($this->config->personal->common, 'common');
    }

    /**
     * Load custom lang from DB.
     *
     * @access public
     * @return void
     */
    public function loadLangFromDB()
    {
        if(!$this->config->db->name) return;
        $records = $this->loadModel('setting')->getAllLang();
        if(!$records) return;
        $this->lang->db = new stdclass();
        $this->lang->db->custom = $records;
    }

    /**
     * Start the session.
     *
     * @access public
     * @return void
     */
    public function startSession()
    {
        if(!defined('SESSION_STARTED'))
        {
            $sessionName = $this->config->sessionVar;
            if(isset($_GET[$sessionName])) session_id($_GET[$sessionName]);
            session_name($sessionName);
            session_start();
            define('SESSION_STARTED', true);
        }
    }

    /**
     * Check the Privilege.
     *
     * @access public
     * @return void
     */
    public function checkPriv()
    {
        if(!empty($this->config->group->unUpdatedAccounts) and strpos($this->config->group->unUpdatedAccounts, $this->app->user->account) !== false)
        {
            $user = $this->app->user;
            $user->rights = $this->loadModel('user')->authorize($user);
            $this->session->set('user', $user);
            $this->app->user = $this->session->user;

            $unUpdatedAccounts = str_replace($this->app->user->account, '', $this->config->group->unUpdatedAccounts);
            if(str_replace(',', '', $unUpdatedAccounts) == '') $unUpdatedAccounts = '';
            $this->loadModel('setting')->setItem("system.sys.group.unUpdatedAccounts", $unUpdatedAccounts);
        }

        $module = $this->app->getModuleName();
        $method = $this->app->getMethodName();

        if($this->isOpenMethod($module, $method)) return true;

        /* Try to identify by cookie if not login. */
        if(!$this->loadModel('user')->isLogon() and $this->cookie->keepLogin == 'on') $this->user->identifyByCookie();

        /* If no $app->user yet, go to the login pae. */
        if($this->app->user->account == 'guest')
        {
            $referer  = helper::safe64Encode($this->app->getURI(true));
            die(js::locate(helper::createLink('user', 'login', "referer=$referer")));
        }

        /* Check the Privilege. */
        if(!commonModel::hasPriv($module, $method)) $this->deny($module, $method);
    }

    /**
     * Check current user has Privilege to the module's method or not.
     *
     * @param mixed $module     the module
     * @param mixed $method     the method
     * @static
     * @access public
     * @return bool
     */
    public static function hasPriv($module, $method)
    {
        global $app;


        if($app->user->admin == 'super') return true;

        if(RUN_MODE == 'admin') return false;

        $rights = $app->user->rights;
        if(isset($rights[strtolower($module)][strtolower($method)])) return true;

        return false;
    }

    /**
     * Check whether IP in white list.
     *
     * @access public
     * @return bool
     */
    public function checkIP()
    {
        $ip = $this->server->remote_addr;

        $ipWhiteList = $this->config->ipWhiteList;

        /* If the ip white list is '*'. */
        if($ipWhiteList == '*') return true;

        /* The ip is same as ip in white list. */
        if($ip == $ipWhiteList) return true;

        /* If the ip in white list is like 192.168.1.1-192.168.1.10. */
        if(strpos($ipWhiteList, '-') !== false)
        {
            list($min, $max) = explode('-', $ipWhiteList);
            $min = ip2long(trim($min));
            $max = ip2long(trim($max));
            $ip  = ip2long(trim($ip));

            return $ip >= $min and $ip <= $max;
        }

        /* If the ip in white list is in IP/CIDR format eg 127.0.0.1/24. Thanks to zcat. */
        if(strpos($ipWhiteList, '/') == false) $ipWhiteList .= '/32';
        list($ipWhiteList, $netmask) = explode('/', $ipWhiteList, 2);

        $ip          = ip2long($ip);
        $ipWhiteList = ip2long($ipWhiteList);
        $wildcard    = pow(2, (32 - $netmask)) - 1;
        $netmask     = ~ $wildcard;

        return (($ip & $netmask) == ($ipWhiteList & $netmask));
    }

    /**
     * Show the deny info.
     *
     * @param mixed $module     the module
     * @param mixed $method     the method
     * @access public
     * @return void
     */
    public function deny($module, $method)
    {
        if(helper::isAjaxRequest())
        {
            $this->app->loadLang($module);
            $this->app->loadLang('user');
            $moduleName = isset($this->lang->$module->common)  ? $this->lang->$module->common:  $module;
            $methodName = isset($this->lang->$module->$method) ? $this->lang->$module->$method: $method;
            $data = sprintf($this->lang->error->deny, $moduleName, $methodName);
            print(json_encode($data)) and die(helper::removeUTF8Bom(ob_get_clean()));
        }

        /* Get authorize again. */
        $user = $this->app->user;
        $user->rights = $this->loadModel('user')->authorize($user);
        $this->session->set('user', $user);
        $this->app->user = $this->session->user;
        if(commonModel::hasPriv($module, $method)) return true;

        $vars = "module=$module&method=$method";
        if(isset($_SERVER['HTTP_REFERER']))
        {
            $referer  = helper::safe64Encode($_SERVER['HTTP_REFERER']);
            $vars .= "&referer=$referer";
        }
        $denyLink = helper::createLink('user', 'deny', $vars);
        die(js::locate($denyLink));
    }

    /**
     * Judge a method of one module is open or not?
     *
     * @param  string $module
     * @param  string $method
     * @access public
     * @return bool
     */
    public function isOpenMethod($module, $method)
    {
        if($module == 'user'        && strpos(',login|logout|deny|control|uploadavatar', $method)) return true;
        if($module == 'api'         && $method == 'getsessionid') return true;
        if($module == 'misc'        && $method == 'ping') return true;
        if($module == 'misc'        && $method == 'ignorenotice') return true;
        if($module == 'sso'         && strpos(',auth|gettodolist|leaveusers', $method)) return true;
        if($module == 'file'        && $method == 'read') return true;
        if($module == 'file'        && $method == 'download') return true;
        if($module == 'file'        && $method == 'uploadgroupavatar') return true;
        if($module == 'im'          && $method == 'authorize') return true;
        if($module == 'index'       && $method == 'permissions') return true;
        if($module == 'block') return true;
        if($module == 'notice') return true;

        if($this->loadModel('user')->isLogon() && stripos($method, 'ajax') !== false) return true;

        return false;
    }

    /**
     * Create the main menu.
     *
     * @param  string $currentModule
     * @static
     * @access public
     * @return string
     */
    public static function createMainMenu($currentModule = '', $currentMethod = '')
    {
        global $app, $lang, $config;

        /* Set current module. */
        if(isset($lang->menuGroups->$currentModule)) $currentModule = $lang->menuGroups->$currentModule;

        $isMobile = $app->viewType === 'mhtml';
        $string   = !$isMobile ? "<ul class='nav navbar-nav'>\n" : '';

        $menuOrder = isset($lang->menuOrder) ? $lang->menuOrder : array();
        $allMenus  = new stdclass();
        if(!empty($menuOrder))
        {
            ksort($menuOrder);
            foreach($lang->menu as $moduleName => $moduleMenu)
            {
                if(!in_array($moduleName, $menuOrder)) $menuOrder[] = $moduleName;
            }

            foreach($menuOrder as $name)
            {
                if(isset($lang->menu->$name)) $allMenus->$name = $lang->menu->$name;
            }

            foreach($lang->menu as $key => $value)
            {
                if(!isset($allMenus->$key)) $allMenus->$key = $value;
            }
        }
        else
        {
            $allMenus = $lang->menu;
        }

        /* Print all main menus. */
        foreach($allMenus as $moduleName => $moduleMenu)
        {
            $class = '';
            list($label, $module, $method, $vars) = explode('|', $moduleMenu);
            if(($moduleName == $currentModule || $module === $currentModule) && (empty($currentMethod) || $method == $currentMethod))
            {
                $class = " class='active'";
            }

            if($moduleName == $currentModule) $class = " class='active'";

            if(strpos(',setting,', ',' . $module . ',') != false and isset($lang->setting->menu))
            {
                foreach($lang->setting->menu as $settingMenu)
                {
                    $class = $currentModule == 'setting' ? " class='active'" : '';
                    if(is_array($settingMenu)) $settingMenu = $settingMenu['link'];
                    list($settingLabel, $moduleName, $methodName, $settingVars) = explode('|', $settingMenu);

                    if(commonModel::hasPriv($moduleName, $methodName))
                    {
                        $link    = helper::createLink($moduleName, $methodName, $settingVars);
                        $string .= !$isMobile ? "<li$class><a href='$link'>$label</a></li>\n" : "<a$class href='$link'>$label</a>";
                        break;
                    }
                }
            }
            else
            {
                if(commonModel::hasPriv($module, $method))
                {
                    $link = helper::createLink($module, $method, $vars);
                }
                else
                {
                    $link = self::getLinkFromSubmenu($moduleName);
                }
                if($link) $string .= !$isMobile ? "<li$class><a href='$link'>$label</a></li>\n" : "<a$class href='$link'>$label</a>";
            }
        }

        if(!$isMobile)
        {
            $string .= "<li class='moreMenu hidden'><a href='javascript:;' class='dropdown-toggle' data-toggle='dropdown'>{$lang->more} <span class='caret'></span></a><ul class='dropdown-menu'></ul></li>";
        }

        $string .= !$isMobile ? "</ul>\n" : '';
        return $string;
    }

    /**
     * Create the module menu.
     *
     * @param  string $currentModule
     * @static
     * @access public
     * @return string
     */
    public static function createModuleMenu($currentModule)
    {
        global $lang, $app, $config;

        /* Get current method. */
        $currentMethod = $app->getMethodName();

        if(!isset($lang->$currentModule->menu)) return false;

        $isMobile  = $app->viewType === 'mhtml';
        $string    = !$isMobile ? "<nav id='menu'><ul class='nav'>\n" : '';
        $menuOrder = isset($lang->{$currentModule}->menuOrder) ? $lang->{$currentModule}->menuOrder : array();

        /* Get menus of current module. */
        $moduleMenus = new stdclass();
        if(!empty($menuOrder))
        {
            ksort($menuOrder);
            foreach($menuOrder as $name)
            {
                if(isset($lang->{$currentModule}->menu->$name)) $moduleMenus->$name = $lang->{$currentModule}->menu->$name;
            }

            foreach($lang->{$currentModule}->menu as $key => $value)
            {
                if(!isset($moduleMenus->$key)) $moduleMenus->$key = $value;
            }
        }
        else
        {
            $moduleMenus = $lang->$currentModule->menu;
        }

        /* Cycling to print every menus of current module. */
        foreach($moduleMenus as $methodName => $methodMenu)
        {
            if(is_array($methodMenu))
            {
                $methodAlias = isset($methodMenu['alias']) ? $methodMenu['alias'] : '';
                $methodLink  = $methodMenu['link'];
            }
            else
            {
                $methodAlias = '';
                $methodLink  = $methodMenu;
            }

            /* Split the methodLink to label, module, method, vars. */
            list($label, $module, $method, $vars) = explode('|', $methodLink);

            /* If has no privilege to access the method but the alias, change method to alias. */
            if(!commonModel::hasPriv($module, $method) && $methodAlias != '')
            {
                $aliases = explode(',', trim($methodAlias, ','));
                foreach($aliases as $alias)
                {
                    if(commonModel::hasPriv($module, trim($alias)))
                    {
                        $method = trim($alias);
                        break;
                    }
                }
            }
            if(commonModel::hasPriv($module, $method))
            {
                $class = '';
                if($module == $currentModule && strtolower($method) == $currentMethod) $class = " class='active'";
                if($module == $currentModule && stripos($methodAlias, $currentMethod) !== false) $class = " class='active'";
                if($module == $currentModule) $class = " class='active'";
                $url  = helper::createLink($module, $method, $vars);
                $link = html::a($url, $label);
                if(strpos($string, "class='active'") != false)
                {
                    $string .= !$isMobile ? ("<li>$link</li>\n") : $link;
                }
                else
                {
                    $string .= !$isMobile ? "<li{$class}>$link</li>\n" : html::a($url, $label, $class);
                }
            }
        }

        $string .= !$isMobile ? "</ul></nav>\n" : '';
        return $string;
    }

    public static function createSubMenu($currentModule)
    {
        global $app, $lang, $config;
        if(!isset($lang->subMenuMap->$currentModule)) return false;
        $parentModule = $lang->subMenuMap->$currentModule;
        if(!isset($lang->subMenuGroup->$parentModule) || empty($lang->subMenuGroup->$parentModule)) return false;

        $subMenuType = $lang->subMenuType->$parentModule;
        $app->loadLang('user');
        $isMobile = $app->viewType === 'mhtml';
        $string = !$isMobile ? "<nav id='subMenu' class='sub-menu-{$subMenuType}'><ul class='nav'>\n" : '';
        $menus  = $lang->subMenuGroup->$parentModule;
        foreach($menus as $subMenuKey => $subMenuMethodLink)
        {
            list($label, $subMenuModule, $subMenuMethod, $subMenuVars) = explode('|', $subMenuMethodLink);
            if(commonModel::hasPriv($subMenuModule, $subMenuMethod))
            {
                $class = '';
                if($subMenuModule == $currentModule) $class = " class='active'";
                $url  = helper::createLink($subMenuModule, $subMenuMethod, $subMenuVars);
                $link = html::a($url, $label);
                if(strpos($string, "class='active'") != false)
                {
                    $string .= !$isMobile ? ("<li>$link</li>\n") : $link;
                }
                else
                {
                    $string .= !$isMobile ? "<li{$class}>$link</li>\n" : html::a($url, $label, $class);
                }
            }
        }
        $string .= !$isMobile ? "</ul></nav>\n" : '';
        return $string;
    }

    /**
     * Get Link From Submenu.
     *
     * @param  string    $menuGroup
     * @access public
     * @return string
     */
    public static function getLinkFromSubmenu($menuGroup)
    {
        global $lang, $config;

        if(!isset($lang->$menuGroup->menu)) return '';

        foreach($lang->$menuGroup->menu as $code => $menu)
        {
            if(is_array($menu)) $menu = $menu['link'];
            list($label, $moduleName, $methodName, $vars) = explode('|', $menu);

            if(commonModel::hasPriv($moduleName, $methodName)) return helper::createLink($moduleName, $methodName, $vars);
        }

        return '';
    }

    /**
     * Print the link contains orderBy field.
     *
     * This method will auto set the orderby param according the params. For example, if the order by is desc,
     * will be changed to asc.
     *
     * @param  string $fieldName    the field name to sort by
     * @param  string $orderBy      the order by string
     * @param  string $vars         the vars to be passed
     * @param  string $label        the label of the link
     * @param  string $module       the module name
     * @param  string $method       the method name
     * @static
     * @access public
     * @return void
     */
    public static function printOrderLink($fieldName, $orderBy, $vars, $label, $module = '', $method = '', $print = true)
    {
        global $lang, $app;
        if(empty($module)) $module = $app->getModuleName();
        if(empty($method)) $method = $app->getMethodName();
        $className         = '';
        $isMobile         = $app->viewType === 'mhtml';
        $fieldOrderByDesc = strtolower($fieldName . '_desc');
        $fieldOrderByAsc  = strtolower($fieldName . '_asc');
        $orderByLower     = strtolower($orderBy);

        if($fieldOrderByDesc == $orderByLower)
        {
            $orderBy   = str_ireplace('_desc', '_asc', $orderBy);
            $className = 'SortDown';
        }
        elseif($fieldOrderByAsc == $orderByLower)
        {
            $orderBy   = str_ireplace('asc', 'desc', $orderBy);
            $className = 'SortUp';
        }
        else $orderBy = $fieldName . '_' . 'asc';

        $link = helper::createLink($module, $method, sprintf($vars, $orderBy));

        $html = '';
        if(!$isMobile) $html = "<div class='header$className'>" . html::a($link, $label) . '</div>';
        else $html = html::a($link, $label, "class='$className'");

        if(!$print) return $html;

        echo$html;
    }

    /**
     * Set the user info.
     *
     * @access public
     * @return void
     */
    public function setUser()
    {
        if($this->session->user) return $this->app->user = $this->session->user;

        /* Create a guest account. */
        $user           = new stdclass();
        $user->id       = 0;
        $user->dept     = 0;
        $user->account  = 'guest';
        $user->realname = 'guest';
        $user->admin    = RUN_MODE == 'cli' ? 'super' : 'no';
        $user->rights   = array();

        $this->session->set('user', $user);
        $this->app->user = $this->session->user;
    }

    /**
     * Get the full url of the system.
     *
     * @static
     * @access public
     * @return string
     */
    public static function getSysURL()
    {
        $httpType = isset($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] == 'on' ? 'https' : 'http';
        $httpHost = $_SERVER['HTTP_HOST'];
        return "$httpType://$httpHost";
    }

    /**
     * Print link to an modules' methd.
     *
     * Before printing, check the privilege first. If no privilege, return fasle. Else, print the link, return true.
     *
     * @param  string $module   the module name
     * @param  string $method   the method
     * @param  string $vars     vars to be passed
     * @param  string $label    the label of the link
     * @param  string $misc     others
     * @param  bool   $print
     * @param  bool   $onlyBody
     * @param  string $type     li
     * @static
     * @access public
     * @return bool
     */
    public static function printLink($module, $method, $vars = '', $label = '', $misc = '', $print = true, $onlyBody = false, $type = '')
    {
        if(!commonModel::hasPriv($module, $method)) return false;

        $content = '';
        $link    = helper::createLink($module, $method, $vars, '', $onlyBody);

        if($type == 'li') $content .= '<li>';
        $content .= html::a($link, $label, $misc);
        if($type == 'li') $content .= '</li>';

        if($print !== false) echo $content;
        return $content;
    }

    /**
     * Response.
     *
     * @param  string $code
     * @access public
     * @return void
     */
    public function response($code)
    {
        $response = new stdclass();
        $response->errcode = $this->config->entry->errcode[$code];
        $response->errmsg  = $this->lang->entry->errmsg[$code];

        die(helper::jsonEncode($response));
    }

    /**
     * Http.
     *
     * @param  string    $url
     * @param  string    $data
     * @static
     * @access public
     * @return string
     */
    public static function http($url, $data = null)
    {
        global $lang;
        if(!extension_loaded('curl')) return json_encode(array('result' => 'fail', 'message' => $lang->error->noCurlExt));

        $ci = curl_init();
        curl_setopt($ci, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_1_0);
        curl_setopt($ci, CURLOPT_USERAGENT, 'Sae T OAuth2 v0.1');
        curl_setopt($ci, CURLOPT_CONNECTTIMEOUT, 30);
        curl_setopt($ci, CURLOPT_TIMEOUT, 30);
        curl_setopt($ci, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ci, CURLOPT_ENCODING, '');
        curl_setopt($ci, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ci, CURLOPT_HEADER, false);

        $headers[] = "API-RemoteIP: " . $_SERVER['REMOTE_ADDR'];
        curl_setopt($ci, CURLOPT_URL, $url);
        curl_setopt($ci, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ci, CURLINFO_HEADER_OUT, true);
        if(!empty($data))
        {
            curl_setopt($ci, CURLOPT_POST, true);
            curl_setopt($ci, CURLOPT_POSTFIELDS, $data);
        }

        /* Make cURL follow 30x redirections. */
        curl_setopt($ci, CURLOPT_FOLLOWLOCATION, true);

        $results = curl_exec($ci);
        $errors  = curl_error($ci);
        curl_close ($ci);

        commonModel::log($url, $data, $results, $errors);
        return $results;
    }

    /**
     * Convert items to Pinyin.
     *
     * @param  array    $items
     * @static
     * @access public
     * @return array
     */
    public static function convert2Pinyin($items)
    {
        global $app;
        static $allConverted = array();
        static $pinyin;
        if(empty($pinyin)) $pinyin = $app->loadClass('pinyin');

        $sign = ' aNdAnD ';
        $notConvertedItems = array_diff($items, array_keys($allConverted));

        if($notConvertedItems)
        {
            $convertedPinYin = $pinyin->romanize(join($sign, $notConvertedItems));
            $itemsPinYin     = explode(trim($sign), $convertedPinYin);
            foreach($notConvertedItems as $item)
            {
                $itemPinYin  = array_shift($itemsPinYin);
                $wordsPinYin = explode("\t", trim($itemPinYin));

                $abbr = '';
                foreach($wordsPinYin as $i => $wordPinyin)
                {
                    if($wordPinyin) $abbr .= $wordPinyin[0];
                }

                $allConverted[$item] = strtolower(join($wordsPinYin) . ' ' . $abbr);
            }
        }

        $convertedItems = array();
        foreach($items as $item) $convertedItems[$item] = zget($allConverted, $item, null);

        return $convertedItems;
    }

    /**
     * Log.
     *
     * @param  string $url
     * @param  mixed  $data     string | array
     * @param  string $results
     * @param  string $errors
     * @param  string $logFile
     * @static
     * @access public
     * @return void
     */
    public static function log($url, $data, $results, $errors, $logFile = 'saas')
    {
        global $app, $config;
        if(empty($config->debug)) return false;

        $logFile = $app->getLogRoot() . $logFile . '.'. date('Ymd') . '.log';
        $fh = @fopen($logFile, 'a');
        if(!$fh) return false;

        fwrite($fh, date('Ymd H:i:s') . ": " . $app->getURI() . "\n");
        fwrite($fh, "url:    " . $url . "\n");
        if(!empty($data)) fwrite($fh, "data:   " . print_r($data, true) . "\n");
        fwrite($fh, "results:" . print_r($results, true) . "\n");
        if(!empty($errors)) fwrite($fh, "errors: " . $errors . "\n");
        fclose($fh);
    }

    /**
     * Get avatar HTML display.
     *
     * @param  object  $user     the user object
     * @param  int     $size     the avatar size in pixels (default: 64)
     * @param  array   $options  optional parameters: 'useImageTag' (use html::image), 'addRandom' (add random param), 'extraStyle' (extra CSS styles for text avatar only)
     * @static
     * @access public
     * @return string
     */
    public static function getAvatarHtml($user, $size = 64, $options = array())
    {
        global $app;

        $useImageTag = isset($options['useImageTag']) ? $options['useImageTag'] : false;
        $addRandom   = isset($options['addRandom']) ? $options['addRandom'] : false;
        $extraStyle  = isset($options['extraStyle']) ? $options['extraStyle'] : '';

        if(!empty($user->avatar)) {
            if($useImageTag) {
                $avatarUrl = $user->avatar;
                if($addRandom) $avatarUrl .= '?v=' . rand();
                return html::image($avatarUrl, "class='avatar-img'");
            } else {
                return "<img src='{$user->avatar}' style='width:{$size}px;height:{$size}px;clip-path:circle(closest-side);'>";
            }
        } else {
            // Get first character of realname
            if(empty($user->realname)) {
                $firstChar = '?';
            } else {
                $firstChar = mb_substr($user->realname, 0, 1, 'UTF-8');
                // Convert English letter to uppercase
                if(preg_match('/^[a-zA-Z]$/', $firstChar)) {
                    $firstChar = mb_strtoupper($firstChar, 'UTF-8');
                }
            }

            // Calculate font size based on avatar size
            $fontSize = round($size * 0.42); // Approximately 27px for 64px, 14px for 30px

            return "<span style='display:inline-block;width:{$size}px;height:{$size}px;line-height:{$size}px;text-align:center;font-size:{$fontSize}px;{$extraStyle}'>" . htmlspecialchars($firstChar) . "</span>";
        }
    }
}
