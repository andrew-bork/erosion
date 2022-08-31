import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { generate2DArray } from '../util';
import { Deque } from './queue';
import { CopyShader } from './shaders';

const tileSize = 50;

var scene;
var camera, renderer;
var controls;
var compositor;

var heightmesh;
var heightmeshes;
var wireframeMesh;
var heightmeshgroup;
var wireframemeshgroup;

var directionalLight;
var backlight;
var ambientLight;

var skybox;

var milkywayTexture;
var skyTexture;

var material;


var debugLines = new THREE.Group();
const lineMaterial = new THREE.LineBasicMaterial({
	color: "#FF0000"
});

export function createDebugLine(points, size){
    const mesh = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map((a) => new THREE.Vector3((a.x / size) * tileSize,a.y,(a.z / size) * tileSize))), lineMaterial);
    debugLines.add(mesh);
    
}


function initMaterials(){
    material = new THREE.MeshStandardMaterial({
        roughness: 1.0,
        color: new THREE.Color( "#9c866a" ),
        envMap: skyTexture,
        flatShading: true,
    });
}

function initTextures(){
    milkywayTexture = new THREE.TextureLoader().load("../../hdr/milkyway_2020_4k.jpg");
    skyTexture = new THREE.TextureLoader().load("../../hdr/dreifaltigkeitsberg_4k.jpg")
}

function initSkybox(){
    // const skyboxGeo = new THREE.BoxGeometry(10, 10, 10);
    const skyboxGeo = new THREE.SphereGeometry(100);
    const mat = new THREE.MeshBasicMaterial({
        // map: skyTexture,
        map: milkywayTexture,
        fog: false,
    });
    mat.side = THREE.BackSide;
    skybox = new THREE.Mesh(skyboxGeo, mat);
    scene.add(skybox);
}

export function attachMesh(base, frame, x, y){
    console.log("attaching ", x, y);
    heightmeshes[y][x] = base;
    heightmeshgroup.add(base);
    wireframemeshgroup.add(frame);
}


export function attachHeightMapNonBlock(map, x, y){
    const plane = new THREE.PlaneGeometry(tileSize, tileSize, map.length-1, map[0].length-1);
    var mesh;
    var add = false;
    if(heightmeshes[y][x]){
        mesh = heightmeshes[y][x];
    }else {
        mesh = new THREE.Mesh(plane, material);
        mesh.position.set(x*tileSize, 0, y*tileSize);
        add = true;
    }
    setHeightMapMeshNonBlock(map, mesh, () =>{
    
        heightmeshes[y][x] = mesh;
    
        const framemesh = new THREE.LineSegments(new THREE.WireframeGeometry(mesh.geometry));
        framemesh.material.depthTest = true;
        framemesh.material.opacity = 0.25;
        framemesh.material.transparent = true;
    
        wireframemeshgroup.add(framemesh);
        if(add){
            heightmeshgroup.add(mesh);
        }
    }, add); 

}


export function setHeightMapMeshNonBlock(map, heightmesh, cb = ()=>{}, bruh){
    const positionAttribute = heightmesh.geometry.attributes.position;
    const calcPerChunk = 32;
    const queue = new Deque();
    queue.pushback({i: 0, j: 0});

    const dirs = [[0,1], [1,0]];


    const ntiles = {x: Math.floor(map[0].length / calcPerChunk), y: Math.floor(map.length/calcPerChunk)};

    const visited = generate2DArray(ntiles.y, ntiles.x, false);

    const calcChunk = () => {
        if(queue.empty()){
            // heightmesh.geometry.rotateX(-Math.PI/2);
            heightmesh.geometry.computeVertexNormals();
            heightmesh.geometry.computeTangents();
            heightmesh.geometry.attributes.position.needsUpdate = true;
            heightmesh.geometry.attributes.normal.needsUpdate = true;
            console.log("finish");
            cb();
            return;
        }

        const {i,j} = queue.shift();

        const starty = i * calcPerChunk;
        const endy = Math.min(map.length, starty + calcPerChunk);
        const startx = j * calcPerChunk;
        const endx = Math.min(map[0].length, startx + calcPerChunk);
        
        for(var y = starty; y < endy; y ++){
            for(var x = startx; x < endx; x ++){
                const i = y * map[y].length + x;
            
                // console.log(i)
                // access single vertex (x,y,z)
                
                if(bruh){
                    var x0 = positionAttribute.getX( i );
                    var y0 = positionAttribute.getY( i );
                    var z = positionAttribute.getZ( i );
                    
                    // modify data (in this case just the z coordinate)
                    z = map[y][x];
    
                    // write data back to attribute
                    positionAttribute.setXYZ( i, y0, z, x0);
                }else{
                    
                    var x0 = positionAttribute.getX( i );
                    var y0 = positionAttribute.getY( i );
                    var z = positionAttribute.getZ( i );
                    
                    // modify data (in this case just the z coordinate)
                    y0 = map[y][x];

                    // write data back to attribute
                    positionAttribute.setXYZ( i, x0, y0, z);
                }
            }
        }

        dirs.forEach((dir) => {
            const newi = i+dir[0], newj = j+dir[1];
            if(newi < ntiles.y && newj < ntiles.x && !visited[newi][newj]){
                visited[newi][newj] = true;
                queue.pushback({i: newi, j: newj});
            }
        });

        // console.log(queue);
        setTimeout(calcChunk, 10);

        
    }

    calcChunk();

}


