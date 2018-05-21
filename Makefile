default: setup

setup:
	npm install .
	$(MAKE) download-libs

download-libs:
	node div/download_libs.js div/libs.json libs/

clean-libs:
	rm -rf libs

clean: clean-libs

.PHONY: default download-libs clean-libs clean
