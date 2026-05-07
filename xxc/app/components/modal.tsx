import type {DisplayLayerProps} from '~/app/components/display-layer';
import type {ReactNodeLike} from 'prop-types';
import Display from './display';
import {classes} from '../utils/html-helper';
import Icon from './icon';
import fuid from '../utils/fuid';
import InputControl, {type InputControlProps} from './input-control';

/**
 * 检查应用运行的操作系统类型是否是 macOS
 * @private
 * @constant
 */
const isMacOS = window.navigator.userAgent.includes('Mac OS');

/**
 * 默认按钮类名
 * @private
 */
const DEFAULT_CLASS_NAMES = {
    submit: 'bg-primary',
    primary: 'bg-primary',
    secondary: 'danger x-outline',
    cancel: 'gray x-outline'
};

let lang: LangHelper;

/**
 * 设置语言文本访问对象
 * @param langObj 语言文本访问对象
 */
export const setLangObj = (langObj: LangHelper) => {
    lang = langObj;
};

type Action = {
    type: 'submit' | 'primary' | 'secondary' | 'cancel';
    id?: string;
    order?: number;
    label?: string;
    className?: string;
    click?: (action: Action, e: React.MouseEventHandler<HTMLButtonElement>) => boolean | Promise<boolean>;
}

interface ModalProps extends DisplayLayerProps {
    title?: React.ReactNode;
    actions?: Array<Action> | string | boolean;
    onAction?: (action: Action | {type: 'submit'|'cancel'}, e?: React.MouseEventHandler<HTMLButtonElement>) => undefined | boolean | Promise<boolean>;
    onSubmit?: (action: Action, e: React.MouseEventHandler<HTMLButtonElement>) => undefined | boolean | Promise<boolean>;
    onCancel?: (action: Action, e: React.MouseEventHandler<HTMLButtonElement>) => undefined | boolean | Promise<boolean>;
    headingClassName?: string;
    closeButton?: boolean;
    headerButtons?: {id: string, iconName: string, onClick: React.MouseEventHandler}[];
    onHidden: () => void;
};

/**
 * 显示对话框
 * @param props DisplayLayer 组件属性
 * @param callback 操作完成时的回调函数
 * @returns DisplayLayer
 * @function
 */
export const showModal = (props: ModalProps = {}, callback: (...args: any[]) => void = null) => {
    props.id ??= fuid();

    let {
        className,
        actions = [{type: 'submit'}, {type: 'cancel'}],
    } = props;

    const {
        id,
        title,
        onAction,
        onSubmit,
        onCancel,
        headingClassName,
        closeButton = true,
        enableBackdropClick = true,
        headerButtons = [],
        footer: customFooter,
    } = props;

    className = classes('modal layer -rounded', className || '');

    if (actions === true) {
        actions = [{type: 'submit'}, {type: 'cancel'}];
    }
    if (typeof actions === 'string') {
        if (actions === 'submit') {
            actions = [{type: 'submit'}];
        }
        if (actions === 'cancel') {
            actions = [{type: 'cancel'}];
        }
    }

    const typeWeightMap = {
        submit: 9000,
        primary: 8000,
        secondary: 7000,
        cancel: -9000,
    };

    let footer = null;
    if (actions?.length && typeof actions === 'object') {
        actions = actions.map((act, idx) => {
            act.order ??= idx + typeWeightMap[act.type];
            if (act.type) {
                act.className ??= DEFAULT_CLASS_NAMES[act.type];
                act.label ??= act.type === 'submit'
                    ? lang.string('common.confirm')
                    : act.type === 'cancel'
                        ? lang.string('common.cancel')
                        : act.type.toUpperCase();
            }
            return act;
        });

        const orderFactor = isMacOS ? 1 : -1;
        actions.sort((act1, act2) => (act1.order - act2.order) * orderFactor);

        const handleActionClick = async (action:Action, e: React.MouseEventHandler<HTMLButtonElement>) => {
            const actionResult = [];
            if (onAction) {
                actionResult.push(onAction(action, e));
            }
            if (onSubmit && action.type === 'submit') {
                actionResult.push(onSubmit(action, e));
            }
            if (onCancel && action.type === 'cancel') {
                actionResult.push(onCancel(action, e));
            }
            if (action.click) {
                actionResult.push(action.click(action, e));
            }
            const finalResult = (await Promise.all(actionResult)).reduce((prev, curr) => prev && curr, true);
            if (finalResult !== false) {
                Display.hide(id);
            }
        };

        footer = (
            <footer className="footer toolbar -relative">
                {customFooter}
                {
                    actions.map((action, actionIndex) => (
                        <button
                            className={classes('btn -rounded', action.className, action.type ? `action-${action.type}` : '')}
                            type="button"
                            onClick={handleActionClick.bind(null, action)}
                            key={action.id || actionIndex}
                            title={action.label}
                        >{action.label}
                        </button>
                    ))
                }
            </footer>
        );
    }

    const header = (title || closeButton)
        ? (
            <header className={classes('heading', headingClassName)}>
                <div className="title -font-bold">{title}</div>
                {(closeButton || headerButtons.length) ? (
                    <nav
                        style={{overflow: 'visible'}}
                        title={lang.string('common.close')}
                        className="nav"
                    >
                        {headerButtons.map((btn) => (<a key={btn.id} className="close -rounded" onClick={btn.onClick}><Icon name={btn.iconName} /></a>))}
                        {closeButton && (<a className="close -rounded" onClick={() => Display.remove(id)}><Icon name="close" /></a>)}
                    </nav>
                ) : null}
            </header>
        )
        : null;

    props = {
        ...props, className, header, footer, closeButton, plugName: 'modal', enableBackdropClick
    };


    const displayProps = (({title, closeButton, actions, onSubmit, onCancel, headingClassName, headerButtons, ...others}) => {
        others.className = className;
        others.header = header;
        others.footer = footer;
        others.enableBackdropClick = enableBackdropClick;
        others.plugName = 'modal';
        return others;
    })(props);

    return Display.show(displayProps, callback);
};

