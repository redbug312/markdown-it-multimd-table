.PHONY: lint test coverage report-coveralls browserify

NPM_PACKAGE := $(shell node -e 'process.stdout.write(require("./package.json").name)')
NPM_VERSION := $(shell node -e 'process.stdout.write(require("./package.json").version)')

REMOTE_NAME ?= origin
REMOTE_REPO ?= $(shell git config --get remote.${REMOTE_NAME}.url)
GITHUB_PROJ := https://github.com/redbug312/markdown-it-multimd-table

MODULE_PATH := ./node_modules/.bin


${MODULE_PATH}: package.json
	npm install --save-dev
	touch $@  # update timestamp


lint: ${MODULE_PATH}
	${MODULE_PATH}/eslint . --ignore-pattern support

test: ${MODULE_PATH} lint
	${MODULE_PATH}/nyc ${MODULE_PATH}/mocha

coverage: ${MODULE_PATH} lint
	${MODULE_PATH}/nyc report --reporter html

report-coveralls: ${MODULE_PATH} lint
	# For GitHub integration test. You can use `make coverage` on local.
	${MODULE_PATH}/nyc --reporter=lcov ${MODULE_PATH}/mocha

browserify: ${MODULE_PATH} lint test
	${MODULE_PATH}/rollup -c support/rollup.config.js
