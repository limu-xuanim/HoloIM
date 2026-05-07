$(document).ready(function()
{
    $.setAjaxForm('#batchCreateForm', function(response)
    {
        if(response.result == 'fail')
        {
            if(response.message && typeof response.message == 'object')
            {
                if(response.duplicate)
                {
                    $('[name^=realname]').each(function()
                    {
                        var id = $(this).attr('id');
                        $(this).next('.input-group-addon').toggle(response.duplicate.indexOf(id) != -1);
                    });
                }
                else
                {
                    $('[name^=realname]').next('.input-group-addon').hide();
                }
            }
        }
        else
        {
            setTimeout(function(){location.href = response.locate;}, 1200);
        }
    });

    $('[name^=duplicateResult]').change(function()
    {
        if($('[name^=duplicateResult]:checked').val() == 'save')
        {
            $(this).parents('.input-group').find('[name^=realname]').css({'margin-bottom' : 0, 'border-color' : ''});
            $(this).parents('.input-group').next('span[id^=realname]').remove();
        }
        else
        {
            $(this).parents('tr').find('input').css({'margin-bottom' : 0, 'border-color' : ''});
            $(this).parents('tr').find('span.text-error').remove();
        }
    });

    $('[name^=createDept]').change(function()
    {
        var $inputGroup = $(this).parents('.input-group');
        if($(this).prop('checked'))
        {
            $inputGroup.find('.chosen-container').hide();
            $inputGroup.find('[id^=deptName]').show().focus();
        }
        else
        {
            $inputGroup.find('.chosen-container').show();
            $inputGroup.find('[id^=deptName]').hide();
        }
    })

    $('[name^=createDept]').change();
})
