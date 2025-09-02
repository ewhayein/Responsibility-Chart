
import { GoogleGenAI, Type } from "@google/genai";

// Declare libraries loaded from script tags.
declare const mermaid: any;

// --- DOM Element Selectors ---
// Visual Chart Page
const textInputVisual = document.getElementById('text-input-visual') as HTMLTextAreaElement;
const generateBtnVisual = document.getElementById('generate-btn-visual') as HTMLButtonElement;
const saveBtnSvg = document.getElementById('save-btn-svg') as HTMLButtonElement;
const chartOutputContainer = document.getElementById('chart-output-container') as HTMLDivElement;
const chartOutput = document.getElementById('chart-output') as HTMLDivElement;
const loader = document.getElementById('loader') as HTMLDivElement;

// Text Chart Page
const fileDropZoneDoc = document.getElementById('file-drop-zone-doc') as HTMLDivElement;
const fileInputDoc = document.getElementById('file-input-doc') as HTMLInputElement;
const fileNameDoc = document.getElementById('file-name-doc') as HTMLSpanElement;
const generateBtnDoc = document.getElementById('generate-btn-doc') as HTMLButtonElement;
const saveBtnTxt = document.getElementById('save-btn-txt') as HTMLButtonElement;
const docOutput = document.getElementById('doc-output') as HTMLDivElement;
const loaderDoc = document.getElementById('loader-doc') as HTMLDivElement;
let selectedFile: File | null = null;

// Dashboard Page
const projectSelector = document.getElementById('project-selector') as HTMLSelectElement;
const progressBar = document.getElementById('progress-bar') as HTMLDivElement;
const progressPercent = document.getElementById('progress-percent') as HTMLSpanElement;
const progressCardTitle = document.getElementById('progress-card-title') as HTMLHeadingElement;

// Security Page & Modal
const securityAlertTableBody = document.getElementById('security-alert-table-body');
const alertModal = document.getElementById('security-alert-modal') as HTMLDivElement;
const modalCloseBtn = document.getElementById('modal-close-btn') as HTMLButtonElement;
const modalOverlay = document.querySelector('.modal-overlay') as HTMLDivElement;
const modalAlertDetails = document.getElementById('modal-alert-details') as HTMLDivElement;
const modalLoader = document.getElementById('modal-loader') as HTMLDivElement;
const modalTitle = document.getElementById('modal-title') as HTMLHeadingElement;

// My Page
const renewAuthBtn = document.getElementById('renew-auth-btn');

// Dummy data for project progress
const projectProgressData: { [key: string]: number } = {
    '내부통제 시스템 고도화': 75,
    '차세대 AI 엔진 개발': 40,
    '데이터 파이프라인 구축': 90
};


/**
 * Handles navigation between pages.
 * @param pageId The ID of the page to show (e.g., 'dashboard').
 */
function navigateTo(pageId: string) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(page => {
    (page as HTMLElement).classList.remove('active');
  });

  // Show the target page
  const targetPage = document.getElementById(`page-${pageId}`);
  if (targetPage) {
    targetPage.classList.add('active');
  }

  // Update active state on nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.getAttribute('data-target') === pageId);
  });
}

/**
 * Sets the loading state for a specific UI section.
 * @param isLoading Whether to show or hide the loader.
 * @param loaderElement The loader element to control.
 * @param message Optional message to display.
 */
function setLoading(isLoading: boolean, loaderElement: HTMLElement, message: string = 'AI가 분석 중입니다...') {
  const loaderText = loaderElement.querySelector('p');
  if (loaderText) {
    loaderText.textContent = message;
  }
  loaderElement.classList.toggle('hidden', !isLoading);
}


// --- Dashboard Functionality ---

/**
 * Updates the project progress bar based on the selected project.
 * @param projectName The name of the selected project.
 */
