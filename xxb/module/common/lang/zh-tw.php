<?php
/**
 * The zh-tw file of common module of XXB.
 *
 * @copyright   Copyright 2009-now 禪道軟件（青島）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     common
 * @link        https://xuanim.com
 */
$lang->colon      = ' : ';
$lang->ellipsis   = '…';
$lang->prev       = '‹';
$lang->next       = '›';
$lang->unfold     = '+';
$lang->fold       = '-';
$lang->percent    = '%';
$lang->laquo      = '&laquo;';
$lang->raquo      = '&raquo;';
$lang->minus      = ' - ';
$lang->hyphen     = '-';
$lang->slash      = ' / ';
$lang->semicolon  = '；';
$lang->RMB        = '￥';
$lang->divider    = "<span class='divider'>{$lang->raquo}</span> ";
$lang->at         = ' 于 ';
$lang->by         = ' 由 ';
$lang->ditto      = '同上';
$lang->etc        = '等';
$lang->importIcon = "<i class='icon-download-alt'> </i>";
$lang->exportIcon = "<i class='icon-upload-alt'> </i>";
$lang->on         = '開啟';
$lang->off        = '不開啟';

/* Lang items for xxb. */
$lang->xxb        = '喧喧';
$lang->currentPos = '當前位置：';
$lang->home       = '首頁';
$lang->agreement  = "已閲讀並同意<a href='https://www.gnu.org/licenses/agpl-3.0.html' target='_blank'>AGPL-3.0</a>。<span class='text-danger'>未經許可，不得去除、隱藏或遮掩喧喧系統的任何標誌及連結。</span>";
$lang->poweredBy  = "<a href='https://www.xuanim.com/?v=%s' target='_blank'>{$lang->xxb}%s</a>";
$lang->ipLimited  = "<html><head><meta https:equiv='Content-Type' content='text/html; charset=utf-8' /></head><body>抱歉，管理員限制當前IP登錄，請聯繫管理員解除限制。</body></html>";

/* IE6 alert.  */
$lang->IE6Alert = <<<EOT
    <div class='alert alert-danger' style='margin-top:100px;'>
      <button aria-hidden="true" data-dismiss="alert" class="close" type="button">×</button>
      <h2>請使用其他瀏覽器訪問本站。</h2>
      <p>珍愛上網，遠離IE！</p>
      <p>我們檢測到您正在使用Internet Explorer 6 ——  IE6 瀏覽器, IE6 于2001年8月27日推出，而現在它已十分脫節。速度慢、不安全、不能很好的展示新一代網站。<br/></p>
      <a href='https://www.google.com/intl/zh-hk/chrome/browser/' class='btn btn-primary btn-lg' target='_blank'>谷歌瀏覽器</a>
      <a href='https://www.firefox.com/' class='btn btn-primary btn-lg' target='_blank'>火狐瀏覽器</a>
      <a href='https://www.opera.com/download' class='btn btn-primary btn-lg' target='_blank'>Opera瀏覽器</a>
      <p></p>
    </div>
EOT;

/* Themes. */
$lang->theme             = '主題';
$lang->themes['default'] = '預設';
$lang->themes['clear']   = '清晰';

/* Global lang items. */
$lang->home           = '首頁';
$lang->welcome        = "喧喧後台管理系統";
$lang->aboutUs        = '關於我們';
$lang->about          = '關於';
$lang->logout         = '退出';
$lang->login          = '登錄';
$lang->account        = '帳號';
$lang->password       = '密碼';
$lang->all            = '全部';
$lang->changePassword = '修改密碼';

