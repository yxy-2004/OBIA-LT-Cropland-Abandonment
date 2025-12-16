/***************************************************************
 * LandTrendr-based Cropland Abandonment Detection (Template)
 * -----------------------------------------------------------
 * Author: Xinyu Yang
 * Repository: https://github.com/your_repo
 * Description:
 *   This public version contains placeholder dataset IDs and 
 *   provides a minimal, reproducible workflow for LandTrendr-
 *   based abandonment detection. Users must replace the input 
 *   ImageCollection with their own time-series data.
 ***************************************************************/


/***************************************
 * 1. Load Time-Series Input Imagery   *
 ***************************************/

// Placeholder image asset IDs (users must replace with real paths)
var imageIds = [
  'users/your_username/template_2023_10',
  'users/your_username/template_2023_11',
  'users/your_username/template_2023_12',
  'users/your_username/template_2024_01',
  'users/your_username/template_2024_02',
  'users/your_username/template_2024_03',
  'users/your_username/template_2024_04',
  'users/your_username/template_2024_05'
];

// Build an ImageCollection (assumes probability in band 'b1')
var collection = ee.ImageCollection(
  imageIds.map(function(id) { return ee.Image(id); })
).sort('system:time_start');


/***************************************
 * 2. LandTrendr Model Configuration   *
 ***************************************/

var ltParams = {
  maxSegments: 6,
  spikeThreshold: 0.9,
  vertexCountOvershoot: 3,
  preventOneYearRecovery: true,
  recoveryThreshold: 0.5,
  pvalThreshold: 0.05,
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
 * 4. Abandonment Detection (Generic Rule Template)   *
 ******************************************************/

// Example rule (replace with your own research logic):
//   "A significant drop (>0.35) followed by non-recovery"
// Compute difference between consecutive fitted points
var diff = fitted.arraySlice(0, 0, -1)
                 .subtract(fitted.arraySlice(0, 1));

// Drop threshold
var dropMask = diff.lt(-0.35);

// Collapse to single band (pixel abandoned if any drop occurs)
var abandoned = dropMask.arrayReduce(
  ee.Reducer.anyNonZero(), [0]
).rename('abandoned');


/***************************************
 * 5. Visualization (Simple Template)  *
 ***************************************/

// Example region (placeholder polygon)
var region = ee.Geometry.Polygon(
  [[[115.0, 29.0], [116.0, 29.0], [116.0, 30.0], [115.0, 30.0]]]
);

Map.centerObject(region, 10);
Map.addLayer(
  abandoned, 
  {min: 0, max: 1, palette: ['white', 'red']}, 
  'Detected Abandonment'
);


/*******************************************
 * 6. Export Template (Optional, Disabled) *
 *******************************************/

// Uncomment if users want to export results:
// Export.image.toDrive({
//   image: abandoned,
//   description: 'abandonment_result_example',
//   scale: 10,
//   region: region,
//   maxPixels: 1e13
// });


/**************** END OF SCRIPT ****************/
