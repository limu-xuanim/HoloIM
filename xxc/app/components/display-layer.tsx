import {PureComponent} from 'react';
import type {ReactNodeLike} from 'prop-types';
import ErrorBoundary from '~/app/components/error-boundary';
import Spinner from './spinner';
import {classes} from '../utils/html-helper';
import fuid from '../utils/fuid';
import Status from '../utils/status';

type DisplayLayerStatusName = 'init'|'ready'|'shown'|'hidden';

/**
 * Display 状态
 */
const STAGE = new Status<DisplayLayerStatusName>({
    init: 0,
    ready: 1,
    shown: 2,
    hidden: 3
}, 0);

/**
 * z-index 序号
 */
let zIndexSeed = 1100;

export type DisplayLayerProps = Partial<{
    id: string;
    listenUpdateStyle: boolean;
    animation: string | boolean;
    modal: boolean;
    show: boolean;
    contentClassName: string;
    hotkey: ((e: KeyboardEvent|React.KeyboardEvent<HTMLDivElement>, that: DisplayLayer) => void)|boolean;
    className: string;
    backdrop: boolean;
    backdropClassName: string;
    loadingContent: boolean;
    cache: boolean;
    enableBackdropClick: boolean;
    rootClassName: string;
    style: React.CSSProperties;
    plugName: string;
    onShow: (that: DisplayLayer) => void;
    onShown: (that: DisplayLayer) => void;
    onHide: (that: DisplayLayer) => void;
    onHidden: (that: DisplayLayer) => void;
    onAction: (option: {type: 'submit'|'cancel'}) => void;
    onLoad: (result: boolean, content: ReactNodeLike, that: DisplayLayer) => void;
    contentLoadFail: ReactNodeLike;
    header: ReactNodeLike;
    footer: ReactNodeLike;
    children: ReactNodeLike;
    content: ReactNodeLike|(() => ReactNodeLike);
    zIndex: number;
}>;

type DisplayLayerState = {
    stage: number;
    loading: boolean;
    content: ReactNodeLike;
    style: React.CSSProperties;
    zIndex: number;
};

/**
 * DisplayLayer 组件 ，显示一个弹出层
 * 所有可用的动画名称包括：
 * - scale-from-top
 * - scale-from-bottom
 * - scale-from-left
 * - scale-from-right
 * - scale-from-center
 * - enter-from-top
 * - enter-from-bottom
 * - enter-from-left
 * - enter-from-right
 * - enter-from-center
 *
 */
export default class DisplayLayer extends PureComponent<DisplayLayerProps, DisplayLayerState> {
    /**
     * DisplayLayer 显示状态
     * 共 4 个状态
     * - init，需要初始化
     * - ready，准备好进行显示
     * - shown，已经显示
     * - hidden，已经隐藏
     */
    static STAGE = STAGE;

    static defaultProps = {
        listenUpdateStyle: false,
        plugName: '',
        animation: 'scale-from-top',
        modal: false,
        show: true,
        content: '',
        contentLoadFail: null as ReactNodeLike,
        contentClassName: '',
        header: null as ReactNodeLike,
        footer: null as ReactNodeLike,
        onShown: null as (that: DisplayLayer) => void,
        onShow: null as (that: DisplayLayer) => void,
        onHidden: null as (that: DisplayLayer) => void,
        onHide: null as (that: DisplayLayer) => void,
        onLoad: null as (result: boolean, content: ReactNodeLike, that: DisplayLayer) => void,
        hotkey: true,
        className: 'layer',
        rootClassName: '',
        backdrop: true,
        backdropClassName: '',
        loadingContent: true,
        cache: false,
        id: '',
        children: null as ReactNodeLike,
        style: null as React.CSSProperties,
        onAction: null as (option: {type: 'submit'|'cancel'}) => void,
        enableBackdropClick: true
    };

    /**
     * 控件 ID
     */
    id: string;

    /**
     * 显示动画计时器任务 ID
     */
    showTimerTask: NodeJS.Timeout;

    displayElement: HTMLDivElement;

    constructor(props: DisplayLayerProps) {
        super(props);

        this.state = {
            stage: STAGE.$.init,
            loading: typeof props.content === 'function',
            content: typeof props.content !== 'function' ? props.content : null,
            style: null,
            zIndex: zIndexSeed++
        };

        this.id = props.id || fuid();
    }

    componentDidMount() {
        const {show, hotkey} = this.props;
        if (show) {
            this.show();
            this.loadContent();
        }

        if (hotkey) {
            window.addEventListener('keyup', this.handleWindowKeyup);
        }
    }

    componentWillUnmount() {
        const {hotkey} = this.props;
        if (hotkey) {
            window.removeEventListener('keyup', this.handleWindowKeyup);
        }
        clearTimeout(this.showTimerTask);
    }

    /**
     * 上次显示的时间
     */
    lastShowTime = 0;

    /**
     * 获取组件名称
     */
    get stageName() {
        const {stage} = this.state;
        return STAGE.getName(stage);
    }

    /**
     * 检查组件是否显示
     */
    get isShow() {
        return this.isStage(STAGE.$.shown);
    }

    /**
     * 检查组件是否隐藏
     */
    get isHide() {
        return this.isStage(STAGE.$.hidden);
    }

    /**
     * 检查当前状态是否为指定的状态
     * @param stage 要检查的状态序号或者名称
     * @returns 如果为 `true` 则为指定的状态
     */
    isStage(stage: DisplayLayerStatusName|number) {
        return STAGE.isSame(stage, this.state.stage);
    }

