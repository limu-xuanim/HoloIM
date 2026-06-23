package model

import (
	"crypto/md5"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net"
	"strings"
	"time"
	"xxd/util"

	"gorm.io/gorm"
)

type User struct {
	ID           int64      `json:"id" gorm:"column:id"`
	Dept         int64      `json:"dept" gorm:"column:dept"`
	Account      string     `json:"account" gorm:"column:account"`
	Password     string     `json:"password" gorm:"column:password"`
	RealName     string     `json:"realname" gorm:"column:realname"`
	Pinyin       string     `json:"pinyin" gorm:"column:pinyin"`
	Role         string     `json:"role" gorm:"column:role"`
	DeviceToken  string     `json:"deviceToken" gorm:"column:deviceToken"`
	DeviceType   string     `json:"deviceType" gorm:"column:deviceType"`
	Nickname     string     `json:"nickname" gorm:"column:nickname"`
	Admin        string     `json:"admin" gorm:"column:admin"`
	Avatar       string     `json:"avatar" gorm:"column:avatar"`
	Birthday     *time.Time `json:"birthday" gorm:"column:birthday"`
	Gender       string     `json:"gender" gorm:"column:gender"`
	Email        string     `json:"email" gorm:"column:email"`
	Skype        string     `json:"skype" gorm:"column:skype"`
	Qq           string     `json:"qq" gorm:"column:qq"`
	WeiXin       string     `json:"weixin" gorm:"column:weixin"`
	Yahoo        string     `json:"yahoo" gorm:"column:yahoo"`
	Gtalk        string     `json:"gtalk" gorm:"column:gtalk"`
	WangWang     string     `json:"wangwang" gorm:"column:wangwang"`
	Site         string     `json:"site" gorm:"column:site"`
	Mobile       string     `json:"mobile" gorm:"column:mobile"`
	Phone        string     `json:"phone" gorm:"column:phone"`
	Address      string     `json:"address" gorm:"column:address"`
	Zipcode      string     `json:"zipcode" gorm:"column:zipcode"`
	Visits       int64      `json:"visits" gorm:"column:visits"`
	Ip           string     `json:"ip" gorm:"column:ip"`
	Last         *time.Time `json:"last" gorm:"column:last"`
	Ping         *time.Time `json:"ping" gorm:"column:ping"`
	Fails        int8       `json:"fails" gorm:"column:fails"`
	Join         *time.Time `json:"join" gorm:"column:join"`
	Locked       *time.Time `json:"locked" gorm:"column:locked"`
	Deleted      string     `json:"deleted" gorm:"column:deleted"`
	ClientStatus string     `json:"clientStatus" gorm:"column:clientStatus"`
	ClientLang   string     `json:"clientLang" gorm:"column:clientLang"`
	Status       string     `json:"status" gorm:"-"`
	// ClusterNode  string     `json:"clusterNode" gorm:"column:clusterNode"`

	Token          string `json:"token" gorm:"-"`
	TokenNeedRenew bool   `json:"tokenNeedRenew" gorm:"-"`
}

var (
	ErrLocked       = errors.New("locked")
	ErrBanned       = errors.New("banned")
	ErrInvalidToken = errors.New("invalid_token")
)

// TableName 表名称
func (*User) TableName() string {
	return util.Config.Mysql.SysPrefix + "user"
}

func (u *User) ToMap() (map[string]any, error) {
	jsonBytes, err := json.Marshal(u)
	if err != nil {
		return nil, err
	}

	var result map[string]any
	err = json.Unmarshal(jsonBytes, &result)
	if err != nil {
		return nil, err
	}

	result["status"] = u.ClientStatus
	if u.Avatar != "" && !strings.HasPrefix(u.Avatar, "http://") && !strings.HasPrefix(u.Avatar, "https://") {
		result["avatar"] = util.GetSysURLWithoutXxb() + u.Avatar
	}
	return result, err
}

func ConvertUsersSlice(users []User) []any {
	userList := make([]any, 0)
	for _, user := range users {
		userMap, _ := user.ToMap()
		userList = append(userList, userMap)
	}
	return userList
}

func (u *User) GetUserByAccount(db *gorm.DB, account string) (User, error) {
	var user User
	db.Model(&User{}).Where("account = ? ", account).First(&user)

	return u.Format(user, db).(User), nil
}

