import {type ForwardedRef, forwardRef, isValidElement, useCallback, useEffect, useImperativeHandle, useRef, useState} from 'react';
import {classes} from '~/app/utils/html-helper';
import fuid from '~/app/utils/fuid';
import {onUpdateViewStyle, requestUpdateViewStyle} from './update-view';
import events from '~/app/core/events';
import {formatString} from '~/app/utils/string-helper';
import Spinner from '~/app/components/spinner';
import Config from '~/app/config';
import type {DidFailLoadEvent, PageTitleUpdatedEvent, WebviewTag, WillNavigateEvent } from 'electron';
import {isNotEmptyArray} from '~/app/utils/check-empty';
import {renderIf} from '~/app/utils/render';
import useLang from './use-lang';

/**
 * WebView 中的错误码
 * https://source.chromium.org/chromium/chromium/src/+/master:net/base/net_error_list.h
 */
const ERR_CODES = {
    '-1': 'IO_PENDING',
    '-2': 'FAILED',
    '-3': 'ABORTED',
    '-4': 'INVALID_ARGUMENT',
    '-5': 'INVALID_HANDLE',
    '-6': 'FILE_NOT_FOUND',
    '-7': 'TIMED_OUT',
    '-8': 'FILE_TOO_BIG',
    '-9': 'UNEXPECTED',
    '-10': 'ACCESS_DENIED',
    '-11': 'NOT_IMPLEMENTED',
    '-12': 'INSUFFICIENT_RESOURCES',
    '-13': 'OUT_OF_MEMORY',
    '-14': 'UPLOAD_FILE_CHANGED',
    '-15': 'SOCKET_NOT_CONNECTED',
    '-16': 'FILE_EXISTS',
    '-17': 'FILE_PATH_TOO_LONG',
    '-18': 'FILE_NO_SPACE',
    '-19': 'FILE_VIRUS_INFECTED',
    '-20': 'BLOCKED_BY_CLIENT',
    '-21': 'NETWORK_CHANGED',
    '-22': 'BLOCKED_BY_ADMINISTRATOR',
    '-23': 'SOCKET_IS_CONNECTED',
    '-24': 'BLOCKED_ENROLLMENT_CHECK_PENDING',
    '-25': 'UPLOAD_STREAM_REWIND_NOT_SUPPORTED',
    '-26': 'CONTEXT_SHUT_DOWN',
    '-27': 'BLOCKED_BY_RESPONSE',
    '-29': 'CLEARTEXT_NOT_PERMITTED',
    '-30': 'BLOCKED_BY_CSP',
    '-31': 'H2_OR_QUIC_REQUIRED',
    '-100': 'CONNECTION_CLOSED',
    '-101': 'CONNECTION_RESET',
    '-102': 'CONNECTION_REFUSED',
    '-103': 'CONNECTION_ABORTED',
    '-104': 'CONNECTION_FAILED',
    '-105': 'NAME_NOT_RESOLVED',
    '-106': 'INTERNET_DISCONNECTED',
    '-107': 'SSL_PROTOCOL_ERROR',
    '-108': 'ADDRESS_INVALID',
    '-109': 'ADDRESS_UNREACHABLE',
    '-110': 'SSL_CLIENT_AUTH_CERT_NEEDED',
    '-111': 'TUNNEL_CONNECTION_FAILED',
    '-112': 'NO_SSL_VERSIONS_ENABLED',
    '-113': 'SSL_VERSION_OR_CIPHER_MISMATCH',
    '-114': 'SSL_RENEGOTIATION_REQUESTED',
    '-115': 'PROXY_AUTH_UNSUPPORTED',
    '-116': 'CERT_ERROR_IN_SSL_RENEGOTIATION',
    '-117': 'BAD_SSL_CLIENT_AUTH_CERT',
    '-118': 'CONNECTION_TIMED_OUT',
    '-119': 'HOST_RESOLVER_QUEUE_TOO_LARGE',
    '-120': 'SOCKS_CONNECTION_FAILED',
    '-121': 'SOCKS_CONNECTION_HOST_UNREACHABLE',
    '-122': 'ALPN_NEGOTIATION_FAILED',
    '-123': 'SSL_NO_RENEGOTIATION',
    '-124': 'WINSOCK_UNEXPECTED_WRITTEN_BYTES',
    '-125': 'SSL_DECOMPRESSION_FAILURE_ALERT',
    '-126': 'SSL_BAD_RECORD_MAC_ALERT',
    '-127': 'PROXY_AUTH_REQUESTED',
    '-130': 'PROXY_CONNECTION_FAILED',
    '-131': 'MANDATORY_PROXY_CONFIGURATION_FAILED',
    '-133': 'PRECONNECT_MAX_SOCKET_LIMIT',
    '-134': 'SSL_CLIENT_AUTH_PRIVATE_KEY_ACCESS_DENIED',
    '-135': 'SSL_CLIENT_AUTH_CERT_NO_PRIVATE_KEY',
    '-136': 'PROXY_CERTIFICATE_INVALID',
    '-137': 'NAME_RESOLUTION_FAILED',
    '-138': 'NETWORK_ACCESS_DENIED',
    '-139': 'TEMPORARILY_THROTTLED',
    '-140': 'HTTPS_PROXY_TUNNEL_RESPONSE_REDIRECT',
    '-141': 'SSL_CLIENT_AUTH_SIGNATURE_FAILED',
    '-142': 'MSG_TOO_BIG',
    '-145': 'WS_PROTOCOL_ERROR',
    '-147': 'ADDRESS_IN_USE',
    '-148': 'SSL_HANDSHAKE_NOT_COMPLETED',
    '-149': 'SSL_BAD_PEER_PUBLIC_KEY',
    '-150': 'SSL_PINNED_KEY_NOT_IN_CERT_CHAIN',
    '-151': 'CLIENT_AUTH_CERT_TYPE_UNSUPPORTED',
    '-153': 'SSL_DECRYPT_ERROR_ALERT',
    '-154': 'WS_THROTTLE_QUEUE_TOO_LARGE',
    '-156': 'SSL_SERVER_CERT_CHANGED',
    '-159': 'SSL_UNRECOGNIZED_NAME_ALERT',
    '-160': 'SOCKET_SET_RECEIVE_BUFFER_SIZE_ERROR',
    '-161': 'SOCKET_SET_SEND_BUFFER_SIZE_ERROR',
    '-162': 'SOCKET_RECEIVE_BUFFER_SIZE_UNCHANGEABLE',
    '-163': 'SOCKET_SEND_BUFFER_SIZE_UNCHANGEABLE',
    '-164': 'SSL_CLIENT_AUTH_CERT_BAD_FORMAT',
    '-166': 'ICANN_NAME_COLLISION',
    '-167': 'SSL_SERVER_CERT_BAD_FORMAT',
    '-168': 'CT_STH_PARSING_FAILED',
    '-169': 'CT_STH_INCOMPLETE',
    '-170': 'UNABLE_TO_REUSE_CONNECTION_FOR_PROXY_AUTH',
    '-171': 'CT_CONSISTENCY_PROOF_PARSING_FAILED',
    '-172': 'SSL_OBSOLETE_CIPHER',
    '-173': 'WS_UPGRADE',
    '-174': 'READ_IF_READY_NOT_IMPLEMENTED',
    '-176': 'NO_BUFFER_SPACE',
    '-177': 'SSL_CLIENT_AUTH_NO_COMMON_ALGORITHMS',
    '-178': 'EARLY_DATA_REJECTED',
    '-179': 'WRONG_VERSION_ON_EARLY_DATA',
    '-180': 'TLS13_DOWNGRADE_DETECTED',
    '-181': 'SSL_KEY_USAGE_INCOMPATIBLE',
    '-200': 'CERT_COMMON_NAME_INVALID',
    '-201': 'CERT_DATE_INVALID',
    '-202': 'CERT_AUTHORITY_INVALID',
    '-203': 'CERT_CONTAINS_ERRORS',
    '-204': 'CERT_NO_REVOCATION_MECHANISM',
    '-205': 'CERT_UNABLE_TO_CHECK_REVOCATION',
    '-206': 'CERT_REVOKED',
    '-207': 'CERT_INVALID',
    '-208': 'CERT_WEAK_SIGNATURE_ALGORITHM',
    '-210': 'CERT_NON_UNIQUE_NAME',
    '-211': 'CERT_WEAK_KEY',
    '-212': 'CERT_NAME_CONSTRAINT_VIOLATION',
    '-213': 'CERT_VALIDITY_TOO_LONG',
    '-214': 'CERTIFICATE_TRANSPARENCY_REQUIRED',
    '-215': 'CERT_SYMANTEC_LEGACY',
    '-217': 'CERT_KNOWN_INTERCEPTION_BLOCKED',
    '-218': 'SSL_OBSOLETE_VERSION',
    '-219': 'CERT_END',
    '-300': 'INVALID_URL',
    '-301': 'DISALLOWED_URL_SCHEME',
    '-302': 'UNKNOWN_URL_SCHEME',
    '-303': 'INVALID_REDIRECT',
    '-310': 'TOO_MANY_REDIRECTS',
    '-311': 'UNSAFE_REDIRECT',
    '-312': 'UNSAFE_PORT',
    '-320': 'INVALID_RESPONSE',
    '-321': 'INVALID_CHUNKED_ENCODING',
    '-322': 'METHOD_NOT_SUPPORTED',
    '-323': 'UNEXPECTED_PROXY_AUTH',
    '-324': 'EMPTY_RESPONSE',
    '-325': 'RESPONSE_HEADERS_TOO_BIG',
    '-327': 'PAC_SCRIPT_FAILED',
    '-328': 'REQUEST_RANGE_NOT_SATISFIABLE',
    '-329': 'MALFORMED_IDENTITY',
    '-330': 'CONTENT_DECODING_FAILED',
    '-331': 'NETWORK_IO_SUSPENDED',
    '-332': 'SYN_REPLY_NOT_RECEIVED',
    '-333': 'ENCODING_CONVERSION_FAILED',
    '-334': 'UNRECOGNIZED_FTP_DIRECTORY_LISTING_FORMAT',
    '-336': 'NO_SUPPORTED_PROXIES',
    '-337': 'HTTP2_PROTOCOL_ERROR',
    '-338': 'INVALID_AUTH_CREDENTIALS',
    '-339': 'UNSUPPORTED_AUTH_SCHEME',
    '-340': 'ENCODING_DETECTION_FAILED',
    '-341': 'MISSING_AUTH_CREDENTIALS',
    '-342': 'UNEXPECTED_SECURITY_LIBRARY_STATUS',
    '-343': 'MISCONFIGURED_AUTH_ENVIRONMENT',
    '-344': 'UNDOCUMENTED_SECURITY_LIBRARY_STATUS',
    '-345': 'RESPONSE_BODY_TOO_BIG_TO_DRAIN',
    '-346': 'RESPONSE_HEADERS_MULTIPLE_CONTENT_LENGTH',
    '-347': 'INCOMPLETE_HTTP2_HEADERS',
    '-348': 'PAC_NOT_IN_DHCP',
    '-349': 'RESPONSE_HEADERS_MULTIPLE_CONTENT_DISPOSITION',
    '-350': 'RESPONSE_HEADERS_MULTIPLE_LOCATION',
    '-351': 'HTTP2_SERVER_REFUSED_STREAM',
    '-352': 'HTTP2_PING_FAILED',
    '-354': 'CONTENT_LENGTH_MISMATCH',
    '-355': 'INCOMPLETE_CHUNKED_ENCODING',
    '-356': 'QUIC_PROTOCOL_ERROR',
    '-357': 'RESPONSE_HEADERS_TRUNCATED',
    '-358': 'QUIC_HANDSHAKE_FAILED',
    '-360': 'HTTP2_INADEQUATE_TRANSPORT_SECURITY',
    '-361': 'HTTP2_FLOW_CONTROL_ERROR',
    '-362': 'HTTP2_FRAME_SIZE_ERROR',
    '-363': 'HTTP2_COMPRESSION_ERROR',
    '-364': 'PROXY_AUTH_REQUESTED_WITH_NO_CONNECTION',
    '-365': 'HTTP_1_1_REQUIRED',
    '-366': 'PROXY_HTTP_1_1_REQUIRED',
    '-367': 'PAC_SCRIPT_TERMINATED',
    '-370': 'INVALID_HTTP_RESPONSE',
    '-371': 'CONTENT_DECODING_INIT_FAILED',
    '-372': 'HTTP2_RST_STREAM_NO_ERROR_RECEIVED',
    '-373': 'HTTP2_PUSHED_STREAM_NOT_AVAILABLE',
    '-374': 'HTTP2_CLAIMED_PUSHED_STREAM_RESET_BY_SERVER',
    '-375': 'TOO_MANY_RETRIES',
    '-376': 'HTTP2_STREAM_CLOSED',
    '-377': 'HTTP2_CLIENT_REFUSED_STREAM',
    '-378': 'HTTP2_PUSHED_RESPONSE_DOES_NOT_MATCH',
    '-379': 'HTTP_RESPONSE_CODE_FAILURE',
    '-380': 'QUIC_CERT_ROOT_NOT_KNOWN',
    '-381': 'QUIC_GOAWAY_REQUEST_CAN_BE_RETRIED',
    '-400': 'CACHE_MISS',
    '-401': 'CACHE_READ_FAILURE',
    '-402': 'CACHE_WRITE_FAILURE',
    '-403': 'CACHE_OPERATION_NOT_SUPPORTED',
    '-404': 'CACHE_OPEN_FAILURE',
    '-405': 'CACHE_CREATE_FAILURE',
    '-406': 'CACHE_RACE',
    '-407': 'CACHE_CHECKSUM_READ_FAILURE',
    '-408': 'CACHE_CHECKSUM_MISMATCH',
    '-409': 'CACHE_LOCK_TIMEOUT',
    '-410': 'CACHE_AUTH_FAILURE_AFTER_READ',
    '-411': 'CACHE_ENTRY_NOT_SUITABLE',
    '-412': 'CACHE_DOOM_FAILURE',
    '-413': 'CACHE_OPEN_OR_CREATE_FAILURE',
    '-501': 'INSECURE_RESPONSE',
    '-502': 'NO_PRIVATE_KEY_FOR_CERT',
    '-503': 'ADD_USER_CERT_FAILED',
    '-504': 'INVALID_SIGNED_EXCHANGE',
    '-505': 'INVALID_WEB_BUNDLE',
    '-506': 'TRUST_TOKEN_OPERATION_FAILED',
    '-507': 'TRUST_TOKEN_OPERATION_SUCCESS_WITHOUT_SENDING_REQUEST',
    '-601': 'FTP_FAILED',
    '-602': 'FTP_SERVICE_UNAVAILABLE',
    '-603': 'FTP_TRANSFER_ABORTED',
    '-604': 'FTP_FILE_BUSY',
    '-605': 'FTP_SYNTAX_ERROR',
    '-606': 'FTP_COMMAND_NOT_SUPPORTED',
    '-607': 'FTP_BAD_COMMAND_SEQUENCE',
    '-701': 'PKCS12_IMPORT_BAD_PASSWORD',
    '-702': 'PKCS12_IMPORT_FAILED',
    '-703': 'IMPORT_CA_CERT_NOT_CA',
    '-704': 'IMPORT_CERT_ALREADY_EXISTS',
    '-705': 'IMPORT_CA_CERT_FAILED',
    '-706': 'IMPORT_SERVER_CERT_FAILED',
    '-707': 'PKCS12_IMPORT_INVALID_MAC',
    '-708': 'PKCS12_IMPORT_INVALID_FILE',
    '-709': 'PKCS12_IMPORT_UNSUPPORTED',
    '-710': 'KEY_GENERATION_FAILED',
    '-712': 'PRIVATE_KEY_EXPORT_FAILED',
    '-713': 'SELF_SIGNED_CERT_GENERATION_FAILED',
    '-714': 'CERT_DATABASE_CHANGED',
    '-800': 'DNS_MALFORMED_RESPONSE',
    '-801': 'DNS_SERVER_REQUIRES_TCP',
    '-802': 'DNS_SERVER_FAILED',
    '-803': 'DNS_TIMED_OUT',
    '-804': 'DNS_CACHE_MISS',
    '-805': 'DNS_SEARCH_EMPTY',
    '-806': 'DNS_SORT_ERROR',
    '-808': 'DNS_SECURE_RESOLVER_HOSTNAME_RESOLUTION_FAILED',
} as const;

