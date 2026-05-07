$(document).ready(function()
{
    $('#account').focus();

    setInterval('ping()', 1000 * config.pingInterval);

    $("#langs li > a").click(function() 
    {
        selectLang($(this).data('value'));
    });

    /* show update notice. */
    if(typeof(latest) != 'undefined')
    {
        if(typeof(v.ignoreNotice) == 'undefined' || $.inArray('update' + latest.version, v.ignoreNotice) == -1)
        {
            var content = 'NOTE: <a href=' + latest.url + ' target=\'_blank\'>' + latest.note + '(' + latest.releaseDate + ')</a>';
            content += "&nbsp;&nbsp;&nbsp;<a class='ignore' href=" + createLink('misc', 'ignoreNotice', 'version=update' + latest.version) + ">" + v.ignore + "</a>";
            content = "<p>" + content + "</p>";
            $('.notice').append(content); 
        }
    }
    if(typeof(notice) != 'undefined')
    {
        if(typeof(v.ignoreNotice) == 'undefined' || $.inArray('notice' + notice.id, v.ignoreNotice) == -1)
        {
            var content = 'NOTE: <a href=' + notice.url + ' target=\'_blank\'>' + notice.note + '(' + notice.date + ')</a>';
            content += "&nbsp;&nbsp;&nbsp;<a class='ignore' href=" + createLink('misc', 'ignoreNotice', 'version=notice' + notice.id) + ">" + v.ignore + "</a>";
            content = "<p>" + content + "</p>";
            $('.notice').append(content); 
        }
    }
    $('.ignore').click(function()
    {
        $.get($(this).prop('href'));
        $(this).prop('href', '###');
        $('.notice').html('');
        return false;
    });
})

/* Keep session random valid. */
function handleLogin()
{
    var password    = v.notEncryptedPwd ? $('#password').val() : md5(md5(md5($('#password').val()) + $('#account').val()) + v.random);
    var rawPassword = md5($('#password').val());

    loginURL = createLink('user', 'login');
    $.ajax(
    {
        contentType: 'application/x-www-form-urlencoded',
        type: "POST",
        data:"account=" + $('#account').val() + '&password=' + password + '&referer=' + encodeURIComponent($('#referer').val()) + '&rawPassword=' + rawPassword + '&keepLogin=' + $('#keepLoginon').is(':checked'),
        url:$('#ajaxForm').attr('action'),
        dataType:'json',
        success:function(data)
        {
            if(data.result == 'fail') {
                showErrorModal(data.message || '');
                return;
            }
            if(data.result == 'success') return location.href=data.locate;
            if(typeof(data) != 'object') {
                showErrorModal();
                return;
            }
        },
        error:function(data){bootbox.alert(data.responseText)}
    })
    return false;
}

// 绑定表单提交事件（支持点击按钮和按回车键）
$('#ajaxForm').submit(function(e)
{
    e.preventDefault();
    return handleLogin();
});

// 保留按钮点击事件（向后兼容）
$('#submit').click(function()
{
    return handleLogin();
});

/* 密码显隐切换功能 */
function togglePassword() {
    const passwordInput = document.querySelector('.password-input');
    const eyeOpen = document.getElementById('eye-open');
    const eyeClosed = document.getElementById('eye-closed');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeOpen.classList.add('hidden');
        eyeClosed.classList.remove('hidden');
    } else {
        passwordInput.type = 'password';
        eyeOpen.classList.remove('hidden');
        eyeClosed.classList.add('hidden');
    }
}

/* 错误提示窗口功能 */
function showErrorModal(message) {
    const errorModal = document.getElementById('errorModal');
    if(message) $('#errorModal .error-text').text(message);
    errorModal.style.display = 'flex';
    // 防止背景滚动
    document.body.style.overflow = 'hidden';
}

function hideErrorModal() {
    const errorModal = document.getElementById('errorModal');
    errorModal.style.display = 'none';
    // 恢复背景滚动
    document.body.style.overflow = 'auto';
}

// 点击遮罩层关闭弹窗
document.addEventListener('click', function(event) {
    const errorModal = document.getElementById('errorModal');
    if (event.target === errorModal) {
        hideErrorModal();
    }
});

// ESC键关闭弹窗
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        hideErrorModal();
    }
});
