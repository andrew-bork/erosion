<script>
	let width, height;
    /** @type {HTMLCanvasElement} */
	let canvas;
    
	import {ChunkedWorld} from "./chunking.js";
	import {onMount} from "svelte";
	import * as THREE from "three"
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
	import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
	import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
	// import * as a from "three/examples/jsm/postprocessing/ShaderPass.js"

	import { GUI } from 'dat.gui'

	import Stats from 'three/examples/jsm/libs/stats.module.js'

	import { HydraulicEroder } from "./eroder"
	import { FractalSimplexNoise } from "./noise";

	let progbar;

	let scene;
	let skyTexture, milkywayTexture;
	let controls;
	let heightmeshgroup, wireframemeshgroup;
	let material = new THREE.MeshStandardMaterial({
				roughness: 0.7,
				color: new THREE.Color( "#9c866a" ),
				envMap: skyTexture,
				flatShading: true,
			});
	// let wireframeMaterial = new THREE.MeshBasicMaterial({
	// 	opacity
	// });
	let camera;
	/** @type {THREE.WebGLRenderer}*/
	let renderer;
	let directionalLight;
	let backlight;
	let ambientLight;
	let compositor;
	let skybox;
	
	let noiseSettings = {
		xyscale: 0.1,
		zscale: 1,
		lacunarity: 2.1,
		persistence: 0.5,
		octaves: 8,
		seed: 1,
	};

	let k = 0;
	let noise = FractalSimplexNoise(noiseSettings);
	

	let world = new ChunkedWorld(10, 10, noise, material);
	let eroder = new HydraulicEroder(world);

	// let nParticles = 100000000;
	let settings = {
		nParticles: 100000,
		width: 10,
		height: 10,
	};

	const resizeWindow = (w,h) => {
		console.table([w,h]);
		width = canvas.width = w;
		height = canvas.height = h;
	}

    onMount(() => {
		resizeWindow(screen.width, screen.height);
		setupScene();
		scene.add(world.chunkGroup);
		// scene.add(world.wireframeGroup);
		// world.generateHeightmap();
		// world.chunks[0][0].set(1,1,0);
		// world.set(1,1,0);
		initGUI();
    })

	let gui = new GUI();
	const initGUI = () => {
		const base = gui.addFolder("Base Map");
		
		let options = {
			gen: () => {
				
				if(eroder.currtask != null) {
					clearInterval(eroder.currtask);
					bruh.name("Erode!");
					eroder.currtask = null;
				}
				world.width = settings.width;
				world.height = settings.height;
				world.removeChunks();
				world.createChunks();
				let noise = FractalSimplexNoise(noiseSettings);
				world.noise = noise;
				world.generateHeightmapNonBlock((progress) => {
					progbar.style.width = `${progress * 100}%`;
				}, 4, 10);
			},
			erode: () => {
				if(eroder.currtask == null) {
					eroder.erodeNonBlocking(settings.nParticles, () => {
						// world.chunks.
						bruh.name("Erode!");
					}, (progress) => {
						progbar.style.width = `${progress * 100}%`;
					});
					bruh.name("Stop!");
				}else{
					clearInterval(eroder.currtask);
					bruh.name("Erode!");
					eroder.currtask = null;
				}
			}
		}
		base.add(settings, "width", 1, 50, 1).setValue(10);
		base.add(settings, "height", 1, 50, 1).setValue(10);
		const noiseF = base.addFolder("Noise");
		noiseF.open();
		noiseF.add(noiseSettings, "xyscale", 0, 10, 0.01);
		noiseF.add(noiseSettings, "zscale", 0, 10, 0.01);
		noiseF.add(noiseSettings, "lacunarity", 0.9, 10, 0.01);
		noiseF.add(noiseSettings, "persistence", 0, 1.1, 0.01);
		noiseF.add(noiseSettings, "octaves", 1, 20, 1);
		noiseF.add(noiseSettings, "seed");
		base.add(options, "gen").name("Generate!");
		base.open();
		const eroderFolder = gui.addFolder("Erosion Settings");
		/*
		
        this.minVol = 0.01;
        this.dt = 1;
        this.density = 0.01;
        this.friction = 0.05;
        this.evapRate = 0.01;
        this.depositionRate = 1;
		*/
		eroderFolder.add(eroder, "minVol", 0, 1).name("Min Volume");
		eroderFolder.add(eroder, "dt", 0, 10, 0.1).name("dt");
		eroderFolder.add(eroder, "density", 0, 1).name("Density");
		eroderFolder.add(eroder, "friction", 0, 1).name("Friction");
		eroderFolder.add(eroder, "evapRate", 0, 1).name("Evaporation Rate");
		eroderFolder.add(eroder, "depositionRate", 0, 1).name("Deposition Rate");
		eroderFolder.add(settings, "nParticles", 0, 1000000, 1).name("# of Particles");
		let bruh = eroderFolder.add(options, "erode").name("Erode!");
		eroderFolder.open();

	}



	const erode = () => {
		eroder.erodeNonBlocking(settings.nParticles, () => {
			// world.chunks.
		}, (progress) => {
			progbar.style.width = `${progress * 100}%`;
		});
	}





	const watercolor = "#c7fbff";
	const setupScene = () => {
		scene = new THREE.Scene();

		scene.fog = new THREE.FogExp2(watercolor, 0.)

		camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
		
		renderer = new THREE.WebGLRenderer({canvas: canvas});
		renderer.setSize( window.innerWidth, window.innerHeight );
		
		// renderer.shadowMapEnabled = true;
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
		// renderer.

		heightmeshgroup = new THREE.Group();
		wireframemeshgroup = new THREE.Group();
		
		
		controls = new OrbitControls( camera, renderer.domElement );
		controls.maxDistance = 100;
		// controls.enableDamping = true;
		// controls.dampingFactor= 0.001;
		
		{
			milkywayTexture = new THREE.TextureLoader().load("../../hdr/milkyway_2020_4k.jpg");
    		skyTexture = new THREE.TextureLoader().load("../../hdr/dreifaltigkeitsberg_4k.jpg")
		}


		{
			const skyboxGeo = new THREE.SphereGeometry(100);
			const mat = new THREE.MeshBasicMaterial({
				// map: skyTexture,
				// map: milkywayTexture,
				color: "#c7fbff",
				fog: false,
			});
			mat.side = THREE.BackSide;
			skybox = new THREE.Mesh(skyboxGeo, mat);
			scene.add(skybox);
		}

		directionalLight = new THREE.DirectionalLight( "#f7f4ba", 1.5 );
		directionalLight.position.set( 1, 2, 0.5 ).normalize();

		directionalLight.castShadow = true;
		directionalLight.shadow.camera.far = 10000;

		backlight = new THREE.DirectionalLight("#c7fbff",0);
		backlight.position.set(-1, -2, -0.5).normalize();

		ambientLight = new THREE.AmbientLight("#c7fbff", 0.2);
		
		scene.add(directionalLight);
		scene.add(ambientLight);
		// scene.add(backlight);

		// scene.add(heightmeshgroup);
		// scene.add(wireframemeshgroup);
		let square = new THREE.BoxGeometry(1,1,1);
		// scene.add(new THREE.Mesh(square, material))
		// scene.add(debugLines);

		camera.position.z = 5;

		compositor = new EffectComposer(renderer);
		compositor.addPass(new RenderPass(scene, camera));


		let stats = new Stats();
		stats.showPanel(1);
		document.body.appendChild(stats.dom);
		function animate() {
			stats.begin();
			controls.update();
			skybox.position.copy(camera.position);
			compositor.render();
			stats.end();
			// k += 0.01;
			// world.generateHeightmap();

			requestAnimationFrame( animate );
		}
		animate();
	}

</script>

<main>
	<canvas bind:this={canvas}></canvas>
	<!-- <div id="control">
		<button on:click={erode}>erode</button>
	</div> -->
	<div bind:this={progbar} id="progbar"></div>
</main>



<style>
	#control {
		position: absolute;
		right: 0;
		top: 0;
	}
	#progbar {
		position: absolute;
		bottom: 0;
		height: 5px;
		left: 0;
		background-color: aqua;
	}
	canvas {
		/* box-sizing: border-box; */
		padding: 0;
		margin: 0;
		overflow: hidden;
	}
	:global(body), :global(html) {
		box-sizing: border-box;
		padding: 0;
		margin: 0;
		overflow: hidden;
	}
</style>