package message

import (
	"xxd/model"
	"xxd/util"

	"gorm.io/gorm"
)

type MessageService struct {
	db *gorm.DB
}

func NewMessageService() *MessageService {
	return &MessageService{
		db: util.MysqlDB,
	}
}

var user model.User
var imChat model.XxbImChat
var imChatUser model.XxbImChatUser
var imMessage model.XxbImMessage
var imMessageStatus model.XxbImMessageStatus
