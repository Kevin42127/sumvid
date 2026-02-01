function t(key) {
  return chrome.i18n.getMessage(key) || key;
}

function updateRateLimitInfoDisplay() {
  chrome.storage.local.get(['rateLimitInfo'], (result) => {
    if (result.rateLimitInfo) {
      updateRateLimitInfo(result.rateLimitInfo, false);
    }
  });
}

function updateUI() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (el.tagName === 'SPAN' && el.parentElement && el.parentElement.id === 'versionText') {
      return;
    }
    el.textContent = t(key);
  });
  
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    el.title = t(key);
  });
  
  const versionText = document.getElementById('versionText');
  if (versionText) {
    const manifest = chrome.runtime.getManifest();
    const versionLabel = versionText.querySelector('[data-i18n="versionLabel"]');
    if (versionLabel) {
      versionLabel.textContent = t('versionLabel');
    } else {
      versionText.innerHTML = `<span data-i18n="versionLabel">${t('versionLabel')}</span> v${manifest.version}`;
    }
  }

  const welcomeLimitInfo = document.getElementById('welcomeLimitInfo');
  if (welcomeLimitInfo) {
    welcomeLimitInfo.textContent = `${t('rateLimitPerMinute')} 3 ${t('rateLimitGenerations')}`;
  }

  if (typeof updateRateLimitInfoDisplay === 'function') {
    updateRateLimitInfoDisplay();
  }
}

