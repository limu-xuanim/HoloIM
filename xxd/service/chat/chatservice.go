package chat

import (
	"xxd/model"
	"xxd/util"

	"gorm.io/gorm"
)

type ChatService struct {
	db *gorm.DB
}

func NewChatService() *ChatService {
	return &ChatService{
		db: util.MysqlDB,
	}
}

var user model.User
var xxbAction model.Action
var imChat model.XxbImChat
var xxbFile model.XxbFile
var imChatUser model.XxbImChatUser
var imMessage model.XxbImMessage
var xxbChatUser model.XxbImChatUser
