#
# An API to the deterdash GUI.
#
# Allows third party agents to let the GUI know about
# data that should be graphed. Supports adding database
# references that should be queried and displayed in the 
# Deter Dashboard in some manner.
#
import logging
import time
import pymongo

from magi.util import database
from magi.testbed import testbed

log = logging.getLogger(__name__)

class DeterDashboard(object):

    # The one and only datatype table.
    viz_data_table = 'viz_data'

    # The supported datatypes
    time_plot_type = 'time_plot'
    force_directed_graph_type = 'force_directed_graph'

    def __init__(self):
        pass

    def add_time_plot(self, display, table, node_key, units):
        # sanity check the units.
        if type(units) is not list:
            log.error('units argument is not a list')
            return False

        for u in units:
            if type(u) is not dict:
                log.error('bad type, {}, for unit: {}'.format(type(u), u))
                return False

            for k in ['data_key', 'display', 'unit']:
                if k not in u:
                    log.error('missing key, {}, in unit: {}'.format(k, u))
                    return False

        viz_table = database.getCollection(DeterDashboard.viz_data_table)
        viz_table.insert({
            'datatype': DeterDashboard.time_plot_type,
            'display': display,
            'table': table,
            'node_key': node_key,
            'units': units
        })

        return True

    def add_topology(self, display, table, node_key, edges_key, template=None, extra_keys=None):
        '''Add a topology to the GUI. table_keys is a list of keys which identify the table.
        node_key and edges_key identify the nodes and edges data.'''
        template = 'force_graph.html' if not template else template
        viz_collection = database.getCollection(DeterDashboard.viz_data_table)
        viz_collection.insert({
            'datatype': DeterDashboard.force_directed_graph_type,
            'display': display,
            'table': table,
            'node_key': node_key,
            'edges_key': edges_key,
            'extra_keys': extra_keys,
            'template': template
        })


    def get_topology_keys(self, agent):
        '''Given the agent, return the keys needed to extract the nodes and edges from the DB.'''
        viz_collection = database.getCollection(DeterDashboard.viz_data_table)
        cursor = viz_collection.find({
            'datatype': DeterDashboard.force_directed_graph_type,
            'table': agent
        }).sort('created', pymongo.DESCENDING).limit(1)

        if cursor.count():
            return cursor[0]['node_key'], cursor[0]['edges_key'], cursor[0]['extra_keys']

        return None, None, None
