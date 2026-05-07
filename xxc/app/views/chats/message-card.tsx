import React from 'react';
import Avatar from '../../components/avatar';
import {classes} from '../../utils/html-helper';
import Icon from '../../components/icon';
import Image from '../../components/image';
import WebView from '../common/webview';
import type {CardMeta} from '~/app/core/ui/url-meta';
import {renderIf} from '~/app/utils/render';

export type MessageCardProps = React.HTMLAttributes<HTMLDivElement>
    & {
        card: CardMeta & Partial<{
            content: {
                originSrc: string;
                src: string;
                style: React.CSSProperties;
                type: 'auto' | 'webview';
            };
            webviewContent: boolean | null;
        }>;
    }
    & Partial<{
        baseClassName: string;
        className: string;
        header: React.ReactNode;
        fluidWidth: number | (() => number);
    }>;

/**
 * MessageCard 组件 ，显示消息卡片界面
 */
export default function MessageCard(props: MessageCardProps) {
    const {
        card,
        className,
        baseClassName,
        header,
        children,
        fluidWidth,
        style,
        ...other
    } = props;

    const {image, title, subtitle, content, icon, url, webviewContent, contentType, contentUrl} = card;

    let topView: JSX.Element | null = null;
    if (contentUrl) {
        if (contentType === 'image') {
            topView = <Image src={contentUrl} alt={contentUrl} />;
        } else if (contentType === 'video') {
            topView = (
                <video controls>
                    <source src={contentUrl} />
                </video>
            );
        } else if (contentType === 'audio') {
            topView = (
                <audio controls className="fluid">
                    <source src={contentUrl} />
                </audio>
            );
        }
    }

    const isTitleIsUrl = title === url;
    const titleView = title ? (React.isValidElement(title) ? title : (isTitleIsUrl ? <a className="title -break-all" href={url}>{url}</a> : <div className="title -break-all">{title}</div>)) : null;
    const subTitleView = subtitle ? (React.isValidElement(subtitle) ? subtitle : <div className="subtitle">{subtitle}</div>) : null;

    let previewImageView: JSX.Element | null = null;
    if (image) {
        previewImageView = React.isValidElement(image) ? image : <Image className="img" src={image} alt={image} />;
    } else if (icon) {
        const imageErrorView = <Icon name="earth" className="muted icon-2x" />;
        previewImageView = <Avatar auto={icon} imageErrorView={imageErrorView} />;
    }

    let contentView: JSX.Element | null = null;
    if (content) {
        if (React.isValidElement(content)) {
            contentView = content;
        } else if (webviewContent) {
            const {originSrc, ...others} = content;
            contentView = <WebView fluidWidth={fluidWidth} className="-relative" {...others} />;
        }
    }

    return (
        <div
            className={classes('app-message-card', baseClassName, className, {
                'only-title': !subTitleView
            })}
            data-url={url}
            style={style}
            {...other}
        >
            {topView}
            {renderIf(header || titleView || previewImageView || subTitleView) && (
                <header className="row single">
                    <div className="cell -flex-auto">
                        <div className="tile">
                            {titleView}
                            {subTitleView}
                        </div>
                    </div>
                    {renderIf(previewImageView) && <div className="cell !-flex-none"><div className="tile center-content">{previewImageView}</div></div>}
                    {header}
                </header>
            )}
            {contentView}
            {renderIf(url && !isTitleIsUrl) && <footer><a href={url}>{url}</a></footer>}
            {children}
        </div>
    );
}
