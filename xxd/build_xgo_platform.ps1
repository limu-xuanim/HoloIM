param (
    $ver,
    $platform
)

<# TRY TO IMPORT SIGNCODE #>
$signcodeExists = Test-Path -Path './signcode.psm1'
if ($signcodeExists) {
    Import-Module './signcode.psm1'
} else {
    function signcode {
        param (
            $inputFile,
            $outputFile
        )
        Write-Host 'Not signing this code.'
    }
}

<# BUILD SCRIPTS #>
function build_win64 {
    Write-Host 'building for win64'
    $folder = "$Global:version.win64"
    if (-Not (Test-Path -Path $folder)) {
        mkdir $folder
    }
    xgo -image techknowlogick/xgo:go-1.19.2 -out "$folder/xxd" -ldflags '-s -w' --targets=windows/amd64 .
    Move-Item -Path "$folder/xxd*" -Destination "$folder/xxd.exe"
    signcode "$folder/xxd.exe" "$folder/xxd.exe.signed"
    if (Test-Path -Path "$folder/xxd.exe.signed") {
        Move-Item -Path "$folder/xxd.exe.signed" -Destination "$folder/xxd.exe"
    }
    Copy-Item -Path './config' -Destination "$folder/config" -Recurse
    tar -zcf "release/$folder.tar.gz" $folder
    Compress-Archive -Path $folder -DestinationPath "release/$folder.zip" -CompressionLevel Optimal -Force
    Remove-Item -Path $folder -Recurse -Force
}
function build_win32 {
    Write-Host 'building for win32'
    $folder = "$Global:version.win32"
    if (-Not (Test-Path -Path $folder)) {
        mkdir $folder
    }
    xgo -image techknowlogick/xgo:go-1.19.2 -out "$folder/xxd" -ldflags '-s -w' --targets=windows/386 .
    Move-Item -Path "$folder/xxd*" -Destination "$folder/xxd.exe"
    signcode "$folder/xxd.exe" "$folder/xxd.exe.signed"
    if (Test-Path -Path "$folder/xxd.exe.signed") {
        Move-Item -Path "$folder/xxd.exe.signed" -Destination "$folder/xxd.exe"
    }
    Copy-Item -Path './config' -Destination "$folder/config" -Recurse
    tar -zcf "release/$folder.tar.gz" $folder
    Compress-Archive -Path $folder -DestinationPath "release/$folder.zip" -CompressionLevel Optimal -Force
    Remove-Item -Path $folder -Recurse -Force
}
function build_linux64 {
    Write-Host 'building for linux x64'
    $folder = "$Global:version.linux.x64"
    if (-Not (Test-Path -Path $folder)) {
        mkdir $folder
    }
    xgo -image techknowlogick/xgo:go-1.19.2 -out "$folder/xxd" -tags 'netgo' -ldflags '-s -w -extldflags "-static"'  --targets=linux/amd64 .
    Move-Item -Path "$folder/xxd*" -Destination "$folder/xxd"
    Copy-Item -Path './config' -Destination "$folder/config" -Recurse
    tar -zcf "release/$folder.tar.gz" $folder
    Compress-Archive -Path $folder -DestinationPath "release/$folder.zip" -CompressionLevel Optimal -Force
    Remove-Item -Path $folder -Recurse -Force
}
function build_linux32 {
    Write-Host 'building for linux ia32'
    $folder = "$Global:version.linux.ia32"
    if (-Not (Test-Path -Path $folder)) {
        mkdir $folder
    }
    xgo -image techknowlogick/xgo:go-1.19.2 -out "$folder/xxd" -tags 'netgo' -ldflags '-s -w -extldflags "-static"'  --targets=linux/386 .
    Move-Item -Path "$folder/xxd*" -Destination "$folder/xxd"
    Copy-Item -Path './config' -Destination "$folder/config" -Recurse
    tar -zcf "release/$folder.tar.gz" $folder
    Compress-Archive -Path $folder -DestinationPath "release/$folder.zip" -CompressionLevel Optimal -Force
    Remove-Item -Path $folder -Recurse -Force
}
function build_darwin {
    Write-Host 'building for darwin'
    $folder = "$Global:version.mac"
    if (-Not (Test-Path -Path $folder)) {
        mkdir $folder
    }
    xgo -image techknowlogick/xgo:go-1.19.2 -out "$folder/xxd" -ldflags '-s -w' --targets=darwin/amd64 .
    Move-Item -Path "$folder/xxd*" -Destination "$folder/xxd"
    Copy-Item -Path './config' -Destination "$folder/config" -Recurse
    tar -zcf "release/$folder.tar.gz" $folder
    Compress-Archive -Path $folder -DestinationPath "release/$folder.zip" -CompressionLevel Optimal -Force
    Remove-Item -Path $folder -Recurse -Force
}
function build_arm64 {
    Write-Host 'building for linux arm64'
    $folder = "$Global:version.linux.arm64"
    if (-Not (Test-Path -Path $folder)) {
        mkdir $folder
    }
    xgo -image techknowlogick/xgo:go-1.19.2 -out "$folder/xxd" -ldflags '-s -w' --targets=linux/arm64 .
    Move-Item -Path "$folder/xxd*" -Destination "$folder/xxd"
    Copy-Item -Path './config' -Destination "$folder/config" -Recurse
    tar -zcf "release/$folder.tar.gz" $folder
    Compress-Archive -Path $folder -DestinationPath "release/$folder.zip" -CompressionLevel Optimal -Force
    Remove-Item -Path $folder -Recurse -Force
}
function build_mips {
    Write-Host 'building for linux mips64le'
    $folder = "$Global:version.linux.mips64le"
    if (-Not (Test-Path -Path $folder)) {
        mkdir $folder
    }
    xgo -image techknowlogick/xgo:go-1.19.2 -out "$folder/xxd" -ldflags '-s -w' --targets=linux/mips64le .
    Move-Item -Path "$folder/xxd*" -Destination "$folder/xxd"
    Copy-Item -Path './config' -Destination "$folder/config" -Recurse
    tar -zcf "release/$folder.tar.gz" $folder
    Compress-Archive -Path $folder -DestinationPath "release/$folder.zip" -CompressionLevel Optimal -Force
    Remove-Item -Path $folder -Recurse -Force
}
function build_win64_pprof {
    Write-Host 'building for win64 with pprof'
    (Get-Content -Path './hyperttp/server/server.go' -raw) -replace '"net/http"', "`"net/http`"`n`t`"net/http/pprof`"" | Set-Content -Path './hyperttp/server/server.go' -NoNewline
    (Get-Content -Path './hyperttp/server/server.go' -raw) -replace 'util.WaitGroupDone(util.CommonServeMuxWaitGroupID)', "util.WaitGroupDone(util.CommonServeMuxWaitGroupID)`n`tserveMux.HandleFunc(`"/debug/pprof/`", pprof.Index)`n`tserveMux.HandleFunc(`"/debug/pprof/cmdline`", pprof.Cmdline)`n`tserveMux.HandleFunc(`"/debug/pprof/profile`", pprof.Profile)`n`tserveMux.HandleFunc(`"/debug/pprof/symbol`", pprof.Symbol)`n`tserveMux.HandleFunc(`"/debug/pprof/trace`", pprof.Trace) //" | Set-Content -Path './hyperttp/server/server.go' -NoNewline
    $folder = "$Global:version.win64.pprof"
    if (-Not (Test-Path -Path $folder)) {
        mkdir $folder
    }
    xgo -image techknowlogick/xgo:go-1.19.2 -out "$folder/xxd" --targets=windows/amd64 .
    Move-Item -Path "$folder/xxd*" -Destination "$folder/xxd.exe"
    signcode "$folder/xxd.exe" "$folder/xxd.exe.signed"
    if (Test-Path -Path "$folder/xxd.exe.signed") {
        Move-Item -Path "$folder/xxd.exe.signed" -Destination "$folder/xxd.exe"
    }
    Copy-Item -Path './config' -Destination "$folder/config" -Recurse
    tar -zcf "release/$folder.tar.gz" $folder
    Compress-Archive -Path $folder -DestinationPath "release/$folder.zip" -CompressionLevel Optimal -Force
    Remove-Item -Path $folder -Recurse -Force
}
function build_all {
    Write-Host 'building for all supported platforms'
    build_win64
    build_win32
    build_linux64
    build_linux32
    build_darwin
    build_arm64
}

