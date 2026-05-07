#!/bin/bash
buildDir=$(pwd)
cflags="-I$buildDir/php -I$buildDir/php/main -I$buildDir/php/TSRM -I$buildDir/php/Zend -I$buildDir/php/ext -I$buildDir/php/ext/date/lib"
ldflags="-ltidy -lstdc++ -lm -lpthread -lxml2 -lssl -lcrypto -lsqlite3 -lz -lcurl -lxml2 -lgmp -licuio -licui18n -licuuc -licudata -lonig -lsqlite3 -lxml2 -lxml2 -lxml2 -lxml2 -lxslt -lxml2 -lexslt -lxslt -lxml2 -lzip -lz -lssl -lcrypto"

CGO_CFLAGS=$cflags CGO_LDFLAGS=$ldflags go build -tags "nowatcher"
