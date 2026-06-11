import { evaluateAttack } from './hasher.js';

const imageInput = document.getElementById('imageInput');
const canvasOriginal = document.getElementById('canvasOriginal');
const canvasAttacked = document.getElementById('canvasAttacked');
const ctxOriginal = canvasOriginal.getContext('2d', { willReadFrequently: true });
const ctxAttacked = canvasAttacked.getContext('2d', { willReadFrequently: true });

const processBtn = document.getElementById('processBtn');
const downloadBtn = document.getElementById('downloadBtn');

let originalImage = null;

// Handle image upload
imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        originalImage = new Image();
        originalImage.onload = () => {
            // Setup canvases matching image native dimensions
            canvasOriginal.width = originalImage.width;
            canvasOriginal.height = originalImage.height;
            canvasAttacked.width = originalImage.width;
            canvasAttacked.height = originalImage.height;
            
            ctxOriginal.drawImage(originalImage, 0, 0);
            ctxAttacked.drawImage(originalImage, 0, 0);
            
            processBtn.disabled = false;
            downloadBtn.disabled = true;

            const panel = document.getElementById('scorePanel');
            if (panel) {
                panel.remove();
            }
        };
        originalImage.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// Implement attacks
processBtn.addEventListener('click', () => {
    // Process async to avoid freezing UI
    processBtn.innerText = 'Applying...';
    processBtn.disabled = true;
    setTimeout(() => {
        applyAttacks();
        processBtn.innerText = 'Apply Attack';
        processBtn.disabled = false;
    }, 50);
});

function applyAttacks() {
    if (!originalImage) return;

    const width = originalImage.width;
    const height = originalImage.height;
    
    // Clear attacked canvas
    ctxAttacked.clearRect(0, 0, width, height);

    // Get configs
    const doBlobs = document.getElementById('enableBlobs').checked;
    const intensityBlobs = parseInt(document.getElementById('intensityBlobs').value) / 100; // 0.01 to 1.0

    const doNoise = document.getElementById('enableNoise').checked;
    const intensityNoise = parseInt(document.getElementById('intensityNoise').value) / 100;

    const doShift = document.getElementById('enableShift').checked;
    const intensityShift = parseInt(document.getElementById('intensityShift').value) / 100;

    const doRotate = document.getElementById('enableRotate').checked;
    const intensityRotate = parseInt(document.getElementById('intensityRotate').value) / 100;

    const doScale = document.getElementById('enableScale').checked;
    const intensityScale = parseInt(document.getElementById('intensityScale').value) / 100;

    // Phase 1: Geometric transformations
    ctxAttacked.save();
    
    // Base transform settings
    let shiftX = 0;
    let shiftY = 0;
    let scaleX = 1;
    let scaleY = 1;
    let angle = 0;

    if (doShift) {
        // Shift up to 8% of dimensions
        shiftX = (Math.random() - 0.5) * width * 0.16 * intensityShift;
        shiftY = (Math.random() - 0.5) * height * 0.16 * intensityShift;
    }
    
    if (doRotate) {
        // Rotate up to 8 degrees
        angle = (Math.random() - 0.5) * 16 * intensityRotate * (Math.PI / 180);
    }
    
    if (doScale) {
        // Scale distortion up to 10% variance between X and Y
        scaleX = 1 + (Math.random() - 0.5) * 0.2 * intensityScale;
        scaleY = 1 + (Math.random() - 0.5) * 0.2 * intensityScale;
    }
    
    // Auto-crop (zoom in) to hide borders created by rotation or shifting.
    if (doShift || doRotate) {
        const maxOffset = Math.max(Math.abs(shiftX)/width, Math.abs(shiftY)/height);
        const angleAbs = Math.abs(angle);
        const rotZoom = Math.sin(angleAbs) + Math.cos(angleAbs);
        const paddingScale = Math.max(1.0, rotZoom) + maxOffset + 0.02;
        scaleX *= paddingScale;
        scaleY *= paddingScale;
    }

    // Transform from center
    ctxAttacked.translate(width / 2 + shiftX, height / 2 + shiftY);
    ctxAttacked.rotate(angle);
    ctxAttacked.scale(scaleX, scaleY);
    ctxAttacked.translate(-width / 2, -height / 2);
    
    ctxAttacked.drawImage(originalImage, 0, 0);
    ctxAttacked.restore();

    // Phase 2: Pixel-level modifications (Luminance blobs, High-freq noise)
    if (doBlobs || doNoise) {
        const imgData = ctxAttacked.getImageData(0, 0, width, height);
        const data = imgData.data;

        // Precompute macro blobs to disrupt aHash
        const blobs = [];
        if (doBlobs) {
            const numBlobs = 6 + Math.floor(Math.random() * 12);
            for(let i=0; i<numBlobs; i++){
                blobs.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    r: (0.15 + Math.random() * 0.5) * Math.min(width, height),
                    // blobs intensity up to +/- 50 luminance units
                    intensity: (Math.random() - 0.5) * 100 * intensityBlobs 
                });
            }
        }

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                let luminanceOffset = 0;

                // Apply blobs
                if (doBlobs) {
                    for(let b of blobs) {
                        const dx = x - b.x;
                        const dy = y - b.y;
                        const distSq = dx*dx + dy*dy;
                        const rSq = b.r*b.r;
                        if(distSq < rSq) {
                            // Smooth falloff using squared distance
                            const falloff = 1 - (distSq / rSq);
                            // Ease-in-out curve
                            const smooth = falloff * falloff * (3 - 2 * falloff);
                            luminanceOffset += b.intensity * smooth;
                        }
                    }
                }

                // Apply noise to disrupt dHash
                if (doNoise) {
                    // noise: max magnitude ~ 40 units
                    const noise = (Math.random() - 0.5) * 80 * intensityNoise;
                    luminanceOffset += noise;
                }

                if (luminanceOffset !== 0) {
                    data[idx] = Math.min(255, Math.max(0, data[idx] + luminanceOffset));
                    data[idx+1] = Math.min(255, Math.max(0, data[idx+1] + luminanceOffset));
                    data[idx+2] = Math.min(255, Math.max(0, data[idx+2] + luminanceOffset));
                }
            }
        }
        ctxAttacked.putImageData(imgData, 0, 0);
    }
    
    downloadBtn.disabled = false;

    // ── Evaluate scores ──────────────────────────────────────────────────────
    renderScores(evaluateAttack(canvasOriginal, canvasAttacked));
}

