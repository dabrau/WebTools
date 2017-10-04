import { parseString } from 'xml2js'

function readXML(xmlFile) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = evt => resolve({ xml: evt.target.result, fileName: xmlFile.name })
    reader.onerror = err => reject(e)
    reader.readAsText(xmlFile)
  })
}

function xmlToJSObject({ xml, fileName }) {
  return new Promise((resolve, reject) => {
    parseString(xml, (e, r) => {
      if (e) {
        reject(e)
      } else {
        resolve({ obj:r, fileName })
      }
    })
  })
}

function listOfpopulationsParser({ obj, fileName}, propertyParser) {
  return obj.Workspace.SampleList.reduce((acc, sample) => {
    const pops = sample.Sample.reduce((acc, { SampleNode }) => {
      const nodePops = SampleNode.reduce((acc, { $, Subpopulations = [] }) => {
        const sampleNodeName = $.name

        return [ ...acc, ...propertyParser(fileName, sampleNodeName, Subpopulations) ]
      }, [])

      return [ ...acc, ...nodePops ]
    }, [])

    return [ ...acc, ...pops ]
  }, [])
}

export function countsParser(fileName, sampleNodeName, subPops, ancestry = []) {
  return subPops.reduce((acc, { Population = [] }) => {

    const pops = Population.reduce((acc, { $, Subpopulations = [] }) => {
      const pop =  {
        ...$,
        fileName,
        sampleNodeName,
        ancestry: ancestry.join(' | ')
      }

      return [ ...acc, pop, ...countsParser(fileName, sampleNodeName, Subpopulations, [ ...ancestry, $.name ]) ]
    }, [])

    return [ ...acc, ...pops ]
  }, [])
}

export function statisticsParser(fileName, sampleNodeName, subPops, ancestry = []) {
  return subPops.reduce((acc, { Population = [], Statistic = [] }) => {

    const stats = Statistic.map(({ $ }) => {
      return {
        ...$,
        fileName,
        sampleNodeName,
        ancestry: ancestry.join(' | ')
      }
    })

    const pops = Population.reduce((acc, { $, Subpopulations = [] }) => {
      return [ ...acc, ...stats, ...statisticsParser(fileName, sampleNodeName, Subpopulations, [ ...ancestry, $.name ]) ]
    }, [])

    return [ ...acc, ...pops ]
  }, [])
}


export default (files, parser) => {
  const parsedFiles = files.map(f => {
    return readXML(f)
      .then(xmlToJSObject)
      .then(result => listOfpopulationsParser(result, parser))
  })

  return Promise.all(parsedFiles)
    .then(values => values.reduce((acc, curr) => [...acc, ...curr]))
}