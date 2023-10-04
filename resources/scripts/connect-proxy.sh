
start_proxy() {
set +e
if ! command -v pm2 &> /dev/null
then
    echo "pm2 could not be found. Installing it now..."
    npm install pm2 -g
fi
# Check if the app is already running
if pm2 list | grep -q "proxy-server"; then
    echo "App is already running."
else
    # Start the app
    pm2 start ./resources/scripts/pm2.config.cjs
    echo "App started."
fi
set -e
}


stop_proxy() {
    set +e
    if ! command -v pm2 &> /dev/null; then
        echo "pm2 is not installed. Exiting..."
        exit 0
    fi

    if pm2 list | grep -q "proxy-server"; then
        pm2 delete proxy-server
        echo "Process proxy-server is stopped."
    else
        echo "process proxy-server is not running."
    fi
    set -e
}

"$@"

