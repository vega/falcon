#!/bin/bash

source scripts/shared.sh

examplesDir=examples
examples=("movies-json")

function buildExamples() {
	# go to each example and build them 
	cd $examplesDir
	for example in ${examples[@]}; do
	  	cd $example
	 	echo "Building $example"
		yarn build
		cd ..
	done
	cd ..
}

function fixViteForGHPages() {
	cd $examplesDir
	for example in ${examples[@]}; do
		cd $example
		cd dist
		# for some reason gh pages doesnt like "/assets/..." and instead "assets/..."
		# so remove the first slash on those examples
		replaceAll "index.html" "=\"\/" "=\""
		cd ..
	done
	cd ..
}

function deleteBuilds() {
	# go to each example and build them 
	cd $examplesDir
	for example in ${examples[@]}; do
	  	cd $example
	 	echo "Deleting $example build"
		rm -fr dist
		cd ..
	done
	cd ..
}

buildExamples
fixViteForGHPages
deleteBuilds