// 根据用户ID获取账号
func (u *User) GetAccountByID(db *gorm.DB, userID int64) (User, error) {
	// 先从缓存获取
	if cached, ok := util.GetUserFromCache(userID); ok {
		if user, ok := cached.(User); ok {
			return user, nil
		}
	}

	// 缓存未命中，从数据库查询
	var user User
	db.Model(&User{}).Where("id = ?", userID).First(&user)
	formattedUser := u.Format(user, db).(User)

	// 写入缓存
	if formattedUser.ID > 0 {
		util.SetUserToCache(userID, formattedUser)
	}

	return formattedUser, nil
}

// RevokeAuthToken 撤销用户的认证令牌
func (u *User) RevokeAuthToken(db *gorm.DB, userID int64) error {
	return db.Model(&ImUserDevice{}).Where("user = ?", userID).Update("validUntil", time.Now()).Error
}

// updateUserPinyin 更新用户拼音
func (u *User) updateUserPinyin(db *gorm.DB, userID int64, realname string) error {
	pinyin := util.ConvertToPinyin(realname)
	return db.Model(&User{}).Where("id = ?", userID).Update("pinyin", pinyin).Error
}

func (u *User) Identify(db *gorm.DB, account string, password string, clientIP string) (User, error) {
	if account == "" || password == "" {
		return User{}, errors.New("account and password are required")
	}

	userInfo, err := u.GetUserByAccount(db, account)
	if err != nil {
		return User{}, err
	}

	if userInfo.Deleted != "0" || userInfo.ID == 0 {
		return User{}, errors.New("user not exists")
	}

	if userInfo.IsLocked() {
		dateDiff := time.Until(*userInfo.Locked).Minutes()
		if dateDiff > 0 {
			if dateDiff <= 10 {
				return User{}, ErrLocked
			} else {
				return User{}, ErrBanned
			}
		} else {
			// 重置锁定状态
			userInfo.Fails = 0
			userInfo.Locked = nil
		}
	}

	if !u.CompareHashPassword(password, userInfo) {
		userInfo.Fails++
		if userInfo.Fails >= 10 {
			locked := time.Now().Add(10 * time.Minute)
			userInfo.Locked = &locked
		}
		userData := map[string]any{
			"id":     userInfo.ID,
			"fails":  userInfo.Fails,
			"locked": userInfo.Locked,
		}
		err = u.UpdateUserInfo(db, &userInfo, userData, "userlogin", false)
		if err != nil {
			return User{}, err
		}
		return userInfo, errors.New("wrong password")
	}

	return userInfo, nil
}

func (u *User) IsLocked() bool {
	return u.Locked != nil && u.Locked.After(time.Now())
}

// compareHashPassword 比较密码哈希
func (u *User) CompareHashPassword(password string, user User) bool {
	// 实现密码验证逻辑，根据xxb的规则
	if len(password) == 32 {
		// MD5格式验证
		return password == user.Password
	}

	// 其他验证方式
	return false
}

func (u *User) CreatePassword(password string, account string, hashOnce bool) string {
	if hashOnce {
		return util.MD5(password + account)
	}

	return util.MD5(util.MD5(password) + account)
}

func (u *User) ApiCreate(db *gorm.DB, user User, hashOnce bool) error {
	user.Password = u.CreatePassword(user.Password, user.Account, hashOnce)
	// 创建用户
	if err := db.Create(&user).Error; err != nil {
		return err
	}
	return nil
}

// 修改个人信息
func (u *User) UpdateUserInfo(db *gorm.DB, user *User, userInfo map[string]any, methodName string, isBackend bool) error {
	// 检查用户ID是否为空
	if user.ID == 0 {
		return errors.New("user ID is empty")
	}

	// 如果用户离线且不是登录操作，则不允许更新
	if user.ClientStatus == "offline" && !strings.Contains(strings.ToLower(methodName), "userlogin") && !isBackend {
		return errors.New("user is offline")
	}

	// 处理状态更新
	if clientStatus, exists := userInfo["clientStatus"]; exists && clientStatus != "" {
		userInfo["clientStatus"] = clientStatus
	}

	// 处理密码更新
	if password, exists := userInfo["password"]; exists && password != "" {
		if account, exists := userInfo["account"]; exists && account != "" {
			userInfo["password"] = util.MD5(fmt.Sprintf("%v%v", password, account))
			delete(userInfo, "account")
		}
	}

	// 更新用户信息
	if err := db.Model(&User{}).Where("id = ?", user.ID).Updates(userInfo).Error; err != nil {
		return err
	}

	// 失效用户缓存
	util.InvalidateUserCache(user.ID)

	return nil
}

