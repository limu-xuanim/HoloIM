import {type CSSProperties, type MouseEventHandler, type ReactNode, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {classes} from '~/app/utils/html-helper';

export type SplitPaneProps = {
    children: ReactNode[];
    primary?: 'first' | 'second';
    minSize?: number;
    maxSize?: number;
    defaultSize?: number;
    size?: number;
    split?: 'vertical' | 'horizontal';
    onChange?: (newSize: number) => void;
    style?: CSSProperties;
    resizerStyle?: CSSProperties;
    className: string;
    pane1ClassName?: string;
    pane2ClassName?: string;
    paneStyle?: CSSProperties;
    pane1Style?: CSSProperties;
    pane2Style?: CSSProperties;
    resizerClassName?: string;
};

export function SplitPane({
    children,
    className = '',
    pane1ClassName = '',
    pane2ClassName = '',
    paneStyle,
    pane1Style: pane1StyleProps = {},
    pane2Style: pane2StyleProps = {},
    resizerClassName,
    resizerStyle: resizerStyleProps,
    split = 'vertical',
    size: controlSize,
    defaultSize,
    minSize = 50,
    maxSize,
    primary = 'first',
    onChange,
}: SplitPaneProps) {
    const splitPaneRef = useRef<HTMLDivElement>(null);
    const pane1Ref = useRef<HTMLDivElement>(null);
    const pane2Ref = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState(controlSize || defaultSize || minSize);
    const isDrag = useRef(false);
    const initPosition = useRef({x: 0, y: 0});

    const mouseUpHandler = useCallback(() => {
        isDrag.current = false;
    }, []);

    useEffect(() => {
        document.addEventListener('mouseup', mouseUpHandler);
        return () => {
            document.removeEventListener('mouseup', mouseUpHandler);
        };
    }, [mouseUpHandler]);

    const mouseMoveHandler = useCallback<MouseEventHandler<HTMLDivElement>>((e) => {
        if (!isDrag.current) return;
        window.getSelection()?.removeAllRanges();
        if (split === 'vertical') {
            const newSize = Math.max(
                minSize,
                Math.min(maxSize || Number.POSITIVE_INFINITY, primary === 'first' ? size + e.movementX : size - e.movementX),
            );
            setSize(newSize);
            if (newSize !== size) {
                if (onChange) {
                    onChange(newSize);
                }
            }
        } else {
            const newSize = Math.max(
                minSize,
                Math.min(maxSize || Number.POSITIVE_INFINITY, primary === 'first' ? size + e.movementY : size - e.movementY),
            );
            setSize(newSize);
            if (newSize !== size) {
                setSize(newSize);
                if (onChange) {
                    onChange(newSize);
                }
            }
        }
    }, [split, minSize, maxSize, size, onChange, primary])

    const mouseDownHandler = useCallback<MouseEventHandler<HTMLDivElement>>((e) => {
        window.getSelection()?.removeAllRanges();
        const {clientX: x, clientY: y} = e;
        initPosition.current = {x, y};
        isDrag.current = true;
    }, []);

    const style: CSSProperties = {
        ...paneStyle,
        display: 'flex',
        position: 'relative',
        flexWrap: 'nowrap',
        alignItems: 'stretch',
        flexDirection: split === 'vertical' ? 'row' : 'column',
        userSelect: 'none',
    };

    const primarySize = controlSize || size;

    const isPane1Hide = !children[0];
    const isPane2Hide = !children[1];

    const pane1Style: CSSProperties = {
        ...pane1StyleProps,
        flex: primary === 'first' ? `0 0 ${primarySize}px` : 'auto',
        minWidth: 0,
        minHeight: 0,
        userSelect: 'none',
        display: isPane1Hide ? 'none' : undefined
    };

    const pane2Style: CSSProperties = {
        ...pane2StyleProps,
        flex: primary === 'second' ? `0 0 ${primarySize}px` : 'auto',
        minWidth: 0,
        minHeight: 0,
        userSelect: 'none',
        display: isPane2Hide ? 'none' : undefined
    };

    const resizerStyle: CSSProperties = {
        ...resizerStyleProps,
        flexGrow: 0,
        flexShrink: 0,
        userSelect: 'none',
        cursor: split === 'vertical' ? 'col-resize' : 'row-resize',
        display: isPane1Hide || isPane2Hide ? 'none' : undefined
    };

    const pane1Children = useMemo(() => children[0], [children[0]]);
    const pane2Children = useMemo(() => children[1], [children[1]]);

    return (
        <div
            className={classes('SplitPane', className, split)}
            ref={splitPaneRef}
            style={style}
            onMouseMove={mouseMoveHandler}
        >
            <div key="pane1" className={classes('-relative', pane1ClassName)} ref={pane1Ref} style={pane1Style}>
                {pane1Children}
            </div>

            <div
                key="resizer"
                className={classes('Resizer', split, resizerClassName)}
                style={resizerStyle}
                onMouseDown={mouseDownHandler}
                onDragStart={(e) => e.preventDefault()}
            />

            <div key="pane2" className={classes('-relative', pane2ClassName)} ref={pane2Ref} style={pane2Style}>
                {pane2Children}
            </div>
        </div>
    );
}
