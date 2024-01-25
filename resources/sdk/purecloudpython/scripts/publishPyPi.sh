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

echo "Upgrading PIP"
python3.6 -m pip install --upgrade --user pip

echo "Installing Twine and Wheel"
python3.6 -m pip install twine wheel setuptools --user --upgrade


echo "Creating the distribution package"
python3.6 setup.py sdist bdist_wheel

echo "Running twine check"
python3.6 -m twine check dist/*

echo "uploading to the pypi test server"
python3.6 -m twine upload --repository-url https://test.pypi.org/legacy/ dist/* -u __token__ -p $TEST_PYPI_TOKEN

echo "uploading to the pypi prod server"
python3.6 -m twine upload --repository-url https://upload.pypi.org/legacy/ dist/* -u __token__ -p $PROD_PYPI_TOKEN