func (u *User) ResetStatus(db *gorm.DB, status string) any {

	if status == "" {
		status = "offline"
	}
	// 更新所有用户的 clientStatus
	result := db.Model(&User{}).Where("id > ?", 0).Update("clientStatus", status)
	if result.Error != nil {
		util.Log("error", util.GetLang("Failed to update clientStatus for all users"))
		return result.Error
	}
	util.Log("info", util.GetLang("Succeeded in updating clientStatus for all users"))
	return nil
}

// 根据userid判断用户是否在线
func (u *User) IsUserOnline(db *gorm.DB, userId int64) (User, bool, error) {
	var user User
	err := db.Where("id = ?", userId).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return user, false, nil
		}
		return user, false, err
	}
	if user.ClientStatus == "online" {
		return user, true, nil
	}
	return user, false, nil
}

func (u *User) IsSuper() bool {
	return u.Admin == "super"
}

// 根据状态获取用户列表
func (u *User) GetListByStatus(db *gorm.DB, status string, userIds []int64) ([]User, error) {
	query := db.Model(&User{}).Select("*").Where("deleted = ?", "0")
	if status != "" {
		if status == "online" {
			query = query.Where("clientStatus <> ?", "offline")
		} else {
			query = query.Where("clientStatus = ?", status)
		}
	}
	if len(userIds) > 0 {
		query = query.Where("id IN ?", userIds)
	}
	var users []User
	if err := query.Find(&users).Error; err != nil {
		return nil, fmt.Errorf("query failure: %v", err)
	}
	return users, nil
}

func (u *User) GetOnlineUsers(db *gorm.DB, userIds []int64) []int64 {
	userOnlineList, _ := u.GetListByStatus(db, "online", userIds)
	var userOnlineIds []int64
	for _, u := range userOnlineList {
		userOnlineIds = append(userOnlineIds, u.ID)
	}

	return userOnlineIds
}

// 更改用户状态为离线
func (u *User) UpdateUserStatus(db *gorm.DB, id int64, offline int) any {
	if offline == 1 {
		result := db.Model(&User{}).Where("id = ?", id).Update("clientStatus", "offline")
		if result.Error != nil {
			util.Log("error", util.GetLang("Failed to update clientStatus for user"))
			return result.Error
		}
		util.Log("info", util.GetLang("Succeeded in updating clientStatus for user"))
		return nil
	} else {
		util.Log("warning", util.GetLang("offline is not 1"))
		return nil
	}
}

// 通过用户ids获取用户信息
func (u *User) GetUserInfoByUserIds(db *gorm.DB, userIds []int64, withDeleted bool) ([]User, error) {
	var users []User
	query := db.Where("id IN ?", userIds)
	if !withDeleted {
		query = query.Where("deleted = ?", "0")
	}
	err := query.Find(&users).Error
	if err != nil {
		return nil, err
	}
	return users, nil
}

