/************************************************************
 * OBIA-LT Cropland Abandonment Monitoring
 * 
 * Script: RF_probability_batch.js
 * 
 * Description:
 * Object-based Random Forest modeling for parcel-level
 * cultivation probability estimation using precomputed object-level
 * features from Sentinel-2 imagery.
 *
 * Notes:
 * - Two separate training sample sets are used to account for seasonal
 *   differences in crop types:
 *   1. Summer crops: ybd_202408 (used for June–October images)
 *   2. Winter crops: ybd_202404 (used for remaining months)
 * - Features used for classification are precomputed per parcel and stored
 *   in object-level images; no additional feature computation is performed here.
 * - The workflow is identical for both seasonal datasets.
 *
 * Author: Xinyu Yang
 * License: MIT
 ************************************************************/

// -----------------------------------------------------------------------------
// 1. List of object-level Sentinel-2 images
// -----------------------------------------------------------------------------
var imageNames = [
  'S2_Ob_2023_01','S2_Ob_2023_02','S2_Ob_2023_03','S2_Ob_2023_04',
  'S2_Ob_2023_05''S2_Ob_2023_06','S2_Ob_2023_07','S2_Ob_2023_08','S2_Ob_2023_09','S2_Ob_2023_10',
  'S2_Ob_2023_11','S2_Ob_2023_12','S2_Ob_2024_01','S2_Ob_2024_02','S2_Ob_2024_03','S2_Ob_2024_04',
  'S2_Ob_2024_05','S2_Ob_2024_06','S2_Ob_2024_07','S2_Ob_2024_08','S2_Ob_2024_09','S2_Ob_2024_10',
  'S2_Ob_2024_11','S2_Ob_2024_12'
];

// ===============================================================
// 2. Feature set for RF classification (precomputed in object-level images)
// ===============================================================
var bandsForClassification = [
  'B3', 'B4', 'nir_min', 'red_median', 'Rapeseed_Index', 
  'red_mean', 'red_max', 'NDVI_min', 'MSAVI_min', 'B2',
  'EVI_min', 'NDWI', 'DEM', 'green_median', 'green_max', 
  'blue_mean', 'red_min', 'green_mean', 'Wheat_Index', 'Stubble_Index', 
  'nir_mean', 'EVI_mean', 'Pond_Index', 'blue_median', 'green_min',
  'EVI', 'NDVI_mean', 'B3_savg', 'NDVI', 'MSAVI_mean'
];

// ===============================================================
// 3. Core function: probability mapping and export
// ===============================================================
var classifyAndExport = function(imageName, sampleCollection) {

  print('Processing image:', imageName);

  // ---------------- Load object-level image ----------------
  // Each image contains precomputed parcel-level features
  var image = ee.Image('projects/ee-yxyxy/assets/' + imageName).float();

  // ---------------- Split training/validation samples ----------------
  // Used only for model stability, not accuracy reporting
  var split = sampleCollection.randomColumn('random', 42);
  var trainingSamples = split.filter(ee.Filter.lt('random', 0.7));

  // ---------------- Sample features for training ----------------
  // Using only precomputed features; no additional computation
  var trainingData = image
    .select(bandsForClassification)
    .sampleRegions({
      collection: trainingSamples,
      properties: ['zhongzhi'],
      scale: 10,
      tileScale: 4
    });

  // ---------------- Train Random Forest classifier ----------------
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

  // ---------------- Predict planting probability ----------------
  var probabilityImage = image
    .select(bandsForClassification)
    .classify(classifier, 'planting_probability')
    .select('planting_probability')
    .float();

  // ---------------- Add Gridcode band (parcel ID) ----------------
  var gridcodeBand = sampleCollection
    .reduceToImage({
      properties: ['gridcode'],
      reducer: ee.Reducer.first()
    })
    .rename('gridcode')
    .float();

  // ---------------- Mask invalid pixels ----------------
  // Ensure B2, B3, B4 are non-zero
  var validMask = image.select(['B2','B3','B4']).reduce(ee.Reducer.allNonZero());

  var exportImage = ee.Image.cat([
    probabilityImage,
    image.select(['B4','B3','B2']).float(),
    gridcodeBand
  ])
    .updateMask(validMask)
    .rename(['planting_probability','B4','B3','B2','gridcode']);

  // ---------------- Export to Google Drive ----------------
  Export.image.toDrive({
    image: exportImage,
    description: imageName + '_probability_RF',
    folder: 'GEE_Exports',
    fileNamePrefix: imageName + '_probability_RF',
    region: roi, // roi: study area boundary
    scale: 10,
    maxPixels: 1e13,
    fileFormat: 'GeoTIFF',
    formatOptions: { cloudOptimized: true }
  });
};

// ===============================================================
// 4. Batch execution with seasonal sample distinction
// ===============================================================

// Summer months: June–October (both 2023 and 2024)
var summerMonths = ['2023_06','2023_07','2023_08','2023_09','2023_10',
                    '2024_06','2024_07','2024_08','2024_09','2024_10'];

// Apply summer crop samples (ybd_202408)
summerMonths.forEach(function(m){
  classifyAndExport('S2_Ob_' + m, ybd_202408);
});

// Winter months: remaining months
var winterMonths = imageNames.filter(function(m){
  return summerMonths.indexOf(m.split('_')[1] + '_' + m.split('_')[2]) === -1;
});

// Apply winter crop samples (ybd_202404)
winterMonths.forEach(function(m){
  classifyAndExport('S2_Ob_' + m, ybd_202404);
});
