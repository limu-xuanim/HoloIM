package model

import (
	"path/filepath"
	"strconv"
	"strings"
	"time"
	"xxd/util"

	"gorm.io/gorm"
)

const (
	config_file_dangers = "php,php3,php4,phtml,php5,jsp,py,rb,asp,aspx,ashx,asa,cer,cdx,aspl,shtm,shtml,html,htm"
	config_file_allowed = "txt,doc,docx,dot,wps,wri,pdf,ppt,pptx,xls,xlsx,ett,xlt,xlsm,csv,jpg,jpeg,png,psd,gif,ico,bmp,swf,avi,rmvb,rm,mp3,mp4,3gp,flv,mov,movie,rar,zip,bz,bz2,tar,gz"
)

// EditorEnum 定义 Editor 字段的枚举类型
type EditorEnum string

const (
	EditorYes EditorEnum = "1"
	EditorNo  EditorEnum = "0"
)

// PrimaryEnum 定义 Primary 字段的枚举类型
type PrimaryEnum string

const (
	PrimaryYes PrimaryEnum = "1"
	PrimaryNo  PrimaryEnum = "0"
)

// PublicEnum 定义 Public 字段的枚举类型
type PublicEnum string

const (
	PublicYes PublicEnum = "1"
	PublicNo  PublicEnum = "0"
)

// XxbFile 定义对应 SQL 表的结构体
type XxbFile struct {
	ID          int64       `gorm:"column:id;primary_key;autoIncrement" json:"id"`
	Pathname    string      `gorm:"column:pathname;type:char(100);not null" json:"pathname"`
	Title       string      `gorm:"column:title;type:varchar(255);not null" json:"title"`
	Extension   string      `gorm:"column:extension;type:char(30);not null" json:"extension"`
	Size        int64       `gorm:"column:size;type:bigint unsigned;not null;default:0" json:"size"`
	ObjectType  string      `gorm:"column:objectType;type:char(30);not null" json:"objectType"`
	ObjectID    int64       `gorm:"column:objectID;type:mediumint unsigned;not null" json:"objectID"`
	CreatedBy   string      `gorm:"column:createdBy;type:char(30);not null;default:''" json:"createdBy"`
	CreatedDate time.Time   `gorm:"column:createdDate;type:datetime;not null" json:"createdDate"`
	Editor      EditorEnum  `gorm:"column:editor;type:enum('1','0');not null;default:'0'" json:"editor"`
	Primary     PrimaryEnum `gorm:"column:primary;type:enum('1','0');default:'0'" json:"primary"`
	Public      PublicEnum  `gorm:"column:public;type:enum('1','0');not null;default:'1'" json:"public"`
	Downloads   int64       `gorm:"column:downloads;type:mediumint unsigned;not null;default:0" json:"downloads"`
	Extra       string      `gorm:"column:extra;type:varchar(255);not null" json:"extra"`
}

func (f *XxbFile) TableName() string {
	return util.Config.Mysql.SysPrefix + "file"
}

// 根据 ID 查询文件信息
func (f *XxbFile) GetFileByID(db *gorm.DB, id int64) (*XxbFile, error) {
	var file XxbFile
	err := db.Where("id = ?", id).First(&file).Error
	if err != nil {
		return nil, err
	}
	return &file, nil
}

func (f *XxbFile) UploadFile(db *gorm.DB, filename string, path string, size int64, unix int64, uid int64, chatID int64) (int64, error) {
	userModel := User{}
	user, err := userModel.GetAccountByID(db, uid)
	if err != nil {
		return 0, err
	}

	extension := GetExtension(filename)
	file := &XxbFile{
		Pathname:    path,
		Title:       strings.TrimSuffix(filename, "."+extension),
		Extension:   extension,
		Size:        size,
		ObjectType:  "chat",
		ObjectID:    chatID,
		CreatedBy:   user.Account,
		CreatedDate: time.Unix(unix, 0),
		Editor:      EditorNo,
		Primary:     PrimaryNo,
		Public:      PublicYes,
		Downloads:   0,
		Extra:       "",
	}

	if err := db.Create(file).Error; err != nil {
		return 0, err
	}

	fileID := file.ID
	path = util.MD5(filename + strconv.FormatInt(fileID, 10) + strconv.FormatInt(unix, 10))
	if err := db.Model(file).Update("pathname", path).Where("id = ?", fileID).Error; err != nil {
		return fileID, err
	}

	return fileID, nil
}

func GetExtension(filename string) string {
	extWithDot := filepath.Ext(filename)       // 如 ".JPG "
	ext := strings.TrimPrefix(extWithDot, ".") // 去除点 → "JPG "
	ext = strings.TrimSpace(ext)               // 去除空格 → "JPG"
	ext = strings.ToLower(ext)                 // 转为小写 → "jpg"（对应 PHP 的 strtolower + trim）

	if ext == "" {
		return "txt"
	}

	dangersPattern := "," + config_file_dangers + "," // 如 ",php,exe,"
	targetExt := "," + ext + ","                      // 如 ",jpg,"
	if strings.Contains(dangersPattern, targetExt) {
		return "txt"
	}

	allowedPattern := "," + config_file_allowed + "," // 如 ",jpg,png,"
	if !strings.Contains(allowedPattern, targetExt) {
		return "txt"
	}

	return ext
}
