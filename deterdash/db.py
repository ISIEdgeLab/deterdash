import logging
import yaml
from time import sleep

from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from flask import g

log = logging.getLogger(__name__)

magi_db_name_no_namespace_clash = None

def db_server():
    global magi_db_name_no_namespace_clash
    name = getattr(g, 'magi_db_servername', None)
    port = getattr(g, 'magi_db_port', None)
    if not name:
        if magi_db_name_no_namespace_clash:
           g.magi_db_servername = name = magi_db_name_no_namespace_clash[0]
           g.magi_db_port = port = magi_db_name_no_namespace_clash[1]
           return name, port

        with open('/var/log/magi/config/experiment.conf', 'r') as fd:
            expconf = yaml.safe_load(fd)

        if 'dbdl' not in expconf:
            log.critical('did not find database config in experiment.conf')
            exit(1)

        if 'configHost' in expconf['dbdl']:
            g.magi_db_servername = name = expconf['dbdl']['configHost']
            g.magi_db_port = port = expconf['dbdl']['collectorPort']
            magi_db_name_no_namespace_clash = (name, port)
        elif 'sensorToCollectorMap' in expconf['dbdl']:
            if '__DEFAULT__' not in expconf['dbdl']['sensorToCollectorMap']:
                log.critical('no default collector in experiment.conf')
                exit(2)
            else:
                g.magi_db_servername = name = expconf['dbdl']['sensorToCollectorMap']['__DEFAULT__']
                g.magi_db_port = port = expconf['dbdl']['collectorPort']
                magi_db_name_no_namespace_clash = (name, port)
        else:
            log.critical('Unable to find database server in experiment.conf')
            exit(3)

        # log.info('Found database server name: {}'.format(name))

    return name, port

def magi_db():
    db = getattr(g, 'magi_db_client', None)
    if not db:
        server_name, server_port = db_server()
        client = None
        while True:
            try: 
                client = MongoClient(server_name, server_port)
            except ConnectionFailure as e:
                log.info('Unable to connect to the db: {}'.format(e))
                log.info('Sleeping for awhile and trying again.')
                sleep(5)
                continue

            if not client:
                log.critical('Unable to contact db server on {}.'.format(server_name))
                return None

            break   # We've got a database. We can continue.
        
        g.magi_db_client = db = client['magi']

    return db

