package user

import (
	"xxd/api"
	"xxd/model"
	"xxd/util"
)

type KickedData struct {
	KickedChangePwd []int64 `json:"kickedChangePwd"`
	KickedDeleted   []int64 `json:"kickedDeleted"`
	KickedForbided  []int64 `json:"kickedForbided"`
}

// GetKickList 获取需要踢出的用户列表
func (u *UserService) GetKickList(serverName string) (*KickedData, error) {
	// 验证服务器名称是否存在配置中（与原api.GetKickUsers方法保持一致）
	_, ok := api.RanzhiServer(serverName)
	if !ok {
		return nil, util.Errorf(util.GetLang("[GetKickList]", " ", "cannot found backend server", " %s"), serverName)
	}

	var user model.User

	// 获取更改密码但未重新登录的用户
	kickedChangePwd, err := user.GetChangedPassword(u.db)
	if err != nil {
		util.Log("error", "Failed to get users with changed passwords: %s", err.Error())
		return nil, util.Errorf(util.GetLang("[GetKickList]", " ", "failed to get changed password users", ": %s"), err.Error())
	}

	// 获取已删除但仍在线的用户
	kickedDeleted, err := user.GetOnlineDeleted(u.db)
	if err != nil {
		util.Log("error", "Failed to get deleted online users: %s", err.Error())
		return nil, util.Errorf(util.GetLang("[GetKickList]", " ", "failed to get deleted online users", ": %s"), err.Error())
	}

	// 获取已禁用但仍在线的用户
	kickedForbidden, err := user.GetOnlineForbidden(u.db)
	if err != nil {
		util.Log("error", "Failed to get forbidden online users: %s", err.Error())
		return nil, util.Errorf(util.GetLang("[GetKickList]", " ", "failed to get forbidden online users", ": %s"), err.Error())
	}

	// 如果没有需要踢出的用户，返回nil（与原方法逻辑一致）
	if len(kickedChangePwd) == 0 && len(kickedDeleted) == 0 && len(kickedForbidden) == 0 {
		return nil, nil
	}

	// 构建返回数据
	kickedData := &KickedData{
		KickedChangePwd: kickedChangePwd,
		KickedDeleted:   kickedDeleted,
		KickedForbided:  kickedForbidden,
	}

	return kickedData, nil
}
