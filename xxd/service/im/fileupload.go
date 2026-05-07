package im

import (
	"strings"
	"xxd/model"

	"gorm.io/gorm"
)

func (i *ImService) FileUpload(filename string, path string, size int64, time int64, gid string, uid int64) (int64, error) {
	chatModel := &model.XxbImChat{}
	chat, err := chatModel.GetChatByGidWithExtra(i.db, gid)

	if err == gorm.ErrRecordNotFound {
		one2oneMembers := strings.Split(gid, "&")
		if len(one2oneMembers) != 2 {
			return 0, err
		}

		chat = &model.XxbImChat{
			Id: 0,
		}
	} else if err != nil {
		return 0, err
	}

	fileModel := &model.XxbFile{}
	return fileModel.UploadFile(i.db, filename, path, size, time, uid, chat.Id)
}
