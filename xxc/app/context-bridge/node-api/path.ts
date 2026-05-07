import path from 'node:path';

export default {
    pathBasename: path.basename,
    pathJoin: path.join,
    pathDirname: path.dirname,
    pathExtname: path.extname,
    pathResolve: path.resolve,
    pathIsAbsolute: path.isAbsolute,
};
