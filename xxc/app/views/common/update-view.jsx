import events from '../../core/events';
import {registerCommand, executeCommand} from '../../core/commander';
import DisplayContainer from '../../components/display-container';

/**
 * 事件表
 * @type {Object<string, string>}
 * @private
 */
const EVENT = {
    update_view_style: 'app.updateViewStyle'
};

// 注册更新组件样式命令，触发一个事件来响应命令
registerCommand('updateViewStyle', (context, viewID, style) => {
    if (viewID) {
        if (context.options && style === undefined) {
            ({style} = context.options);
        }
        if (typeof style === 'string') {
            style = JSON.parse(style);
        }
        if (style) {
            if (style.width && typeof style.width === 'number') {
                style.width = `${style.width}px`;
            }
            if (style.height && typeof style.height === 'number') {
                style.height = `${style.height}px`;
            }
        }
        events.emit(`${EVENT.update_view_style}.${viewID}`, style, context.options);
    }
}, null, {apiLevel: 6});

/**
 * 请求更新指定视图样式
 * @param {String} viewID 组件 ID
 * @param {Object|String} style 样式
 * @returns {Promise} 通过 Promise 返回命令执行结果
 */
export const requestUpdateViewStyle = (viewID, style) => {
    executeCommand('updateViewStyle', viewID, style);
};

/**
 * 绑定 组件更新样式事件
 * @param {String} viewID 组件 ID
 * @param {Function} listener 事件回调函数
 * @returns {symbol} 使用 `Symbol` 存储的事件 ID，用于取消事件
 */
export const onUpdateViewStyle = (viewID, listener) => events.on(`${EVENT.update_view_style}.${viewID}`, listener);

/**
 * 初始化视图更新机制
 * @returns {void}
 */
export const initUpdateView = () => {
    DisplayContainer.onHiddenHandler = (ref, props) => {
        const {listenUpdateStyle} = props;
        const {listenUpdateStyleHandler} = ref;
        if (listenUpdateStyle && listenUpdateStyleHandler) {
            events.off(listenUpdateStyleHandler);
            delete ref.listenUpdateStyleHandler;
        }
    };
    DisplayContainer.onShownHandler = (ref, props) => {
        const {listenUpdateStyle} = props;
        if (listenUpdateStyle) {
            ref.listenUpdateStyleHandler = events.on(`${EVENT.update_view_style}.${ref.id}`, (style) => {
                ref.setStyle(style);
            });
        }
    };
};
