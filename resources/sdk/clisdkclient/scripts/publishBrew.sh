SDK_GIT_REPO_ARCHIVE=$1
TAP_REPO=$2
IS_NEW_RELEASE=$3
VERSION=$4

echo "SDK_GIT_REPO_ARCHIVE=$SDK_GIT_REPO_ARCHIVE"
echo "TAP_REPO=$TAP_REPO"
echo "IS_NEW_RELEASE=$IS_NEW_RELEASE"
echo "VERSION=$VERSION"

if [ ! "$IS_NEW_RELEASE" = "true" ]
then
	echo "Skipping brew update"
	exit 0
fi

# calculate sha256
TARBALL=${VERSION}.tar.gz
wget ${SDK_GIT_REPO_ARCHIVE}/${TARBALL}

if [ $(uname) = "Darwin" ]
then
    SED_I_FLAG="-i ''"
    SHASUM="shasum -a 256"
else
    SED_I_FLAG="-i"
    SHASUM="sha256sum"
fi

SHA_OUTPUT=$(${SHASUM} ${TARBALL})
SHA=$(echo ${SHA_OUTPUT} | cut -d' ' -f1)

FULL_TAG_REPO="https://${GITHUB_TOKEN}@${TAP_REPO}"

if [ -d "./tap_repo" ]
    rm -rf tap_repo
fi

git clone ${FULL_TAG_REPO} tap_repo
cd tap_repo

sed ${SED_I_FLAG} -e "s|url .*|url \"${SDK_GIT_REPO_ARCHIVE}/${TARBALL}\"|g" gc.rb
sed ${SED_I_FLAG} -e "s|sha256 .*|sha256 \"${SHA}\"|g" gc.rb
git add gc.rb

git commit -m "${VERSION}"
git push