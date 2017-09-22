#!/usr/bin/env python
import requests
import json

def site_to_feature(site):
  lng,lat = [float(s) for s in site.pop('spatialCoverage').split(',')]

  return {
    'type':'Feature',
    'geometry':{
      'type':'Point',
      'coordinates':[lng,lat]
    },
    'properties':site
  }

HOST='http://data.ozflux.org.au/portal/mapview'
result = requests.get(HOST+'/viewLocations.jspx').json()
sites = result['mapLocations']

siteBeans = [requests.get(HOST+'/listSites.jspx',loc).json()['siteBeans'] for loc in sites]
siteBeans = [s[0] if len(s) else {} for s in siteBeans]
metadata = [dict(s.items()+loc.items()) for s,loc in zip(siteBeans,sites)]

result = {
  'type':'FeatureCollection',
  'features':[site_to_feature(s) for s in metadata]
}

json.dump(result,open('ozflux.json','w'),indent=2)
