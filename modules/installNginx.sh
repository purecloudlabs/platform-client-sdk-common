# #!/bin/bash
# Check the underlying OS

configure_nginx_linux() {
    # Update the package list and install proxy
   sudo yum install tinyproxy
   sudo service tinyproxy restart
    echo "Proxy installed."
}



configure_tinyproxy_mac() {
    brew update
    brew install tinyproxy
    brew services restart tinyproxy
}

if [[ "$(uname)" == "Darwin" ]]; then
    # Install Nginx on Mac using Homebrew
    echo "Installing Proxy Server"
    if command -v tinyproxy &> /dev/null
    then
        echo "Proxy is already installed."
    else
         configure_tinyproxy_mac
    fi
elif [[ "$(uname)" == "Linux" ]]; then
    # Install Nginx on Linux using apt-get
    echo "Installing Proxy Server"
    configure_nginx_linux
else
    echo "Unsupported operating system."
    exit 1
fi



