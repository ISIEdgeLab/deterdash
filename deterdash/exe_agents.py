import logging
import yaml
import pymongo
from db import magi_db
from os.path import join, isfile, exists, isdir
from os import listdir
from libdeterdash import DeterDashboard

log = logging.getLogger(__name__)

def get_executable_agents():
    '''Load all IDLs found in the local ./agents directory. Also look in the database viz tables for
    agents which have registered themselves.'''
    agents = []
    seen = []

    # read locally loadable IDLs. 
    idl_dir = join('.', 'agents')   # GTL - this should be configurable, passed in on the cmd line or something.

    if exists(idl_dir) and isdir(idl_dir):
        for fl in listdir(idl_dir):
            f = join(idl_dir, fl)
            if isfile(f) and f.endswith('idl'):
                with open(f) as fd:
                    agent = yaml.safe_load(fd)
                    log.debug('Read exe agent {}'.format(agent['name']))
                    agents.append(agent)
                    seen.append(agent['name'])

    # read IDLs stored in the DB.
    db = magi_db()
    names = db.experiment_data.find({
        'agent': DeterDashboard.viz_idl_table
    }, {
        '_id': False,
    }).distinct('name')

    # Now for all agents, read the newest IDL in the DB we can pind.
    for name in names:
        cursor = db.experiment_data.find({
            'agent': DeterDashboard.viz_idl_table,
            'name': name
        }, {
            '_id': False
        }).sort('created', pymongo.DESCENDING).limit(1)

        if cursor.alive and cursor.count():
            agent = cursor[0]
            if agent and 'name' in agent and not agent['name'] in seen:
                log.info('found agent in db: {}'.format(agent))
                agents.append(agent)
                seen.append(agent)

    return agents

def get_executable_agent(agent_name):
    agents = get_executable_agents()
    for a in agents:
        if a['name'] == agent_name:
            return a

    return None
