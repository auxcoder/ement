#!/bin/bash
# restructure.sh — Move AngularJS reference code into _reference/
# Run from: ng-elements/ (repo root)
#
# What this does:
# 1. Creates _reference/ directory
# 2. git mv's all AngularJS files/dirs into it
# 3. Moves ng-modern/ contents up to root
# 4. Cleans up
#
# After running: git commit -m "restructure: ng-modern at root, AngularJS in _reference/"

set -e

echo "=== Step 1: Create _reference/ directory ==="
mkdir -p _reference

echo "=== Step 2: Move AngularJS directories ==="
git mv src/ _reference/src/
git mv test/ _reference/test/
git mv docs/ _reference/docs/
git mv vendor/ _reference/vendor/
git mv scripts/ _reference/scripts/
git mv benchmarks/ _reference/benchmarks/
git mv i18n/ _reference/i18n/
git mv lib/ _reference/lib/
git mv images/ _reference/images/
git mv css/ _reference/css/
git mv logs/ _reference/logs/
git mv .circleci/ _reference/.circleci/
git mv .github/ _reference/.github/

echo "=== Step 3: Move AngularJS config/docs files ==="
git mv Gruntfile.js _reference/
git mv angularFiles.js _reference/
git mv package.json _reference/package.json.old
git mv yarn.lock _reference/
git mv karma-shared.conf.js _reference/
git mv karma-jqlite.conf.js _reference/
git mv karma-jquery.conf.js _reference/
git mv karma-jquery.conf-factory.js _reference/
git mv karma-jquery-2.1.conf.js _reference/
git mv karma-jquery-2.2.conf.js _reference/
git mv karma-docs.conf.js _reference/
git mv karma-modules.conf.js _reference/
git mv karma-modules-ngMock.conf.js _reference/
git mv karma-modules-ngAnimate.conf.js _reference/
git mv protractor-conf.js _reference/
git mv protractor-shared-conf.js _reference/
git mv protractor-circleci-conf.js _reference/
git mv .eslintrc.json _reference/
git mv .eslintrc-base.json _reference/
git mv .eslintrc-browser.json _reference/
git mv .eslintrc-node.json _reference/
git mv .eslintrc-todo.json _reference/
git mv .eslintignore _reference/
git mv .nvmrc _reference/
git mv .mailmap _reference/
git mv .editorconfig _reference/
git mv .gitattributes _reference/
git mv README.md _reference/README.md
git mv README.closure.md _reference/
git mv CHANGELOG.md _reference/
git mv CONTRIBUTING.md _reference/
git mv DEVELOPERS.md _reference/
git mv RELEASE.md _reference/
git mv TRIAGING.md _reference/
git mv SECURITY.md _reference/
git mv CODE_OF_CONDUCT.md _reference/
git mv LICENSE _reference/

echo "=== Step 4: Move ng-modern/ contents to root ==="
# Can't git mv into existing directory easily, so we use regular mv + git add
mv ng-modern/src/ ./src/
mv ng-modern/app/ ./app/
mv ng-modern/vite-plugins/ ./vite-plugins/
mv ng-modern/vite.config.js ./vite.config.js
mv ng-modern/package.json ./package.json
mv ng-modern/index.html ./index.html

# Clean up empty ng-modern directory
rmdir ng-modern

# Stage the moves
git add -A

echo "=== Step 5: Done! ==="
echo ""
echo "Review with: git status"
echo "Then commit: git commit -m 'restructure: ng-modern at root, AngularJS in _reference/'"
echo ""
echo "Final structure:"
echo "  ng-elements/"
echo "  ├── src/              ← ng-modern source"
echo "  ├── app/              ← ng-modern demo"
echo "  ├── vite-plugins/     ← Rollup plugins"
echo "  ├── vite.config.js"
echo "  ├── package.json"
echo "  ├── index.html"
echo "  ├── .kiro/specs/      ← project specs"
echo "  ├── .gitignore"
echo "  └── _reference/       ← AngularJS source (for learning/grep)"
