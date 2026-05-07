import Modal from '../../components/modal';
import Lang from '../../core/lang';
import {dataURItoBlob} from '../../core/files/files-helper';
import {generateRequestURL} from '../../utils/url-helper';
import {getCurrentUser, getCurrentUserID} from '../../core/profile';
import Config from '../../config';
import Messager from '~/app/components/messager';
import {showImgCropperDialog} from '../common/cropper-dialog';
import {fetchMembersFromRemote} from '~/app/core/members/members-store';
import Icon from '../../components/icon';
import Image from '../../components/image';
import {useState, useCallback, useEffect} from 'react';

/**
 * 上传用户头像到XXB
 * @param image 裁剪后的图片 DataURL
 * @returns 是否成功
 */
async function uploadUserAvatar(image: string) {
    const user = getCurrentUser();
    if (!image || !user) return false;

    const formData = new FormData();
    formData.append('files', dataURItoBlob(image), 'avatar.png');

    const {authKeyForServer: token, backendURL, account, requestType, requestFix} = user;

    const uploadURL = generateRequestURL(
        backendURL,
        'user',
        'uploadAvatar',
        {
            lite: '0',
            auth_account: account,
            auth_token: token,
            auth_device: Config.system.device || 'desktop'
        },
        {
            requestFix,
            requestType
        }
    );

    try {
        const response = await fetch(uploadURL, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const json: {result: string, message?: string} = await response.json();
        if (json.result === 'success') {
            return true;
        }
        console.error('Upload failed:', json.message);
        return false;
    } catch (err) {
        console.error('Upload user avatar error:', err);
        return false;
    }
}

type UserAvatarSettingsProps = {
    getAvatarState: () => string;
    setAvatarState: (img: string) => void;
};

/**
 * 用户头像设置组件
 */
const UserAvatarSettings = ({getAvatarState, setAvatarState}: UserAvatarSettingsProps) => {
    const user = getCurrentUser();
    const avatarState = getAvatarState();
    const [newImage, setNewImage] = useState<string>(avatarState);

    useEffect(() => {
        setAvatarState(newImage);
    }, [newImage, setAvatarState]);

    const handleUploadButtonClick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        const {files} = e.target;
        const reader = new FileReader();
        reader.onload = () => {
            showImgCropperDialog(reader.result as string ?? '', setNewImage);
        };
        if (files && files.length) {
            reader.readAsDataURL(files[0]);
        }
    }, [setNewImage]);

    const displayImage = newImage || user?.avatar;

    return (
        <div className="-flex -justify-around -w-56 -items-center -py-4">
            <div className="avatar -rounded-full gray-pale" style={{width: 80, height: 80}}>
                {displayImage ? (
                    <Image src={displayImage} className="avatar-img" />
                ) : (
                    <Icon name="mdi-account" size={40} className="muted" />
                )}
            </div>
            <label className="avatar -rounded-full gray-pale pointer" style={{width: 80, height: 80}}>
                <input
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    style={{display: 'none'}}
                    onClick={(e) => {e.target.value = null;}}
                    onChange={handleUploadButtonClick}
                />
                <Icon name="mdi-arrow-up-bold-box-outline" size={55} color="white" style={{opacity: '70%'}} />
            </label>
        </div>
    );
};

/**
 * 显示用户头像修改对话框
 * @param callback 完成后的回调函数
 */
export const showUserAvatarDialog = (callback?: (...params: any[]) => void) => {
    let avatarState = '';

    const setAvatarState = (img: string) => {
        avatarState = img;
    };

    const getAvatarState = () => avatarState;

    return Modal.show({
        id: 'app-user-avatar-dialog',
        title: Lang.string('usermenu.changeAvatar'),
        onSubmit: async () => {
            if (!avatarState) {
                Messager.show(Lang.string('chat.group.avatar.selectImage'), {type: 'warning'});
                return false;
            }

            const success = await uploadUserAvatar(avatarState);
            if (!success) {
                Messager.show(Lang.error('UPLOAD_FILE_FAILED'), {type: 'danger'});
                return false;
            }

            Messager.show(Lang.string('usermenu.changeAvatar.success'), {type: 'success'});
            fetchMembersFromRemote([getCurrentUserID()]);
            if (callback) callback();
            return true;
        },
        content: <UserAvatarSettings getAvatarState={getAvatarState} setAvatarState={setAvatarState} />
    }, callback);
};

export default {
    show: showUserAvatarDialog,
};
