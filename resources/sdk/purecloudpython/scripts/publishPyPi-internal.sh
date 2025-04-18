## The internal build publish to JFrog.  The external builds publish to PyPi which uses a completely different auth mechanism now (e.g. tokens)

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
python3.9 -m pip install --upgrade --user pip

echo "Installing Twine and Wheel"
python3.9 -m pip install twine wheel setuptools --user --upgrade

echo "Creating the distribution package"
python3.9 setup.py sdist

echo "Running twine check"
python3.9 -m twine check dist/*

echo "uploading to the pypi server"
python3.9 -m twine upload --repository $INDEX_SERVER dist/*
