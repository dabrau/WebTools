import React, { Component } from 'react';
import {MenuItem, InputGroup, FormControl, DropdownButton, Form, ButtonGroup, Button, FormGroup, ControlLabel } from 'react-bootstrap';
import Datetime from 'react-datetime';
import moment from 'moment';
import {
  Accordion,
  AccordionItem,
  AccordionItemTitle,
  AccordionItemBody,
} from 'react-accessible-accordion';
import { CSSTransition, TransitionGroup } from 'react-transition-group';

import { createGraph, constructDSLQuery, queryToDSL } from '../../lib/table-query-builder';
import { downloadTSV } from '../../lib/download';
import { responseToRowObjs } from '../../sample-data/rowObjs';


import ReactTable from 'react-table';
import 'react-table/react-table.css';
import FoldableTableHOC from './foldableTable'

const FoldableTable = FoldableTableHOC(ReactTable);

const getModels = (token) => {
  return fetch('http://magma.ucsf.edu/retrieve', {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Etna ${token}`,
      'Accept': 'application/json, text/*'
    },
    body: JSON.stringify({
      'project_name': 'ipi',
      'model_name': 'all',
      'record_names': [],
      'attribute_names': 'all'
    }),
  })
  .then(resp => resp.json())
  .then(result => result.models)
};

const getResults = (token, queryArray, colNames, columns) => {
  return fetch('http://magma.ucsf.edu/query', {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Etna ${token}`,
      'Accept': 'application/json, text/*'
    },
    body: JSON.stringify({
      project_name: 'ipi',
      query: queryArray
    })
  })
    .then(resp => resp.json())
    .then((json) => {
      const colNamesToTableNameMap = columns.reduce((acc, col) => {
        const columnId = `${col.table}_${col.column}`;
        if (!acc[columnId]) {
          acc[columnId] = col.table
        }

        return acc
      }, {});

      return respToObjects(colNames, colNamesToTableNameMap)(json)
    })
};

const respToObjects = (colNames, colNamesToTableNameMap) => resp => {
  if (resp.answer) {
    return responseToRowObjs(colNamesToTableNameMap, colNames, resp.answer)
  }

  return [];
};

class MagmaQueryContainer extends Component {
  constructor() {
    super();

    this.state = {
      apiKey: '',
      models: {},
      filters: {},
      columns: [],
      filterableModels: {},
      results: [],
    };

    this.addFilter = this.addFilter.bind(this);
    this.removeFilter = this.removeFilter.bind(this);
    this.updateFilter = this.updateFilter.bind(this);
    this.clearFilters = this.clearFilters.bind(this);

    this.addColumn = this.addColumn.bind(this);
    this.removeColumn = this.removeColumn.bind(this);
    this.updateModels = this.updateModels.bind(this);
    this.updateApiKey = this.updateApiKey.bind(this);
    this.updateResults = this.updateResults.bind(this);
  }

  updateResults(results) {
    this.setState({ results: results });
  }

  updateApiKey(apiKey) {
    this.setState({ apiKey: apiKey });
  }

  updateModels(models) {
    this.setState(currState => {
      const graphModels = createGraph(models, 'project', 'experiment');
      return {
        ...currState,
        models: graphModels,
        filterableModels: this.filterableModels(currState.models, currState.columns)
      }
    });
  }

  addColumn(tableName, columnName) {
    this.setState(currState => {
      if (currState.columns.filter(({ table, column }) => tableName === table && columnName === column).length > 0) {
        return currState
      }

      const columns = [
        ...currState.columns,
        {
          table: tableName,
          column: columnName,

        }
      ];
      return {
        ...currState,
        columns,
        filterableModels: this.filterableModels(currState.models, columns)
      };
    })
  }

  removeColumn(tableName, columnName) {
    this.setState(currState => {
      const columns = currState.columns.filter(({ column, table }) => {
        return !(column === columnName && table === tableName)
      });

      return {
        ...currState,
        columns: columns,
        filterableModels: this.filterableModels(currState.models, columns)
      };
    })
  }

  filterableModels(models, columns) {
    return columns.reduce((acc, {table, column}) => {
      if (!acc[table]) {
        return {
          ...acc,
          [table]: {
            [column]: {...models[table][column]}
          }
        };
      }

      return {
        ...acc,
        [table]: {
          ...acc[table],
          [column]: {...models[table][column]}
        }
      };
    }, {});
  }

