const magmaQuery = require('./magma_response.js')

const idToValueMap = (colArray, preprendId = '') => {
  const values = colArray.reduce((idsToValue, [id, value]) => {
    const rowId = `${preprendId}.${id}`
    if (Array.isArray(value)) {

      if (value.length === 0) {
        idsToValue[rowId] = null
        return idsToValue
      }

      return Object.assign(idsToValue, idToValueMap(value, rowId))
    }

    idsToValue[rowId] = value
    return idsToValue
  }, {})

  if (Object.getPrototypeOf(values) === Object.prototype) {
    const numValues = Object.keys(values).length;
    if (numValues === 0) {
      return null;
    }
  }

  return values;
}


// const colToTableMap = {
//   regimen_regimen_type: 'regimen',
//   regimen_response: 'regimen',
//   treatment_category: 'treatment',
//   treatment_name: 'treatment',
//   treatment_subtype: 'treatment',
//   rna_seq_tube_name: 'rna_seq'
// }

const respAnswerByTableColumn = (colToTableMap, columns, [id, value]) => {
  return columns.reduce((tableToColumns, currCol, ind) => {
    const table = colToTableMap[currCol]
    const colValue = Array.isArray(value[ind]) ? idToValueMap(value[ind]) : value[ind]

    if (tableToColumns[table]) {
      return {
        ...tableToColumns,
        [table]: {
          ...tableToColumns[table],
          [currCol]: colValue
        }
      }
    }

    return {
      ...tableToColumns,
      [table]: { [currCol]: colValue }
    }
  }, {});
};


const testMap = {
  "regimen_regimen_type":"regimen",
  "regimen_response":"regimen",
  "treatment_category":"treatment",
  "treatment_subtype":"treatment",
  "rna_seq_tube_name":"rna_seq"
}

const testColumns = ["regimen_regimen_type","regimen_response","treatment_category","treatment_subtype","rna_seq_tube_name"]

const testValue = [2951,["Neoadjuvant","Stable Disease","Drug","Immunotherapy",[["IPIMEL054.T1",[["IPIMEL054.T1.rna.myeloid","IPIMEL054.T1.rna.myeloid"],["IPIMEL054.T1.rna.tumor","IPIMEL054.T1.rna.tumor"],["IPIMEL054.T1.rna.tcell","IPIMEL054.T1.rna.tcell"],["IPIMEL054.T1.rna.stroma","IPIMEL054.T1.rna.stroma"]]]]]]

const test = respAnswerByTableColumn(testMap, testColumns, testValue)


const tableRows = (rowValues) => {
  const rowIds = Object.values(rowValues).reduce((accIds, values) => {
    if (values !== null && Object.getPrototypeOf(values) === Object.prototype) {
      return [...accIds, ...Object.keys(values)];
    }

    return accIds;
  }, [])

  const uniqueIds = Array.from(new Set(rowIds));

  return uniqueIds.map((id) => {
    return Object.keys(rowValues).reduce((row, colName) => {
      const value = rowValues[colName][id] ? rowValues[colName][id] : null;
      return Object.assign(row, { [colName]: value })
    }, {})
  })
}


const rowObjs = (responseAnswer) => {
  if (Array.from(Object.values(responseAnswer)).find((value) => value !== null && Object.getPrototypeOf(value) === Object.prototype)) {
    return  tableRows(responseAnswer)
  }

  return [responseAnswer]

}


const joinRowsObjs = (rowByTable) => {
  const rowByTableObjects = Object.entries(rowByTable).reduce((tables, [tableName, value], ind) => {
    tables[tableName] = rowObjs(value);

    return tables
  }, {})

  const joined = Object.values(rowByTableObjects).reduce((acc, curr) => {
    return acc.map(row => {
      return curr.map(joinedRow => {
        return {
          ...row,
          ...joinedRow
        }
      })
    }).reduce((acc, curr) => [...acc, ...curr])
  })


  return joined;
}

// const lastRow = magmaQuery.response.answer[magmaQuery.response.answer.length - 1]
// const rowByTable = respAnswerByTableColumn(colToTableMap, magmaQuery.reqColumns, lastRow)
// const rowObjects = rowObjs(rowByTable.rna_seq)

export const responseToRowObjs = (colToTableMap, columnNames, responseAnswer) => {
  return responseAnswer.map(row => {
    return joinRowsObjs(
      respAnswerByTableColumn(colToTableMap, columnNames, row)
    )
  }).reduce((acc, curr) => [...acc, ...curr], [])
}

//console.log(responseToRowObjs(colToTableMap, magmaQuery.response.answer))




const arrResp =      [ [ 'IPIGYN064.T2', [] ],
  [ 'IPIGYN064.T1',
    [ [ 'IPIGYN064.T1.rna.tcell', 'IPIGYN064.T1.rna.tcell' ],
      [ 'IPIGYN064.T1.rna.cd11bposhladrneg',
        'IPIGYN064.T1.rna.cd11bposhladrneg' ],
      [ 'IPIGYN064.T1.rna.epcam', 'IPIGYN064.T1.rna.epcam' ],
      [ 'IPIGYN064.T1.rna.myeloid', 'IPIGYN064.T1.rna.myeloid' ],
      [ 'IPIGYN064.T1.rna.live', 'IPIGYN064.T1.rna.live' ] ] ] ]



//console.log(idToValueMap(arrResp), "what is this over here")



//const result = rowObjs(magmaQuery.reqColumns, magmaQuery.response.answer);

//console.log(result.filter(x => x.rna_seq_tube_name))