<?php
/**
 * The configure xuanxuan view file of setting module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     setting
 * @link        https://xuanim.com
 */
?>
<?php include '../../../common/view/header.html.php';?>
<?php $this->app->loadLang('client')?>
<?php $this->app->loadLang('setting', 'setting');?>
<div class="config-container">

<div class='panel'>
    <!-- 标题 -->
    <div class='config-page-title'>
        <?php echo $lang->setting->xuanxuan;?>
    </div>
    <form method='post' id='ajaxForm' class='form-ajax'>
        <!-- 通讯参数 -->
        <div class='config-section'>
            <div class='config-title'>
                <div class='config-title-text'><?php echo $lang->setting->chatConfig;?></div>
                <div class='title-line'></div>
            </div>
            <div class='config-content<?php if($type == 'edit'): ?> edit-mode<?php endif; ?>'>
                <div class='config-row'>
                    <div class='config-item'>
                        <?php if($type == 'edit'): ?>
                            <label class='form-label'>
                                <span class='required-star'>*</span>
                                <?php echo $lang->im->pollingInterval;?>
                                <span class='help-icon' title='<?php echo $lang->setting->pollingIntervalTip;?>'>
                                    <?php echo html::svgIcon('help');?>
                                </span>
                            </label>
                            <div class='input-with-unit'>
                                <input name="pollingInterval" type="number" class='form-input' value="<?php echo zget($config->xuanxuan, 'pollingInterval', 15);?>" required>
                                <span class='unit'><?php echo $lang->setting->units->second;?></span>
                            </div>
                            <span class='form-error'><?php echo $lang->setting->requiredField;?></span>
                        <?php else: ?>
                        <span class='config-label'><?php echo $lang->im->pollingInterval;?></span>
                        <span class='config-value'><?php echo zget($config->xuanxuan, 'pollingInterval', 15) . $lang->setting->units->second;?></span>
                        <?php endif; ?>
                    </div>
                    <div class='config-item'>
                        <?php if($type == 'edit'): ?>
                            <label class='form-label'>
                                <span class='required-star'>*</span>
                                <?php echo $lang->im->xxd->uploadFileSize;?>
                            </label>
                            <div class='input-with-unit'>
                                <input name="uploadFileSize" type="number" class='form-input' value="<?php echo zget($config->xuanxuan, 'uploadFileSize', 32);?>" required>
                                <span class='unit'>M</span>
                            </div>
                            <span class='form-error'><?php echo $lang->setting->requiredField;?></span>
                        <?php else: ?>
                        <span class='config-label'><?php echo $lang->im->xxd->uploadFileSize;?></span>
                        <span class='config-value'><?php echo zget($config->xuanxuan, 'uploadFileSize', 32);?>M</span>
                        <?php endif; ?>
                    </div>
                </div>
                <div class='config-row'>
                    <div class='config-item'>
                        <?php if($type == 'edit'): ?>
                            <label class='form-label'>
                                <span class='required-star'>*</span>
                                <?php echo $lang->im->tokenLifetime;?>
                            </label>
                            <div class='input-with-unit'>
                                <input name="tokenLifetime" type="number" class='form-input' value="<?php echo zget($config->xuanxuan, 'tokenLifetime', 30);?>" required>
                                <span class='unit'><?php echo $lang->setting->units->day;?></span>
                            </div>
                            <span class='form-error'><?php echo $lang->setting->requiredField;?></span>
                        <?php else: ?>
                        <span class='config-label'><?php echo $lang->im->tokenLifetime;?></span>
                            <span class='config-value'><?php echo zget($config->xuanxuan, 'tokenLifetime', 30) . $lang->setting->units->day;?></span>
                        <?php endif; ?>
                    </div>
                    <div class='config-item'>
                        <?php if($type == 'edit'): ?>
                            <label class='form-label'>
                                <span class='required-star'>*</span>
                                <?php echo $lang->im->tokenAuthWindow;?>
                            </label>
                            <div class='input-with-unit'>
                                <input name="tokenAuthWindow" type="number" class='form-input' value="<?php echo zget($config->xuanxuan, 'tokenAuthWindow', 20);?>" required>
                                <span class='unit'><?php echo $lang->setting->units->second;?></span>
                            </div>
                            <span class='form-error'><?php echo $lang->setting->requiredField;?></span>
                        <?php else: ?>
                        <span class='config-label'><?php echo $lang->im->tokenAuthWindow;?></span>
                        <span class='config-value'><?php echo zget($config->xuanxuan, 'tokenAuthWindow', 20) . $lang->im->secs;?></span>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>

        <!-- 底部按钮 -->
        <div class='config-buttons'>
            <?php if($type == 'edit'): ?>
            <?php echo html::submitButton($lang->setting->save, 'btn btn-primary btn-save');?>
            <!-- <button type="submit" class='btn btn-primary btn-save'><?php echo $lang->setting->save;?></button> -->
            <button type="button" class='btn btn-secondary btn-back' onclick="window.location.href='<?php echo $this->createLink('setting', 'xuanxuan');?>'"><?php echo $lang->setting->back;?></button>
            <?php else: ?>
            <button class='btn btn-secondary' onclick="window.location.href='<?php echo $this->createLink('setting', 'xuanxuan', 'type=edit');?>'"><?php echo $lang->setting->modifyConfig;?></button>
            <?php endif; ?>
        </div>
    </form>
