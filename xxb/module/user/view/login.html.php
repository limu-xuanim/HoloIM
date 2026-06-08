<?php

/**
 * The login view file of user module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     user
 * @link        https://xuanim.com
 */
?>
<?php
include '../../common/view/header.lite.html.php';
js::import($jsRoot . 'md5.js');
js::set('scriptName', $_SERVER['SCRIPT_NAME']);
js::set('random', $this->session->random);
js::set('notEncryptedPwd', empty($config->notEncryptedPwd) ? false : $config->notEncryptedPwd);
css::internal('body{background-color:#f6f5f5}');
css::internal('.table-form>tbody>tr>th{width:80px}');
?>
<div class='container' style="background: url('<?php echo $webRoot ?>theme/default/images/main/login_bg.png') no-repeat; background-size: 100% 100%;">
  <div id='login'>
 
    <div class="panel-body" id="loginForm">
      <form method='post' target='hiddenwin' id='ajaxForm'>
        <div id='responser' class='text-center'></div>
        <div class='row'>
          <div class='panel-left text-center'>
            <?php echo html::image($this->config->webRoot . 'theme/default/images/main/logo.png'); ?>
          </div>
          <div class='panel-right'>
               <div class='panel-head'>
              <?php printf($lang->welcome, isset($config->company->name) ? $config->company->name : ''); ?>
              <div class='panel-actions'>
                <div class='dropdown' id='langs'>
                  <button type='button' class='btn' data-toggle='dropdown' title='Change Language/更换语言/更換語言'><?php echo $config->langs[$this->app->getClientLang()]; ?> <span class="caret"></span></button>
                  <ul class='dropdown-menu'>
                  <?php foreach ($config->langs as $key => $value): ?>
                    <li class="<?php echo $key == $this->app->getClientLang() ? 'active' : ''; ?>"><a href="###" data-value="<?php echo $key; ?>"><?php echo $value; ?></a></li>
                    <?php endforeach; ?>
                  </ul>
                </div>
              </div>
            </div>
            <table class='table table-form'>
              <tr>
                <td><?php echo $lang->user->account; ?></td>
              </tr>
              <tr>
                <td><?php echo html::input('account', '', "class='form-control' placeholder='{$lang->user->inputAccount}'"); ?></td>
              </tr>
              <tr>
                <td><?php echo $lang->user->password; ?></td>
              </tr>
              <tr>
                <td>
                  <div class="password-input-wrapper">
                    <?php echo html::password('password', '', "class='form-control password-input' placeholder='{$lang->user->inputPassword}'"); ?>
                    <div class="password-toggle" onclick="togglePassword()">
                      <!-- 睁着 -->
                    <?php echo html::svgIcon('eye-open', 16, 16, 'password-icon hidden', array('id' => 'eye-closed'));?>
                      <!-- 闭着 -->
                      <?php echo html::svgIcon('eye-closed', 16, 16, 'password-icon', array('id' => 'eye-open'));?>

                    </div>
                  </div>
                </td>
              </tr>
              <tr>
                <td class="btns">
                  <?php echo html::checkbox('keepLogin', array('on' => $lang->user->keepLogin), $this->cookie->keepLogin ? $this->cookie->keepLogin : 'off'); ?>
                  <?php echo html::a('/resetpassword.php', $lang->user->recoverPassword . '?', "class='forgot-password'"); ?>
                </td>
              </tr>
              <tr>
                <td>
                  <?php echo html::submitButton($lang->login) . html::hidden('referer', $referer); ?> &nbsp;
                </td>
              </tr>
            </table>
          </div>
        </div>
      </form>
    </div>
  </div>
  <div class='notice text-center'>
  </div>
</div>

<!-- 登录错误提示窗口 -->
<div class="error-modal" id="errorModal" style="display: none;">
  <div class="error-modal-content">
    <div class="error-content-row">
    <?php echo html::svgIcon('error');?>
      <div class="error-text">
        <?php echo $lang->user->loginFailed; ?>
      </div>
    </div>
    <div class="error-button-row">
      <button class="error-confirm-btn" onclick="hideErrorModal()"><?php echo $lang->user->confirm; ?></button>
    </div>
  </div>
</div>
<?php
if ($config->debug)
  js::import($jsRoot . 'jquery/form/min.js');
if (isset($pageJS))
  js::execute($pageJS);
js::set('ignoreNotice', $ignoreNotice);
js::set('ignore', $lang->user->ignore);
?>
</body>
</html>
