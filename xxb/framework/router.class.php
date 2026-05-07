<?php
/**
 * router类从baseRouter类集成而来，您可以通过修改这个文件实现对baseRouter类的扩展。
 * The router class extend from baseRouter class, you can extend baseRouter class by change this file.
 *
 * @package framework
 *
 * The author disclaims copyright to this source code. In place of
 * a legal notice, here is a blessing:
 *
 *  May you do good and not evil.
 *  May you find forgiveness for yourself and forgive others.
 *  May you share freely, never taking more than you give.
 */
define('FRAME_ROOT', dirname(__FILE__));
include FRAME_ROOT . '/base/router.class.php';
class router extends baseRouter
{
    /**
     * 创建一个应用。
     * Create an application.
     *
     * @param string $appName   应用名称。  The name of the app.
     * @param string $appRoot   应用根路径。The root path of the app.
     * @param string $className 应用类名，如果对router类做了扩展，需要指定类名。When extends router class, you should pass in the child router class name.
     * @static
     * @access public
     * @return object   the app object
     */
    public static function createApp($appName = 'demo', $appRoot = '', $className = '')
    {
        if(empty($className)) $className = __CLASS__;
        return new $className($appName, $appRoot);
    }

    /**
     * 加载模块的config文件，返回全局$config对象。
     * 如果该模块是common，加载$configRoot的配置文件，其他模块则加载其模块的配置文件。
     *
     * Load config and return it as the global config object.
     * If the module is common, search in $configRoot, else in $modulePath.
     *
     * @param   string $moduleName     module name
     * @param   string $appName        app name
     * @param   bool   $exitIfNone     exit or not
     * @access  public
     * @return  object|bool the config object or false.
     */
    public function loadModuleConfig($moduleName, $appName = '')
    {
        global $config;

        if($config and (!isset($config->$moduleName) or !is_object($config->$moduleName))) $config->$moduleName = new stdclass();

        /* 初始化数组。Init the variables. */
        $extConfigFiles       = array();
        $commonExtConfigFiles = array();
        $siteExtConfigFiles   = array();

        /* 先获得模块的主配置文件。Get the main config file for current module first. */
        $mainConfigFile = $this->getModulePath($appName, $moduleName) . 'config.php';

        /* 查找扩展配置文件。Get extension config files. */
        if($config->framework->extensionLevel > 0) $extConfigPath = $this->getModuleExtPath($appName, $moduleName, 'config');
        if($config->framework->extensionLevel >= 1 and !empty($extConfigPath['common'])) $commonExtConfigFiles = helper::ls($extConfigPath['common'], '.php');
        if($config->framework->extensionLevel == 2 and !empty($extConfigPath['site']))   $siteExtConfigFiles   = helper::ls($extConfigPath['site'], '.php');
        $extConfigFiles = array_merge($commonExtConfigFiles, $siteExtConfigFiles);

        /* 将主配置文件和扩展配置文件合并在一起。Put the main config file and extension config files together. */
        $configFiles = array_merge(array($mainConfigFile), $extConfigFiles);

        /* 加载每一个配置文件。Load every config file. */
        static $loadedConfigs = array();
        foreach($configFiles as $configFile)
        {
            if(in_array($configFile, $loadedConfigs)) continue;
            if(file_exists($configFile)) include $configFile;
            $loadedConfigs[] = $configFile;
        }

        if($moduleName != 'common' and isset($config->system->$moduleName))
        {
            helper::mergeConfig($config->system->$moduleName, $moduleName);
        }
        if($moduleName != 'common' and isset($config->personal->$moduleName))
        {
            helper::mergeConfig($config->personal->$moduleName, $moduleName);
        }
    }

    /**
     * 加载语言文件，返回全局$lang对象。
     * Load lang and return it as the global lang object.
     *
     * @param   string $moduleName     the module name
     * @access  public
     * @return  bool|object the lang object or false.
     */
    public function loadLang($moduleName, $appName = '')
    {
        $lang = parent::loadLang($moduleName, $appName);

        $customLang = array();

        if(isset($lang->db->custom[$moduleName])) $customLang += $lang->db->custom[$moduleName];

        foreach($customLang as $section => $fields)
        {
            if(empty($section))
            {
                foreach($fields as $key => $value)
                {
                    if($moduleName == 'common')
                    {
                        unset($lang->{$key});
                        $lang->{$key} = $value;
                    }
                    else
                    {
                        if(!isset($lang->{$moduleName})) $lang->{$moduleName} = new stdclass();
                        unset($lang->{$moduleName}->{$key});
                        $lang->{$moduleName}->{$key} = $value;
                    }
                }
            }
            else
            {
                foreach($fields as $key => $value)
                {
                    if($moduleName == 'common')
                    {
                        unset($lang->{$section}[$key]);
                        $lang->{$section}[$key] = $value;
                    }
                    else
                    {
                        unset($lang->{$moduleName}->{$section}[$key]);
                        $lang->{$moduleName}->{$section}[$key] = $value;
                    }
                }
            }
        }

        $this->lang = $lang;
        return $lang;
    }

}