// 按部门获取用户id列表
func (u *User) GetIDListByDept(db *gorm.DB, deptID int64, exclude []int64, pager *util.Pager, orderBy string, onlySelf bool) ([]int64, error) {
	var depts []int64
	if deptID != 0 {
		if onlySelf {
			depts = []int64{deptID}
		} else {
			var err error
			var category XxbCategory
			depts, err = category.getFamily(db, deptID, "dept", 0)
			if err != nil {
				return nil, err
			}
		}
	}

	query := db.Table(u.TableName()).Select("id").
		Where("deleted = ?", "0").
		Where("(locked <> ? or locked is null)", "2199-12-31 00:00:00")

	if deptID != 0 {
		query = query.Where("dept IN ?", depts)
	}

	if deptID == 0 && onlySelf {
		query = query.Where("dept = ?", 0)
	}

	if len(exclude) > 0 {
		query = query.Where("id NOT IN ?", exclude)
	}

	if orderBy != "" {
		// 解析 orderBy 格式：列名_排序方向 (如 "pinyin_asc" -> "pinyin ASC")
		orderbySplit := strings.Split(orderBy, "_")
		if len(orderbySplit) == 2 {
			orderbyField := orderbySplit[0]
			orderbyType := strings.ToUpper(orderbySplit[1])
			query = query.Order(orderbyField + " " + orderbyType)
		} else {
			// 如果格式不正确，直接使用原值（向后兼容）
			query = query.Order(orderBy)
		}
	} else {
		query = query.Order("id asc")
	}

	if pager != nil {
		// 先计算总数（不包含分页）
		var recTotal int64
		if err := query.Count(&recTotal).Error; err != nil {
			return nil, err
		}
		pager.RecTotal = recTotal

		// 计算总页数
		if pager.RecPerPage > 0 {
			pager.PageTotal = (pager.RecTotal + pager.RecPerPage - 1) / pager.RecPerPage
		}

		// 然后应用分页
		offset := (pager.PageID - 1) * pager.RecPerPage
		query = query.Offset(int(offset)).Limit(int(pager.RecPerPage))
	}

	var userIDs []int64 = []int64{}
	if err := query.Scan(&userIDs).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return []int64{}, nil
		}
		return nil, err
	}

	return userIDs, nil
}

// 获取用户的真实姓名映射
func (u *User) getRealNamePairs(db *gorm.DB, users []string) (map[string]string, error) {
	userPairs := make(map[string]string)
	if len(users) == 0 {
		return userPairs, nil
	}

	var userList []struct {
		Account  string
		RealName string
	}
	if err := db.Table(u.TableName()).Select("account, realname").Where("account IN ?", users).Find(&userList).Error; err != nil {
		return nil, err
	}

	for _, user := range userList {
		userPairs[user.Account] = user.RealName
	}

	for _, account := range users {
		if _, ok := userPairs[account]; !ok {
			userPairs[account] = account
		}
	}

	for account, realname := range userPairs {
		if realname == "" {
			userPairs[account] = account
		}
	}

	return userPairs, nil
}

// Search 搜索用户。allowedDeptIDs 为 nil 时不应用可见部门过滤；非 nil 时仅返回 dept 在 allowedDeptIDs 内的用户（并与 deptID 请求取交集）。
func (u *User) Search(db *gorm.DB, searchFields string, deptID int64, chatMembers []int64, PageID, RecPerPage int64, exclude []int64, allowedDeptIDs []int64) ([]User, error) {
	var depts []int64
	var err error
	var category XxbCategory
	if deptID != 0 {
		depts, err = category.getFamily(db, deptID, "dept", 1)
		if err != nil {
			return nil, err
		}
	}
	if allowedDeptIDs != nil {
		if len(allowedDeptIDs) == 0 {
			return []User{}, nil
		}
		allowedSet := make(map[int64]struct{}, len(allowedDeptIDs))
		for _, id := range allowedDeptIDs {
			allowedSet[id] = struct{}{}
		}
		if len(depts) > 0 {
			filtered := depts[:0]
			for _, id := range depts {
				if _, ok := allowedSet[id]; ok {
					filtered = append(filtered, id)
				}
			}
			depts = filtered
			if len(depts) == 0 {
				return []User{}, nil
			}
		} else {
			depts = allowedDeptIDs
		}
	}
	query := db.Table(u.TableName())
	if len(depts) > 0 {
		query = query.Where("dept IN (?)", depts)
	}
	if len(chatMembers) > 0 {
		query = query.Where("id IN (?)", chatMembers)
	}
	if len(exclude) > 0 {
		query = query.Where("id NOT IN (?)", exclude)
	}
	query = query.Where("account LIKE ? OR pinyin LIKE ? OR realname LIKE ?", "%"+searchFields+"%", "%"+searchFields+"%", "%"+searchFields+"%")
	query = query.Order("deleted ASC, CASE WHEN locked IS NOT NULL THEN 1 ELSE 0 END ASC, id ASC")
	offset := (PageID - 1) * RecPerPage
	query = query.Offset(int(offset)).Limit(int(RecPerPage))

	var users []User
	query.Find(&users)

	return users, err
}

