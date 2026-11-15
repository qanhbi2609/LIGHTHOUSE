'use strict';
const path=require('node:path');
// Keep the comparison demo separate from previous workflow data and user edits.
const comparison=process.env.LIGHTHOUSE_DEMO_DATASET!=='workflow';
const dataDir=path.resolve(process.env.LIGHTHOUSE_DATA_DIR||path.join(__dirname,'data'));
module.exports={comparison,dataDir,dataFile:path.join(dataDir,comparison?'figma-demo-v1.json':'lighthouse.json')};