function updateRateLimitInfo(rateLimitInfo, saveToStorage = true) {
  if (!rateLimitInfo || rateLimitInfo.remaining === undefined) {
    console.log('updateRateLimitInfo: Invalid rateLimitInfo', rateLimitInfo);
    return;
  }
  
  const { remaining, count, limit, windowSeconds } = rateLimitInfo;
  console.log('updateRateLimitInfo: Updating with', { remaining, count, limit, windowSeconds });
  
  const headerLimitInfoEl = document.getElementById('headerLimitInfo');
  const headerLimitInfoText = document.getElementById('headerLimitInfoText');
  if (headerLimitInfoEl && headerLimitInfoText) {
    headerLimitInfoText.textContent = `${t('rateLimitRemaining')} ${remaining}/${limit} ${t('rateLimitTimes')}`;
    headerLimitInfoEl.classList.remove('hidden');
    console.log('✅ Header rate limit info updated');
  } else {
    console.error('❌ Header limit info elements not found');
  }
  
  const welcomeLimitInfo = document.getElementById('welcomeLimitInfo');
  if (welcomeLimitInfo) {
    welcomeLimitInfo.textContent = `${t('rateLimitPerMinute')} ${limit} ${t('rateLimitGenerations')}`;
  }
  
  if (saveToStorage) {
    chrome.storage.local.set({ rateLimitInfo });
    console.log('✅ Rate limit info saved to storage');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const generateBtn = document.getElementById('generateBtn');
  const loading = document.getElementById('loading');
  const loadingText = document.getElementById('loadingText');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const successAnimation = document.getElementById('successAnimation');
  const summary = document.getElementById('summary');
  const summaryContent = document.getElementById('summaryContent');
  const error = document.getElementById('error');
  const errorMessage = document.getElementById('errorMessage');
  const videoInfo = document.getElementById('videoInfo');
  const videoTitle = document.getElementById('videoTitle');
  const status = document.getElementById('status');
  const copyBtn = document.getElementById('copyBtn');
  const backBtn = document.getElementById('backBtn');
  const welcomeLimitInfo = document.getElementById('welcomeLimitInfo');
  const welcomeSection = document.getElementById('welcomeSection');
  const versionText = document.getElementById('versionText');
  const onboarding = document.getElementById('onboarding');
  const onboardingClose = document.getElementById('onboardingClose');
  const videoPreview = document.getElementById('videoPreview');
  const previewTitle = document.getElementById('previewTitle');
  const previewDescription = document.getElementById('previewDescription');
  const previewTranscript = document.getElementById('previewTranscript');
  const previewDescriptionContainer = document.getElementById('previewDescriptionContainer');
  const previewTranscriptContainer = document.getElementById('previewTranscriptContainer');
  const previewConfirm = document.getElementById('previewConfirm');
  const previewCancel = document.getElementById('previewCancel');
  
  let pendingVideoData = null;
  
  const htmlLang = document.getElementById('htmlLang');
  if (htmlLang) {
    htmlLang.setAttribute('lang', 'zh-TW');
  }
  
  chrome.storage.local.get(['hasSeenOnboarding'], (result) => {
    if (!result.hasSeenOnboarding) {
      onboarding.classList.remove('hidden');
    }
  });
  
  onboardingClose.addEventListener('click', () => {
    onboarding.classList.add('fade-out');
    setTimeout(() => {
      onboarding.classList.add('hidden');
      chrome.storage.local.set({ hasSeenOnboarding: true });
    }, 300);
  });
  
  previewCancel.addEventListener('click', () => {
    videoPreview.classList.add('hidden');
    welcomeSection.classList.remove('hidden');
    generateBtn.disabled = false;
    pendingVideoData = null;
  });
  
  previewConfirm.addEventListener('click', () => {
    if (pendingVideoData) {
      videoPreview.classList.add('hidden');
      startGeneration(pendingVideoData);
      pendingVideoData = null;
    }
  });
  
  updateUI();

  function startGeneration(videoData) {
    hideAll();
    progressFill.style.width = '0%';
    progressText.textContent = '0%';
    loading.classList.remove('hidden');

    if (videoData.title) {
      videoTitle.textContent = videoData.title;
      showElement(videoInfo);
    }

    const progressListener = (message) => {
      if (message.action === 'updateProgress' && message.progress) {
        const { current, total, text, stage } = message.progress;
        const percentage = Math.round((current / total) * 100);
        
        progressFill.style.width = `${percentage}%`;
        progressText.textContent = `${percentage}%`;
        
        let displayText = '';
        if (stage === 'analyzing') {
          displayText = t('loadingStageAnalyzing');
        } else if (stage === 'chunk' && total > 1) {
          displayText = t('loadingStageChunk').replace('{current}', current).replace('{total}', total);
        } else if (stage === 'integrating') {
          displayText = t('loadingStageIntegrating');
        } else if (text) {
          displayText = text;
        } else {
          displayText = t('loadingAnalyzing');
        }
        
        if (total > 1 && stage !== 'chunk') {
          loadingText.textContent = `${displayText} (${current}/${total})`;
        } else {
          loadingText.textContent = displayText;
        }
      }
    };

    chrome.runtime.onMessage.addListener(progressListener);

    chrome.runtime.sendMessage(
      { action: 'generateSummary', data: videoData },
      (summaryResponse) => {
        chrome.runtime.onMessage.removeListener(progressListener);
        generateBtn.disabled = false;
        loading.classList.add('hidden');

        if (chrome.runtime.lastError) {
          showError(t('errorConnectBackground'));
          return;
        }

        if (!summaryResponse || !summaryResponse.success) {
          if (summaryResponse.rateLimitReached && summaryResponse.waitTime) {
            showRateLimitWarning(summaryResponse.waitTime);
          } else {
            showError(summaryResponse?.error || t('errorGenerateError'));
          }
          return;
        }

        summaryContent.textContent = summaryResponse.summary;
        
        console.log('Popup: Received summaryResponse:', JSON.stringify(summaryResponse, null, 2));
        console.log('Popup: rateLimitInfo in response:', summaryResponse.rateLimitInfo);
        console.log('Popup: rateLimitInfo type:', typeof summaryResponse.rateLimitInfo);
        console.log('Popup: rateLimitInfo remaining:', summaryResponse.rateLimitInfo?.remaining);
        
        if (summaryResponse.rateLimitInfo && typeof summaryResponse.rateLimitInfo === 'object' && summaryResponse.rateLimitInfo.remaining !== undefined) {
          console.log('Popup: Calling updateRateLimitInfo with:', summaryResponse.rateLimitInfo);
          updateRateLimitInfo(summaryResponse.rateLimitInfo);
        } else {
          console.warn('Popup: No valid rateLimitInfo in response');
          console.warn('Popup: summaryResponse keys:', Object.keys(summaryResponse || {}));
          updateRateLimitInfo({
            remaining: 2,
            count: 1,
            limit: 3,
            windowSeconds: 60
          });
        }
        
        loading.classList.add('hidden');
        successAnimation.classList.remove('hidden');
        
        setTimeout(() => {
          successAnimation.classList.add('hidden');
          showElement(summary);
          backBtn.classList.remove('hidden');
        }, 1500);
      }
    );
  }

  generateBtn.addEventListener('click', async () => {
    try {
      generateBtn.disabled = true;
      welcomeSection.classList.add('hidden');
      hideAll();

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url || !tab.url.includes('youtube.com/watch')) {
        showError(t('errorNotYouTube'));
        generateBtn.disabled = false;
        return;
      }

      chrome.tabs.sendMessage(tab.id, { action: 'getVideoInfo' }, async (response) => {
        if (chrome.runtime.lastError) {
          showError(t('errorGetVideoInfo'));
          generateBtn.disabled = false;
          return;
        }

        if (!response || !response.success) {
          showError(response?.error || t('errorGetVideoInfoError'));
          generateBtn.disabled = false;
          return;
        }

        const videoData = {
          title: response.videoTitle || '',
          description: response.videoDescription || '',
          transcript: response.transcript || '',
          transcriptSegments: response.transcriptSegments || []
        };

        previewTitle.textContent = videoData.title || t('errorGetVideoInfoError');
        
        if (videoData.description) {
          previewDescription.textContent = videoData.description;
          previewDescriptionContainer.style.display = 'flex';
        } else {
          previewDescriptionContainer.style.display = 'none';
        }
        
        if (videoData.transcript) {
          previewTranscript.textContent = videoData.transcript.length > 100 
            ? videoData.transcript.substring(0, 100) + '...' 
            : videoData.transcript;
          previewTranscriptContainer.style.display = 'flex';
        } else {
          previewTranscriptContainer.style.display = 'none';
        }
        
        pendingVideoData = videoData;
        videoPreview.classList.remove('hidden');
        generateBtn.disabled = false;
      });
    } catch (err) {
      generateBtn.disabled = false;
      loading.classList.add('hidden');
      showError(t('errorUnexpected') + err.message);
    }
  });

  copyBtn.addEventListener('click', async () => {
    const text = summaryContent.textContent;
    try {
      await navigator.clipboard.writeText(text);
      showStatus(t('errorCopySuccess'));
    } catch (err) {
      showError(t('errorCopyFailed'));
    }
  });

  backBtn.addEventListener('click', () => {
    hideAll();
    welcomeSection.classList.remove('hidden');
    generateBtn.disabled = false;
    backBtn.classList.add('hidden');
    
    chrome.storage.local.get(['rateLimitInfo'], (result) => {
      if (result.rateLimitInfo) {
        updateRateLimitInfo(result.rateLimitInfo, false);
      }
    });
  });

  function hideAll() {
    loading.classList.add('hidden');
    summary.classList.add('hidden');
    error.classList.add('hidden');
    status.classList.add('hidden');
    videoInfo.classList.add('hidden');
    successAnimation.classList.add('hidden');
    welcomeSection.classList.add('hidden');
    videoPreview.classList.add('hidden');
    document.getElementById('rateLimitWarning')?.classList.add('hidden');
  }

  function showError(message) {
    hideAll();
    errorMessage.textContent = message;
    setTimeout(() => {
      error.classList.remove('hidden');
    }, 10);
  }

  function showStatus(message) {
    status.textContent = message;
    status.classList.remove('hidden');
    setTimeout(() => {
      status.classList.add('hidden');
    }, 2000);
  }

  function showElement(element) {
    element.classList.remove('hidden');
  }
  
  let countdownInterval = null;
  function showRateLimitWarning(waitTime) {
    hideAll();
    generateBtn.disabled = true;
    
    const rateLimitWarning = document.getElementById('rateLimitWarning');
    const countdownSeconds = document.getElementById('countdownSeconds');
    const countdownProgress = document.getElementById('countdownProgress');
    const rateLimitText = rateLimitWarning?.querySelector('.rate-limit-text');
    
    if (!rateLimitWarning || !countdownSeconds || !countdownProgress) {
      showError(t('errorTooFrequent'));
      return;
    }
    
    if (rateLimitText) {
      const waitText = rateLimitText.querySelector('[data-i18n="rateLimitWait"]');
      const secondsText = rateLimitText.querySelector('[data-i18n="rateLimitSeconds"]');
      if (waitText) waitText.textContent = t('rateLimitWait');
      if (secondsText) secondsText.textContent = t('rateLimitSeconds');
    }
    
    let remainingSeconds = waitTime;
    const totalSeconds = waitTime;
    
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }
    
    const updateCountdown = () => {
      countdownSeconds.textContent = remainingSeconds;
      const progress = (totalSeconds - remainingSeconds) / totalSeconds * 100;
      countdownProgress.style.width = `${progress}%`;
      
      if (remainingSeconds <= 0) {
        clearInterval(countdownInterval);
        countdownInterval = null;
        rateLimitWarning.classList.add('hidden');
        generateBtn.disabled = false;
        welcomeSection.classList.remove('hidden');
      } else {
        remainingSeconds--;
      }
    };
    
    updateCountdown();
    rateLimitWarning.classList.remove('hidden');
    countdownInterval = setInterval(updateCountdown, 1000);
  }
});