func (u *User) SearchUserId(db *gorm.DB, searchFields string, deptID int64, chatMembers []int64, PageID, RecPerPage int64, exclude []int64, allowedDeptIDs []int64) ([]int64, error) {
	users, err := u.Search(db, searchFields, deptID, chatMembers, PageID, RecPerPage, exclude, allowedDeptIDs)
	if err != nil {
		return nil, err
	}
	var ids []int64
	for _, user := range users {
		ids = append(ids, user.ID)
	}
	return ids, err
}

// Format 格式化用户数据
func (u *User) Format(users any, db *gorm.DB) any {
	switch v := users.(type) {
	case User:
		return u.formatSingleUser(v, db)
	case []User:
		return u.formatUserList(v, db)
	default:
		return users
	}
}

// formatSingleUser 格式化单个用户
func (u *User) formatSingleUser(user User, db *gorm.DB) User {
	// 设置 status 字段
	if user.Status == "" {
		// 如果 status 为空，则使用 clientStatus 的值，如果 clientStatus 也为空则默认为 "0"
		if user.ClientStatus != "" {
			user.Status = user.ClientStatus
		} else {
			user.Status = "0"
		}
	}

	return user
}

// formatUserList 格式化用户列表
func (u *User) formatUserList(users []User, db *gorm.DB) []User {
	for i := range users {
		users[i] = u.formatSingleUser(users[i], db)
	}
	return users
}

// CreateUser 创建新用户
func (u *User) CreateUser(db *gorm.DB, user *User) error {
	// 检查必填字段
	if user.Account == "" || user.Password == "" {
		return errors.New("account and password are required")
	}

	// 检查账号是否已存在
	var count int64
	if err := db.Model(&User{}).Where("account = ?", user.Account).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return errors.New("account already exists")
	}

	// 加密密码
	user.Password = util.MD5(fmt.Sprintf("%s%s", user.Password, user.Account))

	// 设置默认值
	if user.Status == "" {
		user.Status = "0" // 默认状态为正常
	}
	if user.Deleted == "" {
		user.Deleted = "0" // 默认未删除
	}
	if user.ClientStatus == "" {
		user.ClientStatus = "offline" // 默认离线
	}
	if user.Admin == "" {
		user.Admin = "no" // 默认不是管理员
	}
	if user.Role == "" {
		user.Role = "user" // 默认角色为用户
	}
	if user.Gender == "" {
		user.Gender = "u" // 默认性别为未知
	}
	// if user.Birthday.IsZero() {
	// 	user.Birthday = nil
	// }
	// if user.Last.IsZero() {
	// 	user.Last = time.Time{} // 设置最后登录时间
	// }
	// if user.Ping.IsZero() {
	// 	user.Ping = time.Time{} // 设置最后心跳时间
	// }
	if user.Join == nil || user.Join.Unix() <= 0 {
		now := time.Now() // 设置加入时间
		user.Join = &now
	}
	// if user.Locked.IsZero() {
	// 	user.Locked = time.Time{} // 设置锁定时间为空
	// }

	// 创建用户
	if err := db.Create(user).Error; err != nil {
		return err
	}

	// 更新拼音
	if user.RealName != "" {
		if err := u.updateUserPinyin(db, user.ID, user.RealName); err != nil {
			return err
		}
	}

	return nil
}

// SetOffline 设置用户离线状态
func (u *User) SetOffline(db *gorm.DB, users []int64) error {
	if len(users) == 0 {
		return nil
	}

	result := db.Model(&User{}).Where("id IN ?", users).Update("clientStatus", "offline")
	if result.Error != nil {
		return result.Error
	}

	return nil
}

