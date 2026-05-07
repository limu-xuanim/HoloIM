<?php
/**
 * 喧喧消息转发服务器 Web 安装向导
 * Xuan Daemon Web Installation Wizard
 */

error_reporting(0);

// 语言项逻辑与 index.php 保持一致，支持中英文切换。
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

$config->langs['cn'] = '简体';
$config->langs['en'] = 'English';

/* 中文语言项 */
$lang->cn->pageTitle         = '喧喧服务器安装向导';
$lang->cn->step1Title        = '欢迎使用喧喧服务端';
$lang->cn->step1SubTitle     = '安装向导将引导您完成服务器配置，整个过程约需 3–5 分钟。';
$lang->cn->step1Intro1       = '专为企业提供安全、开源、免费、跨平台的即时通信解决方案。';
$lang->cn->step1Intro2       = '由 <a href="https://www.zentao.net" target="_blank" rel="noopener" style="color:#1e6aeb;font-weight:bold;">禅道软件（青岛）集团有限公司</a> 开发';
$lang->cn->step1Official     = '官方网站：';
$lang->cn->step1Support      = '技术支持：';
$lang->cn->btnStartInstall   = '开始安装';
$lang->cn->disclaimerTitle   = '免责声明';
$lang->cn->agreeCheckbox     = '已阅读并同意';
$lang->cn->agreeRequired     = '请先阅读并同意免责声明';

$lang->cn->step2Title        = '数据库配置';
$lang->cn->step2SubTitle     = '请填写 MySQL 数据库连接信息。数据库将在安装时自动创建。';
$lang->cn->dbHost            = '数据库主机';
$lang->cn->dbPort            = '端口';
$lang->cn->dbUser            = '用户名';
$lang->cn->dbPassword        = '密码';
$lang->cn->dbName            = '数据库名称';
$lang->cn->dbNameTip         = '如果数据库不存在将自动创建';
$lang->cn->btnTestDB         = '测试连接';
$lang->cn->btnPrev           = '上一步';
$lang->cn->btnNext           = '下一步';
$lang->cn->dbTestDoing       = '测试中...';
$lang->cn->dbTestSuccess     = '数据库连接成功！';
$lang->cn->dbTestFail        = '连接失败：';
$lang->cn->dbReqFail         = '请求失败：';

$lang->cn->step3Title        = '服务器配置';
$lang->cn->step3SubTitle     = '选择服务器的对外访问地址，客户端将使用此地址连接到服务器。';
$lang->cn->serverHost        = '服务器地址';
$lang->cn->serverHostTip     = '客户端通过该地址请求服务器文件数据。';
$lang->cn->portCommon        = '登录 & 附件端口';
$lang->cn->portChat          = '聊天消息端口';
$lang->cn->portStun          = 'STUN 端口';
$lang->cn->portStunTip       = '用于点对点 NAT 穿透，帮助客户端建立点对点连接。';
$lang->cn->httpsLabel        = '启用 HTTPS';
$lang->cn->httpsOff          = '不启用（HTTP）';
$lang->cn->httpsOn           = '启用（HTTPS）';
$lang->cn->portEmpty         = '该字段不能为空';
$lang->cn->portRange         = '必须为 1–65535 的数字';

$lang->cn->step4Title        = '管理员配置';
$lang->cn->step4SubTitle     = '设置管理员账号并选择是否导入演示数据。';
$lang->cn->adminUser         = '管理员账号';
$lang->cn->adminPassword     = '管理员密码';
$lang->cn->importDemo        = '导入演示数据（包含示例用户、会话和消息）';
$lang->cn->adminTip          = '管理员账号将用于登录喧喧后台管理系统，请妥善保管密码。';
$lang->cn->msgNeedAdminUser  = '请填写管理员账号';
$lang->cn->msgNeedAdminPwd   = '请填写管理员密码';
$lang->cn->btnStartInstall2  = '开始安装';

$lang->cn->step5Installing   = '正在安装...';
$lang->cn->step5Desc         = '请勿关闭此页面。';
$lang->cn->step5ErrorPrefix  = '错误：';
$lang->cn->step5SuccessTitle = '安装完成！';
$lang->cn->step5SuccessDesc1 = '安装成功，正在启动服务...';
$lang->cn->step5SuccessDesc2 = '服务端正在启动，请稍候...';
$lang->cn->step5SuccessReady = '服务端已成功启动。';
$lang->cn->step5StartSlow    = '服务端启动可能较慢，请稍后重试或检查服务状态。';
$lang->cn->btnBackModify     = '← 返回修改';
$lang->cn->btnRetryInstall   = '重试安装';
$lang->cn->btnGotoServer     = '服务端管理';
$lang->cn->btnGotoManual     = '手动访问 →';
$lang->cn->fieldRequiredTip  = '该字段不能为空';

/* 英文语言项 */
$lang->en->pageTitle         = 'Xuanxuan Server Setup Wizard';
$lang->en->step1Title        = 'Welcome to Xuanxuan Server';
$lang->en->step1SubTitle     = 'This wizard will guide you through the server configuration in about 3–5 minutes.';
$lang->en->step1Intro1       = 'provides a secure, open source, free and cross‑platform IM solution for enterprises.';
$lang->en->step1Intro2       = 'Developed by <a href="https://www.zentao.net" target="_blank" rel="noopener" style="color:#1e6aeb;font-weight:bold;">EasyCorp (Qingdao) Co., Ltd.</a>.';
$lang->en->step1Official     = 'Official site: ';
$lang->en->step1Support      = 'Support: ';
$lang->en->btnStartInstall   = 'Start installation';
$lang->en->disclaimerTitle   = 'Disclaimer';
$lang->en->agreeCheckbox     = 'I have read and agree';
$lang->en->agreeRequired     = 'Please read and agree to the disclaimer first';

