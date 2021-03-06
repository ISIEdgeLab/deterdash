#!/usr/bin/env bash

#
# install and run the deterdash server. 
# -------------------------------------
# This file will start the Deterdash serverm if run. It is meant to be
# a simple way to start the server via an NS file or one-time run init/boot script
# on any DETER node. IT assumes the git repo for the server is at:
#
#   /proj/edgect/share/deterdash
#
# It assumes nothing else and will install needed libs and utils. 
#

# check user permissions
# install git
# checkout the deterdash repo
# install deterdash dependencies
# start webserver
# start websocketd
# (do we also want to start a few agents? If so, how do we do that from the control node?)

DASHDIR=${DASHDIR:-/share/deterdash}
REPODIR=${DASHDIR}/current

LIBDETERDASH_INSTALL=${LIBDETERDASH_INSTALL:-/share/deterdash/packages/libdeterdash.install}
AGENTS_DIR=${AGENTS_DIR:-/proj/edgect/magi/modules}

while getopts :e:m:p:ix:irvkchs opt; do
	case $opt in
        a) AGENTS_DIR=$OPTARG
            ;;
        h) echo $(basename $0) -a /path/to/agents_dir \[-h\]
            exit 1
            ;;
    esac
done

if [[ $(hostname -s) == users ]]; then 
    echo Do not run this script on users. Run it as root on a control node in an experiment.
    exit 3
fi

if [[ $(id -u) != 0 ]]; then
    echo This script must be run as root. Exiting.
    exit 5
fi

if ! grep "DISTRIB_ID=Ubuntu" /etc/lsb-release > /dev/null 2>&1; then
    # we use start-stop-daemon, which is ubuntu only I believe.
    echo This script should only be run on Ubuntu machines. 
fi

if ! hash python > /dev/null 2>&1; then
    echo Trying to install python although it should have already been installed. 
    if sudo apt-get install -y python > /dev/null 2>&1; then   # GTL this is probably not the right apt-get command.
        echo Error installing python. 
        exit 7
    fi
fi

if ! hash git > /dev/null 2>&1; then
    echo Installing git.
    if ! apt-get install -y git > /dev/null 2>&1; then
        echo Unable to install git.
        exit 10
    fi
fi

# get us some space to work with. 
dev_space=$(sudo fdisk -l | grep Empty | head -1 | awk '{print $1}')
if [[ -z ${dev_space} ]]; then 
    echo Unable to find empty partition, falling back to using /tmp.
    mount_dir=/tmp
else
    echo Found empty partition at ${dev_space}
    if grep ${dev_space} /proc/mounts > /dev/null 2>&1; then
        echo ${dev_space} mounted. Not remounting.
    else
        echo Mounting /space.
        mkfs.ext4 ${dev_space} > /dev/null 2>&1
        mkdir /space > /dev/null 2>&1
        chmod 777 /space > /dev/null 2>&1
        mount ${dev_space} /space > /dev/null 2>&1

    fi

    # just in case someone mounted it elsewhere. 
    mount_dir=$(grep ${dev_space} /proc/mounts 2>/dev/null | awk '{print $2}')
fi

if [[ ! -e ${mount_dir} ]]; then 
    echo ${mount_dir} does not exist. Unable to continue.
    exit 13;
fi

if ! pushd ${mount_dir} > /dev/null 2>&1; then
    echo Unable to cd to ${mount_dir} Exiting
    exit 15
fi

# update on rerun.
if [[ -e ${mount_dir}/deterdash ]]; then 
    echo Updating deterdash repository before restarting.
    (cd ${mount_dir}/deterdash && git pull)
else
    if ! git clone ${REPODIR} ${mount_dir}/deterdash > /dev/null 2>&1; then
        echo Unable to clone deterdash. Exiting.
        exit 20
    else
        echo Cloned deterdash.
    fi
fi

# Install dependencies of deterdash (stolen from deterdash run.sh script).
for p in python-flask python-pymongo python-enum34; do
    if [ $(dpkg-query -W -f='${Status}' ${p} 2>/dev/null | grep -c "ok installed") -eq 0 ]; then
        if ! apt-get install -y ${p} > /dev/null 2>&1; then 
            echo Error installing ${p}.
            exit 26
        fi
    fi
done

