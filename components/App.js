import React from "react";
import { BrowserRouter as Router, Route, Link } from "react-router-dom";
import WorkspaceParser from './WorkspaceParser';
import MagmaQueryContainer from './MagmaQuery/MagmaQueryContainer';
import { Nav, Navbar, NavItem } from 'react-bootstrap'

const Index = () => <h2>Home</h2>;

const AppRouter = () => (
  <Router>
    <div>
      <Navbar>
        <Navbar.Header>
          <Navbar.Brand>
            <Link to="/">Web Tools</Link>
          </Navbar.Brand>
          <Navbar.Toggle />
        </Navbar.Header>
        <Navbar.Collapse>
          <Nav pullRight>
            <NavItem>
              <Link to="/WSPParser/">WSP Parser</Link>
            </NavItem>
            <NavItem>
              <Link to="/TableBuilder/">Magma Table Builder</Link>
            </NavItem>
          </Nav>
        </Navbar.Collapse>
      </Navbar>

      <Route path="/" exact component={Index} />
      <Route path="/WSPParser/" component={WorkspaceParser} />
      <Route path="/TableBuilder/" component={MagmaQueryContainer} />
    </div>
  </Router>
);

export default AppRouter;