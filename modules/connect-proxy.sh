
start_proxy() {
set +e
if ! command -v pm2 &> /dev/null
then
    echo "pm2 could not be found. Installing it now..."
    npm i -g pm2@"^5.3.0"
fi
# Check if the app is already running
if pm2 list | grep -q "proxy-server"; then
    echo "App is already running."
else
    # Start the app
    pm2 start ./modules/proxy.js --name proxy-server
    echo "App started."
fi
set -e
}


stop_proxy() {
set +e
pm2 delete proxy-server
if [ $? -ne 0 ]; then
  echo "Process is stopped"
fi
set -e
}

"$@"

