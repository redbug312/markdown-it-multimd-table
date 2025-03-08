MODULE_PATH := ./node_modules/.bin
export PATH := ${MODULE_PATH}:$(PATH)

.PHONY: all
all: lint test audit

.PHONY: lint
lint: ${MODULE_PATH}
	eslint .

.PHONY: test
test: ${MODULE_PATH}
	c8 --exclude dist --exclude test -r text -r html -r lcov mocha

.PHONY: audit
audit: ${MODULE_PATH}
	npm audit

.PHONY: minify
minify: ${MODULE_PATH}
	rollup -c

${MODULE_PATH}: package.json
	npm install --save-dev
	touch $@  # update timestamp
