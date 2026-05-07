package user

import (
	"encoding/json"
	"xxd/model"
	"xxd/util"
)

// SyncDepts 检查部门变更并返回部门树数据
func (u *UserService) SyncDepts(serverName, language string) (string, error) {
	// 检查部门变更
	deptChanges, err := u.hasDeptChanges(60) // 默认60秒轮询间隔
	if err != nil {
		util.Log("error", "Failed to check dept changes: %s", err.Error())
		return "", err
	}

	// 如果没有变更，返回空数据
	if len(deptChanges) == 0 {
		return "", nil
	}

	// 获取部门树数据
	deptsData, err := u.getSysGetDeptsData()
	if err != nil {
		util.Log("error", "Failed to get depts data: %s", err.Error())
		return "", err
	}

	return deptsData, nil
}

// hasDeptChanges 检查部门变更
func (u *UserService) hasDeptChanges(pollingInterval int) ([]int64, error) {
	var action model.Action
	return action.HasChanges(u.db, "deptCategory", pollingInterval)
}

// getSysGetDeptsData 获取部门树和角色数据
func (u *UserService) getSysGetDeptsData() (string, error) {
	var category model.XxbCategory
	var categories []model.XxbCategory

	err := u.db.Model(&category).
		Select("*").
		Where("type = ?", "dept").
		Where("deleted = ?", "0").
		Order("`order`, id").
		Find(&categories).Error

	if err != nil {
		return "", err
	}

	// 转换为PHP格式的部门数据
	depts := make(map[int64]map[string]any)
	for _, dept := range categories {
		depts[dept.ID] = map[string]any{
			"name":   dept.Name,
			"order":  dept.Order,
			"parent": dept.Parent,
		}
	}

	roles, err := model.GetAllRoles()
	if err != nil {
		return "", err
	}

	rolesData := map[string]string{}
	for _, role := range roles {
		rolesData[role.Key] = role.Value
	}

	// 构建sysGetDepts响应格式
	sysGetDeptsData := map[string]any{
		"depts": depts,
		"roles": rolesData,
	}

	jsonData, err := json.Marshal(sysGetDeptsData)
	if err != nil {
		return "", err
	}

	// 转换为字符串格式以便在syncDepts中使用
	return string(jsonData), nil
}