/* Global action items. */
$lang->reset          = '重填';
$lang->add            = '添加';
$lang->edit           = '編輯';
$lang->copy           = '複製';
$lang->and            = '並且';
$lang->or             = '或者';
$lang->hide           = '隱藏';
$lang->delete         = '刪除';
$lang->close          = '關閉';
$lang->finish         = '完成';
$lang->cancel         = '取消';
$lang->import         = '導入';
$lang->importTip      = '請先導出模板，按照模板格式填寫數據後再導入。';
$lang->export         = '導出';
$lang->setFileName    = '檔案名';
$lang->setFileNum     = '記錄數';
$lang->setFileType    = '檔案類型';
$lang->setCharset     = '編碼格式';
$lang->save           = '保存';
$lang->saved          = '已保存';
$lang->confirm        = '確認';
$lang->preview        = '預覽';
$lang->goback         = '返回';
$lang->assign         = '指派';
$lang->start          = '開始';
$lang->create         = '新建';
$lang->forbid         = '禁用';
$lang->activate       = '激活';
$lang->ignore         = '忽略';
$lang->view           = '查看';
$lang->detail         = '詳情';
$lang->more           = '更多';
$lang->actions        = '操作';
$lang->history        = '歷史記錄';
$lang->reverse        = '切換順序';
$lang->switchDisplay  = '切換顯示';
$lang->feature        = '未來';
$lang->year           = '年';
$lang->month          = '月';
$lang->week           = '周';
$lang->day            = '日';
$lang->loading        = '稍候...';
$lang->saveSuccess    = '保存成功';
$lang->setSuccess     = '設置成功';
$lang->sendSuccess    = '發送成功';
$lang->fail           = '失敗';
$lang->noResultsMatch = '沒有匹配的選項';
$lang->searchMore     = "搜索此關鍵字的更多結果：";
$lang->files          = '附件';
$lang->addFiles       = '上傳了附件 ';
$lang->comment        = '備註';
$lang->selectAll      = '全選';
$lang->selectReverse  = '反選';
$lang->continueSave   = '繼續保存';
$lang->submitting     = '稍候...';
$lang->yes            = '是';
$lang->no             = '否';
$lang->signIn         = '簽到';
$lang->signOut        = '簽退';
$lang->sort           = '排序';
$lang->required       = '必填';
$lang->custom         = '自定義';
$lang->refresh        = '刷新';
$lang->noData         = '暫無';
$lang->editConfig     = '編輯配置';

/* Items for lifetime. */
$lang->lifetime = new stdclass();
$lang->lifetime->createdBy    = '由誰創建';
$lang->lifetime->assignedTo   = '指派給';
$lang->lifetime->signedBy     = '由誰簽約';
$lang->lifetime->closedBy     = '由誰關閉';
$lang->lifetime->closedReason = '關閉原因';
$lang->lifetime->lastEdited   = '最後修改';

$lang->setOkFile = <<<EOT
<h5>請按照下面的步驟操作以確認您的管理員身份。</h5>
<p>創建 %s 檔案。如果存在該檔案，使用編輯軟件打開，重新保存一遍。</p>
EOT;

/* Items for javascript. */
$lang->js = new stdclass();
$lang->js->confirmDelete = '您確定要執行刪除操作嗎？';
$lang->js->confirmFinish = '您確定要執行完成操作嗎？';
$lang->js->deleteing     = '刪除中';
$lang->js->doing         = '處理中';
$lang->js->timeout       = '網絡超時,請重試';
$lang->js->yes           = '是';
$lang->js->no            = '否';

/* The main menus. */
$lang->menu = new stdclass();
$lang->menu->index   = '首页|index|index|';
$lang->menu->setting = '基础配置|setting|xuanxuan|';
$lang->menu->user    = '用户管理|user|admin|';

$lang->subMenuMap = new stdclass();
$lang->subMenuMap->setting      = 'setting';
$lang->subMenuMap->groupsetting = 'setting';
$lang->subMenuMap->push         = 'setting';

$lang->subMenuMap->user  = 'user';
$lang->subMenuMap->group = 'user';
$lang->subMenuMap->tree  = 'user';

$lang->subMenuGroup = new stdclass();
$lang->subMenuGroup->setting = array();
$lang->subMenuGroup->setting['setting']      = '參數設置|setting|xuanxuan|';
$lang->subMenuGroup->setting['groupsetting'] = '會話管理|groupsetting|admin|';

