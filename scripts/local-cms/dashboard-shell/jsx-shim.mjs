import React from './react-shim.mjs';
// jsx-runtime third argument is a React key, NOT a child argument.
// Passing it through as createElement(..., third) would overwrite children.
const element=(type,props,key)=>React.createElement(type,
 key===undefined?props:{...props,key});
export const jsx=element;
export const jsxs=element;
export const jsxDEV=element;
export const Fragment=React.Fragment;
