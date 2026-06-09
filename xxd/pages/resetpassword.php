<?php
/**
 * Xuanxuan password reset wizard.
 */

error_reporting(0);

if (!isset($lang) || !is_object($lang)) $lang = new stdClass();
if (!isset($lang->cn) || !is_object($lang->cn)) $lang->cn = new stdClass();
if (!isset($lang->en) || !is_object($lang->en)) $lang->en = new stdClass();

$lang->cn->pageTitle       = '重置密码';
$lang->cn->serverName      = '喧喧';
$lang->cn->stepVerify      = '验证服务器权限';
$lang->cn->stepPassword    = '设置新密码';
$lang->cn->stepDone        = '重置完成';
$lang->cn->verifyIntro     = '请管理员登录喧喧服务器，执行以下命令：';
$lang->cn->noteTitle       = '注意：';
$lang->cn->note1           = '文件内容必须为空。';
$lang->cn->note2           = '如果之前文件已存在，请删除后重新创建。';
$lang->cn->note3           = '校验成功后，该文件将自动失效。';
$lang->cn->copyCommand     = '复制命令';
$lang->cn->copied          = '已复制';
$lang->cn->verifyButton    = '我已创建，开始验证';
$lang->cn->fileErr         = '未检测到指定文件，请确认文件路径和文件名是否正确。';
$lang->cn->expiredErr      = '当前重置请求已过期，请返回登录页重新发起。';
$lang->cn->continueButton  = '继续设置密码';
$lang->cn->backLogin       = '返回登录';
$lang->cn->account         = '管理员账号';
$lang->cn->accountHolder   = '请输入管理员账号';
$lang->cn->password        = '新密码';
$lang->cn->passwordHolder  = '请输入新密码';
$lang->cn->password2       = '确认新密码';
$lang->cn->password2Holder = '请再次输入新密码';
$lang->cn->submit          = '确认重置';
$lang->cn->backPrev        = '返回上一步';
$lang->cn->confirmBack     = '返回后已填写的密码将被清空，是否继续？';
$lang->cn->emptyPassword   = '密码/重复密码不允许为空';
$lang->cn->emptyAccount    = '请输入管理员账号';
$lang->cn->passwordRule    = '密码应该符合规则，长度至少为六位';
$lang->cn->passwordSame    = '两次输入必须一致';
$lang->cn->reqErr          = '请求失败，请重试。';
$lang->cn->doneMessage     = '密码重置成功，请使用新密码登录。';

$lang->en->pageTitle       = 'Reset Password';
$lang->en->serverName      = 'Xuanxuan';
$lang->en->stepVerify      = 'Verify Server Permission';
$lang->en->stepPassword    = 'Set New Password';
$lang->en->stepDone        = 'Reset Complete';
$lang->en->verifyIntro     = 'Please log in to the Xuanxuan server and execute the following command:';
$lang->en->noteTitle       = 'Note:';
$lang->en->note1           = 'The file content must be empty.';
$lang->en->note2           = 'If the file already exists, delete it and create it again.';
$lang->en->note3           = 'After verification succeeds, the file will become invalid automatically.';
$lang->en->copyCommand     = 'Copy';
$lang->en->copied          = 'Copied';
$lang->en->verifyButton    = 'I have created it, verify';
$lang->en->fileErr         = 'The specified file does not exist. Please check the path and filename.';
$lang->en->expiredErr      = 'The reset request has expired. Please try again.';
$lang->en->continueButton  = 'Continue setting password';
$lang->en->backLogin       = 'Back to login';
$lang->en->account         = 'Admin account';
$lang->en->accountHolder   = 'Enter admin account';
$lang->en->password        = 'New password';
$lang->en->passwordHolder  = 'Enter new password';
$lang->en->password2       = 'Confirm new password';
$lang->en->password2Holder = 'Enter new password again';
$lang->en->submit          = 'Reset password';
$lang->en->backPrev        = 'Previous';
$lang->en->confirmBack     = 'The password you entered will be cleared after going back. Continue?';
$lang->en->emptyPassword   = 'Password/repeated password cannot be empty';
$lang->en->emptyAccount    = 'Please enter admin account';
$lang->en->passwordRule    = 'Password should be at least 6 characters';
$lang->en->passwordSame    = 'Passwords must be the same';
$lang->en->reqErr          = 'Request failed, please try again.';
$lang->en->doneMessage     = 'Password reset successfully. Please log in with the new password.';

$acceptLang = isset($_GET['clientLang']) ? $_GET['clientLang'] : 'en';
if (!isset($lang->$acceptLang)) $acceptLang = 'en';
$clientLang = $lang->$acceptLang;
$xxbUrl     = '/xxb/';

