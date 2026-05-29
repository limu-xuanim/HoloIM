// Copyright 2009-2023 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
// ZOSL (https://zpl.pub/page/zoslv1.html)

//go:build linux && sw64

package main

// #cgo CFLAGS: -I${SRCDIR}/php/linux_sw64/include -I${SRCDIR}/php/linux_sw64/include/main -I${SRCDIR}/php/linux_sw64/include/TSRM -I${SRCDIR}/php/linux_sw64/include/Zend -I${SRCDIR}/php/linux_sw64/include/ext
// #cgo LDFLAGS: -L${SRCDIR}/php/linux_sw64/lib -Wl,-rpath,${SRCDIR}/php/linux_sw64/lib -Wl,-rpath-link,${SRCDIR}/php/linux_sw64/lib -lphp
import "C"
