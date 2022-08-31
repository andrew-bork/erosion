import { ChunkedWorld } from "./chunking";
// import { generate2DArray } from "./util";
import { add, sca, sqrlen, vcopy } from "./vmath";
var scale = 1;

function vecInBounds(low, high, test){
    return low.x < test.x && low.y < test.y && test.x < high.x && test.y < high.y;
}

export class HydraulicEroder {
    /**
     * 
     * @param {ChunkedWorld} chunks 
     */
    constructor(chunks){
        this.chunks = chunks;
        // this.streammap = generate2DArray(heightmap.length, heightmap[0].length, 0);
        // this.poolmap = generate2DArray(heightmap.length, heightmap[0].length, 0);
        this.currtask = null;
        this.minVol = 0.01;
        this.dt = 1;
        this.density = 0.01;
        this.friction = 0.05;
        this.evapRate = 0.01;
        this.depositionRate = 1;

    }


    /**
     * 
     * @param {number} n 
     */
    erode(n){
        for(var i = 0; i < n; i ++){
            this.erodeParticle();
        }
    }

    erodeParticle(){
        var speed = {x:0,y:0, z:0}; // Note: Z is not used. It is only for compatibility with existing methods
        var pos = {x: (this.chunks.width) * Math.random(),y:(this.chunks.height) * Math.random(), z:0};
        var volume = 1;
        var sediment = 0;
        const low = {x:0,y:0};
        const high = {x:this.chunks.width, y: this.chunks.height};
        while(volume > this.minVol){
            // console.log(pos.x, pos.y);
            const initpos = {x: pos.x, y: pos.y};
            // const n = normal(this.heightmap, initpos.x, initpos.y);
            const n = this.chunks.normal(initpos.x, initpos.y);
            // console.log(n);
            speed = add(speed, sca({x:n.x, y: n.z, z: 0}, this.dt));
            pos = add(pos, sca(vcopy(speed), this.dt));
            speed = sca(speed, 1 - this.dt*this.friction);

            if(!vecInBounds(low, high, pos)){
                return;
            }
            const maxsediment = Math.max(0, volume * Math.sqrt(sqrlen(speed))*(this.chunks.get(initpos.x,initpos.y)-this.chunks.get(pos.x, pos.y)));
            const diff = maxsediment - sediment;
            sediment += this.dt*this.depositionRate*diff;

            // console.log(initpos, pos);
            // console.log(maxsediment);
            // console.log(sediment);
            // this.chunks.set(initpos.y, initpos.x, this.chunks.get(initpos.y, initpos.x) )
            
            this.chunks.add(initpos.x, initpos.y, -this.dt * this.depositionRate * diff);
            // this.heightmap[initpos.y][initpos.x] -= this.dt * this.depositionRate * diff;

            volume *= (1 - this.dt*this.evapRate);
        }
    }

    /**
     * 
     * @param {number} n 
     * @param {()=>{}} cb 
     * @param {(percent:number) => {}} prog 
     */
    erodeNonBlocking(n, cb, prog=()=>{}){
        const perChunk = 100;
        var i = 0;

        const run = () => {
            
            for(var k = 0; k < perChunk; k ++){
                this.erodeParticle();
            }
            i += perChunk;
            
            prog(i/n);

            if(i >= n){
                this.currtask = null;
                cb(this.heightmap);
                return;
            }
            this.currtask = setTimeout(run, 0.001);
        }

        this.currtask = setTimeout(run, 0.001);
    }
    setScale(s){
        scale = s;
        console.log(scale);
    }
}