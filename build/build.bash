#!/bin/bash

cat ./../license.txt > ./../dist/quby.js
cat ./../src/lib/*.js >> ./../dist/quby.js
cat ./../src/*.js >> ./../dist/quby.js
