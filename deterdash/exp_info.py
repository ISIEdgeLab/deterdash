import logging
import time
import json
import pymongo
from db import magi_db

log = logging.getLogger(__name__)

def get_exp_info():
    db = magi_db()
    # example data:
    # {
    #         "_id" : ObjectId("562a93cc7e1ce204b7f9d6cd"),
    #         "is_container" : true,
    #         "created" : 1445630924.271356,
    #         "agent" : "node_stats",
    #         "project" : "edgect",
    #         "host" : "sunnydale",
    #         "experiment" : "viztest",
    #         "type" : "nodeinfo"
    # }
    cursor = db.experiment_data.find({
        'table_type': 'ns_nodeinfo',
    }, {
        '_id': False,
        'created': False,
        'agent': False
    })

    data = {}
    rows = list(cursor)
    for row in rows:
        if 'project' not in data:
            data['project'] = row['project']
        
        if 'experiment' not in data:
            data['experiment'] = row['experiment']

        data[row['host']] = {'is_container': row['is_container']}

    cursor = db.experiment_data.find({
        'table_type': 'ns_users',
        'creator' : { "$ne": None }
    }, {
        '_id': False,
        'creator': True,
        'swapper': True
    }).sort('created', pymongo.DESCENDING).limit(1)

    if cursor.count():
        data['creator'] = cursor[0]['creator']
        data['swapper'] = cursor[0]['swapper']

    return data

def get_exp_nodes():
    db = magi_db()
    cursor = db.experiment_data.find_one({'agent': 'topo_agent'})  # This agent name is hardcoded in Magi.

    if not cursor or 'nodes' not in cursor:
        return None

    nodes = json.loads(cursor['nodes'])  # json encoded in the DB for some reason. In a json oriented DB no less.
    return nodes

def get_node_info(name):
    '''Return information about the node.'''
    db = magi_db()
    retval = {'name': name}
    cursor = db.experiment_data.find({
        'table_type': 'ns_ports',
        'host': name
    }, {
        '_id': False,
        'ports': True,
        'created': True
    }).sort('created', pymongo.DESCENDING)

    if cursor.count():
        retval['ports'] = cursor[0]['ports'] 
        retval['timestamp'] = cursor[0]['created']

    cursor = db.experiment_data.find({
        'table_type': 'ns_users',
        'host': name
    }, {
        '_id': False,
        'uptime': True,
        'users': True,
        'created': True
    }).sort('created', pymongo.DESCENDING).limit(1)

    if cursor.count():
        log.debug('found uptime/users: {}'.format(cursor[0]))
        retval['uptime'] = cursor[0]['uptime']
        retval['users'] = cursor[0]['users']
        retval['timestamp'] = cursor[0]['created']

    return retval
