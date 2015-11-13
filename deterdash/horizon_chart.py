import logging
import time
from collections import defaultdict
from db import magi_db

log = logging.getLogger(__name__)

def get_viz_data(start, stop, step, node, metric, agent):
    db = magi_db()
    data = []

    # prefill with zeros. fill in actual data from the DB.
    data = {t: 0.0 for t in xrange(start, stop, step)}

    # find the correct table, column, and data entry to query.
    viz_ui_entry = db.experiment_data.find_one({
        'agent': 'viz_data',
        'type': 'horizon_chart', 
        'table': agent,
        'unit': metric
    })

    if not viz_ui_entry:
        msg = 'No data for {}/{} in the viz_data database. Do not know how to find data.'.format(
            agent, metric)
        log.warn(msg)
        return None

    cursor = db.experiment_data.find(
        {
            'agent': viz_ui_entry['table'],  # Magi stores the "table name" in the "agent" field.
            'created': {'$gte': float(start), '$lt': float(stop)},
            viz_ui_entry['node_key']: node
        }
    )
    cursor.sort([('created', 1)])

    # now we have sorted data. We need to match the requested time slots with
    # the requested data. The DB data may be sparse.
    max_ = 0
    prev_nonzero = 0
    if cursor.alive:
        rows = list(cursor)
        for row in rows:
            if not row[metric]:    # empty data point
                data[int(row['created'])] = prev_nonzero
            else:
                data[int(row['created'])] = row[metric]
            max_ = row[metric] if row[metric] > max else max
            prev_nonzero = prev_nonzero if not row[metric] else row[metric]

    return data.values()
