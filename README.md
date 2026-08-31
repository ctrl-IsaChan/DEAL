# DEAL

**Park Once, Walk & Shop** for Yule Street, Tainan.

This MVP is a standalone static app. It includes:

- Intent-first home screen: Ride, Walk, Order
- Ride view with Leaflet map and the 520 ZenSVI observation points
- Parking cards with capacity and unavailable real-time status
- Walk exploration cards and positive pedestrian-friendly labels
- Pickup-only demo ordering flow
- Responsive mobile navigation

## Run

From this folder:

```bash
python3 -m http.server 4173
```

Open http://localhost:4173.

## Public link

After GitHub Pages is enabled and the `Deploy GitHub Pages` workflow finishes, the app is available at:

https://ctrl-IsaChan.github.io/DEAL/

The map uses OpenStreetMap tiles and Leaflet from CDN, so map tiles require internet access. The app itself and GeoJSON data are local.

## Data note

`detection_points.geojson` contains image-level observations from ZenSVI. Motorcycle counts are observed vehicles, not parking capacity. Parking capacity and real-time availability should be connected to the official Tainan parking source separately.
