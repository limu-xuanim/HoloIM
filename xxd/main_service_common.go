package main

import (
	"xxd/util"

	"github.com/kardianos/service"
)

type program struct{}

func (p *program) Start(s service.Service) error {
	if err := util.RunInstallationIfNeededWithQuiet(util.QuietInstallFlag); err != nil {
		return err
	}

	go p.run()
	return nil
}

func (p *program) run() {
	if err := initRuntime(); err != nil {
		return
	}

	startBackgroundServices()
	waitForExit()
}

func (p *program) Stop(s service.Service) error {
	return nil
}

func waitForExit() {
	for util.Run && util.GetNumGoroutine() > 2 {
		util.Sleep(3)
	}
}

func runService() {
	svcFlag := util.ServiceFlag
	svcConfig := &service.Config{
		Name:        "xxd",
		DisplayName: "xxd",
		Description: "Xuan Daemon Service.",
	}

	prg := &program{}
	s, err := service.New(prg, svcConfig)
	if err != nil {
		err = util.Errorf("%s", err)
		util.Printf("Service Create Error: %s", err)
	}

	if len(svcFlag) != 0 {
		err := service.Control(s, svcFlag)
		if err != nil {
			util.Printf("Valid service actions: %q\n", service.ControlAction)
			err = util.Errorf("%s", err)
			util.Printf("Service Control Error: %s", err)
		}
		return
	}

	err = s.Run()
	if err != nil {
		err = util.Errorf("%s", err)
		util.Printf("Service Run Error: %s", err)
	}
}
