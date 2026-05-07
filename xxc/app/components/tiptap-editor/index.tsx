import {type ForwardedRef, forwardRef, useImperativeHandle, type ReactNode, memo, useRef, useEffect} from 'react';
import {EditorContent, useEditor, type JSONContent, type EditorOptions, Extension, type SingleCommands} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Mention from '@tiptap/extension-mention'
import createSuggestion from './mention-suggestion';
import {classes} from '~/app/utils/html-helper';
import {showMediaPreviewWindow} from '~/app/entries/gallery/open-window';

type TiptapEditorProps = {
    className: string;
    slotAfter: ReactNode;
    placeholder: string;
    showPlaceholder: boolean;
    onFocus: EditorOptions['onFocus'];
    onBlur: EditorOptions['onBlur'];
    onUpdate: EditorOptions['onUpdate'];
    handleSendButtonClick: () => Promise<void>;
    maxMentionSuggestionCount: number;
    chat: Chat;
    onPaste: (content: string | File[]) => void;
    content?: string;
    autofocus?: boolean;
    sendShortcut?: string;
};

export type TipTapEditorRef = {
    focus: () => boolean;
    getText: () => string;
    getJSON: () => JSONContent | undefined;
    getHTML: () => string;
    clearContent: (emitUpdate?: boolean) => boolean;
    setImage: (src: string, alt?: string, title?: string) => void;
    isEmpty: () => boolean;
    insertContent: SingleCommands['insertContent'];
};

const TiptapEditor = forwardRef((
    tipTapEditorProps: TiptapEditorProps,
    ref: ForwardedRef<TipTapEditorRef>
) => {
    const {
        slotAfter,
        className,
        onBlur,
        onFocus,
        onUpdate,
        placeholder,
        showPlaceholder,
        handleSendButtonClick,
        maxMentionSuggestionCount,
        chat,
        sendShortcut = 'Enter',
        onPaste,
        content = '',
        autofocus = true,
    } = tipTapEditorProps;

    // 使用 ref 存储会在 extension 中使用的回调函数，避免 editor 因这些函数变化而重建
    const handleSendButtonClickRef = useRef(handleSendButtonClick);
    const handlePasteRef = useRef(onPaste);

    // 同步最新的回调函数到 ref
    useEffect(() => {
        handleSendButtonClickRef.current = handleSendButtonClick;
    }, [handleSendButtonClick]);

    useEffect(() => {
        handlePasteRef.current = onPaste;
    }, [onPaste]);

    // 保存编辑器内容，用于快捷键变化导致 editor 重建时恢复内容
    const savedContentRef = useRef<JSONContent | null>(null);

    const shortcut = sendShortcut
        .replaceAll('Option', 'Alt')
        .replaceAll('+', '-');

    const editor = useEditor({
        enableInputRules: false,
        enablePasteRules: false,
        extensions: [
            StarterKit,
            Image.configure({
                allowBase64: true,
                HTMLAttributes: {
                    class: '-block -cursor-pointer',
                }
            }),
            Extension.create({
                addKeyboardShortcuts: () => ({
                    [shortcut]: () => {
                        const reactRenderer = document.querySelector('body > [data-tippy-root] .react-renderer');
                        if (reactRenderer && reactRenderer.children.length !== 0) {
                            return false;
                        }

                        setTimeout(() => {
                            handleSendButtonClickRef.current?.();
                        }, 10);
                        return true;
                    }
                })
            }),
            Mention.configure(({
                suggestion: createSuggestion({chat, limit: maxMentionSuggestionCount}),
                HTMLAttributes: {
                    class: 'text-accent'
                }
            }))
        ],
        editorProps: {
            handlePaste(_view, event) {
                if (!event.clipboardData) {
                    return true;
                }

                const files: File[] = [];
                for (const item of event.clipboardData.items) {
                    if (item.kind === 'file') {
                        const file = item.getAsFile();
                        if (file) {
                            files.push(file);
                        }
                        continue;
                    }

                    if (item.type === 'text/html' || item.type === 'text/markhtml') {
                        continue;
                    }

                    if (item.kind === 'string' && item.type === 'text/plain') {
                        item.getAsString((text) => handlePasteRef.current?.(text));
                    }
                }

                if (files.length > 0) {
                    handlePasteRef.current?.(files);
                }
                return true;
            },
        },
        content,
        autofocus,
        onFocus,
        onBlur,
        onUpdate,
    }, [shortcut, chat]);

    // 保存编辑器内容
    useEffect(() => {
        if (editor && !editor.isEmpty) {
            savedContentRef.current = editor.getJSON();
        }
    });

    // editor 重建后恢复内容
    useEffect(() => {
        if (editor && savedContentRef.current) {
            editor.commands.setContent(savedContentRef.current);
            savedContentRef.current = null;
        }
    }, [editor]);

    useImperativeHandle(ref, () => ({
        clearContent: (emitUpdate?: boolean) => {
            if (!editor) {
                return false;
            }

            const result = editor.commands.clearContent(emitUpdate);
            if (result) {
                savedContentRef.current = null;
            }
            return result;
        },
        focus: () => {
            if (!editor) {
                return false;
            }
            return editor.commands.focus();
        },
        getJSON: () => editor?.getJSON(),
        getHTML: () => editor?.getHTML() || '',
        getText: () => editor?.getText() || '',
        setImage: (src: string, alt?: string) => {
            if (!editor) {
                return;
            }
            editor.chain()
                .focus()
                .insertContent([
                    {
                        type: 'image',
                        attrs: {
                            src,
                            alt
                        },
                    },
                    {
                        type: 'paragraph',
                    },
                ])
                .run();
        },
        isEmpty: () => Boolean(editor?.isEmpty),
        insertContent: (value, options) => {
            if (typeof value === 'string') {
                value = value.replaceAll(/\n/g, '<br />');
            }

            return editor?.commands.insertContent(value, options) || false;
        },
        editor
    }), [editor]);

    if (!editor) {
        return null;
    }

    return (
        <>
            <EditorContent
                className={classes(className, {'show-placeholder': showPlaceholder})}
                editor={editor}
                spellCheck={false}
                placeholder={placeholder}
                onDoubleClick={(e) => {
                    const elm = e.target as HTMLElement;
                    if (elm instanceof HTMLImageElement) {
                        showMediaPreviewWindow(elm.src);
                    }
                }}
            />
            {slotAfter}
        </>
    );
});

export default memo(TiptapEditor);