/**
 * 默认注入 JS 代码
 */
const defaultInjectJS = [
    "window.getXXCViewID = function(){return '{id}';};",
    'window.getXXCCardFullWidth = function(){return {cardWidth};};',
    'window.callXXCCommand = function(command, options, ...params) {',
        "var url = command + '/';",
        'if (typeof options === "string") url += [options, ...params].map(x => encodeURIComponent(x)).join("/");',
        'else if (Array.isArray(options)) url += options.map(x => encodeURIComponent(x)).join("/");',
        'else if (typeof options === "object") {',
            "url += '?';",
            'for (const name in options) {',
                'if (options.hasOwnProperty(name)) {',
                    "if (url[url.length - 1] !== '?') url += '&';",
                    "url += name + '=' + encodeURIComponent(options[name]);",
                '}',
            '}',
        '}',
        "window.open('xxc:' + url, '_blank');",
    '};',
    'window.setXXCViewStyle = function(style, options) {',
        "if (style && typeof style !== 'string') style = JSON.stringify(style);",
        "var commandLine = 'updateViewStyle/{id}'",
        "if (style !== undefined) commandLine += '/' + encodeURIComponent(style);",
        'window.callXXCCommand(commandLine, options);',
    '};',
    'window.showXXCView = function(show) {if(show === undefined) show = true; setXXCViewStyle(null, {show: !!show})};',
    'window.adjustXXCViewHeight = function(height, onlyIncrease) {',
        'height = height || document.body.clientHeight;',
        'if (onlyIncrease && window.lastXXCViewHeight && height < window.lastXXCViewHeight) return;',
        'window.lastXXCViewHeight = height;',
        'window.setXXCViewStyle({height: height});',
        'return height;',
    '};',
    'if ({autoHeight}) window.adjustXXCViewHeight();',
    'window.dispatchEvent(new Event("xuan-ready"));',
    'window.xuanReady = true;',
].join('\n');

