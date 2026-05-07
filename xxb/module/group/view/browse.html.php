<?php
/**
 * The browse view file of group module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     group
 * @link        https://xuanim.com
 */
?>
<?php include '../../common/view/header.html.php';?>
<div class='panel-actions'>
  <?php echo html::a($this->inlink('create'), '+ ' . $lang->group->create, "class='btn btn-primary' data-toggle='modal'");?>
</div>
<?php if(empty($groups)):?>
  <div class='empty-state'>
    <div class='empty-message'><?php echo $lang->group->noData;?></div>
    <?php echo html::a($this->inlink('create'), '+ ' . $lang->group->create, "class='empty-btn' data-toggle='modal'");?>
  </div>
<?php else:?>
<div class='panel'>
  
  <table class='table table-hover table-striped'>
    <thead>
      <tr>
        <th class='w-50px'><?php echo $lang->group->id;?></th>
        <?php $class = $this->app->clientLang == 'en' ? 'w-130px' : 'w-100px';?>
        <th class='<?php echo $class;?>'><?php echo $lang->group->name;?></th>
        <th class='w-200px visible-lg'><?php echo $lang->group->desc;?></th>
        <th><?php echo $lang->group->users;?></th>
        <?php $class = $this->app->clientLang == 'en' ? 'w-280px' : 'w-240px';?>
        <th class='<?php echo $class;?> text-center'><?php echo $lang->actions;?></th>
      </tr>
    </thead>
    <tbody>
    <?php foreach($groups as $group):?>
    <?php $users = implode(' ', $groupUsers[$group->id]);?>
    <tr>
      <td class='text-center'><?php echo $group->id;?></td>
      <td><?php echo $group->name;?></td>
      <td class='visible-lg'><?php echo $group->desc;?></td>
      <td class='user-list' title='<?php echo $users;?>'>
        <div>
          <?php echo $users;?>
          <a class ="hide-list" href="javascript:#"><?php echo $lang->group->hide;?></a>
        </div>
        <a class ="more-list" href="javascript:#"><?php echo $lang->group->show;?></a>
      </td>
      <td class='text-center'>
        <?php echo html::a(inlink('manageMember', "groupID={$group->id}"), $lang->group->manageMember, "data-toggle='modal' data-width='1200px'");?>
        <?php echo html::a(inlink('managePriv', "type=byGroup&param={$group->id}"), $lang->group->managePriv);?>
        <?php echo html::a(inlink('edit', "groupID={$group->id}"), $lang->edit, "data-toggle='modal'");?>
        <?php echo html::a(inlink('delete', "groupID={$group->id}"), $lang->delete, "class='deleter'");?>
      </td>
    </tr>
    <?php endforeach;?>
    </tbody>
  </table>

</div>
<?php endif;?>
<?php include '../../common/view/footer.html.php';?>
