<?php
/**
 * The admin view file of user module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     User
 * @link        https://xuanim.com
 */
?>
<?php
include '../../common/view/header.html.php';
js::set('deptID', $deptID);
js::set('from', 'admin');
$hasEditPriv    = commonModel::hasPriv('user', 'edit');
$hasForbidPriv  = commonModel::hasPriv('user', 'forbid');
$hasActivePriv  = commonModel::hasPriv('user', 'active');
$hasDeletePriv  = commonModel::hasPriv('user', 'delete');
$hasRecoverPriv = commonModel::hasPriv('user', 'recover');
$hasOperatePriv = $hasEditPriv || $hasForbidPriv || $hasActivePriv || $hasDeletePriv || $hasRecoverPriv;
?>
<div class='page-content'>
  <?php include './deptside.html.php';?>
  <div class='user-content'>
    <div class='clearfix'>
      <ul class="nav nav-tabs">
        <?php foreach($this->config->user->userTabList as $tabIndex):?>
        <li class="<?php if($type == $tabIndex) echo 'active';?>">
          <a href="<?php echo inlink('admin', 'dept=&mode=' . str_replace('List', '', $tabIndex)); ?>">
            <?php echo $lang->user->$tabIndex;?>
            <?php if($type == $tabIndex) echo "<span class='badge'>{$pager->recTotal}</span>";?>
          </a>
        </li>
        <?php endforeach;?>
        <div class="search-content">
          <form method='post' class='form-search w-200px'>
            <div class="input-group" style='padding-left:10px;width:100%;'>
              <?php echo html::input('search', $search, "class='form-control search-query' required placeholder='{$lang->user->inputAccount}'"); ?>
              <span class="input-group-btn">
                <?php echo html::submitButton("<i class='icon icon-search'></i>", "btn btn-default btn-xs"); ?>
              </span>
            </div>
          </form>
        </div>
        <div class="table-actions">
          <?php
          $importSVG = html::svgIcon('import');
          $exportSVG = html::svgIcon('export');
          $roleSVG = html::svgIcon('role');
          ?>
          <?php if(commonModel::hasPriv('setting', 'lang')) echo html::a($this->createLink('setting', 'lang', "module=user&field=roleList"), "<span class='btn-content'>{$roleSVG}{$lang->user->editRole}</span>", "class='btn btn-link'");?>
          <div class="btn-group">
            <?php if(commonModel::hasPriv('user', 'create')) echo html::a($this->inlink('create'), '+ ' . $lang->user->create, "class='btn btn-primary'");?>
            <button type="button" class="btn btn-primary dropdown-toggle" data-toggle="dropdown">
              <span class="caret"></span>
            </button>
            <ul class="dropdown-menu" role="menu">
              <li><?php if(commonModel::hasPriv('user', 'create')) echo html::a($this->inlink('create'), $lang->user->create, " ");?></li>
              <li><?php if(commonModel::hasPriv('user', 'batchcreate')) echo html::a($this->inlink('batchcreate'), $lang->user->batchCreate, " ");?></li>
            </ul>
          </div>
      </div>
      </ul>
      <table class='table table-hover table-striped table-bordered tablesorter table-fixed' id='userTable'>
        <thead>
          <tr class='text-center'>
            <?php $vars = "deptID=$deptID&mode=$mode&search=$search&orderBy=%s&recTotal={$pager->recTotal}&recPerPage={$pager->recPerPage}&pageID={$pager->pageID}";?>
            <th class='w-60px'><?php commonModel::printOrderLink('id', $orderBy, $vars, $lang->user->id);?></th>
            <th class='w-100px'><?php commonModel::printOrderLink('realname', $orderBy, $vars, $lang->user->realname);?></th>
            <th><?php commonModel::printOrderLink('account', $orderBy, $vars, $lang->user->account);?></th>
            <th class='w-70px'><?php commonModel::printOrderLink('gender', $orderBy, $vars, $lang->user->gender);?></th>
            <th><?php commonModel::printOrderLink('dept', $orderBy, $vars, $lang->user->dept);?></th>
            <th class='w-80px visible-lg'><?php commonModel::printOrderLink('join', $orderBy, $vars, $lang->user->join);?></th>
            <th class='w-80px visible-lg'><?php commonModel::printOrderLink('visits', $orderBy, $vars, $lang->user->visits);?></th>
            <th class='w-140px'><?php commonModel::printOrderLink('last', $orderBy, $vars, $lang->user->last);?></th>
            <th class='w-110px'><?php commonModel::printOrderLink('ip', $orderBy, $vars, $lang->user->ip);?></th>
            <th class='w-70px'><?php commonModel::printOrderLink('locked', $orderBy, $vars, $lang->user->status);?></th>
            <?php if($hasOperatePriv): ?>
            <?php $class = $this->app->clientLang == 'en' ? 'w-210px' : 'w-160px';?>
            <th class='text-center <?php echo $class;?>'><?php echo $lang->actions;?></th>
            <?php endif; ?>
          </tr>
        </thead>
        <tbody>
        <?php foreach($users as $user):?>
        <tr class='text-center'>
          <td><?php echo $user->id;?></td>
          <td><?php echo $user->realname;?></td>
          <td><?php echo $user->account;?></td>
          <td><?php $gender = $user->gender; echo $lang->user->genderList->$gender;?></td>
          <?php if(isset($depts[$user->dept])): ?>
          <td title="<?php echo $depts[$user->dept];?>"><?php echo $depts[$user->dept];?></td>
          <?php else: ?>
          <td></td>
          <?php endif; ?>
          <td class='visible-lg'><?php echo formatTime($user->join, DT_DATE1);?></td>
          <td class='visible-lg'><?php echo $user->visits;?></td>
          <td><?php echo $user->last;?></td>
          <td><?php echo $user->ip;?></td>
          <td>
            <?php
            $status = 'normal';
            if($user->deleted == '1')
            {
                $status = 'deleted';
                echo $lang->user->statusList->deleted;
            }
            else if($user->fails > 4 and $user->locked > helper::now())
            {
                $status = 'locked';
                echo $lang->user->statusList->locked;
            }
            else if($user->fails <= 4 and $user->locked > helper::now())
            {
                $status = 'forbidden';
                echo $lang->user->statusList->forbidden;
            }
            else if($user->locked <= helper::now()) echo $lang->user->statusList->normal;
            ?>
          </td>
          <?php if($hasOperatePriv): ?>
          <td class='operate'>
            <?php
            if($status == 'deleted')
            {
                if ($hasRecoverPriv)
                {
                  echo html::a($this->createLink('user', 'recover', "account=$user->account"), $lang->user->recover);
                }
            }
            else
            {
                if($hasEditPriv)
                {
                    echo html::a($this->createLink('user', 'edit', "account=$user->account&from=admin"), $lang->edit);
                    echo html::a($this->createLink('user', 'resetClientConfig', "account=$user->account"), $lang->user->resetClientConfig, 'class="btn-reset-client-config"');
                }
                if($status == 'normal' && $hasForbidPriv)
                {
                    echo html::a($this->createLink('user', 'forbid', "account=$user->account"), $lang->user->forbid, "class='forbider'");
                }
                else if(($status == 'forbidden' || $status == 'locked') && $hasActivePriv)
                {
                    echo html::a($this->createLink('user', 'active', "account=$user->account"), $lang->user->active, "class='forbider'");
                }
                if($hasDeletePriv)
                {
                    echo html::a($this->createLink('user', 'delete', "account=$user->account"), $lang->delete, "class='deleter'");
                }
            }
            ?>
          </td>
          <?php endif; ?>
        </tr>
        <?php endforeach;?>
        </tbody>
      </table>
      <div class='table-footer'><?php $pager->show();?></div>
    </div>
  </div>
</div>
<?php include '../../common/view/footer.html.php';?>
