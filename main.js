import React from 'react';
import { render } from 'react-dom';
import WorkspaceParser from './components/WorkspaceParser';
import MagmaQueryContainer from './components/MagmaQuery/MagmaQueryContainer';
import 'react-accessible-accordion/dist/fancy-example.css';
import 'react-datetime/css/react-datetime.css';

render(
  //<WorkspaceParser />,

  <MagmaQueryContainer />,
  document.getElementById('root')
);