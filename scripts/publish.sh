source scripts/shared.sh

cd falcon-vis

# replace the from "main": "src" to "main": "build"
# and write that to the package.json
dev='\"main\": \"src\"'
build='\"main\": \"build\"'


# build mode
yarn build && replaceAll package.json "$dev" "$build"

# copy the README.md to the build folder
cp ../README.md README.md

# publish to npm
yarn publish

# back to dev mode
replaceAll package.json "$build" "$dev"
rm -fr build
rm -f README.md