</div>
</div>
<script>
document.addEventListener('DOMContentLoaded', function() {
    // 表单验证和交互功能
    const form = document.getElementById('ajaxForm');
    if (form) {
        // 表单验证
        function validateForm() {
            let isValid = true;
            const requiredFields = form.querySelectorAll('input[required], textarea[required]');

            requiredFields.forEach(function(field) {
                const configItem = field.closest('.config-item');
                if (!field.value.trim()) {
                    configItem.classList.add('error');
                    configItem.classList.add('show-required');
                    isValid = false;
                } else {
                    configItem.classList.remove('error');
                    configItem.classList.remove('show-required');
                }
            });

            // 验证端口号
            const portFields = form.querySelectorAll('input[type="number"]');
            portFields.forEach(function(field) {
                const configItem = field.closest('.config-item');
                const value = parseInt(field.value);
                if (field.value && (value < 1 || value > 65535)) {
                    configItem.classList.add('error');
                    isValid = false;
                }
            });

            return isValid;
        }

        // 必填项提示显示控制
        function toggleRequiredHint(input) {
            const configItem = input.closest('.config-item');
            if (input.hasAttribute('required')) {
                if (!input.value.trim()) {
                    configItem.classList.add('show-required');
                } else {
                    configItem.classList.remove('show-required');
                }
            }
        }

        // 初始化必填项提示显示
        const requiredInputs = form.querySelectorAll('input[required], textarea[required], select[required]');
        requiredInputs.forEach(function(input) {
            toggleRequiredHint(input);
        });

        // 实时验证
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(function(input) {
            input.addEventListener('blur', function() {
                const configItem = input.closest('.config-item');
                if (input.hasAttribute('required') && !input.value.trim()) {
                    configItem.classList.add('error');
                } else {
                    configItem.classList.remove('error');
                }
                // 控制必填项提示显示
                toggleRequiredHint(input);
            });

            input.addEventListener('input', function() {
                const configItem = input.closest('.config-item');
                if (configItem.classList.contains('error') && input.value.trim()) {
                    configItem.classList.remove('error');
                }
                // 控制必填项提示显示
                toggleRequiredHint(input);
            });
        });

        // 表单提交
        form.addEventListener('submit', function(e) {
            e.preventDefault();

            if (validateForm()) {
                // 收集表单数据
                const formData = new FormData(form);
                const data = {};

                // 处理普通输入框
                const inputs = form.querySelectorAll('input:not([type="radio"]), textarea, select');
                inputs.forEach(function(input) {
                    if (input.name) {
                        data[input.name] = input.value;
                    }
                });

                // 处理单选按钮
                const radios = form.querySelectorAll('input[type="radio"]:checked');
                radios.forEach(function(radio) {
                    data[radio.name] = radio.value;
                });

                // 显示保存提示
                const submitBtn = form.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;
                submitBtn.textContent = '<?php echo $lang->setting->saving;?>';
                submitBtn.disabled = true;

            } else {
                alert('<?php echo $lang->setting->checkRequiredFields;?>');
            }
        });

        // 帮助提示功能
        const helpIcons = form.querySelectorAll('.help-icon');
        helpIcons.forEach(function(icon) {
            icon.addEventListener('mouseenter', function() {
                const tooltip = document.createElement('div');
                tooltip.className = 'tooltip';
                tooltip.textContent = icon.getAttribute('title');
                tooltip.style.cssText = `
                    position: absolute;
                    background: #303133;
                    color: #fff;
                    padding: 8px 12px;
                    border-radius: 4px;
                    font-size: 12px;
                    z-index: 1000;
                    white-space: nowrap;
                    pointer-events: none;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                `;

                document.body.appendChild(tooltip);

                const rect = icon.getBoundingClientRect();
                tooltip.style.left = rect.left + 'px';
                tooltip.style.top = (rect.top - tooltip.offsetHeight - 8) + 'px';

                icon._tooltip = tooltip;
            });

            icon.addEventListener('mouseleave', function() {
                if (icon._tooltip) {
                    document.body.removeChild(icon._tooltip);
                    icon._tooltip = null;
                }
            });
        });
    }
});
</script>

<?php include '../../../common/view/footer.html.php';?>
