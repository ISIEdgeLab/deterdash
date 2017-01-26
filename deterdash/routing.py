import logging
import pymongo
import json

from db import magi_db

log = logging.getLogger(__name__)

def get_route_tables(node, table_type):
    log.debug('getting {} table for node {}.'.format(table_type, node))
    db = magi_db()
    cursor = db.experiment_data.find(
        {
            'agent': 'routes_agent',    # GTL TODO: FIX - pass agent name from client or somewhere.
            'router': node,
            'table_type': table_type
        },
        {
            'routes': True
        }
    ).sort('created', pymongo.DESCENDING).limit(1)

    if cursor.alive and cursor.count():
        if 'routes' in cursor[0]:
            return cursor[0]['routes']

    return None

def _get_type_nodes(node_type):
    '''Return a list of click nodes in this experiment.'''
    db = magi_db()
    table_type = 'node_type'
    cursor = db.experiment_data.find(
        {
            'agent': 'routes_agent',    # GTL FIX THIS.
            'table_type': table_type,
        }, 
        {
            '_id': False,
            'types': True,
            'name': True
        });

    if cursor.count():
        return [c['name'] for c in cursor if node_type in c['types']]

    return []

def _get_network_edge_map():
    db = magi_db()
    table_type = 'network_edge_map'
    cursor = db.experiment_data.find({
        'agent': 'routes_agent',       # GTL FIX TODO
        'table_type': table_type
    }).sort('created', pymongo.DESCENDING).limit(1)

    if cursor.count():
        return cursor[0]['map']

    return []

def _get_p2p_routes(node):
    db = magi_db()
    table_type = 'point2point'
    cursor = db.experiment_data.find({
        'agent': 'routes_agent',    # GTL FIX TODO
        'router': node,
        'table_type': table_type
    }, {
        'routes': True,
        'router': True,
        '_id': False
    }).sort('created', pymongo.DESCENDING).limit(1)

    if cursor.count():
        return cursor[0]['routes']

    return []


def get_route_path(src, dst):
    log.debug('looking for path from {} to {}'.format(src, dst))

    routes = _get_p2p_routes(src)
    path = [src]
    cur_hop = src
    complete = False
    network_edge_map = _get_network_edge_map()

    while routes:
        # go through routes and find the next hop for the dst
        next_hop = None
        for route in routes:
            if route['dst_name'] == dst:
                next_hop = route['next_hop_name']
                if next_hop:
                    break       # there can be more than one route as dst may have more than
                                # one address. So we use the first one we find.

        if not next_hop:
            log.debug('next hop to {} from {} not found.'.format(dst, path[-1]))
            break
        
        # If the next hop is into a virtual network (click), then use the virtual next hop
        # instead of the physcial host.
        if cur_hop in network_edge_map:
            # The edge map supports multihomed hosts by having list of entry points into the 
            # virtual network. We DO NOT check for that here at the moment though. We just find
            # the first matching route/link and use that. Ideally we'd be tracking
            # links used to get to the next hop here and use that information
            # to choose the correct next_hop name based on that. If the phy host is
            # multihomed, we'd use that link name to choose the proper next hop.
            for edge_entry in network_edge_map[cur_hop]:
                if next_hop == edge_entry['nbr_host']:    # next hop == vrouter
                    next_hop = edge_entry['nbr']
                    break

        # check for loops and bail if found.
        if next_hop in path:
            log.warn('found loop in path ({}). returning partial path.'.format(next_hop))
            return complete, path

        path.append(next_hop)
        log.debug('next hop to {}: {}'.format(dst, next_hop))
        if next_hop == dst:
            complete = True
            break

        # set the routes to next hop's route information.
        routes = _get_p2p_routes(next_hop)
        cur_hop = next_hop

    return complete, path

def _get_click_link_to(name, db, table_type):
    cursor = db.experiment_data.find({
        'agent': 'routes_agent',
        'table_type': table_type,
        'routes.next_hop': name
    }, {
        '_id': False,
        'router': True
    }).sort('created', pymongo.DESCENDING)
