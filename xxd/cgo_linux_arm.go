// Copyright 2009-2023 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
// ZOSL (https://zpl.pub/page/zoslv1.html)

//go:build linux && arm64

package main

// #cgo CFLAGS: -I${SRCDIR}/php/linux_arm/include -I${SRCDIR}/php/linux_arm/include/main -I${SRCDIR}/php/linux_arm/include/TSRM -I${SRCDIR}/php/linux_arm/include/Zend -I${SRCDIR}/php/linux_arm/include/ext
// #cgo LDFLAGS: -L${SRCDIR}/php/linux_arm/lib -Wl,-rpath,${SRCDIR}/php/linux_arm/lib -lphp
import "C"
