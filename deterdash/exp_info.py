import logging
import time
from db import magi_db

log = logging.getLogger(__name__)

def get_exp_info():
    db = magi_db()
    # example data:
    # {
    #         "_id" : ObjectId("562a93cc7e1ce204b7f9d6cd"),
    #         "is_container" : true,
    #         "created" : 1445630924.271356,
    #         "agent" : "node_stats",
    #         "project" : "edgect",
    #         "host" : "sunnydale",
    #         "experiment" : "viztest",
    #         "type" : "nodeinfo"
    # }
    cursor = db.experiment_data.find(
        {
            'agent': 'node_stats_nodeinfo',  # GTL - this should be read from somewhere. 
        },
        {
            '_id': False,
            'created': False,
            'agent': False
        }
    )

    data = {}
    rows = list(cursor)
    for row in rows:
        if 'project' not in data:
            data['project'] = row['project']
        
        if 'experiment' not in data:
            data['experiment'] = row['experiment']

        data[row['host']] = {'is_container': row['is_container']}

    return data