// GetChangedPassword 获取更改密码但未重新登录的用户列表（通过调用action模型方法，与PHP版本保持一致）
func (u *User) GetChangedPassword(db *gorm.DB) ([]int64, error) {
	var actionObjectIDs []int64
	var action Action

	// 使用action模型的GetListSinceLastPoll方法获取密码更改操作（与PHP版本保持一致）
	passwordChangeActions, err := action.GetListSinceLastPoll(db, "changepassword")
	if err != nil {
		return nil, err
	}

	// 使用action模型的GetListSinceLastPoll方法获取登录操作（与PHP版本保持一致）
	loginHistoryActions, err := action.GetListSinceLastPoll(db, "loginxuanxuan")
	if err != nil {
		return nil, err
	}

	// 创建登录用户ID的映射以便快速查找（与PHP版本逻辑完全一致）
	loginUserMap := make(map[int64]time.Time)
	for _, login := range loginHistoryActions {
		if existingTime, exists := loginUserMap[login.ObjectId]; !exists || login.Date.After(existingTime) {
			loginUserMap[login.ObjectId] = login.Date
		}
	}

	// 检查每个密码更改用户是否需要踢出（与PHP版本逻辑完全一致）
	for _, passwordChange := range passwordChangeActions {
		loginTime, loginExists := loginUserMap[passwordChange.ObjectId]
		if !loginExists {
			// 如果没有登录记录，直接添加到踢出列表
			actionObjectIDs = append(actionObjectIDs, int64(passwordChange.ObjectId))
		} else if loginTime.Before(passwordChange.Date) {
			// 如果登录时间早于密码更改时间，也需要踢出
			actionObjectIDs = append(actionObjectIDs, int64(passwordChange.ObjectId))
		}
	}

	return actionObjectIDs, nil
}

// GetOnlineDeleted 获取已删除但仍在线的用户ID列表
func (u *User) GetOnlineDeleted(db *gorm.DB) ([]int64, error) {
	var userIDs []int64

	err := db.Model(&User{}).
		Select("id").
		Where("deleted = ? AND clientStatus != ?", "1", "offline").
		Pluck("id", &userIDs).Error

	if err != nil {
		return nil, err
	}

	return userIDs, nil
}

// GetOnlineForbidden 获取已禁用但仍在线的用户ID列表
func (u *User) GetOnlineForbidden(db *gorm.DB) ([]int64, error) {
	var userIDs []int64

	now := time.Now().Format(time.DateTime)
	err := db.Model(&User{}).
		Select("id").
		Where("locked >= ? AND clientStatus != ?", now, "offline").
		Pluck("id", &userIDs).Error

	if err != nil {
		return nil, err
	}

	return userIDs, nil
}

// HasChanges 检查在轮询间隔内用户是否有变更
func (u *User) HasChanges(db *gorm.DB, pollingInterval int) ([]int64, error) {
	var action Action
	return action.HasChanges(db, "user", pollingInterval)
}

// ReindexPinyin 重新生成用户拼音索引
func (u *User) ReindexPinyin(db *gorm.DB, userIDs []int64) error {

	// 构建基础查询
	baseQuery := db.Model(&User{}).Select("id, realname")
	if len(userIDs) > 0 {
		baseQuery = baseQuery.Where("id IN (?)", userIDs)
	}

	// 获取总数用于分页
	var totalCount int64
	if err := baseQuery.Count(&totalCount).Error; err != nil {
		return err
	}

	// 分页处理，避免一次性加载所有数据到内存
	const batchSize = 1000 // 每批处理的用户数量
	for offset := int64(0); offset < totalCount; offset += batchSize {
		var users []struct {
			ID       int64  `json:"id"`
			RealName string `json:"realname"`
		}

		// 分页查询
		if err := baseQuery.Offset(int(offset)).Limit(int(batchSize)).Find(&users).Error; err != nil {
			return err
		}

		if len(users) == 0 {
			continue
		}

		// 批量更新拼音，使用 CASE WHEN 语句提高效率
		caseStatements := make([]string, 0, len(users))
		ids := make([]int64, 0, len(users))
		for _, user := range users {
			if user.RealName == "" {
				continue
			}

			pinyin := util.ConvertToPinyin(user.RealName)
			caseStatements = append(caseStatements, fmt.Sprintf("WHEN id = %d THEN '%s'", user.ID, pinyin))
			ids = append(ids, user.ID)
		}

		if len(caseStatements) == 0 {
			continue
		}

		// 使用 CASE WHEN 批量更新
		caseSQL := strings.Join(caseStatements, " ")
		sql := fmt.Sprintf("UPDATE %s SET pinyin = CASE %s ELSE pinyin END WHERE id IN (?)", u.TableName(), caseSQL)

		if err := db.Exec(sql, ids).Error; err != nil {
			return err
		}
	}

	return nil
}

