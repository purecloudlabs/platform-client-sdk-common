# Publish egg on PyPi
python setup.py register -r pypi-sdk
python setup.py sdist upload -r pypi-sdk