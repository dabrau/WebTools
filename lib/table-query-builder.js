let collection = 'Magma::CollectionAttribute';
let fk = 'Magma::ForeignKeyAttribute';
let tbl = 'Magma::TableAttribute';
const links = [collection, fk, tbl];

export const createGraph = (models, rootName) => {
  const result = Object.entries(models).reduce((acc, curr) => {
    acc[curr[0]] = curr[1].template.attributes;
    acc[curr[0]].tableName = curr[0]
    return acc;
  }, {});

  const root = result[rootName];
  root.rootDist = 0;
  const queue = [root];
  const visited = new Set();

  while (queue[0]) {
    let model = queue.shift();
    visited.add(model);

    const linkedModels = new Set(Object.values(model).reduce((acc, curr) => {
      if (links.includes(curr.attribute_class)) {
        const linkedModel = result[curr.model_name];
        acc.push(linkedModel);
      }

      return acc;
    }, []));

    linkedModels.delete(model);

    linkedModels.forEach(m => {
      if (!visited.has(m)) {
        m.rootDist = model.rootDist + 1;
      }
    });
    model.links = linkedModels;

    linkedModels.forEach(m => {
      if (!visited.has(m)) {
        queue.push(m);
      }
    });
  }

  return result;
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
  console.log(graph)
  return tableNames.map(n => {
    //let node = { ...graph[n] };
    let node = graph[n];
    //node.tableName = n;
    return node;
  }).reduce((farthestTable, currentTable) => {
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

const wrapString = (str) => `'${str}'`;

export const queryToDSL = ({ constraints, columns, baseTable }) => {
  // const filters = constraints.map(filter => {
  //
  //   let filterValue = filter[filter.length - 1];
  //
  //   if (Array.isArray(filterValue)) {
  //     filterValue = filterValue.map(wrapString);
  //     return `[${filter.slice(0, filter.length - 1).map(wrapString)},[${filterValue}]]`;
  //   }
  //
  //   if (typeof filterValue === "string") {
  //     filterValue = wrapString(filterValue);
  //   }
  //
  //   return `[${filter.slice(0, filter.length - 1).map(wrapString)},${filterValue}],`;
  // });
  //
  // const columnDefinition = columns.map(col => {
  //   return `${col.colName}: [${col.path.map(wrapString)}]`;
  // });

  let query = [baseTable, ...constraints, '::all', [...columns.map(c => c.path)]]
  console.log(query)

  //console.log(baseTable, "base table")
  //console.log(constraints, "filters")
  //console.log(columns)

  //console.log(filters, "filters")
  //console.log(columnDefinition, "columndefintions")

  //console.log([baseTable], "query array")
  return query//(
    //`@results = table(
    // `[
    //   '${baseTable}',
    //   ${filters}
    //   '::all',
    //   [${columnDefinition}]
    // ]`
    //)`
  //);

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
