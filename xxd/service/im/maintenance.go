package im

import (
	"fmt"
	"xxd/model"
	"xxd/util"
)

func (i *ImService) Maintenance() error {
	// 重新索引用户拼音
	userModel := &model.User{}
	util.Log("info", "Starting user pinyin reindex")
	if err := userModel.ReindexPinyin(i.db, []int64{}); err != nil {
		util.Log("error", fmt.Sprintf("Failed to reindex user pinyin: %v", err))
		return fmt.Errorf("failed to reindex user pinyin: %w", err)
	}
	util.Log("info", "User pinyin reindex completed")

	// 检查是否需要分区
	partitionMark := model.MarkOngoingMessagePartition(i.db, "true")
	defer model.MarkOngoingMessagePartition(i.db, "false")

	if !partitionMark {
		util.Log("warning", "Another partition operation is already in progress")
		return nil
	}

	need, err := model.MessageNeedPartition(i.db)
	if err != nil {
		util.Log("error", fmt.Sprintf("Failed to check partition need: %v", err))
		return fmt.Errorf("failed to check partition need: %w", err)
	}

	if !need {
		util.Log("info", "Message partition not needed")
		return nil
	}

	util.Log("info", "Starting message partition operation")
	if err := model.MessagePartitionTable(i.db); err != nil {
		util.Log("error", fmt.Sprintf("Failed to partition message table: %v", err))
		return fmt.Errorf("failed to partition message table: %w", err)
	}
	return nil
}
