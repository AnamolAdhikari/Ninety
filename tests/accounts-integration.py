"""Run against an isolated local Wrangler with the test credentials below."""
import urllib.request, urllib.error, json, uuid
BASE='http://127.0.0.1:8791'
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args):return None
client=urllib.request.build_opener(urllib.request.ProxyHandler({}),NoRedirect())
counter=0
def request(path,body=None,cookie=None,origin=BASE,method=None):
    global counter
    counter+=1
    headers={'Origin':origin,'CF-Connecting-IP':'192.0.2.'+str(counter%240+1)}
    if cookie:headers['Cookie']=cookie
    if isinstance(body,dict):body=json.dumps(body).encode();headers['Content-Type']='application/json'
    req=urllib.request.Request(BASE+path,data=body,headers=headers,method=method)
    try:response=client.open(req,timeout=30)
    except urllib.error.HTTPError as error:response=error
    raw=response.read()
    try:data=json.loads(raw)
    except:data=raw.decode(errors='replace')
    return response.code,data,response.headers

def login(username,password):
    body=urllib.parse.urlencode({'username':username,'password':password}).encode()
    status,_,headers=request('/auth/login',body)
    assert status==303,status
    return headers['Set-Cookie'].split(';')[0]
owner=login('test-owner','test-owner-password')
guest=login('test-guest','test-guest-password')
assert request('/api/preferences')[0]==401
assert request('/api/admin/accounts',cookie=guest)[0]==403
assert request('/admin/',cookie=guest)[0]==403
assert request('/api/admin/accounts',{'username':'bad','password':'short'},owner)[0]==400
name='friend-'+uuid.uuid4().hex[:10]
status,data,_=request('/api/admin/accounts',{'username':name,'password':'friend-password-test'},owner)
assert status==200,(status,data)
account_id=data['id']
assert request('/api/admin/accounts',{'username':name,'password':'friend-password-test'},owner)[0]==409
friend=login(name,'friend-password-test')
assert request('/api/account',cookie=friend)[1]['role']=='friend'
assert request('/api/admin/accounts',cookie=friend)[0]==403
assert request('/api/admin/account',{'id':account_id,'enabled':False},friend)[0]==403
result=request('/api/preferences',{'account':'owner:fake','key':'ninety-favorites','value':'["friend-match"]','previous':'[]'},friend)
assert result[0]==200,result[:2]
assert request('/api/preferences',cookie=owner)[1]['values'].get('ninety-favorites') is None
assert request('/api/preferences',{'key':'ninety-favorites','value':'["match-a"]','previous':'[]'},owner)[0]==200
# A second device adds match-b starting from an old empty snapshot: merge, do not overwrite.
request('/api/preferences',{'key':'ninety-favorites','value':'["match-b"]','previous':'[]'},owner)
assert set(json.loads(request('/api/preferences',cookie=owner)[1]['values']['ninety-favorites']))=={'match-a','match-b'}
request('/api/preferences',{'key':'ninety-favorites','value':'["match-b"]','previous':'["match-a","match-b"]'},owner)
assert json.loads(request('/api/preferences',cookie=owner)[1]['values']['ninety-favorites'])==['match-b']
assert request('/api/preferences',{'key':'ninety-favorites','value':'[]'},owner,origin='https://bad.example')[0]==403
assert request('/api/preferences',{'key':'arbitrary','value':'secret'},owner)[0]==400
request('/api/admin/account',{'id':account_id,'enabled':False},owner)
assert request('/api/account',cookie=friend)[0]==401
request('/api/admin/account',{'id':account_id,'enabled':True},owner)
assert request('/api/account',cookie=friend)[0]==401
friend=login(name,'friend-password-test')
request('/api/admin/account',{'id':account_id,'password':'new-friend-password'},owner)
assert request('/api/account',cookie=friend)[0]==401
friend=login(name,'new-friend-password')
assert json.loads(request('/api/preferences',cookie=friend)[1]['values']['ninety-favorites'])==['friend-match']
# Changing the unsigned role in a valid friend token cannot grant owner access.
assert request('/api/admin/accounts',cookie=friend.replace('friend.','owner.'))[0]==401
request('/api/playback-report',{},friend)
health=request('/api/admin/accounts',cookie=owner)[1]['health']
assert any(row['category']=='source-retry' for row in health)
assert all('hash' not in row and 'salt' not in row for row in request('/api/admin/accounts',cookie=owner)[1]['accounts'])
assert request('/admin',cookie=owner)[0]==200
assert request('/',cookie=guest)[0]==200
print('PASS: owner/guest/friend sign-in, owner-only routes, account disable/reset revocation, persistent preferences, cross-account isolation, concurrent list merging, CSRF, validation, tamper rejection, private health metrics')
