/**
 * 网络传输信息对象
 */
type FileNetworkingInfo = Partial<{
    /**
     * 文件网络传输类型
     */
    type: string;
    /**
     * 已传输的字节数
     */
    loaded: number|false;
    /**
     * 总计需要传输的字节数
     */
    total: number;
    /**
     * 错误对象
     */
    error: Error;
    /**
     * 缓存地址
     */
    cachePath: string;
    /**
     * 是否成功发送
     */
    send: boolean;
}>;

/**
 * 文件网络传输管理类
 */
export class FileNetworking {
    /**
     * 文件数据对象
     */
    private _fileData: FileData;

    private _info: FileNetworkingInfo;

    /**
     * 创建一个网络传输管理对象
     * @param fileData 文件数据对象
     * @param info 网络传输信息
     */
    constructor(fileData: FileData, info: FileNetworkingInfo = null) {
        this._fileData = fileData;

        let type = '';
        let loaded: number|false = 0;
        let error: Error = null;
        const {send} = fileData;
        if (send === true) {
            loaded = fileData.size;
        } else if (send === false || typeof send === 'number') {
            loaded = false;
            type = 'uploading';
            error = new Error('UPLOAD_FILE_FAILED');
        }

        /**
         * 文件数据对象
         */
        this._info = {
            type,
            loaded,
            error,
            ...info
        };
    }

    /**
     * 文件数据对象
     */
    get fileData() {
        return this._fileData;
    }

    /**
     * 网络传输信息对象
     */
    get info() {
        return this._info;
    }

    /**
     * 已传输的字节数
     */
    get loaded() {
        return this._info.loaded;
    }

    /**
     * 总的字节数
     */
    get total() {
        return this._info.total ?? this._fileData.size;
    }

    /**
     * 文件网络传输类型
     */
    get type() {
        return this._info.type;
    }

    /**
     * 文件上传下载失败后的错误对象
     */
    get error() {
        if (!this.isNetworking) {
            return null;
        }
        return this._info.error;
    }

    /**
     * 是否正在进行上传或下载
     */
    get isNetworking() {
        return !!this._info.type;
    }

    /**
     * 文件网络传输进度（0～100，百分比）
     */
    get progress() {
        const {size} = this._fileData;
        if (!size) {
            return 0;
        }
        const {loaded} = this._info;
        return Math.max(0, Math.min(100, 100 * (Number(loaded) / size)));
    }

    /**
     * 是否正在执行上传或下载操作（进度 < 100 并且没有错误信息）
     */
    get isInProgress() {
        return this.isNetworking && this.progress < 100 && !this.error;
    }

    /**
     * 是否正在执行下载操作（进度 < 100 并且没有错误信息）
     */
    get isDownloading() {
        return this.type === 'downloading' && this.progress < 100 && !this.error;
    }

    /**
     * 是否正在执行上传操作（进度 < 100 并且没有错误信息）
     */
    get isUploading() {
        return this.type === 'uploading' && this.progress < 100 && !this.error;
    }

    /**
     * 是否完成上传或下载操作（进度 = 100 或者有错误信息）
     */
    get isFinished() {
        return Boolean(this.isNetworking && (this.progress === 100 || this.error));
    }

    /**
     * 是否完成上传或下载失败
     */
    get isFail() {
        return this.isNetworking && !!this.error;
    }

    /**
     * 是否下载失败
     */
    get isDownloadFail() {
        return Boolean(this.type === 'downloading' && this.error);
    }

    /**
     * 是否上传失败
     */
    get isUploadFail() {
        return Boolean(this.type === 'uploading' && this.error);
    }

    /**
     * 更新文件数据对象
     * @param newInfo 新的网络传输信息
     * @param fileDataInfo 新的文件数据对象
     */
    update(newInfo: FileNetworkingInfo, fileDataInfo: FileNetworkingInfo = {}) {
        this._info = {...this._info, ...newInfo};
        this._fileData.forceChange({networking: this.clone(), ...fileDataInfo});
    }

