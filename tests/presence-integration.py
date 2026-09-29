"""Exercise a local Wrangler runtime: python tests/presence-integration.py."""
import json, urllib.request, urllib.error, uuid
base = 'http://127.0.0.1:8787'
suffix = str(uuid.uuid4())
client = urllib.request.build_opener(urllib.request.ProxyHandler({}))
def pulse(visitor, tab, match='presence-test', leave=False, origin=base):
    req = urllib.request.Request(base+'/api/presence', data=json.dumps(dict(visitor=visitor, tab=tab, match=match+'-'+suffix, leave=leave)).encode(), headers={'Origin':origin, 'Content-Type':'application/json'})
    with client.open(req, timeout=10) as response:
        return json.load(response)['count']
a, b = str(uuid.uuid4()), str(uuid.uuid4())
ta, tb, tc = [str(uuid.uuid4()) for _ in range(3)]
assert pulse(a, ta) == 1
assert pulse(a, tb) == 1
assert pulse(b, tc) == 2
assert pulse(a, ta, leave=True) == 2
assert pulse(a, tb, leave=True) == 1
assert pulse(b, tc, match='other-match') == 1
assert pulse(b, tc, leave=True) == 0
assert pulse(b, tc, match='other-match', leave=True) == 0
try:
    pulse(a, ta, origin='https://other.example')
except urllib.error.HTTPError as error:
    assert error.code == 403
else:
    raise AssertionError('Cross-origin request was allowed')
assert pulse(a, ta, match='expiry-test') == 1
print('PASS: duplicate tabs, independent visitors/matches, leave cleanup, cross-origin rejection')
with open('/tmp/ninety-presence-expiry.json','w') as file: json.dump({'match':'expiry-test-'+suffix},file)
print('Expiry test seeded; after 75 seconds a new visitor must return 1.')
