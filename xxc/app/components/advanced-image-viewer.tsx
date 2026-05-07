import {Component} from 'react';
import {ImageViewerActions} from './image-viewer-actions';

type AdvancedImageViewerProps = Partial<{
    src: string;
    onRequestClose: () => void;
    onKeyDown: (e: KeyboardEvent) => void;
    showActions: boolean;
    minScale: number;
    maxScale: number;
    wheelSpeed: number;
    touchpadSpeed: number;
    zoomInText: string;
    zoomOutText: string;
    rotate90Text: string;
    zoomResetText: string;
    showScaleLabel: boolean;
    saveAsText: string;
}>;

type AdvancedImageViewerState = {
    x: 'auto'|number;
    y: 'auto'|number;
    scale: number;
    rotate: number;
    movable: boolean;
};

/**
 * 高级图片查看组件
 */
export default class AdvancedImageViewer extends Component<AdvancedImageViewerProps, AdvancedImageViewerState> {
    static defaultProps = {
        showActions: false,
        minScale: 0.1,
        maxScale: 10,
        wheelSpeed: 1,
        touchpadSpeed: 1,
        showScaleLabel: true,
    };

    viewerElement: HTMLDivElement;

    imageElement: HTMLImageElement;

    scaleChangeTimer: NodeJS.Timeout;

    closeTimer: NodeJS.Timeout;

    isDragging: boolean;

    isMouseDown: boolean;

    disx: number;

    disy: number;

    lastMouseUpTime: number;

    posRegulatorTimer: NodeJS.Timeout;

    constructor(props: AdvancedImageViewerProps) {
        super(props);

        this.state = {
            x: 'auto',
            y: 'auto',
            scale: 1,
            rotate: 0,
            movable: true,
        };
    }

