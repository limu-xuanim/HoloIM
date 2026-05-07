#!/bin/sh
rsrc -manifest updater.manifest -o updater.syso
CGO_ENABLED=0 GO111MODULE=off GOOS=darwin GOARCH=amd64 go build -o ./bin/updater.mac main.go
CGO_ENABLED=0 GO111MODULE=off GOOS=darwin GOARCH=arm64 go build -o ./bin/updater.macarm64 main.go
CGO_ENABLED=0 GO111MODULE=off GOOS=linux GOARCH=amd64 go build -o ./bin/updater.linux64 main.go
CGO_ENABLED=0 GO111MODULE=off GOOS=linux GOARCH=386 go build -o ./bin/updater.linux32 main.go
CGO_ENABLED=0 GO111MODULE=off GOOS=linux GOARCH=arm64 go build -o ./bin/updater.linuxarm64 main.go
CGO_ENABLED=0 GO111MODULE=off GOOS=windows GOARCH=amd64 go build -o ./bin/updater.win64.exe main.go
CGO_ENABLED=0 GO111MODULE=off GOOS=windows GOARCH=386 go build -o ./bin/updater.win32.exe main.go

echo "build end "