  addFilter(filter) {
    this.setState(currState => ({
      ...currState,
      filters: {
        [filter.id]: filter,
        ...currState.filters
      }
    }))
  }

  removeFilter(filterId) {
    this.setState(currState => {
      let updatedFilters = {...currState.filters};
      delete updatedFilters[filterId];

      return {
        ...currState,
        filters: updatedFilters
      };
    });
  }

  updateFilter(id, property, value) {
    this.setState(currState => {
      let updatedFilter = {...currState.filters[id]};
      updatedFilter[property] = value;

      return {
        ...currState,
        filters : {
          ...currState.filters,
          [id]: updatedFilter
        }
      }
    })
  }

  clearFilters() {
    this.setState(currState => ({...currState, filters:{}}))
  }

  render() {
    return (
      <div className='table-builder-container'>
        <HeaderContainer updateModels={this.updateModels} updateApiKey={this.updateApiKey} apiKey={this.state.apiKey}/>
        <div className='table-container'>
          <ColumnPickerContainer
            models={this.state.models}
            selectedColumns={this.state.columns}
            addColumn={this.addColumn}
            removeColumn={this.removeColumn}
          />
          <div className='table-view-container'>
            <FiltersContainer
              models={this.state.filterableModels}
              addFilter={this.addFilter}
              filters={this.state.filters}
              removeFilter={this.removeFilter}
              updateFilter={this.updateFilter}
              clearFilters={this.clearFilters}
            />
            <Apply
              filters={this.state.filters}
              columns={this.state.columns}
              models={this.state.models}
              apiKey={this.state.apiKey}
              updateResults={this.updateResults}
              data={this.state.results}
            />
            <TableContainer columns={this.state.columns} data={this.state.results}/>
          </div>
        </div>
      </div>
    );
  }
}

class TableContainer extends Component {
  constructor(props) {
    super(props);

    this.state = { tableHeaders: this.tableHeaders(props.columns) };
  }

  componentWillReceiveProps(nextProps) {
    this.setState({ tableHeaders: this.tableHeaders(nextProps.columns) })
  }

  tableHeaders(columns) {
    return columns.reduce((acc, col) => {
      let header = acc.find(h => h.Header === titleCase(col.table));
      if (!header) {
        acc.push({
          Header: titleCase(col.table),
          foldable: true,
          columns: [
            {
              Header: titleCase(col.column),
              accessor: `${col.table}_${col.column}`
            }
          ]
        });
      } else {
        header.columns.push({ Header: titleCase(col.column), accessor: `${col.table}_${col.column}`})
      }

      return acc;
    }, [])
  }

  render() {
    return <Table headers={this.state.tableHeaders} data={this.props.data}/>
  }
}




const Table = ({ headers, data }) => (
  <FoldableTable
    data={data}
    className='-striped -highlight'
    defaultPageSize={25}
    columns={headers}
  />
);

class Apply extends Component {
  constructor(props) {
    super(props);

    this.state = {
      query: this.queryArray(props.columns, props.filters, props.models)
    };

    this.handleApply = this.handleApply.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    const newQueryArray = this.queryArray(nextProps.columns, nextProps.filters, nextProps.models);
    if (this.state.query.array.toString() !== newQueryArray.array.toString()) {
      this.setState({ query: newQueryArray })
    }
  }

  queryArray(columns, filters, models) {
    const query = columns.reduce((acc, col) => {
      let table = acc.find(table => table.name && table.name === col.table);

      if (table) {
        table.columns.push({ name: col.column, filters: [] });
      } else {
        table = {
          name: col.table,
          columns: [
            {
              name: col.column,
              filters: []
            }
          ]
        };
        acc.push(table)
      }

      return acc;
    }, []);

    Object.values(filters).forEach(filter => {
      let table = query.find(t => t.name === filter.column.tableName);

      if (table) {
        let column = table.columns.find(col => col.name === filter.column.column);

        if (column) {
          column.filters.push({
            comparator: filter.comparator.comparator,
            value: filter.value
          })
        }
      }
    });

    if (query.length > 0) {
      const dsl = constructDSLQuery(query, models);
      return { array: queryToDSL(dsl), columns: dsl.columns.map(c => c.colName) };
    }

    return { array: [], columns: []};
  }