/**
 * 显示警告对话框
 * @param content 对话框内容
 * @param props DisplayLayer 组件属性
 * @param callback 操作完成时的回调函数
 * @returns DisplayLayer
 * @function
 */
export const showAlert = (content: ReactNodeLike, props?: ModalProps, callback?: (...args: any[]) => void) => showModal({
    modal: true,
    content,
    actions: 'submit',
    ...props
}, callback);

/**
 * 显示确认对话框
 * @param content 对话框内容
 * @param [props] DisplayLayer 组件属性
 * @param [callback] 操作完成时的回调函数
 */
export const showConfirm = (content: ReactNodeLike, props?: ModalProps, callback?: (...args: any[]) => void) => new Promise<boolean>(resolve => {
    let resolved = false;
    showModal({
        closeButton: false,
        modal: true,
        content,
        actions: true,
        onAction: action => {
            if (!resolved) {
                resolved = true;
                resolve(action.type === 'submit');
            }
        },
        onHidden: () => {
            if (!resolved) {
                resolve(false);
            }
        },
        ...props
    }, callback);
});

/**
 * 显示询问用户输入值的对话框
 * @param title 标题
 * @param defaultValue 默认值
 * @param props DisplayLayer 组件属性
 * @param callback 操作完成时的回调函数
 * @returns 异步返回结果
 * @function
 */
export const showPrompt = (title: string, defaultValue: string, props: Omit<ModalProps, 'onSubmit'> & {inputProps?: InputControlProps, onSubmit?: (value: string) => boolean} = {}, callback: (...args: any[]) => void = null): Promise<boolean | string> => {
    const {inputProps} = props;
    const {onSubmit} = props;


    const displayProps = (({inputProps, onSubmit, ...others}) => others)(props);

    return new Promise<string>(resolve => {
        let resolved = false;
        let value = defaultValue;
        showModal({
            closeButton: false,
            modal: true,
            title,
            content: <InputControl
                autoFocus
                defaultValue={defaultValue}
                onChange={newValue => {
                    value = newValue;
                }}
                {...inputProps}
            />,
            actions: true,
            onAction: action => {
                if (action.type === 'submit') {
                    if (onSubmit && onSubmit(value) === false) {
                        return false;
                    }
                    resolved = true;
                    resolve(value);
                }
            },
            onHidden: () => {
                if (!resolved) {
                    resolve(defaultValue);
                }
            },
            ...displayProps
        }, callback);
    });
};

export default {
    show: showModal,
    alert: showAlert,
    confirm: showConfirm,
    prompt: showPrompt,
    hide: Display.hide,
    remove: Display.remove
};
