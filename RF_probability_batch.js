/************************************************************
 * OBIA-LT Cropland Abandonment Monitoring
 * 
 * Script: RF_probability_batch.js
 * 
 * Description:
 * Object-based Random Forest modeling for parcel-level
 * cultivation probability estimation using Sentinel-2 imagery.
 *
 * This script is part of the reproducible workflow described in:
 * "Remote Sensing Monitoring of Cropland Abandonment at the Parcel Level
 * Based on Time-Series Fitting of Cultivation Probability Values"
 *
 * Requirements:
 * - Google Earth Engine account
 * - Parcel boundary vector uploaded as an asset
 * - Sentinel-2 SR imagery (COPERNICUS/S2_SR_HARMONIZED)
 *
 * Author: Xinyu Yang
 * License: MIT
 ************************************************************/

// ===============================================================
// Object-based Random Forest planting probability mapping
// (Batch processing version for time-series analysis)
// ===============================================================

// -----------------------------------------------------------------------------
// 1. List of object-level Sentinel-2 images
// -----------------------------------------------------------------------------
var imageNames = [
  'S2_Ob_2023_06',
  'S2_Ob_2023_07',
  'S2_Ob_2023_08',
  'S2_Ob_2023_09',
  'S2_Ob_2023_10'
];

// -----------------------------------------------------------------------------
// 2. Feature set used for probability modeling
//All object-level spectral, index, and texture features were pre-computed and stored in the S2_Ob_YYYY_MM assets.
// -----------------------------------------------------------------------------
var bandsForClassification = [
  'B3', 'B4', 'nir_min', 'red_median', 'Rapeseed_Index', 
  'red_mean', 'red_max', 'NDVI_min', 'MSAVI_min', 'B2',
  'EVI_min', 'NDWI', 'DEM', 'green_median', 'green_max', 
  'blue_mean', 'red_min', 'green_mean', 'Wheat_Index', 'Stubble_Index', 
  'nir_mean', 'EVI_mean', 'Pond_Index', 'blue_median', 'green_min',
  'EVI', 'NDVI_mean', 'B3_savg', 'NDVI', 'MSAVI_mean'
];

// -----------------------------------------------------------------------------
// 3. Training samples (binary planting label)
// ybd_202408: user-provided training samples (FeatureCollection)
// Attributes: gridcode (parcel ID), reference planting label
// -----------------------------------------------------------------------------
var samples = ybd_202408.map(function (feature) {
  var gridcode = ee.Number(feature.get('gridcode'));
  var zhongzhi = gridcode.lte(2); // Cultivated = 1, Non-cultivated = 0, gridcode <= 2 indicates cultivated parcels based on field survey coding 
  return feature.set({
    'zhongzhi': zhongzhi,
    'gridcode': gridcode
  });
});

// -----------------------------------------------------------------------------
// 4. Auxiliary topographic data
// -----------------------------------------------------------------------------
var dem = ee.Image('USGS/SRTMGL1_003').float();
var slope = ee.Terrain.slope(dem).float();

// -----------------------------------------------------------------------------
// 5. Split samples into training and validation subsets
// (used only for model stability, not for accuracy reporting)
// -----------------------------------------------------------------------------
var split = samples.randomColumn('random', 42);
var trainingSamples = split.filter(ee.Filter.lt('random', 0.7));

// -----------------------------------------------------------------------------
// 6. Core function: probability mapping and export
// -----------------------------------------------------------------------------
var classifyAndExport = function (imageName) {

  print('Processing image:', imageName);

  // Load object-level image
  var image = ee.Image('projects/ee-yxyxy/assets/' + imageName).float();

  // ---------------- Feature construction ----------------

  // Spectral bands
  var baseBands = image.select(['B2', 'B3', 'B4', 'B8']);

  // Vegetation indices
  var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI').float();
  var evi = image.expression(
    '2.5 * (NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1)', {
      'NIR': image.select('B8'),
      'RED': image.select('B4'),
      'BLUE': image.select('B2')
    }).rename('EVI').float();
  var ndwi = image.normalizedDifference(['B3', 'B8']).rename('NDWI').float();

  // Texture features (GLCM)
  var gray = image.select('B3')
    .add(image.select('B8'))
    .divide(2)
    .multiply(100)
    .round()
    .toInt16();

  var glcm = gray.glcmTexture({
    size: 3,
    kernel: ee.Kernel.square(1)
  });

  var texture = glcm
    .select(['B3_contrast', 'B3_var'])
    .rename(['B3_contrast', 'B3_var'])
    .float();

  // Merge all features
  var imageWithFeatures = baseBands
    .addBands(ndvi)
    .addBands(evi)
    .addBands(ndwi)
    .addBands(dem.rename('elevation'))
    .addBands(slope.rename('slope'))
    .addBands(texture);

  // ---------------- Model training ----------------

  var trainingData = imageWithFeatures
    .select(bandsForClassification)
    .sampleRegions({
      collection: trainingSamples,
      properties: ['zhongzhi'],
      scale: 10,
      tileScale: 4
    });

  var classifier = ee.Classifier.smileRandomForest({
    numberOfTrees: 300,
    seed: 42
  })
    .setOutputMode('PROBABILITY')
    .train({
      features: trainingData,
      classProperty: 'zhongzhi',
      inputProperties: bandsForClassification
    });

  // ---------------- Probability prediction ----------------

  var probabilityImage = imageWithFeatures
    .select(bandsForClassification)
    .classify(classifier, 'planting_probability')
    .select('planting_probability')
    .float();

  // ---------------- Gridcode band (object ID) ----------------

  var gridcodeBand = trainingSamples
    .reduceToImage({
      properties: ['gridcode'],
      reducer: ee.Reducer.first()
    })
    .rename('gridcode')
    .float();

  // ---------------- Export ----------------

  var validMask = image.select(['B2', 'B3', 'B4']).reduce(ee.Reducer.allNonZero());

  var exportImage = ee.Image.cat([
    probabilityImage,
    image.select(['B4', 'B3', 'B2']).float(),
    gridcodeBand
  ])
    .updateMask(validMask)
    .rename([
      'planting_probability',
      'B4', 'B3', 'B2',
      'gridcode'
    ]);

  Export.image.toDrive({
    image: exportImage,
    description: imageName + '_parcel_probability_RF',
    folder: 'GEE_Exports',
    fileNamePrefix: imageName + '_parcel_probability_RF',
    region: roi,// roi: study area boundary (ee.Geometry or FeatureCollection)
    scale: 10,
    maxPixels: 1e13,
    fileFormat: 'GeoTIFF',
    formatOptions: {
      cloudOptimized: true
    }
  });
};

// -----------------------------------------------------------------------------
// 7. Batch execution
// -----------------------------------------------------------------------------

imageNames.forEach(classifyAndExport);


