/**
 * 声音文件路径
 */
let soundPath = 'media/sound/';

/**
 * 声音元素缓存
 */
const soundElements: Map<string, HTMLAudioElement> = new Map();

/**
 * 初始化 ion-sound 声音播放模块
 * @param path 声音媒体文件路径
 */
export const initSound = (path: string): void => {
    if (path) {
        soundPath = path;
    }
    if (!soundPath.endsWith('/')) {
        soundPath = `${soundPath}/`;
    }
};

/**
 * 播放声音
 * @param sound 声音名称
 */
export const playSound = (sound = 'message'): void => {
    if (typeof sound !== 'string') {
        sound = 'message';
    }
    let audioElement = soundElements.get(sound);
    if (!audioElement) {
        const elementID = `sound-${sound}`;
        audioElement = (document.getElementById(elementID) as HTMLAudioElement);
        if (!audioElement) {
            audioElement = document.createElement('audio');
            audioElement.id = elementID;

            const oggSourceElement = document.createElement('source');
            oggSourceElement.type = 'audio/ogg';
            oggSourceElement.src = `${soundPath}${sound}.ogg`;
            audioElement.appendChild(oggSourceElement);

            const mp3SourceElement = document.createElement('source');
            mp3SourceElement.type = 'audio/mpeg';
            mp3SourceElement.src = `${soundPath}${sound}.mp3`;
            audioElement.appendChild(mp3SourceElement);

            const aacSourceElement = document.createElement('source');
            aacSourceElement.type = 'audio/mp4';
            aacSourceElement.src = `${soundPath}${sound}.aac`;
            audioElement.appendChild(aacSourceElement);

            document.getElementById('sound-audios')!.appendChild(audioElement);
        }
        soundElements.set(sound, audioElement);
    }
    audioElement.play();
};

// 初始化界面上用于放置 `<audio>` 的容器元素
if (!document.getElementById('sound-audios')) {
    const containerElement = document.createElement('div');
    containerElement.id = 'sound-audios';
    containerElement.style.display = 'none';
    document.body.appendChild(containerElement);
}

export default {
    init: initSound,
    play: playSound
};
