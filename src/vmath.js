

// PASS BY REFERENCE

/** 
 * @typedef {{x: number, y: number, z: number}} vector 
 * */

export const sqrt2 = Math.sqrt(2);

/**
 * 
 * @param {vector} v 
 * @returns {number}
 */
export function sqrlen(v){
    return v.x*v.x+v.y*v.y+v.z*v.z;
}

/**
 * 
 * @param {vector} v 
 */
export function normalize(v) {
    const len = Math.sqrt(sqrlen(v));
    v.x/=len;
    v.y/=len;
    v.z/=len;
    return v;
}

export function sca(v, s){
    v.x*=s;
    v.y*=s;
    v.z*=s;
    return v;
}

export function vcopy(v){
    return {x:v.x,y:v.y,z:v.z};
}

export function add(setted, in2){
    setted.x+=in2.x;
    setted.y+=in2.y;
    setted.z+=in2.z;
    return setted;
}
