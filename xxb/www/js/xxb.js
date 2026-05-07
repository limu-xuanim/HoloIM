/*! bootbox.js v4.4.0 http://bootboxjs.com/license.txt */
!function(t,o){"use strict";"function"==typeof define&&define.amd?define(["jquery"],o):"object"==typeof exports?module.exports=o(require("jquery")):t.bootbox=o(t.jQuery)}(this,function t(o,e){"use strict";function a(t){var o=h[f.locale];return o?o[t]:h.en[t]}function n(t,e,a){t.stopPropagation(),t.preventDefault();var n=o.isFunction(a)&&a.call(e,t)===!1;n||e.modal("hide")}function r(t){var o,e=0;for(o in t)e++;return e}function i(t,e){var a=0;o.each(t,function(t,o){e(t,o,a++)})}function l(t){var e,a;if("object"!=typeof t)throw new Error("Please supply an object of options");if(!t.message)throw new Error("Please specify a message");return t=o.extend({},f,t),t.buttons||(t.buttons={}),e=t.buttons,a=r(e),i(e,function(t,n,r){if(o.isFunction(n)&&(n=e[t]={callback:n}),"object"!==o.type(n))throw new Error("button with key "+t+" must be an object");n.label||(n.label=t),n.className||(2===a&&("ok"===t||"confirm"===t)||1===a?n.className="btn-primary":n.className="btn-default")}),t}function c(t,o){var e=t.length,a={};if(e<1||e>2)throw new Error("Invalid argument length");return 2===e||"string"==typeof t[0]?(a[o[0]]=t[0],a[o[1]]=t[1]):a=t[0],a}function s(t,e,a){return o.extend(!0,{},t,c(e,a))}function u(t,o,e,a){var n={className:"bootbox-"+t,buttons:p.apply(null,o)};return b(s(n,a,e),o)}function p(){for(var t={},o=0,e=arguments.length;o<e;o++){var n=arguments[o],r=n.toLowerCase(),i=n.toUpperCase();t[r]={label:a(i)}}return t}function b(t,o){var a={};return i(o,function(t,o){a[o]=!0}),i(t.buttons,function(t){if(a[t]===e)throw new Error("button key "+t+" is not allowed (options are "+o.join("\n")+")")}),t}var d={dialog:"<div class='bootbox modal' tabindex='-1' role='dialog'><div class='modal-dialog'><div class='modal-content'><div class='modal-body'><div class='bootbox-body'></div></div></div></div></div>",header:"<div class='modal-header'><h4 class='modal-title'></h4></div>",footer:"<div class='modal-footer'></div>",closeButton:"<button type='button' class='bootbox-close-button close' data-dismiss='modal' aria-hidden='true'>&times;</button>",form:"<form class='bootbox-form'></form>",inputs:{text:"<input class='bootbox-input bootbox-input-text form-control' autocomplete=off type=text />",textarea:"<textarea class='bootbox-input bootbox-input-textarea form-control'></textarea>",email:"<input class='bootbox-input bootbox-input-email form-control' autocomplete='off' type='email' />",select:"<select class='bootbox-input bootbox-input-select form-control'></select>",checkbox:"<div class='checkbox'><label><input class='bootbox-input bootbox-input-checkbox' type='checkbox' /></label></div>",date:"<input class='bootbox-input bootbox-input-date form-control' autocomplete=off type='date' />",time:"<input class='bootbox-input bootbox-input-time form-control' autocomplete=off type='time' />",number:"<input class='bootbox-input bootbox-input-number form-control' autocomplete=off type='number' />",password:"<input class='bootbox-input bootbox-input-password form-control' autocomplete='off' type='password' />"}},f={locale:o.zui&&o.zui.clientLang?o.zui.clientLang():"en",backdrop:"static",animate:!0,className:null,closeButton:!0,show:!0,container:"body"},m={};m.alert=function(){var t;if(t=u("alert",["ok"],["message","callback"],arguments),t.callback&&!o.isFunction(t.callback))throw new Error("alert requires callback property to be a function when provided");return t.buttons.ok.callback=t.onEscape=function(){return!o.isFunction(t.callback)||t.callback.call(this)},m.dialog(t)},m.confirm=function(){var t;if(t=u("confirm",["confirm","cancel"],["message","callback"],arguments),t.buttons.cancel.callback=t.onEscape=function(){return t.callback.call(this,!1)},t.buttons.confirm.callback=function(){return t.callback.call(this,!0)},!o.isFunction(t.callback))throw new Error("confirm requires a callback");return m.dialog(t)},m.prompt=function(){var t,a,n,r,l,c,u;if(r=o(d.form),a={className:"bootbox-prompt",buttons:p("cancel","confirm"),value:"",inputType:"text"},t=b(s(a,arguments,["title","callback"]),["confirm","cancel"]),c=t.show===e||t.show,t.message=r,t.buttons.cancel.callback=t.onEscape=function(){return t.callback.call(this,null)},t.buttons.confirm.callback=function(){var e;switch(t.inputType){case"text":case"textarea":case"email":case"select":case"date":case"time":case"number":case"password":e=l.val();break;case"checkbox":var a=l.find("input:checked");e=[],i(a,function(t,a){e.push(o(a).val())})}return t.callback.call(this,e)},t.show=!1,!t.title)throw new Error("prompt requires a title");if(!o.isFunction(t.callback))throw new Error("prompt requires a callback");if(!d.inputs[t.inputType])throw new Error("invalid prompt type");switch(l=o(d.inputs[t.inputType]),t.inputType){case"text":case"textarea":case"email":case"date":case"time":case"number":case"password":l.val(t.value);break;case"select":var f={};if(u=t.inputOptions||[],!o.isArray(u))throw new Error("Please pass an array of input options");if(!u.length)throw new Error("prompt with select requires options");i(u,function(t,a){var n=l;if(a.value===e||a.text===e)throw new Error("given options in wrong format");a.group&&(f[a.group]||(f[a.group]=o("<optgroup/>").attr("label",a.group)),n=f[a.group]),n.append("<option value='"+a.value+"'>"+a.text+"</option>")}),i(f,function(t,o){l.append(o)}),l.val(t.value);break;case"checkbox":var h=o.isArray(t.value)?t.value:[t.value];if(u=t.inputOptions||[],!u.length)throw new Error("prompt with checkbox requires options");if(!u[0].value||!u[0].text)throw new Error("given options in wrong format");l=o("<div/>"),i(u,function(e,a){var n=o(d.inputs[t.inputType]);n.find("input").attr("value",a.value),n.find("label").append(a.text),i(h,function(t,o){o===a.value&&n.find("input").prop("checked",!0)}),l.append(n)})}return t.placeholder&&l.attr("placeholder",t.placeholder),t.pattern&&l.attr("pattern",t.pattern),t.maxlength&&l.attr("maxlength",t.maxlength),r.append(l),r.on("submit",function(t){t.preventDefault(),t.stopPropagation(),n.find(".btn-primary").click()}),n=m.dialog(t),n.off("shown.zui.modal"),n.on("shown.zui.modal",function(){l.focus()}),c===!0&&n.modal("show"),n},m.dialog=function(t){t=l(t);var a=o(d.dialog),r=a.find(".modal-dialog"),c=a.find(".modal-body"),s=t.buttons,u="",p={onEscape:t.onEscape};if(o.fn.modal===e)throw new Error("$.fn.modal is not defined; please double check you have included the Bootstrap JavaScript library. See http://getbootstrap.com/javascript/ for more details.");if(i(s,function(t,o){u+="<button data-bb-handler='"+t+"' type='button' class='btn "+o.className+"'>"+o.label+"</button>",p[t]=o.callback}),c.find(".bootbox-body").html(t.message),t.animate===!0&&a.addClass("fade"),t.className&&a.addClass(t.className),"large"===t.size?r.addClass("modal-lg"):"small"===t.size&&r.addClass("modal-sm"),t.title&&c.before(d.header),t.closeButton){var b=o(d.closeButton);t.title?a.find(".modal-header").prepend(b):b.css("margin-top","-10px").prependTo(c)}return t.title&&a.find(".modal-title").html(t.title),u.length&&(c.after(d.footer),a.find(".modal-footer").html(u)),a.on("hidden.zui.modal",function(t){t.target===this&&a.remove()}),a.on("shown.zui.modal",function(){a.find(".btn-primary:first").focus()}),"static"!==t.backdrop&&a.on("click.dismiss.zui.modal",function(t){a.children(".modal-backdrop").length&&(t.currentTarget=a.children(".modal-backdrop").get(0)),t.target===t.currentTarget&&a.trigger("escape.close.bb")}),a.on("escape.close.bb",function(t){p.onEscape&&n(t,a,p.onEscape)}),a.on("click",".modal-footer button",function(t){var e=o(this).data("bb-handler");n(t,a,p[e])}),a.on("click",".bootbox-close-button",function(t){n(t,a,p.onEscape)}),a.on("keyup",function(t){27===t.which&&a.trigger("escape.close.bb")}),o(t.container).append(a),a.modal({backdrop:!!t.backdrop&&"static",keyboard:!1,show:!1}),t.show&&a.modal("show"),a},m.setDefaults=function(){var t={};2===arguments.length?t[arguments[0]]=arguments[1]:t=arguments[0],o.extend(f,t)},m.hideAll=function(){return o(".bootbox").modal("hide"),m};var h={en:{OK:"OK",CANCEL:"Cancel",CONFIRM:"OK"},zh_cn:{OK:"确认",CANCEL:"取消",CONFIRM:"确认"},zh_tw:{OK:"確認",CANCEL:"取消",CONFIRM:"確認"}};return m.addLocale=function(t,e){return o.each(["OK","CANCEL","CONFIRM"],function(t,o){if(!e[o])throw new Error("Please supply a translation for '"+o+"'")}),h[t]={OK:e.OK,CANCEL:e.CANCEL,CONFIRM:e.CONFIRM},m},m.removeLocale=function(t){return delete h[t],m},m.setLocale=function(t){return m.setDefaults("locale",t)},m.init=function(e){return t(e||o)},m});

