/* eslint-disable no-await-in-loop */
import program from 'commander';
import chalk from 'chalk';
import {createICNS, createICO, BILINEAR, BEZIER, HERMITE} from 'png2icons';
import Jimp from 'jimp';
import fse from '../nodejs/fs-helper';
import {promises as fsPromises} from 'node:fs';
import path from 'node:path';
import pkg from '../package.json';

// `npm run create-icons -- -s my/path/to/a/image-1024x1024.png -o build.icons`

program
    .version(pkg.version)
    .alias('npm run create-icons --')
    .description('Create icons for buiding custom edition')
    .option('-s, --sourceFile <sourceFile>', 'Source icon file, must be a png image')
    .option('-o, --outputPath <outputPath>', 'Output path', 'icons')
    .option('-t, --outputTemplate <outputTemplate>', 'Output template tray icon for macos')
    .parse(process.argv);

const sourceFile = program.sourceFile ? path.resolve(__dirname, program.sourceFile) : null;
const outputPath = program.outputPath ? path.resolve(__dirname, program.outputPath) : null;

if (!sourceFile) {
    console.error(chalk.red('CreateIcons Error: No "sourceFile" option given! use "-s, --sourceFile <sourceFile>" to set key option.'));
    process.exit(1);
}
if (!outputPath) {
    console.error(chalk.red('CreateIcons Error: No "outputPath" option given! use "-o, --outputPath <outputPath>" to set outputPath option.'));
    process.exit(1);
}

