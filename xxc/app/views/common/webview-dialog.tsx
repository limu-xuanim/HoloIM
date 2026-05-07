import Modal from '../../components/modal';
import WebViewFrame from './webview-frame';
import fuid from '../../utils/fuid';
import Lang from '../../core/lang';

/**
 * 在对话框中显示一个网页
 * @param {string|function():Promise<String>} sourceUrl 网页源地址或者提供一个函数返回地址
 * @param {Object} options Webview 选项
 * @param {function} callback 对话框显示完成回调函数
 * @returns {DisplayLayer} 弹出层
 */
export const showWebviewDialog = (sourceUrl, options, callback?: any) => {
    let width = (options && options.width);
    let height = (options && options.height);
    if (options && options.size) {
        if (options.size === 'lg') {
            width = width || (window.innerWidth - 40);
            height = height || (window.innerHeight - 40);
        } else if (options.size === 'full') {
            width = width || '100%';
            height = height || '100%';
        }
    }
    if (typeof height === 'number') {
        height = `${height}px`;
    }
    if (typeof width === 'number') {
        width = `${width}px`;
    }
    const displayId = fuid();

    if (options.isMaximizeOnPopup) {
        const originCallback = callback;
        callback = () => {
            const displayEle = document.getElementById(displayId);
            if (displayEle) {
                displayEle.classList.toggle('fullscreen');
            }
            if (originCallback) {
                originCallback();
            }
        };
    }

    return Modal.show({
        id: displayId,
        style: {width: width || 860, height: height || 640},
        headingClassName: 'dock dock-right dock-top',
        actions: false,
        animation: 'enter-from-bottom fade',
        contentClassName: '-p-0 -flex -items-stretch',
        listenUpdateStyle: true,
        onHidden: options.onHidden,
        content: <WebViewFrame displayId={displayId} src={sourceUrl} options={options} lang={Lang} isMaximizeOnPopup={options.isMaximizeOnPopup} title={options.title ? options.title : null} />
    }, callback);
};

export default {
    show: showWebviewDialog,
};
