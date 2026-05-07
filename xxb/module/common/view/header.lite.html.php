<?php
/**
 * The header.lite view of common module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     common
 * @link        https://xuanim.com
 */
if($extView = $this->getExtViewFile(__FILE__)){include $extView; return helper::cd();}
$webRoot      = $config->webRoot;
$jsRoot       = $webRoot . "js/";
$themeRoot    = $webRoot . "theme/";
$clientTheme  = $this->app->getClientTheme();
?>
<!DOCTYPE html>
<html lang='<?php echo $app->getClientLang();?>'>
<head profile="http://www.w3.org/2005/10/profile">
  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <?php echo html::favicon($webRoot . 'favicon.ico');?>
  <?php if($this->moduleName == 'user' and $this->methodName == 'deny'):?>
  <meta http-equiv='refresh' content="5;url=<?php echo helper::createLink($config->default->module);?>">
  <?php endif;?>
  <?php
  if(!isset($title)) $title  = '';
  if(!empty($title)) $title .= $lang->minus;
  echo html::title($title . $lang->xxb);

  js::exportConfigVars();
  if($config->debug)
  {
      js::import($jsRoot . 'jquery/min.js');
      js::import($jsRoot . 'zui/min.js');
      js::import($jsRoot . 'xxb.js');
      js::import($jsRoot . 'my.js');
      css::import($themeRoot . 'zui/css/min.css');
      css::import($themeRoot . 'default/style.css');

      if(strpos($clientTheme, 'default') === false) css::import($clientTheme . 'style.css', $config->version);
  }
  else
  {
      css::import($themeRoot . 'default/all.css');

      if(strpos($clientTheme, 'default') === false) css::import($clientTheme . 'style.css', $config->version);

      js::import($jsRoot     . 'all.js');
  }

  css::import($themeRoot . 'default/header.css');

  if(RUN_MODE == 'admin') css::import($themeRoot . 'default/admin.css');
  if(isset($pageCSS)) css::internal($pageCSS);
?>
<!--[if lt IE 9]>
<?php
js::import($jsRoot . 'html5shiv/min.js');
js::import($jsRoot . 'respond/min.js');
?>
<![endif]-->
<!--[if lt IE 10]>
<?php
js::import($jsRoot . 'jquery/placeholder/min.js');
?>
<![endif]-->
<?php js::set('lang', $lang->js);?>
</head>
<body class='m-<?php echo $this->app->getModuleName() . '-' . $this->app->getMethodName() ?><?php if(isset($this->app->entry->code)) echo ' entry-' . $this->app->entry->code; ?>'>
