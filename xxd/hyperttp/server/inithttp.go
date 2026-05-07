package server

import (
	"xxd/service/im"
	sysService "xxd/service/sys"
	"xxd/util"
)

// 启动 http server
func InitHttp() {
	crt, key, err := util.CreateSignedCertKey()
	if err != nil {
		util.Log("error", util.GetLang("[InitHttp]", " ", "SSL certificate creation failed", "!"))
		return
	}

	err = sysService.NewSysService().StartXXD()
	if err != nil {
		util.Exit(util.GetLang("[InitHttp]", " E_BAD_RESPONSE: ", "Unable to perform handshake with backend server", ".\n", "Visit", " https://www.xuanim.com/book/xuanxuanserver/238.html#E_BAD_RESPONSE ", "for troubleshooting hints", "."))
	}

	serveMux, err = util.ServeMuxCreate(util.CommonServeMuxID)
	if err != nil {
		util.Exit(util.GetLang("[InitHttp]", "Error creating ServeMux", ": "), err)
	}
	util.WaitGroupDone(util.CommonServeMuxWaitGroupID)

	imService = im.NewImService()
	serveMux.HandleFunc(xuanDownload, fileDownload)
	serveMux.HandleFunc(xuanUpload, fileUpload)
	serveMux.HandleFunc(xuanServerInfo, serverInfo)
	serveMux.HandleFunc(xuanInvalidate, handleInvalidateCache)
	serveMux.HandleFunc(xuanKickAll, handleKickAll)
	serveMux.Handle(StaticRoot, getStaticHandler())

	addr := util.Config.Ip + ":" + util.Config.CommonPort

	var https = "Off"
	if util.Config.IsHttps == "1" {
		https = "On"
	}

	util.Log("info", util.GetLang("Https enabled: %s"), https)
	util.Log("info", util.GetLang("Listen IP: %s"), util.Config.Ip)
	util.Log("info", util.GetLang("Chat port: %s"), util.Config.ChatPort)
	util.Log("info", util.GetLang("Common port: %s"), util.Config.CommonPort)
	if util.Config.AdvertisePort != "" {
		util.Log("info", util.GetLang("Advertised chat port: %s"), util.Config.AdvertisePort)
	}
	util.Log("info", "")

	chatServerURL, adminServerURL := getServerAddresses()
	if chatServerURL != "" || adminServerURL != "" {
		util.Println(util.ColorizeBold(util.Colorize("═══════════════════════════════════════════════════════════", util.ColorCyan)))
		util.Println(util.ColorizeBold(util.Colorize(util.GetLang("Server Address Information", ""), util.ColorCyan)))
		util.Println(util.ColorizeBold(util.Colorize("═══════════════════════════════════════════════════════════", util.ColorCyan)))

		if chatServerURL != "" {
			label := util.GetLang("Chat  Server Address ", ": ")
			util.Println(util.ColorizeBold(util.Colorize(label, util.ColorLightGreen)) + util.Colorize(chatServerURL, util.ColorLightCyan))
		}
		if adminServerURL != "" {
			label := util.GetLang("Admin Server Address ", ": ")
			util.Println(util.ColorizeBold(util.Colorize(label, util.ColorLightGreen)) + util.Colorize(adminServerURL, util.ColorLightCyan))
		}

		util.Println(util.ColorizeBold(util.Colorize("═══════════════════════════════════════════════════════════", util.ColorCyan)))
		util.Log("info", "")
	}

	if util.Config.IsHttps != "1" {
		if err := util.ServeMuxServe(util.CommonServeMuxID, addr); err != nil {
			util.Log("error", util.GetLang("[InitHttp]", " HTTP ", "server listen error", ": %s"), err)
			util.Exit(util.GetLang("[InitHttp]", " E_PORT_UNAVAILABLE: HTTP ", "server is unable to listen on port", " "), util.Config.CommonPort, util.GetLang("\n", "Visit", " https://www.xuanim.com/book/xuanxuanserver/238.html#E_PORT_UNAVAILABLE ", "for troubleshooting hints", "."))
		}
	} else {
		if err := util.ServeMuxServeTLS(util.CommonServeMuxID, addr, crt, key); err != nil {
			util.Log("error", util.GetLang("[InitHttp]", " HTTPS ", "server listen error", ": %s"), err)
			util.Exit(util.GetLang("[InitHttp]", " E_PORT_UNAVAILABLE: HTTPS ", "server is unable to listen on port", " "), util.Config.CommonPort, util.GetLang("\n", "Visit", " https://www.xuanim.com/book/xuanxuanserver/238.html#E_PORT_UNAVAILABLE for troubleshooting hints", "."))
		}
	}

	util.Println("----------------------------------------")
	util.Println(util.GetLang("Visit", " http://xuan.im ", "to get more help", ", ", "or join official QQ group", " 367833155. \n"))
	util.Println(util.GetLang("Press Ctrl+C to stop the server", ". \n"))
}
