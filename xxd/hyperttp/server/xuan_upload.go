package server

import (
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"os"
	"path"
	"strconv"
	"strings"
	"xxd/model"
	"xxd/util"

	"github.com/minio/sio"
)

func fileUpload(w http.ResponseWriter, r *http.Request) {
	w.Header().Add("Access-Control-Allow-Origin", "*")
	w.Header().Add("Access-Control-Allow-Methods", "POST,GET,OPTIONS,DELETE")
	w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, X-FILENAME, ServerName")
	w.Header().Add("Access-Control-Allow-Credentials", "true")

	if r.Method != "POST" {
		util.LogDetail(util.GetLang("[fileUpload]", " ", "Not supported request"))
		fmt.Fprintln(w, util.GetLang("Not supported request"))
		return
	}

	serverName := r.Header.Get("ServerName")
	if serverName == "" {
		serverName = util.Config.DefaultServer
	}

	authorization := r.Header.Get("Authorization")
	if authorization != string(util.Token) {
		w.WriteHeader(http.StatusUnauthorized)
		fmt.Fprintln(w, authorization+"!="+string(util.Token))
		return
	}

	r.ParseMultipartForm(32 << 20)

	file, handler, err := r.FormFile("file")
	if err != nil {
		util.Log("error", util.GetLang("[fileUpload]", " ", "Form file error", ": %s"), err)
		fmt.Fprintln(w, util.GetLang("Form file error"))
		return
	}
	defer func() {
		file.Close()
		r.MultipartForm.RemoveAll()
	}()

	nowTime := util.GetUnixTime()
	savePath := util.Config.UploadPath + serverName + "/" + util.GetYmdPath(nowTime)
	if err := util.Mkdir(savePath); err != nil {
		util.Log("error", util.GetLang("[fileUpload]", " ", "File upload mkdir error", ": %s"), err)
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprintln(w, util.GetLang("File upload mkdir error", "."))
		return
	}

	var fileSize int64 = 0
	if statInterface, ok := file.(Stat); ok {
		fileInfo, _ := statInterface.Stat()
		fileSize = fileInfo.Size()
	}

	if sizeInterface, ok := file.(Size); ok {
		fileSize = sizeInterface.Size()
	}

	if fileSize <= 0 {
		util.Log("error", util.GetLang("[fileUpload]", " ", "Get file size error"))
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprintln(w, util.GetLang("Get file size error"))
		return
	}

	uploadFileSize := model.GetUploadFileSize(util.MysqlDB)
	if fileSize > uploadFileSize {
		util.Log("error", util.GetLang("[fileUpload]", " ", "File is too large"))
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintln(w, util.GetLang("File is too large"))
		return
	}

	fileName := util.FileBaseName(handler.Filename)
	nowTimeStr := util.Int642String(nowTime)
	gid := r.Form["gid"][0]
	userID, err := strconv.ParseInt(r.Form["userID"][0], 10, 64)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintln(w, util.GetLang("Invalid user ID"))
		return
	}

	util.LogDetail(util.GetLang("[fileUpload]", " ", "file info:") + fmt.Sprintf("fileName: %s, savePath: %s, fileSize: %d, nowTime: %d, gid: %s, userID: %d", fileName, savePath, fileSize, nowTime, gid, userID))

	fileID, err := imService.FileUpload(fileName, savePath, fileSize, nowTime, gid, (userID))
	if err != nil {
		util.Log("error", util.GetLang("[fileUpload]", " ", "Upload file info error", ": %s"), err)
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprintln(w, util.GetLang("Upload file info error"))
		return
	}
	if fileID == 0 {
		fileID = int64(rand.Intn(999999)) + 1
	}

	fileIDStr := util.Int642String(fileID)
	util.LogDetail(util.GetLang("[fileUpload]", " ", "upload file fileID is") + fileIDStr)
	saveFile := savePath + util.GetMD5(fileName+fileIDStr+nowTimeStr)
	f, err := os.OpenFile(saveFile, os.O_WRONLY|os.O_CREATE, 0644)
	if err != nil {
		util.Log("error", util.GetLang("[fileUpload]", " ", "Open file error", ": %s"), err)
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprintln(w, util.GetLang("Open file error"))
		return
	}
	defer f.Close()

	if fileKey, ok := util.ServersideConfig[serverName]["fileKey"]; ok {
		encryptedFile, err := sio.EncryptReader(file, sio.Config{Key: fileKey.([]byte)})
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		io.Copy(f, encryptedFile)
	} else {
		io.Copy(f, file)
	}
	hasThumb := "false"
	thumbnailWidth := 0
	thumbnailHeight := 0
	fileSuffix := path.Ext(fileName)
	lowerSuffix := strings.ToLower(fileSuffix)
	if util.Config.Thumbnail > 0 && (lowerSuffix == ".jpg" || lowerSuffix == ".jpeg" || lowerSuffix == ".png") {
		thumbSaveFile := savePath + util.GetMD5("thumb_"+fileName+fileIDStr+nowTimeStr)
		thumbnailWidth, thumbnailHeight, err = util.CompressImageResource(saveFile, thumbSaveFile)
		if err == nil {
			hasThumb = "true"
		}
	}

	x2cJSON := `{"result":"success","data":{"time":` + nowTimeStr + `,"id":` + fileIDStr + `,"hasThumb":` + hasThumb + `,"name":"` + fileName + `","thumbnailWidth":` + strconv.Itoa(thumbnailWidth) + `,"thumbnailHeight":` + strconv.Itoa(thumbnailHeight) + `}}`
	fmt.Fprintln(w, x2cJSON)
}
