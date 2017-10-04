import json2csv from 'json2csv'
import downloadjs from 'downloadjs'

export const downloadTSV = (data, fileName) => {
  try {
    let fields = data[0] ? Object.keys(data[0]) : []
    var result = json2csv({ data, fields, del: '\t'});
    downloadjs(result, fileName+'.tsv', 'text/tsv');
  } catch (err) {
    console.log(err)
  }
}