// AddAction 添加用户操作记录
// 参数:
//   - user: 用户ID（int/int32）或用户账户（string）
//   - actionType: 操作类型
//   - result: 操作结果
//   - comment: 评论（可选）
//   - common: 是否为通用操作（可选）
//   - clientIP: 客户端IP
func (u *User) AddAction(db *gorm.DB, user any, actionType string, result string, comment string, common bool, clientIP string) error {
	// 检查日志级别配置
	// 如果logLevel为0且不是common操作，则直接返回
	// 这里暂时简化处理，可以根据实际配置调整
	// logLevel := util.Config.Debug // 从配置中获取debug级别
	// if logLevel == 0 && !common {
	// 	return nil
	// }

	var account string
	var userID int64

	// 根据用户参数类型获取account和userID
	switch v := user.(type) {
	case int:
		userID = int64(v)
		// 根据ID获取账户名
		var foundUser User
		if err := db.Select("account").Where("id = ?", userID).First(&foundUser).Error; err != nil {
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}
			// 如果没找到用户，账户名保持为空
		} else {
			account = foundUser.Account
		}
	case int64:
		userID = int64(v)
		// 根据ID获取账户名
		var foundUser User
		if err := db.Select("account").Where("id = ?", userID).First(&foundUser).Error; err != nil {
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}
			// 如果没找到用户，账户名保持为空
		} else {
			account = foundUser.Account
		}
	case string:
		account = v
		// 根据账户名获取用户ID
		var foundUser User
		if err := db.Select("id").Where("account = ?", account).First(&foundUser).Error; err != nil {
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}
			// 如果没找到用户，userID保持为0
		} else {
			userID = foundUser.ID
		}
	default:
		return errors.New("invalid user parameter type, must be int, int32, or string")
	}

	// 设置actor
	actor := ""
	if account != "" {
		actor = account
	}

	// 使用Action模型的AddUserAction方法创建操作记录
	// AddUserAction方法内部会自动创建extra字段，包含actorId
	var action Action
	_, err := action.AddUserAction(db, actor, "user", userID, actionType, result, comment, clientIP)
	if err != nil {
		return err
	}

	return nil
}

func (u *User) SetDeviceToken(db *gorm.DB, userID int64, deviceToken string, deviceType string) (string, error) {
	if deviceToken == "" {
		deviceType = ""
	}

	updates := map[string]any{
		"deviceToken": deviceToken,
		"deviceType":  deviceType,
	}

	err := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&User{}).
			Where("id = ?", userID).
			Updates(updates).Error; err != nil {
			return err
		}

		if deviceToken != "" {
			// Keep the device token unique across users so one physical device
			// only receives pushes for the currently active account.
			if err := tx.Model(&User{}).
				Where("id <> ? AND deviceToken = ?", userID, deviceToken).
				Updates(map[string]any{
					"deviceToken": "",
					"deviceType":  "",
				}).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return "fail", err
	}

	return "success", nil
}

func (u *User) GetAuthToken(db *gorm.DB, userID int64, deviceType string, deviceID string) (ImUserDevice, error) {

	var uDevice ImUserDevice
	if deviceType != "" {
		userDeviceList, _ := uDevice.GetDeviceByUserId(db, userID)
		// 过滤符合条件的令牌
		var validDevices []ImUserDevice
		for _, ud := range userDeviceList {
			// 条件 1：设备类型和ID都为空（未使用的令牌）
			isUnused := ud.Device == "" && ud.DeviceId == ""
			// 条件 2：设备类型匹配且设备ID匹配（已绑定设备）
			isMatched := ud.Device == deviceType &&
				(deviceID == "" || ud.DeviceId == deviceID)

			if isUnused || isMatched {
				validDevices = append(validDevices, ud)
			}
		}
		if len(validDevices) > 0 {
			// 优先选择已绑定的设备令牌
			for _, ud := range validDevices {
				if ud.Device == deviceType && (deviceID == "" || ud.DeviceId == deviceID) {
					uDevice = ud
					break
				}
			}

			// 如果有绑定设备令牌且未过期
			if uDevice.ID != 0 {
				if uDevice.ValidUntil.After(time.Now()) {
					return uDevice, nil
				}
				// 令牌过期则更新
				token, err := uDevice.RenewAuthToken(db, userID, deviceType, deviceID)
				if err != nil {
					return uDevice, err
				}
				uDevice.Token = token
				return uDevice, nil
			}

			firstUnboundDevice := validDevices[0]
			if firstUnboundDevice.Token == "" || firstUnboundDevice.ValidUntil.Before(time.Now()) {
				token, err := firstUnboundDevice.RenewAuthToken(db, userID, deviceType, deviceID)
				if err != nil {
					return firstUnboundDevice, err
				}
				firstUnboundDevice.Token = token
				return firstUnboundDevice, nil
			}

			if firstUnboundDevice.Device != "" {
				return firstUnboundDevice, nil
			}

			err := uDevice.UpdateDeviceForMap(db, firstUnboundDevice.ID, deviceType, deviceID)
			if err != nil {
				return firstUnboundDevice, err
			}
			firstUnboundDevice.Device = deviceType
			firstUnboundDevice.DeviceId = deviceID
			return firstUnboundDevice, nil

		}
	}

	token, err := uDevice.RenewAuthToken(db, userID, deviceType, deviceID)
	if err != nil {
		return uDevice, err
	}
	uDevice.Token = token
	return uDevice, nil
}

