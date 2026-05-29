# 检测操作系统
UNAME_S := $(shell uname -s)

# 版本号：优先使用命令行参数，如果未提供则从 VERSION 文件读取
# 使用方式：make build VERSION=1.2.3 或 make build（使用默认版本）
VERSION ?= $(shell head -n 1 ../xxb/VERSION)

# 默认构建标签（针对 go build -tags）
# 未传：nowatcher；已传且不含 nowatcher：自动前缀 nowatcher
BUILD_TAGS ?=
comma := ,
empty :=
space := $(empty) $(empty)
_xxd_bt_in := $(strip $(BUILD_TAGS))
_xxd_bt_words := $(subst $(comma),$(space),$(_xxd_bt_in))
_xxd_bt_has_nowatcher := $(filter nowatcher,$(_xxd_bt_words))
ifeq ($(_xxd_bt_in),)
override BUILD_TAGS := nowatcher
else
ifneq ($(_xxd_bt_has_nowatcher),)
override BUILD_TAGS := $(_xxd_bt_in)
else
override BUILD_TAGS := nowatcher$(comma)$(_xxd_bt_in)
endif
endif

# go build -x：DEBUG=1（或 true/yes/on）时打印完整编译命令；默认关闭
DEBUG ?=
GO_BUILD_X := $(if $(filter 1 true yes on,$(DEBUG)),-x,)

# 架构与发布目录后缀
ARCH := $(shell uname -m)
TARGET_ARCH ?= $(ARCH)
TARGET_ARCH_CANONICAL = $(if $(filter x86_64 amd64,$(TARGET_ARCH)),amd64,$(if $(filter aarch64 arm64,$(TARGET_ARCH)),arm64,$(if $(filter sw_64 sw64,$(TARGET_ARCH)),sw64,$(TARGET_ARCH))))
RELEASE_SUFFIX = $(if $(filter amd64,$(TARGET_ARCH_CANONICAL)),.linux.x64,$(if $(filter arm64,$(TARGET_ARCH_CANONICAL)),.arm64,$(if $(filter sw64,$(TARGET_ARCH_CANONICAL)),.linux.sw64,.linux.$(TARGET_ARCH_CANONICAL))))
RELEASE_DIR = ./release/xxd.$(VERSION)$(RELEASE_SUFFIX)
WIN_RELEASE_DIR := ./release/xxd.$(VERSION).win.x64
WIN_DOCKER_IMAGE ?= xxd-mingw-w64:latest
LINUX_AMD64_DOCKER_IMAGE ?= xxd-linux-amd64:latest
LINUX_ARM64_DOCKER_IMAGE ?= xxd-linux-arm64:latest
LINUX_SW64_DOCKER_IMAGE ?= xxd-linux-sw64:latest
CROSS_CC_arm64 ?= aarch64-linux-gnu-gcc
CROSS_CXX_arm64 ?= aarch64-linux-gnu-g++
SW64_GOARCH ?= sw64
SW64_PHP_DIR ?= linux_sw64
SW64_PHP_INI ?= ../../xxd/php/$(SW64_PHP_DIR)/php.ini
LINUX_RELEASE_PHP_INI ?= $(if $(filter sw64,$(TARGET_ARCH_CANONICAL)),$(SW64_PHP_INI),./php/php.ini)
SW64_LD_LOADER ?= ld-linux.so.2
SW64_SYSROOT_LIB_DIRS ?= usr/sw_64-sunway-linux-gnu/lib usr/lib_for_gcc/lib usr/lib_for_gcc usr/lib lib usr/lib64 lib64
CROSS_CC_sw64 ?= /opt/swgcc830_cross_tools/usr/bin/sw_64-sunway-linux-gnu-gcc
CROSS_CXX_sw64 ?= /opt/swgcc830_cross_tools/usr/bin/sw_64-sunway-linux-gnu-g++

DOCKER_HOST_UID ?= $(shell id -u)
DOCKER_HOST_GID ?= $(shell id -g)
DOCKER_RUN_USER ?= $(DOCKER_HOST_UID):$(DOCKER_HOST_GID)

