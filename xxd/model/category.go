package model

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"
	"xxd/util"

	"gorm.io/gorm"
)

// XxbCategory undefined
type XxbCategory struct {
	ID         int64     `json:"id" gorm:"column:id"`
	Name       string    `json:"name" gorm:"column:name"`
	Alias      string    `json:"alias" gorm:"column:alias"`
	Desc       string    `json:"desc" gorm:"column:desc"`
	Keywords   string    `json:"keywords" gorm:"column:keywords"`
	Root       int64     `json:"root" gorm:"column:root"`
	Parent     int64     `json:"parent" gorm:"column:parent"`
	Path       string    `json:"path" gorm:"column:path"`
	Grade      int8      `json:"grade" gorm:"column:grade"`
	Order      int16     `json:"order" gorm:"column:order"`
	Type       string    `json:"type" gorm:"column:type"`
	Readonly   string    `json:"readonly" gorm:"column:readonly"`
	Moderators string    `json:"moderators" gorm:"column:moderators"`
	Threads    int16     `json:"threads" gorm:"column:threads"`
	Posts      int16     `json:"posts" gorm:"column:posts"`
	PostedBy   string    `json:"postedBy" gorm:"column:postedBy"`
	PostedDate time.Time `json:"postedDate" gorm:"column:postedDate"`
	PostId     int64     `json:"postID" gorm:"column:postID"`
	ReplyId    int64     `json:"replyID" gorm:"column:replyID"`
	Users      string    `json:"users" gorm:"column:users"`
	Rights     string    `json:"rights" gorm:"column:rights"`
	Refund     string    `json:"refund" gorm:"column:refund"`
	Major      string    `json:"major" gorm:"column:major"`
	Deleted    string    `json:"deleted" gorm:"column:deleted"`
}

// TableName 表名称
func (*XxbCategory) TableName() string {
	return util.Config.Mysql.SysPrefix + "category"
}

// getFamily 获取指定分类的所有子分类 ID 列表
func (c *XxbCategory) getFamily(db *gorm.DB, categoryID int64, categoryType string, root int64) ([]int64, error) {
	if categoryID == 0 && categoryType == "" {
		return []int64{}, nil
	}

	category, err := c.getByID(db, categoryID, "dept")
	if err != nil {
		return nil, err
	}

	var categoryIDs []int64
	if category != nil {
		if err := db.Table(c.TableName()).Select("id").Where("deleted = ?", "0").Where("path LIKE ?", category.Path+"%").Scan(&categoryIDs).Error; err != nil {
			return nil, err
		}
	} else {
		query := db.Table(c.TableName()).Select("id").Where("deleted = ?", "0").Where("type = ?", categoryType)
		if root != 0 {
			query = query.Where("root = ?", root)
		}
		if err := query.Scan(&categoryIDs).Error; err != nil {
			return nil, err
		}
	}

	return categoryIDs, nil
}

// getByID 根据 ID 获取分类信息
func (c *XxbCategory) getByID(db *gorm.DB, categoryID int64, categoryType string) (*XxbCategory, error) {
	var category XxbCategory
	if err := db.Table(c.TableName()).Select("*").Where("id = ?", categoryID).Where("deleted = ?", "0").First(&category).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
		query := db.Table(c.TableName()).Select("*").Where("alias = ?", categoryID)
		if categoryType != "" {
			query = query.Where("type = ?", categoryType)
		}
		if err := query.First(&category).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, nil
			}
			return nil, err
		}
	}

	if category.Type == "forum" {
		moderators := strings.Split(strings.Trim(category.Moderators, ","), ",")
		var user User
		speakers, err := user.getRealNamePairs(db, moderators)
		if err != nil {
			return nil, err
		}
		newModerators := make(map[string]string)
		for _, moderator := range moderators {
			if speaker, ok := speakers[moderator]; ok {
				newModerators[moderator] = speaker
			} else {
				newModerators[moderator] = moderator
			}
		}
		// 这里可以考虑将 newModerators 转换为合适的存储方式
	}
	category = c.replaceImgURL(&category, "desc")

	return &category, nil
}

// 替换图片 URL
func (c *XxbCategory) replaceImgURL(data *XxbCategory, fields string) XxbCategory {
	fieldList := strings.Split(strings.ReplaceAll(fields, " ", ""), ",")
	for _, field := range fieldList {
		if field == "" || data.Desc == "" {
			continue
		}
		// 这里需要实现 helper::createLink 的逻辑，暂时用占位符代替
		createLink := func(fileID int, ext string) string {
			return fmt.Sprintf("placeholder_link/fileID=%d/%s", fileID, ext)
		}
		data.Desc = strings.ReplaceAll(data.Desc, ` src="{([0-9]+)(\.(\w+))?}" `, fmt.Sprintf(` src="%s" `, createLink))
	}
	return *data
}

type SimpleCategory struct {
	ID      int64  `json:"id" gorm:"column:id"`
	Name    string `json:"name" gorm:"column:name"`
	Order   int64  `json:"order" gorm:"column:order"`
	Parent  int64  `json:"parent" gorm:"column:parent"`
	Path    string `json:"path" gorm:"column:path"`
	Manager string `json:"moderators" gorm:"column:moderators"`
}

// GetListByType 获取指定类型的分类列表
func GetListByType(categoryType string) (map[string]*SimpleCategory, error) {
	db := util.MysqlDB
	var categoryList []SimpleCategory

	result := make(map[string]*SimpleCategory)

	err := db.Model(&XxbCategory{}).
		Select("id, name, `order`, parent, path, moderators").
		Where("type = ?", categoryType).
		Where("deleted = ?", "0").
		Order("`order`, id").
		Find(&categoryList).Error

	if err != nil {
		return nil, err
	}

	for i := range categoryList {
		strID := strconv.Itoa(int(categoryList[i].ID))
		result[strID] = &categoryList[i]
	}

	return result, nil
}