// identifyWithToken 使用令牌验证用户
func (u *User) IdentifyWithToken(db *gorm.DB, account, token, device, clientIP string) (*User, error) {
	tokenAuthWindow := GetTokenAuthWindow(db)

	now := int(math.Round(float64(time.Now().Unix()) / float64(tokenAuthWindow)))
	token = token[:32]

	// 构建基础查询
	query := db.Model(&User{}).
		Select("u.*, ud.device, ud.token as deviceToken, ud.validUntil").
		Table((&User{}).TableName()+" u").
		Joins("LEFT JOIN "+(&ImUserDevice{}).TableName()+" ud ON u.id = ud.user").
		Where("u.account = ? AND u.deleted = ?", account, "0").
		Where("(ud.validUntil > ? OR ud.validUntil IS NULL)", time.Now().Format(time.DateTime))

	if device != "" {
		query = query.Where("ud.device = ?", device)
	}

	// 执行查询
	var results []struct {
		User
		Device      string     `gorm:"column:device"`
		DeviceToken string     `gorm:"column:deviceToken"`
		ValidUntil  *time.Time `gorm:"column:validUntil"`
	}

	if err := query.Find(&results).Error; err != nil {
		return nil, err
	}

	if len(results) == 0 {
		return nil, ErrInvalidToken
	}

	// 处理查询结果
	for _, record := range results {
		user := record.User
		user.Token = record.DeviceToken

		// 处理token续期逻辑
		if record.ValidUntil != nil {
			tokenLifetime := GetTokenLifeTime(db)
			renewalTime := time.Now().Add(time.Duration(tokenLifetime/3*24) * time.Hour)
			if renewalTime.After(*record.ValidUntil) {
				user.TokenNeedRenew = true
			}
		}

		// 生成所有可能的token组合
		authTokens := []string{
			fmt.Sprintf("%x", md5.Sum([]byte(user.Account+user.Token+fmt.Sprint(now)))),
			fmt.Sprintf("%x", md5.Sum([]byte(user.Account+user.Token+fmt.Sprint(now-1)))),
			fmt.Sprintf("%x", md5.Sum([]byte(user.Account+user.Token+fmt.Sprint(now+1)))),
		}

		// 验证token
		for _, authToken := range authTokens {
			if token == authToken {
				// 检查账户锁定状态
				if user.Locked != nil && user.Locked.After(time.Now()) {
					return nil, ErrLocked
				}

				return &user, nil
			}
		}
	}

	return nil, ErrInvalidToken
}

// checkIPInCIDRs 检查IP是否在CIDR范围内
func (u *User) checkIPInCIDRs(ip string, cidrs []string) bool {
	if len(cidrs) == 0 {
		return true
	}

	// 解析IP地址
	ipAddr := net.ParseIP(ip)
	if ipAddr == nil {
		return false
	}

	// 检查每个CIDR范围
	for _, cidr := range cidrs {
		_, ipNet, err := net.ParseCIDR(cidr)
		if err != nil {
			continue
		}

		if ipNet.Contains(ipAddr) {
			return true
		}
	}

	return false
}
