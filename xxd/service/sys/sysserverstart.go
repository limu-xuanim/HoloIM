package sys

func (sys *SysService) SysServerStart() {
	sys.setXxdStartTime(sys.db)
	sys.userResetStatus(sys.db)
	sys.userReindexPinyin(sys.db, []int64{})
	sys.chatInitSystemChat(sys.db)
	sys.UpdateLastPoll()
}
