package service

import (
	"xxd/service/chat"
	"xxd/service/message"
	"xxd/service/sys"
	"xxd/service/user"
)

func buildMethodHandlers() map[string]methodHandler {
	userService := user.NewUserService()
	chatService := chat.NewChatService()
	messageService := message.NewMessageService()
	sysService := sys.NewSysService()

	return map[string]methodHandler{
		"usergetlist":        userService.GetList,
		"usergetlistbydept":  userService.GetListByDept,
		"usersearch":         userService.Search,
		"userupdate":         userService.Update,
		"usersyncsettings":   userService.SyncSettings,
		"usergetauthtoken":   userService.GetAuthToken,
		"userrenewauthtoken": userService.RenewAuthToken,
		"usersetdevicetoken": userService.SetDeviceToken,
		/* ------------------------------Chat----------------------------------*/
		"chatgetpubliclist":             chatService.GetPublicList,
		"chatgetlist":                   chatService.GetList,
		"chatgetmembers":                chatService.GetMembers,
		"chatgetmessageinfo":            chatService.GetMessageInfo,
		"chatcreate":                    chatService.Create,
		"chatgetmemberdetails":          chatService.GetMemberDetails,
		"chatrename":                    chatService.Rename,
		"chatjoin":                      chatService.Join,
		"chatleave":                     chatService.Leave,
		"chatdismiss":                   chatService.Dismiss,
		"chatsearch":                    chatService.Search,
		"chatstar":                      chatService.Star,
		"chatmute":                      chatService.Mute,
		"chatfreeze":                    chatService.Freeze,
		"chatinvite":                    chatService.Invite,
		"chatkick":                      chatService.Kick,
		"chatpinmessages":               chatService.PinMessages,
		"chatunpinmessages":             chatService.UnpinMessages,
		"chatsetlastreadmessagebyindex": chatService.SetLastReadMessageByIndex,
		"chatgetbygid":                  chatService.GetByGid,
		"chatgetlastmessage":            chatService.GetLastMessage,
		/* ------------------------------Message----------------------------------*/
		"messageretract":          messageService.Retract,
		"messagesend":             messageService.Send,
		"messagesyncsinceoffline": messageService.SyncSinceOffline,
		"messagesyncmissed":       messageService.SyncMissed,
		"messagegetlistbyindexes": messageService.GetListByIndexes,
		"messagegetlist":          messageService.GetList,
		"messagesync":             messageService.Sync,
		"getnotification":         messageService.GetNotification,
		/* ------------------------------Sys--------------------------------------*/
		"sysgetdepts": sysService.GetDepts,
	}
}