/* Set trigger modal default name to 'ajaxModal'. */
(function(){$.ModalTriggerDefaults = {name: 'ajaxModal', backdrop: 'static'}})();

$.extend(
{
    setAjaxForm: function(formID, callback, beforeSubmit)
    {
        if($(document).data('setAjaxForm:' + formID)) return;

        form = $(formID);

        var options =
        {
            target  : null,
            timeout : config.timeout,
            dataType:'json',

            success: function(response)
            {
                var submitButton = $(formID).find(':input[type=submit], .submit');

                /* The response is not an object, some error occers, bootbox.alert it. */
                if($.type(response) != 'object')
                {
                    $.enableForm(formID);
                    if(response) return bootbox.alert(response);
                    return bootbox.alert('No response.');
                }

                /* The response.result is success. */
                if(response.result == 'success')
                {
                    if(response.message && response.message.length)
                    {
                        var placement = response.placement ? response.placement : 'right';
                        submitButton.popover({trigger:'manual', content:response.message, placement:placement}).popover('show');
                        submitButton.next('.popover').addClass('popover-success');
                        function distroy(){submitButton.popover('destroy')}
                        setTimeout(distroy,2000);
                    }

                    if($.isFunction(callback)) return callback(response);

                    if($('#responser').length && response.message && response.message.length)
                    {
                        $('#responser').html(response.message).addClass('red f-12px').show().delay(3000).fadeOut(100);
                    }

                    if(response.closeModal)
                    {
                        setTimeout($.zui.closeModal, 1200);
                    }

                    if(response.callback)
                    {
                        var rcall = window[response.callback];
                        if($.isFunction(rcall))
                        {
                            if(rcall() === false)
                            {
                                return;
                            }
                        }
                    }

                    if(response.locate)
                    {
                        if(response.locate == 'loadInModal')
                        {
                            var modal = $('.modal');
                            setTimeout(function()
                            {
                                modal.load(modal.attr('ref'), function(){$(this).find('.modal-dialog').css('width', $(this).data('width'));
                                $.zui.ajustModalPosition()})
                            }, 1000);
                        }
                        else
                        {
                            var reloadUrl = response.locate == 'reload' ? location.href : response.locate;
                            setTimeout(function(){location.href = reloadUrl;}, 1200);
                        }
                    }

                    if(response.ajaxReload)
                    {
                        var $target = $(response.ajaxReload);
                        if($target.length === 1)
                        {
                            $target.load(document.location.href + ' ' + response.ajaxReload, function()
                            {
                                $target.dataTable();
                                $target.find('[data-toggle="modal"]').modalTrigger();
                            });
                        }
                    }

                    return true;
                }

                /**
                 * The response.result is fail.
                 */

                $.enableForm(formID);
                /* The result.message is just a string. */
                if($.type(response.message) == 'string')
                {
                    if($('#responser').length == 0)
                    {
                        var placement = response.placement ? response.placement : 'right';
                        submitButton.popover({trigger:'manual', content:response.message, placement: placement}).popover('show');
                        submitButton.next('.popover').addClass('popover-danger');
                        function distroy(){submitButton.popover('destroy')}
                        setTimeout(distroy,2000);
                    }
                    $('#responser').html(response.message).addClass('red small text-danger').show().delay(5000).fadeOut(100);
                }

                /* The result.message is just a object. */
                if($.type(response.message) == 'object')
                {
                    $.each(response.message, function(key, value)
                    {
                        /* Define the id of the error objecjt and it's label. */
                        var errorOBJ   = '#' + key;
                        var errorLabel = key + 'Label';

                        /* Create the error message. */
                        var errorMSG = '<span id="' + errorLabel + '" for="' + key  + '"  class="text-error red">';
                        errorMSG += $.type(value) == 'string' ? value : value.join(';');
                        errorMSG += '</span>';

                        /* Append error message, set style and set the focus events. */
                        $('#' + errorLabel).remove();
                        var $errorOBJ = $(formID).find(errorOBJ);
                        if($errorOBJ.closest('.input-group').length > 0)
                        {
                            $errorOBJ.closest('.input-group').after(errorMSG)
                        }
                        else
                        {
                            $errorOBJ.parent().append(errorMSG);
                        }
                        $errorOBJ.css('margin-bottom', 0);
                        $errorOBJ.css('border-color','#953B39')
                        $errorOBJ.change(function()
                        {
                            $errorOBJ.css('margin-bottom', 0);
                            $errorOBJ.css('border-color','')
                            $('#' + errorLabel).remove();
                        });
                    })

                    /* Focus the first error field thus to nitify the user. */
                    var firstErrorField = $('#' +$('span.red').first().attr('for'));
                    var topOffset;
                    if(firstErrorField.length) topOffset = parseInt(firstErrorField.offset().top) - 20;   // 20px offset more for margin.

                    /* If there's the navbar-fixed-top element, minus it's height. */
                    if($('.navbar-fixed-top').size())
                    {
                        topOffset = topOffset - parseInt($('.navbar-fixed-top').height());
                    }

                    /* Scroll to the error field and foucus it. */
                    $(document).scrollTop(topOffset);
                    firstErrorField.focus();
                }

                if($.isFunction(callback)) return callback(response);
            },

            /* When error occers, alert the response text, status and error. */
            error: function(jqXHR, textStatus, errorThrown)
            {
                $.enableForm(formID);
                if(textStatus == 'timeout')
                {
                    bootbox.alert(v.lang.timeout);
                    return false;
                }
                bootbox.alert(jqXHR.responseText + textStatus + errorThrown);
            }
        };

        /* Call ajaxSubmit to sumit the form. */
        $(document).on('submit', formID, function()
        {
            $.disableForm(formID);
            if(!beforeSubmit || beforeSubmit() !== false)
            {
                $(this).ajaxSubmit(options);
            }
            else
            {
                $.enableForm(formID);
            }
            return false;    // Prevent the submitting event of the browser.
        }).data('setAjaxForm:' + formID, true);
    },

    /* Switch the label and disabled attribute for the submit button in a form. */
    setSubmitButton: function(formID, action)
    {
        var submitButton = $(formID).find(':submit');

        label    = submitButton.val();
        loading  = submitButton.data('loading');
        disabled = action == 'disable';

        submitButton.attr('disabled', disabled);
        submitButton.val(loading);
        submitButton.data('loading', label);
    },

    /* Disable a form. */
    disableForm: function(formID)
    {
        $.setSubmitButton(formID, 'disable');
    },

    /* Enable a form. */
    enableForm: function(formID)
    {
        $.setSubmitButton(formID, 'enable');
    }
});