  handleApply() {
    getResults(this.props.apiKey, this.state.query.array, this.state.query.columns, this.props.columns)
      .then(this.props.updateResults)
  }

  render() {
    return (
      <div className='apply-buttons'>
        <ButtonGroup>
          <Button onClick={this.handleApply}>
            <span className='glyphicon glyphicon-th-list' aria-hidden='true' />
            Apply
          </Button>
          <Button onClick={()=> downloadTSV(this.props.data, 'table_download')}>
            <span className='glyphicon glyphicon-download-alt' aria-hidden='true' />
            Download
          </Button>
        </ButtonGroup>
      </div>
    )
  }
}

const DatePicker = (onChange, value) => (
  <Datetime onChange={e => onChange(e.format())} value={moment(value)} />
);

const StringInput = (onChange, value, placeHolder) => (
  <FormControl
    type='text'
    value={value}
    placeholder={placeHolder}
    onChange={e => onChange(e.target.value)}
  />
);


const IncludesInput = (onChange, value) => StringInput(onChange, value, 'comma separated - item1, item2, item3');
const MatchInput = (onChange, value) => StringInput(onChange, value, 'regular expression');
const IntInput = (onChange, value) => StringInput(onChange, value, 'example: 1234');
const FloatInput =  (onChange, value) => StringInput(onChange, value, 'example: 12.34');

class FiltersContainer extends Component {
  constructor(props) {
    super(props);

    this.state = {
      collapsed: true,
      columnOptions: this.modelsToColumnOptions(props.models)
    };

    const baseComparators = [{comparator: 'has', displayName: 'not empty'}];
    const numericComparators = [
      {comparator: '=', displayName: 'equal to'},
      {comparator: '<=', displayName: 'less than or equal to'},
      {comparator: '<', displayName: 'less than'},
      {comparator: '>=', displayName: 'greater than or equal to'},
      {comparator: '>', displayName: 'greater than'}
    ];
    const dateComparators = [
      {comparator: '=', displayName: 'on'},
      {comparator: '<', displayName: 'before'},
      {comparator: '>', displayName: 'after'},
    ];
    const stringComparators = [
      {comparator: 'in', displayName: 'includes'},
      {comparator: 'matches', displayName: 'matches'}
    ];
    const boolComparators = [
      {comparator: 'true', displayName: 'yes'},
      {comparator: 'false', displayName: 'no'}
    ];
    const foreignKeyComparators = [
      {comparator: ['identifier', 'in'], displayName: 'includes'},
      {comparator: ['identifier', 'matches'], displayName: 'matches'}
    ];

    this.typeOptions = {
      Integer: [...numericComparators, ...baseComparators],
      Float: [...numericComparators, ...baseComparators],
      DateTime: [...dateComparators, ...baseComparators],
      String: [...stringComparators, ...baseComparators],
      TrueClass: [...boolComparators, ...baseComparators],
      ForeignKey: [...foreignKeyComparators, ...baseComparators]
    };

    this.valueInputMap = {
      Integer: IntInput,
      DateTime: DatePicker,
      Float: FloatInput,
    };

    this.toggleFilterList = this.toggleFilterList.bind(this);
    this.getComparatorOptions = this.getComparatorOptions.bind(this);
    this.getInputField = this.getInputField.bind(this);
    this.addFilter = this.addFilter.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({columnOptions: this.modelsToColumnOptions(nextProps.models)});
  }

  modelsToColumnOptions(models) {
    //{ displayName, table, column, type }
    return Object.entries(models).reduce((acc, [tableName, columns]) => {
      const options = Object.values(columns)
        .filter(({ name, shown, type }) => ![
          'link',
          'rootDist'].includes(name) && shown) //hack to remove non-column properties
        .map(({ name, display_name, type }) => {
          return {
            tableName: tableName,
            column: name,
            displayName: `${titleCase(tableName)} - ${display_name}`,
            type: type || 'ForeignKey'
          };
        });

      return [...acc, ...options];
    }, []);
  }

  toggleFilterList() {
    this.setState((currState) => ({ collapsed: !currState.collapsed }))
  }

  getComparatorOptions({ type }) {
    return this.typeOptions[type];
  }

