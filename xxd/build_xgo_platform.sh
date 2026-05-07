#!/bin/bash
if [[ -f sign.sh ]]; then
    source sign.sh
else
    signcode() {
        echo "Not signing this code."
    }
fi

ised() {
    if [[ -x "$(command -v gsed)" ]]; then
        echo "gsed $@"
        gsed "$@"
    else
        echo "sed $@"
        sed "$@"
    fi
}

# use specified xgo version
myxgo() {
    xgo -image techknowlogick/xgo:go-1.19.2 "$@"
}

build_darwin() {
    echo "building for darwin"
    folder=$version.mac
    if [[ ! -d $folder ]]; then
        mkdir "$folder"
    fi
    myxgo -out "$folder/xxd" -ldflags '-s -w' --targets=darwin/amd64 .
    mv "$folder/xxd"* "$folder/xxd"
    cp -Ra config "$folder"
    tar zcf "release/$folder.tar.gz" "$folder"
    zip -rq "release/$folder.zip" "$folder"
    rm -rf "$folder"
}

build_linux64() {
    echo "building for linux x64"
    folder=$version.linux.x64
    if [[ ! -d $folder ]]; then
        mkdir "$folder"
    fi
    myxgo -out "$folder/xxd" -tags 'netgo' -ldflags '-s -w -extldflags "-static"' --targets=linux/amd64 .
    mv "$folder/xxd"* "$folder/xxd"
    cp -Ra config "$folder"
    tar zcf "release/$folder.tar.gz" "$folder"
    zip -rq "release/$folder.zip" "$folder"
    rm -rf "$folder"
}

build_linux32() {
    echo "building for linux ia32"
    folder=$version.linux.ia32
    if [[ ! -d $folder ]]; then
        mkdir "$folder"
    fi
    myxgo -out "$folder/xxd" -tags 'netgo' -ldflags '-s -w -extldflags "-static"' --targets=linux/386 .
    mv "$folder/xxd"* "$folder/xxd"
    cp -Ra config "$folder"
    tar zcf "release/$folder.tar.gz" "$folder"
    zip -rq "release/$folder.zip" "$folder"
    rm -rf "$folder"
}

build_win64() {
    echo "building for win64"
    folder=$version.win64
    if [[ ! -d $folder ]]; then
        mkdir "$folder"
    fi
    myxgo -out "$folder/xxd" -ldflags '-s -w' --targets=windows/amd64 .
    mv "$folder/xxd"* "$folder/xxd.exe"
    signcode "$folder/xxd.exe" "$folder/xxd.exe.signed"
    if [[ -f "$folder/xxd.exe.signed" ]]; then
        mv "$folder/xxd.exe.signed" "$folder/xxd.exe"
    fi
    cp -Ra config "$folder"
    tar zcf "release/$folder.tar.gz" "$folder"
    zip -rq "release/$folder.zip" "$folder"
    rm -rf "$folder"
}

build_win32() {
    echo "building for win32"
    folder=$version.win32
    if [[ ! -d $folder ]]; then
        mkdir "$folder"
    fi
    myxgo -out "$folder/xxd" -ldflags '-s -w' --targets=windows/386 .
    mv "$folder/xxd"* "$folder/xxd.exe"
    signcode "$folder/xxd.exe" "$folder/xxd.exe.signed"
    if [[ -f "$folder/xxd.exe.signed" ]]; then
        mv "$folder/xxd.exe.signed" "$folder/xxd.exe"
    fi
    cp -Ra config "$folder"
    tar zcf "release/$folder.tar.gz" "$folder"
    zip -rq "release/$folder.zip" "$folder"
    rm -rf "$folder"
}

build_arm() {
    echo "building for linux/arm"
    folder=$version.arm64
    if [[ ! -d $folder ]]; then
        mkdir "$folder"
    fi
    myxgo -out "$folder/xxd" -ldflags '-s -w' --targets=linux/arm64 .
    mv "$folder/xxd"* "$folder/xxd"
    cp -Ra config "$folder"
    tar zcf "release/$folder.tar.gz" "$folder"
    zip -rq "release/$folder.zip" "$folder"
    rm -rf "$folder"
}