$.extend(
{
    /**
     * Set ajax loader.
     *
     * Bind click event for some elements thus when click them,
     * use $.load to load page into target.
     *
     * @param string selector
     * @param string target
     */
    setAjaxLoader: function(selector, target)
    {
        /* Avoid duplication of binding */
        var data = $('body').data('ajaxLoader');
        if(data && data[selector]) return;
        if(!data) data = {};
        data[selector] = true;
        $('body').data('ajaxLoader', data);

        $(document).on('click', selector, function()
        {
            var url = $(this).attr('href');
            if(!url) url = $(this).data('rel');
            if(!url) return false;

            var $target = $(target);
            if(!$target.size()) return false;

            var width = $(this).data('width');
            $target.load(url, function()
            {
                if(width) $target.find('.modal-dialog').css('width', width);
                if($target.hasClass('modal') && $.zui.ajustModalPosition) $.zui.ajustModalPosition();
            });

            return false;
        });
    },

    /**
     * Set ajax deleter.
     *
     * @param  string $selector
     * @access public
     * @return void
     */
    setAjaxDeleter: function (selector, callback)
    {
        $(document).on('click', selector, function()
        {
            if(confirm(v.lang.confirmDelete))
            {
                var deleter = $(this);
                deleter.text(v.lang.deleteing);

                $.getJSON(deleter.attr('href'), function(data)
                {
                    callback && callback(data);
                    if(data.result == 'success')
                    {
                        if(deleter.parents('#ajaxModal').size()) return $.reloadAjaxModal(1200);
                        if(data.locate) return location.href = data.locate;
                        return location.reload();
                    }
                    else
                    {
                        alert(data.message);
                        return location.reload();
                    }
                });
            }
            return false;
        });
    },

    /**
     * Set reload deleter.
     *
     * @param  string $selector
     * @access public
     * @return void
     */
    setReloadDeleter: function (selector)
    {
        $(document).on('click', selector, function()
        {
            if(confirm(v.lang.confirmDelete))
            {
                var deleter = $(this);
                deleter.text(v.lang.deleteing);

                $.getJSON(deleter.attr('href'), function(data)
                {
                    var afterDelete = deleter.data('afterDelete');
                    if($.isFunction(afterDelete))
                    {
                        $.proxy(afterDelete, deleter)(data);
                    }

                    if(data.result == 'success')
                    {
                        var table     = $(deleter).closest('table');
                        var replaceID = table.attr('id');

                        table.wrap("<div id='tmpDiv'></div>");
                        var $tmpDiv = $('#tmpDiv');
                        $tmpDiv.load(document.location.href + ' #' + replaceID, function()
                        {
                            $tmpDiv.replaceWith($tmpDiv.html());
                            var $target = $('#' + replaceID);
                            $target.find('.reloadDeleter').data('afterDelete', afterDelete);
                            $target.find('[data-toggle="modal"]').modalTrigger();
                            if($target.hasClass('table-data'))
                            {
                                $target.dataTable();
                            }
                            if(typeof sortTable == 'function')
                            {
                                sortTable();
                            }
                            else
                            {
                                $('tfoot td').css('background', 'white').unbind('click').unbind('hover');
                            }
                        });
                    }
                    else
                    {
                        alert(data.message);
                    }
                });
            }
            return false;
        });
    },

    /**
     * Set reload.
     *
     * @param  string $selector
     * @access public
     * @return void
     */
    setReload: function (selector)
    {
        $(document).on('click', selector, function()
        {
            var reload = $(this);
            $.getJSON(reload.attr('href'), function(data)
            {
                if(data.result == 'success')
                {
                    var table     = $(reload).closest('table');
                    var replaceID = table.attr('id');

                    table.wrap("<div id='tmpDiv'></div>");
                    $('#tmpDiv').load(document.location.href + ' #' + replaceID, function()
                    {
                        $('#tmpDiv').replaceWith($('#tmpDiv').html());
                        if(typeof sortTable == 'function')
                        {
                            sortTable();
                        }
                        else
                        {
                            $('tfoot td').css('background', 'white').unbind('click').unbind('hover');
                        }
                    });
                }
                else
                {
                    alert(data.message);
                }
            });
            return false;
        });
    },

    /**
     * Reload ajax modal.
     *
     * @param int duration
     * @access public
     * @return void
     */
    reloadAjaxModal: function(duration)
    {
        if(typeof(duration) !== 'number') duration = 1000;
        setTimeout(function()
        {
            var modal = $('#ajaxModal');
            modal.load(modal.attr('ref'), function(){$(this).find('.modal-dialog').css('width', $(this).data('width')); $.zui.ajustModalPosition()})
        }, duration);
    }
});

