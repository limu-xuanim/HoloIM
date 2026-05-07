VERSION=$(shell head -n 1 VERSION)
TIME=$(shell date)
SED = $(shell which sed)
UNAME = $(shell uname)
ifeq ($(UNAME),Darwin)
	SED = $(shell which gsed)
endif

all: xxb

xxb:
	mkdir -p xxb
	cp -r config xxb/
	cp -r db xxb/
	cp -r framework xxb/
	cp -r lib xxb/
	cp -r module xxb/
	cp -r tools xxb/
	cp -r www xxb/
	cp -r VERSION xxb/
	# read version from VERSION file.
	$(SED) -i 's/XXBBUILDDATE/$(TIME)/g' xxb/config/xxb.php
	$(SED) -i 's/XXBVERSION/$(VERSION)/g' xxb/config/xxb.php
	$(SED) -i 's/XXBVERSION/$(VERSION)/g' xxb/config/ext/_0_xuanxuan.php
	# combine js and css files.
	cd xxb/tools/ && php ./minifyfront.php && php ./cn2tw.php
	# Add ext directory to config and each module.
	mkdir -p xxb/config/ext
	for module in `ls xxb/module/`; do mkdir -p xxb/module/$$module/ext; done
	find xxb -name ext | xargs chmod -R 777
	# Add index.html to each directory.
	for path in `find xxb -type d`; do touch "$$path/index.html"; done
	# Delete the useless files.
	find xxb -name .git | xargs rm -fr
	rm -rf xxb/tools
	rm xxb/www/index.html
	#rm xxb/www/ux.php
	# Make tmp directories.
	mkdir -p xxb/tmp/
	mkdir -p xxb/tmp/backup/
	mkdir -p xxb/tmp/log/
	mkdir -p xxb/tmp/model/
	mkdir -p xxb/www/data/
	mkdir -p xxb/www/data/client/
	cp module/common/model.php xxb/tmp/model/
	mv xxb/tmp/model/model.php xxb/tmp/model/common.php
	# Change mode.
	chmod -R 777 xxb/config
	chmod -R 777 xxb/tmp
	chmod -R 777 xxb/www/data
	# Zip it.
	zip -rqm -9 "xxb.$(VERSION).zip" xxb

clean:
	rm -rf xxb
	rm -f xxb.*.zip
