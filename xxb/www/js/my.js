$(document).ready(function()
{
    //fixNavbar();
    setRequiredFields();

    /* Enable default ajax options. */
    $.setAjaxForm('#ajaxForm');
    $.setAjaxDeleter('.deleter');
    $.setReload('.reload');
    $.setReloadDeleter('.reloadDeleter');
    $.setAjaxLoader('.loadInModal', '#ajaxModal');

    /* Enable tooltip */
    $('body').tooltip({html: true,selector: "[data-toggle='tooltip']",container: "body"});

    /* Reload modal. */
    $(document).on('click', '.reloadModal', function(){$.reloadAjaxModal()});

    /* Support iframe modal shortcut */
    $(document).on('click', 'a.iframe', function(e)
    {
        var $this = $(this);
        if (!$this.data('zui.modaltrigger'))
        {
            var modalOptions = {show: true};
            var modalWidth  = $this.attr('data-width') || $this.attr('width') || '';
            var modalHeight = $this.attr('data-height') || $this.attr('height') || '';
            
            if(modalWidth)  modalOptions.width = modalWidth;
            if(modalHeight) modalOptions.height = modalHeight;

            $this.modalTrigger(modalOptions);
        }
        else
        {
            $this.trigger('.toggle.' + 'zui.modaltrigger');
        }
        e.preventDefault();
    });
});

$(document).on('keyup', function(e)
{
    if(e.keyCode == '37')
    {
        /* left, go to pre object. */
        if($('#ajaxModal').css('display') == 'block') return false;
        if($('input,textarea').is(':focus')) return false;
        var preLink = ($('#pre').attr("href"));
        if(typeof(preLink) != 'undefined') location.href = preLink;
    }
    if(e.keyCode == '39')
    {
        /* right, go to next object. */
        if($('#ajaxModal').css('display') == 'block') return false;
        if($('input,textarea').is(':focus')) return false;
        var nextLink = ($('#next').attr("href"));
        if(typeof(nextLink) != 'undefined') location.href = nextLink;
    }
});

/**
 * Start cron.
 *
 * @access public
 * @return void
 */
function startCron()
{
    $.ajax({type:"GET", timeout:100, url:createLink('cron', 'ajaxExec')});
}
