import {nativeImage} from 'electron';

type NativeImage = {
    nativeImageCreateFromDataURL: typeof Electron['nativeImage']['createFromDataURL'];
    nativeImageCreateFromPath: typeof Electron['nativeImage']['createFromPath'];
};

export default {
    nativeImageCreateFromDataURL: nativeImage.createFromDataURL,
    nativeImageCreateFromPath: nativeImage.createFromPath,
} as NativeImage;
