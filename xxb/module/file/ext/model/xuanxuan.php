<?php
/**
 * Get xxc all file size. 
 *
 * @access public
 * @return Number 
 */
public function getXxcAllFileSize()
{
    return $this->dao->select('sum(size) as size')->from(TABLE_FILE)->where('objectType')->eq('chat')->fetch('size');
}