/**
 * Create link.
 *
 * @param  string $moduleName
 * @param  string $methodName
 * @param  string $vars
 * @param  string $viewType
 * @access public
 * @return string
 */
function createLink(moduleName, methodName, vars, viewType)
{
    if(!viewType) viewType = config.defaultView;
    if(vars)
    {
        vars = vars.split('&');
        for(i = 0; i < vars.length; i ++) vars[i] = vars[i].split('=');
    }

    appName = config.appName;
    router  = config.router;

    if(moduleName.indexOf('.') >= 0)
    {
        moduleNames = moduleName.split('.');
        appName     = moduleNames[0];
        moduleName  = moduleNames[1];
        router      = router.replace(config.appName, appName);
    }

    if(config.requestType == 'PATH_INFO')
    {
        link = config.webRoot + appName + '/' + moduleName + config.requestFix + methodName;
        if(vars)
        {
            if(config.pathType == "full")
            {
                for(i = 0; i < vars.length; i ++) link += config.requestFix + vars[i][0] + config.requestFix + vars[i][1];
            }
            else
            {
                for(i = 0; i < vars.length; i ++) link += config.requestFix + vars[i][1];
            }
        }
        link += '.' + viewType;
    }
    else
    {
        link = router + '?' + config.moduleVar + '=' + moduleName + '&' + config.methodVar + '=' + methodName + '&' + config.viewVar + '=' + viewType;
        if(vars) for(i = 0; i < vars.length; i ++) link += '&' + vars[i][0] + '=' + vars[i][1];
    }
    return link;
}

