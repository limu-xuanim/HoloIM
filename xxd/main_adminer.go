package main

import (
	"os"
	"xxd/hyperttp/backend"
	"xxd/util"
)

func runAdminerPasswdMode() bool {
	if util.AdminerPasswdUser == "" || util.AdminerPasswdPassword == "" {
		return false
	}

	if err := backend.GenerateAdminerPasswdFile(util.AdminerPasswdUser, util.Config.AdminerPasswdFile, util.AdminerPasswdPassword); err != nil {
		util.Printf("adminer-passwd error: %v\n", err)
		os.Exit(1)
	}

	os.Exit(0)
	return true
}
