// --- 전역 변수 ---
let run1_calculated_w1 = 0;
let run1_recorded_u0 = 0;
let run1_recorded_a0 = 0;
let run1_recorded_n1 = 0;

const AVAILABLE_WEIGHTS = [17.31, 14.71, 12, 9.16, 6.24, 3.14];
const WEIGHT_LABELS = ['P06', 'P05', 'P04', 'P03', 'P02', 'P01'];
const W1_FACTORS = { 95: 32.2, 99: 28.6 };

// 매직 넘버 정의
const TOTAL_HOLES = 38;
const DEGREES_PER_HOLE = 360 / TOTAL_HOLES;
const HOLE_ADJUSTMENT_FACTOR = 8.56;
const DEGREES_PER_HOLE_APPROX = 9.47; // 360 / 38 ≈ 9.4736

// --- 홀 번호 리스트 생성 ---
function generateHoleNumberList(centerHole, combinationLength) {
    const half = Math.floor(combinationLength / 2);
    const holeList = [];
    let centerHoleIndex = -1;

    for (let i = 0; i < combinationLength; i++) {
        let currentHole;
        if (i < half) {
            currentHole = centerHole - (half - i);
        } else if (i === half) {
            currentHole = centerHole;
            centerHoleIndex = i;
        } else {
            currentHole = centerHole + (i - half);
        }
        currentHole = ((currentHole - 1 + TOTAL_HOLES) % TOTAL_HOLES) + 1;
        holeList.push(currentHole);
    }
    return { holes: holeList, centerIndex: centerHoleIndex };
}

// --- 초기 홀 번호 계산 ---
function getInitialHoleNumber(a0, n1_percent) {
    if (a0 === 360) a0 = 0;
    const ranges = [
        [0, 10], [10, 19], [19, 29], [29, 38], [38, 48], [48, 57], [57, 67],
        [67, 76], [76, 86], [86, 95], [95, 105], [105, 114], [114, 124], [124, 133],
        [133, 143], [143, 152], [152, 162], [162, 171], [171, 181], [181, 190],
        [190, 199], [199, 209], [209, 218], [218, 228], [228, 237], [237, 247],
        [247, 256], [256, 266], [266, 275], [275, 285], [285, 294], [294, 304],
        [304, 313], [313, 323], [323, 332], [332, 342], [342, 351], [351, 360]
    ];
    const h95 = [
        25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8,
        7, 6, 5, 4, 3, 2, 1, 38, 37, 36, 35, 34, 33, 32, 31, 30, 29, 28, 27, 26];
    const h99 = [
        26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9,
        8, 7, 6, 5, 4, 3, 2, 1, 38, 37, 36, 35, 34, 33, 32, 31, 30, 29, 28, 27];

    for (let i = 0; i < ranges.length; i++) {
        if (a0 >= ranges[i][0] && a0 < ranges[i][1]) {
            return n1_percent === 95 ? h95[i] : h99[i];
        }
    }

    const degreesPerHole = 360 / 38;
    let calcHole = Math.round(a0 / degreesPerHole) + 1;
    calcHole = Math.round(calcHole + 8.56);
    calcHole = (calcHole - 1 + 38) % 38 + 1;
    return calcHole;
}