$lang->subMenuGroup->user = array();
$lang->subMenuGroup->user['user']  = '用戶|user|admin|';
$lang->subMenuGroup->user['group'] = '權限|group|browse|';

$lang->subMenuType = new stdclass();
$lang->subMenuType->user    = 'top';
$lang->subMenuType->setting = 'left';

/* Setting menu. */
$lang->menuGroups = new stdclass();
$lang->menuGroups->tree = 'user';

/* The error messages. */
$lang->error = new stdclass();
$lang->error->length       = array('<strong>%s</strong>長度錯誤，應當為<strong>%s</strong>', '<strong>%s</strong>長度應當不超過<strong>%s</strong>，且不小於<strong>%s</strong>。');
$lang->error->reg          = '<strong>%s</strong>不符合格式，應當為:<strong>%s</strong>。';
$lang->error->unique       = '<strong>%s</strong>已經有<strong>%s</strong>這條記錄了。';
$lang->error->notempty     = '<strong>%s</strong>不能為空。';
$lang->error->empty        = "<strong>%s</strong>必須為空。";
$lang->error->equal        = '<strong>%s</strong>必須為<strong>%s</strong>。';
$lang->error->gt           = "<strong>%s</strong>應當大於<strong>%s</strong>。";
$lang->error->ge           = "<strong>%s</strong>應當不小於<strong>%s</strong>。";
$lang->error->lt           = "<strong>%s</strong>應當小於<strong>%s</strong>。";
$lang->error->le           = "<strong>%s</strong>應當不大於<strong>%s</strong>。";
$lang->error->in           = '<strong>%s</strong>必須為<strong>%s</strong>。';
$lang->error->int          = array('<strong>%s</strong>應當是數字。', '<strong>%s</strong>最小值為%s',  '<strong>%s</strong>應當介於<strong>%s-%s</strong>之間。');
$lang->error->float        = '<strong>%s</strong>應當是數字，可以是小數。';
$lang->error->email        = '<strong>%s</strong>應當為合法的EMAIL。';
$lang->error->mobile       = '<strong>%s</strong>應當為合法的手機號。';
$lang->error->tel          = '<strong>%s</strong>應當為合法的電話號碼。';
$lang->error->URL          = '<strong>%s</strong>應當為合法的URL。';
$lang->error->date         = '<strong>%s</strong>應當為合法的日期。';
$lang->error->code         = '<strong>%s</strong>應當為字母或數字的組合。';
$lang->error->account      = '<strong>%s</strong>應當為字母或數字的組合，至少三位';
$lang->error->passwordsame = '兩次密碼應當相等。';
$lang->error->passwordweak = '密碼應長10位以上，包含字母，數字，特殊字符。';
$lang->error->passwordrule = '密碼應該符合規則，長度至少為六位。';
$lang->error->captcha      = '請輸入正確的驗證碼。';
$lang->error->noWritable   = '%s 可能不可寫，請修改權限！';
$lang->error->noConvertFun = '不存在iconv和mb_convert_encoding轉碼方法，不能將數據轉成想要的編碼！';
$lang->error->noCurlExt    = '沒有加載curl擴展！';
$lang->error->notInt       = '<strong>%s</strong>不能為純數字組合。';
$lang->error->pasteImg     = '您的瀏覽器不支持粘貼圖片！';
$lang->error->accessDenied = '訪問受限';
$lang->error->deny         = "抱歉，您無權訪問『<b>%s</b>』模組的『<b>%s</b>』功能。請聯繫管理員獲取權限。";

/* The pager items. */
$lang->pager = new stdclass();
$lang->pager->noRecord   = '暫時沒有記錄。';
$lang->pager->digest     = "共 <strong>%s</strong> 條記錄，%s <strong>%s/%s</strong> &nbsp; ";
$lang->pager->recPerPage = "每頁 <strong>%s</strong> 條";
$lang->pager->first      = '首頁';
$lang->pager->pre        = '上頁';
$lang->pager->next       = '下頁';
$lang->pager->last       = '末頁';
$lang->pager->locate     = 'Go!';
$lang->pager->showMore   = '顯示更多 <i class="icon icon-double-angle-down"></i>';
$lang->pager->noMore     = '沒有更多';
$lang->pager->showTotal  = '已顯示 <strong>%s</strong> 項，共 <strong>%s</strong> 項';
$lang->pager->previousPage = "上一頁";
$lang->pager->nextPage     = "下一頁";
$lang->pager->summery      = "第 <strong>%s-%s</strong> 項，共 <strong>%s</strong> 項";

