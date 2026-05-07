<?php
/**
 * The treeview view of common module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     common
 * @link        https://xuanim.com
 */
css::import($jsRoot . 'jquery/treeview/min.css');
js::import($jsRoot . 'jquery/treeview/min.js');
?>
<script>
$(function()
{
    $('.tree').each(function()
    {
        var $this = $(this);
        $this.treeview($.extend({collapsed: false, unique: false}, $this.data()));
    });
})</script>
