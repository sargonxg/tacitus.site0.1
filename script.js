/**
 * TACITUS.NARRATIVE VISUAL ENGINE
 * Vanilla JS + Canvas implementation of the "Tangle to Crystal" metaphor.
 * - At the top of the page: high entropy, loose connections.
 * - As the user scrolls: structure coefficient increases; swarm settles into a graph.
 */

const canvas = document.getElementById('neural-canvas');
const ctx = canvas.getContext('2d');

let width = window.innerWidth;
let height = window.innerHeight;
canvas.width = width;
canvas.height = height;

const config = {
    particleCount: 140,
    baseSpeed: 0.28,
    connectionDist: 120,
    mouseInfluence: 140,
    colorFact: '0, 243, 255',
    colorNarrative: '188, 19, 254',
    colorShared: '255, 179, 71'
};

let particles = [];
let structureLevel = 0; // 0 = pure tangle, 1 = almost full crystal
let mouse = { x: null, y: null };

class Particle {
    constructor(index, total) {
        this.index = index;
        this.total = total;
        this.resetPosition();
        this.assignType();
        this.computeCrystalTarget();
    }

    resetPosition() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * config.baseSpeed * 3;
        this.vy = (Math.random() - 0.5) * config.baseSpeed * 3;
        this.size = 1 + Math.random() * 1.7;
    }

    assignType() {
        const r = Math.random();
        if (r < 0.65) {
            this.kind = 'fact';
        } else if (r < 0.9) {
            this.kind = 'narrative';
        } else {
            this.kind = 'shared';
            this.size *= 1.3;
        }
    }

    computeCrystalTarget() {
        // Lay particles out in a subtle columnar crystal near center
        const cols = Math.ceil(Math.sqrt(this.total));
        const rows = Math.ceil(this.total / cols);
        const col = this.index % cols;
        const row = Math.floor(this.index / cols);

        const marginX = width * 0.18;
        const marginY = height * 0.18;
        const crystalWidth = width - marginX * 2;
        const crystalHeight = height - marginY * 2;

        const stepX = cols > 1 ? crystalWidth / (cols - 1) : 0;
        const stepY = rows > 1 ? crystalHeight / (rows - 1) : 0;

        this.tx = marginX + col * stepX;
        this.ty = marginY + row * stepY;
    }

    update() {
        // Random drift (entropy)
        this.x += this.vx * (1.4 - 0.6 * structureLevel);
        this.y += this.vy * (1.4 - 0.6 * structureLevel);

        // Soft bounds
        if (this.x < -40 || this.x > width + 40 || this.y < -40 || this.y > height + 40) {
            this.resetPosition();
            this.computeCrystalTarget();
        }

        // Attraction towards crystal target as structure increases
        if (structureLevel > 0.05) {
            const pull = 0.015 + structureLevel * 0.035;
            this.x += (this.tx - this.x) * pull;
            this.y += (this.ty - this.y) * pull;
        }

        // Gentle gravitation toward mouse (analyst pointer)
        if (mouse.x !== null) {
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < config.mouseInfluence) {
                const mPull = 0.02;
                this.x += dx * mPull * (1 - structureLevel * 0.5);
                this.y += dy * mPull * (1 - structureLevel * 0.5);
            }
        }
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);

        let color = config.colorFact;
        let alpha = 0.55;

        if (this.kind === 'narrative') {
            color = config.colorNarrative;
            alpha = 0.7;
        } else if (this.kind === 'shared') {
            color = config.colorShared;
            alpha = 0.9;
        }

        ctx.fillStyle = `rgba(${color}, ${alpha})`;
        ctx.fill();
    }
}

function initParticles() {
    particles = [];
    for (let i = 0; i < config.particleCount; i++) {
        particles.push(new Particle(i, config.particleCount));
    }
}

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    particles.forEach(p => p.computeCrystalTarget());
}

window.addEventListener('resize', resize);

window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

window.addEventListener('mouseleave', () => {
    mouse.x = null;
    mouse.y = null;
});

// Map scroll position to structure level
function updateStructureLevel() {
    const scrollTop = window.scrollY || window.pageYOffset;
    const docHeight = document.body.scrollHeight - window.innerHeight;
    if (docHeight <= 0) {
        structureLevel = 0;
        return;
    }
    const ratio = Math.min(Math.max(scrollTop / docHeight, 0), 1);
    structureLevel = ratio;
}

window.addEventListener('scroll', updateStructureLevel);

function drawConnections() {
    const baseDist = config.connectionDist;
    for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // As structure increases, we privilege closer, tighter edges
            const effectiveDist = baseDist * (1.1 - 0.5 * structureLevel);
            if (dist < effectiveDist) {
                let alpha = (1 - dist / effectiveDist) * (0.55 + 0.4 * structureLevel);
                alpha = Math.max(0, Math.min(alpha, 1));

                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.strokeStyle = `rgba(${config.colorFact}, ${alpha})`;
                ctx.lineWidth = 0.4 + structureLevel * 0.6;
                ctx.stroke();
            }
        }
    }
}

function animate() {
    ctx.clearRect(0, 0, width, height);

    // Subtle gradient wash behind everything for cinematic feel
    const gradient = ctx.createRadialGradient(
        width * 0.5, height * 0.1, 0,
        width * 0.5, height * 0.5, height * 0.9
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    particles.forEach(p => {
        p.update();
        p.draw();
    });

    drawConnections();

    requestAnimationFrame(animate);
}

// Intersection Observer for card reveal
const observer = new IntersectionObserver(
    (entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = 1;
                entry.target.style.transform = 'translateY(0)';
            }
        });
    },
    { threshold: 0.18 }
);

document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    updateStructureLevel();
    animate();

    document
        .querySelectorAll('.glass-card, .card-cyber')
        .forEach(el => {
            el.style.transition = 'opacity 0.9s ease-out, transform 0.9s ease-out';
            observer.observe(el);
        });
});
