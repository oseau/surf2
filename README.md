# surf2

short-cuts for https://v2.surf.one/

- `` ` `` to reset leverage and collateral to 1 to be safe
- `a` to `open long`
- `o` to `open short`
- `e` `u` to switch tab
- `j` to reduce position
- `k` to clear open orders
- `p` to refresh
- `q` to toggle log
- `'` to close all positions using market price

alert and save when any position lost >= -XX%, check `PERCENTAGE_SAVE`.

take profit when all position >= YY%, check `PERCENTAGE_MIN`

## dev

using https://github.com/lisonge/vite-plugin-monkey

```bash
make tampermonkey # build
make dev-tampermonkey # with hot reloading
```
