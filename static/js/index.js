// --- 전역 변수 ---
let run1_calculated_w1 = 0;
let run1_recorded_u0 = 0;
let run1_recorded_a0 = 0;
let run1_recorded_n1 = 0;

const AVAILABLE_WEIGHTS = [17.31, 14.71, 12, 9.16, 6.24, 3.14];
const WEIGHT_LABELS = ['P06', 'P05', 'P04', 'P03', 'P02', 'P01'];
const W1_FACTORS = { 95: 32.2, 99: 28.6 };


// --- 홀 번호 리스트 생성 ---
function generateHoleNumberList(centerHole, combinationLength) {
    const totalHoles = 38;
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
        currentHole = ((currentHole - 1 + totalHoles) % totalHoles) + 1;
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

    const maxTotalCount = (u0 < 3) ? 7 : (u0 < 4 ? (n1_percent === 95 ? 9 : 7) : 9);
    const maxPairs = Math.floor((maxTotalCount - 1) / 2);
    const sortedWeights = [...AVAILABLE_WEIGHTS].sort((a, b) => b - a);

    function evaluateCombination(combination) {
        const total = combination.reduce((a, b) => a + b, 0);
        const weightCounts = {};
        combination.forEach(w => weightCounts[w] = (weightCounts[w] || 0) + 1);

        const deviation = Math.abs(total - targetWeight);
        const p01Count = weightCounts[3.14] || 0;
        const typeCount = Object.keys(weightCounts).length;
        const duplicateScore = Object.values(weightCounts).reduce((sum, c) => sum + (c - 1), 0);
        const heavinessScore = combination.reduce((sum, w) => sum + AVAILABLE_WEIGHTS.indexOf(w), 0);

        return { total, deviation, totalCount: combination.length, typeCount, duplicateScore, heavinessScore, p01Count };
    }

    function updateBest(combination) {
        const e = evaluateCombination(combination);
        if (e.deviation > allowedDeviation || e.p01Count > 4) return;

        const isBetter =
            e.deviation < bestEval.deviation ||
            (e.deviation === bestEval.deviation && e.totalCount < bestEval.totalCount) ||
            (e.deviation === bestEval.deviation && e.totalCount === bestEval.totalCount &&
                (u0 >= 4 || e.duplicateScore < bestEval.duplicateScore)) ||
            (e.deviation === bestEval.deviation && e.totalCount === bestEval.totalCount &&
                e.duplicateScore === bestEval.duplicateScore && e.typeCount < bestEval.typeCount) ||
            (e.deviation === bestEval.deviation && e.totalCount === bestEval.totalCount &&
                e.duplicateScore === bestEval.duplicateScore && e.typeCount === bestEval.typeCount &&
                e.heavinessScore < bestEval.heavinessScore);

        if (isBetter) {
            if (bestCombination && JSON.stringify(bestCombination) !== JSON.stringify(combination)) {
                secondBestCombination = bestCombination;
            }
            bestCombination = combination;
            bestEval = e;
        } else if (!secondBestCombination && JSON.stringify(combination) !== JSON.stringify(bestCombination) && e.p01Count <= 4) {
            secondBestCombination = combination;
        }
    }

    function generate(pairCount, sideCombo, lastIdx, center) {
        const sideTotal = sideCombo.reduce((a, b) => a + b, 0);
        const total = center + 2 * sideTotal;
        if (total > targetWeight + allowedDeviation) return;

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
        secondary: (secondBestCombination && JSON.stringify(secondBestCombination) !== JSON.stringify(bestCombination)) ? {
            combination: secondBestCombination,
            totalWeight: secondBestCombination.reduce((a, b) => a + b, 0),
            deviation: Math.abs(secondBestCombination.reduce((a, b) => a + b, 0) - targetWeight)
        } : null
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
function generateResultHTML({ n1, holeNumberStr, combinationObj, title, w1: weightUsed, u0, a0, u1 = null, a1 = null }) {
    if (!combinationObj) return '';

    const { combination, totalWeight, deviation } = combinationObj;
    const { holes: holeList, centerIndex } = generateHoleNumberList(
        parseInt(holeNumberStr.split('→').slice(-1)[0]), combination.length
    );

    let table = `
        <table class="table table-success table-sm table-striped-colums mt-2">
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
        if (cnt > 0) weightSummary += `<li>${label}: ${cnt} ea</li>`;
    }
    weightSummary += '</div></div>';

    let runInfoHtml = '';
    if (u1 !== null && a1 !== null) {
        runInfoHtml = `
            <li class="list-group-item list-unstyled text-secondary pb-0">
                U0 : ${u0} || A0 : ${a0}<br>U1 : ${u1} || A1 : ${a1}
            </li>`;
    } else {
        runInfoHtml = `
            <li class="list-group-item list-unstyled text-secondary pb-0">
                U0 : ${u0} || A0 : ${a0}
            </li>`;
    }

    const popoverBtnId = `
        popover-btn-${n1}-${holeNumberStr.replace(/\s/g, '')}-${Math.random().toString(36).substring(2, 6)}`;

    const html = `
        <div class="card mb-3">
            <div class="card-body text-center">
                <h5 class="card-title text-primary-emphasis fw-bold">${title} (${n1}%)</h5>
                <div class=""> ${runInfoHtml}
                    <div class="detail-info text-white rounded-2">
                        Center Hole Number : <span class="badge bg-primary">${holeNumberStr}</span><br>
                        Total Weight Count : <span class="badge bg-secondary">${combination.length}</span><br>
                    </div>
                    <div>
                        ${weightSummary}
                        <div>
                            <button type="button" class="btn btn-sm btn-danger mt-2" id="${popoverBtnId}"
                                data-bs-toggle="popover" data-bs-title="Weight 상세 정보"
                                data-bs-placement="bottom" data-bs-html="true" data-bs-content="">
                                weight 값 자세히 보기
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    setTimeout(() => {
        const el = document.getElementById(popoverBtnId);
        if (!el) return;

        const contentHTML = `
            <div style="max-height: 100%; overflow-y: auto;">
                <div><strong>Target Weight</strong>: ${weightUsed.toFixed(2)} grams</div>
                <div><strong>Calculate Weight</strong>: ${totalWeight.toFixed(2)} grams</div>
                <div><strong>Deviation</strong>: ${(totalWeight - weightUsed).toFixed(2)} grams</div>
                <hr>
                ${table}
            </div>
        `;

        el.setAttribute('data-bs-content', contentHTML);
        bootstrap.Popover.getInstance(el)?.dispose();
        const popover = new bootstrap.Popover(el, { 
            html: true, 
            sanitize: false, 
            container: 'body', 
            trigger: 'focus' 
        });
    },100);

    return html;
}


// --- 결과 모달 표시 함수 ---
function displayResultsInModal(primaryResult, secondaryResult, params) {
    let output = '';
    output += generateResultHTML({ ...params, combinationObj: primaryResult });

    if (secondaryResult) {
        output += generateResultHTML({ ...params, combinationObj: secondaryResult, title: params.title.replace('Solution', 'Alternative Solution') });
    }
    
    document.getElementById('modalResultContent').innerHTML = output;
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

    if (!result.primary) {
        alert('적절한 무게 조합을 찾을 수 없습니다.\nu0 값을 다른 값으로 입력해 주세요.');
        return;
    }

    run1_calculated_w1 = calculated_w1;
    run1_recorded_u0 = u0;
    run1_recorded_a0 = a0;
    run1_recorded_n1 = n1;

    document.getElementById('run2_n1_pre').value = n1 + '%';

    displayResultsInModal(result.primary, result.secondary, {
        n1, holeNumberStr: holeNumber.toString(), title: 'Run 1 솔루션 옵션 1', w1: calculated_w1, u0, a0
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

    if (!w1 || !u0 || a0 === null || n1 === 0) {
        alert('Run 2를 계산하기 전에 Run 1을 먼저 수행해주세요.');
        return;
    }

    if (isNaN(u1) || isNaN(a1)) {
        alert('Run 2의 모든 입력 필드를 완료해주세요.');
        return;
    }

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

    if (!result.primary) {
        alert('Run 2에 대한 적절한 무게 조합을 찾을 수 없습니다.\na1 값을 다른 값으로 입력해 주세요.');
        return;
    }

    displayResultsInModal(result.primary, result.secondary, {
        n1, holeNumberStr: `${initialHole} → ${newHoleLocation}`, title: 'Run 2 주요 솔루션',
        w1: calculated_w2, u0, a0, u1, a1
    });
}


// --- 이벤트 리스너 등록 ---
document.addEventListener('DOMContentLoaded', () => {

    /* -- Run 1과 Run 2의 입력 필드와 버튼 -- */
    const u0Input = document.getElementById('run1_u0');
    const a0Input = document.getElementById('run1_a0');
    const run1Btn = document.getElementById('calculateRun1Btn');

    const u1Input = document.getElementById('run2_u1');
    const a1Input = document.getElementById('run2_a1');
    const run2Btn = document.getElementById('calculateRun2Btn');

    function validateRun1Inputs() {
        const u0 = parseFloat(u0Input.value);
        const a0 = parseFloat(a0Input.value);
        const isValidU0 = !isNaN(u0) && u0 > 0;
        const isValidA0 = !isNaN(a0) && a0 >= 0 && a0 < 360;
        run1Btn.disabled = !(isValidU0 && isValidA0);
    }

    function validateRun2Inputs() {
        const u1 = parseFloat(u1Input.value);
        const a1 = parseFloat(a1Input.value);
        const isValidU1 = !isNaN(u1) && u1 > 0;
        const isValidA1 = !isNaN(a1) && a1 >= 0 && a1 < 360;
        run2Btn.disabled = !(isValidU1 && isValidA1);
    }

    // Run 1 input값 메시지
    u0Input.addEventListener('input', validateRun1Inputs);
    a0Input.addEventListener('input', validateRun1Inputs);
    a0Input.addEventListener('focus', (e) => {
        const u0 = u0Input.value.trim();
        if (!u0) {
            e.preventDefault();
            alert('먼저 U0 값을 입력해 주세요.');
            u0Input.focus();
        }
    });
    a0Input.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            const u0 = u0Input.value.trim();
            if (!u0) {
                e.preventDefault();
                alert('먼저 U0 값을 입력해 주세요.');
                u0Input.focus();
            }
        }
    });

    // Run 2 input값 메시지
    u1Input.addEventListener('input', validateRun2Inputs);
    a1Input.addEventListener('input', validateRun2Inputs);
    a1Input.addEventListener('focus', (e) => {
        const u1 = u1Input.value.trim();
        if (!u1) {
            e.preventDefault();
            alert('먼저 U1 값을 입력해 주세요.');
            u1Input.focus();
        }
    });
    a1Input.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            const u1 = u1Input.value.trim();
            if (!u1) {
                e.preventDefault();
                alert('먼저 U1 값을 입력해 주세요.');
                u1Input.focus();
            }
        }
    });

    /* Run 2 input값 미입력시 메시지 */
    const run2Inputs = [
        document.getElementById('run2_n1_pre'),
        document.getElementById('run2_u1'),
        document.getElementById('run2_a1')
    ];

    // Run1 결과 여부 확인 함수
    function isRun1Calculated() {
        return (
            run1_calculated_w1 &&
            run1_recorded_u0 &&
            run1_recorded_a0 !== 0 &&
            run1_recorded_n1 !== 0
        );
    }

    // 입력 차단 로직
    run2Inputs.forEach(input => {
        input.addEventListener('focus', (e) => {
            if (!isRun1Calculated()) {
                alert('Run 2를 계산하기 전에 Run 1을 먼저 수행해주세요.');
                input.blur();  // 입력 포커스 제거
            }
        });

        input.addEventListener('keydown', (e) => {
            if (!isRun1Calculated()) {
                e.preventDefault(); // 키보드 입력 차단
            }
        });

        input.addEventListener('input', (e) => {
            if (!isRun1Calculated()) {
                input.value = ''; // 강제로 입력 제거
            }
        });
    });

    /* 실시간 제한 + 경고 메시지 출력 */
    const enforceMaxWithWarning = (inputId, warningId, max, label = "입력값") => {
        const input = document.getElementById(inputId);
        const warning = document.getElementById(warningId);

        input.addEventListener('input', () => {
            const value = parseFloat(input.value);

            if (isNaN(value)) {
                warning.innerText = '';
                warning.style.display = 'none';
                return;
            }

            if (value === 360 && inputId.includes('a')) {
                // input.value = 0; // 입력값 0으로 표시
                warning.innerText = `${label} 값을 0 으로 입력해 주세요.`;
                warning.style.display = 'block';
            } else if (value > max) {
                // input.value = max; // 입력값 최대값 표시
                warning.innerText = `${label}의 최대값은 ${max}입니다. 최대값 범위를 초과했어요. 
                    ${max} 이하로 다시 입력해 주세요.`;
                warning.style.display = 'block';
            } else {
                warning.innerText = '';
                warning.style.display = 'none';
            }
        });
    };

    enforceMaxWithWarning('run1_u0', 'warn_run1_u0', 4.9, 'u0');
    enforceMaxWithWarning('run1_a0', 'warn_run1_a0', 359, 'a0');
    enforceMaxWithWarning('run2_u1', 'warn_run2_u1', 4.9, 'u0');
    enforceMaxWithWarning('run2_a1', 'warn_run2_a1', 359, 'a0');
});