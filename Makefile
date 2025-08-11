SHELL := /usr/bin/env bash -o errexit -o pipefail -o nounset

dev-tampermonkey: ## dev mode, with hot reloading
	@pnpm run dev

tampermonkey: ## build tampermonkey script, remember to re-import in chrome
	@pnpm run build

hyperliquid: ## subscribe to hyperliquid websocket
	@(cd hyperliquid && while true; do \
		echo "Starting hyperliquid script..."; \
		uv run main.py || true; \
		echo "Script exited, restarting in 5 seconds..."; \
		sleep 5; \
	done)

# https://www.gnu.org/software/make/manual/html_node/Options-Summary.html
MAKEFLAGS += --always-make

.DEFAULT_GOAL := help
# Modified from http://marmelab.com/blog/2016/02/29/auto-documented-makefile.html
help:
	@grep -Eh '^[a-zA-Z_-]+:.*?##? .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?##? "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
