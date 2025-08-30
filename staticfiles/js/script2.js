let currentPage = 1;
const remediesPerPage = 3;

document.addEventListener('DOMContentLoaded', function () {
    const video = document.getElementById('herbal-camera-feed');
    const canvas = document.getElementById('canvas');
    const preview = document.getElementById('imagePreview'); // This is your main image preview element
    const startCameraBtn = document.getElementById('startCameraBtn');
    const captureBtn = document.getElementById('captureBtn');
    const predictBtn = document.getElementById('herbal-analyze-btn');
    const resultsSection = document.getElementById('results');
    const diagnosisConditionNameEl = document.getElementById('diagnosisConditionName');
    const diagnosisConfidenceLevelEl = document.getElementById('diagnosisConfidenceLevel');
    const diagnosisConfidenceTextEl = document.getElementById('diagnosisConfidenceText');
    const herbalDetailedRemediesGrid = document.getElementById('herbalDetailedRemediesGrid');
    const spinner = document.getElementById('spinner');
    const fileInput = document.getElementById('fileInput');

    let stream = null;
    const ctx = canvas.getContext('2d');
    const remedyState = {};
    let latestData = null; // Store the latest API response data for remedy navigation

    // --- Helper Functions - Defined FIRST to ensure they are accessible ---

    function showElement(el) {
        el.style.display = 'block';
        el.classList.add('active');
    }

    function hideElement(el) {
        el.style.display = 'none';
        el.classList.remove('active');
    }

    function showSpinner() {
        spinner.style.display = 'block';
    }

    function hideSpinner() {
        spinner.style.display = 'none';
    }

    function resizeCanvas() {
        // Ensure preview is visible and has natural dimensions before resizing canvas
        if (preview.style.display !== 'none' && preview.naturalWidth && preview.naturalHeight) {
            canvas.width = preview.clientWidth;
            canvas.height = preview.clientHeight;
            canvas.style.width = preview.clientWidth + 'px';
            canvas.style.height = preview.clientHeight + 'px';
        } else {
            // If preview isn't ready or visible, hide canvas
            hideElement(canvas);
        }
    }

    function drawBoundingBoxes(boxes) {
        // Clear previous drawings on the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!boxes || boxes.length === 0) {
            hideElement(canvas); // Hide canvas if no boxes to draw
            return;
        }

        // Make sure canvas is visible for drawing
        showElement(canvas);
        resizeCanvas(); // Recalculate canvas size based on preview

        ctx.strokeStyle = 'red';
        ctx.lineWidth = 3;

        // Calculate scaling factors based on the displayed size of the preview image
        // relative to its natural (original) size.
        const scaleX = preview.clientWidth / preview.naturalWidth;
        const scaleY = preview.clientHeight / preview.naturalHeight;

        boxes.forEach(box => {
            ctx.strokeRect(
                box.x * scaleX,
                box.y * scaleY,
                box.width * scaleX,
                box.height * scaleY
            );
        });
    }

    function formatConditionName(name) {
        return name.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    function formatListContent(content) {
        if (!content) return '<p>Information not available</p>';
        if (Array.isArray(content)) {
            return `<ul>${content.map(item => `<li>${item}</li>`).join('')}</ul>`;
        }
        return `<p>${content}</p>`;
    }

    function renderRemedyCardHTML(issue, remedy, remedyIndex, totalRemedies) {
        const directions = Array.isArray(remedy.directions) ? remedy.directions : (remedy.directions ? [remedy.directions] : []);
        const isPrevDisabled = remedyIndex === 0 ? 'disabled' : '';
        const isNextDisabled = remedyIndex === totalRemedies - 1 ? 'disabled' : '';

        return `
            <div class="card herbal-remedy-card">
                <div class="card-content-padded">
                    <h4 style="color:rgb(34, 116, 45) ; margin-bottom: 0.5rem;">Remedies</h4>
                    <h4 style="color:rgb(209, 111, 0); margin-bottom: 0.5rem;">${remedy.title}</h4>
                    ${remedy.amount ? `<p><strong>Amount:</strong> ${remedy.amount}</p>` : ''}
                    ${directions.length > 0 && directions[0] !== "" ?
                    `<div><strong>Directions:</strong></div>
                       <ul class="remedy-steps">
                           ${directions.map(step => `<li>${step}</li>`).join('')}
                       </ul>` : ''}

                    <div class="remedy-navigation">
                        <button class="herbal-btn herbal-btn-secondary remedy-btn prev-btn" onclick="changeRemedy('${issue}', -1)" ${isPrevDisabled}>&#8592; Previous</button>
                        <span class="remedy-page-info">${remedyIndex + 1} / ${totalRemedies}</span>
                        <button class="herbal-btn herbal-btn-secondary remedy-btn next-btn" onclick="changeRemedy('${issue}', 1)" ${isNextDisabled}>Next &#8594;</button>
                    </div>
                      ${remedy.image_url ?
                    `<div class="remedy-image-wrapper">
                           <img src="${remedy.image_url}" alt="${remedy.title}" class="remedy-image">
                       </div>`
                    : '<div class="remedy-image-wrapper remedy-image-placeholder"><div class="remedy-image-placeholder-text">No image available</div></div>'}
                </div>
            </div>
        `;
    }

    function renderIssueCardHTML(issue, issueData, confidence) {
        const formattedIssueName = formatConditionName(issue);
        const confidenceDisplay = confidence !== null ? `${confidence}%` : 'N/A';

        return `
            <div class="card herbal-issue-card">
                <div class="herbal-card-body">
                    <h3 class="herbal-issue-name">
                        <i class="fas fa-exclamation-triangle"></i> ${formattedIssueName}
                        ${confidence !== null ?
                            `<span class="herbal-confidence-badge">${confidenceDisplay} confidence</span>` :
                            '<span class="herbal-confidence-badge">Detected</span>'}
                    </h3>

                    <div class="herbal-issue-buttons">
                        <button class="herbal-btn herbal-btn-secondary toggle-causes-btn" data-target="causes-${issue}">View Causes</button>
                        <button class="herbal-btn herbal-btn-secondary toggle-symptoms-btn" data-target="symptoms-${issue}">View Symptoms</button>
                    </div>

                    <div id="causes-${issue}" class="herbal-collapsible-content">
                        <h4><i class="fas fa-lightbulb"></i> Causes:</h4>
                        ${formatListContent(issueData.causes)}
                    </div>

                    <div id="symptoms-${issue}" class="herbal-collapsible-content">
                        <h4><i class="fas fa-th-list"></i> Symptoms:</h4>
                        ${formatListContent(issueData.symptoms)}
                    </div>
                </div>
            </div>
        `;
    }

    // Function to handle changing remedies (accessible globally via window for onclick)
    window.changeRemedy = function (issue, direction) {
        if (!latestData || !latestData.remedies_data || !latestData.remedies_data[issue]) {
            console.warn("Remedy data not found for issue:", issue);
            return;
        }

        const remedies = latestData.remedies_data[issue].remedies;
        if (!remedies || remedies.length === 0) return;

        let currentIndex = remedyState[issue] !== undefined ? remedyState[issue] : 0;
        let newIndex = currentIndex + direction;

        if (newIndex < 0) {
            newIndex = 0;
        } else if (newIndex >= remedies.length) {
            newIndex = remedies.length - 1;
        }

        remedyState[issue] = newIndex;

        const remedyCardWrapper = document.getElementById(`remedy-card-wrapper-${issue}`);
        if (remedyCardWrapper) {
            remedyCardWrapper.innerHTML = renderRemedyCardHTML(issue, remedies[newIndex], newIndex, remedies.length);
        } else {
            console.warn("Remedy card wrapper not found for issue:", issue);
        }
    };

    function attachToggleButtonListeners() {
        // Remove existing listeners to prevent duplicates if displayResults is called multiple times
        // This is important because displayResults re-creates elements
        document.querySelectorAll('.toggle-causes-btn, .toggle-symptoms-btn').forEach(button => {
            button.removeEventListener('click', handleToggleButtonClick);
        });

        // Define the handler function
        function handleToggleButtonClick(event) {
            const targetId = event.currentTarget.getAttribute('data-target');
            const content = document.getElementById(targetId);

            if (content) {
                content.classList.toggle('active');
                event.currentTarget.classList.toggle('active');

                if (content.classList.contains('active')) {
                    if (event.currentTarget.classList.contains('toggle-causes-btn')) {
                        event.currentTarget.textContent = 'Hide Causes';
                    } else {
                        event.currentTarget.textContent = 'Hide Symptoms';
                    }
                } else {
                    if (event.currentTarget.classList.contains('toggle-causes-btn')) {
                        event.currentTarget.textContent = 'View Causes';
                    } else {
                        event.currentTarget.textContent = 'View Symptoms';
                    }
                }
            }
        }

        // Add new listeners to newly created elements
        document.querySelectorAll('.toggle-causes-btn, .toggle-symptoms-btn').forEach(button => {
            button.addEventListener('click', handleToggleButtonClick);
        });
    }

    // --- Main Display Results Function ---
    function displayResults(data) {
        console.log("API Response Data:", JSON.stringify(data, null, 2));

        // Clear previous results from the grid and reset diagnosis text
        herbalDetailedRemediesGrid.innerHTML = '';
        // Clear previous probability distribution if it exists
        const existingDistribution = diagnosisConfidenceTextEl.parentNode.querySelector('.probability-distribution');
        if (existingDistribution) {
            existingDistribution.remove();
        }

        // Handle image display from API response (annotated image)
        // This should always be placed where you want the final, analyzed image to show.
        if (data.annotated_image) {
            preview.src = 'data:image/jpeg;base64,' + data.annotated_image;
            showElement(preview);
            // Ensure bounding boxes are drawn AFTER the image has loaded onto the preview element
            preview.onload = () => {
                // If bounding boxes are explicitly provided, draw them
                if (data.bounding_boxes && data.bounding_boxes.length > 0) {
                    drawBoundingBoxes(data.bounding_boxes);
                } else {
                    // If no bounding boxes, ensure canvas is cleared and hidden
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    hideElement(canvas);
                }
            };
            if (preview.complete && data.bounding_boxes && data.bounding_boxes.length > 0) {
        drawBoundingBoxes(data.bounding_boxes);
    }
        } else {
            // If no annotated image from API, hide preview and canvas
            hideElement(preview);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            hideElement(canvas);
        }

        // 1. Enhanced confidence score extraction with fallbacks
        // Inside your DOMContentLoaded function
function getConfidenceScore(issue) {
    const scoreSources = [
        data.confidence_scores?.[issue],
        data.confidences?.[issue],
        data.scores?.[issue],
        data.predictions?.[issue]?.confidence,
        data[issue]?.confidence
    ];

    const validScore = scoreSources.find(score =>
        typeof score === 'number' && !isNaN(score) && isFinite(score)
    );

    // Change this line: return validScore !== undefined ? Math.max(0, Math.min(100, Math.round(validScore))) : null;
    // To:
    return validScore !== undefined ? Math.max(0, Math.min(100, Math.round(validScore))) : 0; // Return 0 instead of null
}

        // 2. Process detected issues
        if (data.detected_issues?.length > 0) {
            const issuesList = data.detected_issues
                .map(issue => ({
                    name: issue,
                    confidence: getConfidenceScore(issue),
                    formattedName: formatConditionName(issue)
                }))
                .filter(issue => issue.name);

            // Sort with valid confidence scores first (highest confidence first)
            issuesList.sort((a, b) => {
                if (a.confidence === null && b.confidence === null) return 0;
                if (a.confidence === null) return 1; // Null confidence to the end
                if (b.confidence === null) return -1; // Null confidence to the end
                return b.confidence - a.confidence; // Sort by confidence descending
            });

            // 3. Display primary diagnosis
            const primaryIssue = issuesList[0] || {};
            diagnosisConditionNameEl.textContent = primaryIssue.formattedName || 'Condition Detected';

            if (primaryIssue.confidence !== null) {
                diagnosisConfidenceLevelEl.style.width = `${primaryIssue.confidence}%`;
                diagnosisConfidenceTextEl.textContent = `Confidence: ${primaryIssue.confidence}%`;
            } else {
                diagnosisConfidenceLevelEl.style.width = '0%';
                diagnosisConfidenceTextEl.textContent = 'Confidence: Analysis Complete';
            }

            // 4. Create confidence distribution (only if we have valid scores)
            const validScoredIssues = issuesList.filter(issue => issue.confidence !== null);

            if (validScoredIssues.length > 0) {
                const distributionHtml = `
                    <div class="probability-distribution">
                        <div class="probability-header">
                            <h4>Model Analysis</h4>
                            <p>Detection confidence levels:</p>
                        </div>
                        <div class="probability-bars">
                            ${validScoredIssues.map(issue => `
                                <div class="probability-item">
                                    <div class="probability-label">${issue.formattedName}</div>
                                    <div class="probability-bar-container">
                                        <div class="probability-bar" style="width: ${issue.confidence}%">
                                            <span class="probability-value">${issue.confidence}%</span>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
                // Append the distribution after the main confidence text
                diagnosisConfidenceTextEl.insertAdjacentHTML('afterend', distributionHtml);
            }
        } else {
            // No issues detected case for summary card
            diagnosisConditionNameEl.textContent = 'No Specific Condition Detected';
            diagnosisConfidenceLevelEl.style.width = '0%';
            diagnosisConfidenceTextEl.textContent = 'Analysis Complete';
        }

        // 5. Render detailed issue and remedy cards
        if (data.detected_issues?.length > 0) {
            data.detected_issues.forEach(issue => {
                const issueData = data.remedies_data?.[issue] || {};
                const confidence = getConfidenceScore(issue);
                const remediesForIssue = issueData.remedies || [];

                const issueRemedyPairContainer = document.createElement('div');
                issueRemedyPairContainer.className = 'issue-remedy-pair';

                // Use the renderIssueCardHTML function to generate the issue card HTML
                issueRemedyPairContainer.innerHTML = renderIssueCardHTML(issue, issueData, confidence);

                // Add remedies display if available
                if (remediesForIssue.length > 0) {
                    remedyState[issue] = 0; // Initialize state for this issue's remedies

                    const remedyCardWrapper = document.createElement('div');
                    remedyCardWrapper.id = `remedy-card-wrapper-${issue}`;
                    remedyCardWrapper.innerHTML = renderRemedyCardHTML(issue, remediesForIssue[0], 0, remediesForIssue.length);
                    issueRemedyPairContainer.appendChild(remedyCardWrapper);
                }

                herbalDetailedRemediesGrid.appendChild(issueRemedyPairContainer);
            });
        } else {
            // Message for no detailed issues/remedies in the detailed grid
            const noResultsMessage = document.createElement('div');
            noResultsMessage.className = 'no-results-message';
            noResultsMessage.textContent = 'No detailed skin conditions or remedies were detected. Please try a clearer image or consult a professional.';
            herbalDetailedRemediesGrid.appendChild(noResultsMessage);
        }

        // Attach event listeners for toggle buttons (causes/symptoms)
        // This should always be called AFTER all dynamic content is added to the DOM.
        attachToggleButtonListeners();
    }

    // --- Initial Event Listeners (Capture, Predict, File Input) ---
    // These remain at the end of the DOMContentLoaded block as they trigger the process.

    startCameraBtn.addEventListener('click', async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            video.play();
            video.style.display = 'block';
            captureBtn.disabled = false;
            preview.style.display = 'none'; // Hide preview when camera starts
            hideElement(canvas); // Hide canvas when camera starts
        } catch (err) {
            console.error('Error accessing camera:', err);
            alert('Could not access the camera. Please check permissions.');
        }
    });

    captureBtn.addEventListener('click', () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        preview.src = canvas.toDataURL('image/jpeg');
        showElement(preview); // Show the captured image in preview
        video.style.display = 'none'; // Hide video after capture
        hideElement(canvas); // Canvas is hidden by default after capture, unless bounding boxes are drawn

        predictBtn.disabled = false;

        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
    });

    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            preview.src = event.target.result;
            showElement(preview); // Show the selected image in preview
            hideElement(video); // Hide video when file is selected
            hideElement(canvas); // Hide canvas when file is selected
            predictBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    });

    predictBtn.addEventListener('click', async () => {
        // Reset analysis display immediately
        diagnosisConditionNameEl.textContent = 'Analyzing...';
        diagnosisConfidenceLevelEl.style.width = '0%';
        diagnosisConfidenceTextEl.textContent = 'Confidence: --%';
        herbalDetailedRemediesGrid.innerHTML = '';
        // Clear and hide canvas and any previous bounding boxes
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        hideElement(canvas);


        showSpinner();
        predictBtn.disabled = true;

        try {
            const formData = new FormData();
            let fileToSend = null;

            // Prioritize sending the original File object if available and not modified
            if (fileInput.files.length > 0) {
                fileToSend = fileInput.files[0];
            } else if (preview.src.startsWith('data:image')) {
                // If the image is from camera capture or a data URL from FileReader,
                // we must convert it to a blob. Be explicit about JPEG quality.
                const response = await fetch(preview.src);
                const blob = await response.blob(); // Use blob() for cleaner conversion

                // If you want to ensure it's always JPEG and control quality:
                // Create a temporary image to re-draw and get a new data URL with specific quality
                const img = new Image();
                img.src = preview.src; // Use the current preview src
                await new Promise(resolve => img.onload = resolve); // Ensure image is loaded

                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear before drawing
                ctx.drawImage(img, 0, 0);

                // Use a consistent JPEG quality. 1.0 is highest quality, usually largest file.
                // You can experiment with 0.9 or 0.95 for a balance.
                const reEncodedDataUrl = canvas.toDataURL('image/jpeg', 1.0);
                fileToSend = await fetch(reEncodedDataUrl).then(res => res.blob());

                // Give it a consistent filename (important for backend parsing)
                fileToSend = new File([fileToSend], 'captured_image.jpeg', { type: 'image/jpeg' });
            } else {
                throw new Error('No image selected or captured.');
            }

            if (fileToSend) {
                formData.append('file', fileToSend);
            } else {
                throw new Error('Could not prepare image for upload.');
            }

            const response = await fetch('/api/predict/', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(errorData.message || 'Server responded with an unknown error');
            }

            const data = await response.json();
            latestData = data; // Store the fetched data for use in changeRemedy
            currentPage = 1; // Reset pagination for new results

            displayResults(data); // Call displayResults with the API response
        } catch (error) {
            console.error('Error:', error);
            diagnosisConditionNameEl.textContent = 'Analysis Error';
            diagnosisConfidenceTextEl.textContent = `Error: ${error.message || 'Failed to process image'}`;
            // On error, hide the preview and clear/hide canvas
            hideElement(preview);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            hideElement(canvas);
        } finally {
            hideSpinner();
            predictBtn.disabled = false;
        }
    });

}); // End of DOMContentLoaded