#!/bin/bash
tsc lib/js/View.ts --out com/js --module AMD --target ES5
tsc node/app.ts