type WebviewProps = {src: string;}
    & Partial<{
        className: string,
        insertCss: string;
        executeJavaScript: string | {code: string, userGesture?: boolean};
        injectForm: Record<string, string>;
        injectData: object;
        nodeintegration: boolean;
        hideBeforeDOMReady: boolean;
        style: React.CSSProperties;
        modalId: string;
        fluidWidth: number | (() => number);
        showCondition: 'immediately' | 'domReady' | 'manual';
        loadingContent: React.ReactNode;
        maxLoadingTime: number;
        onLoadingChange: (loading: boolean, errorCode?: number, errorDescription?: string, validatedURL?: string) => void;
        onPageTitleUpdated: (title: string, explicitSet: boolean) => void;
        onExecuteJavaScript: () => void;
        onNavigate: (url: string, event: Event) => void;
        onDomReady: (webview: WebviewTag) => void;
    }>;

export type WebviewRef = {
    webview: Electron.WebviewTag | null;
    reloadWebview: (ignoringCache?: boolean) => void;
};

/**
 * Webview 组件 ，显示 Webview 界面
 */
export default forwardRef(function WebView(props: WebviewProps, ref: ForwardedRef<WebviewRef>) {
    const {
        src,
        className,
        style,
        hideBeforeDOMReady = true,
        loadingContent,
        nodeintegration = false,
        showCondition = 'immediately',
        maxLoadingTime = 10 * 1000,
        modalId,
        onLoadingChange,
        onPageTitleUpdated,
        onDomReady,
        fluidWidth,
        insertCss,
        executeJavaScript,
        onExecuteJavaScript,
        injectData,
        injectForm,
        onNavigate,
    } = props;

    if (!src) {
        throw new Error('The src of the webview component cannot be empty');
    }

    const [errorCode, setErrorCode] = useState<keyof typeof ERR_CODES | null>(null);
    const [errorDescription, setErrorDescription] = useState<string | null>(null);
    const [domReady, setDomReady] = useState(false);
    const [extraStyle, setExtraStyle] = useState<React.CSSProperties>({});
    const [alertMessages, setAlertMessages] = useState<string[]>([]);
    const [loading, setLoading] = useState(showCondition !== 'immediately');
    const [Lang] = useLang();

    const webviewIDRef = useRef(fuid());
    const webviewRef = useRef<Electron.WebviewTag | null>(null);
    const pageTitleRef = useRef('');

    /**
     * 处理开始加载事件
     */
    const handleLoadingStart = useCallback(() => {
        onLoadingChange?.(true);
        setErrorCode(null);
        setErrorDescription(null);
    }, [onLoadingChange]);

    /**
     * 处理停止加载事件
     */
    const handleLoadingStop = useCallback(() => {
        onLoadingChange?.(false);
        setDomReady(true);
    }, [onLoadingChange]);

    /**
     * 处理页面标题变更事件
     */
    const handlePageTitleChange = useCallback((e: PageTitleUpdatedEvent) => {
        pageTitleRef.current = e.title;
        onPageTitleUpdated?.(e.title, e.explicitSet);
    }, [onPageTitleUpdated]);

    /**
     * 处理加载失败事件
     */
    const handleLoadFail = useCallback((e: DidFailLoadEvent) => {
        const {errorCode, errorDescription, validatedURL} = e;

        // 处理页面跳转时如果之前有请求正在进行，跳转导致请求关闭，直接报 ERR_ABORTED 的问题
        // 目前没有好办法，先 return
        // https://github.com/electron/electron/issues/17526
        if (errorCode === -3) {
            return;
        }

        onLoadingChange?.(false, errorCode, errorDescription, validatedURL);
        setErrorCode(String(errorCode) as keyof typeof ERR_CODES);
        setErrorDescription(errorDescription);
        setDomReady(true);

        if (DEBUG) {
            console.error('Cannot load webview', e);
        }
    }, [onLoadingChange]);

    /**
     * 处理 Dom 加载完毕事件
     */
    const handleDomReady = useCallback(() => {
        const webview = webviewRef.current;
        if (!webview) {
            return;
        }

        if (insertCss) {
            webview.insertCSS(insertCss);
            if (DEBUG) {
                console.log('Webview.insertCSS', insertCss);
            }
        }
        // TODO: 如果URL配置错误，同时URL存在可以正常打开，但不是目标页面，此时执行 executeJavaScript 会有渲染进程崩溃的风险
        webview.executeJavaScript(formatString(defaultInjectJS, {
            id: webviewIDRef.current,
            autoHeight: Boolean(style && style.height === 'auto'),
            cardWidth: typeof fluidWidth === 'function' ? fluidWidth() : (fluidWidth || 0)
        }) + (injectData ? `\nwindow.getXXCInjectData = function() {return ${JSON.stringify(injectData)};}` : ''), false);

        if (executeJavaScript) {
            let code: string;
            let userGesture = false;
            if (typeof executeJavaScript === 'object') {
                ({code, userGesture = false} = executeJavaScript);
            } else {
                code = executeJavaScript;
            }
            webview.executeJavaScript(code, userGesture).then(() => {
                if (typeof onExecuteJavaScript === 'function') {
                    onExecuteJavaScript();
                }
                if (DEBUG) {
                    console.log('Webview.executeJavaScript', {code, userGesture, webview});
                }
            }).catch(error => {
                if (DEBUG) {
                    console.log('Webview.executeJavaScript with error', {
                        code, userGesture, webview, error
                    });
                }
            });
        }

        if (injectForm) {
            const injectScriptLines = ['(function(){'];
            for (const [key, value] of Object.entries(injectForm)) {
                if (key && key[0] !== '$') {

                    const elmValue = value
                        ? value.replace(/`/g, '\\`')
                        : '';
                    injectScriptLines.push(
                        `document.querySelectorAll('${key}').forEach(ele => {if(ele.tagName === 'INPUT' || ele.tagName === 'SELECT' || ele.tagName === 'TEXTAREA') {ele.value = \`${elmValue}\`;}});`
                    );
                }
            }

            for (const key of ['click', 'submit', 'focus', 'input', 'paste']) {
                const eventSelector = injectForm[`$${key}`];
                if (eventSelector) {
                    injectScriptLines.push(
                        `document.querySelectorAll('${eventSelector}').forEach(ele => {ele.dispatchEvent(new Event('${key}'));});`
                    );
                }
            }

            injectScriptLines.push('}());');
            const injectScriptCode = injectScriptLines.join('\n');
            if (DEBUG) {
                console.log('Webview.injectForm', {injectForm, injectScriptCode});
            }
            webview.executeJavaScript(injectScriptCode, false).then(() => {
                if (DEBUG) {
                    console.log('Webview.injectForm.finish', injectForm);
                }
            }).catch();
        }
        if (onDomReady) {
            onDomReady(webview);
        }

        if (loading && showCondition === 'domReady') {
            setDomReady(true);
            setLoading(false);
        } else {
            setDomReady(true);
        }

    }, [executeJavaScript, fluidWidth, injectData, injectForm, insertCss, loading, onDomReady, onExecuteJavaScript, showCondition, style]);

    /**
     * 处理导航到其他页面事件
     */
    const handleWillNavigate = useCallback((e: WillNavigateEvent) => {
        onNavigate?.(e.url, e);
    }, [onNavigate]);

    /**
     * 处理点击 alert 消息确认按钮
     */
    const handleClickAlertButton = useCallback(() => {
        setAlertMessages(x => {
            if (x.length === 0) return x;

            const [_, ...newAlertMessages] = x;
            return newAlertMessages;
        });
    }, []);

    /**
     * 重新载入 Webview
     * @param ignoringCache 是否禁用缓存
     */
    const reloadWebview = (ignoringCache = false) => {
        const webview = webviewRef.current;
        if (webview) {
            if (ignoringCache) {
                webview.reloadIgnoringCache();
            } else {
                webview.reload();
            }
        }
    }

    useImperativeHandle(ref, () => {
        return {
            webview: webviewRef.current,
            reloadWebview,
        };
    });

    useEffect(() => {
        if (!loading) {
            return;
        }

        const loadingTimerID = window.setTimeout(() => {
            setLoading(false);
        }, maxLoadingTime);

        return () => {
            window.clearTimeout(loadingTimerID);
        }
    }, [loading, maxLoadingTime]);

    useEffect(() => {
        const webview = webviewRef.current;
        if (!webview) {
            return;
        }

        webview.addEventListener('did-start-loading', handleLoadingStart);
        webview.addEventListener('did-finish-load', handleLoadingStop);
        webview.addEventListener('did-stop-loading', handleLoadingStop);
        webview.addEventListener('page-title-updated', handlePageTitleChange);
        webview.addEventListener('did-fail-load', handleLoadFail);
        webview.addEventListener('dom-ready', handleDomReady);
        webview.addEventListener('will-navigate', handleWillNavigate);

        return () => {
            webview.removeEventListener('did-start-loading', handleLoadingStart);
            webview.removeEventListener('did-finish-load', handleLoadingStop);
            webview.removeEventListener('did-stop-loading', handleLoadingStop);
            webview.removeEventListener('page-title-updated', handlePageTitleChange);
            webview.removeEventListener('did-fail-load', handleLoadFail);
            webview.removeEventListener('dom-ready', handleDomReady);
            webview.removeEventListener('will-navigate', handleWillNavigate);
        };
    }, [handleLoadingStart, handleLoadingStop, handlePageTitleChange, handleLoadFail, handleDomReady, handleWillNavigate])

    useEffect(() => {
        const webviewUpdateStyleHandler = onUpdateViewStyle(webviewIDRef.current, (extraStyle: React.CSSProperties, options: {
            show: string | boolean;
            hide: string | boolean;
        }) => {
            if (options) {
                if (loading && (options.show || options.hide === false || options.hide === 'false')) {
                    setLoading(false);
                } else if (!loading && (options.hide || options.show === false || options.show === 'false')) {
                    setLoading(true);
                }
            }
            if (modalId) {
                requestUpdateViewStyle(modalId, extraStyle);
            } else if (extraStyle) {
                setExtraStyle(extraStyle)
            }
        });

        return () => events.off(webviewUpdateStyleHandler);
    }, [loading, modalId]);

    const webviewStyle = {minHeight: '30px', ...style, ...extraStyle};
    if (webviewStyle.width && typeof webviewStyle.width === 'number') {
        webviewStyle.width = `${webviewStyle.width}px`;
    }
    if (webviewStyle.height && typeof webviewStyle.height === 'number') {
        webviewStyle.height = `${webviewStyle.height}px`;
    }

    const views: JSX.Element[] = [];
    const preloadPath = `file://${process.env.APP_ROOT}/assets/webview-preload.js`;

    views.push(
        <div
            key="webview"
            className={classes('webview fade in', className, {in: !hideBeforeDOMReady || domReady, 'is-loading': loading})}
            style={webviewStyle}
        >
            <webview
                id={webviewIDRef.current}
                src={src}
                ref={webviewRef}
                className="dock fluid-v fluid"
                nodeintegration={nodeintegration ? true : undefined}
                preload={preloadPath}
                useragent={`${navigator.userAgent} xuanxuan/${Config.pkg.name}/${Config.pkg.version}`}
                // @ts-ignore If you want to write it to the DOM, pass a string instead: allowpopups="true" or allowpopups={value.toString()}.
                allowpopups="true"
                // disable partition. @see https://github.com/electron/electron/issues/27121
                // partition={`persist:${user?.account ?? 'default'}+${user?.backendURL ?? 'default'}`}
            />
            {renderIf(isNotEmptyArray(alertMessages)) && (
                <div className="dock darken center-content">
                    <div className="-rounded layer box">
                        <p>{alertMessages[0]}</p>
                        <button type="button" className="btn -rounded primary btn-wide" onClick={handleClickAlertButton}>{Lang.string('common.confirm', 'OK')}</button>
                    </div>
                </div>
            )}
        </div>,
    );

    if (errorCode) {
        views.push(<div className="dock box gray -overflow-auto" key="errorTip" style={{top: 40}}><h1>ERROR {errorCode}: {ERR_CODES[`${errorCode}`]}</h1><h2>{src}</h2><div>{errorDescription}</div></div>);
    }

    if ((loading) && loadingContent !== false) {
        const loadingView = isValidElement(loadingContent)
            ? loadingContent
            : (
                <div className="fluid center-content column">
                    <div className="has-padding-xl"><Spinner /></div>
                    <div className="content muted small x-text-ellipsis">{loadingContent || pageTitleRef.current || src}</div>
                </div>
            );
        views.push(<div key="loading" className="webview-loading has-padding-sm center-content -flex-auto">{loadingView}</div>);
    }

    return views;
});