const createResourceIcons = async () => {
    const resourcesPath = path.join(outputPath, 'resources');
    const mediaPath = path.join(outputPath, 'media/img');
    const resourcesIconsPath = path.join(resourcesPath, 'icons');

    const sourceInput = await fsPromises.readFile(sourceFile);

    let jimpInput = await Jimp.read(sourceFile);

    // Get sizes
    const width = jimpInput.getWidth();
    const height = jimpInput.getHeight();
    if (width !== height) {
        console.log(chalk.red(`𐄂 Error: Source image width (${width}) and height (${height}) are not equal.`));
        process.exit(1);
    }
    if (width < 256) {
        console.log(chalk.yellow(`! Warning: Source image size (${width}x${height}) is smaller than 256x256.`));
    }
    if (width < 1024) {
        console.log(chalk.yellow(`! Warning: Source image size (${width}x${height}) is smaller than 1024x1024, the best size is 1024x1024.`));
    }

    // icon.png
    const iconPath = path.join(resourcesPath, 'icon.png');
    const iconOutput = jimpInput.resize(256, 256);
    if (sourceFile === iconPath) {
        console.log(chalk.yellow(`! Warning: Source image file path is same as output file path: ${sourceFile}`));
    } else {
        iconOutput.write(iconPath);
        console.log(`→ Created: ${chalk.underline(path.relative(outputPath, iconPath))}`);
    }

    // *x*.png
    const allSizes = [16, 24, 32, 48, 64, 96, 128, 144, 192, 256, 512, 1024];
    for (const size of allSizes) {
        const thisIconPath = path.join(resourcesIconsPath, `${size}x${size}.png`);
        if (sourceFile === thisIconPath) {
            console.log(chalk.yellow(`! Warning: Source image file path is same as output file path: ${sourceFile}`));
            continue;
        }
        jimpInput = await Jimp.read(sourceFile);
        const thisIconOutput = jimpInput.resize(size, size);
        thisIconOutput.write(thisIconPath);
        console.log(`→ Created: ${chalk.underline(path.relative(outputPath, thisIconPath))}`);
    }

    // media/img/icon.png
    const mediaIconPath = path.join(mediaPath, 'icon.png');
    iconOutput.write(mediaIconPath);
    console.log(`→ Created: ${chalk.underline(path.relative(outputPath, mediaIconPath))}`);

    // media/img/tray-icon.png
    const mediaTrayIconPath = path.join(mediaPath, 'tray-icon.png');
    const mediaTrayGreyIconPath = path.join(mediaPath, 'tray-gray-icon.png');

    jimpInput = await Jimp.read(sourceFile);
    const trayIconOutput = jimpInput.resize(16, 16);
    trayIconOutput.write(mediaTrayIconPath);
    console.log(`→ Created: ${chalk.underline(path.relative(outputPath, mediaTrayIconPath))}`);
    trayIconOutput.greyscale().write(mediaTrayGreyIconPath);
    console.log(`→ Created: ${chalk.underline(path.relative(outputPath, mediaTrayGreyIconPath))}`);

    if (program.outputTemplate) {
        // media/img/tray-iconTemplate.png
        const trayIconTemplatePath = path.join(mediaPath, 'tray-iconTemplate.png');
        jimpInput = await Jimp.read(sourceFile);
        let templateImageOutput = jimpInput.greyscale();
        templateImageOutput = templateImageOutput.contrast(1);
        const trayIconTemplateOutput = templateImageOutput.resize(32, 32);
        trayIconTemplateOutput.write(trayIconTemplatePath);
        console.log(`→ Created: ${chalk.underline(path.relative(outputPath, trayIconTemplatePath))}`);

        // media/img/tray-iconTemplate@2x.png
        const trayIconTemplate2xPath = path.join(mediaPath, 'tray-iconTemplate@2x.png');
        const trayIconTemplate2xOutput = templateImageOutput.resize(16, 16);
        trayIconTemplate2xOutput.write(trayIconTemplate2xPath);
        console.log(`→ Created: ${chalk.underline(path.relative(outputPath, trayIconTemplate2xPath))}`);
    }

    // icon.icns
    const icnsFileOutput = createICNS(sourceInput, BILINEAR, 0);
    if (icnsFileOutput) {
        const icnsFilePath = path.join(resourcesPath, 'icon.icns');
        await fse.outputFile(icnsFilePath, icnsFileOutput);
        console.log(`→ Created: ${chalk.underline(path.relative(outputPath, icnsFilePath))}`);
    }

    jimpInput = await Jimp.read(sourceFile);
    const icoFileOutput = createICO(sourceInput, BEZIER, 0, true, true);
    const grayIcoFileOutput = createICO(await jimpInput.greyscale().getBufferAsync(Jimp.MIME_PNG), BEZIER, 0, true, true);

    if (icoFileOutput) {
        // icon.ico
        const icoFilePath = path.join(resourcesPath, 'icon.ico');
        await fse.outputFile(icoFilePath, icoFileOutput);
        console.log(`→ Created: ${chalk.underline(path.relative(outputPath, icoFilePath))}`);

        // tray-icon.ico
        const trayIcoFilePath = path.join(mediaPath, 'tray-icon.ico');
        await fse.outputFile(trayIcoFilePath, icoFileOutput);
        console.log(`→ Created: ${chalk.underline(path.relative(outputPath, trayIcoFilePath))}`);
        // tray-gray-icon.ico
        const trayGrayIcoFilePath = path.join(mediaPath, 'tray-gray-icon.ico');
        await fse.outputFile(trayGrayIcoFilePath, grayIcoFileOutput);
        console.log(`→ Created: ${chalk.underline(path.relative(outputPath, trayGrayIcoFilePath))}`);
    }

    // favicon.ico
    const faviconFileOutput = createICO(sourceInput, HERMITE, 0, true, false);
    if (faviconFileOutput) {
        const faviconFilePath = path.join(resourcesPath, 'favicon.ico');
        await fse.outputFile(faviconFilePath, faviconFileOutput);
        console.log(`→ Created: ${chalk.underline(path.relative(outputPath, faviconFilePath))}`);
    }
};

const createIcons = async () => {
    console.log(`→ Source: ${sourceFile}`);
    console.log(`→ Output: ${outputPath}`);
    await createResourceIcons();
    console.log(`${chalk.green('✓')} Output: ${outputPath}`);
};

createIcons();