  getInputField({ type }, { comparator }) {
    if (comparator === 'has' || type === 'TrueClass') {
      return () => null;
    }

    if (type === 'String' || type === 'ForeignKey') {
      if (comparator === 'in' || comparator.includes('in')) {
        return IncludesInput;
      }
      if (comparator === 'matches' || comparator.includes('matches')) {
        return MatchInput;
      }
    }

    return this.valueInputMap[type];
  }

  addFilter() {
    if (this.state.columnOptions.length > 0) {
      const firstColumn = this.state.columnOptions[0];
      const comparator = this.getComparatorOptions(firstColumn)[0];

      this.props.addFilter({
        id: Math.random(),
        column: firstColumn,
        comparator,
        value: undefined
      });
    }
  }

  renderFilters() {
    return Object.values(this.props.filters).map(({ id, column, comparator, value }) => (
      <CSSTransition
        key={id}
        timeout={300}
        classNames='fade'
      >
        <Filter
          key={id}
          id={id}
          removeFilter={() => this.props.removeFilter(id)}
          updateFilter={(property, newValue) => this.props.updateFilter(id, property, newValue)}
          columnOptions={this.state.columnOptions}
          selectedColumn={column}
          getComparatorOptions={this.getComparatorOptions}
          selectedComparator={comparator}
          getInputField={this.getInputField}
          value={value}
        />
      </CSSTransition>
    ));
  }

  renderFilterContainer() {
    return (
      <Form componentClass='fieldset' inline>
        <ButtonGroup>
          <Button onClick={this.addFilter}>
            <span className='glyphicon glyphicon-plus' aria-hidden='true'/>
            Add Filter
          </Button>
          <Button onClick={this.props.clearFilters}>
            <span className='glyphicon glyphicon-erase' aria-hidden='true'/>
            Clear All
          </Button>
        </ButtonGroup>
        <div className='filters-holder'>
          <TransitionGroup className="filter-list">
            {this.renderFilters()}
          </TransitionGroup>
        </div>
      </Form>
    );
  }

  render() {
    const filters = this.state.collapsed ? <div></div> : this.renderFilterContainer();

    return (
      <div className='filters-container'>
        <Button onClick={this.toggleFilterList}>
            <span className='glyphicon glyphicon-filter' aria-hidden='true' />
            Filters
        </Button>
          <CSSTransition
            in={!this.state.collapsed}
            timeout={1000}
            classNames='slide'
          >
            {filters}
          </CSSTransition>
      </div>
    );
  }
}

const DropDown = ({ options = [], selected = {}, onSelect, ...props }) => (
  <DropdownButton
    id={props.id || Math.random()}
    title={selected.displayName || ''}
    componentClass={props.componentClass}
    onSelect={onSelect}
  >
    {options.map((option, i) => <MenuItem key={i} eventKey={option}>{option.displayName}</MenuItem>)}
  </DropdownButton>
);

const Filter = ({
  columnOptions,
  selectedColumn,
  getComparatorOptions,
  selectedComparator,
  getInputField,
  removeFilter,
  updateFilter,
  value,
}) => {
  const comparatorOptions = getComparatorOptions(selectedColumn);

  let comparator = undefined;
  if (comparatorOptions.includes(selectedComparator)) {
    comparator = selectedComparator
  } else {
    comparator = comparatorOptions[0];
    updateFilter('comparator', comparator)
  }

  if (selectedColumn.type === 'DateTime' && !value) {
    updateFilter('value', moment(undefined).format())
  }

  const inputField = getInputField(selectedColumn, comparator);

  let validationState = undefined;
  let validationMsg = undefined;

  if (value !== undefined && selectedColumn.type === 'Float' || selectedColumn.type === 'Integer') {
    if (isNaN(value)) {
      validationState = 'error';
      validationMsg = 'Filter value must be a number'
    }
  }

  if (columnOptions.filter(co =>
    co.tableName === selectedColumn.tableName && co.column === selectedColumn.column).length === 0
  ) {
    validationState = 'warning';
    validationMsg = 'Filter not applied - column must be in table'
  }

  return (
    <div>
      <FormGroup controlId='formValidationWarning3' validationState={validationState}>
      <div>
        <ControlLabel>{validationMsg}</ControlLabel>
      </div>
      <ButtonGroup>
        <Button onClick={removeFilter}>
          <span className='glyphicon glyphicon-remove' aria-hidden='true' />
        </Button>
        <DropDown
          options={columnOptions}
          selected={selectedColumn}
          onSelect={(e) => updateFilter('column', e)}
        />
      </ButtonGroup>
      <InputGroup>
        <DropDown
          componentClass={InputGroup.Button}
          options={comparatorOptions}
          selected={comparator}
          onSelect={(e) => updateFilter('comparator', e)}
        />
        {inputField((inputValue) => updateFilter('value', inputValue) , value)}
      </InputGroup>
      </FormGroup>
    </div>
  )
};