$lang->en->step2Title        = 'Database Configuration';
$lang->en->step2SubTitle     = 'Fill in MySQL connection information. The database will be created automatically during installation.';
$lang->en->dbHost            = 'Database host';
$lang->en->dbPort            = 'Port';
$lang->en->dbUser            = 'Username';
$lang->en->dbPassword        = 'Password';
$lang->en->dbName            = 'Database name';
$lang->en->dbNameTip         = 'The database will be created automatically if it does not exist.';
$lang->en->btnTestDB         = 'Test connection';
$lang->en->btnPrev           = 'Previous';
$lang->en->btnNext           = 'Next';
$lang->en->dbTestDoing       = 'Testing...';
$lang->en->dbTestSuccess     = 'Database connection successful!';
$lang->en->dbTestFail        = 'Connection failed: ';
$lang->en->dbReqFail         = 'Request failed: ';

$lang->en->step3Title        = 'Server Configuration';
$lang->en->step3SubTitle     = 'Choose the public address of the server. Clients will use it to connect.';
$lang->en->serverHost        = 'Server address';
$lang->en->serverHostTip     = 'Clients use this address to request files from the server.';
$lang->en->portCommon        = 'Login & attachment port';
$lang->en->portChat          = 'Chat message port';
$lang->en->portStun          = 'STUN port';
$lang->en->portStunTip       = 'Used for P2P NAT traversal and helps clients establish direct connections.';
$lang->en->httpsLabel        = 'Enable HTTPS';
$lang->en->httpsOff          = 'Disabled (HTTP)';
$lang->en->httpsOn           = 'Enabled (HTTPS)';
$lang->en->portEmpty         = 'This field is required';
$lang->en->portRange         = 'Must be a number between 1 and 65535';

$lang->en->step4Title        = 'Admin Configuration';
$lang->en->step4SubTitle     = 'Set the administrator account and whether to import demo data.';
$lang->en->adminUser         = 'Admin account';
$lang->en->adminPassword     = 'Admin password';
$lang->en->importDemo        = 'Import demo data (including sample users, conversations and messages)';
$lang->en->adminTip          = 'The admin account is used to log in to the management console. Please keep the password safe.';
$lang->en->msgNeedAdminUser  = 'Please enter admin account';
$lang->en->msgNeedAdminPwd   = 'Please enter admin password';
$lang->en->btnStartInstall2  = 'Start installation';

$lang->en->step5Installing   = 'Installing...';
$lang->en->step5Desc         = 'Do not close this page.';
$lang->en->step5ErrorPrefix  = 'Error: ';
$lang->en->step5SuccessTitle = 'Installation completed!';
$lang->en->step5SuccessDesc1 = 'Installation succeeded, starting services...';
$lang->en->step5SuccessDesc2 = 'Server is starting, please wait...';
$lang->en->step5SuccessReady = 'Server is up and running.';
$lang->en->step5StartSlow    = 'Server startup may be slow. Please try again later or check the service status.';
$lang->en->btnBackModify     = '← Back to modify';
$lang->en->btnRetryInstall   = 'Retry installation';
$lang->en->btnGotoServer     = 'Server console';
$lang->en->btnGotoManual     = 'Visit manually →';
$lang->en->fieldRequiredTip  = 'This field is required';

$acceptLang = stripos($_SERVER['HTTP_ACCEPT_LANGUAGE'], 'zh-CN') !== false ? 'cn' : 'en';
$acceptLang = isset($_GET['lang']) ? $_GET['lang'] : $acceptLang;
$clientLang = $lang->$acceptLang;
?><!DOCTYPE html>
<html lang="<?php echo $acceptLang === 'cn' ? 'zh-CN' : 'en'; ?>">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?php echo htmlspecialchars($clientLang->pageTitle); ?></title>
<link rel="stylesheet" href="zui/zui.css">
<style>
/* ── 页面基础 ── */
body {
  background: #f4f5f7;
  font-size: 14px;
  color: #1f2329;
}
.page-main {
  max-width: 720px;
  margin: 36px auto 60px;
  padding: 0 20px;
}

