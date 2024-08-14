#!/bin/bash

# This script produces a listing of all the markdown files in the doc directory. The result is a
# JSON file containing an array of filenames (e.g. ["UsersApi.md"]). The resulting file is used 
# by the SDK doc viewer to generate the list of doc pages in the navigation.

DOCS_DIR=$1

echo "DOCS_DIR=$DOCS_DIR"

filenameRegex=".+\/([^/]+\.md)$"
filenames=()

# Look at files in the docs dir
for entry in "$DOCS_DIR"/*
do
	# Check for markdown files
	if [[ $entry =~ $filenameRegex ]]
	then
		# Append filename to the list
		filenames[${#filenames[@]}]="${BASH_REMATCH[1]}"
	else
		echo "ignoring $entry"
	fi
done

# Write index.json file
indexFilePath="$DOCS_DIR/index.json"
echo "Found ${#filenames[@]} pages, writing to $indexFilePath"
printf '%s\n' "${filenames[@]}" | jq -R . | jq -s . > $indexFilePath
