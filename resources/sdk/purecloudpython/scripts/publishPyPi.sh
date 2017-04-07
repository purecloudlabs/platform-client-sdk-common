IS_NEW_RELEASE=$7
VERSION=$8

echo "IS_NEW_RELEASE=$IS_NEW_RELEASE"
echo "VERSION=$VERSION"

if [ ! "$IS_NEW_RELEASE" = "true" ]
then
	echo "Skipping PyPi deploy"
	exit 0
fi

# Publish egg on PyPi
python setup.py register -r pypi-sdk
python setup.py sdist upload -r pypi-sdk