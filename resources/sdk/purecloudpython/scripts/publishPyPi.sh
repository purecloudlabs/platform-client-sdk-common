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
echo "PIP setuptools version info (1):"
pip show setuptools
echo "Installing pip, setuptools..."
pip install --user -U pip setuptools
echo "PIP setuptools version info (2):"
python -m pip show setuptools

# Publish egg on PyPi
echo "Registering egg..."
python setup.py register -r pypi-sdk
echo "Uploading egg..."
python setup.py sdist upload -r pypi-sdk