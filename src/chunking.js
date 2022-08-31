
import { BoxBufferGeometry, BufferAttribute, BufferGeometry, EdgesGeometry, Group, LineBasicMaterial, LineSegments, LOD, Mesh, MeshBasicMaterial, PlaneBufferGeometry, PlaneGeometry, WireframeGeometry } from "three";
import { normalize } from "./vmath";

import Deque from "./queue"

export class ChunkedWorld {
    /**
     * 
     * @param {number} width 
     * @param {number} height 
     * @param {(x:number, y:number) => number} noise 
     */
    constructor(width, height, noise = (x,y) => {}, material=new MeshBasicMaterial(), wireframeMaterial=new MeshBasicMaterial()) {
        /** @type {number} width of chunk */
        this.width = width;
        /** @type {number} height of chunk */
        this.height = height;

        /** @type {(x:number, y:number) => number}} noise function */
        this.noise = noise;

        this.material = material;

        this.chunkGroup = new Group();
        this.wireframeGroup = new Group();

        this.wireframeMaterial = wireframeMaterial;

        /** @type {[[Chunk]]} Chunk array */
        this.chunks;
        this.createChunks();

        this.dx = 1 / 64;
        this.dy = 1 / 64;
    }

    createChunks() {
        this.chunkGroup.clear();
        this.chunks = [];
        for(let y = 0; y < this.height; y++) {
            const row = [];
            for(let x = 0; x < this.width; x++){
                const chunk = new Chunk(65, 65, x, y, this.noise, this.material, this.wireframeMaterial);
                row.push(chunk);
                chunk.lod.position.set(x - this.width / 2,0,y - this.height / 2);
                // chunk.meshWireframe.position.set(x - this.width / 2,0,y - this.height / 2);
                // this.chunkGroup.add(chunk.mesh);
                this.chunkGroup.add(chunk.lod);
                // this.wireframeGroup.add(chunk.meshWireframe);
            }
            this.chunks.push(row);
        }

    }

    removeChunks() {
        this.chunks.forEach((row) => {
            row.forEach((chunk) => {
                this.chunkGroup.remove(chunk.lod);
            });
        });
        this.chunks = [];
    }

    /**
     * Loops through all chunks and generates the heightmap.
     */
    generateHeightmap() {
        for(let y = 0; y < this.height; y++) {
            for(let x = 0; x < this.width; x++){
                this.chunks[y][x].generateHeightmap();
            }
        }
    }
    
    /**
     * Generates the Heightmap and loads it into the position buffer
     */
     generateHeightmapNonBlock(prog, nperinterval=10, intervals=100) {

        const queue = new Deque();

        const total = this.height * this.width;
        let completed = 0;
        let k;
        const run = () => {
            if(!queue.empty()) {
                let z = 0;
                while(!queue.empty() && z < nperinterval) {
                    const {x,y} = queue.shift();
                    this.chunks[y][x].generateHeightmap();
                    completed++;
                    z ++;
                }
                prog(completed / total);
            }else {
                clearTimeout(k);
            }
        }
        
        k = setInterval(run, intervals)

        // queue.pushback({x:0, y:0})

        for(let y = 0; y < this.height; y++) {
            for(let x = 0; x < this.width; x++){
                queue.pushback({x:x, y: y});
            }
        }
    }

    get(x,y) {
        const i = Math.floor(x), j = Math.floor(y);
        // console.log(x,y);
        return this.chunks[j][i].get(x - i, y - j);
    }

    set(x,y,n) {
        const i = Math.floor(x), j = Math.floor(y);
        // console.table([[x,y],[i,j]])
        if(x - i < this.dx && i > 0) {
            this.chunks[j][i-1].add(1, y - j, n);

            if(y - j < this.dy && j > 0) {
                this.chunks[j-1][i-1].add(1, 1, n);
            }
        }
        if(y - j < this.dy && j > 0) {
            this.chunks[j-1][i].add(x - i, 1, n);
        }
        this.chunks[j][i].add(x - i, y - j, n);
    }

    add(x,y,n) {
        const i = Math.floor(x), j = Math.floor(y);
        // console.table([[x,y],[i,j]])
        if(x - i < this.dx && i > 0) {
            this.chunks[j][i-1].add(1, y - j, n);

            if(y - j < this.dy && j > 0) {
                this.chunks[j-1][i-1].add(1, 1, n);
            }
        }
        if(y - j < this.dy && j > 0) {
            this.chunks[j-1][i].add(x - i, 1, n);
        }
        this.chunks[j][i].add(x - i, y - j, n);
    }

