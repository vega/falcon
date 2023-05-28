#!/bin/bash

source scripts/shared.sh

examplesDir=examples
liveDir=live
examples=("movies-arrow" "movies-json" "movies-duckdb" "flights-duckdb" crossfilter)

function buildExamples() {
	# go to each example and build them 
	for example in ${examples[@]}; do
	  	cd $example
	 	echo "Building $example"
		yarn build
		replaceAll "dist/index.html" "=\"\/" "=\"" # change all "/assets" to "assets"
		mv dist/ ../live/$example
		cd ..
	done
}


function deleteBuilds() {
	for example in ${examples[@]}; do
	 	echo "Deleting $example build"
		rm -fr $example
	done
}

cd $examplesDir
buildExamples
# back to project root
cd ..

# deploy the live folder
yarn gh-pages

cd $examplesDir
cd $liveDir
deleteBuilds
# back to project root
cd ..
cd ..

