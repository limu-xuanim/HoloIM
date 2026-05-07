import Path from 'node:path';
import fs, {promises as fsp} from 'node:fs';
import archiver from 'archiver';
import extractZip from 'extract-zip';

/**
 * 压缩目录
 * @param sourceDir 源目录
 * @param outputPath 输出路径
 * @returns 以 Promise 形式返回输出路径
 */
const archiveDirectory = async (sourceDir: string, outputPath: string, progressCallback?: (progressStr: string, progress: number) => void) => {
    const archive = archiver('zip', {zlib: {level: 9}});
    const output = fs.createWriteStream(outputPath);
    const filesCount = await countFiles(sourceDir);

    return new Promise<string>((resolve, reject) => {
        // listen for all archive data to be written
        // 'close' event is fired only when a file descriptor is involved
        output.on('close', () => {
            // console.log(archive.pointer() + ' total bytes');
            // console.log('archiver has been finalized and the output file descriptor has closed.');
            resolve(outputPath);
        });

        output.on('error', (err) => {
            reject(err);
        });

        // good practice to catch warnings (ie stat failures and other non-blocking errors)
        archive.on('warning', (err) => {
            reject(err);
        });

        // good practice to catch this error explicitly
        archive.on('error', (err) => {
            reject(err);
        });

        if (progressCallback) {
            archive.on('progress', (progressData) => {
                progressCallback(`${progressData.entries.processed}/${filesCount}`, progressData.entries.processed / filesCount);
            });
        }

        // pipe archive data to the file
        archive.pipe(output);

        archive.directory(sourceDir, false);
        // archive.glob('**/*', {cwd: path});
        archive.finalize();
    });
};

/**
 * 从给定路径创建压缩文件
 * @param path 给定路径
 * @returns File 文件对象
 */
const createZipFromPath = async (path: string) => {
    const stat = await fs.promises.stat(path);
    if (stat.size > 1 * 1024 * 1024 * 1024) {
        const error = new Error('The size of the selected directory is larger than 1GB');
        throw error;
    }
    const buffer = await fs.promises.readFile(path);
    return new File([buffer], Path.basename(path).replace(/\.zip$/, '.xuandir.zip'), {type: 'application/zip'});
};

/**
 * 统计给定目录内文件总数
 * @param path 目录路径
 * @returns 数量
 */
async function countFiles(path: string) {
    path = normalizePath(path);
    const fileList = await fsp.readdir(path);
    let fullPath: string;
    let fileNum = 0;

    for (let i = 0; i < fileList.length; i++) {
        fullPath = path + fileList[i];
        if (fullPath.endsWith('.asar')) {
            throw new Error(`Invalid package ${fullPath}`);
        }
        const stat = await fsp.lstat(fullPath);
        if (stat.isDirectory()) {
            fileNum += await countFiles(fullPath);
            fileNum += 1;
        } else {
            fileNum++;
        }
    }

    return fileNum;
}

/**
 * 格式化目录路径
 * @param path 目录路径
 * @returns 目录路径
 */
function normalizePath(path: string) {
    if (path.endsWith('/')) {
        return path;
    }
    return `${path}/`;
}

export default {
    extractZip,
    archiveDirectory,
    createZipFromPath,
}
