MODULE_PATH := ./node_modules/.bin
ENV ?= PATH=$(MODULE_PATH):$(PATH)

.PHONY: all
all: test lint

.PHONY: audit
audit: $(MODULE_PATH)
	npm audit

.PHONY: lint
lint: $(MODULE_PATH)
	$(ENV) eslint . --ignore-pattern docs

.PHONY: test
test: $(MODULE_PATH)
	$(ENV) c8 --exclude=dist --exclude=test --reporter=text --reporter=html --reporter=lcov mocha --bail

.PHONY: fmt
fmt: $(MODULE_PATH)
	$(ENV) eslint . --ignore-pattern docs --fix

.PHONY: doc
doc: $(MODULE_PATH)
	$(ENV) jsdoc --configure jsdoc.json

.PHONY: minify
minify: $(MODULE_PATH)
	$(ENV) rollup --config


$(MODULE_PATH): package.json
	npm install --save-dev
	touch $@  # update timestamp
