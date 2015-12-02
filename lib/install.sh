#!/usr/bin/env bash

STAGINGDIR=/proj/edgect/magi/current/source

if [[ $(hostname -s) == users ]]; then
    echo Staging tar file on users.
    tar zcvf ${STAGINGDIR}/libdeterdash.tgz libdeterdash &> /dev/null 
    if [[ $? -ne 0 ]]; then
        echo Error stating tarfile.
    fi
else
    echo Installing libdeterlab on $(hostname -s)
    sudo ${STAGINGDIR}/libdeterdash.install /tmp ${STAGINGDIR}
fi
