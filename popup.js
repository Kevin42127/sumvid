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
      
  // 載入時檢查是否有存儲的限額資訊（時間限制不需要日期檢查）
  chrome.storage.local.get(['rateLimitInfo'], (result) => {
    if (result.rateLimitInfo) {
      updateRateLimitInfo(result.rateLimitInfo, false);
    }
  });
  
  // 更新時間限制資訊的函數
  function updateRateLimitInfo(rateLimitInfo, saveToStorage = true) {
    if (!rateLimitInfo || rateLimitInfo.remaining === undefined) {
      console.log('updateRateLimitInfo: Invalid rateLimitInfo', rateLimitInfo);
      return;
    }
    
    const { remaining, count, limit, windowSeconds } = rateLimitInfo;
    console.log('updateRateLimitInfo: Updating with', { remaining, count, limit, windowSeconds });
    
    // 更新 header 中的限額資訊
    const headerLimitInfoEl = document.getElementById('headerLimitInfo');
    const headerLimitInfoText = document.getElementById('headerLimitInfoText');
    if (headerLimitInfoEl && headerLimitInfoText) {
      headerLimitInfoText.textContent = `剩餘 ${remaining}/${limit} 次（${windowSeconds}秒內）`;
      headerLimitInfoEl.classList.remove('hidden');
      console.log('✅ Header rate limit info updated');
    } else {
      console.error('❌ Header limit info elements not found');
    }
    
    // 更新首頁中的限額資訊
    if (welcomeLimitInfo) {
      welcomeLimitInfo.textContent = `每分鐘最多 ${limit} 次生成`;
    }
    
    // 存儲到本地
    if (saveToStorage) {
      chrome.storage.local.set({ rateLimitInfo });
      console.log('✅ Rate limit info saved to storage');
    }
  }

  generateBtn.addEventListener('click', async () => {
    try {
      generateBtn.disabled = true;
      welcomeSection.classList.add('hidden');
      hideAll();
      progressFill.style.width = '0%';
      progressText.textContent = '0%';
      loading.classList.remove('hidden');

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url || !tab.url.includes('youtube.com/watch')) {
        showError('請在 YouTube 影片頁面使用此功能');
        generateBtn.disabled = false;
        return;
      }

      chrome.tabs.sendMessage(tab.id, { action: 'getVideoInfo' }, async (response) => {
        if (chrome.runtime.lastError) {
          showError('無法取得影片資訊，請重新整理頁面後再試');
          generateBtn.disabled = false;
          return;
        }

        if (!response || !response.success) {
          showError(response?.error || '無法取得影片資訊');
          generateBtn.disabled = false;
          return;
        }

        if (response.videoTitle) {
          videoTitle.textContent = response.videoTitle;
          showElement(videoInfo);
        }

        const videoData = {
          title: response.videoTitle || '',
          description: response.videoDescription || '',
          transcript: response.transcript || '',
          transcriptSegments: response.transcriptSegments || []
        };

        const progressListener = (message) => {
          if (message.action === 'updateProgress' && message.progress) {
            const { current, total, text } = message.progress;
            const percentage = Math.round((current / total) * 100);
            
            progressFill.style.width = `${percentage}%`;
            progressText.textContent = `${percentage}%`;
            
            if (total > 1) {
              loadingText.textContent = `${text} (${current}/${total})`;
            } else {
              loadingText.textContent = text || '正在分析影片內容...';
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
              showError('無法連接到背景服務');
              return;
            }

            if (!summaryResponse || !summaryResponse.success) {
              // 檢查是否為時間限制錯誤
              if (summaryResponse.rateLimitReached && summaryResponse.waitTime) {
                showRateLimitWarning(summaryResponse.waitTime);
              } else {
                showError(summaryResponse?.error || '生成重點時發生錯誤');
              }
              return;
            }

            summaryContent.textContent = summaryResponse.summary;
            
            // 更新時間限制資訊（header 和首頁）
            console.log('Popup: Received summaryResponse:', summaryResponse);
            console.log('Popup: rateLimitInfo in response:', summaryResponse.rateLimitInfo);
            
            if (summaryResponse.rateLimitInfo && summaryResponse.rateLimitInfo.remaining !== undefined) {
              console.log('Popup: Calling updateRateLimitInfo with:', summaryResponse.rateLimitInfo);
              updateRateLimitInfo(summaryResponse.rateLimitInfo);
            } else {
              console.warn('Popup: No valid rateLimitInfo in response');
            }
            
            loading.classList.add('hidden');
            successAnimation.classList.remove('hidden');
            
            setTimeout(() => {
              successAnimation.classList.add('hidden');
              showElement(summary);
            }, 1500);
          }
        );
      });
    } catch (err) {
      generateBtn.disabled = false;
      loading.classList.add('hidden');
      showError('發生未預期的錯誤：' + err.message);
    }
  });

  copyBtn.addEventListener('click', async () => {
    const text = summaryContent.textContent;
    try {
      await navigator.clipboard.writeText(text);
      showStatus('已複製到剪貼簿');
    } catch (err) {
      showError('複製失敗');
    }
  });

  // 返回首頁按鈕
  backBtn.addEventListener('click', () => {
    // 隱藏所有內容
    hideAll();
    // 顯示首頁
    welcomeSection.classList.remove('hidden');
    generateBtn.disabled = false;
    
    // 確保 header 中的限額資訊顯示
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
  
  // 顯示時間限制警告和倒數計時
  let countdownInterval = null;
  function showRateLimitWarning(waitTime) {
    hideAll();
    generateBtn.disabled = true;
    
    const rateLimitWarning = document.getElementById('rateLimitWarning');
    const countdownSeconds = document.getElementById('countdownSeconds');
    const countdownProgress = document.getElementById('countdownProgress');
    
    if (!rateLimitWarning || !countdownSeconds || !countdownProgress) {
      showError('請求過於頻繁，請稍後再試');
      return;
    }
    
    let remainingSeconds = waitTime;
    const totalSeconds = waitTime;
    
    // 清除之前的倒數計時
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }
    
    // 更新顯示
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
    
    // 立即更新一次
    updateCountdown();
    
    // 顯示警告
    rateLimitWarning.classList.remove('hidden');
    
    // 每秒更新一次
    countdownInterval = setInterval(updateCountdown, 1000);
  }
});

