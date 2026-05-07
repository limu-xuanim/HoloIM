import {Component, type ReactNode} from 'react';
import Button from '~/app/components/button';
import {classes} from '~/app/utils/html-helper';
import platform from '~/app/platform';
import EmojiIcon from './emoji-icon';

type ErrorBoundaryProps = {
    children?: ReactNode;
    fallbackComponent?: ReactNode;
}

type ErrorBoundaryState = {
    hasError: boolean;
    showError: boolean;
    isHoverOverErrorInfo: boolean;
};

const reloadXXC = () => {
    if (platform.isBrowser) {
        window.location.reload();
    } else {
        platform.call('ui.reloadWindow');
    }
};

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    private readonly componentName?: string;

    static getDerivedStateFromError() {
        return {hasError: true};
    }

    constructor(props: Readonly<ErrorBoundaryProps>) {
        super(props);
        this.state = {hasError: false, showError: false, isHoverOverErrorInfo: false};

        const {children} = props;
        if (typeof children === 'object' || typeof children === 'function') {
            if ('type' in children && typeof children.type !== 'string') {
                if (typeof children.type.name === 'string') {
                    this.componentName = children.type.name;
                } else if ('type' in children.type
                    && (typeof children.type.type === 'object' || typeof children.type.type === 'function')
                    && 'name' in children.type.type
                    && typeof children.type.type.name === 'string'
                ) {
                    // 上面的判断是为了兼容 React.memo 嵌套的情况
                    this.componentName = children.type.type.name;
                }
            }
        }
    }

    override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        this.error = error;
        this.errorInfo = errorInfo;
        // 在这里可以对错误做更多的处理，例如记录到日志等
        if (DEBUG) {
            console.collapse('╳ ErrorBoundary ╳', 'redBgDark', this.componentName ?? '', 'redPale');
        } else {
            console.group('╳ ErrorBoundary ╳', this.componentName);
        }
        console.trace('error', error);
        console.trace('errorInfo', errorInfo);
        console.groupEnd();
    }

    private error: Error = null;

    private errorInfo: React.ErrorInfo = null;

    handleShowError = () => {
        this.setState((prevState) => ({showError: !prevState.showError}));
    };

    copyErrorInfoToClipboard = () => {
        const errorInfo = [
            'Error:',
            this.error?.message,
            'StackInfo:',
            this.errorInfo?.componentStack,
        ].join('\n');
        navigator.clipboard.writeText(errorInfo);
    };

    override render() {
        if (this.state.hasError) {
            if (this.props.fallbackComponent) {
                return this.props.fallbackComponent;
            }
            return (
                <div className="-w-full -h-full -bg-red-50 -p-2 -flex -flex-col -gap-2 -flex-nowrap -items-center">
                    <EmojiIcon name=":cry:" />
                    <div className="-text-sm -font-medium">Something went wrong</div>
                    {this.componentName ? <p className="text-2xs">Error occurred in component {this.componentName}</p> : null}
                    <div className="-flex -justify-between -w-full -gap-3">
                        <div className="btn -bg-gray-200 -rounded" onClick={this.handleShowError}>Learn More</div>
                        <div className="btn -text-white -bg-red-400 -rounded" onClick={reloadXXC}>Reload</div>
                    </div>
                    {/* TODO: 默认展开错误信息 */}
                    {this.state.showError ? (
                        <div
                            className="-relative -p-2"
                            style={{borderRadius: '8px 8px', backgroundColor: 'rgba(0, 0, 0, 0.05)', border: '1px solid rgba(0, 0, 0, 0.08)', boxShadow: 'rgba(0, 0, 0, 0.05) 0 1px 4px, rgba(0, 0, 0, 0.08) 0 1px 2px'}}
                            onMouseEnter={() => {this.setState({isHoverOverErrorInfo: true});}}
                            onMouseLeave={() => {this.setState({isHoverOverErrorInfo: false});}}
                        >
                            <Button
                                className={classes('-absolute -top-2 -right-2 btn -rounded -bg-gray-50 -text-gray-500', {hidden: !this.state.isHoverOverErrorInfo})}
                                onClick={this.copyErrorInfoToClipboard}
                            >Copy
                            </Button>
                            <div className="text-2xs">{this.error?.message}</div>
                            <div className="text-2xs -whitespace-pre-line">{this.errorInfo?.componentStack}</div>
                        </div>
                    ) : null}
                </div>
            );
        }
        return this.props.children;
    }
}