export function attachHeightMap(map, x, y){
    const plane = new THREE.PlaneGeometry(tileSize, tileSize, map.length-1, map[0].length-1);
    const mesh = new THREE.Mesh(plane, material);
    setHeightMapMesh(map, mesh)
    mesh.position.set(x*tileSize, 0, y*tileSize);

    heightmeshes[y][x] = mesh;

    const framemesh = new THREE.LineSegments(new THREE.WireframeGeometry(mesh.geometry));
    framemesh.material.depthTest = true;
    framemesh.material.opacity = 0.25;
    framemesh.material.transparent = true;

    wireframemeshgroup.add(framemesh);
    heightmeshgroup.add(mesh);
}

export function generateHeightMapGeometry(map, x, y){
    console.log(map);
    const plane = new THREE.PlaneGeometry(tileSize, tileSize, map.length-1, map[0].length-1);
    // const mesh = new THREE.Mesh(plane, material);
    setHeightMapGeometry(map, plane)

    return plane;
}

export function setHeightMapGeometry(map, geometry){
    const positionAttribute = geometry.attributes.position;
    console.log(map);
    for(var y = 0; y < map.length; y ++){
        for(var x = 0; x< map[y].length; x ++){
            const i = y * map[y].length + x;
            // console.log(i)
			// access single vertex (x,y,z)
		
			var x0 = positionAttribute.getX( i );
			var y0 = positionAttribute.getY( i );
			var z = positionAttribute.getZ( i );
			
			// modify data (in this case just the z coordinate)
		
			z += map[y][x];

			// write data back to attribute
			positionAttribute.setXYZ( i, x0, y0, z );
        }
    }

    geometry.rotateX(-Math.PI/2);
    geometry.computeVertexNormals();
    geometry.computeTangents();
}


export function setHeightMapMesh(map, heightmesh){
    const positionAttribute = heightmesh.geometry.attributes.position;
    console.log(map);
    for(var y = 0; y < map.length; y ++){
        for(var x = 0; x< map[y].length; x ++){
            const i = y * map[y].length + x;
            // console.log(i)
			// access single vertex (x,y,z)
		
			var x0 = positionAttribute.getX( i );
			var y0 = positionAttribute.getY( i );
			var z = positionAttribute.getZ( i );
			
			// modify data (in this case just the z coordinate)
		
			z += map[y][x];

			// write data back to attribute
			positionAttribute.setXYZ( i, x0, y0, z );
        }
    }

    heightmesh.geometry.rotateX(-Math.PI/2);
    heightmesh.geometry.computeVertexNormals();
    heightmesh.geometry.computeTangents();
}

export function setWireframeEnable(val){
    wireframemeshgroup.visible = val;
}

export function setHeightmapEnable(val){
    heightmeshgroup.visible = val;
}

const watercolor = 0x277ae6;



export function setupScene(DOMElement, w, h) {
    scene = new THREE.Scene();

    // scene.fog = new THREE.FogExp2(watercolor, 0.01)

    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
    
    renderer = new THREE.WebGLRenderer({canvas: DOMElement});
    renderer.setSize( window.innerWidth, window.innerHeight );
    
    heightmeshgroup = new THREE.Group();
    wireframemeshgroup = new THREE.Group();
    
    
    controls = new OrbitControls( camera, renderer.domElement );
    controls.maxDistance = 100;
	// controls.enableDamping = true;
    // controls.dampingFactor= 0.001;
    
    initTextures();
    initMaterials();



    heightmeshes=[]
    for(var i = 0; i < h; i++){
        const row = [];
        for(var j = 0; j < w; j ++){
            row.push(null);
        }
        heightmeshes.push(row);
    }

    
    directionalLight = new THREE.DirectionalLight( "#f7f4ba", 1 );
    directionalLight.position.set( 1, 1, 1 ).normalize();

    backlight = new THREE.DirectionalLight("#c7fbff",.3);
    backlight.position.set(-1,-1,-1).normalize();

    ambientLight = new THREE.AmbientLight("#c7fbff");

    initSkybox();


    
    
    scene.add(directionalLight);
    scene.add(ambientLight);
    scene.add(backlight);

    // scene.add(wireframeMesh);

    scene.add(heightmeshgroup);
    scene.add(wireframemeshgroup);
    scene.add(debugLines);



    camera.position.z = 5;



    compositor = new EffectComposer(renderer);
    compositor.addPass(new RenderPass(scene, camera));



    function animate() {
        controls.update();
        skybox.position.copy(camera.position);
        compositor.render();

        requestAnimationFrame( animate );
    }
    animate();
}

export function setCinematicMode(val){
    controls.enableDamping = val;
}