    normal(x,y) {
        try{
            {
                // return normalize(R-L, -2, B-T);
                return normalize({x: this.get((x < this.dx ? x : x-this.dx),y) - this.get((x > this.width - this.dx ? x : x+this.dx),y), y: -2, z: this.get(x,(y < this.dy ? y : y-this.dy)) - this.get(x,(y > this.height - this.dy ? y : y+this.dy))});
            }
            // v1;
            {
                var norm = sca(normalize({x: scale * (heightmap[i][j] - heightmap[i+1][j]), y: 1, z: 0}), 0.15);
                norm = add(norm, sca(normalize({x: scale * (heightmap[i-1][j] - heightmap[i][j]), y: 1, z: 0}), 0.15));
                norm = add(norm, sca(normalize({x: 0, y: 1, z: scale * (heightmap[i][j] - heightmap[i][j+1])}), 0.15));
                norm = add(norm, sca(normalize({x: 0, y: 1, z: scale * (heightmap[i][j-1] - heightmap[i][j])}), 0.15));

                norm = add(norm, sca(normalize({x: scale * (heightmap[i][j] - heightmap[i+1][j+1]) / sqrt2, y: sqrt2, z: scale * (heightmap[i][j] - heightmap[i+1][j+1])/ sqrt2}), 0.1));
                norm = add(norm, sca(normalize({x: scale * (heightmap[i][j] - heightmap[i+1][j-1]) / sqrt2, y: sqrt2, z: scale * (heightmap[i][j] - heightmap[i+1][j-1])/ sqrt2}), 0.1));
                norm = add(norm, sca(normalize({x: scale * (heightmap[i][j] - heightmap[i-1][j+1]) / sqrt2, y: sqrt2, z: scale * (heightmap[i][j] - heightmap[i-1][j+1])/ sqrt2}), 0.1));
                norm = add(norm, sca(normalize({x: scale * (heightmap[i][j] - heightmap[i-1][j-1]) / sqrt2, y: sqrt2, z: scale * (heightmap[i][j] - heightmap[i-1][j-1])/ sqrt2}), 0.1));
            }
            return norm;
        }catch{
            console.error(x,y);
        }
    }
}

class Chunk {
    /**
     * 
     * @param {number} width 
     * @param {number} height 
     * @param {number} offx 
     * @param {number} offy 
     * @param {(x:number, y:number) => number} noise 
     */
    constructor(width, height, offx, offy, noise = (x,y) => {}, material=new MeshBasicMaterial(), wireframeMaterial= new MeshBasicMaterial()) {
        /** @type {number} width of chunk */
        this.width = width;
        /** @type {number} height of chunk */
        this.height = height;
        /** @type {number} x offset of chunk */
        this.offx = offx;
        /** @type {number} y offset of chunk */
        this.offy = offy;

        /** @type {(x:number, y:number) => number}} noise function */
        this.noise = noise;

        /** @type {Float32Array} vertex position buffer */
        this.position = new Float32Array(3 * this.width * this.height);
        /** @type {Float32Array} vertex normal buffer */
        this.normal = new Float32Array(3 * this.width * this.height);

        this.posAttr = new BufferAttribute(this.position, 3);

        
        this.material = material;

        this.lod = new LOD();
        this.createLODPLanes();
    }

    /**
     * Returns the correct index from mesh
     * 
     * @param {number} x 
     * @param {number} y 
     */
    i(x,y) {
        return 3 * (x + y * this.width);
    }

    /**
     * Generates the Heightmap and loads it into the position buffer
     */
     generateHeightmap() {
        for(let x = 0; x < this.width; x ++){
            const noiseX = this.offx + x / (this.width - 1);
            for(let y = 0; y < this.height; y ++) {
                const noiseY = this.offy + y / (this.height - 1);
                const posI = this.i(x, y);
                const height = this.noise(noiseX, noiseY);
                // console.log(height);
                this.position[posI] = x / (this.width - 1);
                this.position[posI+1] = height;
                this.position[posI+2] = y / (this.height - 1);
            }
        }
        // this.geometry.getAttribute("position").needsUpdate = true;
        this.posAttr.needsUpdate = true;
        this.low.geometry.computeBoundingSphere();
        this.mid.geometry.computeBoundingSphere();
        this.high.geometry.computeBoundingSphere();
        // this.wireframeGeometry.getAttribute("position").needsUpdate = true;
    }


