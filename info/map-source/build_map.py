import json, math, sys
F=__import__("os").path.join(__import__("os").path.dirname(__file__),"bath.geojson")
d=json.load(open(F)); fs=d['features']
def P(f): return f['properties']
def G(f): return f['geometry']
def coords(f):
    g=G(f)
    if g['type']=='Point': return [g['coordinates']]
    if g['type']=='LineString': return g['coordinates']
    if g['type']=='Polygon': return g['coordinates'][0]
    if g['type']=='MultiPolygon': return max((r[0] for r in g['coordinates']),key=len)
    return []
def find(pred):
    return [f for f in fs if pred(P(f))]
def centroid(pts):
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]; return (sum(xs)/len(xs), sum(ys)/len(ys))

park=find(lambda p:p.get('name')=='Royal Victoria Park' and p.get('leisure')=='park')[0]
gardens=find(lambda p:p.get('name')=='Botanical Gardens')[0]
temple=find(lambda p:p.get('name')=='Temple of Minerva')[0]
cider=find(lambda p:p.get('name')=='Bath Cider House')[0]
station=find(lambda p:p.get('name')=='Bath Spa' and p.get('railway')=='station')[0]
charl=max(find(lambda p:p.get('name')=='Charlotte Street Car Park'),key=lambda f:len(coords(f)))
abbey=find(lambda p:p.get('name')=='Bath Abbey')[0]
qsq=find(lambda p:p.get('name')=='Queen Square' and p.get('leisure')=='park')[0]
pult=find(lambda p:p.get('name')=='Pulteney Bridge' and G(p and f)['type']=='Point' if False else p.get('name')=='Pulteney Bridge')
crescent=find(lambda p:p.get('name')=='Royal Crescent' and p.get('highway')=='residential')[0]
circus=find(lambda p:p.get('name')=='The Circus')
royalav=find(lambda p:p.get('name')=='Royal Avenue')[0]
rivers=find(lambda p:p.get('waterway')=='river')
rails=find(lambda p:p.get('railway')=='rail')

# ---- projection: centre on the park/centre, metres-ish
lat0=51.386; lon0=-2.37
K=1.0
def proj(lon,lat):
    x=(lon-lon0)*math.cos(math.radians(lat0))*111320
    y=-(lat-lat0)*110574
    return (x,y)

# frame: key extents + padding
keys=[centroid(coords(f)) for f in [temple,charl,cider,station,abbey,crescent,gardens]] + [(p[0],p[1]) for p in coords(park)]
px=[proj(*k)[0] for k in keys]; py=[proj(*k)[1] for k in keys]
minx,maxx,miny,maxy=min(px)-140,max(px)+220,min(py)-160,max(py)+120
W=720; sc=W/(maxx-minx); H=round((maxy-miny)*sc)
def T(lon,lat):
    x,y=proj(lon,lat); return ((x-minx)*sc,(y-miny)*sc)
print('viewBox 0 0 %d %d'%(W,H), 'scale m/unit', 1/sc, file=sys.stderr)

# ---- simplify
def dp(pts,tol):
    if len(pts)<3: return pts
    def d(p,a,b):
        (x,y),(x1,y1),(x2,y2)=p,a,b
        dx,dy=x2-x1,y2-y1
        if dx==dy==0: return math.hypot(x-x1,y-y1)
        t=max(0,min(1,((x-x1)*dx+(y-y1)*dy)/(dx*dx+dy*dy)))
        return math.hypot(x-(x1+t*dx),y-(y1+t*dy))
    a,b=pts[0],pts[-1]; imax,dmax=0,0
    for i in range(1,len(pts)-1):
        dd=d(pts[i],a,b)
        if dd>dmax: imax,dmax=i,dd
    if dmax>tol:
        return dp(pts[:imax+1],tol)[:-1]+dp(pts[imax:],tol)
    return [a,b]
def path(pts,tol=1.5,close=False):
    q=dp([T(*p) for p in pts],tol)
    s='M'+' L'.join('%.0f,%.0f'%(x,y) for x,y in q)
    return s+(' Z' if close else '')
def inside(pts):
    return any(-40<=x<=W+40 and -40<=y<=H+40 for x,y in (T(*p) for p in pts))

out=[]
# ground patches
out.append('<path class="park" d="%s"/>'%path(coords(park),2,True))
out.append('<path class="gardens" d="%s"/>'%path(coords(gardens),2,True))
out.append('<path class="square" d="%s"/>'%path(coords(qsq),2,True))
# rail
for f in rails:
    if inside(coords(f)): out.append('<path class="rail" d="%s"/>'%path(coords(f),2))
# roads: keep the ones that matter, thin the rest
KEEP={'Upper Bristol Road','Royal Avenue','Marlborough Lane','Marlborough Buildings','Charlotte Street','Queen Square Place','Gay Street','Brock Street','Lansdown Road','Broad Street','The Paragon','George Street','Milsom Street','Monmouth Street','Monmouth Place','Westgate Street','Cheap Street','High Street','Walcot Street','Manvers Street','Dorchester Street','Lower Bristol Road','Great Pulteney Street','Pulteney Bridge','Queen Square','Crescent Lane','Julian Road','Bennett Street','Wells Road','Stall Street','Southgate Street','Pierrepont Street','Northgate Street','Rivers Street','Upper Church Street','Weston Road','Bladud Buildings','New Bond Street','Union Street','Old Bond Street'}
seen=0
for f in fs:
    p=P(f)
    if not p.get('highway') or G(f)['type']!='LineString': continue
    if p.get('highway') in ('footway','steps'): continue
    if p.get('name') in ('Royal Crescent','The Circus'): continue
    if p.get('name') not in KEEP and p.get('highway') not in ('primary','trunk','tertiary'): continue
    if not inside(coords(f)): continue
    out.append('<path class="street" d="%s"/>'%path(coords(f),2.5)); seen+=1
print('streets',seen,file=sys.stderr)
# river
for f in rivers:
    if inside(coords(f)): out.append('<path class="river" d="%s"/>'%path(coords(f),2))
# landmarks
out.append('<path class="crescent" d="%s"/>'%path(coords(crescent),1.5))
for f in circus: out.append('<path class="circus" d="%s"/>'%path(coords(f),1.5))
out.append('<path class="abbey" d="%s"/>'%path(coords(abbey),1.5,True))
pb=[f for f in fs if P(f).get('name')=='Pulteney Bridge']
for f in pb:
    if G(f)['type']=='LineString': out.append('<path class="bridge" d="%s"/>'%path(coords(f),1))
# pins
def pt(f): return T(*centroid(coords(f)))
ra=coords(royalav); mid=ra[-1]
pins={'temple':pt(temple),'local':T(*mid),'long':pt(charl),'pub':pt(cider),'station':pt(station)}
lm={'crescent':T(*centroid(coords(crescent))),'circus':T(*centroid(coords(circus[0]))),'qsq':T(*centroid(coords(qsq))),'abbey':pt(abbey),'park':T(*centroid(coords(park))),'gardens':T(*centroid(coords(gardens)))}
json.dump({'W':W,'H':H,'pins':{k:[round(v[0]),round(v[1])] for k,v in pins.items()},'lm':{k:[round(v[0]),round(v[1])] for k,v in lm.items()}},open(sys.argv[1]+'/map-meta.json','w'))
open(sys.argv[1]+'/map-paths.svg','w').write('\n'.join(out))
print(json.dumps(pins),file=sys.stderr); print(json.dumps(lm),file=sys.stderr)
print('bytes',sum(len(o) for o in out),file=sys.stderr)
