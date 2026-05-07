import {useState} from 'react';

type ImageProps = {src: string;}
    & React.HTMLAttributes<HTMLImageElement>
    & Partial<{
        alt: string;
        children: JSX.Element;
    }>;

/**
 * Image 组件 ，显示一个图片元素
 * @example
 * <Image src="test.png" alt="test.png">图片加载失败时显示的内容</Image>
 */
export default function Image(props: ImageProps) {
    const [error, setError] = useState(false);
    const {
        alt,
        src,
        // undefined 不可以作为组件的渲染结果，因此要手动设置为 null
        children = null,
        ...other
    } = props;

    /**
     * 处理图片加载失败事件
     * @param e 事件对象
     */
    const handleImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        if (DEBUG) {
            console.warn(`Cannot load image ${src}`, e);
        }
        setError(true);
    };

    if (error) {
        return children;
    }

    return (
        <img
            src={src}
            alt={alt}
            onError={handleImgError}
            draggable={false}
            {...other}
        />
    );
}
