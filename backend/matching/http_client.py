"""One pooled HTTP session, so calls reuse TLS connections instead of a new handshake each."""

import requests

http = requests.Session()
