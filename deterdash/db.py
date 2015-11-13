import logging
import yaml
from pymongo import MongoClient
from flask import g

log = logging.getLogger(__name__)

magi_db_name_no_namespace_clash = None

def db_server():
    global magi_db_name_no_namespace_clash
    name = getattr(g, 'magi_db_servername', None)
    if not name:
        if magi_db_name_no_namespace_clash:
           g.magi_db_servername = name = magi_db_name_no_namespace_clash
           return name

        with open('/var/log/magi/config/experiment.conf', 'r') as fd:
            expconf = yaml.safe_load(fd)

        if 'dbdl' not in expconf:
            log.critical('did not file database config in experiment.conf')
            exit(1)

        if 'configHost' in expconf['dbdl']:
            g.magi_db_servername = name = expconf['dbdl']['configHost']
            magi_db_name_no_namespace_clash = name
        elif 'sensorToCollectorMap' in expconf['dbdl']:
            if '__DEFAULT__' not in expconf['dbdl']['sensorToCollectorMap']:
                log.critical('no default collector in experiment.conf')
                exit(2)
            else:
                g.magi_db_servername = name = expconf['dbdl']['sensorToCollectorMap']['__DEFAULT__']
                magi_db_name_no_namespace_clash = name
        else:
            log.critical('Unable to find database server in experiment.conf')
            exit(3)

        # log.info('Found database server name: {}'.format(name))

    return name

def magi_db():
    db = getattr(g, 'magi_db_client', None)
    if not db:
        server_name = db_server()
        client = MongoClient(server_name, 27018)
        if not client:
            log.critical('Unable to contact db server on {}.'.format(server_name))
            return None

        g.magi_db_client = db = client['magi']

    return db

