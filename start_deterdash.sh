#!/usr/bin/env bash

#
# install and run the deterdash server. 
#

# check user permissions
# install git
# checkout the deterdash repo
# install deterdash dependencies
# start webserver
# (do we also want to start a few agents? If so, how do we do that from the control node?)

if [[ $(id -u) != 0 ]]; then
    echo This script must be run as root. Exiting.
    exit 5
fi

if ! grep "DISTRIB_ID=Ubuntu" /etc/lsb-release > /dev/nulli 2>&1; then
    # we use start-stop-daemon, which is ubuntu only I believe.
    echo This script should only be run on Ubunutu machines. 
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

# get us some space to work with. Very DETER specific.
if grep /dev/sda4 /proc/mounts > /dev/null 2>&1; then
    echo /dev/sda4 already mounted. Not remounting.
else
    echo Mounting /space.
    mkfs.ext4 /dev/sda4 > /dev/null 2>&1
    mkdir /space > /dev/null 2>&1
    chmod 777 /space > /dev/null 2>&1
    mount /dev/sda4 /space > /dev/null 2>&1

fi

# just in case someone mounted it elsewhere. 
mount_dir=$(grep /dev/sda4 /proc/mounts 2>/dev/null | awk '{print $2}')

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
    rm -rf ${mount_dir}/deterdash > /dev/null 2>&1; 
fi

if ! git clone /proj/edgect/share/deterdash > /dev/null 2>&1; then
    echo Unable to clone deterdash. Exiting.
    exit 20
else
    echo Cloned deterdash.
fi

# Install dependencies of deterdash (stolen from deterdash's run.sh script).
for p in python-flask python-pymongo; do
    if [ $(dpkg-query -W -f='${Status}' ${p} 2>/dev/null | grep -c "ok installed") -eq 0 ]; then
        if ! apt-get install -y ${p} > /dev/null 2>&1; then 
            echo Error installing ${p}.
            exit 26
        fi
    fi
done

if [[ ! -e /usr/local/lib/python2.7/dist-packages/libdeterdash-0.1.egg-info ]]; then 
    /proj/edgect/magi/current/source/libdeterdash.install /tmp/ \
            /proj/edgect/magi/current/source > /dev/null 2>&1

    if [[ ! -e /usr/local/lib/python2.7/dist-packages/libdeterdash-0.1.egg-info ]]; then 
        echo Error installing libdeterdash.
        exit 30
    fi
fi

# start the webserver as a daemon.
PIDFILE=${mount_dir}/deterdash/deterdash.pid
start-stop-daemon --start --quiet --make-pidfile --pidfile ${PIDFILE} --background \
    --startas /bin/bash -- -c "exec ${mount_dir}/deterdash/runserver.py -l debug > /var/log/deterdash 2>&1"

if [[ $? -ne 0 ]]; then 
    echo Error starting deterdash.
    exit 35
else
    echo deterdash started.
fi

# wait a few seconds and see if it's still running. 
echo Pausing 5 second to confirm deterdash is still running...
sleep 5

start-stop-daemon --status --pidfile ${PIDFILE}
ev=$?

if [[ ${ev} -eq 1 ]]; then 
    rm -f ${PIDFILE} > /dev/null 2>&1
fi

if [[ ${ev} -ne 0 ]]; then 
    echo Deterdash has stopped. Please look in /var/log/deterdash for details.
    exit 40
fi

echo Deterdash is running. 

# \o/
exit 0
