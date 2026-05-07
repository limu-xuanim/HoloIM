<?php
error_reporting(0);

// 确保 $config 和 $lang 已初始化，避免在未定义时访问属性导致致命错误。
if (!isset($config) || !is_object($config)) {
    $config = new stdClass();
}
if (!isset($config->langs) || !is_array($config->langs)) {
    $config->langs = array();
}
if (!isset($lang) || !is_object($lang)) {
    $lang = new stdClass();
}
if (!isset($lang->cn) || !is_object($lang->cn)) {
    $lang->cn = new stdClass();
}
if (!isset($lang->en) || !is_object($lang->en)) {
    $lang->en = new stdClass();
}

if(isset($_GET['mode']) and $_GET['mode'] == 'getlogo')
{
  header('Content-type: image/png');
  die(base64_decode('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'));
}

$config->langs['cn'] = '简体';
$config->langs['en'] = 'English';

$lang->cn->visit = '访问';

$lang->cn->links['xxc']['link']       = '/xuan/';
$lang->cn->links['xxc']['text']       = '喧喧网页端';
$lang->cn->links['xxc']['target']     = '_self';
$lang->cn->links['xxc']['primary']    = false;

$lang->cn->links['xxb']['link']       = '/xxb/';
$lang->cn->links['xxb']['text']       = '喧喧后台';
$lang->cn->links['xxb']['target']     = '_self';
$lang->cn->links['xxb']['primary']    = true;

$lang->cn->title = '欢迎使用喧喧集成运行环境！';
$lang->cn->official   = " <a href='http://www.xuanim.com' target='_blank'>喧喧官网</a>";
$lang->cn->adminer    = "<a href='/adminer.php' target='_blank'>数据库管理</a>";

$lang->en->visit = 'Visit ';

$lang->en->links['xxc']['link']       = '/xuan/';
$lang->en->links['xxc']['text']       = 'Web Client';
$lang->en->links['xxc']['target']     = '_self';
$lang->en->links['xxc']['primary']    = false;

$lang->en->links['xxb']['link']       = '/xxb/';
$lang->en->links['xxb']['text']       = 'Backend';
$lang->en->links['xxb']['target']     = '_self';
$lang->en->links['xxb']['primary']    = true;

$lang->en->title      = 'Welcome to use xuanxuan!';
$lang->en->official   = " <a href='http://www.xuanim.com' target='_blank'>Community</a>";
$lang->en->adminer    = "<a href='/adminer.php' target='_blank'>MySQL</a>";

$acceptLang = stripos($_SERVER['HTTP_ACCEPT_LANGUAGE'], 'zh-CN') !== false ? 'cn' : 'en';
$acceptLang = isset($_GET['lang']) ? $_GET['lang'] : $acceptLang;
$clientLang = $lang->$acceptLang;