$lang->importFile     = '導入檔案';

$lang->excel = new stdClass();
$lang->excel->error = new stdclass();
$lang->excel->error->info       = '您輸入的值不在下拉框列表內。';
$lang->excel->error->title      = '輸入有誤';
$lang->excel->error->noFile     = '沒有檔案';
$lang->excel->error->noData     = '沒有有效的數據';
$lang->excel->error->canNotRead = '不能解析該檔案';
$lang->excel->title = new stdclass();
$lang->excel->title->contact  = '聯繫人';
$lang->excel->title->sysValue = '系統數據';

$lang->date = new stdclass();
$lang->date->minute = '分鐘';
$lang->date->day    = '天';

$lang->genderList = new stdclass();
$lang->genderList->m = '男';
$lang->genderList->f = '女';
$lang->genderList->u = '';

/* datepicker 時間*/
$lang->datepicker = new stdclass();

$lang->datepicker->dpText = new stdclass();
$lang->datepicker->dpText->TEXT_OR          = '或 ';
$lang->datepicker->dpText->TEXT_PREV_YEAR   = '去年';
$lang->datepicker->dpText->TEXT_PREV_MONTH  = '上月';
$lang->datepicker->dpText->TEXT_PREV_WEEK   = '上周';
$lang->datepicker->dpText->TEXT_YESTERDAY   = '昨天';
$lang->datepicker->dpText->TEXT_THIS_YEAR   = '今年';
$lang->datepicker->dpText->TEXT_THIS_MONTH  = '本月';
$lang->datepicker->dpText->TEXT_THIS_WEEK   = '本週';
$lang->datepicker->dpText->TEXT_TODAY       = '今天';
$lang->datepicker->dpText->TEXT_NEXT_YEAR   = '明年';
$lang->datepicker->dpText->TEXT_NEXT_MONTH  = '下月';
$lang->datepicker->dpText->TEXT_CLOSE       = '關閉';
$lang->datepicker->dpText->TEXT_DATE        = '選擇時間段';
$lang->datepicker->dpText->TEXT_CHOOSE_DATE = '選擇日期';

$lang->datepicker->dayNames     = array('星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六');
$lang->datepicker->abbrDayNames = array('日', '一', '二', '三', '四', '五', '六');
$lang->datepicker->monthNames   = array('一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月');

/* The datetime settings. */
if(!defined('DT_DATETIME1'))  define('DT_DATETIME1',  'Y-m-d H:i:s');
if(!defined('DT_DATETIME2'))  define('DT_DATETIME2',  'Y-m-d H:i');
if(!defined('DT_DATETIME3'))  define('DT_DATETIME3',  'y-m-d H:i');
if(!defined('DT_MONTHTIME1')) define('DT_MONTHTIME1', 'n/d H:i');
if(!defined('DT_MONTHTIME2')) define('DT_MONTHTIME2', 'n月d日 H:i');
if(!defined('DT_DATE1'))      define('DT_DATE1',      'Y-m-d');
if(!defined('DT_DATE2'))      define('DT_DATE2',      'Ymd');
if(!defined('DT_DATE3'))      define('DT_DATE3',      'Y年m月d日');
if(!defined('DT_DATE4'))      define('DT_DATE4',      'n月j日');
if(!defined('DT_DATE5'))      define('DT_DATE5',      'Y年m月');
if(!defined('DT_TIME1'))      define('DT_TIME1',      'H:i:s');
if(!defined('DT_TIME2'))      define('DT_TIME2',      'H:i');

include (dirname(__FILE__) . '/menuOrder.php');