function updateProjectProgress(projectName: string) {
    const progress = projectProgressData[projectName] || 0;
    if (progressBar && progressPercent && progressCardTitle) {
        progressBar.style.width = `${progress}%`;
        progressPercent.textContent = `${progress}%`;
        progressCardTitle.textContent = `${projectName} 진척도`;
    }
}


// --- Security Page Functionality ---

/**
 * Opens the security alert modal and fetches details.
 * @param alertSummary The summary of the alert from the table row.
 * @param alertTimestamp The exact timestamp from the table row.
 */
async function openAlertModal(alertSummary: string, alertTimestamp: string) {
    alertModal.classList.remove('hidden');
    modalAlertDetails.innerHTML = '';
    modalLoader.classList.remove('hidden');
    modalTitle.textContent = '보안 경고 상세 정보';

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const schema = {
          type: Type.OBJECT,
          properties: {
            user: { type: Type.STRING, description: 'The user associated with the event.' },
            action: { type: Type.STRING, description: 'A concise description of the detected action.' },
            cwe: { type: Type.STRING, description: 'If applicable, the most relevant CWE (Common Weakness Enumeration) number. If not applicable, use "N/A".' },
            risk: { type: Type.STRING, description: 'The risk level, one of "High", "Medium", or "Low".' },
            details: { type: Type.STRING, description: 'A brief explanation of why this event is a potential risk.' },
            recommendation: { type: Type.STRING, description: 'A clear, actionable, step-by-step recommendation for the security team to handle this alert. Use markdown for lists.' },
          },
          required: ['user', 'action', 'cwe', 'risk', 'details', 'recommendation']
        };

        const response = await ai.models.generateContent({
           model: "gemini-2.5-flash",
           contents: `You are a cybersecurity analyst AI. Analyze the following security alert summary and provide a detailed report. Alert: "${alertSummary}"`,
           config: {
             responseMimeType: "application/json",
             responseSchema: schema,
           },
        });

        const details = JSON.parse(response.text);

        modalTitle.textContent = `경고: ${details.action}`;
        modalAlertDetails.innerHTML = `
            <dl>
                <dt>발생 시각</dt><dd>${alertTimestamp}</dd>
                <dt>사용자</dt><dd>${details.user}</dd>
                <dt>위험도</dt><dd><span class="tag ${details.risk.toLowerCase()}">${details.risk}</span></dd>
                <dt>관련 CWE</dt><dd>${details.cwe}</dd>
                <dt>상세 내용</dt><dd>${details.details}</dd>
            </dl>
            <div class="recommendation">
                <h4>조치 요령</h4>
                <p>${details.recommendation.replace(/\n/g, '<br>')}</p>
            </div>
        `;

    } catch (error) {
        console.error('Error fetching alert details:', error);
        modalAlertDetails.innerHTML = `<p>⚠️ AI 분석에 실패했습니다. 잠시 후 다시 시도해주세요.</p>`;
    } finally {
        modalLoader.classList.add('hidden');
    }
}

/** Closes the security alert modal. */
function closeAlertModal() {
    alertModal.classList.add('hidden');
}


// --- Visual Chart (Mermaid) Functionality ---

