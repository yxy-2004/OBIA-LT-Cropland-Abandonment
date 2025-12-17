/************************************************************
 * OBIA-LT Cropland Abandonment Monitoring
 *
 * Script: LandTrendr_abandonment.js
 *
 * Description:
 * LandTrendr-based temporal segmentation of parcel-level
 * cultivation probability trajectories for cropland abandonment detection.
 *
 * This script implements the abandonment detection component
 * described in:
 * "Remote Sensing Monitoring of Cropland Abandonment at the Parcel Level
 * Based on Time-Series Fitting of Cultivation Probability Values"
 *
 * Requirements:
 * - Google Earth Engine account
 * - Monthly parcel-level cultivation probability images
 *   (exported from RF_probability_batch.js)
 *
 * Author: Xinyu Yang
 * License: MIT
 ************************************************************/

/***************************************
 * 1. Load Time-Series Input Imagery   *
 ***************************************/

// User-defined monthly parcel-level cultivation probability images
// Each image must contain band 'b1' representing cultivation probability
var imageIds = [
  'S2_Ob_2023_01_probability_',
  'S2_Ob_2023_02_probability_',
  'S2_Ob_2023_03_probability_',
  'S2_Ob_2023_04_probability_',
  'S2_Ob_2023_05_probability_',
  'S2_Ob_2023_06_probability_',
  'S2_Ob_2023_07_probability_',
  'S2_Ob_2023_08_probability_',
  'S2_Ob_2023_09_probability_',
  'S2_Ob_2023_10_probability_',
  'S2_Ob_2023_11_probability_',
  'S2_Ob_2023_12_probability_',
  'S2_Ob_2024_01_probability_',
  'S2_Ob_2024_02_probability_',
  'S2_Ob_2024_03_probability_',
  'S2_Ob_2024_04_probability_',
  'S2_Ob_2024_05_probability_',
  'S2_Ob_2024_06_probability_',
  'S2_Ob_2024_07_probability_',
  'S2_Ob_2024_08_probability_',
  'S2_Ob_2024_09_probability_',
  'S2_Ob_2024_10_probability_',
  'S2_Ob_2024_11_probability_',
  'S2_Ob_2024_12_probability_',
];
imageName + '_parcel_probability_RF
// Build an ImageCollection (assumes probability in band 'b1')
var collection = ee.ImageCollection(
  imageIds.map(function(id) { return ee.Image(id); })
).sort('system:time_start');


/***************************************
 * 2. LandTrendr Model Configuration   *
 ***************************************/

var ltParams = {
  maxSegments: 5,
  spikeThreshold: 0.8,
  vertexCountOvershoot: 2,
  preventOneYearRecovery: false,
  recoveryThreshold: 0.2,
  pvalThreshold: 0.1,
  bestModelProportion: 0.75,
  minObservationsNeeded: 6
};

// Run LandTrendr on band "b1"
var ltResult = ee.Algorithms.TemporalSegmentation.LandTrendr({
  timeSeries: collection.select('b1'),
  maxSegments: ltParams.maxSegments,
  spikeThreshold: ltParams.spikeThreshold,
  vertexCountOvershoot: ltParams.vertexCountOvershoot,
  preventOneYearRecovery: ltParams.preventOneYearRecovery,
  recoveryThreshold: ltParams.recoveryThreshold,
  pvalThreshold: ltParams.pvalThreshold,
  bestModelProportion: ltParams.bestModelProportion,
  minObservationsNeeded: ltParams.minObservationsNeeded
});


/**********************************************
 * 3. Extract Fitted LandTrendr Time Series    *
 ***********************************************/

var ltArray = ltResult.select('LandTrendr');
var fitted = ltArray.arrayFlatten([['fitted']]);   // Extract fitted curve

/******************************************************
 * 4. Cropland Abandonment Detection Logic
 ******************************************************/

// Abandonment is identified based on significant and persistent
// declines in parcel-level cultivation probability trajectories
// fitted by the LandTrendr algorithm.

//   "A significant drop (>0.35) followed by non-recovery"
// Compute difference between consecutive fitted points
var diff = fitted.arraySlice(0, 0, -1)
                 .subtract(fitted.arraySlice(0, 1));

// Drop threshold
var dropMask = diff.lt(-0.35);

// A parcel is flagged as abandoned if at least one
// significant probability decline is detected in the
// fitted LandTrendr trajectory.
// (Users may modify this rule based on specific research needs.)
var abandoned = dropMask.arrayReduce(
  ee.Reducer.anyNonZero(), [0]
).rename('abandoned');


/***************************************
 * 5. Visualization (Simple Template)  *
 ***************************************/

// Example visualization region (not used in analysis)
// Study area boundary (user-defined FeatureCollection or Geometry)
var roi = ee.FeatureCollection('USER_DEFINED_ROI_ASSET');
var region = roi.geometry();

Map.centerObject(region, 10);
Map.addLayer(
  abandoned, 
  {min: 0, max: 1, palette: ['white', 'red']}, 
  'Detected Abandonment'
);


/*******************************************
 * 6. Export Template (Optional, Disabled) *
 *******************************************/

// Export.image.toDrive({
//   image: abandoned,
//   description: 'abandonment_result_example',
//   scale: 10,
//   region: region,
//   maxPixels: 1e13
// });


/**************** END OF SCRIPT ****************/


