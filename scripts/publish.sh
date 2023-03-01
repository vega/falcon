cd falcon-vis

# replace the from "main": "src" to "main": "build"
# and write that to the package.json
dev='\"main\": \"src\"'
build='\"main\": \"build\"'


# build mode
yarn build && sed -i '' "s/$dev/$build/g" package.json
cp ../README.md README.md

# publish to npm
yarn publish

# back to dev mode
sed -i '' "s/$build/$dev/g" package.json
rm -fr build
rm -f README.md