import logging
import yaml
import pymongo
import fnmatch
from db import magi_db
from os.path import join, isfile, exists, isdir
from os import walk, sep
from libdeterdash import DeterDashboard

log = logging.getLogger(__name__)

def load_static_agents(agent_dir):
    '''Look in the agents dir and add all IDLs found to the DB. Assume the IDL is in the 
    same dir as the agent - and set the path accordingly.'''
    log.info('Reading {} for static agents.'.format(agent_dir))
    deterdash = DeterDashboard()

    # read locally loadable IDLs. 
    if not exists(agent_dir) or not isdir(agent_dir):
        log.error('Given agent directory is either does not exist or is not a directory: '.format(agent_dir))
        return None

    for root, dirs, files in walk(agent_dir):
        # root becomes cwd as we walk. dirs is a list of dirs in root. files is list of files in root.
        # so path to cur file is root + file.
        idls = fnmatch.filter(files, '*.idl')
        for idl in idls:
            f = join(root, idl)
            log.info('Adding static agent IDL to DB: {}'.format(f))
            deterdash.register_agent(f)

def get_executable_agents():
    '''Return all IDLs found in the DB.'''
    retval = []

    # read IDLs stored in the DB.
    db = magi_db()
    agents = db.experiment_data.find({
        'agent': DeterDashboard.viz_idl_table
    }, {
        '_id': False,
    }).sort([('display', 1), ('path', 1)])

    if agents.count():
        for agent in agents:
            if agent and 'name' in agent:
                log.info('found agent in db: {}'.format(agent))
                retval.append(agent)

    return retval

def get_executable_agent(agent_name):
    agents = get_executable_agents()
    for a in agents:
        if a['name'] == agent_name:
            return a

    return None