build_mips() {
    echo "building for linux/mips"
    folder=$version.mips64le
    if [[ ! -d $folder ]]; then
        mkdir "$folder"
    fi
    myxgo -out "$folder/xxd" -ldflags '-s -w' --targets=linux/mips64le .
    mv "$folder/xxd"* "$folder/xxd"
    cp -Ra config "$folder"
    tar zcf "release/$folder.tar.gz" "$folder"
    zip -rq "release/$folder.zip" "$folder"
    rm -rf "$folder"
}

build_all() {
    echo "building for all supported platforms"
    build_darwin
    build_arm
    build_mips
    build_linux64
    build_linux32
    build_win64
    build_win32
}

build_linux64_pprof() {
    echo "building for linux x64 with pprof"
    ised -i '/"net\/http"/a \\t"net\/http\/pprof"' hyperttp/server/server.go
    ised -i '/util.WaitGroupDone(util.CommonServeMuxWaitGroupID)/a \\tserveMux.HandleFunc("/debug/pprof/", pprof.Index)\n\tserveMux.HandleFunc("/debug/pprof/cmdline", pprof.Cmdline)\n\tserveMux.HandleFunc("/debug/pprof/profile", pprof.Profile)\n\tserveMux.HandleFunc("/debug/pprof/symbol", pprof.Symbol)\n\tserveMux.HandleFunc("/debug/pprof/trace", pprof.Trace)' hyperttp/server/server.go
    folder=$version.linux.x64.pprof
    if [[ ! -d $folder ]]; then
        mkdir "$folder"
    fi
    xgo -out "$folder/xxd" -tags 'netgo' -ldflags '-extldflags "-static"' --targets=linux/amd64 .
    mv "$folder/xxd"* "$folder/xxd"
    cp -Ra config "$folder"
    tar zcf "release/$folder.tar.gz" "$folder"
    zip -rq "release/$folder.zip" "$folder"
    rm -rf "$folder"
}

prep() {
    find . -name '.DS_Store' -delete
    if [[ -z $1 ]]; then
        printf " > enter version [9.9.9]: "
        read ver
        if [[ -z $ver ]]; then
            ver="9.9.9"
        fi
    else
        ver=$1
    fi
    version=xxd.$ver
    XXDBuildVersion=v$ver
    TIME=$(date "+%Y-%m-%d %H:%M:%S")
    COMMIT=$(git rev-parse --short=7 HEAD)
    ised -i "s/XXDBuildVersion/${XXDBuildVersion}/g" util/sysrun.go
    ised -i "s/XXDBuildInfo/built at ${TIME} on commit ${COMMIT}/g" util/sysrun.go
    go install src.techknowlogick.com/xgo
    echo "build version: "$ver
    if [[ ! -d release ]]; then
        mkdir release
    fi
}

disable_pprof() {
    ised -i '/pprof/d' hyperttp/server/server.go
}

cleanup() {
    ised -i "s/${XXDBuildVersion}/XXDBuildVersion/g" util/sysrun.go
    ised -i "s/built at ${TIME} on commit ${COMMIT}/XXDBuildInfo/g" util/sysrun.go
    disable_pprof
    echo "build end"
}

main() {
    prep $1
    case "$2" in
        win | win64)
            build_win64
            ;;
        linux | linux64)
            build_linux64
            ;;
        pprof)
            build_linux64_pprof
            ;;
        mac | darwin)
            build_darwin
            ;;
        arm)
            build_arm
            ;;
        mips)
            build_mips
            ;;
        other)
            build_arm
            build_mips
            ;;
        *)
            build_all
            ;;
    esac
}

main $*
trap cleanup SIGINT
trap cleanup EXIT
