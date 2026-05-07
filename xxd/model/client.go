package model

import (
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"
	"xxd/util"

	"gorm.io/gorm"
)

type XxbImClient struct {
	ID          int64      `json:"id" gorm:"column:id"`
	Version     string     `json:"version" gorm:"column:version"`
	Desc        string     `json:"desc" gorm:"column:desc"`
	ChangeLog   string     `json:"changeLog" gorm:"column:changeLog"`
	Strategy    string     `json:"strategy" gorm:"column:strategy"`
	Downloads   string     `json:"downloads" gorm:"column:downloads"`
	CreatedDate *time.Time `json:"createdDate" gorm:"column:createdDate"`
	CreatedBy   string     `json:"createdBy" gorm:"column:createdBy"`
	EditedDate  *time.Time `json:"editedDate" gorm:"column:editedDate"`
	EditedBy    string     `json:"editedBy" gorm:"column:editedBy"`
	Status      string     `json:"status" gorm:"column:status"`
}

// UpgradeResponse 升级响应结构体
type UpgradeResponse struct {
	Downloads map[string]string `json:"downloads"`
	Strategy  string            `json:"strategy"`
	Version   string            `json:"version"`
	Readme    string            `json:"readme"`
}

// 客户端版本缓存
var (
	clientUpgradeCache     map[string]*UpgradeResponse
	clientUpgradeCacheLock sync.RWMutex
	clientUpgradeCacheTime time.Time
	clientUpgradeCacheTTL  = 5 * time.Minute // 缓存有效期 5 分钟
)

func init() {
	clientUpgradeCache = make(map[string]*UpgradeResponse)
}

func (XxbImClient) TableName() string {
	return util.Config.Mysql.TablePrefix + "im_client"
}

// GetUpgrade 获取客户端升级信息
func GetClientUpgrade(db *gorm.DB, version string) (*UpgradeResponse, error) {
	// 检查缓存（读锁）
	clientUpgradeCacheLock.RLock()
	if time.Since(clientUpgradeCacheTime) < clientUpgradeCacheTTL {
		if cached, ok := clientUpgradeCache[version]; ok {
			clientUpgradeCacheLock.RUnlock()
			return cached, nil
		}
	}
	clientUpgradeCacheLock.RUnlock()

	// 缓存失效或不存在，获取写锁并查询数据库
	clientUpgradeCacheLock.Lock()
	defer clientUpgradeCacheLock.Unlock()

	// 双重检查：其他线程可能已经更新了缓存
	if time.Since(clientUpgradeCacheTime) < clientUpgradeCacheTTL {
		if cached, ok := clientUpgradeCache[version]; ok {
			return cached, nil
		}
	}

	var client XxbImClient
	// 构建子查询 SQL
	subQuerySQL := fmt.Sprintf("SELECT MAX(id) as max_id FROM %s WHERE status = 'released' GROUP BY strategy", client.TableName())

	// 主查询：SELECT t1.downloads, t1.strategy, t1.version, t1.changeLog
	// FROM xxb_im_client t1
	// INNER JOIN (子查询) t2 ON t1.id = t2.max_id
	var latestUpgrades []XxbImClient
	err := db.Table(client.TableName() + " t1").
		Select("t1.downloads, t1.strategy, t1.version, t1.changeLog").
		Joins(fmt.Sprintf("INNER JOIN (%s) t2 ON t1.id = t2.max_id", subQuerySQL)).
		Find(&latestUpgrades).Error
	if err != nil {
		return nil, err
	}

	if len(latestUpgrades) == 0 {
		return nil, nil
	}

	// 处理数据：changeLog -> readme，downloads 字段重命名
	type DownloadsMap map[string]string
	upgradeResponses := make([]UpgradeResponse, 0, len(latestUpgrades))

	for _, upgrade := range latestUpgrades {
		response := UpgradeResponse{
			Strategy: upgrade.Strategy,
			Version:  upgrade.Version,
			Readme:   upgrade.ChangeLog,
		}

		// 解析 downloads JSON
		var downloads DownloadsMap
		if err := json.Unmarshal([]byte(upgrade.Downloads), &downloads); err == nil {
			// 重命名字段
			if val, ok := downloads["linux32zip"]; ok {
				downloads["linux32"] = val
				delete(downloads, "linux32zip")
			}
			if val, ok := downloads["linux64zip"]; ok {
				downloads["linux64"] = val
				delete(downloads, "linux64zip")
			}
			if val, ok := downloads["macOSzip"]; ok {
				downloads["mac64"] = val
				delete(downloads, "macOSzip")
			}
			if val, ok := downloads["win32zip"]; ok {
				downloads["win32"] = val
				delete(downloads, "win32zip")
			}
			if val, ok := downloads["win64zip"]; ok {
				downloads["win64"] = val
				delete(downloads, "win64zip")
			}
			response.Downloads = downloads
		} else {
			response.Downloads = make(DownloadsMap)
		}

		upgradeResponses = append(upgradeResponses, response)
	}

	// 分别获取 optional 和 forced 策略的升级
	var optionalUpgrade *UpgradeResponse
	var forcedUpgrade *UpgradeResponse

	for i := range upgradeResponses {
		if upgradeResponses[i].Strategy == "optional" {
			optionalUpgrade = &upgradeResponses[i]
		}
		if upgradeResponses[i].Strategy == "force" {
			forcedUpgrade = &upgradeResponses[i]
		}
	}

	// 根据版本比较决定返回哪个升级
	// forced upgrade 使用 formatVersion 格式化后的版本进行比较
	var result *UpgradeResponse
	if forcedUpgrade != nil && util.VersionCompare(util.FormatVersion(version), util.FormatVersion(forcedUpgrade.Version), "<") {
		// 如果当前版本小于 3.0.0-alpha.1，需要特殊处理版本号
		if util.VersionCompare(util.FormatVersion(version), "3.0.0-alpha.1", "<") {
			semver := util.FormatVersion(forcedUpgrade.Version)
			if strings.Contains(semver, "-") {
				versions := strings.Split(semver, "-")
				forcedUpgrade.Version = versions[0]
			} else {
				forcedUpgrade.Version = semver
			}
		}
		result = forcedUpgrade
	} else if optionalUpgrade != nil && util.VersionCompare(version, optionalUpgrade.Version, "<") {
		result = optionalUpgrade
	}

	// 缓存结果（包括 nil 结果）
	clientUpgradeCache[version] = result
	clientUpgradeCacheTime = time.Now()

	return result, nil
}
