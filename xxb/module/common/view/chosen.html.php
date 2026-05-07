<?php
/**
 * The chosen view of common module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     common
 * @link        https://xuanim.com
 */
if($extView = $this->getExtViewFile(__FILE__)){include $extView; return helper::cd();}
css::import($jsRoot . 'jquery/chosen/min.css');
js::import($jsRoot . 'jquery/chosen/min.js');
?>

<script>
window.chosenDefaultOptions = {no_results_text: '<?php echo $lang->noResultsMatch;?>', disable_search_threshold: 1, search_contains: true, width: '100%', allow_single_deselect: true};
$(document).ready(function()
{
    $(".chosen").chosen(chosenDefaultOptions);
});
</script>
