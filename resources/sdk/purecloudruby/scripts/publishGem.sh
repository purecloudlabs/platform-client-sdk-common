BUILD_DIR=$1
GEM_NAME=$2
GEM_KEY=$3
IS_NEW_RELEASE=$4
VERSION=$5

echo "BUILD_DIR=$BUILD_DIR"
echo "GEM_NAME=$GEM_NAME"
echo "IS_NEW_RELEASE=$IS_NEW_RELEASE"
echo "VERSION=$VERSION"

# Why?
#export PATH=$PATH:/home/jenkins/bin

GEM_CREDENTIALS_FILE=~/.gem/credentials
GEM_KEY_NAME="developer_evangelists"

cd $BUILD_DIR

# Ensure credentials are available
if grep -Fq $GEM_KEY_NAME $GEM_CREDENTIALS_FILE
then
    echo "Found API key"
else
	echo "Adding API key"
    echo "\n:$GEM_KEY_NAME: $GEM_KEY" >> $GEM_CREDENTIALS_FILE
fi

# Ensure file has correct permissions
chmod 600 $GEM_CREDENTIALS_FILE
cat $GEM_CREDENTIALS_FILE

# Publish gem
gem push $GEM_NAME-$VERSION.gem --key $GEM_KEY_NAME
