import logging
import time
import random    # GTL - for testing only.
import pymongo
from collections import OrderedDict
from db import magi_db

log = logging.getLogger(__name__)

random_data = {}    # per node random data indexed by [node][timestamp]
def _get_random_data(start, stop, step, node):
    '''function for testing GUI without using DB access.'''
    global random_data
    data = []

    if node not in random_data:
        random_data[node] = {}

    for t in xrange(start, stop, step):
        if t not in random_data[node]:
            # GTL need to trim the random_data at some point.
            random_data[node][t] = random.normalvariate(100, 20)

        data.append(random_data[node][t])

    return data

def get_viz_horz_data(start, stop, step, node, metric, agent):

    if metric == 'random':
        return _get_random_data(start, stop, step, node)

    db = magi_db()
    # find the correct table, column, and data entry to query.
    viz_data_entry = db.experiment_data.find_one({
        'agent': 'viz_data',
        'datatype': 'horizon_chart', # hardcoded for this datatype
        'table': agent,
        'units': {'$elemMatch': {'data_key': metric}}
    })

    if not viz_data_entry:
        msg = 'No data for {}/{} in the viz_data database. Do not know how to find data.'.format(
            agent, metric)
        log.warn(msg)
        return None

    cursor = db.experiment_data.find({
            'agent': viz_data_entry['table'],  # Magi stores the "table name" in the "agent" field.
            'created': {'$gte': float(start), '$lt': float(stop)},
            viz_data_entry['node_key']: node
        },
        {
            '_id': False,
            metric: True,
            'created': True
        }
    ).sort('created', pymongo.ASCENDING)

    # now we have sorted data. We need to match the requested time slots with
    # the requested data. The DB data may be sparse.
    data = OrderedDict([(t, 0.0) for t in xrange(start, stop, step)])
    if cursor.alive:
        for row in cursor:
            data[int(row['created'])] = row[metric]

        # data = [row[metric] for row in cursor]
        # t = start
        # i = 0
        # for row in cursor:
        #     if int(row['created']) >= t:
        #         data.append(row[metric])
        #         t += step
        #     else:
        #         data.append(0.0)

        #     i += step

    # GTL debugging - remove
    if node in ['enclave1', 'traf11']:
        log.debug('{} counts: {}'.format(node, data.values()))

    return data.values()
