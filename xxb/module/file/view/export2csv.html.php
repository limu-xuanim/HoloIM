<?php
/**
 * The export2csv view file of file module of XXB.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     file
 * @link        https://xuanim.com
 */
?>
<?php
$count = count($fields);
echo '"'. implode('","', $fields) . '"' . "\n";
foreach($rows as $row)
{
    echo '"';
    $i = 0;
    foreach($fields as $fieldName => $fieldLabel)
    {
        isset($row->$fieldName) ? print(str_replace('",', '"，', strip_tags($row->$fieldName))) : print('');
        if(++$i < $count) echo '","';
    }
    echo '"' . "\n";
}
