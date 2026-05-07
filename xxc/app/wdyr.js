/// <reference types="@welldone-software/why-did-you-render" />
import React from 'react';

if (process.env.NODE_ENV === 'REACT_PERF') {
    try {
        require('@welldone-software/why-did-you-render')(React, {
            trackAllPureComponents: true,
            include: [/.*/]
        });
    } catch (e) {
        // do nothing.
    }
}
