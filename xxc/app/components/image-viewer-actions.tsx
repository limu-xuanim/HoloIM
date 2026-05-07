type ImageViewerActionsProps = Partial<{
    zoomOut: React.MouseEventHandler<HTMLButtonElement>;
    zoomIn: React.MouseEventHandler<HTMLButtonElement>;
    resetTransforms: React.MouseEventHandler<HTMLButtonElement>;
    rotate90: React.MouseEventHandler<HTMLButtonElement>;
    handleActionSaveAs: React.MouseEventHandler<HTMLButtonElement>;
    className: string;
    zoomInText: string;
    zoomOutText: string;
    rotate90Text: string;
    zoomResetText: string;
    saveAsText: string;
    movable: boolean;
}>;

/**
 * 图片查看操作栏
 * @see https://zh-hans.reactjs.org/docs/components-and-props.html
 * @param props React 组件属性对象
 * @returns React Node content
 */
export function ImageViewerActions(props: ImageViewerActionsProps) {
    const {
        className,
        zoomOut,
        zoomIn,
        resetTransforms,
        rotate90,
        zoomInText,
        zoomOutText,
        zoomResetText,
        rotate90Text,
        saveAsText,
        handleActionSaveAs,
        movable = true,
    } = props;

    return (
        <div className={`toolbar -flex -flex-row ${className ?? ''}`}>
            <button
                className="btn iconbutton has-padding hint--bottom-right"
                data-hint={zoomOutText}
                type="button"
                onClick={zoomOut}
                disabled={!movable}
            >
                <i className="icon icon-2x mdi mdi-magnify-minus-outline" />
            </button>
            <button
                className="btn iconbutton has-padding hint--bottom-right"
                data-hint={zoomInText}
                type="button"
                onClick={zoomIn}
                disabled={!movable}
            >
                <i className="icon icon-2x mdi mdi-magnify-plus-outline" />
            </button>
            <button
                className="btn iconbutton has-padding hint--bottom-right"
                data-hint={zoomResetText}
                type="button"
                onClick={resetTransforms}
            >
                <i className="icon icon-2x mdi mdi-magnify-scan" />
            </button>
            <button
                className="btn iconbutton has-padding hint--bottom-right"
                data-hint={rotate90Text}
                type="button"
                onClick={rotate90}
            >
                <i className="icon icon-2x mdi mdi-format-rotate-90" />
            </button>
            <button
                className="btn iconbutton has-padding hint--bottom-right"
                data-hint={saveAsText}
                type="button"
                onClick={handleActionSaveAs}
            >
                <i className="icon icon-2x mdi mdi-arrow-down-bold-circle-outline" />
            </button>
        </div>
    );
}
