import {useReducer} from 'react';

export default function useForceUpdate() {
    const [_, forceUpdate] = useReducer(() => ({}), {});
    return {updateSymbol: _, forceUpdate};
}
