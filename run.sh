#!/usr/bin/env bash

# Use AGENTSDIR if set, else the dir below.
AGENTS_DIR=${AGENTS_DIR:-/users/glawler/src/edgect/magi/agents}

for p in python-flask python-pymongo; do
    if [ $(dpkg-query -W -f='${Status}' nano 2>/dev/null | grep -c "ok installed") -eq 0 ]; then
        apt-get install -y ${p}
    fi
done

if [[ ! -e /usr/local/lib/python2.7/dist-packages/libdeterdash-0.1.egg-info ]]; then 
    sudo /proj/edgect/magi/current/source/libdeterdash.install /tmp/ /proj/edgect/magi/current/source
fi

# now actually run it.
./runserver.py -l debug --agentdir ${AGENTS_DIR}
