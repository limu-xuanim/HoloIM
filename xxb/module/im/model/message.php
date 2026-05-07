<?php
class imMessage extends model
{
    /**
     * @var imModel
     */
    public $im;

    /**
     * Get message list.
     *
     * @param  string $cgid
     * @param  array  $idList
     * @param  object $pager
     * @param  string $startDate
     * @param  string $type
     * @param  bool   $format
     * @param  bool   $masterOnly
     * @param  int    $userID
     * @access public
     * @return array
     */
    public function getList($cgid = '', $idList = array(), $pager = null, $startDate = '', $type = '', $format = true, $masterOnly = false, $userID = null)
    {
        if($masterOnly)
        {
            $tables = array((object)array('tableName' => TABLE_IM_MESSAGE, 'messages' => $idList));
        }
        else
        {
            if(!empty($idList))    $tables = $this->getTableByMessages($idList);
            if(!empty($startDate)) $tables = $this->getTablesByDateRange($startDate);
            if(empty($idList) && empty($startDate)) $tables = $this->getAllTables();
            if(empty($tables)) return array();
        }

        $queries = array();
        foreach($tables as $table)
        {
            $queries[] = $this->dao->select('*')->from($table->tableName)->where('1=1')
                ->beginIF(!empty($cgid))->andWhere('cgid')->eq($cgid)->fi()
                ->beginIF(!empty($idList))->andWhere('id')->in($table->messages)->fi()
                ->beginIF(!empty($startDate))->andWhere('date')->ge($startDate)->fi()
                ->beginIF(!empty($type) && strpos($type, '!') === 0)->andWhere('type')->ne(substr($type, 1))->fi()
                ->beginIF(!empty($type) && strpos($type, '!') !== 0)->andWhere('type')->eq($type)->fi()
                ->beginIF($userID != null)->andWhere('user')->eq($userID)->fi()
                ->get();
        }
        $query = join(' UNION ALL ', $queries);

        $sql = $this->dao->select('*')->from(TABLE_IM_MESSAGE);
        $sql->sqlobj->sql = 'SELECT * FROM (' . $query . ') as t';

        $messages = $sql
            ->orderBy('id_desc')
            ->beginIF($pager != null)->page($pager)->fi()
            ->fetchAll();
        return $format ? $this->format($messages) : $messages;
    }

    /**
     * Format messages.
     *
     * @param  mixed  $messages  object | array
     * @access public
     * @return object | array
     */
    public function format($messages)
    {
        $isObject = false;
        if(is_object($messages))
        {
            $isObject = true;
            $messages = array($messages);
        }

        $messageList = array();
        foreach($messages as $message)
        {
            $message->id      = (int)$message->id;
            $message->index   = (int)$message->index;
            $message->user    = (int)$message->user;
            $message->date    = strtotime($message->date);
            $message->deleted = isset($message->deleted) ? (bool)$message->deleted : false;

            if($message->deleted) $message->content = '';

            $messageList[$message->gid] = $message;
        }

        if($isObject) return reset($messageList);

        return $messageList;
    }

    /**
     * Get message count for block.
     *
     * @access public
     * @return object
     */
    public function getCountForBlock()
    {
        $masterTableTotal = $this->dao->select('COUNT(*) AS masterTableTotal')->from(TABLE_IM_MESSAGE)->where('deleted')->eq('0')->fetch('masterTableTotal');
        $partitionsTotal  = $this->dao->select('SUM(`count`) AS partitionsTotal')->from(TABLE_IM_CHAT_MESSAGE_INDEX)->fetch('partitionsTotal');

        $dayCount  = $this->dao->select("count(1) AS dayCount")->from(TABLE_IM_MESSAGE)->where('date')->gt(date('Y-m-d H:i', strtotime('-1 day')))->andWhere('deleted')->eq('0')->fetch('dayCount');
        $hourCount = $this->dao->select("count(1) AS hourCount")->from(TABLE_IM_MESSAGE)->where('date')->gt(date('Y-m-d H:i', strtotime('-1 hour')))->andWhere('deleted')->eq('0')->fetch('hourCount');

        $count = new stdClass();
        $count->total = $masterTableTotal + ($partitionsTotal || 0);
        $count->day   = $dayCount;
        $count->hour  = $hourCount;

        if(empty($count->total))
        {
            $count->total = 0;
            $count->day = 0;
            $count->hour = 0;
        }

        return $count;
    }

    /**
     * Get all message tables.
     *
     * @access public
     * @return array
     */
    public function getAllTables()
    {
        $tables = $this->dao->select('tableName')->from(TABLE_IM_MESSAGE_INDEX)->fetchAll();

        foreach($tables as $key => $table) $tables[$key]->messages = '';

        $master = new stdclass;
        $master->tableName = TABLE_IM_MESSAGE;
        $master->messages  = '';
        $tables[] = $master;

        return $tables;
    }

    /**
     * Get message table names by message IDs.
     *
     * @param  array  $messageIDs
     * @access public
     * @return array
     */
    public function getTableByMessages($messageIDs)
    {
        $tables = array();
        $indices = $this->dao->select('tableName,start,end')->from(TABLE_IM_MESSAGE_INDEX)->fetchAll('tableName');

        $processedIDs = array();
        foreach($indices as $index)
        {
            $min = $index->start;
            $max = $index->end;
            $ids = array_filter(
                $messageIDs,
                function($id) use ($min, $max)
                {
                    return $id >= $min && $id <= $max;
                }
            );
            if(!empty($ids))
            {
                $result = new stdclass();
                $result->tableName = $index->tableName;
                $result->messages  = $ids;
                $tables[$index->tableName] = $result;

                $processedIDs = array_merge($processedIDs, $ids);
            }
        }

        $unindexed = array_diff($messageIDs, $processedIDs);
        if(!empty($unindexed))
        {
            $result = new stdclass();
            $result->tableName = TABLE_IM_MESSAGE;
            $result->messages  = $unindexed;
            $tables[TABLE_IM_MESSAGE] = $result;
        }

        return $tables;
    }

    /**
     * Get tables by start (and / or) end date).
     *
     * @param  string $startDate
     * @param  string $endDate
     * @access public
     * @return array
     */
    public function getTablesByDateRange($startDate = '', $endDate = '')
    {
        $tables = $this->dao->select('tableName,startDate,endDate')->from(TABLE_IM_MESSAGE_INDEX)
            ->where('1=1')
            ->beginIF(!empty($startDate))->andWhere('endDate')->ge($startDate)->fi()
            ->beginIF(!empty($endDate))->andWhere('startDate')->le($endDate)->fi()
            ->fetchAll('tableName');

        if(empty($tables)) $appendMaster = true;

        elseif(!empty($endDate))
        {
            $maxEndDate = max(array_map(
                function($t)
                {
                    return $t->endDate;
                },
                $tables
            ));
            if($maxEndDate < $endDate) $appendMaster = true;
        }

        if(isset($appendMaster))
        {
            $master = new stdclass();
            $master->tableName = TABLE_IM_MESSAGE;
            $master->startDate = isset($maxEndDate) ? $maxEndDate : null;
            $master->endDate   = '9999-12-31 23:59:59';
            $tables[] = $master;
        }

        return $tables;
    }
}