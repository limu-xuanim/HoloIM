import {createWriteStream} from 'node:fs';
import archiver from 'archiver';
import extractZip from 'extract-zip';
import chalk from 'chalk';

// 创建 zip 文件
export function createZipFromDir(file: string, dir: string, destDir: false|string = false) {
    return new Promise((resolve, reject) => {
        const output = createWriteStream(file);
        const archive = archiver('zip', {zlib: {level: 9}});

        output.on('close', resolve);
        output.on('error', reject);
        
        archive.on('error', reject);
        archive.on('warning', reject);
        archive.pipe(output);
        archive.directory(dir, destDir);
        archive.finalize();
    });
}

/**
 * 解压 zip 文件
 * @param file 文件
 * @param dir 目录
 */
export const extractZipFile = async (file: string, dir: string) => {
    try {
        await extractZip(file, {dir});
        console.log(`    ${chalk.green(chalk.bold('✓'))} 解压 ${chalk.underline(file)} → ${chalk.underline(dir)}`);
        return dir;
    } catch (error) {
        console.error(`解压文件失败，原路径：${file} 目标路径：${dir}`, error);
        return Promise.reject(error);
    }
};
