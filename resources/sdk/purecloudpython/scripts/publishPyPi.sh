INDEX_SERVER=$1
IS_NEW_RELEASE=$2
VERSION=$3

echo "INDEX_SERVER=$INDEX_SERVER"
echo "IS_NEW_RELEASE=$IS_NEW_RELEASE"
echo "VERSION=$VERSION"

if [ ! "$IS_NEW_RELEASE" = "true" ]
then
	echo "Skipping PyPi deploy"
	exit 0
fi

# Reinstall virtualenv becuase of corrupt installation on the jenkins executor
echo "Force reinstall of virtualenv"
pip install --force-reinstall virtualenv

# Upgrade to latest version of setuptools
echo "PIP setuptools version info (1):"
python -m pip show setuptools
echo "Installing pip, setuptools..."
python -m pip install --user -U pip setuptools
echo "PIP setuptools version info (2):"
python -m pip show setuptools

# Publish egg on PyPi
echo "Registering egg..."
python setup.py register -r $INDEX_SERVER
echo "Uploading egg..."
python setup.py sdist upload -r $INDEX_SERVER
