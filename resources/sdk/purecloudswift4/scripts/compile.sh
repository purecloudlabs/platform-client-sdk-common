SDK_REPO=$1
BUILD_DIR=$2
RESOURCE_DIR=$3

echo "SDK_REPO=$SDK_REPO"
echo "BUILD_DIR=$BUILD_DIR"
echo "RESOURCE_DIR=$RESOURCE_DIR"



echo "Beep. Boop. Look at me! I'm a computer compiling things!"


mkdir "$BUILD_DIR/docs"
touch "$BUILD_DIR/README.md" 
cp "$BUILD_DIR/README.md" "$BUILD_DIR/docs/index.md"
