#!/bin/bash

OUTPUT_DIR=$1
TEMP_DIR=$2
CDN=$3
IS_NEW_RELEASE=$4
VERSION=$5

echo "OUTPUT_DIR=$OUTPUT_DIR"
echo "TEMP_DIR=$TEMP_DIR"
echo "CDN=$CDN"
echo "IS_NEW_RELEASE=$IS_NEW_RELEASE"
echo "VERSION=$VERSION"

if [ ! "$IS_NEW_RELEASE" = "true" ]
then
	echo "Skipping deployment"
	exit 0
fi

cd $TEMP_DIR

# Publish to S3
if [ "$DEPLOY_TO_S3" = "true" ]
then
	echo "Deleting latest folder contents..."
	# macOS
	aws s3 rm \
		s3://inin-index-files-prod/developercenter-cdn/$CDN/go-cli/darwin/latest \
		--recursive
	# linux
	aws s3 rm \
		s3://inin-index-files-prod/developercenter-cdn/$CDN/go-cli/linux/latest \
		--recursive
	# windows
	aws s3 rm \
		s3://inin-index-files-prod/developercenter-cdn/$CDN/go-cli/windows/latest \
		--recursive

	echo "Deploying gc binaries to S3, version=$VERSION"
	# macOS
	aws s3 cp "$OUTPUT_DIR/bin/gc" \
		s3://inin-index-files-prod/developercenter-cdn/$CDN/go-cli/darwin/$VERSION/gc \
		--acl "public-read"
	aws s3 cp "$OUTPUT_DIR/bin/gc" \
		s3://inin-index-files-prod/developercenter-cdn/$CDN/go-cli/darwin/latest/gc \
		--acl "public-read" --cache-control max-age=0

	# linux
	aws s3 cp "$OUTPUT_DIR/bin/gc_linux_amd64" \
		s3://inin-index-files-prod/developercenter-cdn/$CDN/go-cli/linux/$VERSION/gc \
		--acl "public-read"
	aws s3 cp "$OUTPUT_DIR/bin/gc_linux_amd64" \
		s3://inin-index-files-prod/developercenter-cdn/$CDN/go-cli/linux/latest/gc \
		--acl "public-read" --cache-control max-age=0

	# windows
	aws s3 cp "$OUTPUT_DIR/bin/gc.exe" \
		s3://inin-index-files-prod/developercenter-cdn/$CDN/go-cli/windows/$VERSION/gc.exe \
		--acl "public-read"
	aws s3 cp "$OUTPUT_DIR/bin/gc.exe" \
		s3://inin-index-files-prod/developercenter-cdn/$CDN/go-cli/windows/latest/gc.exe \
		--acl "public-read" --cache-control max-age=0
else
	echo "Skipping S3 deployement"
fi