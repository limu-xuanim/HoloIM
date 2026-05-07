<?php
/**
 * The model file of upgrade module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     upgrade
 * @link        https://xuanim.com
 */
?>
<?php
class upgradeModel extends model
{
    /**
     * Errors.
     *
     * @static
     * @var array
     * @access public
     */
    static $errors = array();

    /**
     * The execute method. According to the $fromVersion call related methods.
     *
     * @param  string $fromVersion
     * @access public
     * @return void
     */
    public function execute($fromVersion)
    {
        $result = array();
        $os = 'win';
        if(strpos(strtolower(PHP_OS), 'win') !== 0) $os = strtolower(PHP_OS);

        $this->logUpgrade("execute start fromVersion=$fromVersion");

        /* Delete useless file.*/
        foreach($this->config->delete as $deleteFiles)
        {
            $basePath = $this->app->getBasePath();
            foreach($deleteFiles as $file)
            {
                $fullPath = $basePath . str_replace('/', DIRECTORY_SEPARATOR, $file);
                if($os != 'win')
                {
                    if(is_dir($fullPath)  and !rmdir($fullPath))  $result[] = sprintf($this->lang->upgrade->deleteDir, $fullPath);
                    if(is_file($fullPath) and !unlink($fullPath)) $result[] = sprintf($this->lang->upgrade->deleteFile, $fullPath);
                }
                else
                {
                    if(is_dir($fullPath)  and !rmdir($fullPath))  $result[] = sprintf($this->lang->upgrade->deleteWinFile, $fullPath);
                    if(is_file($fullPath) and !unlink($fullPath)) $result[] = sprintf($this->lang->upgrade->deleteWinFile, $fullPath);
                }
            }
        }

        if(!empty($result))
        {
            $this->logUpgrade('delete useless files failed: ' . json_encode($result));
            $os == 'win' ? $result = array('' => $this->lang->upgrade->deleteWinTips) + $result : $result = array('' => $this->lang->upgrade->deleteTips) + $result;
            return $result;
        }

        $xuanxuanVersion = $this->getXuanxuanVersion();
        $this->logUpgrade("upgradeXuanxuan version=$xuanxuanVersion");
        $this->upgradeXuanxuan($xuanxuanVersion);

        switch($fromVersion)
        {
            default: if(!$this->isError()) $this->loadModel('setting')->updateVersion($this->config->version);
        }
    }

    /**
     * Create the confirm contents.
     *
     * @param  string $fromVersion
     * @access public
     * @return string
     */
    public function getConfirm($fromVersion)
    {
        $confirmContent = '';
        switch($fromVersion)
        {
           
        }
        return $confirmContent;
    }

    /**
     * Get the upgrade sql file.
     *
     * @param  string $version
     * @access public
     * @return string
     */
    public function getUpgradeFile($version)
    {
        return $this->app->getBasepath() . 'db' . DS . 'upgrade' . $version . '.sql';
    }

    /**
     * Execute a sql.
     *
     * @param  string  $sqlFile
     * @access public
     * @return void
     */
    public function execSQL($sqlFile)
    {
        $mysqlVersion = $this->loadModel('install')->getMysqlVersion();
        $ignoreCode   = '|1050|1060|1062|1091|1169|';

        $this->logUpgrade("execSQL start file=$sqlFile");

        /* Read the sql file to lines, remove the comment lines, then join theme by ';'. */
        $sqls = explode("\n", file_get_contents($sqlFile));
        foreach($sqls as $key => $line)
        {
            $line       = trim($line);
            $sqls[$key] = $line;
            if(strpos($line, '--') !== false or empty($line)) unset($sqls[$key]);
        }
        $sqls = explode(';', join("\n", $sqls));

        foreach($sqls as $sql)
        {
            $sql = trim($sql);
            if(empty($sql)) continue;

            if($mysqlVersion <= 4.1)
            {
                $sql = str_replace('DEFAULT CHARSET=utf8', '', $sql);
                $sql = str_replace('CHARACTER SET utf8 COLLATE utf8_general_ci', '', $sql);
            }

            /* Add table prefix. */
            $sql = str_replace('`im_', '`xxb_im_', $sql);
            $sql = str_replace('xxb_', $this->config->db->prefix, $sql);

            $this->logUpgrade("exec sql: $sql");

            try
            {
                $this->dbh->exec($sql);
            }
            catch (PDOException $e)
            {
                $errorInfo = $e->errorInfo;
                $errorCode = $errorInfo[1];
                if(strpos($ignoreCode, "|$errorCode|") === false)
                {
                    self::$errors[] = $e->getMessage() . "<p>The sql is: $sql</p>";
                    $this->logUpgrade("SQL ERROR code=$errorCode message={$e->getMessage()} sql=$sql", $e->getFile(), $e->getLine());
                }
            }
        }
    }

    /**
     * Judge any error occers.
     *
     * @access public
     * @return bool
     */
    public function isError()
    {
        return !empty(self::$errors);
    }

    /**
     * Get errors during the upgrading.
     *
     * @access public
     * @return array
     */
    public function getError()
    {
        $errors = self::$errors;
        self::$errors = array();
        return $errors;
    }

    /**
     * Write upgrade log.
     *
     * 日志文件：tmp/log/upgrade.Ymd.log.php
     * 不依赖 debug 开关，始终记录。
     *
     * @param  string $message
     * @param  string $file
     * @param  string $line
     * @access private
     * @return void
     */
    private function logUpgrade($message, $file = '', $line = '')
    {
        $log  = "\n" . date('H:i:s') . " $message";
        if($file) $log .= " in <strong>$file</strong>";
        if($line) $log .= " on line <strong>$line</strong> ";

        $filePath = $this->app->getLogRoot() . 'upgrade.' . date('Ymd') . '.log.php';
        if(!is_file($filePath)) file_put_contents($filePath, "<?php\n die();\n?>\n");

        $fh = @fopen($filePath, 'a');
        if($fh) fwrite($fh, $log) && fclose($fh);
    }
}
