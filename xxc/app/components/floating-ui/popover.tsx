import {type ReactNode, useState, useRef} from 'react';
import {useFloating, offset, flip, shift, autoUpdate, useClick, useDismiss, useRole, useInteractions, FloatingFocusManager, type OffsetOptions, arrow, FloatingArrow, type FloatingArrowProps} from '@floating-ui/react';
import {classes} from '~/app/utils/html-helper';
import {renderIf} from '~/app/utils/render';

type PopoverProps = {
    referenceNode: JSX.Element;
    floatingNode: ReactNode;
    referenceClassName?: string;
    floatingClassName?: string;
    offsetValue?: OffsetOptions;
    useArrow?: boolean;
    arrowOptions?: Omit<FloatingArrowProps, 'context' | 'ref'>;
};

export default function Popover(props: PopoverProps) {
    const {referenceNode, floatingNode, referenceClassName, floatingClassName, offsetValue = 10, useArrow = true, arrowOptions = {}} = props;
    const [isOpen, setIsOpen] = useState(false);
    const arrowRef = useRef<SVGSVGElement>(null);
    const {refs, floatingStyles, context} = useFloating({
        open: isOpen,
        onOpenChange: setIsOpen,
        middleware: [offset(offsetValue), flip(), shift(), ...(useArrow ? [arrow({element: arrowRef})] : [])],
        whileElementsMounted: autoUpdate,
        strategy: 'fixed',
    });

    const click = useClick(context);
    const dismiss = useDismiss(context);
    const role = useRole(context);
    const {getReferenceProps, getFloatingProps} = useInteractions([
        click,
        dismiss,
        role,
    ]);

    const handleClose: React.MouseEventHandler<HTMLDivElement> = (e) => {
        const elm = e.target as HTMLElement;
        if (elm.dataset.action === 'close') {
            setIsOpen(false);
        }
    };

    return (
        <>
            <span ref={refs.setReference} {...getReferenceProps()} className={referenceClassName}>{referenceNode}</span>
            {
                renderIf(isOpen) && (
                    <FloatingFocusManager context={context} modal={false}>
                        <div className={classes('floating-node-container', floatingClassName)} ref={refs.setFloating} style={floatingStyles} {...getFloatingProps()} onClick={handleClose}>
                            {floatingNode}
                            {renderIf(useArrow) && <FloatingArrow context={context} ref={arrowRef} {...arrowOptions} />}
                        </div>
                    </FloatingFocusManager>
                )
            }
        </>
    );
}
