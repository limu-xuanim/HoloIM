// index block init.
$(function()
{
    $('#dashboard').dashboard(
    {
        height     : 'unset',
        draggable  : false,
        resizable  : false,
        shadowType : false,
        sensitive  : true,
    });

    /**
     * refresh index block
     * @access public
     * @return void
     */
    var refreshTimer = 1000 * 60 * 5;
    setInterval(function()
    {
        $('.refresh-panel').trigger('click');
    }, refreshTimer);
});

var versionApiUrl         = v.versionApiUrl;
var xxcCurrentVersion     = v.currentVersion;
var upgradeNoticeInfo     = $.zui.store.get('upgradeNoticeInfo');
var upgradeNoticeStatus   = upgradeNoticeInfo ? upgradeNoticeInfo.status : ''; // notice status `hide`|`show`
var upgradeNoticeInfoInit =
{
    date : new Date().getTime(),
    version : xxcCurrentVersion,
    status: 'show',
};

$(function()
{
    showNotice(xxcCurrentVersion, upgradeNoticeInfo);
    $('#noticeGoUpgrade .close').on('click', function()
    {
        upgradeNoticeInfoInit.status = 'hide';
        $.zui.store.set('upgradeNoticeInfo', upgradeNoticeInfoInit);
    });
});

function showNotice(xxcCurrentVersion, upgradeNoticeInfo)
{
    if(upgradeNoticeStatus === 'hide' && (new Date().getTime() - upgradeNoticeInfo.date) < 604800000) return;
    // upgradeNoticeInfo && store notice info version > xxc current version
    if(upgradeNoticeInfo && compareVersions(upgradeNoticeInfo.version, xxcCurrentVersion) > 0)
    {
        $('#noticeGoUpgrade .version').text(upgradeNoticeInfo.version);
        $('#noticeGoUpgrade').show();
    }
    else
    {
        $.get(versionApiUrl, function(data, status)
        {
            if(status === 'success')
            {
                var versionInfo = typeof data === 'string' ? $.parseJSON(data) : data;
                var xxcVersion  = versionInfo[0]['xxcVersion'];
                if(!xxcCurrentVersion || compareVersions(xxcVersion, xxcCurrentVersion) > 0)
                {
                    $('#noticeGoUpgrade .version').text(xxcVersion);
                    upgradeNoticeInfoInit.version = xxcVersion;
                    $.zui.store.set('upgradeNoticeInfo', upgradeNoticeInfoInit);
                    $('#noticeGoUpgrade').show();
                }
            }
        });
    }
}