// ─── Score rendering ─────────────────────────────────────────────────────────

function renderScores(scores) {
    let panel = document.getElementById('scorePanel');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'scorePanel';
        panel.className = 'score-panel';
        // Insert after the Attacked canvas container
        const preview = document.querySelector('.preview');
        preview.appendChild(panel);
    }

    const rows = [
        { algo: 'aHash',    key: 'ahash',   label: 'aHash',   targetLabel: 'macro blobs' },
        { algo: 'dHash-H',  key: 'dhash_h', label: 'dHash horizontal', targetLabel: 'horiz noise/shift' },
        { algo: 'dHash-V',  key: 'dhash_v', label: 'dHash vertical', targetLabel: 'vert noise/shift' },
    ];

    const maxBits = 256; // hash_size=16 = 16 x 16 = 256 bits

    panel.innerHTML = `
        <h3 class="score-title">Hash Distance Scores</h3>
        <p class="score-subtitle">Hamming distance vs original (higher = more diverged)</p>
        <table class="score-table">
            <thead>
                <tr>
                    <th>Algorithm</th>
                    <th>Distance / 256</th>
                </tr>
            </thead>
            <tbody>
                ${rows.map(({ label, key, targetLabel }) => {
                    const dist = scores[key];
                    const pct  = (dist / maxBits * 100).toFixed(1);
                    const barPct = Math.min(100, pct);
                    return `
                    <tr>
                        <td>
                            <span class="algo-name">${label}</span>
                            <span class="algo-sub">${targetLabel}</span>
                        </td>
                        <td>
                            <div class="bar-wrap">
                                <div class="bar-fill" style="width:${barPct}%"></div>
                            </div>
                            <span class="dist-label">${dist} <span class="dist-pct">(${pct}%)</span></span>
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>
    `;
}

downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'attacked_image.jpg';
    link.href = canvasAttacked.toDataURL('image/jpeg', 0.80); // common for image editors
    link.click();
});
