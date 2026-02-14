/**
 * DARK - Three.js Particle Background
 * Features: Interactive connected particles (file network)
 */

class ParticleBackground {
    constructor() {
        this.container = document.getElementById('bg-canvas-container');
        if (!this.container) return;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.camera.position.z = 1000;

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.container.appendChild(this.renderer.domElement);

        this.particles = [];
        this.particleCount = 150;
        this.maxDistance = 250;
        this.mouse = new THREE.Vector2(-1000, -1000);

        this.initParticles();
        this.initLines();
        this.bindEvents();
        this.animate();
    }

    initParticles() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.particleCount * 3);
        const velocities = [];

        for (let i = 0; i < this.particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 2000;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 2000;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 2000;

            velocities.push(new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            ));
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0x0F9E99,
            size: 5,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        });

        this.particleSystem = new THREE.Points(geometry, material);
        this.scene.add(this.particleSystem);
        this.velocities = velocities;
    }

    initLines() {
        const geometry = new THREE.BufferGeometry();
        const material = new THREE.LineBasicMaterial({
            color: 0x0F9E99,
            transparent: true,
            opacity: 0.2,
            blending: THREE.AdditiveBlending
        });

        this.linePositions = new Float32Array(this.particleCount * this.particleCount * 6);
        geometry.setAttribute('position', new THREE.BufferAttribute(this.linePositions, 3));

        this.lines = new THREE.LineSegments(geometry, material);
        this.scene.add(this.lines);
    }

    bindEvents() {
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        });

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const positions = this.particleSystem.geometry.attributes.position.array;
        let lineIdx = 0;
        const linePosAttr = this.lines.geometry.attributes.position.array;

        // Create a ray from mouse to scene
        const vector = new THREE.Vector3(this.mouse.x, this.mouse.y, 0.5);
        vector.unproject(this.camera);
        const dir = vector.sub(this.camera.position).normalize();
        const distance = -this.camera.position.z / dir.z;
        const mousePos = this.camera.position.clone().add(dir.multiplyScalar(distance));

        for (let i = 0; i < this.particleCount; i++) {
            // Update positions
            positions[i * 3] += this.velocities[i].x;
            positions[i * 3 + 1] += this.velocities[i].y;
            positions[i * 3 + 2] += this.velocities[i].z;

            // Bounce off boundaries
            if (positions[i * 3] > 1000 || positions[i * 3] < -1000) this.velocities[i].x *= -1;
            if (positions[i * 3 + 1] > 1000 || positions[i * 3 + 1] < -1000) this.velocities[i].y *= -1;
            if (positions[i * 3 + 2] > 1000 || positions[i * 3 + 2] < -1000) this.velocities[i].z *= -1;

            // Mouse interaction
            const dx = positions[i * 3] - mousePos.x;
            const dy = positions[i * 3 + 1] - mousePos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 300) {
                positions[i * 3] += dx * 0.01;
                positions[i * 3 + 1] += dy * 0.01;
            }

            // Connect lines
            for (let j = i + 1; j < this.particleCount; j++) {
                const dx2 = positions[i * 3] - positions[j * 3];
                const dy2 = positions[i * 3 + 1] - positions[j * 3 + 1];
                const dz2 = positions[i * 3 + 2] - positions[j * 3 + 2];
                const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2 + dz2 * dz2);

                if (dist2 < this.maxDistance) {
                    linePosAttr[lineIdx++] = positions[i * 3];
                    linePosAttr[lineIdx++] = positions[i * 3 + 1];
                    linePosAttr[lineIdx++] = positions[i * 3 + 2];
                    linePosAttr[lineIdx++] = positions[j * 3];
                    linePosAttr[lineIdx++] = positions[j * 3 + 1];
                    linePosAttr[lineIdx++] = positions[j * 3 + 2];
                }
            }
        }

        // Hide unused line segments
        for (let k = lineIdx; k < linePosAttr.length; k++) {
            linePosAttr[k] = 0;
        }

        this.particleSystem.geometry.attributes.position.needsUpdate = true;
        this.lines.geometry.attributes.position.needsUpdate = true;

        this.renderer.render(this.scene, this.camera);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.particles = new ParticleBackground();
});
