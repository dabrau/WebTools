let collection = 'Magma::CollectionAttribute';
let fk = 'Magma::ForeignKeyAttribute';
let tbl = 'Magma::TableAttribute';
const links = new Set([collection, fk, tbl]);

export const createGraph = (models, rootName, pivotName) => {
  let graph = Object.entries({ ...models })
    .filter(([tableName, table]) => {
      return tableName !== rootName
    })
    .reduce((acc, [tableName, table]) => {
      const tableAttr = { tableName };

      Object.entries({...table.template.attributes})
        .filter(([colName, col]) => !(col.attribute_class === fk && col.model_name === rootName))
        .forEach(([colName, col]) => tableAttr[colName] = { ...col });

      const containsLink = Object.values(tableAttr)
        .map(att => att.attribute_class)
        .reduce((containsLink, attClass) => {
          if (!containsLink) {
            return links.has(attClass)
          }
          return containsLink
        }, false);

      if (containsLink) {
        acc[tableName] = tableAttr
      }

      return acc;
    }, {});
  let nodes = Object.values(graph);

  nodes
    .forEach(model => {
      const linkedModels = Object.values(model)
        .filter(column => links.has(column.attribute_class))
        .map(column => graph[column.model_name])
        .filter(linkModel => linkModel && linkModel !== model);
      model.links = new Set(linkedModels)
    });

  const terminalNodes = nodes.filter(n => n.links.size === 1);

  terminalNodes
    .map(n => shortestPath(n, graph[pivotName]))
    .forEach(path => {
      path
        .forEach((node, ind) => {
          const dist = path.length - ind - 1;
          if (isNaN(node.rootDist) || node.rootDist < dist) {
            node.rootDist = dist
          }
        })
    });
  return graph;
};

const shortestPath = (start, finish) => {
  let initPath = {
    path: [start],
    visited: new Set([start])
  };
  let queue = [initPath];

  while (queue[0]) {
    let path = queue.shift();


    let lastModel = path.path[path.path.length - 1];

    if (lastModel === finish) {
      return path.path;
    }

    lastModel.links.forEach(m => {
      if (!path.visited.has(m)) {
        const newPath = {
          path: path.path.slice(),
          visited: new Set(path.visited)
        };
        newPath.visited.add(m);
        newPath.path.push(m);
        queue.push(newPath);
      }
    });
  }
};

const baseTable = (tableNames, graph) => {
  return tableNames
    .map(n => graph[n])
    .reduce((farthestTable, currentTable) => {
      if (farthestTable.rootDist < currentTable.rootDist) {
        return currentTable;
      }
      return farthestTable;
    }, graph[tableNames[0]]);
};

const constraints = (path, column, filters) => {
  return filters.map(({ comparator, value }) => {
    let constraint = [...path, column];

    const noValues = ['has', 'true', 'false'];
    if (noValues.includes(comparator)) {
      return constraint.concat([`::${comparator}`]);
    }

    if (Array.isArray(comparator)) {
      let comp = comparator.map(c => `::${c}`);

      if (comparator.includes('in')) {
        return constraint.concat([...comp, value.split(',').map(s => s.trim())])
      }

      return constraint.concat([...comp, value]);
    }

    if (comparator ==='in' && value) {
      return constraint.concat([`::${comparator}`, value.split(',').map(s => s.trim())])
    }

    const numComparators = ['<', '<=', '>', '>=', '='];
    if (numComparators.includes(comparator) && !isNaN(value)) {
      return constraint.concat([`::${comparator}`, Number(value)]);
    }

    return constraint.concat([`::${comparator}`, value]);
  })
};

export const constructDSLQuery = (query, graph) => {
  const tables = query.map(q => q.name);
  const base = baseTable(tables, graph);

  const dslQuery = query.reduce((acc, curr) => {
    const queryTable = graph[curr.name];

    const path = shortestPath(base, queryTable).slice(1);
    const pathNames = path.map(node => node.tableName);

    const filters = curr.columns
      .map(({ name, filters }) => constraints(pathNames, name, filters))
      .reduce((acc, curr) => [...acc, ...curr], []);
    const columns = curr.columns.map(({ name }) => {
      let path = [...pathNames, name];
      let attributeClass = graph[queryTable.tableName][name].attribute_class;
      switch (attributeClass) {
        case 'Magma::ForeignKeyAttribute':
          path.push('::identifier');
          break;
        case 'Magma::FileAttribute':
          path.push('::url');
          break;
        case 'Magma::ImageAttribute':
          path.push('::url');
          break;
      }
      return {
        colName: `${queryTable.tableName}_${name}`,
        path
      }
    });
    return {
      constraints: [...acc.constraints, ...filters],
      columns: [...acc.columns, ...columns]
    };

  }, {constraints: [], columns: []});

  return Object.assign(dslQuery, { baseTable: base.tableName });
};

export const queryToDSL = ({ constraints, columns, baseTable }) => {
  return [baseTable, ...constraints, '::all', [...columns.map(c => c.path)]];
};



//filter examples

/*let stringFilter = {
  table: '',
  column: '',
  type: 'in',
  value: [],
};

let stringMatchesFilter = {
  table: '',
  column: '',
  type: 'matches',
  value: '',
};

let integerDTFilter = {
  table: '',
  column: '',
  type: '<=', // <, >=, >, =
  value: '',
};

let notNullFilter = {
  table: '',
  column: '',
  type: 'has'
};*/


//example use case
/*let table =  {
  name: 'project',
  columns: [
    {
      name: "name",
      filters: [
        {type: 'in', value: ['Melanoma', 'Kidney']}
      ]
    }
  ]
};


let table2 =  {
  name: 'sample',
  columns: [
    {
      name: "sample_name",
      filters: [
        {type: 'matches', value: 'Foo'},
        {type: 'in', value: 'cowpie'}
      ]
    },
    {
      name: "post_digest_cell_count",
      filters: [
        {type: '>', value: 4},
        {type: '<=', value: 10},
      ]
    }
  ]
};

let modelsJson = require('./sample_data.js');

const result = Object.entries(modelsJson.models).reduce((acc, curr) => {
  acc[curr[0]] = curr[1].template;
  return acc;
}, {});

const project = result['project'];
const graph = createGraph(result, project);

let x = constructDSLQuery([table, table2], graph);
console.log(queryToDSL(x))*/


//example query
/*
@treatments = table([
  'mfi',
  ['name', '::equals', 'Lag3'],
  ['population', 'stain', '::equals', 'treg'],
  ['population', 'name', '::in', ['Q3: CD8a+,CD4-', 'Q1: CD8a-,CD4+']],
  '::all',
  [
    mfi_name: ['name'],
  mfi_value: ['value'],
  population_stain: [ 'population', 'stain'],
  population_name: [ 'population', 'name'],
  populationn_name: [ 'population', 'sample', 'sample_name']
]
])*/