<# PREPS AND CLEANUPS #>
function prep {
    if ([String]::IsNullOrEmpty($ver)) {
        $ver = Read-Host -Prompt '> enter version [9.9.9]'
    }
    $Global:version = "xxd.$ver"
    $Global:XXDBuildVersion = "v$ver"
    $Global:TIME = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    (Get-Content -Path './util/sysrun.go' -raw) -replace 'XXDBuildVersion',$Global:XXDBuildVersion | Set-Content -Path './util/sysrun.go' -NoNewline
    (Get-Content -Path './util/sysrun.go' -raw) -replace 'XXDBuildInfo',"built at $Global:TIME" | Set-Content -Path './util/sysrun.go' -NoNewline
    go get 'src.techknowlogick.com/xgo'
    Write-Host "Build version: $version"
    if (-Not (Test-Path -Path './release/')) {
        mkdir release
    }
}
function disable_pprof {
    $pprofRemoval = Get-Content('./hyperttp/server/server.go') | Select-String -pattern 'pprof' -NotMatch
    Set-Content -Path './hyperttp/server/server.go' -Value $pprofRemoval
}
function cleanup {
    (Get-Content -Path './util/sysrun.go' -raw) -replace $Global:XXDBuildVersion,'XXDBuildVersion' | Set-Content -Path './util/sysrun.go' -NoNewline
    (Get-Content -Path './util/sysrun.go' -raw) -replace "Built at $Global:TIME",'XXDBuildInfo' | Set-Content -Path './util/sysrun.go' -NoNewline
    disable_pprof
    Write-Host 'build end'
}

<# MAIN #>
function main {
    prep
    switch ($platform) {
        {($_ -eq 'win') -or ($_ -eq'win64')} {
            Write-Host '......building for windows......'
            build_win64
            break
        }
        {($_ -eq 'linux') -or ($_ -eq'linux64')} {
            Write-Host '......building for linux......'
            build_linux64
            break
        }
        'pprof' {
            build_win64_pprof
            break
        }
        {($_ -eq 'mac') -or ($_ -eq'darwin')} {
            build_darwin
            break
        }
        'arm' {
            build_arm
            break
        }
        'mips' {
            build_mips
            break
        }
        'other' {
            build_arm
            build_mips
            break
        }
        default {
            build_all
        }
    }
    cleanup
}
main
