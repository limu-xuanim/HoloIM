// Copyright 2009-2023 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
// ZOSL (https://zpl.pub/page/zoslv1.html)

//go:build windows

package main

// #cgo CFLAGS: -I/usr/local/include/php -I/usr/local/include/php/main -I/usr/local/include/php/TSRM -I/usr/local/include/php/Zend -I/usr/local/include/php/ext -D_WINDOWS -DWINDOWS=1 -DZEND_WIN32=1 -DPHP_WIN32=1 -DWIN32 -D_MBCS -D_USE_MATH_DEFINES -DNDebug -DNDEBUG -DZEND_DEBUG=0 -DZTS=1 -DFD_SETSIZE=256 -D_POSIX
// #cgo LDFLAGS: -L/usr/local/lib -lphp8ts -lphp8embed -lbrotlicommon -lbrotlidec -lbrotlienc
import "C"
