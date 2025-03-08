MODULE_PATH := ./node_modules/.bin
export PATH := ${MODULE_PATH}:$(PATH)

${MODULE_PATH}: package.json
	npm install --save-dev
	touch $@  # update timestamp

.PHONY: lint
lint: ${MODULE_PATH}
	eslint .
	eslint . --fix

.PHONY: test
test: ${MODULE_PATH}
	nyc mocha

.PHONY: coverage
coverage: ${MODULE_PATH} lint test
	nyc report --reporter html

.PHONY: coverage-for-ci
coverage-for-ci: ${MODULE_PATH} lint test
	# For coverage test. You can use `make coverage` on local.
	nyc --reporter=lcov mocha

.PHONY: browserify
browserify: ${MODULE_PATH} lint test
	rollup -c
