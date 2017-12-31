NPM_PACKAGE := $(shell node -e 'process.stdout.write(require("./package.json").name)')
NPM_VERSION := $(shell node -e 'process.stdout.write(require("./package.json").version)')

TMP_PATH    := /tmp/${NPM_PACKAGE}-$(shell date +%s)

REMOTE_NAME ?= origin
REMOTE_REPO ?= $(shell git config --get remote.${REMOTE_NAME}.url)

CURR_HEAD   := $(firstword $(shell git show-ref --hash HEAD | cut -b -6) master)
GITHUB_PROJ := https://github.com//markdown-it/${NPM_PACKAGE}

TEST_CASES  := $(patsubst src/test/%.md,test/fixtures/%.txt,$(wildcard src/test/*.md))

MODULE_PATH := ./node_modules/.bin

lint:
	${MODULE_PATH}/eslint .

test: lint
	${MODULE_PATH}/mocha -R spec

coverage:
	rm -rf coverage
	${MODULE_PATH}/istanbul cover ${MODULE_PATH}/.bin/_mocha

test-ci: lint
	${MODULE_PATH}/istanbul cover ${MODULE_PATH}/_mocha --report lcovonly -- -R spec
	cat ./coverage/lcov.info | ${MODULE_PATH}/coveralls
	rm -rf ./coverage

browserify:
	rm -rf ./dist
	mkdir dist
	# Browserify
	( printf "/*! ${NPM_PACKAGE} ${NPM_VERSION} ${GITHUB_PROJ} @license MIT */" ; \
		${MODULE_PATH}/browserify ./ -s markdownitDeflist \
		) > dist/markdown-it-multimd-table.js
	# Minify
	${MODULE_PATH}/uglifyjs dist/markdown-it-multimd-table.js -b beautify=false,ascii-only=true -c -m \
		--preamble "/*! ${NPM_PACKAGE} ${NPM_VERSION} ${GITHUB_PROJ} @license MIT */" \
		> dist/markdown-it-multimd-table.min.js

.PHONY: lint test coverage test-ci browserify
.SILENT: lint test
