import {createRoot} from 'react-dom/client';
import App from './app';
import './globals.css';
import './lavender.css';
const root=document.getElementById('root');
if(root)createRoot(root).render(<App/>);
