import {clipboard, nativeImage} from 'electron';

type Clipboard = {
    clipboardWriteImageFromDataURL: (dataURL: string) => void;
    clipboardWriteImageFromPath: (path: string) => void;
    clipboardReadImage: typeof Electron['clipboard']['readImage'];
    clipboardReadText: typeof Electron['clipboard']['readText'];
    clipboardWriteText: typeof Electron['clipboard']['writeText'];
    clipboardReadHTML: typeof Electron['clipboard']['readHTML'];
    clipboardWriteHTML: typeof Electron['clipboard']['writeHTML'];
    clipboardWrite: typeof Electron['clipboard']['write'];
};

export default {
    clipboardWriteImageFromDataURL: (dataURL: string) => {
        const image = nativeImage.createFromDataURL(dataURL);
        clipboard.writeImage(image);
    },
    clipboardWriteImageFromPath: (path: string) => {
        const image = nativeImage.createFromPath(path);
        clipboard.writeImage(image)
    },
    clipboardReadImage: clipboard.readImage,
    clipboardReadText: clipboard.readText,
    clipboardWriteText: clipboard.writeText,
    clipboardReadHTML: clipboard.readHTML,
    clipboardWriteHTML: clipboard.writeHTML,
    clipboardWrite: clipboard.write,
} as Clipboard;
