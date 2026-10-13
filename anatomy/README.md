# Anatomy figures

`after-brockdb/` is Fig 1, *After BrockDB request paths*: the After BrockDB target
architecture built as a pneumatic tube installation on a bench, with the seven request
paths traced hop by hop. It was made with the
[anatomy](https://github.com/wheresryan22/anatomy) skill; `kit/` and `scripts/` are the
parts of that skill's kit the figure uses (MIT, see `LICENSE`).

| File | What it holds |
|---|---|
| `after-brockdb/model.mjs` | The truth: stations, tubes, the seven paths and their hops, roles, principles. The page's words and the motion both read it. |
| `after-brockdb/build.mjs` | The geometry. Writes `after-brockdb.html` (the published page) and two local check pages. |
| `after-brockdb/live.js` | The page script: path focus, carriers in the tubes, marks, readout, keys, tour. |
| `after-brockdb/page.html`, `figure.css` | The page around the figure, light and dark. |

```sh
cd anatomy/after-brockdb
node build.mjs            # writes after-brockdb.html, check-light.html, check-dark.html
node build.mjs --audit    # proves clearances, supports and depth order; must end "audit passed"
CHROME_PATH=/path/to/chromium node ../scripts/lines.mjs check-light.html   # must print "line ends: 0"
CHROME_PATH=/path/to/chromium node ../scripts/capture.mjs check-light.html --out shots/fig.png
```

To change a path's wording or hops, edit `model.mjs` and rebuild.
