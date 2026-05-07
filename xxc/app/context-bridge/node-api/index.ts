import path from './path';
import os from './os';
import childProcess from './child_process';
import dns from './dns';
import fs from './fs';
import crypto from './crypto';
import iconv from './iconv';
import {unescape as querystringUnescape} from 'node:querystring';
import nodeFetch from './node_fetch';
import zip from './zip';
import nodeProcess from './process';

const nodeAPI = {
    processVersions: process.versions,
    processArch: process.arch,
    BufferFrom: Buffer.from,
    BufferConcat: Buffer.concat,
    env: {
        NODE_ENV: process.env.NODE_ENV,
        LOG: process.env.LOG,
    },
    querystringUnescape,

    ...path,
    ...os,
    ...childProcess,
    ...dns,
    ...fs,
    ...crypto,
    ...nodeFetch,
    ...iconv,
    ...zip,
    ...nodeProcess,
};

export default nodeAPI;

declare global {
    interface Window {
        nodeAPI: typeof nodeAPI;
    }
}
