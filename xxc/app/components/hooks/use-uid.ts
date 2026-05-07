import {useRef} from 'react';
import fuid from '../../utils/fuid';

/**
 * UID Hook
 * @returns UID
 */
export default function useUid() {
    const id = useRef(fuid());
    return id.current;
}
