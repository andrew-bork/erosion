import Alea from "alea";
import { createNoise2D } from "simplex-noise";



/**
 * 
 * @param {{xyscale: number?, zscale: number?, lacunarity: number?, persistence: number?, seed: number?, octaves: number}} options
 * @return {(x:number, y:number)=>number} 
 */
export function FractalSimplexNoise(options){

    options.xyscale = options.xyscale ?? 1;
    options.zscale = options.zscale ?? 1;
    options.lacunarity = options.lacunarity ?? 0.55;
    options.persistence = options.persistence ?? 0.4;
    options.octaves = options.octaves ?? 5;
    options.seed = options.seed ?? Math.random() * 1000;

    const seedFunct = Alea(options.seed);

    const noiseFuncts = [];
    for(let i = 0; i < options.octaves; i ++) {
        noiseFuncts.push(createNoise2D(Alea(seedFunct())));
    }
    

    return (x,y) => {
        let out = 0;
        let scale = options.xyscale;
        let gain = options.zscale;
        noiseFuncts.forEach((func) => {
            out += gain * func(scale * x, scale * y);
            scale *= options.lacunarity;
            gain *= options.persistence; 
        });
        return out;
    }
}

