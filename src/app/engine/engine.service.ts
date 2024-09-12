import { ElementRef, Injectable, NgZone, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GridHelper, TextureLoader, DirectionalLight } from 'three';

@Injectable({ providedIn: 'root' })
export class EngineService implements OnDestroy {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private light: THREE.AmbientLight;
  private controls: OrbitControls;
  private gridHelper: GridHelper;
  private cube: THREE.Mesh;

  private frameId: number = null;
  private textureLoader: TextureLoader;

  public constructor(private ngZone: NgZone) {
    this.textureLoader = new TextureLoader();
  }

  public ngOnDestroy(): void {
    if (this.frameId != null) {
      cancelAnimationFrame(this.frameId);
    }
    if (this.renderer != null) {
      this.renderer.dispose();
      this.renderer = null;
      this.canvas = null;
    }
  }

  public createScene(canvas: ElementRef<HTMLCanvasElement>): void {
    // The first step is to get the reference of the canvas element from our HTML document
    this.canvas = canvas.nativeElement;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true, // transparent background
      antialias: true, // smooth edges
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0xeeeeee);

    // create the scene
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 5;
    this.scene.add(this.camera);

    // soft white light
    const color = 0x000000;
    const intensity = 1;
    this.light = new THREE.AmbientLight(color, intensity);
    this.light.position.z = 10;
    this.scene.add(this.light);

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: 0x049ef4,
      emissive: 0x000000,
      roughness: 0,
      metalness: 1,
      flatShading: true,
    });
    this.cube = new THREE.Mesh(geometry, material);
    this.scene.add(this.cube);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement); // Initialiser les contrôles
    this.controls.enableDamping = true; // Activer l'amortissement
    this.controls.dampingFactor = 0.25; // Facteur d'amortissement
    this.controls.enableZoom = true; // Activer le zoom
    this.controls.enablePan = true; // Activer le déplacement panoramique

    this.gridHelper = new GridHelper(10, 10); // (taille, divisions)
    this.gridHelper.position.y = -0.5; // Positionner la grille pour qu'elle soit sous le cube

    this.scene.add(this.gridHelper);
  }

  public render(): void {
    this.frameId = requestAnimationFrame(() => {
      this.render();
    });

    this.renderer.render(this.scene, this.camera);
  }

  // public animate(): void {
  //   this.ngZone.runOutsideAngular(() => {
  //     if (document.readyState !== 'loading') {
  //       this.render();
  //     } else {
  //       window.addEventListener('DOMContentLoaded', () => {
  //         this.render();
  //       });
  //     }

  //     window.addEventListener('resize', () => {
  //       this.resize();
  //     });
  //   });
  // }

  public resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }
}
