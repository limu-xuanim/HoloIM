import {contextBridge} from 'electron';
import electronAPI from './electron-api';
import nodeAPI from './node-api';
import xuanAPI from './xuan-api';

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
contextBridge.exposeInMainWorld('nodeAPI', nodeAPI);
contextBridge.exposeInMainWorld('xuanAPI', xuanAPI);