?>
<html xmlns='http://www.w3.org/1999/xhtml'>
  <head>
    <meta http-equiv='Content-Type' content='text/html; charset=utf-8' />
    <title><?php echo $clientLang->title;?></title>
    <link rel="icon" href="/favicon.ico" type="image/x-icon" />
    <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background-color: #f6f5fb; color: #333; }
      .page-wrap { padding: 0; min-height: 100vh; display: flex; align-items: flex-start; justify-content: center; padding-top: 10vh; }
      .card { margin: 0 auto; width: 450px; background: #fff; border-radius: 8px; box-shadow: 0 2px 10px rgba(93,56,198,0.1); overflow: hidden; position: relative; }
      .card-body { padding: 24px 0; text-align: center; }
      .card-row { display: flex; align-items: stretch; }
      .card-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; }
      .card-col:first-child { border-right: 1px solid #e5e5e5; padding: 20px 16px; }
      .card-col-btns { padding: 20px 28px; justify-content: space-around; max-height: 150px; }
      .card-col img { max-height: 150px; display: block; }
      .btn-wrap { display: flex; flex-direction: column; gap: 12px; width: 100%; }
      .btn { display: inline-block; padding: 12px 24px; font-size: 16px; line-height: 1.4; text-align: center; text-decoration: none; border-radius: 6px; border: 1px solid transparent; cursor: pointer; transition: background .2s, border-color .2s; font-family: inherit; }
      .btn-primary { background: linear-gradient(-225deg, #6c3ed9 0%, #8960ef 100%); border-color: #6c3ed9; color: #fff; }
      .btn-primary:hover { background: linear-gradient(-260deg, #6c3ed9 20%, #8960ef 100%); border-color: #8960ef; color: #fff; }
      .btn-secondary { background: #fff; border-color: #ddd; color: #666; }
      .btn-secondary:hover { background: #f5f5f5; border-color: #ccc; color: #333; }
      .card-footer { padding: 12px 15px; text-align: left; border-top: 1px solid #eee; font-size: 14px; }
      .card-footer > a { margin-left: 5px; color: #8960ef; text-decoration: none; }
      .card-footer > a:hover { color: #6c3ed9; }
      .lang-wrap { position: absolute; right: 15px; bottom: 10px; z-index: 10; }
      .lang-toggle { display: inline-flex; align-items: center; padding: 6px 12px; color: #666; text-decoration: none; font-size: 14px; cursor: pointer; border: none; background: none; font-family: inherit; }
      .lang-toggle:hover { color: #333; }
      .lang-toggle .caret { display: inline-block; width: 0; height: 0; margin-left: 6px; vertical-align: middle; border-top: 4px solid; border-right: 4px solid transparent; border-left: 4px solid transparent; }
      .lang-menu { display: none; position: absolute; right: 0; bottom: 100%; margin-bottom: 4px; min-width: 100%; background: #fff; border: 1px solid #ddd; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); list-style: none; padding: 6px 0; margin: 0 0 4px 0; }
      .lang-menu.open { display: block; }
      .lang-menu a { display: block; padding: 8px 16px; color: #333; text-decoration: none; font-size: 14px; text-align: left; white-space: nowrap; }
      .lang-menu li { margin: 0; }
      .lang-menu a:hover { background: #f5f5f5; color: #8960ef; }
    </style>
  </head>
  <body>
    <div class="page-wrap">
      <div class="card">
        <div class="card-body">
          <div class="card-row">
            <div class="card-col">
              <img src="?mode=getlogo" alt="" />
            </div>
            <div class="card-col card-col-btns">
              <div class="btn-wrap">
                <?php foreach($clientLang->links as $linkID => $link):?>
                  <a id="product-<?php echo $linkID;?>" href="<?php echo htmlspecialchars($link['link']);?>" class="btn <?php echo $link['primary'] ? 'btn-primary' : 'btn-secondary';?>" target="<?php echo htmlspecialchars($link['target']);?>"><?php echo $clientLang->visit . $link['text'];?></a>
                <?php endforeach;?>
              </div>
            </div>
          </div>
        </div>
        <div class="card-footer">
          <?php echo $clientLang->official; ?>
          <?php echo $clientLang->adminer; ?>
          <div class="lang-wrap">
            <button type="button" class="lang-toggle" id="lang-toggle" aria-expanded="false" aria-haspopup="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
              <span style="margin-left:6px"><?php echo htmlspecialchars($config->langs[$acceptLang]);?></span>
              <span class="caret"></span>
            </button>
            <ul class="lang-menu" id="lang-menu" role="menu">
              <?php foreach($config->langs as $langCode => $langName): ?>
              <li role="none"><a href="?lang=<?php echo urlencode($langCode);?>" role="menuitem"><?php echo htmlspecialchars($langName);?></a></li>
              <?php endforeach; ?>
            </ul>
          </div>
        </div>
      </div>
    </div>
    <script>
      (function() {
        var toggle = document.getElementById('lang-toggle');
        var menu = document.getElementById('lang-menu');
        if (!toggle || !menu) return;
        function openMenu() { menu.classList.add('open'); toggle.setAttribute('aria-expanded', 'true'); }
        function closeMenu() { menu.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
        toggle.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); menu.classList.toggle('open'); toggle.setAttribute('aria-expanded', menu.classList.contains('open')); });
        document.addEventListener('click', function() { closeMenu(); });
        menu.addEventListener('click', function(e) { if (e.target.tagName === 'A') closeMenu(); });
      })();
    </script>
  </body>
</html>