$runDir = dirname(__DIR__);
$tmpDir = $runDir . DIRECTORY_SEPARATOR . 'tmp';
if (!is_dir($tmpDir)) @mkdir($tmpDir, 0777, true);
$tokenDir = $tmpDir . DIRECTORY_SEPARATOR;
?>
<!DOCTYPE html>
<html lang="<?php echo $acceptLang === 'cn' ? 'zh-CN' : 'en'; ?>">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?php echo htmlspecialchars($clientLang->pageTitle); ?> - <?php echo htmlspecialchars($clientLang->serverName); ?></title>
  <link rel="icon" href="/favicon.ico" type="image/x-icon" />
  <link rel="stylesheet" href="zui/zui.css">
  <style>
    body { background: #f4f5f7; color: #1f2329; font-size: 14px; }
    .page-main { max-width: 1000px; margin: 36px auto 0; padding: 0 20px; }
    .reset-card { background: #fff; border: 1px solid #e5e5e5; border-radius: 16px; box-shadow: 0px 4px 12px 0px #0000001F; overflow: hidden; }
    .reset-card-body { padding: 48px 0; }
    .steps { width: 100%; padding: 0 40px; margin-bottom: 48px; display: flex; justify-content: space-between; align-items: stretch; gap: 0; position: relative;}
    .step { flex: 1; min-width: 70px;  display: flex; flex-direction: column; align-items: center; position: relative; text-align: center; font-size: 14px; }
    .step:not(:last-child)::after { content: ""; position: absolute; top: 13px; left: 50%; width: 100%; height: 2px; background-color: #d4dee8; z-index: 1; transform: translateX(0%); }
    .step-index { width: 26px; height: 26px; border-radius: 50%; line-height: 26px; font-weight: 700; color: #fff; transition: all 0.2s ease; position: relative; z-index: 3; background: #C9CED8; margin-bottom: 6px;}
    .step-text { color: #98A2B3; max-width: 100px; word-break: keep-all; text-align: center;}
    .step.done::after {background: #2B80FF;}
    .step.active .step-index, .step.done .step-index { color: #fff; background: #2B80FF; border-color: #2B80FF; }
    .step-panel { display: none; padding: 0 130px; }
    .step-panel.active { display: block; }
    .verify-box { display: flex; gap: 5px; background: #E6F2FF; border-radius: 8px; padding: 24px 16px; }
    .verify-intro {color: #1D4ED8;}
    .command-row { display: flex; gap: 10px; align-items: center; margin: 14px 0; }
    .command-text { flex: 1; padding: 8px 10px; background: #f8fafc; border: 1px solid #dfe3eb; border-radius: 4px; font-family: Menlo, Monaco, Consolas, monospace; font-size: 12px; word-break: break-all; }
    #copy-button { width: 80px; background: #F8FAFC; }
    .notes-title {margin-top: 12px; font-weight: 500;}
    .notes { margin: 8px 0 0; padding-left: 18px; line-height: 24px; color: #374151; }
    .actions { margin-top: 24px; display: flex; justify-content: center; align-items: center; gap: 16px; }
    .verify-panel .btn { width: 174px; }
  </style>
</head>
<body>
  <main class="page-main">
    <div class="reset-card">
      <div class="reset-card-body">
        <div class="steps" aria-label="steps">
          <div class="step active" data-step="1">
            <div class="step-index">1</div>
            <div class="step-text"><?php echo htmlspecialchars($clientLang->stepVerify); ?></div>
          </div>
          <div class="step" data-step="2">
            <div class="step-index">2</div>
            <div class="step-text"><?php echo htmlspecialchars($clientLang->stepPassword); ?></div>
          </div>
          <div class="step" data-step="3">
            <div class="step-index">3</div>
            <div class="step-text"><?php echo htmlspecialchars($clientLang->stepDone); ?></div>
          </div>
        </div>

        <!-- 验证服务器权限 -->
        <section class="step-panel verify-panel active" id="step-1">
          <div class="verify-box">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 2L23 6.2V12.8C23 18.1 19.2 22.8 14 24.6C8.8 22.8 5 18.1 5 12.8V6.2L14 2Z" fill="#2B80FF"/>
              <path d="M13.9998 8.19922C15.491 8.19922 16.6998 9.40805 16.6998 10.8992C16.6998 11.8388 16.2195 12.6661 15.491 13.1498V15.9992H12.5086V13.1498C11.7801 12.6661 11.2998 11.8388 11.2998 10.8992C11.2998 9.40805 12.5086 8.19922 13.9998 8.19922Z" fill="white"/>
            </svg>
            <div>
              <div class="verify-intro"><?php echo htmlspecialchars($clientLang->verifyIntro); ?></div>
              <div class="command-row">
                <div class="command-text" id="copy-command">...</div>
                <button class="btn" type="button" id="copy-button"><?php echo htmlspecialchars($clientLang->copyCommand); ?></button>
              </div>
            </div>
          </div>
          <div class="notes-title"><?php echo htmlspecialchars($clientLang->noteTitle); ?></div>
          <ol class="notes">
            <li><?php echo htmlspecialchars($clientLang->note1); ?></li>
            <li><?php echo htmlspecialchars($clientLang->note2); ?></li>
            <li><?php echo htmlspecialchars($clientLang->note3); ?></li>
          </ol>
          <div class="actions">
            <button class="btn btn-primary" type="button" id="verifyButton"><?php echo htmlspecialchars($clientLang->verifyButton); ?></button>
            <a class="btn btn-ghost" href="<?php echo $xxbUrl; ?>"><?php echo htmlspecialchars($clientLang->backLogin); ?></a>
          </div>
        </section>

        <!-- 重置密码 -->
        <section class="step-panel" id="step-2">
        </section>

        <!-- 重置完成 -->
        <section class="step-panel" id="step-3">
        </section>
      </div>
    </div>
  </main>
  <script src="zui/zui.js"></script>
  <script>
    let currentStep = 1;
    function switchStep(step) {
      currentStep = step;
      document.querySelectorAll('.step-panel').forEach(panel => panel.classList.remove('active'));
      document.getElementById('step-' + step).classList.add('active');
      document.querySelectorAll('.step').forEach(item => {
        const itemStep = Number(item.dataset.step);
        item.classList.toggle('active', itemStep === step);
        item.classList.toggle('done', itemStep < step);
      });
    }
  </script>
</body>
</html>
