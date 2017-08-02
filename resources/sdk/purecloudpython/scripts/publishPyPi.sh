IS_NEW_RELEASE=$1
VERSION=$2

echo "IS_NEW_RELEASE=$IS_NEW_RELEASE"
echo "VERSION=$VERSION"

if [ ! "$IS_NEW_RELEASE" = "true" ]
then
	echo "Skipping PyPi deploy"
	exit 0
fi

# Upgrade to latest version of setuptools
pip install -U pip setuptools

# Publish egg on PyPi
python setup.py register -r pypi-sdk
python setup.py sdist upload -r pypi-sdk