/**
 * Set required fields, add star class to them.
 *
 * @access public
 * @return void
 */
function setRequiredFields()
{
    if(!config.requiredFields) return false;
    requiredFields = config.requiredFields.split(',');
    for(i = 0; i < requiredFields.length; i++)
    {
        $('#' + requiredFields[i]).closest('td,th').prepend("<div class='required required-wrapper'></div>");
        var colEle = $('#' + requiredFields[i]).closest('[class*="col-"]');
        if(colEle.parent().hasClass('form-group')) colEle.addClass('required');
    }
}

/**
 * Select lang.
 *
 * @param  string $lang
 * @access public
 * @return void
 */
function selectLang(lang)
{
    $.cookie('lang', lang, {expires:config.cookieLife, path:config.webRoot});
    location.href = removeAnchor(location.href);
}

/**
 * Set theme.
 *
 * @param  string theme
 * @access public
 * @return void
 */
function selectTheme(theme)
{
    $.cookie('theme', theme, {expires:config.cookieLife, path:config.webRoot});
    location.href = removeAnchor(location.href);
}

/**
 * Remove anchor from the url.
 *
 * @param  string $url
 * @access public
 * @return string
 */
function removeAnchor(url)
{
    pos = url.indexOf('#');
    if(pos > 0) return url.substring(0, pos);
    return url;
}

