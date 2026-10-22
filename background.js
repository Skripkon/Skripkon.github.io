// Adapted from bond_selector InteractiveBackground. No runtime dependencies.
"use strict";
const GRID_SIZE = 126;
const CONNECTION_DISTANCE = 178;
const FOCAL_LENGTH = 760;
function connectNearest(vertices) {
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (let first = 0; first < vertices.length; first += 1) {
        for (let second = first + 1; second < vertices.length; second += 1) {
            const distance = Math.hypot(vertices[first][0] - vertices[second][0], vertices[first][1] - vertices[second][1], vertices[first][2] - vertices[second][2]);
            if (distance > 0.01)
                nearestDistance = Math.min(nearestDistance, distance);
        }
    }
    const edges = [];
    for (let first = 0; first < vertices.length; first += 1) {
        for (let second = first + 1; second < vertices.length; second += 1) {
            const distance = Math.hypot(vertices[first][0] - vertices[second][0], vertices[first][1] - vertices[second][1], vertices[first][2] - vertices[second][2]);
            if (distance < nearestDistance * 1.08)
                edges.push([first, second]);
        }
    }
    return edges;
}
function createIcosahedron() {
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    const vertices = [
        [-1, goldenRatio, 0], [1, goldenRatio, 0], [-1, -goldenRatio, 0], [1, -goldenRatio, 0],
        [0, -1, goldenRatio], [0, 1, goldenRatio], [0, -1, -goldenRatio], [0, 1, -goldenRatio],
        [goldenRatio, 0, -1], [goldenRatio, 0, 1], [-goldenRatio, 0, -1], [-goldenRatio, 0, 1],
    ];
    return { vertices, edges: connectNearest(vertices) };
}
function createTorus(majorSegments = 20, minorSegments = 8) {
    const vertices = [];
    const edges = [];
    for (let major = 0; major < majorSegments; major += 1) {
        const majorAngle = major / majorSegments * Math.PI * 2;
        for (let minor = 0; minor < minorSegments; minor += 1) {
            const minorAngle = minor / minorSegments * Math.PI * 2;
            const radius = 1 + Math.cos(minorAngle) * 0.36;
            vertices.push([
                Math.cos(majorAngle) * radius,
                Math.sin(minorAngle) * 0.36,
                Math.sin(majorAngle) * radius,
            ]);
            const index = major * minorSegments + minor;
            edges.push([index, major * minorSegments + (minor + 1) % minorSegments]);
            edges.push([index, ((major + 1) % majorSegments) * minorSegments + minor]);
        }
    }
    return { vertices, edges };
}
function createCrystal() {
    const vertices = [[0, -1.75, 0], [0, 1.75, 0]];
    const ringSize = 8;
    for (let index = 0; index < ringSize; index += 1) {
        const angle = index / ringSize * Math.PI * 2;
        vertices.push([Math.cos(angle), 0, Math.sin(angle)]);
    }
    const edges = [];
    for (let index = 0; index < ringSize; index += 1) {
        const ringIndex = index + 2;
        edges.push([0, ringIndex], [1, ringIndex], [ringIndex, (index + 1) % ringSize + 2]);
    }
    return { vertices, edges };
}
const GEOMETRY_SCENES = [
    { geometry: createIcosahedron(), progress: 0.08, x: 0.84, y: 0.3, size: 112, hueOffset: -18, rotation: [0.00023, 0.00031, 0.00008] },
    { geometry: createTorus(), progress: 0.5, x: 0.14, y: 0.55, size: 142, hueOffset: 42, rotation: [0.00019, -0.00028, 0.0001] },
    { geometry: createCrystal(), progress: 0.9, x: 0.84, y: 0.56, size: 118, hueOffset: 88, rotation: [-0.0002, 0.00034, 0.00012] },
];
function rotate3D([x, y, z], rotationX, rotationY, rotationZ) {
    const cosX = Math.cos(rotationX);
    const sinX = Math.sin(rotationX);
    const cosY = Math.cos(rotationY);
    const sinY = Math.sin(rotationY);
    const cosZ = Math.cos(rotationZ);
    const sinZ = Math.sin(rotationZ);
    const yX = y * cosX - z * sinX;
    const zX = y * sinX + z * cosX;
    const xY = x * cosY + zX * sinY;
    const zY = -x * sinY + zX * cosY;
    return [xY * cosZ - yX * sinZ, xY * sinZ + yX * cosZ, zY];
}
(() => {
    const canvas = document.getElementById('geometry-background');
    if (!canvas)
        return;
    const context = canvas.getContext('2d');
    if (!context)
        return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pointer = { x: -1000, y: -1000, targetX: -1000, targetY: -1000, active: false };
    let points = [];
    let trail = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let lastTrailAt = 0;
    let gridColumns = 0;
    let pointerVelocity = 0;
    let scrollOffset = window.scrollY;
    let targetScrollOffset = window.scrollY;
    let lastScrollOffset = window.scrollY;
    let scrollVelocity = 0;
    let scrollEnergy = 0;
    let scrollDirection = 1;
    let scanY = window.innerHeight * 0.35;
    const createGrid = () => {
        const nextPoints = [];
        const columns = Math.ceil(width / GRID_SIZE) + 2;
        const rows = Math.ceil(height / GRID_SIZE) + 2;
        gridColumns = columns + 1;
        for (let row = -1; row < rows; row += 1) {
            for (let column = -1; column < columns; column += 1) {
                const seed = row * 131 + column * 73;
                nextPoints.push({
                    baseX: column * GRID_SIZE + Math.sin(seed) * 28,
                    baseY: row * GRID_SIZE + Math.cos(seed * 1.7) * 28,
                    phase: seed * 0.17,
                    speed: 0.65 + ((Math.abs(seed) % 11) / 11) * 0.55,
                    depth: Math.sin(seed * 0.37) * 0.5 + Math.cos(seed * 0.11) * 0.5,
                });
            }
        }
        points = nextPoints;
    };
    const resize = () => {
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.round(width * pixelRatio);
        canvas.height = Math.round(height * pixelRatio);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        createGrid();
        if (reducedMotion)
            draw(0);
    };
    const getPosition = (point, time) => {
        const driftX = Math.sin(time * 0.00016 * point.speed + point.phase) * 11;
        const driftY = Math.cos(time * 0.00013 * point.speed + point.phase) * 9;
        const worldX = point.baseX + driftX;
        const worldY = point.baseY + driftY - (scrollOffset * 0.09) % GRID_SIZE;
        const pointerDistance = Math.hypot(worldX - pointer.x, worldY - pointer.y);
        const influence = pointer.active ? Math.max(0, 1 - pointerDistance / 340) : 0;
        const depth = point.depth * 62
            + Math.sin(worldX * 0.005 + worldY * 0.003 + time * 0.00045) * 34
            - influence * 155
            + Math.sin(worldY * 0.012 + scrollOffset * 0.004) * scrollEnergy * 92;
        const perspective = FOCAL_LENGTH / (FOCAL_LENGTH + depth);
        const projectedX = width * 0.5 + (worldX - width * 0.5) * perspective;
        const projectedY = height * 0.5 + (worldY - height * 0.5) * perspective;
        const scrollWave = Math.sin(projectedY * 0.012 + scrollOffset * 0.004 + time * 0.0007)
            * scrollEnergy * 34 * scrollDirection;
        const deltaX = projectedX - pointer.x;
        const deltaY = projectedY - pointer.y;
        const distance = Math.hypot(deltaX, deltaY);
        const push = influence * influence * 48;
        return {
            x: projectedX + scrollWave + (deltaX / Math.max(distance, 1)) * push,
            y: projectedY + (deltaY / Math.max(distance, 1)) * push,
            influence,
            perspective,
        };
    };
    const drawGeometry = (time, activeHue) => {
        const scrollableHeight = Math.max(document.documentElement.scrollHeight - height, 1);
        const pageProgress = Math.max(0, Math.min(1, scrollOffset / scrollableHeight));
        GEOMETRY_SCENES.forEach((scene, sceneIndex) => {
            const distanceFromScene = Math.abs(pageProgress - scene.progress);
            const rawVisibility = Math.max(0, 1 - distanceFromScene / 0.31);
            const visibility = rawVisibility * rawVisibility * (3 - 2 * rawVisibility);
            if (visibility < 0.012)
                return;
            const centerX = width * scene.x;
            const centerY = height * scene.y;
            const scrollRotation = scrollOffset * 0.0011;
            const rotationX = time * scene.rotation[0] + scrollRotation * 0.48;
            const rotationY = time * scene.rotation[1] + scrollRotation * scrollDirection;
            const rotationZ = time * scene.rotation[2] - scrollRotation * 0.22;
            const assembly = 1 + (1 - visibility) * 0.48;
            const projected = scene.geometry.vertices.map((vertex) => {
                const rotated = rotate3D(vertex, rotationX, rotationY, rotationZ);
                const objectX = rotated[0] * scene.size * assembly;
                const objectY = rotated[1] * scene.size * assembly;
                const objectZ = rotated[2] * scene.size + 115;
                const perspective = FOCAL_LENGTH / (FOCAL_LENGTH + objectZ);
                return {
                    x: centerX + objectX * perspective,
                    y: centerY + objectY * perspective,
                    z: objectZ,
                    perspective,
                };
            });
            const glowRadius = scene.size * 2.15;
            const objectGlow = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius);
            objectGlow.addColorStop(0, `hsla(${activeHue + scene.hueOffset}, 92%, 65%, ${visibility * 0.065})`);
            objectGlow.addColorStop(0.45, `hsla(${activeHue + scene.hueOffset + 48}, 88%, 62%, ${visibility * 0.025})`);
            objectGlow.addColorStop(1, `hsla(${activeHue + scene.hueOffset}, 88%, 62%, 0)`);
            context.fillStyle = objectGlow;
            context.fillRect(centerX - glowRadius, centerY - glowRadius, glowRadius * 2, glowRadius * 2);
            context.save();
            context.globalCompositeOperation = 'lighter';
            context.shadowBlur = 7 + visibility * 8;
            scene.geometry.edges.forEach(([firstIndex, secondIndex], edgeIndex) => {
                const first = projected[firstIndex];
                const second = projected[secondIndex];
                const depthLight = Math.max(0.28, Math.min(1, 1.12 - (first.z + second.z) / 720));
                const edgeHue = activeHue + scene.hueOffset + depthLight * 52 + edgeIndex * 0.45;
                context.strokeStyle = `hsla(${edgeHue}, 94%, 72%, ${visibility * depthLight * 0.34})`;
                context.shadowColor = `hsla(${edgeHue}, 95%, 67%, ${visibility * 0.48})`;
                context.lineWidth = (0.55 + depthLight * 0.8) * Math.min(first.perspective, second.perspective);
                context.beginPath();
                context.moveTo(first.x, first.y);
                context.lineTo(second.x, second.y);
                context.stroke();
            });
            projected.forEach((vertex, vertexIndex) => {
                const vertexHue = activeHue + scene.hueOffset + vertexIndex * 7;
                context.fillStyle = `hsla(${vertexHue}, 96%, 76%, ${visibility * 0.48})`;
                context.shadowColor = `hsla(${vertexHue}, 96%, 68%, ${visibility * 0.55})`;
                context.beginPath();
                context.arc(vertex.x, vertex.y, 0.7 + vertex.perspective * 1.25, 0, Math.PI * 2);
                context.fill();
            });
            context.shadowBlur = 4;
            context.strokeStyle = `hsla(${activeHue + scene.hueOffset + 65}, 92%, 72%, ${visibility * 0.14})`;
            context.lineWidth = 0.75;
            context.beginPath();
            context.ellipse(centerX, centerY, scene.size * 1.72, scene.size * (0.2 + sceneIndex * 0.025), rotationZ + sceneIndex * 0.7, 0, Math.PI * 2);
            context.stroke();
            context.restore();
        });
    };
    const draw = (time) => {
        context.clearRect(0, 0, width, height);
        pointer.x += (pointer.targetX - pointer.x) * 0.12;
        pointer.y += (pointer.targetY - pointer.y) * 0.12;
        pointerVelocity *= 0.94;
        scrollOffset += (targetScrollOffset - scrollOffset) * 0.12;
        scrollVelocity *= 0.9;
        scrollEnergy *= 0.94;
        const paletteWave = Math.sin(time * 0.00024 + pointer.x * 0.0021 + pointer.y * 0.0014);
        const activeHue = 192 + paletteWave * 54 + Math.min(pointerVelocity, 28) * 1.8
            + scrollDirection * scrollEnergy * 42;
        if (scrollEnergy > 0.008) {
            const bandHeight = 115 + scrollEnergy * 175;
            scanY += scrollDirection * (4 + Math.abs(scrollVelocity) * 0.65);
            if (scanY > height + bandHeight)
                scanY = -bandHeight;
            if (scanY < -bandHeight)
                scanY = height + bandHeight;
            const scanGlow = context.createLinearGradient(0, scanY - bandHeight, 0, scanY + bandHeight);
            scanGlow.addColorStop(0, `hsla(${activeHue - 35}, 88%, 65%, 0)`);
            scanGlow.addColorStop(0.44, `hsla(${activeHue - 16}, 90%, 68%, ${scrollEnergy * 0.018})`);
            scanGlow.addColorStop(0.5, `hsla(${activeHue + 35}, 94%, 72%, ${scrollEnergy * 0.1})`);
            scanGlow.addColorStop(0.56, `hsla(${activeHue + 68}, 88%, 66%, ${scrollEnergy * 0.025})`);
            scanGlow.addColorStop(1, `hsla(${activeHue + 82}, 88%, 65%, 0)`);
            context.fillStyle = scanGlow;
            context.fillRect(0, scanY - bandHeight, width, bandHeight * 2);
            const scanLine = context.createLinearGradient(0, 0, width, 0);
            scanLine.addColorStop(0, `hsla(${activeHue}, 92%, 70%, 0)`);
            scanLine.addColorStop(0.18, `hsla(${activeHue}, 92%, 70%, ${scrollEnergy * 0.12})`);
            scanLine.addColorStop(0.5, `hsla(${activeHue + 52}, 95%, 74%, ${scrollEnergy * 0.32})`);
            scanLine.addColorStop(0.82, `hsla(${activeHue + 82}, 92%, 70%, ${scrollEnergy * 0.12})`);
            scanLine.addColorStop(1, `hsla(${activeHue + 82}, 92%, 70%, 0)`);
            context.strokeStyle = scanLine;
            context.lineWidth = 0.8 + scrollEnergy * 0.8;
            context.beginPath();
            context.moveTo(0, scanY);
            context.lineTo(width, scanY);
            context.stroke();
            for (let index = 0; index < 7; index += 1) {
                const dashX = (index * 283 + scrollOffset * (0.38 + index * 0.025)) % (width + 80) - 40;
                const dashLength = 18 + (index % 3) * 13;
                context.strokeStyle = `hsla(${activeHue + index * 13}, 94%, 75%, ${scrollEnergy * 0.34})`;
                context.lineWidth = 1.2;
                context.beginPath();
                context.moveTo(dashX, scanY + (index % 2 === 0 ? -3 : 3));
                context.lineTo(dashX + dashLength, scanY + (index % 2 === 0 ? -3 : 3));
                context.stroke();
            }
        }
        const positions = points.map((point) => getPosition(point, time));
        context.lineWidth = 0.7;
        for (let index = 0; index < positions.length; index += 1) {
            const point = positions[index];
            const lastNeighbour = Math.min(positions.length, index + gridColumns + 2);
            for (let otherIndex = index + 1; otherIndex < lastNeighbour; otherIndex += 1) {
                const other = positions[otherIndex];
                const deltaX = other.x - point.x;
                const deltaY = other.y - point.y;
                if (Math.abs(deltaX) > CONNECTION_DISTANCE || Math.abs(deltaY) > CONNECTION_DISTANCE)
                    continue;
                const distance = Math.hypot(deltaX, deltaY);
                if (distance > CONNECTION_DISTANCE)
                    continue;
                const cursorEnergy = Math.max(point.influence, other.influence);
                const depthLight = Math.min(1.24, (point.perspective + other.perspective) * 0.5);
                const alpha = (1 - distance / CONNECTION_DISTANCE) * (0.052 + cursorEnergy * 0.23) * depthLight;
                const lineHue = activeHue + ((point.x + other.y) / Math.max(width + height, 1)) * 46;
                context.strokeStyle = `hsla(${lineHue}, 82%, 67%, ${alpha})`;
                context.lineWidth = 0.55 * depthLight;
                context.beginPath();
                context.moveTo(point.x, point.y);
                context.lineTo(other.x, other.y);
                context.stroke();
            }
        }
        positions.forEach((point, index) => {
            const pulse = (Math.sin(time * 0.001 + index * 0.7) + 1) * 0.5;
            const radius = (1 + pulse * 0.7 + point.influence * 2.5) * point.perspective;
            const alpha = (0.14 + point.influence * 0.7) * Math.min(point.perspective, 1.3);
            const nodeHue = activeHue - 34 + point.x / Math.max(width, 1) * 70;
            context.fillStyle = `hsla(${nodeHue}, 88%, 68%, ${alpha})`;
            context.beginPath();
            context.arc(point.x, point.y, radius, 0, Math.PI * 2);
            context.fill();
        });
        drawGeometry(time, activeHue);
        if (pointer.active) {
            const glowRadius = 310 + Math.min(pointerVelocity, 30) * 2.5;
            const glow = context.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, glowRadius);
            glow.addColorStop(0, `hsla(${activeHue}, 90%, 66%, 0.13)`);
            glow.addColorStop(0.28, `hsla(${activeHue + 48}, 86%, 65%, 0.07)`);
            glow.addColorStop(0.62, `hsla(${activeHue - 38}, 82%, 62%, 0.025)`);
            glow.addColorStop(1, `hsla(${activeHue}, 82%, 62%, 0)`);
            context.fillStyle = glow;
            context.fillRect(pointer.x - glowRadius, pointer.y - glowRadius, glowRadius * 2, glowRadius * 2);
            context.strokeStyle = `hsla(${activeHue + 24}, 92%, 70%, 0.24)`;
            context.lineWidth = 0.85;
            context.beginPath();
            context.ellipse(pointer.x, pointer.y, 70 + Math.sin(time * 0.002) * 6, 24 + Math.cos(time * 0.0017) * 3, time * 0.00032 + pointer.x * 0.0007, 0, Math.PI * 2);
            context.stroke();
            context.strokeStyle = `hsla(${activeHue - 42}, 90%, 67%, 0.09)`;
            context.beginPath();
            context.ellipse(pointer.x, pointer.y, 118 + Math.cos(time * 0.0015) * 8, 43 + Math.sin(time * 0.0013) * 4, -time * 0.00021 + pointer.y * 0.0005, 0, Math.PI * 2);
            context.stroke();
        }
        trail = trail.filter((trailPoint) => trailPoint.life > 0.015);
        trail.forEach((trailPoint) => {
            trailPoint.life *= 0.94;
            const trailHue = activeHue + (1 - trailPoint.life) * 82;
            context.fillStyle = `hsla(${trailHue}, 90%, 70%, ${trailPoint.life * 0.28})`;
            context.beginPath();
            context.arc(trailPoint.x, trailPoint.y, 2 + trailPoint.life * 2.2, 0, Math.PI * 2);
            context.fill();
        });
    };
    const animate = (time) => {
        if (!document.hidden)
            draw(time);
        frame = window.requestAnimationFrame(animate);
    };
    const handlePointerMove = (event) => {
        if (event.pointerType === 'touch')
            return;
        const movement = Math.hypot(event.clientX - pointer.targetX, event.clientY - pointer.targetY);
        pointerVelocity = Math.max(pointerVelocity, Math.min(movement, 40));
        pointer.targetX = event.clientX;
        pointer.targetY = event.clientY;
        if (!pointer.active) {
            pointer.x = event.clientX;
            pointer.y = event.clientY;
        }
        pointer.active = true;
        if (event.timeStamp - lastTrailAt > 34) {
            trail.push({ x: event.clientX, y: event.clientY, life: 1 });
            if (trail.length > 18)
                trail.shift();
            lastTrailAt = event.timeStamp;
        }
    };
    const handlePointerLeave = () => {
        pointer.active = false;
        pointer.targetX = -1000;
        pointer.targetY = -1000;
        trail = [];
    };
    const handleScroll = () => {
        const nextScrollOffset = window.scrollY;
        const delta = nextScrollOffset - lastScrollOffset;
        targetScrollOffset = nextScrollOffset;
        if (Math.abs(delta) > 0.5) {
            const nextDirection = delta > 0 ? 1 : -1;
            if (nextDirection !== scrollDirection || scrollEnergy < 0.06) {
                scanY = nextDirection > 0 ? -80 : height + 80;
            }
            scrollDirection = nextDirection;
            scrollVelocity = Math.max(-38, Math.min(38, scrollVelocity + delta * 0.32));
            scrollEnergy = Math.min(1, scrollEnergy + Math.abs(delta) / 105);
        }
        lastScrollOffset = nextScrollOffset;
    };
    resize();
    window.addEventListener('resize', resize);
    if (!reducedMotion) {
        window.addEventListener('pointermove', handlePointerMove, { passive: true });
        window.addEventListener('scroll', handleScroll, { passive: true });
        document.addEventListener('pointerleave', handlePointerLeave);
        frame = window.requestAnimationFrame(animate);
    }
})();
