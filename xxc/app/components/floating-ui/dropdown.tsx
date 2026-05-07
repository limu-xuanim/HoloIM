import {cloneElement, useState} from 'react';
import {useFloating, useInteractions, flip, shift, offset, autoUpdate, useClick, useDismiss, type OffsetOptions, autoPlacement, type AutoPlacementOptions, FlipOptions} from '@floating-ui/react';
import {renderIf} from '~/app/utils/render';

type DropdownWithStateProps = {
    referenceNode: JSX.Element;
    floatingNode: JSX.Element;
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    offsetValue?: OffsetOptions;
};

export function DropdownWithSate(props: DropdownWithStateProps) {
    const {referenceNode, floatingNode, isOpen, setIsOpen, offsetValue = 10} = props;
    const {refs, floatingStyles, context} = useFloating({
        open: isOpen,
        onOpenChange: setIsOpen,
        middleware: [flip(), shift(), offset(offsetValue)],
        whileElementsMounted: autoUpdate,
    });

    const click = useClick(context);
    const dismiss = useDismiss(context);
    const {getReferenceProps, getFloatingProps} = useInteractions([
        click,
        dismiss
    ]);

    return (
        <>
            {
                cloneElement(
                    referenceNode, {
                        ref: refs.setReference,
                        ...getReferenceProps(),
                        onClick: (e: MouseEvent) => {
                            setIsOpen(!isOpen);
                            e.stopPropagation();
                            e.preventDefault();
                        },
                    }
                )
            }
            {
                renderIf(isOpen) && cloneElement(
                    floatingNode, {
                        ref: refs.setFloating,
                        style: floatingStyles,
                        ...getFloatingProps(),
                        onClick: (e: MouseEvent) => {
                            setIsOpen(false);
                            e.stopPropagation();
                            e.preventDefault();
                        },
                    }
                )
            }
        </>
    );

}

type DropdownProps = {
    referenceNode: JSX.Element;
    floatingNode: JSX.Element;
    offsetValue?: OffsetOptions;
    flipOptions?:  FlipOptions;
};

export default function Dropdown(props: DropdownProps) {
    const {referenceNode, floatingNode, offsetValue = 10, flipOptions} = props;
    const [isOpen, setIsOpen] = useState(false);
    const {refs, floatingStyles, context} = useFloating({
        open: isOpen,
        onOpenChange: setIsOpen,
        middleware: [flip(flipOptions), shift(), offset(offsetValue)],
        whileElementsMounted: autoUpdate,
    });

    const click = useClick(context);
    const dismiss = useDismiss(context);
    const {getReferenceProps, getFloatingProps} = useInteractions([
        click,
        dismiss
    ]);

    return (
        <>
            {
                cloneElement(
                    referenceNode, {
                        ref: refs.setReference,
                        ...getReferenceProps(),
                        onClick: (e: MouseEvent) => {
                            setIsOpen(x => !x);
                            e.stopPropagation();
                            e.preventDefault();
                        },
                    }
                )
            }
            {
                renderIf(isOpen) && cloneElement(
                    floatingNode, {
                        ref: refs.setFloating,
                        style: floatingStyles,
                        ...getFloatingProps(),
                        onClick: (e: MouseEvent) => {
                            setIsOpen(false);
                            e.stopPropagation();
                            e.preventDefault();
                        },
                    }
                )
            }
        </>
    );

}
