import logging
import pymongo
import json

from db import magi_db

log = logging.getLogger(__name__)

def get_nodes():
    # just grab the nodes from the most recent topo_agent insert.
    db = magi_db()
    cursor = db.experiment_data.find({'agent': 'topo_agent'},
                                     {'_id': False, 'nodes': True}).sort('created', pymongo.ASCENDING)
    if cursor.count():
        return json.loads(cursor[0]['nodes'])

    return []

def get_topology():
    # grab the topo from the magi inserted data.
    db = magi_db()
    cursor = db.experiment_data.find(
        {'agent': 'topo_agent'},
        {'_id': False, 'nodes': True, 'edges': True}).sort('created', pymongo.ASCENDING)

    if cursor.count():
        return json.loads(cursor[0]['nodes']), json.loads(cursor[0]['edges'])

    return [], []
