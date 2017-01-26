import logging
from flask import Flask

log = logging.getLogger(__name__)

app = Flask(__name__)

def get_app():
    return app

# make sure to import the views here, so all modules have access to them.
import deterdash.views