/**
 * Ping to keep login
 *
 * @access public
 * @return void
 */
function ping()
{
    var vars = '';

    /* get showed notice ids. */
    var notice = getShowedNotice().join(',');

    $.get(createLink('misc', 'ping', 'notice=' + notice), function(response)
    {
        if(typeof(response.notices) != 'undefined')
        {
            for(key in response.notices)
            {
                showNotice(response.notices[key]);
            }
        }
    }, 'json');
}

/**
 * get showed notice id.
 *
 * @access public
 * @return array
 */
function getShowedNotice()
{
    var ids = [];
    $('#noticeBox').find('[id^=notice]').each(function()
    {
        if($(this).data('id') != undefined) ids.push($(this).data('id'));
    });
    return ids;
}

/**
 * Adjust notice position.
 *
 * @param  string noticeID
 * @access public
 * @return void
 */
function adjustNoticePosition(noticeID)
{
    var bottom = 25;
    $('#noticeBox').find('[id^=notice]').each(function()
    {
        if(noticeID !== undefined && $(this).attr('id') == noticeID) return true;

        $(this).css('bottom',  bottom + 'px');
        bottom += $(this).outerHeight(true) - 10;
    });
}

/**
 * Show a notice.
 *
 * @param  object $notice
 * @access public
 * @return void
 */
