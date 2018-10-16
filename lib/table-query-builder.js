let collection = 'Magma::CollectionAttribute';
let fk = 'Magma::ForeignKeyAttribute';
let tbl = 'Magma::TableAttribute';
const links = [collection, fk, tbl];

const createGraph = (models, root) => {
  root.rootDist = 0;
  const queue = [root];
  const visited = new Set();

  while (queue[0]) {
    let model = queue.shift();
    visited.add(model);

    const linkedModels = new Set(Object.values(model.attributes).reduce((acc, curr) => {
      if (links.includes(curr.attribute_class)) {
        const linkedModel = result[curr.model_name];
        acc.push(linkedModel);
      }

      return acc;
    }, []));

    linkedModels.delete(model);

    linkedModels.forEach(m => {
      if (!visited.has(m)) {
        m.rootDist = model.rootDist + 1
      }
    });
    model.links = linkedModels;

    linkedModels.forEach(m => {
      if (!visited.has(m)) {
        queue.push(m);
      }
    });
  }

  return models;
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

    if (lastModel == finish) {
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
  return tableNames.map(n => graph[n]).reduce((farthestTable, currentTable) => {
    if (farthestTable.rootDist < currentTable.rootDist) {
      return currentTable;
    }
    return farthestTable;
  }, graph[tableNames[0]]);
};

const constraints = (path, column, filters) => {
  return filters.map(({ type, value }) => {
    let constraint = [...path, column]
    return constraint.concat([`::${type}`, value])
  })
};

const constructDSLQuery = (query, graph) => {
  const tables = query.map(q => q.name);
  const base = baseTable(tables, graph);

  const dslQuery = query.reduce((acc, curr) => {
    const queryTable = graph[curr.name];

    const path = shortestPath(base, queryTable).slice(1);
    const pathNames = path.map(node => node.name)

    const filters = curr.columns
      .map(({ name, filters }) => constraints(pathNames, name, filters))
      .reduce((acc, curr) => [...acc, ...curr], []);
    const columns = curr.columns.map(({ name }) => ({
        colName: `${queryTable.name}_${name}`,
        path: [...pathNames, name]
    }));
    return {
      constraints: [...acc.constraints, ...filters],
      columns: [...acc.columns, ...columns]
    };

  }, {constraints: [], columns: []});

  return Object.assign(dslQuery, { baseTable: base.name });
};

const wrapString = (str) => `'${str}'`;

const queryToDSL = ({ constraints, columns, baseTable }) => {
  const filters = constraints.map(filter => {

    let filterValue = filter[filter.length - 1]

    if (Array.isArray(filterValue)) {
      filterValue = filterValue.map(wrapString)
      return `[${filter.slice(0, filter.length - 1).map(wrapString)},[${filterValue}]]`
    }

    if (typeof filterValue === "string") {
      filterValue = wrapString(filterValue)
    }

    return `[${filter.slice(0, filter.length - 1).map(wrapString)},${filterValue}]`
  })

  const columnDefinition = columns.map(col => {
    return `${col.colName}: [${col.path.map(wrapString)}]`
  })

  return (
    `@results = table([
      '${baseTable}',
      ${filters},
      '::all',
      [${columnDefinition}]
    ])`
  );

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
