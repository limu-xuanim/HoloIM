<?php
$filter = new stdclass();
$filter->rules   = new stdclass();
$filter->default = new stdclass();
$filter->block   = new stdclass();
$filter->entry   = new stdclass();
$filter->file    = new stdclass();
$filter->sso     = new stdclass();
$filter->upgrade = new stdclass();
$filter->user    = new stdclass();

$filter->rules->any        = '/./';
$filter->rules->base64     = '/^[a-zA-Z0-9\+\/\=]+$/';
$filter->rules->browseType = '/^by[a-z]+$/';
$filter->rules->callback   = '/^[a-zA-Z0-9=\&\%\.\/\-\:\?]+$/';
$filter->rules->character  = '/^[a-zA-Z_\-]+$/';
$filter->rules->checked    = '/^[0-9,]+$/';
$filter->rules->common     = '/^[a-zA-Z0-9_]+$/';
$filter->rules->idList     = '/^[0-9\|]+$/';
$filter->rules->key        = '/^[a-z0-9]{32}+$/';
$filter->rules->lang       = '/^[a-zA-Z_\-]+$/';
$filter->rules->md5        = '/^[a-z0-9]{32}$/';
$filter->rules->number     = '/^[0-9]+$/';
$filter->rules->orderBy    = '/^\w+_(desc|asc)$/i';
$filter->rules->paramName  = '/^[a-zA-Z0-9_\.]+$/';
$filter->rules->paramValue = '/^[a-zA-Z0-9=_,:\-\?\&`#+\^\/\.%\|\x7f-\xff]+$/';
$filter->rules->path       = '/(^//.|^/|^[a-zA-Z])?:?/.+(/$)?/';
$filter->rules->word       = '/^\w+$/';

$filter->default->moduleName = 'code';
$filter->default->methodName = 'code';
$filter->default->paramName  = 'reg::paramName';
$filter->default->paramValue = 'reg::paramValue';

$filter->default->get['onlybody']              = 'equal::yes';
$filter->default->get['lang']                  = 'reg::lang';
$filter->default->get['HTTP_X_REQUESTED_WITH'] = 'equal::XMLHttpRequest';

$filter->default->cookie['lang']      = 'reg::lang';
$filter->default->cookie['theme']     = 'reg::common';
$filter->default->cookie['device']    = 'reg::common';
$filter->default->cookie['ra']        = 'reg::common';
$filter->default->cookie['rp']        = 'reg::common';
$filter->default->cookie['keepLogin'] = 'equal::on';

$filter->block->default = new stdclass();
$filter->block->default->get['mode']            = 'reg::character';
$filter->block->default->get['blockid']         = 'reg::character';
$filter->block->default->get['hash']            = 'reg::md5';
$filter->block->default->get['sso']             = 'reg::word';
$filter->block->default->get['app']             = 'reg::character';
$filter->block->default->get['param']           = 'reg::base64';

$filter->entry->depts = new stdclass();
$filter->entry->users = new stdclass();
$filter->entry->visit = new stdclass();
$filter->entry->depts->get['key']     = 'reg::key';
$filter->entry->users->get['key']     = 'reg::key';
$filter->entry->visit->get['referer'] = 'reg::base64';

$filter->file->ajaxueditorupload = new stdclass();
$filter->file->filemanager       = new stdclass();
$filter->file->download          = new stdclass();
$filter->file->ajaxueditorupload->get['action']      = 'equal::config';
$filter->file->filemanager->get['path']              = 'reg::path';
$filter->file->filemanager->get['order']             = 'reg::common';
$filter->file->download->cookie[$config->sessionVar] = 'reg::common';

$filter->sso->leaveusers = new stdclass();
$filter->sso->leaveusers->get['code']           = 'code';
$filter->sso->leaveusers->get['key']            = 'reg::key';

$filter->upgrade->upgradelicense = new stdclass();
$filter->upgrade->upgradelicense->get['agree']  = 'equal::true';

$filter->user->admin = new stdclass();
$filter->user->login = new stdclass();
$filter->user->admin->paramValue['query']  = 'reg::any';
$filter->user->admin->paramValue['search'] = 'reg::any';
$filter->user->login->get['lang']         = 'reg::lang';