function showNotice(notice)
{
    if(typeof(notice['type']) == 'undefined') notice['type'] = 'success';
    if(typeof(notice['read']) == 'undefined') notice['read'] = '';

    if($('#noticeBox').length < 1) $('body').append("<div id='noticeBox'></div>");
    var noticeBox = $('#noticeBox');
    if($('#notice' + notice['id']).length > 0) $('#notice' + notice['id']).remove();

    var noticeTpl = "<div id='notice{id}' data-id='{id}' class='alert alert-{type} with-icon alert-dismissable' style='width:380px; position:fixed; bottom:25px; right:15px; z-index: 9999;'>";
    noticeTpl += "<i class='icon icon-envelope-alt'></i>";
    noticeTpl += "<div class='content'><p><strong>{title}</strong></p>{content}</div>";
    noticeTpl += "<button type='button' class='close' data-dismiss='alert' aria-hidden='true' data-read='{read}'>×</button>";
    noticeTpl += "</div>";
    noticeTpl = noticeTpl.replace(/\{id\}/g, notice['id']);
    noticeTpl = noticeTpl.replace(/\{title\}/g, notice['title']);
    noticeTpl = noticeTpl.replace(/\{content\}/g, notice['content']);
    noticeTpl = noticeTpl.replace(/\{type\}/g, notice['type']);
    noticeTpl = noticeTpl.replace(/\{read\}/g, notice['read']);
    noticeBox.append(noticeTpl);

    adjustNoticePosition();

    /* close */
    $('#notice' + notice['id']).find('.close').click(function()
    {
        if($(this).data('read') != '') $.get($(this).data('read'));

        adjustNoticePosition('notice' + notice['id']);
    });

    /* read */
    $('#notice' + notice['id']).find('a').click(function()
    {
        $(this).closest('.alert').find('.close').click();
        $.openEntry($(this).data('appid'), $(this).prop('href'));
        $(this).prop('href', '###');
        return false;
    });
}

/**
 * Set form action and submit.
 *
 * @param  url    $actionLink
 * @param  string $hiddenwin 'hiddenwin'
 * @access public
 * @return void
 */
function setFormAction(actionLink, hiddenwin, obj)
{
    $form = typeof(obj) == 'undefined' ? $('form') : $(obj).closest('form');
    if(hiddenwin) $form.attr('target', hiddenwin);
    else $form.removeAttr('target');

    $form.attr('action', actionLink).submit();
}
