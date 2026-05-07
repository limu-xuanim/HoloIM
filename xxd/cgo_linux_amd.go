// Copyright 2009-2023 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
// ZOSL (https://zpl.pub/page/zoslv1.html)

//go:build linux && amd64

package main

// #cgo CFLAGS: -I${SRCDIR}/php/linux/include -I${SRCDIR}/php/linux/include/main -I${SRCDIR}/php/linux/include/TSRM -I${SRCDIR}/php/linux/include/Zend -I${SRCDIR}/php/linux/include/ext
// #cgo LDFLAGS: -L${SRCDIR}/php/linux/lib -Wl,-rpath,${SRCDIR}/php/linux/lib -lphp
import "C"
