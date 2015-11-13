# data for testing plots. Can be removed at some point.
##############

import logging

log = logging.getLogger(__name__)

from random import randrange

def is_testing_data(metric):
    return metric in ['sawtooth']

def get_testing_data(start, stop, step, node, metric):
    func_map = {
        'sawtooth': sawtooth_data
    }
    if metric not in func_map:
        return None

    return func_map[metric](start, stop, step, node)


# globals bad!
sawtooth_offsets = {}
sawtooth_cache = None
def sawtooth_data(start, stop, step, node):
    global sawtooth_cache
    period = 240  # two minutes

    if not sawtooth_cache:
        l = [i for i in xrange(-period/2, period/2 + 1)]
        sawtooth_cache = l + l[::-1][1:-1] # truncated & reversed.

    if node not in sawtooth_offsets:
        sawtooth_offsets[node] = randrange(-period/2, period/2) # offset

    data = []
    while start < stop:
        start += step
        data.append(sawtooth_cache[(start + sawtooth_offsets[node]) % len(sawtooth_cache)])

    log.debug('sawtooth data for node {}: {} datapoints. last: {}'.format(node, len(data), data[-1]))
    return data
