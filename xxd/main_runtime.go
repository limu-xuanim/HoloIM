package main

import (
	"xxd/hyperttp/backend"
	"xxd/hyperttp/server"
	"xxd/util"
)

func initRuntime() error {
	util.InitMysql()

	if err := util.InitCache(); err != nil {
		util.Log("error", "Init cache failed: %v", err)
	}

	server.InitServer()

	if err := backend.InitAdmin(); err != nil {
		util.Log("error", util.GetLang("Init admin server failed: %v"), err)
		util.Println(util.GetLang("Press Ctrl+C to exit this program"))
		return err
	}

	return nil
}