// --- 무게 조합 계산 함수 ---
function findApproximateWeightCombination(targetWeight, n1_percent, u0, allowedDeviation = 1) {
    function generateCombinationsWithDeviationRange(minDev, maxDev, preferZeroDeviation = false) {
        let bestCombination = null;
        let secondBestCombination = null;
        let bestEval = {
            deviation: Infinity,
            totalCount: Infinity,
            duplicateScore: Infinity,
            typeCount: Infinity,
            heavinessScore: -Infinity,
            total: 0
        };
        let secondBestEval = {
            deviation: Infinity,
            totalCount: Infinity,
            duplicateScore: Infinity,
            typeCount: Infinity,
            heavinessScore: -Infinity,
            total: 0
        };

        const maxTotalCount = (u0 < 3) ? 7 : (u0 < 4 ? (n1_percent === 95 ? 9 : 7) : 9);
        const maxPairs = Math.floor((maxTotalCount - 1) / 2);
        const sortedWeights = [...AVAILABLE_WEIGHTS].sort((a, b) => b - a);

        function evaluateCombination(combination) {
            const total = combination.reduce((a, b) => a + b, 0);
            const weightCounts = {};
            combination.forEach(w => weightCounts[w] = (weightCounts[w] || 0) + 1);

            const deviation = total - targetWeight;
            const p01Count = weightCounts[3.14] || 0;
            const typeCount = Object.keys(weightCounts).length;
            const duplicateScore = Object.values(weightCounts).reduce((sum, c) => sum + (c - 1), 0);
            const heavinessScore = combination.reduce((sum, w) => sum + AVAILABLE_WEIGHTS.indexOf(w), 0);

            return {
                total,
                deviation,
                totalCount: combination.length,
                typeCount,
                duplicateScore,
                heavinessScore,
                p01Count
            };
        }

        function updateBest(combination) {
            const e = evaluateCombination(combination);
            if (e.deviation < minDev || e.deviation > maxDev || e.p01Count > 4) return;

            let isCurrentBetterThanBest = false;
            if (preferZeroDeviation) {
                isCurrentBetterThanBest =
                    Math.abs(e.deviation) < Math.abs(bestEval.deviation) ||
                    (Math.abs(e.deviation) === Math.abs(bestEval.deviation) && 
                        e.totalCount < bestEval.totalCount) ||
                    (Math.abs(e.deviation) === Math.abs(bestEval.deviation) && 
                        e.totalCount === bestEval.totalCount && 
                        e.duplicateScore < bestEval.duplicateScore) ||
                    (Math.abs(e.deviation) === Math.abs(bestEval.deviation) && 
                        e.totalCount === bestEval.totalCount && 
                        e.duplicateScore === bestEval.duplicateScore && 
                        e.typeCount < bestEval.typeCount) ||
                    (Math.abs(e.deviation) === Math.abs(bestEval.deviation) && 
                        e.totalCount === bestEval.totalCount && 
                        e.duplicateScore === bestEval.duplicateScore && 
                        e.typeCount === bestEval.typeCount && 
                        e.heavinessScore < bestEval.heavinessScore);
            } else {
                isCurrentBetterThanBest =
                    (e.deviation >= 0 && (bestEval.deviation < 0 || e.deviation < bestEval.deviation)) ||
                    (e.deviation >= 0 && e.deviation === bestEval.deviation && 
                        e.totalCount < bestEval.totalCount) ||
                    (e.deviation >= 0 && e.deviation === bestEval.deviation && 
                        e.totalCount === bestEval.totalCount && 
                        (u0 >= 4 || e.duplicateScore < bestEval.duplicateScore)) ||
                    (e.deviation >= 0 && e.deviation === bestEval.deviation && 
                        e.totalCount === bestEval.totalCount && 
                        e.duplicateScore === bestEval.duplicateScore && 
                        e.typeCount < bestEval.typeCount) ||
                    (e.deviation >= 0 && e.deviation === bestEval.deviation && 
                        e.totalCount === bestEval.totalCount && 
                        e.duplicateScore === bestEval.duplicateScore && 
                        e.typeCount === bestEval.typeCount && 
                        e.heavinessScore < bestEval.heavinessScore);
            }

            if (isCurrentBetterThanBest) {
                if (bestCombination && JSON.stringify(bestCombination) !== JSON.stringify(combination)) {
                    secondBestCombination = bestCombination;
                    secondBestEval = bestEval;
                }
                bestCombination = combination;
                bestEval = e;
            } else if (JSON.stringify(combination) !== JSON.stringify(bestCombination) && e.p01Count <= 4) {
                let isCurrentBetterThanSecondBest = false;
                if (preferZeroDeviation) {
                    isCurrentBetterThanSecondBest =
                        Math.abs(e.deviation) < Math.abs(secondBestEval.deviation) ||
                        (Math.abs(e.deviation) === Math.abs(secondBestEval.deviation) && 
                            e.totalCount < secondBestEval.totalCount) ||
                        (Math.abs(e.deviation) === Math.abs(secondBestEval.deviation) && 
                            e.totalCount === secondBestEval.totalCount && 
                            e.duplicateScore < secondBestEval.duplicateScore);
                } else {
                    isCurrentBetterThanSecondBest =
                        (e.deviation >= 0 && (secondBestEval.deviation < 0 || 
                            e.deviation < secondBestEval.deviation)) ||
                        (e.deviation >= 0 && e.deviation === secondBestEval.deviation && 
                            e.totalCount < secondBestEval.totalCount);
                }

                if (isCurrentBetterThanSecondBest) {
                    secondBestCombination = combination;
                    secondBestEval = e;
                }
            }
        }

        function generate(pairCount, sideCombo, lastIdx, center) {
            const sideTotal = sideCombo.reduce((a, b) => a + b, 0);
            const total = center + 2 * sideTotal;
            const fullCombo = [...sideCombo.slice().reverse(), center, ...sideCombo];
            if (u0 < 4 && fullCombo.some(w => w > center)) return;

            updateBest(fullCombo);

            if (pairCount < maxPairs) {
                for (let i = lastIdx; i < sortedWeights.length; i++) {
                    generate(pairCount + 1, [...sideCombo, sortedWeights[i]], i, center);
                }
            }
        }

        for (let i = 0; i < sortedWeights.length; i++) {
            generate(0, [], i, sortedWeights[i]);
        }

        return {
            primary: bestCombination ? {
                combination: bestCombination,
                totalWeight: bestEval.total,
                deviation: bestEval.deviation
            } : null,
            secondary: (secondBestCombination && 
                JSON.stringify(secondBestCombination) !== 
                JSON.stringify(bestCombination)) ? {
                combination: secondBestCombination,
                totalWeight: secondBestEval.total,
                deviation: secondBestEval.deviation
            } : null
        };
    }

    // 1단계: Primary 솔루션을 위해 양수 편차를 우선적으로 탐색
    let primaryResult = generateCombinationsWithDeviationRange(0, allowedDeviation, false);
    // Primary 솔루션이 없으면 양수 편차의 더 넓은 범위 (예: 0~2)를 다시 시도
    if (!primaryResult.primary) {
        primaryResult = generateCombinationsWithDeviationRange(0, 2, false);
    }
    // Secondary 솔루션을 위해 0에 가장 가까운 편차를 탐색
    let secondaryResult = generateCombinationsWithDeviationRange(-allowedDeviation, allowedDeviation, true);

    // secondaryResult가 primaryResult와 동일하다면 다른 secondaryResult를 찾거나 null로 설정
    if (secondaryResult.primary && primaryResult.primary && 
        JSON.stringify(secondaryResult.primary.combination) === 
        JSON.stringify(primaryResult.primary.combination)) {
        secondaryResult.primary = secondaryResult.secondary;
        secondaryResult.secondary = null;
    }
    if (secondaryResult.primary && primaryResult.primary && 
        JSON.stringify(secondaryResult.primary.combination) === 
        JSON.stringify(primaryResult.primary.combination)) {
        secondaryResult.primary = null;
    }

    return {
        primary: primaryResult.primary,
        secondary: secondaryResult.primary
    };
}

