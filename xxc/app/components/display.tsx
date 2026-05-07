import ReactDOM from 'react-dom/client';
import DisplayContainer from './display-container';

/**
 * 弹出层管理组件 ID
 */
const containerId = 'display-container';

/**
 * 弹出层管理组件渲染元素
 */
let container = document.getElementById(containerId);
if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.classList.add('affix');
    document.body.appendChild(container);
}

/**
 * 用于存储弹出层管理组件实例
 */
let displayContainer: DisplayContainer = null;
const root = ReactDOM.createRoot(container);

root.render(
    // <React.StrictMode>
        <DisplayContainer ref={e => {displayContainer = e;}} />
    // </React.StrictMode>
);

/**
 * 显示弹出层
 * @param props 弹出层初始化对象
 * @param callback 操作完成后的回调函数
 * @returns 弹出层组件
 */
export const displayShow: typeof displayContainer.show = (props, callback) => displayContainer?.show(props, callback);

/**
 * 隐藏指定 ID 的弹出层
 * @param id 弹出层 ID
 * @param callback 操作完成后的回调函数
 * @param remove 是否在隐藏后从界面上移除元素
 * @returns 弹出层组件
 */
export const displayHide: typeof displayContainer.hide = (id, callback, remove) => displayContainer?.hide(id, callback, remove);

/**
 * 隐藏并从界面上移除指定 ID 的弹出层
 * @param id 弹出层 ID
 * @param callback 操作完成后的回调函数
 * @returns 弹出层组件
 */
export const displayRemove: typeof displayContainer.remove = (id, callback) => displayContainer.remove(id, callback);

/**
 * 获取指定 ID 的弹出层组件实例
 * @param id 弹出层 ID
 * @returns 弹出层组件
 * @function
 */
export const displayGetRef = (id: string) => {
    const item = displayContainer && displayContainer.getItem(id);
    return item?.ref;
};

/**
 * 设置指定 ID 弹出层界面元素上的样式
 * @param id 弹出层 ID
 * @param newStyle CSS 样式对象
 * @param callback 操作完成后的回调函数
 * @returns 弹出层组件
 */
export const displaySetStyle: typeof displayContainer.setStyle = (id, newStyle, callback) => displayContainer?.setStyle(id, newStyle, callback);

export default {
    show: displayShow,
    hide: displayHide,
    remove: displayRemove,
    getRef: displayGetRef,
    setStyle: displaySetStyle,
};
