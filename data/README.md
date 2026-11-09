# Map data

`world.json` packs five [Natural Earth](https://www.naturalearthdata.com/) 1:50m datasets from the [maintainer repository](https://github.com/nvkelso/natural-earth-vector/tree/master/geojson): `ne_50m_land`, `ne_50m_lakes`, `ne_50m_rivers_lake_centerlines`, `ne_50m_admin_0_boundary_lines_land` and the deserts and mountain ranges from `ne_50m_geography_regions_polys`. Natural Earth declares its map data [public domain](https://www.naturalearthdata.com/about/terms-of-use/). Coordinates are rounded to 0.01° and delta encoded; regenerate with:

```sh
node tools/build-map-data.cjs <directory containing the five GeoJSON files>
```

The geometry is generalized for a world and regional view; it is not a street map. Deserts and mountain ranges are approximate label regions used only to colour the land, so peaks thin out and disappear when zoomed in. City footprints on the map are decorative, not city boundaries.

City-centre coordinates come from [GeoNames](https://www.geonames.org/), with individual source links retained in `cities.json`. They locate cities approximately, not the illustrated buildings. Source records were checked on 9 November 2026. No population or current transport claims are derived from those records.

All map geometry and the city catalogue are served locally with the site. No mapping account, API key, location permission or runtime geocoding service is used.
