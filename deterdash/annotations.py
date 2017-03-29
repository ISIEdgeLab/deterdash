import logging
import pymongo
import json

from libdeterdash import DeterDashboard
from db import magi_db

log = logging.getLogger(__name__)

def get_topo_anno_units(agent):
    # example viz_data entry for the topology_annotation type.
    #    { "_id" : ObjectId("58b5a28091cbf15823d0e579"), "created" : 1488298624.750974, 
    # "datatype" : "topology_annotation", "agent" : "viz_data", "host" : "vrouter", "key" : "edge", 
    # "table" : "routes_agent", "data_key" : [ 
    #           { "data_key" : "bandwidth", "display" : "Bandwidth", "unit" : "bytes/second" },
    #           { "data_key" : "latency", "display" : "Latency", "unit" : "ms" },
    #           { "data_key" : "drops", "display" : "Packet Drops", "unit" : "number" },
    #           { "data_key" : "drop_prob", "display" : "Drop Probability", "unit" : "%" },
    #           { "data_key" : "capacity", "display" : "Link Capacity", "unit" : "ask Erik" } ],
    #   "display" : "Click Configuration" } 
    db = magi_db()
    col = db.experiment_data.find_one({
        'datatype': 'topology_annotation',
        'table': agent,
        'agent': 'viz_data'
    }, {
        '_id': False,
        'data_key': True,
        'display': True
    })

    if not col:
        return None, None

    return col['display'], col['data_key']


def get_topology_annotations(agent, key):
    log.debug('getting topo annotations for agent {}'.format(agent))
    # example annotation datapoint.
    #     "_id" : ObjectId("58b5a28a91cbf15823d0e58f"),
    #     "created" : 1488298634.249465,
    #     "host" : "vrouter",
    #     "agent" : "routes_agent",
    #     "bandwidth" : "12500000",
    #     "edge" : [
    #             "router5",
    #             "router6"
    #     ]

    # first find distinct edges, then query newest data per key. This is 
    # probably a stupid way to do this, but it's easier for the client as
    # it can use the returned data as both set of edges and newest datapoints.
    db = magi_db()
    edges = db.experiment_data.find({ 'agent': agent, key: {'$exists': True}}).distinct('edge')
    data = []
    for edge in edges:
        cursor = db.experiment_data.find({
            'agent': agent,
            key: {'$exists': True},
            'edge': edge
        }).sort('created', pymongo.DESCENDING).limit(1)
            
        if cursor.alive and cursor.count():
            data.append({'edge': edge, 'value': cursor[0][key]})

    return data
