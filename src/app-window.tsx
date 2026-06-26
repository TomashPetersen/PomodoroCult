import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles.css';

document.documentElement.dataset.surface = 'app-window';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App surface="appWindow" />
  </React.StrictMode>
);