    /**
     * 变更状态
     * @param stage 要变更的状态
     */
    changeStage(stage: DisplayLayerStatusName|number) {
        const newState = {stage: STAGE.getValue(stage)} as any;
        if (STAGE.isSame(stage, STAGE.$.shown)) {
            newState.zIndex = zIndexSeed++;
        }
        this.setState(newState);
    }

    /**
     * 设置界面元素上的样式
     * @param style 要设置的样式对象
     * @param callback 设置完成后的回调函数
     */
    setStyle(style: React.CSSProperties, callback?: () => void) {
        this.setState({style}, callback);
    }

    /**
     * 显示 DisplayLayer
     * @param callback 完成后的回调函数
     */
    show(callback?: (that: this) => void) {
        if (this.state.stage === STAGE.$.init) {
            this.changeStage(STAGE.$.ready);
            this.showTimerTask = setTimeout(() => {
                this.show(callback);
            }, 50);
            return;
        }

        const {onShow, onShown, animation} = this.props;

        onShow?.(this);
        this.changeStage(STAGE.$.shown);
        const afterShow = () => {
            this.lastShowTime = Date.now();
            onShown?.(this);
            callback?.(this);
        };
        if (animation) {
            setTimeout(afterShow, 400);
        } else {
            afterShow();
        }
    }

    /**
     * 隐藏 DisplayLayer
     * @param callback 完成后的回调函数
     */
    hide(callback?: (that: this) => void) {
        this.changeStage(STAGE.$.hidden);
        const {animation, onHide} = this.props;

        onHide?.(this);
        const afterHidden = () => {
            const {cache, onHidden} = this.props;
            if (cache) {
                this.reset();
            }
            onHidden?.(this);
            if (typeof callback === 'function') {
                callback(this);
            }
        };
        if (animation) {
            setTimeout(afterHidden, 400);
        } else {
            afterHidden();
        }
    }

    /**
     * 在弹出层上加载新的内容
     * @param newContent 新的内容
     * @param callback 完成后的回调函数
     */
    loadContent(newContent?: ReactNodeLike|(() => ReactNodeLike), callback?: (result: boolean, content: ReactNodeLike, that: this) => void) {
        let {content} = this.props;
        if (newContent !== undefined) {
            content = newContent;
        }
        const contentResult = typeof content === 'function' ? content() : content;
        const {contentLoadFail, onLoad} = this.props;
        const afterLoad = () => {
            onLoad?.(true, this.state.content, this);
            callback?.(true, this.state.content, this);
        };
        if (contentResult instanceof Promise) {
            this.setState({loading: true, content: null});
            contentResult.then(result => {
                this.setState({content: result, loading: false}, afterLoad);
            }).catch(() => {
                this.setState({content: contentLoadFail, loading: false}, afterLoad);
            });
            return;
        }

        this.setState({content: contentResult, loading: false}, afterLoad);
    }

    /**
     * 处理界面按键事件
     * @param e 事件对象
     */
    handleWindowKeyup = (e: React.KeyboardEvent<HTMLDivElement>|KeyboardEvent) => {
        const {hotkey, onAction} = this.props;
        if (e.code === 'Escape') { // ESC key code: 27
            onAction?.({type: 'cancel'});
            this.hide();
            return;
        }

        if ((e.code === 'Enter' || e.code === 'NumpadEnter') && typeof onAction === 'function') {
            onAction({type: 'submit'});
            this.hide();
            return;
        }

        if (typeof hotkey === 'function') {
            hotkey(e, this);
        }
    };

    /**
     * 重置状态为 init（需要初始化）
     */
    reset() {
        this.setState({stage: STAGE.$.init});
    }

    /**
     * 处理背景遮罩层点击事件
     */
    handleBackdropClick = () => {
        if (this.props.enableBackdropClick && !this.props.modal) {
            this.hide();
        }
    };

    /**
     * 处理弹出层点击事件
     * @param event 事件对象
     */
    handleDisplayClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        let target = event.target as HTMLElement;
        while (target) {
            if (target && (target.hasAttribute('data-dismiss') || (target.classList && target.classList.contains('dismiss-display')))) {
                this.hide();
                break;
            }
            target = target.parentElement;
        }
    };

    render() {
        const {

            plugName, className, rootClassName, backdrop, backdropClassName, animation, modal, show, content, onShown, onHidden, onShow, onHide, header, footer, hotkey, cache, loadingContent, contentClassName, contentLoadFail, children, style, listenUpdateStyle, id, onAction, onLoad,
            ...other
        } = this.props;
        delete other.enableBackdropClick;
        delete other.zIndex;

        const finalClassName = classes(
            'display-layer',
            rootClassName,
            `display-stage-${this.stageName}`,
            plugName ? `display-layer-${plugName}` : null,
            {'has-animation': !!animation}
        );

        return (
            <div
                onKeyUp={this.handleWindowKeyup}
                className={finalClassName}
                style={{zIndex: this.props.zIndex ?? this.state.zIndex}}
            >
                {backdrop && (
                    <div onClick={this.handleBackdropClick} className={classes('display-backdrop', backdropClassName)}>
                        <div className="user-app-dragable dock-top" />
                    </div>
                )}
                <div
                    id={this.id}
                    className={classes('display', animation, className, {in: this.isStage(STAGE.$.shown)})}
                    style={({...style, ...this.state.style})}

                    ref={e => {this.displayElement = e;}}
                    onClick={this.handleDisplayClick}
                    {...other}
                >
                    {header}
                    <div className={classes('content', contentClassName)}>
                        <ErrorBoundary>
                            {
                                this.state.loading
                                    ? loadingContent === true
                                        ? <Spinner />
                                        : loadingContent
                                    : this.state.content
                            }
                        </ErrorBoundary>
                    </div>
                    {children}
                    {footer}
                </div>
            </div>
        );
    }
}
