import logging
import pymongo
import json

from libdeterdash import DeterDashboard
from db import magi_db

log = logging.getLogger(__name__)

def _get_topo_keys_in_a_stupid_way(agent):
    # If I call DeterDashboard.get_topology_keys() the non topo_agent topo keys are not found
    # for reasons I don't understand. So this stupid function is here to grab them by hand 
    # using stupid god damn hardcoded values. Urgh.
    db = magi_db()
    cursor = db.experiment_data.find({
        'table': agent,
        'agent': DeterDashboard.viz_data_table,
        'datatype': DeterDashboard.force_directed_graph_type
    }).sort('created', pymongo.DESCENDING).limit(1)

    if cursor.count():
        return cursor[0]['node_key'], cursor[0]['edges_key'], cursor[0]['extra_keys']

    return None, None, None


def get_topology(agent):
    # grab the topo from the magi inserted data.
    # dash = DeterDashboard()
    log.debug('getting topo table keys for agent {}'.format(agent))
    # node_key, edge_key, extra_keys = dash.get_topology_keys(agent)
    node_key, edge_key, extra_keys = _get_topo_keys_in_a_stupid_way(agent)

    if not node_key:
        log.error('No node,edge keys in database for agent {}. Does it support a topology type?'.format(agent))
        log.debug('keys found: {}, {}, {}'.format(node_key, edge_key, extra_keys))

    log.debug('using keys ({}, {}, {}) to get nodes,edges data.'.format(node_key, edge_key, extra_keys))
    db = magi_db()
    search_keys = {'agent': agent}
    if extra_keys:
        for key, value in extra_keys.iteritems():
            search_keys[key] = value

    cursor = db.experiment_data.find(
        search_keys,
        {'_id': False, node_key: True, edge_key: True}
    ).sort('created', pymongo.DESCENDING).limit(1)

    if cursor.alive and cursor.count():
        # topo_agent keeps them in json for some reason. So decode if we need to.
        nodes = cursor[0][node_key]
        edges = cursor[0][edge_key]
        log.debug('nodes type: {}. Nodes: {}'.format(type(nodes), nodes))
        log.debug('edges type: {}.'.format(type(edges)))
        if isinstance(nodes, str) or isinstance(nodes, unicode):
            try:
                return json.loads(nodes), json.loads(edges)
            except TypeError:
                log.error('Unable to decode json encoded nodes and edges.')
        else:
            return nodes, edges

    return [], []