class HeaderContainer extends Component {
  constructor() {
    super();

    this.handleUpdateApiKey = this.handleUpdateApiKey.bind(this);
    this.handleAuth = this.handleAuth.bind(this);
  }

  handleUpdateApiKey(e) {
    this.props.updateApiKey(e.target.value)
  }

  handleAuth() {
    getModels(this.props.apiKey)
      .then(this.props.updateModels)
  }

  render() {
    return <Header handleAuth={this.handleAuth} updateApiKey={this.handleUpdateApiKey} apiKey={this.props.apiKey}/>
  }
}

const Header = ({ handleAuth, updateApiKey, apiKey }) => (
  <div className='table-header-container'>
    <h1>Table Builder</h1>
    <div className={'input-group api-key-input'}>
      <input type={'text'} className={'form-control'} placeholder={'API key'} onChange={updateApiKey} value={apiKey}/>
      <span className={'input-group-btn'} >
        <button className={'btn btn-default'} type={'button'} onClick={handleAuth}>Authorize</button>
      </span>
    </div>
  </div>
);

const capitalize = ([s, ...tring]) => (
  [s.toUpperCase(), ...tring]
    .join('')
);
const titleCase = str => (
  str
    .split('_')
    .map(capitalize)
    .join(' ')
);

const ColumnPickerContainer = ({ models, addColumn, removeColumn, selectedColumns}) => {
  const tablesAndColumns = Object.entries(models)
    .filter(([ tableName, attributes ]) => attributes.links && attributes.links.size > 0)
    .map(([ tableName, attributes ]) => {
      const columns = Object.values(attributes)
        .reduce((acc, { display_name, shown, name, attribute_class }) => {
          if (shown && !['Magma::TableAttribute', 'Magma::CollectionAttribute'].includes(attribute_class)) {
            return [...acc,
              {
                displayName: display_name,
                name,
                handleChange: (e) => e.target.checked ? addColumn(tableName, name) : removeColumn(tableName, name),
                checked: selectedColumns.filter(({ table, column }) => table === tableName && name === column).length > 0
              }
            ]
          }

          return acc
        }, []);

    const selectAllHandler = () => {
      columns.forEach(({ name }) => addColumn(tableName, name));
    };

    const deselectHandler = () => {
      columns.forEach(({ name }) => removeColumn(tableName, name));
    };

    return {
      tableName,
      displayTableName: titleCase(tableName),
      columns,
      selectAllHandler,
      deselectHandler
    };
  });

  return ColumnPicker(tablesAndColumns);
};

const ColumnPicker = (models) => {
  const tables = models.map(({ tableName, displayTableName, columns, selectAllHandler, deselectHandler }) => {
    const cols = columns.map(({ displayName, name, handleChange, checked }) => (
      <li key={name}>
        <input type='checkbox' onChange={handleChange} checked={checked}/>
        {displayName}
      </li>
    ));

    return (
      <AccordionItem key={tableName}>
        <AccordionItemTitle>
          <h5 className='u-position-relative'>
            <span>{displayTableName}</span>
            <div
              className='accordion__arrow'
              role='presentation'
            />
          </h5>
        </AccordionItemTitle>
        <AccordionItemBody>
          <a onClick={selectAllHandler}>Select all</a>
          <a onClick={deselectHandler}>Deselect</a>
          <ul>
            {cols}
          </ul>
        </AccordionItemBody>
      </AccordionItem>
    )
  });

  return (
    <div className='column-selector'>
      <Accordion accordion={false}>
        {tables}
      </Accordion>
    </div>
  );
};

export default MagmaQueryContainer;