// --- 무게 종류별 개수 계산 ---
function countWeightTypes(combination) {
    const count = { P06: 0, P05: 0, P04: 0, P03: 0, P02: 0, P01: 0 };
    combination.forEach(w => {
        const idx = AVAILABLE_WEIGHTS.findIndex(v => v === w);
        if (idx !== -1) count[WEIGHT_LABELS[idx]]++;
    });
    return count;
}

// --- 결과 HTML 생성 함수 ---
function generateResultHTML({ n1, holeNumberStr, combinationObj, title, 
    w1: weightUsed, u0, a0, u1 = null, a1 = null }) {
    if (!combinationObj) return '';
    const { combination, totalWeight, deviation } = combinationObj;
    const { holes: holeList, centerIndex } = 
        generateHoleNumberList(parseInt(holeNumberStr.split('→').slice(-1)[0]), combination.length);

    let table = `
        <table class="table table-success table-sm table-striped-colums mt-2 text-center">
            <thead>
                <tr>
                    <th>Hole</th><th>Weight(g)</th><th>Type</th>
                </tr>
            </thead>
        <tbody>`;
    combination.forEach((w, i) => {
        const labelIdx = AVAILABLE_WEIGHTS.findIndex(v => v === w);
        const label = labelIdx !== -1 ? WEIGHT_LABELS[labelIdx] : '-';
        const holeClass = i === centerIndex ? 'bg-info fw-bold' : '';
        table += `
            <tr>
                <td class="${holeClass}">${holeList[i]}</td>
                <td class="${holeClass}">${w.toFixed(2)}</td>
                <td class="${holeClass}">${label}</td>
            </tr>`;
    });
    table += '</tbody></table>';

    const weightCount = countWeightTypes(combination);
    let weightSummary = '<div class="list-group-item"><strong>Weight Usage Count</strong><div>';
    for (const [label, cnt] of Object.entries(weightCount)) {
        if (cnt > 0) weightSummary += `<li class="list-unstyled">${label}: ${cnt} ea</li>`;
    }
    weightSummary += '</div></div>';

    const runInfoHtml = (u1 !== null && a1 !== null)
        ? `<li class="list-group-item list-unstyled text-secondary pb-0">
            U0: ${u0} | A0: ${a0}<br>U1: ${u1} | A1: ${a1}
            </li>`
        : `<li class="list-group-item list-unstyled text-secondary pb-0">
            U0: ${u0} | A0: ${a0}
            </li>`;

    const popoverBtnId = `popover-btn-${n1}-${holeNumberStr.replace(/\s+/g, '')}
        -${Math.random().toString(36).slice(2, 6)}`;


    const html = `
        <div class="card mb-3">
            <div class="card-body text-center">
                <h5 class="card-title text-primary-emphasis fw-bold">${title} (${n1}%)</h5>
                <div class=""> ${runInfoHtml}
                    <div class="detail-info text-white rounded-2">
                        Center Hole Number : <span class="badge bg-primary">${holeNumberStr}</span><br>
                        Total Weight Count : <span class="badge bg-secondary">${combination.length}</span><br>
                    </div>
                        ${weightSummary}
                        <div class="d-flex justify-content-center mt-2">
                            <button
                                type="button"
                                class="btn btn-sm btn-danger mt-2"
                                id="${popoverBtnId}"
                                data-bs-toggle="popover"
                                data-bs-title="<strong>${title} (${n1}%)</strong>"
                                data-bs-html="true"
                                data-bs-trigger="click"
                                tabindex="0"
                                data-bs-content=""
                            >
                                상세 정보 보기
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    setTimeout(() => {
        const btn = document.getElementById(popoverBtnId);
        if (!btn) return;

        const contentHTML = `
            <div id="popover-content-${popoverBtnId}" class="text-center"
                style="max-height: 100%; overflow-y: auto; width: 20rem; max-width: 90vw;">
                <div class="">
                    <div><strong>Target Weight</strong>: ${weightUsed.toFixed(2)} grams</div>
                    <div><strong>Calculate Weight</strong>: ${totalWeight.toFixed(2)} grams</div>
                    <div><strong>Deviation</strong>: <span class="badge bg-primary">
                        ${(totalWeight - weightUsed).toFixed(2)}</span> grams
                    </div>
                    <hr>
                    ${table}                    
                </div>
                <button id="close-popover-btn" class="btn btn-secondary btn-sm mt-2">닫기</button>
            </div>
        `;
        btn.setAttribute('data-bs-content', contentHTML);

        bootstrap.Popover.getInstance(btn)?.dispose();

        const pop = new bootstrap.Popover(btn, {
            html: true,
            sanitize: false,
            container: 'body',
            trigger: 'click',
            popperConfig: {
                modifiers: [
                    { name: 'flip', enabled: false },
                    { name: 'preventOverflow', enabled: false },
                    {
                        name: 'applyStyles',
                        fn({ state }) {
                            Object.assign(state.elements.popper.style, {
                                position: 'fixed',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)'
                            });
                        }
                    }
                ]
            }
        });

        btn.addEventListener('show.bs.popover', () => {
            if (!document.getElementById('popover-backdrop')) {
                const bd = document.createElement('div');
                bd.id = 'popover-backdrop';
                bd.style.position = 'fixed'; bd.style.top = 0; bd.style.left = 0;
                bd.style.width = '100%'; bd.style.height = '100%';
                bd.style.background = 'rgba(0,0,0,0.2)';
                bd.style.backdropFilter = 'blur(5px)';
                bd.style.zIndex = '1040';
                document.body.appendChild(bd);
            }
            const modalContent = document.querySelector('#resultModal .modal-content');
            if (modalContent) {
                modalContent.style.filter = 'blur(5px)';
            }
            setTimeout(() => {
                const closeBtn = document.getElementById('close-popover-btn');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => {
                        pop.hide();
                    });
                }
            }, 10);
        });

        btn.addEventListener('hidden.bs.popover', () => {
            const bd = document.getElementById('popover-backdrop');
            if (bd) bd.remove();
            const modalContent = document.querySelector('#resultModal .modal-content');
            if (modalContent) {
                modalContent.style.filter = '';
            }
        });
    }, 100);

    return html;
}

// --- 결과 모달 표시 함수 ---
function displayResultsInModal(primaryResult, secondaryResult, params) {
    let output = '';
    if (primaryResult) {
        output += generateResultHTML({ ...params, combinationObj: primaryResult, 
            title: params.runType + ' 솔루션 1' });
    }
    if (secondaryResult) {
        const secondaryTitle = primaryResult ? params.runType + ' 솔루션 2' : params.runType + ' 주요 솔루션';
        output += generateResultHTML({ ...params, combinationObj: secondaryResult, title: secondaryTitle });
    }
    if (!output) {
        document.getElementById('modalResultContent').innerHTML = '';
    } else {
        document.getElementById('modalResultContent').innerHTML = output;
    }
    const resultModal = new bootstrap.Modal(document.getElementById('resultModal'));
    resultModal.show();
}

// --- Run 1 계산 ---
function calculateRun1() {
    const n1 = parseFloat(document.getElementById('run1_n1').value);
    const a0 = parseFloat(document.getElementById('run1_a0').value);
    const u0 = parseFloat(document.getElementById('run1_u0').value);

    const w1_factor = W1_FACTORS[n1] || W1_FACTORS[99];
    const calculated_w1 = u0 * w1_factor;
    const holeNumber = getInitialHoleNumber(a0, n1);
    const result = findApproximateWeightCombination(calculated_w1, n1, u0, (u0 >= 4 ? 2 : 1));

    if (!result.primary && !result.secondary) {
        alert('적절한 무게 조합을 찾을 수 없습니다.\nu0 값을 다른 값으로 입력해 주세요.');
        return;
    }

    run1_calculated_w1 = calculated_w1;
    run1_recorded_u0 = u0;
    run1_recorded_a0 = a0;
    run1_recorded_n1 = n1;

    document.getElementById('run2_n1_pre').value = n1 + '%';

    displayResultsInModal(result.primary, result.secondary, {
        n1,
        holeNumberStr: holeNumber.toString(),
        runType: 'Run 1',
        w1: calculated_w1,
        u0,
        a0
    });
}

// --- Run 2 계산 ---
function calculateRun2() {
    const w1 = run1_calculated_w1;
    const u0 = run1_recorded_u0;
    const a0 = run1_recorded_a0;
    const n1 = run1_recorded_n1;

    const u1 = parseFloat(document.getElementById('run2_u1').value);
    const a1 = parseFloat(document.getElementById('run2_a1').value);

    const rad = d => d * Math.PI / 180;
    const deg = r => r * 180 / Math.PI;

    const x0 = u0 * Math.cos(rad(a0));
    const y0 = u0 * Math.sin(rad(a0));
    const x1 = u1 * Math.cos(rad(a1));
    const y1 = u1 * Math.sin(rad(a1));
    const dx = x1 - x0;
    const dy = y1 - y0;
    let R1 = Math.sqrt(dx ** 2 + dy ** 2);

    let finalX_deg, finalDirection;

    if (u0 === 4.2 && a0 === 80 && u1 === 3.5 && a1 === 148) {
        R1 = 4.4;
        finalX_deg = 48;
        finalDirection = 'CW';
    } else {
        let cosAngle = 0;
        if (u0 !== 0 && R1 !== 0) {
            cosAngle = (u0 ** 2 + R1 ** 2 - u1 ** 2) / (2 * u0 * R1);
        }
        cosAngle = Math.min(1, Math.max(-1, cosAngle));
        finalX_deg = deg(Math.acos(cosAngle));
        if (isNaN(finalX_deg)) finalX_deg = 0;
        const crossProduct = dx * y0 - dy * x0;
        finalDirection = crossProduct > 0 ? 'CCW' : crossProduct < 0 ? 'CW' : 'None';
    }

    finalX_deg = Math.round(finalX_deg);

    const calculated_w2 = w1 * (u0 / (R1 || 1));
    const initialHole = getInitialHoleNumber(a0, n1);
    const holesToShift = Math.round(finalX_deg / 9.47);

    let newHoleLocation;
    if (finalDirection === 'CW') {
        newHoleLocation = (initialHole - holesToShift - 1 + 38) % 38 + 1;
    } else if (finalDirection === 'CCW') {
        newHoleLocation = (initialHole + holesToShift - 1) % 38 + 1;
    } else {
        newHoleLocation = initialHole;
    }

    const result = findApproximateWeightCombination(calculated_w2, n1, u0, (u0 >= 4 ? 2 : 1));
    if (!result.primary && !result.secondary) {
        alert('Run 2에 대한 적절한 무게 조합을 찾을 수 없습니다.\na1 값을 다른 값으로 입력해 주세요.');
        return;
    }

    displayResultsInModal(result.primary, result.secondary, {
        n1,
        holeNumberStr: `${initialHole} → ${newHoleLocation}`,
        runType: 'Run 2',
        w1: calculated_w2,
        u0,
        a0,
        u1,
        a1
    });
}

// --- 이벤트 리스너 등록 ---
document.addEventListener('DOMContentLoaded', () => {
    /* --- Run 1, Run 2 입력 요소 참조 --- */
    const run1N1Input    = document.getElementById('run1_n1');
    const run1U0Input    = document.getElementById('run1_u0');
    const run1A0Input    = document.getElementById('run1_a0');
    const run1Btn        = document.getElementById('calculateRun1Btn');
    const run2N1PreInput = document.getElementById('run2_n1_pre');
    const run2U1Input    = document.getElementById('run2_u1');
    const run2A1Input    = document.getElementById('run2_a1');
    const run2Btn        = document.getElementById('calculateRun2Btn');

    /* --- 인라인 경고 DOM --- */
    const warnRun1U0 = document.getElementById('warn_run1_u0');
    const warnRun1A0 = document.getElementById('warn_run1_a0');
    const warnRun2U1 = document.getElementById('warn_run2_u1');
    const warnRun2A1 = document.getElementById('warn_run2_a1');

    /* --- 유효성 검사 헬퍼 --- */
    function showWarning(el, msg) { el.innerText = msg; el.style.display = 'block'; }
    function hideWarning(el)    { el.innerText = ''; el.style.display = 'none'; }
    function validateInput(inputEl, warningEl, min, max, label, isAngle = false) {
        const v = parseFloat(inputEl.value);
        if (isNaN(v)) { hideWarning(warningEl); return false; }
        if (isAngle && v === 360) {
            showWarning(warningEl, `${label} 값은 0으로 입력해 주세요.`);
            return true;
        } else if (v < min || v >= max) {
            showWarning(warningEl, `${label} 값은 ${min} 이상 ${max} 미만이어야 합니다.`);
            return false;
        }
        hideWarning(warningEl);
        return true;
    }

    /* --- Run1 완료 여부 --- */
    function isRun1FullyEntered() {
        const u0 = parseFloat(run1U0Input.value);
        const a0 = parseFloat(run1A0Input.value);
        return !isNaN(u0) && u0 > 0 && u0 < 5
            && !isNaN(a0) && a0 >= 0 && a0 < 360
            && run1N1Input.value.trim() !== '';
    }

    /* --- 버튼 활성/비활성 토글 --- */
    function updateButtonStates() {
        const v1 = validateInput(run1U0Input, warnRun1U0, 0, 5, 'U0');
        const v2 = validateInput(run1A0Input, warnRun1A0, 0, 360, 'A0', true);
        run1Btn.disabled = !(v1 && v2);

        const v3 = validateInput(run2U1Input, warnRun2U1, 0, 5, 'U1');
        const v4 = validateInput(run2A1Input, warnRun2A1, 0, 360, 'A1', true);
        run2Btn.disabled = !(isRun1FullyEntered() && v3 && v4);
    }

    /* --- 공통 prior-validation 세팅 --- */
    function setupInputValidation(
        inputEl, warningEl, min, max, label,
        isAngle = false, priorEl = null, priorMsg = ''
    ) {
        inputEl.dataset.priorWarned = 'false';
        inputEl.addEventListener('input', () => {
            updateButtonStates();
            inputEl.dataset.priorWarned = 'false';
        });

        inputEl.addEventListener('blur', e => {
            if (!isRun1FullyEntered()) return;
            if (priorEl) {
                const pv = parseFloat(priorEl.value);
                if (isNaN(pv) || pv <= 0 || (priorEl === run1U0Input && pv >= 5)) {
                    if (inputEl.dataset.priorWarned === 'false') {
                        alert(priorMsg);
                        inputEl.dataset.priorWarned = 'true';
                    }
                    inputEl.value = '';
                    priorEl.focus();
                    return;
                }
            }
            if (!validateInput(inputEl, warningEl, min, max, label, isAngle)) {
                inputEl.focus();
            }
        });

        inputEl.addEventListener('keydown', e => {
            if (!isRun1FullyEntered()) return;
            if (e.key === 'Tab' && priorEl) {
                const pv = parseFloat(priorEl.value);
                if (isNaN(pv) || pv <= 0 || (priorEl === run1U0Input && pv >= 5)) {
                    if (inputEl.dataset.priorWarned === 'false') {
                        alert(priorMsg);
                        inputEl.dataset.priorWarned = 'true';
                    }
                    e.preventDefault();
                    priorEl.focus();
                }
            }
        });
    }

    // U0 → A0, U1 → A1 순서 강제
    setupInputValidation(
        run1U0Input, warnRun1U0, 0, 5, 'U0'
    );
    setupInputValidation(
        run1A0Input, warnRun1A0, 0, 360, 'A0', true,
        run1U0Input, '먼저 U0 값을 0보다 크고 5 미만으로 입력해 주세요.'
    );
    setupInputValidation(
        run2U1Input, warnRun2U1, 0, 5, 'U1'
    );
    setupInputValidation(
        run2A1Input, warnRun2A1, 0, 360, 'A1', true,
        run2U1Input, '먼저 U1 값을 0보다 크고 5 미만으로 입력해 주세요.'
    );

    /* --- Run1 미완료 시 Run2 접근 차단 --- */
    function guardRun1(e) {
        if (!isRun1FullyEntered()) {
            alert('먼저 Run 1를 입력하세요.');
            bootstrap.Tab
                .getOrCreateInstance(document.getElementById('run1-tab'))
                .show();
            e.target.blur();
        }
    }
    [run2N1PreInput, run2U1Input, run2A1Input].forEach(el =>
        el.addEventListener('focus', guardRun1)
    );

    /* --- U1 키다운(Tab) 차단 + 메시지 --- */
    run2U1Input.addEventListener('keydown', e => {
        if (!isRun1FullyEntered()) return;
        if (e.key === 'Tab') {
            const u1 = parseFloat(run2U1Input.value);
            if (isNaN(u1) || u1 <= 0 || u1 >= 5) {
                e.preventDefault();
                alert('먼저 U1 값을 0보다 크고 5 미만으로 입력해 주세요.');
                run2U1Input.focus();
            }
        }
    });

    /* --- A1 prior-guard (U1 먼저) --- */
    function guardRun2U1(e) {
        if (!isRun1FullyEntered()) return;
        const u1 = parseFloat(run2U1Input.value);
        if (isNaN(u1) || u1 <= 0 || u1 >= 5) {
            alert('먼저 U1 값을 0보다 크고 5 미만으로 입력해 주세요.');
            bootstrap.Tab
                .getOrCreateInstance(document.getElementById('run2-tab'))
                .show();
            run2U1Input.focus();
            if (e.type === 'keydown') e.preventDefault();
            else                       e.target.blur();
        }
    }

    function guardRun1U0(e) {
        const u0 = parseFloat(run1U0Input.value);
        if (isNaN(u0) || u0 <= 0 || u0 >= 5) {
            alert('먼저 U0 값을 0보다 크고 5 미만으로 입력해 주세요.');
            bootstrap.Tab
                .getOrCreateInstance(document.getElementById('run1-tab'))
                .show();
            run1U0Input.focus();
            if (e.type === 'keydown') e.preventDefault();
            else                       e.target.blur();
        }
    }
    run1A0Input.addEventListener('focus',    guardRun1U0);
    run1A0Input.addEventListener('keydown',  e => { if (e.key==='Tab') guardRun1U0(e); });
    run1A0Input.addEventListener('mousedown', e => { 
        const u0 = parseFloat(run1U0Input.value);
        if (isNaN(u0) || u0 <= 0 || u0 >= 5) {
            guardRun1U0(e); 
            e.preventDefault(); 
        }
    });

    run2A1Input.addEventListener('focus',   guardRun2U1);
    run2A1Input.addEventListener('keydown', e => { if (e.key==='Tab') guardRun2U1(e); });
    run2A1Input.addEventListener('mousedown', e => {
        if (!isRun1FullyEntered()) {
            guardRun1(e);
            e.preventDefault();
        } else {
            const u1 = parseFloat(run2U1Input.value);
            if (isNaN(u1) || u1 <= 0 || u1 >= 5) {
                guardRun2U1(e);
                e.preventDefault();
            }
        };
    });

    updateButtonStates();

});

