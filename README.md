# OBIA-LT-Cropland-Abandonment
GEE-based parcel-level cropland abandonment monitoring using LandTrendr

# OBIA-LT Cropland Abandonment Monitoring
This repository provides Google Earth Engine (GEE) codes for parcel-level cropland abandonment detection based on time-series fitting of cultivation probability using the LandTrendr algorithm.

## Data Sources
- Sentinel-2 Level-2A imagery (COPERNICUS/S2_SR_HARMONIZED), accessed via Google Earth Engine.
- Gaofen-2 (GF-2) imagery was used exclusively for cropland parcel boundary delineation.
  Access to GF-2 data is provided through application-based authorization via official Chinese platforms
  (e.g., China Resources Satellite Application Center and Land Observational Satellite Data Service System).
  Importantly, GF-2 imagery does not participate in the temporal analysis or abandonment detection.

To ensure full methodological reproducibility, all subsequent analyses, including cultivation probability
modeling and time-series fitting, are conducted using openly accessible Sentinel-2 data.
The parcel geometry can be substituted with any externally provided cropland boundary dataset
without affecting the core analytical framework.

## Contents
- GEE scripts for probability modeling and LandTrendr fitting
- Example parcel-level time-series data (CSV)
- Workflow documentation

## Reproducibility
All analyses can be reproduced using open-access Sentinel-2 data and the provided GEE codes.
