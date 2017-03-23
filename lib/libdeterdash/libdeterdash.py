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
import os.path
import yaml
from enum import Enum

from magi.util import database
from magi.testbed import testbed

log = logging.getLogger(__name__)

class DashboardNotificationLevel(Enum):
    DEBUG = 1
    INFO = 2
    WARNING = 3
    CRITICAL = 4

class DeterDashboard(object):

    # The one and only datatype table.
    viz_data_table = 'viz_data'

    # The supported datatypes
    time_plot_type = 'time_plot'
    force_directed_graph_type = 'force_directed_graph'
    topology_annotation_type = 'topology_annotation'

    # Where we keep IDLs
    viz_idl_table = 'viz_data_idl'

    # Where we keep notifications.
    viz_notifications_table = 'viz_notifications'

    def __init__(self):
        pass

    def send_notification(self, frm, text, level):
        ''' send a notification from "frm" with message "text" at level "level". Level is 
        a DashboardNotificationLevel, described above.'''
        self._insert_notification(frm, text, level)

    def debug_notification(self, frm, text):
        self._insert_notification(frm, text, DashboardNotificationLevel.DEBUG)

    def info_notification(self, frm, text):
        self._insert_notification(frm, text, DashboardNotificationLevel.INFO)

    def warning_notification(self, frm, text):
        self._insert_notification(frm, text, DashboardNotificationLevel.WARNING)

    def critical_notification(self, frm, text):
        self._insert_notification(frm, text, DashboardNotificationLevel.CRITICAL)

    def _insert_notification(self, frm, text, level):
        # We just write the text to teh DB, The server picks it up and sends it out.
        # The client keeps track of notifications it's seen.
        if not isinstance(level, DashboardNotificationLevel):
            # Dont' really know what to do here other than make this notification very visible.
            level = DeterDashboard.CRITICAL

        table = database.getCollection(DeterDashboard.viz_notifications_table)
        table.insert({
            'notifer': frm,
            'text': text,
            'level': level.name
        })

    def add_time_plot(self, display, table, node_key, units):
        log.info('Adding time plot {}'.format(display))
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

    def add_topology(self, display, table, node_key, edges_key, extra_keys=None):
        '''Add a topology to the GUI. table_keys is a list of keys which identify the table.
        node_key and edges_key identify the nodes and edges data.'''
        log.info('Adding topology {}'.format(display))
        viz_collection = database.getCollection(DeterDashboard.viz_data_table)
        viz_collection.insert({
            'datatype': DeterDashboard.force_directed_graph_type,
            'display': display,
            'table': table,
            'node_key': node_key,
            'edges_key': edges_key,
            'extra_keys': extra_keys
        })

    def add_link_annotation(self, display, table, edge_key, units):
        '''Given the table and keys, annotate the given link with the given data. The edge_key 
        must point to a table entry that is a tuple of (node A name, node B name). Links are 
        asymetric (the toplogy is a directed graph).''' 
        log.info('Adding link annotation {}'.format(display))
        c = database.getCollection(DeterDashboard.viz_data_table)
        c.insert({
            'datatype': DeterDashboard.topology_annotation_type,
            'display': display,
            'table': table,
            'key': edge_key,
            'units': units
        })

    def add_node_annotation(self, display, table, node_key, units):
        '''Given the table and keys, annotate the given node with the given data.'''
        log.info('Adding node annotation {}'.format(display))
        c = database.getCollection(DeterDashboard.viz_data_table)
        c.insert({
            'datatype': DeterDashboard.topology_annotation_type,
            'display': display,
            'table': table,
            'key': edge_key,
            'units': units
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

    def register_agent(self, idlpath):
        '''
            Given a path to an agents' IDL, register that agent such that it shows up 
            as an executable agent in the GUI.
        '''
        log.info('Attempting to register agent via IDL: {}'.format(idlpath))
        if not os.path.exists(idlpath) or not os.path.isfile(idlpath):
            log.error('bad file/path for IDL given to libdeterdash.')
            return False

        try:
            with open(idlpath) as fd:
                idl = yaml.safe_load(fd)
        except Exception as e:
            log.error('Unable to read IDL file {}: {}'.format(e, idlpath))
            return False

        # We add the path here, so the client knows the path for the AAL it generates.
        # Note that generating the AAL clientside is a huge security hole as eventually
        # magi takes that file and loads/executes the agent code. Ideally the server
        # would add path and mainfile to the AAL serverside, once it' verified the agent 
        # is whitelisted. Oh well. 
        idl['path'] = os.path.dirname(idlpath)

        # we only add unique agents, where unique is defined by name and path. We update if an
        # existing entry is found.
        idl_collection = database.getCollection(DeterDashboard.viz_idl_table)

        # Magi DB does not support upsert, so we force it by removing if data found.
        key = {'path': idl['path'], 'name': idl['name']}
        if idl_collection.find_one(key):
            log.info('Removing IDL entry: {}/{}'.format(idl['name'], idl['path']))
            idl_collection.remove(key)
    
        # bug in Magi adds keys to the idl dict in find(). Remove them.
        # idl = {k:v for k, v in idl if k not in database.Collection.INTERNAL_KEYS}
    
        log.info('Adding IDL entry: {}'.format(idl))
        idl_collection.insert(idl)
