import {useState, cloneElement} from 'react';
import {useFloating, useDismiss, useInteractions, flip, shift, offset, autoUpdate} from '@floating-ui/react';
import {renderIf} from '~/app/utils/render';

type ContextMenuProps = {
    referenceNode: JSX.Element;
    floatingNode: JSX.Element;
};

export default function ContextMenu(props: ContextMenuProps) {
    const {referenceNode, floatingNode} = props;
    const [isOpen, setIsOpen] = useState(false);
    const {refs, floatingStyles, context} = useFloating({
        open: isOpen,
        onOpenChange: setIsOpen,
        middleware: [flip(), shift(), offset(10)],
        whileElementsMounted: autoUpdate,
    });

    const dismiss = useDismiss(context);
    const {getReferenceProps, getFloatingProps} = useInteractions([
        dismiss
    ]);

    return (
        <>
            {
                cloneElement(
                    referenceNode, {
                        ref: refs.setReference,
                        ...getReferenceProps(),
                        onContextMenu: (e: MouseEvent) => {
                            setIsOpen(true);
                            e.stopPropagation();
                            e.preventDefault();
                        },
                        onClick: (e: MouseEvent) => {
                            setIsOpen(false);
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