async function handleGenerateChartClick() {
  const inputText = textInputVisual.value.trim();
  if (!inputText) {
    alert('분석할 내용을 먼저 입력해주세요.');
    return;
  }

  setLoading(true, loader, 'AI가 중요도를 분석하고 차트를 그립니다...');
  chartOutput.innerHTML = '';
  saveBtnSvg.disabled = true;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      You are an expert in corporate governance and organizational structure analysis.
      Your task is to analyze the provided text and generate a Mermaid.js flowchart diagram script to visualize the accountability structure.
      **Instructions:**
      1.  The diagram must start with \`flowchart TD\`.
      2.  Analyze the text to determine the importance of each role/task ('high', 'medium', 'low').
      3.  Define 3 CSS classes for importance: \`high-importance\`, \`medium-importance\`, \`low-importance\`.
          - \`high-importance\`: \`stroke-width:4px,stroke:#C62828,color:#000\`
          - \`medium-importance\`: \`stroke-width:2px,stroke:#FFA000,color:#000\`
          - \`low-importance\`: \`stroke-width:1px,stroke:#AAAAAA,fill:#f9f9f9,color:#000\`
      4.  All nodes MUST be circular, using the \`id(("Label Text"))\` syntax.
      5.  Assign the appropriate importance class to each node using the \`class\` keyword.
      6.  The output MUST be ONLY the Mermaid script enclosed in a markdown block: \`\`\`mermaid\\n...\\n\`\`\`.

      **Analyze the following document and generate the chart:**
      ---
      ${inputText}
      ---
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });

    const mermaidCode = extractMermaidCode(response.text);

    if (mermaidCode) {
      await renderMermaidChart(mermaidCode);
      saveBtnSvg.disabled = false;
    } else {
      throw new Error('AI 응답에서 Mermaid 차트 코드를 찾을 수 없습니다.');
    }
  } catch (error) {
    console.error('Error generating chart:', error);
    chartOutput.innerHTML = `<div class="placeholder"><p>⚠️ 차트 생성에 실패했습니다.</p><p>AI가 생성한 차트 코드에 오류가 있거나, 내용을 해석하지 못했습니다. 입력 내용을 수정하여 다시 시도해주세요.</p></div>`;
  } finally {
    setLoading(false, loader);
  }
}

function extractMermaidCode(responseText: string): string | null {
  const match = responseText.match(/```mermaid\n([\s\S]*?)\n```/);
  return match ? match[1].trim() : null;
}

async function renderMermaidChart(code: string) {
  try {
    chartOutput.innerHTML = '';
    const { svg } = await mermaid.render('mermaid-graph', code);
    chartOutput.innerHTML = svg;
  } catch (error) {
    console.error('Mermaid rendering failed:', error);
    throw new Error('Mermaid 차트 렌더링에 실패했습니다. 생성된 코드에 문법 오류가 있을 수 있습니다.');
  }
}

function handleSaveSvgClick() {
    const svgElement = chartOutput.querySelector('svg');
    if (!svgElement) {
        alert('저장할 차트가 없습니다.');
        return;
    }
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'accountability-chart.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// --- Text Document Functionality ---

/**
 * Converts a File object to a base64 string, stripping the data URL prefix.
 * @param file The file to convert.
 * @returns A promise that resolves with the base64 encoded string.
 */
function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
}

async function handleGenerateDocClick() {
    if (!selectedFile) {
        alert('먼저 분석할 이미지 파일을 업로드해주세요.');
        return;
    }

    setLoading(true, loaderDoc, 'AI가 이미지를 분석하여 문서를 생성합니다...');
    docOutput.textContent = '';
    docOutput.classList.add('placeholder');
    saveBtnTxt.disabled = true;
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const base64Data = await fileToBase64(selectedFile);
        const mimeType = selectedFile.type;

        const imagePart = {
            inlineData: {
                mimeType: mimeType,
                data: base64Data,
            },
        };

        const textPart = {
            text: `
                You are a professional corporate consultant. Analyze the provided accountability structure chart image and generate a clear, structured "Accountability Structure Document" in Korean markdown format.

                **Instructions:**
                1.  Start with a title: "# 책무구조도 (Accountability Structure)".
                2.  Create a brief summary of the overall structure shown in the chart.
                3.  For each key role or department in the chart, create a section with a markdown heading (e.g., "## 역할: [Role Name]").
                4.  Under each role, list its primary responsibilities as interpreted from the chart. If the chart provides limited detail, infer logical responsibilities based on the role's title and position.
                5.  Describe the reporting lines shown in the chart.
                6.  Maintain a formal and professional tone.
                7.  The output must be only the markdown text. Do not add any other explanations.
            `
        };
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
        });
        
        docOutput.textContent = response.text;
        docOutput.classList.remove('placeholder');
        saveBtnTxt.disabled = false;

    } catch (error)
 {
        console.error('Error generating document from image:', error);
        docOutput.textContent = '⚠️ 문서 생성에 실패했습니다. 이미지 파일을 확인하거나 다시 시도해주세요.';
    } finally {
        setLoading(false, loaderDoc);
    }
}

function handleSaveTxtClick() {
    const textContent = docOutput.textContent;
    if (!textContent || docOutput.classList.contains('placeholder')) {
        alert('저장할 문서가 없습니다.');
        return;
    }
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'accountability-document.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Initializes the application.
 */
function main() {
  // Initialize Mermaid
  mermaid.initialize({ startOnLoad: false, theme: 'base', themeVariables: {
    'primaryColor': '#ffffff',
    'primaryTextColor': '#000000',
    'lineColor': '#444'
  }});
  
  // --- Setup Event Listeners ---
  
  // Navigation
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = (e.currentTarget as HTMLElement).getAttribute('data-target');
      if (targetId) navigateTo(targetId);
    });
  });

  // Dashboard
  projectSelector?.addEventListener('change', () => {
    updateProjectProgress(projectSelector.value);
  });

  // Security Page & Modal
  securityAlertTableBody?.addEventListener('click', (e) => {
      const row = (e.target as HTMLElement).closest('tr');
      if (row && row.dataset.alert && row.dataset.timestamp) {
          openAlertModal(row.dataset.alert, row.dataset.timestamp);
      }
  });
  modalCloseBtn?.addEventListener('click', closeAlertModal);
  modalOverlay?.addEventListener('click', closeAlertModal);

  // My Page
  renewAuthBtn?.addEventListener('click', () => {
    alert('인증 갱신 절차를 시작합니다.'); // Placeholder action
  });

  // Visual Chart Page
  generateBtnVisual.addEventListener('click', handleGenerateChartClick);
  saveBtnSvg.addEventListener('click', handleSaveSvgClick);
  textInputVisual.addEventListener('input', () => {
    generateBtnVisual.disabled = textInputVisual.value.trim().length === 0;
  });

  // --- Text Chart Page ---
  function handleFileSelect(file: File | null) {
      if (file) {
          const validTypes = ['image/jpeg', 'image/png'];
          if (!validTypes.includes(file.type)) {
              alert('지원하지 않는 파일 형식입니다. JPG, PNG 파일만 업로드할 수 있습니다.');
              return;
          }
          selectedFile = file;
          fileNameDoc.textContent = file.name;
          generateBtnDoc.disabled = false;
      } else {
          selectedFile = null;
          fileNameDoc.textContent = '';
          generateBtnDoc.disabled = true;
      }
  }

  fileDropZoneDoc.addEventListener('click', () => fileInputDoc.click());
  fileInputDoc.addEventListener('change', () => {
    handleFileSelect(fileInputDoc.files ? fileInputDoc.files[0] : null);
  });

  // Drag and Drop listeners
  fileDropZoneDoc.addEventListener('dragover', (e) => {
      e.preventDefault();
      fileDropZoneDoc.classList.add('drag-over');
  });
  fileDropZoneDoc.addEventListener('dragleave', () => {
      fileDropZoneDoc.classList.remove('drag-over');
  });
  fileDropZoneDoc.addEventListener('drop', (e) => {
      e.preventDefault();
      fileDropZoneDoc.classList.remove('drag-over');
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
          fileInputDoc.files = files;
          handleFileSelect(files[0]);
      }
  });

  generateBtnDoc.addEventListener('click', handleGenerateDocClick);
  saveBtnTxt.addEventListener('click', handleSaveTxtClick);

  // --- Initial State ---
  generateBtnVisual.disabled = true;
  saveBtnSvg.disabled = true;
  generateBtnDoc.disabled = true;
  saveBtnTxt.disabled = true;
  
  // Initialize dashboard state
  if (projectSelector) {
    updateProjectProgress(projectSelector.value);
  }
  
  // Start on the dashboard
  navigateTo('dashboard');
}

document.addEventListener('DOMContentLoaded', main);