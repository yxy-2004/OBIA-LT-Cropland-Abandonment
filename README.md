# OBIA-LT Cropland Abandonment Monitoring
This repository contains the essential Google Earth Engine (GEE) scripts used for parcel-level cropland abandonment monitoring based on:
1.Object-based cultivation probability modeling (Random Forest)
2.Time-series fitting using the LandTrendr algorithm
3.Detection of long-term probability decline indicating cropland abandonment
These codes constitute the minimal reproducible set that supports the workflow presented in the study:“Remote Sensing Monitoring of Cropland Abandonment at the Parcel Level Based on Time-Series Fitting of Cultivation Probability Values.”

## Workflow of the OBIA-LT Method


flowchart TD
    A[Multi-temporal remote sensing data
Sentinel-2, GF-2, DEM, cropland boundary]

    B[Object-based image segmentation (OBIA)
SNIC superpixels
MMU ≥ 400 m²]

    C[Parcel-level feature extraction
Spectral, index, texture, terrain features]

    D[Cultivation probability modeling
Random Forest (probability mode)
Monthly cultivation probability]

    E[Parcel-level probability time series
Object-based temporal signal]

    F[LandTrendr-based temporal segmentation
Input: cultivation probability
Focus on sustained decline]

    G[Abandonment decision rules
Probability threshold
Minimum duration constraint
No recovery detected]

    H[Parcel-level abandonment map
Status, onset time, duration]

    A --> B --> C --> D --> E --> F --> G --> H

## Data Sources
·Open-Access Data (Required)
Sentinel-2 Level-2A (COPERNICUS/S2_SR_HARMONIZED)
·DEM
SRTM DEM (USGS/SRTMGL1_003)
·Parcel Boundaries (User-provided)
The GF-2 data used in this study is solely for farmland parcel delineation and is not required when running scripts from this repository. Any polygon dataset representing farmland parcels may be substituted.
GF-2 imagery can be obtained through China's official data portals, such as:
China Resource Satellite Data and Application Center (CRESDA);
Land Observation Satellite Data Service System (LOS-DSS)

## Repository Contents
RF_probability_batch.js        # Parcel-level cultivation probability modeling
LandTrendr_abandonment.js      # LandTrendr fitting and abandonment detection
data_template/
 └── obj_image_list_example.csv   # Example of asset naming structure
README.md

## Scripts Description
(1) RF_probability_batch.js
Performs Random Forest–based cultivation probability estimation on segmented parcels.
Functions include:
·Feature generation from Sentinel-2 composites
·Object-based sample extraction
·RF model training in probability mode
·Batch prediction across multiple months
·Export of parcel-level probability maps
Output:
{YYYY_MM}_parcel_probability_RF.tif
(2) LandTrendr_abandonment.js
Implements LandTrendr fitting on the multi-month probability series.Functions include:
·Time-series preparation
·LandTrendr segmentation and vertex extraction
·Detection of significant probability decreases
·Generation of abandonment maps
Output:
LandTrendr fitted probability series
Breakpoints / vertices
Abandonment map (raster)

## Reproducibility Instructions
The workflow can be reproduced using:
·Any parcel boundary dataset (GF-2 not required)
·Publicly accessible Sentinel-2 imagery on GEE
·The two provided scripts

Steps:
(1)Prepare parcel boundaries (cadastral data, segmentation from other HR imagery, etc.)
(2)Generate parcel-level Sentinel-2 composites and upload to GEE assets
(3)Run RF_probability_batch.js to obtain monthly probability maps
(4)Run LandTrendr_abandonment.js to detect abandonment
This completes the reproducible pipeline.

Data Availability Statement

The Sentinel-2 imagery used in this study is publicly available through the Google Earth Engine data catalog.
Due to data-use restrictions and privacy considerations, the parcel boundary data and training samples are not publicly shared.
However, the complete analysis workflow, model implementation, and parameter settings are fully documented and openly available in this repository, enabling reproducibility using equivalent input data.

## License
Open-source under the MIT License.

## Contact
Xinyu Yang
College of Geography and Tourism, Anhui Normal University
Email: 1944551771@qq.com