/* ── 向导卡片（覆盖 ZUI panel 默认外观以对齐后台风格）── */
.wizard-card {
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  box-shadow: 0 2px 12px rgba(31,35,41,.07);
  overflow: hidden;
  margin-bottom: 20px;
}
.wizard-card > .panel-heading {
  background: #f5f6fa;
  border-bottom: 1px solid #e5e5e5;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 0;
}
.wizard-card > .panel-heading strong {
  font-size: 15px;
  font-weight: 600;
  color: #1f2329;
}
.wizard-card > .panel-heading small { font-size: 12px; color: #8a8fa3; }
.wizard-card > .panel-body  { padding: 24px 20px; }
.wizard-card > .panel-footer {
  background: #fafbfc;
  border-top: 1px solid #e5e5e5;
  padding: 12px 20px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  border-radius: 0;
}

/* ── 进度条（覆盖 ZUI 默认颜色）── */
.progress {
  height: 6px;
  background: #e8ecf0;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 14px;
}
.progress .progress-bar {
  height: 100%;
  background: #1e6aeb;
  transition: width .4s;
  border-radius: 3px;
}

/* ── 安装日志框 ── */
.log-box {
  background: #f8f8f8;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-family: Menlo, Consolas, "DejaVu Sans Mono", monospace;
  font-size: 12px;
  line-height: 1.7;
  padding: 12px;
  min-height: 200px;
  max-height: 320px;
  overflow-y: auto;
  color: #333;
}
.log-line       { color: #2d7a4a; }
.log-line.error { color: #dc3545; }
.log-line.done  { color: #1e6aeb; font-weight: 600; }

/* ── 安装完成状态 ── */
.done-icon {
  width: 56px; height: 56px;
  background: rgba(52,199,138,.12);
  border: 2px solid #34c78a;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 24px; color: #34c78a;
  margin: 0 auto 16px;
}

/* ── 工具类 ── */
.hidden  { display: none !important; }
.divider { border: none; border-top: 1px solid #eaeaea; margin: 16px 0; }

/* ── 免责声明 ── */
.disclaimer-box {
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
  padding: 16px;
  margin-bottom: 16px;
  font-size: 13px;
  line-height: 1.7;
  color: #333;
}
.disclaimer-box h3 {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: #1f2329;
}
.disclaimer-box h4 {
  font-size: 14px;
  font-weight: 600;
  margin: 16px 0 8px 0;
  color: #1f2329;
}
.disclaimer-box p {
  margin: 0 0 12px 0;
}
.disclaimer-box ul {
  margin: 0 0 12px 0;
  padding-left: 20px;
}
.disclaimer-box li {
  margin-bottom: 4px;
}
.disclaimer-box hr {
  border: none;
  border-top: 1px solid #ddd;
  margin: 16px 0;
}
.disclaimer-check {
  margin-top: 12px;
}

:root {
    --form-horz-label-width: 8rem;
}
</style>
</head>
<body>

<main class="page-main">

  <!-- ── Step 1: 欢迎 / Welcome ── -->
  <div class="wizard-card" id="step-1">
    <div class="panel-heading">
      <strong><?php echo htmlspecialchars($clientLang->step1Title); ?></strong>
      <small><?php echo htmlspecialchars($clientLang->step1SubTitle); ?></small>
    </div>
    <div class="panel-body">
      <p style="line-height:1.8;margin-bottom:12px">
        <strong>喧喧</strong> <?php echo htmlspecialchars($clientLang->step1Intro1); ?>
      </p>
      <p style="line-height:1.8;margin-bottom:12px">
        <?php echo $clientLang->step1Intro2; ?>
      </p>
      <p style="margin-bottom:6px;font-size:13px">
        <?php echo htmlspecialchars($clientLang->step1Official); ?><a href="https://www.xuanim.com" target="_blank" rel="noopener">https://www.xuanim.com</a>
      </p>
      <p style="font-size:13px">
        <?php echo htmlspecialchars($clientLang->step1Support); ?><a href="https://www.xuanim.com/forum/" target="_blank" rel="noopener">https://www.xuanim.com/forum/</a>
      </p>
      <hr class="divider">
      <h4 style="margin:0 0 12px;font-size:14px;font-weight:600"><?php echo htmlspecialchars($clientLang->disclaimerTitle); ?> / Disclaimer</h4>
      <div class="disclaimer-box">
<?php if ($acceptLang === 'cn'): ?>
        <h3>免责声明</h3>
        <p>本项目以 GNU Affero General Public License v3.0 (AGPLv3) 协议开源发布。</p>
        <p>本免责声明是对 AGPLv3 协议条款的补充说明，不替代、不修改 AGPLv3 协议中的任何条款。AGPLv3 协议第15-16条所规定的免责和责任限制条款继续完全适用。</p>
        <p>使用本软件前，请务必仔细阅读并理解以下条款：</p>
        <h4>1. 合法使用声明</h4>
        <p>本软件仅供合法用途使用。严禁将本软件用于任何违反当地法律法规的活动，包括但不限于：</p>
        <ul>
          <li>侵犯他人隐私</li>
          <li>传播违法信息</li>
          <li>进行网络攻击或黑客活动</li>
          <li>从事诈骗、勒索等犯罪行为</li>
          <li>其他任何违反法律法规的行为</li>
        </ul>
        <h4>2. 用户责任</h4>
        <p>用户在使用本软件时，须确保其行为符合所在国家/地区的法律法规。用户对使用本软件进行的任何活动承担全部法律责任。本软件开发者及贡献者不对用户的违法行为承担任何责任。</p>
        <h4>3. 免责条款</h4>
        <p>本软件按"原样"提供，不附带任何明示或暗示的保证。在任何情况下，本软件开发者、贡献者或相关方均不对以下情况承担责任：</p>
        <ul>
          <li>因使用或无法使用本软件导致的任何损失</li>
          <li>用户违法使用本软件导致的任何后果</li>
          <li>任何直接、间接、偶然、特殊或后果性损害</li>
        </ul>
        <h4>4. 知识产权</h4>
        <p>本软件尊重知识产权，用户在使用本软件时须遵守相关知识产权法律法规。严禁利用本软件侵犯他人知识产权。</p>
        <h4>5. 适用法律与解释</h4>
        <p>本免责声明依据中华人民共和国法律解释和执行。如有争议，应友好协商解决；协商不成的，可向有管辖权的人民法院提起诉讼。本声明中如有任何条款被认定为无效或不可执行，不影响其他条款的有效性。</p>
        <p style="font-weight:600">如果您不同意上述条款，请勿使用本软件。一旦开始使用本软件，即表示您已完全理解并同意接受本免责声明的所有条款。</p>
<?php else: ?>
        <h3>Disclaimer</h3>
        <p>This project is released as open source under the GNU Affero General Public License v3.0 (AGPLv3).</p>
        <p>This disclaimer is a supplement to the provisions of the AGPLv3 and does not replace or modify any provisions therein.</p>
        <p>The disclaimer of warranty and limitation of liability provisions set forth in Sections 15 and 16 of the AGPLv3 shall continue to apply in full.</p>
        <p>Please read and understand the following provisions carefully before using this software:</p>
        <h4>Lawful Use Statement</h4>
        <p>This software is intended for lawful purposes only. It is strictly prohibited to use this software for any activities that violate local laws and regulations, including but not limited to:</p>
        <ul>
          <li>Infringing on the privacy of others;</li>
          <li>Disseminating illegal information;</li>
          <li>Engaging in network attacks or hacking activities;</li>
          <li>Engaging in criminal acts such as fraud and extortion;</li>
          <li>Any other acts that violate laws and regulations.</li>
        </ul>
        <h4>User Responsibility</h4>
        <p>Users must ensure that their actions comply with the laws and regulations of their respective countries or regions when using this software.</p>
        <p>Users bear full legal responsibility for any activities conducted using this software.</p>
        <p>The developers and contributors of this software shall not be held liable for any illegal acts committed by users.</p>
        <h4>Disclaimer of Liability</h4>
        <p>This software is provided "AS IS", without warranty of any kind, express or implied. In no event shall the developers, contributors, or related parties be liable for the following:</p>
        <ul>
          <li>Any loss resulting from the use or inability to use this software;</li>
          <li>Any consequences resulting from the illegal use of this software by the user;</li>
          <li>Any direct, indirect, incidental, special, or consequential damages.</li>
        </ul>
        <h4>Intellectual Property</h4>
        <p>This software respects intellectual property rights. Users must comply with relevant intellectual property laws and regulations when using this software.</p>
        <p>It is strictly prohibited to use this software to infringe the intellectual property rights of others.</p>
        <h4>Governing Law and Interpretation</h4>
        <p>This Disclaimer shall be interpreted and enforced in accordance with the laws of the People's Republic of China.</p>
        <p>Any dispute shall be resolved through friendly negotiation; if negotiation fails, a lawsuit may be filed with a People's Court of competent jurisdiction.</p>
        <p>If any provision of this Disclaimer is held to be invalid or unenforceable, the validity of the remaining provisions shall not be affected.</p>
        <p>If you do not agree to the above provisions, please do not use this software.</p>
        <p>By using this software, you signify that you have fully understood and agreed to accept all provisions of this Disclaimer.</p>
<?php endif; ?>
      </div>
      <div class="disclaimer-check">
        <label class="checkbox-inline">
          <input type="checkbox" id="agree-disclaimer">
          <?php echo htmlspecialchars($clientLang->agreeCheckbox); ?>
        </label>
      </div>
    </div>
    <div class="panel-footer">
      <button class="btn primary disabled" id="btn-start-install" disabled title="<?php echo htmlspecialchars($clientLang->agreeRequired); ?>" onclick="if(!this.disabled)goStep(2)"><?php echo htmlspecialchars($clientLang->btnStartInstall); ?></button>
    </div>
  </div>

  <!-- ── Step 2: 数据库 / Database ── -->
  <div class="wizard-card hidden" id="step-2">
    <div class="panel-heading">
      <strong><?php echo htmlspecialchars($clientLang->step2Title); ?></strong>
      <small><?php echo htmlspecialchars($clientLang->step2SubTitle); ?></small>
    </div>
    <div class="panel-body">
      <form class="form form-horz" onsubmit="return false;">
        <div class="form-row">
          <div class="w-1/2 form-group">
            <label class="form-label required"><?php echo htmlspecialchars($clientLang->dbHost); ?></label>
            <input class="form-control" id="db-host" type="text" value="127.0.0.1" placeholder="127.0.0.1">
          </div>
        </div>
        <div class="form-row">
          <div class="w-1/2 form-group">
            <label class="form-label required"><?php echo htmlspecialchars($clientLang->dbPort); ?></label>
            <input class="form-control" id="db-port" type="text" value="3306" placeholder="3306">
          </div>
        </div>
        <div class="form-row">
          <div class="w-1/2 form-group">
            <label class="form-label required"><?php echo htmlspecialchars($clientLang->dbUser); ?></label>
            <input class="form-control" id="db-user" type="text">
          </div>
        </div>
        <div class="form-row">
          <div class="w-1/2 form-group">
          <label class="form-label"><?php echo htmlspecialchars($clientLang->dbPassword); ?></label>
          <input class="form-control" id="db-password" type="password">
          </div>
        </div>
        <div class="form-row">
          <div class="w-1/2 form-group">
            <label class="form-label required"><?php echo htmlspecialchars($clientLang->dbName); ?></label>
            <input class="form-control" id="db-name" type="text" value="xxb" placeholder="xxb">
          </div>
          <div class="w-1/2 form-tip">
            <div class="ml-2 text-base"><?php echo htmlspecialchars($clientLang->dbNameTip); ?></div>
          </div>
        </div>
        <div id="db-alert"></div>
      </form>
    </div>
    <div class="panel-footer">
      <button class="btn link" id="btn-testdb" onclick="testDB()"><?php echo htmlspecialchars($clientLang->btnTestDB); ?></button>
      <button class="btn" onclick="goStep(1)"><?php echo htmlspecialchars($clientLang->btnPrev); ?></button>
      <button class="btn primary" onclick="validateDB()"><?php echo htmlspecialchars($clientLang->btnNext); ?></button>
    </div>
  </div>

  <!-- ── Step 3: 服务器 / Server ── -->
  <div class="wizard-card hidden" id="step-3">
    <div class="panel-heading">
      <strong><?php echo htmlspecialchars($clientLang->step3Title); ?></strong>
    </div>
    <div class="panel-body">
      <form class="form form-horz" onsubmit="return false;">
        <div id="server-alert"></div>
        <div class="form-row">
          <div class="w-1/2 form-group">
            <label class="form-label required"><?php echo htmlspecialchars($clientLang->serverHost); ?></label>
            <div class="w-full">
              <input class="form-control" id="server-host" type="text" placeholder="example.com">
            </div>
          </div>
          <div class="w-1/3 form-tip">
            <div class="ml-2 text-base"><?php echo htmlspecialchars($clientLang->serverHostTip); ?></div>
          </div>
        </div>
        <div class="form-row">
          <div class="w-1/2 form-group">
            <label class="form-label required"><?php echo htmlspecialchars($clientLang->portCommon); ?></label>
            <input class="form-control" id="port-common" type="text" value="11443">
          </div>
        </div>
        <div class="form-row">
          <div class="w-1/2 form-group">
            <label class="form-label required"><?php echo htmlspecialchars($clientLang->portChat); ?></label>
            <input class="form-control" id="port-chat" type="text" value="11444">
          </div>
        </div>
        <div class="form-row">
          <div class="w-1/2 form-group">
            <label class="form-label required"><?php echo htmlspecialchars($clientLang->portStun); ?></label>
            <input class="form-control" id="port-stun" type="text" value="3478">
          </div>
          <div class="w-1/2 form-tip">
            <div class="ml-2 text-base"><?php echo htmlspecialchars($clientLang->portStunTip); ?></div>
          </div>
        </div>
        <div class="form-row">
          <div class="w-1/2 form-group">
            <label class="form-label"><?php echo htmlspecialchars($clientLang->httpsLabel); ?></label>
            <select class="form-control" id="server-https">
              <option value="off"><?php echo htmlspecialchars($clientLang->httpsOff); ?></option>
              <option value="on"><?php echo htmlspecialchars($clientLang->httpsOn); ?></option>
            </select>
          </div>
        </div>
      </form>
    </div>
    <div class="panel-footer">
      <button class="btn" onclick="goStep(2)"><?php echo htmlspecialchars($clientLang->btnPrev); ?></button>
      <button class="btn primary" onclick="validateServer()"><?php echo htmlspecialchars($clientLang->btnNext); ?></button>
    </div>
  </div>

  <!-- ── Step 4: 管理员 / Admin ── -->
  <div class="wizard-card hidden" id="step-4">
    <div class="panel-heading">
      <strong><?php echo htmlspecialchars($clientLang->step4Title); ?></strong>
      <small><?php echo htmlspecialchars($clientLang->step4SubTitle); ?></small>
    </div>
    <div class="panel-body">
      <form class="form form-horz" onsubmit="return false;">
        <div id="options-alert"></div>
        <div class="form-row">
          <div class="w-1/2 form-group">
            <label class="form-label required"><?php echo htmlspecialchars($clientLang->adminUser); ?></label>
            <input class="form-control" id="admin-user" type="text">
          </div>
        </div>
        <div class="form-row">
          <div class="w-1/2 form-group">
            <label class="form-label required"><?php echo htmlspecialchars($clientLang->adminPassword); ?></label>
            <input class="form-control" id="admin-password" type="password">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label"></label>
          <div>
            <label class="checkbox-inline">
              <input type="checkbox" id="import-demo">
              <?php echo htmlspecialchars($clientLang->importDemo); ?>
            </label>
          </div>
        </div>
        <div class="alert alert-info" style="margin-top:12px">
          💡 <?php echo htmlspecialchars($clientLang->adminTip); ?>
        </div>
      </form>
    </div>
    <div class="panel-footer">
      <button class="btn" onclick="goStep(3)"><?php echo htmlspecialchars($clientLang->btnPrev); ?></button>
      <button class="btn primary" onclick="startInstall()"><?php echo htmlspecialchars($clientLang->btnStartInstall2); ?></button>
    </div>
  </div>

  <!-- ── Step 5: 安装 & 完成 / Installing & Done ── -->
  <div class="wizard-card hidden" id="step-5">
    <div class="panel-heading" id="step5-header">
      <strong id="step5-title"><?php echo htmlspecialchars($clientLang->step5Installing); ?></strong>
      <small id="install-status-desc"><?php echo htmlspecialchars($clientLang->step5Desc); ?></small>
    </div>
    <div class="panel-body">
      <!-- 安装中 -->
      <div id="step5-installing">
        <div class="progress">
          <div class="progress-bar" id="progress-fill" style="width:0%"></div>
        </div>
        <div class="log-box" id="log-box"></div>
        <div id="install-error" class="alert alert-danger hidden" style="margin-top:12px">
          <span>❌</span> <span id="install-error-msg"></span>
        </div>
      </div>
      <!-- 安装完成 -->
      <div id="step5-done" class="hidden" style="text-align:center;padding:24px 0">
        <div class="done-icon">✓</div>
        <h4 class="text-success" style="margin-bottom:8px"><?php echo htmlspecialchars($clientLang->step5SuccessTitle); ?></h4>
        <p class="text-muted" id="done-sub-text"><?php echo htmlspecialchars($clientLang->step5SuccessDesc2); ?></p>
        <p style="margin-top:16px">
          <a class="btn primary hidden" id="btn-goto-xxb" href="#"><?php echo htmlspecialchars($clientLang->btnGotoServer); ?></a>
        </p>
      </div>
    </div>
    <div class="panel-footer" id="step5-footer" style="display:none">
      <button class="btn" onclick="goStep(4)"><?php echo htmlspecialchars($clientLang->btnBackModify); ?></button>
      <button class="btn primary" onclick="startInstall()"><?php echo htmlspecialchars($clientLang->btnRetryInstall); ?></button>
    </div>
  </div>

</main>

<script src="zui/zui.js"></script>
<script>
/* ── 状态 ── */
let currentStep = 1;
let sysInfo     = null;

const STEPS = ['', 'step1', 'step2', 'step3', 'step4', 'step5'];

/* ── 步骤导航 ── */
function goStep(n) {
  document.getElementById('step-' + currentStep).classList.add('hidden');
  document.getElementById('step-' + n).classList.remove('hidden');
  currentStep = n;
  if (n === 3) {
    if (!sysInfo) loadSysInfo();
    var hostInput = document.getElementById('server-host');
    if (hostInput && !hostInput.value.trim()) hostInput.value = window.location.hostname || '';
  }
}

/* ── Alert 渲染（error → alert-danger，success → alert-success）── */
function renderAlert(type, msg) {
  const cls = type === 'error' ? 'danger' : type;
  const icon = type === 'success' ? '✓' : '✗';
  return `<div class="alert alert-${cls}" style="margin-bottom:12px">${icon} ${escHtml(msg)}</div>`;
}

/* ── Step 2: 数据库 ── */
function showDbAlert(type, msg) { 
  document.getElementById('db-alert').innerHTML = renderAlert(type, msg);
  let textClass = type === 'success' ? 'text-success' : 'text-danger';
  document.getElementById('db-alert').classList.remove('text-success', 'text-danger');
  document.getElementById('db-alert').classList.add(textClass);
}
function clearDbAlert()         { document.getElementById('db-alert').innerHTML = ''; }

function showOptionsAlert(type, msg) { document.getElementById('options-alert').innerHTML = renderAlert(type, msg); }
function clearOptionsAlert()         { document.getElementById('options-alert').innerHTML = ''; }

function validateOptions() {
  clearOptionsAlert();
  const adminUser     = document.getElementById('admin-user').value.trim();
  const adminPassword = document.getElementById('admin-password').value;
  clearFieldError('admin-user');
  clearFieldError('admin-password');
  if (!adminUser) {
    setFieldError('admin-user');
    showOptionsAlert('error', i18n.msgNeedAdminUser);
    return false;
  }
  if (!adminPassword) {
    setFieldError('admin-password');
    showOptionsAlert('error', i18n.msgNeedAdminPwd);
    return false;
  }
  return true;
}

function getDbParams() {
  return {
    host:     document.getElementById('db-host').value.trim(),
    port:     document.getElementById('db-port').value.trim(),
    user:     document.getElementById('db-user').value.trim(),
    password: document.getElementById('db-password').value,
    database: document.getElementById('db-name').value.trim(),
  };
}

async function checkDbConnection() {
  const res = await fetch('/api/install/checkdb', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(getDbParams())
  });
  return res.json();
}

async function testDB() {
  clearDbAlert();
  const btn = document.getElementById('btn-testdb');
  btn.disabled = true;
  btn.textContent = i18n.dbTestDoing;
  try {
    const data = await checkDbConnection();
    if (data.success) { showDbAlert('success', i18n.dbTestSuccess); }
    else              { showDbAlert('error', i18n.dbTestFail + data.error); }
  } catch(e) {
    showDbAlert('error', i18n.dbReqFail + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = i18n.btnTestDB;
  }
}

/* ── 通用表单校验：必填项高亮 ── */
function clearFieldError(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const group = input.closest('.form-group');
  if (!group) return;
  group.classList.remove('has-error');
  const tip = group.querySelector('.form-tip.field-error-tip');
  if (tip) tip.remove();
}

function setFieldError(inputId, message) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const group = input.closest('.form-group');
  if (!group) return;
  group.classList.add('has-error');
  let tip = group.querySelector('.form-tip.field-error-tip');
  if (!tip) {
    tip = document.createElement('div');
    tip.className = 'form-tip field-error-tip';
    group.appendChild(tip);
  }
  tip.textContent = message || '该字段不能为空';
}

async function validateDB() {
  clearDbAlert();
  ['db-host', 'db-port', 'db-user', 'db-name'].forEach(clearFieldError);

  const host = document.getElementById('db-host').value.trim();
  const port = document.getElementById('db-port').value.trim();
  const user = document.getElementById('db-user').value.trim();
  const name = document.getElementById('db-name').value.trim();

  let invalid = false;
  if (!host) { setFieldError('db-host'); invalid = true; }
  if (!port) { setFieldError('db-port'); invalid = true; }
  if (!user) { setFieldError('db-user'); invalid = true; }
  if (!name) { setFieldError('db-name'); invalid = true; }
  if (invalid) {
    return;
  }
  try {
    const data = await checkDbConnection();
    if (data.success) { showDbAlert('success', '数据库连接成功！'); goStep(3); }
    else              { showDbAlert('error', '连接失败：' + data.error); }
  } catch(e) {
    showDbAlert('error', '请求失败：' + e.message);
  }
}

function showServerAlert(type, msg) {
  const el = document.getElementById('server-alert');
  if (el) el.innerHTML = renderAlert(type, msg);
}

function validatePortValue(value) {
  if (!value || !/^\d+$/.test(value)) return false;
  const n = Number(value);
  return n >= 1 && n <= 65535;
}

function validateServer() {
  clearFieldError('server-host');
  clearFieldError('port-common');
  clearFieldError('port-chat');
  clearFieldError('port-stun');

  const host   = document.getElementById('server-host').value.trim();
  const common = document.getElementById('port-common').value.trim();
  const chat   = document.getElementById('port-chat').value.trim();
  const stun   = document.getElementById('port-stun').value.trim();
  let invalid = false;

  if (!host) {
    setFieldError('server-host');
    invalid = true;
  }
  if (!common) {
    setFieldError('port-common', i18n.fieldRequiredTip);
    invalid = true;
  } else if (!validatePortValue(common)) {
    setFieldError('port-common', i18n.portRange);
    invalid = true;
  }

  if (!chat) {
    setFieldError('port-chat', i18n.fieldRequiredTip);
    invalid = true;
  } else if (!validatePortValue(chat)) {
    setFieldError('port-chat', i18n.portRange);
    invalid = true;
  }

  if (!stun) {
    setFieldError('port-stun', i18n.fieldRequiredTip);
    invalid = true;
  } else if (!validatePortValue(stun)) {
    setFieldError('port-stun', i18n.portRange);
    invalid = true;
  }

  if (invalid) {
    return;
  }
  goStep(4);
}

/* ── Step 3: 服务器配置 ── */
async function loadSysInfo() {
  try {
    const res = await fetch('/api/install/sysinfo');
    sysInfo = await res.json();
    if (sysInfo.defaultPorts) {
      const p = sysInfo.defaultPorts;
      document.getElementById('port-common').value = p.common || '11443';
      document.getElementById('port-chat').value   = p.chat   || '11444';
      document.getElementById('port-stun').value   = p.stun   || '3478';
    }
  } catch(e) {}
}

function getServerHost() {
  const host   = document.getElementById('server-host').value.trim();
  const https  = document.getElementById('server-https').value;
  const port   = '9080';
  const scheme = https === 'on' ? 'https' : 'http';
  if (!host) return scheme + '://127.0.0.1:' + port + '/xxb/';
  const base = host.includes('://') ? host : scheme + '://' + host;
  return base.replace(/\/$/, '') + ':' + port + '/xxb/';
}

/* ── Step 5: 安装执行（SSE）── */
let installRunning = false;

function startInstall() {
  if (installRunning) return;
  if (!validateOptions()) { goStep(4); return; }
  installRunning = true;
  goStep(5);

  const step5Header = document.getElementById('step5-header');
  if (step5Header) step5Header.style.display = 'flex';

  const logBox   = document.getElementById('log-box');
  const errBox   = document.getElementById('install-error');
  const errMsg   = document.getElementById('install-error-msg');
  const footer   = document.getElementById('step5-footer');
  const progress = document.getElementById('progress-fill');
  const desc     = document.getElementById('install-status-desc');

  logBox.innerHTML = '';
  errBox.classList.add('hidden');
  footer.style.display = 'none';
  progress.style.width = '5%';

  const params = {
    db: {
      host:     document.getElementById('db-host').value.trim()     || '127.0.0.1',
      port:     document.getElementById('db-port').value.trim()     || '3306',
      user:     document.getElementById('db-user').value.trim()     || 'root',
      password: document.getElementById('db-password').value,
      database: document.getElementById('db-name').value.trim()     || 'xxb',
    },
    server: {
      commonPort: document.getElementById('port-common').value.trim() || '11443',
      chatPort:   document.getElementById('port-chat').value.trim()   || '11444',
      adminPort:  '9080',
      stunPort:   document.getElementById('port-stun').value.trim()   || '3478',
      https:      document.getElementById('server-https').value,
      serverHost: getServerHost(),
    },
    options: {
      importDemo:    document.getElementById('import-demo').checked,
      adminUser:     document.getElementById('admin-user').value.trim()     || 'admin',
      adminPassword: document.getElementById('admin-password').value || '123456',
    }
  };

  let logCount = 0;
  const totalSteps = 8;

  function appendLog(msg, cls) {
    const line = document.createElement('div');
    line.className = 'log-line' + (cls ? ' ' + cls : '');
    const ts = new Date().toLocaleTimeString();
    line.textContent = '[' + ts + '] ' + msg;
    logBox.appendChild(line);
    logBox.scrollTop = logBox.scrollHeight;
    logCount++;
    progress.style.width = Math.min(90, Math.round((logCount / totalSteps) * 90)) + '%';
  }

  fetch('/api/install/run', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(params)
  })
  .then(response => {
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const reader  = response.body.getReader();
    const decoder = new TextDecoder();
    let   buf     = '';

    function pump() {
      return reader.read().then(({done, value}) => {
        if (done) return;
        buf += decoder.decode(value, {stream: true});
        const parts = buf.split('\n\n');
        buf = parts.pop();
        parts.forEach(chunk => {
          chunk.split('\n').forEach(line => {
            if (!line.startsWith('data: ')) return;
            try {
              const ev = JSON.parse(line.slice(6));
              if (ev.type === 'log') {
                appendLog(ev.msg);
              } else if (ev.type === 'done') {
                progress.style.width = '100%';
                appendLog(ev.msg, 'done');
                desc.textContent = i18n.step5SuccessDesc1;
                setTimeout(() => {
                  document.getElementById('step5-installing').classList.add('hidden');
                  document.getElementById('step5-done').classList.remove('hidden');
                  document.getElementById('step5-title').textContent = i18n.step5SuccessTitle;
                  document.getElementById('done-sub-text').textContent = i18n.step5SuccessDesc2;
                  if (step5Header) step5Header.style.display = 'none';
                  waitForServer();
                }, 1000);
              } else if (ev.type === 'error') {
                appendLog(i18n.step5ErrorPrefix + ev.msg, 'error');
                errMsg.textContent = ev.msg;
                errBox.classList.remove('hidden');
                footer.style.display = 'flex';
                desc.textContent = i18n.step5Desc;
                installRunning = false;
              }
            } catch(_) {}
          });
        });
        return pump();
      });
    }
    return pump();
  })
  .catch(e => {
    appendLog(i18n.step5ErrorPrefix + e.message, 'error');
    errMsg.textContent = e.message;
    errBox.classList.remove('hidden');
    footer.style.display = 'flex';
    installRunning = false;
  });
}

/* ── 等待服务就绪并跳转 ── */
function waitForServer() {
  const btn       = document.getElementById('btn-goto-xxb');
  const doneSubEl = document.getElementById('done-sub-text');
  const xxbUrl    = '/xxb/';
  const indexUrl  = '/index.php';
  let   tries     = 0;
  const max       = 60;

  function attempt() {
    tries++;
    fetch(xxbUrl, {method: 'HEAD', redirect: 'follow'})
      .then(r => {
        if (r.ok || r.status === 302 || r.status === 200) {
          if (doneSubEl) doneSubEl.textContent = i18n.step5SuccessReady;
          btn.href = indexUrl;
          btn.classList.remove('hidden');
        } else { retry(); }
      })
      .catch(() => retry());
  }

  function retry() {
    if (tries < max) {
      setTimeout(attempt, 1000);
    } else {
      if (doneSubEl) doneSubEl.textContent = i18n.step5StartSlow;
      btn.href = indexUrl;
      btn.textContent = i18n.btnGotoManual;
      btn.classList.remove('hidden');
    }
  }

  setTimeout(attempt, 2000);
}

/* ── 工具 ── */
function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

(function initFieldLiveValidation() {
  const ids = [
    'db-host',
    'db-port',
    'db-user',
    'db-name',
    'server-host',
    'port-common',
    'port-chat',
    'port-stun',
    'admin-user',
    'admin-password'
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const handler = () => {
      if (String(el.value || '').trim()) clearFieldError(id);
    };
    el.addEventListener('input', handler);
    el.addEventListener('change', handler);
    el.addEventListener('blur', handler);
  });
})();

(function initI18N() {
  window.i18n = {
    msgNeedAdminUser : <?php echo json_encode($clientLang->msgNeedAdminUser); ?>,
    msgNeedAdminPwd  : <?php echo json_encode($clientLang->msgNeedAdminPwd); ?>,
    dbTestDoing      : <?php echo json_encode($clientLang->dbTestDoing); ?>,
    dbTestSuccess    : <?php echo json_encode($clientLang->dbTestSuccess); ?>,
    dbTestFail       : <?php echo json_encode($clientLang->dbTestFail); ?>,
    dbReqFail        : <?php echo json_encode($clientLang->dbReqFail); ?>,
    fieldRequiredTip : <?php echo json_encode($clientLang->fieldRequiredTip); ?>,
    portRange        : <?php echo json_encode($clientLang->portRange); ?>,
    btnTestDB        : <?php echo json_encode($clientLang->btnTestDB); ?>,
    step5SuccessDesc1: <?php echo json_encode($clientLang->step5SuccessDesc1); ?>,
    step5SuccessTitle: <?php echo json_encode($clientLang->step5SuccessTitle); ?>,
    step5SuccessDesc2: <?php echo json_encode($clientLang->step5SuccessDesc2); ?>,
    step5ErrorPrefix : <?php echo json_encode($clientLang->step5ErrorPrefix); ?>,
    step5Desc        : <?php echo json_encode($clientLang->step5Desc); ?>,
    step5SuccessReady: <?php echo json_encode($clientLang->step5SuccessReady); ?>,
    step5StartSlow   : <?php echo json_encode($clientLang->step5StartSlow); ?>,
    btnGotoManual    : <?php echo json_encode($clientLang->btnGotoManual); ?>,
    btnGotoServer    : <?php echo json_encode($clientLang->btnGotoServer); ?>,
    agreeRequired    : <?php echo json_encode($clientLang->agreeRequired); ?>
  };
})();

/* ── 免责声明同意检查 ── */
(function initDisclaimerCheck() {
  const checkbox = document.getElementById('agree-disclaimer');
  const btn      = document.getElementById('btn-start-install');
  if (!checkbox || !btn) return;
  checkbox.addEventListener('change', function() {
    if (this.checked) {
      btn.disabled = false;
      btn.classList.remove('disabled');
      btn.title = '';
    } else {
      btn.disabled = true;
      btn.classList.add('disabled');
      btn.title = i18n.agreeRequired;
    }
  });
})();

</script>
</body>
</html>
