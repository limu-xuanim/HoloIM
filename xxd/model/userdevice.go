package model

import (
	"time"
	"xxd/util"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ImUserDevice struct {
	ID         int64      `json:"id" gorm:"column:id"`
	User       int64      `json:"user" gorm:"column:user"`
	Device     string     `json:"device" gorm:"column:device"`
	DeviceId   string     `json:"deviceID" gorm:"column:deviceID"`
	Token      string     `json:"token" gorm:"column:token"`
	ValidUntil time.Time  `json:"validUntil" gorm:"column:validUntil"`
	LastLogin  *time.Time `json:"lastLogin" gorm:"column:lastLogin"`
	LastLogout *time.Time `json:"lastLogout" gorm:"column:lastLogout"`
	Online     int8       `json:"online" gorm:"column:online"`
	Version    string     `json:"version" gorm:"column:version"`
}

type ImUserDeviceCreate struct {
	ID         int64     `json:"id" gorm:"column:id"`
	User       int64     `json:"user" gorm:"column:user"`
	Device     string    `json:"device" gorm:"column:device"`
	DeviceId   string    `json:"deviceID" gorm:"column:deviceID"`
	Token      string    `json:"token" gorm:"column:token"`
	ValidUntil time.Time `json:"validUntil" gorm:"column:validUntil"`
	Online     int8      `json:"online" gorm:"column:online"`
	Version    string    `json:"version" gorm:"column:version"`
}

// TableName 表名称
func (*ImUserDevice) TableName() string {
	return util.Config.Mysql.TablePrefix + "im_userdevice"
}

func (*ImUserDeviceCreate) TableName() string {
	return util.Config.Mysql.TablePrefix + "im_userdevice"
}

// 根据user查询
func (*ImUserDevice) GetDeviceByUserId(db *gorm.DB, userId int64) ([]ImUserDevice, error) {
	var devices []ImUserDevice
	result := db.Where("user = ?", userId).Find(&devices)
	return devices, result.Error
}

func (*ImUserDevice) UpdateDevice(db *gorm.DB, user int64, device, typ, version string) error {
	var online int8
	if typ == "login" {
		online = 1
	} else {
		online = 0
	}

	updateData := map[string]any{
		"online": online,
	}
	if typ == "login" {
		updateData["lastLogin"] = time.Now()
		updateData["version"] = version
	} else {
		updateData["lastLogout"] = time.Now()
	}

	// 使用标准 SQL
	// 先查询是否存在记录
	var existing ImUserDevice
	err := db.Where("user = ? AND device = ?", user, device).First(&existing).Error
	if err != nil && err != gorm.ErrRecordNotFound {
		return err
	}

	if err == gorm.ErrRecordNotFound {
		// 不存在，创建新记录
		newDevice := ImUserDevice{
			User:       user,
			Device:     device,
			Online:     online,
			Version:    version,
			ValidUntil: time.Now().AddDate(0, 0, int(GetTokenLifeTime(db))),
		}
		return db.Create(&newDevice).Error
	}
	
	// 存在，更新记录
	return db.Model(&existing).Updates(updateData).Error

}

// 更新设备信息
func (d *ImUserDevice) UpdateDeviceForMap(db *gorm.DB, id int64, deviceType string, deviceID string) error {
	err := db.Model(&ImUserDevice{}).Where("id = ?", id).Updates(map[string]any{
		"device":   deviceType,
		"deviceID": deviceID,
	}).Error
	if err != nil {
		return err
	}
	return nil
}

func (d *ImUserDevice) GenerateAuthToken() (string, error) {
	return util.GenerateRandomHex(32)
}

func (d *ImUserDevice) RenewAuthToken(db *gorm.DB, userId int64, deviceType, deviceID string) (string, error) {
	token, err := d.GenerateAuthToken()
	if err != nil {
		return "", err
	}
	tokenLifetime := GetTokenLifeTime(db)
	userDevice := &ImUserDeviceCreate{
		User:       userId,
		Device:     deviceType,
		DeviceId:   deviceID,
		Token:      token,
		ValidUntil: time.Now().AddDate(0, 0, int(tokenLifetime)),
	}
	// 使用 UPSERT 操作（ON DUPLICATE KEY UPDATE）
	result := db.Clauses(clause.OnConflict{
		Columns: []clause.Column{
			{Name: "user"},
			{Name: "device"},
			{Name: "deviceID"},
		},
		DoUpdates: clause.Assignments(map[string]any{
			"token":      userDevice.Token,
			"validUntil": userDevice.ValidUntil,
		}),
	}).Create(userDevice)

	if result.Error != nil {
		return "", result.Error
	}
	return token, nil
}

func (d *ImUserDevice) IsDeviceVersionGe(db *gorm.DB, userId int64, compareVersion string, deviceType string) bool {
	var device ImUserDevice
	if err := db.Model(&ImUserDevice{}).
		Where("user = ? and device = ?", userId, deviceType).
		First(&device).
		Error; err != nil {
		return false
	}

	if device.Version == "" {
		return false
	}

	// 使用 util.VersionCompare 进行版本比较，检查设备版本是否大于等于比较版本
	result := util.VersionCompare(device.Version, compareVersion, ">=")
	return result
}
