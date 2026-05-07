<?php
class imModel extends model
{
    public $models = array('chat', 'message', 'user');

    public $chat;

    public $message;

    public $user;

    public function __construct()
    {
        parent::__construct();

        if((isset($_SERVER['RR_RELAY']) || isset($_SERVER['RR_MODE']))) die;

        $modelPath = dirname(__FILE__) . DS . "model" . DS;

        foreach($this->models as $model)
        {
            helper::import($modelPath . "$model.php");
            $className = "im$model";
            $this->$model = new $className($this->appName, $this);
        }
    }

    /**
	 * Create gid.
	 * @access public
	 * @return string
	 */
    public static function createGID()
    {
        $id = md5(microtime() . mt_rand());
        return substr($id, 0, 8) . '-' . substr($id, 8, 4) . '-' . substr($id, 12, 4) . '-' . substr($id, 16, 4) . '-' . substr($id, 20, 12);
    }

    public function getServer()
    {
        $server = commonModel::getSysURL();
        if(!empty($this->config->xuanxuan->server)) $server = $this->config->xuanxuan->server;

        $serverURLComponents = parse_url($server);
        if(!empty($serverURLComponents['host']) && in_array($serverURLComponents['host'], array('127.0.0.1', 'localhost', '::1')))
        {
            $loginURL = $this->loadModel('setting')->getItem("owner=system&module=im&section=loginurl&key={$this->app->session->userID}");
            if(!empty($loginURL))
            {
                $loginURLComponents = parse_url($loginURL);
                if(!empty($loginURLComponents['host'])) $server = substr_replace($server, $loginURLComponents['host'], strpos($server, $serverURLComponents['host']), strlen($serverURLComponents['host']));
            }
        }

        return $server;
    }

    public function getXxdStatus()
    {
        $this->app->loadLang('client');
        $now          = helper::now();
        $xxdStatus    = 'offline';
        $polling      = empty($this->config->xuanxuan->pollingInterval) ? 60 : $this->config->xuanxuan->pollingInterval;
        $lastPoll     = $this->loadModel('setting')->getItem("owner=system&module=common&section=xxd&key=lastPoll");
        $xxdStartDate = zget($this->config->xxd, 'start', $this->lang->client->noData);

        if((strtotime($now) - strtotime($xxdStartDate) < $polling) || (strtotime($now) - strtotime($lastPoll)) < (3 + $polling))
        {
            $xxdStatus = 'online';
        }
        else if((strtotime($now) - strtotime($lastPoll)) > (3 + $polling))
        {
            $xxdStatus = 'offline';
        }

        return $xxdStatus;
    }

    /**
     * Get xxd run time.
     *
     * @param  int    $timestamp
     * @param  int    $count
     * @access public
     * @return string
     */
    public function getXxdRunTime($timestamp, $count = 0)
    {
        if($count > 1) return '';

        if($timestamp > 86400)
        {
            return floor($timestamp / 86400) . $this->lang->im->day . $this->getXxdRunTime($timestamp%86400, ++$count);
        }
        else if($timestamp > 3600)
        {
            return floor($timestamp / 3600) . $this->lang->im->hours . $this->getXxdRunTime($timestamp%3600, ++$count);
        }
        else if($timestamp > 60)
        {
            return floor($timestamp / 60) . $this->lang->im->minute . $this->getXxdRunTime($timestamp%60, ++$count);
        }
        else
        {
            return $timestamp . $this->lang->im->secs;
        }
    }

    public function __call($function, $arguments)
    {
        foreach($this->models as $model)
        {
            if(strpos(strtolower($function), $model) === 0)
            {
                $trimedFunction = substr($function, strlen($model));
                if(is_callable(array($this->$model, $trimedFunction))) return call_user_func_array(array($this->$model, $trimedFunction), $arguments);
            }
        }

        $this->app->triggerError("Method im::$function not exists.", __FILE__, __LINE__, $exit = true);
    }
}
