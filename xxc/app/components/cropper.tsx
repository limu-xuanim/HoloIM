import React, {useCallback, useImperativeHandle, useRef, useState} from 'react';
import Cropper from 'react-cropper';
import Icon from './icon';
import {classes} from '../utils/html-helper';
import useLang from '../views/common/use-lang';

export type ImgCropperRef = {
    setImage?: React.Dispatch<React.SetStateAction<string>>,
    cropperRef?: React.MutableRefObject<Cropper>
}

/**
 * 图片裁剪组件
 * @param ref 用于把组件内的变量和方法暴露给上层组件用
 * @param inputImage 预先显示的图片
 * @param maxMagnification 最大放大倍率
 * @param isPreviewCircle 是否显示圆形遮罩
 */
export const ImgCropper = React.forwardRef<ImgCropperRef, {inputImage: string, maxMagnification?: number, isPreviewCircle?: boolean}>(({inputImage = '', maxMagnification = 3, isPreviewCircle = false}, ref) => {
    const [Lang] = useLang();
    const [image, setImage] = useState<string>(inputImage);
    const cropperRef = useRef<Cropper>(null);
    useImperativeHandle(ref, () => ({setImage, cropperRef}), []);
    const sliderRef = useRef<HTMLInputElement>();

    /**
     * 缩放条事件处理函数
     */
    const changeZoomHandler = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const containerData = cropperRef.current.getContainerData();
        cropperRef.current.zoomTo(
            +event.target.value,
            {
                x: containerData.width / 2,
                y: containerData.height / 2,
            }
        );
    }, []);
    const maxRatio = useRef<number>(0);

    /**
     * Cropper.js Ready事件回调函数
     * 图片加载成功后，算出放大比例的范围
     * @return void
     */
    const readyHandler = useCallback(() => {
        const canvasData = cropperRef.current.getCanvasData();
        const min = canvasData.width / canvasData.naturalWidth;
        const max = min * maxMagnification;
        maxRatio.current = max;
        sliderRef.current.min = String(min);
        sliderRef.current.value = String(min);
        sliderRef.current.max = String(max);
        sliderRef.current.step = String((max - min) / 100);
    }, [maxMagnification]);

    /**
     * Cropper.js zoom事件回调函数
     * 防止图片放大超出组件定义的范围（使用滚轮缩放的情况下）
     */
    const zoomHandler = useCallback((event: Cropper.ZoomEvent<HTMLImageElement>) => {
        if (event.detail.ratio > maxRatio.current) {
            event.preventDefault();
            cropperRef.current.zoomTo(maxRatio.current);
            return;
        }
        sliderRef.current.value = String(event.detail.ratio);
    }, []);

    return (
        <div className="-flex avatar-settings xx-cropper">
            <div className="operate operate-size">
                <div className="gray-pale operate-size overlap pointer-pass top-left translucent" />
                <Cropper
                    style={{height: 200, width: 200}}
                    aspectRatio={1}
                    preview=".avatar-preview"
                    src={image}
                    viewMode={3}
                    minCropBoxHeight={200}
                    minCropBoxWidth={200}
                    background={false}
                    responsive
                    autoCropArea={1}
                    checkOrientation
                    onInitialized={(instance) => {
                        cropperRef.current = instance;
                    }}
                    guides={false}
                    dragMode="move"
                    movable
                    cropBoxMovable={false}
                    cropBoxResizable={false}
                    zoomable
                    scalable={false}
                    rotatable={false}
                    zoom={zoomHandler}
                    ready={readyHandler}
                />
                {isPreviewCircle ? (
                    <div className={classes('operate-size overlap pointer-pass top-left translucent', {hidden: !image})}>
                        <svg width="100%" height="100%">
                            <defs>
                                <mask id="hole">
                                    <rect width="100%" height="100%" fill="white" />
                                    <circle r="50%" cx="50%" cy="50%" fill="black" />
                                </mask>
                            </defs>
                            <rect width="100%" height="100%" mask="url(#hole)" />
                        </svg>
                    </div>
                ) : null}
                <div className="has-padding overlap bottom">
                    <div className="slider">
                        <Icon name="mdi-minus" size={24} className="translucent" />
                        <input className="avatar-cropper" ref={sliderRef} type="range" min="0" max="1" step="0.01" defaultValue="0" style={{flexGrow: 10}} onChange={changeZoomHandler} disabled={!image} />
                        <Icon name="mdi-plus" size={24} className="translucent" />
                    </div>

                </div>
            </div>
            <div className="-flex -felx-col">
                <div className={classes('preview-size avatar gray-pale has-margin-sm', {'-rounded-full': isPreviewCircle})}>
                    <div className="avatar-preview preview-size" />
                </div>
                <div className="text-gray -text-center">{Lang.string('common.previewCropper')}</div>
            </div>
        </div>
    );
});
