import type {ReactNodeLike} from 'prop-types';
import {Component} from 'react';
import fuid from '../utils/fuid';
import DisplayLayer from './display-layer';

import type {DisplayLayerProps} from './display-layer';

type DisplayContainerProps = {};

type DisplayContainerState = {
    all: Record<string, {
        ref?: DisplayLayer;
        lastShowTime?: number;
        props: DisplayLayerProps
    }>;
}

/**
 * DisplayContainer 组件 ，显示一个弹出层容器组件，用于管理界面上一个或多个弹出层
 */
export default class DisplayContainer extends Component<DisplayContainerProps, DisplayContainerState> {
    static onHiddenHandler: (ref: DisplayLayer, props: DisplayLayerProps) => void;

    static onShownHandler: (ref: DisplayLayer, props: DisplayLayerProps) => void;

    constructor(props: DisplayContainerProps) {
        super(props);

        this.state = {
            all: {}
        };
    }

    /**
     * 根据 ID 获取弹出层组件实例
     * @param id 弹出层 ID
     * @returns 上次显示的弹出层
     */
    getItem(id: string) {
        return this.state.all[id];
    }

    /**
     * 获取上次显示的弹出层
     * @returns 上次显示的弹出层
     */
    get lastShowItem() {
        const {all} = this.state;
        const allLayers = Object.values(all)
            .filter(x => x.ref && x.ref.isShow)
            .sort((x, y) => (y.lastShowTime - x.lastShowTime));
        return allLayers?.[0];
    }

    /**
     * 显示一个弹出层，如果属性中弹出层 ID 已经存在，则显示之前的弹出层，否则根据属性创建一个新的弹出层
     * @param props 弹出层配置
     * @param callback 完成时的回调函数
     * @returns DisplayLayer
     */
    show(props: DisplayLayerProps, callback?: (that?: DisplayLayer) => void) {
        const {all} = this.state;

        props.id ??= fuid();
        const {id} = props;
        const item = all[id];
        if (!item) {
            const userOnHidden = props.onHidden;
            props.onHidden = (ref) => {
                DisplayContainer.onHiddenHandler?.(ref, props);
                userOnHidden?.(ref);
                if (!props.cache) {
                    delete all[id];
                    this.setState({all});
                }
            };
            const userOnShow = props.onShown;
            props.onShown = (ref) => {
                DisplayContainer.onShownHandler?.(ref, props);
                userOnShow?.(ref);
                if (typeof callback === 'function') {
                    callback(ref);
                }
            };
            all[id] = {props};
            this.setState({all});
            return null;
        }

        if (!item.ref) {
            return null;
        }

        const {style, cache, content, id: ID, ...others} = props;
        if (content || Object.keys(others).length) {
            if (content) {
                item.ref.loadContent(content);
            }
            all[id] = Object.assign(item, {props});
            this.setState({all}, () => {
                if (!item.ref.isShow) {
                    item.ref.show(callback);
                    return;
                }
                callback?.();
            });
            return item.ref;
        }

        if (cache && style) {
            item.ref.setStyle(style);
        }
        item.ref.show(callback);
        return item.ref;
    }

    /**
     * 隐藏弹出层
     * @param id 要隐藏的弹出层 ID
     * @param callback 操作完成时的回调函数
     * @param remove 是否在隐藏后移除界面上的元素
     * @returns DisplayLayer
     */
    hide(id: string, callback?: (rst?: boolean) => void, remove: 'auto'|boolean = 'auto') {
        const {all} = this.state;
        const item = (id !== null && id !== undefined) ? all[id] : this.lastShowItem;
        if (!item) {
            callback?.(false);
            return;
        }
        if (remove === 'auto') {
            remove = !item.props.cache;
        }
        item.ref?.hide(() => {
            if (remove) {
                delete all[id];
                this.setState({all});
            }
            callback?.();
        });
        return item.ref;
    }

    /**
     * 隐藏并从界面上移除弹出层
     *
     * @param id 弹出层 ID
     * @param callback 操作完成时的回调函数
     * @returns DisplayLayer
     */
    remove(id: Parameters<typeof this.hide>[0], callback?: Parameters<typeof this.hide>[1]) {
        return this.hide(id, callback, true);
    }

    /**
     * 在指定 ID 的弹出层上加载新的内容
     * @param id 弹出层 ID
     * @param newContent 弹出层新的内容
     * @param callback 操作完成时的回调函数
     * @returns DisplayLayer
     */
    load(id: string, newContent?: ReactNodeLike|(() => ReactNodeLike), callback?: (result: boolean, content: ReactNodeLike, that: DisplayLayer) => void) {
        const {all} = this.state;
        const item = all[id];
        if (!item) {
            if (DEBUG) {
                console.error(`Cannot find display layer with id ${id}.`);
            }
            return;
        }

        item.ref.loadContent(newContent, callback);
        return item.ref;
    }

    /**
     * 为指定 ID 的弹出层设置新的 CSS 样式
     * @param id 弹出层 ID
     * @param newStyle CSS 样式对象
     * @param callback 操作完成时的回调函数
     * @returns DisplayLayer
     */
    setStyle(id: string, newStyle: React.CSSProperties, callback?: () => void) {
        const {all} = this.state;
        const item = all[id];
        if (!item) {
            if (DEBUG) {
                console.error(`Cannot find display layer with id ${id}.`);
            }
            return;
        }

        item.ref.setStyle(newStyle, callback);
        return item.ref;
    }

    render() {
        const {all} = this.state;
        return (
            <div className="display-container dock">
                {
                    Object.keys(all).map(itemId => {
                        const item = all[itemId];
                        const {props} = item;
                        return <DisplayLayer key={itemId} ref={e => {item.ref = e;}} {...props} />;
                    })
                }
            </div>
        );
    }
}