    generateMesh(skip) {
        let geo = new BufferGeometry();
        let k = skip;
        let geoInd = new Uint16Array(2 * 3 * (this.width - 1) * (this.height - 1) / (k * k));
        
        let i = 0;
        for(let y = 0; y < this.height - 1; y += k) {
            for(let x = 0; x < this.width - 1; x += k) {
                // console.table([[x,y]])
                geoInd[i++] = this.i(x+k,y) / 3;
                geoInd[i++] = this.i(x,y) / 3;
                geoInd[i++] = this.i(x,y+k) / 3;
                
                geoInd[i++] = this.i(x,y+k) / 3;
                geoInd[i++] = this.i(x+k,y+k) / 3;
                geoInd[i++] = this.i(x+k,y) / 3;
            }
        }
        
        geo.setIndex(new BufferAttribute(geoInd, 1));
        geo.setAttribute("position", this.posAttr)

        const mesh = new Mesh(geo, this.material);
        mesh.castShadow = mesh.receiveShadow = true;
        return mesh;
    }

    createLODPLanes() {
        this.low = this.generateMesh(8);
        this.mid = this.generateMesh(4);
        this.high = this.generateMesh(2);
        this.lod.addLevel(this.low, 30);
        this.lod.addLevel(this.mid, 8)
        this.lod.addLevel(this.high, 0)
    }

    get(x,y) {
        const i = Math.floor(x * (this.width - 1)), j = Math.floor(y * (this.height - 1));
        // console.log(i,j);
        return this.position[this.i(i,j) + 1];
    }

    set(x,y,h) {
        const i = Math.floor(x * (this.width - 1)), j = Math.floor(y * (this.height - 1));
        // console.log(i,j);
        this.position[this.i(i,j) + 1] = h;
        this.posAttr.needsUpdate = true;
    }

    add(x,y,n) {
        const i = Math.floor(x * (this.width - 1)), j = Math.floor(y * (this.height - 1));
        // console.log(i,j);
        this.position[this.i(i,j) + 1] += n;
        this.posAttr.needsUpdate = true;
    }

    normal(x,y) {
        try{
            {
                // return normalize(R-L, -2, B-T);
                return normalize({x: this.get(x-1,y) - this.get(x+1,y), y: -2, z: this.get(x,y-1) - this.get(x,y+1)});
            }
            // v1;
            {
                var norm = sca(normalize({x: scale * (heightmap[i][j] - heightmap[i+1][j]), y: 1, z: 0}), 0.15);
                norm = add(norm, sca(normalize({x: scale * (heightmap[i-1][j] - heightmap[i][j]), y: 1, z: 0}), 0.15));
                norm = add(norm, sca(normalize({x: 0, y: 1, z: scale * (heightmap[i][j] - heightmap[i][j+1])}), 0.15));
                norm = add(norm, sca(normalize({x: 0, y: 1, z: scale * (heightmap[i][j-1] - heightmap[i][j])}), 0.15));

                norm = add(norm, sca(normalize({x: scale * (heightmap[i][j] - heightmap[i+1][j+1]) / sqrt2, y: sqrt2, z: scale * (heightmap[i][j] - heightmap[i+1][j+1])/ sqrt2}), 0.1));
                norm = add(norm, sca(normalize({x: scale * (heightmap[i][j] - heightmap[i+1][j-1]) / sqrt2, y: sqrt2, z: scale * (heightmap[i][j] - heightmap[i+1][j-1])/ sqrt2}), 0.1));
                norm = add(norm, sca(normalize({x: scale * (heightmap[i][j] - heightmap[i-1][j+1]) / sqrt2, y: sqrt2, z: scale * (heightmap[i][j] - heightmap[i-1][j+1])/ sqrt2}), 0.1));
                norm = add(norm, sca(normalize({x: scale * (heightmap[i][j] - heightmap[i-1][j-1]) / sqrt2, y: sqrt2, z: scale * (heightmap[i][j] - heightmap[i-1][j-1])/ sqrt2}), 0.1));
            }
            return norm;
        }catch{
            console.error(i,j);
        }
    }
}