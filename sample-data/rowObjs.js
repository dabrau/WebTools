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

  return Object.keys(values).length > 0 ? values : null
}

const colToTableMap = {
  regimen_regimen_type: 'regimen',
  regimen_response: 'regimen',
  treatment_category: 'treatment',
  treatment_name: 'treatment',
  treatment_subtype: 'treatment',
  rna_seq_tube_name: 'rna_seq'
}

const respAnswerByTableColumn = (colToTableMap, columns, [id, value]) => {
  return columns.reduce((tableToColumns, currCol, ind) => {
    const table = colToTableMap[currCol]
    const colValue = Array.isArray(value[ind]) ? idToValueMap(value[ind]) : value[ind]
    //console.log(colValue)
    //const colValue = value[ind]

    if (tableToColumns[table]) {
      tableToColumns[table][currCol] = colValue
    } else {
      tableToColumns[table] = { [currCol]:colValue }
    }

    return tableToColumns
  }, {})
}

const tableRows = (rowValues) => {
  const rowIds = Object.values(rowValues).reduce((accIds, values) => {
    if (typeof values === 'object' && values !== null) {
      return [...accIds, ...Object.keys(values)]
    }

    return accIds
  }, [])

  return rowIds.map((id) => {
    return Object.keys(rowValues).reduce((row, colName) => {
      const value = rowValues[colName][id] ? rowValues[colName][id] : rowValues[colName];
      return Object.assign(row, { [colName]: value })
    }, {})
  })
}


const rowObjs = (responseAnswer) => {

  if (Array.from(Object.values(responseAnswer)).find((value) => typeof value === 'object' && value !== null)) {
    return  tableRows(responseAnswer)
  }

  return [responseAnswer]

}


const joinRowsObjs = (rowByTable) => {
  const rowByTableObjects = Object.entries(rowByTable).reduce((tables, [tableName, value]) => {
    tables[tableName] = rowObjs(value)
    return tables
  }, {})

  const joined = Object.values(rowByTableObjects).reduce((acc, curr) => {
    return acc.map(row => {
      return curr.map(joinedRow => {
        return Object.assign(row, joinedRow)
      })
    }).reduce((acc, curr) => [...acc, ...curr], [])
  })

  return joined;
}

const lastRow = magmaQuery.response.answer[magmaQuery.response.answer.length - 1]
const rowByTable = respAnswerByTableColumn(colToTableMap, magmaQuery.reqColumns, lastRow)
const rowObjects = rowObjs(rowByTable.rna_seq)

export const responseToRowObjs = (colToTableMap, responseAnswer) => {
  return responseAnswer.map(row => {
    return joinRowsObjs(
      respAnswerByTableColumn(colToTableMap, Object.keys(colToTableMap), row)
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