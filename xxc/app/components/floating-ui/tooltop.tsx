import {useState, useRef, type ReactNode} from 'react';
import {
    useFloating,
    autoUpdate,
    offset,
    flip,
    shift,
    useHover,
    useFocus,
    useDismiss,
    useRole,
    useInteractions,
    arrow,
    FloatingArrow,
    type Placement,
    type OffsetOptions,
    type FloatingArrowProps,
} from '@floating-ui/react';
import {renderIf} from '~/app/utils/render';

type TooltipProps = {
    referenceNode: JSX.Element;
    floatingNode: ReactNode;
    placement?: Placement;
    offset?: OffsetOptions;
    useArrow?: boolean;
    referenceClassName?: string;
    floatingClassName?: string;
    arrowOptions?: Omit<FloatingArrowProps, 'context' | 'ref'>;
};

export default function Tooltip(props: TooltipProps) {
    const {
        referenceNode,
        floatingNode,
        placement = 'top',
        offset: offsetValue = 4,
        useArrow = true,
        arrowOptions ={},
        referenceClassName,
        floatingClassName,
    } = props;
    const [isOpen, setIsOpen] = useState(false);
    const arrowRef = useRef<SVGSVGElement>(null);

    const createFloatingOptions = () => {
        const options: Parameters<typeof useFloating>[0] = {
            open: isOpen,
            onOpenChange: setIsOpen,
            whileElementsMounted: autoUpdate,
            placement,
            middleware: [offset(offsetValue), flip(), shift()],
        };

        if (useArrow) {
            options.middleware!.push(arrow({element: arrowRef}));
        }

        return options;
    };

    const {refs, floatingStyles, context} = useFloating(createFloatingOptions());

    const hover = useHover(context, { move: false });
    const focus = useFocus(context);
    const dismiss = useDismiss(context);
    const role = useRole(context, { role: 'tooltip' });

    const {getReferenceProps, getFloatingProps} = useInteractions([
        hover,
        focus,
        dismiss,
        role,
    ]);

    return (
        <>
            <span ref={refs.setReference} {...getReferenceProps()} className={referenceClassName}>{referenceNode}</span>
            {
                renderIf(isOpen) && (
                    <div className={floatingClassName} ref={refs.setFloating} style={floatingStyles} {...getFloatingProps()}>
                        {floatingNode}
                        {renderIf(useArrow) && <FloatingArrow ref={arrowRef} context={context} {...arrowOptions} />}
                    </div>
                )
            }
        </>
    );
}