    componentDidMount() {
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);
    }

    componentDidUpdate(_prevProps: AdvancedImageViewerProps, prevState: AdvancedImageViewerState) {
        if (this.props.showScaleLabel && prevState.scale !== this.state.scale) {
            if (this.scaleChangeTimer) {
                clearTimeout(this.scaleChangeTimer);
            }
            this.viewerElement.classList.add('is-scaling');
            this.scaleChangeTimer = setTimeout(() => {
                this.viewerElement.classList.remove('is-scaling');
                this.scaleChangeTimer = null;
            }, 1000);
        }
    }

    componentWillUnmount() {
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        if (this.closeTimer) {
            clearTimeout(this.closeTimer);
        }
        if (this.scaleChangeTimer) {
            clearTimeout(this.scaleChangeTimer);
        }
    }

    /**
     * 处理鼠标点击事件
     * @param event 事件对象
     */
    handleMouseDown = (event: React.MouseEvent<HTMLImageElement, MouseEvent>) => {
        this.isDragging = false;
        this.isMouseDown = true;
        event.preventDefault();
        const elm = event.target as HTMLElement;
        this.disx = event.pageX - elm.offsetLeft;
        this.disy = event.pageY - elm.offsetTop;
    };

    /**
     * 处理鼠标移动事件
     * @param event 事件对象
     */
    handleMouseMove = (event: MouseEvent) => {
        if (this.isMouseDown && this.isDraggable(event)) {
            this.isDragging = true;
            this.setState(() => this.calculatePos(event));
        }
    };

    /**
     * 处理鼠标点击弹起事件
     * @param event 事件对象
     */
    handleMouseUp = (event: MouseEvent) => {
        this.isMouseDown = false;
        if (!(event.target as HTMLElement).closest('a,button')) {
            const now = Date.now();
            if (this.isDragging && this.isDraggable(event)) {
                this.setState(() => this.calculatePos(event));
            } else if (this.lastMouseUpTime && (now - this.lastMouseUpTime) < 300) {
                if (this.closeTimer) {
                    clearTimeout(this.closeTimer);
                    this.closeTimer = null;
                }
                this.resetTransforms();
            } else {
                clearTimeout(this.closeTimer);
                this.closeTimer = setTimeout(() => {
                    const {onRequestClose} = this.props;
                    if (onRequestClose) {
                        onRequestClose();
                    }
                    this.closeTimer = null;
                }, 350);
            }
            this.lastMouseUpTime = now;
        }

        this.isDragging = false;
    };

    /**
     * 判断图片是否可以被拖动
     * @param event 事件对象
     * @returns 是否可以被拖动
     */
    isDraggable = (event: MouseEvent) => {
        if (!this.state.movable) {
            return false;
        }
        const img = event.target as HTMLElement;
        if (img?.tagName === 'IMG') {
            const imgRect = img.getBoundingClientRect();
            const imgContainerRect = img.offsetParent.getBoundingClientRect();
            return imgRect.height > imgContainerRect.height || imgRect.width > imgContainerRect.width;
        }
        return false;
    };

    /**
     * 判断图片是否可以被缩放或移动
     * @returns 是否可以被缩放或移动
     */
    get isMovable() {
        return this.state.movable;
    }

    calculatePos(event: {target: HTMLImageElement;}, noDrag: true): Pick<AdvancedImageViewerState, 'x'|'y'>;

    calculatePos(event: React.WheelEvent<HTMLDivElement>, noDrag: true): Pick<AdvancedImageViewerState, 'x'|'y'>;

    calculatePos(event: MouseEvent, noDrag?: boolean): Pick<AdvancedImageViewerState, 'x'|'y'>;

    /**
     * 处理并计算拖动后图片的合法位置
     * @param event 事件对象
     * @param noDrag 是否忽略拖动偏移，仅重新计算位置（适用于缩放时）
     * @returns 计算后的图片位置
     */
    calculatePos(event: MouseEvent|React.WheelEvent<HTMLDivElement>|{target: HTMLImageElement;}, noDrag = false) {
        const pos = noDrag ? {x: this.state.x, y: this.state.y} : {
            x: (event as MouseEvent).pageX - this.disx,
            y: (event as MouseEvent).pageY - this.disy,
        };
        let {scale} = this.state;
        if (!scale) scale = 1;
        const {maxScale, minScale} = this.props;
        scale = Math.min(maxScale, Math.max(minScale, scale));
        if (Math.abs(1 - scale) < 0.15) { // 当缩放到 100% 附近时回落到 100%
            scale = 1;
        }
        const img = event.target as HTMLImageElement;
        if (img?.tagName === 'IMG') {
            const imgRect = img.getBoundingClientRect();
            const imgContainerRect = img.offsetParent.getBoundingClientRect();

            if (imgRect.height <= imgContainerRect.height) {
                pos.y = 'auto';
            }
            if (imgRect.width <= imgContainerRect.width) {
                pos.x = 'auto';
            }

            // 图片尺寸大于容器大小时，拖动不超出图片
            const leftMax = (((imgRect.width / scale) * (scale - 1)) / 2);
            const topMax = (((imgRect.height / scale) * (scale - 1)) / 2);
            const rightMin = imgContainerRect.width - imgRect.width + (((imgRect.width / scale) * (scale - 1)) / 2);
            const bottomMin = imgContainerRect.height - imgRect.height + (((imgRect.height / scale) * (scale - 1)) / 2);
            if (imgRect.height > imgContainerRect.height) {
                if (imgRect.width <= imgContainerRect.width) {
                    pos.x = (imgContainerRect.width - imgRect.width / scale) / 2;
                }
                if (pos.y < bottomMin) {
                    pos.y = bottomMin;
                } else if (pos.y > topMax) {
                    pos.y = topMax;
                }
            }
            if (imgRect.width > imgContainerRect.width) {
                if (imgRect.height <= imgContainerRect.height) {
                    pos.y = (imgContainerRect.height - imgRect.height / scale) / 2;
                }
                if (pos.x < rightMin) {
                    pos.x = rightMin;
                } else if (pos.x > leftMax) {
                    pos.x = leftMax;
                }
            }
            return pos;
        }
        return {};
    }

    /**
     * 重置对图片的变形操作
     */
    resetTransforms = () => {
        this.setState({
            x: 'auto',
            y: 'auto',
            scale: 1,
            rotate: 0,
            movable: true,
        });
    };

    /**
     * 放大
     * @param event 鼠标点击事件
     */
    zoomIn = (event?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        const {x, y} = this.state;
        this.setState(prevState => ({scale: Math.min(this.props.maxScale, prevState.scale * 1.5)}), () => {
            if (x !== 'auto' || y !== 'auto') {
                setTimeout(() => {
                    this.setState(() => this.calculatePos({target: document.querySelector('.advance-image-viewer > img') as HTMLImageElement}, true));
                }, 200);
            }
        });
        event?.stopPropagation();
    };

    /**
     * 缩小
     * @param event 鼠标点击事件
     */
    zoomOut = (event?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        const {x, y} = this.state;
        this.setState(prevState => ({scale: Math.max(this.props.minScale, prevState.scale * (2 / 3))}), () => {
            if (x !== 'auto' || y !== 'auto') {
                setTimeout(() => {
                    this.setState(() => this.calculatePos({target: document.querySelector('.advance-image-viewer > img') as HTMLImageElement}, true));
                }, 200);
            }
        });
        event?.stopPropagation();
    };

    /**
     * 旋转 90 度，并缩放到适应图片容器的大小
     * @param event 鼠标点击事件
     */
    rotate90 = (event?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        let rotate: number;
        const viewerElementDimensions = this.viewerElement?.getBoundingClientRect();
        const imageDimensions = this.imageElement ? {width: this.imageElement.width, height: this.imageElement.height} : null;
        this.setState(prevState => {
            const state: Partial<AdvancedImageViewerState> = {};
            const {rotate: prevRotate} = prevState;
            rotate = prevRotate - 90;
            const isEvenRotate = !((rotate / 90) % 2);
            state.movable = rotate % 360 === 0;
            state.x = 'auto';
            state.y = 'auto';
            state.scale = 1;
            state.rotate = rotate;
            if (!isEvenRotate && viewerElementDimensions && imageDimensions) {
                const {height: imageWidth, width: imageHeight} = imageDimensions;
                const {height: viewerHeight, width: viewerWidth} = viewerElementDimensions;
                if (viewerHeight < imageHeight) {
                    state.scale = viewerHeight / imageHeight;
                } else if (viewerWidth < imageWidth) {
                    state.scale = viewerWidth / imageWidth;
                }
            }
            return state as AdvancedImageViewerState;
        }, () => {
            if (rotate % 360 === 0) {
                // 保证旋转到 360 度的动画能够顺利进行
                setTimeout(() => {
                    // 旋转到 360 度后，立刻偷偷转回到 0 度，期间关闭动画
                    requestAnimationFrame(() => {
                        this.setState({rotate: 0}, () => {
                            document.body.classList.add('no-animation');
                            requestAnimationFrame(() => {
                                document.body.classList.remove('no-animation');
                            });
                        });
                    });
                }, 100);
            }
        });
        event?.stopPropagation();
    };

    /**
     * 处理键盘 ESC 事件，退出图片浏览
     * @param e 键盘事件对象
     */
    handleKeyDown = (e: KeyboardEvent) => {
        const {onRequestClose, onKeyDown} = this.props;
        if (e.code === 'Escape') {
            onRequestClose?.();
        }
        onKeyDown?.(e);
    };

    /**
     * 触摸板、鼠标滚轮缩放图片
     * @param e 鼠标滚轮事件对象
     */
    handleMouseOnWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        const {x, y, movable, scale} = this.state;
        if (!movable) {
            return;
        }
        const {ctrlKey: isTouch} = e;
        const {wheelDelta, deltaY} = e.nativeEvent as WheelEvent & {wheelDelta: number;};
        const {minScale, maxScale, wheelSpeed, touchpadSpeed} = this.props;
        const deltaScale = isTouch ? touchpadSpeed * (-deltaY / 80) * (scale / 2) : wheelSpeed * (wheelDelta / 500);
        this.setState(prevState => ({scale: Math.min(maxScale, Math.max(minScale, prevState.scale + deltaScale))}), () => {
            if (x !== 'auto' || y !== 'auto') {
                clearTimeout(this.posRegulatorTimer);
                this.posRegulatorTimer = setTimeout(() => {
                    this.setState(() => this.calculatePos(e, true));
                }, 200);
            }
        });
    };

    /**
     * 获取图片容器 HTMLElement 引用
     * @param ref HTMLElement 引用对象
     */
    getViewerRef = (ref: HTMLDivElement) => {
        this.viewerElement = ref;
    };

    /**
     * 获取图片 HTMLImageElement 引用
     * @param ref HTMLImageElement 引用对象
     */
    getImageRef = (ref: HTMLImageElement) => {
        this.imageElement = ref;
    };

    render() {
        const {
            src,
            showActions,
            minScale,
            maxScale,
            zoomInText,
            zoomOutText,
            zoomResetText,
            rotate90Text,
            showScaleLabel,
            saveAsText
        } = this.props;
        const {
            scale, x, y, rotate, movable,
        } = this.state;

        let actualScale = Math.min(maxScale, Math.max(minScale, scale));
        if (Math.abs(1 - actualScale) < 0.15) { // 当缩放到 100% 附近时回落到 100%
            actualScale = 1;
        }

        const style: React.CSSProperties = {
            transform: `scale(${actualScale}) rotate(${rotate}deg)`,
            position: (x === 'auto' || y === 'auto') ? 'relative' : 'absolute',
            top: y,
            left: x
        };

        let actionsView = null;
        if (showActions) {
            actionsView = (
                <ImageViewerActions
                    className="dock dock-top dock-right has-padding-sm -rounded"
                    zoomOut={this.zoomOut}
                    zoomIn={this.zoomIn}
                    resetTransforms={this.resetTransforms}
                    rotate90={this.rotate90}
                    zoomInText={zoomInText}
                    zoomOutText={zoomOutText}
                    zoomResetText={zoomResetText}
                    rotate90Text={rotate90Text}
                    saveAsText={saveAsText}
                    movable={movable}
                />
            );
        }

        return (
            <div
                className="advance-image-viewer dock center-content"
                onWheel={this.handleMouseOnWheel}
                ref={this.getViewerRef}
            >
                <img
                    style={style}
                    src={src}
                    alt={src}
                    onMouseDown={this.handleMouseDown}
                    ref={this.getImageRef}
                />
                {showScaleLabel ? <div className="advance-image-viewer-scale-label label -rounded-full -shadow">{Math.floor(actualScale * 100)}%</div> : null}
                {actionsView}
            </div>
        );
    }
}
