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

from magi.util import database
from magi.testbed import testbed

log = logging.getLogger(__name__)


class DeterDashboard(object):

    # The one and only datatype table.
    viz_data_table = 'viz_data'

    # The supported datatypes
    horizon_chart_type = 'horizon_chart'
    force_directed_graph_type = 'force_directed_graph'

    def __init__(self):
        pass

    def add_horizon_chart(self, display, table, node_key, units):
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
            'datatype': DeterDashboard.horizon_chart_type,
            'display': display,
            'table': table,
            'node_key': node_key,
            'units': units
        })

        return True

    def add_topology(self, display, table, node_key, edges_key):
        collection = database.getCollection(DeterDashboard.viz_data_table)
        collection.update(
            {
                'agent': DeterDashboard.viz_data_table,
                'host': testbed.nodename
            },
            {
                'host': testbed.nodename,
                'created': time.time(),
                'agent': DeterDashboard.viz_data_table,
                'datatype': DeterDashboard.force_directed_graph_type,
                'display': display,
                'table': table,
                'node_key': node_key,
                'data_key': edges_key
            },
            upsert=True
        )
