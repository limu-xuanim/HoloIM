$(document).ready(function()
{
    /* Set forbid link options. */
    $('td.operate a.forbider').click(function()
    {
        $.getJSON($(this).attr('href'),function(data)
        {
            if(data.result == 'success') return location.href = data.locate;
            bootbox.alert(data.message + '');
        });
        return false;
    });

    if(v.deptID !== undefined && v.deptID !== null && v.deptID != 0) {
        $('#category' + v.deptID).closest('li').addClass('active');
    } else {
        // 当 deptID 为 0 或未设置时，高亮"所有部门"
        $('#category0').closest('li').addClass('active');
    }
    $('#treeMenuBox .tree').tree({initialState: 'active'});

    $('#userTable').on('click', '.btn-reset-client-config', function(event)
    {
        $.getJSON($(this).attr('href'), function(data)
        {
            if(data.result == 'success') $.zui.messager.success(data.message);
            else $.zui.messager.danger(data.message);
        });
        event.preventDefault();
    });

    $('th > .header, th > .headerSortUp, th > .headerSortDown').click(function(e)
    {
        if(e.target.tagName != 'A')
        {
            var aTags = $(this).find('a');
            if(aTags.length) aTags[0].click();
        }
    });
});
