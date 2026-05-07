$(document).ready(function()
{
    $('[name*=tree]').each(function()
    {
        if($(this).val() == 'browse') $(this).parent('label').css('width', '');
    });
    $('[name*=setting]').each(function()
    {
        if($(this).val() == 'lang') $(this).parent('label').css('width', '');
    });
    $('[name*=report]').each(function()
    {
        if($(this).val() == 'browse') $(this).parent('label').css('width', '');
    });
});

function showPriv(value)
{
    location.href = createLink('group', 'managePriv', "type=byGroup&param="+ groupID + "&menu=&version=" + value);
}

$('.checkApp').click(function()
{
    $(this).parents('.item').find('[type=checkbox]').prop('checked', $(this).prop('checked'));
});

// 模块全选checkbox点击事件
$(document).on('change', '.checkModule', function()
{
    var checked = $(this).prop('checked');
    var moduleName = $(this).data('module');
    
    // 选中或取消选中该模块的所有权限
    $('[data-module="' + moduleName + '"].module-action-checkbox').prop('checked', checked);
    
    // 移除半选状态
    $(this).removeAttr('data-indeterminate');
});

// 单个权限checkbox变化时，更新模块全选状态
$(document).on('change', '.module-action-checkbox', function()
{
    var moduleName = $(this).data('module');
    var moduleCheckbox = $('.checkModule[data-module="' + moduleName + '"]');
    var actionCheckboxes = $('.module-action-checkbox[data-module="' + moduleName + '"]');
    
    var total = actionCheckboxes.length;
    var checked = actionCheckboxes.filter(':checked').length;
    
    if(checked === 0)
    {
        // 全部未选中
        moduleCheckbox.prop('checked', false);
        moduleCheckbox.removeAttr('data-indeterminate');
    }
    else if(checked === total)
    {
        // 全部选中
        moduleCheckbox.prop('checked', true);
        moduleCheckbox.removeAttr('data-indeterminate');
    }
    else
    {
        // 部分选中（半选状态）
        moduleCheckbox.prop('checked', false);
        moduleCheckbox.attr('data-indeterminate', '1');
    }
});

// 页面加载时初始化半选状态样式
$(document).ready(function()
{
    $('.checkModule[data-indeterminate="1"]').each(function()
    {
        // 可以在这里添加半选状态的视觉样式
        // 例如：$(this).parent().addClass('indeterminate');
    });
});
