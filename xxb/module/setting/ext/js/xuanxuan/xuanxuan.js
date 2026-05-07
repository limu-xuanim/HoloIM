$(function()
{
    $('[name=debug]').change(function()
    {
        $('.viewDebug').toggle($(this).val() == 1);
    });
});

/**
 * create key for an entry.
 *
 * @access public
 * @return void
 */
function createKey()
{
    var chars = '0123456789abcdefghiklmnopqrstuvwxyz'.split('');
    var key   = '';
    for(var i = 0; i < 32; i ++)
    {
        key += chars[Math.floor(Math.random() * chars.length)];
    }
    $('#key').val(key);

    $('#key').css({'margin-bottom' : 0, 'border-color' : ''});
    $('#keyLabel').remove();

    return false;
}

$(function()
{
    var os = '';
    $('[name^=https]').change(function()
    {
        var value = $(this).val();
        $('#https').val(value);
        if(value == 'on')
        {
            $('.config-row-ssl-container').show();
            $('.config-row-ssl-container input[name^=ssl]').attr('required', true);
        }
        else
        {
            $('.config-row-ssl-container').hide();
            $('.config-row-ssl-container input[name^=ssl]').attr('required', false);
        }
    });

    $('#os').change(function()
    {
        os = $(this).val();
        $('.download-package').attr('href', createLink('setting', 'downloadXXD', "type=package&os=" + os));
    });
    $('#os').change();

    var isDownloadXXD = false;
    // download XXD package
    $('#downloadXXDPackage').on('click', function()
    {
        $('#infoBox').hide();
        if(isDownloadXXD) return;
        isDownloadXXD = true;
        var $self = $(this);
        $self.attr('disabled', true);
        $self.append('<i class="icon icon-spin icon-spinner" style="margin-left:10px;"></i>');
        var link = createLink('setting', 'downloadXXD', 'type=package&os=' + os);

        $.get(link, function(data)
        {
            var data = JSON.parse(data);
            if(data.result === 'success')
            {
                window.location = data.message;
            }
            else
            {
                $('#infoBox').show();
            }
            $self.attr('disabled', false);
            isDownloadXXD = false;
            $self.find('i').remove();
        })
    })
});
