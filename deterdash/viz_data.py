import logging
import time
from db import magi_db
from magi.testbed import testbed
from libdeterdash import DeterDashboard

log = logging.getLogger(__name__)


def load_default_viz_ui_types():
    '''Load the standard supported graph types and instances. These only come from
    the deafult Magi-loaded agents. It also loads (creates) the offically supported
    UI types (time_plot, etc).'''
    # Horizon Chart API:
    #   data: nodes + datapoints over time.
    #   ui: display name. extent estimate.

    # Topology API:
    #   data: node or link + datapoint (newest displayed)
    #   ui: display name
    viz_ui_name = 'viz_ui'
    viz_types = [
        {
            'datatype': DeterDashboard.time_plot_type,
            'display': 'Time Plots',
            'icon': 'fa-clock-o',
            'endpoint': 'timeplots',
            'implementation': 'time_plots.html'
        },
        {
            'datatype': DeterDashboard.force_directed_graph_type,
            'display': 'Network Graphs',
            'icon': 'fa-sitemap',
            'endpoint': 'graphs',
            'implementation': 'force_graph.html'
        }
    ]

    db = magi_db()
    collection = db.experiment_data
    for t in viz_types:
        log.debug('inserting viz datatype: {}'.format(t))
        t.update({  # add keys MAGI expects.
            'host': testbed.nodename,
            'created': time.time(),
            'agent': viz_ui_name})

        collection.update({'agent': viz_ui_name,
                           'host': testbed.nodename,
                           'datatype': t['datatype']},
                          t,
                          upsert=True)

    # now add the locally supported graph instance, "topology"
    dashboard = DeterDashboard()
    dashboard.add_topology('Topology', 'topo_agent', 'nodes', 'edges')


def get_viz_ui_types():
    db = magi_db()
    cursor = db.experiment_data.find({'agent': 'viz_ui'}, {'_id': False})
    return list(cursor)


def get_viz_agent_nodes(datatype, agentname):
    db = magi_db()
    node_keys = db.experiment_data.find(
        {'agent': 'viz_data', 'datatype': datatype, 'table': agentname},
        {'_id': False}
    ).distinct('node_key')

    if not len(node_keys):
        return None

    # assuming one node is is a bad thing.
    nodes = db.experiment_data.find({'agent': agentname}, {'_id': False}).distinct(node_keys[0])
    nodes.sort()
    return nodes


def get_viz_agent(datatype, agentname):
    '''Get a specific agent. e.g. the pkt_count agent's data for time plot.'''
    db = magi_db()
    cursor = db.experiment_data.find(
        {'agent': 'viz_data', 'datatype': datatype, 'table': agentname},
        {'_id': False}
    ).sort([('created', 1)])

    return list(cursor)[0]


def get_viz_agents(datatype):
    '''Get all agents given a specific datatype (GUI instance, graph, chart, etc).'''
    db = magi_db()
    seen = []
    agents = []
    docs = db.experiment_data.find(
        {'agent': 'viz_data', 'datatype': datatype},
        {'_id': False}
    ).sort([('display', 1)])

    for doc in docs:
        if doc['table'] not in seen:
            agents.append(doc)
            seen.append(doc['table'])

    return agents

def get_node_viztypes(node):
    # db.experiment_data.find({agent: "viz_data", host: 'crypto1'})
    db = magi_db()
    finded = db.experiment_data.find(
        {'agent': 'viz_data', 'host': node}, {'_id': False})

    if not finded:
        return None

    # "schema": 
    types = []
    for row in finded:
        if row['datatype'] == 'time_plot':
            for unit in row['units']:
                # type not needed yet, but will be.
                types.append(
                    {'type': row['datatype'],
                     'key': unit['data_key'],
                     'display': unit['display'],
                     'unit': unit['unit']})

    if not types:
        return None

    return types

def get_node_agents(node):
    db = magi_db()
    found = db.experiment_data.find(
        {'agent': 'viz_data', 'host': node},
        {'_id': False})

    if not found:
        return None

    agents = []
    for row in found:
        agent = {
            'agent': row['table'],
            'display': row['display']
        }
        if 'units' in row:
            agent['units'] = row['units']

        agents.append(agent)

    if not agents:
        return None

    return agents

