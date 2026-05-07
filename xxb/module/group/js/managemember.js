$(document).ready(function()
{
    /* set active left menu. */
    var menu = $('.leftmenu .nav li').size() == 0 ? '.modal-body .nav li' : '.leftmenu .nav li';
    if(v.type == 'dept' && $('.leftmenu .nav li').size() == 0) menu = '';
    $(menu).removeClass('active');
    if(config.requestType == 'GET')
    {
        $(menu + " a[href*='tree'][href*='=" + v.type + "']").parent().addClass('active');
    }
    else
    {
        $(menu + " a[href*='tree'][href*='" + v.type + "']").parent().addClass('active');
    }

    /* Load the children of current category when page loaded. */
    if(v.hasChildrenPriv)
    {
        var link = createLink('tree', 'children', 'type=' + v.type + '&moduleID=' + v.moduleID + '&root=' + v.root);
        $('#categoryBox').load(link);

    }
    $('#treeMenuBox li:has(ul)').each(function()
    {
        $(this).children('.deleter').remove();
    });

    if($('#categoryBox').length)
    {
        $.setAjaxLoader('#treeMenuBox .ajax, .panel-actions .ajax', '#categoryBox');
    }

    $('.tree li .hitarea').click();
});
