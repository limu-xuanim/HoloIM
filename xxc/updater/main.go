package main

import (
	"flag"
	"time"
	"runtime"
	"os"
	"fmt"
	"os/exec"
	"./util"
)

func main() {
	src := flag.String("src", "", "Source directory path.")
	app := flag.String("app", "", "Destination directory path")
	run := flag.String("run", "", "Open the application?")
	flag.Parse()
	fmt.Println("Please wait...")

	if *src != "" && *app != "" {
		time.Sleep(time.Second * 5)
		util.Log().Println("OS：", runtime.GOOS)
		if runtime.GOOS == "darwin" {
			err := os.RemoveAll(*app)
			if err != nil{
				util.Log().Println("Remove old package err:", err)
			}
			util.Log().Println("Removed old package", *app)
		}

		util.Log().Println("Begin to copy files")
		if err := util.Copy(*src, *app); err != nil {
			fmt.Println(err)
			util.Log().Println("err:", err)
            os.Exit(0)
		}
		util.Log().Println("Files copied.")
	}

	if *run != "" {
		util.Log().Println("Ready to run", *run)
		Open(*run)
		util.Log().Println("Runned", *run)
	}
	fmt.Println("Finished.")
	util.Log().Println("Finished.")
}

func Open(uri string) error {
	switch runtime.GOOS {
	case "windows":
		cmd := exec.Command("rundll32.exe", "url.dll,FileProtocolHandler", uri)
		return cmd.Start()
	case "darwin":
		cmd := exec.Command("open", uri)
		return cmd.Start()
	default:
		cmd := exec.Command("base", "-c", "xdg-open" + uri)
		return cmd.Start()
	}
}