    /**
     * 开始执行上传或下载
     * @param type 类型
     */
    _start(type: 'downloading'|'uploading') {
        if (!type || this.isInProgress) {
            throw new Error(`Start file ${type} failed, current type is ${this._info.type}.`);
        }

        this.update({type, loaded: 0, error: null});
    }

    /**
     * 更新已传输的字节数
     * @param type 类型
     * @param loaded 已传输的字节数
     * @param total 总计需要传输的字节数
     * @returns 是否更新成功，如果已传输的字节数与上次没有变化则返回 `false`
     */
    _updateLoaded(type: 'downloading' | 'uploading', loaded: number, total = 0): boolean {
        if (!type || this._info.type !== type) {
            throw new Error(`Update ${type} progress failed, current type is ${this._info.type}.`);
        }

        total = Math.max(total, this.total);
        const newLoaded = Math.min(this.total, Math.max(this._info.loaded || 0, loaded, 0));
        if (newLoaded === this._info.loaded) {
            return false;
        }

        this.update({loaded: newLoaded, total});
    }

    /**
     * 完成上传或下载
     * @param type 类型
     * @param error 是否包含错误，指定一个错误对象
     * @param fileChanges 要对原始文件对象进行修改的数据
     */
    _finish(type: 'downloading'|'uploading', error: Error, fileChanges: FileNetworkingInfo = {}) {
        if (!type || this._info.type !== type) {
            throw new Error(`Finish file ${type} failed, current type is ${this._info.type}.`);
        }

        const newInfo = error ? {error} : {loaded: this.total};
        this.update(newInfo, fileChanges);
    }

    /**
     * 开始执行下载
     */
    startDownload() {
        return this._start('downloading');
    }

    /**
     * 更新下载进度
     * @param loaded 已传输的字节数
     * @param total 总计需要传输的字节数
     * @returns 是否更新成功，如果已传输的字节数与上次没有变化则返回 `false`
     */
    updateDownloadLoaded(loaded: number, total: number): boolean {
        return this._updateLoaded('downloading', loaded, total);
    }

    /**
     * 完成下载失败
     * @param error 下载失败的错误对象
     */
    finishDownloadFail(error: Error) {
        return this._finish('downloading', error);
    }

    /**
     * 完成下载成功
     * @param localPath 下载后的文件本地位置
     */
    finishDownloadSuccess(localPath?: string) {
        return this._finish('downloading', null, localPath ? {cachePath: localPath} : null);
    }

    /**
     * 开始执行上传
     */
    startUpload() {
        return this._start('uploading');
    }

    /**
     * 更新上传进度
     * @param loaded 已传输的字节数
     * @param total 总计需要传输的字节数
     * @returns 是否更新成功，如果已传输的字节数与上次没有变化则返回 `false`
     */
    updateUploadLoaded(loaded: number, total: number) {
        return this._updateLoaded('uploading', loaded, total);
    }

    /**
     * 完成上传失败
     * @param error 上传失败的错误对象
     */
    finishUploadFail(error: Error) {
        return this._finish('uploading', error);
    }

    /**
     * 完成上传成功
     * @param props 参数对象
     * @param props.fileId 上传后的文件 ID
     * @param props.time 上传文件时间
     * @param props.hasThumb 上传文件时间
     * @param props.thumbnailWidth 缩略图宽度
     * @param props.thumbnailHeight 缩略图高度
     */
    finishUploadSuccess(props: {
        fileId: number;
        time: number;
        hasThumb: boolean;
        thumbnailWidth: number;
        thumbnailHeight: number;
    }) {
        return this._finish('uploading', null, {
            ...props,
            send: true,
        });
    }

    /**
     * 重置传输状态
     */
    reset() {
        this.update({type: '', loaded: 0, error: null});
    }

    /**
     * 创建一个副本
     */
    clone() {
        return new FileNetworking(this._fileData, this._info);
    }
}
