import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { migrateThemeLightDefault } from './features/account/services/accountApi';
import './styles/shadcn.css';
import './index.css';

// Before first paint: drop stale darkMode so chrome isn't black with a white sheet only
migrateThemeLightDefault();

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);
