/**
 * The database file of util current module of xxd.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     util
 * @link        https://www.xuanim.com
 */
package util

import (
	"database/sql"
	"strconv"
	"strings"
	"sync"

	_ "github.com/mattn/go-sqlite3"
)

var mutex sync.Mutex

func InitDB() *sql.DB {
	DB, err := sql.Open("sqlite3", "file::memory:?cache=shared")
	if err != nil {
		Log("error", GetLang("SQLite ", "connect error"), err)
	}
	// prevent deletion of memory database by keeping at least one idle connection.
	DB.SetConnMaxLifetime(0)
	DB.SetConnMaxIdleTime(0)
	DB.SetMaxIdleConns(1)
	_, err = DB.Exec("CREATE TABLE offline (server STRING (20), userID INT (9))")
	_, err = DB.Exec("CREATE TABLE sendfail (server VARCHAR (40), userID INT (9), gid VARCHAR (40))")
	if err != nil {
		Log("error", GetLang("SQLite ", "init error"), err)
	}
	return DB
}

func DBInsertOffline(server string, userID int64) {
	mutex.Lock()
	defer mutex.Unlock()

	stmt, err := DBConn.Prepare("INSERT INTO offline(server, userID) values(?,?)")
	if err != nil {
		Log("error", GetLang("SQLite ", "insert offline error"), err)
	}
	stmt.Exec(server, userID)
}

func DBUserLogin(server string, userID int64) {
	mutex.Lock()
	defer mutex.Unlock()

	_, err := DBConn.Exec("DELETE FROM offline WHERE `server` = '" + server + "' AND `userID` = '" + Int642String(userID) + "'")
	if err != nil {
		Log("error", GetLang("SQLite ", "delete offline users error"), err)
	}
}

func DBInsertSendfail(server string, userID int64, gid string) {
	mutex.Lock()
	defer mutex.Unlock()

	stmt, err := DBConn.Prepare("INSERT INTO sendfail(server, userID, gid) values(?,?,?)")
	if err != nil {
		Log("error", GetLang("SQLite ", "insert sendfail error"), err)
	}
	stmt.Exec(server, userID, gid)
}

func DBSelectOffline(server string) ([]int, error) {
	rows, err := DBConn.Query("SELECT `userID` FROM offline WHERE `server` = '" + server + "'")

	if err != nil {
		Log("error", GetLang("SQLite ", "query offline error"), err)
		return []int{}, err
	}

	defer rows.Close()

	var dict []int

	for rows.Next() {
		var userID int
		err := rows.Scan(&userID)
		if err != nil {
			Log("error", GetLang("SQLite ", "scan offline userID error"), err)
			return []int{}, err
		}
		dict = append(dict, userID)
	}
	return dict, nil
}

func DBSelectSendfail(server string) (map[int64][]string, error) {
	rows, err := DBConn.Query("SELECT `userID`,`gid` FROM sendfail WHERE `server` = '" + server + "'")

	if err != nil {
		Log("error", GetLang("SQLite ", "query sendfail error"), err)
		return nil, err
	}

	defer rows.Close()

	dict := make(map[int64][]string)

	for rows.Next() {
		var userID int64
		var gid string
		err := rows.Scan(&userID, &gid)
		if err != nil {
			Log("error", GetLang("SQLite ", "scan sendFail userID or gid error"), err)
			return nil, err
		}
		dict[userID] = append(dict[userID], gid)
	}
	return dict, nil
}

func DBDeleteOffline(server string, userID []int) {
	if len(userID) == 0 {
		return
	}

	var IDs []string
	for _, id := range userID {
		IDs = append(IDs, strconv.Itoa(id))
	}

	mutex.Lock()
	defer mutex.Unlock()

	_, err := DBConn.Exec("DELETE FROM offline WHERE `server` = '" + server + "' AND `userID` IN (" + strings.Join(IDs, ",") + ")")
	if err != nil {
		Log("error", GetLang("SQLite ", "DELETE offline users error"), err)
	}
}

func DBDeleteSendfail(server string, gid map[int64][]string) {
	mutex.Lock()
	defer mutex.Unlock()

	for userID, gids := range gid {
		if len(gids) > 0 {
			in := "'" + strings.Join(gids, "','") + "'"
			_, err := DBConn.Exec("DELETE FROM sendfail WHERE `server` = '" + server + "' AND `userID` = " + Int642String(userID) + " AND `gid` IN (" + in + ")")
			if err != nil {
				Log("error", GetLang("SQLite ", "DELETE sendfail messages error"), err)
			}
		}
	}
}
