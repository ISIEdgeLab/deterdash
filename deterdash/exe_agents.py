import logging
import yaml
from os.path import join, isfile
from os import listdir

log = logging.getLogger(__name__)

def get_executable_agents():
    agents = []
    idl_dir = join('.', 'agents')

    for fl in listdir(idl_dir):
        f = join(idl_dir, fl)
        if isfile(f) and f.endswith('idl'):
            with open(f) as fd:
                agent = yaml.safe_load(fd)
                log.debug('Read exe agent {}'.format(agent['name']))
                agents.append({
                    'name': agent['name'],
                    'display': agent['display'],
                    'description': agent['description'],
                    'variables': agent['variables'],
                    'method': agent['method']
                })

    return agents

def get_executable_agent(agent_name):
    agents = get_executable_agents()
    for a in agents:
        if a['name'] == agent_name:
            return a

    return None
