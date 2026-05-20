
## installation 

run "npm install" for node_modules

run "npm run tauri dev" to launch the application

## if any of the file permissions are revoked run:
sudo setcap cap_net_raw,cap_net_admin+eip /usr/bin/python3.13

sudo setcap cap_net_raw,cap_net_admin+eip ../SENTINALX/src-tauri/prog/portscanning

sudo setcap cap_net_raw,cap_net_admin+eip ../SENTINALX/src-tauri/prog/hostdisc

sudo setcap cap_net_raw,cap_net_admin+eip ../SENTINALX/src-tauri/prog/portlisten