# 容器内模块缓存与编译缓存（挂到工作区才能跨次构建复用；仅设 GOPATH 时默认 GOMODCACHE=GOPATH/pkg/mod，显式写出避免与 HOME/go/pkg/mod 混淆）
DOCKER_GOPATH := /work/xxd/.docker-gopath
DOCKER_GOMODCACHE := $(DOCKER_GOPATH)/pkg/mod
DOCKER_GOCACHE := /work/xxd/.cache/go-build

# Windows 环境配置
ifneq (,$(findstring MINGW,$(UNAME_S))$(findstring MSYS,$(UNAME_S))$(findstring CYGWIN,$(UNAME_S)))
	MAKEFILE_DIR = $(shell cygpath -m "$$PWD")
    # 在 MSYS2/MinGW/Cygwin 中，使用 cygpath 将 Unix 路径转换为 Windows 路径
    PHP_PATH = $(shell cygpath -m '/usr/local/include/php')
    LIB_PATH = $(shell cygpath -m '/usr/local/lib')
	HOME_PATH = $(shell cygpath -m "$$HOME")
	PTHREAD_PATH = $(shell cygpath -m '/mingw64/bin/libwinpthread-1.dll')
	WIN_DLL_PATH = $(HOME_PATH)
    INCLUDES = -I"$(PHP_PATH)" -I"$(PHP_PATH)/main" -I"$(PHP_PATH)/TSRM" -I"$(PHP_PATH)/Zend" -I"$(PHP_PATH)/ext"
    MACROS = -D_WINDOWS -DWINDOWS=1 -DZEND_WIN32=1 -DPHP_WIN32=1 -DWIN32 -D_MBCS -D_USE_MATH_DEFINES -DNDebug -DNDEBUG -DZEND_DEBUG=0 -DZTS=1 -DFD_SETSIZE=256
    GCCMACROS = -D_POSIX
    LDPATH = -L"$(LIB_PATH)"
    LIBS = -lphp8ts -lphp8embed -lbrotlicommon -lbrotlidec -lbrotlienc
	CGOCFLAGS = $(INCLUDES) $(MACROS) $(GCCMACROS)
    CGOLDFLAGS = $(LDPATH) $(LIBS)

