import Modal from '../../components/modal';
import {ImgCropper, type ImgCropperRef} from '../../components/cropper';
import Lang from '../../core/lang';

/**
 * 显示图片裁切对话框
 * @param image 默认传入图片
 * @param setImage 图片传出函数
 * @param callback 回调函数
 * @returns void
 */
export const showImgCropperDialog = (image: string, setImage: (dataUrl: string) => void, callback?: (...args: any[]) => void) => {
    const imgCropperRef:{current:ImgCropperRef } = {current: {}};

    /**
     * 更换图片按钮处理函数
     * @param e input 按钮事件
     */
    const onChangeImgHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        const {files} = e.target;
        const reader = new FileReader();
        reader.onload = () => {
            if (reader.result) {
                imgCropperRef.current?.setImage(reader.result as string);
            }
        };
        if (files && files.length) {
            reader.readAsDataURL(files[0]);
        }
    };

    /**
     * 裁剪对话框提交按钮处理函数
     */
    const onSubmit = () => {
        const cropperCanvas = imgCropperRef.current?.cropperRef.current.getCroppedCanvas({
            width: 100,
            height: 100,
        });
        if (!cropperCanvas) {
            return false;
        }
        const dataUrl = cropperCanvas.toDataURL();
        setImage(dataUrl);
    };

    return Modal.show({
        id: 'app-img-cropper-dialog',
        closeButton: false,
        actions: [
            {
                type: 'changeImg',
                className: 'x-outline space-right',
                label: (
                    <label className="text-gray">
                        <input
                            id="file-upload-button"
                            type="file"
                            accept=".jpg,.jpeg,.png"
                            style={{display: 'none'}}
                            onChange={onChangeImgHandler}
                            onClick={(e) => {(e.target as HTMLInputElement).value = null;}}
                        />
                        {Lang.string('common.changeUploadPhoto')}
                    </label>
                ),
                click: () => false
            },
            {type: 'submit'},
            {type: 'cancel'}
        ],
        onSubmit,
        enableBackdropClick: false,
        content: <ImgCropper ref={imgCropperRef} isPreviewCircle inputImage={image} />
    }, callback);
};

export default {
    show: showImgCropperDialog,
};