# GTL - hacky!
python -c 'import libdeterdash' 2>&1 | grep ImportError > /dev/null
if [[ $? -ne 1 ]]; then 
    echo ${LIBDETERDASH_INSTALL} /tmp $(dirname ${LIBDETERDASH_INSTALL})
    ${LIBDETERDASH_INSTALL} /tmp $(dirname ${LIBDETERDASH_INSTALL})
    python -c 'import libdeterdash' 2>&1 | grep ImportError > /dev/null
    if [[ $? -ne 1 ]]; then
        echo Error installing libdeterdash.
        exit 30
    fi
fi

# start the webserver as a daemon.
# we want to restart if running so stop it first then start.
pkill -f runserver   # I could not get --stop to work properly. Nuke from orbit.
PIDFILE=/var/run/deterdash.pid
start-stop-daemon --start --quiet --make-pidfile --pidfile ${PIDFILE} --background \
    --startas /bin/bash -- -c "exec ${mount_dir}/deterdash/runserver.py -l debug -a ${AGENTS_DIR} > /var/log/deterdash 2>&1"

start-stop-daemon --status --quiet --pidfile ${PIDFILE} > /dev/null 2>&1
ev=$?
if [[ ${ev} -ne 0 ]]; then 
    echo Error starting deterdash: ${ev}
    exit 35
else
    echo deterdash started.
fi

# copy over and run websocketd.
echo Copying websocketd.
mkdir ${mount_dir}/websocketd > /dev/null 2>&1 
pushd ${mount_dir}/websocketd > /dev/null 2>&1
cp ${DASHDIR}/packages/websocketd*.zip . > /dev/null 2>&1
unzip websocketd* > /dev/null 2>&1
echo Running websocketd on port 5001
./websocketd --port 5001 ${mount_dir}/deterdash/orch_magi_orch.py -l debug >> /var/log/magi_orchestration.log 2>&1 &
popd > /dev/null 2>&1

# ...and we might as well do this in case it's not been done elsewhere.
echo Indexing Magi database.
${DASHDIR}/bin/createMagiDBIndexes.sh > /dev/null 2>&1

# # wait a few seconds and see if it's still running. 
# echo Pausing 5 second to confirm deterdash is still running...
# sleep 5
# 
# start-stop-daemon --status --pidfile ${PIDFILE}
# ev=$?
# 
# if [[ ${ev} -eq 1 ]]; then 
#     rm -f ${PIDFILE} > /dev/null 2>&1
# fi
# 
# if [[ ${ev} -ne 0 ]]; then 
#     echo Deterdash has stopped. Please look in /var/log/deterdash for details.
#     exit 40
# fi

echo Deterdash is running. 

### GTL NOTE THE CODE BELOW DOESN'T actually work well as there is a dependency on 
### Magi being started/installed which is not taken into account. Until deterdash is 
### uncoupled from Magi or Magi is integrated into upstart/init, this won't work 
### well.
# if [[ ! -e /etc/init/deterdash.conf ]]; then 
#     echo Creating /etc/init scripts to restart deterdash on reboot.
# 
#     # Note there are embedded tabs in there here documents! Do not remove them.
# 	cat >> /etc/init/deterdash.conf <<-EOF
# 		description "deterdash"
# 		start on runlevel [2345]
# 		respawn
# 	EOF
# 
# 	cat >> /etc/init.d/deterdash <<-EOF
# 		#!/bin/sh
# 		
# 		. /lib/lsb/init-functions
# 		    
# 		case \$1 in 
# 		    start) 
# 		        log_daemon_msg "Starting deterdash"
# 		        start-stop-daemon --start --quiet --make-pidfile --pidfile ${PIDFILE} --background \\
# 		               --startas /bin/bash -- -c "exec ${mount_dir}/deterdash/runserver.py -l debug > /var/log/deterdash 2>&1"
# 		        log_end_msg 0
# 		        exit 0
# 		        ;;
# 		    stop) 
# 		        log_daemon_msg "Starting deterdash"
# 		        start-stop-daemon --stop --quiet --pidfile ${PIDFILE}
# 		        log_end_msg 0
# 		        exit 0
# 		        ;;
# 		    status)
# 		        start-stop-daemon --status --pidfile ${PIDFILE}
# 		        exit \$?
# 		        ;;
# 		    *)
# 		        echo "Usage: "\$1" {start|stop}"
# 		        exit 1
# 		        ;;
# 		esac
# 		
# 		exit 0
# 	EOF
# fi

# \o/
exit 0