# Docker / Linux 宿主机 + MinGW 交叉编译 Windows（需 DOCKER_WIN_BUILD=1，见 docker/README-windows-mingw.md）
# 推荐：将 MSYS2 的 home 目录（如 .../msys64/home/amon）整体挂载为 HOME_PATH，PHP 在 $(HOME_PATH)/usr/local 下与 MSYS 本机构建一致；否则单独设置 MINGW_PHP_PREFIX
else ifneq (,$(DOCKER_WIN_BUILD))
	MAKEFILE_DIR = $(PWD)
	HOME_PATH ?= /opt/msys-home
	MINGW_PHP_PREFIX ?= $(HOME_PATH)/usr/local
	PHP_PATH = $(MINGW_PHP_PREFIX)/include/php
	LIB_PATH = $(MINGW_PHP_PREFIX)/lib
	PTHREAD_PATH ?= /usr/x86_64-w64-mingw32/lib/libwinpthread-1.dll
	WIN_DLL_PATH ?= $(HOME_PATH)/usr/local/lib
	SSP_PATH ?= $(firstword $(wildcard /usr/lib/gcc/x86_64-w64-mingw32/*/libssp-0.dll))
	INCLUDES = -I$(PHP_PATH) -I$(PHP_PATH)/main -I$(PHP_PATH)/TSRM -I$(PHP_PATH)/Zend -I$(PHP_PATH)/ext
	MACROS = -D_WINDOWS -DWINDOWS=1 -DZEND_WIN32=1 -DPHP_WIN32=1 -DWIN32 -D_MBCS -D_USE_MATH_DEFINES -DNDebug -DNDEBUG -DZEND_DEBUG=0 -DZTS=1 -DFD_SETSIZE=256
	GCCMACROS = -D_POSIX
	LDPATH = -L$(LIB_PATH)
	LIBS = -lphp8ts -lphp8embed -lbrotlicommon -lbrotlidec -lbrotlienc -lwinpthread -lssp
	CGOCFLAGS = $(INCLUDES) $(MACROS) $(GCCMACROS)
	CGOLDFLAGS = $(LDPATH) $(LIBS)

# Linux 环境配置
else ifneq (,$(findstring Linux,$(UNAME_S)))
    # Linux 环境 - 使用本地 PHP
	MAKEFILE_DIR = $(PWD)
    # 根据架构选择 PHP 路径
    PHP_DIR = $(if $(filter arm64,$(TARGET_ARCH_CANONICAL)),linux_arm,$(if $(filter sw64,$(TARGET_ARCH_CANONICAL)),$(SW64_PHP_DIR),linux))
    PHP_PATH = $(MAKEFILE_DIR)/php/$(PHP_DIR)
    LINUX_LD_LOADER = $(if $(filter arm64,$(TARGET_ARCH_CANONICAL)),ld-linux-aarch64.so.2,$(if $(filter sw64,$(TARGET_ARCH_CANONICAL)),$(SW64_LD_LOADER),ld-linux-x86-64.so.2))

    INCLUDES = -I$(PHP_PATH)/include -I$(PHP_PATH)/include/main -I$(PHP_PATH)/include/TSRM -I$(PHP_PATH)/include/Zend -I$(PHP_PATH)/include/ext
    LIBS = -L$(PHP_PATH)/lib -Wl,-rpath,$(PHP_PATH)/lib -lphp
	CGOCFLAGS = $(INCLUDES)
	CGOLDFLAGS = $(LIBS)
endif

# prep 函数实现 - 设置版本信息
prep:
	@echo "Build version: xxd.$(VERSION)"
	@sed -i "s/XXDBuildVersion/v$(VERSION)/g" ./util/sysrun.go
	@sed -i "s/XXDBuildInfo/built at $$(date '+%Y-%m-%d %H:%M:%S')/g" ./util/sysrun.go
	@test -d './release/' || mkdir release

# Windows 环境设置检查
setenv-win:prep
	@echo "Checking Windows environment..."
	@echo "MAKEFILE_DIR: $(MAKEFILE_DIR)"
	@echo "PHP_PATH: $(PHP_PATH)"
	@echo "LIB_PATH: $(LIB_PATH)"
	@echo "HOME_PATH: $(HOME_PATH)"
	@if [ ! -d "$(PHP_PATH)" ]; then echo "ERROR: PHP include directory not found: $(PHP_PATH)"; exit 1; fi
	@if [ ! -d "$(LIB_PATH)" ]; then echo "ERROR: Library directory not found: $(LIB_PATH)"; exit 1; fi
	@echo "Windows environment setup complete."

# MinGW 交叉（容器内 Linux）：与 Windows 相同的 PHP/FrankenPHP 布局，路径由 MINGW_PHP_PREFIX、HOME_PATH 指定
_assert_docker_win:
	@test -n "$(DOCKER_WIN_BUILD)" || (echo "ERROR: build-win-docker 需要设置 DOCKER_WIN_BUILD=1（容器镜像已 ENV 或 make 参数）。见 docker/README-windows-mingw.md" >&2; exit 1)

setenv-win-docker: _assert_docker_win prep
	@echo "Checking MinGW cross-build (DOCKER_WIN_BUILD)..."
	@echo "MINGW_PHP_PREFIX: $(MINGW_PHP_PREFIX)"
	@echo "HOME_PATH: $(HOME_PATH)"
	@echo "PHP_PATH: $(PHP_PATH)"
	@echo "LIB_PATH: $(LIB_PATH)"
	@if [ ! -d "$(PHP_PATH)" ]; then echo "ERROR: PHP include directory not found: $(PHP_PATH)"; exit 1; fi
	@if [ ! -d "$(LIB_PATH)" ]; then echo "ERROR: Library directory not found: $(LIB_PATH)"; exit 1; fi
	@if [ ! -d "$(HOME_PATH)/frankenphp" ]; then echo "ERROR: FrankenPHP sources not found at $(HOME_PATH)/frankenphp"; exit 1; fi
	@if [ ! -d "$(WIN_DLL_PATH)" ]; then echo "ERROR: Windows runtime files not found at $(WIN_DLL_PATH)"; exit 1; fi
	@if [ ! -f "$(PTHREAD_PATH)" ]; then echo "ERROR: libwinpthread DLL not found: $(PTHREAD_PATH)"; exit 1; fi
	@if [ -z "$(SSP_PATH)" ] || [ ! -f "$(SSP_PATH)" ]; then echo "ERROR: libssp-0.dll not found. You can override SSP_PATH=/path/to/libssp-0.dll"; exit 1; fi
	@echo "MinGW cross environment OK."

# Linux 环境设置检查
setenv-linux:prep
	@echo "Checking Linux environment..."
	@echo "MAKEFILE_DIR: $(MAKEFILE_DIR)"
	@echo "PHP_PATH: $(PHP_PATH)"
	@if [ ! -d "$(PHP_PATH)" ]; then echo "ERROR: PHP include directory not found: $(PHP_PATH)"; exit 1; fi
	@echo "Linux environment setup complete."

debug:
	@echo "Operating System: $(UNAME_S)"
	@echo "Makefile directory: $(MAKEFILE_DIR)"
	@echo "PHP_PATH: $(PHP_PATH)"
	@echo "LIB_PATH: $(LIB_PATH)"
	@echo "INCLUDES: $(INCLUDES)"
	@echo "LDPATH: $(LDPATH)"
	@echo "LIBS: $(LIBS)"
	@echo "CGOCFLAGS: $(CGOCFLAGS)"
	@echo "CGOLDFLAGS: $(CGOLDFLAGS)"

build-win: setenv-win
	@echo "Updating go.mod for Windows build..."
	@sed -i 's|^// replace github.com/dunglas/frankenphp => PATH_TO_FRANKENPHP|replace github.com/dunglas/frankenphp => $(HOME_PATH)/frankenphp|g' ./go.mod
	CGO_CFLAGS="$(CGOCFLAGS)" CGO_LDFLAGS="$(CGOLDFLAGS)" go build -tags "$(BUILD_TAGS)" $(GO_BUILD_X)
	@rm -rf "$(WIN_RELEASE_DIR)" 2>/dev/null || true
	@mkdir -p "$(WIN_RELEASE_DIR)/php"
	@mv ./xxd.exe "$(WIN_RELEASE_DIR)/xxd.exe"
	@cp -rf ./config "$(WIN_RELEASE_DIR)/config"
	@cp -rf ./pages "$(WIN_RELEASE_DIR)/pages"
	@cp -f $(HOME_PATH)/*.dll "$(WIN_RELEASE_DIR)"
	@cp -f $(PTHREAD_PATH) "$(WIN_RELEASE_DIR)"
	@cp -f $(HOME_PATH)/frankenphp-go/win/php.ini "$(WIN_RELEASE_DIR)"
	@if [ -f "./setauth.ps1" ]; then cp -f ./setauth.ps1 "$(WIN_RELEASE_DIR)/setauth.ps1"; fi
	@git checkout ./util/sysrun.go
	@git checkout ./go.mod

build-win-docker: setenv-win-docker
	@echo "Updating go.mod for Windows cross-build..."
	@sed -i 's|^// replace github.com/dunglas/frankenphp => PATH_TO_FRANKENPHP|replace github.com/dunglas/frankenphp => $(HOME_PATH)/frankenphp|g' ./go.mod
	GOOS=windows GOARCH=amd64 CGO_ENABLED=1 CC=x86_64-w64-mingw32-gcc CXX=x86_64-w64-mingw32-g++ \
		CGO_CFLAGS="$(CGOCFLAGS)" CGO_LDFLAGS="$(CGOLDFLAGS)" go build -tags "$(BUILD_TAGS)" -o xxd.exe $(GO_BUILD_X)
	@rm -rf "$(WIN_RELEASE_DIR)" 2>/dev/null || true
	@mkdir -p "$(WIN_RELEASE_DIR)/php"
	@mv ./xxd.exe "$(WIN_RELEASE_DIR)/xxd.exe"
	@cp -rf ./config "$(WIN_RELEASE_DIR)/config"
	@cp -rf ./pages "$(WIN_RELEASE_DIR)/pages"
	@cp -f $(WIN_DLL_PATH)/*.dll "$(WIN_RELEASE_DIR)"
	@cp -f $(PTHREAD_PATH) "$(WIN_RELEASE_DIR)"
	@cp -f $(SSP_PATH) "$(WIN_RELEASE_DIR)"
	@cp -f ./php/win/php.ini "$(WIN_RELEASE_DIR)"
	@if [ -f "./setauth.ps1" ]; then cp -f ./setauth.ps1 "$(WIN_RELEASE_DIR)/setauth.ps1"; fi
	@if command -v git >/dev/null 2>&1 && git rev-parse --git-dir >/dev/null 2>&1; then git checkout ./util/sysrun.go ./go.mod; fi

build-linux: setenv-linux
	CGO_CFLAGS="$(CGOCFLAGS)" CGO_LDFLAGS="$(CGOLDFLAGS)" go build -tags "$(BUILD_TAGS)" $(GO_BUILD_X)
	@rm -rf "$(RELEASE_DIR)" 2>/dev/null || true
	@mkdir -p "$(RELEASE_DIR)/php"
	@mv ./xxd "$(RELEASE_DIR)/xxd"
	@cp -rf ./config "$(RELEASE_DIR)/config"
	@cp -rf ./pages "$(RELEASE_DIR)/pages"
	@cp -rf ./php/$(PHP_DIR)/lib "$(RELEASE_DIR)/php/lib"
	@cp -f start.sh "$(RELEASE_DIR)"
	@if [ -f "./setauth" ]; then cp -f ./setauth "$(RELEASE_DIR)/setauth"; fi
	@cp -f "$(LINUX_RELEASE_PHP_INI)" "$(RELEASE_DIR)"
	@cd "$(RELEASE_DIR)" && \
	patchelf --set-rpath '$$ORIGIN/php/lib' xxd && \
	patchelf --set-interpreter ./php/lib/$(LINUX_LD_LOADER) xxd && \
	cd ../..
	@cd "$(RELEASE_DIR)/php/lib" && \
	patchelf --set-rpath '$$ORIGIN' libphp.so &&  \
	cd ../../../..
	@git checkout ./util/sysrun.go

build-linux-docker: setenv-linux
	CGO_CFLAGS="$(CGOCFLAGS)" CGO_LDFLAGS="$(CGOLDFLAGS)" go build -tags "$(BUILD_TAGS)" $(GO_BUILD_X)
	@rm -rf "$(RELEASE_DIR)" 2>/dev/null || true
	@mkdir -p "$(RELEASE_DIR)/php"
	@mv ./xxd "$(RELEASE_DIR)/xxd"
	@cp -rf ./config "$(RELEASE_DIR)/config"
	@cp -rf ./pages "$(RELEASE_DIR)/pages"
	@cp -rf ./php/$(PHP_DIR)/lib "$(RELEASE_DIR)/php/lib"
	@cp -f start.sh "$(RELEASE_DIR)"
	@if [ -f "./setauth" ]; then cp -f 	./setauth "$(RELEASE_DIR)/setauth"; fi
	@cp -f "$(LINUX_RELEASE_PHP_INI)" "$(RELEASE_DIR)"
	@cd "$(RELEASE_DIR)" && \
	patchelf --set-rpath '$$ORIGIN/php/lib' xxd && \
	patchelf --set-interpreter ./php/lib/$(LINUX_LD_LOADER) xxd && \
	cd ../..
	@cd "$(RELEASE_DIR)/php/lib" && \
	patchelf --set-rpath '$$ORIGIN' libphp.so

build-linux-arm64-cross: TARGET_ARCH = arm64
build-linux-arm64-cross: prep
	@echo "Building Linux arm64 via cross-compiler..."
	@bash -ec ' \
		set -euo pipefail; \
		LIBDIR="$(CURDIR)/php/$(PHP_DIR)/lib"; \
		BACKUP="$$LIBDIR/.glibc-hide-tmp"; \
		restore_libs() { \
			if [ -d "$$BACKUP" ]; then \
				for f in "$$BACKUP"/*; do [ -e "$$f" ] || continue; mv "$$f" "$$LIBDIR/"; done; \
				rmdir "$$BACKUP" 2>/dev/null || true; \
			fi; \
		}; \
		mkdir -p "$$BACKUP"; \
		for f in libpthread.so libpthread.so.0 libdl.so libdl.so.2 libc.so libc.so.6 librt.so librt.so.1 libm.so libm.so.6 libresolv.so libresolv.so.2 ld-linux-aarch64.so.1 ld-linux-aarch64.so.2; do \
			if [ -e "$$LIBDIR/$$f" ]; then mv "$$LIBDIR/$$f" "$$BACKUP/"; fi; \
		done; \
		trap restore_libs EXIT; \
		SYSROOT="$$(aarch64-linux-gnu-gcc -print-sysroot)"; \
		CGO_CFLAGS="-I$(CURDIR)/php/$(PHP_DIR)/include -I$(CURDIR)/php/$(PHP_DIR)/include/main -I$(CURDIR)/php/$(PHP_DIR)/include/TSRM -I$(CURDIR)/php/$(PHP_DIR)/include/Zend -I$(CURDIR)/php/$(PHP_DIR)/include/ext" \
		CGO_LDFLAGS="-L$$LIBDIR -Wl,-rpath,$(CURDIR)/php/$(PHP_DIR)/lib -lphp -Wl,-rpath-link,$$SYSROOT/lib/aarch64-linux-gnu -Wl,-rpath-link,$$SYSROOT/usr/lib/aarch64-linux-gnu" \
		GOOS=linux GOARCH=arm64 CGO_ENABLED=1 CC="$(CROSS_CC_arm64)" CXX="$(CROSS_CXX_arm64)" \
		go build -tags "$(BUILD_TAGS)" -o ./xxd $(GO_BUILD_X); \
		restore_libs; \
		trap - EXIT; \
	'
	@rm -rf "$(RELEASE_DIR)" 2>/dev/null || true
	@mkdir -p "$(RELEASE_DIR)/php"
	@mv ./xxd "$(RELEASE_DIR)/xxd"
	@cp -rf ./config "$(RELEASE_DIR)/config"
	@cp -rf ./pages "$(RELEASE_DIR)/pages"
	@cp -rf "./php/$(PHP_DIR)/lib" "$(RELEASE_DIR)/php/lib"
	@cp -f start.sh "$(RELEASE_DIR)"
	@if [ -f "./setauth" ]; then cp -f ./setauth "$(RELEASE_DIR)/setauth"; fi
	@cp -f "$(LINUX_RELEASE_PHP_INI)" "$(RELEASE_DIR)"
	@cd "$(RELEASE_DIR)" && \
	patchelf --set-rpath '$$ORIGIN/php/lib' xxd && \
	patchelf --set-interpreter ./php/lib/$(LINUX_LD_LOADER) xxd && \
	cd ../..
	@cd "$(RELEASE_DIR)/php/lib" && \
	patchelf --set-rpath '$$ORIGIN' libphp.so

build-linux-sw64-cross: TARGET_ARCH = sw64
build-linux-sw64-cross: prep
	@echo "Building Linux $(SW64_GOARCH) via cross-compiler..."
	@bash -ec ' \
		set -euo pipefail; \
		LIBDIR="$(CURDIR)/php/$(PHP_DIR)/lib"; \
		BACKUP="$$LIBDIR/.glibc-hide-tmp"; \
		restore_libs() { \
			if [ -d "$$BACKUP" ]; then \
				for f in "$$BACKUP"/*; do [ -e "$$f" ] || continue; mv "$$f" "$$LIBDIR/"; done; \
				rmdir "$$BACKUP" 2>/dev/null || true; \
			fi; \
		}; \
		mkdir -p "$$BACKUP"; \
		for f in libpthread.so libpthread.so.0 libdl.so libdl.so.2 libc.so libc.so.6 librt.so librt.so.1 libm.so libm.so.6 libresolv.so libresolv.so.2 ld-linux.so.2 ld-linux-sw64.so.1 ld-linux-sw64.so.2; do \
			if [ -e "$$LIBDIR/$$f" ]; then mv "$$LIBDIR/$$f" "$$BACKUP/"; fi; \
		done; \
		trap restore_libs EXIT; \
		SYSROOT="$$($(CROSS_CC_sw64) -print-sysroot)"; \
		RPATH_LINKS=""; \
		for dir in $(SW64_SYSROOT_LIB_DIRS); do \
			if [ -d "$$SYSROOT/$$dir" ]; then RPATH_LINKS="$$RPATH_LINKS -Wl,-rpath-link,$$SYSROOT/$$dir"; fi; \
		done; \
		CGO_CFLAGS="-I$(CURDIR)/php/$(PHP_DIR)/include -I$(CURDIR)/php/$(PHP_DIR)/include/main -I$(CURDIR)/php/$(PHP_DIR)/include/TSRM -I$(CURDIR)/php/$(PHP_DIR)/include/Zend -I$(CURDIR)/php/$(PHP_DIR)/include/ext" \
		CGO_LDFLAGS="-L$$LIBDIR -Wl,-rpath,$(CURDIR)/php/$(PHP_DIR)/lib -lphp $$RPATH_LINKS" \
		GOOS=linux GOARCH="$(SW64_GOARCH)" CGO_ENABLED=1 CC="$(CROSS_CC_sw64)" CXX="$(CROSS_CXX_sw64)" \
		go build -tags "$(BUILD_TAGS)" -o ./xxd $(GO_BUILD_X); \
		restore_libs; \
		trap - EXIT; \
	'
	@rm -rf "$(RELEASE_DIR)" 2>/dev/null || true
	@mkdir -p "$(RELEASE_DIR)/php"
	@mv ./xxd "$(RELEASE_DIR)/xxd"
	@cp -rf ./config "$(RELEASE_DIR)/config"
	@cp -rf ./pages "$(RELEASE_DIR)/pages"
	@cp -rf "./php/$(PHP_DIR)/lib" "$(RELEASE_DIR)/php/lib"
	@cp -f start.sh "$(RELEASE_DIR)"
	@if [ -f "./setauth" ]; then cp -f ./setauth "$(RELEASE_DIR)/setauth"; fi
	@cp -f "$(LINUX_RELEASE_PHP_INI)" "$(RELEASE_DIR)"
	@cd "$(RELEASE_DIR)" && \
	patchelf --set-rpath '$$ORIGIN/php/lib' xxd && \
	patchelf --set-interpreter ./php/lib/$(LINUX_LD_LOADER) xxd && \
	cd ../..
	@cd "$(RELEASE_DIR)/php/lib" && \
	patchelf --set-rpath '$$ORIGIN' libphp.so

docker-image-win:
	docker build -f docker/Dockerfile.windows-mingw -t "$(WIN_DOCKER_IMAGE)" docker

docker-image-linux-amd64:
	docker build -f docker/Dockerfile.linux-amd64 -t "$(LINUX_AMD64_DOCKER_IMAGE)" docker

docker-image-linux-arm64:
	docker build -f docker/Dockerfile.linux-arm64 -t "$(LINUX_ARM64_DOCKER_IMAGE)" docker

docker-image-linux-sw64:
	docker build -f docker/Dockerfile.linux-sw64 -t "$(LINUX_SW64_DOCKER_IMAGE)" docker

run-win-docker:
	@git checkout ./util/sysrun.go ./go.mod
	@if [ ! -d "$(CURDIR)/php/win/frankenphp/.git" ]; then \
		echo "php/win/frankenphp 不存在，开始拉取..."; \
		git clone https://github.com/xzChill/frankenphp.git "$(CURDIR)/php/win/frankenphp"; \
	fi
	@docker image inspect "$(WIN_DOCKER_IMAGE)" >/dev/null 2>&1 || $(MAKE) docker-image-win
	docker run --rm \
	    --user "$(DOCKER_RUN_USER)" \
		-e HOME=/work/xxd \
		-e GOPATH="$(DOCKER_GOPATH)" \
		-e GOMODCACHE="$(DOCKER_GOMODCACHE)" \
		-e GOCACHE="$(DOCKER_GOCACHE)" \
		-v "$(CURDIR)/php/win:/opt/msys-home:ro" \
		-v "$(CURDIR):/work/xxd" \
		-v "$(abspath ../xxb):/work/xxb:ro" \
		-w /work/xxd \
		"$(WIN_DOCKER_IMAGE)" \
		bash -ec 'make build-win-docker BUILD_TAGS="$(BUILD_TAGS)" DEBUG="$(DEBUG)"'
	@git checkout ./util/sysrun.go ./go.mod

run-linux-amd64-docker:
	@git checkout ./util/sysrun.go ./go.mod
	@docker image inspect "$(LINUX_AMD64_DOCKER_IMAGE)" >/dev/null 2>&1 || $(MAKE) docker-image-linux-amd64
	docker run --rm --platform linux/amd64 \
	    --user "$(DOCKER_RUN_USER)" \
		-e HOME=/work/xxd \
		-e GOPATH="$(DOCKER_GOPATH)" \
		-e GOMODCACHE="$(DOCKER_GOMODCACHE)" \
		-e GOCACHE="$(DOCKER_GOCACHE)" \
		-v "$(CURDIR):/work/xxd" \
		-v "$(abspath ../xxb):/work/xxb:ro" \
		-w /work/xxd \
		"$(LINUX_AMD64_DOCKER_IMAGE)" \
		bash -ec 'make build-linux-docker BUILD_TAGS="$(BUILD_TAGS)" DEBUG="$(DEBUG)"'
	@git checkout ./util/sysrun.go ./go.mod

run-linux-arm64-docker:
	@git checkout ./util/sysrun.go ./go.mod
	@docker image inspect "$(LINUX_ARM64_DOCKER_IMAGE)" >/dev/null 2>&1 || $(MAKE) docker-image-linux-arm64
	docker run --rm --platform linux/amd64 \
		--user "$(DOCKER_RUN_USER)" \
		-e HOME=/work/xxd \
		-e GOPATH="$(DOCKER_GOPATH)" \
		-e GOMODCACHE="$(DOCKER_GOMODCACHE)" \
		-e GOCACHE="$(DOCKER_GOCACHE)" \
		-v "$(CURDIR):/work/xxd" \
		-v "$(abspath ../xxb):/work/xxb" \
		-w /work/xxd \
		"$(LINUX_ARM64_DOCKER_IMAGE)" \
		bash -ec 'make build-linux-arm64-cross BUILD_TAGS="$(BUILD_TAGS)" DEBUG="$(DEBUG)"'
	@git checkout ./util/sysrun.go ./go.mod

# 根据当前操作系统自动选择构建目标
build:
ifeq ($(OS),Windows_NT)
	$(MAKE) build-win BUILD_TAGS="$(BUILD_TAGS)" DEBUG="$(DEBUG)"
else ifneq (,$(findstring MINGW,$(UNAME_S))$(findstring MSYS,$(UNAME_S))$(findstring CYGWIN,$(UNAME_S)))
	$(MAKE) build-win BUILD_TAGS="$(BUILD_TAGS)" DEBUG="$(DEBUG)"
else ifneq (,$(findstring Linux,$(UNAME_S)))
	$(MAKE) build-linux BUILD_TAGS="$(BUILD_TAGS)" DEBUG="$(DEBUG)"
endif

clean:
	go clean
	go clean -cache

install-deps-macos:
	brew install php brotli

.PHONY: prep _assert_docker_win setenv-win setenv-win-docker setenv-linux \
	build build-win build-win-docker build-linux build-linux-docker build-linux-arm64-cross build-linux-sw64-cross \
	run-win-docker run-linux-amd64-docker run-linux-arm64-docker \
	docker-image-win docker-image-linux-amd64 docker-image-linux-arm64 docker-image-linux-sw64 \
	build-macos clean debug install-deps-linux install-deps-macos
