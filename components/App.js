import React, { Component } from 'react'
import xmlParser, { countsParser, statisticsParser } from '../lib/xml-parser'
import { downloadTSV } from '../lib/download'

class App extends Component {
  constructor() {
    super()
    this.state = { files: [] }
  }

  addFiles(e) {
    const files = Array.from(e.target.files).filter(newFile => {
      return !this.state.files.find(file => {
        return newFile.name === file.name && newFile.webkitRelativePath === file.webkitRelativePath
      })
    })
    this.setState(prevState => ({ files: [...prevState.files, ...files ] }))
  }

  removeFile(name, path) {
    this.setState(prevState => {
      const files = prevState.files.filter(f => !(f.name === name && f.webkitRelativePath === path))
      return { files }
    })
  }

  fileList() {
    return this.state.files.map((f, i) => (
      <button
        key={f.name + f.webkitRelativePath}
        className='list-group-item list-group-item-action'
        style={{ cursor: 'default' }}
      >
        {f.name}
        <span
          className='glyphicon glyphicon-remove'
          style={{ float: 'right' }}
          onClick={this.removeFile.bind(this, f.name, f.webkitRelativePath)}
        >
        </span>
      </button>)
    )
  }

  handleDownloadClick(type, fileName) {
    switch(type) {
      case 'statistics':
        var parser = statisticsParser
        break
      default:
        var parser = countsParser
    }

    xmlParser(this.state.files, parser)
      .then((data) => downloadTSV(data, fileName))
  }

  downloadButton(label, type, fileName) {
    return (
      <button
      style={{ display: 'block', marginBottom: 10 }}
      onClick={this.handleDownloadClick.bind(this, type, fileName)}
      className='btn btn-primary'
      >
        <span
          className='glyphicon glyphicon-download-alt'
          style={{ marginRight: 5 }}
        >
        </span>
        {label}
      </button>
    )
  }

  render() {
    return (
      <div className='container'>
          <div style={{ width: 500, margin: 'auto' }}>
            <h1>Workspace Parser</h1>
          </div>
        <div className='row'>
          <label className='btn btn-info btn-sm'>
            add .wsp files
            <input
              type="file"
              style={{ display: 'none' }}
              multiple
              name='files'
              onChange={this.addFiles.bind(this)}
              accept={['.wsp']}
            />
          </label>
          <ol className='list-group'>
            {this.fileList()}
          </ol>
          {this.downloadButton('Population Counts', 'counts', 'population-counts')}
          {this.downloadButton('Statistics', 'statistics', 'statistics')}
        </div>
      </div>
    )
  }
}

export default App