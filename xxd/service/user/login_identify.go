package user

import (
	"strings"
	"xxd/model"
	"xxd/util"
)

// UserIdentify 验证用户身份
func (s *LoginService) UserIdentify(account, password, clientIP string, device string) (*model.User, error) {
	// 如果密码是64字节的令牌格式，则使用令牌验证
	if len(password) == 64 {
		return user.IdentifyWithToken(s.db, account, password, "", clientIP)
	}

	// 如果账号不是邮箱格式，计算密码哈希
	if !strings.Contains(account, "@") {
		password = util.MD5(password + account)
	}

	userInfo, err := user.Identify(s.db, account, password, clientIP)
	if err != nil || userInfo.ID == 0 {
		return nil, err
	}

	// 生成认证令牌
	token, err := userInfo.GetAuthToken(s.db, int64(userInfo.ID), device, "")
	if err != nil {
		util.LogDetail(util.GetLang("[Login]", " ", "getAuthToken error: %s", err.Error()))
		return nil, err
	}
	userInfo.Token = token.Token

	return &userInfo, nil
}
