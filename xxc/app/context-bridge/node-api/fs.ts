import fs from 'node:fs';

export default {
    fsExistsSync: fs.existsSync,
    fsIsDirectory: (p: fs.PathLike) => {
        try {
            const stat = fs.statSync(p);
            return stat.isDirectory();
        } catch {
            return false;
        }
    },
    fsIsDirectoryPromise: async (p: fs.PathLike) => {
        try {
            const stat = await fs.promises.stat(p);
            return stat.isDirectory();
        } catch {
            return false;
        }
    },
    fsAccessSync: fs.accessSync,
    fsAccessPromise: fs.promises.access,
    fsMkdirSync: fs.mkdirSync,
    fsMkdirPromise: fs.promises.mkdir,
    fsReadFileSync: fs.readFileSync,
    fsReadFilePromise: fs.promises.readFile,
    fsWriteFileSync: fs.writeFileSync,
    fsWriteFilePromise: fs.promises.writeFile,
    fsRmSync: fs.rmSync,
    fsRmPromise: fs.promises.rm,
    fsReaddirSync: fs.readdirSync,
    fsReaddirPromise: fs.promises.readdir,
    fsCopyFileSync: fs.copyFileSync,
    fsCopyFilePromise: fs.promises.copyFile,
    fsRenamePromise: fs.promises.rename,
    fsRenameSync: fs.renameSync,
};
